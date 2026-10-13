<script lang="ts">
/**
 * FluereAppWindow 组件 Props 契约
 *
 * 设计规范来源：WinUI 3 / Windows App SDK — `Microsoft.UI.Xaml.Controls.TitleBar`
 *   模板 / 数值（`TitleBar.xaml` / `TitleBar_themeresources.xaml`）：
 *     microsoft-ui-xaml `winui3/release/2.5.1`（commit ba3a8d5）
 *   行为 / API（`TitleBar.idl` / `TitleBar.h` / `TitleBar.cpp`）：
 *     microsoft-ui-xaml `winui3/release/2.0.1`（commit 978ab63）
 *     —— 该控件目录两 tag 有漂移（`TitleBar.cpp` +382 行、idl 新增
 *     `AutoRefreshDragRegions` / `IsDragRegion` / `RecomputeDragRegions` 等 `MUX_PUBLIC_V11`），
 *     按 docs/style-spec.md §2/§3「命中 .cpp/.idl 就要切到 Gallery 对应的 tag」，
 *     行为一律读 2.0.1；模板与画刷两 tag 逐字节一致（见 types.ts / constants.ts）。
 *
 * 读到的规范（文件 → 结论）：
 *  - `TitleBar.xaml`：模板 = `Grid#PART_LayoutRoot`（`Height=TitleBarCompactHeight`=32，
 *    `Background=TemplateBinding Background` = Transparent）+ **12 列**：
 *    `2 | Auto(Back) | Auto(PaneToggle) | Auto(LeftHeader) | 14(LeftHeaderPadding) |
 *     Auto(Icon) | Auto(Title) | Auto(Subtitle) | *(Content) | Auto(RightHeader) |
 *     48(MinDragRegion，模板里无元素占位) | 0(RightPadding)`；
 *    `PART_Icon` 是 `Viewbox`（MaxWidth/MaxHeight=16）；Title/Subtitle 用
 *    `CaptionTextBlockStyle`（12px / Normal），Title 前景 = 控件 Foreground、
 *    Subtitle 前景 = `TitleBarSubtitleForegroundBrush`；三者对齐 Left/Center，
 *    Content 为 Center/Center，RightHeader 为 Right/Center。
 *  - 11 个 VisualStateGroup；`GoToState(..., false)` **全部零时长**（源码里没有任何过渡动画）。
 *    `HeightGroup`：Content / LeftHeader / RightHeader **全空才 32**，否则 48（`UpdateHeight()`）。
 *    `DisplayModeGroup`：Content 的期望宽 ≥ 可用宽时进 `Compact`（折叠 Title/Subtitle、
 *    Content 由 Center 改 Left + 右移 16）—— 它声明在 `TitleTextGroup` **之后**，
 *    因此两者都写 `PART_TitleText.Visibility` 时**以 Compact 为准**。
 *    `LeftHeaderSpacingGroup`：`IsBackButtonVisible == IsPaneToggleButtonVisible` 时
 *    `DefaultSpacing`（左头间距 14），恰好一个可见时 `NegativeInsetSpacing`（压到 2）。
 *  - `TitleBar.cpp#OnInputActivationChanged`：失活时 Title/Subtitle **换前景**
 *    （`TitleBarDeactivatedForegroundBrush` = TextFillColorTertiary），
 *    Icon / LeftHeader / Content / RightHeader **只改 `Opacity`**
 *    （`TitleBarDeactivatedOpacity` = 0.5）；且 Title/Subtitle 分支带 `!m_isCompact` 守卫。
 *  - `TitleBar.cpp#UpdateDragRegion` / `UpdateInteractableElementsList`：
 *    控件设为窗口标题栏后**整条标题栏属非客户区**；把「可交互元素」（BackButton 可见且启用、
 *    PaneToggle 可见、LeftHeader / Content / RightHeader 三块区域）设成
 *    `NonClientRegionKind::Passthrough` 抠洞；**Icon 走独立的 `NonClientRegionKind::Icon`，
 *    不在 passthrough 清单里 ⇒ 图标区仍可拖拽**。Web 的等价实现见 use-drag-region.ts。
 *  - 本地化：Back 按钮名 / ToolTip 取 `NavigationBackButtonName`("Back") /
 *    `NavigationBackButtonToolTip`("Back")，PaneToggle 取 `NavigationButtonToggleName`
 *    ("Toggle Navigation")（XAML 里的 `ToolTipService.ToolTip="Navigation"` 只是占位字面量）。
 *  - `TitleBarAutomationPeer`：`ControlType=TitleBar`、`GetNameCore()` 空时回退 `Title`。
 *
 * WinUI 资源名 → Fluent token 映射（取值一律 `var(--TokenName)`，见 style 块内注释）：
 *   TitleBarForegroundBrush              ← TextFillColorPrimaryBrush   → colorNeutralForeground1
 *   TitleBarDeactivatedForegroundBrush   ← TextFillColorTertiaryBrush  → colorNeutralForeground3
 *   TitleBarSubtitleForegroundBrush      ← TextFillColorSecondaryBrush → colorNeutralForeground2
 *   TitleBarBack/PaneToggleButton{Background,PointerOver,Pressed,Disabled}
 *     ← SubtleFillColor{Transparent,Secondary,Tertiary}Brush / ControlFillColorDisabledBrush
 *     → colorSubtleBackground / colorSubtleBackgroundHover / colorSubtleBackgroundPressed /
 *       colorNeutralBackgroundDisabled（与 InfoBar 关闭按钮同一套映射）
 *   窗口底色 ← SolidBackgroundFillColorBase（#F3F3F3 / #202020）→ colorNeutralBackground2
 *     （#fafafa / #1f1f1f，ΔE 2.3 / 0.6；与 ContentDialog 用同一个映射，避免库内出现两种底）
 *   窗口描边 ← SurfaceStrokeColorDefault（40% #757575 合成 #C1C1C1 / #424242）
 *     → colorNeutralStroke2（#e0e0e0 / #525252，ΔE 31 / 16，max(亮,暗) 最小者；沿用 ContentDialog）
 *   圆角 8 → borderRadiusXLarge（DWM 窗口圆角；最大化 → borderRadiusNone）
 *   阴影 → shadow64（B 级近似：窗口阴影由 DWM 绘制，仓库里无 WindowShadow* 资源）
 *   标题栏高度 32 / 48、按钮宽 40、图标上限 16、左头间距 14/2、最小拖拽区 48、
 *   失活不透明度 0.5（均无同值 token，落成 `--fui-app-window-*` 局部变量）
 *
 * 与 WinUI 的差异（有意为之，逐条记录）：
 *  - **位置 / 尺寸 / 层级完全由外部控制**：组件不写 `position` / `inset` / `transform` /
 *    `z-index`。拖拽只抛事件（`dragStart` / `dragMove` / `dragEnd`），双击标题栏只抛
 *    `titlebarDoubleClick`（Win11 系统行为是切换最大化，由外壳决定是否响应）。
 *  - `Title` 不写 `document.title`（WinUI 会真的改窗口标题并在清空时恢复默认标题）。
 *  - `IconSource` → `#icon` 插槽（Web 无 IconSource 对象）；`Content` → `#titlebar-content`
 *    插槽（注意它**不是**窗口内容区）；窗口内容区是本库新增的 `#content`（别名 `#default`）。
 *  - 返回 / 导航按钮**不做 AnimatedIcon 动画**：WinUI 两个按钮的图标是
 *    `AnimatedBackVisualSource` / `AnimatedGlobalNavigationButtonVisualSource`
 *    （LottieGen 产物，`c_durationTicks` = 13333333 ≈ 1.3333 s、画布 48×48、12 个 marker、
 *    主题属性 `Foreground`），本库先用 `@fluere-vue/icons` 的静态字形，动画随 0.5.4
 *    `NavigationView` 一并落地（本组件已把插槽留出：`#back-icon` / `#pane-toggle-icon`）。
 *  - 窗口 inset：WinUI 用 `AppWindowTitleBar.LeftInset()/RightInset()` 覆盖首末列宽；Web 无此值，
 *    首列固定 2（`TitleBarLeftPaddingWidth`），末列固定为本组件 caption 区
 *    （`CAPTION_BUTTONS_AREA_WIDTH` = 138 = 3×46，与 `RightInset` 同义）。
 *  - 失活态由 `active` prop 表达（WinUI 来自 `InputActivationListener`，Web 无等价系统事件；
 *    外壳可接 `document.visibilitychange` / `window.blur` 自行驱动）。
 *  - 高对比度主题、Mica / Acrylic 材质不实现（后者属 0.4.4 / 0.9.1 范围），属已知缺口。
 *  - caption 按钮由本组件渲染并代理事件；WinUI 侧由系统 DWM 绘制（证据与缺口见
 *    caption-buttons.vue 与 constants.ts）。
 *
 * 浏览器实测（2026-10-13，Playwright + 系统 Chrome，1280×900 / DPR 1；脚本
 * temp/pw-app-window.mjs，页面 /components/app-window；以下结论可复现）：
 *   标题栏高度 32（无头部插槽）/ 48（有头部插槽）；窗口圆角 8px、描边 1px、
 *   内容区 `overflow: clip`；标题 12px、副标题 `rgb(66,66,66)`（colorNeutralForeground2）；
 *   返回按钮 40 宽 × 44 高（Stretch − Margin 2×2）、圆角 4px、左缘偏移 5
 *   （1px 描边 + 2 内边距 + 2 Margin）；
 *   失活：`data-active=false`、标题 `rgb(97,97,97)`（colorNeutralForeground3）；
 *   最大化：圆角 `0px`、`box-shadow: none`、caption 字形 `data-glyph=restore`；
 *   `motion="none"` ⇒ `transition-duration: 0s`；`motion="auto"` ⇒
 *   `transition-property: border-radius, box-shadow, background-color`；
 *   组件不写 `z-index`（`auto`）也不写 `position`（`static`）；
 *   真实指针拖拽：`data-dragging` 在拖动中为 true，外壳按 `dragMove` 的累计位移把窗口
 *   移动了 +60 / +40 px（脚本断言），`dragEnd` 后回到 false。
 *   Compact：视口压到 640 宽（中段 220px 输入框放不下）⇒ `data-display-mode=compact`、
 *   标题 `display: none`、中段 `justify-content: flex-start`；视口恢复后回到 `expanded`。
 *   —— 该路径在本实现里额外做了两件事（见 use-titlebar-display-mode.ts 的逐条说明）：
 *   退出判据用**严格大于**阈值（Web 里「进折叠」本身会改变中段可用宽，沿用源码 `>=`
 *   会在同一宽度上自激振荡），并加**测量防抖 + 连续两次一致的翻转闸门**（ResizeObserver
 *   在一次改尺寸里会给出多轮瞬时布局）。
 */
