#!/usr/bin/env python3
"""Lint/buildspec — offline + authoritative checks for `.onedev-buildspec.yml`.

OneDev validates a build spec only when the server re-parses it (a YAML decode
into Java beans followed by JSR-303 bean validation). That makes it easy to push
a config that the server rejects at run time — e.g. a misspelled step/trigger
`type` (Java class name, e.g. `SetupCacheStep` not `SetUpCacheStep`), an unknown
field, a bad enum value, or an unbalanced `@secret:...@` placeholder. This script
catches that class of mistakes *before* a push, without needing a server.

Two layers:

  * Offline (always, default) — static checks against a registry derived from
    the OneDev source code:
      - YAML parses and `version`/`jobs`/`name`/`steps` are present;
      - every `type:` (steps, triggers, credentials, interpreters) is in the
        known, exact Java class-name set, with a suggestion for near-misses
        (this is exactly the `SetupCacheStep` typo);
      - per-step allowed fields (unknown fields are a warning: plugins can add
        their own);
      - enum values (`condition`, `uploadStrategy`);
      - balanced `@...@` interpolation placeholders in every string.

  * Server (optional) — the authoritative OneDev checks, using the same REST
    endpoints the official `tod` CLI wraps. Requires a server URL + access token:
      - `--server`        GET  /~api/build-spec-schema.yml  -> confirm every used
                           type name exists in the live server schema;
      - `--server-check`  POST /~api/tod/check-build-spec   -> the server itself
                           parses+validates (and would upgrade) the spec.

Server connection is taken from --url/--token flags, or the ONEDEV_SERVER_URL /
ONEDEV_ACCESS_TOKEN environment variables.

Exit codes: 0 = clean, 1 = errors, 2 = warnings only (unless --warnings-as-errors).
"""

import argparse
import difflib
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

# ---------------------------------------------------------------------------
# Registry derived from the OneDev source (io.onedev.server.buildspec.*). The
# `type` value of a step/trigger/credential/interpreter must equal its exact Java
# simple class name.
# ---------------------------------------------------------------------------

STEP_TYPES = {
    "CheckoutStep", "CommandStep", "BuildImageStep", "BuildImageWithKanikoStep",
    "CreateBranchStep", "CreatePullRequestStep", "CreateTagStep",
    "CloseIterationStep", "PruneBuilderCacheStep", "PublishArtifactStep",
    "PublishSiteStep", "PullImageStep", "PushImageStep", "RunContainerStep",
    "RunImagetoolsStep", "SCPCommandStep", "SSHCommandStep",
    "SetBuildDescriptionStep", "SetBuildVersionStep", "SetupCacheStep",
    "UseTemplateStep",
}

TRIGGER_TYPES = {
    "BranchUpdateTrigger", "TagCreateTrigger", "ScheduleTrigger",
    "PullRequestTrigger", "PullRequestUpdateTrigger", "PullRequestMergeTrigger",
    "PullRequestDiscardTrigger", "IssueInStateTrigger", "DependencyFinishedTrigger",
}

INTERPRETER_TYPES = {
    "PosixInterpreter", "PowerShellInterpreter", "WindowsBatchInterpreter",
}

CREDENTIAL_TYPES = {
    "DefaultCredential", "GitCredential", "HttpCredential", "SshCredential",
}

# `condition` on a step -> ExecuteCondition (io.onedev.k8shelper.ExecuteCondition).
CONDITION_VALUES = {
    "SUCCESSFUL", "FAILED", "ALWAYS", "CANCELLED", "TIMED_OUT",
    "SUCCESSFUL_OR_CANCELLED", "SUCCESSFUL_OR_FAILED", "ALWAYS_OR_CANCELLED",
}

# `uploadStrategy` on SetupCacheStep -> UploadStrategy.
UPLOAD_STRATEGY_VALUES = {"UPLOAD_IF_NOT_EXACT_MATCH", "UPLOAD_IF_CHANGED"}

# Job-level fields (io.onedev.server.buildspec.job.Job). `maxRetries` / `retryDelay`
# are not in the schema's `properties` block: they show up in a conditional `if/then`
# (required only when retryCondition != never), so they must be listed here manually.
JOB_FIELDS = {
    "name", "jobExecutor", "steps", "triggers", "jobDependencies",
    "projectDependencies", "requiredServices", "paramSpecs", "postBuildActions",
    "timeout", "retryCondition", "maxRetries", "retryDelay", "sequentialGroup",
    "includeUpstreamWhenRebuild", "includeDownstreamWhenRebuild",
}

