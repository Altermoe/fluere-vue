# 0.1.0-rc.1 组件实施清单（TODO）

> 依据：使用频率 × 需求度 × WinUI 还原成本 × `reka-ui@2.10.1` 底座可用性。
> 核心交付基准：**不用手写任何 HTML，即可搭出「设置页 + 数据录入表单 + 带加载/提示反馈的页面」的 WinUI 应用。**
> 已落地约束：SSR 安全（见 [ssr-guide.md](./ssr-guide.md)）、`@fluere-vue/designs` 令牌、`@fluere-vue/hooks` / `utils` 共享原语、`pnpm check`（lint + format + tsc）+ SSR smoke 测试。
>
> 本文档分三部分：上半部分为 0.1.0-rc.1 组件实施清单（已收口）；中段为 0.3.0-rc.1 的三条项目目标（i18n / 文档站 WindowsOS 仿真化 / npm 发布）；**末段为 0.4.0 – 0.9.0-rc.1 的完整排期，其中 Explorer 仿真是发布生产版之前的最终目标**，见文末。
>
> 版本范围说明：0.1.0-rc.1 收口**通用 WinUI 控件**；0.3.0-rc.1 收口**能被用起来**（多语言、文档站、npm 发布）；0.4.0 起按本文件末段拆分推进，0.9.0-rc.1 以 Explorer 仿真验收，0.9 → 1.0.0 为生产版前的收尾窗口。

- [x] 0. 收尾 Input：补齐 password / textarea 形态、大小与有效性状态，跑通测试与文档 —— **已由 0.4.5 落地（含 header / description）**，在此保留仅为编号连续

## Wave 1 · 核心表单（最高频，先形成"数据录入"闭环）

按 ① 被依赖程度 ② 还原成本 从低到高排：

- [x] 1. `Checkbox`（对应 CheckBox）
- [x] 2. `ToggleSwitch`（ToggleSwitch，WinUI 标志性控件，自定义实现）
- [x] 3. `RadioButton` + `RadioGroup`（RadioButton，复用 reka RadioGroup）
- [x] 4. `Slider`（Slider，复用 reka Slider）
- [x] 5. `NumberBox`（NumberBox；底座改为自持实现：`format` / `parse` / `expression` / `step` 四个纯函数层 + `use-number-box` / `use-spin-repeat` 两个 hook，理由见组件文档）
- [x] 6. `Combobox`（ComboBox，复用 reka Listbox/Combobox；下拉箭头动画、popup 定位、选中态还原最费劲，放队尾）

## Wave 2 · 反馈与状态（满足"加载 / 提示"）

- [x] 7. `ProgressRing`（ProgressRing，不确定转圈；自定义实现，参考 ScrollView 动效基建）
- [x] 8. `ProgressBar`（ProgressBar，复用 reka Progress）
- [x] 9. `InfoBar`（InfoBar，信息横幅，自定义实现）—— 规格源 `microsoft-ui-xaml` `winui3/release/2.5.1` `src/controls/dev/InfoBar/`（与 Gallery v2.9.3 所用 WASDK 2.0.1 逐字节一致）；资源映射：`InfoBar*SeverityBackgroundBrush`（`SystemFillColor{Attention,Success,Caution,Critical}Background`）→ `colorNeutralCardBackground` / `colorPaletteLightGreenBackground1` / `colorPaletteYellowBackground1` / `colorPaletteRedBackground1`，`InfoBar*SeverityIconBackground` → `colorCompoundBrandBackground` / `colorStatusSuccessForeground3` / `colorPaletteYellowForeground1` / `colorStatusDangerForeground3`，`InfoBar*SeverityIconForeground`（`TextFillColorInverse`）→ `colorNeutralForegroundInverted2`，`InfoBarTitle/MessageForeground`（`TextFillColorPrimary`）→ `colorNeutralForeground1`，`InfoBarBorderBrush`（`CardStrokeColorDefault`）→ `colorNeutralStrokeAlpha`；排版方向按 `InfoBarPanel.cpp#MeasureOverride` 的三条判据实时判定（隐藏测量层，非固定断点）
- [x] 10. `InfoBadge`（WinUI 控件名为 InfoBadge，非 Badge；自定义实现）—— 规格源 `microsoft-ui-xaml` `winui3/release/2.5.1` `src/controls/dev/InfoBadge/`（`InfoBadge.xaml` / `InfoBadge_themeresources.xaml` / `InfoBadge.cpp` / `InfoBadge.idl` 与 Gallery v2.9.3 所用 WASDK 2.0.1 的 `winui3/release/2.0.1` 逐字节一致）；三态按 `InfoBadge.cpp#OnDisplayKindPropertiesChanged` 实时推导（`value >= 0` → Value，否则有 `IconSource` → Icon/FontIcon，否则 Dot），`MeasureOverride` 的「宽 < 高取正方形」落在 Value/Icon 两态的 `min-inline-size`；资源映射：`AccentFillColorDefaultBrush` / `SystemFillColorAttentionBrush` → `colorCompoundBrandBackground`，`SystemFillColorSolidNeutralBrush` → `colorNeutralForeground4`，`SystemFillColor{Success,Caution,Critical}Brush` → `colorStatusSuccessForeground3` / `colorPaletteYellowForeground1` / `colorStatusDangerForeground3`（与 InfoBar 同一批资源的同一套映射），`TextOnAccentFillColorPrimaryBrush` → `colorNeutralForegroundInverted2`，`CornerRadius = ActualHeight / 2` → `borderRadiusCircular`；内建字形按「裸字形」图形挑（Attention `text_asterisk_16_filled` / Informational `info_16_regular` / Success `checkmark_16_filled` / Caution `important_16_filled` / Critical `dismiss_16_filled`）

## Wave 3 · 必要弹层与微交互

> 先补齐共享原语，再实现弹层，避免后续所有弹层组件返工。

