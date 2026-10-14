<script lang="ts">
import type { Component } from 'vue'

/**
 * FluereButton 组件 Props 契约
 *
 * 设计规范来源：Fluent Design 2 — Button & Toggle button
 * （fluent-components / fluent-tokens：data/fluent-tokens.json）
 *
 * 变体 (appearance)：
 * - primary    主按钮：品牌色填充，用于主要行动点
 * - secondary  次按钮（默认）：中性填充，最常用
 * - outline    描边按钮：透明背景 + 边框
 * - subtle     微妙按钮：极低对比度背景，用于工具栏等
 * - transparent 透明按钮：完全透明背景，仅悬停时有反馈
 *
 * 尺寸 (size)：small (24) / medium (32，默认) / large (40)（px 高度）
 *
 * 形状 (shape)：
 * - rounded  圆角（默认，borderRadiusMedium）
 * - circular 圆形 / 全圆角（borderRadiusCircular）
 * - square   直角
 *
 * 内容模式：
 * - 纯文本：默认
 * - 图标 + 文本：设置 icon 属性（间距 spacingHorizontalS）
 * - 纯图标：设置 icon + iconOnly（等比边长，热区 ≥ 40px 由消费方补足）
 *
 * 状态：rest / hover / pressed / selected / focus / disabled
 * - selected 同时作为 toggle button 的受控状态（aria-pressed）
 */
export interface FluereButtonProps {
  /**
   * 按钮外观变体
   * @default 'secondary'
   */
  appearance?: 'primary' | 'secondary' | 'outline' | 'subtle' | 'transparent'

  /**
   * 按钮尺寸
   * @default 'medium'
   */
  size?: 'small' | 'medium' | 'large'

  /**
   * 按钮形状
   * @default 'rounded'
   */
  shape?: 'rounded' | 'circular' | 'square'

  /**
   * 是否禁用
   * @default false
   */
  disabled?: boolean

  /**
   * 是否为选中状态（Toggle button 模式）
   * @default false
   */
  selected?: boolean

  /**
   * 是否块级显示（占满父容器宽度）
   * @default false
   */
  block?: boolean

  /**
   * 原生 button 类型
   * @default 'button'
   */
  type?: 'button' | 'submit' | 'reset'

  /**
   * 图标组件（如 @fluentui/svg-icons 中的图标）
   */
  icon?: Component

  /**
   * 图标位置（文本 + 图标模式下生效）
   * @default 'before'
   */
  iconPosition?: 'before' | 'after'

  /**
   * 是否仅显示图标（等比紧凑模式）
   * @default false
   */
  iconOnly?: boolean
}
</script>

<script setup lang="ts" generic="TIcon extends Component = Component">
import { computed } from 'vue'
import { useFocusVisual } from '../focus-visual/use-focus-visual'

const props = withDefaults(defineProps<FluereButtonProps>(), {
  appearance: 'secondary',
  size: 'medium',
  shape: 'rounded',
  disabled: false,
  selected: false,
  block: false,
  type: 'button',
  iconPosition: 'before',
  iconOnly: false,
})

/**
 * 焦点环：WinUI 双层焦点矩形（`FocusVisualPrimaryThickness` 2px +
 * `FocusVisualSecondaryThickness` 1px + `FocusVisualMargin` -3），几何 / 配色 /
 * 来源见 `../focus-visual/focus-visual.css`。0.4.3 起由共享原语统一提供，
 * Button 不再自写单层 outline。
 */
const focusVisual = useFocusVisual()

const rootClass = computed(() => [
  'fui-button',
  focusVisual.class,
  `fui-button--${props.appearance}`,
  `fui-button--${props.size}`,
  `fui-button--${props.shape}`,
  {
    'fui-button--icon-only': props.iconOnly,
    'fui-button--block': props.block,
    'fui-button--icon-after': props.iconPosition === 'after' && !props.iconOnly,
  },
])

defineOptions({
  name: 'FluereButton',
})
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    :aria-pressed="selected || undefined"
    :class="rootClass"
    :style="focusVisual.style"
  >
    <slot name="icon">
      <component
        v-if="icon"
        :is="icon"
        class="fui-button__icon"
        aria-hidden="true"
      />
    </slot>

    <span
      v-if="!iconOnly"
      class="fui-button__content"
    >
      <slot />
    </span>
  </button>
</template>

<style scoped>
/* ------------------------------------------------------------------ */
/* 所有值均引用 Fluent 语义 token（var(--TokenName)），见 fluent-tokens  */
/* 明暗主题由 tokens.css 的 light-dark() + color-scheme 自动切换        */
/* ------------------------------------------------------------------ */

/* ---- Base ---- */
.fui-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacingHorizontalS); /* icon 与文字间距 8px */
  box-sizing: border-box;
  border: var(--strokeWidthThin) solid var(--colorTransparentStroke);
  border-radius: var(--borderRadiusMedium);
  font-family: var(--fontFamilyBase);
  font-weight: var(--fontWeightMedium);
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  outline: none;
  /* WinUI：模板里的 `ContentPresenter.BackgroundTransition = BrushTransition Duration=0:0:0.083`
     —— **只有背景**走 83ms 过渡；BorderBrush / Foreground 在状态切换里都是
     `DiscreteObjectKeyFrame KeyTime=0`（瞬切，没有动画）。
     BrushTransition 的公开源码只给了时长、没有给缓动，这里按线性处理并注明。
     A 级来源（tag `winui3/release/2.5.1`）：`src/controls/dev/CommonStyles/Button_themeresources.xaml`
     #L173-174（`Normal` / `Accent` 等模板一致）。与 `FluereToggleButton` 同一口径——
     相较旧的 `--durationFast`(150ms) 三项过渡，这里只过渡背景，与 A 级对齐。 */
  transition: background-color 83ms linear;
}

