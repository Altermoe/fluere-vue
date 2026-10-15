<script lang="ts">
/**
 * FluereNavigationView —— WinUI 3 `Microsoft.UI.Xaml.Controls.NavigationView` 的 Vue 实现
 * （**左侧面板形态**，不含顶部导航）。
 *
 * ## 规格来源（A 级）
 *
 * `microsoft-ui-xaml` tag **`winui3/release/2.5.1`**（commit `ba3a8d59e6de4e2b86ca4f61c78bc26ccf129afd`）：
 *
 * | 文件 | 读到的东西 |
 * | --- | --- |
 * | `src/controls/dev/NavigationView/NavigationView.idl`（389 行） | 公开 API 与依赖属性默认值 |
 * | `src/controls/dev/NavigationView/NavigationView.cpp`（5806 行） | DisplayMode 状态机、键盘、选择、指示条动画、pane 开合 |
 * | `src/controls/dev/NavigationView/NavigationView.xaml`（606 行） | 模板结构、`NavigationViewItemHeader` / `...Separator` 模板、pane 浮层关键帧 |
 * | `src/controls/dev/NavigationView/NavigationView_themeresources.xaml`（1094 行） | 画刷别名链、几何资源、Item / Presenter 的 VisualState |
 * | `src/controls/dev/NavigationView/NavigationViewItem.cpp`（1349 行） | item 状态机、chevron、子项 flyout、展开状态记忆 |
 * | `src/controls/dev/NavigationView/NavigationViewItemPresenter.cpp`（305 行） | `IconWidth` / `SmallerIconWidth`、紧凑关闭态 |
 * | `src/controls/dev/NavigationView/NavigationViewItemHeader.cpp` / `...Separator.cpp` | 分组标题折叠、分隔线三态、缩进 |
 * | `src/controls/dev/Generated/NavigationView.properties.cpp` / `NavigationViewItem.properties.cpp` | 依赖属性默认值 |
 * | `src/controls/dev/SplitView/SplitView_themeresources.xaml` | pane 开合的关键帧与时长（pane 由内部 SplitView 承载） |
 * | `src/controls/dev/AnimatedIcon/AnimatedVisuals/AnimatedChevronUpDownSmallVisualSource.cpp` | chevron LottieGen 产物（433.33ms / 260 帧 / 区间 marker） |
 * | `src/controls/dev/NavigationView/Strings/{en-us,zh-CN}/Resources.resw` | 内建文案（见 `locale.ts`） |
 *
 * ## 读到的规范（文件 → 结论）
 *
 * - **DisplayMode 状态机**（`NavigationView.cpp:1434-1513`）：`PaneDisplayMode = Auto` 时
 *   `width >= 1008` → Expanded、`0 < width < 641` → Minimal、**其余（含 0 与 NaN）→ Compact**
 *   （`:1452` 的默认值）；`Left` / `LeftCompact` / `LeftMinimal` 三档恒为对应模式（`:1466-1477`）。
 *   阈值属性有 `CoerceToGreaterThanZero`（`:4133-4137`，只有下界 0）。
 * - **pane 开合与模式变化**（`:1483-1512`）：首次非强制更新时若算出 Minimal / Compact 就关一次；
 *   进入 Expanded 且 `IsPaneVisible()` 且**用户没有手动关过**（`!m_wasForceClosed`）才自动开；
 *   `Expanded → Compact` 无条件关；**任何进入 Minimal 都无条件关**。
 *   **不存在 per-mode 的开合记忆** —— 只有一个全局 `m_wasForceClosed`（`NavigationView.h:466`），
 *   点击开关时置位 / 清除（`:1662-1674`）。本组件照抄这条。
 * - **开关按钮**（`:1662-1674`）：所有 DisplayMode 走同一段逻辑，没有 per-mode 分支。
 *   `IsPaneToggleButtonVisible` **只控可见性**（`:4403-4407`），不控可开合性。
 * - **键盘**（`OnNavigationViewItemKeyDown:2717-2739` + `HandleKeyEventForNavigationViewItem:2741-2779`
 *   + `OnKeyDown:3101-3151`）：
 *   `Enter` / `Space` → invoke（`Space` 在 `Alt` 按下时**不处理**，让出系统菜单，`:2750-2763`）；
 *   `Home` / `End` → 焦点到根 repeater 首 / 末可聚焦元素；`Up` / `Down` → 跨层时手动聚焦
 *   （`:2781-2859`），其余交给 XAML XYFocus；`Left` **只有 `Alt+Left` 关浮层**（`:3136-3145`）；
 *   **`Right` / `Esc` 在 NavigationView 里完全不处理**（负面证据：NV 目录对
 *   `VirtualKey::Right` / `escape` 零命中）。`Esc` 关 pane 是 core `SplitView.cpp:576-581` 的职责。
 *   没有 `ProcessKeyboardAccelerators` 重写；只有 `Windows+Back` 加速键（`:419-422`）。
 * - **选择**（`OnNavigationViewItemInvoked:1043-1074`）：`SelectsOnInvoked`（默认 `true`）决定
 *   invoke 是否改选中；**点击有子项的项「既选中也切换展开」**（`:1067`），不是二选一；
 *   已经选中的项再 invoke 会补抛一次 ItemInvoked（`:1062-1065`）；
 *   `SelectsOnInvoked=false` 的项被 API 强行选中会被回滚（`:2281-2292`、`:3516-3539`）。
 * - **`IsChildSelected`**（`:2509-2547`）：选中变化时把**新旧 IndexPath 的整条祖先链**分别置
 *   `false` / `true`，**IndexPath 指向的容器自身不设**。指示条则从选中项往下钻到
 *   「自身未选中但后代被选中」的最低可见层（`FindLowestLevelContainerToDisplaySelectionIndicator`，
 *   `:5562-5593`）。
 * - **展开 / 折叠**（`:5528-5560`）：`Expand` / `Collapse` / toggle 只在
 *   `DoesNavigationViewItemHaveChildren`（`MenuItemsSource` 非空 **或** `MenuItems` 非空 **或**
 *   `HasUnrealizedChildren`，`:5538-5547`）为真时才改 `IsExpanded`。
 * - **面板关闭时顶层项强制折叠但记忆状态**（`NavigationViewItem.cpp:269-285`）：
 *   `HandleExpansionStateMemory` —— pane 开则 `RestoreExpandedState()`、pane 关则
 *   `ForceCollapse()` 并置 `m_restoreToExpandedState`。**只对顶层项生效**。
 * - **chevron 可见性**（`NavigationViewItem.cpp:645`）：
 *   `HasChildren() && !(m_isClosedCompact && ShouldRepeaterShowInFlyout())` 才显示。
 *   `RotateExpandCollapseChevron`（`Presenter.cpp:208-224`）只是 `Begin()` 两个
 *   **在默认模板里不存在**的 Storyboard（`NavigationView.xaml` 里 `Storyboard` 计数 0、
 *   无 `Rotate`/`Angle`）⇒ 对默认模板是 **no-op**；真正的旋转由 `AnimatedIcon`
 *   （`themeresources:618-626`，源 `AnimatedChevronUpDownSmallVisualSource`，fallback 字形 `E70D`）
 *   承担。**这是最容易误判的一处**，本组件照 AnimatedIcon 口径做静态两端旋转。
 * - **模板结构**（`NavigationView.xaml:11-418`）：根 Grid → 左侧 `SplitView`
 *   （`PaneContentGrid` 7 行：顶部 padding / 0 / 开关按钮行 / PaneHeader / AutoSuggest /
 *   0 / 菜单区）+ `ContentGrid`（3 行：顶部 padding / Header / `ContentPresenter`）。
 *   菜单区 `ItemsContainerGrid` 4 行：`MenuItems`(*) / 溢出分隔线(Auto) / `PaneFooter` /
 *   `FooterMenuItems`(Auto)。**底部设置项走 `FooterMenuItemsHost`**（`:379-388`）。
 * - **pane 背景**：`NavigationViewDefaultPaneBackground` ← `AcrylicInAppFillColorDefaultBrush`
 *   （`themeresources:5`），`NavigationViewExpandedPaneBackground` ← `SolidBackgroundFillColorTransparent`
 *   （`:6`，`#00F3F3F3` 全透明）在 `PaneNotOverlaying` 时覆盖（`NavigationView.xaml:129`）。
 *   ⇒ **Expanded 档面板底色是全透明的**，Mica 透出；Compact/Minimal 浮层态才是 Acrylic。
 * - **内容区**：`NavigationViewContentBackground` ← `LayerFillColorDefaultBrush`（`:8`），
 *   边框 `NavigationViewContentGridBorderBrush` ← `CardStrokeColorDefaultBrush`（`:49`）、
 *   厚度 `1,1,0,0`（`:234`）、圆角 `8,0,0,0`（`:263`）。
 *
 * ## WinUI 资源名 → token 映射（视觉值一律 `var(--TokenName)`）
 *
 * | WinUI 资源 | 最终色（亮 / 暗） | 本库 token |
 * | --- | --- | --- |
 * | `NavigationViewDefaultPaneBackground` ← `AcrylicInAppFillColorDefaultBrush` | `#F9F9F9` / `#2C2C2C` | `--acrylicInAppFillColorDefault`（0.4.4 已有，同值） |
 * | `NavigationViewExpandedPaneBackground` ← `SolidBackgroundFillColorTransparent` | `#00F3F3F3` / `#00202020` | `--colorTransparentBackground`（透明，见「与 WinUI 的差异」第 5 条） |
 * | `NavigationViewContentBackground` ← `LayerFillColorDefaultBrush` | `#80FFFFFF` / `#4C3A3A3A` | `--layerFillColorDefault`（同值） |
 * | `NavigationViewItemBackground` ← `SubtleFillColorTransparentBrush` | `#00FFFFFF` | `--subtleFillColorTransparent`（同值） |
 * | `NavigationViewItemBackgroundPointerOver` ← `SubtleFillColorSecondaryBrush` | `#09000000` / `#0FFFFFFF` | `--subtleFillColorSecondary`（同值） |
 * | `NavigationViewItemBackgroundPressed` / `...SelectedPointerOver` ← `SubtleFillColorTertiaryBrush` | `#06000000` / `#0AFFFFFF` | `--subtleFillColorTertiary`（同值） |
 * | `NavigationViewItemBackgroundSelected` ← `SubtleFillColorSecondaryBrush` | `#09000000` / `#0FFFFFFF` | `--subtleFillColorSecondary`（同值） |
 * | `NavigationViewItemForeground` ← `TextFillColorPrimaryBrush` | `#E4000000` / `#FFFFFF` | `--colorNeutralForeground1` |
 * | `NavigationViewItemForegroundPressed` ← `TextFillColorSecondaryBrush` | `#9E000000` / `#C5FFFFFF` | `--colorNeutralForeground2` |
 * | `NavigationViewItemForegroundDisabled` ← `TextFillColorDisabledBrush` | `#5C000000` / `#5DFFFFFF` | `--colorNeutralForegroundDisabled` |
 * | `NavigationViewItemHeaderForeground` ← `TextFillColorSecondaryBrush` | 同上 | `--colorNeutralForeground2` |
 * | `NavigationViewSelectionIndicatorForeground` ← `AccentFillColorDefaultBrush` | 系统强调色 | `--colorBrandBackground`（沿用 ToggleButton / Combobox 的既有映射） |
 * | `NavigationViewItemSeparatorForeground` ← `DividerStrokeColorDefaultBrush` | `#0F000000` / `#15FFFFFF` | `--dividerStrokeColorDefault`（0.5.3 新增，同值） |
 * | `NavigationViewContentGridBorderBrush` ← `CardStrokeColorDefaultBrush` | `#0F000000` / `#19000000` | `--colorNeutralStrokeAlpha`（**沿用 InfoBar / ContentDialog / TabView 的既有映射**） |
 * | 禁用不透明度 ← `ListViewItemDisabledThemeOpacity` | `0.3` | `--fui-navigation-view-disabled-opacity`（局部变量，同值） |
 *
 * ## 与 WinUI 的差异（有意为之，逐条记录）
 *
 * 1. **只做左侧面板（`PaneDisplayMode` 的 `Top` 不实现）**：顶部导航是另一套模板
 *    （`TopNavArea` / `TopNavGrid` / 溢出 `Flyout` / `BumperNavigation` 手柄导航），
 *    与左侧面板的行渲染、键盘、溢出语义都不同。本库本期按 todo 的 0.5.4 验收口径
 *    （可折叠面板、分组、选中指示条、设置项）只交付左侧形态。
 *    ⇒ 连带不实现：`ShoulderNavigationEnabled`（源码里对非 Top **恒返回 false**，
 *    `NavigationView.cpp:3165-3170`，即左侧面板本来就没有手柄导航）、
 *    `OverflowLabelMode`、`AutoSuggestBox`、返回按钮 / 关闭按钮
 *    （后两者只在 Minimal 且 `IsBackButtonVisible` 时出现，本库的 Minimal 降级为 Compact，
 *    见第 2 条）。
 * 2. **`Minimal` 档降级为 `Compact`**（与 `docs/design/explorer-layout.md`「假设 3」一致）：
 *    上游 Minimal 是「面板浮层化 + 焦点陷阱」（`UpdatePaneTabFocusNavigation` 把
 *    `KeyboardNavigationMode` 设成 `Cycle`，`NavigationView.cpp:4588-4596`），
 *    浮层焦点管理属 0.5.7 `useFocusTrap` 的范围。本组件在 `paneDisplayMode='auto'` 且
 *    宽度落在 Minimal 区间时**渲染为 Compact 形态**（面板常驻 48px），不弹浮层。
 *    显式传 `pane-display-mode="left-minimal"` 时同样按 Compact 处理。
 * 3. **子项是「数据型子组件」**：`FluereNavigationViewItem` / `...ItemHeader` / `...ItemSeparator`
 *    不会挂载（父组件在渲染期读 vnode props / slots，见 `collection.ts` 的理由），
 *    因此它们**不能** emit，子项插槽**不支持作用域参数**。
 * 4. **`SelectedItem` 换成「值标识」**：WinUI 用对象引用，Vue 侧用 `selectedValue`
 *    （与 `FluereTabView` 的选中口径一致）。内置设置项用保留哨兵值
 *    `FLUERE_NAVIGATION_SETTINGS_VALUE`，消费方不得把它用作菜单项 `value`。
 * 5. **`SolidBackgroundFillColorTransparent` 用 `--colorTransparentBackground` 表达**：
 *    上游值是 `#00F3F3F3` / `#00202020`（全透明，RGB 分量无意义），Fluent token 表里
 *    语义位最近的是 `colorTransparentBackground`（`transparent`）。**同观感、非同字面量**，
 *    记录在此以免被当成漏映射。
 * 6. **不做「指示条在项之间滑动」的位置动画**：上游 `PlayIndicatorAnimations`
 *    （`NavigationView.cpp:2185-2235`）用 Composition 在 `paneContentGrid` 坐标系里
 *    算前后项位移，`600ms` / 三段缓动（`cubic-bezier(0.9,0.1,1.0,0.2)` 与
 *    `cubic-bezier(0.1,0.9,0.2,1.0)`，常量见 `:1999-2002`）+ 200ms 的中心点动画。
 *    Web 侧等价实现需要读前后两项的 `getBoundingClientRect` 并驱动一个共享元素 ——
 *    属 0.9.x 动效专项目标。本库只做「当前项指示条淡入淡出」（上游
 *    `ShowSelectionIndicator` 就是直接改 `Opacity`，`NavigationViewItem.cpp:402-408`，
 *    无过渡），静态形态与上游一致。
 * 7. **不做子项 flyout**：上游「紧凑且关闭时把子项搬进 `ChildrenFlyout`」
 *    （`ShouldRepeaterShowInFlyout`，`NavigationViewItem.cpp:908-911`；`ShowHideChildren`，
 *    `:801-860`）。本库紧凑时**隐藏 chevron 且不渲染子项**（`hideChevron`），
 *    避免出现点了没反应的箭头；展开面板后子项照常内联显示。浮层化子项随 0.6 `MenuFlyout` 一起做。
 * 8. **`perf2026` 不采纳**：上游存在 `NavigationBackButton_perf2026.xaml`（已挂进
 *    `NavigationView.vcxitems`），本库沿用 0.5.1 `TitleBar` 的裁定 —— 不读、不参考、不产生对应分支。
 * 9. **不做 `HasUnrealizedChildren` 的延迟加载**：该属性参与「是否有子项」判定
 *    （`:5538-5547`）并让 chevron 出现，但上游的延迟实例化依赖 `ItemsRepeater` 的
 *    容器回收；Vue 侧用 `v-for` + 插槽即可，本组件只保留它的**判定语义**。
 *
 * ## 证据缺口（显式标注，不写成「就是 xx」）
 *
 * - **chevron 逐帧关键帧**：LottieGen 产物给了总时长 433.33ms 与 18 段区间 marker
 *   （`AnimatedChevronUpDownSmallVisualSource.cpp:104,782,789-825`），但完整路径插值在
 *   JSON 源里（`AnimatedChevronUpDownSmallVisualSource.json`，不在本快照）。本库只做
 *   静态两端 + 单段 50ms 过渡（覆盖方式：覆写 `--fui-navigation-view-chevron-duration`）。
 * - **`ExpandCollapseRotateExpandedStoryboard` / `...CollapsedStoryboard` 的时长取不到**：
 *   `Presenter.cpp:73-74` 查找这两个名字，但默认模板里**不存在**（见上文），
 *   因此没有可引用的数值。本库按 AnimatedIcon 口径处理。
 * - **系统强调色**：`AccentFillColorDefaultBrush` 的最终值由系统运行时决定，
 *   源码树只给别名。本库沿用仓库既有映射 `--colorBrandBackground`。
 * - **高对比度**：HC 色板来自系统运行时（`themeresources:136-201` 全是 `SystemColor*`
 *   引用），本库不实现 HC 专项，只保留 `forced-colors` 下的焦点环（0.4.3 原语已处理）。
 *
 * ## 折叠态（`ListSizeCompact`）的四个 UI 修正（真实浏览器实测，2026-10-15）
 *
 * 这四处都是「单测全绿、浏览器里才是错的」的偏差，逐条记录根因与 A 级依据，
 * 几何证据留在 `temp/pw-nv-ui-baseline.mjs`（过程产物，不进仓库）：
 *
 * | 症状（实测） | 根因 | A 级依据 |
 * | --- | --- | --- |
 * | 汉堡图标被压成 `7.41 × 20` | 开关行多给了 4px 横向 padding，与按钮自身 padding 叠加，48px 按钮只剩 40px 可用 | `NavigationViewButtonHolderGridMargin = 0,4`（`:232`）—— 横向是 **0** |
 * | 收起后 `PaneTitle` 仍占位（宽 24.59） | 条件写成 `displayMode === 'expanded'`；`pane-display-mode="left"` 恒算 expanded | `ListSizeCompact` 把 `PaneTitleTextBlock.Visibility` 置 `Collapsed`（`NavigationView.xaml:85`），判据是 `m_isClosedCompact` |
 * | 行背景右侧被裁 3px（左右间隙 4 / -3） | 面板 `border-inline-end` 吃掉定宽 1px；项又用 `inline-size: 100%` 叠加 4px 横向 margin | 上游分居线画在 `RootSplitView`，`PaneContentGrid.Margin = -1,3`（`:233`）把它抵回；项宽不含 margin |
 * | 设置项齿轮渲染成实心黑块 | 内联 path 只有 576 字符（官方 `settings_20_regular` 是 1022），丢了内圈描边 | `UpdateSettingsItem` 的 fallback 是 `SymbolIconSource(Symbol::Setting)`，即**线性**齿轮（`NavigationView.cpp:1332-1337`） |
 *
 * 修法：开关行横向 padding 归 0、标题/`#paneHeader` 改用 `!iconOnly`、面板分居线改
 * 绝对定位伪元素（不占布局，见 `.fui-navigation-view__pane::after`）、项宽改 `auto`、
 * 齿轮改用 `@fluere-vue/icons` 的 `FluentIconSettings20Regular`（同一份 SVG 事实源，
 * 避免手抄截断）。
 */