- [x] 11. 共享原语：`use-disclosure` / 门户 `Teleport` / 遮罩层（放入 `hooks` / `utils`）—— 状态机 `useDisclosure` 落在 `packages/hooks`；需要渲染的两件原语（`FluerePortal` 门户、`FluereSmokeLayer` 遮罩层）落在 `packages/ui/src/overlay/`，因为 `hooks` / `utils` 是框架无关包、不放 Vue SFC；门户 Teleport 的 SSR 策略 = 挂载后才 Teleport（服务端与首次水合都为空），滚动锁复用 reka 的 `useBodyScrollLock`
- [x] 12. `Tooltip`（ToolTip / ToolTipService，复用 reka Tooltip + Popper）—— 规格源 `microsoft-ui-xaml` `winui3/release/2.5.1`：`src/controls/dev/CommonStyles/ToolTip_themeresources.xaml`（内边距 9,6,9,8 / MaxWidth 320 / 圆角 4 / 描边 1 / 字号 12 / 模板只有一个 `ContentPresenter`、**无箭头**；`OpenStates` = `FadeInThemeAnimation` / `FadeOutThemeAnimation`，与 tag `winui3/release/2.0.1` 逐字节一致）、`src/dxaml/xcp/dxaml/lib/ToolTipService_Partial.{h,cpp}`（`DEFAULT_SPI_GETMOUSEHOVERTIME` 400 / `BETWEEN_SHOW_DELAY_MS` 200 / 延时倍率 Touch 1x、Mouse 与 Keyboard 2x，重展示 Touch 0、Mouse 1.5x）、`ToolTip_Partial.cpp`（`IsTabStop` / `IsHitTestVisible` = false、`IsEnabled=false` 时 Popup Opacity 0、`ApplyElevationEffect(LayoutRoot, 0, baseElevation 16)`）、`ThemeAnimations.cpp`（`TAS_FADEIN` / `TAS_FADEOUT` 只转调 `ThemeGenerator`，时长常量在非公开的 `vsanimation.h`，公开树取不到 ⇒ 落组件局部变量）；资源映射：`ToolTipForegroundBrush` ← `TextFillColorPrimary` → `colorNeutralForeground1`，`ToolTipBackgroundBrush` ← `AcrylicInAppFillColorDefaultBrush` → `colorNeutralCardBackground`（Light `#F9F9F9` / Dark `#2C2C2C` 合成，参考图实测提示面 `#F9F9F9`），`ToolTipBorderBrush` ← `SurfaceStrokeColorFlyout` → `colorNeutralStrokeAlpha`，`ControlCornerRadius`(4) → `borderRadiusMedium`，`baseElevation 16` → `shadow16`，ToolTipBorderPadding / ToolTipMaxWidth 无同值档 → 组件局部变量；另修正 InfoBar 关闭按钮：由原生 `title` 改为 `FluereTooltip`（对齐 `InfoBarCloseButtonTooltip` 走 ToolTipService）
- [x] 13. `ContentDialog`（ContentDialog，复用 reka Dialog）—— 规格源 `microsoft-ui-xaml` `winui3/release/2.5.1`：`src/controls/dev/CommonStyles/ContentDialog_themeresources.xaml`（尺寸 320/548/184/756、圆角 8、描边 1、内边距 24、标题下间距 12、按钮间距 8、5 列命令区网格、ButtonsVisibilityStates / DefaultButtonStates / FullDialogSizing）、`src/dxaml/xcp/dxaml/lib/ContentDialog_Partial.cpp`（状态推导、初始焦点三级优先、Escape→ExecuteCloseAction、ButtonClick 可 Cancel、Closing 可 Cancel、Closed(result)、标题位折叠、baseElevation 128 阴影）、`src/dxaml/xcp/dxaml/lib/LayoutTransition_partial.cpp#ContentDialogOpenCloseThemeTransition::CreateStoryboardImpl`（进入 scale 1.05→1 / 250ms / cubic-bezier(0,0,0,1) + opacity 0→1 / 83ms linear；退出 scale 1→1.05 / 167ms + opacity 1→0 / 83ms；遮罩层只做 83ms linear 透明度）、`src/dxaml/xcp/dxaml/lib/ContentDialogOpenCloseThemeTransition_Partial.h`（s_OpenScaleDuration 250 / s_CloseScaleDuration 167 / s_OpacityChangeDuration 83）、`src/controls/test/MUXControlsTestApp/verification/ContentDialog.xml`（几何复核）；资源映射：`ContentDialogBackground` ← `SolidBackgroundFillColorBase` → `colorNeutralBackground2`（ΔE 2.3/0.6），`ContentDialogTopOverlay` ← `LayerFillColorAlt` 叠底后 → `colorNeutralBackground1`（ΔE 0/1.4），`ContentDialogBorderBrush` ← `SurfaceStrokeColorDefault` 合成值 → `colorNeutralStroke2`（ΔE 31/16），`ContentDialogSeparatorBorderBrush` ← `CardStrokeColorDefault` → `colorNeutralStrokeAlpha`，`ContentDialogSmokeFill` ← `SmokeFillColorDefault` → `colorBackgroundOverlay`，250ms / cubic-bezier(0,0,0,1) → `durationGentle` / `curveDecelerateMid`（167ms / 83ms 无同值 token，落组件局部变量）

---

## 加分项（原「Wave 4」，已并入 0.4.0–0.6.0，见文末排期）

- [ ] 14. `ToggleButton` / `ToggleGroup`（复用 reka ToggleGroup）→ **0.4.0**
- [ ] 15. `Avatar` / `Persona`（复用 reka Avatar，成本很低）→ 未进 0.4–0.9 范围，待重排
- [ ] 16. `DropDownButton`（复用 reka Menu）→ **0.6.0**

第 0 项（Input 收尾）同样移入 **0.4.0**，作为该版本的收尾项。

## rc.1 明确不做（避让 rc.1 核心质感；部分已在 0.7–0.8 排入）

- 以下控件工程量大、还原风险高，硬塞进 0.1.0-rc.1 会稀释核心质感，该判断**保持不变**。其中 4 项已在新排期中落地，其余继续推后：
  - **已排入**：`NavigationView`（0.5.0）、`ListView` / `GridView`（0.7.0）、`CommandBar`（0.8.0）
  - **继续推后**：`TreeView`、`DataGrid`、`CalendarDatePicker` / `TimePicker`、`MenuBar` 完整版、`RatingControl`
- 注：本节的判断针对 **0.1.0-rc.1 的范围**；这些控件是否交付、排在哪个版本，一律以文末《0.4.0 – 0.9.0-rc.1 排期》为准。

## 发布检查（每波结束执行）

- [x] `pnpm check`（lint + format + tsc）
- [x] `pnpm test` / SSR smoke（`packages/ui/src/__tests__/ssr-smoke.test.ts`）
- [ ] 用 Wave 1 子集在 `apps/playground` 搭一个真实设置页做视觉回归（rest / hover / pressed / selected / focus / disabled）——`apps/playground` 仍是占位包（无 dev 脚本），本项随 0.4.0 的收尾闸门一并处理
- [x] 为每个新组件补文档页（`apps/docs/content/components/*.md` + `demos/*/`）+ 更新 README「组件进度」索引

> 以下发布检查自 0.4.0 起按**每个 minor 版本**执行，清单见文末《0.4.0–0.9.0-rc.1 发布检查》。

---

# 0.4.0 – 0.9.0-rc.1 排期（Explorer 仿真为北极星）

> 本节是**当前生效的排期**。0.1.0-rc.1 已完成收口，0.3.0-rc.1 的三条主线（i18n / 文档站 WindowsOS 仿真化 / npm 发布）保持不变（见下一节），0.3 的「文档站 WindowsOS 仿真化」即本节的布局基建前置。
>
> **北极星与终点**：**Explorer 仿真是 0.9.0-rc.1 的最终目标，也是生产版发布前的最后一块拼图**。它承担两个职责：① 文档站首页的第一眼呈现（对外的门面）；② 跨组件组合的唯一验收场景——焦点管理、浮层层级、嵌套弹出、键盘可达、明暗与材质，这些只有把组件拼成一个真实窗口才能验证，单个组件各做各的永远验不出来。
>
> **仿真边界（必须标注在文档站，与 README「不夸大承诺」一致）**：菜单/下拉只仿真到**能打开面板、能键盘走条目、能选中、能进子菜单**，不接内部 Windows 能力；不实现真实文件系统、真实拖放排序、真实窗口管理器（无拖拽吸附、无多窗口、无系统级动画复刻）；移动端不仿桌面，降级为简洁响应式全屏。

