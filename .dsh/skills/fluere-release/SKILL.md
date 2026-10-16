---
name: fluere-release
description: FluereVue 全链路发版（npm 六包 + 文档站）：更新 README 版本指引、seed 基版本与 changeset、SSH 推 GitHub 由 Actions 发布 npm、同步 OneDev 触发文档站部署，并验证 npm 与文档站版本。支持指定目标版本号。
whenToUse: 用户要求「发版 / 发布 / release / 上线新版本 / 把某个版本发到 npm 与文档站」时用 `/fluere-release 帮我发版 [版本号]` 触发；也用于只重跑链路中的某一段（如仅同步 OneDev、仅做发布后验版）。
---

# FluereVue 发版流水线

把一次真实发版从「改 README」到「npm + 文档站可验证」收敛成固定顺序，并把踩过的坑写进步骤。
本技能只负责**本仓库**（`@fluere-vue/*` 六包 + Nuxt 文档站）的发版；版本策略与回滚细则以 [docs/release.md](../../../docs/release.md) 为准，本技能不重复其理论部分。

## 用法

```text
/fluere-release 帮我发版                 # 目标版本缺省 = 当前根版本的预发布号 +1
/fluere-release 帮我发版 0.4.1-alpha.1   # 指定目标版本
```

- **`<VERSION>`**（目标版本）= 本次发布到 npm / 文档站的统一版本号，六包同版本。
- 未指定时：读根 `package.json`，把预发布号 +1（`0.4.1-alpha.1` → `0.4.1-alpha.2`）。**换基线（改 `X.Y.Z`）必须显式给版本号**，不要靠默认值猜。
- 全程不改 `docs/todo.md` 的验收口径；`temp/` 下的演练产物不提交。

## 0. 先取运行时上下文（脱敏红线）

**所有环境相关值都从运行时取，禁止硬编码**（尤其是令牌、主机、`owner/repo`）：

| 值 | 运行时来源 |
| --- | --- |
| `<VERSION>` | 用户输入；缺省 = 根 `package.json` 预发布号 +1 |
| GitHub `owner/repo` | `git remote get-url github`（或 `origin`） |
| GitHub 令牌 | dsh-github 凭据存储（`$GITHUB_CONFIG_FILE`，缺省 `$XDG_CONFIG_HOME/dsh-github/config.json`） |
| OneDev 主机 / 项目 / 环境 | `git remote get-url onedev` + dsh-onedev 凭据存储（`$ONEDEV_CONFIG_FILE`，缺省 `$XDG_CONFIG_HOME/dsh-onedev/config.json`；环境用 `$ONEDEV_ENV` 或 `primary`） |
| OneDev 令牌 | 同上凭据存储；经 `GIT_ASKPASS` 传给 git |
| 文档站域名 | 根 `package.json` 的 `homepage` |
| DSH Web 地址 | `$DSH_WEB_URL` |

先跑探针（**只输出非密信息**，令牌只报 `set / not set`）：

```bash
node .dsh/skills/fluere-release/context.mjs
```

输出里的 `github` / `onedev` / `changesets` / `docs` 就是后续命令要用的值。`ready: false` 时先补插件凭据，不要继续。

> 占位符对照：`<SCOPE>` = npm 作用域（从 `packages/*/package.json` 的包名取，本仓库为 `@fluere-vue`）；`<preTag>` = `.changeset/pre.json` 的 `tag`；`<pkg>` = 六个可发布包的短名；`<RELEASE_COMMIT>` = release PR 合并后在 `main` 上的发布提交。

**令牌只经 stdin / 环境变量传递，不进 `argv`**（`argv` 会被 `ps` 看到）。GitHub REST 的安全取法：

```bash
GH_CFG="${GITHUB_CONFIG_FILE:-${XDG_CONFIG_HOME:-$HOME/.config}/dsh-github/config.json}"
export GH_TOKEN=$(node -e 'process.stdout.write(require(process.argv[1]).token||"")' "$GH_CFG")
gh_api() { printf 'header = "Authorization: Bearer %s"\nheader = "Accept: application/vnd.github+json"\n' "$GH_TOKEN" | curl -sS -K - "$@"; }
# 例：gh_api "https://api.github.com/repos/<OWNER>/<REPO>/actions/runs?per_page=5"
```

