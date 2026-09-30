<script lang="ts">
/**
 * FluereInfoBadge 组件 Props 契约
 *
 * 设计规范来源：WinUI 3 / Windows App SDK
 *   microsoft-ui-xaml `winui3/release/2.5.1`（commit ba3a8d5）
 *   已核对版本漂移：`InfoBadge.xaml` / `InfoBadge_themeresources.xaml` / `InfoBadge.idl` /
 *   `InfoBadge.cpp` / `InfoBadge.h` 在 tag `winui3/release/2.0.1`（最新 WinUI3 Gallery
 *   发行版 v2.9.3 所用的 WindowsAppSDK 2.0.1）与 2.5.1 之间逐字节一致，故本地读取即
 *   Gallery 行为基准。Gallery 侧用法见 `WinUI-Gallery` v2.9.3
 *   `WinUIGallery/Samples/InfoBadge/InfoBadgePage.xaml`（四个示例：嵌在 NavigationView、
 *   六套 Style 对照、放进 Button 一角、NumberBox 驱动动态 Value）。
 *
 * 读到的规范（文件 → 结论）：
 *  - InfoBadge.idl：`Value` 默认 `-1`（`MUX_DEFAULT_VALUE("-1")`，Int32）；
 *    `IconSource` 默认 null；`TemplateSettings` 只有 `InfoBadgeCornerRadius` 与 `IconElement`
 *    两个字段；`MUX_PROPERTY_CHANGED_CALLBACK(TRUE)` ⇒ 任何属性变化都走 `OnPropertyChanged`。
 *  - InfoBadge.xaml：模板 = 单个 Grid `RootGrid`（`Background=TemplateBinding Background`、
 *    `Padding=TemplateBinding Padding`、`CornerRadius=TemplateSettings.InfoBadgeCornerRadius`）
 *    + 一个 `DisplayKindStates` 状态组（Dot / Icon / FontIcon / Value；Dot 是空状态，
 *    其余三态把 `IconPresenter` 或 `ValueTextBlock` 置为 Visible 并设 Margin）
 *    + 两个子元素：`ValueTextBlock`（`FontSize=InfoBadgeValueFontSize`，Center/Center）
 *    与 `IconPresenter`（`Viewbox`，Center/Stretch）。
 *  - InfoBadge_themeresources.xaml：`InfoBadgeMinHeight`=4、`InfoBadgeMinWidth`=4、
 *    `InfoBadgeMaxHeight`=16、`InfoBadgeValueFontSize`=11、`InfoBadgePadding`=0,0,0,0、
 *    `IconInfoBadgeFontIconMargin`=4,0,4,2、`ValueInfoBadgeTextMargin`=4,0,4,2、
 *    `IconInfoBadgeIconMargin`=4,4,4,4；`IsTabStop=False`；前景 `TextOnAccentFillColorPrimaryBrush`、
 *    底色 `AccentFillColorDefaultBrush`；`InfoBadgeIconHeight/Width`（8or9 / 12）是**死资源**
 *    —— 模板里只用了 Viewbox，没有引用这两个数值（见 constants.ts 的推导）。
 *  - InfoBadge.cpp#OnDisplayKindPropertiesChanged：`Value >= 0` ⇒ `Value` 态；
 *    否则 `IconSource != null` ⇒ FontIconSource 走 `FontIcon` 态、其余走 `Icon` 态；
 *    否则 `Dot` 态。**Value 优先于 Icon**。
 *  - InfoBadge.cpp#MeasureOverride：`desired.Width < desired.Height` 时返回正方形
 *    （单数字的 `Value` 态因此是正圆而不是窄胶囊）。
 *  - InfoBadge.cpp#OnSizeChanged：消费方**没显式设过** `CornerRadius` 时，
 *    `InfoBadgeCornerRadius = ActualHeight / 2`。
 *  - InfoBadgeAutomationPeer.cpp：无实现（`Control.OnCreateAutomationPeer` 未重写）⇒
 *    UIA 树里不出现该元素，Gallery 把可访问名挂在父级 `NavigationViewItem` 上。
 *
 * WinUI 资源名 → Fluent token 映射（取值一律走 `var(--TokenName)`，见 style 块内注释）：
 *   InfoBadgeBackground ← AccentFillColorDefaultBrush            → colorCompoundBrandBackground
 *   Attention*InfoBadgeStyle    ← SystemFillColorAttentionBrush  → colorCompoundBrandBackground
 *   Informational*InfoBadgeStyle← SystemFillColorSolidNeutralBrush → colorNeutralForeground4
 *   Success*InfoBadgeStyle      ← SystemFillColorSuccessBrush    → colorStatusSuccessForeground3
 *   Caution*InfoBadgeStyle      ← SystemFillColorCautionBrush    → colorPaletteYellowForeground1
 *   Critical*InfoBadgeStyle     ← SystemFillColorCriticalBrush   → colorStatusDangerForeground3
 *   InfoBadgeForeground ← TextOnAccentFillColorPrimaryBrush      → colorNeutralForegroundInverted2
 *   圆角                ← CornerRadius = ActualHeight / 2        → borderRadiusCircular
 * 后四档与 `InfoBar` 的 `InfoBar*SeverityIconBackground`（同一批 `SystemFillColor*Brush`）
 * 保持**同一套映射**，避免同一个 WinUI 资源在库内出现两种「成功绿」。逐项 ΔE 见组件文档。
 *
 * 与 WinUI 的差异（有意为之，逐条记录）：
 *  - `IconSource` → `icon` Prop（组件）/ `#icon` 插槽（任意内容）；`IconElement` 不再经
 *    `TemplateSettings` 中转。
 *  - `Value < -1`：WinUI 抛 `hresult_out_of_bounds`，本库按 `< 0` 处理（回落到 Icon / Dot
 *    形态），不抛异常 —— 渲染期抛错会把整棵 Vue 子树打挂。
 *  - `InfoBadgeIconWidth/Height` 两个死资源不落地（WinUI 也没用），图标框由
 *    `InfoBadgeMaxHeight` 减去内外边距推出（8px），见 constants.ts。
 *  - 高对比度主题（WinUI HC：底色 `SystemControlHighlightAccentBrush`、前景
 *    `SystemControlHighlightAltChromeWhiteBrush`）本轮不实现，属已知缺口。
 *  - 组件没有任何 Storyboard / VisualTransition（六个 Style 的切换都是瞬时状态跳转），
 *    故本组件无动效，也不需要 `prefers-reduced-motion` 分支。
 */