## 排期总览

| 版本        | 主题                                    | 关键交付                                                                                                                                            | 依赖                                                    |
| ----------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 0.4.0       | 基建 + 通用件收尾                       | `useFlyout` 浮层原语、z-index 刻度、`useFocusVisual` 焦点矩形原语、Mica/Acrylic/SubtleFill 令牌、Input 收尾、`ToggleButton`/`ToggleGroup`、`Select` | 无（**最先做，后续所有版本的减债项**）                  |
| 0.5.0       | **Explorer 骨架（首页 hook 首次上线）** | `TabView`、`NavigationView`、`AppWindow`/`CaptionButtons`、文档站 `DesktopShell` / `Taskbar` / `SystemTray` / `StartMenu`                           | 0.4.0 的 `useFlyout` 与 `useFocusVisual`                |
| 0.6.0       | 地址栏 + 命令层                         | `MenuFlyout` 族、`ContextMenu`、`DropDownButton`、`SplitButton`、`BreadcrumbBar`、`SearchBox`                                                       | 0.4.0 的 `useFlyout`                                    |
| 0.7.0       | 数据层 ①：项基座 + 列表                 | `ItemContainer`、`useSelection`、`useMarqueeSelection`、`ListView`、`GridView`                                                                      | 0.5.0 的导航容器与 0.6.0 的菜单（右键菜单落在列表项上） |
| 0.8.0       | 数据层 ② + 布局收尾                     | `DetailsPane`、`StatusBar`、`CommandBar`、`Splitter`、`Expander`、图标/详情双视图切换                                                               | 0.7.0                                                   |
| 0.9.0-rc.1  | **质感分支（独立 minor）**              | Explorer 完成版 + 材质（Mica / Acrylic）、焦点矩形统一铺开、动效逐帧核对、对比度复核、性能预算                                                      | 0.8.0 全部功能就位                                      |
| 0.9 → 1.0.0 | 收尾窗口（4–8 周）                      | 跨组件复查 + 人工校验审计 + 外部消费者验证                                                                                                          | 0.9.0-rc.1                                              |

> **两项前置硬约束：**
>
> 1. **版本号必须连续**：0.4.0 → 0.9.0-rc.1 之间不得跳号，每个 minor 都要有真实内容与可验收的里程碑，否则发布手册与 CHANGELOG 会失去可解释性。
> 2. **0.4.0 开工前重新拉起 WinUI 源码快照**：`temp/` 当前为空，`docs/style-spec.md` §2/§3 要求的本地快照（`winui3/release/2.5.1` / `ba3a8d5`）需重新获取并固定 commit。本节 40 余个组件条目每一项都要回到源码点名资源与关键帧，快照缺失则「逐像素还原」的立论基础不成立。

## 工作量刻度（估点）

估点为**相对复杂度单位**，1 点 ≈ 一个中等复杂度组件的「实现 + 契约测试 + 文档示例 + API 表」四件套（约 1 人日量级）。刻度用本仓库既有组件做锚点，不用猜测：

| 档位                               | 锚点（仓库现有组件）                                                      | 估点      |
| ---------------------------------- | ------------------------------------------------------------------------- | --------- |
| **S** 有 reka 底座、状态少         | Button(2 文件) / ProgressBar(2 文件)                                      | 0.5 – 1.5 |
| **M** 逐状态对齐、需共享 hook      | Checkbox(2 文件) / Radio(3 文件) / ToggleSwitch(2 文件) / InfoBar(7 文件) | 2 – 3     |
| **L** 自定义绘制 / 动效 / 完整键盘 | Slider(8 文件) / NumberBox(10 文件) / InfoBadge(4 文件)                   | 3 – 5     |
| **XL** 自持核心 + 多 hook 拆分     | Combobox(14 文件) / ContentDialog(6 文件) / ScrollView(21 文件)           | 5 – 8     |
| **基建** 跨组件复用、无视觉        | `useDisclosure` / Portal / SmokeLayer                                     | 1 – 2     |

## 0.4.0 · 基建 + 通用件收尾（≈ 12 点）

> 本版是整条链路上**唯一一处「现在做能省掉后面所有返工」**的地方：仓库现有三套各写一遍的浮层实现（Tooltip 的 `TooltipPopper`、Combobox 自持的 popup 与硬编码 `z-index: 1000`、ContentDialog 的 `Dialog`），若不先统一，后续 MenuFlyout / DropDownButton / Select / NavigationView 溢出会把定位与关闭语义再写四遍。

| #     | 内容                                                                                                                   | 档位     | 验收要点                                                                                                                        |
| ----- | ---------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 0.4.1 | `useFlyout` 统一浮层原语（触发器 + Portal + 定位 + 关闭语义 + 焦点归还）                                               | 基建 2   | 关闭路径覆盖 Esc / 外部点击 / 焦点移出；`role=menu` / `menuitem` / `aria-expanded` 契约明确；同时给出**现有三套实现的迁移步骤** |
| 0.4.2 | z-index 分层刻度（落到 designs 或 themes，禁止组件内硬编码）                                                           | 基建 1   | 刻度显式覆盖：窗口 < 内容区 < 导航浮层 < 菜单 < 子菜单 < 模态遮罩 < 开始菜单 / 任务栏                                           |
| 0.4.3 | `useFocusVisual` 双层焦点矩形原语（WinUI `FocusVisualPrimary/Secondary`）                                              | 基建 1.5 | 内层 / 外层双层矩形；明暗两态；`NavigationView` / `ListView` 接入时无需各写一套                                                 |
| 0.4.4 | designs 补令牌：Mica / Acrylic / `SubtleFillColor*` / `LayerFillColorDefault`                                          | 基建 1.5 | 进 `packages/designs` 事实源并写映射注释；禁止组件内就地 `backdrop-filter` 魔法值                                               |
| 0.4.5 | Input 收尾（password / textarea / header / description）                                                               | M 2      | 勾掉本文档第 0 项；补齐 password 显示按钮与 textarea 形态                                                                       |
| 0.4.6 | `ToggleButton` / `ToggleGroup`（Button 的 `selected` / `aria-pressed` 可直接迁移）                                     | S 1      | 键盘可达；分组单选 / 多选语义                                                                                                   |
| 0.4.7 | `Select`（复用 reka Select / Listbox）                                                                                 | M 2.5    | 与 Combobox 的差异（不可编辑、无文本搜索）写入文档                                                                              |
| 0.4.8 | 收尾：刷新 `packages/ui/README.md`（现仅列 Button / Input / Combobox 三个，已严重过期）；处理 `apps/playground` 占位包 | 0.5      | —                                                                                                                               |

> **0.4.5 已落地**：Input 收尾（password / textarea / header / description，含「显示」按钮、按住 `Alt+F8` 显示与掩码状态下的复制拦截）。
> 规格源、掩码字形与复制拦截的 Web 取舍写在 `packages/ui/src/input/input.vue` 的契约注释，示例与 API 表见 `apps/docs/content/components/input.md`；本文档第 0 项已勾掉。

## 0.5.0 · Explorer 骨架（≈ 17 点组件 + 11 点文档站）