export type {
  FluereNavigationDisplayMode,
  FluereNavigationDisplayModeChangedEventArgs,
  FluereNavigationItemInvokedEventArgs,
  FluereNavigationPaneDisplayMode,
  FluereNavigationSelectionChangedEventArgs,
  FluereNavigationSelectionFollowsFocus,
  FluereNavigationViewProps,
} from './types'
</script>

<script setup lang="ts">
import { useReducedMotion, useScopeMessages } from '@fluere-vue/hooks'
import { FluentIconNavigation20Regular, FluentIconSettings20Regular } from '@fluere-vue/icons'
import { isClient, hasResizeObserver } from '@fluere-vue/utils'
import { RovingFocusGroup } from 'reka-ui'
import {
  computed,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  shallowRef,
  useId,
  watch,
  type CSSProperties,
  type VNode,
} from 'vue'
import { useFocusVisual } from '../focus-visual/use-focus-visual'
import { collectNodes, hasSelectedDescendant, type NavigationNode } from './collection'
import {
  NAVIGATION_CHEVRON_DURATION_MS,
  NAVIGATION_COMPACT_MODE_THRESHOLD_WIDTH,
  NAVIGATION_COMPACT_PANE_FALLBACK_WIDTH,
  NAVIGATION_DISABLED_OPACITY,
  NAVIGATION_DURATION_TOKEN_FASTER,
  NAVIGATION_DURATION_TOKEN_NORMAL,
  NAVIGATION_DURATION_TOKEN_ULTRA_FAST,
  NAVIGATION_EXPANDED_MODE_THRESHOLD_WIDTH,
  NAVIGATION_EXPANDED_PANE_FALLBACK_WIDTH,
  NAVIGATION_HEADER_TEXT_FADE_IN_MS,
  NAVIGATION_HEADER_TEXT_FADE_OUT_MS,
  NAVIGATION_HEADER_ROW_HEIGHT,
  NAVIGATION_ICON_COLUMN_FALLBACK_WIDTH,
  NAVIGATION_ITEM_INDENTATION,
  NAVIGATION_ITEM_MIN_HEIGHT,
  NAVIGATION_ITEM_ICON_BOX_HEIGHT,
  NAVIGATION_ITEM_SEPARATOR_MARGIN_BOTTOM,
  NAVIGATION_PANE_CLOSE_DURATION_MS,
  NAVIGATION_PANE_OPEN_DURATION_MS,
  NAVIGATION_PANE_TOGGLE_BUTTON_HEIGHT,
  NAVIGATION_PANE_TOGGLE_BUTTON_WIDTH,
  NAVIGATION_SELECTION_INDICATOR_HEIGHT,
  NAVIGATION_SELECTION_INDICATOR_RADIUS,
  NAVIGATION_SELECTION_INDICATOR_WIDTH,
} from './constants'
import {
  FLUERE_NAVIGATION_SETTINGS_VALUE,
  NAVIGATION_VIEW_CONTEXT_KEY,
  type NavigationInvokeSource,
  type NavigationViewContextValue,
} from './context'
import { navigationViewLocale } from './locale'
import NavigationViewItemHeader from './navigation-view-item-header.vue'
import NavigationViewItemSeparator from './navigation-view-item-separator.vue'
import NavigationViewItem from './navigation-view-item.vue'
import NavigationViewItems from './navigation-view-items.vue'
import type {
  FluereNavigationDisplayMode,
  FluereNavigationItemInvokedEventArgs,
  FluereNavigationPaneDisplayMode,
  FluereNavigationSelectionChangedEventArgs,
  FluereNavigationViewProps,
} from './types'

