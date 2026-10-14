<script lang="ts">
/**
 * FluereToggleButton 组件 Props 契约
 *
 * 规格来源：microsoft-ui-xaml tag `winui3/release/2.5.1`（本地快照 `temp/winui-src`）
 *   src/controls/dev/CommonStyles/ToggleButton_themeresources.xaml
 *     · 状态资源（`Default` = 暗色 / `Light` = 亮色两套 ThemeDictionary）：
 *         ToggleButtonBackground / PointerOver / Pressed / Disabled
 *           ← ControlFillColorDefaultBrush / SecondaryBrush / TertiaryBrush / DisabledBrush
 *         ToggleButtonBackgroundChecked / CheckedPointerOver / CheckedPressed / CheckedDisabled
 *           ← AccentFillColorDefaultBrush / SecondaryBrush / TertiaryBrush / DisabledBrush
 *         ToggleButtonForeground / PointerOver / Pressed / Disabled
 *           ← TextFillColorPrimaryBrush / PrimaryBrush / SecondaryBrush / DisabledBrush
 *         ToggleButtonForegroundChecked / CheckedPointerOver / CheckedPressed / CheckedDisabled
 *           ← TextOnAccentFillColorPrimaryBrush / PrimaryBrush / SecondaryBrush / Disabled
 *         ToggleButtonBorderBrush / PointerOver / Pressed / Disabled
 *           ← ControlElevationBorderBrush / ControlElevationBorderBrush / ControlStrokeColorDefaultBrush
 *         ToggleButtonBorderBrushChecked / CheckedPointerOver / CheckedPressed / CheckedDisabled
 *           ← AccentControlElevationBorderBrush / … / ControlFillColorTransparentBrush
 *         ToggleButtonBackground/Foreground/BorderBrushIndeterminate（三态的不确定态：
 *           背景 / 前景 / 边框与**未选中**态完全同源，单独一组资源只是为了让模板能按状态切换）
 *     · 几何：`ToggleButtonBorderThemeThickness = 1`、`BackgroundSizing = OuterBorderEdge`
 *       （选中态背景一直铺到外描边）、`FocusVisualMargin = -3`
 *     · Template 的 VisualStateGroup `CommonStates` 命名的状态：Normal / PointerOver /
 *       Pressed / Disabled / Checked* / Indeterminate*（`IsChecked` 由 `ToggleButton` 的
 *       `CheckStates` 组驱动）
 *
 * 与 Fluent token 的映射（同值优先，无同值档落组件局部变量并在样式块注明）：
 *   ControlFillColorDefaultBrush → --colorNeutralBackground1
 *   ControlFillColorSecondaryBrush → --colorNeutralBackground1Hover
 *   ControlFillColorTertiaryBrush → --colorNeutralBackground1Pressed
 *   ControlFillColorDisabledBrush → --colorNeutralBackgroundDisabled
 *   ControlElevationBorderBrush / ControlStrokeColorDefaultBrush → --colorNeutralStroke1
 *   TextFillColorPrimaryBrush → --colorNeutralForeground1
 *   TextFillColorSecondaryBrush → --colorNeutralForeground2
 *   TextFillColorDisabledBrush → --colorNeutralForegroundDisabled
 *   AccentFillColorDefaultBrush → --colorBrandBackground
 *   AccentFillColorSecondaryBrush → --colorBrandBackgroundHover
 *   AccentFillColorTertiaryBrush → --colorBrandBackgroundPressed
 *   TextOnAccentFillColorPrimaryBrush → --colorNeutralForegroundOnBrand
 *   AccentFillColorDisabledBrush（亮 #37000000 / 暗 #28FFFFFF）与
 *   TextOnAccentFillColorDisabledBrush（亮 #FFFFFF / 暗 #87FFFFFF）
 *     → **Fluent token 表无同值档**，落组件局部变量
 *       `--fui-toggle-button-checked-disabled-background` / `-foreground`（见样式块）
 *
 * 焦点：复用 0.4.3 的共享原语 `useFocusVisual`（外 2px `--colorStrokeFocus2` + 内 1px
 * `--colorStrokeFocus1`，等价 `FocusVisualMargin = -3`）。WinUI 的 ToggleButton 主题资源里
 * **没有** Focused 视觉状态改描边，焦点完全由 FocusVisualPrimary/Secondary 绘制。
 *
 * 与 WinUI 的差异（有意为之）：
 *   - 只实现标准 `ToggleButton` 的外观；`AppBarToggleButton` 的 subtle 外观属后续版本；
 *   - 字重沿用本库 Button 的 `--fontWeightMedium`（WinUI 的 `Button_themeresources` 是
 *     `FontWeight = Normal`）—— 两处都保持本库内部一致，避免同一页面里按钮字重漂移；
 *   - 高对比度未实现（WinUI HC 下这些画刷走 `SystemColor*`）。
 *
 * 三态语义对齐 WinUI `ToggleButton.IsChecked`（`bool?`）：
 *   - `threeState = false`：false ⇄ true；
 *   - `threeState = true`：false → true → null → false 循环；
 *   - 不确定态（`null`）点击后**回到 false**（`OnToggleImpl` 的 Indeterminate 分支：
 *     `// Indeterminate / // Set to Unchecked`）。
 */