export type {
  FluereAppWindowDisplayMode,
  FluereAppWindowDragEndEventArgs,
  FluereAppWindowDragMoveEventArgs,
  FluereAppWindowDragStartEventArgs,
  FluereAppWindowLeftHeaderSpacing,
  FluereAppWindowProps,
  FluereAppWindowProps as AppWindowProps,
  FluereAppWindowTitleBarDoubleClickEventArgs,
  FluereAppWindowTitleBarSize,
} from './types'
</script>

<script setup lang="ts">
import { useScopeMessages } from '@fluere-vue/hooks'
import { FluentIconArrowLeft16Regular, FluentIconNavigation16Regular } from '@fluere-vue/icons'
import { computed, useSlots } from 'vue'
import FluereCaptionButtons from './caption-buttons.vue'
import { appWindowLocale } from './locale'
import type {
  FluereAppWindowDragEndEventArgs,
  FluereAppWindowDragMoveEventArgs,
  FluereAppWindowDragStartEventArgs,
  FluereAppWindowProps,
  FluereAppWindowTitleBarDoubleClickEventArgs,
  FluereAppWindowTitleBarSize,
} from './types'
import { useDragRegion } from './use-drag-region'
import { useTitleBarDisplayMode } from './use-titlebar-display-mode'

defineOptions({ name: 'FluereAppWindow' })

