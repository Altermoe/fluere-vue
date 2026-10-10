<script lang="ts">
 /**
 * FluereNumberBox 数字框
 *
 * 设计规范来源：WinUI 3 / Windows App SDK — NumberBox
 *   src/controls/dev/NumberBox/NumberBox.xaml            模板结构与几何
 *   src/controls/dev/NumberBox/NumberBox_themeresources.xaml  弹层资源与几何常量
 *   src/controls/dev/NumberBox/NumberBox.cpp             取值 / 校验 / 步进 / 状态机
 *   src/controls/dev/NumberBox/NumberBoxParser.cpp       内联表达式求值
 *   src/controls/dev/NumberBox/NumberBox.idl             API 面与缺省值
 *
 * 组成（对应 WinUI 模板的 3 行 × 3 列 Grid）：
 *   Row0 Header  → `.fui-number-box__header`（TextBoxTopHeaderMargin 0,0,0,8）
 *   Row1 输入框  → `FluereInput`（WinUI 里内嵌的就是一个 TextBox，样式完全复用）
 *        + 内联增减按钮（SpinButtonPlacementMode=Inline）
 *        + 紧凑模式指示器与浮层（SpinButtonPlacementMode=Compact）
 *   Row2 说明    → `.fui-number-box__description`（DescriptionPresenter）
 *
 * 取值口径（与 WinUI `NumberBox.cpp` 逐条对齐）：
 *   - `Value` ↔ `Text` 双通道：值变化 → 格式化文本回写输入框（`UpdateTextToValue`）；
 *     失焦 / 回车 → 解析文本更新值（`ValidateInput`）
 *   - 输入被清空 → 值置为「无值」（WinUI 的 `NaN`，本库用 `null` 表达）
 *   - 解析失败 → 保留值；`ValidationMode=InvalidInputOverwritten` 时用当前值的文本覆盖输入，
 *     `Disabled` 时保留用户输入
 *   - 方向键 / 滚轮按 `SmallChange`（`step`）步进，PageUp / PageDown 按 `LargeChange`（`largeStep`）；
 *     WinUI 不做步长吸附，只把结果钳制（或回绕）回区间
 *   - `Escape` 丢弃输入回到当前值；`Enter` 结算输入（与 WinUI 的 KeyUp 处理一致）
 *   - `Home` / `End` 不参与步进（WinUI 把它们交给 TextBox 移动光标）
 *   - 获得焦点时全选文本（`OnNumberBoxGotFocus` → `textBox.SelectAll()`）
 *   - 增减按钮按住后立即步进一次，250ms 后每 250ms 重复（WinUI RepeatButton 的 Delay/Interval 缺省值）
 *   - 到达上 / 下界后按钮禁用；`IsWrapEnabled` 或 `ValidationMode=Disabled` 时两个按钮始终可用
 *
 * 底座说明（与 docs/todo.md 原计划的差异）：
 *   todo 里写的是「复用 reka NumberField」，实测其 `NumberFieldInput` 与 WinUI 有几处硬冲突：
 *   `Home` / `End` 被映射成最小值 / 最大值（WinUI 是移动光标）、非法输入在失焦时把值清空
 *   （WinUI 保留原值）、方向键按步长吸附（WinUI 直接相加）、滚轮方向相反、`LargeChange` 写死 10 步。
 *   NumberBox 的本质是「一个 TextBox + 数学解析 + NaN 语义」，与 reka 的 ISO spinbutton 语义不同，
 *   因此这里只保留 reka 的复用思路（取值层抽成 hook），实现改为自持：
 *   `format` / `parse` / `expression` / `step` 四个纯函数层 + `use-number-box` / `use-spin-repeat` 两个 hook。
 */
</script>