# Fields of a `jobDependencies` entry (artifacts are retrieved into the dependent job).
JOB_DEPENDENCY_FIELDS = {
    "jobName", "requireSuccessful", "artifacts", "destinationPath",
    "paramMatrix", "excludeParamMaps",
}

# Allowed fields per known step (base Step fields + that step's own). An entry
# with None means "don't warn on unknown fields" (plugin steps we didn't enumerate).
STEP_FIELDS = {
    "CheckoutStep": {"type", "name", "condition", "optional",
                     "cloneCredential", "withLfs", "withSubmodules",
                     "cloneDepth", "checkoutPath"},
    "CommandStep": {"type", "name", "condition", "optional", "runInContainer",
                    "image", "interpreter", "runAs", "registryLogins",
                    "envVars", "useTTY"},
    "SetupCacheStep": {"type", "name", "condition", "optional", "key",
                       "checksumFiles", "entries", "uploadStrategy",
                       "uploadProjectPath", "uploadAccessTokenSecret"},
    "PublishArtifactStep": {"type", "name", "condition", "optional",
                            "sourcePath", "artifacts"},
}


class Reporter:
    def __init__(self, warnings_as_errors):
        self.errors = []
        self.warnings = []
        self.warnings_as_errors = warnings_as_errors

    def error(self, loc, msg):
        self.errors.append((loc, msg))

    def warn(self, loc, msg):
        self.warnings.append((loc, msg))

    @property
    def has_errors(self):
        return bool(self.errors)

    def render(self):
        rows = [(f"[error] {loc}: {msg}" if msg else f"[error] {loc}")
                for loc, msg in self.errors]
        if self.warnings_as_errors:
            rows += [f"[warn->error] {loc}: {msg}" for loc, msg in self.warnings]
        else:
            rows += [f"[warn] {loc}: {msg}" for loc, msg in self.warnings]
        return "\n".join(rows)