/**
 * ⚠️ **不设 `inheritAttrs: false`**：本组件是**单根**（一个 `div`），透传的
 * `class` / `style` / `data-*` 正好应该落在根节点上 —— 消费方写
 * `class="h-[320px]"` 才能生效。AGENTS.md 要求 `inheritAttrs: false` 的是
 * **多根组件**（避免落到触发元素上）；单根组件关掉它反而会**静默丢掉**这些属性。
 */
defineOptions({ name: 'FluereNavigationView' })

const props = withDefaults(defineProps<FluereNavigationViewProps>(), {
  paneDisplayMode: 'auto',
  isPaneOpen: undefined,
  defaultIsPaneOpen: true,
  openPaneLength: undefined,
  compactPaneLength: undefined,
  compactModeThresholdWidth: NAVIGATION_COMPACT_MODE_THRESHOLD_WIDTH,
  expandedModeThresholdWidth: NAVIGATION_EXPANDED_MODE_THRESHOLD_WIDTH,
  isPaneToggleButtonVisible: true,
  isPaneVisible: true,
  isSettingsVisible: true,
  selectedValue: undefined,
  defaultSelectedValue: undefined,
  selectionFollowsFocus: 'disabled',
  paneTitle: '',
  label: undefined,
  dir: 'ltr',
  motion: 'auto',
  locale: undefined,
})

const emit = defineEmits<{
  (event: 'update:isPaneOpen', value: boolean): void
  (event: 'update:selectedValue', value: string | number | undefined): void
  (event: 'itemInvoked', payload: FluereNavigationItemInvokedEventArgs): void
  (event: 'selectionChanged', payload: FluereNavigationSelectionChangedEventArgs): void
  (event: 'displayModeChanged', payload: { displayMode: FluereNavigationDisplayMode }): void
}>()

/** 内建文案（scope=`navigation-view`，4 条逐字取自上游 resw，见 locale.ts） */
const i18n = useScopeMessages('navigation-view', navigationViewLocale, () => props.locale)

/** 0.4.3 焦点矩形原语：WinUI 双层 2px + 1px，`UseSystemFocusVisuals=True`（`NavigationView.xaml:429`） */
const focusVisual = useFocusVisual()

/** 跟随 `prefers-reduced-motion`；`motion="none"` 时一律瞬时 */
const prefersReducedMotion = useReducedMotion()
const motionEnabled = computed(() => props.motion !== 'none' && !prefersReducedMotion.value)

/* ------------------------------------------------------------------ */
/* 1. 面板宽度测量 → DisplayMode 状态机                                  */
/* ------------------------------------------------------------------ */

const rootElement = ref<HTMLElement | null>(null)

/**
 * 实测宽度（px）。
 *
 * **SSR 安全**：`setup()` 期不读 `window` / `ResizeObserver`，初值 `0` 表示「还没测到」。
 * 按上游判据，宽度 0 落在 **Compact**（`width > 0` 为 false，`NavigationView.cpp:1461`）——
 * 这恰好是「未知宽度」最保守的降级形态（面板只占 48px，不会把内容挤没）。
 * 挂载后立即测一次并订阅变化。
 */
const measuredWidth = ref(0)

