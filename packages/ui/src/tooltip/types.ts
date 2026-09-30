/**
 * FluereTooltip 公共类型契约
 *
 * 设计规范来源：WinUI 3 / Windows App SDK — ToolTip / ToolTipService
 *   microsoft-ui-xaml `winui3/release/2.5.1`（commit ba3a8d5，本地快照 temp/winui-src）
 *   已核对版本漂移：`ToolTip_themeresources.xaml` 在 tag `winui3/release/2.0.1`
 *   （最新 WinUI3 Gallery 发行版 v2.9.3 所用的 WindowsAppSDK 2.0.1）与 2.5.1 之间
 *   **逐字节一致**（归一化 BOM/CRLF 后 `diff` 为空）⇒ 本地快照即 Gallery 行为基准。
 *   dxaml 侧（`ToolTip_Partial.cpp` / `ToolTipService_Partial.cpp`）不在 sparse checkout
 *   里，按 §3.2 单文件拉取到 `temp/tooltip-src/` 核对。
 *
 * 读到的规范（文件 → 结论）：
 *  - `src/controls/dev/CommonStyles/ToolTip_themeresources.xaml`：
 *      · 默认 Style `DefaultToolTipStyle`：Foreground `ToolTipForegroundBrush`、
 *        Background `ToolTipBackgroundBrush`、`BackgroundSizing=InnerBorderEdge`、
 *        BorderBrush `ToolTipBorderBrush`、BorderThickness `ToolTipBorderThemeThickness`(1)、
 *        FontFamily `ContentControlThemeFontFamily`、FontSize `ToolTipContentThemeFontSize`(12)、
 *        Padding `ToolTipBorderPadding`(9,6,9,8)、MaxWidth `ToolTipMaxWidth`(320)、
 *        CornerRadius `ControlCornerRadius`(4)
 *      · Template 只有一个 `ContentPresenter x:Name="LayoutRoot"`（`TextWrapping=Wrap`），
 *        即「描边 + 背景 + 内边距 + 内容」四件套，**没有**箭头 / 尖角（Pointer 指示器）
 *      · `OpenStates` 两个 VisualState：Closed → `FadeOutThemeAnimation`(LayoutRoot)、
 *        Opened → `FadeInThemeAnimation`(LayoutRoot)
 *  - `src/dxaml/xcp/dxaml/lib/ToolTipService_Partial.h` 的常量：
 *      · `DEFAULT_SPI_GETMOUSEHOVERTIME` 400ms（`SPI_GETMOUSEHOVERTIME` 缺省值 = 悬停基准 x）
 *      · `BETWEEN_SHOW_DELAY_MS` 200ms（距离上次打开 < 200ms 视为「重展示」）
 *      · `DEFAULT_SHOW_DURATION_SECONDS` 5（`SPI_GETMESSAGEDURATION` 缺省 = 自动隐藏 5s）
 *  - `ToolTipService_Partial.cpp#GetInitialShowDelay` 的延时表（x = 400ms）：
 *      Touch 1x / Mouse 2x / Keyboard 2x（首次打开），重展示 Touch 0 / Mouse 1.5x / Keyboard 2x
 *  - `ToolTipService_Partial.cpp`：`OnOwnerEnterInternal` 起 `DispatcherTimer`，
 *    到期才 `OpenAutomaticToolTip`；`OnOwnerLeaveInternal` / `OnOwnerLostFocus` 取消或关闭；
 *    `OnOwnerGotFocus` 只在焦点来自键盘（`FocusState.Keyboard`）或 UIA 程序化置焦时才弹
 *  - `ToolTip_Partial.cpp#HookupParentPopup`：`IsTabStop` / `IsHitTestVisible` 都置 false，
 *    `IsEnabled=false` 时把 Popup 的 `Opacity` 直接设为 0（不显示）
 *  - `ToolTip_Partial.cpp#Open`：`ApplyElevationEffect(LayoutRoot, 0, baseElevation 16)`
 *    （drop-shadow 模式下 ToolTip 的阴影比常规更小）
 *  - `ThemeAnimations.cpp` 的 `FadeInThemeAnimation::CreateTimelines` /
 *    `FadeOutThemeAnimation::CreateTimelines` 只转调
 *    `ThemeGenerator::AddTimelinesForThemeAnimation(TAS_FADEIN, TA_FADEIN_SHOWN, ...)`
 *    / `(TAS_FADEOUT, TA_FADEOUT_HIDDEN, ...)`；`TAS_*` / `TA_*` 与各 ThemeAnimation 的
 *    时长常量定义在 **非公开** 的 `vsanimation.h`（`ThemeGenerator.cpp` 里只有
 *    `TA_TRANSFORM*` 的消费方），本仓库与 upstream 公开源码树中都查不到该头文件
 *    ⇒ 淡入淡出的具体毫秒数**无法从 A 级源码取到**，见 types 下方「动效取值」说明。
 *
 * WinUI 资源名 → Fluent token 映射（取值一律 `var(--TokenName)`）：
 *   ToolTipForegroundBrush ← `TextFillColorPrimary`（#E4000000 / #FFFFFF）
 *     → `colorNeutralForeground1`（#242424 / #ffffff）
 *   ToolTipBackgroundBrush ← `AcrylicInAppFillColorDefaultBrush`
 *     （`AcrylicBrush the Merge`：Light TintColor #FCFCFC / TintOpacity 0 /
 *       FallbackColor #F9F9F9 / TintLuminosityOpacity 0.85；
 *       Dark TintColor #2C2C2C / TintOpacity 0.15 / FallbackColor #2C2C2C /
 *       TintLuminosityOpacity 0.96）
 *     → `colorNeutralCardBackground`（#fafafa / #333333）
 *       合成依据：Dark 的 TintColor=#2C2C2C 即 Fluent 2 Web 里同一 TintColor 的
 *       `colorNeutralCardBackground` Dark 值，且 `colorNeutralBackground3` 的 Dark
 *       (#141414) 明显过暗；Light 的 FallbackColor #F9F9F9 与 #fafafa 只差 1 个灰阶
 *   ToolTipBorderBrush ← `SurfaceStrokeColorFlyout`（#33000000 / #0F000000）
 *     → `colorNeutralStrokeAlpha`（rgba(0,0,0,.05) / rgba(255,255,255,.1)）
 *       Light ΔE 5.9（同值域），Dark 语义位复用（Flyout 描边位在 token 表里唯一命中）
 *   ControlCornerRadius(4) → `borderRadiusMedium`；ToolTipBorderThemeThickness(1)
 *     → `strokeWidthThin`；ToolTipContentThemeFontSize(12) → `fontSizeBase200`
 *     + `lineHeightBase200`；ContentControlThemeFontFamily → `fontFamilyBase`
 *   ToolTipBorderPadding(9,6,9,8) / ToolTipMaxWidth(320) → token 表无 9 档与 320 档，
 *     按 WinUI 资源名落成组件局部变量（最大化沿用既有的「无同值档 → 局部变量」口径）
 *   ApplyElevationEffect(0, baseElevation 16) → `shadow16`（token 名与 baseElevation
 *     同值；WinUI 只给 baseElevation、无 px 换算，属 B 级近似）
 *
 * 动效取值（**证据缺口必须写明，不靠猜**）：
 *   WinUI 的打开 / 关闭都是 `FadeInThemeAnimation` / `FadeOutThemeAnimation`，只改
 *   `LayoutRoot.Opacity`（0↔1，linear）。其时长常量落在非公开头文件 `vsanimation.h`，
 *   公开源码树里取不到 ⇒ 本库按「主题动画的最短淡入档」取 `--durationFaster`(100ms) +
 *   `--curveLinear`，并把它落成组件局部变量，消费方可一行覆盖：
 *     .fui-tooltip__surface { --fui-tooltip-fade-duration: 167ms; }
 *   这是本组件唯一一处「值本身」的 B 级取值（映射关系与几何/配色均为 A 级）。
 *
 * 与 WinUI 的差异（有意为之，逐条记录）：
 *  - **层级**：WinUI 用 Popup（XamlRoot 顶层）+ `Canvas.ZIndex`；本库用 portal 到 body
 *    的浮层，z-index 取 1100（高于 ContentDialog 的 1000，对齐「ToolTip 始终在最上层」）。
 *  - **触摸 / 长按**：WinUI 触摸长按（Touch 模式 1x 延时）也会弹；Web 侧 reka 的触发
 *    只认 pointerenter / pointermove（`pointerType === 'touch'` 被显式跳过）与 focus，
 *    故触摸端只在「点按后获得焦点」时生效，长按不弹。触摸端另有原生 tooltip 兜底。
 *  - **`SPI_GETMESSAGEDURATION` 的 5s 自动隐藏**不实现：本库只做「离开 / 失焦即关」。
 *    自动隐藏依赖真实鼠标位置（WinUI 在 5s 后把 ToolTip 从鼠标下方挪开并关闭），
 *    在 Web 上按时间强行隐藏会在「鼠标仍停在控件上」时产生闪烁，故选择不实现并记录。
 *  - **`PlacementMode.Mouse` 的鼠标跟随**不实现：默认 `placement='top'`（WinUI 自动
 *    ToolTip 的 `DefaultPlacementMode` 即 Top），需要跟随指针的消费方可自行监听 pointermove。
 *  - **`ToolTipService` 的其它随附属性**（`BetweenShowDelay` / `ShowDuration` /
 *    `KeyboardAcceleratorToolTip` / `PlacementTarget` / `Placement` / `Offset`）本期只暴露
 *    最常用的 `placement` / `sideOffset`；其余按需再加，避免先做一堆无人用的 API。
 *  - 高对比度主题（WinUI HC：`SystemColorWindowTextColorBrush` + `SystemColorWindowColor`）
 *    本轮不实现，属已知缺口。
 */