import type { Component } from 'vue'

/** `FluereToggleButton` 的 Props */
export interface FluereToggleButtonProps {
  /**
   * 三态勾选状态（对应 `ToggleButton.IsChecked`，`null` = 不确定态）
   * @default false
   */
  checked?: boolean | null

  /** 是否禁用（对应 `IsEnabled`） */
  disabled?: boolean

  /**
   * 尺寸档（几何沿用本库 Button：Fluent 高度 24 / 32 / 40）
   * @default 'medium'
   */
  size?: 'small' | 'medium' | 'large'

  /**
   * 是否允许点击在 false → true → null 之间循环（对应 `IsThreeState`）
   * @default false
   */
  threeState?: boolean

  /** 原生 button 类型 */
  type?: 'button' | 'submit' | 'reset'

  /** 前置图标组件 */
  icon?: Component

  /**
   * 图标位置（文本 + 图标模式下生效）
   * @default 'before'
   */
  iconPosition?: 'before' | 'after'

  /** 是否仅显示图标（等比紧凑模式） */
  iconOnly?: boolean

  /** 是否撑满容器 */
  block?: boolean

  /** 可访问名（无可见文本时必须给，对应 `AutomationProperties.Name`） */
  label?: string
}
</script>

<script setup lang="ts" generic="TIcon extends Component = Component">
import { computed } from 'vue'
import { useFocusVisual } from '../focus-visual/use-focus-visual'

defineOptions({
  name: 'FluereToggleButton',
})

const props = withDefaults(defineProps<FluereToggleButtonProps>(), {
  checked: false,
  disabled: false,
  size: 'medium',
  threeState: false,
  type: 'button',
  icon: undefined,
  iconPosition: 'before',
  iconOnly: false,
  block: false,
  label: undefined,
})

const emit = defineEmits<{
  /** 受控状态的唯一事实源回写（对应 `IsChecked` 变化） */
  'update:checked': [value: boolean | null]
  /** 进入勾选（对应 WinUI `Checked`） */
  'checked': []
  /** 取消勾选（对应 WinUI `Unchecked`） */
  'unchecked': []
  /** 进入不确定态（对应 WinUI `Indeterminate`） */
  'indeterminate': []
}>()

/** 焦点环：WinUI 双层焦点矩形（0.4.3 共享原语），几何与来源见 focus-visual.css */
const focusVisual = useFocusVisual()

/** 三态 → 状态串（样式与模板都按它分支） */
const state = computed<'unchecked' | 'checked' | 'indeterminate'>(() =>
  props.checked === null ? 'indeterminate' : props.checked ? 'checked' : 'unchecked',
)

/**
 * `aria-pressed`：三态用 `"mixed"`（WAI-ARIA 的混合态），其余取 `"true"` / `"false"`。
 * 不确定态**不是** `aria-checked`（ToggleButton 用的是 `aria-pressed` 语义）。
 */
const ariaPressed = computed<'mixed' | 'true' | 'false'>(() =>
  props.checked === null ? 'mixed' : props.checked ? 'true' : 'false',
)

/** 点击后的下一个状态（对齐 WinUI `ToggleButton::OnToggleImpl` + `IsThreeState`） */
const nextChecked = computed<boolean | null>(() => {
  // WinUI：Indeterminate → Unchecked（`// Indeterminate / // Set to Unchecked`）
  if (props.checked === null) {
    return false
  }
  if (props.checked === false) {
    return true
  }
  // Checked + IsThreeState → Indeterminate；否则 → Unchecked
  return props.threeState ? null : false
})

