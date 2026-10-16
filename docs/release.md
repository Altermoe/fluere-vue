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
> 注意：这只决定**预发布落到哪个 tag**，不等于 `latest` 一定不动——`latest` 的最终归属还取决于
> changesets 的 `only-pre` 判定，代码与实测见下文「dist-tag 由 changesets 判定」。

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
pnpm release:manual --move-tag           # 部署 tag v<version> 已存在时，允许把它移到本次发布提交
```

> `--` 分隔符可加可不加：pnpm 会把它原样透传给脚本，脚本已当分隔符忽略；`pnpm release:manual --yes`
> 与 `pnpm release:manual -- --yes` 等价。

脚本阶段：`0) 前置检查`（仓库根 / 工具 / 干净树 / 分支可达性 / pnpm 登录 / 强制 registry / version:check）→
`1) 目标版本解析` → `1.5) 部署 tag 冲突前置检查` → `2) 版本落定` → `3) 质量闸`（check + build + test + smoke:dist）→
`4) 提交版本产物` → `5) 发布预览` → `6) 正式发布` → `7) 打 tag 并推送` → `8) CHANGELOG 校验 / pre 收尾` → `9) 完成`。

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
- **dist-tag 由 changesets 判定，不是"预发布一律不占 `latest`"**：`@changesets/cli` v3
  `dist/getPublishPlan.mjs` 的 `getReleaseTag()` 逻辑是「显式 `--tag` > pre tag > `latest`」，
  而 pre tag 只在**该包不是"只有预发布"**时才用：
  ```js
  // publishedState 的判定（同一文件内）
  if (
    preState != null &&
    info['dist-tags'].latest &&
    info.versions.every((v) => semver.parse(v).prerelease[0] === preState.tag)
  )
    publishedState = 'only-pre'
  //   only-pre  ⇒ getReleaseTag 走 return "latest"（包上还没有"正式版本"可指）
  //   其余情况  ⇒ 走 return preState.tag（这里是 alpha / rc）
  ```
  关键是 `every(...)` 要求**所有**已发布版本的 `prerelease[0]` 都等于当前 pre tag；任何一个
  **别的标识**的版本都会让它为 `false`。本仓库六包上的占位版 `0.0.0-stage` 的
  `prerelease[0] === "stage"`（`semver.parse("0.0.0-stage").prerelease` → `["stage"]`），
  于是判定恒为 `false` ⇒ **预发布一律落在 pre tag 上，`latest` 一直不动**，直到非 pre 的稳定版发布
  （届时 `0.4.0` 不带 pre tag，`every(...)` 比较的是 `prerelease[0]`、稳定版为 `undefined`，
  该判定本身是否放行仍以发布后实测 `dist-tags` 为准，别把这里的推演当既成事实）。
  实测钉住：把六包版本推到 `0.4.0-alpha.2` 后对真实 registry 跑只读
  `changeset publish-plan`，六包输出全是 `(alpha)`——`latest` 不在命中集合里。
  **部署链路（`release.yml`）也是这条规则**：`pack` 把算好的 tag **写死进** `publish-plan.json`
  （`pack.mjs`），`publish` job 带 `fromPackDir` 后 `preState` 为 `undefined`、只照读 plan 里的 tag，
  不再重新判定，所以"pack 时算出什么 tag，就发到什么 tag"。
  > 证据缺口：`0.3.0-alpha.2` 首发时 `latest` 与 `alpha` 同时指向它，与上面的判定
  > （`0.0.0-stage` 已在 registry 上 ⇒ 应为 `alpha`）**不一致**，该次发布的真实成因没有证据留存，
  > 本手册不再为它编机制。只把结论留在事实层：**`latest` 要改指，必须显式
  > `npm dist-tag add`（见「回滚与补救」），不要指望发布链路替你动它。**
- **预览用 `changeset publish-plan`，不是 `publish --dry-run`**：`@changesets/cli` 的 `publish` **没有**
  `--dry-run` 选项（传了会 `Unknown option` 报错），预览走只读的 `publish-plan` / `status --verbose`；
  tarball 内容复核仍由 `pnpm smoke:dist` 覆盖。
- **部署 tag 必须是注解 tag**：`v<version>` 用 `git tag -a` 建（changesets 生成的逐包 tag 本就是注解的）。
  OneDev deploy 只认 `v*`，且要求 tag 落在 main 可达提交上。**推送不再用 `--follow-tags`**：
  `--follow-tags` 会顺带推所有从本次提交可达的注解 tag，一旦远端存在已分叉的历史 tag（如本地与 onedev
  的 `v0.0.1` 不同）整条 push 会失败；脚本改为只推 `分支 + 部署 tag + 本次逐包 tag` 的显式 refspec。
- **部署 tag 冲突前置判定（`--move-tag`）**：`v<version>` 是文档站部署标记，可能**早于**真正的 npm 发布
  就被打上（先 seed 版本对齐文档站、之后又原样发布同一版本）。脚本在第 1.5 步判定：指向当前提交则复用；
  指向别的提交则默认**早退**（退出码 2），确需把 tag 移到本次发布提交时才加 `--move-tag`（`git tag -f`
  重建 + 只对该 tag force push）。详见下文「踩坑记录」。
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

| 检查项        | 实测结果                                                                                                                                                                                                                                            |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 六包发布      | `@fluere-vue/{designs,hooks,icons,themes,ui,utils}@0.3.0-rc.1` 全部成功                                                                                                                                                                             |
| dist-tags     | **`rc` 与 `latest` 同时指向 `0.3.0-rc.1`** —— 彩排观察值。注意这与 2026-10-13 线上结果**不同**（线上预发布只落在 pre tag、`latest` 不动），该差异的成因**没有证据留存**，本手册不为此编机制，只把"`latest` 要改指必须显式 `npm dist-tag add`"当结论 |
| git tag       | 逐包生成 `@fluere-vue/<pkg>@0.3.0-rc.1`；**与部署用的 `v0.3.0-rc.1` 不是同一个 tag**，后者仍需手工打                                                                                                                                                |
| 发布 manifest | `workspace:*` 已改写为 `0.3.0-rc.1`、`reka-ui` 固定为实际版本、`exports`/`types` 指向 `./dist/*`                                                                                                                                                    |
| 干净目录安装  | 新工程 `pnpm add @fluere-vue/ui@0.3.0-rc.1 vue` 成功，六个包从 registry 拉齐                                                                                                                                                                        |
| SSR           | `renderToString` 渲染 `<FluereButton>` 通过（输出含 `fui-button` 与文案）                                                                                                                                                                           |
| CSS 引入      | `import '@fluere-vue/ui/style.css'` 经 Vite 构建进产物（107.5 kB CSS，含 `fui-button`）                                                                                                                                                             |
| 纯类型引用    | 消费方 `vue-tsc --noEmit` **exit 0**（工具链对齐仓库：vue-tsc 3.3.8 + typescript 6.0.3）                                                                                                                                                            |

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
→ 这几项已在 2026-10-13 的 `0.4.0-alpha.1` 真实发布里跑通，见下文「线上实测记录（2026-10-13）」。

## 踩坑记录：seed 版本被原样发布，撞上部署 tag（2026-10-13）

**现象**：同一次发版后，`0.3.0-alpha.2` 出现两套指向**不同提交**的 tag：

| tag                                                               | 指向                            | 来源                         |
| ----------------------------------------------------------------- | ------------------------------- | ---------------------------- |
| `v0.3.0-alpha.2`                                                  | `6345d74`（10-12 的 seed 提交） | 手工打的文档站部署标记       |
| `@fluere-vue/{designs,hooks,icons,themes,ui,utils}@0.3.0-alpha.2` | `8dfa64f`（10-13 的发布提交）   | `changeset publish` 自动生成 |

两端都是**注解 tag**，所以看起来"同一个版本号被标了两次"；实际是本仓库刻意的**双层 tag**
（逐包 tag 标识包版本；`v*` 是文档站部署标记，OneDev deploy 只认 `v*`），本身不是 bug。

**根因**：10-12 为对齐文档站，把全仓版本 **seed** 到 `0.3.0-alpha.2` 并打了部署 tag `v0.3.0-alpha.2`
（提交信息即"全仓版本 seed 到 0.3.0-alpha.2（对齐文档站部署 tag）"）。**seed 不是发布**——它只写
`package.json` 版本、不发布、不消费 changeset。10-13 又用 `pnpm release:manual`（不带版本参数）
把这个已 seed 的版本**原样发布**（`CMP=0`），于是同一个版本号先被部署 tag 占用、后又被当作发布版本。
连带两个后果：① `.changeset/` 里的 3 条 changeset 没被消费，`0.3.0-alpha.2` 没有 CHANGELOG 条目；
② 旧脚本在第 7 步才发现 `v0.3.0-alpha.2` 已存在并 `die`——**发布已经发出去了**，分支与 tag 都没推。

**纠正**（本次实际执行，`v0.3.0-alpha.2` 由 `6345d74` 移到发布提交 `8dfa64f`）：

```bash
git tag -f -a v0.3.0-alpha.2 8dfa64f -m "docs site deploy: 0.3.0-alpha.2"   # 本地把部署 tag 重指到发布提交
# 逐远端推送（以 onedev 为例，github 同理）：先推分支，保证 tag 落在 main 可达提交上，再推 tag。
git push onedev main
git push onedev '+refs/tags/v0.3.0-alpha.2:refs/tags/v0.3.0-alpha.2'        # 远端已有旧 tag，用 + 强制覆盖
git push onedev 'refs/tags/@fluere-vue/designs@0.3.0-alpha.2' \
                'refs/tags/@fluere-vue/hooks@0.3.0-alpha.2' …               # 其余逐包 tag 逐个补推
```

**新约束（已落进脚本）**：

1. **seed ≠ 发布**：给某版本号打了 `v*` 部署 tag 之后，不要再"原样发布"该版本。真正的发布版本应由
   changeset 从 seed 版本往上 bump（如 seed `0.3.0-alpha.2` → 发 `0.3.0-alpha.3`），这样版本号才是唯一的。
2. 脚本第 **1.5 步**在发布前判定 `v<version>`：指向当前提交则复用，指向别的提交则**以退出码 2 早退**
   （早退发生在写盘 / 发布之前），并提示"往上 bump"或"加 `--move-tag`"。`pnpm release:manual --check` 也覆盖这一项。
3. tag 推送改用显式 refspec（不再 `--follow-tags`），并把"移动到已有部署 tag"收敛为一个显式开关
   `--move-tag`，避免历史 tag 分叉让整条 push 失败。

**没覆盖到的**：`v0.0.1` 在 onedev（`96bf4ae`）与本地/GitHub（`f5de617`）本就不同，是更早的历史分叉，
本次未动；`--move-tag` 会 force push 部署 tag，远端受保护规则若拒绝则需人工处理。

## 踩坑记录：onedev 上「先推 tag、后推分支」会让 tag 构建全线秒败（2026-10-13）

`v0.3.0-alpha.2` 的部署 tag 比分支早推 34 秒（tag `02:12:19`、分支 `02:12:53`），OneDev 侧
`check` / `test` / `build` / `package-smoke` / `deploy` 五个 job **全部在 60 ms 内失败**
（build 213–215 等），日志只有一行：

```
No authorized job secret found (project: fluere-vue, job secret: CI_HTTP_PROXY)
```

这不是限流也不是资源不足：OneDev 的 job secret 按**提交可达性**授权（授权写 `on branch "**"`，
见 [.onedev-buildspec.yml](../.onedev-buildspec.yml) deploy job 的注释），tag 指向的提交当时还不在
任何分支上，密钥直接不可用。

`0.4.0-alpha.1` 改回「**分支先推、tag 后推**」（分支 `11:14:27` → 部署 tag `11:14:31`），
同一批五个 job 全绿：`build#82` / `check#83` / `test#84` / `package-smoke#85` / `deploy#86`，
部署日志收尾为 `[deploy] 健康检查通过：v0.4.0-alpha.1 已上线`。
`release:manual` 的推送顺序（分支 → 部署 tag → 逐包 tag）正是为此，手工补推时别颠倒。

## 回滚与补救

- **发错了 tag / 版本**：
  ```bash
  npm deprecate @fluere-vue/ui@<坏版本> "请升级到 <好版本>"   # 软提示，不撤销
  npm dist-tag rm @fluere-vue/ui rc                          # 移除污染的 dist-tag
  npm dist-tag add @fluere-vue/ui@<好版本> latest            # latest 回指上一版
  ```
- **`latest` 被预发布占住**：按上文「dist-tag 由 changesets 判定」核对 `only-pre` 条件——若包上已有
  非当前 pre tag 的历史版本（本仓库是 `0.0.0-stage`）而 `latest` 仍被预发布占了，说明判定与实际不符，
  按"没有证据就显式处理"的原则用上面 `dist-tag add` 手工回指；若 `latest` 只是停在旧版本（正常现象），
  等非 pre 的稳定版发布或手工回指。`latest` 指向预发布**不代表发布失败**，只影响不带版本号的安装。
- **已发布版本不可变**：修正版必须发新版本号（`0.3.0-rc.2` 等），绝不覆盖已发布版本。
- **撤销 git tag / GitHub Release**（`release.yml` 的 publish job 会同时建两者，但建的是**逐包**的
  `@fluere-vue/<pkg>@<ver>`——**不是** `v<version>`，2026-10-13 实测见下文「线上实测记录」）：
  ```bash
  gh release delete '@fluere-vue/ui@0.3.0-rc.1' --yes --cleanup-tag   # 删 Release 并连带删远端 tag
  git push origin ':refs/tags/@fluere-vue/ui@0.3.0-rc.1'              # 兜底：tag 还在就单独删
  git tag -d '@fluere-vue/ui@0.3.0-rc.1'                              # 本地
  ```
  六个包（`designs` / `hooks` / `icons` / `themes` / `ui` / `utils`）逐包各来一遍。撤销 tag 前先确认
  npm 上的版本确实要废弃（版本本身撤不掉，只能 `deprecate`）。
- **部署 tag 落错提交（`v*` 指向旧提交）**：本地 `git tag -f -a v<version> <正确提交> -m "docs site deploy: <version>"`
  重指，再逐远端推分支与 tag；远端已有旧 tag 时用 `+`/`--force` 覆盖（见上文「踩坑记录」的纠正命令）。
  日常发版不必手工做——`pnpm release:manual --move-tag` 已把这一步收敛为开关。
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
   两边不一致会让 OIDC 校验失败，报的还是误导性的 404）。**已配置生效**（2026-10-14 起连续两次自动发布成功，见下文实测记录）。
4. publish job 的 `setup-node` **必须**带 `registry-url: https://registry.npmjs.org`：pnpm v11 下
   不写 registry 进 `.npmrc`，OIDC 换取会失败。**不要**配 `NODE_AUTH_TOKEN`——凭据来自 OIDC。
   provenance 在 trusted publishing 下由 pnpm 自动附带，不需要 `--provenance`。

### 两个已知陷阱

- **预发布不会替你移动 `latest`**：changesets 只在 `only-pre` 判定成立时才把版本发到 `latest`，
  而该判定要求"所有已发布版本的 `prerelease[0]` 都等于当前 pre tag"。**本仓库六个包带着
  `0.0.0-stage` 占位版，判定恒为 `false`**，所以预发布一律落在 `alpha`、`latest` 原地不动
  （判定代码见上文「dist-tag 由 changesets 判定」；六包现状 = `latest` 停在 `0.3.0-alpha.2`）。
  后果是**用户 `npm i @fluere-vue/ui` 会装到旧版**，要装预发布必须显式写 `@alpha` / `@rc`。
  发布说明与 GitHub Release 正文里要写明这条已知行为，避免被当成事故。
  changesets 那条「packages that have not had normal releases will be published to `latest`」警告
  只描述它自己的 `only-pre` 分支，**不要**据此推断"预发布会占 `latest`"。
- **`latest` 要改指只能显式操作**：`npm dist-tag add <pkg>@<已发布版本> latest`（六个包各一次），
  版本必须**已经发布过**，所以首次发布不能靠事后回指来「清掉」`latest`。

### dist-tag 判定规则实测（2026-10-13，对真实 registry）

起因：线上 `0.4.0-alpha.1` 六个包发布成功，但 `npm i @fluere-vue/ui` 仍装到 `0.3.0-alpha.2`
（用户视角像"没发出去"）。实测过程与结论：

| 步骤                     | 命令 / 端点                                                               | 结果                                                                            |
| ------------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 版本是否真在 registry 上 | `GET /@fluere-vue%2F<pkg>/0.4.0-alpha.1`                                  | 六包全 `200`                                                                    |
| dist-tag 到底指哪        | `GET /-/package/@fluere-vue%2F<pkg>/dist-tags`                            | `{"latest":"0.3.0-alpha.2","alpha":"0.4.0-alpha.1"}`                            |
| 消费方实际装到哪         | 干净目录 `npm i @fluere-vue/ui@latest` / `@alpha`                         | `0.3.0-alpha.2` / `0.4.0-alpha.1`                                               |
| 为什么没命中 `latest`    | `semver.parse("0.0.0-stage").prerelease`                                  | `["stage"]` ≠ `"alpha"` ⇒ `every(...)` 为 `false` ⇒ `publishedState ≠ only-pre` |
| 下一个版本会发到哪个 tag | 一次性副本里把六包推到 `0.4.0-alpha.2` → `changeset publish-plan`（只读） | 六包全是 `@fluere-vue/<pkg>@0.4.0-alpha.2 (alpha)`                              |

判读要点：`pack` → `publish` 链路里 tag 是 **pack 阶段算好写进 `publish-plan.json`** 的，
`publish` job 不再重算；所以核对发到哪个 tag，看 pack 日志里的
"Packages to publish / (alpha)" 一行即可，不必等发完再猜。
另：`pnpm release:manual --check` / `changeset publish-plan` 都是**只读**的，改判定逻辑前先用它预演。

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

### 线上实测记录（2026-10-13）

首次由 CI 走完真实发布 `0.4.0-alpha.1`。

这一次同时是 **npm Trusted Publishing（OIDC）的首次线上验证**（`0.3.0-alpha.2` 是本机
`release:manual` 用粒度 token 人工 bootstrap 的，见上文「一次性准备」第 2 条）。前置动作：
根 seed 到 `0.4.0-alpha.0` → `pnpm version:sync`（六包拉平）→ 推 `main`。

| 阶段                                     | 实测结果                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 推 `main`（`658f9f3` seed 提交）         | `Release` run [38387183343](https://github.com/Altermoe/fluere-vue/actions/runs/38387183343)：`select-mode` 判 `version` → `version` job 把消费掉的 changeset 收进 `.changeset/pre/`、bump 六包到 `0.4.0-alpha.1` 并**更新已存在的** release PR #2（不新建 PR）；`pack` / `publish` 按预期 skipped                                                                      |
| 合并 release PR #2（发布提交 `6a0ba67`） | `Release` run [38387428783](https://github.com/Altermoe/fluere-vue/actions/runs/38387428783)：`select-mode` 判 `publish` → `pack`（`pnpm check && pnpm test` + `build` + `smoke:dist`）→ `publish`，**三个 job 全绿**                                                                                                                                                   |
| npm                                      | 六个包 `0.4.0-alpha.1` 全部发布；`alpha` dist-tag 指向它，`latest` 仍停在 `0.3.0-alpha.2`。按 `only-pre` 判定（六包带占位版 `0.0.0-stage` ⇒ 恒为假）这正是预期结果；**这是判定推演，未取到该 run 的 pack 日志**（GitHub API 未认证、日志取不到）。副作用：`npm i @fluere-vue/ui` 仍装 `0.3.0-alpha.2`，要装新版需显式 `@alpha`                                          |
| 可信发布源                               | 每包 `_npm/v1/attestations` 都有两份证明（npm publish v0.1 + [SLSA provenance v1](https://slsa.dev/provenance/v1)）；签名证书（Fulcio 签发、**有效期仅 10 分钟**）的 SAN 为 `https://github.com/Altermoe/fluere-vue/.github/workflows/release.yml@refs/heads/main` —— 凭据来自 OIDC 而非任何长期 token，`id-token: write` 只给 publish job 的拆法确认可用               |
| git tag / GitHub Release                 | `changeset publish` 建的是**逐包注解 tag** `@fluere-vue/<pkg>@0.4.0-alpha.1`（均指向 `6a0ba67`）与**逐包 GitHub Release**（`prerelease: true`，`github-actions[bot]` 建）；**没有** `v0.4.0-alpha.1` —— `v*` 是 OneDev 文档站部署标记，仍由 `release:manual` 打（见「踩坑记录」）                                                                                       |
| OneDev 文档站（手工补推）                | 把 `main`、部署 tag `v0.4.0-alpha.1`（注解 tag，指发布提交 `6a0ba67`）与六个逐包 tag 推给 `onedev`；**分支先推、tag 后推**，tag 构建五个 job 全绿（`build#82` / `check#83` / `test#84` / `package-smoke#85` / `deploy#86`），`deploy` 日志 `[deploy] 健康检查通过：v0.4.0-alpha.1 已上线`；`https://fluere-vue.nahida.space/` 首页实测含 `docsVersion:"v0.4.0-alpha.1"` |

> **复核 npm 是否真发出去，别只看 `npm view`**：registry 的 `dist-tags` 端点会先于 packument 更新。
> 本次实测 `designs` / `utils` 的 packument 在发布完成后数分钟仍列旧版本（一度看起来像「只发了四个包」），
> 而 `https://registry.npmjs.org/-/package/@fluere-vue%2F<pkg>/dist-tags` 已是新值。判定口径：
> 以 `https://registry.npmjs.org/@fluere-vue%2F<pkg>/<version>` 的 HTTP 状态（200 = 已发布）为准。

### 线上实测记录（2026-10-14）

第二次由 CI 走完真实发布 `0.4.1-alpha.1`，也是「自动发版链路自 `0.4.x` 起常态化」的确认。

| 阶段                                  | 实测结果                                                                                                                                                                                                                           |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 推 `main`（`cf55377` seed 提交）      | `Release` run [38528831348](https://github.com/Altermoe/fluere-vue/actions/runs/38528831348)：`select-mode` 判 `version` → `version` job 消费 changeset、bump 六包到 `0.4.1-alpha.1` 并更新 release PR；`pack` / `publish` skipped |
| 合并 release PR（发布提交 `b5941d4`） | `Release` run [38529743664](https://github.com/Altermoe/fluere-vue/actions/runs/38529743664)：`select-mode` 判 `publish` → `pack`（`pnpm check && pnpm test` + `build` + `smoke:dist`）→ `publish`，**三个 job 全绿**              |
| npm                                   | 六包 `0.4.1-alpha.1` 全部发布；`alpha` = `0.4.1-alpha.1`、`latest` 仍停在 `0.3.0-alpha.2`（`only-pre` 判定恒为假，预期行为）                                                                                                       |
| 可信发布源                            | 每包 `_npm/v1/attestations` 各 2 份证明；对照人工 bootstrap 的 `0.3.0-alpha.2` 为 `404` ⇒ 凭据确实来自 OIDC。**全程未配 `NODE_AUTH_TOKEN`**，`id-token: write` 只给 publish job 的拆法再次验证可用                                 |
| OneDev 文档站（手工补推）             | 把 `main`、部署 tag `v0.4.1-alpha.1`（注解 tag，指发布提交 `b5941d4`）与六个逐包 tag 推给 `onedev`；**分支先推、tag 后推**，tag 构建五个 job 全绿，`deploy` 日志含 `[deploy] 健康检查通过：v0.4.1-alpha.1 已上线`                  |
| 后续 push 的判定                      | 2026-10-15 / 10-16 的 `Release` run（如 [38884420129](https://github.com/Altermoe/fluere-vue/actions/runs/38884420129)）`select-mode` 均判 `none`，三个 job 按预期 skipped —— 没有待发布 changeset 时不会重复发包                  |

> 复核口径同上一节：以 `https://registry.npmjs.org/@fluere-vue%2F<pkg>/<version>` 的 HTTP 状态为准，不以 `npm view` 为准。

### 尚未自动化 / 尚未线上验证

- **`v<version>` 部署 tag 不由 `release.yml` 建**：GitHub 这条链路只产逐包 tag / Release，OneDev 文档站
  部署要的 `v*` 仍需 `pnpm release:manual`（或手工 `git tag -a` + 逐个 refspec 补推）——`0.4.0-alpha.1`
  与 `0.4.1-alpha.1` 都是这么补的（见上文两条「线上实测记录」的 OneDev 行）。
- **release PR 拿不到 CI 检查**（`GITHUB_TOKEN` 防递归，见上文），已用 `pack` 里的自证步骤兜住；
  若希望 PR 上也有绿勾，需要给 action 配 PAT / GitHub App token，属于后续可选项。
- `actions/checkout@v4` / `setup-node@v4` / `pnpm/action-setup@v4` 在 runner 上已被提示
  「targets Node.js 20 but is being forced to run on Node.js 24」，暂不阻塞；升级 action 大版本前
  需先确认新版输入名（如 setup-node 的缓存开关已改名）。
- `npm pack --dry-run` 复核仍是人工步骤（见上文「仅发布时人工」）。