const props = withDefaults(defineProps<FluereAppWindowProps>(), {
  title: '',
  subtitle: '',
  isBackButtonVisible: false,
  isBackButtonEnabled: true,
  isPaneToggleButtonVisible: false,
  showCaptionButtons: true,
  draggable: true,
  roundToInteger: false,
  label: undefined,
  motion: 'auto',
  maximized: false,
  isMinimizable: true,
  isMaximizable: true,
  isClosable: true,
  active: true,
  labels: undefined,
  locale: undefined,
})

const emit = defineEmits<{
  /** 返回按钮被点击（对应 WinUI `BackRequested`，`args` 为 null） */
  'backRequested': []
  /** 导航（汉堡）按钮被点击（对应 WinUI `PaneToggleRequested`） */
  'paneToggleRequested': []
  /** caption：最大化 / 还原的切换意图（`v-model:maximized`） */
  'update:maximized': [value: boolean]
  /** caption：最小化意图（组件不改窗口状态） */
  'minimize': []
  /** caption：最大化意图 */
  'maximize': []
  /** caption：还原意图 */
  'restore': []
  /** caption：关闭意图 */
  'close': []
  /** 标题栏拖拽开始（仅当按下点落在可拖拽区） */
  'dragStart': [args: FluereAppWindowDragStartEventArgs]
  /** 标题栏拖拽移动（逐次位移 + 累计位移） */
  'dragMove': [args: FluereAppWindowDragMoveEventArgs]
  /** 标题栏拖拽结束（`canceled` 表示 Esc / pointercancel / 失去捕获） */
  'dragEnd': [args: FluereAppWindowDragEndEventArgs]
  /** 标题栏双击（Win11 系统行为是切换最大化；组件不自行改状态） */
  'titlebarDoubleClick': [args: FluereAppWindowTitleBarDoubleClickEventArgs]
}>()

