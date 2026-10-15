# 0.5.0 发版目标开发计划 — Explorer 骨架收尾

> **状态**：计划草稿（评审进行中，**不提交进版本库**）。
> **依据**：[docs/todo.md](./docs/todo.md)《0.5.0 · Explorer 骨架（≈ 17 点组件 + 11 点文档站）》；工程约定见 [AGENTS.md](./AGENTS.md)、[docs/style-spec.md](./docs/style-spec.md)、[docs/ssr-guide.md](./docs/ssr-guide.md)、[docs/i18n.md](./docs/i18n.md)、[docs/release.md](./docs/release.md)。
> **日期**：2026-10-14。

## 目标与成功标准

按 `docs/todo.md`《0.5.0 · Explorer 骨架》完成剩余条目，达成该节里程碑：

> **「能打开一个空 Explorer 窗口，导航可折叠、视图可切换，文档站首页可挂载。」**

随后执行《发布检查（0.4.0 起）》并完成 0.5.0 发版（npm 六包 + 文档站）。

成功标准 = 0.5.3–0.5.7 全部交付，且每项过**人工校验闸门四条**（四件套完整 / 规格出处 / 测量证据 / 闸门全绿）+ AGENTS.md **Definition of Done**；`pnpm check` / `pnpm test` / `pnpm lint:ssr` / `pnpm docs:generate` 全绿；版本、README、`docs/todo.md` 勾选状态同步收口；发版后 npm 与文档站可验证。

## 现状盘点（已核实）

| 项                                                     | 状态                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.5.1 `FluereAppWindow` / 0.5.2 `FluereCaptionButtons` | ✅ 已落地（`packages/ui/src/app-window/`，四件套齐）                                                                                                                                                                                                                                                                  |
| 0.4.x 基建                                             | ✅ `useFlyout`+层级栈（`packages/ui/src/flyout/`）、`useFocusVisual`（`focus-visual/`）、z-index 九档刻度、Mica/Acrylic 等 20 个材质令牌（`packages/designs/data/repo-tokens.json`）                                                                                                                                  |
| i18n 通道（0.3 目标 1.4）                              | ✅ `FluereConfigProvider` + 组件 `locale.ts` 切片；**新文案走 key 是 0.5.0 起的硬约束**                                                                                                                                                                                                                               |
| 规格源快照                                             | ✅ `temp/winui-src` = `microsoft-ui-xaml` tag `winui3/release/2.5.1`（`ba3a8d5`）；稀疏检出只有 `CommonStyles/`+`ProgressBar/`+`ProgressRing/`，**TabView / NavigationView 源码用 `git -C temp/winui-src show winui3/release/2.5.1:<path>` 取**（与 0.4.7 Select 同做法）；连通性不稳时按「证据缺口」流程标注，不猜值 |
| reka-ui 2.10.1 可用底座                                | Tabs、RovingFocus、Collapsible、ScrollArea、NavigationMenu（语义不符，见阶段 2）                                                                                                                                                                                                                                      |
| 待做                                                   | 0.5.3 / 0.5.4 / 0.5.5 / 0.5.6 / 0.5.7 五项（约 22 点）                                                                                                                                                                                                                                                                |

**规格源可取性已实测**（2026-10-14）：

- `src/controls/dev/TabView/`：`TabView.cpp/.h/.idl/.xaml`、`TabView_themeresources.xaml`、`TabViewItem.cpp/.h`、`TabViewListView.cpp/.h`（溢出滚动的承载控件）、`TabViewItemTemplateSettings.h`、`TabViewAutomationPeer.*`；
- `src/controls/dev/NavigationView/`：`NavigationView.cpp/.h/.idl/.xaml`、`NavigationView_themeresources.xaml`、`NavigationViewItem.*`、`NavigationViewItemPresenter.*`、`NavigationViewItemHeader.*`、`NavigationViewItemSeparator.*`、`NavigationViewTemplateSettings.*`、`NavigationViewDisplayModeChangedEventArgs.*`、`NavigationBackButton*` 等全套；
- 两控件目录均含 `*_perf2026.xaml`（`TabView_perf2026.xaml` / `NavigationBackButton_perf2026.xaml` 等）——沿用 0.5.1 TitleBar 的裁定口径：**perf2026 不实现**（需在组件注释记录该裁定）；
- 上游存在 `src/controls/test/TabViewTearOutApp/`（tear-out 测试应用）——属于测试程序而非控件实现，本计划仍把 tear-out 列为非目标。

