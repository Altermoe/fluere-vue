<script lang="ts">
/**
 * FluereInfoBar 组件 Props 契约
 *
 * 设计规范来源：WinUI 3 / Windows App SDK
 *   microsoft-ui-xaml `winui3/release/2.5.1`（commit ba3a8d5，本地快照 temp/winui-src）
 *   已核对版本漂移：`git diff --stat winui3/release/2.0.1 winui3/release/2.5.1 --
 *   src/controls/dev/InfoBar` 只命中 `InfoBar.vcxitems`（多 6 行 Type=StylePerf2026
 *   构建条目）；`InfoBar.xaml` / `InfoBar_themeresources.xaml` / `InfoBar.cpp` /
 *   `InfoBar.h` / `InfoBar.idl` / `InfoBarPanel.cpp` / `InfoBarAutomationPeer.cpp`
 *   在两个 tag 间逐字节一致，故本地快照即最新 WinUI3 Gallery 发行版 v2.9.3
 *   （WindowsAppSDK 2.0.1）的行为基准。Gallery 侧用法见
 *   `WinUI-Gallery` v2.9.3 `WinUIGallery/Samples/InfoBar/InfoBarPage.xaml`。
 *
 * 读到的规范（文件 → 结论）：
 *  - InfoBar.idl：`IsOpen` 默认 false、`IsIconVisible` / `IsClosable` 默认 true、
 *    `Severity` 默认 Informational；事件面 = CloseButtonClick / Closing(可 Cancel) /
 *    Closed / Opened；`TemplateSettings.IconElement` 承载 `IconSource` 对应的图标元素。
 *  - InfoBar.xaml：#2 外层 Border（`InfoBarBorderBrush` + `InfoBarBorderThickness`=1 +
 *    `CornerRadius`=`ControlCornerRadius`=4）；#3 内层 Grid `MinHeight`=`InfoBarMinHeight`=48、
 *    `Padding`=`InfoBarContentRootPadding`=16,0,0,0、背景 = `TemplateBinding Background`
 *    （默认 Transparent，用来压过 Severity 底色）；三列（图标 Auto / 内容 * / 关闭 Auto）
 *    × 两行（Banner / Content）；`SeverityLevels` 组只改底色与图标字形/前景；
 *    `IconStates` 三态（StandardIcon / UserIcon / NoIcon）；`IsClosable` → 关闭按钮
 *    显隐；`IsOpen` → `ContentRoot.Visibility`；`Title=='' && Message=='' && !ActionButton`
 *    → `ContentArea.Grid.Row=0`（内容上移）。
 *  - InfoBar_themeresources.xaml：`InfoBarMinHeight`=48、`InfoBarCloseButtonSize`=38、
 *    `InfoBarCloseButtonGlyphSize`=16、`InfoBarIconFontSize`=16、`InfoBarIconMargin`=0,16,14,16、
 *    `InfoBarPanelMargin`=0,0,16,0、竖排 Panel 内边距 0,14,0,18、Title/Message 字号 14
 *    （SemiBold / Normal）、`InfoBarCloseButtonStyle` = DefaultButtonStyle + 38×38 + Margin 5 +
 *    VerticalAlignment=Top（并按 `AppBarButton*` 资源重定义按钮底色与前景）。
 *  - InfoBar.cpp：Severity → VisualState 名（Informational / Success / Warning / Error）；
 *    关闭按钮 → `IsOpen=false` → `Closing`（`Cancel=true` 时把 `IsOpen` 回滚为 true）→
 *    `Closed`；`IsOpen=true` → `Opened`；`UpdateForeground`：只有消费方显式设过 Foreground
 *    才把 Title/Message 前景改成它。
 *  - InfoBarPanel.cpp#MeasureOverride：方向判定判据（见 `layout.ts`）。
 *  - InfoBarAutomationPeer.cpp：`ControlType=StatusBar`；Error / Warning 用
 *    `ImportantAll` 发通知，其余 `CurrentThenMostRecent`。
 *
 * WinUI 资源名 → Fluent token 映射（取值一律走 `var(--TokenName)`，见 style 块内注释）：
 *   InfoBarInformationalSeverityBackgroundBrush ← SystemFillColorAttentionBackground
 *     → colorNeutralCardBackground
 *   InfoBarSuccessSeverityBackgroundBrush       ← SystemFillColorSuccessBackground
 *     → colorStatusSuccessBackground1
 *   InfoBarWarningSeverityBackgroundBrush       ← SystemFillColorCautionBackground
 *     → colorStatusWarningBackground1
 *   InfoBarErrorSeverityBackgroundBrush         ← SystemFillColorCriticalBackground
 *     → colorPaletteRedBackground1
 *   四档底色都是「语义位最近」而非同值：Fluent 2 Web 的 token 表里没有
 *   `SystemFillColor{Attention,Success,Caution,Critical}Background` 的同值项，
 *   逐项按 max(亮色 ΔE, 暗色 ΔE) 最小挑选（CIE ΔE76；实测输出见 temp/pw-infobar.mjs）：
 *     informational #F4F4F4/#323232 ← colorNeutralCardBackground    ΔE  2.1 /  0.5
 *     success       #DFF6DD/#393D1B ← colorStatusSuccessBackground1 ΔE 10.1 / 18.4
 *     warning       #FFF4CE/#433519 ← colorStatusWarningBackground1 ΔE 17.5 / 18.5
 *     error         #FDE7E9/#442726 ← colorPaletteRedBackground1    ΔE  6.8 / 12.8
 *   需要严格对齐实机时，消费方可用 CSS 覆盖组件内的两个局部变量：
 *     .my-infobar { --fui-infobar-bg: #DFF6DD; --fui-infobar-icon-bg: #0F7B0F; }
 *   InfoBarInformationalSeverityIconBackground  ← AccentFillColorDefaultBrush
 *     → colorCompoundBrandBackground（系统强调色 → Fluent 默认强调色）
 *   InfoBarSuccess/Warning/ErrorSeverityIconBackground
 *     → colorStatusSuccessForeground3 / colorPaletteYellowForeground1 /
 *       colorStatusDangerForeground3（沿用 ProgressBar 的同类映射）
 *   InfoBar*SeverityIconForeground ← TextFillColorInverse
 *     → 不映射：Fluent System Icons 的 `*_16_filled` 是「实心圆 + 镂空字形」的单色图形，
 *       字形由镂空露出 InfoBar 底色（参考图字形实测近白，16px 下与实机不可分辨），
 *       详见 `.fui-infobar__icon-glyph` 处的对照说明。
 *   InfoBarTitleForeground / InfoBarMessageForeground ← TextFillColorPrimary
 *     → colorNeutralForeground1
 *   InfoBarBorderBrush ← CardStrokeColorDefault（#0F000000，与 ControlStrokeColorDefault 同值）
 *     → colorNeutralStrokeAlpha（与 input.vue 的同一资源映射保持一致）
 *   InfoBarCloseButtonStyle（AppBarButton* 资源）→ colorSubtleBackground / …Hover /
 *     …Pressed；前景 colorNeutralForeground1 / 按下 colorNeutralForeground2
 *
 * 与 WinUI 的差异（有意为之，逐条记录）：
 *  - **四档 Severity 底色无同值 token**：WinUI 的 `SystemFillColor*Background` 在 Fluent 2 Web
 *    里没有同值项，按 `max(亮色 ΔE, 暗色 ΔE)` 最小挑语义位最近的 token（逐项数值见上方映射表），
 *    warning 一档差距最大（ΔE 17.5 / 18.5），需要严格对齐时用 `--fui-infobar-bg` 覆盖。
 *  - **图标墨迹比实机小 1px**：Segoe Fluent Icons 的圆心墨迹在 16pt 下为 15px 且贴齐 em 框左缘，
 *    Fluent System Icons 的 `*_16_filled` 圆心是 `r=7`（14px、居中）；实测右缘对齐、左缘内缩 1px
 *    （`iconLeft` +17 vs 参考 +16），其余结构量与参考图偏差 ≤ 1px（见 temp/pw-infobar.mjs）。
 *  - **关闭按钮 hover / pressed 底色是实色档**：WinUI 用 `SubtleFillColorSecondary`（5.9% 黑）/
 *    `Tertiary`（6% 黑）两个半透明档，Fluent 2 Web 无同值项，取 `colorSubtleBackgroundHover`
 *    （Light #f5f5f5 = 在黑字底上约 3.9% 黑）/ `…Pressed`（#e0e0e0 ≈ 12% 黑）——
 *    同语义族、按下反馈略重于实机。
 *  - `IconSource` → `#icon` 插槽（Web 侧无法传 `IconSource` 对象）；
 *    `Content` / `ContentTemplate` → `#content`（别名 `#default`）插槽；
 *    `ActionButton` → `#action` 插槽；`CloseButtonStyle` 不暴露（样式固定在本组件内）。
 *  - 关闭按钮文案：WinUI 取资源 `InfoBarCloseButtonName` / `InfoBarCloseButtonTooltip`
 *    （英文 "Close"）。本库暂无组件内建文案通道（i18n 属 0.3.0 目标 1.4），故做成
 *    `closeButtonLabel` / `closeButtonTooltip` 两个 Prop，缺省不渲染 —— 组件不硬编码
 *    任何自然语言（同 NumberBox 的 `increaseLabel` / `decreaseLabel` 口径）。
 *  - 打开 / 关闭的 UIA 通知（`InfoBarOpenedNotification` / `InfoBarClosedNotification`）
 *    是 UIA NotificationEvent，并不映射到 ARIA live region；本库同样不引入 `aria-live`，
 *    避免在 Web 上产生 WinUI 没有的朗读行为。
 *  - 高对比度主题（WinUI HC：底色 `SystemColorWindowColorBrush`、描边 2px、图标用
 *    `Highlight` / `HighlightText`）本轮不实现，属已知缺口。
 */