const slots = useSlots()

const hasLeftHeader = computed(() => Boolean(slots['left-header']))
const hasTitlebarContent = computed(() => Boolean(slots['titlebar-content']))
const hasRightHeader = computed(() => Boolean(slots['right-header']))
const hasIcon = computed(() => Boolean(slots.icon))
const hasTitleBarSlot = computed(() => Boolean(slots.titlebar))

/**
 * 高度档位：对齐 `TitleBar.cpp#UpdateHeight()` —— Content / LeftHeader / RightHeader
 * **三者全空才 32**，否则 48（与 `Title` / `Subtitle` 是否设置无关）。
 */
const titleBarSize = computed<FluereAppWindowTitleBarSize>(() =>
  hasLeftHeader.value || hasTitlebarContent.value || hasRightHeader.value ? 'expanded' : 'compact',
)

/** 左头间距档位：对齐 `UpdateLeftHeaderSpacing()`（两者都可见或都不可见 → 默认 14） */
const leftHeaderSpacing = computed(() =>
  props.isBackButtonVisible === props.isPaneToggleButtonVisible ? 'default' : 'negative-inset',
)

/** 根可访问名：对齐 `TitleBarAutomationPeer::GetNameCore()`（空则回退 `Title`） */
const rootLabel = computed(() => {
  const explicit = props.label ?? ''
  if (explicit !== '') {
    return explicit
  }
  return props.title === '' ? undefined : props.title
})

/** 内建文案：scope=`app-window`（Back / Toggle Navigation，见 locale.ts） */
const i18n = useScopeMessages('app-window', appWindowLocale, () => props.locale)
const backLabel = computed(() => i18n.t('back'))
const backTooltip = computed(() => i18n.t('backTooltip'))
const paneToggleLabel = computed(() => i18n.t('toggleNavigation'))
const paneToggleTooltip = computed(() => i18n.t('toggleNavigationTooltip'))

const {
  isDragging,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onLostPointerCapture,
  onDoubleClick,
} = useDragRegion({
  enabled: () => props.draggable,
  roundToInteger: props.roundToInteger,
  onStart: (args) => emit('dragStart', args),
  onMove: (args) => emit('dragMove', args),
  onEnd: (args) => emit('dragEnd', args),
  onDoubleClick: (args) => emit('titlebarDoubleClick', args),
})

const { titleBarRef, contentCellRef, measureRef, displayMode } = useTitleBarDisplayMode(
  () => hasTitlebarContent.value && !hasTitleBarSlot.value,
  () => [props.title, props.subtitle, props.locale, hasTitlebarContent.value],
)
</script>