/** 弹出方位（对应 WinUI `PlacementMode` 的子集，成员名沿用 WinUI 的语义） */
export type FluereTooltipPlacement = 'top' | 'bottom' | 'left' | 'right'

/** 对齐方式（对应 reka Popper 的 `align`，WinUI 侧等价于 `PositionRelativeOnSide` 的居中 + 贴边回推） */
export type FluereTooltipAlign = 'start' | 'center' | 'end'

/**
 * FluereTooltip Props 契约
 *
 * 与 WinUI 的对应关系（逐项对齐 `ToolTip.idl` / `ToolTipService.idl`）：
 *   ToolTip.IsOpen            → `open`（`v-model:open`，`MUX_DEFAULT_VALUE("false")`）
 *   ToolTip.Content           → `content` Prop（纯文本）/ `#default` 插槽（富内容）
 *   ToolTip.Placement         → `placement`（默认 `top`，对齐 `DefaultPlacementMode`）
 *   ToolTip.HorizontalOffset /
 *   ToolTip.VerticalOffset    → `sideOffset`（沿弹出方向的偏移；横向偏移本期不暴露）
 *   ToolTip.IsEnabled         → `disabled`（`IsEnabled=false` 时 WinUI 把 Popup 的
 *                               Opacity 置 0，本库表达为「不弹出」）
 *   ToolTipService.InitialShowDelay → `delayDuration`（默认 400，见上）
 *   ToolTipService.BetweenShowDelay → `FluereTooltipProvider` 的 `skipDelayDuration`（200）
 *   ToolTipService.Placement   → 同上 `placement`
 *   ToolTipService.ToolTip     → 用本组件包住目标元素（reka 会把触发元素设为 `asChild`）
 *   ToolTip.IsTabStop /
 *   ToolTip.IsHitTestVisible  → 固定 false（不可 Tab、不吃指针，见组件样式）
 */