const displayMode = computed<FluereNavigationDisplayMode>(() => {
  const mode: FluereNavigationPaneDisplayMode = props.paneDisplayMode
  if (mode === 'left') {
    return 'expanded'
  }
  if (mode === 'left-compact') {
    return 'compact'
  }
  if (mode === 'left-minimal') {
    // 见文件头「与 WinUI 的差异」第 2 条：Minimal 降级为 Compact
    return 'compact'
  }

  // Auto：判据逐字照抄 `NavigationView.cpp:1455-1465`
  const width = measuredWidth.value
  if (width >= props.expandedModeThresholdWidth) {
    return 'expanded'
  }
  if (width > 0 && width < props.compactModeThresholdWidth) {
    // 上游这里是 Minimal；本库降级为 Compact（浮层焦点管理属 0.5.7）
    return 'compact'
  }
  return 'compact'
})

/**
 * 面板是否「紧凑且关闭」—— 上游 `m_isClosedCompact`
 * （`NavigationViewItem.cpp:253-263`：`!SplitView.IsPaneOpen() && (CompactOverlay || CompactInline)`）。
 *
 * 上游此态下 `ListSizeCompact` 把面板宽设成 `CompactPaneLength`(48)、只留图标
 * （`NavigationView.xaml:79-91`），也就是 Windows 11 那条 **48px 图标轨道**。
 * 本组件把 Minimal 降级为 Compact（见文件头差异第 2 条），因此判据化简为「面板未展开」。
 */
const isClosedCompact = computed(() => !isPaneOpenResolved.value)

/** 紧凑且关闭 ⇒ 只显示图标（上游 `ListSizeCompact`，`NavigationView.xaml:79-91`） */
const iconOnly = computed(() => isClosedCompact.value)

/**
 * 面板实际占位宽度。
 *
 * 上游：`IsPaneOpen` 为真时用 `OpenPaneLength`（CompactOverlay 打开时也是它，
 * `NavigationView.cpp:4629-4636` 的 `UpdatePaneToggleSize`），为假时 `ListSizeCompact`
 * 给 `CompactPaneLength`（`NavigationView.xaml:83`）—— **收起不是归零，而是 48px 图标轨道**。
 */
const paneWidth = computed(() =>
  isPaneOpenResolved.value
    ? (props.openPaneLength ?? NAVIGATION_EXPANDED_PANE_FALLBACK_WIDTH)
    : (props.compactPaneLength ?? NAVIGATION_COMPACT_PANE_FALLBACK_WIDTH),
)

/* ------------------------------------------------------------------ */
/* 2. pane 开合状态机（受控 / 非受控 + `m_wasForceClosed`）              */
/* ------------------------------------------------------------------ */

/**
 * 用户是否**手动**关过面板 —— 上游 `m_wasForceClosed`（`NavigationView.h:466`）。
 *
 * 语义（`NavigationView.cpp:1494-1512` + `:1662-1674` + `:4358-4381`）：
 *  · 点开关按钮收起 ⇒ 置 `true`；点开关按钮展开 ⇒ 清 `false`；
 *  · 进入 Expanded 时**只有它为 false 才自动开**；
 *  · 外部把 `isPaneOpen` 从 true 改成 false（非交互路径）⇒ 也置 `true`（`:4373`）。
 * 切换 `paneDisplayMode` 属性会清掉它（`:4211`），本组件照抄。
 */
const wasForceClosed = ref(false)

/** 非受控内部状态 */
const internalPaneOpen = ref(props.defaultIsPaneOpen)

/** 受控优先：`isPaneOpen === undefined` 时才用内部状态 */
const isPaneOpenResolved = computed(() =>
  props.isPaneOpen === undefined ? internalPaneOpen.value : props.isPaneOpen,
)

/** 写回开合状态：受控时只抛事件，非受控时同时改内部状态 */
const setPaneOpen = (value: boolean): void => {
  if (props.isPaneOpen === undefined) {
    internalPaneOpen.value = value
  }
  emit('update:isPaneOpen', value)
}

/**
 * 开关按钮点击 —— 逐字对齐 `OnPaneToggleButtonClick`（`NavigationView.cpp:1662-1674`）。
 * **所有 DisplayMode 同一段逻辑**，没有 per-mode 分支。
 */
const onTogglePane = (): void => {
  if (isPaneOpenResolved.value) {
    wasForceClosed.value = true
    setPaneOpen(false)
  } else {
    wasForceClosed.value = false
    setPaneOpen(true)
  }
}

/**
 * 面板开关（汉堡）按钮的宽度 —— 逐条对齐 `UpdatePaneToggleSize`
 * （`NavigationView.cpp:4605-4645`）：
 *
 * ```cpp
 * double width = GetTemplateSettings()->PaneToggleButtonWidth();  // = CompactPaneLength(48)
 * double togglePaneButtonWidth = width;
 * if (!m_isClosedCompact && PaneTitle().size() > 0) {
 *     if (DisplayMode == Overlay && IsPaneOpen()) {          // Compact 档开着
 *         width = m_OpenPaneLength;
 *         togglePaneButtonWidth = m_OpenPaneLength - c_backButtonWidth(40);
 *     } else if (!(DisplayMode == Overlay && !IsPaneOpen())) { // Expanded 档
 *         width = m_OpenPaneLength;
 *         togglePaneButtonWidth = m_OpenPaneLength;
 *     }
 * }
 * toggleButton.Width(togglePaneButtonWidth);
 * ```
 *
 * 三个要点（都容易写错）：
 *  1. 缺省宽是 `TemplateSettings.PaneToggleButtonWidth` = **`CompactPaneLength`(48)**，
 *     不是 XAML `MinWidth` 绑的 `SmallerPaneToggleButtonWidth`(40) —— 后者只是下限。
 *  2. **有 `paneTitle` 且不是「紧凑关闭」时，按钮被撑到面板宽**（标题与汉堡同一行）；
 *     紧凑关闭时这一支被跳过，回到 48。
 *  3. 浮层打开时扣掉 40 给返回 / 关闭按钮位。
 *
 * 这条是真实浏览器实测发现的偏差（原实现恒 40，标题被挤扁到 40px 宽，最小尺寸 102）。
 */
const toggleButtonWidth = computed(() => {
  const compactWidth = props.compactPaneLength ?? NAVIGATION_COMPACT_PANE_FALLBACK_WIDTH
  if (isClosedCompact.value || !props.paneTitle) {
    return compactWidth
  }
  const openWidth = props.openPaneLength ?? NAVIGATION_EXPANDED_PANE_FALLBACK_WIDTH
  const isOverlayAndOpen = displayMode.value !== 'expanded' && isPaneOpenResolved.value
  return isOverlayAndOpen ? Math.max(0, openWidth - NAVIGATION_PANE_TOGGLE_BUTTON_WIDTH) : openWidth
})

/* ------------------------------------------------------------------ */
/* 3. 子项收集（渲染期读 vnode）                                        */
/* ------------------------------------------------------------------ */

const slots = defineSlots<{
  /** 导航项 / 分组标题 / 分隔线（本族三个数据型子组件） */
  default?: () => VNode[]
  /** 面板底部（设置项上方）的自定义内容，对应 `PaneFooter` */
  paneFooter?: () => VNode[]
  /** 面板头部（开关按钮下方）的自定义内容，对应 `PaneHeader` */
  paneHeader?: () => VNode[]
  /** 覆盖内置「设置」项的内容（默认显示齿轮图标 + 「设置」文案） */
  settings?: () => VNode[]
  /** 窗口内容区 */
  content?: () => VNode[]
}>()

/** 把默认插槽里的节点收成树；`isChildSelected` 由选中值在渲染期推导 */
const menuNodes = computed<NavigationNode[]>(() => {
  const raw = collectNodes(slots.default?.() ?? [], {
    item: NavigationViewItem,
    header: NavigationViewItemHeader,
    separator: NavigationViewItemSeparator,
  })
  return markChildSelected(raw, resolvedSelectedValue.value)
})

/** 递归回写 `isChildSelected`：对应 `UpdateIsChildSelectedForIndexPath`（`NavigationView.cpp:2522-2547`） */
const markChildSelected = (
  nodes: NavigationNode[],
  selected: string | number | undefined,
): NavigationNode[] =>
  nodes.map((node) => {
    const children = markChildSelected(node.children, selected)
    return {
      ...node,
      children,
      // 显式传入的 `isChildSelected` 优先（逃生口，见 types.ts）
      isChildSelected: node.isChildSelected ?? hasSelectedDescendant(node, selected),
    }
  })

/* ------------------------------------------------------------------ */
/* 4. 选中状态机                                                       */
/* ------------------------------------------------------------------ */

const internalSelectedValue = ref<string | number | undefined>(props.defaultSelectedValue)

/** 解析后的选中值（受控优先） */
const resolvedSelectedValue = computed(() =>
  props.selectedValue === undefined ? internalSelectedValue.value : props.selectedValue,
)

/** 上一次抛出的选中值（用于 `selectionChanged` 的 `previousValue`） */
const previousSelectedValue = ref<string | number | undefined>(resolvedSelectedValue.value)

