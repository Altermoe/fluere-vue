// Generate git commit-convention (rules) config files for AI IDEs / agents.
//
// Each supported harness/IDE has a template under templates/ whose path mirrors
// the location the config must be installed at (relative to a project git root).
// This script copies the template byte-for-byte to the target install path of a
// project, so the installed config is always identical to the bundled template.
//
// Supported targets:
//   trae  -> .trae/rules/git-commit-message.md
//
// Usage:
//   node gen.js --target trae [--out <project-git-root>]
//
//   --target  which harness/IDE config to generate (default: trae)
//   --out     project git root to install into (default: current working directory)
//
// If the project git root cannot be detected under --out, the script falls back
// to --out itself and writes into <out>/.trae/rules/...
//
// To add a new harness/IDE: drop its template under templates/<name>/... with the
// exact relative path the config must live at, extend TARGETS below, and this
// script (and the SKILL.md registry table) will carry it.
const fs = require('fs');
const path = require('path');

// name -> (project-root-relative install path, relative template path)
const TARGETS = {
  trae: {
    install: '.trae/rules/git-commit-message.md',
    template: 'templates/trae/rules/git-commit-message.md',
  },
};

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

function findGitRoot(dir) {
  let current = path.resolve(dir);
  while (true) {
    if (fs.existsSync(path.join(current, '.git'))) return current;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

const targetName = arg('--target', 'trae');
const target = TARGETS[targetName];
if (!target) {
  console.error(`[git-commit-config] Unknown target "${targetName}". Supported targets: ${Object.keys(TARGETS).join(', ')}`);
  process.exit(1);
}

const scriptDir = __dirname;
const templatePath = path.join(scriptDir, ...target.template.split('/'));
if (!fs.existsSync(templatePath)) {
  console.error(`[git-commit-config] Missing template at: ${path.resolve(templatePath)}`);
  process.exit(1);
}

const outArg = path.resolve(arg('--out', process.cwd()));
const projectRoot = findGitRoot(outArg) || outArg;
const installPath = path.join(projectRoot, ...target.install.split('/'));
fs.mkdirSync(path.dirname(installPath), { recursive: true });
fs.copyFileSync(templatePath, installPath);
const relTemplate = path.relative(scriptDir, templatePath);
console.log(`[git-commit-config] wrote "${targetName}" config -> ${installPath} (template ${relTemplate})`);