export type {
  FluereInfoBarClosedEventArgs,
  FluereInfoBarClosingEventArgs,
  FluereInfoBarCloseReason,
  FluereInfoBarProps,
  FluereInfoBarProps as InfoBarProps,
  FluereInfoBarSeverity,
} from './types'
</script>

<script setup lang="ts">
import { FluentIconDismiss16Regular } from '@fluere-vue/icons'
import { computed, defineComponent, h, nextTick, useSlots, watch } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import FluereTooltip from '../tooltip/tooltip.vue'
import { INFO_BAR_SEVERITY_ICONS } from './constants'
import type { FluereInfoBarCloseReason, FluereInfoBarProps } from './types'
import { useInfoBarLayout } from './use-infobar-layout'

defineOptions({ name: 'FluereInfoBar' })

/**
 * 关闭按钮没有提示文案时的宿主：只把插槽原样渲染出来（不产生额外 DOM 层级）。
 * 这样关闭按钮永远是 Grid 第 3 列的直接子项，拿到的布局与是否包 Tooltip 无关 ——
 * reka 的 `TooltipRoot` 是渲染上下文的提供者，不产出 DOM，不会打乱 Grid 列。
 */
const PassthroughHost = defineComponent({
  name: 'FluereInfoBarPassthrough',
  setup:
    (_props, { slots }) =>
    () =>
      slots.default?.(),
})