<template>
  <div
    class="fui-app-window"
    role="group"
    :aria-label="rootLabel"
    :data-titlebar-size="titleBarSize"
    :data-display-mode="displayMode"
    :data-left-header-spacing="leftHeaderSpacing"
    :data-active="active"
    :data-maximized="maximized"
    :data-motion="motion"
    :data-dragging="isDragging"
  >
    <!-- 标题栏：整条属「非客户区」（WinUI 口径），可交互区域由 use-drag-region 抠洞 -->
    <div
      ref="titleBarRef"
      class="fui-app-window__titlebar"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerCancel"
      @lostpointercapture="onLostPointerCapture"
      @dblclick="onDoubleClick"
    >
      <template v-if="!hasTitleBarSlot">
        <!-- 列 0：TitleBarLeftPaddingWidth（WinUI 运行期被 LeftInset 覆盖，Web 无此值） -->
        <span
          class="fui-app-window__padding"
          aria-hidden="true"
        />

        <!-- 列 1：PART_BackButton（IconSource 用 AnimatedIcon + E72B 回退字形） -->
        <button
          v-if="isBackButtonVisible"
          type="button"
          class="fui-app-window__nav-button fui-app-window__nav-button--back"
          data-fui-app-window-nodrag
          :disabled="!isBackButtonEnabled"
          :aria-label="backLabel"
          :title="backTooltip"
          @click="emit('backRequested')"
        >
          <slot name="back-icon">
            <FluentIconArrowLeft16Regular />
          </slot>
        </button>

        <!-- 列 2：PART_PaneToggleButton（E700 = 汉堡） -->
        <button
          v-if="isPaneToggleButtonVisible"
          type="button"
          class="fui-app-window__nav-button fui-app-window__nav-button--pane-toggle"
          data-fui-app-window-nodrag
          :aria-label="paneToggleLabel"
          :title="paneToggleTooltip"
          @click="emit('paneToggleRequested')"
        >
          <slot name="pane-toggle-icon">
            <FluentIconNavigation16Regular />
          </slot>
        </button>

        <!-- 列 3：PART_LeftHeaderPresenter（属 passthrough ⇒ 不可拖拽） -->
        <div
          v-if="hasLeftHeader"
          class="fui-app-window__left-header"
          data-fui-app-window-nodrag
        >
          <slot name="left-header" />
        </div>

        <!-- 列 4：LeftHeaderPaddingColumn（14，NegativeInsetSpacing 时 2） -->
        <span
          class="fui-app-window__left-header-padding"
          aria-hidden="true"
        />

        <!-- 列 5：PART_Icon（Viewbox，MaxWidth/MaxHeight = 16；图标区**仍可拖拽**） -->
        <span
          v-if="hasIcon"
          class="fui-app-window__icon"
        >
          <slot name="icon" />
        </span>

        <!-- 列 6 / 7：Title / Subtitle（12px / Normal；Compact 时被 DisplayModeGroup 折叠） -->
        <span
          v-if="title !== ''"
          class="fui-app-window__title"
          >{{ title }}</span
        >
        <span
          v-if="subtitle !== ''"
          class="fui-app-window__subtitle"
          >{{ subtitle }}</span
        >

        <!-- 列 8：PART_ContentPresenterGrid（Content = 标题栏中段，**不是**窗口内容区） -->
        <div
          v-if="hasTitlebarContent"
          ref="contentCellRef"
          class="fui-app-window__titlebar-content"
          data-fui-app-window-nodrag
        >
          <slot name="titlebar-content" />
        </div>

        <!-- 列 9：PART_RightHeaderPresenter -->
        <div
          v-if="hasRightHeader"
          class="fui-app-window__right-header"
          data-fui-app-window-nodrag
        >
          <slot name="right-header" />
        </div>

        <!-- 列 10：TitleBarMinDragRegionWidth（模板里无元素占位，纯保留拖拽区） -->
        <span
          class="fui-app-window__min-drag-region"
          aria-hidden="true"
        />
      </template>

      <!-- 逃生舱：整条标题栏替换（caption 按钮仍由本组件渲染，见 showCaptionButtons） -->
      <div
        v-else
        class="fui-app-window__titlebar-custom"
      >
        <slot name="titlebar" />
      </div>

      <!-- 列 11：RightPadding —— WinUI 里被 RightInset（= caption 区宽 138）覆盖 -->
      <div
        v-if="showCaptionButtons"
        class="fui-app-window__caption-area"
        data-fui-app-window-nodrag
      >
        <FluereCaptionButtons
          :maximized="maximized"
          :is-minimizable="isMinimizable"
          :is-maximizable="isMaximizable"
          :is-closable="isClosable"
          :active="active"
          :labels="labels"
          :locale="locale"
          @update:maximized="emit('update:maximized', $event)"
          @minimize="emit('minimize')"
          @maximize="emit('maximize')"
          @restore="emit('restore')"
          @close="emit('close')"
        />
      </div>
    </div>

    <!-- 内容区：本组件只控制可视区域（`overflow: clip`），滚动由消费方（如 FluereScrollView）负责 -->
    <div class="fui-app-window__content">
      <slot name="content"><slot /></slot>
    </div>

    <!--
      隐藏镜像：量中段内容的「期望宽」（对齐 `contentArea.DesiredSize().Width`）。
      `visibility: hidden` + `aria-hidden` + `inert`，不参与布局、不进无障碍树、不可聚焦。
    -->
    <div
      v-if="hasTitlebarContent && !hasTitleBarSlot"
      ref="measureRef"
      class="fui-app-window__measure"
      aria-hidden="true"
      inert
    >
      <div
        class="fui-app-window__measure-item"
        data-fui-app-window-measure
      >
        <slot name="titlebar-content" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ------------------------------------------------------------------ */