export type {
  FluereInfoBadgeDisplayKind,
  FluereInfoBadgeIconSeverity,
  FluereInfoBadgeProps,
  FluereInfoBadgeProps as InfoBadgeProps,
  FluereInfoBadgeSeverity,
} from './types'
</script>

<script setup lang="ts">
import { computed, useSlots } from 'vue'
import type { Component } from 'vue'
import { INFO_BADGE_SEVERITY_ICONS } from './constants'
import type { FluereInfoBadgeProps } from './types'

defineOptions({ name: 'FluereInfoBadge' })

const props = withDefaults(defineProps<FluereInfoBadgeProps>(), {
  value: -1,
  severity: 'accent',
  icon: undefined,
})

const slots = useSlots()

/** `severity === 'accent'`（DefaultInfoBadgeStyle）没有对应的 `*IconInfoBadgeStyle` 预置字形 */
const severityIcon = computed<Component | undefined>(() =>
  props.severity === 'accent' ? undefined : INFO_BADGE_SEVERITY_ICONS[props.severity],
)

/**
 * `IconSource` 解析结果：
 *   `true` → 取 severity 的内建字形（对应 `*IconInfoBadgeStyle` 预置的 IconSource）
 *   组件   → 直接用（对应消费方显式设置 IconSource）
 *   其余   → 无图标（对应未设置 IconSource）
 */
const iconComponent = computed<Component | undefined>(() => {
  if (props.icon === true) {
    return severityIcon.value
  }
  if (props.icon === null || props.icon === false || props.icon === undefined) {
    return undefined
  }
  return props.icon
})

/** 图标态 = 插槽或 `icon` 解析出了内容（对齐 `IconSource != null`） */
const hasIcon = computed<boolean>(() => Boolean(slots.icon) || iconComponent.value !== undefined)

/**
 * 显示形态，逐字复刻 `InfoBadge.cpp#OnDisplayKindPropertiesChanged` 的三分支：
 * `Value >= 0` ⇒ `Value`；否则有 `IconSource` ⇒ `Icon`；否则 `Dot`。
 */