export interface FluereTooltipProps {
  /**
   * 提示文本（纯文本形态，对齐 WinUI 的 `ToolTipService.ToolTip="文本"` 用法）。
   * 需要富内容（多行、图标、换行）时改用 `#default` 插槽
   */
  content?: string

  /**
   * 受控的展开状态（`v-model:open`）；对齐 WinUI `ToolTip.IsOpen`
   * @default undefined（非受控）
   */
  open?: boolean

  /**
   * 弹出方位；对齐 WinUI `ToolTip.Placement`（默认 Top）
   * @default 'top'
   */
  placement?: FluereTooltipPlacement

  /**
   * 沿弹出方向的间距（px）；对齐 WinUI `HorizontalOffset` / `VerticalOffset`。
   * WinUI 的默认偏移在 `Popup` 的 Arrange 里按目标 Rect 计算，参考图实测为 4px
   * @default 4
   */
  sideOffset?: number

  /**
   * 与目标在垂直于弹出方向上的对齐方式
   * @default 'center'
   */
  align?: FluereTooltipAlign

  /**
   * 显示前的延时（ms）；对齐 `ToolTipService.InitialShowDelay`。
   * 缺省继承 `FluereTooltipProvider`（未提供 Provider 时为 400）
   */
  delayDuration?: number

  /**
   * 是否禁用（不弹出）；对齐 WinUI `ToolTip.IsEnabled = false`
   * @default false
   */
  disabled?: boolean

  /**
   * 提示面的可访问名；缺省取内容文本。对齐 reka 的 `aria-label`
   */
  label?: string
}

/** `FluereTooltipProvider` Props 契约（对齐 `ToolTipService` 的全局配置面） */
export interface FluereTooltipProviderProps {
  /**
   * 首次显示延时（ms）；对齐 `ToolTipService.InitialShowDelay` 的缺省 400
   * （WinUI：`SPI_GETMOUSEHOVERTIME` 400ms × Mouse/Keyboard 的 2x / Touch 的 1x）
   * @default 400
   */
  delayDuration?: number

  /**
   * 「重展示」窗口（ms）：距上次打开小于该值则跳过延时；对齐 `BETWEEN_SHOW_DELAY_MS`(200)
   * @default 200
   */
  skipDelayDuration?: number
}

/**
 * 标记「祖先里已经有 FluereTooltipProvider」的内部注入键。
 *
 * 用途：WinUI 的 `ToolTipService` 是进程级服务、必然存在，而 reka 的 `TooltipProvider`
 * 是可选的。`FluereTooltip` 据此判断是否需要**自带**一个缺省 Provider（缺省 400 / 200，
 * 与 `ToolTipService` 的缺省值一致），从而做到「不套 Provider 也能独立使用」；
 * 一旦祖先提供了 `FluereTooltipProvider`，就用它的配置，不再叠加自带的那层。
 * 该键只在包内使用，不进公开 API。
 */
export const TOOLTIP_PROVIDER_FLAG = Symbol('fluere-tooltip-provider')