const props = withDefaults(defineProps<FluereInfoBarProps>(), {
  open: false,
  title: '',
  message: '',
  severity: 'informational',
  isIconVisible: true,
  isClosable: true,
  label: undefined,
  closeButtonLabel: undefined,
  closeButtonTooltip: undefined,
  closeButtonCommand: undefined,
})

const emit = defineEmits<{
  /** `v-model:open` 的更新（对应 WinUI `IsOpen` 被改写） */
  'update:open': [value: boolean]
  /** 内容已展开（对应 WinUI `InfoBar.Opened`） */
  'opened': []
  /**
   * 请求关闭（对应 WinUI `InfoBar.Closing`）：把 `args.cancel` 置为 true 可取消，
   * 组件会把 `open` 回滚为 true。
   */
  'closing': [args: { reason: FluereInfoBarCloseReason; cancel: boolean }]
  /** 已关闭（对应 WinUI `InfoBar.Closed`） */
  'closed': [args: { reason: FluereInfoBarCloseReason }]
  /** 关闭按钮被点击（对应 WinUI `InfoBar.CloseButtonClick`），先于 `closing` */
  'closeButtonClick': []
}>()

const slots = useSlots()

const model = defineModel<boolean>('open', { default: false })

/** 内建图标（Severity 决定）；`#icon` 插槽提供时改走 `UserIconVisible` 分支 */
const severityIcon = computed(() => INFO_BAR_SEVERITY_ICONS[props.severity])