/** 是否选中了内置设置项 */
const isSettingsSelected = computed(
  () => resolvedSelectedValue.value === FLUERE_NAVIGATION_SETTINGS_VALUE,
)

/**
 * 校验 `selectedValue` 是否真的存在于菜单树里（或等于设置项哨兵）。
 *
 * 上游对「选中一个 `SelectsOnInvoked=false` 的项」会**回滚**（`NavigationView.cpp:2281-2292`、
 * `:3516-3539`）。本组件同样不接受这类选中：把菜单树里所有 `selectsOnInvoked === false`
 * 的项视为不可选中，传入时回退到「无选中」并给开发期警告。
 */
const selectableValues = computed<Set<string | number>>(() => {
  const set = new Set<string | number>()
  const visit = (nodes: NavigationNode[]): void => {
    for (const node of nodes) {
      if (node.kind === 'item' && node.value !== undefined && node.selectsOnInvoked) {
        set.add(node.value)
      }
      visit(node.children)
    }
  }
  visit(menuNodes.value)
  return set
})

/**
 * 选中指示条画在哪一项上 —— 对齐 `FindLowestLevelContainerToDisplaySelectionIndicator`
 * （`NavigationView.cpp:5562-5593`）：从选中项往下钻，只要「自身未选中但后代被选中」
 * 且子项**可见（父项已展开）**就继续；否则停在当前层。
 */
const indicatorValue = computed<string | number | undefined>(() => {
  const selected = resolvedSelectedValue.value
  if (selected === undefined || selected === FLUERE_NAVIGATION_SETTINGS_VALUE) {
    return selected
  }

  const findPath = (
    nodes: NavigationNode[],
    path: NavigationNode[],
  ): NavigationNode[] | undefined => {
    for (const node of nodes) {
      if (node.value === selected) {
        return [...path, node]
      }
      const found = findPath(node.children, [...path, node])
      if (found) {
        return found
      }
    }
    return undefined
  }

  const path = findPath(menuNodes.value, [])
  if (!path || path.length === 0) {
    return undefined
  }

  // 从顶层往下走：只要当前节点「自身未选中」且「后代被选中」且**已展开**，就继续下钻
  let current: NavigationNode = path[0] as NavigationNode
  for (let index = 1; index < path.length; index += 1) {
    if (current.value === selected) {
      break
    }
    if (!resolveExpanded(current, index - 1)) {
      break
    }
    current = path[index] as NavigationNode
  }
  return current.value
})

/* ------------------------------------------------------------------ */
/* 5. 展开状态机（受控 / 非受控 + 面板关闭时的顶层强制折叠 + 状态记忆）  */
/* ------------------------------------------------------------------ */

/** 内部展开状态：`value → boolean` */
const internalExpanded = shallowRef<Map<string | number, boolean>>(new Map())
/** 面板关闭前记住的展开状态：`value → boolean`（上游 `m_restoreToExpandedState`，`NavigationViewItem.cpp:871-878`） */
const restoreExpanded = shallowRef<Map<string | number, boolean>>(new Map())

/**
 * 解析某个项当前是否展开。
 *
 * 优先级与上游一致：
 *  1. 受控 `isExpanded`（vnode prop）最高；
 *  2. **面板紧凑且关闭时，顶层项强制折叠**（`HandleExpansionStateMemory`，
 *     `NavigationViewItem.cpp:269-285`，只对顶层项）；
 *  3. 内部状态（用户点过）；
 *  4. `defaultIsExpanded`。
 */
const resolveExpanded = (node: NavigationNode, depth: number): boolean => {
  if (node.isExpanded !== undefined) {
    return node.isExpanded
  }
  if (depth === 0 && isClosedCompact.value) {
    return false
  }
  const value = node.value
  if (value !== undefined) {
    const remembered = internalExpanded.value.get(value)
    if (remembered !== undefined) {
      return remembered
    }
  }
  return node.defaultIsExpanded
}

/** 写展开状态（受控项不写内部状态，只靠 vnode prop 变化） */
const setExpanded = (node: NavigationNode, value: boolean): void => {
  if (node.isExpanded !== undefined || node.value === undefined) {
    return
  }
  const next = new Map(internalExpanded.value)
  next.set(node.value, value)
  internalExpanded.value = next
}

/**
 * 面板关闭时记住顶层项的展开状态，并在重新展开时恢复 ——
 * 逐字对齐 `HandleExpansionStateMemory`（`NavigationViewItem.cpp:269-285`）+
 * `ForceCollapse` / `RestoreExpandedState`（`:862-878`）。
 */
watch(isClosedCompact, (closed, wasClosed) => {
  if (closed === wasClosed) {
    return
  }
  if (closed) {
    // ForceCollapse：只对顶层项，记住原状态
    const remembered = new Map(restoreExpanded.value)
    for (const node of menuNodes.value) {
      if (node.kind !== 'item' || node.value === undefined || node.isExpanded !== undefined) {
        continue
      }
      if (internalExpanded.value.get(node.value) === true || node.defaultIsExpanded) {
        remembered.set(node.value, true)
      }
    }
    restoreExpanded.value = remembered
    return
  }
  // RestoreExpandedState
  if (restoreExpanded.value.size === 0) {
    return
  }
  const next = new Map(internalExpanded.value)
  for (const [value, expanded] of restoreExpanded.value) {
    next.set(value, expanded)
  }
  internalExpanded.value = next
  restoreExpanded.value = new Map()
})

/* ------------------------------------------------------------------ */
/* 6. invoke（选中 + 展开 + 抛事件 + 关面板）                            */
/* ------------------------------------------------------------------ */

/**
 * invoke —— 逐条对齐 `OnNavigationViewItemInvoked`（`NavigationView.cpp:1043-1074`）：
 *  1. `selectsOnInvoked` 才改选中（`:1048`）；
 *  2. 已经选中时补抛一次 `itemInvoked`（`:1062-1065`）；
 *  3. **有子项就切换展开**（`:1067`，与选中不互斥）；
 *  4. 非 Expanded 且该项没有子项 ⇒ 关面板（`ClosePaneIfNeccessaryAfterItemIsClicked`，`:4847-4853`）。
 */
const invoke = (node: NavigationNode, source: NavigationInvokeSource): void => {
  const value = node.value
  if (value === undefined || node.disabled) {
    return
  }

  const hadChildren = node.children.length > 0 || node.hasUnrealizedChildren
  const wasSelected = resolvedSelectedValue.value === value

  if (node.selectsOnInvoked) {
    if (!wasSelected) {
      previousSelectedValue.value = resolvedSelectedValue.value
      if (props.selectedValue === undefined) {
        internalSelectedValue.value = value
      }
      emit('update:selectedValue', value)
      emit('selectionChanged', {
        value,
        previousValue: previousSelectedValue.value,
        isSettingsSelected: false,
      })
    }
  }

  // 已经选中 ⇒ 补抛 itemInvoked（上游 `:1062-1065`）
  emit('itemInvoked', {
    value,
    content: node.content,
    isSettingsInvoked: false,
    source,
  })

  // 有子项才切换展开（上游 `ChangeIsExpandedNavigationViewItem` 的前置条件，`:5554-5560`）
  if (hadChildren) {
    setExpanded(node, !resolveExpanded(node, 0))
  }

  // 关面板：非 Expanded + 无子项（上游 `:4847-4853`）
  if (isPaneOpenResolved.value && displayMode.value !== 'expanded' && !hadChildren) {
    setPaneOpen(false)
  }
}

/** 设置项的 invoke：选中哨兵值 + 抛事件（对齐 `OnSettingsInvoked` 语义，`NavigationView.cpp:3091`） */
const invokeSettings = (source: NavigationInvokeSource): void => {
  const wasSelected = isSettingsSelected.value
  if (!wasSelected) {
    previousSelectedValue.value = resolvedSelectedValue.value
    if (props.selectedValue === undefined) {
      internalSelectedValue.value = FLUERE_NAVIGATION_SETTINGS_VALUE
    }
    emit('update:selectedValue', FLUERE_NAVIGATION_SETTINGS_VALUE)
    emit('selectionChanged', {
      value: FLUERE_NAVIGATION_SETTINGS_VALUE,
      previousValue: previousSelectedValue.value,
      isSettingsSelected: true,
    })
  }
  emit('itemInvoked', {
    value: FLUERE_NAVIGATION_SETTINGS_VALUE,
    content: i18n.t('settingsButtonName'),
    isSettingsInvoked: true,
    source,
  })
  if (isPaneOpenResolved.value && displayMode.value !== 'expanded') {
    setPaneOpen(false)
  }
}

/**
 * 设置项的 Enter / Space：与普通项同一套键位口径
 * （`HandleKeyEventForNavigationViewItem:2746-2763`）—— Space 遇 Alt 不处理，
 * 长按重复不处理。
 */
const onSettingsEnter = (event: KeyboardEvent): void => {
  if (event.repeat) {
    return
  }
  event.preventDefault()
  invokeSettings('keyboard')
}

const onSettingsSpace = (event: KeyboardEvent): void => {
  if (event.altKey || event.repeat) {
    return
  }
  event.preventDefault()
  invokeSettings('keyboard')
}

