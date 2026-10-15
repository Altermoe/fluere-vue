/**
 * FluereNavigationView 的数值常量（全部来自 A 级源码，逐条注明出处）。
 *
 * 规格来源：`microsoft-ui-xaml` tag `winui3/release/2.5.1`（commit `ba3a8d5`）。
 * 视觉值（颜色 / 圆角 / 间距）在 `navigation-view.vue` 的 `<style>` 里以
 * `--fui-navigation-view-*` 局部变量声明并逐条注明 WinUI 资源名；这里只放**行为**需要的数字。
 */

/**
 * Auto 档进入 `Expanded` 的宽度下界 —— WinUI `ExpandedModeThresholdWidth` 缺省 `1008.0`
 * （`NavigationView.idl:179-180`，`Generated/NavigationView.properties.cpp:145`）。
 *
 * 判据是 `width >= ExpandedModeThresholdWidth()`（**含等于**，`NavigationView.cpp:1457`）。
 */
export const NAVIGATION_EXPANDED_MODE_THRESHOLD_WIDTH = 1008

/**
 * Auto 档进入 `Minimal` 的宽度上界 —— WinUI `CompactModeThresholdWidth` 缺省 `641.0`
 * （`NavigationView.idl:176-177`，`Generated/NavigationView.properties.cpp:101`）。
 *
 * 判据是 `width > 0 && width < CompactModeThresholdWidth()`（**严格小于，且显式排除 0**，
 * `NavigationView.cpp:1461`）⇒ `width === 641` 落在 Compact，`width === 0` 也落在 Compact。
 */
export const NAVIGATION_COMPACT_MODE_THRESHOLD_WIDTH = 641

/**
 * 面板两档宽度（px）的令牌回退值 —— 与 `@fluere-vue/designs` 的
 * `--navigationPaneExpandedWidth`(320) / `--navigationPaneCompactWidth`(48) 同值。
 *
 * A 级来源：WinUI `OpenPaneLength` 缺省 `320.0`（`NavigationView.idl:198-199`）、
 * `CompactPaneLength` 缺省 `48.0`（`NavigationView.idl:195-196`）。
 * 这里只是「读不到 CSS 变量时」的兜底（jsdom / 未引入 tokens.css 的宿主），
 * 组件内一律以 `var(--navigationPane*)` 为准。
 */
export const NAVIGATION_EXPANDED_PANE_FALLBACK_WIDTH = 320
export const NAVIGATION_COMPACT_PANE_FALLBACK_WIDTH = 48

/**
 * 面板开关（汉堡）按钮的宽 / 高（px）—— WinUI `PaneToggleButtonWidth` = 40、
 * `PaneToggleButtonHeight` = 36（`NavigationView_themeresources.xaml:205-206`）。
 *
 * ⚠️ 别和 `TemplateSettings.PaneToggleButtonWidth` 混淆：后者等于 `CompactPaneLength`
 * （`NavigationView.cpp:1823-1828`，默认 48），是**面板列的宽**；XAML 里绑给按钮的
 * `MinWidth` 的是 `SmallerPaneToggleButtonWidth` = `max(0, CompactPaneLength - 8)` = 40
 * （`:1829`）。本组件取后者（40）作为按钮盒宽。
 */
export const NAVIGATION_PANE_TOGGLE_BUTTON_WIDTH = 40
export const NAVIGATION_PANE_TOGGLE_BUTTON_HEIGHT = 36

/**
 * 面板内菜单项的最小高度（px）—— WinUI `NavigationViewItemOnLeftMinHeight` = 36
 * （`NavigationView_themeresources.xaml:217`，消费点 `:451` 的 `LayoutRoot.MinHeight`
 * 与 `:604` 的 `ContentGrid.MinHeight`）。
 */
export const NAVIGATION_ITEM_MIN_HEIGHT = 36

