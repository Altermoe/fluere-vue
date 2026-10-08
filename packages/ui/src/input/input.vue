<script lang="ts">
/**
 * FluereInput 组件 Props 契约
 *
 * 设计规范来源：WinUI 3 / Windows App SDK — TextBox 与 PasswordBox
 * tag `winui3/release/2.5.1`（本地快照 temp/winui-src，commit ba3a8d5）：
 *   src/controls/dev/CommonStyles/TextBox_themeresources.xaml      TextBox 模板 / 状态 / 按钮
 *   src/controls/dev/CommonStyles/PasswordBox_themeresources.xaml  PasswordBox 模板（含 RevealButton）
 *   src/controls/dev/CommonStyles/Common_themeresources.xaml       TextControlThemePadding / 描边厚度
 *   src/dxaml/xcp/dxaml/themes/generic.xaml                        TextControlHeaderForeground /
 *                                                                  TextControlThemeMinWidth|MinHeight /
 *                                                                  SystemControlDescriptionTextForegroundBrush /
 *                                                                  HelperButtonThemePadding
 *   src/dxaml/xcp/core/native/text/Controls/PasswordBox.cpp        PasswordChar / 显示按钮显隐判据 /
 *                                                                  Alt+F8
 *   src/dxaml/xcp/dxaml/lib/PasswordBox_Partial.cpp                RevealButton 装配与自动化名
 *   src/dxaml/xcp/core/native/text/Controls/TextBoxBase.cpp        TXTBIT_USEPASSWORD（密码模式）/
 *                                                                  TXTBIT_DISABLEDRAG
 * 样例对照：WinUI Gallery `Samples/PasswordBox/*.txt`（简单 / 标题+占位符+自定义掩码字符 / 显示模式）
 * 取值一律经 Fluent 2 语义 token 落地（fluent-tokens：data/fluent-tokens.json）
 *
 * 模板结构（对应 WinUI 控件的三行 Grid，逐行照抄）：
 *   Row0 Header      → `.fui-input__header`（HeaderContentPresenter，TextBoxTopHeaderMargin 0,0,0,8）
 *   Row1 控件        → `.fui-input__field`（BorderElement 与 ContentElement 同格）
 *                      `.fui-input__control`（input / textarea）
 *                      `.fui-input__reveal`（RevealButton，仅 PasswordBox 的 Peek 模式）
 *   Row2 Description → `.fui-input__description`（DescriptionPresenter）
 *
 * 尺寸 (size)：small (24) / medium (32，默认) / large (40)（px 高度；WinUI 只有 32 一档，尺寸为库扩展）
 *
 * 外观 (appearance)：
 * - outline   描边（默认）：WinUI 的「抬升描边」TextControlElevationBorderBrush ——
 *             顶/左/右 ControlStrokeColorDefault，底边 ControlStrongStrokeColorDefault
 * - underline 下划线：只保留底边（库扩展，WinUI 无此形态）
 *
 * 交互态（对照 WinUI VisualState）：
 * - rest      ControlFillColorDefault 填充 + 抬升描边
 * - hover     PointerOver 只换填充（ControlFillColorSecondary），描边保持不变
 * - focus     Focused 底边换强调色并加粗到 2px（TextControlBorderThemeThicknessFocused = 1,1,1,2），
 *             其余三边仍是 ControlStrokeColorDefault —— 即「底部高亮」，不是四面描边。
 *             Web 侧不改 border-width（避免重排挤压内容）：底边 1px 描边 + 合成背景里的
 *             1px 高亮带拼成 2px，高亮带两端呈「刀形」（上平下弧）
 * - invalid   库扩展（WinUI TextBox 无内建错误态）：status danger 描边 + aria-invalid
 * - disabled  ControlFillColorDisabled 填充 + 四边同色的 ControlStrokeColorDefaultBrush
 *
 * 多行形态 (multiline)：对应 WinUI `TextBox.AcceptsReturn = true` + `TextWrapping = Wrap`，
 * 渲染 `<textarea>`；高度按 `rows` 展开、下限取尺寸高度（WinUI 的 MinHeight 32）。
 *
 * 密码形态 (type="password")：对应 PasswordBox，两条掩码路径：
 *   ① 未显式传 `passwordChar` → 原生 `<input type="password">`。掩码字形由浏览器决定
 *      （Chrome / Firefox 画 U+2022「•」，WinUI 是 U+25CF「●」），换来浏览器原生语义：
 *      密码管理器 / 自动填充 / 输入法 / 读屏「密码框」角色。该字形差异是 Web 侧不可消除的
 *      证据缺口（无对应 CSS / token 可表达）。
 *   ② 显式传 `passwordChar` → 「显示缓冲」掩码（与 WinUI 把明文交给 RichEdit 密码模式同构）：
 *      输入框里放的是掩码串，真值留在组件状态里，逐次编辑按显示差异反推真值
 *      （纯函数层见 password-mask.ts）。此路径下输入框是 `type="text"`，因此
 *      **读屏不再把它当密码框、密码管理器也不再识别** —— 这是换取自定义掩码字形的代价。
 *   两条路径在「掩码状态」（未显示明文）下都拦截 copy / cut / dragstart，对应 WinUI 的
 *   RichEdit 密码模式（TXTBIT_USEPASSWORD）不提供剪贴板出口、以及文本控件的 TXTBIT_DISABLEDRAG。
 *
 * 显示按钮（PasswordBox.PasswordRevealMode）：
 * - peek（默认）聚焦 + 本次聚焦期间「空 → 非空」+ 控件宽 > 5em 时，右侧出现「显示」按钮，
 *   按住期间显示明文、松开即遮蔽；键盘等价物是按住 Alt+F8（松开 F8 遮蔽）。
 *   按钮 `tabindex="-1"`（WinUI IsTabStop=False），不进 Tab 序列。
 * - hidden / visible 不出现按钮，分别恒遮蔽 / 恒显示明文（官方样例即用 CheckBox 在两者间切换）。
 * 非密码输入（type 非 password）时以上全部不生效。
 */