/* ------------------------------------------------------------------ */
/* 7. 属性变化联动（逐条对齐 `OnPropertyChanged` 的分支）                */
/* ------------------------------------------------------------------ */

/** 切换 `paneDisplayMode` 会清掉 `m_wasForceClosed`（`NavigationView.cpp:4211`） */
watch(
  () => props.paneDisplayMode,
  () => {
    wasForceClosed.value = false
  },
)

/**
 * DisplayMode 变化 → pane 开合联动 —— 逐条对齐 `UpdateAdaptiveLayout` 尾部（`:1494-1512`）。
 *
 * ⚠️ 这里**没有**「首次非强制更新」分支（上游 `m_InitialNonForcedModeUpdate`，`:1483-1489`）：
 * 上游那条是为了在控件首次布局算出 Minimal / Compact 时补一次关面板，而 Web 侧
 * 初始宽度未知（`measuredWidth = 0` ⇒ Compact）时若照抄，会在挂载瞬间把用户显式传的
 * `default-is-pane-open` 关掉。本组件因此只在**宽度真正测到之后**才做联动。
 */
watch(displayMode, (mode, previous) => {
  if (mode !== previous) {
    emit('displayModeChanged', { displayMode: mode })
  }
  if (mode === 'expanded') {
    if (props.isPaneVisible && !wasForceClosed.value) {
      setPaneOpen(true)
    }
    return
  }
  // `previous === 'expanded'` → compact 无条件关；minimal（本库降级为 compact）同样关
  setPaneOpen(false)
})

/** 外部把 `isPaneOpen` 由 true 改成 false（非交互）⇒ 记为强制关闭（`NavigationView.cpp:4365-4374`） */
watch(
  () => props.isPaneOpen,
  (value, previous) => {
    if (previous === true && value === false) {
      wasForceClosed.value = true
    } else if (value === true && wasForceClosed.value) {
      wasForceClosed.value = false
    }
  },
)

/** 选中值不在可选项里（且不是设置项哨兵）⇒ 回退为空，并给开发期警告 */
watch(
  resolvedSelectedValue,
  (value) => {
    if (value === undefined || value === FLUERE_NAVIGATION_SETTINGS_VALUE) {
      return
    }
    if (selectableValues.value.has(value)) {
      return
    }
    if (import.meta.env.DEV) {
      // oxlint-disable-next-line no-console
      console.warn(
        `[FluereNavigationView] selectedValue="${String(value)}" 不在菜单树里，或对应的项` +
          '`selects-on-invoked="false"`（上游对此类选中会回滚，见 NavigationView.cpp:2281-2292）。' +
          '已回退为「无选中」。',
      )
    }
    previousSelectedValue.value = value
    if (props.selectedValue === undefined) {
      internalSelectedValue.value = undefined
    }
    emit('update:selectedValue', undefined)
  },
  { immediate: false },
)

/* ------------------------------------------------------------------ */
/* 8. 上下文注入 + 宽度订阅                                             */
/* ------------------------------------------------------------------ */

provide<NavigationViewContextValue>(NAVIGATION_VIEW_CONTEXT_KEY, {
  selectedValue: resolvedSelectedValue,
  indicatorValue,
  iconOnly,
  hideChevron: iconOnly,
  resolveExpanded,
  invoke,
  t: (key: string) => i18n.t(key),
  focusVisualClass: focusVisual.class,
  focusVisualStyle: focusVisual.style,
  dir: computed(() => props.dir),
})

/** 根节点 id（`useId` 保证 SSR / 水合一致，见 docs/ssr-guide.md） */
const rootId = useId()
const paneId = computed(() => `${rootId}-pane`)
const contentId = computed(() => `${rootId}-content`)

let resizeObserver: ResizeObserver | undefined = undefined

const measure = (): void => {
  const element = rootElement.value
  if (!element) {
    return
  }
  const width = element.getBoundingClientRect().width
  if (width > 0 && width !== measuredWidth.value) {
    measuredWidth.value = width
  }
}