const displayKind = computed<'value' | 'icon' | 'dot'>(() => {
  if (props.value >= 0) {
    return 'value'
  }
  return hasIcon.value ? 'icon' : 'dot'
})

/** 值文本；WinUI 把 `Value`（Int32）直接绑到 `TextBlock.Text` */
const valueText = computed(() => String(props.value))

/** 只有消费方传了 `label` 才把元素暴露给 AT（WinUI 侧 InfoBadge 不进 UIA 树） */
const isLabelled = computed(() => props.label !== undefined && props.label !== '')

/** 对应 `CornerRadius` 被显式设置过时的分支（`OnSizeChanged` 不再接管） */
const rootStyle = computed(() =>
  props.borderRadius === undefined ? undefined : { '--fui-info-badge-radius': props.borderRadius },
)
</script>

<template>
  <span
    class="fui-info-badge"
    :data-severity="severity"
    :data-display-kind="displayKind"
    :style="rootStyle"
    :role="isLabelled ? 'img' : undefined"
    :aria-label="isLabelled ? label : undefined"
    :aria-hidden="isLabelled ? undefined : 'true'"
  >
    <span
      v-if="displayKind === 'value'"
      class="fui-info-badge__value"
      >{{ valueText }}</span
    >
    <span
      v-else-if="displayKind === 'icon'"
      class="fui-info-badge__icon"
    >
      <slot name="icon">
        <component
          :is="iconComponent"
          v-if="iconComponent"
        />
      </slot>
    </span>
  </span>
</template>

<style scoped>
/* ------------------------------------------------------------------ */
/* 所有值均引用 Fluent 语义 token（var(--TokenName)），见 fluent-tokens  */
/* 明暗主题由 tokens.css 的 light-dark() + color-scheme 自动切换        */
/*                                                                     */
/* WinUI 数值资源（InfoBadge_themeresources.xaml / InfoBadge.cpp），    */
/* 有资源名的一律落成组件局部变量，不写无名魔法值：                       */
/*   InfoBadgeMinWidth / InfoBadgeMinHeight = 4  → --fui-info-badge-min-size   */
/*   InfoBadgeMaxHeight                     = 16 → --fui-info-badge-max-height */
/*   InfoBadgeValueFontSize                 = 11 → --fui-info-badge-value-font-size */
/*   IconInfoBadgeIconMargin  = 4,4,4,4          → --fui-info-badge-icon-margin */
/*   （等价于 FontIcon 态的 InfoBadgePadding 0,4,0,2 + IconInfoBadgeFontIconMargin 4,0,4,2）*/
/*   ValueInfoBadgeTextMargin = 4,0,4,2          → __value 的 margin-inline/block-end */
/*   图标框 = InfoBadgeMaxHeight − 4×2 = 8        → --fui-info-badge-icon-size */
/*   CornerRadius = ActualHeight / 2             → borderRadiusCircular（全圆角） */
/*                                                                     */
/* 配色映射见文件头「WinUI 资源名 → Fluent token」。                     */
/*                                                                     */
/* 动效：六个 Style 的切换在 WinUI 里都是瞬时状态跳转，没有任何 Storyboard /
/* VisualTransition，故这里不加过渡，也无需 prefers-reduced-motion 分支。 */
/* ------------------------------------------------------------------ */

.fui-info-badge {
  --fui-info-badge-min-size: 4px;
  --fui-info-badge-max-height: 16px;
  --fui-info-badge-value-font-size: 11px;
  --fui-info-badge-icon-margin: 4px;
  --fui-info-badge-icon-size: 8px;
  --fui-info-badge-value-margin-inline: 4px;
  --fui-info-badge-value-margin-block-end: 2px;

  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  /* MinWidth / MinHeight / MaxHeight（注意没有 MaxWidth：宽由内容决定） */
  min-inline-size: var(--fui-info-badge-min-size);
  min-block-size: var(--fui-info-badge-min-size);
  max-block-size: var(--fui-info-badge-max-height);
  /* OnSizeChanged：CornerRadius = ActualHeight / 2（消费方设过则用其值） */
  border-radius: var(--fui-info-badge-radius, var(--borderRadiusCircular));
  /* InfoBadgeBackground（DefaultInfoBadgeStyle）/ InfoBadgeForeground */
  background-color: var(--fui-info-badge-bg, var(--colorCompoundBrandBackground));
  color: var(--fui-info-badge-fg, var(--colorNeutralForegroundInverted2));
  vertical-align: middle;
  /* 纯装饰：不参与文本选择（对齐 IsTabStop=False 的不可聚焦语义） */
  user-select: none;
}