## 阶段 0 · 先定五项布局假设（todo 明文要求，防最后阶段返工）

一次定死并写进仓库（新增 `docs/design/explorer-layout.md`，中文）：

1. **窗口圆角与阴影**（`FluereAppWindow` 已有取值，明确 DesktopShell 的消费口径）；
2. **内容区滚动边界**（沿用 `apps/docs/layouts/components.vue` 的 `FluereScrollView` 整页滚动口径，还是窗口内滚动区——写清选哪个及理由）；
3. **导航面板折叠宽度**（NavigationView Expanded / Compact 两档宽度）；
4. **任务栏高度与层级**（z 引 `--zIndexShell` 刻度；高度常量落 `repo-tokens.json` 或组件局部变量并注明覆盖方式）；
5. **桌面壁纸层的令牌化方案**（Mica 纯色基准 `micaBackgroundFillColor*` + 渐变近似，禁止 `backdrop-filter` 魔法值；真实材质合成归 0.9.1 / 0.9.2）。

缺档的视觉量补进 `packages/designs/data/repo-tokens.json`（带 `note` 注明 WinUI 资源名与 AARRGGBB→CSS 换算）；组件内只准引用 token 或 `--fui-<component>-*` 局部变量。

## 阶段 1 · 0.5.3 `TabView`（packages/ui，L 4）

- **规格源**：`src/controls/dev/TabView/`，tag `winui3/release/2.5.1`。键位与状态机读 `TabView.cpp`，几何画刷读 `TabView.xaml` / `TabView_themeresources.xaml`，API 对齐 `TabView.idl`；`TabViewListView` 是溢出滚动的承载控件，行为参照它。
- **底座**：reka-ui `Tabs`（TabsList / Trigger / Content + RovingFocus）；溢出滚动按 WinUI `TabView` 的 ScrollViewer 行为实现（横向滚动 + 溢出指示）。
- **范围**：tab 条、rest / hover / pressed / focus / disabled / selected 状态、每 tab 关闭按钮、`#add`（新建按钮）插槽、键盘（按 `TabView.cpp` 快捷键表逐条抄）、溢出滚动、`useFocusVisual` 双层焦点矩形、关闭按钮 aria 走 `locale.ts` 切片。
- **显式非目标**：拖拽重排 / tear-out 撕出 / 中键关闭（todo 验收只要求「键位与焦点表现对齐 + 溢出滚动」；上游 tear-out 仅见于测试应用）。
- **四件套**：SFC + 契约测试 + `apps/docs/content/{zh-Hans,en}/components/tab-view.md` + demos + API 表 + `components-nav.ts` 注册（含 `nav.summary.*` i18n key）。
- **注意**：`TabView_perf2026.xaml` 不实现，裁定写进组件注释。

## 阶段 2 · 0.5.4 `NavigationView` + `NavigationViewItem`（packages/ui，XL 6）

- **规格源**：`src/controls/dev/NavigationView/`，tag 同上。DisplayMode 状态机（Minimal / Compact / Expanded）与 Pane 展开收起读 `NavigationView.cpp`；选中指示条、Settings 项、分组（`NavigationViewItemHeader` / `NavigationViewItemSeparator`）读 `NavigationViewItem*` 与 `*_themeresources.xaml`；模板尺寸读 `NavigationViewTemplateSettings`。
- **底座决策**：**自持布局状态机**（reka `NavigationMenu` 是顶部 menu 语义，与 WinUI 左侧 pane 不符，不用）；条目方向键导航用 reka `RovingFocusGroup`；展开 / 折叠动效逐帧对齐源码关键帧并走 `duration*` / `curve*` 令牌。
- **交付**：`FluereNavigationView` + `FluereNavigationViewItem`（分组 header、可折叠面板、选中指示条、内置 Settings 项或 `#settings` 插槽）、`useFocusVisual` 接入。
- **验收**（todo 口径）：可折叠面板、分组、选中指示条、设置项；消费阶段 0 的折叠宽度假设。
- **四件套**同上（`navigation-view.md` + demos + API 表）；pane toggle 按钮等 aria 走 `locale.ts`。