onMounted(() => {
  if (!isClient) {
    return
  }
  measure()
  if (hasResizeObserver() && rootElement.value) {
    resizeObserver = new ResizeObserver(() => {
      measure()
    })
    resizeObserver.observe(rootElement.value)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = undefined
})

/* ------------------------------------------------------------------ */
/* 9. 样式变量                                                         */
/* ------------------------------------------------------------------ */

/**
 * 把 A 级源码里的数值 + token 引用组装成组件局部变量。
 *
 * 约定（AGENTS.md〈代码约定〉）：组件内只准引用 token 或 `--fui-<component>-*`
 * 局部变量；这些变量全部在这里声明，消费方一行即可覆写。
 */
const rootStyle = computed<CSSProperties>(() => {
  /**
   * 时长一律走 `--duration*` 令牌（AGENTS.md〈代码约定〉），`motion="none"` /
   * `prefers-reduced-motion` 下把变量置 `0ms` —— 这样「关闭动效」不需要在样式表里
   * 复制第二套规则，静态形态天然保留。
   */
  const duration = (token: string): string => (motionEnabled.value ? token : '0ms')
  return {
    '--fui-navigation-view-pane-width': `${paneWidth.value}px`,
    '--fui-navigation-view-item-min-height': `${NAVIGATION_ITEM_MIN_HEIGHT}px`,
    '--fui-navigation-view-icon-box-height': `${NAVIGATION_ITEM_ICON_BOX_HEIGHT}px`,
    '--fui-navigation-view-icon-column-width': `${NAVIGATION_ICON_COLUMN_FALLBACK_WIDTH}px`,
    '--fui-navigation-view-indicator-width': `${NAVIGATION_SELECTION_INDICATOR_WIDTH}px`,
    '--fui-navigation-view-indicator-height': `${NAVIGATION_SELECTION_INDICATOR_HEIGHT}px`,
    '--fui-navigation-view-indicator-radius': `${NAVIGATION_SELECTION_INDICATOR_RADIUS}px`,
    '--fui-navigation-view-indentation': `${NAVIGATION_ITEM_INDENTATION}px`,
    '--fui-navigation-view-header-height': `${NAVIGATION_HEADER_ROW_HEIGHT}px`,
    /* `ExpandCollapseChevron` 宽 40（`themeresources:617`）、
       `NavigationViewItemExpandChevronMargin = 0,0,-14,0`（`:255`）——
       负右边距把箭头推回内容区右侧 */
    '--fui-navigation-view-chevron-box-width': '40px',
    '--fui-navigation-view-chevron-margin-end': '-14px',
    '--fui-navigation-view-disabled-opacity': String(NAVIGATION_DISABLED_OPACITY),
    '--fui-navigation-view-separator-margin-bottom': `${NAVIGATION_ITEM_SEPARATOR_MARGIN_BOTTOM}px`,
    // 有 paneTitle 时会被撑到面板宽（对齐 UpdatePaneToggleSize，见上面的 computed）
    '--fui-navigation-view-toggle-button-width': `${toggleButtonWidth.value}px`,
    '--fui-navigation-view-toggle-button-height': `${NAVIGATION_PANE_TOGGLE_BUTTON_HEIGHT}px`,
    // 200ms / 100ms 分别对应 --durationNormal / --durationFaster（映射表见 constants.ts）
    '--fui-navigation-view-pane-open-duration': duration(NAVIGATION_DURATION_TOKEN_NORMAL),
    '--fui-navigation-view-pane-close-duration': duration(NAVIGATION_DURATION_TOKEN_FASTER),
    '--fui-navigation-view-header-fade-in': duration(NAVIGATION_DURATION_TOKEN_NORMAL),
    '--fui-navigation-view-header-fade-out': duration(NAVIGATION_DURATION_TOKEN_FASTER),
    // chevron 单段 ≈48ms ⇒ 取 --durationUltraFast(50ms)
    '--fui-navigation-view-chevron-duration': duration(NAVIGATION_DURATION_TOKEN_ULTRA_FAST),
    // `SplitView` 的 `SplineDoubleKeyFrame KeySpline="0.0,0.35 0.15,1.0"`（展开 / 收起同一曲线）
    '--fui-navigation-view-pane-curve': 'cubic-bezier(0, 0.35, 0.15, 1)',
  } as CSSProperties
})

/** 面板开关按钮的可访问名随开合切换（`SetPaneToggleButtonAutomationName`，`NavigationView.cpp:4383`） */
const paneToggleLabel = computed(() =>
  isPaneOpenResolved.value
    ? i18n.t('paneToggleButtonOpenName')
    : i18n.t('paneToggleButtonClosedName'),
)

/** 根 class */
const rootClass = computed(() => ({
  'fui-navigation-view': true,
  [`fui-navigation-view--${displayMode.value}`]: true,
  'is-pane-open': isPaneOpenResolved.value,
  'is-icon-only': iconOnly.value,
  /**
   * 面板是否「浮在内容之上」—— 上游 `UpdatePaneOverlayGroup`（`NavigationView.cpp:5077-5090`）：
   * `IsPaneOpen() && (CompactOverlay || Overlay)`。本库只在 Compact 档打开面板时成立
   * （Expanded 档是 `CompactInline`，从不浮层），此时底色换成 Acrylic。
   */
  'is-pane-overlaying': displayMode.value !== 'expanded' && isPaneOpenResolved.value,
}))
</script>

<template>
  <div
    :id="rootId"
    ref="rootElement"
    :class="rootClass"
    :style="rootStyle"
    :dir="dir"
  >
    <!-- 面板：WinUI `SplitView.Pane` → `PaneContentGrid`（`NavigationView.xaml:290-390`） -->
    <div
      v-if="isPaneVisible"
      :id="paneId"
      class="fui-navigation-view__pane"
      :class="{ 'is-overlaying': displayMode !== 'expanded' && isPaneOpenResolved }"
    >
      <!-- 开关按钮行：`ButtonHolderGrid`（`NavigationView.xaml:186-203`） -->
      <div
        v-if="isPaneToggleButtonVisible"
        class="fui-navigation-view__toggle-row"
      >
        <button
          type="button"
          class="fui-navigation-view__toggle"
          :class="[focusVisual.class, { 'is-open': isPaneOpenResolved }]"
          :style="focusVisual.style"
          :aria-label="paneToggleLabel"
          :title="paneToggleLabel"
          :aria-expanded="isPaneOpenResolved"
          :aria-controls="paneId"
          @click="onTogglePane"
        >
          <!-- 上游用 `AnimatedIcon`（16×16）+ fallback 字形 E700（`themeresources:323-334`）；
               本库用静态图标（`line_horizontal_3` / `navigation` 的官方路径），动效归 0.9.x。
               外层 `.fui-navigation-view__icon` 复刻模板里的 `Border Width = MinWidth`
               （= `SmallerPaneToggleButtonWidth` 40）—— 图标列宽 40 与导航项的
               `IconColumn` 同宽，两列因此严格对齐；`flex: 0 0 auto` 保证面板收起时
               图标不被标题挤扁（真实浏览器实测：原实现被压到 7.41 × 20）。 -->
          <span
            class="fui-navigation-view__icon"
            aria-hidden="true"
          >
            <FluentIconNavigation20Regular />
          </span>
          <!-- 面板标题：`PaneTitleTextBlock`（`NavigationView.xaml:198`）。
               上游 `ListSizeCompact` 把它的 `Visibility` 置 `Collapsed`（`:85`），
               即**紧凑且关闭时标题不显示** —— 判据是 `m_isClosedCompact`，不是 displayMode；
               原实现写成「展开档就显示」，于是 `left` 档收起后标题仍留在 48px 轨道里。 -->
          <span
            v-if="paneTitle && !iconOnly"
            class="fui-navigation-view__pane-title"
          >
            {{ paneTitle }}
          </span>
        </button>
      </div>

      <!-- 面板头部自定义内容：`PaneHeaderContentBorder`（`NavigationView.xaml:313`）。
           上游 `ListSizeCompact` 把它 `Collapsed`（`:85`，与 `PaneTitleTextBlock` 同一条
           规则）—— 判据是 `m_isClosedCompact`，因此这里用 `!iconOnly` 而不是 displayMode。 -->
      <div
        v-if="$slots.paneHeader && !iconOnly"
        class="fui-navigation-view__pane-header"
      >
        <slot name="paneHeader" />
      </div>

      <!-- 菜单区：`ItemsContainerGrid` 的 4 行（`NavigationView.xaml:350-388`）。
           外层 `RovingFocusGroup` 提供**一条扁平 roving 列表**：递归子列表的
           `RovingFocusItem` 会注入最近的祖先组（reka 的 `getItems()` 按
           `querySelectorAll` 的 **DOM 顺序**排序，见 Collection.js），因此
           「下一个 / 上一个可见元素」恰好等价于上游 XYFocus + 跨层手动聚焦
           （逐条等价关系表见 `navigation-view-items.vue` 的文件头）。
           `orientation="vertical"` ⇒ 左右方向键不参与（上游 Left/Right 也不移动焦点）。 -->
      <RovingFocusGroup
        as-child
        orientation="vertical"
        :dir="dir"
      >
        <nav
          class="fui-navigation-view__nav"
          :aria-label="label"
        >
          <NavigationViewItems :nodes="menuNodes" />
        </nav>
      </RovingFocusGroup>

      <!-- 面板底部自定义内容：`FooterContentBorder`（`NavigationView.xaml:377`） -->
      <div
        v-if="$slots.paneFooter && displayMode === 'expanded'"
        class="fui-navigation-view__pane-footer"
      >
        <slot name="paneFooter" />
      </div>

      <!-- 内置设置项：`FooterMenuItemsHost`（`NavigationView.xaml:379-388`） -->
      <div
        v-if="isSettingsVisible"
        class="fui-navigation-view__settings"
      >
        <slot
          v-if="$slots.settings"
          name="settings"
        />
        <button
          v-else
          type="button"
          class="fui-navigation-view__item fui-navigation-view__settings-button"
          :class="[
            focusVisual.class,
            { 'is-selected': isSettingsSelected, 'is-icon-only': iconOnly },
          ]"
          :style="focusVisual.style"
          :aria-current="isSettingsSelected ? 'page' : undefined"
          :aria-label="i18n.t('settingsButtonName')"
          :title="iconOnly ? i18n.t('settingsButtonName') : undefined"
          @click="invokeSettings('pointer')"
          @keydown.enter="onSettingsEnter"
          @keydown.space="onSettingsSpace"
        >
          <span
            class="fui-navigation-view__indicator"
            :class="{ 'is-visible': isSettingsSelected }"
            aria-hidden="true"
          />
          <span
            class="fui-navigation-view__icon"
            aria-hidden="true"
          >
            <!-- 上游 `UpdateSettingsItem` 用 `AnimatedSettingsVisualSource`，fallback 是
                 `SymbolIconSource(Symbol::Setting)`（`NavigationView.cpp:1332-1337`），
                 即**线性齿轮**。原实现内联了一段只有外轮廓的截断路径（576 字符，
                 官方 `settings_20_regular` 是 1022 字符），渲染成一坨实心黑块；
                 这里改用 `@fluere-vue/icons` 的官方 regular 字形（同一份 SVG 事实源）。 -->
            <FluentIconSettings20Regular />
          </span>
          <span class="fui-navigation-view__label">
            {{ i18n.t('settingsButtonName') }}
          </span>
        </button>
      </div>
    </div>

    <!-- 内容区：`ContentGrid`（`NavigationView.xaml:391-407`） -->
    <div
      :id="contentId"
      class="fui-navigation-view__content"
    >
      <slot name="content" />
    </div>
  </div>
</template>

<style scoped>
/* ------------------------------------------------------------------ */
/* 只有**本组件模板独占**的结构（根容器 / 面板列 / 开关行 / 菜单滚动区 /  */
/* 设置项容器 / 内容区）写在这里。                                      */
/*                                                                      */
/* 行视觉（`.fui-navigation-view__item` / `__indicator` / `__icon` /     */
/* `__label` / `__chevron` / `__header` / `__separator` / `__list`）在    */
/* **非 scoped** 的 `navigation-view.css` 里 —— 因为同一套行由本组件     */
/* （内置设置项，对应上游 `FooterMenuItemsHost`）与递归列表组件           */
/* （`navigation-view-items.vue`）分别渲染，两个 scopeId 不同，各写一份   */
/* scoped 块必然漂移。理由详见该文件头。                                 */
/* ------------------------------------------------------------------ */

/* 根容器：上游根 Grid 的 `SplitView` 用 `CompactInline`（Expanded）/      */
/* `CompactOverlay`（Compact），见 `NavigationView.cpp:2670-2677`。       */
/* Web 侧用 flex：面板定宽、内容 `flex: 1`。                              */
/* ------------------------------------------------------------------ */

.fui-navigation-view {
  display: flex;
  align-items: stretch;
  inline-size: 100%;
  block-size: 100%;
  min-block-size: 0;
  /* `NavigationView` 的 `CornerRadius` = `OverlayCornerRadius`(8)（NavigationView.xaml:7） */
  border-radius: var(--borderRadiusXLarge);
  overflow: clip;
  /* 内容区底色 `NavigationViewContentBackground` ← `LayerFillColorDefaultBrush`（:8）；
     面板另给（见下） */
  background-color: var(--layerFillColorDefault);
  font-family: var(--fontFamilyBase);
  color: var(--colorNeutralForeground1);
}