const hasUserIcon = computed(() => Boolean(slots.icon))
const hasActionSlot = computed(() => Boolean(slots.action))
/** `Content` / `ContentTemplate` 的等价物：`#content` 优先，`#default` 兼容 */
const hasContentSlot = computed(() => Boolean(slots.content) || Boolean(slots.default))
const hasBannerContent = computed(
  () => props.title !== '' || props.message !== '' || hasActionSlot.value,
)

/**
 * 上一次的关闭原因。对齐 WinUI：`IsOpen` 被置为 true 时重置为 `Programmatic`，
 * 点关闭按钮时先写 `CloseButton` 再走关闭链路（`InfoBar.cpp#OnIsOpenPropertyChanged` /
 * `OnCloseButtonClick`）。非响应式即可——它只是事件载荷的来源。
 */
let lastCloseReason: FluereInfoBarCloseReason = 'programmatic'

const { contentCellRef, measureRef, orientation } = useInfoBarLayout(() => [
  props.title,
  props.message,
  props.severity,
  props.isIconVisible,
  props.isClosable,
  model.value,
  hasUserIcon.value,
  hasActionSlot.value,
  hasContentSlot.value,
])

/** 内容区行号：没有 Banner 内容时上移到第 0 行（对齐 `NoBannerContent` 状态） */
const contentRow = computed(() => (hasBannerContent.value ? 2 : 1))

/** 内容区是否可见（对齐 `ContentRoot.Visibility=Collapsed`） */
const isOpen = computed(() => model.value === true)

/**
 * 关闭链路：**只有**「父组件把 `open` 从 true 改成 false」这一条路径会触发
 * `Closing` → `Closed`（点关闭按钮时先由 `onCloseButtonClick` 写 model，再复用本链路）。
 * 与 WinUI `InfoBar::OnIsOpenPropertyChanged` 一致。
 */
watch(model, (value, previous) => {
  if (value) {
    lastCloseReason = 'programmatic'
    void nextTick(() => {
      emit('opened')
    })
    return
  }
  if (previous !== true) {
    return
  }
  const args = { reason: lastCloseReason, cancel: false }
  emit('closing', args)
  if (args.cancel) {
    // 消费方取消关闭 ⇒ 把 IsOpen 回滚为 true（WinUI 同分支）
    model.value = true
    return
  }
  emit('closed', { reason: lastCloseReason })
})

const onCloseButtonClick = (): void => {
  // WinUI 顺序：先抛 CloseButtonClick，再置 IsOpen=false（随后触发 Closing/Closed）
  emit('closeButtonClick')
  props.closeButtonCommand?.()
  lastCloseReason = 'closeButton'
  model.value = false
}

/** 模板内层 Grid 的模板 ref：测量层据此换算面板的 `availableSize.Width` */
const setGridRef = (ref_: Element | ComponentPublicInstance | null): void => {
  contentCellRef.value = ref_ instanceof HTMLElement ? ref_ : null
}
</script>

