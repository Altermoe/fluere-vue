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

- `fixed` 分组保证：任一 `@fluere-vue/*` 有 changeset，`changeset version` 会把六包 + 根
  一并 bump 到同一新版本（`patch` / `minor` / `major` 按最大者）。
- 发布用 **rc 预发布模式**（`changeset pre enter rc`），避免污染 `latest`：

```bash
pnpm exec changeset pre enter rc    # rc 预发布开始（生成 .changeset/pre.json）
pnpm version:packages                # = changeset version && node scripts/version.mjs sync
pnpm build && pnpm test              # 构建 + 测试
pnpm exec changeset publish --tag rc # 发布到 npm（dist-tag=rc）
pnpm exec changeset pre exit         # rc 收尾（升正式版时再走一遍 stable 流程）
```

`version:packages` 里的 `version.mjs sync` 会把根与所有子包拉平（以最大版本为准回写根），
并在各发布包生成 `CHANGELOG.md`（changelog 提供方：`@changesets/cli/changelog-git`）。

## 发布前质量闸

- `pnpm check`（lint + format + tsc + i18n + 版本一致性）
- `pnpm test`（含「从 dist 引入并渲染」冒烟：`dist-smoke.test.ts`）
- `pnpm build`（拓扑：designs → hooks/themes/icons/utils → ui）
- `pnpm exec publint ./packages/*` + `pnpm exec attw --pack <each>`：主流（bundler）入口全绿；
  `node16` 的 ESM-only 与「类型声明无扩展名相对导入」告警为**已知可接受**（见 ADR「已知限制」）。
- `npm pack --dry-run` 复核 tarball 内容（不含源码测试、含 `dist/*.css` 与 `.d.ts`）。

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
