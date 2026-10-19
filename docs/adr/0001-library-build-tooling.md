# ADR-0001 · 库构建与发布基建选型（Vite lib mode · 纯 ESM）

- 状态：**已采纳**（2026-10-10）
- 范围：docs/todo.md 目标 3 的 3.1（包元数据）/ 3.2（构建管线）/ 3.3（版本与变更日志）

## 背景

六个库包（`designs` / `hooks` / `icons` / `themes` / `ui` / `utils`）此前**入口直指源码**
（`main` → `src/index.ts`，无 `dist`、无 `.d.ts`），从未发布。要在 npm 发布必须先补齐
「包元数据 + 构建产物 + 版本管理」这套基建。todo 要求构建器三选一（Vite 8 lib mode /
tsdown / unbuild），**先做 spike 再以 ADR 定结论**。

## 决策

### 1. 构建器：六个包统一用 Vite 8 lib mode（纯 ESM）

理由（对比 `tsdown` / `unbuild`）：

| 判据           | Vite lib mode ✅                                                               | tsdown         | unbuild           |
| -------------- | ------------------------------------------------------------------------------ | -------------- | ----------------- |
| 仓库现状契合度 | monorepo 全链路已用 Vite（vitest CLI、`@vitejs/plugin-vue`、`vue-tsc` 已安装） | 需新装依赖     | 需新装依赖        |
| Vue SFC 支持   | `@vitejs/plugin-vue` 一等公民                                                  | 弱，需额外配套 | 弱，需自配 rollup |
| `.d.ts`        | `vite-plugin-dts`（纯 TS 包）+ `vue-tsc`（SFC 包，见下）                       | 一般           | 一般              |
| 学习/维护成本  | 与测试/文档工具链同源，最低                                                    | 低             | 中                |

**关键约束**：`ui` 包是强 Vue SFC（57 个 `<style scoped>` + `<script setup>`）。Vue SFC 的
**精确 Props 类型只能由 vue 语言工具（`vue-tsc`）产出**——`vite-plugin-dts` 拿不到准确类型。
因此：

- 纯 TS 包（`designs` / `utils` / `hooks` / `themes`）+ 无 SFC 的 `icons`：用 `vite-plugin-dts`；
- `ui` 包：**JS/CSS 走 Vite，`.d.ts` 用 `vue-tsc -p tsconfig.build.json`（`emitDeclarationOnly`）** 生成，
  保留 SFC 精确 Props（如 `FluereButtonProps`），并保住 `__VLS_*` 组件签名。

### 2. 产物形态：纯 ESM（`type: module`，`exports` 只给 `import` + `types`）

不产 CJS。Vue 3 生态 ESM-first，消费端是 Vite / Nuxt / Node ESM，均原生支持；双格式会给
`exports`（`require`/`import` 条件）与 `package.json` 引入不必要的复杂度与误配风险。
`require()` 走 ESM 由 Node 的动态 import 兜底（attw 会给出可预期的 `CJSResolvesToESM` 提示，
属**已接受的取舍**，与 RC 预发布不占 `latest` 配套）。

### 3. 构建顺序（拓扑）

`pnpm -r --filter "./packages/*" build`。pnpm 按依赖图拓扑执行：
`designs`（先生成 token）→ `hooks` / `themes` / `icons` / `utils` → `ui`。
`ui` 的 dts 经各包 `exports`（仓库内指向源码，见 §4.1）解析互包类型，工程级属性由拓扑顺序保证。

### 4. 工作区互包的构建期解析

构建 tsconfig（`packages/*/tsconfig.build.json`）把 base `paths`（指向源码）**置空**：
`@fluere-vue/*` 走 `node_modules` 链接 + 各包 `exports`。这样产出的 `.d.ts` 里互包引用保留**包名说明符**
（`@fluere-vue/utils`），而非物理相对路径 `../../utils/dist/...`（后者发布后即失效）。
运行时同理外部化 `vue` / `reka-ui` / `@fluere-vue/*`。

### 4.1 仓库内解析源码、发布才用产物（publishConfig 覆盖）

各包的 `main` / `module` / `types` / `exports` 在仓库内一律指向**源码**
（`./src/index.ts`、`designs` 的 `./generated/*.ts`、`ui` 的 `./index.ts` 等），
发布时再由 `publishConfig` 覆盖回 `dist`：

```jsonc
{
  "main": "./src/index.ts",
  "exports": { ".": { "types": "./src/index.ts", "import": "./src/index.ts" } },
  "publishConfig": {
    "main": "./dist/index.js",
    "exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } },
  },
}
```

理由：`dist` 已 gitignore，而 `pnpm dev` / `pnpm docs:generate` / `pnpm tsc` 若走 `dist`，
就会要求「先手工 build 一次」——全新检出直接报 `No "exports" main defined`（`nuxt.config.ts`
由 jiti 加载，**不经过 Vite，因此无法用 alias / tsconfig paths 兜底**）。源码入口让开发链路
零构建依赖，`publishConfig` 由 pnpm/npm 在打包时覆盖字段（官方支持 `main` / `module` / `types` /
`exports` 等），因此**发布产物与消费方行为完全不变**（可用 `pnpm pack` 复核 tarball 内清单）。

