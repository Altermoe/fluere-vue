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
pnpm exec changeset publish --tag rc # 发布到 npm（dist-tag=rc）
pnpm exec changeset pre exit         # rc 收尾（升正式版时再走一遍 stable 流程）
```

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

| job           | 条件              | 权限                                      | 做什么                                                                |
| ------------- | ----------------- | ----------------------------------------- | --------------------------------------------------------------------- |
| `select-mode` | 总是              | `contents: read`                          | 判定 `version` / `publish` / `none`（有 changeset 就开 PR，没有就发） |
| `version`     | `mode == version` | `contents: write`、`pull-requests: write` | `pnpm version:packages` → 开/更新 release PR                          |
| `pack`        | `mode == publish` | `contents: read`                          | `pnpm build` → `pnpm smoke:dist`（质量闸）→ 按发布计划打 tarball      |
| `publish`     | `needs: pack`     | `contents: write`、`id-token: write`      | 只上传 pack 出来的 tarball；打 tag + 建 GitHub Release                |

`id-token: write` **只给 publish job**：npm 与 Changesets 都要求这样，否则任何在 version 步骤里
跑起来的代码都能换到 OIDC 令牌去发包；顶层 `permissions: {}` 归零，逐 job 显式声明。

### 一次性准备（人工，仓库里改不了）

1. 仓库设置 `Settings → Actions → General` 勾选 **Allow GitHub Actions to create and approve pull requests**
   （否则 release PR 建不出来）。
2. **首次发布必须人工 bootstrap**：npm 的 trusted publisher 是挂在**已存在的包**上的设置项，
   没有 pending publisher，六个包从未发布过 ⇒ 第一个版本发不出去。做法是先用粒度 token（或本机
   `npm login`）发一次，再给六个包各配一次 trusted publisher，之后才轮到 workflow 自动发布。
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

### 尚未自动化

- 本机无法执行 GitHub workflow：本文件的 `release.yml` 只过了 actionlint（1.7.7）静态校验，
  首次真实运行前请先用一次真实 release 验证（`select-mode` 的判定、artifact 在 job 间的传递）。
- `npm pack --dry-run` 复核仍是人工步骤（见上文「仅发布时人工」）。