const rootClass = computed(() => [
  'fui-toggle-button',
  focusVisual.class,
  `fui-toggle-button--${props.size}`,
  {
    'fui-toggle-button--icon-only': props.iconOnly,
    'fui-toggle-button--block': props.block,
    'fui-toggle-button--icon-after': props.iconPosition === 'after' && !props.iconOnly,
  },
])

const onClick = (): void => {
  if (props.disabled) {
    return
  }
  const value = nextChecked.value
  emit('update:checked', value)
  if (value === null) {
    emit('indeterminate')
    return
  }
  if (value) {
    emit('checked')
    return
  }
  emit('unchecked')
}
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    :aria-pressed="ariaPressed"
    :aria-label="label"
    :data-state="state"
    :class="rootClass"
    :style="focusVisual.style"
    @click="onClick"
  >
    <slot name="icon">
      <component
        v-if="icon"
        :is="icon"
        class="fui-toggle-button__icon"
        aria-hidden="true"
      />
    </slot>

    <span
      v-if="!iconOnly"
      class="fui-toggle-button__content"
    >
      <slot />
    </span>
  </button>
</template>

<style scoped>
/* ------------------------------------------------------------------ */
/* 明暗主题由 tokens.css 的 light-dark() + color-scheme 自动切换        */
/* 状态表与 WinUI 资源 → token 映射见文件头注释 + 样式块内逐条标注        */
/* ------------------------------------------------------------------ */