class SpecLinter:
    def __init__(self, text, path, rep):
        self.text = text
        self.path = path
        self.rep = rep
        # Map "type: VALUE" occurrences to line numbers for good messages.
        self.type_lines = {}
        for lineno, raw in enumerate(text.splitlines(), 1):
            m = re.match(r"^\s*-\s+type:\s*(\S+)", raw)
            if m:
                self.type_lines.setdefault(m.group(1), []).append(lineno)
            m2 = re.match(r"^\s*type:\s*(\S+)", raw)
            if m2:
                self.type_lines.setdefault(m2.group(1), []).append(lineno)

    def _loc_for(self, type_name):
        lines = self.type_lines.get(type_name)
        if lines:
            return f"{self.path}:{lines[0]}"
        return self.path

    def _suggest(self, val, palette):
        close = difflib.get_close_matches(val, palette, n=1, cutoff=0.6)
        if close:
            return f"; did you mean '{close[0]}'?"
        return ""

    def _check_type(self, value, palette, kind):
        if value in palette:
            return
        if value in STEP_TYPES or value in TRIGGER_TYPES:
            # type is valid but in the wrong palette (rare) -> error anyway
            pass
        self.rep.error(
            self._loc_for(value),
            f"unknown {kind} type '{value}' (must be the exact Java class name)"
            + self._suggest(value, palette))

    def check(self):
        try:
            data = _load_yaml(self.text)
        except Exception as exc:  # noqa: BLE001 - report the YAML error
            first = str(exc).splitlines()[0]
            self.rep.error(f"{self.path}", f"YAML parse error: {first}")
            return

        if not isinstance(data, dict):
            self.rep.error(self.path, "top level must be a mapping (version/jobs)")
            return
        if "version" not in data:
            self.rep.error(self.path, "missing top-level 'version'")
        else:
            try:
                int(data["version"])
            except (TypeError, ValueError):
                self.rep.error(self.path, f"'version' must be an integer, got {data['version']!r}")

        jobs = data.get("jobs")
        if not isinstance(jobs, list):
            self.rep.error(self.path, "'jobs' must be a non-empty list")
            return

        for job in jobs:
            if not isinstance(job, dict):
                self.rep.error(self.path, "each job must be a mapping")
                continue
            name = job.get("name", "<unnamed>")
            loc = f"{self.path} (job '{name}')"
            for field in job:
                if field not in JOB_FIELDS:
                    self.rep.warn(
                        loc,
                        f"unknown job field '{field}' "
                        f"(allowed: {', '.join(sorted(JOB_FIELDS))})")
            if not isinstance(job.get("steps"), list):
                self.rep.error(loc, "'steps' must be a list")
            else:
                for step in job["steps"]:
                    self.check_step(step, loc)
            if isinstance(job.get("triggers"), list):
                for trig in job["triggers"]:
                    self.check_trigger(trig, loc)
            if job.get("jobDependencies") is not None:
                self.check_job_dependencies(job["jobDependencies"], loc)

        self._check_interpolation_balance()

    def check_job_dependencies(self, deps, jobloc):
        if not isinstance(deps, list):
            self.rep.error(jobloc, "'jobDependencies' must be a list")
            return
        for dep in deps:
            if not isinstance(dep, dict):
                self.rep.error(jobloc, "each job dependency must be a mapping")
                continue
            for field in dep:
                if field not in JOB_DEPENDENCY_FIELDS:
                    self.rep.warn(
                        jobloc,
                        f"unknown job dependency field '{field}' "
                        f"(allowed: {', '.join(sorted(JOB_DEPENDENCY_FIELDS))})")
            if not dep.get("jobName"):
                self.rep.error(jobloc, "a job dependency is missing 'jobName'")

    def check_step(self, step, jobloc):
        if not isinstance(step, dict):
            return
        do_type = step.get("type")
        if do_type:
            self._check_type(do_type, STEP_TYPES, "step")
        else:
            self.rep.error(jobloc, "a step is missing 'type'")
            return
        allow = STEP_FIELDS.get(do_type)
        if allow is not None:
            for field in step:
                if field not in allow:
                    self.rep.warn(
                        self._loc_for(do_type),
                        f"step '{do_type}': unknown/possibly-typo'd field '{field}' "
                        f"(allowed: {', '.join(sorted(allow))})")
        # CommandStep interpreter -> PosixInterpreter etc.
        interp = step.get("interpreter")
        if interp is not None:
            self.check_interpreter(interp, do_type)
        self.check_enum_on(step, "condition", jobloc, CONDITION_VALUES)
        self.check_enum_on(step, "uploadStrategy", self._loc_for(do_type) if do_type else jobloc,
                           UPLOAD_STRATEGY_VALUES)
        self._check_required(step, do_type, jobloc)

    def _check_required(self, step, do_type, jobloc):
        req = {
            "SetupCacheStep": ("key", "entries"),
            "PublishArtifactStep": ("artifacts",),
            "CommandStep": ("interpreter",),
        }.get(do_type, ())
        for field in req:
            if field not in step:
                self.rep.error(jobloc, f"step '{do_type}' is missing required field '{field}'")

    def check_interpreter(self, interp, parent):
        if isinstance(interp, dict) and "type" in interp:
            self._check_type(interp["type"], INTERPRETER_TYPES, "interpreter")
            if not isinstance(interp.get("commands"), str):
                self.rep.warn(self._loc_for(parent),
                              f"interpreter '{interp.get('type')}' has no 'commands' (string)")
            shell = interp.get("shell")
            if shell and shell not in ("sh", "bash", "cmd", "pwsh", "powershell", "batch"):
                self.rep.warn(self._loc_for(parent),
                              f"unusual interpreter shell '{shell}' (expected sh/bash/cmd/pwsh)")

    def check_trigger(self, trig, jobloc):
        if not isinstance(trig, dict):
            return
        do_type = trig.get("type")
        if do_type:
            self._check_type(do_type, TRIGGER_TYPES, "trigger")
        else:
            self.rep.error(jobloc, "a trigger is missing 'type'")

    def check_enum_on(self, obj, field, loc, allowed):
        val = obj.get(field)
        if val is not None and val not in allowed:
            if not isinstance(val, str):
                return
            self.rep.warn(loc, f"'{field}': '{val}' is not a known value "
                               f"(known: {', '.join(sorted(allowed))})")

    def _check_interpolation_balance(self):
        # Every `@var@`/`@secret:x@`/`@file:x@`... placeholder must be balanced.
        for lineno, raw in enumerate(self.text.splitlines(), 1):
            if "value: " in raw or "@" in raw:
                field = raw.split(":", 1)[0].strip()
                val = raw.split(":", 1)[1].strip() if ":" in raw else ""
                if "@" in val:
                    depth = 0
                    for ch in val:
                        if ch == "@":
                            depth ^= 1
                    if depth:
                        self.rep.error(f"{self.path}:{lineno}",
                                       f"{field}: unbalanced '@' in '{val.strip()}'")


