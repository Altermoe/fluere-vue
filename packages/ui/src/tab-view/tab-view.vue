<script lang="ts">
/**
 * FluereTabView —— WinUI 3 `Microsoft.UI.Xaml.Controls.TabView` 的 Vue 实现。
 *
 * ## 规格来源（A 级）
 *
 * `microsoft-ui-xaml` tag **`winui3/release/2.5.1`**（commit `ba3a8d59e6de4e2b86ca4f61c78bc26ccf129afd`）：
 *
 * | 文件 | 读到的东西 |
 * | --- | --- |
 * | `src/controls/dev/TabView/TabView.xaml`（649 行） | TabView / TabViewListView / TabScrollViewer / TabViewItem / 三个按钮样式 |
 * | `src/controls/dev/TabView/TabView_themeresources.xaml`（270 行） | 画刷别名链与 30 条几何资源（`:239-269`） |
 * | `src/controls/dev/TabView/TabView.cpp`（2301 行） | 3 个 KeyboardAccelerator、`MoveSelection` / `MoveFocus`、`OnItemsChanged` 的选中迁移、`UpdateTabWidths`、滚动按钮 |
 * | `src/controls/dev/TabView/TabViewItem.cpp`（628 行） | 关闭按钮可见性、方向键、指示条几何、指针态 |
 * | `src/controls/dev/TabView/TabView.idl`（285 行） | 公开 API（**含 TabViewItem —— 不存在独立的 `TabViewItem.idl`**） |
 * | `src/controls/dev/Generated/{TabView,TabViewItem}.properties.cpp` | 依赖属性默认值 |
 * | `src/controls/dev/CommonStyles/Common_themeresources_any.xaml` | 画刷的最终 `#AARRGGBB` |
 * | `src/controls/dev/TabView/Strings/{en-us,zh-CN}/Resources.resw` | 7 条内建文案（见 `locale.ts`） |
 *
 * ## 读到的规范（文件 → 结论）
 *
 * - **模板结构**（`TabView.xaml:12-47`）：根 Grid 两行 `Auto`(tab 条) / `*`(内容)；
 *   `TabContainerGrid` 四列 = `Auto MinWidth=2`(TabStripHeader) | `Auto`(tab 条) |
 *   `Auto`(AddButton 容器，`Padding=3,0,0,3`，底部对齐) | `*`(TabStripFooter)；
 *   tab 条上方 8px 来自 `TabView.Padding = TabViewHeaderPadding(0,8,0,0)`（经 `TabListView.Padding`
 *   传到 `ItemsPresenter`），**不是 margin**。四列下方有一条 1px 的
 *   `TabViewBorderBrush` 底边线（`LeftBottomBorderLine` / `RightBottomBorderLine`）。
 * - **TabViewItem 模板**（`TabView.xaml:302-577`）：`TabContainer` 三列
 *   `IconBox(Auto)` / `ContentPresenter(*)` / `CloseButton(Auto)`；
 *   `ContentPresenter` **原文没有 Margin**，文本两侧间距全部来自 `TabContainer.Padding`
 *   （`8,3,4,3`，关闭按钮折叠时 `8,3,8,3`）+ `IconBox.Margin(0,0,10,0)` + `CloseButton.Margin(4,0,0,0)`。
 * - **几何**（`TabView_themeresources.xaml:239-269`）：tab `MinHeight=32`、`MinWidth=100` /
 *   `MaxWidth=240`（**只在 Equal 模式经代码生效**）、header `FontSize=12`、图标盒 `16`
 *   （`Margin 0,0,10,0`）、关闭按钮 `32×24`（`FontSize=12`、`Margin 4,0,0,0`）、
 *   AddButton `32×24`（`FontSize=12`）、滚动按钮 `32×24`（`FontSize=8`）、
 *   分隔线 `1px, Margin 0,8,0,8`、边框 `1`、选中态边框 `1,1,1,0` + `Margin -1,0,-1,1`。
 *   四键（`TabViewSelectedItemHeaderPadding` / `TabViewItemHeaderCloseButtonSize` /
 *   `TabViewItemScrollButtonPadding` / `TabViewShadowDepth`）在上游**定义但零引用**，本库同样不用。
 * - **画刷 → 最终色**：`Common_themeresources_any.xaml` 里 Light 与 Default(Dark) 两段的
 *   TabView 键名映射逐字节相同，差异只在 Color。映射见下面「WinUI 资源名 → token」。
 * - **状态机**：TabViewItem 共 11 组 VisualState；hover / pressed / selected / disabled
 *   **全部是 `VisualState.Setters`，且代码里所有 `GoToState(..., false)`** ⇒ 没有任何过渡；
 *   唯一的补间是拖拽（`DoubleAnimation Duration="0"` / `"0:0:0.240"`，无 `EasingFunction` ⇒ 线性），
 *   而拖拽重排 / tear-out 是本库**显式非目标**（见下）。因此本组件**不写任何 `transition`**。
 * - **`CloseButtonOverlayMode`**（`TabViewItem.cpp:248-279`）：只有 `OnPointerOver` 才「悬停/选中显示」，
 *   `Auto` 与 `Always` 走**同一个 `default:` 分支**（都常显）。不要按直觉把 `auto` 当成智能判断。
 * - **`TabWidthMode`**（`TabView.cpp:1130-1341`）：`Equal` 计算 `clamp(可用宽 / tab 数, 100, 240)` 后
 *   直接给每个 item 赋 `Width`；`SizeToContent` / `Compact` 走同一 else 分支（不设 item 宽，按内容自撑）；
 *   `Compact` 的差异在 **TabViewItem**（`TabViewItem.cpp:281-292`）：**仅未选中**的 tab 折叠成图标。
 * - **键盘**（`TabView.cpp:77-98,1517-1591`、`TabViewItem.cpp:573-600`）：TabView **没有 `OnKeyDown`**，
 *   只有 3 个 `KeyboardAccelerator` + AddButton 的 `KeyDown`：
 *   `Ctrl+F4` → `RequestCloseCurrentTab()`（选中项可关闭才生效）、`Ctrl+Tab` → `MoveSelection(true)`、
 *   `Ctrl+Shift+Tab` → `MoveSelection(false)`；**方向键在 TabViewItem 级**，按 `FlowDirection`
 *   调 `TabView::MoveFocus()`（焦点环 = `tab1 → tab1 关闭按钮 → tab2 → … → AddButton → 回到 tab1`）。
 *   `Ctrl+T` / `Ctrl+W` / `Ctrl+1..9` / `Home` / `End` / `Delete` / `Enter` / `Escape` 在源码里
 *   **没有任何分支**（grep 负面证据），属宿主应用职责 —— 本库不实现。
 * - **选择**：`SingleSelectionFollowsFocus=False`（`TabView.xaml:151`）⇒ **焦点移动不改选中**。
 *   `MoveSelection` 只改 `SelectedIndex`；`MoveFocus` 只移焦点，两者互不代劳。
 * - **关闭**（`TabView.cpp:1017-1101`）：`CloseButton.Click → RequestClose → TabView::RequestCloseTab`
 *   只抛 `TabCloseRequested`，**控件绝不自行删除 tab**（全文仅拖拽重排两处 `TabItems().RemoveAt/InsertAt`）。
 *   本组件同语义：只抛 `tabCloseRequested`，删不删、删完选谁由消费方决定；但如果消费方删掉的是
 *   **当前选中项**，本组件按 `OnItemsChanged`（`TabView.cpp:764-832`）的规则自动迁移选中
 *   （向后环形找第一个可用项），等价 WinUI 的 `SelectedItem` 行为。
 * - **溢出滚动**（`TabView.xaml:133-173`、`TabView.cpp:1103-1117,689-734`）：两个 `RepeatButton`
 *   的可见性绑 `ComputedHorizontalScrollBarVisibility`（溢出才出现），步长 `50px`，
 *   长按重复 `Delay="50" Interval="100"`（`:158,165`），贴边判定阈值 `0.1`
 *   （贴左禁「向后」、贴右禁「向前」），并且 `IsTabStop=False` +
 *   `AutomationProperties.AccessibilityView="Raw"`（**不进 Tab 序、对 AT 隐藏**）。
 *   **该 template 里没有滚动条部件**：3 列布局（`MinWidth=2` | `ScrollContentPresenter` | `Auto`）
 *   只放了两个箭头容器，`ComputedHorizontalScrollBarVisibility` 仅驱动它们的 `Visibility`
 *   ⇒ 溢出指示只有箭头，行高不受滚动条影响。
 *   `TabViewListView.cpp` 里**没有**任何拖着自动滚动的代码，也没有 `IsOverflowing` 之类的 API。
 * - **可访问性**：`TabViewAutomationPeer` = `ControlType.Tab` + `ISelectionProvider`
 *   （`CanSelectMultiple=false` / `IsSelectionRequired=true`），**没有重写 `GetNameCore`**
 *   ⇒ 根节点必须由消费方给 `label`；`TabViewItemAutomationPeer` = `TabItem`，
 *   名称先取 `AutomationProperties.Name`、为空才回退 `Header` 的字符串表示。
 *
 * ## WinUI 资源名 → token 映射（视觉值一律 `var(--TokenName)`）
 *
 * | WinUI 资源 | 最终色（亮 / 暗） | 本库 token |
 * | --- | --- | --- |
 * | `TabViewBackground` ← `SubtleFillColorTransparentBrush` | `#00FFFFFF` | `--colorSubtleBackground`（transparent） |
 * | `TabViewItemHeaderBackground` ← `LayerOnMicaBaseAltFillColorTransparentBrush` | `#00000000` / `#00FFFFFF` | `--layerOnMicaBaseAltFillColorTransparent`（0.5.3 新增，同值） |
 * | `TabViewItemHeaderBackgroundSelected` ← `SolidBackgroundFillColorTertiaryBrush` | `#F9F9F9` / `#282828` | `--solidBackgroundFillColorTertiary`（0.5.3 新增，同值） |
 * | `TabViewItemHeaderBackgroundPointerOver` ← `LayerOnMicaBaseAltFillColorSecondaryBrush` | `#0A000000` / `#0FFFFFFF` | `--layerOnMicaBaseAltFillColorSecondary`（0.5.3 新增，同值） |
 * | `TabViewItemHeaderBackgroundPressed` ← `LayerOnMicaBaseAltFillColorDefaultBrush` | `#B3FFFFFF` / `#733A3A3A` | `--layerOnMicaBaseAltFillColorDefault`（0.4.4 已有，同值） |
 * | `TabViewItemHeaderForeground` ← `TextFillColorSecondaryBrush` | `#9E000000` / `#C5FFFFFF` | `--colorNeutralForeground2`（沿用 app-window 的同一映射） |
 * | `TabViewItemHeaderForegroundSelected` ← `TextFillColorPrimaryBrush` | `#E4000000` / `#FFFFFF` | `--colorNeutralForeground1` |
 * | `TabViewItemHeaderForegroundPressed` ← `TextFillColorTertiaryBrush` | `#72000000` / `#87FFFFFF` | `--colorNeutralForeground3` |
 * | `…ForegroundDisabled` ← `TextFillColorDisabledBrush` | `#5C000000` / `#5DFFFFFF` | `--colorNeutralForegroundDisabled` |
 * | `TabViewItemSeparator` ← `DividerStrokeColorDefaultBrush` | `#0F000000` / `#15FFFFFF` | `--dividerStrokeColorDefault`（0.5.3 新增，同值） |
 * | `TabViewBorderBrush` ← `CardStrokeColorDefault` | `#0F000000` / `#19000000` | `--colorNeutralStrokeAlpha`（**沿用 InfoBar / ContentDialog 的既有映射**，见「与 WinUI 的差异」） |
 * | `TabViewItemHeaderCloseButton*` / `TabViewButton*` / `TabViewScrollButton*` 背景 ← `SubtleFillColor{Transparent,Secondary,Tertiary}Brush` | `#00FFFFFF` / `#09000000` / `#06000000` … | `--colorSubtleBackground` / `--subtleFillColorSecondary` / `--subtleFillColorTertiary`（0.4.4 已有，**同值**） |
 * | 同上的前景 ← `TextFillColor{Primary,Secondary,Disabled}Brush` | — | `--colorNeutralForeground1` / `--colorNeutralForeground2` / `--colorNeutralForegroundDisabled` |
 * | `OverlayCornerRadius`(8)（tab 上两角）/ `ControlCornerRadius`(4)（三个按钮） | — | `--borderRadiusXLarge` / `--borderRadiusMedium` |
 *
 * 焦点矩形：`TabViewItem` 与三个按钮都是 `UseSystemFocusVisuals=True` + `FocusVisualMargin=-3`，
 * 本库复用 0.4.3 的 `useFocusVisual`（双层 2px + 1px，外扩对齐 -3 语义）。
 *
 * ## 与 WinUI 的差异（有意为之，逐条记录）
 *
 * 1. **子项是「数据型子组件」**：`FluereTabViewItem` 不会挂载（父组件在渲染期读它的 props / slots，
 *    见 `collection.ts` 的理由），因此它**不能**像普通组件那样 emit；`TabViewItem.CloseRequested`
 *    被合并进根组件的 `tabCloseRequested`（载荷带 `source: 'close-button' | 'keyboard'`）。
 *    子项插槽**不支持作用域参数**（`#header="{ … }"` 拿不到值）。
 * 2. **没有 `TabItemsSource` / `TabItemTemplate`**：Vue 侧用 `v-for` + 子组件即可；`TabItems` 的增删
 *    完全由消费方模板决定，本组件不做虚拟化（对应上游 `ItemsStackPanel` 的容器回收）。
 * 3. **选中态跟随按「身份」而不是 `SelectedItem` 对象**：给了 `value` 或 `:key` 时，tab 插入 / 重排
 *    后选中项会跟着那个 tab 走（等价 `SelectedItem`）；被移除时按 `OnItemsChanged` 的向后环形规则迁移。
 *    没给稳定标识时退回下标语义（文档页有提醒）。
 * 4. **`AddTabButtonCommand` 不做**：WinUI 的 `ICommand` 在 Vue 侧没有等价物，只抛 `addTabButtonClick`；
 *    点击后额外用 `aria-live` 播报 `New tab added.`（对应上游的 UIA `ItemAdded` 通知）。
 * 5. **`Auto` / `Always` 同行为**（照抄源码分支，不是简化）：只有 `on-pointer-over` 才悬停显示。
 * 6. **光标是箭头**（`cursor: default`）：WinUI 的 tab 是 ListViewItem，不显示手型。
 * 7. **header 文本超出时省略号**：WinUI 的 `ContentPresenter` 没设 `TextTrimming`（会直接裁切），
 *    Web 侧用 `text-overflow: ellipsis` 更可读；这是本库唯一一处主动的排版差异。
 * 8. **选中背景的两处 4×4 内凹圆角用 CSS mask 表达**：上游是 `SelectedBackgroundPath`（路径由
 *    `TabViewItem::UpdateTabGeometry()` 运行时拼字符串生成：顶角 8、底部外扩圆角固定 4、
 *    左右各外扩 4）+ 两个 4×4 弧块 `Path`（`Fill=TabViewBorderBrush`）。Web 侧用
 *    `inset-inline: -4px` 的伪元素 + mask 把同位置的角切成内凹，底边线从切口透出 —— 等价几何，
 *    但**不是逐像素一致**（上游那圈弧线是用路径画的）。见「证据缺口」。
 * 9. **`TabViewBorderBrush` 的类型**：上游 Light/Default 下它是指向 `CardStrokeColorDefault`
 *    （一个 `Color`，不是 `Brush`）的 `StaticResource` 别名，XAML 运行时的隐式转换路径无法从源码证实；
 *    本库按同值 `SolidColorBrush` 处理，并**沿用仓库既有映射** `--colorNeutralStrokeAlpha`
 *    （InfoBar / ContentDialog 对同一资源就是这么映射的），明暗差量为：亮 `0.05` vs `0.059`、
 *    暗 `rgba(255,255,255,.1)` vs `#19000000`（方向相反的 10% 黑）。需要严格对齐时覆写 `--fui-tab-view-strip-line`。
 * 10. **滚动条：不画（上游也没有）** —— 旧版本这里写的是「上游在溢出时把 `HorizontalScrollBarVisibility`
 *     设成 `Visible`，本库用 `overflow-x: auto`（按需出现）等价」，属**误读**，已按模板证据推翻：
 *     `TabScrollViewerStyle` 的 `ControlTemplate`（`TabView.xaml:133-173`）里**没有滚动条部件**，
 *     只有 `ScrollContentPresenter` 与左右两个箭头容器；`ScrollViewer.ComputedHorizontalScrollBarVisibility`
 *     只绑给这两个容器的 `Visibility`（`:157,163`）。因此 `UpdateTabWidths` 里的
 *     `SetHorizontalScrollBarVisibility(Visible)`（`TabView.cpp:1240,1309`）只决定「箭头出不出现」。
 *     本库对应做法：`overflow-x: auto` 保留原生滚动（滚轮 / Shift + 滚轮 / 触摸 / `scrollBy`），
 *     再用 `scrollbar-width: none` + `::-webkit-scrollbar` **不画原生滚动条** ⇒ tab 高恒 `32`、
 *     tab 条行高恒 `40`（8 + 32）。经典滚动条会给行加一条 ≈ 15px 的高度（**有头 Chromium 实测
 *     `40 → 55`**，撑高 tab 条并挤压内容），这就是必须去掉它的原因；测量方法见文档页《浏览器实测》。
 * 11. **`Ctrl+Tab` 可能被浏览器吞掉**：Chrome / Edge 把它当作「切换浏览器标签页」的保留快捷键，
 *     页面收不到 keydown；`Ctrl+F4` 在部分环境同样被占用。本组件照实现，可用性取决于宿主环境。
 * 12. **`Alt` / `Ctrl` / `Meta` + 方向键一律不处理**：上游把 `Alt+Shift+方向键` 留给拖拽重排
 *     （本库非目标），本库为保持「不抢占」把整个组合都跳过。
 * 13. **高对比度**：上游 HC 全部走 `SystemColor*`（系统运行时给值，源码里只有哨兵 `#FF00FF`），
 *     本库未实现 HC 色板，只保留 `forced-colors` 下的焦点环兜底。
 * 14. **tab 元素上有 `disabled="false"`**：底座 reka 把 `disabled` 当普通属性写给 `role="tab"` 的
 *     `div`（Vue 对非表单元素不在布尔属性白名单里，于是渲染成字符串 `"false"`）。浏览器与 AT
 *     都忽略非表单元素上的 `disabled`，禁用语义由本组件补的 `aria-disabled="true"` 表达；
 *     样式侧一律用 `[data-disabled]` 选择器，不用 `[disabled]`。
 * 15. **关闭按钮的 `aria-label` 只有「关闭标签页」，不带 tab 名**：照抄上游（`SR_TabViewCloseButtonName`
 *     就只有 "Close Tab"）；需要带上 tab 名时覆写 `locale` 或自行包一层触发器。
 * 16. **选中态的「下 1px 外边距」折进背景**：上游 `TabViewSelectedItemHeaderMargin = -1,0,-1,1`
 *     的下分量是给「条目底部那条线」让位的；本库把底边线画在 tab 条行内（`::after`），
 *     于是让位改为「选中背景向下多盖 1px」。照抄外层 margin 会让整条在 flex 里长高 1px
 *     （浏览器实测 41 → 40），几何等价而总高与上游一致（8 + 32）。
 * 17. **选中背景是定位伪元素 ⇒ 内容必须显式提升绘制层级**：把图标 / 文本 / 关闭按钮设为
 *     `position: relative`（不加 z-index），否则按 CSS 绘制次序它们会被 `::before` 盖住 ——
 *     选中项会变成一整片纯色（真实浏览器截图抓到的 bug，数值断言当时全绿）。
 *
 * ## 显式非目标
 *
 * 拖拽重排（`CanReorderTabs`）、tear-out 撕出（`CanTearOutTabs` / `TabTearOutRequested`，默认 `false`）、
 * 中键关闭、`TabStripDragOver` / `TabStripDrop` / `TabDragStarting` / `TabDragCompleted` 事件、
 * `ItemsStackPanel` 虚拟化、`ItemContainerTransitions`（`AddDeleteThemeTransition` 等的时长/关键帧
 * 不在本控件目录内，属证据缺口）都不实现，也没有 API 占位。
 *
 * **`TabView_perf2026.xaml` 不实现**：上游存在该变体（`TabView.vcxitems:43` 引用），
 * 本库沿用 0.5.1 `TitleBar` 的裁定 —— 不读、不参考、不产生对应分支。
 *
 * ## 浏览器实测
 *
 * 见文档页《浏览器实测（可复现）》一节与 `tab-view.test.ts` 的源码契约断言；
 * 过程脚本与截图留在 `temp/`（不提交）。
 */