> **本版的战略意义**：Explorer 拆分交付的第一段。首页在第一眼层面自 0.5.0 起即可挂上可交互的窗口，hook 提前四个版本生效；同时让 0.6–0.8 的组件开发始终有一个可运行的目标物可对照。
>
> **必须先在 0.5.0 定下来的布局假设**（它们最易在最后阶段被推翻）：窗口圆角与阴影、内容区滚动边界、导航面板折叠宽度、任务栏高度与层级、桌面壁纸层的令牌化方案。

| #     | 内容                                                             | 档位 | 验收要点                                                                                    |
| ----- | ---------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------- |
| 0.5.1 | `FluereAppWindow`（圆角窗口 + 标题栏 + 可拖拽区）                | L 4  | 圆角 / 阴影 / 描边全部走令牌                                                                |
| 0.5.2 | `CaptionButtons`（最小化 / 最大化 / 关闭，含关闭键红底 hover）   | M 2  | **真实可用**（最小化 / 最大化 / 还原视口）；全部键盘可达 + `aria-label`                     |
| 0.5.3 | `TabView`（复用 reka Tabs；含溢出滚动）                          | L 4  | 键位与焦点表现对齐 WinUI TabView                                                            |
| 0.5.4 | `NavigationView` + `NavigationViewItem`                          | XL 6 | 可折叠面板、分组、选中指示条、设置项；接入 0.4.3 的焦点矩形                                 |
| 0.5.5 | 文档站 `DesktopShell`（壁纸层 → 窗口层 → 任务栏层）              | L 4  | 层级 / 圆角 / 阴影一律 token，禁止魔法值                                                    |
| 0.5.6 | 文档站 `Taskbar` + `SystemTray`（`Intl` 时钟 + 主题 / 语言切换） | L 4  | hover / active 指示条；点击弹出或还原窗口；版本号改为读 `package.json`（去掉硬编码 v0.0.1） |
| 0.5.7 | 文档站 `StartMenu`（Acrylic 面板 + 键盘导航 + Esc 关闭）         | M 3  | 承载站点信息架构；浮层焦点管理下沉到 `packages/hooks`                                       |

**里程碑**：能打开一个空 Explorer 窗口，导航可折叠、视图可切换，文档站首页可挂载。

## 0.6.0 · 地址栏 + 命令层（≈ 17 点）

| #     | 内容                                                                    | 档位  | 验收要点                                                                                             |
| ----- | ----------------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------- |
| 0.6.1 | `MenuFlyout` 族（Item / SubItem / Separator / ToggleItem + 子菜单浮层） | XL 6  | 子菜单不被父菜单遮挡（依赖 0.4.2 的刻度）；键盘完整（方向键 / Esc / Home / End）；展开收起动效走令牌 |
| 0.6.2 | `ContextMenu`（右键定位 + 键盘）                                        | M 2.5 | 复用 0.6.1，不重复实现定位                                                                           |
| 0.6.3 | `DropDownButton`                                                        | S 1.5 | 勾掉本文档第 16 项                                                                                   |
| 0.6.4 | `SplitButton`（含「新建 ▾」的双击区分离）                               | M 2.5 | 主区与箭头区命中区分离且各自可达                                                                     |
| 0.6.5 | `BreadcrumbBar`（`> _ >` 折叠规则 + 下拉可展开）                        | L 3.5 | 折叠判据按实际测量而不是固定断点                                                                     |
| 0.6.6 | `SearchBox`（Input + 内嵌图标位）                                       | S 1   | 可访问名与清除按钮行为明确                                                                           |

**里程碑**：地址栏面包屑可点、命令栏下拉可打开、右键能出菜单。

## 0.7.0 · 数据层 ①：项基座 + 列表（≈ 20.5 点）

> 本版是整条线上**唯一没有底座可借**的部分（reka 无框选、无 WinUI 列表项语义），也是最容易被低估的一版。`ItemContainer` 必须先抽：它被 ListView / GridView / NavigationView / Combobox 四处共享，不抽就会出现四套互相漂移的列表状态。

| #     | 内容                                                                      | 档位  | 验收要点                                                          |
| ----- | ------------------------------------------------------------------------- | ----- | ----------------------------------------------------------------- |
| 0.7.1 | `ItemContainer`（rest / hover / pressed / selected / 焦点矩形，四处共享） | L 4   | 状态表与 WinUI `ListViewItem` 模板逐条对照；焦点矩形复用 0.4.3    |
| 0.7.2 | `useSelection`（单选 / 多选 / Ctrl / Shift 区间）                         | L 3   | 与 `SelectionModel` 语义对齐；纯函数层可独立测试                  |
| 0.7.3 | `useMarqueeSelection`（橡皮筋框选）                                       | L 4   | **reka 无底座，必须自研**；与自动滚动、Shift 区间叠加的行为需明确 |
| 0.7.4 | `ListView`（详情模式 + 键盘 + 拖拽骨架）                                  | XL 6  | 键盘（方向 / 空格 / Ctrl+A / Shift 区间）完整                     |
| 0.7.5 | `GridView`（图标模式 + 磁贴布局）                                         | L 3.5 | 与 ListView 共享 0.7.1 与 0.7.2                                   |

## 0.8.0 · 数据层 ② + 布局收尾（≈ 16.5 点）

| #     | 内容                                                           | 档位  | 验收要点                                     |
| ----- | -------------------------------------------------------------- | ----- | -------------------------------------------- |
| 0.8.1 | `DetailsPane`（预览空态 + 元数据表）                           | L 3.5 | 无预览时的空态可读、可操作                   |
| 0.8.2 | `StatusBar`（「N 个项目，已选 M 个」）                         | S 1   | 文案走 i18n key（与 0.3 目标 1 对齐）        |
| 0.8.3 | `CommandBar`（命令栏 + 溢出「▾」+ compact 模式 + 键盘）        | XL 6  | 溢出判据按实际测量；compact 断点行为记录理由 |
| 0.8.4 | `Splitter` / `GridSplitter`（复用 reka Splitter）              | M 2   | 键盘可调整；最小尺寸约束明确                 |
| 0.8.5 | `Expander`（复用 reka Collapsible）                            | S 1   | 展开收起动效走令牌                           |
| 0.8.6 | Explorer 组装：图标 / 详情双视图切换（走 `ToggleGroup`）+ 空态 | L 3   | 视图切换状态可保持                           |

## 0.9.0-rc.1 · 质感分支（≈ 24 点，独立 minor）

> **边界（硬约束）**：本版**只做「已定型组件的材质与动效深化」，不引入任何新组件**。否则质感版会变成第二个功能版，永远做不完。
>
> **顺序（硬约束）**：本版必须排在 Explorer 功能完成之后、RC 发布之前。若把质感排到 RC 之后，RC 展示的将是一个尚未打磨的窗口，与「首页第一眼」的目标自相矛盾。