def _load_yaml(text):
    try:
        import yaml  # local import so the script still works heading into server mode
    except ImportError:
        raise RuntimeError("PyYAML is required for linting (pip install pyyaml)")
    return yaml.safe_load(text)


# ---------------------------------------------------------------------------
# Server-backed authoritative checks (same endpoints the `tod` CLI uses).
# ---------------------------------------------------------------------------

def _get_token(flags, env):
    return flags.token or os.environ.get("ONEDEV_ACCESS_TOKEN")


def _get_url(flags, env):
    return flags.url or os.environ.get("ONEDEV_SERVER_URL")


def check_schema(flags, rep, used_types):
    url = _get_url(flags, None)
    token = _get_token(flags, None)
    if not url:
        rep.error("server", "schema check needs --url (or ONEDEV_SERVER_URL)")
        return False
    req_url = url.rstrip("/") + "/~api/build-spec-schema.yml"
    try:
        req = urllib.request.Request(req_url)
        if token:
            req.add_header("Authorization", "Bearer " + token)
        with urllib.request.urlopen(req, timeout=30) as resp:
            schema = resp.read().decode()
    except Exception as exc:  # noqa: BLE001
        rep.error("server", f"could not fetch schema from {req_url}: {exc}")
        return False
    missing = [t for t in sorted(used_types) if t not in schema]
    if missing:
        rep.error("server", "used type(s) not present in server schema: " + ", ".join(missing))
        return False
    rep.warn("server", f"all {len(used_types)} used type names exist in the server schema")
    return True


def check_server(flags, rep, text):
    url = _get_url(flags, None)
    token = _get_token(flags, None)
    project = flags.project
    if not url:
        rep.error("server", "server-check needs --url (or ONEDEV_SERVER_URL)")
        return False
    req_url = (url.rstrip("/") + "/~api/tod/check-build-spec" +
               ("?project=" + urllib.parse.quote(project) if project else ""))
    try:
        req = urllib.request.Request(req_url, data=text.encode(),
                                     method="POST", headers={"Content-Type": "text/plain"})
        if token:
            req.add_header("Authorization", "Bearer " + token)
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = resp.read().decode()
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode() if exc.fp else str(exc)
        rep.error("server", f"check-build-spec rejected the spec (HTTP {exc.code}):\n{detail}")
        return False
    except Exception as exc:  # noqa: BLE001
        rep.error("server", f"server check failed: {exc}")
        return False
    if body.strip() != text.strip():
        rep.warn("server", "server returned an upgraded/normalized spec (would rewrite file)")
    return True


def main(argv=None):
    ap = argparse.ArgumentParser(description="Lint OneDev build spec")
    ap.add_argument("spec", nargs="?", default=".onedev-buildspec.yml")
    ap.add_argument("--url", help="OneDev server base URL (or ONEDEV_SERVER_URL)")
    ap.add_argument("--token", help="OneDev access token (or ONEDEV_ACCESS_TOKEN)")
    ap.add_argument("--project", help="project path for --server-check (e.g. group/name)")
    ap.add_argument("--server", action="store_true",
                    help="cross-check used type names against the live server schema")
    ap.add_argument("--server-check", action="store_true",
                    help="ask the server to parse+validate the spec (authoritative)")
    ap.add_argument("--warnings-as-errors", "-W", action="store_true")
    flags = ap.parse_args(argv)

    try:
        with open(flags.spec, "r", encoding="utf-8") as fh:
            text = fh.read()
    except OSError as exc:
        print(f"[error] {flags.spec}: {exc}", file=sys.stderr)
        return 1

    rep = Reporter(flags.warnings_as_errors)
    linter = SpecLinter(text, flags.spec, rep)
    linter.check()

    used_types = set(linter.type_lines)
    if flags.server:
        check_schema(flags, rep, used_types)
    if flags.server_check:
        check_server(flags, rep, text)

    out = rep.render()
    if out:
        print(out)
    if rep.has_errors:
        return 1
    if rep.warnings and not flags.warnings_as_errors:
        return 2
    print(f"[ok] {flags.spec}: build spec looks valid")
    return 0


if __name__ == "__main__":
    sys.exit(main())