export type {
  FluereTabViewCloseButtonOverlayMode,
  FluereTabViewItemProps,
  FluereTabViewProps,
  FluereTabViewTabCloseRequestedEventArgs,
  FluereTabViewWidthMode,
} from './types'
</script>

<script setup lang="ts">
import { useReducedMotion, useScopeMessages } from '@fluere-vue/hooks'
import {
  FluentIconAdd16Regular,
  FluentIconChevronLeft16Regular,
  FluentIconChevronRight16Regular,
  FluentIconDismiss16Regular,
} from '@fluere-vue/icons'
import {
  TabsContent as RekaTabsContent,
  TabsList as RekaTabsList,
  TabsRoot as RekaTabsRoot,
  TabsTrigger as RekaTabsTrigger,
} from 'reka-ui'
import {
  computed,
  defineComponent,
  onBeforeUnmount,
  onMounted,
  onUpdated,
  ref,
  useSlots,
  type ComponentPublicInstance,
  type CSSProperties,
  type VNode,
} from 'vue'
import { useFocusVisual } from '../focus-visual/use-focus-visual'
import {
  collectTabItems,
  resolveSelectedIndex,
  snapshotSelection,
  type TabSelectionSnapshot,
} from './collection'
import {
  TAB_VIEW_BRING_INTO_VIEW_PADDING,
  TAB_VIEW_EDGE_EPSILON,
  TAB_VIEW_MAX_TAB_WIDTH,
  TAB_VIEW_MIN_TAB_WIDTH,
  TAB_VIEW_OVERFLOW_EPSILON,
  TAB_VIEW_SCROLL_AMOUNT,
  TAB_VIEW_SCROLL_REPEAT_DELAY,
  TAB_VIEW_SCROLL_REPEAT_INTERVAL,
} from './constants'
import { tabViewLocale } from './locale'
import FluereTabViewItem from './tab-view-item.vue'
import type {
  FluereTabViewProps,
  FluereTabViewTabCloseRequestedEventArgs,
  TabItemDescriptor,
} from './types'