> **红线**：token / 密码 / 私钥明文不得出现在命令回显、日志、提交或本技能文档里。命令中用 `$ONE_DEV_TOKEN` / `$GH_TOKEN`、`<OWNER>`、`<REPO>`、`<ONEDEV_HOST>` 这类变量或占位符；令牌不进 URL、不进 `argv`、不写进 `.git/config`。

## 1. 版本算术（最容易错，先演练）

本仓库用 changesets **pre 模式**（`.changeset/pre.json` 的 `tag`，当前 `alpha`）。发 `<VERSION>` 的规则：

> **seed 到 `<VERSION>` 的前一号预发布，再加一条 `patch` changeset**；CI 的 `pnpm version:packages`（`changeset version && node scripts/version.mjs sync`）会把根 + 六包一起 bump 到 `<VERSION>`。

例：目标 `0.4.1-alpha.1` → seed `0.4.1-alpha.0` + `patch` → 根与六包全部变成 `0.4.1-alpha.1`。

- **`patch` 不能换成 `minor`**：seed `0.4.1-alpha.0` + `minor` 会得到 `0.5.0-alpha.0`。
- **seed ≠ 发布**：某版本打过 `v*` 部署 tag 后，不要「原样重发」同版本（同版本号会指向两个提交）；`<VERSION>` 必须是未发布过的版本。
- 落盘前**先在一次性副本里演练**，确认最终版本正好是 `<VERSION>`：

```bash
TMP=$(mktemp -d)
git archive HEAD | tar -x -C "$TMP"
ln -s "$PWD/node_modules" "$TMP/node_modules"
cd "$TMP"
node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json','utf8'));p.version='<SEED>';fs.writeFileSync('package.json',JSON.stringify(p,null,2)+'\n')"
node scripts/version.mjs sync            # 根 + 六包 -> <SEED>
# 写一条 patch changeset（六包）后：
pnpm version:packages
node -p "require('./package.json').version"   # 必须等于 <VERSION>，否则回上一步
```

（`<SEED>` = `<VERSION>` 的前一号预发布，例如 `<VERSION>=0.4.1-alpha.1` → `<SEED>=0.4.1-alpha.0`。）

## 2. 发布步骤

### Step 1 — README 版本指引

把 [README.md](../../../README.md) 与 [README.en-US.md](../../../README.en-US.md) 的「当前版本」改成 `<VERSION>`，并同步安装指引：

- 预发布**不会移动 `latest`**，要写明 `pnpm add` 默认取到的是旧版；装本次版本请用 `@fluere-vue/ui@<VERSION>` 或 `@alpha`。
- 组件里程碑段落里「已发布的 `<旧版本>` 尚未包含 …」这类话要一并改成 `<VERSION>` 的事实。

### Step 2 — seed 基版本 + changeset

```bash
node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json','utf8'));p.version='<SEED>';fs.writeFileSync('package.json',JSON.stringify(p,null,2)+'\n')"
pnpm version:sync     # 根 + 六包 -> <SEED>
pnpm version:check    # 一致性（根 == 六包）
```

再写 `.changeset/<随机名>.md`：`patch` + 六包（`designs` / `hooks` / `icons` / `themes` / `ui` / `utils`），正文写本版对外变更——它会进六个包的 `CHANGELOG.md`。

### Step 3 — 本地质量闸

CI 还会再跑一遍，但先自证，别把坏提交推上去：

```bash
pnpm check && pnpm test
```

### Step 4 — 提交并推 GitHub（SSH 凭证）

```bash
git add README.md README.en-US.md package.json packages/*/package.json .changeset/<新 changeset>.md
git commit -m "docs: 📝 更新 README 当前版本指引为 <VERSION>"
git commit -m "chore(release): 🔥 全仓版本 seed 到 <SEED> 并新增 <VERSION> changeset"

git remote set-url github "git@github.com:<OWNER>/<REPO>.git"   # 推送一律走 SSH
ssh -T git@github.com                                            # 应回 "Hi <user>!"
git push github main
```

