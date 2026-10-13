# 贡献指南（CONTRIBUTING）

感谢愿意为 FluereVue 出一份力。本文件面向**普通贡献者**，说明提交改动前需要读什么、按什么流程做、以及合并闸门。**动手改任何代码之前，请先读完本文与对应规范。**

> 面向代码 Agent 的仓库操作约定在 [AGENTS.md](./AGENTS.md)；样式与行为的对齐依据在 [docs/style-spec.md](./docs/style-spec.md)；SSR 约束在 [docs/ssr-guide.md](./docs/ssr-guide.md)；实施清单与验收口径在 [docs/todo.md](./docs/todo.md)。

## 环境准备

- **Node** >= 22.13（推荐 26）。
- **pnpm** `11.27.0`，版本由根 `package.json` 的 `packageManager` 字段指定；启用 Corepack 后会自动使用对应版本，CI 也读取该字段安装依赖。

```bash
git clone https://github.com/Altermoe/fluere-vue.git
cd fluere-vue && pnpm install
pnpm dev          # 文档站 http://localhost:60727
```

其他常用命令见 [README · 本地开发](./README.md#本地开发)。

## 先读什么

| 你要改的东西          | 先读                                                                                     |
| --------------------- | ---------------------------------------------------------------------------------------- |
| 组件样式、状态、动效  | [docs/style-spec.md](./docs/style-spec.md)（权威层级、版本核对、token 映射、证据链要求） |
| 任何 `setup()` 期代码 | [docs/ssr-guide.md](./docs/ssr-guide.md)（浏览器 API 分级处理，禁止裸访问 `window`）     |
| 新增 / 修改组件的定位 | [docs/todo.md](./docs/todo.md)（版本地图、实施顺序、每版验收标准）                       |
| 包发布、版本号、tag   | [docs/release.md](./docs/release.md)                                                     |
| CI 与部署机制         | [docs/ci.md](./docs/ci.md)、[docs/deployment.md](./docs/deployment.md)                   |

**权威层级（冲突时按此顺序）**：WinUI 3 / Windows App SDK 源码（`microsoft-ui-xaml`）> Fluent token 表 > 截图验证。Fluent UI React v9、Fluent 2 Web 规范页、WinUI 2 / UWP 文档、博客与二手 Web 实现只能用来找线索，结论必须回到源码或 token 才能落地。

## 认领与讨论

- 先搜索现有 issue / PR，避免重复劳动。
- 大改动（新增组件、跨组件基建、构建与发布流程变更）请先开 issue 说清范围与验收口径，再动手。
- 一次 PR 只做一件事：不要把重构、格式化和功能改动混在一起，评审按 hunk 逐条核对会更慢。

## 标准开发流程（新增 / 修改组件）

改组件 = 改 **SFC + 契约测试 + 文档示例 + API 表**，四件套一起改，并顺手删掉过时的注释与文案。完整步骤：

1. **定规格**：按 [style-spec §2/§3](./docs/style-spec.md#2-版本地图先对版本再读代码) 对齐版本——目标 WinUI3 Gallery 发行版 → 其 `standalone.props` 的 `WindowsAppSdkPackageVersion=N` → `microsoft-ui-xaml` tag `winui3/release/<N>`（不是 `main`）。再按 §4 顺序读 `*.xaml` / `*_themeresources.xaml` / `*.idl` / `*.cpp` / `AnimatedVisuals/*.cpp`，把状态表、尺寸、动效关键帧抄成组件注释里的「对照清单」。**模板结构也是规格**：源模板有几层、有没有箭头 / Pointer、内容是否换行，都要照抄。
2. **落 token**：视觉值只写 `var(--TokenName)`（事实源 `packages/designs/data/fluent-tokens.json`，产物 `tokens.css`）。先在 `*_themeresources.xaml` 把资源名追到最终 Color / 数值，再到 token 表找**同值**项；没有同值时取**语义位最近**者，并在组件注释里记录 ΔE 与合成依据。资源定义可能不在控件目录里（如 Acrylic Brush 在 `src/controls/dev/Materials/Acrylic/`），要顺着 `StaticResource` 跨目录追。**禁止硬编码色值，禁止凭截图取色。**
3. **实现组件**：`packages/ui/src/<component>/<component>.vue` —— `<script lang="ts">` 写 Props 契约与来源注释，`<script setup lang="ts">` 写逻辑，`<style scoped>` 只用 token 并逐条注明对应的 WinUI 资源。
4. **写测试**：`<component>.test.ts` 与组件同目录；内容为渲染 / ARIA 契约 + 从 SFC 源码解析样式与关键帧的契约断言（jsdom 解析不了 `var()`，见 style-spec §7.1）。跨组件纯函数测试放 `__tests__/`。
5. **补文档**：`apps/docs/content/{zh-Hans,en}/components/<component>.md`（含 frontmatter 的 `title` / `description` / `nav`）+ `apps/docs/components/content/demos/<component>/*.vue`，`## API` 表与实现要点同步更新，双语页面一起补。
6. **验证与自检**：跑下面的《合并闸门》。涉及「值本身取不到 A 级源码」、「浮层样式作用域」或动效几何的改动，**必须先在真实浏览器里量一遍**再收工——单元测试在 jsdom 下照样全绿，只有 `getComputedStyle` 能暴露 scoped / Teleport 导致的样式静默失效。

## 合并闸门

自 0.4.0 起，**校验是每个组件 PR 的合并闸，不是某个版本阶段的活**。任一组件 PR 必须同时满足以下四条才允许合并：

- [ ] **四件套完整**：SFC + 契约测试 + 文档页（`apps/docs/content/components/*.md`）+ 示例（`apps/docs/components/content/demos/*/`）
- [ ] **规格出处**：控件名 + `microsoft-ui-xaml` tag / commit + 关键文件路径，写入组件注释
- [ ] **测量证据**：动效 / 几何类改动给出可复现的测量（冻结帧 + 像素角度或取色），方法见 [style-spec §7](./docs/style-spec.md#7-验证证据链结论必须有证据)
- [ ] **闸门全绿**：`pnpm check` / `pnpm test` / `pnpm lint:ssr`

跨组件基建（`useFlyout`、z-index 刻度、`useFocusVisual`、`ItemContainer`、`useSelection` 等）出错会污染下游全部组件，**不接受「跟着某个组件顺手合并」**，需要一次专项复核，要点见 [docs/todo.md](./docs/todo.md#人工校验闸门040-起生效)。

提交前请自查（等价于仓库的 Definition of Done）：

- [ ] 状态齐全：`rest` / `hover` / `pressed` / `focus` / `disabled` / `inactive`，明暗主题均覆盖（HC 暂不实现需注明）
- [ ] 动效逐帧核对：时长、缓动、关键帧、方向、循环衔接
- [ ] 浮层类组件在**真实浏览器**里量过计算样式，并留一张明暗对照截图
- [ ] `pnpm check`、`pnpm test`、`pnpm lint:ssr` 全绿
- [ ] `pnpm docs:generate` 中新增页面能预渲染，且不引入新的 404（既有失败需在 PR 里注明）
- [ ] 验证结论留在仓库里（组件注释 / 契约测试 / 文档页）；`temp/` 下的脚本与截图不提交
- [ ] 未提交 `temp/` 内容，未改动 [docs/todo.md](./docs/todo.md) 的验收口径来「让结果看起来达标」

## 代码约定要点

完整约定见 [AGENTS.md](./AGENTS.md)，最容易踩的几条：

- **注释与文档用中文**，专有名词保留英文；中英文 / 数字之间留一个半角空格。
- **不引入全局样式**：组件必须自包含，页面级工具类只出现在 `apps/*`。唯一例外是 Teleport 出去的浮层（拿不到 `data-v-*`，scoped 样式会静默失效），允许写非 scoped 样式，但类名必须是本库私有的 `.fui-<component>` 前缀，并在注释里写明理由。**不要无脑全改**：`ContentDialog` 这类经底座 `as-child` 透传 attributes 的浮层是能拿到 scopeId 的。
- **无同值 token 的视觉量 → 组件局部变量**：以 `--fui-<component>-<slot>` 声明，注释写清 WinUI 资源名、为什么 token 表没有同值档、消费方如何覆盖。
- **取不到 A 级源码的「值」要显式标注证据缺口**，并给出一行覆盖方法；禁止写成「时长就是 xx ms」。
- **SSR 安全**：`setup()` 期不得直接访问 `window` / `document` / `matchMedia` / `ResizeObserver`；生成唯一 id 用 `useId()`，不要用 `getCurrentInstance().uid`。
- **无障碍**：装饰性元素对 AT 隐藏、不抢 Tab 序、不拦指针；可访问名由消费方传入或提供 `label` 类 Prop。
- **动效**：默认尊重 `prefers-reduced-motion`，关闭动画后必须留下合理静态形态（不能出现空环或零长度弧）。
- **浮层层级**：按现有档位取值（文档站里 ContentDialog / Combobox 下拉为 `1000`，ToolTip 为 `1100`），不要随手写 `9999`。
- **受控 / 非受控都要支持**：`open === undefined` 时交回底座自管并同步其 update 事件；受控时只认 Prop。

## 测试与检查

```bash
pnpm test          # Vitest 全量（组件契约 + SSR smoke）
pnpm test:watch    # 监听模式
pnpm check         # lint + format + tsc + i18n + 版本一致性（交付前必跑）
pnpm lint:ssr      # SSR 兼容性扫描
pnpm docs:generate # 文档站预渲染校验（新增 / 修改文档页时必跑）
```

写组件测试时注意三条卫生规则（都踩过）：

1. **分清微任务与宏任务**：底座延时用 `setTimeout`，`await nextTick()` 等不到，需 `await new Promise((r) => setTimeout(r, 20))`（封装成 `flushTimer()`）。
2. **`attachTo: document.body` 的用例不要在体内 `document.body.innerHTML = ''`**：Vue 卸载时会因找不到宿主抛 `insertBefore` of null；统一在 `afterEach` 里 `wrapper.unmount()`。
3. **`textContent` 会把隐藏文案算两遍**：无障碍底座常把同一句话塞进 `VisuallyHidden`，断言文本只取直接文本节点。

## 提交与 PR

提交信息遵循 [.trae/rules/git-commit-message.md](./.trae/rules/git-commit-message.md)：Conventional Commits + emoji，描述用中文。常用类型：

```text
feat: ✨ 新增 FluereExpander 组件
fix: 🐛 修正 Tooltip 在暗色主题下的描边令牌
docs: 📝 更新组件进度表
refactor: ♻️ 抽取共享浮层原语
test: ✅ 补齐 Combobox 键盘契约测试
```

PR 请说明：

- **改了什么、为什么**：关联 issue / 讨论链接。
- **规格出处**：控件名 + `microsoft-ui-xaml` tag / commit + 关键文件路径。
- **证据**：测量方法、预期值、结论（截图与脚本留在 `temp/` 或 PR 附件，不进仓库）。
- **验证结果**：贴出 `pnpm check` / `pnpm test` / `pnpm lint:ssr` / `pnpm docs:generate` 的结果；有既有失败请注明是既有问题（可用 `git stash` 在干净树复现）。
- **破坏性变更**：单独列出，并说明迁移方式。

## 红线（不要做）

- ❌ 用 Fluent UI React v9 / Fluent 2 Web 规范 / WinUI 2 文档「推断」WinUI 3 的行为。
- ❌ 用 `main` 分支或来源不明的 tag 当规范，跳过 [style-spec §2](./docs/style-spec.md#2-版本地图先对版本再读代码) 的版本核对。
- ❌ 从截图取色当 token 值（截图受系统强调色、DPI、重编码影响）。
- ❌ 在没有测量证据的情况下宣称「已对齐实机」。
- ❌ 提交 `temp/` 下的任何内容（WinUI 源码快照、Playwright 脚本、截图）。
- ❌ 改动 [docs/todo.md](./docs/todo.md) 的验收口径来「让结果看起来达标」。

## 许可证

贡献即表示同意以仓库的 [MIT 许可证](./LICENSE) 发布你的改动。