/* 所有值均引用 Fluent 语义 token（var(--TokenName)），见 fluent-tokens  */
/* 明暗主题由 tokens.css 的 light-dark() + color-scheme 自动切换        */
/*                                                                     */
/* WinUI 数值资源（TitleBar_themeresources.xaml）一律落成组件局部变量：  */
/*   TitleBarCompactHeight = 32 / TitleBarExpandedHeight = 48           */
/*     → --fui-app-window-titlebar-height（由 data-titlebar-size 切换）  */
/*   TitleBarBackButtonWidth / TitleBarPaneToggleButtonWidth = 40       */
/*     → --fui-app-window-nav-button-width                              */
/*   按钮 Margin = 2、ControlCornerRadius = 4                            */
/*     → --fui-app-window-nav-button-margin / --…-nav-button-radius      */
/*   TitleBarLeftPaddingWidth = 2 → --fui-app-window-left-padding        */
/*   TitleBarLeftHeaderPaddingWidth = 14 / NegativeInset 2              */
/*     → --fui-app-window-left-header-padding（由 data-left-header-spacing 切换）*/
/*   TitleBarMinDragRegionWidth = 48 → --fui-app-window-min-drag-region  */
/*   TitleBarIconMaxWidth/Height = 16 → --fui-app-window-icon-size       */
/*   TitleBarDeactivatedOpacity = 0.5                                    */
/*     → --fui-app-window-deactivated-opacity                            */
/*   标题 / 副标题 = CaptionTextBlockStyle（CaptionTextBlockFontSize=12） */
/*     → fontSizeBase200 + lineHeightBase200                             */
/*   caption 区宽 = 3×46 = 138（对应 AppWindowTitleBar.RightInset）      */
/*     → --fui-app-window-caption-area-width（仅用于文档/说明，实际由子组件撑开）*/
/*                                                                     */
/* 状态切换不加过渡：`GoToState(..., false)` 全是零时长离散跳变；唯一带过渡 */
/* 的是「最大化 / 失活的窗口框体」（圆角 / 阴影 / 底色），且仅在             */
/* data-motion='auto' 时启用（respect prefers-reduced-motion）。          */
/* ------------------------------------------------------------------ */

.fui-app-window {
  --fui-app-window-surface: var(--colorNeutralBackground2);
  --fui-app-window-border: var(--colorNeutralStroke2);
  --fui-app-window-radius: var(--borderRadiusXLarge);
  --fui-app-window-radius-maximized: var(--borderRadiusNone);
  --fui-app-window-shadow: var(--shadow64);
  --fui-app-window-titlebar-height: 32px;
  --fui-app-window-left-padding: 2px;
  --fui-app-window-left-header-padding: 14px;
  --fui-app-window-min-drag-region: 48px;
  --fui-app-window-icon-size: 16px;
  --fui-app-window-nav-button-width: 40px;
  --fui-app-window-nav-button-margin: 2px;
  --fui-app-window-nav-button-radius: var(--borderRadiusMedium);
  --fui-app-window-deactivated-opacity: 0.5;
  --fui-app-window-caption-area-width: 138px;
  --fui-app-window-transition-duration: var(--durationNormal);
  --fui-app-window-transition-curve: var(--curveDecelerateMid);

  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  min-block-size: 0;
  overflow: clip;
  border: var(--strokeWidthThin) solid var(--fui-app-window-border);
  border-radius: var(--fui-app-window-radius);
  background-color: var(--fui-app-window-surface);
  box-shadow: var(--fui-app-window-shadow);
  color: var(--colorNeutralForeground1);
}

/* 高度档位：有 LeftHeader / Content / RightHeader 用时 48（UpdateHeight） */
.fui-app-window[data-titlebar-size='expanded'] {
  --fui-app-window-titlebar-height: 48px;
}

/* 最大化：DWM 下窗口圆角归零、阴影消失（无 A 级 XAML 资源，见文件头） */
.fui-app-window[data-maximized='true'] {
  border-radius: var(--fui-app-window-radius-maximized);
  box-shadow: none;
}