提交信息遵循 `.trae/rules/git-commit-message.md`（Conventional Commits + emoji，中文描述）。

### Step 5 — 验证 GitHub Actions（dsh-github 插件）

- `Release` run 里 `select-mode` 应判 `version` → `version` job 把版本 bump 到 `<VERSION>` 并开/更新 release PR（分支 `changeset-release/main`）。
- **dsh-github 的 MCP 工具集没有 Actions 工具**：workflow run / job / 日志用插件管理的令牌走 REST API（`https://api.github.com/repos/<OWNER>/<REPO>/actions/...`）。
- MCP 报 `server is disconnected` 时，用 DSH Web 的本机路由重新注入令牌，再用 probe 验证：

  ```bash
  curl -sS -X POST "$DSH_WEB_URL/api/github/apply"
  curl -sS -X POST -H 'content-type: application/json' -d '{}' "$DSH_WEB_URL/api/github/probe"
  ```

- 校验 release 分支上根 + 六包 `package.json` 都等于 `<VERSION>`（用 REST raw 端点读取，别只看 run 的绿勾）。

### Step 6 — 合并 release PR

优先 MCP `merge_pull_request`（`merge_method: rebase`，与历史线性一致）。

**若返回 `403 Resource not accessible by personal access token`**（dsh-github 的 PAT 没有 PR 合并权限），用 SSH 把同内容快进推到 `main` 即可——GitHub 会把 PR 标成 `merged: true`：

```bash
git fetch --no-tags github 'refs/heads/changeset-release/main:refs/remotes/github/changeset-release/main'
git push github refs/remotes/github/changeset-release/main:refs/heads/main
```

- **`git fetch` 走 SSH 偶发挂起**：一定加 `timeout` 和**明确的 refspec**，别用 `--all` / `--tags` 全量拉。
- 合并后 `main` 上的发布提交就是后面 `v<VERSION>` 要指向的 `<RELEASE_COMMIT>`。

### Step 7 — 验证 npm 发布

- `Release` run 的 `pack`（self-check + build + smoke:dist）与 `publish` 必须全绿；`pack` 日志含 `Packages to publish … (<preTag>)` 一行，说明会发到哪个 dist-tag。
- **判定「是否真发布」以版本端点为准**：`https://registry.npmjs.org/@<SCOPE>%2F<pkg>/<VERSION>` 六个都要 **200**；不要用 `npm view` / packument。
- dist-tags：预发布只落在 `<preTag>`（如 `alpha`），`latest` 停在旧版是**预期**，不是事故。
- **registry 有传播延迟**：个别包可能几分钟内仍 404 或 dist-tag 未更新，稍后重试即可，别据此判定失败。要改 `latest` 只能显式 `npm dist-tag add`。

### Step 8 — 同步 OneDev（分支先推、tag 后推）

本项目对接的 OneDev（`context.mjs` 的 `onedev.primary`）**git SSH 入口不可用**：`ssh://git@<ONEDEV_HOST>/…` 是宿主 OpenSSH，不接受 OneDev 里登记的 SSH Keys，OneDev 内置 SSH 端口也未暴露。因此用 **dsh-onedev 插件管理的令牌走 HTTPS**，令牌经 `GIT_ASKPASS` 传，不进 URL / argv：