<template>
  <div
    class="fui-infobar"
    role="status"
    :data-severity="severity"
    :data-orientation="orientation"
    :data-icon="isIconVisible ? (hasUserIcon ? 'user' : 'standard') : 'none'"
    :data-closable="isClosable ? 'true' : 'false'"
    :data-banner="hasBannerContent ? 'true' : 'false'"
    :aria-label="label ?? undefined"
  >
    <!--
      内层 Grid（对齐模板里的 `Grid` + `ContentRoot`）：
      `display:none` 由 v-if 之外的这层承担 —— 关闭时整块不渲染，
      等价于 XAML 里 `ContentRoot.Visibility = Collapsed`。
    -->
    <div
      v-if="isOpen"
      class="fui-infobar__content"
    >
      <div
        :ref="setGridRef"
        class="fui-infobar__grid"
      >
        <!-- ---- 图标列（第 0 列，跨两行）：NoIconVisible 时连自定义图标一起藏 ---- -->
        <div
          v-if="isIconVisible"
          class="fui-infobar__icon"
          aria-hidden="true"
        >
          <slot name="icon">
            <component
              :is="severityIcon"
              class="fui-infobar__icon-glyph"
              :size="16"
            />
          </slot>
        </div>

        <!-- ---- 排版面板（第 1 列，跨两行）：Title / Message / Action ---- -->
        <div class="fui-infobar__panel">
          <div
            v-if="title !== ''"
            class="fui-infobar__title"
            data-measure-host="title"
          >
            {{ title }}
          </div>
          <div
            v-if="message !== ''"
            class="fui-infobar__message"
            data-measure-host="message"
          >
            {{ message }}
          </div>
          <div
            v-if="hasActionSlot"
            class="fui-infobar__action"
            data-measure-host="action"
          >
            <slot name="action" />
          </div>
        </div>

        <!-- ---- 内容区（第 1 列，行号按 `NoBannerContent` 切换） ---- -->
        <div
          v-if="hasContentSlot"
          class="fui-infobar__body"
          :style="{ gridRow: contentRow }"
        >
          <slot name="content">
            <slot />
          </slot>
        </div>

        <!-- ---- 关闭按钮（第 2 列） ---- -->
        <!-- 关闭按钮的提示走 FluereTooltip（对齐 WinUI 里 `InfoBarCloseButtonTooltip`
             由 ToolTipService 承载），而不是原生 `title`：原生 title 有浏览器内置的
             ~1s 延时且样式不可控，与 WinUI 的 ToolTip 不是同一件东西。
             `closeButtonTooltip` 缺省（本库不硬编码文案）时用 PassthroughHost 直接
             输出按钮，DOM 结构与布局完全不变 -->
        <component
          :is="closeButtonTooltip ? FluereTooltip : PassthroughHost"
          v-if="isClosable"
          v-bind="closeButtonTooltip ? { content: closeButtonTooltip } : {}"
        >
          <button
            type="button"
            class="fui-infobar__close"
            :aria-label="closeButtonLabel ?? undefined"
            @click="onCloseButtonClick"
          >
            <slot name="close-icon">
              <FluentIconDismiss16Regular
                class="fui-infobar__close-glyph"
                :size="16"
              />
            </slot>
          </button>
        </component>
      </div>

      <!--
        隐藏测量层：`InfoBarPanel.cpp#MeasureOverride` 的方向判定需要子项的
        「约束宽 + 期望高」。这里用 `width: max-content` 的镜像量固有尺寸，
        `visibility: hidden` + `aria-hidden` 使其不参与布局、不进无障碍树。
      -->
      <div
        ref="measureRef"
        class="fui-infobar__measure"
        aria-hidden="true"
      >
        <div
          v-if="title !== ''"
          class="fui-infobar__measure-item fui-infobar__title"
          data-measure="title"
        >
          {{ title }}
        </div>
        <div
          v-if="message !== ''"
          class="fui-infobar__measure-item fui-infobar__message"
          data-measure="message"
        >
          {{ message }}
        </div>
        <div
          v-if="hasActionSlot"
          class="fui-infobar__measure-item fui-infobar__action"
          data-measure="action"
        >
          <slot name="action" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ------------------------------------------------------------------ */
/* 所有值均引用 Fluent 语义 token（var(--TokenName)），见 fluent-tokens  */
/* 明暗主题由 tokens.css 的 light-dark() + color-scheme 自动切换        */
/*                                                                     */
/* WinUI 数值资源（InfoBar_themeresources.xaml / InfoBar.xaml），        */
/* 有资源名的一律落成组件局部变量，不写无名魔法值：                       */
/*   InfoBarMinHeight              = 48   → --fui-infobar-min-height    */
/*   InfoBarBorderThickness        = 1    → --fui-infobar-border-width  */
/*   InfoBarCloseButtonSize        = 38   → --fui-infobar-close-size    */
/*   InfoBarCloseButtonGlyphSize   = 16   → --fui-infobar-close-glyph   */
/*   InfoBarIconFontSize           = 16   → --fui-infobar-icon-size     */
/*   InfoBarIconMargin             = 0,16,14,16 → --fui-infobar-icon-*  */
/*   InfoBarCloseButtonStyle.Margin= 5    → --fui-infobar-close-margin  */
/*   InfoBarContentRootPadding     = 16,0,0,0（网格左内边距）             */
/*   InfoBarPanelMargin            = 0,0,16,0（网格右内边距）             */
/*   CornerRadius = ControlCornerRadius = 4 → --borderRadiusMedium      */
/*                                                                     */
/* 配色映射见文件头「WinUI 资源名 → Fluent token」。                     */
/*                                                                     */
/* 动效：InfoBar 的模板里**没有** Storyboard / VisualTransition ——        */
/* Severity 换色与 `IsOpen` 切换都是瞬时的 VisualState 跳转（`GoToState(..., false)`）， */
/* 故这里只给关闭按钮的 hover / pressed 加 `--durationFaster` 过渡       */
/* （对应 AppBarButton 的 ButtonBackgroundPointerOver 过渡时长），        */
/* 并在 prefers-reduced-motion 下关闭。                                  */
/* ------------------------------------------------------------------ */