/* 可拖拽区把手型：WinUI 标题栏是系统拖动区，光标仍是默认箭头（不是 move） */
.fui-app-window__titlebar {
  --fui-app-window-left-header-padding: 14px;

  display: grid;
  grid-template-columns:
    var(--fui-app-window-left-padding) auto auto auto
    var(--fui-app-window-left-header-padding) auto auto auto
    minmax(0, 1fr) auto var(--fui-app-window-min-drag-region) auto;
  align-items: center;
  box-sizing: border-box;
  flex: none;
  block-size: var(--fui-app-window-titlebar-height);
  /* 标题栏内文本不可选中（WinUI 里它属非客户区） */
  user-select: none;
}

/* 左头间距：恰好一个按钮可见时压到 2（LeftHeaderSpacingGroup） */
.fui-app-window[data-left-header-spacing='negative-inset'] .fui-app-window__titlebar {
  --fui-app-window-left-header-padding: 2px;
}

.fui-app-window[data-dragging='true'] .fui-app-window__titlebar {
  cursor: default;
}

/* ---- 标题栏各列 ---- */
.fui-app-window__padding {
  grid-column: 1 / 2;
  inline-size: var(--fui-app-window-left-padding);
}

.fui-app-window__left-header {
  grid-column: 4 / 5;
  display: flex;
  align-items: center;
  min-inline-size: 0;
}

.fui-app-window__left-header-padding {
  grid-column: 5 / 6;
  inline-size: var(--fui-app-window-left-header-padding);
}

.fui-app-window__icon {
  grid-column: 6 / 7;
  display: flex;
  align-items: center;
  justify-content: center;
  /* Viewbox：MaxWidth/MaxHeight = 16，等比缩放 */
  max-inline-size: var(--fui-app-window-icon-size);
  max-block-size: var(--fui-app-window-icon-size);
  /* TitleBarIconMargin = 0,0,16,0 */
  margin-inline-end: var(--spacingHorizontalL);
  line-height: 0;
}

.fui-app-window__icon :deep(svg) {
  display: block;
  max-inline-size: 100%;
  max-block-size: 100%;
}

.fui-app-window__title,
.fui-app-window__subtitle {
  min-inline-size: 0;
  overflow: hidden;
  font-size: var(--fontSizeBase200);
  font-weight: var(--fontWeightRegular);
  line-height: var(--lineHeightBase200);
  white-space: nowrap;
  /* TextTrimming = CharacterEllipsis */
  text-overflow: ellipsis;
}

.fui-app-window__title {
  /* 列 6；TitleBarTitleMargin = 0,0,8,0；前景 = 控件 Foreground */
  grid-column: 7 / 8;
  margin-inline-end: var(--spacingHorizontalS);
  color: inherit;
}

.fui-app-window__subtitle {
  /* 列 7；TitleBarSubtitleMargin = 0,0,16,0；TitleBarSubtitleForegroundBrush */
  grid-column: 8 / 9;
  margin-inline-end: var(--spacingHorizontalL);
  color: var(--colorNeutralForeground2);
}

.fui-app-window__titlebar-content {
  grid-column: 9 / 10;
  display: flex;
  align-items: center;
  justify-content: center;
  min-inline-size: 0;
}

.fui-app-window__right-header {
  grid-column: 10 / 11;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-inline-size: 0;
}

.fui-app-window__min-drag-region {
  grid-column: 11 / 12;
  inline-size: var(--fui-app-window-min-drag-region);
}

.fui-app-window__caption-area {
  grid-column: 12 / 13;
  display: flex;
  /* 顶端对齐：48 高标题栏里 caption 按钮只占顶部 32（参考图实测，见 constants.ts） */
  align-self: flex-start;
}

.fui-app-window__titlebar-custom {
  grid-column: 1 / 12;
  display: flex;
  align-items: center;
  min-inline-size: 0;
}

/*
 * Compact：对齐 `DisplayModeGroup` —— 它声明在 `TitleTextGroup` 之后，
 * 两组都写 `PART_TitleText.Visibility` 时 Compact 胜出（标题 / 副标题折叠）。
 * `PART_ContentPresenter` 由 Center 改 Left，并加 `TitleBarCompactContentMargin` 0,0,16,0。
 */
.fui-app-window[data-display-mode='compact'] .fui-app-window__title,
.fui-app-window[data-display-mode='compact'] .fui-app-window__subtitle {
  display: none;
}