## 阶段 3 · 0.5.5 文档站 `DesktopShell`（apps/docs，L 4）

- **归属**：应用级组合，落 `apps/docs/components/shell/`（按 `apps/docs/README.md`《构件归属》）；只用 UnoCSS 工具类 + designs 令牌，**不进 `packages/ui`**。
- **结构**：壁纸层（token 渐变 / Mica 基准）→ 窗口层（`FluereAppWindow` + `FluereCaptionButtons` + 窗口状态管理：最小化 / 最大化 / 还原；「关闭」收起到任务栏或跳回首页，不做成坏按钮）→ 任务栏层；层级引用 `--zIndex*` 刻度。
- **挂载点**：首页 hero（`pages/index.vue`），窗口内容用阶段 1/2 的 `TabView` + `NavigationView` 搭「空 Explorer 窗口」；文档内页布局本期不动。
- **响应式**：1280 / 1440 / 1920 与移动端不溢出不重叠；移动端降级为全屏无边框（todo 非目标：不仿桌面）；SSR 安全（视口相关用 `useMediaQuery` / 能力探测，不引入水合不匹配）。

## 阶段 4 · 0.5.6 `Taskbar` + `SystemTray`（apps/docs，L 4）

- `Taskbar`：居中图标组（开始、搜索、已固定入口）、hover / active 指示条、点击弹出或还原窗口（与阶段 3 的窗口状态打通）。
- `SystemTray`：`Intl.DateTimeFormat` 时钟（随 locale）、主题切换（复用现有 `theme-toggle`）、语言切换（复用 `locale-switch`）、版本号读根 `package.json`（复用 `use-docs-version`，去掉硬编码）。
- 全部界面串走 i18n key（zh-Hans / en 双侧同步，`pnpm i18n:check` 阻断）；图标 aria-label 双语。

## 阶段 5 · 0.5.7 `StartMenu`（apps/docs，M 3）

- Acrylic 面板承载站点信息架构（首页、指南、组件、设计令牌、路线图、GitHub）；本期用 0.4.4 材质令牌的合成色 / FallbackColor 近似并注明证据缺口（真实 Acrylic 合成 + 噪点归 0.9.2）。
- 键盘导航（方向键 / Home / End / Enter）+ Esc 关闭 + 点击外部关闭 + 焦点陷阱与焦点归还。
- **浮层焦点管理下沉 `packages/hooks`**（todo 明文）：新增 `useFocusTrap`（或等价原语）+ 单测，供 0.6 `MenuFlyout` 等复用；层级引用 z-index 刻度（缺档先补 `repo-tokens.json`，禁止组件内裸值）。

## 阶段 6 · 全局收口与验证

- **人工校验闸门**逐 PR 执行（四件套 / 规格出处含 tag+路径 / 测量证据按 style-spec §7 / 闸门全绿）；跨组件基建专项复核表新增一行：`useFocusTrap`（0.5.7）——焦点陷阱、Esc / 外部关闭、焦点归还、SSR 一致。
- 浮层 / 动效类改动在**真实浏览器**实测计算样式（防 scoped / Teleport 静默失效）+ 明暗对照截图（`temp/` 过程产物不提交）。
- 动效走时长 / 缓动令牌，`prefers-reduced-motion` 下保留合理静态形态；文档站首页可见《WindowsOS 仿真边界》文案（不写成「还原系统能力」）。
- 验证命令：`pnpm check` / `pnpm test` / `pnpm lint:ssr` / `pnpm i18n:check`（消息真实编译，dev 两语种 200）/ `pnpm docs:generate`（新增页面可预渲染、不引入新 404）。
- 文档同步：根 `README.md` 组件进度表、`packages/ui/README.md` 索引、`docs/todo.md` 勾选与进展记录（**不改验收口径**）。

## 阶段 7 · 发版 0.5.0

1. 执行《发布检查（0.4.0 起，每个 minor 版本执行）》8 项清单（`docs/todo.md` 492–502 行）。
2. 发版走 `fluere-release` 技能十步链路（README 版本指引 → seed 基版本 + changeset → `pnpm check && pnpm test` → 推 GitHub → Actions 验证 → 合并 release PR → npm 验证 → OneDev 分支先推 / 部署 tag 后推 → 发布后验证），版本策略与回滚以 `docs/release.md` 为准。
3. 关键红线：**seed ≠ 发布**（`v*` 部署 tag 不复用已发布版本号）；预发布只落 `alpha`、不动 `latest`；`v<VERSION>` 部署 tag 手工注解打在发布提交上；OneDev **分支先推、tag 后推**。