import type { FluerePasswordRevealMode } from './types'

export interface FluereInputProps {
  /**
   * 尺寸
   * @default 'medium'
   */
  size?: 'small' | 'medium' | 'large'

  /**
   * 外观
   * @default 'outline'
   */
  appearance?: 'outline' | 'underline'

  /**
   * 是否禁用
   * @default false
   */
  disabled?: boolean

  /**
   * 是否为无效/错误状态
   * @default false
   */
  invalid?: boolean

  /**
   * 原生 input type（`multiline` 为 true 时忽略）
   * @default 'text'
   */
  type?: 'text' | 'password' | 'email' | 'number' | 'search' | 'tel' | 'url'

  /**
   * 占位符
   */
  placeholder?: string

  /**
   * 标题：渲染在控件上方（WinUI `TextBox.Header` / `Control.Header`）
   * 同时作为输入框的可访问名来源（`aria-labelledby` 指向该元素）
   */
  header?: string

  /**
   * 说明：渲染在控件下方（WinUI `TextBox.Description`）
   * 渲染成 `aria-describedby` 指向的元素
   */
  description?: string

  /**
   * 多行形态（WinUI `TextBox.AcceptsReturn` + `TextWrapping=Wrap`），渲染 `<textarea>`
   * @default false
   */
  multiline?: boolean

  /**
   * 多行行数（仅 `multiline` 生效）
   * @default 3
   */
  rows?: number

  /**
   * 密码显示模式（WinUI `PasswordBox.PasswordRevealMode`，仅 `type="password"` 生效）
   * @default 'peek'
   */
  passwordRevealMode?: FluerePasswordRevealMode

  /**
   * 掩码字符（WinUI `PasswordBox.PasswordChar`，仅 `type="password"` 生效）
   *
   * 不传 → 原生 `type="password"`（字形由浏览器决定，见顶部两条掩码路径）；
   * 传值 → 显示缓冲掩码，字形即该字符（多字符取首个码位）。
   */
  passwordChar?: string

  /**
   * 显示按钮的无障碍名（对应 WinUI 的本地化串 `UIA_PASSWORDBOX_REVEAL`，见 constants.ts）
   */
  revealButtonLabel?: string
}
</script>

<script setup lang="ts">
import { FluentIconEye12Regular } from '@fluere-vue/icons'
import { computed, nextTick, ref, useAttrs, useId, useSlots, watch } from 'vue'
import {
  DEFAULT_MULTILINE_ROWS,
  DEFAULT_REVEAL_BUTTON_LABEL,
  MASK_HISTORY_LIMIT,
  MASK_RANGE_INDEX,
} from './constants'
import { maskPassword, resolveMaskChar, resolveMaskEdit } from './password-mask'
import type { MaskEditRange } from './password-mask'
import { usePasswordReveal } from './use-password-reveal'

const props = withDefaults(defineProps<FluereInputProps>(), {
  size: 'medium',
  appearance: 'outline',
  disabled: false,
  invalid: false,
  type: 'text',
  placeholder: undefined,
  header: undefined,
  description: undefined,
  multiline: false,
  rows: DEFAULT_MULTILINE_ROWS,
  passwordRevealMode: 'peek',
  passwordChar: undefined,
  revealButtonLabel: DEFAULT_REVEAL_BUTTON_LABEL,
})

const model = defineModel<string>()

defineOptions({
  name: 'FluereInput',
  // 宿主是多根（Header / 控件 / Description）；attrs 不自动落点，这里显式绑到 input / textarea，
  // 与改造前一致：id / aria-* / autocomplete / 事件监听全部由控件接收
  // （FluereNumberBox 依赖这一点：它把 role="spinbutton"、@keydown、@wheel 透传给输入框）
  inheritAttrs: false,
})

const attrs = useAttrs()
const slots = useSlots()

const rootRef = ref<HTMLElement | null>(null)
const controlRef = ref<HTMLInputElement | HTMLTextAreaElement | null>(null)

const value = computed(() => model.value ?? '')

/* A11y 关联 id 走 Vue 的 useId（SSR 与水合一致，见 docs/ssr-guide.md 第 9 节） */
const headerId = `fui-input-${useId()}-header`
const descriptionId = `fui-input-${useId()}-description`

/* ---- 密码状态：掩码路径 + 显示按钮 ---- */
const isPassword = computed(() => props.multiline !== true && props.type === 'password')
/** 显式给出掩码字符才走显示缓冲（否则交回原生 type="password"） */
const maskBufferEnabled = computed(
  () => isPassword.value && props.passwordChar !== undefined && props.passwordChar !== '',
)
const maskChar = computed(() => resolveMaskChar(props.passwordChar))