defineOptions({ name: 'FluereTabView' })

const props = withDefaults(defineProps<FluereTabViewProps>(), {
  selectedIndex: undefined,
  defaultSelectedIndex: 0,
  tabWidthMode: 'equal',
  closeButtonOverlayMode: 'auto',
  isAddTabButtonVisible: true,
  label: undefined,
  dir: undefined,
  motion: 'auto',
  locale: undefined,
})

const emit = defineEmits<{
  /** 选中下标变化（`v-model:selectedIndex`；受控时是「请求」，由消费方回写） */
  'update:selectedIndex': [index: number]
  /** 新建按钮被点击（对应 WinUI `AddTabButtonClick`）；本组件不添加 tab */
  'addTabButtonClick': [event: MouseEvent]
  /** 关闭请求（对应 `TabView.TabCloseRequested` + `TabViewItem.CloseRequested`）；本组件不删除 tab */
  'tabCloseRequested': [args: FluereTabViewTabCloseRequestedEventArgs]
}>()

const slots = useSlots()

const rootRef = ref<ComponentPublicInstance | null>(null)
const listRef = ref<ComponentPublicInstance | null>(null)
const scrollerRef = ref<HTMLElement | null>(null)
const stripRowRef = ref<HTMLElement | null>(null)
const stripRef = ref<HTMLElement | null>(null)
const addButtonRef = ref<HTMLButtonElement | null>(null)

/** 内建文案（scope=`tab-view`，7 条逐字取自上游 resw，见 locale.ts） */
const i18n = useScopeMessages('tab-view', tabViewLocale, () => props.locale)
const addButtonName = computed(() => i18n.t('addButtonName'))
const addButtonTooltip = computed(() => i18n.t('addButtonTooltip'))
const closeButtonName = computed(() => i18n.t('closeButtonName'))
const closeButtonTooltip = computed(() => i18n.t('closeButtonTooltip'))
const scrollDecreaseTooltip = computed(() => i18n.t('scrollDecreaseTooltip'))
const scrollIncreaseTooltip = computed(() => i18n.t('scrollIncreaseTooltip'))

const prefersReducedMotion = useReducedMotion()

/** 双层焦点矩形（0.4.3 原语）：tab / 关闭按钮 / 两个按钮共用同一份几何 */
const focusVisual = useFocusVisual()

/**
 * 渲染一个子项插槽（`#icon` / `#header` / 面板内容）。
 *
 * 父组件持有子项的插槽函数（`withCtx` 产物，闭包绑定在消费方的实例上），
 * 直接调用即是 Vue 官方支持的「手动渲染插槽」用法；包一层组件是为了让
 * 插槽函数的调用发生在**渲染上下文**里（否则 vnode 会挂到错误的父级上）。
 */
const SlotContent = defineComponent({
  name: 'FluereTabViewSlotContent',
  props: { render: { type: Function, required: true } },
  setup(slotProps) {
    return () => (slotProps.render as () => VNode[])()
  },
})

/* ------------------------------------------------------------------ */
/* 子项收集与选中解析                                                   */
/* ------------------------------------------------------------------ */

/**
 * 读一次当前的 tab 列表。
 *
 * **刻意不用 `computed`**：插槽函数不是响应式依赖，computed 会在消费方更新插槽内容后
 * 返回陈旧结果（实测：`:header` 改成新值后 computed 不失效）。这里每次渲染都重新读，
 * 代价只是几次数组遍历；一个渲染期会被调用 3 次（TabsRoot 的 model-value、
 * tab 条、面板区），每次都会重新执行消费方的默认插槽函数（它只创建 vnode，不做实事）。
 */
const readItems = (): TabItemDescriptor[] =>
  collectTabItems((slots.default?.() ?? []) as unknown[], FluereTabViewItem)

/** 非受控模式的内部选中下标（受控模式只读 `props.selectedIndex`） */
const internalIndex = ref(props.defaultSelectedIndex)
/** 上一次解析用的快照（身份跟随 / 关闭后迁移） */
let previousSelection: TabSelectionSnapshot | null = null
/** 上一次解析出来的选中下标（渲染期派生值；不是响应式状态，避免渲染期写 ref） */
let lastResolvedIndex = 0
/** 选中变化时焦点原本在旧面板里 ⇒ 更新后把焦点送进新面板 */
let pendingPanelFocus = false

/**
 * 解析本次渲染真正生效的选中下标（纯函数式：只写模块内的普通变量，不碰响应式状态）。
 * 规则见 `collection.ts#resolveSelectedIndex` —— 调用方要求变了就用它，
 * 要求没变但列表变了就按 tab 身份跟随 / 被移除时向后环形迁移。
 */
const resolveIndex = (items: TabItemDescriptor[]): number => {
  const proposed = props.selectedIndex ?? internalIndex.value
  const resolved = resolveSelectedIndex(items, previousSelection, proposed)
  previousSelection = snapshotSelection(items, resolved)
  lastResolvedIndex = resolved
  return resolved
}

/** 当前生效的选中下标（模板里给 reka `TabsRoot` 的 `model-value`） */
const activeIndex = (): number => resolveIndex(readItems())

/**
 * 本次渲染已经解析过的选中下标（**只读派生值**，不重新解析）。
 *
 * 模板里 `RekaTabsRoot` 的 `:model-value="activeIndex()"` 先于子节点求值，
 * 所以子节点渲染时它一定是本次渲染的新值；用它避免每个 tab 都重跑一遍
 * `readItems()`（N 个 tab 会变成 O(N²) 次插槽调用）。
 */
const currentIndex = (): number => lastResolvedIndex

/** 根 DOM（原生事件挂在 reka 的根元素上） */
const getRootEl = (): HTMLElement | null => (rootRef.value?.$el as HTMLElement | undefined) ?? null

/** tab 列表 DOM（`role="tablist"` 容器） */
const getListEl = (): HTMLElement | null => (listRef.value?.$el as HTMLElement | undefined) ?? null

/** 当前选中的面板 DOM（reka 给选中面板写 `data-state="active"`） */
const getActivePanelEl = (): HTMLElement | null =>
  getRootEl()?.querySelector<HTMLElement>('[role="tabpanel"][data-state="active"]') ?? null