.fui-app-window[data-display-mode='compact'] .fui-app-window__titlebar-content {
  justify-content: flex-start;
  margin-inline-end: var(--spacingHorizontalL);
}

/* ---- 返回 / 导航按钮（TitleBarBackButtonStyle / TitleBarPaneToggleButtonStyle） ---- */
.fui-app-window__nav-button {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  inline-size: var(--fui-app-window-nav-button-width);
  /* VerticalAlignment = Stretch */
  block-size: calc(
    var(--fui-app-window-titlebar-height) - 2 * var(--fui-app-window-nav-button-margin)
  );
  margin: var(--fui-app-window-nav-button-margin);
  padding: 0;
  border: none;
  border-radius: var(--fui-app-window-nav-button-radius);
  background-color: var(--colorSubtleBackground);
  color: var(--colorNeutralForeground1);
  cursor: default;
  /* FontSize = 16（AnimatedIcon / FontIconSource 均为 16×16） */
  line-height: 0;
}

.fui-app-window__nav-button--back {
  grid-column: 2 / 3;
}

.fui-app-window__nav-button--pane-toggle {
  grid-column: 3 / 4;
}

.fui-app-window__nav-button:hover {
  background-color: var(--colorSubtleBackgroundHover);
}

.fui-app-window__nav-button:active {
  background-color: var(--colorSubtleBackgroundPressed);
  color: var(--colorNeutralForeground2);
}

.fui-app-window__nav-button:disabled {
  background-color: var(--colorNeutralBackgroundDisabled);
  color: var(--colorNeutralForegroundDisabled);
}

/* 焦点矩形：WinUI 双层（外 2px colorStrokeFocus2 + 内 1px colorStrokeFocus1），
   与 caption 按钮一致；0.4.3 的 useFocusVisual 落地后收敛到该原语。 */
.fui-app-window__nav-button:focus-visible {
  outline: none;
  box-shadow:
    inset 0 0 0 var(--strokeWidthThick) var(--colorStrokeFocus2),
    inset 0 0 0 calc(var(--strokeWidthThick) + var(--strokeWidthThin)) var(--colorStrokeFocus1);
}

/* ---- 失活（非前台）态：对齐 OnInputActivationChanged ----
   标题 / 副标题换前景（TitleBarDeactivatedForegroundBrush）；
   图标 / 左头 / 中段 / 右头只改 Opacity（TitleBarDeactivatedOpacity = 0.5）。 */
.fui-app-window[data-active='false'] .fui-app-window__title {
  color: var(--colorNeutralForeground3);
}

.fui-app-window[data-active='false'] .fui-app-window__subtitle {
  color: var(--colorNeutralForeground3);
}

.fui-app-window[data-active='false'] .fui-app-window__icon,
.fui-app-window[data-active='false'] .fui-app-window__left-header,
.fui-app-window[data-active='false'] .fui-app-window__titlebar-content,
.fui-app-window[data-active='false'] .fui-app-window__right-header {
  opacity: var(--fui-app-window-deactivated-opacity);
}

/* ---- 内容区：只控制「可视区域」，不负责滚动 ---- */
.fui-app-window__content {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-block-size: 0;
  overflow: clip;
}

/* ---- 隐藏镜像（量中段期望宽；不参与布局、不进无障碍树） ---- */
.fui-app-window__measure {
  position: absolute;
  visibility: hidden;
  overflow: hidden;
  inline-size: 0;
  block-size: 0;
  pointer-events: none;
}

.fui-app-window__measure-item {
  inline-size: max-content;
}

/*
 * 组件自有过渡：只在 data-motion='auto' 时挂（`motion='none'` 与
 * prefers-reduced-motion 下都是瞬时切换，对应 WinUI `GoToState(..., false)` 的零时长）。
 * 只覆盖「窗口框体」的圆角 / 阴影 / 底色；标题栏内部状态一律没有过渡。
 */
.fui-app-window[data-motion='auto'] {
  transition:
    border-radius var(--fui-app-window-transition-duration) var(--fui-app-window-transition-curve),
    box-shadow var(--fui-app-window-transition-duration) var(--fui-app-window-transition-curve),
    background-color var(--fui-app-window-transition-duration)
      var(--fui-app-window-transition-curve);
}

@media (prefers-reduced-motion: reduce) {
  .fui-app-window[data-motion='auto'] {
    transition: none;
  }
}
</style>