const { revealed, showButton, onControlFocus, onControlBlur, startPeek, stopPeek } =
  usePasswordReveal({
    rootRef,
    mode: () => props.passwordRevealMode,
    value: () => value.value,
    enabled: () => isPassword.value,
    disabled: () => props.disabled,
  })

/** 掩码串（长度与真值一一对应，光标位置可直接映射到真值下标） */
const maskedValue = computed(() => maskPassword(value.value, maskChar.value))
/** 显示缓冲是否生效：密码 + 掩码状态 + 显式指定了掩码字符 */
const bufferActive = computed(() => maskBufferEnabled.value && !revealed.value)

/**
 * 输入框当前值。
 * - 显示缓冲：掩码串（真值留在 model 里）
 * - 其余：真值本身（`type="password"` 时由浏览器掩码）
 */
const displayValue = computed(() => (bufferActive.value ? maskedValue.value : value.value))

/** 输入框的 type：显示缓冲必须是 text（否则浏览器会把掩码串再掩一次） */
const controlType = computed(() => {
  if (props.multiline === true) {
    return undefined
  }
  if (!isPassword.value) {
    return props.type
  }
  if (maskBufferEnabled.value) {
    return 'text'
  }
  return revealed.value ? 'text' : 'password'
})

/** 掩码状态下内容不可取出：WinUI 把明文交给 RichEdit 密码模式，控件不提供剪贴板 / 拖拽出口 */
const contentHidden = computed(() => isPassword.value && !revealed.value)

const onCopyOrCut = (event: ClipboardEvent): void => {
  if (contentHidden.value) {
    event.preventDefault()
  }
}

const onDragStart = (event: DragEvent): void => {
  if (contentHidden.value) {
    event.preventDefault()
  }
}

/* ---- 显示按钮：按住显示（WinUI 的 ToggleButton 由 IsPressed 驱动） ---- */
const revealPressed = ref(false)

const onRevealPointerDown = (event: PointerEvent): void => {
  // 不让按钮抢焦点（WinUI IsTabStop=False，光标留在输入框里）
  event.preventDefault()
  revealPressed.value = true
  startPeek()
}

const onRevealPointerUp = (): void => {
  revealPressed.value = false
  stopPeek()
}

/* ---- Alt+F8：WinUI 的键盘等价物（PasswordBox_Partial.cpp#OnKeyDown / OnKeyUp） ---- */
const onControlKeydown = (event: KeyboardEvent): void => {
  // 掩码路径的撤销 / 重做：浏览器撤销栈里只有掩码串（字符不可还原），一律自己接管
  if (bufferActive.value && (event.ctrlKey || event.metaKey) && !event.altKey) {
    const redo =
      event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey)
    const undo = event.key.toLowerCase() === 'z' && !event.shiftKey
    if (undo || redo) {
      event.preventDefault()
      applyHistory(redo ? 1 : -1)
      return
    }
  }
  if (!isPassword.value || props.disabled || event.key !== 'F8' || !event.altKey) {
    return
  }
  event.preventDefault()
  startPeek()
}

const onControlKeyup = (event: KeyboardEvent): void => {
  if (!isPassword.value || event.key !== 'F8') {
    return
  }
  stopPeek()
}

/** 读出当前选区，供会重写 value / type 的操作还原光标 */
const readSelection = (
  element: HTMLInputElement | HTMLTextAreaElement | null,
): { start: number; end: number } | undefined => {
  if (element === null) {
    return undefined
  }
  return { start: element.selectionStart ?? 0, end: element.selectionEnd ?? 0 }
}

const restoreSelection = (
  selection: { start: number; end: number } | undefined,
  length?: number,
): void => {
  const element = controlRef.value
  if (
    element === null ||
    selection === undefined ||
    typeof element.setSelectionRange !== 'function'
  ) {
    return
  }
  const max = length ?? element.value.length
  element.setSelectionRange(Math.min(selection.start, max), Math.min(selection.end, max))
}

/* 明暗切换（含消费方改 passwordRevealMode）：真值与掩码串等长，光标下标可直接沿用；
   改变 type / value 都可能让浏览器把光标丢到末尾，故在 DOM 打完补丁后放回去 */
watch(revealed, async () => {
  const selection = readSelection(controlRef.value)
  await nextTick()
  restoreSelection(selection)
})

const onControlFocusIn = (): void => {
  onControlFocus()
}

const onControlFocusOut = (): void => {
  onControlBlur()
  revealPressed.value = false
}

/* ---- 显示缓冲掩码：把浏览器写进输入框的原始字符反推回真值 ---- */
/**
 * `beforeinput` 捕获到的「本次编辑的原始信息」。
 *
 * 只需要区间，但**必须自己推**：Chrome / Firefox 对 `input` / `textarea` 的
 * `getTargetRanges()` 一律返回空表（该 API 的规范语义只覆盖 contenteditable），
 * 而掩码字形全都一样，纯靠前后缀差异既分不清「删的是哪一位」，也分不清
 * 「插到哪一位」（见 password-mask.ts 的已知歧义）。因此这里记录编辑前的
 * 选区与 `inputType`，在 `input` 里按类型还原出精确区间：
 *   插入类 → 区间就是编辑前的选区；
 *   删除类 → 折叠光标时用「长度差」把区间锚在光标前 / 后（Backward / Forward）。
 */