| #     | 内容                                                                                                       | 档位 | 验收要点                                                                                    |
| ----- | ---------------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------- |
| 0.9.1 | Mica：窗口背景的 Web 近似（令牌化渐变 + 半透明层）                                                         | L 4  | 禁止 `backdrop-filter` 魔法值；明暗两态无「白闪」                                           |
| 0.9.2 | Acrylic：菜单 / 导航面板 / 开始菜单 / 任务栏的材质合成 + 噪点层                                            | XL 5 | 质感与 WinUI 实机对照；对比度达标                                                           |
| 0.9.3 | 焦点矩形统一铺开：MenuFlyout / NavigationView / TabView / ListView 四族对齐 `FocusVisualPrimary/Secondary` | L 3  | 四族表现一致，无各写一套                                                                    |
| 0.9.4 | 动效逐帧核对：菜单展开收起、窗口打开关闭、导航折叠、视图切换                                               | L 4  | 全部走 `curve*` / `duration*` 令牌；关键帧对照 LottieGen 产物（见 `docs/style-spec.md` §5） |
| 0.9.5 | 明暗 + 高对比度对比度复核                                                                                  | M 2  | HC 若暂不实现必须明确标注                                                                   |
| 0.9.6 | 性能预算复核：`backdrop-filter` 覆盖面积、首屏 JS / CSS                                                    | M 2  | 低端设备滚动流畅                                                                            |
| 0.9.7 | Explorer 完成版组装 + 首页呈现（含移动端降级为全屏无边框）                                                 | L 4  | 1280 / 1440 / 1920 与移动端均不溢出、不重叠                                                 |

**里程碑**：文档站首页第一眼即是可交互的 Explorer 仿真窗口（仿真边界已标注）。

## 0.9 → 1.0.0 · 收尾窗口（4–8 周，不排新功能）

> **本窗口的定位已调整**：不是「首次通读全部代码」，而是**跨组件复查 + 审计 + 外部验证**。
>
> 原因：0.4–0.9 将新增 40 余个组件条目，届时 `packages/ui/src`（现 15,363 行）与契约测试（现 10,919 行）都将翻倍以上。逐行对照 WinUI 源码式的校验，速度远低于写代码的速度，一次性窗口吞不下这个体量；且若统一推迟到这里才做首次校验，0.4–0.8 的组件等于**未经人眼确认就已定型**，一旦查出结构性偏差，返工范围会是整批而不是单个 PR。
>
> 因此人工校验的执行方式见下节《人工校验闸门（0.4.0 起生效）》——**逐 PR 执行**；本窗口只承担跨组件与全局性的工作。

- [ ] 跨组件复查：`useFlyout` 的生命周期、焦点归还、SSR 一致性各审计一遍
- [ ] 跨组件复查：`ItemContainer` 的状态表与 WinUI `ListViewItem` 模板逐条对照
- [ ] 重复代码抽离：盘点并合并各组件内的重复实现（浮层定位、焦点管理、状态变量别名、测试辅助）
- [ ] 外部消费者验证：Vite SPA / Nuxt SSR / 纯类型引用（`vue-tsc` 无错）三个场景走通（与 0.3 目标 3 的验收条件一致）
- [ ] 全仓 `pnpm check` / `pnpm test` / `pnpm lint:ssr` 全绿；`docs:generate` 产物双语言验证
- [ ] 收口文档：README 组件进度表、`packages/ui/README.md`、文档站版本展示与实际实现逐条对齐
- [ ] 冻结 1.0.0 范围：未完成项明确移出并记录（禁止用「看起来达标」的口径收尾）

## 人工校验闸门（0.4.0 起生效）

自 0.4.0 起，**校验是每个组件 PR 的合并闸，不是某个版本阶段的活**。任一组件 PR 必须同时满足以下四条才允许合并：

- [ ] **四件套完整**：SFC + 契约测试 + 文档页（`apps/docs/content/components/*.md`）+ 示例（`apps/docs/components/content/demos/*/`）
- [ ] **规格出处**：控制名 + `microsoft-ui-xaml` tag / commit + 关键文件路径，写入组件注释
- [ ] **测量证据**：动效 / 几何类改动给出可复现的测量（冻结帧 + 像素角度或取色），方法见 `docs/style-spec.md` §7
- [ ] **闸门全绿**：`pnpm check` / `pnpm test` / `pnpm lint:ssr`

**跨组件基建额外要求一次专项复核**（它们出错会污染下游全部组件，不接受「跟着某个组件顺手合并」）：

| 基建项                                 | 专项复核要点                                                         | 所属版本 |
| -------------------------------------- | -------------------------------------------------------------------- | -------- |
| `useFlyout`                            | 关闭路径全覆盖；焦点归还；SSR 与水合一致；现有三套实现的迁移是否彻底 | 0.4.0    |
| z-index 刻度                           | 是否存在组件内硬编码残留（现 Combobox 仍有 `z-index: 1000`）         | 0.4.0    |
| `useFocusVisual`                       | 双层矩形的明暗 / 高对比度表现                                        | 0.4.0    |
| `ItemContainer`                        | 状态表与 WinUI `ListViewItem` 模板逐条对照                           | 0.7.0    |
| `useSelection` / `useMarqueeSelection` | 与自动滚动、Shift 区间、键盘选择的叠加行为                           | 0.7.0    |

## 0.4.0 开工前置（必做，否则整条排期不成立）

- [ ] **重新拉起 WinUI 源码快照**：按 `docs/style-spec.md` §2/§3 对版本（目标 WinUI3 Gallery 发行版 → `standalone.props` 的 `WindowsAppSDKPackageVersion=N` → tag `winui3/release/<N>`），本地快照放 `temp/winui-src`（已 gitignore），并记录 commit
- [ ] **确认 0.3.0-rc.1 的三条主线是否已完成**；未完成项与 0.4.0 的先后关系需明确（i18n 的 key 约定影响 0.5.0 起全部新增文案，构建器选型影响所有包入口）
- [ ] **确定文档站仿真的范围边界文案**（与 README「不夸大承诺」一致），并写入站点 README
- [ ] **明确构件归属**：窗口外壳 / 任务栏 / 开始菜单 / 系统托盘属**应用级组合**，放 `apps/*`，不进 `@fluere-vue/ui`（与 AGENTS.md「页面级工具类只出现在 `apps/*`」的既有边界一致）；通用 WinUI 控件才进组件库
- [ ] **文档站工作量单独统计**：文档站外壳（0.5.0）与组件库分列，避免 0.9.0 被双重低估

## 发布检查（自 0.4.0 起，每个 minor 版本执行）

- [ ] 里程碑可验证：该版本的「里程碑」一句能被外部人复现（不是「看起来完成」）
- [ ] 人工校验闸门：本版所有组件 PR 的四条闸门已逐条执行（含跨组件基建的专项复核）
- [ ] `pnpm check`（lint + format + tsc）
- [ ] `pnpm test` / SSR smoke（`packages/ui/src/__tests__/ssr-smoke.test.ts`）
- [ ] `pnpm lint:ssr`
- [ ] 文档站示例 + API 表已更新；过时注释与旧结论已清理
- [ ] 组件进度表（README）与 `packages/ui/README.md` 与该版本实际实现一致
- [ ] 仿真边界文案在文档站可见（不把「仿真」写成「还原系统能力」）
- [ ] 未把 `temp/` 下的快照、脚本、截图提交进仓库

---

# 0.3.0-rc.1 项目目标（i18n / 文档站 / 发布）