/* ---- 尺寸（Fluent 高度 24/32/40） ---- */
.fui-button--small {
  height: 24px;
  padding-inline: var(--spacingHorizontalS);
  font-size: var(--fontSizeBase200);
  line-height: var(--lineHeightBase200);
}
.fui-button--medium {
  height: 32px;
  padding-inline: var(--spacingHorizontalM);
  font-size: var(--fontSizeBase300);
  line-height: var(--lineHeightBase300);
}
.fui-button--large {
  height: 40px;
  padding-inline: var(--spacingHorizontalL);
  font-size: var(--fontSizeBase400);
  line-height: var(--lineHeightBase400);
}

/* ---- 形状 ---- */
.fui-button--rounded {
  border-radius: var(--borderRadiusMedium);
}
.fui-button--circular {
  border-radius: var(--borderRadiusCircular);
}
.fui-button--square {
  border-radius: 0;
}

/* ---- 外观：Primary ---- */
.fui-button--primary {
  background-color: var(--colorBrandBackground);
  color: var(--colorNeutralForegroundOnBrand);
  border-color: transparent;
}
.fui-button--primary:hover {
  background-color: var(--colorBrandBackgroundHover);
}
.fui-button--primary:active {
  background-color: var(--colorBrandBackgroundPressed);
}
.fui-button--primary[aria-pressed='true'] {
  background-color: var(--colorBrandBackgroundSelected);
}

/* ---- 外观：Secondary ---- */
.fui-button--secondary {
  background-color: var(--colorNeutralBackground1);
  color: var(--colorNeutralForeground1);
  border-color: var(--colorNeutralStroke1);
}
.fui-button--secondary:hover {
  background-color: var(--colorNeutralBackground1Hover);
}
.fui-button--secondary:active {
  background-color: var(--colorNeutralBackground1Pressed);
}
.fui-button--secondary[aria-pressed='true'] {
  background-color: var(--colorNeutralBackground1Selected);
}

/* ---- 外观：Outline ---- */
.fui-button--outline {
  background-color: var(--colorTransparentBackground);
  color: var(--colorNeutralForeground1);
  border-color: var(--colorNeutralStroke1);
}
.fui-button--outline:hover {
  background-color: var(--colorNeutralBackground1Hover);
}
.fui-button--outline:active {
  background-color: var(--colorNeutralBackground1Pressed);
}
.fui-button--outline[aria-pressed='true'] {
  background-color: var(--colorNeutralBackground1Selected);
}

/* ---- 外观：Subtle ---- */
.fui-button--subtle {
  background-color: var(--colorSubtleBackground);
  color: var(--colorNeutralForeground1);
  border-color: var(--colorTransparentStroke);
}
.fui-button--subtle:hover {
  background-color: var(--colorSubtleBackgroundHover);
}
.fui-button--subtle:active {
  background-color: var(--colorSubtleBackgroundPressed);
}
.fui-button--subtle[aria-pressed='true'] {
  background-color: var(--colorSubtleBackgroundSelected);
}

/* ---- 外观：Transparent ---- */
.fui-button--transparent {
  background-color: var(--colorTransparentBackground);
  color: var(--colorNeutralForeground1);
  border-color: var(--colorTransparentStroke);
}
.fui-button--transparent:hover {
  background-color: var(--colorTransparentBackgroundHover);
}
.fui-button--transparent:active {
  background-color: var(--colorTransparentBackgroundPressed);
}
.fui-button--transparent[aria-pressed='true'] {
  background-color: var(--colorTransparentBackgroundSelected);
}

/* ---- 禁用（统一覆盖各外观） ---- */
.fui-button:disabled,
.fui-button[disabled] {
  background-color: var(--colorNeutralBackgroundDisabled);
  color: var(--colorNeutralForegroundDisabled);
  border-color: var(--colorNeutralStrokeDisabled);
  cursor: not-allowed;
}

/* ---- Focus：WinUI 双层焦点矩形 ----
   单层 brand outline 已由 0.4.3 的 useFocusVisual 取代（WinUI Button 的主题资源里
   没有 Focused 视觉状态改描边，焦点完全由系统的 FocusVisualPrimary/Secondary 绘制）。
   本组件**不写任何 :focus-visible 规则**：基础样式里的 `outline: none` 特异性是
   (0,2,0)，会被原语的 (0,3,0) 压过；若在这里再写 `.fui-button:focus-visible`
   就会因为同特异性按源码顺序把焦点环吃掉。 */

/* ---- 纯图标：等比边长 ---- */
.fui-button--icon-only {
  padding-inline: 0;
  aspect-ratio: 1;
}

/* ---- 块级 ---- */
.fui-button--block {
  width: 100%;
}

/* ---- 图标 ---- */
.fui-button__icon {
  display: inline-flex;
  flex-shrink: 0;
}
.fui-button--small .fui-button__icon {
  width: 16px;
  height: 16px;
}
.fui-button--medium .fui-button__icon {
  width: 20px;
  height: 20px;
}
.fui-button--large .fui-button__icon {
  width: 24px;
  height: 24px;
}
.fui-button--icon-after .fui-button__icon {
  order: 1;
}

/* ---- 内容 ---- */
.fui-button__content {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