let pendingEdit: { inputType: string; start: number; end: number } | undefined = undefined
/** 组合输入（IME）期间不改写输入框，否则候选会被打断 */
const composing = ref(false)
/** 撤销快照（浏览器自带撤销栈里只有掩码串，字符不可还原，故自持一份） */
const history: { value: string; caret: number }[] = []
const historyIndex = ref(-1)
/** 最近一次由本组件写入的真值：用来区分「自己的编辑」与「消费方改值」 */
let lastCommitted: string | undefined = undefined

const pushHistory = (next: string, caret: number): void => {
  history.splice(historyIndex.value + 1)
  history.push({ value: next, caret })
  if (history.length > MASK_HISTORY_LIMIT) {
    history.shift()
  }
  historyIndex.value = history.length - 1
}

const resetHistory = (): void => {
  history.length = 0
  historyIndex.value = -1
}

/** 把光标（以及可能被 Vue 重写过的显示值）对齐到当前掩码串 */
const syncControlDisplay = async (caret?: number): Promise<void> => {
  await nextTick()
  const element = controlRef.value
  if (element === null || !bufferActive.value) {
    return
  }
  if (element.value !== maskedValue.value) {
    element.value = maskedValue.value
  }
  if (caret !== undefined) {
    restoreSelection({ start: caret, end: caret }, maskedValue.value.length)
  }
}

/** 用浏览器写进去的串反推真值，回写 model，并把光标放回编辑点 */
const commitMaskEdit = (nextMask: string, range?: MaskEditRange): void => {
  const resolution = resolveMaskEdit({
    previousMask: maskedValue.value,
    nextMask,
    previousValue: value.value,
    range,
  })
  if (resolution.value !== value.value) {
    model.value = resolution.value
    lastCommitted = resolution.value
    pushHistory(resolution.value, resolution.caret)
  }
  void syncControlDisplay(resolution.caret)
}

const applyHistory = (step: number): void => {
  const snapshot = history[historyIndex.value + step]
  if (snapshot === undefined) {
    return
  }
  historyIndex.value += step
  model.value = snapshot.value
  lastCommitted = snapshot.value
  void syncControlDisplay(snapshot.caret)
}

const onMaskBeforeInput = (event: InputEvent): void => {
  // 注意：处理器必须静态绑定 —— `@beforeinput="cond ? fn : undefined"` 会被 Vue 当成
  // 内联语句包成 `($event) => cond ? fn : undefined`，函数永远不会被调用（踩过一次）
  pendingEdit = undefined
  if (!bufferActive.value) {
    return
  }
  if (event.inputType === 'historyUndo' || event.inputType === 'historyRedo') {
    // 浏览器撤销栈里是掩码串（字符不可还原），拦下来交给本组件按真值撤销
    event.preventDefault()
    applyHistory(event.inputType === 'historyUndo' ? -1 : 1)
    return
  }
  const element = event.target
  if (!(element instanceof HTMLInputElement)) {
    return
  }
  const ranges = typeof event.getTargetRanges === 'function' ? event.getTargetRanges() : []
  const range = ranges[MASK_RANGE_INDEX]
  pendingEdit =
    range === undefined
      ? {
          inputType: event.inputType,
          start: element.selectionStart ?? 0,
          end: element.selectionEnd ?? 0,
        }
      : { inputType: event.inputType, start: range.startOffset, end: range.endOffset }
}

/** 把 `pendingEdit` + 编辑后的掩码串还原成「本次被替换掉的区间」 */
const resolvePendingRange = (nextMask: string): MaskEditRange | undefined => {
  const edit = pendingEdit
  pendingEdit = undefined
  if (edit === undefined) {
    return undefined
  }
  const previousLength = maskedValue.value.length
  if (edit.inputType.startsWith('delete') && edit.end <= edit.start) {
    // 折叠光标上的删除：删掉的字数 = 长度差，区间锚在光标前 / 后
    const removed = previousLength - nextMask.length
    if (removed <= 0) {
      return undefined
    }
    return edit.inputType.endsWith('Backward')
      ? { start: edit.start - removed, end: edit.start }
      : { start: edit.start, end: edit.start + removed }
  }
  return { start: edit.start, end: edit.end }
}

const onMaskInput = (event: Event): void => {
  const element = event.target
  if (!(element instanceof HTMLInputElement) || !bufferActive.value) {
    return
  }
  if (composing.value) {
    // IME 组合中：不动 DOM（组合期间的明文由 -webkit-text-security 兜住），提交后再收敛
    return
  }
  commitMaskEdit(element.value, resolvePendingRange(element.value))
}

const onCompositionStart = (): void => {
  composing.value = true
}

const onCompositionEnd = (event: CompositionEvent): void => {
  composing.value = false
  const element = event.target
  if (!(element instanceof HTMLInputElement) || !bufferActive.value) {
    return
  }
  // 组合输入没有可用的编辑区间：整串回退到差异法（组合文本恰好等于掩码字符时才可能歧义）
  pendingEdit = undefined
  commitMaskEdit(element.value)
}