<script setup lang="ts">
import { useScopeMessages } from '@fluere-vue/hooks'
import {
  FluentIconChevronDown12Regular,
  FluentIconChevronDown16Regular,
  FluentIconChevronUp12Regular,
  FluentIconChevronUp16Regular,
  FluentIconChevronUpDown16Regular,
} from '@fluere-vue/icons'
import { computed, nextTick, ref, useId, useSlots } from 'vue'
import FluereInput from '../input/input.vue'
import { DEFAULT_LARGE_CHANGE, DEFAULT_SMALL_CHANGE, KEYBOARD_CLICK_DETAIL } from './constants'
import { numberBoxLocale } from './locale'
import type { NumberBoxSpinDirection } from './step'
import type { FluereNumberBoxProps, FluereNumberBoxValueChangedEventArgs } from './types'
import { useNumberBox } from './use-number-box'
import type { NumberBoxValueEvents } from './use-number-box'
import { useSpinRepeat } from './use-spin-repeat'

const props = withDefaults(defineProps<FluereNumberBoxProps>(), {
  modelValue: undefined,
  defaultValue: undefined,
  min: undefined,
  max: undefined,
  step: DEFAULT_SMALL_CHANGE,
  largeStep: DEFAULT_LARGE_CHANGE,
  disabled: false,
  header: undefined,
  label: undefined,
  description: undefined,
  placeholder: undefined,
  name: undefined,
  locale: undefined,
  formatOptions: undefined,
  spinButtonPlacementMode: 'hidden',
  validationMode: 'invalidInputOverwritten',
  wrapEnabled: false,
  acceptsExpression: false,
  increaseLabel: undefined,
  decreaseLabel: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [value: number | null]
  /** 对应 WinUI `ValueChanged`（带新旧值） */
  'valueChanged': [args: FluereNumberBoxValueChangedEventArgs]
}>()

defineOptions({ name: 'FluereNumberBox' })

/* ---- 内建文案：scope=`number-box`，locale prop 优先、否则跟随 Provider ---- */
const numberBoxI18n = useScopeMessages('number-box', numberBoxLocale, () => props.locale)
/** 增减按钮可访问名：显式 prop 压过 locale 内建文案 */
const increaseName = computed(() => props.increaseLabel || numberBoxI18n.t('increase'))
const decreaseName = computed(() => props.decreaseLabel || numberBoxI18n.t('decrease'))

const slots = useSlots()
// A11y 关联用的 id 走 Vue 的 useId（SSR 与水合一致，见 docs/ssr-guide.md 第 9 节）
const inputId = `fui-number-box-${useId()}`
const headerId = `${inputId}-header`
const descriptionId = `${inputId}-description`

/* ---- 取值层：受控 / 非受控 + Value ↔ Text 双通道 ---- */
/* 把 defineEmits 的 emit 适配成具名事件（重载签名不便跨模块传递，同 ScrollView / Slider 的 events 层） */
const numberBoxEvents: NumberBoxValueEvents = {
  valueChange: (value) => emit('update:modelValue', value),
  valueChanged: (args) => emit('valueChanged', args),
}
const {
  currentValue,
  draft,
  isFocused,
  inputMode,
  onDraftUpdate,
  handleFocus,
  handleBlur,
  commitText,
  revertText,
  stepBy,
  isSpinDisabled,
} = useNumberBox(props, numberBoxEvents)

/* ---- 交互层：增减按钮的长按重复（内联与紧凑弹层共用） ---- */
const increaseRepeat = useSpinRepeat({
  onTrigger: () => stepBy(props.step),
  isDisabled: () => isSpinDisabled('increase'),
})
const decreaseRepeat = useSpinRepeat({
  onTrigger: () => stepBy(-props.step),
  isDisabled: () => isSpinDisabled('decrease'),
})

/* 输入框元素：控件宿主里唯一的 input（FluereInput 的根节点就是它），避开组件实例类型 */
const controlEl = ref<HTMLElement | null>(null)

const getInputElement = (): HTMLInputElement | undefined => {
  const element = controlEl.value?.querySelector('input')
  return element instanceof HTMLInputElement ? element : undefined
}

/** 光标移到文本末尾：步进后 draft 变化要到下一帧才写进 DOM，必须等值更新完成 */
const moveCaretToTextEnd = async (): Promise<void> => {
  await nextTick()
  const element = getInputElement()
  element?.setSelectionRange(element.value.length, element.value.length)
}

/** 把焦点与光标交还输入框（WinUI `MoveCaretToTextEnd`：点完增减按钮光标落在文本末尾） */
const focusInput = (): void => {
  const input = getInputElement()
  if (input === undefined) {
    return
  }
  input.focus()
  void moveCaretToTextEnd()
}

const onInputFocus = (): void => {
  handleFocus()
  // WinUI OnNumberBoxGotFocus：获得焦点即全选
  getInputElement()?.select()
}

const onInputBlur = (): void => {
  handleBlur()
}

/** FluereInput 的 model 类型是 `string | undefined`，这里收窄成字符串再交给取值层 */
const onDraftInput = (text: string | undefined): void => {
  onDraftUpdate(text ?? '')
}

/** 步进方向（`0` 以外的字面量都收成常量，避免散落的魔数） */
const STEP_INCREASE = 1
const STEP_DECREASE = -1
/** 滚轮增量为 0 表示没有滚动 */
const NO_WHEEL_DELTA = 0

/** 步进键位表：对应 WinUI `OnNumberBoxKeyDown` 的 Up / Down / PageUp / PageDown 四条分支 */
const KEY_STEPS: Record<string, { size: 'small' | 'large'; direction: number }> = {
  ArrowUp: { size: 'small', direction: STEP_INCREASE },
  ArrowDown: { size: 'small', direction: STEP_DECREASE },
  PageUp: { size: 'large', direction: STEP_INCREASE },
  PageDown: { size: 'large', direction: STEP_DECREASE },
}

const onInputKeydown = (event: KeyboardEvent): void => {
  if (props.disabled) {
    return
  }
  if (event.key === 'Enter') {
    // WinUI：回车结算输入（并吃掉按键，避免触发隐式表单提交）
    event.preventDefault()
    commitText()
    return
  }
  if (event.key === 'Escape') {
    // WinUI：Esc 丢弃输入、回到当前值的文本
    event.preventDefault()
    revertText()
    return
  }

  // 方向键 / PageUp / PageDown 按 WinUI OnNumberBoxKeyDown 的四条分支步进
  const keyStep = KEY_STEPS[event.key]
  if (keyStep === undefined) {
    // Home / End 等交给浏览器（WinUI NumberBox 只处理上 / 下 / PageUp / PageDown）
    return
  }
  event.preventDefault()
  const stepSize = keyStep.size === 'large' ? props.largeStep : props.step
  stepBy(keyStep.direction * stepSize)
}

/** 滚轮步进：WinUI 只在输入框有焦点时响应，且向上滚为增（`MouseWheelDelta > 0`） */
const onInputWheel = (event: WheelEvent): void => {
  if (props.disabled || !isFocused.value || event.deltaY === NO_WHEEL_DELTA) {
    return
  }
  event.preventDefault()
  stepBy(event.deltaY < NO_WHEEL_DELTA ? props.step : -props.step)
}

const onSpinPointerDown = (direction: NumberBoxSpinDirection): void => {
  const repeat = direction === 'increase' ? increaseRepeat : decreaseRepeat
  repeat.start()
  focusInput()
}

const stopSpin = (): void => {
  increaseRepeat.stop()
  decreaseRepeat.stop()
}

/**
 * 键盘激活增减按钮（`detail === 0` 的 click 由 Enter / Space 产生）。
 * 指针点击已经在 pointerdown 时步进过，这里忽略以免一次点击走两步。
 */
const onSpinClick = (direction: NumberBoxSpinDirection, event: MouseEvent): void => {
  if (event.detail !== KEYBOARD_CLICK_DETAIL || isSpinDisabled(direction)) {
    return
  }
  stepBy(direction === 'increase' ? props.step : -props.step)
}

/* ---- 呈现层 ---- */
const isInline = computed(() => props.spinButtonPlacementMode === 'inline')
const isCompact = computed(() => props.spinButtonPlacementMode === 'compact')
/** WinUI：紧凑模式浮层在获得焦点时打开、失焦时关闭 */
const popupOpen = computed(() => isCompact.value && isFocused.value)

const ariaLabel = computed(() => props.label ?? props.header)
const ariaLabelledby = computed(() =>
  ariaLabel.value === undefined && slots.header !== undefined ? headerId : undefined,
)
const hasDescription = computed(
  () => props.description !== undefined || slots.description !== undefined,
)
const ariaDescribedby = computed(() => (hasDescription.value ? descriptionId : undefined))
</script>

<template>
  <span
    class="fui-number-box"
    :data-disabled="disabled ? '' : undefined"
    :data-spin-buttons="spinButtonPlacementMode"
  >
    <!-- HeaderContentPresenter：TextBoxTopHeaderMargin 0,0,0,8 + FontWeight Normal -->
    <span
      v-if="header || $slots.header"
      :id="headerId"
      class="fui-number-box__header"
    >
      <slot name="header">{{ header }}</slot>
    </span>

    <span
      ref="controlEl"
      class="fui-number-box__control"
    >
      <!-- 输入框：WinUI 模板里内嵌的 TextBox（NumberBoxTextBoxStyle 继承 DefaultTextBoxStyle） -->
      <FluereInput
        class="fui-number-box__input"
        type="text"
        :id="inputId"
        :model-value="draft"
        :disabled="disabled"
        :placeholder="placeholder"
        :aria-label="ariaLabel"
        :aria-labelledby="ariaLabelledby"
        :aria-describedby="ariaDescribedby"
        :aria-valuenow="currentValue ?? undefined"
        :aria-valuemin="min"
        :aria-valuemax="max"
        role="spinbutton"
        :inputmode="inputMode"
        autocomplete="off"
        autocorrect="off"
        spellcheck="false"
        @update:model-value="onDraftInput"
        @focus="onInputFocus"
        @blur="onInputBlur"
        @keydown="onInputKeydown"
        @wheel="onInputWheel"
      />

      <!-- SpinButtonPlacementMode=Inline：UpSpinButton(Grid.Column=1) + DownSpinButton(Column=2) -->
      <span
        v-if="isInline"
        class="fui-number-box__spin-buttons"
        @pointerup="stopSpin"
        @pointercancel="stopSpin"
        @pointerleave="stopSpin"
      >
        <button
          type="button"
          class="fui-number-box__spin-button fui-number-box__spin-button--increase"
          tabindex="-1"
          :disabled="isSpinDisabled('increase')"
          :aria-label="increaseName"
          @mousedown.prevent
          @pointerdown="onSpinPointerDown('increase')"
          @click="onSpinClick('increase', $event)"
        >
          <FluentIconChevronUp12Regular />
        </button>
        <button
          type="button"
          class="fui-number-box__spin-button fui-number-box__spin-button--decrease"
          tabindex="-1"
          :disabled="isSpinDisabled('decrease')"
          :aria-label="decreaseName"
          @mousedown.prevent
          @pointerdown="onSpinPointerDown('decrease')"
          @click="onSpinClick('decrease', $event)"
        >
          <FluentIconChevronDown12Regular />
        </button>
      </span>

      <!-- SpinButtonPlacementMode=Compact：右侧指示器 + 焦点时浮出的上 / 下按钮 -->
      <template v-else-if="isCompact">
        <span
          class="fui-number-box__indicator"
          aria-hidden="true"
        >
          <FluentIconChevronUpDown16Regular :size="12" />
        </span>
        <span
          v-if="popupOpen"
          class="fui-number-box__popup"
          @pointerup="stopSpin"
          @pointercancel="stopSpin"
          @pointerleave="stopSpin"
        >
          <button
            type="button"
            class="fui-number-box__popup-button"
            tabindex="-1"
            :disabled="isSpinDisabled('increase')"
            :aria-label="increaseName"
            @mousedown.prevent
            @pointerdown="onSpinPointerDown('increase')"
            @click="onSpinClick('increase', $event)"
          >
            <FluentIconChevronUp16Regular :size="16" />
          </button>
          <button
            type="button"
            class="fui-number-box__popup-button"
            tabindex="-1"
            :disabled="isSpinDisabled('decrease')"
            :aria-label="decreaseName"
            @mousedown.prevent
            @pointerdown="onSpinPointerDown('decrease')"
            @click="onSpinClick('decrease', $event)"
          >
            <FluentIconChevronDown16Regular :size="16" />
          </button>
        </span>
      </template>
    </span>

    <!-- DescriptionPresenter：SystemControlDescriptionTextForegroundBrush → colorNeutralForeground3 -->
    <span
      v-if="hasDescription"
      :id="descriptionId"
      class="fui-number-box__description"
    >
      <slot name="description">{{ description }}</slot>
    </span>

    <!-- 表单提交：位于 <form> 内 + name 时补隐藏原生 input（提交 name=value） -->
    <input
      v-if="name"
      type="hidden"
      :name="name"
      :value="currentValue ?? ''"
      :disabled="disabled"
    />
  </span>
</template>

<style scoped>
/* ------------------------------------------------------------------ */
/* 所有值均引用 Fluent 语义 token（var(--TokenName)），见 fluent-tokens  */
/* 明暗主题由 tokens.css 的 light-dark() + color-scheme 自动切换        */
/*                                                                     */
/* WinUI 3 对照（Windows App SDK，src/controls/dev/NumberBox/）：       */
/*   模板     ControlTemplate 是 Height=TemplateBinding Height 的 Grid   */
/*            Row0 Header / Row1 控件 / Row2 Description                */
/*            HeaderContentPresenter Margin = TextBoxTopHeaderMargin    */
/*              = 0,0,0,8，FontWeight Normal                            */
/*            InputBox = TextBox(NumberBoxTextBoxStyle)，横跨三列        */
/*            BorderElement 同样横跨三列 → 输入框与增减按钮共用一个边框   */
/*   内联     NumberBoxSpinButtonStyle：MinWidth 32 / Padding 0 /        */
/*            BorderThickness 0,1,1,1（画刷为透明，故只剩透明外框）      */
/*            UpSpinButton Margin=4；DownSpinButton Margin=0,4,4,4      */
/*            SpinButtonsVisible 时 InputBox.MinWidth = NumberBoxMinWidth */
/*              = 120                                                   */
/*            字体 FontSize 12（SymbolThemeFontFamily 的 E70E / E70D）   */
/*   紧凑     NumberBoxPopupIndicatorMargin 0,0,8,0，FontSize 12，       */
/*            前景 NumberBoxPopupIndicatorForeground = TextFillColorSecondary */
/*            UpDownPopup：VerticalOffset -27 / HorizontalOffset -21，   */
/*              PopupContentRoot Padding 6 / OverlayCornerRadius 8 /     */
/*              NumberBoxPopupBorderThickness 1 / ThemeShadow depth 16   */
/*            NumberBoxPopupSpinButtonStyle：36×36，CornerRadius 4，      */
/*              间距 4（PopupUpSpinButton Margin 0,0,0,4）               */
/*   按钮配色 RepeatButton* 映射 TextControlButton*：                    */
/*            rest      TextControlButtonBackground（未定义 → 透明）     */
/*            hover     SubtleFillColorSecondary → colorSubtleBackgroundHover */
/*            pressed   SubtleFillColorTertiary  → colorSubtleBackgroundPressed */
/*            边框      ControlFillColorTransparent（恒透明）            */
/*   前景     TextControlButtonForeground                               */
/*              = TextFillColorSecondaryBrush = #9E000000（62% 黑 →      */
/*                白底合成 #616161）→ colorNeutralForeground3（ΔRGB 0，  */
/*                与 TextControlPlaceholderForeground 同一支画刷）       */
/*            …ForegroundPointerOver 与 rest 同值 → 悬停只换底色不变色   */
/*            …ForegroundPressed = TextFillColorTertiaryBrush            */
/*              = #72000000（45% 黑 → 白底 #8D8D8D）→                   */
/*                colorNeutralForeground4 #707070（ΔRGB 29，中性前景     */
/*                梯度里最近的一档；与 FluereInput 显示按钮同一套映射）  */
/*   指示器   NumberBoxPopupIndicatorForeground                         */
/*              = TextFillColorSecondaryBrush → colorNeutralForeground3  */
/*   标题     TextControlHeaderForeground / …Disabled                   */
/*   说明     SystemControlDescriptionTextForegroundBrush                */
/*              = SystemControlPageTextBaseMediumBrush                  */
/*                = SystemBaseMediumColor #99000000（60% 黑 → 白底       */
/*                  #666666）→ colorNeutralForeground3 #616161（ΔRGB 5） */
/*                                                                     */
/* 真实浏览器实测（隔离 Vite + Playwright + 系统 Chrome，              */
/* getComputedStyle 读前景色，明暗两套）：                               */
/*   rest / hover / 指示器 / 说明   #616161（深色 #adadad）              */
/*   pressed                        #707070（深色 #999999）              */
/*                                                                     */
/* 三处 Web 侧补充（WinUI 没有、但不影响观感与语义）：                    */
/*   1. 输入框右侧的文本留白：按钮绝对定位在输入框之上，WinUI 允许文本     */
/*      压到按钮下面，这里让出 84px（内联）/ 32px（紧凑）避免重叠          */
/*   2. 说明文本上方 4px 间距（WinUI 的 DescriptionPresenter 紧贴）       */
/*   3. 紧凑浮层用 colorNeutralBackground1 + shadow16 近似 Acrylic        */
/*      （Fluent 令牌集中没有 Acrylic 材质令牌，取不透明表面 + 同一      */
/*       阴影档位；真实 Mica/Acrylic 见 docs 目标 2）                     */
/* ------------------------------------------------------------------ */

/* ---- 宿主：Header / 控件 / Description 三行 ---- */
.fui-number-box {
  display: inline-flex;
  flex-direction: column;
  align-items: stretch;
  box-sizing: border-box;
  color: var(--colorNeutralForeground1);
  font-family: var(--fontFamilyBase);
  font-size: var(--fontSizeBase300);
  line-height: var(--lineHeightBase300);
  -webkit-tap-highlight-color: transparent;
}

/* ---- 标题：TextBoxTopHeaderMargin 0,0,0,8 + Normal 字重 ---- */
.fui-number-box__header {
  margin-block-end: var(--spacingVerticalS);
  font-weight: var(--fontWeightRegular);
  color: inherit;
}
.fui-number-box[data-disabled] .fui-number-box__header {
  color: var(--colorNeutralForegroundDisabled); /* TextControlHeaderForegroundDisabled */
}

/* ---- 控件：输入框与增减按钮共用一个 TextBox 边框 ---- */
.fui-number-box__control {
  position: relative;
  display: flex;
  align-items: stretch;
  box-sizing: border-box;
}
/* NumberBoxMinWidth：只有内联按钮出现时 WinUI 才约束输入框最小宽度 */
.fui-number-box[data-spin-buttons='inline'] .fui-number-box__control {
  min-width: 120px;
}

/* ---- 输入框：样式完全由 FluereInput（TextBox）提供，这里只调内边距 ---- */
.fui-number-box__control .fui-number-box__input {
  width: 100%;
}
/* 76 = 列宽（Up 32+4+4 / Down 0+32+4），再留 8px 与按钮分开 */
.fui-number-box[data-spin-buttons='inline'] .fui-number-box__control .fui-number-box__input {
  padding-inline-end: 84px;
}
/* 让开右侧指示器（12px 图标 + 8px 边距） */
.fui-number-box[data-spin-buttons='compact'] .fui-number-box__control .fui-number-box__input {
  padding-inline-end: 32px;
}

/* ---- 内联增减按钮：绝对定位在输入框右端（WinUI 是网格第 1 / 2 列） ---- */
.fui-number-box__spin-buttons {
  position: absolute;
  inset-block: 0;
  inset-inline-end: 0;
  display: flex;
  align-items: center;
}
.fui-number-box__spin-button {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  align-self: stretch;
  box-sizing: border-box;
  width: 32px; /* NumberBoxSpinButtonStyle MinWidth 32 */
  margin-block: 4px; /* UpSpinButton Margin="4" 的纵向 */
  margin-inline: 4px;
  padding: 0;
  border: none;
  border-radius: var(--borderRadiusMedium); /* CornerRadius = ControlCornerRadius 4 */
  background-color: var(--colorSubtleBackground); /* TextControlButtonBackground → 透明 */
  color: var(--colorNeutralForeground3); /* TextControlButtonForeground */
  cursor: default;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition:
    background-color var(--durationFast) var(--curveEasyEase),
    color var(--durationFast) var(--curveEasyEase);
}
/* DownSpinButton Margin="0,4,4,4"：左侧不留外边距，与 Up 的 4px 右边距合成 4px 间隔 */
.fui-number-box__spin-button--decrease {
  margin-inline-start: 0;
}

/* ---- 紧凑模式指示器（PopupIndicator） ---- */
.fui-number-box__indicator {
  position: absolute;
  inset-block: 0;
  inset-inline-end: 8px; /* NumberBoxPopupIndicatorMargin 0,0,8,0 */
  display: flex;
  align-items: center;
  color: var(--colorNeutralForeground3); /* NumberBoxPopupIndicatorForeground */
  pointer-events: none;
}

/* ---- 紧凑模式浮层（UpDownPopup）：Acrylic 表面 + 36×36 按钮 ---- */
.fui-number-box__popup {
  position: absolute;
  /* HorizontalOffset -21 / VerticalOffset -27（相对弹层锚点列） */
  top: -27px;
  right: -7px;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px; /* PopupContentRoot Padding 6 */
  border: var(--strokeWidthThin) solid var(--colorNeutralStroke1); /* SurfaceStrokeColorFlyoutBrush */
  border-radius: var(--borderRadiusXLarge); /* OverlayCornerRadius 8 */
  background-color: var(--colorNeutralBackground1); /* AcrylicBackgroundFillColorDefault 的近似 */
  box-shadow: var(--shadow16); /* NumberBoxPopupShadowDepth 16 */
}
.fui-number-box__popup-button {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 36px; /* NumberBoxPopupSpinButtonStyle */
  height: 36px;
  padding: 0;
  border: none;
  border-radius: var(--borderRadiusMedium);
  background-color: var(--colorSubtleBackground);
  color: var(--colorNeutralForeground3); /* RepeatButtonForeground */
  cursor: default;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition:
    background-color var(--durationFast) var(--curveEasyEase),
    color var(--durationFast) var(--curveEasyEase);
}

/* ---- 按钮状态：hover / pressed / disabled（TextControlButton* 三档） ---- */
.fui-number-box__spin-button:not(:disabled):hover,
.fui-number-box__popup-button:not(:disabled):hover {
  background-color: var(--colorSubtleBackgroundHover); /* SubtleFillColorSecondary */
}
.fui-number-box__spin-button:not(:disabled):active,
.fui-number-box__popup-button:not(:disabled):active {
  background-color: var(--colorSubtleBackgroundPressed); /* SubtleFillColorTertiary */
  color: var(--colorNeutralForeground4); /* TextControlButtonForegroundPressed */
}
.fui-number-box__spin-button:disabled,
.fui-number-box__popup-button:disabled {
  color: var(--colorNeutralForegroundDisabled);
  cursor: not-allowed;
}
/* 按钮不参与 Tab 序列（WinUI IsTabStop=False），仅键盘激活 / 读屏聚焦时给焦点环 */
.fui-number-box__spin-button:focus-visible,
.fui-number-box__popup-button:focus-visible {
  outline: var(--strokeWidthThick) solid var(--colorCompoundBrandStroke);
  outline-offset: calc(-1 * var(--strokeWidthThin));
}

/* ---- 说明文本（DescriptionPresenter） ---- */
.fui-number-box__description {
  margin-block-start: var(--spacingVerticalXS);
  color: var(--colorNeutralForeground3); /* SystemControlDescriptionTextForegroundBrush */
  font-size: var(--fontSizeBase200);
  line-height: var(--lineHeightBase200);
}
.fui-number-box[data-disabled] .fui-number-box__description {
  color: var(--colorNeutralForegroundDisabled);
}

/* ---- 动效尊重系统减弱 ---- */
@media (prefers-reduced-motion: reduce) {
  .fui-number-box__spin-button,
  .fui-number-box__popup-button {
    transition: none !important;
  }
}
</style>
