# 发布指南（Publishing & Rollback）

> 配套：[docs/adr/0001-library-build-tooling.md](./adr/0001-library-build-tooling.md)（构建选型）、
> [docs/todo.md](./todo.md) 目标 3（整体计划）。

本文档描述如何把 `@fluere-vue/*` 六包发布到 npm，以及如何回滚。属于横跨 3.3（版本与 CHANGELOG）
与 3.4/3.5（发布流水线 / 正式发布）的操作手册。

## 版本策略

- **统一版本号**：`@fluere-vue/designs` / `hooks` / `icons` / `themes` / `ui` / `utils`
  六个包**始终同版本**（Changesets `fixed` 分组 + `scripts/version.mjs` 双重约束）。
  根 workspace `package.json` 的 `version` 是该统一版本的镜像（文档站页脚等读取它）。
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
# ① 先把目标基版本写进根 package.json（版本单一事实源），再由 sync 拉平到全部子包。
#    bump 只能从当前版本往上走：0.0.1 加 patch / minor 只会得到 0.0.2 / 0.1.0，到不了
#    0.3.0；而稳定版 0.3.0 进 rc 后是 0.3.1-rc.0。要发 0.3.0-rc.1，基版本必须是
#    0.3.0-rc.0（三种走法的实测见文末「版本流程演练记录」）。
node -e "const fs=require('fs'),f='package.json',p=JSON.parse(fs.readFileSync(f,'utf8'));p.version='0.3.0-rc.0';fs.writeFileSync(f,JSON.stringify(p,null,2)+'\n')"
pnpm version:sync                    # 0.3.0-rc.0 -> 根与全部子包

# ② 进 rc 预发布模式（生成 .changeset/pre.json，需提交入库）
pnpm exec changeset pre enter rc
pnpm version:packages                # = changeset version && node scripts/version.mjs sync -> 0.3.0-rc.1
pnpm build && pnpm test              # 构建 + 测试
pnpm exec changeset publish --tag rc # 发布到 npm（dist-tag=rc）
pnpm exec changeset pre exit         # rc 收尾（升正式版时再走一遍 stable 流程）
```

`version:packages` 里的 `version.mjs sync` 会把根与所有子包拉平（以最大版本为准回写根），
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

## 未来（3.4/3.5，本文件提前占位）

- CI：`release.yml`（Changesets action → release PR → 合并后按 tag 发布），PR 链跑
  `ci.yml`（frozen lockfile + check + test + build + docs:generate）。
- 正式 rc 发布：`changeset pre enter rc` → bump → 构建校验 → `publish --tag rc`，
  发布后从干净目录 `pnpm add @fluere-vue/ui@0.3.0-rc.1` 实机验证（渲染 / SSR / peer 警告）。