/** 非掩码路径：与 v-model 等价（Vue 只在值真的变化时才写 DOM，见 runtime-dom patchDOMProp） */
const onControlInput = (event: Event): void => {
  const element = event.target
  if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
    return
  }
  if (bufferActive.value) {
    onMaskInput(event)
    return
  }
  model.value = element.value
}

/**
 * 真值被「消费方」改掉（不是本组件的编辑 / 撤销）时清空撤销栈：
 * 快照已经和外部状态脱节，继续撤销会跳回陈旧的值。
 * 显示 / 遮蔽切换（peek、passwordRevealMode）不改真值，因此**不**清栈。
 */
watch(value, (next) => {
  if (next !== lastCommitted) {
    resetHistory()
  }
})

/* ---- Header / Description（HeaderContentPresenter / DescriptionPresenter） ---- */
const hasHeader = computed(() => props.header !== undefined || slots.header !== undefined)
const hasDescription = computed(
  () => props.description !== undefined || slots.description !== undefined,
)
/** 消费方显式给了名字就不再补 aria-labelledby，避免覆盖（attrs 最后绑定，见模板） */
const consumerLabelled = computed(
  () => attrs['aria-label'] !== undefined || attrs['aria-labelledby'] !== undefined,
)
const ariaLabelledby = computed(() =>
  hasHeader.value && !consumerLabelled.value ? headerId : undefined,
)
const ariaDescribedby = computed(() =>
  hasDescription.value && attrs['aria-describedby'] === undefined ? descriptionId : undefined,
)

const rootClass = computed(() => [
  'fui-input',
  `fui-input--${props.size}`,
  `fui-input--${props.appearance}`,
  { 'fui-input--invalid': props.invalid },
])
</script>

<template>
  <span
    ref="rootRef"
    :class="rootClass"
    :data-size="size"
    :data-disabled="disabled ? '' : undefined"
    :data-multiline="multiline ? '' : undefined"
    :data-reveal="showButton ? '' : undefined"
    :data-reveal-pressed="revealPressed ? '' : undefined"
  >
    <!-- HeaderContentPresenter：TextBoxTopHeaderMargin 0,0,0,8 + FontWeight Normal -->
    <span
      v-if="hasHeader"
      :id="headerId"
      class="fui-input__header"
    >
      <slot name="header">{{ header }}</slot>
    </span>

    <!-- Row1：BorderElement 与 ContentElement 同格，RevealButton 叠在控件右端 -->
    <span class="fui-input__field">
      <textarea
        v-if="multiline"
        ref="controlRef"
        class="fui-input__control"
        :rows="rows"
        :value="displayValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :aria-invalid="invalid || undefined"
        :aria-labelledby="ariaLabelledby"
        :aria-describedby="ariaDescribedby"
        v-bind="attrs"
        @input="onControlInput"
      />
      <input
        v-else
        ref="controlRef"
        class="fui-input__control"
        :type="controlType"
        :value="displayValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :aria-invalid="invalid || undefined"
        :aria-labelledby="ariaLabelledby"
        :aria-describedby="ariaDescribedby"
        :spellcheck="bufferActive ? false : undefined"
        :autocapitalize="bufferActive ? 'off' : undefined"
        :data-composing="composing ? '' : undefined"
        v-bind="attrs"
        @input="onControlInput"
        @beforeinput="onMaskBeforeInput"
        @compositionstart="onCompositionStart"
        @compositionend="onCompositionEnd"
        @copy="onCopyOrCut"
        @cut="onCopyOrCut"
        @dragstart="onDragStart"
        @focusin="onControlFocusIn"
        @focusout="onControlFocusOut"
        @keydown="onControlKeydown"
        @keyup="onControlKeyup"
      />

      <!-- RevealButton：ToggleButton + Eye 字形（PasswordBoxIconFontSize 12），仅 Peek 模式 -->
      <button
        v-if="showButton"
        type="button"
        class="fui-input__reveal"
        tabindex="-1"
        :aria-label="revealButtonLabel"
        @mousedown.prevent
        @pointerdown="onRevealPointerDown"
        @pointerup="onRevealPointerUp"
        @pointercancel="onRevealPointerUp"
        @pointerleave="onRevealPointerUp"
        @contextmenu.prevent
        @click.prevent
      >
        <FluentIconEye12Regular />
      </button>
    </span>

    <!-- DescriptionPresenter：SystemBaseMediumColor → colorNeutralForeground3（见样式段） -->
    <span
      v-if="hasDescription"
      :id="descriptionId"
      class="fui-input__description"
    >
      <slot name="description">{{ description }}</slot>
    </span>
  </span>
</template>