/** 收集焦点环：每个可用 tab（+ 它的关闭按钮，若在树上）+ 新建按钮 */
const collectFocusRing = (): HTMLElement[] => {
  const ring: HTMLElement[] = []
  for (const tab of getListEl()?.querySelectorAll<HTMLElement>('[role="tab"]') ?? []) {
    if (tab.hasAttribute('data-disabled')) {
      continue
    }
    ring.push(tab)
    // WinUI `GetCloseButton()` 为空（IsClosable=false / Visibility=Collapsed）时不进环 ——
    // 本库用 `v-if` 表达，没渲染出来就自然不在环里
    const close = tab.querySelector<HTMLElement>('[data-fui-tab-view-close]')
    if (close) {
      ring.push(close)
    }
  }
  if (addButtonRef.value) {
    ring.push(addButtonRef.value)
  }
  return ring
}

/**
 * 焦点环移动 —— 照抄 `TabView::MoveFocus(bool)`（`TabView.cpp:1427-1515`）：
 * `tab1 → tab1 关闭按钮 → tab2 → tab2 关闭按钮 → … → AddButton → 回到 tab1`，环形。
 * 焦点不在环里时返回 false（上游此时不处理该按键）。
 *
 * 与上游的差异：WinUI 里关闭按钮 `IsTabStop=False`，要靠临时把 `IsTabStop` 置真才能
 * `Focus()`；DOM 里 `tabindex="-1"` 的元素可以直接 `focus()`，所以不需要那套开关。
 */
const moveFocus = (forward: boolean): boolean => {
  const ring = collectFocusRing()
  if (ring.length === 0) {
    return false
  }
  // 只在 keydown 处理器里跑（SSR 不会执行）；lint:ssr 的告警属良性
  const current = document.activeElement
  const position = current instanceof HTMLElement ? ring.indexOf(current) : -1
  if (position < 0) {
    return false
  }
  const next = ring[(position + (forward ? 1 : ring.length - 1)) % ring.length]
  next?.focus()
  return true
}

/** 改选中（`v-model:selectedIndex` 的唯一出口）：受控时只抛事件，非受控时同时写内部状态 */
const setSelection = (index: number): void => {
  if (index === lastResolvedIndex) {
    return
  }
  // 焦点原本在旧面板里：面板会被卸载，焦点会掉到 body —— 记下来，更新后送进新面板
  // 同上：选择变化只可能来自用户交互 / Props 更新，不在 SSR 期
  pendingPanelFocus = getActivePanelEl()?.contains(document.activeElement) === true
  if (props.selectedIndex === undefined) {
    internalIndex.value = index
  }
  emit('update:selectedIndex', index)
}

/**
 * `Ctrl+Tab` / `Ctrl+Shift+Tab` 的落地 —— 照抄 `TabView::MoveSelection(bool)`
 * （`TabView.cpp:1517-1545`）：从当前下标出发环形向后（前）找第一个可用 tab 并选中；
 * **只改选中、不动焦点**。一圈都没有可用项时不处理（返回 false）。
 */
const moveSelection = (forward: boolean): boolean => {
  const items = readItems()
  const count = items.length
  if (count === 0) {
    return false
  }
  let index = lastResolvedIndex
  for (let step = 0; step < count; step += 1) {
    index = (index + (forward ? 1 : -1) + count) % count
    if (!items[index]?.disabled) {
      setSelection(index)
      return true
    }
  }
  return false
}

/** 抛关闭请求（本组件不删除 tab；事件名与载荷见 types.ts） */
const requestClose = (
  item: TabItemDescriptor,
  source: FluereTabViewTabCloseRequestedEventArgs['source'],
): void => {
  emit('tabCloseRequested', {
    index: item.index,
    header: item.header,
    identity: item.identity,
    source,
  })
}

/**
 * `Ctrl+F4` —— 照抄 `TabView::RequestCloseCurrentTab()`（`TabView.cpp:1547-1560`）：
 * 只有「选中项存在且 `IsClosable`」时才抛事件并 `Handled`。
 */
const requestCloseCurrentTab = (
  source: FluereTabViewTabCloseRequestedEventArgs['source'],
): boolean => {
  const item = readItems()[lastResolvedIndex]
  if (!item || !item.isClosable) {
    return false
  }
  requestClose(item, source)
  return true
}

/** reka 的取值变化（点击 / Space / Enter / 自动激活关掉后不会触发） */
const onSelectionChange = (value: string | number | undefined): void => {
  const index = typeof value === 'number' ? value : Number(value)
  if (Number.isFinite(index)) {
    setSelection(index)
  }
}

/** `Ctrl+Click` 选中 —— 照抄 `TabViewItem::OnPointerPressed`（`TabViewItem.cpp:395-403`） */
const onTabMouseDown = (event: MouseEvent, index: number): void => {
  if (!event.ctrlKey) {
    return
  }
  if (readItems()[index]?.disabled) {
    return
  }
  setSelection(index)
}

/* ------------------------------------------------------------------ */
/* 键盘                                                                */
/* ------------------------------------------------------------------ */

/**
 * 根节点捕获阶段的键盘处理（对应 WinUI 的 `KeyboardAccelerator.ScopeOwner = TabView`
 * + `TabViewItem::OnKeyDown`）。捕获阶段是为了抢在 reka 的 RovingFocus 之前处理方向键：
 * `stopPropagation()` 之后底座不会再挪一次焦点。
 */
const onKeydown = (event: KeyboardEvent): void => {
  // ① 三个 KeyboardAccelerator：作用域是整个 TabView（焦点在内容区里也生效）
  if (event.ctrlKey && !event.altKey && !event.metaKey) {
    if (event.key === 'F4') {
      if (requestCloseCurrentTab('keyboard')) {
        event.preventDefault()
        event.stopPropagation()
      }
      return
    }
    if (event.key === 'Tab') {
      event.preventDefault()
      event.stopPropagation()
      moveSelection(!event.shiftKey)
      return
    }
  }

  // ② 方向键：只在 tab 条内生效（上游这条分支在 TabViewItem 上，不在 TabView 上）
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
    return
  }
  if (event.altKey || event.ctrlKey || event.metaKey) {
    return
  }
  const target = event.target
  const list = getListEl()
  // 作用域：tab 条内（`TabViewItem::OnKeyDown`）或新建按钮上（`OnAddButtonKeyDown`，TabView.cpp:1578-1591）
  if (
    !(target instanceof Node) ||
    !list ||
    !(list.contains(target) || target === addButtonRef.value)
  ) {
    return
  }
  // FlowDirection：RTL 下「左」才是前进（`TabViewItem.cpp:179-181`）
  const forward = props.dir === 'rtl' ? event.key === 'ArrowLeft' : event.key === 'ArrowRight'
  if (moveFocus(forward)) {
    event.preventDefault()
    event.stopPropagation()
  }
}

/* ------------------------------------------------------------------ */
/* 关闭按钮 / 新建按钮 / 悬停                                           */
/* ------------------------------------------------------------------ */

/** 当前被指针悬停的 tab（只用于 `on-pointer-over` 模式的关闭按钮可见性） */
const hoveredIndex = ref<number | null>(null)

/**
 * 关闭按钮是否渲染 —— 照抄 `TabViewItem::UpdateCloseButton`（`TabViewItem.cpp:248-279`）：
 * `!IsClosable` ⇒ 折叠；`OnPointerOver` ⇒ `选中 || 悬停` 才显示；
 * `Auto` / `Always` 走同一 `default:` 分支 ⇒ 常显。
 */
const isCloseButtonVisible = (item: TabItemDescriptor): boolean => {
  if (!item.isClosable) {
    return false
  }
  if (props.closeButtonOverlayMode !== 'on-pointer-over') {
    return true
  }
  return currentIndex() === item.index || hoveredIndex.value === item.index
}

/**
 * 是否需要渲染图标占位盒。
 *
 * `Compact` 模式**只作用于未选中的 tab**（`TabViewItem.cpp:281-292`），此时模板把
 * `IconColumn.Width` 固定成 `TabViewItemHeaderIconSize`（16）——**没有图标也占 16px**。
 * 子项没给 `#icon` 时上游那个列仍占位，所以这里也要渲染一个空盒子。
 */
const needsIconBox = (item: TabItemDescriptor): boolean =>
  Boolean(item.renderIcon) || (props.tabWidthMode === 'compact' && currentIndex() !== item.index)

/**
 * 分隔线是否隐藏 —— 照抄 `TabView::SetTabSeparatorOpacity`（`TabView.cpp:199-231`）：
 * 「自己是被选中项，或自己紧邻选中项的左侧」都隐藏；hover / pressed 由 CSS 追加处理。
 */
const isSeparatorHidden = (item: TabItemDescriptor): boolean =>
  item.index === currentIndex() || item.index + 1 === currentIndex()

const onTabPointerEnter = (index: number): void => {
  hoveredIndex.value = index
}

const onTabPointerLeave = (index: number): void => {
  if (hoveredIndex.value === index) {
    hoveredIndex.value = null
  }
}

/** `aria-live` 播报（对应 `TabView.cpp:520-525` 的 UIA `ItemAdded` 通知） */
const liveMessage = ref('')

const onAddTabButtonClick = (event: MouseEvent): void => {
  emit('addTabButtonClick', event)
  // 同一句话连续播报不会重复触发，先清空再写入
  liveMessage.value = ''
  void Promise.resolve().then(() => {
    liveMessage.value = i18n.t('newTabAddedNotification')
  })
}

/* ------------------------------------------------------------------ */
/* Equal 宽度测量 / 溢出滚动                                            */
/* ------------------------------------------------------------------ */

/** Equal 模式下计算出来的单 tab 宽（`null` = 还没量到 / 非 Equal 模式） */
const equalWidth = ref<number | null>(null)