/* ---- 面板列 ---- */
.fui-navigation-view__pane {
  display: flex;
  flex-direction: column;
  flex: 0 0 auto;
  /* 分居线（`::after`）的定位上下文 */
  position: relative;
  /* 宽 = `OpenPaneLength`（展开 320）或 `CompactPaneLength`（收起 48）——
     由 `paneWidth` 写进 `--fui-navigation-view-pane-width`。
     上游收起时是 48px 图标轨道，**不是归零**（NavigationView.xaml:83）。 */
  inline-size: var(--fui-navigation-view-pane-width);
  min-inline-size: 0;
  overflow: hidden;
  /* Expanded 档：`NavigationViewExpandedPaneBackground` ← `SolidBackgroundFillColorTransparent`
     （themeresources:6，全透明）在 `PaneNotOverlaying` 时生效（NavigationView.xaml:129）
     ⇒ 展开档面板不画底色，由外壳（Mica / 壁纸）透出 */
  background-color: var(--colorTransparentBackground);
  /* 开合时长来自 SplitView 模板（证据链见 constants.ts） */
  transition: inline-size var(--fui-navigation-view-pane-open-duration)
    var(--fui-navigation-view-pane-curve);
}

/* 面板与内容区之间的分居线 —— `RootSplitView.BorderBrush` ← `NavigationViewItemSeparatorForeground`
   （`NavigationView.xaml:289`）+ `BorderThickness` = `NavigationViewBorderThickness`(1)（`:238`）。

   ⚠️ 这里**刻意用绝对定位的伪元素，而不是 `border-inline-end`**：`box-sizing: border-box`
   下 1px 边框会吃掉面板定宽里的一格（面板 48 → 内容 47），于是紧凑档的 40px 图标列
   放不进 39px 的项背景、开关按钮的 48px 也溢出 1px —— 这正是真实浏览器实测到的
   「折叠后行背景右侧被裁 3px、左右间隙 4 / -3 不对称」。伪元素不占布局空间，面板内容
   因此是干净的 48 / 320，与上游 `PaneContentGrid` 的可用宽一致。
   （上游那 1px 画在 `RootSplitView` 上，且 `PaneContentGrid.Margin = -1,3`（`:233`）
   把它抵回来；本库分居线在面板 inline-end，若照抄 -1 反而制造新的 3 / 4 不对称。）

   用 `inset-inline-end` 而不是物理方向的 `inset box-shadow`：`dir="rtl"` 时面板会镜像到
   内容区右侧（上游 `FlowDirection` 同理），物理偏移会把线画到错误的一边。 */
.fui-navigation-view__pane::after {
  content: '';
  position: absolute;
  inset-block: 0;
  inset-inline-end: 0;
  inline-size: var(--strokeWidthThin);
  background-color: var(--dividerStrokeColorDefault);
  /* 装饰性元素：不拦指针、不进无障碍树 */
  pointer-events: none;
}

/* 浮层面板（上游 `PaneOverlaying`，NavigationView.cpp:5081-5083）：
   底色换 `NavigationViewDefaultPaneBackground` ← `AcrylicInAppFillColorDefaultBrush`（:5），
   并给阴影（上游 `ShadowCaster` + `PaneOverlayShadowDepth`(16)，themeresources:207） */
.fui-navigation-view__pane.is-overlaying {
  background-color: var(--acrylicInAppFillColorDefault);
  box-shadow: var(--shadow16);
}

/* ---- 开关按钮行 ---- */
.fui-navigation-view__toggle-row {
  display: flex;
  align-items: center;
  /* `NavigationViewButtonHolderGridMargin = 0,4`（:232）—— **横向是 0**，
     按钮的 4px 视觉内缩由它自己的 `Padding`（= `NavigationViewItemButtonMargin` 4,2，
     `themeresources:282`）提供。原实现多加了一份 4px 横向内边距，与按钮 padding 叠加，
     把 48px 的按钮挤成 44px 可用宽（真实浏览器实测图标被压到 7.41 × 20）。 */
  padding: var(--spacingVerticalXS) 0;
  flex: 0 0 auto;
}

.fui-navigation-view__toggle {
  display: inline-flex;
  align-items: center;
  /* 标题与图标列之间的间隙 —— 上游模板里是 `ContentPresenter Padding="4,0,0,0"`
     （`themeresources:334`），即 4px。 */
  gap: var(--spacingHorizontalXS);
  /* `PaneToggleButtonStyle` 的 MinHeight(36)（themeresources:273）；
     宽走上游 `UpdatePaneToggleSize` 算出的 `toggleButtonWidth`（见上面的 computed）——
     缺省 = `CompactPaneLength`(48)，有 `paneTitle` 且非紧凑关闭时被撑到面板宽 */
  min-block-size: var(--fui-navigation-view-toggle-button-height);
  inline-size: var(--fui-navigation-view-toggle-button-width);
  /* `Padding = NavigationViewItemButtonMargin = 4,2`（:282） */
  padding: var(--spacingVerticalXXS) var(--spacingHorizontalXS);
  /* `CornerRadius = ControlCornerRadius`(4)（:283） */
  border-radius: var(--borderRadiusMedium);
  font-family: inherit;
  /* `FontSize = 16`（:271） */
  font-size: var(--fontSizeBase400);
  /* `Background = NavigationViewItemBackground` ← `SubtleFillColorTransparentBrush`（:279） */
  background-color: var(--subtleFillColorTransparent);
  /* `Foreground = NavigationViewItemForeground` ← `TextFillColorPrimaryBrush`（:280） */
  color: var(--colorNeutralForeground1);
  border: none;
  cursor: default;
}

/* PointerOver → `NavigationViewButtonBackgroundPointerOver` ← `SubtleFillColorSecondaryBrush`（:63） */
.fui-navigation-view__toggle:hover {
  background-color: var(--subtleFillColorSecondary);
}

/* Pressed → `NavigationViewButtonBackgroundPressed` ← `SubtleFillColorTertiaryBrush`（:64） */
.fui-navigation-view__toggle:active {
  background-color: var(--subtleFillColorTertiary);
  color: var(--colorNeutralForeground2);
}

/* Disabled → `NavigationViewButtonBackgroundDisabled` ← `ControlFillColorDisabledBrush`（:65） */
.fui-navigation-view__toggle:disabled {
  background-color: var(--colorNeutralBackgroundDisabled);
  color: var(--colorNeutralForegroundDisabled);
}

.fui-navigation-view__toggle:focus {
  outline: none;
}

/* `PaneTitleTextBlock` 用 `NavigationViewItemHeaderTextStyle`（:198、:1081-1086） */
.fui-navigation-view__pane-title {
  font-size: var(--fontSizeBase300);
  font-weight: var(--fontWeightSemibold);
  line-height: var(--lineHeightBase300);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ---- 面板头部 / 底部自定义内容 ---- */
.fui-navigation-view__pane-header,
.fui-navigation-view__pane-footer {
  flex: 0 0 auto;
  padding-inline: var(--spacingHorizontalS);
}

/* `FooterContentBorder.Margin = 0,0,0,4`（NavigationView.xaml:377） */
.fui-navigation-view__pane-footer {
  margin-block-end: var(--spacingVerticalXS);
}

/* ---- 菜单滚动区 ---- */
.fui-navigation-view__nav {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  /* 上游 `MenuItemsScrollViewer`（NavigationView.xaml:363） */
  overflow-y: auto;
  overflow-x: hidden;
  padding-block: var(--spacingVerticalXS);
  min-block-size: 0;
}

/* ---- 设置项容器（上游 `FooterMenuItemsHost` 所在行，NavigationView.xaml:379-388） ---- */
.fui-navigation-view__settings {
  flex: 0 0 auto;
  /* `VisualItemsSeparator.Margin = 0,0,0,2`（:375）+ 分隔线 1px */
  padding-block-start: var(--spacingVerticalXXS);
  border-block-start: var(--strokeWidthThin) solid var(--dividerStrokeColorDefault);
  padding-block-end: var(--spacingVerticalXS);
}

/* 设置项按钮复用全局 `.fui-navigation-view__item` 的全部行视觉（见 navigation-view.css）。
   它在本组件里是普通块级流（`FooterMenuItemsHost` 那一行），而菜单项在 `<li>` 的
   纵向 flex 里靠 `align-items: stretch` 撑开 —— 两种上下文下 `inline-size: auto`
   都会自动扣掉自身的 4px 横向 margin，因此这里**不需要**再补宽度规则。
   （原实现基于旧的 `inline-size: 100%` 补了一条 `calc(100% - 8px)`，现随基类一并去掉。） */
.fui-navigation-view__settings-button {
  inline-size: auto;
}

/* ---- 内容区 ---- */
.fui-navigation-view__content {
  flex: 1 1 auto;
  min-inline-size: 0;
  min-block-size: 0;
  /* `NavigationViewContentGridBorderThickness = 1,1,0,0`（:234）
     + `NavigationViewContentGridCornerRadius = 8,0,0,0`（:263） */
  border-block-start: var(--strokeWidthThin) solid var(--colorNeutralStrokeAlpha);
  border-inline-start: var(--strokeWidthThin) solid var(--colorNeutralStrokeAlpha);
  border-start-start-radius: var(--borderRadiusXLarge);
  /* `NavigationViewContentBackground` ← `LayerFillColorDefaultBrush`（:8） */
  background-color: var(--layerFillColorDefault);
  overflow: clip;
}

/* `prefers-reduced-motion`：去掉面板宽度过渡，但保留合理静态形态 */
@media (prefers-reduced-motion: reduce) {
  .fui-navigation-view__pane {
    transition: none;
  }
}
</style>