<style scoped>
/* ------------------------------------------------------------------ */
/* 所有值均引用 Fluent 语义 token（var(--TokenName)），见 fluent-tokens  */
/* 明暗主题由 tokens.css 的 light-dark() + color-scheme 自动切换        */
/*                                                                     */
/* WinUI 3 对照（Windows App SDK 2.5.1，src/controls/dev/CommonStyles）：*/
/*   TextControlElevationBorderBrush         rest / hover 描边：        */
/*       顶/左/右 ControlStrokeColorDefault（#0F000000，6% 黑）         */
/*       底      ControlStrongStrokeColorDefault（#72000000，45% 黑）   */
/*       （渐变笔刷 ScaleY=-1，故重色落在底边 —— WinUI 的「抬升描边」） */
/*   TextControlElevationBorderFocusedBrush  focus 描边：底边换强调色， */
/*       其余三边回落到 ControlStrokeColorDefault                      */
/*   TextControlBorderThemeThickness         1（四边 1px）              */
/*   TextControlBorderThemeThicknessFocused  1,1,1,2（只加粗底边）      */
/*       Web 侧不跟着改 border-width（会重排并挤压内容），四边宽度全程 */
/*       保持 1px：底边由「1px 底描边 + 合成背景里的 1px 高亮带」拼成  */
/*       2px。高亮带两端是「刀形」（上平下弧），与 WinUI 底边一致       */
/*   ControlFillColorDefault / Secondary / InputActive / Disabled       */
/*       分别对应 rest / hover / focus / disabled 的填充                */
/*       （WinUI 用半透明填充给 Mica 透底；Web 侧落到不透明的           */
/*        colorNeutralBackground1 / …Hover / …Disabled，纯色底上等价）  */
/*                                                                     */
/* 三处 WinUI 原值在 Fluent web token 集中没有同值项，取语义最近者：    */
/*   ControlStrokeColorDefault       #0F000000（6% 黑）                 */
/*     → colorNeutralStrokeAlpha     rgba(0,0,0,.05)（5% 黑）/ 白 10%   */
/*   ControlStrongStrokeColorDefault #72000000（45% 黑）                */
/*     → colorNeutralStroke1 #d1d1d1（偏轻，取 Fluent 的控件描边档）    */
/*   focus 底边 SystemAccentColorDark1（Light）/ Light2（Dark）         */
/*     → colorCompoundBrandStroke（库品牌色，随 BrandVariants 走）      */
/*                                                                     */
/* 标题 / 说明 / 显示按钮（对照 TextBox 与 PasswordBox 模板资源）：      */
/*   TextControlHeaderForeground ← SystemControlForegroundBaseHighBrush */
/*     = SystemBaseHighColor #FF000000（纯黑）→ colorNeutralForeground1 */
/*   TextControlHeaderForegroundDisabled                                */
/*     ← SystemControlDisabledBaseMediumLowBrush                        */
/*     = SystemBaseMediumLowColor #66000000（40% 黑 → 白底 #999999）    */
/*     → colorNeutralForegroundDisabled（#bdbdbd；禁用档语义位对应）     */
/*   SystemControlDescriptionTextForegroundBrush                        */
/*     = SystemControlPageTextBaseMediumBrush = SystemBaseMediumColor   */
/*       #99000000（60% 黑 → 白底 #666666）→ colorNeutralForeground3    */
/*       #616161（ΔRGB 5；与占位符 TextFillColorSecondary 同档灰）      */
/*   TextControlButtonForeground        = TextFillColorSecondaryBrush   */
/*       #9E000000（62% 黑 → #616161）→ colorNeutralForeground3（ΔRGB 0）*/
/*   TextControlButtonForegroundPressed = TextFillColorTertiaryBrush    */
/*       #72000000（45% 黑 → 白底 #8D8D8D）→ colorNeutralForeground4    */
/*       #707070（ΔRGB 29，中性前景梯度里最近的一档）                    */
/*   TextControlButtonBackgroundPointerOver / Pressed                   */
/*       = SubtleFillColorSecondary / TertiaryBrush                     */
/*       → colorSubtleBackgroundHover / …Pressed（语义位对应；白底合成 */
/*         值 #F7F7F7 / #FCFCFC 与 token #f5f5f5 / #e0e0e0 的 ΔRGB 为   */
/*         2 / 28 —— 与 NumberBox 内联按钮同一套映射，保持库内一致）    */
/*   TextBoxInnerButtonMargin 0,4,4,4 → --fui-input-reveal-inset: 4px    */
/*   OnRevealButtonSizeChanged（按钮宽 = 实际高，正方形）                 */
/*       → 按钮边长 = 控件高 − 2 × 4px                                   */
/*   PasswordBoxIconFontSize 12 → 12px 字形（FluentIconEye12Regular）    */
/*   HelperButtonThemePadding 0,0,-2,0 的负右内边距 CSS 不可表达         */
/*       （padding 不允许负值）：这里字形居中不偏移，与 WinUI 相差 ≤1px  */
/*                                                                     */
/* 真实浏览器实测（Playwright + Chrome，浅色主题，中等尺寸）：           */
/*   控件高 32 / 按钮 24×24 / 右内缩 4 / 圆角 4px                       */
/*   按钮字形前景 rgb(97,97,97)（= #616161 = colorNeutralForeground3）   */
/*   按钮在场时控件 padding-inline-end = 40px（32 − 4 + 12）             */
/*   标题 margin-bottom 8px / font-weight 400                            */
/*   说明前景 rgb(97,97,97)（浅色）、rgb(173,173,173)（深色 = #adadad）  */
/*   多行：min-height 32px、padding-block 4px、resize: vertical          */
/*   行为：中间插入 / 中间退格 / 选中替换 / 粘贴 / Ctrl+Z / Ctrl+Shift+Z  */
/*         后的 v-model 真值均与输入一致；掩码状态 copy / cut             */
/*         / dragstart 被 preventDefault 且剪贴板无内容；visible 模式下   */
/*         Ctrl+C 可复制                                                 */
/*   方法：temp/input-verify 的隔离 Vite 用例 + temp/pw-input-verify.mjs  */
/*         （temp/ 不进仓库，故结论落在此处与 input.test.ts 的契约断言）  */
/* ------------------------------------------------------------------ */