.fui-infobar {
  --fui-infobar-min-height: 48px;
  --fui-infobar-border-width: 1px;
  --fui-infobar-close-size: 38px;
  --fui-infobar-close-glyph: 16px;
  --fui-infobar-close-margin: 5px;
  --fui-infobar-icon-size: 16px;
  --fui-infobar-icon-margin-top: 16px;
  --fui-infobar-icon-margin-end: 14px;
  --fui-infobar-content-padding-start: 16px;
  --fui-infobar-panel-margin-end: 16px;

  display: block;
  width: 100%;
  box-sizing: border-box;
  /* 排版方向按「内容列的可用宽」实时判定（见 layout.ts / use-infobar-layout.ts） */
  container-type: inline-size;
}

/* ---- 内容壳：Border（1px CardStroke 描边 + 4px 圆角 + 透明底） ---- */
.fui-infobar__content {
  position: relative;
  box-sizing: border-box;
  /* Background = TemplateBinding Background，默认 Transparent（压过 Severity 底色） */
  background-color: var(--colorTransparentBackground);
  border: var(--fui-infobar-border-width) solid var(--colorNeutralStrokeAlpha);
  border-radius: var(--borderRadiusMedium);
  /* 测量层是绝对定位的隐藏层，裁掉它避免出现意外的可滚动溢出 */
  overflow: hidden;
}

/* ---- 内层 Grid：三列 × 两行，MinHeight = InfoBarMinHeight ---- */
.fui-infobar__grid {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  grid-template-rows: auto auto;
  align-items: start;
  min-height: var(--fui-infobar-min-height);
  box-sizing: border-box;
  /* InfoBarContentRootPadding = 16,0,0,0 */
  padding-inline-start: var(--fui-infobar-content-padding-start);
  /* 注意：InfoBarPanelMargin = 0,0,16,0 是**面板**的右边距（见 .fui-infobar__panel），
     不能写成网格的右内边距 —— 那会把关闭按钮列整体左移 16px（参考图实测 −24 → −40）。 */
  /* Severity 底色（`InfoBar*SeverityBackgroundBrush`） */
  background-color: var(--fui-infobar-bg, var(--colorNeutralCardBackground));
}

/* ---- 图标列：StandardIcon / UserIcon 两态都占第 0 列第 0 行 ---- */
.fui-infobar__icon {
  grid-column: 1;
  grid-row: 1;
  display: flex;
  justify-content: center;
  width: var(--fui-infobar-icon-size);
  margin-block: var(--fui-infobar-icon-margin-top) var(--fui-infobar-icon-margin-top);
  margin-inline-end: var(--fui-infobar-icon-margin-end);
  /* 自定义 `#icon` 插槽的默认前景（WinUI 的 IconElement 继承 InfoBar.Foreground
     ⇒ TextFillColorPrimary）；内建字形另见 .fui-infobar__icon-glyph */
  color: var(--colorNeutralForeground1);
  line-height: 0;
}
/*
 * 内建 Severity 图标 = InfoBar*SeverityIconBackground。
 *
 * WinUI 是「F136 实心圆（Severity 底色）+ F13x 字形（TextFillColorInverse 白/黑）」两个
 * 16pt TextBlock 完全重合；Fluent System Icons 的 `*_16_filled` 是**单色**图形
 * （实心圆 + 镂空字形），故 Web 侧用一份图标着 Severity 图标底色，字形由镂空露出
 * InfoBar 底色 —— 参考图图标中心实测为近白（#F0F5FB），在 16px 尺寸下两者不可分辨，
 * 也就不再需要 `TextFillColorInverse` 这一档映射。
 */