## 公共 API / 数据流变更

- `@fluere-vue/ui` 新增导出：`FluereTabView`（及 tab 相关子组件）、`FluereNavigationView` / `FluereNavigationViewItem`；各组件新增 `locale.ts` 切片（a11y 文案）。
- `@fluere-vue/hooks` 新增导出：`useFocusTrap`（阶段 5）。
- `@fluere-vue/designs`：`repo-tokens.json` 可能新增任务栏 / StartMenu 档位或几何缺档令牌（带 `note`），经 `generate.mjs` 合成 `tokens.css`。
- 文档站：`components-nav.ts` 注册两条新组件 + `nav.summary.*` i18n key；`apps/docs/i18n/locales/{zh-Hans,en}.json` 新增首页外壳 / 任务栏 / 开始菜单文案 key（双侧一致）；新增 content 页 2 组 × 2 语种。

## 测试计划

- 每组件契约测试：渲染 / aria 契约 + 从 SFC 源码解析样式与关键帧的契约断言（jsdom 不解析 `var()`）；z-index 刻度扫描测试（`packages/ui/src/__tests__/z-index-tokens.test.ts`）保持全绿（新组件不许裸 z-index）。
- hooks：`useFocusTrap` 单测（陷阱、Esc、外部点击、焦点归还、SSR 无副作用）。
- SSR smoke（`packages/ui/src/__tests__/ssr-smoke.test.ts`）覆盖新组件两语种直出；`dist-smoke` 在构建后复验新导出可从 dist 消费。

## 假设与非目标

1. **DesktopShell 本期只挂首页 hero**（依据 todo「文档站首页可挂载」「首页 hook 首次上线」与 0.9.0-rc.1「首页第一眼」）；整站 layout 的 NavigationView 化（0.3 目标 2.3）不在本期。**如需整站外壳化请在评审时说明**（阶段 3 范围会显著扩大）。
2. **发版形态默认 `0.5.0-alpha.1`**（沿用 alpha 预发布链：seed `0.5.0-alpha.0` + patch changeset；换基线必须显式给版本号）；如需直接发稳定版 `0.5.0` 请在评审时说明。
3. TabView 拖拽重排 / tear-out / 中键关闭、StartMenu 真实 Acrylic 合成、真实窗口管理器行为均为**非目标**（todo 仿真边界）。
4. `*_perf2026.xaml` 一律不实现（沿用 TitleBar 裁定，写进组件注释）。
5. 版本号连续性硬约束成立：`0.4.1-alpha.1` → `0.5.0`，不跳号。

## 风险与对策

| 风险                                 | 影响                   | 对策                                                                                               |
| ------------------------------------ | ---------------------- | -------------------------------------------------------------------------------------------------- |
| NavigationView（XL 6）状态机被低估   | 进度滑坡               | 阶段 2 先做 DisplayMode 状态机 + 指示条最小闭环，Settings / 分组随后；估点内含键盘与折叠动画       |
| 布局假设最后被推翻                   | 外壳返工               | 阶段 0 先写 `docs/design/explorer-layout.md` 锁五项假设，改动须回写该文档                          |
| scoped / Teleport 样式静默失效       | 浮层样式全丢而测试全绿 | 浮层组件实机 `getComputedStyle` 复核（AGENTS.md 排查手法），面板样式走非 scoped + `.fui-` 私有前缀 |
| github.com 连通性不稳取不到源码 blob | 规格证据缺口           | 按「证据缺口」流程显式标注取值来源与覆盖方式，不猜值                                               |
| i18n 新增文案漏 key / 裸 `@`         | SSR / 预渲染 500       | 全部走 key + `pnpm i18n:check` + 消息真实编译（dev 两语种 200 或 `docs:generate`）                 |
| 发版撞已用版本号                     | 同号两提交             | `<VERSION>` 必须未发布过；发布前 `pnpm release:manual --check` 预演（docs/release.md 红线）        |