/* 高亮色是渐变里的颜色停靠点，而 background-image 本身不可过渡；
   注册成 <color> 后，--fui-input-highlight-background 才能参与缓动 */
@property --fui-input-highlight-background {
  syntax: '<color>';
  inherits: false;
  initial-value: transparent;
}

/* ---- 宿主：Header / 控件 / Description 三行（对应模板的三行 Grid） ---- */
.fui-input {
  /* 显示按钮的内缩（TextBoxInnerButtonMargin 0,4,4,4）与边长都由这里派生 */
  --fui-input-reveal-inset: 4px;

  display: grid;
  align-items: stretch;
  box-sizing: border-box;
  font-family: var(--fontFamilyBase);
  color: var(--colorNeutralForeground1);
}

/* ---- 尺寸：高度与文本内边距进变量，字号 / 行高由标题与说明一并继承 ---- */
.fui-input--small {
  --fui-input-height: 24px;
  --fui-input-padding-inline: var(--spacingHorizontalS);

  font-size: var(--fontSizeBase200);
  line-height: var(--lineHeightBase200);
}
.fui-input--medium {
  --fui-input-height: 32px;
  --fui-input-padding-inline: var(--spacingHorizontalM);

  font-size: var(--fontSizeBase300);
  line-height: var(--lineHeightBase300);
}
.fui-input--large {
  --fui-input-height: 40px;
  --fui-input-padding-inline: var(--spacingHorizontalL);

  font-size: var(--fontSizeBase400);
  line-height: var(--lineHeightBase400);
}

/* ---- 标题：TextBoxTopHeaderMargin 0,0,0,8（= spacingVerticalS）+ Normal 字重 ---- */
.fui-input__header {
  margin-block-end: var(--spacingVerticalS);
  font-weight: var(--fontWeightRegular);
  color: inherit;
}
.fui-input[data-disabled] .fui-input__header {
  color: var(--colorNeutralForegroundDisabled); /* TextControlHeaderForegroundDisabled */
}

/* ---- 控件行：显示按钮的定位上下文（BorderElement 与 ContentElement 同格） ---- */
.fui-input__field {
  position: relative;
  display: block;
  box-sizing: border-box;
}

/* ---- Base：抬升描边（顶/左/右浅、底边重）+ 底部高亮带 ---- */
.fui-input__control {
  /* 两个语义背景变量，换色只需覆写这两个（用更高优先级选择器，如 .my-field .fui-input__control）：
     - --fui-input-background           真正的背景色
     - --fui-input-highlight-background 用于显示高亮的背景色（rest 为 transparent） */
  --fui-input-background: var(--colorNeutralBackground1);
  --fui-input-highlight-background: transparent;

  box-sizing: border-box;
  width: 100%;
  height: var(--fui-input-height);
  padding-inline: var(--fui-input-padding-inline);
  /* 表单控件默认不继承字体，这里显式继承宿主的字族 / 字号 / 行高（尺寸档与标题说明共用一份） */
  font: inherit;
  color: inherit;
  /* 合成背景 = 背景色 + 底部 1px 高亮带，与 1px 底描边拼成 WinUI focus 的 2px。
     渐变沿水平方向铺开，高亮带两端因此是「刀形」：上沿是直线，下沿随圆角收进去。
     （inset 阴影会沿 padding box 圆角把两端往上翘，呈月牙形，故不用） */
  background: var(--fui-input-background)
    linear-gradient(
      to bottom,
      transparent,
      transparent calc(100% - var(--strokeWidthThin)),
      var(--fui-input-highlight-background) calc(100% - var(--strokeWidthThin)),
      var(--fui-input-highlight-background)
    );
  background-repeat: no-repeat;
  /* BackgroundSizing="InnerBorderEdge"：填充止于描边内侧 —— 高亮带正好贴在底描边上方，
     半透明描边也叠在父级底上。background 简写会把 background-clip 重置回 border-box，
     故这条必须写在 background 之后 */
  /* background-clip: padding-box; */
  border: var(--strokeWidthThin) solid var(--colorNeutralStrokeAlpha);
  border-bottom-color: var(--colorNeutralStroke1);
  border-radius: var(--borderRadiusMedium);
  outline: none;
  transition:
    background-color var(--durationFast) var(--curveEasyEase),
    border-color var(--durationNormal) var(--curveDecelerateMid),
    --fui-input-highlight-background var(--durationNormal) var(--curveDecelerateMid);
}

/* ---- 多行形态：高度按 rows 展开，下限取尺寸高度（WinUI MinHeight 32） ---- */
.fui-input[data-multiline] .fui-input__control {
  height: auto;
  min-height: var(--fui-input-height);
  /* WinUI TextControlThemePadding 的上下内边距为 5 / 6，token 表无同值档，取 4 */
  padding-block: var(--spacingVerticalXS);
  resize: vertical;
}