.fui-infobar__icon-glyph {
  display: block;
  color: var(--fui-infobar-icon-bg, var(--colorCompoundBrandBackground));
}

/* ---- 排版面板（InfoBarPanel）：第 1 列，跨两行 ---- */
.fui-infobar__panel {
  grid-column: 2;
  grid-row: 1 / span 2;
  display: flex;
  min-width: 0;
  /* InfoBarPanelMargin = 0,0,16,0 */
  margin-inline-end: var(--fui-infobar-panel-margin-end);
}

/* ---- 排版：间距来自 `InfoBar*OrientationMargin` 附加属性 ---- */
/*
 * `InfoBarPanel::ArrangeOverride` 的两条硬规则（MeasureOverride 里也各有一条对应）：
 *   // Ignore left margin of first and right margin of last child
 *   // Ignore top margin of first and bottom margin of last child
 * 即**第一个可见子项不参与起始边距**（`hasPreviousElement` 只有在排完一个非零子项后才置真），
 * 所以 Title 缺席时 Message 不该凭空多出 12px 左边距、竖排时 Title 也不该叠加 14px 上边距。
 * 模板里子项顺序固定为 Title → Message → Action，因此 CSS 直接按「面板的第一个子元素」表达。
 */

/* 竖排：子项依次向下叠，间距来自各自的 VerticalOrientationMargin 中间值 */
.fui-infobar[data-orientation='vertical'] .fui-infobar__panel {
  flex-direction: column;
  align-items: stretch;
  padding-block: 14px 18px; /* InfoBarPanelVerticalOrientationPadding = 0,14,0,18 */
}
.fui-infobar[data-orientation='vertical'] .fui-infobar__title {
  margin-block-start: 14px; /* InfoBarTitleVerticalOrientationMargin = 0,14,0,0 */
}
.fui-infobar[data-orientation='vertical'] .fui-infobar__message {
  margin-block-start: 4px; /* InfoBarMessageVerticalOrientationMargin = 0,4,0,0 */
}
.fui-infobar[data-orientation='vertical'] .fui-infobar__action {
  margin-block-start: 12px; /* InfoBarActionVerticalOrientationMargin = 0,12,0,0 */
}

/* 横排：Title / Message / Action 同一行，间距来自 HorizontalOrientationMargin 的左边距 */
.fui-infobar[data-orientation='horizontal'] .fui-infobar__panel {
  flex-direction: row;
  align-items: flex-start;
  padding-block: 0; /* InfoBarPanelHorizontalOrientationPadding = 0,0,0,0 */
}
.fui-infobar[data-orientation='horizontal'] .fui-infobar__title {
  margin-block-start: 14px; /* InfoBarTitleHorizontalOrientationMargin = 0,14,0,0 */
}
.fui-infobar[data-orientation='horizontal'] .fui-infobar__message {
  margin-block-start: 14px;
  margin-inline-start: 12px; /* InfoBarMessageHorizontalOrientationMargin = 12,14,0,0 */
}
.fui-infobar[data-orientation='horizontal'] .fui-infobar__action {
  margin-block-start: 8px;
  margin-inline-start: 16px; /* InfoBarActionHorizontalOrientationMargin = 16,8,0,0 */
  flex-shrink: 0;
}

/* 第一个可见子项不吃起始边距（对齐 ArrangeOverride 的 hasPreviousElement 规则） */
.fui-infobar[data-orientation='vertical'] .fui-infobar__panel > :first-child {
  margin-block-start: 0;
}
.fui-infobar[data-orientation='horizontal'] .fui-infobar__panel > :first-child {
  margin-inline-start: 0;
}

/* ---- Title / Message：FontSize=14 ⇒ --fontSizeBase300（Fluent 2 Web 的 14px 档） ---- */
/*     行高取同档的 --lineHeightBase300 = 20px（与参考图实测 ~20px 行距一致）        */
.fui-infobar__title {
  color: var(--colorNeutralForeground1);
  font-family: var(--fontFamilyBase);
  font-size: var(--fontSizeBase300);
  font-weight: var(--fontWeightSemibold);
  line-height: var(--lineHeightBase300);
  overflow-wrap: break-word; /* TextWrapping=WrapWholeWords 的 Web 等价 */
  min-width: 0;
}
.fui-infobar__message {
  color: var(--colorNeutralForeground1);
  font-family: var(--fontFamilyBase);
  font-size: var(--fontSizeBase300);
  font-weight: var(--fontWeightRegular);
  line-height: var(--lineHeightBase300);
  overflow-wrap: break-word;
  min-width: 0;
}
.fui-infobar__action {
  min-width: 0;
}