.fui-toggle-button {
  /* Fluent token 表无同值档的两条（WinUI Accent/TextOnAccent 的 Disabled 档是
     带 alpha 的强调色，Fluent 里没有对应 token）。
     取值：AccentFillColorDisabled = 亮 #37000000 / 暗 #28FFFFFF；
           TextOnAccentFillColorDisabled = 亮 #FFFFFF / 暗 #87FFFFFF。 */
  --fui-toggle-button-checked-disabled-background: light-dark(
    rgba(0, 0, 0, 0.216),
    rgba(255, 255, 255, 0.157)
  );
  --fui-toggle-button-checked-disabled-foreground: light-dark(#ffffff, rgba(255, 255, 255, 0.529));
  /* TextOnAccentFillColorSecondaryBrush（选中态按下时的前景）：
     亮 #B3FFFFFF / 暗 #80000000，同样没有同值 token */
  --fui-toggle-button-checked-pressed-foreground: light-dark(
    rgba(255, 255, 255, 0.702),
    rgba(0, 0, 0, 0.502)
  );

  display: inline-flex;
  align-items: center;
  justify-content: center;
  /* WinUI ButtonBase 的内容间距：沿用本库 Button 的口径（8px） */
  gap: var(--spacingHorizontalS);
  box-sizing: border-box;
  /* WinUI：ToggleButtonBorderThemeThickness = 1 / ControlElevationBorderBrush */
  border: var(--strokeWidthThin) solid var(--colorNeutralStroke1);
  border-radius: var(--borderRadiusMedium);
  /* WinUI：ToggleButtonBackground ← ControlFillColorDefaultBrush */
  background-color: var(--colorNeutralBackground1);
  /* WinUI：ToggleButtonForeground ← TextFillColorPrimaryBrush */
  color: var(--colorNeutralForeground1);
  font-family: var(--fontFamilyBase);
  font-weight: var(--fontWeightMedium);
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  /* UA 默认焦点环由 .fui-focus-visual 原语接管（其特异性高于本块，见原语文件头） */
  outline: none;
  /* WinUI：模板里的 `ContentPresenter.BackgroundTransition = BrushTransition Duration=0:0:0.083`
     —— **只有背景**走 83ms 过渡；BorderBrush / Foreground 在状态切换里都是
     `DiscreteObjectKeyFrame KeyTime=0`（瞬切，没有动画）。
     BrushTransition 的公开源码只给了时长、没有给缓动，这里按线性处理并注明。
     （`FluereButton` 已按同一口径统一，见其样式块注释。） */
  transition: background-color 83ms linear;
}

/* ---- 未选中：hover / pressed ---- */
/* WinUI：ToggleButtonBackgroundPointerOver ← ControlFillColorSecondaryBrush */
.fui-toggle-button[data-state='unchecked']:hover:not(:disabled),
.fui-toggle-button[data-state='indeterminate']:hover:not(:disabled) {
  background-color: var(--colorNeutralBackground1Hover);
}

/* WinUI：ToggleButtonBackgroundPressed ← ControlFillColorTertiaryBrush；
   ToggleButtonForegroundPressed ← TextFillColorSecondaryBrush；
   ToggleButtonBorderBrushPressed ← ControlStrokeColorDefaultBrush（同 --colorNeutralStroke1） */
.fui-toggle-button[data-state='unchecked']:active:not(:disabled),
.fui-toggle-button[data-state='indeterminate']:active:not(:disabled) {
  background-color: var(--colorNeutralBackground1Pressed);
  color: var(--colorNeutralForeground2);
}

/* ---- 选中：WinUI AccentFillColorDefaultBrush + TextOnAccentFillColorPrimaryBrush ---- */
.fui-toggle-button[data-state='checked'] {
  background-color: var(--colorBrandBackground);
  color: var(--colorNeutralForegroundOnBrand);
  /* WinUI：AccentControlElevationBorderBrush 在实色强调底上不可见，与 Button--primary 同口径 */
  border-color: transparent;
}

/* WinUI：ToggleButtonBackgroundCheckedPointerOver ← AccentFillColorSecondaryBrush */
.fui-toggle-button[data-state='checked']:hover:not(:disabled) {
  background-color: var(--colorBrandBackgroundHover);
}

/* WinUI：ToggleButtonBackgroundCheckedPressed ← AccentFillColorTertiaryBrush；
   ToggleButtonForegroundCheckedPressed ← TextOnAccentFillColorSecondaryBrush（比 Primary 暗一档） */
.fui-toggle-button[data-state='checked']:active:not(:disabled) {
  background-color: var(--colorBrandBackgroundPressed);
  color: var(--fui-toggle-button-checked-pressed-foreground);
}

/* ---- 不确定态：背景 / 前景 / 边框与未选中同源（见文件头注释） ---- */
.fui-toggle-button[data-state='indeterminate'] {
  background-color: var(--colorNeutralBackground1);
  color: var(--colorNeutralForeground1);
}

/* ---- 禁用 ---- */
.fui-toggle-button:disabled {
  background-color: var(--colorNeutralBackgroundDisabled);
  color: var(--colorNeutralForegroundDisabled);
  border-color: var(--colorNeutralStrokeDisabled);
  cursor: not-allowed;
}

/* WinUI：CheckedDisabled 用 AccentFillColorDisabledBrush / TextOnAccentFillColorDisabledBrush */
.fui-toggle-button[data-state='checked']:disabled {
  background-color: var(--fui-toggle-button-checked-disabled-background);
  color: var(--fui-toggle-button-checked-disabled-foreground);
}

/* ---- 尺寸（与 Button 同档：Fluent 高度 24 / 32 / 40） ---- */
.fui-toggle-button--small {
  height: 24px;
  padding-inline: var(--spacingHorizontalS);
  font-size: var(--fontSizeBase200);
  line-height: var(--lineHeightBase200);
}

.fui-toggle-button--medium {
  height: 32px;
  padding-inline: var(--spacingHorizontalM);
  font-size: var(--fontSizeBase300);
  line-height: var(--lineHeightBase300);
}

.fui-toggle-button--large {
  height: 40px;
  padding-inline: var(--spacingHorizontalL);
  font-size: var(--fontSizeBase400);
  line-height: var(--lineHeightBase400);
}

/* ---- 纯图标：等比边长 ---- */
.fui-toggle-button--icon-only {
  padding-inline: 0;
  aspect-ratio: 1;
}

/* ---- 块级 ---- */
.fui-toggle-button--block {
  width: 100%;
}

/* ---- 图标 ---- */
.fui-toggle-button__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 1em;
}

.fui-toggle-button--icon-after {
  flex-direction: row-reverse;
}

.fui-toggle-button__content {
  display: inline-flex;
  align-items: center;
  min-width: 0;
}

/* ---- 动效：减少动效时不留过渡（静态形态 = 最终态） ---- */
@media (prefers-reduced-motion: reduce) {
  .fui-toggle-button {
    transition: none;
  }
}
</style>