const rootStyle = computed<CSSProperties>(() => {
  if (equalWidth.value === null) {
    return {}
  }
  return { '--fui-tab-view-equal-tab-width': `${equalWidth.value}px` } as CSSProperties
})

/**
 * Equal 模式的宽度计算 —— 照抄 `TabView::UpdateTabWidths`（`TabView.cpp:1154-1205,1324-1341`）：
 * `width = clamp((行的可用宽 − 左右内容块 / 新建按钮占宽) / tab 数, 100, 240)`。
 *
 * 上游在代码里量（`availableWidth - (padding + headerWidth + footerWidth)`），本库同理：
 * 这块 CSS 做不到 —— scroller 的宽度由内容决定，让 tab 用 `flex: 1 1 0` 会形成循环依赖。
 * 量到之前 `--fui-tab-view-equal-tab-width` 未设置 ⇒ CSS 退回 `inline-size: auto`
 * （仍受 min/max 夹持），SSR 直出与水合一致。
 */
const measureEqualWidth = (): void => {
  const scroller = scrollerRef.value
  if (props.tabWidthMode !== 'equal' || !scroller) {
    if (equalWidth.value !== null) {
      equalWidth.value = null
    }
    return
  }
  const tabCount = scroller.querySelectorAll('[role="tab"]').length
  if (tabCount === 0) {
    if (equalWidth.value !== null) {
      equalWidth.value = null
    }
    return
  }
  // 行的可用宽 = 整行内容宽 − 其余三块的占宽（左侧内容 / 新建按钮 / 右侧内容）。
  // spacer 是「余量占位」，必须排除，否则会减掉一块由 flex 撑开的宽度（循环依赖）。
  const row = stripRowRef.value
  let taken = 0
  if (row) {
    for (const child of row.children) {
      if (child === stripRef.value || child.classList.contains('fui-tab-view__strip-spacer')) {
        continue
      }
      taken += (child as HTMLElement).offsetWidth
    }
  }
  const available = Math.max((row?.clientWidth ?? scroller.clientWidth) - taken, 0)
  const width = Math.min(
    Math.max(available / tabCount, TAB_VIEW_MIN_TAB_WIDTH),
    TAB_VIEW_MAX_TAB_WIDTH,
  )
  if (equalWidth.value === null || Math.abs(equalWidth.value - width) > 0.5) {
    equalWidth.value = width
  }
}

/** 是否溢出（滚动按钮的可见性 —— 对应 `ComputedHorizontalScrollBarVisibility`） */
const isOverflowing = ref(false)
/** 是否贴左端 / 贴右端（阈值 0.1，见 constants） */
const isAtStart = ref(true)
const isAtEnd = ref(true)

const refreshOverflow = (): void => {
  const scroller = scrollerRef.value
  if (!scroller) {
    isOverflowing.value = false
    isAtStart.value = true
    isAtEnd.value = true
    return
  }
  const maxOffset = Math.max(scroller.scrollWidth - scroller.clientWidth, 0)
  isOverflowing.value = maxOffset > TAB_VIEW_OVERFLOW_EPSILON
  isAtStart.value = Math.abs(scroller.scrollLeft) < TAB_VIEW_EDGE_EPSILON
  isAtEnd.value = Math.abs(scroller.scrollLeft - maxOffset) < TAB_VIEW_EDGE_EPSILON
}

/** 滚动按钮：步长 50px；`motion='auto'` 且未偏好减少动效时用平滑滚动（上游 ChangeView 默认带画） */
const scrollTabList = (direction: -1 | 1): void => {
  const scroller = scrollerRef.value
  if (!scroller) {
    return
  }
  const behavior: ScrollBehavior =
    props.motion === 'auto' && !prefersReducedMotion.value ? 'smooth' : 'auto'
  scroller.scrollBy({ left: direction * TAB_VIEW_SCROLL_AMOUNT, behavior })
}

/**
 * 滚动按钮的「按住连续滚动」—— 上游是 `RepeatButton`（`TabView.xaml:158,165`：
 * `Delay="50" Interval="100"`）：**按下立刻滚一次**，50ms 后进入每 100ms 一次的重复；
 * 指针抬起 / 离开 / 取消即停止（对应 RepeatButton 的 `IsPressed` 变 false）。
 */
let holdDelayTimer: ReturnType<typeof setTimeout> | undefined = undefined
let holdIntervalTimer: ReturnType<typeof setInterval> | undefined = undefined

const stopScrollRepeat = (): void => {
  if (holdDelayTimer !== undefined) {
    clearTimeout(holdDelayTimer)
    holdDelayTimer = undefined
  }
  if (holdIntervalTimer !== undefined) {
    clearInterval(holdIntervalTimer)
    holdIntervalTimer = undefined
  }
}

const startScrollRepeat = (direction: -1 | 1, event: PointerEvent): void => {
  // 只响应主键（RepeatButton 的 press 语义）
  if (event.button !== 0) {
    return
  }
  stopScrollRepeat()
  scrollTabList(direction)
  holdDelayTimer = setTimeout(() => {
    holdDelayTimer = undefined
    holdIntervalTimer = setInterval(() => {
      scrollTabList(direction)
      // 到达该方向的端点后必须自己收尾：滚动按钮此时会被置为 `disabled`，
      // 而禁用的表单控件收不到指针事件 ⇒ `pointerup` 永远不会再来
      if (direction === 1 ? isAtEnd.value : isAtStart.value) {
        stopScrollRepeat()
      }
    }, TAB_VIEW_SCROLL_REPEAT_INTERVAL)
  }, TAB_VIEW_SCROLL_REPEAT_DELAY)
}

/**
 * 把选中的 tab 滚进可视区 —— 对应 `BringSelectedTabIntoView` /
 * `TabViewItem::StartBringTabIntoView`（后者给目标矩形左右各留 2px）。
 * 刻意不用 `scrollIntoView`（它会连带滚动页面容器），自己按 scroller 的矩形算。
 */
const bringSelectedTabIntoView = (): void => {
  const scroller = scrollerRef.value
  const tab = scroller?.querySelector<HTMLElement>(
    `[data-fui-tab-view-index="${lastResolvedIndex}"]`,
  )
  if (!scroller || !tab) {
    return
  }
  const scrollerRect = scroller.getBoundingClientRect()
  const tabRect = tab.getBoundingClientRect()
  const padding = TAB_VIEW_BRING_INTO_VIEW_PADDING
  const overflowEnd = tabRect.right - scrollerRect.right
  const overflowStart = tabRect.left - scrollerRect.left
  if (overflowEnd > -padding) {
    scroller.scrollLeft += overflowEnd + padding
  } else if (overflowStart < padding) {
    scroller.scrollLeft += overflowStart - padding
  }
}

/* ------------------------------------------------------------------ */
/* 渲染后的同步（状态回填 / 焦点 / 滚动）                                 */
/* ------------------------------------------------------------------ */

/** 最后一次「已经把选中项滚进可视区」的下标，避免每次更新都滚 */
let broughtIntoViewIndex = -1

/** 找面板里第一个可聚焦元素（近似 `FocusManager::FindFirstFocusableElement`） */
const findFirstFocusable = (container: HTMLElement): HTMLElement | null => {
  const candidates = container.querySelectorAll<HTMLElement>(
    'a[href], button, input, select, textarea, [tabindex]',
  )
  for (const candidate of candidates) {
    if (
      candidate.hasAttribute('disabled') ||
      candidate.getAttribute('aria-hidden') === 'true' ||
      candidate.getAttribute('tabindex') === '-1' ||
      candidate.closest('[hidden]') !== null
    ) {
      continue
    }
    return candidate
  }
  return null
}

/** 同步「派生出来的选中下标」回状态（受控 ⇒ 抛事件；非受控 ⇒ 写内部状态） */
const syncSelection = (): void => {
  if (props.selectedIndex === undefined) {
    if (internalIndex.value !== lastResolvedIndex) {
      internalIndex.value = lastResolvedIndex
    }
    return
  }
  if (props.selectedIndex !== lastResolvedIndex) {
    // 受控模式下也要把「跟随 / 迁移后的结果」告诉消费方（由它决定是否回写）
    emit('update:selectedIndex', lastResolvedIndex)
  }
}

const afterRender = (): void => {
  measureEqualWidth()
  refreshOverflow()
  syncSelection()
  if (lastResolvedIndex !== broughtIntoViewIndex) {
    broughtIntoViewIndex = lastResolvedIndex
    bringSelectedTabIntoView()
  }
  if (pendingPanelFocus) {
    pendingPanelFocus = false
    // 对应 `TabView::UpdateTabContent`（`TabView.cpp:964-1015`）：旧内容里的焦点会随内容卸载丢失，
    // 于是把焦点送给新内容里的第一个可聚焦元素；内容里没有就回落到 tab 本身
    const target =
      (getActivePanelEl() && findFirstFocusable(getActivePanelEl() as HTMLElement)) ||
      getListEl()?.querySelector<HTMLElement>(`[data-fui-tab-view-index="${lastResolvedIndex}"]`)
    target?.focus()
  }
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  afterRender()
  // SSR 安全：只在 onMounted 里做能力探测后再观察（lint:ssr 会把这一行列为待复核，属良性）
  if (typeof ResizeObserver !== 'undefined' && scrollerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      measureEqualWidth()
      refreshOverflow()
    })
    resizeObserver.observe(scrollerRef.value)
  }
})

onUpdated(afterRender)

onBeforeUnmount(() => {
  stopScrollRepeat()
  resizeObserver?.disconnect()
  resizeObserver = null
})
</script>