> 与其余部分的分工：0.1.0-rc.1 回答「组件够不够用」，本节回答「能不能被用起来」——多语言可读、文档站能体现 WinUI 质感、并且真正发到 npm 线上。本节完成后，0.4.0 起转入《0.4.0 – 0.9.0-rc.1 排期》，以 Explorer 仿真为最终目标。
> 三条主线可并行，但在发布前必须一次性收口：版本号、README / 文档站版本展示、CHANGELOG、本文件勾选状态。
> 交付基准：**在 `npm` 上 `pnpm add @fluere-vue/ui@0.3.0-rc.1` 可用，文档站中英双语可读且呈现 WinUI 质感，三个消费场景（Vite SPA / Nuxt SSR / 纯类型引用）全部验证通过。**

## 目标 1 · 集成 i18n（一期：简体中文 + 英语）

> 范围（已确认）：**文档站全站 + 组件库内建文案通道与语言包导出**。
> 一期语言：`zh-Hans`（默认，兼容 `zh-CN`）与 `en`。

### 现状（动手前先对齐的事实）

- 仓库内无任何 i18n 依赖（无 `@nuxtjs/i18n` / `vue-i18n`）。
- 文档站文案硬编码中文：`apps/docs/pages/index.vue`（features / ctLinks / Hero）、`apps/docs/data/components-nav.ts`（`title` 英文 + `label` 中文两套字段）、`apps/docs/layouts/components.vue`、`apps/docs/pages/components/index.vue`。
- `apps/docs/nuxt.config.ts` 的 `app.head.htmlAttrs.lang` 硬编码 `zh-CN`；首帧脚本只处理明暗偏好（`fluere-docs-color-mode`），不涉及语言。
- `packages/ui` 组件当前没有面向用户的硬编码文案（仅注释），但 a11y 可访问名由消费方传入——一期要为「库内建文案」预留通道，避免后续 ProgressRing / ContentDialog / InfoBar 等组件返工。

### 1.1 选型与基建

- [ ] 落地 `@nuxtjs/i18n`（v10.x，需与 `nuxt@4.5.1` 对齐），**先做 spike** 验证 `strategy: 'prefix_except_default'` + `@nuxt/content` + `nuxt generate` 三者组合，锁定版本进 `pnpm-workspace.yaml` 的 catalog
- [ ] locale 约定写死并记录：`defaultLocale: 'zh-Hans'`、`locales: ['zh-Hans', 'en']`，`zh-CN` 作为 `zh-Hans` 的别名处理
- [ ] 目录约定：界面串 `apps/docs/i18n/locales/{zh-Hans,en}.json`；正文 `apps/docs/content/{zh-Hans,en}/**`（`content.config.ts` 的 collection source 同步调整）
- [ ] 首帧语言恢复：与 `use-color-mode.ts` 同规则，SSR 端由路由前缀决定 `<html lang>`，客户端入口前写入，禁止「先 zh 后切 en」的闪烁与 `<html lang>` 水合不匹配
- [ ] SEO：每语言独立 `title` / `description` / `og:*`、`hreflang` alternate、sitemap 按语言拆分

### 1.2 界面串与导航

- [ ] 抽取全部可见文案为 key：首页三个 feature 卡片、stats、ctLinks、`navLinks`、`ThemeToggle`、布局 header / 移动端 nav / 页脚
- [ ] `components-nav.ts` 改为「`slug` + i18n key」结构，运行期按 locale 解析显示名，消除 `title`/`label` 双字段中英混写
- [ ] 语言切换控件（最终落在目标 2 的托盘 / 任务栏），记住上次选择（key 命名与 `fluere-docs-color-mode` 保持一致风格）
- [ ] 组件文档页内的示例标题、说明、提示框文案双语；demo 中的 API 名与代码保持英文
- [ ] 站点内所有新增文案一律走 key（作为目标 2 的硬约束，禁止新增硬编码中文）

### 1.3 内容双语

- [ ] 现有 8 篇组件文档（`button` / `checkbox` / `icons` / `input` / `radio-group` / `scroll-view` / `slider` / `switch`）+ 首页 + SSR 指南正文译为英文
- [ ] 英文缺失时的回退策略：`fallbackLocale: 'zh-Hans'`，并在页面上明确提示「该页暂无英文版」，不做静默混杂
- [ ] 划定双语边界：进文档站的内容双语；`docs/ssr-guide.md`、`docs/design/*`、本文件等仓库内部文档保持中文

### 1.4 组件库 i18n 通道（一期只建通道 + 首批文案）

- [ ] `packages/hooks` 增 `provide-locale` / `use-locale`，`packages/ui` 增 `FluereConfigProvider`：基于 provide/inject 的**实例级** locale，禁止全局可变单例（否则 SSR 多请求间会串语言）
- [ ] 语言包形态：`@fluere-vue/ui/locales/zh-Hans`、`@fluere-vue/ui/locales/en`，按组件分组、可 tree-shaking；解析优先级：组件 `locale` prop → provider → 内置默认（`en` 兜底）
- [ ] 首批纳入的文案：内置 a11y 可访问名（loading / close / expand / collapse 等）、后续 ContentDialog / ProgressRing / InfoBar 的默认文案；日期与数字一律走 `Intl`，不硬编码格式
- [ ] **组件库不引入 `vue-i18n` 运行时依赖**（保持框架无关与零额外依赖），由 provider 注入 message resolver；在 `packages/ui/README` 与文档站说明用法
- [ ] 回退链明确：`zh-Hans → zh → en`，缺 key 时打到 `en` 并只在开发环境告警

### 1.5 质量与验收标准

- [ ] 单测：locale 解析与回退链、provider 隔离（同进程两个 app 实例不同 locale 互不污染）
- [ ] SSR 冒烟：`packages/ui/src/__tests__/ssr-smoke.test.ts` 在 `zh-Hans` / `en` 两种 locale 下均通过
- [ ] 文案完整性检查脚本（key 集合对比，缺失即失败），接入 `pnpm check` 或独立 `pnpm i18n:check`，并进 CI
- [ ] **验收**：
  - 文档站任意页面在 `/`（中文）与 `/en` 下无遗漏串（专有名词、代码、API 名除外），控制台无 i18n 警告；
  - `pnpm docs:generate` 产出两种语言的静态页面；切换语言的行为（是否整页重载）有明确结论并记录；
  - provider 切换 locale 时组件内建文案即时更新，两个并发 SSR 请求不串 locale；
  - Lighthouse / axe 不出现 `lang` 相关告警，`<html lang>` 与水合结果一致。
- **非目标（推后）**：RTL、第三种语言、翻译平台（Crowdin / Locize）工作流、组件文档逐页人工润色（一期允许机翻 + 术语表人工过一遍）。

## 目标 2 · 优化文档站（往 WindowsOS 仿真方向完善）

> 判定基准：以 **WinUI 3 Gallery + Windows 11 实机**为参照——一个「桌面」承载一个「应用窗口」，窗口内有标题栏、NavigationView、内容区；底部任务栏承载开始 / 搜索 / 语言 / 主题 / 时钟。
> 边界（必须标注，与 README「不夸大承诺」一致）：**不做真实窗口管理器**——不实现拖拽吸附、多窗口、系统级动画复刻；移动端不仿桌面，走简洁响应式。

### 现状