/**
 * 图标盒高度（px）—— WinUI `NavigationViewItemOnLeftIconBoxHeight` = 16
 * （`NavigationView_themeresources.xaml:219`，消费点 `:612` 的 `IconBox.Height`）。
 */
export const NAVIGATION_ITEM_ICON_BOX_HEIGHT = 16

/**
 * 图标列宽（px）—— `TemplateSettings.SmallerIconWidth` = `max(0, CompactPaneLength - 8)`
 * （`NavigationViewItemPresenter.cpp:289`），绑给 `IconColumn.Width`
 * （`NavigationView_themeresources.xaml:611`）。默认 CompactPaneLength=48 ⇒ 40。
 */
export const NAVIGATION_ICON_COLUMN_FALLBACK_WIDTH = 40

/**
 * 选中指示条几何（px）—— `NavigationViewSelectionIndicatorWidth` = 3、
 * `NavigationViewSelectionIndicatorHeight` = 16、`...Radius` = 2
 * （`NavigationView_themeresources.xaml:220-222`，消费点 `:602`）。
 */
export const NAVIGATION_SELECTION_INDICATOR_WIDTH = 3
export const NAVIGATION_SELECTION_INDICATOR_HEIGHT = 16
export const NAVIGATION_SELECTION_INDICATOR_RADIUS = 2

/**
 * 分组标题行高（px）—— `NavigationViewItemHeader` 的 `InnerHeaderGrid.Height` = 40
 * （`NavigationView.xaml:564`），折叠时置 0（`:551`）。
 */
export const NAVIGATION_HEADER_ROW_HEIGHT = 40

/**
 * 分组标题 / 分隔线的层级缩进步长（px）—— `c_itemIndentation = 31`
 * （`NavigationViewItemBase.h:63`），消费点 `NavigationViewItemHeader.cpp:76-84` 与
 * `NavigationViewItemSeparator.cpp:74-83`：`Margin.Left = Depth() * c_itemIndentation`。
 */
export const NAVIGATION_ITEM_INDENTATION = 31

/**
 * 禁用项的不透明度 —— WinUI 走 `ListViewItemDisabledThemeOpacity` = 0.3
 * （`CommonStyles/ListViewItem_themeresources.xaml` 的 `x:Double` 资源，
 * 消费点 `NavigationView_themeresources.xaml:501` 的 `LayoutRoot.Opacity`）。
 */
export const NAVIGATION_DISABLED_OPACITY = 0.3

/**
 * pane 浮层（overlay）展开 / 收起时长（毫秒）—— 来自 SplitView 模板的
 * `VisualTransition`（`SplitView_themeresources.xaml`）：
 *
 * | 方向 | 资源 | 值 | 关键帧 |
 * | --- | --- | --- | --- |
 * | 展开 | `SplitViewPaneAnimationOpenDuration` | `00:00:00.2`（`:10`） | `SplineDoubleKeyFrame KeySpline="0.0,0.35 0.15,1.0"`（`:339`） |
 * | 展开（内容预动） | `SplitViewPaneAnimationOpenPreDuration` | `00:00:00.19999`（`:11`） | 同上（`:341`） |
 * | 收起 | `SplitViewPaneAnimationCloseDuration` | `00:00:00.1`（`:12`） | 同上（`:313`） |
 *
 * ⚠️ **这不是 NavigationView 自己的值**：NavigationView 的 pane 由内部 `SplitView` 承载
 * （`NavigationView.xaml:289`，`DisplayMode` 见 `NavigationView.cpp:2670-2677`），
 * 开合动画由 SplitView 模板播放。NavigationView 自己另有 `ShadowCaster` 的
 * `0.35s / 0.12s` 关键帧（`NavigationView.xaml:96-121`，本库用 `--durationSlower` /
 * `--durationFaster` 表达阴影淡入淡出），与面板宽度动画是两回事。
 */
export const NAVIGATION_PANE_OPEN_DURATION_MS = 200
export const NAVIGATION_PANE_CLOSE_DURATION_MS = 100