<template>
  <RekaTabsRoot
    ref="rootRef"
    class="fui-tab-view"
    :model-value="activeIndex()"
    orientation="horizontal"
    activation-mode="manual"
    :dir="dir"
    :data-tab-width-mode="tabWidthMode"
    :data-close-button-overlay-mode="closeButtonOverlayMode"
    :data-motion="motion"
    :style="rootStyle"
    @update:model-value="onSelectionChange"
    @keydown.capture="onKeydown"
  >
    <!-- tab 条：四列 = 左内容(MinWidth 2) | tab 条 | 新建按钮 | 右内容(*)，底部一条 1px 线 -->
    <div
      ref="stripRowRef"
      class="fui-tab-view__strip-row"
    >
      <div class="fui-tab-view__strip-header">
        <slot name="tab-strip-header" />
      </div>

      <div
        ref="stripRef"
        class="fui-tab-view__strip"
      >
        <!-- 溢出才出现的两个滚动按钮：不进 Tab 序、对 AT 隐藏（AccessibilityView=Raw）；
             按下即滚一次并进入长按重复（上游 RepeatButton 的 Delay/Interval） -->
        <span
          v-show="isOverflowing"
          class="fui-tab-view__scroll-area fui-tab-view__scroll-area--decrease"
        >
          <button
            type="button"
            class="fui-tab-view__scroll-button"
            :class="focusVisual.class"
            :style="focusVisual.style"
            tabindex="-1"
            aria-hidden="true"
            :disabled="isAtStart"
            :title="scrollDecreaseTooltip"
            @pointerdown="startScrollRepeat(-1, $event)"
            @pointerup="stopScrollRepeat"
            @pointerleave="stopScrollRepeat"
            @pointercancel="stopScrollRepeat"
          >
            <FluentIconChevronLeft16Regular :size="12" />
          </button>
        </span>

        <div
          ref="scrollerRef"
          class="fui-tab-view__scroller"
          @scroll.passive="refreshOverflow"
        >
          <RekaTabsList
            ref="listRef"
            class="fui-tab-view__list"
            :aria-label="label"
            :loop="true"
          >
            <RekaTabsTrigger
              v-for="item in readItems()"
              :key="item.identity"
              class="fui-tab-view__tab"
              :class="focusVisual.class"
              :style="focusVisual.style"
              as="div"
              :value="item.index"
              :disabled="item.disabled"
              :aria-label="item.ariaLabel"
              :aria-disabled="item.disabled ? 'true' : undefined"
              :data-fui-tab-view-index="item.index"
              :data-close-visible="isCloseButtonVisible(item) ? '' : undefined"
              :data-separator-hidden="isSeparatorHidden(item) ? '' : undefined"
              @pointerenter="onTabPointerEnter(item.index)"
              @pointerleave="onTabPointerLeave(item.index)"
              @mousedown="onTabMouseDown($event, item.index)"
            >
              <span
                v-if="needsIconBox(item)"
                class="fui-tab-view__icon"
              >
                <SlotContent
                  v-if="item.renderIcon"
                  :render="item.renderIcon"
                />
              </span>

              <span class="fui-tab-view__header">
                <SlotContent
                  v-if="item.renderHeader"
                  :render="item.renderHeader"
                />
                <template v-else>{{ item.header }}</template>
              </span>

              <button
                v-if="isCloseButtonVisible(item)"
                type="button"
                class="fui-tab-view__close"
                :class="focusVisual.class"
                :style="focusVisual.style"
                data-fui-tab-view-close
                tabindex="-1"
                :disabled="item.disabled"
                :aria-label="closeButtonName"
                :title="closeButtonTooltip"
                @click.stop="requestClose(item, 'close-button')"
              >
                <FluentIconDismiss16Regular :size="12" />
              </button>

              <!-- 分隔线：自己或右邻被选中时透明（`SetTabSeparatorOpacity`，TabView.cpp:199-231） -->
              <span
                class="fui-tab-view__separator"
                aria-hidden="true"
              />
            </RekaTabsTrigger>
          </RekaTabsList>
        </div>

        <span
          v-show="isOverflowing"
          class="fui-tab-view__scroll-area fui-tab-view__scroll-area--increase"
        >
          <button
            type="button"
            class="fui-tab-view__scroll-button"
            :class="focusVisual.class"
            :style="focusVisual.style"
            tabindex="-1"
            aria-hidden="true"
            :disabled="isAtEnd"
            :title="scrollIncreaseTooltip"
            @pointerdown="startScrollRepeat(1, $event)"
            @pointerup="stopScrollRepeat"
            @pointerleave="stopScrollRepeat"
            @pointercancel="stopScrollRepeat"
          >
            <FluentIconChevronRight16Regular :size="12" />
          </button>
        </span>
      </div>

      <div
        v-if="isAddTabButtonVisible"
        class="fui-tab-view__add-area"
      >
        <button
          ref="addButtonRef"
          type="button"
          class="fui-tab-view__add-button"
          :class="focusVisual.class"
          :style="focusVisual.style"
          :aria-label="addButtonName"
          :title="addButtonTooltip"
          @click="onAddTabButtonClick"
        >
          <slot name="add">
            <FluentIconAdd16Regular :size="12" />
          </slot>
        </button>
      </div>

      <!-- 占位：把「余量」交给它，右内容块才能像上游的 `*` 列一样贴到最右；
           同时让 Equal 宽度的测量不必减去「被 flex 撑开的右内容宽度」（否则会循环依赖） -->
      <div
        class="fui-tab-view__strip-spacer"
        aria-hidden="true"
      />

      <div class="fui-tab-view__strip-footer">
        <slot name="tab-strip-footer" />
      </div>
    </div>

    <!-- 内容区：WinUI 只有一个 ContentPresenter（非选中内容不在视觉树上）⇒ 未选中即卸载 -->
    <div class="fui-tab-view__panels">
      <RekaTabsContent
        v-for="item in readItems()"
        :key="item.identity"
        class="fui-tab-view__panel"
        :value="item.index"
      >
        <SlotContent :render="item.renderContent" />
      </RekaTabsContent>
    </div>

    <!-- 新建 tab 的播报（对应 UIA ItemAdded 通知）；视觉上不可见、对 AT 可见 -->
    <span
      class="fui-tab-view__live"
      aria-live="polite"
      aria-atomic="true"
      >{{ liveMessage }}</span
    >
  </RekaTabsRoot>
</template>

<style scoped>
/* ------------------------------------------------------------------ */
/* 所有视觉值都引用 token（`var(--TokenName)`）或 `--fui-tab-view-*`     */
/* 局部变量；明暗由 tokens.css 的 light-dark() + color-scheme 自动切换。  */
/*                                                                     */
/* WinUI 数值资源（TabView_themeresources.xaml:239-269）→ 局部变量：     */
/*   TabViewHeaderPadding = 0,8,0,0        → --fui-tab-view-strip-padding-*  */
/*   TabViewItemHeaderPadding{With,Without}CloseButton = 8,3,4,3 / 8,3,8,3   */
/*                                         → --fui-tab-view-tab-padding-*    */
/*   TabViewItemMinHeight = 32             → --fui-tab-view-tab-min-height   */
/*   TabViewItemMinWidth/MaxWidth = 100/240 → --fui-tab-view-tab-min/max-width */
/*   TabViewItemHeaderFontSize = 12        → fontSizeBase200                 */
/*   TabViewItemHeaderIconSize = 16 / Margin 0,0,10,0                        */
/*   TabViewItemHeaderCloseButtonWidth/Height = 32/24, CloseFontSize = 12,   */
/*     CloseMargin = 4,0,0,0               → --fui-tab-view-close-*          */
/*   TabViewItemScrollButtonWidth/Height = 32/24, ButonFontSize = 8          */
/*   TabViewItem{Left,Right}ScrollButtonContainerPadding = 8,0,3,3 / 3,0,8,3 */
/*   TabViewItemAddButtonWidth/Height = 32/24, FontSize = 12,                */
/*     AddButtonContainerPadding = 3,0,0,3                                   */
/*   TabViewItemSeparatorMargin = 0,8,0,8                                    */
/*   TabViewItemBorderThickness = 1 / TabViewSelectedItemBorderThickness = 1,1,1,0 */
/*   TabViewSelectedItemHeaderMargin = -1,0,-1,1                             */
/*   OverlayCornerRadius = 8（选中背景顶角）/ ControlCornerRadius = 4（按钮） */
/*                                                                     */
/* 组件内**没有任何 transition**：上游所有 GoToState 第三参都是 false。   */
/* 唯一的动效是滚动按钮的 `scrollBy({ behavior: 'smooth' })`，在           */
/* motion='none' 或 prefers-reduced-motion 下退化为瞬时。                */
/* ------------------------------------------------------------------ */