/*
 * InfoBadge.cpp#MeasureOverride：`desired.Width < desired.Height` 时返回正方形。
 * 只有 Value / Icon 两态的高度会被 MaxHeight 夹到 16（Value 态 = 行高 14 + 下外边距 2，
 * Icon 态 = 图标 8 + 上下外边距 4×2），所以这两态等价于 `min-width: 16px`；
 * Dot 态的高就是 MinHeight 4，与 MinWidth 相等，MeasureOverride 不改变结果。
 */
.fui-info-badge[data-display-kind='value'],
.fui-info-badge[data-display-kind='icon'] {
  min-inline-size: var(--fui-info-badge-max-height);
}

/*
 * 六套背景预设 → `InfoBadge_themeresources.xaml` 的 Style 键。
 * 后四档沿用 InfoBar 对同一批 SystemFillColor*Brush 的映射（见文件头），
 * 保证「成功 / 警告 / 危险」在库内只有一套取值；ΔE 与覆盖口子见组件文档。
 */
.fui-info-badge[data-severity='accent'],
.fui-info-badge[data-severity='attention'] {
  /* AccentFillColorDefaultBrush / SystemFillColorAttentionBrush（系统强调色 → Fluent 默认强调色） */
  background-color: var(--fui-info-badge-bg, var(--colorCompoundBrandBackground));
}

.fui-info-badge[data-severity='informational'] {
  /* SystemFillColorSolidNeutralBrush（Light #8A8A8A / Dark #9D9D9D）→ 中性 4 级实色档 */
  background-color: var(--fui-info-badge-bg, var(--colorNeutralForeground4));
}

.fui-info-badge[data-severity='success'] {
  /* SystemFillColorSuccessBrush（Light #0F7B0F / Dark #6CCB5F） */
  background-color: var(--fui-info-badge-bg, var(--colorStatusSuccessForeground3));
}

.fui-info-badge[data-severity='caution'] {
  /* SystemFillColorCautionBrush（Light #9D5D00 / Dark #FCE100） */
  background-color: var(--fui-info-badge-bg, var(--colorPaletteYellowForeground1));
}

.fui-info-badge[data-severity='critical'] {
  /* SystemFillColorCriticalBrush（Light #C42B1C / Dark #FF99A4） */
  background-color: var(--fui-info-badge-bg, var(--colorStatusDangerForeground3));
}

/* ---- ValueTextBlock（Value 态） ---- */
.fui-info-badge__value {
  font-size: var(--fui-info-badge-value-font-size);
  /*
   * 行高取 lineHeightBase100（14px），使内容高 = 14 + 下外边距 2 = 16 = InfoBadgeMaxHeight，
   * 与 WinUI 里 TextBlock 的自然行高（≈14.67）被 MaxHeight 夹到 16 的结果一致，
   * 且不随 Web 字体度量漂移；上下外边距 0 / 2 造成「文字视觉中心比徽章中心高 1px」
   * 这一 WinUI 特征也一并保留（Grid 的 Center 对齐对 margin 盒生效）。
   */
  line-height: var(--lineHeightBase100);
  /* ValueInfoBadgeTextMargin = 4,0,4,2 */
  margin-inline: var(--fui-info-badge-value-margin-inline);
  margin-block-end: var(--fui-info-badge-value-margin-block-end);
  white-space: nowrap;
}

/* ---- IconPresenter（Icon / FontIcon 态）：Viewbox 等比容器 ---- */
.fui-info-badge__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  inline-size: var(--fui-info-badge-icon-size);
  block-size: var(--fui-info-badge-icon-size);
  /* IconInfoBadgeIconMargin = 4,4,4,4（等价于 FontIcon 态的 Padding + Margin） */
  margin: var(--fui-info-badge-icon-margin);
  line-height: 0;
}

/*
 * Viewbox 的等比缩放：`@fluere-vue/icons` 的组件按原生 16px 出图，这里强制填满 8px 图标框
 * （对应 Viewbox 的 `VerticalAlignment=Stretch`）。自定义插槽内容同样被拉伸到图标框内。
 */
.fui-info-badge__icon :deep(svg) {
  display: block;
  inline-size: 100%;
  block-size: 100%;
}
</style>