- 只有 3 个页面（`/`、`/components`、`/components/[...slug]`）与 1 个 layout（顶部 header + 侧栏 + 移动端 nav），全部 UnoCSS 工具类直写，无组件化抽象。
- 无窗口外壳、无任务栏 / 开始菜单 / 标题栏 / 命令栏，无搜索，无版本选择，无「本页目录」。
- 版本号硬编码 `v0.0.1`（`apps/docs/layouts/components.vue` 与 `apps/docs/pages/index.vue`）。
- 可用素材：`@fluere-vue/ui` 组件、`@fluere-vue/themes` 的 `presetFluere`、`@fluere-vue/designs` 已抽取的 Fluent 令牌（Mica / Acrylic 相关令牌需先核对是否齐备，缺的先补进 `packages/designs`）。

### 2.1 桌面外壳（Shell）

- [ ] `DesktopShell` 布局：壁纸层（令牌化的渐变 / Mica 近似）→ 窗口层 → 任务栏层；层级、圆角、阴影一律用 designs 令牌，禁止魔法值
- [ ] `FluereAppWindow`：圆角窗口、标题栏（应用图标 + 标题 + 可拖拽区）、caption 按钮（最小化 / 最大化 / 关闭，含关闭键红底 hover）、窗口内独立滚动区
- [ ] caption 按钮**真实可用**：最小化 / 最大化 / 还原窗口视口；「关闭」不伪装成坏按钮（跳回首页或收起到任务栏），全部键盘可达（Tab + Enter）且 `aria-label` 双语
- [ ] 窗口尺寸与位置在桌面尺寸变化时的响应式策略；移动端断点降级为全屏无边框

### 2.2 任务栏 / 开始菜单 / 系统托盘

- [ ] `Taskbar`：居中图标组（开始、搜索、已固定入口）、hover / active 指示条、点击弹出或还原窗口
- [ ] `StartMenu`：Acrylic 面板承载站点信息架构（首页、指南、组件、设计令牌、路线图、GitHub），支持键盘导航与 Esc 关闭
- [ ] `SystemTray`：时钟（`Intl.DateTimeFormat` 按 locale）、主题切换、语言切换（与目标 1 共用同一控件）、版本号（读 `package.json`，去掉硬编码）
- [ ] 浮层焦点管理：聚焦陷阱、Esc / 点击外部关闭；通用逻辑优先下沉到 `packages/hooks`（如 `use-disclosure`），避免后续弹层组件重复实现

### 2.3 应用内导航（NavigationView 化）

- [ ] 把 `apps/docs/layouts/components.vue` 重构为窗口内 `NavigationView`：可折叠面板、分组（basic / form / color / dates / general，数据源仍是 `components-nav.ts`）、顶部搜索框、底部设置项
- [ ] 组件页新增右栏「本页目录」，页头带面包屑与「复制链接」
- [ ] `Ctrl+K` 命令面板式搜索：跨组件与正文（`@nuxt/content` 查询），全键盘可完成「打开 → 输入 → 选中 → 跳转」

### 2.4 页面与内容呈现

- [ ] 组件文档页模板化：标题区 + 示例卡片（Light / Dark 并排对照）+ 代码块（复制按钮、语言标签、行高亮）+ Props / Events / Slots 表格
- [ ] 示例的明暗对照与 `use-color-mode` 打通（示例级切换或跟随站点，二选一并记录理由）
- [ ] 新增站点页：入门 / 安装（真实可用的 `pnpm add` 指引，配合目标 3）、设计令牌浏览页、路线图 / 更新日志、404 空态（可读、可操作，不做成死胡同）
- [ ] 所有新增页面文案走 i18n key（与目标 1 同步，不新增硬编码中文）

### 2.5 动效、性能与无障碍

- [ ] 动效全部走 designs 的时长 / 缓动令牌，并遵循 `@fluere-vue/hooks` 的 `use-reduced-motion`（`prefers-reduced-motion` 下关闭窗口与菜单过渡）
- [ ] SSR 安全：`window` / `matchMedia` / `localStorage` 一律按 `docs/ssr-guide.md` 分级处理，外壳不得引入水合不匹配
- [ ] 性能预算：限制首屏 JS / CSS 体积与 `backdrop-filter` 覆盖面积（避免「为了像 Windows 而卡」）；`pnpm docs:generate` 产物在低端设备上滚动流畅
- [ ] 无障碍：窗口 / 任务栏 / 开始菜单的语义角色与 `aria-modal`；还原 WinUI 焦点矩形；对比度达标；装饰元素 `aria-hidden`；全部仿真控件可键盘操作
- [ ] **验收**：
  - 1280 / 1440 / 1920 与移动端均不溢出、不重叠，窗口内容可滚动到底；
  - Light / Dark 下所有新表面（窗口、任务栏、Acrylic 面板）对比度达标且无「白闪」；
  - 全站键盘可达：Tab 顺序合理、Esc 关闭浮层、`Ctrl+K` 打开搜索，焦点不被外壳吞掉；
  - `pnpm check` / `pnpm test` / `pnpm docs:generate` 全绿，SSR 冒烟覆盖新布局；
  - 视觉自检清单（rest / hover / pressed / focus / disabled × 明暗）写入站点 README 或 `docs/`，作为回归依据。
- **非目标（一期）**：真实多窗口与拖拽吸附、动态壁纸、系统级动画复刻、移动端仿桌面。

## 目标 3 · 集成 npm 发布基建并正式发布线上 0.3.0-rc.1

### 现状（阻塞发布的硬事实，逐条对照）

- 6 个包版本均为 `0.0.1`；`apps/*` 为 `private`，库包均未 `private`，但从未发布过。
- **包入口指向源码**：`@fluere-vue/ui` 的 `main` / `exports` 是 `./index.ts`，`@fluere-vue/designs`、`@fluere-vue/themes` 指向 `src/index.ts`——直接发布会发现消费方无法使用（无 `dist`、无 `.d.ts`）。
- 无 `files` 字段（会连带发布 `scripts/`、`generated/` 等非必要内容）、无 `publishConfig`（scoped 包默认 restricted）、无 `peerDependencies: vue`、无 `engines`；`packages/themes` 连 `exports` 字段都没有。
- 无库构建脚本（`pnpm build` 对纯库包目前不产出任何 dist）、无 CI（仓库无 `.github/`）、无 Changesets / CHANGELOG、根目录无 `LICENSE` 文件。
- README「快速开始」仍标注「尚未发布」，文档站页脚硬编码 `v0.0.1`。

### 3.1 包元数据与发布体检

- [ ] 逐包补齐：`files`、完整 `exports`（`import` / `require` / `types`，外加 `./style.css`、按需子路径如 `@fluere-vue/ui/button`、`@fluere-vue/designs/tokens.css`）、`types`、`sideEffects`（CSS 例外）、`publishConfig.access: "public"`、`repository.directory`、`engines.node`、`peerDependencies: { vue: "^3.5" }`
- [ ] 根目录补 `LICENSE`（MIT © 夕云葛城）；为 `ui` / `designs` / `themes` / `icons` 补包级 README（用法与相互依赖关系）
- [ ] 版本矩阵决策：所有 `@fluere-vue/*` 是否统一版本号（建议统一，便于用户理解与文档站展示），结论写入发布手册