.fui-tab-view {
  /* 画刷（WinUI 资源名 → token 见文件头映射表） */
  --fui-tab-view-strip-line: var(--colorNeutralStrokeAlpha);
  --fui-tab-view-selected-bg: var(--solidBackgroundFillColorTertiary);
  --fui-tab-view-tab-bg-rest: var(--layerOnMicaBaseAltFillColorTransparent);
  --fui-tab-view-tab-bg-hover: var(--layerOnMicaBaseAltFillColorSecondary);
  --fui-tab-view-tab-bg-pressed: var(--layerOnMicaBaseAltFillColorDefault);
  --fui-tab-view-separator-color: var(--dividerStrokeColorDefault);
  --fui-tab-view-fg-rest: var(--colorNeutralForeground2);
  --fui-tab-view-fg-selected: var(--colorNeutralForeground1);
  --fui-tab-view-fg-pressed: var(--colorNeutralForeground3);
  --fui-tab-view-fg-disabled: var(--colorNeutralForegroundDisabled);
  --fui-tab-view-button-bg-rest: var(--colorSubtleBackground);
  --fui-tab-view-button-bg-hover: var(--subtleFillColorSecondary);
  --fui-tab-view-button-bg-pressed: var(--subtleFillColorTertiary);
  --fui-tab-view-fg-button: var(--colorNeutralForeground1);
  --fui-tab-view-fg-button-pressed: var(--colorNeutralForeground2);

  /* 几何 */
  --fui-tab-view-strip-padding-top: 8px;
  --fui-tab-view-tab-min-height: 32px;
  --fui-tab-view-tab-min-width: 100px;
  --fui-tab-view-tab-max-width: 240px;
  --fui-tab-view-tab-padding-block: 3px;
  --fui-tab-view-tab-padding-inline-start: 8px;
  --fui-tab-view-tab-padding-inline-end: 4px;
  --fui-tab-view-tab-padding-inline-end-no-close: 8px;
  --fui-tab-view-tab-radius: var(--borderRadiusXLarge);
  --fui-tab-view-tab-border: var(--strokeWidthThin);
  /* 选中背景底部两侧的内凹圆角：源码硬编码 4（`UpdateTabGeometry` 注释
     "Assumes 4px curving-out corners, which are hardcoded in the markup"） */
  --fui-tab-view-fillet: 4px;
  --fui-tab-view-icon-size: 16px;
  --fui-tab-view-icon-margin: 10px;
  --fui-tab-view-close-width: 32px;
  --fui-tab-view-close-height: 24px;
  --fui-tab-view-close-margin: 4px;
  --fui-tab-view-button-width: 32px;
  --fui-tab-view-button-height: 24px;
  --fui-tab-view-button-radius: var(--borderRadiusMedium);
  --fui-tab-view-add-area-padding: 0 0 3px 3px;
  --fui-tab-view-scroll-area-padding-start: 0 3px 3px 8px;
  --fui-tab-view-scroll-area-padding-end: 0 8px 3px 3px;
  /* 选中态叠在邻项之上（WinUI `Canvas.ZIndex = 20`；这里是**组件内部局部层**，
     不是浮层档位，故不走 --zIndex* 刻度） */
  --fui-tab-view-selected-z: 1;

  display: flex;
  flex-direction: column;
  min-block-size: 0;
  /* TabViewBackground ← SubtleFillColorTransparentBrush */
  background-color: var(--colorSubtleBackground);
  color: var(--fui-tab-view-fg-rest);
  font-size: var(--fontSizeBase200);
}

/* ---- tab 条：四列 + 底部 1px 线 ---- */
.fui-tab-view__strip-row {
  position: relative;
  display: flex;
  align-items: stretch;
  flex: none;
}

/*
 * 底边线：`TabViewBorderBrush` ← `CardStrokeColorDefault`（映射见文件头第 9 条）。
 * 用**行内**绝对定位伪元素而不是 `border-bottom`：上游的线画在条目底部的 1px 内
 * （`BottomBorderLine`），tab 条总高 = 8 + 32 = 40；写成 border 会让整条多出 1px。
 * 绘制次序：伪元素在**未选中** tab 之上、在选中 tab 之下（选中项 z-index 1），
 * 与上游「线压在 TabContainer 背景上、被选中背景盖住」一致。
 */
.fui-tab-view__strip-row::after {
  content: '';
  position: absolute;
  inset-block-end: 0;
  inset-inline: 0;
  block-size: var(--strokeWidthThin);
  background-color: var(--fui-tab-view-strip-line);
  pointer-events: none;
}

.fui-tab-view__strip-header {
  flex: none;
  /* LeftContentColumn MinWidth="2"（TabView.xaml:31） */
  min-inline-size: 2px;
}

/* 右内容列（上游的 `*`）：余量由 spacer 吸收，自身按内容宽（可缩） */
.fui-tab-view__strip-footer {
  flex: 0 1 auto;
  min-inline-size: 0;
}

.fui-tab-view__strip-spacer {
  flex: 1 1 auto;
}

.fui-tab-view__strip {
  display: flex;
  align-items: flex-end;
  flex: 0 1 auto;
  min-inline-size: 0;
}

/* ScrollViewer：`overflow-x: auto` 保留原生滚动（滚轮 / Shift + 滚轮 / 触摸 / `scrollBy`）；
   原生滚动条**不画** —— 上游 `TabScrollViewerStyle` 的模板（`TabView.xaml:133-173`）里没有滚动条
   部件，`ScrollViewer.ComputedHorizontalScrollBarVisibility` 只绑给两个箭头容器（`:157,163`）
   ⇒ 溢出指示只有箭头、行高不受滚动条影响。经典滚动条会给行加一条 ≈ 15px
   （有头 Chromium 实测 40 → 55，撑高并挤压高度），必须去掉。 */
.fui-tab-view__scroller {
  display: flex;
  flex: 0 1 auto;
  min-inline-size: 0;
  overflow-x: auto;
  overflow-y: hidden;
  /* Chromium 121+ / Firefox；老 Chromium 与 Safari 走下面的伪元素 */
  scrollbar-width: none;
}

.fui-tab-view__scroller::-webkit-scrollbar {
  display: none;
}

.fui-tab-view__list {
  display: flex;
  align-items: stretch;
  /* ItemsPresenter.Padding = TabViewHeaderPadding(0,8,0,0) */
  padding-block-start: var(--fui-tab-view-strip-padding-top);
}

/* ---- 滚动按钮（TabViewScrollButtonStyle + 两个容器 Padding） ---- */
.fui-tab-view__scroll-area {
  display: flex;
  align-items: flex-end;
  flex: none;
}

.fui-tab-view__scroll-area--decrease {
  padding: var(--fui-tab-view-scroll-area-padding-start);
}

.fui-tab-view__scroll-area--increase {
  padding: var(--fui-tab-view-scroll-area-padding-end);
}

.fui-tab-view__scroll-button,
.fui-tab-view__add-button {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  flex: none;
  inline-size: var(--fui-tab-view-button-width);
  block-size: var(--fui-tab-view-button-height);
  padding: 0;
  border: none;
  border-radius: var(--fui-tab-view-button-radius);
  background-color: var(--fui-tab-view-button-bg-rest);
  color: var(--fui-tab-view-fg-button);
  cursor: default;
  line-height: 0;
}

.fui-tab-view__scroll-button:hover,
.fui-tab-view__add-button:hover {
  background-color: var(--fui-tab-view-button-bg-hover);
}

.fui-tab-view__scroll-button:active,
.fui-tab-view__add-button:active {
  background-color: var(--fui-tab-view-button-bg-pressed);
  color: var(--fui-tab-view-fg-button-pressed);
}

.fui-tab-view__scroll-button:disabled {
  background-color: var(--fui-tab-view-button-bg-rest);
  color: var(--fui-tab-view-fg-disabled);
}

.fui-tab-view__add-area {
  display: flex;
  align-items: flex-end;
  flex: none;
  /* TabViewItemAddButtonContainerPadding = 3,0,0,3（左 3 / 下 3） */
  padding: var(--fui-tab-view-add-area-padding);
}

/* ---- tab 项 ---- */
.fui-tab-view__tab {
  position: relative;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  flex: 0 0 auto;
  min-block-size: var(--fui-tab-view-tab-min-height);
  /* TabViewItemHeaderPaddingWithCloseButton = 8,3,4,3（左 8 / 上 3 / 右 4 / 下 3） */
  padding: var(--fui-tab-view-tab-padding-block) var(--fui-tab-view-tab-padding-inline-end)
    var(--fui-tab-view-tab-padding-block) var(--fui-tab-view-tab-padding-inline-start);
  /* TabViewItemBorderThickness = 1，BorderBrush 透明（选中态才换色） */
  border: var(--fui-tab-view-tab-border) solid transparent;
  /* 只取上半圆角（TopCornerRadiusFilterConverter）：OverlayCornerRadius = 8,8,8,8 → 上 8 / 下 0 */
  border-start-start-radius: var(--fui-tab-view-tab-radius);
  border-start-end-radius: var(--fui-tab-view-tab-radius);
  background-color: var(--fui-tab-view-tab-bg-rest);
  color: var(--fui-tab-view-fg-rest);
  font-size: var(--fontSizeBase200);
  font-weight: var(--fontWeightRegular);
  line-height: var(--lineHeightBase200);
  text-align: start;
  white-space: nowrap;
  /* WinUI 的 tab 是 ListViewItem，光标是箭头不是手型 */
  cursor: default;
  user-select: none;
}

.fui-tab-view__tab[data-close-visible] {
  /* TabViewItemHeaderPaddingWithCloseButton 的右分量 = 4 */
  padding-inline-end: var(--fui-tab-view-tab-padding-inline-end);
}

.fui-tab-view__tab:not([data-close-visible]) {
  /* TabViewItemHeaderPaddingWithoutCloseButton 的右分量 = 8 */
  padding-inline-end: var(--fui-tab-view-tab-padding-inline-end-no-close);
}

/* Equal：宽度由代码量出来后写进 --fui-tab-view-equal-tab-width（见 measureEqualWidth）；
   量到之前退回内容宽（仍受 min/max 夹持） */
.fui-tab-view[data-tab-width-mode='equal'] .fui-tab-view__tab {
  inline-size: var(--fui-tab-view-equal-tab-width, auto);
  min-inline-size: var(--fui-tab-view-tab-min-width);
  max-inline-size: var(--fui-tab-view-tab-max-width);
}

/* hover / pressed：只有未选中、未禁用的 tab 才变（Selected 与 PointerOverSelected 的 Setter 完全相同） */
.fui-tab-view__tab:hover:not([data-state='active']):not([data-disabled]) {
  background-color: var(--fui-tab-view-tab-bg-hover);
}