/* ---- 内容区（ContentPresenter）：第 1 列，行号由 `NoBannerContent` 决定 ---- */
.fui-infobar__body {
  grid-column: 2;
  min-width: 0;
}

/* ---- 关闭按钮：DefaultButtonStyle + 38×38 + Margin 5 + Top 对齐 ---- */
.fui-infobar__close {
  grid-column: 3;
  grid-row: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--fui-infobar-close-size);
  height: var(--fui-infobar-close-size);
  /* 关闭按钮列是 Grid 第 3 列（auto 宽），按 InfoBarCloseButtonStyle 靠右贴齐 */
  justify-self: end;
  margin: var(--fui-infobar-close-margin);
  box-sizing: border-box;
  /* AppBarButtonBackground* 资源：Transparent / SubtleFillColorSecondary / Tertiary */
  border: var(--strokeWidthThin) solid var(--colorTransparentStroke);
  border-radius: var(--borderRadiusMedium); /* ControlCornerRadius */
  background-color: var(--colorSubtleBackground);
  color: var(--colorNeutralForeground1); /* AppBarButtonForeground = TextFillColorPrimary */
  cursor: pointer;
  transition:
    background-color var(--durationFaster) var(--curveEasyEase),
    color var(--durationFaster) var(--curveEasyEase);
}
.fui-infobar__close-glyph {
  display: block;
}
.fui-infobar__close:hover {
  background-color: var(--colorSubtleBackgroundHover);
}
.fui-infobar__close:active {
  background-color: var(--colorSubtleBackgroundPressed);
  color: var(--colorNeutralForeground2);
}
.fui-infobar__close:focus-visible {
  /* 与 Button / Checkbox 等既有组件同一套焦点矩形 */
  outline: var(--strokeWidthThick) solid var(--colorCompoundBrandStroke);
  outline-offset: 2px;
}
.fui-infobar__close:disabled {
  background-color: var(--colorNeutralBackgroundDisabled);
  color: var(--colorNeutralForegroundDisabled);
  cursor: not-allowed;
}

/* ---- 隐藏测量层：只用来量固有尺寸，不参与布局、不进无障碍树 ---- */
.fui-infobar__measure {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  width: max-content;
  visibility: hidden;
  pointer-events: none;
  z-index: -1;
}
.fui-infobar__measure-item {
  /* 固有宽 = 不换行时的宽；固有高 = 该宽度下换行后的高 */
  width: max-content;
  max-width: 100%;
}

/* ---- Severity：底色 + 圆心底色（对齐四个 VisualState；映射依据见文件头） ---- */
.fui-infobar[data-severity='informational'] .fui-infobar__grid {
  --fui-infobar-bg: var(--colorNeutralCardBackground);
  --fui-infobar-icon-bg: var(--colorCompoundBrandBackground);
}
.fui-infobar[data-severity='success'] .fui-infobar__grid {
  --fui-infobar-bg: var(--colorStatusSuccessBackground1);
  --fui-infobar-icon-bg: var(--colorStatusSuccessForeground3);
}
.fui-infobar[data-severity='warning'] .fui-infobar__grid {
  --fui-infobar-bg: var(--colorStatusWarningBackground1);
  --fui-infobar-icon-bg: var(--colorPaletteYellowForeground1);
}
.fui-infobar[data-severity='error'] .fui-infobar__grid {
  --fui-infobar-bg: var(--colorPaletteRedBackground1);
  --fui-infobar-icon-bg: var(--colorStatusDangerForeground3);
}

/* ---- 内容区在竖排下的位置微调：面板内边距已提供上下留白 ---- */
.fui-infobar[data-banner='false'] .fui-infobar__body {
  align-self: center;
}

/* ---- 动效尊重系统减弱 ---- */
@media (prefers-reduced-motion: reduce) {
  .fui-infobar__close {
    transition: none;
  }
}
</style>