### 3.2 构建管线

- [ ] 选定构建器（Vite 8 lib mode / tsdown / unbuild 三选一），**先做 spike 对比**：`.d.ts` 质量、Vue SFC 处理、CSS 产出、SSR 友好性、构建耗时；结论以 ADR 形式记录
- [ ] 构建顺序按拓扑：`designs`（先跑令牌生成）→ `themes` / `icons` / `hooks` / `utils` → `ui`；`pnpm -r build` 保证依赖顺序
- [ ] 产物形态：ESM 为主、CJS 兼容策略明确、`.d.ts` 完整、`tokens.css` 与图标按需导入可用；`vue` / `reka-ui` / `unocss` **外部化**，不打包进 dist
- [ ] tree-shaking 验证：`sideEffects` 正确，按需引入单组件后的体积符合预期并记录基线
- [ ] 扩展 `pnpm check` / `pnpm test`：至少新增一条「从 `dist` 引入并渲染」的冒烟用例，避免测试只覆盖源码入口

### 3.3 版本与变更日志

- [ ] 接入 Changesets：包间依赖联动 + `rc` 预发布模式（`changeset pre enter rc` / `pre exit`）
- [ ] CHANGELOG 自动生成 + 逐包 `CHANGELOG.md`；沿用现有 emoji conventional commit 规范并固化到 `CONTRIBUTING`
- [ ] 版本单一事实源：文档站页脚、README、`docs/todo.md` 标题一律从 `package.json` 读取或由发布流程注入，禁止硬编码

### 3.4 发布流水线（CI/CD）

- [ ] `.github/workflows/ci.yml`：PR 上跑 install（frozen lockfile）+ `pnpm check` + `pnpm test` + `pnpm build` + `pnpm docs:generate`
- [ ] `.github/workflows/release.yml`：Changesets action 开 release PR；合并后按 `rc` / `next` tag 发布（**预发布不占 `latest`**），启用 npm provenance（OIDC trusted publishing 或 `NPM_TOKEN` secret，二选一并记录）
- [ ] 发布前质量闸：`publint` + `@arethetypeswrong/cli` 全绿；`npm pack --dry-run` 复核 tarball 内容与体积（不含源码、测试、未生成物）
- [ ] 发布彩排：本地 verdaccio 或 `--dry-run` 走通全流程（含 dist 安装、SSR 渲染、CSS 引入）
- [ ] 回滚与补救预案：`npm deprecate`、撤销 tag、`latest` 回指上一版的具体步骤写入 `docs/release.md`

### 3.5 正式发布 0.3.0-rc.1（按序执行）

- [ ] 冻结范围：确认 0.3.0-rc.1 包含的组件与文档（与上半部分组件清单对齐），未完成项明确移出并记录
- [ ] `changeset pre enter rc` → 全包 bump 到 `0.3.0-rc.1` → 构建 → 校验 → 发布 `--tag rc`（`npm i @fluere-vue/ui@rc` 可用，`latest` 不受影响）
- [ ] 发布后验证（干净目录、走公网 npm 安装）：`pnpm add @fluere-vue/ui@0.3.0-rc.1` 后 Button / Checkbox / Slider 等可正常渲染、样式生效、`renderToString` 不抛错、peer 警告符合预期
- [ ] 收口文档：README 去掉「尚未发布」、补安装与按需引入示例、更新组件进度表与版本号；文档站展示线上版本与更新日志
- [ ] 打 git tag `v0.3.0-rc.1` + GitHub Release（附破坏性变更与已知问题清单）
- [ ] **验收**：
  - `@fluere-vue/*@0.3.0-rc.1` 在 npm 全部可见，`dist-tags` 中 `latest` 未被预发布污染；
  - 三个独立消费场景验证通过：Vite SPA、Nuxt SSR、纯类型引用（`vue-tsc` 无错）；
  - CI 在 PR 与 release 两条链路上全绿，同一 commit 重跑发布不产生脏状态；
  - 发布手册与回滚步骤齐备，且经过一次彩排验证。
- **非目标（一期）**：自动化视觉回归发布门、GitHub Packages 等多 registry 同步、CDN / unpkg 体积门、0.3.0 稳定正式版（rc 验证后再定）。

## 依赖关系与建议顺序

1. **先做两个 spike**：目标 1.1 的 i18n 选型（影响文档站结构）与目标 3.2 的构建器选型（影响所有包入口）。两者互不阻塞，各控制在 1 天内出结论。
2. **目标 2 依赖目标 1 的 key 约定**：先定 i18n 基建与命名，再固化外壳与页面模板，否则文案要返工两遍。顺序：i18n 基建 → 2.1 / 2.2 外壳 → 2.3 / 2.4 页面 → 2.5 打磨。
3. **目标 3 的 3.1 / 3.2 可与目标 2 并行**（只改包元数据与构建，不碰文档站页面）；3.4 流水线等 CI 能跑通 `docs:generate` 之后再接入。
4. **发布前统一冻结**：版本号、README / 文档站版本展示、CHANGELOG、本文件勾选状态一次性收口，避免「代码已发、文档没跟上」。

## 与 0.4.0+ 排期的衔接

本节三条主线是 0.4.0 起排期的**前置输入**，不是可跳过项：

- **目标 1（i18n）的 key 约定是 0.5.0 起的硬约束**：0.5.0 新增的外壳、任务栏、开始菜单、系统托盘文案必须走 key，否则要返工两遍（本节 1.2 已列为硬约束）。
- **目标 2（文档站 WindowsOS 仿真化）是 Explorer 骨架的布局基建**：0.5.0 的 `DesktopShell` / `Taskbar` / `StartMenu` 直接复用本节 2.1 / 2.2 的产出，故本节 2.1–2.2 应先于或并行于 0.5.0 完成。
- **目标 3（构建器与包入口）是 0.9.0-rc.1 对外可用的前提**：包入口现仍指向源码（无 `dist`、无 `.d.ts`），不解决则 Explorer 首页只是仓库内的演示，无法被任何人 `pnpm add`。

## 风险与对策

| 风险                                   | 影响                     | 对策                                                             |
| -------------------------------------- | ------------------------ | ---------------------------------------------------------------- |
| 文档站「仿真」过度                     | 首屏慢、移动端卡顿       | 令牌化动效 + 性能预算 + 移动端降级全屏，仿真范围写入 README      |
| i18n 与 `@nuxt/content` + SSG 组合踩坑 | 双语路由与内容查询返工   | 先 spike 验证 `prefix_except_default` + 内容目录方案，再批量翻译 |
| 纯 TS 源码入口被发布                   | 消费方无法使用、口碑受损 | 3.2 强制 `dist` + `types`，发布闸用 `publint` / `attw` 拦截      |
| 预发布污染 `latest`                    | 用户误装 rc 版           | `changeset pre enter rc` + `--tag rc`，发布后核对 `dist-tags`    |
| 双语文案长期不同步                     | 英文页无人维护           | 缺失回退 + CI key 完整性校验 + 页面标注英文状态                  |
| 组件清单与发布范围脱节                 | 发布内容与 README 不一致 | 发布前冻结范围，同步 README 与 `docs/todo.md`                    |
