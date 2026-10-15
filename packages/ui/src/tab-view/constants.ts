/**
 * FluereTabView 的数值常量（全部来自 A 级源码，逐条注明出处）。
 *
 * 规格来源：`microsoft-ui-xaml` tag `winui3/release/2.5.1`（commit `ba3a8d5`）。
 * 视觉值（颜色 / 圆角 / 间距）在 `tab-view.vue` 的 `<style scoped>` 里以
 * `--fui-tab-view-*` 局部变量声明并逐条注明 WinUI 资源名；这里只放**行为**需要的数字。
 */

/**
 * Equal 模式单 tab 宽度下界 —— `TabViewItemMinWidth`（`TabView_themeresources.xaml:244`）。
 * 代码侧消费点 `TabView.cpp:1182`（`FindInApplicationResources` 查不到的回落值是 `48`，
 * 属异常路径：正常合并了 XamlControlsResources 的宿主取到的就是 100）。
 */
export const TAB_VIEW_MIN_TAB_WIDTH = 100

/** Equal 模式单 tab 宽度上界 —— `TabViewItemMaxWidth`（`TabView_themeresources.xaml:243`，消费点 `TabView.cpp:1139`） */
export const TAB_VIEW_MAX_TAB_WIDTH = 240

/**
 * 滚动按钮每次滚动的像素 —— `TabView.cpp:25` 的 `c_scrollAmount = 50.0`，
 * 消费点 `OnScrollDecreaseClick` / `OnScrollIncreaseClick`（`TabView.cpp:1103-1117`）。
 */
export const TAB_VIEW_SCROLL_AMOUNT = 50

/**
 * 滚动按钮贴边判定的容差 —— `TabView::UpdateScrollViewerDecreaseAndIncreaseButtonsViewState`
 * 的 `minThreshold = 0.1`（`TabView.cpp:689-734`）：`abs(offset) < 0.1` 视为贴左、
 * `abs(offset - scrollableWidth) < 0.1` 视为贴右（该侧按钮禁用）。
 */
export const TAB_VIEW_EDGE_EPSILON = 0.1

/**
 * 选中 tab 滚入可视区时预留的余量 —— `TabViewItem::StartBringTabIntoView`
 * 用 `TargetRect.Width = DesiredSize().Width + 2`（`TabViewItem.cpp:622-628`）。
 */
export const TAB_VIEW_BRING_INTO_VIEW_PADDING = 2

/**
 * 滚动按钮在前端的溢出判定容差（像素）：`scrollWidth - clientWidth` 小于它视为不溢出。
 * WinUI 侧用的是 `ComputedHorizontalScrollBarVisibility`（由 ScrollViewer 内部计算），
 * 但 `TabScrollViewerStyle` 的模板里**没有滚动条部件**，该依赖属性只绑给两个箭头容器的
 * `Visibility`（`TabView.xaml:157,163`）⇒ 它的语义就是「箭头显不显示」，不是「滚动条显不显示」。
 * Web 侧没有等价量，用 0.5px 的亚像素容差代替（浏览器在 DPR > 1 时会给出小数宽度）。
 */
export const TAB_VIEW_OVERFLOW_EPSILON = 0.5

/**
 * 滚动按钮长按重复的启动延时（毫秒）—— 两个 `RepeatButton` 的 `Delay="50"`
 * （`TabView.xaml:158,165`）：按下立刻触发一次 Click，50ms 后进入重复。
 */
export const TAB_VIEW_SCROLL_REPEAT_DELAY = 50

/**
 * 滚动按钮长按重复的间隔（毫秒）—— 同上两个 `RepeatButton` 的 `Interval="100"`
 * （`TabView.xaml:158,165`）：启动延时之后每 100ms 触发一次 Click。
 */
export const TAB_VIEW_SCROLL_REPEAT_INTERVAL = 100