```bash
# 令牌从 dsh-onedev 凭据存储读，只进环境变量（用 node -e 的 argv 传路径，避免拼进表达式）
ONEDEV_CFG="${ONEDEV_CONFIG_FILE:-${XDG_CONFIG_HOME:-$HOME/.config}/dsh-onedev/config.json}"
export ONE_DEV_TOKEN=$(node -e \
  'const c=require(process.argv[1]);const s=process.env.ONEDEV_ENV||c.primary;process.stdout.write(c.environments[s].onedevToken)' \
  "$ONEDEV_CFG")

# 用 GIT_ASKPASS 传密：令牌不进 URL / argv / .git/config
#
# ⚠️ 用户名**必须是真实存在的 OneDev 用户**（如令牌属主 `codemarker`）。写 `git` 这类不存在的
#    用户名时，**读操作照样成功**（ls-remote / fetch / --dry-run 全绿，项目是公开的 ⇒ 匿名可读），
#    但真正的 push 会被判为匿名写 → `HTTP 403`。这个陷阱在 2026-10-16 发 0.5.0-alpha.1 时踩到。
export GIT_ASKPASS=$(mktemp) GIT_TERMINAL_PROMPT=0
printf '#!/bin/sh\ncase "$1" in\n  Username*) echo codemarker;;\n  Password*) echo "$ONE_DEV_TOKEN";;\nesac\n' > "$GIT_ASKPASS"
chmod +x "$GIT_ASKPASS"

ONEDEV_REMOTE=$(git remote get-url onedev)     # HTTPS URL，不含凭据

# 0) 反代对「带 Content-Length 的 POST 体」会回 403，push 一律走 chunked：
#    把 postBuffer 设得比 pack 小即可强制 chunked 传输（2026-10-16 实测：默认设置下
#    `POST git-receive-pack (474776 bytes)` → `HTTP 403`；`postBuffer=65536` → `(chunked)` 成功）。
GIT_PUSH=(git -c http.postBuffer=65536 push)

# 1) 分支先推：OneDev 的 job secret 按「提交可达性」授权，tag 先推会让 5 个 job 秒败
"${GIT_PUSH[@]}" "$ONEDEV_REMOTE" refs/heads/main:refs/heads/main
sleep 5

# 2) 部署 tag：必须是注解 tag，且指向发布提交（check job 会校验 tag 去 v == 根版本）
git tag -a "v<VERSION>" <RELEASE_COMMIT> -m "docs site deploy: <VERSION>"
"${GIT_PUSH[@]}" "$ONEDEV_REMOTE" "refs/tags/v<VERSION>:refs/tags/v<VERSION>"

# 3) 六个逐包 tag（GitHub 上由 changeset publish 生成，先取回再推）
#    逐包 tag 名形如 @<SCOPE>/<pkg>@<VERSION>，六个包各一条
git fetch --no-tags github 'refs/tags/@<SCOPE>/<pkg>@<VERSION>:refs/tags/@<SCOPE>/<pkg>@<VERSION>'
"${GIT_PUSH[@]}" "$ONEDEV_REMOTE" 'refs/tags/@<SCOPE>/<pkg>@<VERSION>'   # 六个
```

- `v<VERSION>` **不由 `release.yml` 生成**，只能手工打（注解 tag）。
- 若远端的 `v<VERSION>` 已存在且指向别的提交，先确认是否需要 `--move-tag` 语义（见 [docs/release.md](../../../docs/release.md)），别强行覆盖。

### Step 9 — 验证 OneDev CI/CD（dsh-onedev 插件）

- 分支构建 4 个 job（`check` / `test` / `build` / `package-smoke`）+ tag 构建 5 个 job（多一个 `deploy`）必须全绿。
- `deploy` 只在 tag 触发，日志收尾须含 `[deploy] 健康检查通过：v<VERSION> 已上线`。
- **若分支 job 秒败且日志只有 `No authorized job secret found`**：说明 tag 先于分支推送，重推分支后重跑 tag job。

### Step 10 — 发布后验证

| 项 | 判定 |
| --- | --- |
| npm 六包 | 版本端点全 200；`<preTag>` dist-tag = `<VERSION>` |
| 文档站 | `https://<DOCS_HOST>/` 与 `/en` 的 `docsVersion` = `v<VERSION>`（`<DOCS_HOST>` 取 `package.json.homepage`） |
| git refs | GitHub 与 OneDev 的 `main`、`v<VERSION>`、六个逐包 tag 都指向同一 `<RELEASE_COMMIT>` |
| 本地 | 工作区干净，本地 `main` == 远端 `main` |

