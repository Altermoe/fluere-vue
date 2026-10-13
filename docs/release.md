# 发布指南（Publishing & Rollback）

> 配套：[docs/adr/0001-library-build-tooling.md](./adr/0001-library-build-tooling.md)（构建选型）、
> [docs/todo.md](./todo.md) 目标 3（整体计划）。

本文档描述如何把 `@fluere-vue/*` 六包发布到 npm，以及如何回滚。属于横跨 3.3（版本与 CHANGELOG）
与 3.4/3.5（发布流水线 / 正式发布）的操作手册。

## 版本策略

- **统一版本号**：`@fluere-vue/designs` / `hooks` / `icons` / `themes` / `ui` / `utils`
  六个包**始终同版本**（Changesets `fixed` 分组 + `scripts/version.mjs` 双重约束）。
  根 workspace `package.json` 的 `version` 是该统一版本的镜像（文档站页脚等读取它）。
- **`apps/*` 不参与版本同步**：`@fluere-vue/docs` / `playground` 是 private、从不发布，
  changesets 的 `ignore` 已跳过它们。`version.mjs sync` 只写根 + 六个可发布包——一旦连
  `apps/*` 的版本也改掉，changesets/action 的 version 步骤会把它们判为「变更包」并去读
  `apps/docs/CHANGELOG.md`（该文件不存在），release job 直接 ENOENT 失败（2026-10-12 实测）。
- 版本号单一事实源 = **根 `package.json`**；文档站由 `nuxt.config.ts` 读取它注入
  `runtimeConfig`（`use-docs-version` 归一 `v` 前缀）。禁止在 README / 页脚手写版本。

## 变更与 CHANGELOG（Changesets）

每次对外变更都要写一条 changeset：

```bash
pnpm changeset            # 交互式选择 bump 级别 + 填描述
# 产物：.changeset/<随机名>.md
```

- `fixed` 分组保证：任一 `@fluere-vue/*` 有 changeset，`changeset version` 会把六包一并
  bump 到同一新版本（`patch` / `minor` / `major` 按最大者）；**workspace 根包不参与**
  （changesets 不把根当包，写进 `fixed` 会被判 `Invalid path`），根版本由下面的
  `version.mjs sync` 对齐。
- 发布用 **rc 预发布模式**（`changeset pre enter rc`），避免污染 `latest`：

```bash
# ① 先把目标基版本写进根 package.json（版本单一事实源），再由 sync 拉平到六个可发布包。
#    bump 只能从当前版本往上走：0.0.1 加 patch / minor 只会得到 0.0.2 / 0.1.0，到不了
#    0.3.0；而稳定版 0.3.0 进 rc 后是 0.3.1-rc.0。要发 0.3.0-rc.1，基版本必须是
#    0.3.0-rc.0（三种走法的实测见文末「版本流程演练记录」）。
node -e "const fs=require('fs'),f='package.json',p=JSON.parse(fs.readFileSync(f,'utf8'));p.version='0.3.0-rc.0';fs.writeFileSync(f,JSON.stringify(p,null,2)+'\n')"
pnpm version:sync                    # 0.3.0-rc.0 -> 根与六个可发布包

# ② 进 rc 预发布模式（生成 .changeset/pre.json，需提交入库）
pnpm exec changeset pre enter rc
pnpm version:packages                # = changeset version && node scripts/version.mjs sync -> 0.3.0-rc.1
pnpm build && pnpm test              # 构建 + 测试
pnpm exec changeset publish          # 发布到 npm；pre 模式下**不要**加 --tag（见下方说明）
pnpm exec changeset pre exit         # rc 收尾（升正式版时再走一遍 stable 流程）
```

> **pre 模式下不许显式 `--tag`**：`changeset publish --tag rc` 会直接报
> `Releasing under custom tag is not allowed in pre mode!` 并退出 1（彩排实测）。
> 裸跑 `changeset publish` 即可——changesets 读 `.changeset/pre.json` 自动用 `rc` 作为 dist-tag。

`version:packages` 里的 `version.mjs sync` 会把根与六个可发布包拉平（以最大版本为准回写根），
并在各发布包生成 `CHANGELOG.md`（changelog 提供方：`@changesets/cli/changelog`）。