/* ---- 显示按钮在场时给文本让位（按钮绝对定位叠在控件右端） ---- */
/* 让位宽 = 按钮左缘（控件高 − 内缩）+ 本尺寸文本内边距：等价于 WinUI 把文本列收窄到按钮列之前 */
.fui-input[data-reveal] .fui-input__control {
  padding-inline-end: calc(
    var(--fui-input-height) - var(--fui-input-reveal-inset) + var(--fui-input-padding-inline)
  );
}

/* ---- 外观：underline 只留底边（库扩展；底边用控件描边档 colorNeutralStroke1） ---- */
.fui-input--underline .fui-input__control {
  border: none;
  border-bottom: var(--strokeWidthThin) solid var(--colorNeutralStroke1);
  border-radius: 0;
}

/* ---- 占位符：TextFillColorSecondary（#9E000000，62% 黑 → #616161） ---- */
.fui-input__control::placeholder {
  color: var(--colorNeutralForeground3);
}

/* ---- 选中文本：TextControlSelectionHighlightColor（= SystemAccentColor） ---- */
/* WinUI 只暴露高亮底色；选中文字的前景由系统挑，Web 侧取 onBrand 保证对比度 */
.fui-input__control::selection {
  background-color: var(--colorCompoundBrandBackground);
  color: var(--colorNeutralForegroundOnBrand);
}

/* ---- 状态：hover（PointerOver） ---- */
/* PointerOver 不改描边 —— BorderBrush 与 rest 是同一把 elevation 笔刷，
   只把填充换成 ControlFillColorSecondary。
   用 :not(:focus-visible) 还原 WinUI 的 VisualState 优先级：Focused 压过 PointerOver */
.fui-input__control:hover:not(:disabled):not(:focus-visible) {
  --fui-input-background: var(--colorNeutralBackground1Hover);
}

/* ---- 状态：focus（Focused）—— 只有底边高亮 ---- */
/* 只换两个颜色：底描边 + 合成背景里的高亮带同时变强调色，拼成 2px。
   四边 border-width 全程不变，故无重排、不挤压内容；
   border-color 与高亮带色都走 durationNormal + curveDecelerateMid 缓动 */
.fui-input__control:focus-visible {
  --fui-input-highlight-background: var(--colorCompoundBrandStroke);

  border-color: var(--colorNeutralStrokeAlpha);
  border-bottom-color: var(--colorCompoundBrandStroke);
}

/* ---- 状态：invalid（库扩展：WinUI TextBox 无内建错误态，走 status danger） ---- */
.fui-input--invalid .fui-input__control {
  border-color: var(--colorStatusDangerBorder2);
}
.fui-input--invalid .fui-input__control:focus-visible {
  --fui-input-highlight-background: var(--colorStatusDangerBorder2);

  border-color: var(--colorStatusDangerBorder2);
}

/* ---- 状态：disabled ---- */
/* 禁用态换成单色 ControlStrokeColorDefaultBrush：四边同色、没有抬升描边与高亮 */
.fui-input__control:disabled {
  --fui-input-background: var(--colorNeutralBackgroundDisabled);

  color: var(--colorNeutralForegroundDisabled);
  border-color: var(--colorNeutralStrokeDisabled);
  cursor: not-allowed;
}
.fui-input__control:disabled::placeholder {
  color: var(--colorNeutralForegroundDisabled);
}

/* ---- 显示按钮（RevealButton）：正方形方块、透明底、12px 眼睛字形 ---- */
.fui-input__reveal {
  position: absolute;
  inset-block-start: var(--fui-input-reveal-inset);
  inset-inline-end: var(--fui-input-reveal-inset);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  /* OnRevealButtonSizeChanged：按钮宽 = 实际高 = 控件高 − 上下内缩 */
  width: calc(var(--fui-input-height) - (var(--fui-input-reveal-inset) * 2));
  height: calc(var(--fui-input-height) - (var(--fui-input-reveal-inset) * 2));
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

/* PointerOver → SubtleFillColorSecondary；按下态由 data-reveal-pressed 驱动
   （按钮 pointerdown 已 preventDefault，:active 不可靠），与 WinUI 的 IsPressed 同源 */
.fui-input__reveal:hover {
  background-color: var(--colorSubtleBackgroundHover);
}
.fui-input[data-reveal-pressed] .fui-input__reveal {
  background-color: var(--colorSubtleBackgroundPressed);
  color: var(--colorNeutralForeground4); /* TextControlButtonForegroundPressed */
}

/* 按钮不参与 Tab 序列（WinUI IsTabStop=False），仅读屏 / 键盘聚焦时给焦点环 */
.fui-input__reveal:focus-visible {
  outline: var(--strokeWidthThick) solid var(--colorCompoundBrandStroke);
  outline-offset: calc(-1 * var(--strokeWidthThin));
}

/* 显示缓冲掩码在 IME 组合期间没有掩码串可显示：退回浏览器的 disc 兜住明文
   （WinUI 在密码模式下把 InputScope 设为 IS_PASSWORD、输入法不参与；Web 侧无法禁用
   输入法，只能保证组合中的字符不以明文示人） */
.fui-input__control[data-composing] {
  -webkit-text-security: disc;
}

/* ---- 说明（DescriptionPresenter）：紧贴控件下沿，无外边距 ---- */
.fui-input__description {
  color: var(--colorNeutralForeground3); /* SystemControlDescriptionTextForegroundBrush */
}
</style>