/* 按下：`TabViewItem` 的 Pressed；`:has()` 用来排除「按在关闭按钮上」的情况
   （上游此时走的是关闭按钮自己的 Pressed 态，tab 本体不进 Pressed） */
.fui-tab-view__tab:active:not([data-state='active']):not([data-disabled]):not(
    :has(.fui-tab-view__close:active)
  ) {
  background-color: var(--fui-tab-view-tab-bg-pressed);
  color: var(--fui-tab-view-fg-pressed);
}

/* 选中态：背景（4px 外扩 + 顶部 8 圆角 + 底部 4 内凹）、1px 描边、字重 SemiBold */
.fui-tab-view__tab[data-state='active'] {
  /* TabViewSelectedItemHeaderMargin = -1,0,-1,1：左右各外扩 1px。
     原文的「下 1px」在本库折叠进「背景向下多盖 1px」（见下）——照抄会在 flex 里
     把 tab 条整体撑高 1px（浏览器实测 41 → 40），视觉等价而几何与上游一致。 */
  margin: 0 calc(-1 * var(--fui-tab-view-tab-border));
  /* TabViewSelectedItemBorderThickness = 1,1,1,0（没有底边） */
  border-width: var(--fui-tab-view-tab-border) var(--fui-tab-view-tab-border) 0;
  /* TabViewSelectedItemBorderBrush：上游是 4px 渐变（两个 GradientStop 都在 Offset=1.0，
     语义不明确，属证据缺口）⇒ 本库用同色的实描边 */
  border-color: var(--fui-tab-view-strip-line);
  background-color: transparent;
  color: var(--fui-tab-view-fg-selected);
  font-weight: var(--fontWeightSemibold);
  z-index: var(--fui-tab-view-selected-z);
}

/*
 * 选中背景：`SelectedBackgroundPath`。上游路径由 `UpdateTabGeometry()` 生成 ——
 * 顶角 8、左右各外扩 4、底部两侧是半径 4 的**内凹**（外扩）圆角，`Margin="-4,0"`。
 * 这里的几何换算：
 *   · 横向：`inset-inline: -4px` 是相对**内边距盒**（tab 有 1px 边框），
 *     即边框盒外扩 3px —— 与上游「TabContainer（Margin -1）+ 路径再外扩 4」一致；
 *   · 纵向：下边界要盖住行内那条 1px 底边线（上游的线画在条目底部内），
 *     而选中态没有下边框 ⇒ 下边界外扩 1px；上边界外扩 1px 抵消 1px 上边框后贴 tab 盒顶。
 */
.fui-tab-view__tab[data-state='active']::before {
  content: '';
  position: absolute;
  inset-block: calc(-1 * var(--fui-tab-view-tab-border)) 0;
  inset-inline: calc(-1 * var(--fui-tab-view-fillet));
  background-color: var(--fui-tab-view-selected-bg);
  border-start-start-radius: var(--fui-tab-view-tab-radius);
  border-start-end-radius: var(--fui-tab-view-tab-radius);
  /* 底部两角切成内凹圆角：角盒内保留以内角为圆心的四分之一圆，其余挖空 */
  -webkit-mask-image:
    radial-gradient(circle var(--fui-tab-view-fillet) at 100% 0, #000 99%, transparent 100%),
    radial-gradient(circle var(--fui-tab-view-fillet) at 0 0, #000 99%, transparent 100%),
    linear-gradient(#000, #000);
  mask-image:
    radial-gradient(circle var(--fui-tab-view-fillet) at 100% 0, #000 99%, transparent 100%),
    radial-gradient(circle var(--fui-tab-view-fillet) at 0 0, #000 99%, transparent 100%),
    linear-gradient(#000, #000);
  -webkit-mask-size:
    var(--fui-tab-view-fillet) var(--fui-tab-view-fillet),
    var(--fui-tab-view-fillet) var(--fui-tab-view-fillet),
    100% 100%;
  mask-size:
    var(--fui-tab-view-fillet) var(--fui-tab-view-fillet),
    var(--fui-tab-view-fillet) var(--fui-tab-view-fillet),
    100% 100%;
  -webkit-mask-position:
    0 100%,
    100% 100%,
    0 0;
  mask-position:
    0 100%,
    100% 100%,
    0 0;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  pointer-events: none;
}

/*
 * 选中背景是**定位伪元素**（`position: absolute; z-index: auto`），而 tab 里的图标 / 文本是
 * 常规流内容 —— 按 CSS 绘制次序，定位后代（`::before`）画在常规流内容之上，会把整个选中项
 * 盖成一片纯底色。这里把内容提升到同一层级且排在 `::before` 之后（DOM 次序），
 * 让伪元素退回「背景」的语义。**真实浏览器截图抓到的 bug**（数值断言全是绿的）。
 */
.fui-tab-view__tab > .fui-tab-view__icon,
.fui-tab-view__tab > .fui-tab-view__header,
.fui-tab-view__tab > .fui-tab-view__close {
  /* 只提「定位」不提 z-index：定位后与 `::before` 同属一层，按 DOM 次序画在其后；
     写 `z-index: 0` 会撞上 `__tests__/z-index-tokens.test.ts` 的「不吃裸 z-index」红线。
     分隔线不在此列（它本来就 absolute，要留在行的最上层附近）。 */
  position: relative;
}

/* 图标盒（Viewbox：MaxWidth/MaxHeight = 16，Margin 0,0,10,0） */
.fui-tab-view__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  max-inline-size: var(--fui-tab-view-icon-size);
  max-block-size: var(--fui-tab-view-icon-size);
  margin-inline-end: var(--fui-tab-view-icon-margin);
  line-height: 0;
}

.fui-tab-view__icon :deep(svg) {
  display: block;
  max-inline-size: 100%;
  max-block-size: 100%;
}

/* header 文本：WinUI 的 ContentPresenter 没设 TextTrimming（会硬裁），本库用省略号（差异第 7 条） */
.fui-tab-view__header {
  flex: 1 1 auto;
  min-inline-size: 0;
  overflow: hidden;
  text-align: start;
  text-overflow: ellipsis;
}

/* 分隔线：Width 1 / Margin 0,8,0,8 / DividerStrokeColorDefault */
.fui-tab-view__separator {
  position: absolute;
  inset-block: 8px;
  inset-inline-end: 0;
  inline-size: var(--strokeWidthThin);
  background-color: var(--fui-tab-view-separator-color);
  pointer-events: none;
}

/* 自己或右邻被选中 ⇒ 隐藏（`TabView::SetTabSeparatorOpacity`，TabView.cpp:199-231）；
   hover / pressed 时也隐藏（模板里 `TabSeparator.Opacity = 0` 的两条 Setter） */
.fui-tab-view__tab[data-separator-hidden] .fui-tab-view__separator,
.fui-tab-view__tab:hover .fui-tab-view__separator,
.fui-tab-view__tab:active .fui-tab-view__separator {
  opacity: 0;
}

/* 禁用态：DisabledStates（底透明、前景 Disabled） */
.fui-tab-view__tab[data-disabled] {
  color: var(--fui-tab-view-fg-disabled);
  /* 对应 IsEnabled=false：不可点、不可聚焦（reka 已把它移出 roving 焦点） */
  pointer-events: none;
}

/*
 * Compact：只作用于**未选中**的 tab（`TabViewItem.cpp:281-292`）——
 * 隐藏文本、图标盒 Margin 归零、图标列固定 16（`IconColumn.Width = TabViewItemHeaderIconSize`）。
 */
.fui-tab-view[data-tab-width-mode='compact']
  .fui-tab-view__tab:not([data-state='active'])
  .fui-tab-view__header {
  display: none;
}

.fui-tab-view[data-tab-width-mode='compact']
  .fui-tab-view__tab:not([data-state='active'])
  .fui-tab-view__icon {
  inline-size: var(--fui-tab-view-icon-size);
  margin-inline-end: 0;
}

/* ---- 关闭按钮（TabViewCloseButtonStyle） ---- */
.fui-tab-view__close {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  flex: none;
  inline-size: var(--fui-tab-view-close-width);
  block-size: var(--fui-tab-view-close-height);
  /* TabViewItemHeaderCloseMargin = 4,0,0,0（左 4） */
  margin-inline-start: var(--fui-tab-view-close-margin);
  padding: 0;
  /* TabViewItemHeaderCloseButtonBorderThickness = 0 */
  border: none;
  border-radius: var(--fui-tab-view-button-radius);
  background-color: var(--fui-tab-view-button-bg-rest);
  color: var(--fui-tab-view-fg-button);
  cursor: default;
  line-height: 0;
}

.fui-tab-view__close:hover {
  background-color: var(--fui-tab-view-button-bg-hover);
}

.fui-tab-view__close:active {
  background-color: var(--fui-tab-view-button-bg-pressed);
  color: var(--fui-tab-view-fg-button-pressed);
}

.fui-tab-view__tab[data-disabled] .fui-tab-view__close {
  background-color: var(--fui-tab-view-button-bg-rest);
  color: var(--fui-tab-view-fg-disabled);
}

/* ---- 焦点矩形：复用 0.4.3 的 `useFocusVisual`（外 2px + 内 1px，等价 FocusVisualMargin = -3） ---- */
.fui-tab-view__scroll-button:focus {
  /* 滚动按钮不进 Tab 序（IsTabStop=False），永远不该出现焦点环；被程序化聚焦也保持无环 */
  outline: none;
  box-shadow: none;
}

/* ---- 内容区 ---- */
.fui-tab-view__panels {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-block-size: 0;
}

.fui-tab-view__panel {
  flex: 1 1 auto;
  min-block-size: 0;
}

/* 播报区：视觉隐藏、对 AT 可见（对应 UIA Notification） */
.fui-tab-view__live {
  position: absolute;
  overflow: hidden;
  inline-size: 1px;
  block-size: 1px;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