`ui` 的 `./style.css` 是例外：它只存在于构建产物，仓库内仍指向 `./dist/style.css`；
开发态样式由 Vite 直接从各 SFC 注入（含 `designs/generated/tokens.css`），无需该入口。
源码入口的**全局 CSS 副作用导入**另有一套 `sideEffects` 要求，见 §4.2。

### 4.2 源码入口的全局 CSS：入口文件必须写进 `sideEffects`（Vite 8 / Rolldown）

`ui` 的入口 `index.ts` 顶部有三个「只为副作用」的 CSS 导入
（`@fluere-vue/designs/tokens.css`、`./src/focus-visual/focus-visual.css`、
`./src/navigation-view/navigation-view.css`）。只声明 `sideEffects: ["**/*.css"]` 不够：

- Rolldown（Vite 8 的打包器）的 DCE 语义（[docs/in-depth/dead-code-elimination.md](https://rolldown.rs/in-depth/dead-code-elimination.md)）：
  `sideEffects` 只说明「该文件被当作有副作用」；而 `index.ts` 的导出**全部是 re-export**，
  消费方只 `import { FluereButton }` 时，Rolldown 判定入口模块「自己的导出没有被使用」，
  于是把入口的语句（**含 bare CSS import**）按无副作用消除 —— CSS 自身的 `sideEffects`
  标记不参与入口这一层判定，救不回来。
- 症状：**dev 正常、生产构建静默丢样式**。2026-10-19 实测 `pnpm docs:generate` 产物里
  三个全局 CSS 一个都没进产物；`/os` 仿真桌面的侧边栏（`FluereNavigationView` 行视觉）
  与全站焦点环退回浏览器默认样式，而组件 scoped 样式仍在（scoped 由 SFC 自导入，不经包入口）。
  修复前实测：行 `min-block-size: 0px` / `font-size: 16px` / 无选中底色；修复后
  `36px` / `14px` / `rgba(0, 0, 0, 0.035)`（= `--subtleFillColorSecondary`）。
- 修法：`"sideEffects": ["**/*.css", "./index.ts"]` —— 入口因为加载全局 CSS 本来就有副作用。
  **不要**改成 `true`（关掉整包 JS tree-shake），也**不要**去掉 `**/*.css`（显式
  `import '@fluere-vue/ui/style.css'` 的消费方仍依赖它被标记为有副作用）。
- 回退防线：`packages/ui/src/__tests__/package-side-effects.test.ts` 守包元数据；
  CI 的 `generate docs site` 步骤在产物上断言 CSS 确实含
  `.fui-navigation-view__item` 与 `.fui-focus-visual`（端到端，防「元数据对了但构建仍丢」）。
- 已知代价：docs 站的 token 另经 UnoCSS `presetFluere` preflight 注入，修复后产物里
  token 定义出现两份（`entry.*.css` + `ui.*.css`，≈ +30 KB 未压缩 / +5.3 KB gzip）。
  与「样式丢失」相比可接受；要省掉这一份需让 docs 停用 preflight 的 token 注入，另案处理。

### 5. 版本策略：所有 `@fluere-vue/*` 统一版本号

继续沿用已落地的 `scripts/version.mjs`（单一事实源 = **根 `package.json`**，`version:sync` 写入全部子包；
`version:check --tag` 校验 git tag）。理由：包间存在交叉依赖（`ui` → hooks/utils/icons/designs；
`themes` → designs），统一版本避免「某一包的版本号漂移造成 peer 无法满足」。

### 6. 版本与 CHANGELOG：Changesets

接入 `@changesets/cli`（见 `docs/release.md`）：`changeset` 描述变更 → CI `changeset version`
统一 bump + 生成各包 `CHANGELOG.md` → 发布 `rc` tag 预发布。版本号不再手写。

## 后果 / 已知限制

- **attw**：`bundler` 与 `node10` 下主入口（`.`）全绿；`node16` 给出 ESM-only 提示与
  「类型声明里的相对导入为无扩展名写法」的内部解析告警——源于生成的 `.d.ts` 保留源码的无扩展名说明符
  （仓库源码全仓走 `moduleResolution: Bundler`）。`bundler`（Vite/Nuxt/`vue-tsc`）解析无碍，
  运行时 JS 为单文件 bundle（相对导入已内联或带 `.js` 扩展），故本仓库把它记为**已知、可接受**的技术债，
  不作为发布阻断；若未来要 Node16 原生类型消费，改为源码用显式 `.js` 扩展名（破坏面大，暂缓）。
- **CSS**：`ui` 的组件 scoped 样式 + `designs/tokens.css` 在构建时被抽成 `dist/style.css`，
  消费端需 `import '@fluere-vue/ui/style.css'`（`sideEffects: ["**/*.css", "./index.ts"]`
  保证 JS 可 tree-shake，同时保住源码入口的全局 CSS 副作用导入，理由见 §4.2）。