> **`changelog` 字段别写成 `@changesets/cli/changelog-git`**：cli 3.x 的 `exports` 只有
> `.` / `./changelog` / `./commit` / `./package.json` / `./bin.js`，该子路径不存在，
> `changeset version` 会在生成 CHANGELOG 时抛 `ERR_PACKAGE_PATH_NOT_EXPORTED` 并以 1 退出（实测）。
> `@changesets/cli/changelog` 本身就是 `@changesets/changelog-git` 的再导出，语义一致。
> `pnpm check` 的 `version:check`（[scripts/version.mjs](../scripts/version.mjs)）现已静态校验
> 该字段能否解析、`fixed` / `linked` / `ignore` 里的包名是否真实存在，防止同类回归。

## 发布前质量闸

**CI 自动覆盖**（[.onedev-buildspec.yml](../.onedev-buildspec.yml)，分支与 tag 推送都跑）：

- `check` job：`pnpm check`（lint + format + tsc + i18n + 版本一致性）。
- `test` job：`pnpm test`（全量单测）。
- `package-smoke` job：补上「仓库内全程走源码、dist 从不被解析」的缺口（各包 `exports`
  指向源码，见 [ADR-0001 §4.1](./adr/0001-library-build-tooling.md#41-仓库内解析源码发布才用产物publishconfig-覆盖)），分三步：
  1. `pnpm build`（拓扑：designs → hooks/themes/icons/utils → ui）；
  2. `pnpm smoke:dist`（[scripts/smoke-dist.mjs](../scripts/smoke-dist.mjs)）——`pnpm pack` 出六个 tarball，
     用 `publint` + `attw` 校验入口声明，再装进临时 fixture 工程以消费方身份按包名/子路径导入并 SSR 渲染；
  3. `REQUIRE_DIST=1 pnpm exec vitest run packages/ui/src/__tests__/dist-smoke.test.ts`——
     缺 dist 即**硬失败**，不再被 `skipIf` 静默放过。
- attw 收敛口径：`--profile esm-only --entrypoints . --ignore-rules internal-resolution-error`——
  `bundler` / `node16(ESM)` 全绿，跳过的 `node16` 提示为**已知可接受**（见 ADR「已知限制」）。
- `deploy`（仅 tag）依赖 `package-smoke`，坏产物无法上线。

**仅发布时人工**：

- `pnpm build && pnpm smoke:dist` 本地复现产物链路（`smoke:dist` 需先 `build`）。
- `npm pack --dry-run` 复核 tarball 内容与体积（不含源码测试、含 `dist/*.css` 与 `.d.ts`）。

## 本地手动发布（首发 bootstrap）

首发**不能**走 OIDC（trusted publisher 只能挂在已存在的包上），第一个版本必须本机登录 / 粒度 token 人工发布。
这条流程用 [`scripts/release-manual.sh`](../scripts/release-manual.sh) 收敛成一条命令（阶段横幅 + 逐步确认 + 合法性校验）：

```bash
pnpm release:manual                      # 发布根 package.json 的当前版本（原样，不 bump）
pnpm release:manual 0.3.0-rc.1           # 目标更高：先把根 seed 到该版本再发布
pnpm release:manual --yes                # 全程免确认（CI / 熟练用户）
pnpm release:manual --dry-run            # 只跑到发布预览（零副作用）
pnpm release:manual --check              # 只跑前置检查（零副作用）
```

> `--` 分隔符可加可不加：pnpm 会把它原样透传给脚本，脚本已当分隔符忽略；`pnpm release:manual --yes`
> 与 `pnpm release:manual -- --yes` 等价。

脚本阶段：`0) 前置检查`（仓库根 / 工具 / 干净树 / 分支可达性 / pnpm 登录 / 强制 registry / version:check）→
`1) 目标版本解析` → `2) 版本落定` → `3) 质量闸`（check + build + test + smoke:dist）→ `4) 提交版本产物` →
`5) 发布预览` → `6) 正式发布` → `7) 打 tag 并推送` → `8) CHANGELOG 校验 / pre 收尾` → `9) 完成`。

必须知道的行为（都踩过坑）：

- **版本合法性**：目标版本必须 **≥ 当前版本**，低于当前直接报错（`不能使用低于当前版本的 tag`）；格式非法 /
  未知参数退出码 `2`。相等 = 原样发布当前版本（不 bump、不生成 CHANGELOG 条目）。
- **强制官方 registry**：本机 `~/.npmrc` 可能是镜像（如腾讯云）。脚本同时导出 `npm_config_registry` 与
  `PNPM_CONFIG_REGISTRY=https://registry.npmjs.org`（changesets 在 pnpm workspace 下调的是 pnpm，只设前者不稳）。
- **一律用 pnpm（不要 npm）**：根 `package.json` 的 `devEngines` / `packageManager` 要求 pnpm，用 npm 在**仓库根**
  会被拦下（`EBADDEVENGINES`），且会对根 `.npmrc` 的 pnpm 专属键（`shamefully-hoist` 等）报
  `Unknown project config` 警告。脚本的 `whoami` / `login` / `view` / `config` 全部从**仓库根**用 pnpm 执行。
- **pre 模式不传 `--tag`**：`.changeset/pre.json` 存在且 `mode=pre` 时，changesets 自动用 pre 的 tag；
  传 `--tag` 会报 `Releasing under custom tag is not allowed in pre mode!` 退出 1。
- **非 pre 的 dist-tag**：预发布版本取标识（`0.3.0-alpha.2` → `alpha`、`0.3.0-rc.1` → `rc`）作 dist-tag，
  **绝不用 `latest`**；稳定版不传（即 `latest`）。首发仍会把 `latest` 一并占上（已接受，见 [docs/todo.md](./todo.md) 3.5）。
- **预览用 `changeset publish-plan`，不是 `publish --dry-run`**：`@changesets/cli` 的 `publish` **没有**
  `--dry-run` 选项（传了会 `Unknown option` 报错），预览走只读的 `publish-plan` / `status --verbose`；
  tarball 内容复核仍由 `pnpm smoke:dist` 覆盖。
- **部署 tag 必须是注解 tag**：`git push --follow-tags` 只推**注解** tag，所以 `v<version>` 用 `git tag -a` 建
  （changesets 生成的逐包 tag 本就是注解的）。OneDev deploy 只认 `v*`，且要求 tag 落在 main 可达提交上。
- **首发 / 部分失败幂等**：`changeset publish` 会跳过 registry 上已存在的版本，同一 commit 重跑安全；
  已发布版本不可撤销，更正只能发新版本或 `npm deprecate`（见下文「回滚与补救」）。

## 版本流程演练记录（2026-10-12）

`.changeset/config.json` 曾有两处错误：`changelog` 写成不存在的 `@changesets/cli/changelog-git`，
`fixed` 里放了 workspace 根包名 `fluere-vue`。后果是 `changeset version` 直接退出 1、
六个包永远停在 `0.0.1`、逐包 `CHANGELOG.md` 从未生成（`changeset status` 会打印
`Found issues in your config`）。修复后在同一提交上实测（`@changesets/cli@3.0.3`）：

| 场景      | 命令                                                                                  | 实测结果                                                                      |
| --------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 常规 bump | `changeset pre enter rc` → `changeset version`                                        | 六包 → `0.0.2-rc.0`，逐包 `CHANGELOG.md` 生成                                 |
| 目标版本  | 根 seed `0.3.0-rc.0` → `pnpm version:sync` → `pre enter rc` → `pnpm version:packages` | 根 + 全部子包 → `0.3.0-rc.1`，`packages/ui/CHANGELOG.md` 首节 `## 0.3.0-rc.1` |
| 反例      | 根 seed 稳定版 `0.3.0` → 同上                                                         | `0.3.1-rc.0`（**不是** `0.3.0-rc.1`）                                         |
| 负向回归  | 还原两处坏写法 → `pnpm version:check`                                                 | 两条都被拦截，退出码 1                                                        |

演练在 `git archive HEAD` 的一次性副本里执行，未改动工作区；`pnpm check` 里的
`version:check` 已内置同样的静态校验。

## 发布彩排记录（2026-10-12，本地 verdaccio）

做法：`git archive HEAD` 出一次性副本 → 装依赖 → 起本地 verdaccio
（`pnpm dlx verdaccio@6 --listen 127.0.0.1:4873`，把 `@fluere-vue:registry` 与本地 token 写进副本 `.npmrc`），
然后把**真实发布流程**对着本地 registry 完整走一遍，再从干净目录以消费方身份验收：

```bash
node -e "…p.version='0.3.0-rc.0'"   # seed 基版本到根
pnpm version:sync                    # 根 + 六包 -> 0.3.0-rc.0
pnpm exec changeset pre enter rc
pnpm version:packages                # -> 0.3.0-rc.1
pnpm build
pnpm exec changeset publish          # pre 模式：不加 --tag
```

| 检查项        | 实测结果                                                                                             |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| 六包发布      | `@fluere-vue/{designs,hooks,icons,themes,ui,utils}@0.3.0-rc.1` 全部成功                              |
| dist-tags     | **`rc` 与 `latest` 同时指向 `0.3.0-rc.1`** —— 实测坐实了「首发会一并占 `latest`」（方案 1 已接受）   |
| git tag       | 逐包生成 `@fluere-vue/<pkg>@0.3.0-rc.1`；**与部署用的 `v0.3.0-rc.1` 不是同一个 tag**，后者仍需手工打 |
| 发布 manifest | `workspace:*` 已改写为 `0.3.0-rc.1`、`reka-ui` 固定为实际版本、`exports`/`types` 指向 `./dist/*`     |
| 干净目录安装  | 新工程 `pnpm add @fluere-vue/ui@0.3.0-rc.1 vue` 成功，六个包从 registry 拉齐                         |
| SSR           | `renderToString` 渲染 `<FluereButton>` 通过（输出含 `fui-button` 与文案）                            |
| CSS 引入      | `import '@fluere-vue/ui/style.css'` 经 Vite 构建进产物（107.5 kB CSS，含 `fui-button`）              |
| 纯类型引用    | 消费方 `vue-tsc --noEmit` **exit 0**（工具链对齐仓库：vue-tsc 3.3.8 + typescript 6.0.3）             |

彩排抓到的三件事（前两条已改文档，第三条已修复）：

1. **pre 模式下不能传 `--tag`**：`changeset publish --tag rc` 报
   `Releasing under custom tag is not allowed in pre mode!` 并退出 1。本手册原先的写法是错的，已改。
2. **消费方 TS 需要 CSS 声明**：`import '@fluere-vue/ui/style.css'` 在 tsconfig 没有 `vite/client`
   types 时报 `TS2882`；且发布出去的 `dist/index.d.ts` 首行是
   `import '@fluere-vue/designs/tokens.css'`（来自 `packages/ui/index.ts` 的入口 import），
   `skipLibCheck: false` 时同样报 `TS2882`。结论：消费方需要 `skipLibCheck: true`（多数模板默认如此）
   或自行 `declare module '*.css'`。
3. **tarball 曾带源码（已修复）**：`ui` / `designs` / `icons` / `themes` 的 `files` 曾含顶层
   `src/`，安装后 `ui` 的 `src` 1.5 MB（约 `dist` 的 70%），与 3.4 质量闸「不含源码」不符。
   修法：从这四包的 `files` 移除顶层 `src`——消费方入口全部由 `publishConfig` 指向 `dist`；
   而 `dist/src/**`（`.d.ts` 产物）是 `dist/index.d.ts` 的类型图依赖（`.d.ts` 内相对导入
   形如 `./src/<component>/*.vue`），**不能删**，它随 `dist` 保留。
   实测修复后：`ui` tarball 250→102 文件、790→471 kB（unpacked 3.1→1.9 MB）；
   `pnpm smoke:dist` 复验消费方链路（六包安装 + publint/attw + SSR 渲染 + CSS 子路径）通过。
   另：`icons` 解包后仍 **~43 MB**（主要是 `generated/` 图标数据，非源码），六个包里唯一的
   体积异类，发布前值得单独复核。

**本次彩排没有覆盖**（所以 3.4 的「发布彩排」勾选不代表这些已验证）：OIDC trusted publishing 与
provenance（本地 verdaccio 没有 OIDC，走的是 token 认证）、`publish` job 建 GitHub Release 的部分、
以及 `release.yml` 的 `pack` / `publish` 两个 job 本身（它们要等真实 release PR 合并后才会跑）。

## 回滚与补救

- **发错了 tag / 版本**：
  ```bash
  npm deprecate @fluere-vue/ui@<坏版本> "请升级到 <好版本>"   # 软提示，不撤销
  npm dist-tag rm @fluere-vue/ui rc                          # 移除污染的 dist-tag
  npm dist-tag add @fluere-vue/ui@<好版本> latest            # latest 回指上一版
  ```
- **`latest` 被预发布污染**：走上面 `dist-tag add` 强制回指；正常发布用 `--tag rc` 本就不会占 `latest`。
- **已发布版本不可变**：修正版必须发新版本号（`0.3.0-rc.2` 等），绝不覆盖已发布版本。
- **撤销 git tag / GitHub Release**（`release.yml` 的 publish job 会同时建两者）：
  ```bash
  gh release delete v0.3.0-rc.1 --yes --cleanup-tag   # 删 Release 并连带删远端 tag
  git push origin :refs/tags/v0.3.0-rc.1              # 兜底：tag 还在就单独删
  git tag -d v0.3.0-rc.1                              # 本地
  ```
  撤销 tag 前先确认 npm 上的版本确实要废弃（版本本身撤不掉，只能 `deprecate`）。
- **同一 commit 重跑发布**：`changeset publish` 会跳过 registry 上已存在的版本，因此重跑是幂等的；
  若上次在「已发布、未打 tag」之间失败，重跑会补打 tag，不需要手工干预。

## 发布流水线（GitHub Actions）

[.github/workflows/release.yml](../.github/workflows/release.yml)：`push main`（或手动 dispatch，仅限 main）触发，
按 Changesets v3 + npm Trusted Publishing 的官方推荐拆成四个 job：

| job           | 条件              | 权限                                      | 做什么                                                                           |
| ------------- | ----------------- | ----------------------------------------- | -------------------------------------------------------------------------------- |
| `select-mode` | 总是              | `contents: read`                          | 判定 `version` / `publish` / `none`（有 changeset 就开 PR，没有就发）            |
| `version`     | `mode == version` | `contents: write`、`pull-requests: write` | `pnpm version:packages` → 开/更新 release PR                                     |
| `pack`        | `mode == publish` | `contents: read`                          | `pnpm check && pnpm test`（自证）→ `pnpm build` → `pnpm smoke:dist` → 打 tarball |
| `publish`     | `needs: pack`     | `contents: write`、`id-token: write`      | 只上传 pack 出来的 tarball；打 tag + 建 GitHub Release                           |

`id-token: write` **只给 publish job**：npm 与 Changesets 都要求这样，否则任何在 version 步骤里
跑起来的代码都能换到 OIDC 令牌去发包；顶层 `permissions: {}` 归零，逐 job 显式声明。

**为什么 `pack` 里要自己跑一遍 `check` + `test`**：release PR 的分支由 `github-actions[bot]` 推送，
它的 `pull_request` 触发的 CI run 会被 GitHub 挂成 **`action_required`**（需要维护者手动批准才跑），
因此在没人点批准的情况下 release PR 上没有可用的检查结果（2026-10-12 实测：run 38215064332 的
`conclusion = action_required`，`actor = github-actions[bot]`、分支 `changeset-release/main`）。
合并后的 push 到 `main` 虽会触发 `ci.yml`，但与 `release.yml` **并行**跑、拦不住发布。
所以发布链路必须自证，失败即不出包。想在 PR 上看 CI，可在 Actions 页面手动批准那个 run
（或者给 action 配 PAT / GitHub App token 让分支推送不再是 bot 身份）。

### 一次性准备（人工，仓库里改不了）

1. 仓库设置 `Settings → Actions → General` 勾选 **Allow GitHub Actions to create and approve pull requests**
   （否则 release PR 建不出来）。
2. **首次发布必须人工 bootstrap**：npm 的 trusted publisher 是挂在**已存在的包**上的设置项，
   没有 pending publisher，六个包从未发布过 ⇒ 第一个版本发不出去。做法是先用粒度 token（或本机
   `pnpm login`）发一次，再给六个包各配一次 trusted publisher，之后才轮到 workflow 自动发布。
3. 六个包（`@fluere-vue/designs` / `hooks` / `icons` / `themes` / `ui` / `utils`）在 npmjs.com 的
   `Settings → Trusted Publisher` 各配一条：Repository = `Altermoe/fluere-vue`，Workflow filename =
   `release.yml`，**Environment 留空**（除非同时取消 workflow 里 `environment:` 的注释并填同名环境；
   两边不一致会让 OIDC 校验失败，报的还是误导性的 404）。
4. publish job 的 `setup-node` **必须**带 `registry-url: https://registry.npmjs.org`：pnpm v11 下
   不写 registry 进 `.npmrc`，OIDC 换取会失败。**不要**配 `NODE_AUTH_TOKEN`——凭据来自 OIDC。
   provenance 在 trusted publishing 下由 pnpm 自动附带，不需要 `--provenance`。

### 两个已知陷阱（首次发布会踩）

- **首次发布会把 `latest` 一并占上（已决策：接受）**：changesets 自己会警告「packages that have not had
  normal releases will be published to `latest`」——六个包首次发布时，即使处于 rc 预发布模式，`latest` 也会
  落在 `0.3.0-rc.1` 上。**按原计划执行、不做特殊处理**：新包无存量用户，`0.3.0` 稳定版发布后 `latest` 自动
  回指，届时恢复正常语义；发布说明与 GitHub Release 正文里要写明这条已知行为，避免被当成事故。
  决策记录见 `docs/todo.md` 3.5 的「前置硬约束与已确认决策」。
- **dist-tag 事后回指需要目标版本已存在**：`npm dist-tag add <pkg>@<版本> latest` 里的版本必须
  已经发布过，所以首次发布不能靠事后回指来「清掉」`latest`。

### 线上实测记录（2026-10-12，GitHub Actions）

首次把两个 workflow 推上 `main`（`6b41042`）后的真实运行结果：

| run                                                                            | workflow                             | 结果                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------ | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [38214601263](https://github.com/Altermoe/fluere-vue/actions/runs/38214601263) | `CI`                                 | `check` / `test` / `docs` / `package-smoke` **四个 job 全绿**                                                                                                                                                        |
| [38214601257](https://github.com/Altermoe/fluere-vue/actions/runs/38214601257) | `Release`                            | `select-mode` 判定 `version` → `version` **成功**，开出 [release PR #2](https://github.com/Altermoe/fluere-vue/pull/2)（15 个文件：根 + 六包版本与 CHANGELOG，`apps/*` 未被改动）；`pack` / `publish` 按预期 skipped |
| [38215064332](https://github.com/Altermoe/fluere-vue/actions/runs/38215064332) | `CI`（PR #2 的 `pull_request` 事件） | **`action_required`**：分支由 `github-actions[bot]` 推送，run 被挂起等待维护者批准，因此 release PR 上默认没有跑完的检查（见上文「为什么 pack 里要自己跑一遍」）                                                     |

同一轮里被线上抓出并修掉的问题（`38214181271` → 修复于 `6b41042`）：`version.mjs sync` 曾把
private 的 `apps/*` 版本一并改掉，changesets action 因此把它们判为变更包并去读
`apps/docs/CHANGELOG.md`，version job 以 `ENOENT` 失败。修复后 `sync` / `check` 只覆盖六个
可发布包（见上文「版本策略」）。

### 尚未自动化 / 尚未线上验证

- **`pack` 与 `publish` 两个 job 还没在线上跑过**：它们只在 `mode == publish`（即 release PR 合并、
  main 上不再有 changeset）时执行，需要一次真实发布才能验证。首次 bootstrap 发布前请留出时间观察。
- **release PR 拿不到 CI 检查**（`GITHUB_TOKEN` 防递归，见上文），已用 `pack` 里的自证步骤兜住；
  若希望 PR 上也有绿勾，需要给 action 配 PAT / GitHub App token，属于后续可选项。
- `actions/checkout@v4` / `setup-node@v4` / `pnpm/action-setup@v4` 在 runner 上已被提示
  「targets Node.js 20 but is being forced to run on Node.js 24」，暂不阻塞；升级 action 大版本前
  需先确认新版输入名（如 setup-node 的缓存开关已改名）。
- `npm pack --dry-run` 复核仍是人工步骤（见上文「仅发布时人工」）。