## 3. 踩坑清单（2026-10-14 发 `0.4.1-alpha.1`、2026-10-16 发 `0.5.0-alpha.1` 实测）

| 坑 | 规避 |
| --- | --- |
| changesets pre 版本算术 | seed `<VERSION>` 前一号预发布 + **patch** changeset；用副本演练确认最终版本 |
| 「seed 版本被原样发布」撞 tag | `<VERSION>` 必须是没打过 `v*` 的新版本；发布脚本已有 tag 冲突前置检查 |
| dsh-github MCP 断连 | `POST $DSH_WEB_URL/api/github/apply` 重新注入令牌 |
| MCP 无 Actions 工具 | 用插件令牌走 `api.github.com/.../actions/...` REST |
| PAT 合并 PR 返回 403 | 用 SSH 把 `changeset-release/main` 快进推到 `main`，PR 会显示 merged |
| `git fetch` 走 SSH 挂起 | `timeout` + 明确 refspec，别全量 `--tags` |
| OneDev SSH 不可用 | 用 dsh-onedev 令牌走 HTTPS + `GIT_ASKPASS`；不要往 URL 里塞令牌 |
| OneDev「tag 先推、分支后推」→ job 秒败 | **分支先推、tag 后推** |
| OneDev push 403（用户名不是真实用户） | `GIT_ASKPASS` 的 `Username` 必须回**真实 OneDev 登录名**（如 `codemarker`）。回 `git` 时读操作（`ls-remote` / `--dry-run`）**全部正常**，只有真正带 pack 的 push 报 403 —— 2026-10-16 实测 |
| OneDev push 403（反代拒绝带 Content-Length 的 POST 体） | push 加 `-c http.postBuffer=65536` 强制 chunked；默认设置下 `POST git-receive-pack (474776 bytes)` 报 `HTTP 403`，改 chunked 后同一 push 成功 |
| npm 传播延迟导致「像只发了几个包」 | 以 `<VERSION>` 版本端点 HTTP 200 为准，稍后重试 |
| 预发布被误以为该占 `latest` | 预发布只落 `<preTag>`，`latest` 原地不动；改指须显式 `npm dist-tag add` |
| `v*` 部署 tag 没人替你打 | `release.yml` 只产逐包 tag / Release，部署 tag 手工 `git tag -a` |
| release PR 分支 CI 是 0 job 的 startup failure | 非阻塞；发布链路由 `pack` 自证 + `main` 上的 CI 为准 |
| 全局 `credential.helper=manager` 报 `git: 'credential-manager' is not a git command` | 无害，忽略 |
| OneDev 构建 id ≠ number | 轮询用 `/~api/builds/<id>`；列表里的 `number` 是构建序号，拿它当 id 会查到别的项目 |

## 4. 验收清单（发版完成 = 全勾）

- [ ] 两份 README 的当前版本 = `<VERSION>`，安装指引写明 `latest` 不动与锁定写法
- [ ] 根 + 六包版本一致，changeset 已被消费（`.changeset/pre/` 里能看到，`.changeset/*.md` 为空）
- [ ] `pnpm check` / `pnpm test` 本地全绿
- [ ] GitHub `Release` run 的 `pack` / `publish` 全绿；`main` 上的 `CI` 全绿
- [ ] npm 六包 `<VERSION>` 版本端点全 200，`<preTag>` dist-tag 指向它
- [ ] GitHub 与 OneDev 的 `main` + `v<VERSION>` + 六个逐包 tag 指向同一发布提交
- [ ] OneDev 分支 4 job + tag 5 job 全绿，`deploy` 日志确认 `v<VERSION>` 已上线
- [ ] 文档站中英 `docsVersion` = `v<VERSION>`
- [ ] 工作区干净；技能/文档里没有出现任何令牌明文

## 5. 回滚与补救

不把细节抄进本技能，统一看 [docs/release.md](../../../docs/release.md) 的「回滚与补救」：`npm deprecate`、`npm dist-tag` 回指、逐包 tag / GitHub Release 撤销、部署 tag 重指、同 commit 重跑幂等。**已发布版本不可变，修正只能发新版本号。**