/**
 * 上面各档时长对应的 **Fluent token 名**（AGENTS.md〈代码约定〉：时长一律走
 * `--duration*` 令牌，不许把毫秒数当样式值写进组件）。
 *
 * | A 级毫秒值 | token | token 值 |
 * | --- | --- | --- |
 * | 200 | `--durationNormal` | `0.2s` |
 * | 100 | `--durationFaster` | `0.1s` |
 * | 50 | `--durationUltraFast` | `50ms` |
 *
 * 组件在 `motion="none"` / `prefers-reduced-motion` 下把变量置 `0ms`（见 `navigation-view.vue`
 * 的 `rootStyle`），因此 token 名也必须在这里登记，不能在模板里写裸字符串。
 */
export const NAVIGATION_DURATION_TOKEN_NORMAL = 'var(--durationNormal)'
export const NAVIGATION_DURATION_TOKEN_FASTER = 'var(--durationFaster)'
export const NAVIGATION_DURATION_TOKEN_ULTRA_FAST = 'var(--durationUltraFast)'

/**
 * 分组标题文字的淡入 / 淡出时长（毫秒）—— `NavigationViewItemHeader` 的
 * `PaneStates` 过渡（`NavigationView.xaml:518-544`）：
 * 展开时 `Opacity` 0→1 用 `SplineDoubleKeyFrame KeyTime="0:0:0.2"`（`:528`）；
 * 收起时 1→0 用 `KeyTime="0:0:0.1"`（`:542`），并在 `0:0:0.2` 才把文字 `Collapsed`（`:538`）。
 */
export const NAVIGATION_HEADER_TEXT_FADE_IN_MS = 200
export const NAVIGATION_HEADER_TEXT_FADE_OUT_MS = 100

/**
 * chevron 旋转的总时长（毫秒）—— `AnimatedChevronUpDownSmallVisualSource` 的 LottieGen 产物
 * `c_durationTicks = 43333333L`（`AnimatedChevronUpDownSmallVisualSource.cpp:104`）
 * ⇒ **433.33 ms**（`Duration()` 返回同一 tick 数，`:776`）；进度换算 `frame / 260`（`:782`）。
 *
 * 单段区间（`:789-796`）：`NormalOnToNormalOff` = 0.0→0.11173（≈48.4ms）、
 * `NormalOffToNormalOn` = 0.1925→0.30404（≈48.4ms）。
 *
 * **证据缺口与实现取舍**：本库不引入 Lottie，用 CSS `rotate` 表达「展开 180° / 收起 0°」的
 * 静态两端（`AnimatedIcon` 的 fallback 字形 `&#xE70D;` 就是朝下的 chevron，
 * `NavigationView_themeresources.xaml:268-269`、`:621`），过渡时长取单段 ≈48ms 的
 * 4 舍 5 入档 `--durationUltraFast`（50ms）。逐帧关键帧（含 0.333/1.0 两段缓动
 * `cubic-bezier(0.9,0.1,1.0,0.2)` / `cubic-bezier(0.1,0.9,0.2,1.0)`，`NavigationView.cpp:1999-2002`）
 * **不实现**，属 0.9.x 动效专项目标。
 */
export const NAVIGATION_CHEVRON_DURATION_MS = 50

/**
 * 面板浮层阴影深度（px）—— WinUI `PaneOverlayShadowDepth` = 16
 * （`NavigationView_themeresources.xaml:207`，消费点 `NavigationView.cpp:5046` 的
 * `shadowCaster.Translation` Z 分量）。Web 侧映射到 `--shadow16`（见组件样式）。
 */
export const NAVIGATION_PANE_OVERLAY_SHADOW_DEPTH = 16

/**
 * 面板底部「设置」项与菜单项列表之间的分隔线下方留白（px）——
 * `VisualItemsSeparator.Margin = 0,0,0,2`（`NavigationView.xaml:375`）。
 */
export const NAVIGATION_ITEM_SEPARATOR_MARGIN_BOTTOM = 2
