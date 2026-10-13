<script setup lang="ts" generic="T extends AcceptableValue = AcceptableValue">
import { FluentIconChevronDown12Regular } from '@fluere-vue/icons'
import type { AcceptableValue } from 'reka-ui'
import {
  ComboboxAnchor,
  ComboboxContent,
  ComboboxInput,
  ComboboxPortal,
  ComboboxRoot,
  ComboboxItem as RekaComboboxItem,
} from 'reka-ui'
import { computed, nextTick, onMounted, onUnmounted, ref, useId, useSlots } from 'vue'
import { useFlyout } from '../flyout/use-flyout'
import { DEFAULT_MAX_DROPDOWN_HEIGHT, NEXT_ITEM_STEP, PREVIOUS_ITEM_STEP } from './constants'
import {
  resolveHighlightIntent,
  resolveSurfacePointerAction,
  resolveWheelStep,
} from './interaction'
import { itemText } from './items'
import type {
  FluereComboboxProps,
  FluereComboboxSelectionChangedEventArgs,
  FluereComboboxTextSubmittedEventArgs,
} from './types'
import { useComboboxEditable } from './use-combobox-editable'
import { useComboboxInteraction } from './use-combobox-interaction'
import { useComboboxKeyboard } from './use-combobox-keyboard'
import { useComboboxPopup } from './use-combobox-popup'
import { useComboboxSearch } from './use-combobox-search'
import { useComboboxSelection } from './use-combobox-selection'
import type { ComboboxSelectionEvents } from './use-combobox-selection'

/**
 * FluereCombobox — WinUI 3 ComboBox 的 Vue 3 实现。
 *
 * 设计规范来源：WinUI 3 / Windows App SDK 2.0
 *   src/controls/dev/ComboBox/ComboBox_themeresources.xaml（ControlTemplate / 资源 / 动画）
 *   src/dxaml/xcp/dxaml/lib/ComboBox_Partial.cpp（键位 / 文本搜索 / 弹层定位 / 可编辑态）
 *   src/dxaml/xcp/dxaml/lib/ComboBoxItem_Partial.cpp（下拉项状态机）
 *
 * 解剖（对照 ControlTemplate）：
 * - root            外层 Grid：Header / 控件行 / Description 三行
 * - surface         Background 边框（ControlElevationBorder 抬升描边 + 圆角 4 + 最小 32 高）
 * - text            ContentPresenter / EditableText：WinUI 用 38px 右侧字形列 + 12,5,0,7 内边距
 * - chevron         DropDownGlyph：12×12 字形，右内边距 14；可编辑态另有 30×24 的
 *                   DropDownOverlay 热区（圆角 4，带 hover / pressed 底色）
 * - pill            ComboBox 自身的选中指示条：3×16、品牌色、左内 1px，仅 Focused 显示
 * - popup           PopupBorder：圆角 8、1px SurfaceStrokeColorFlyout、Acrylic 表面、
 *                   最大高 504、内容上下留白 4；逐项 Margin 5,2 + Padding 11,5,11,7
 * - item-pill       下拉项选中的 3×16 品牌色指示条（按下时 ScaleY → 0.625）
 *
 * 与 WinUI 的四处 Web 侧近似（其余状态逐项对照资源键）：
 * 1. Acrylic 表面：Fluent 令牌集中没有材质令牌，浮层用 colorNeutralBackground1 +
 *    shadow16 近似（与 NumberBox 紧凑浮层保持一致）。
 * 2. 浮层开启动画：WinUI 用 SplitOpenThemeAnimation（ClosedLength → OpenedLength
 *    的纵向 split）。Web 侧以 clip-path 从选中项中线向上下两侧展开近似（无选中时
 *    贴触发控件一侧）：面板先收拢成一条缝，展开后实测选中项位置写入 CSS 变量再起播；
 *    时长/缓动取 ControlNormalAnimationDuration(250ms) + ControlFastOutSlowInKeySpline
 *    (0,0,0,1) → durationGentle / curveDecelerateMid。
 *    关闭动画省略：reka 的 Presence 会立即卸载内容，保留 aria-hidden 语义正确。
 * 3. 焦点矩形：WinUI 用 FocusStrokeColorOuter（#E4000000 / 白）；令牌集中对应
 *    colorStrokeFocus2。（组件库其余控件目前用 colorCompoundBrandStroke，本组件按
 *    WinUI 源取色，见 README「还原基准」。）
 * 4. 箭头按下态：WinUI 3 Gallery 里箭头按下是轻微下沉（不是翻转）；这里用
 *    translateY(1px) + durationFast 进 / durationNormal 回近似。
 *
 * 分层（本文件只做组合与呈现，逻辑按层外提、各自可单测）：
 * - 纯函数层：items（项身份 / 索引 / 选中文本）、keyboard（键位 → 动作）、
 *   text-search（搜索串 / 环状前缀匹配）、interaction（高亮 / 指针 / 滚轮决策）
 * - hooks 层：use-combobox-selection（取值 + 值 ↔ 文本双通道）、
 *   use-combobox-editable（提交 / 回滚 / 行内补全）、use-combobox-search（type-ahead 会话）、
 *   use-combobox-popup（展开状态 + 落点）、use-combobox-interaction（焦点 / 指针 / 组字）、
 *   use-combobox-keyboard（捕获阶段分发）
 */
const props = withDefaults(defineProps<FluereComboboxProps<T>>(), {
  modelValue: undefined,
  defaultValue: null,
  items: undefined,
  open: undefined,
  defaultOpen: false,
  disabled: false,
  editable: false,
  text: undefined,
  defaultText: '',
  placeholder: undefined,
  header: undefined,
  label: undefined,
  description: undefined,
  name: undefined,
  by: undefined,
  dir: undefined,
  maxDropDownHeight: DEFAULT_MAX_DROPDOWN_HEIGHT,
  textSearchEnabled: true,
  selectionChangedTrigger: 'committed',
})

const emit = defineEmits<{
  'update:modelValue': [value: T | null]
  'update:open': [value: boolean]
  'update:text': [value: string]
  /** 选中项变化（对应 WinUI `SelectionChanged`） */
  'selectionChanged': [args: FluereComboboxSelectionChangedEventArgs<T>]
  /** 面板展开（对应 WinUI `DropDownOpened`） */
  'dropDownOpened': []
  /** 面板收起（对应 WinUI `DropDownClosed`） */
  'dropDownClosed': []
  /** 可编辑态提交了不匹配任何项的自定义文本（对应 WinUI `TextSubmitted`） */
  'textSubmitted': [args: FluereComboboxTextSubmittedEventArgs]
}>()

defineOptions({ name: 'FluereCombobox' })

const slots = useSlots()
const baseId = `fui-combobox-${useId()}`
const headerId = `${baseId}-header`
const descriptionId = `${baseId}-description`

/* ------------------------------------------------------------------ */
/* 取值层：值 / 文本双通道（受控 + 非受控），唯一写入选中项的入口 setValue  */
/* ------------------------------------------------------------------ */

const selectionEvents: ComboboxSelectionEvents<T> = {
  valueChange: (value) => emit('update:modelValue', value),
  selectionChanged: (args) => emit('selectionChanged', args),
  textChange: (value) => emit('update:text', value),
}
const selection = useComboboxSelection<T>(props, selectionEvents)
const {
  entries,
  currentText,
  inputText,
  formValue,
  rootModelValue,
  rootDefaultValue,
  textOfValue,
  setText,
  setValue,
  selectRelative,
  selectBoundary,
} = selection

/* 可编辑态：提交（Enter / Tab / 失焦）/ 回滚（Escape）/ 行内补全。
   注意命名避开 `editable` prop —— script setup 的绑定会遮蔽同名 prop 进模板 */
const editableText = useComboboxEditable<T>(props, selection, {
  textSubmit: (args) => emit('textSubmitted', args),
})

/* 文本搜索（type-ahead）：WinUI IsTextSearchEnabled */
const search = useComboboxSearch<T>({
  entries: selection.entries,
  selectedIndex: selection.selectedIndex,
  selectByIndex: selection.selectByIndex,
})

/* ------------------------------------------------------------------ */
/* DOM 视图：表面 / 列表 / reka 底座实例                                 */
/* ------------------------------------------------------------------ */

interface ComboboxRootApi {
  highlightSelected?: (event?: Event, scroll?: boolean) => Promise<void>
}

const surfaceRef = ref<HTMLElement | null>(null)
const listRef = ref<HTMLElement | null>(null)
const comboboxRef = ref<ComboboxRootApi | null>(null)

/** Reka 的 ComboboxRoot 只暴露这几个方法，用函数 ref 承接以保持类型可控 */
const bindComboboxRef = (instance: unknown): void => {
  comboboxRef.value = instance as ComboboxRootApi | null
}

const inputElement = computed(() => surfaceRef.value?.querySelector('input') ?? null)

/* ------------------------------------------------------------------ */
/* 弹出展开动画：实测选中项位置 → clip 原点（SplitOpenThemeAnimation）    */
/* ------------------------------------------------------------------ */

/**
 * 弹层的 split 时序（写在弹层元素的 `data-split` 上，取值见样式块）：
 * - `pending`：面板已挂载、原点还没量完 → 先收拢成一条缝并透明（错误原点不出帧）
 * - `playing`：原点已写入 CSS 变量 → 播 `fui-combobox-split-open`
 * - `done`：动画结束（或无需动画）→ 回落基础样式，clip 复位让阴影完整
 *
 * 初值 `done`：父级绕过 applyOpen 直接改 `open` 时面板直接可见（无动画但不出错）。
 */
const splitState = ref<'pending' | 'playing' | 'done'>('done')
/** 选中项中线相对面板顶的偏移：起始缝的上 / 下两段 inset（和 = 面板高） */
const splitTop = ref('0px')
const splitBottom = ref('100%')

/** 面板尺寸上限 + split 原点（reka 会把外部 style 合并到弹层内容元素上） */
const popupStyle = computed(() => ({
  '--fui-combobox-max-height': `${props.maxDropDownHeight}px`,
  '--fui-combobox-split-top': splitTop.value,
  '--fui-combobox-split-bottom': splitBottom.value,
}))

/** 项中线换算：项高 ÷ 中线除数；split 原点钳制到面板内的下界 */
const ITEM_CENTER_DIVISOR = 2
const SPLIT_CLAMP_MIN = 0

/**
 * 量展开原点：选中项（无选中退到高亮项，再退到贴触发侧的顶边）的水平中线。
 * 上下两段 inset 之和恰为面板高 → 起始是一条零高度的缝，向两侧展开。
 */
const applySplitOrigin = (): void => {
  const popupElement = listRef.value?.closest<HTMLElement>('.fui-combobox__popup')
  const anchor =
    popupElement?.querySelector<HTMLElement>('[data-state="checked"]') ??
    popupElement?.querySelector<HTMLElement>('[data-highlighted]')
  const popupRect = popupElement?.getBoundingClientRect()
  const anchorRect = anchor?.getBoundingClientRect()
  if (popupRect !== undefined && anchorRect !== undefined) {
    const measured = anchorRect.top + anchorRect.height / ITEM_CENTER_DIVISOR - popupRect.top
    const center = Math.min(Math.max(measured, SPLIT_CLAMP_MIN), popupRect.height)
    splitTop.value = `${center}px`
    splitBottom.value = `${popupRect.height - center}px`
  } else {
    splitTop.value = '0px'
    splitBottom.value = '100%'
  }
  splitState.value = 'playing'
}

/** 分裂展开动画收尾：交还基础样式（clip 复位，box-shadow 不再被 clip 裁掉） */
const onPopupAnimationEnd = (event: AnimationEvent): void => {
  if (event.animationName === 'fui-combobox-split-open') {
    splitState.value = 'done'
  }
}

/* ------------------------------------------------------------------ */
/* 展开 / 收起：自行控制 open 状态，并补上 reka 在 onOpenChange 里的动作    */
/* ------------------------------------------------------------------ */

/**
 * 展开后的收尾：把焦点收回控件、高亮选中项（reka 只在自身 onOpenChange 里做，
 * 本组件自行控制 open 状态，故显式调用其暴露的 highlightSelected），
 * 最后量出 split 展开原点。落点同步由展开层在本回调完成后接续。
 */
const afterOpen = async (): Promise<void> => {
  // 同步先收拢：本行先于渲染微任务执行，面板一挂载就是 pending（不会先闪全开）
  splitState.value = 'pending'
  await nextTick()
  inputElement.value?.focus()
  try {
    await comboboxRef.value?.highlightSelected?.()
  } finally {
    // 高亮会把选中项滚进可视区，原点必须在滚动落定后量
    applySplitOrigin()
  }
}

const popup = useComboboxPopup(
  props,
  {
    openChange: (value) => emit('update:open', value),
    dropDownOpened: () => emit('dropDownOpened'),
    dropDownClosed: () => emit('dropDownClosed'),
  },
  {
    afterOpen,
    getPopupElement: () => listRef.value?.closest<HTMLElement>('.fui-combobox__popup') ?? null,
  },
)
const { isOpen, placement, applyOpen } = popup

/**
 * 浮层层级（0.4.1 迁移步骤 ①）：把下拉的开合状态镜像给 `useFlyout`，由层级栈给出
 * 层级表达式 —— 展开状态的事实源仍是 `useComboboxPopup`（`open` getter 传进去），
 * 原语只被动跟随，不接管开关。
 *
 * 关闭语义与焦点归位的分工（有意保留）：
 *   - Esc / 外部点击 / 焦点移出：reka 的 `ComboboxContent`（DismissableLayer）已按
 *     WinUI `ComboBox` 的 light-dismiss 行为实现并有既有契约测试，故 `closeOn*=false`，
 *     避免两套监听器互相打架；
 *   - 收起后收回焦点：`useComboboxPopup` 的收尾逻辑负责（见该文件头注释），
 *     故 `returnFocus: false`。原语在这两条上只登记层级。
 */
const flyout = useFlyout({
  tier: '--zIndexNavFlyout',
  open: () => popup.isOpen.value,
  closeOnEscape: false,
  closeOnOutsidePointer: false,
  returnFocus: false,
})
/**
 * 层级样式必须**解构到顶层 ref** 再进模板：Vue 只对顶层绑定做 ref 自动解包，
 * `:style="flyout.layerStyle"` 拿到的是 ComputedRef 本体而不是样式对象，
 * 结果 z-index 静默不生效（2026-10-13 由真实浏览器实测抓到：弹层里没有 z-index，
 * 只有 CSS 回退值在起作用）。Tooltip 侧因为写在 computed 里取了 `.value` 才没踩到。
 */
const { layerStyle: flyoutLayerStyle } = flyout

/* ------------------------------------------------------------------ */
/* 指针 / 焦点 / 输入法：焦点矩形、PointerFocused、组字屏蔽                */
/* ------------------------------------------------------------------ */

const interaction = useComboboxInteraction({
  isInsideSurface: (node) => surfaceRef.value?.contains(node) === true,
  // WinUI：可编辑态失焦即提交文本
  onEditableBlur: () => {
    if (editableText.shouldCommitOnBlur(currentText.value)) {
      editableText.commitText()
    }
  },
})
const { focused, focusVisible, lastInteraction, onDocumentKeydown } = interaction

/* ------------------------------------------------------------------ */
/* 键盘：捕获阶段先于 reka 的输入框监听，按 WinUI 口径接管                 */
/* ------------------------------------------------------------------ */

/** 展开时提交高亮项（Space 等价于 Enter；reka 的 Enter 走的是同一条 click 路径） */
const commitHighlightedItem = (): void => {
  listRef.value?.querySelector<HTMLElement>('[data-highlighted]')?.click()
}

/** Ctrl+Enter：已选中项取消选中并收起（WinUI `SelectedIndex = -1`） */
const deselectHighlightedItem = (): void => {
  const highlighted = listRef.value?.querySelector<HTMLElement>('[data-highlighted]')
  if (highlighted?.dataset.state !== 'checked') {
    return
  }
  setValue(null)
  applyOpen(false)
}

const { onKeydownCapture } = useComboboxKeyboard({
  props,
  isOpen: () => popup.isOpen.value,
  isComposing: () => interaction.composing.value,
  isSearching: search.isSearching,
  noteKeyboardInteraction: interaction.noteKeyboardInteraction,
  actions: {
    open: () => applyOpen(true),
    close: () => applyOpen(false),
    selectNext: () => selectRelative(NEXT_ITEM_STEP),
    selectPrevious: () => selectRelative(PREVIOUS_ITEM_STEP),
    selectFirst: () => selectBoundary('first'),
    selectLast: () => selectBoundary('last'),
    commitHighlight: commitHighlightedItem,
    commitText: editableText.commitText,
    revertText: editableText.revertText,
    deselect: deselectHighlightedItem,
    search: search.handleTextSearch,
  },
})

/* ------------------------------------------------------------------ */
/* 高亮 / 指针 / 滚轮 / 输入：事件到决策层的一层薄胶水                     */
/* ------------------------------------------------------------------ */

/** 供 reka 底座回传内部选中变化（点选 / reka 自己的 Enter 提交） */
const applyValue = (value: unknown): void => setValue((value ?? null) as T | null)

/**
 * 展开时高亮变化：可编辑态回填文本（`UpdateEditableTextBox`）、
 * `selectionChangedTrigger = 'always'` 时提交选中，决策在 interaction.ts。
 */
const onHighlight = (payload: { value?: unknown } | undefined): void => {
  const intent = resolveHighlightIntent({
    open: isOpen.value,
    interaction: lastInteraction.value,
    hasValue: payload?.value !== undefined,
    editable: props.editable,
    trigger: props.selectionChangedTrigger,
  })
  if (!intent.fillText && !intent.commitValue) {
    return
  }
  const value = payload?.value as T
  if (intent.fillText) {
    setText(textOfValue(value))
  }
  if (intent.commitValue) {
    setValue(value)
  }
}

/**
 * 指针按下（决策在 interaction.ts）：
 * - 非可编辑态：整块控件都是开关（WinUI 按下即展开），并避免只读输入框进入文本选择
 * - 可编辑态：只有箭头热区开关面板，文本区交给浏览器放置光标
 */
const onSurfacePointerDown = (event: PointerEvent): void => {
  const onChevron = (event.target as HTMLElement).closest('.fui-combobox__chevron') !== null
  const action = resolveSurfacePointerAction({
    disabled: props.disabled,
    editable: props.editable,
    onChevron,
  })
  if (action === 'ignore') {
    return
  }
  interaction.notePointerDown()
  if (action === 'caret') {
    return
  }
  event.preventDefault()
  if (!props.editable) {
    inputElement.value?.focus()
  }
  applyOpen(!isOpen.value)
}

const onPopupPointerMove = interaction.notePointerMove
const onCompositionStart = interaction.onCompositionStart
const onCompositionEnd = interaction.onCompositionEnd
const onFocusIn = interaction.onFocusIn
const onFocusOut = interaction.onFocusOut

/** 输入事件：可编辑态自己维护文本，并阻止 reka「输入即开面板」（WinUI 不这么做） */
const onInputCapture = (event: Event): void => {
  if (!props.editable) {
    return
  }
  event.stopPropagation()
  const target = event.target
  if (!(target instanceof HTMLInputElement)) {
    return
  }
  setText(target.value)
  if ((event as InputEvent).isComposing === true) {
    return
  }
  editableText.completeInline(target)
}

/** WinUI：焦点在控件上、面板收起时，滚轮直接改选中项（面板展开或未聚焦时忽略） */
const onWheel = (event: WheelEvent): void => {
  const step = resolveWheelStep({
    disabled: props.disabled,
    open: isOpen.value,
    deltaY: event.deltaY,
    controlFocused: document.activeElement === inputElement.value,
  })
  if (step === null) {
    return
  }
  event.preventDefault()
  selectRelative(step)
}

onMounted(() => {
  document.addEventListener('keydown', onDocumentKeydown, true)
  // WinUI：可编辑态挂载时用 SelectedItem 的文本填充 Text（消费方未显式给文本时）
  selection.initEditableText()
})
onUnmounted(() => {
  document.removeEventListener('keydown', onDocumentKeydown, true)
})

/* ------------------------------------------------------------------ */
/* 无障碍：Header 兼作可访问名（与 NumberBox 同一套口径）                */
/* ------------------------------------------------------------------ */

const ariaLabel = computed(() => props.label ?? props.header)
const hasHeader = computed(() => props.header !== undefined || slots.header !== undefined)
const hasDescription = computed(
  () => props.description !== undefined || slots.description !== undefined,
)
const ariaLabelledby = computed(() =>
  ariaLabel.value === undefined && slots.header !== undefined ? headerId : undefined,
)
const ariaDescribedby = computed(() => (hasDescription.value ? descriptionId : undefined))
</script>

<template>
  <div
    class="fui-combobox"
    :data-disabled="disabled ? '' : undefined"
    :data-editable="editable ? '' : undefined"
  >
    <!-- HeaderContentPresenter：Margin 0,0,0,8、FontWeight Normal、LineHeight 20 -->
    <span
      v-if="hasHeader"
      :id="headerId"
      class="fui-combobox__header"
    >
      <slot name="header">{{ header }}</slot>
    </span>

    <ComboboxRoot
      :ref="bindComboboxRef"
      class="fui-combobox__root"
      :model-value="rootModelValue"
      :default-value="rootDefaultValue"
      :open="isOpen"
      :default-open="defaultOpen"
      :disabled="disabled"
      :by="by"
      :dir="dir"
      :ignore-filter="true"
      :reset-search-term-on-blur="false"
      :reset-search-term-on-select="false"
      @update:model-value="applyValue"
      @update:open="applyOpen"
      @highlight="onHighlight"
      @keydown.capture="onKeydownCapture"
    >
      <ComboboxAnchor class="fui-combobox__anchor">
        <div
          ref="surfaceRef"
          class="fui-combobox__surface"
          :data-open="isOpen ? '' : undefined"
          :data-focused="focused ? '' : undefined"
          :data-focus-visible="focusVisible ? '' : undefined"
          :data-placement="placement"
          @pointerdown="onSurfacePointerDown"
          @focusin="onFocusIn"
          @focusout="onFocusOut"
          @wheel="onWheel"
        >
          <!-- ComboBox 自身的 Pill：3×16 品牌色，仅 Focused 显示 -->
          <span
            class="fui-combobox__pill"
            aria-hidden="true"
          />

          <ComboboxInput
            class="fui-combobox__text"
            :model-value="inputText"
            :disabled="disabled"
            :readonly="!editable"
            :placeholder="placeholder"
            :aria-label="ariaLabel"
            :aria-labelledby="ariaLabelledby"
            :aria-describedby="ariaDescribedby"
            :aria-autocomplete="editable ? 'list' : 'none'"
            autocomplete="off"
            spellcheck="false"
            @input.capture="onInputCapture"
            @compositionstart.capture="onCompositionStart"
            @compositionend.capture="onCompositionEnd"
          />

          <span
            class="fui-combobox__chevron"
            :aria-hidden="true"
          >
            <FluentIconChevronDown12Regular class="fui-combobox__chevron-icon" />
          </span>
        </div>
      </ComboboxAnchor>

      <ComboboxPortal>
        <ComboboxContent
          class="fui-combobox__popup"
          :data-editable="editable ? '' : undefined"
          :data-split="splitState"
          :style="[popupStyle, flyoutLayerStyle]"
          position="popper"
          side="bottom"
          align="start"
          :side-offset="0"
          @pointermove="onPopupPointerMove"
          @animationend="onPopupAnimationEnd"
        >
          <div
            ref="listRef"
            class="fui-combobox__list"
          >
            <RekaComboboxItem
              v-for="(item, index) in entries"
              :key="index"
              class="fui-combobox__item"
              :value="item.value"
              :text-value="itemText(item)"
              :disabled="item.disabled"
            >
              <span
                class="fui-combobox__item-pill"
                aria-hidden="true"
              />
              <span class="fui-combobox__item-content">
                <slot
                  name="item"
                  :item="item"
                  :index="index"
                  >{{ itemText(item) }}</slot
                >
              </span>
            </RekaComboboxItem>

            <div
              v-if="entries.length === 0"
              class="fui-combobox__empty"
            >
              <slot name="empty" />
            </div>
          </div>
        </ComboboxContent>
      </ComboboxPortal>

      <!-- DescriptionPresenter：Row 2 -->
      <span
        v-if="hasDescription"
        :id="descriptionId"
        class="fui-combobox__description"
      >
        <slot name="description">{{ description }}</slot>
      </span>
    </ComboboxRoot>

    <!-- 表单提交：位于 <form> 内 + name 时补隐藏原生 input -->
    <input
      v-if="name"
      type="hidden"
      :name="name"
      :value="formValue"
    />
  </div>
</template>

<style scoped>
/* ------------------------------------------------------------------ */
/* 所有值均引用 Fluent 语义 token（var(--TokenName)），见 fluent-tokens  */
/* 明暗主题由 tokens.css 的 light-dark() + color-scheme 自动切换        */
/*                                                                     */
/* WinUI 3 对照（Windows App SDK 2.0，                                  */
/* src/controls/dev/ComboBox/ComboBox_themeresources.xaml）：           */
/*   ComboBoxBackground              = ControlFillColorDefaultBrush      */
/*     → colorNeutralBackground1（rest / Focused）                       */
/*   ComboBoxBackgroundPointerOver   = ControlFillColorSecondaryBrush    */
/*     → colorNeutralBackground1Hover                                    */
/*   ComboBoxBackgroundPressed       = ControlFillColorTertiaryBrush     */
/*     → colorNeutralBackground1Pressed                                  */
/*   ComboBoxBackgroundDisabled      = ControlFillColorDisabledBrush     */
/*     → colorNeutralBackgroundDisabled                                  */
/*   ComboBoxBorderBrush = ControlElevationBorderBrush（垂直渐变笔刷，   */
/*     Light 下 ScaleY=-1 翻转）：顶/左/右 ControlStrokeColorDefault、    */
/*     底 ControlStrokeColorSecondary。令牌集没有渐变描边，沿用 Input 的 */
/*     同一套映射：三边 colorNeutralStrokeAlpha + 底边 colorNeutralStroke1 */
/*   ComboBoxBorderBrushPressed/Disabled = ControlStrokeColorDefaultBrush */
/*   ComboBoxForeground*             = TextFillColorPrimary / Secondary  */
/*     → colorNeutralForeground1 / colorNeutralForegroundDisabled        */
/*   ComboBoxPlaceHolderForeground*  = TextFillColorSecondary /Tertiary  */
/*     → colorNeutralForeground3 / colorNeutralForeground4               */
/*   ComboBoxDropDownGlyphForeground = TextFillColorSecondary            */
/*     → colorNeutralForeground2（禁用档 → colorNeutralForegroundDisabled）*/
/*   ComboBoxItemBackgroundPointerOver/Selected = SubtleFillColorSecondary */
/*     → colorSubtleBackgroundHover / …Selected                          */
/*   ComboBoxItemBackgroundPressed/SelectedPointerOver = SubtleFillColorTertiary */
/*     → colorSubtleBackgroundPressed                                    */
/*   ComboBoxItemPillFillBrush       = AccentFillColorDefaultBrush       */
/*     → colorCompoundBrandBackground                                    */
/*                                                                     */
/* 几何（同名资源键，见 § 常量表）：                                      */
/*   ComboBoxThemeMinWidth 64 / ComboBoxMinHeight 32 / 圆角 4            */
/*   ComboBoxPadding 12,5,0,7 / ComboBoxEditableTextPadding 11,5,38,6    */
/*   字形列 38、字形 12×12、右内边距 14                                   */
/*   ComboBoxBackgroundBorderThicknessFocused 2（外扩 2px）              */
/*   ComboBoxItemPillWidth/Height 3/16、CornerRadius 1.5                 */
/*   ComboBoxItemPillMinScale 0.625、ComboBoxItemScaleAnimationDuration 167ms */
/*   ComboBoxItemThemePadding 11,5,11,7、ComboBoxItem Margin 5,2         */
/*   ComboBoxDropdownContentMargin 0,4 / OverlayCornerRadius 8           */
/*   OverlayCornerRadius 8 → borderRadiusXLarge                          */
/* ------------------------------------------------------------------ */

/* ---- 外层：Header / 控件 / Description 三行 ---- */
.fui-combobox {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: stretch;
  width: fit-content;
  min-width: 64px; /* ComboBoxThemeMinWidth */
  font-family: var(--fontFamilyBase);
  font-size: var(--fontSizeBase300);
  line-height: var(--lineHeightBase300);
  color: var(--colorNeutralForeground1);
}

.fui-combobox__root,
.fui-combobox__anchor {
  display: block;
}

/* ---- HeaderContentPresenter：0,0,0,8 + Normal 字重 + 行高 20 ---- */
.fui-combobox__header {
  margin-bottom: var(--spacingVerticalS);
  color: var(--colorNeutralForeground1); /* ComboBoxHeaderForeground */
  font-weight: var(--fontWeightRegular); /* ComboBoxHeaderThemeFontWeight = Normal */
  line-height: var(--lineHeightBase300);
}

.fui-combobox[data-disabled] .fui-combobox__header {
  color: var(--colorNeutralForegroundDisabled); /* ComboBoxHeaderForegroundDisabled */
}

/* ---- DescriptionPresenter：SystemControlDescriptionTextForeground ---- */
.fui-combobox__description {
  margin-top: var(--spacingVerticalXS);
  color: var(--colorNeutralForeground2);
  font-size: var(--fontSizeBase200);
  line-height: var(--lineHeightBase200);
}

/* ---- Background 边框：填充 + 抬升描边 + 圆角 4 ---- */
.fui-combobox__surface {
  /* 语义变量：交互状态只改写这几个，具体声明只读一次 */
  --fui-combobox-background: var(--colorNeutralBackground1);
  --fui-combobox-highlight: transparent;
  --fui-combobox-border: var(--colorNeutralStrokeAlpha);
  --fui-combobox-border-bottom: var(--colorNeutralStroke1);
  --fui-combobox-foreground: var(--colorNeutralForeground1);
  --fui-combobox-placeholder: var(--colorNeutralForeground3);
  --fui-combobox-chevron: var(--colorNeutralForeground2);

  position: relative;
  box-sizing: border-box;
  display: flex; /* 文本区 + 绝对定位的字形 / 指示条 */
  align-items: stretch;
  min-width: 64px; /* ComboBoxThemeMinWidth */
  max-width: 100%;
  min-height: 32px; /* ComboBoxMinHeight */
  border: var(--strokeWidthThin) solid var(--fui-combobox-border);
  border-bottom-color: var(--fui-combobox-border-bottom);
  border-radius: var(--borderRadiusMedium); /* ControlCornerRadius 4 */
  /* 合成背景 = 底色 + 底部 1px 高亮带（可编辑态聚焦时由 --fui-combobox-highlight 点亮，
     与底描边拼成 WinUI TextBox 聚焦态的 2px 强调色下边） */
  background: var(--fui-combobox-background)
    linear-gradient(
      to bottom,
      transparent,
      transparent calc(100% - var(--strokeWidthThin)),
      var(--fui-combobox-highlight) calc(100% - var(--strokeWidthThin)),
      var(--fui-combobox-highlight)
    );
  background-repeat: no-repeat;
  color: var(--fui-combobox-foreground);
  cursor: pointer;
  /* WinUI：ControlFastAnimationDuration 167ms + ControlFastOutSlowInKeySpline 0,0,0,1 */
  transition:
    background-color var(--durationFast) var(--curveEasyEase),
    border-color var(--durationFast) var(--curveEasyEase),
    --fui-combobox-highlight var(--durationNormal) var(--curveDecelerateMid);
}

/* ---- PointerOver / Pressed：只换填充（描边在 WinUI 里同属一把 elevation 笔刷） ---- */
.fui-combobox:not([data-disabled]) .fui-combobox__surface:hover {
  --fui-combobox-background: var(--colorNeutralBackground1Hover);
}

.fui-combobox:not([data-disabled]) .fui-combobox__surface:active {
  --fui-combobox-background: var(--colorNeutralBackground1Pressed);
  --fui-combobox-foreground: var(--colorNeutralForeground2); /* ComboBoxForegroundPressed */
  --fui-combobox-placeholder: var(--colorNeutralForeground4); /* PlaceHolderForegroundPressed */
}

/* ---- Disabled：全套 …Disabled 档 ---- */
.fui-combobox[data-disabled] .fui-combobox__surface {
  --fui-combobox-background: var(--colorNeutralBackgroundDisabled);
  --fui-combobox-foreground: var(--colorNeutralForegroundDisabled);
  --fui-combobox-placeholder: var(--colorNeutralForegroundDisabled);
  --fui-combobox-chevron: var(--colorNeutralForegroundDisabled);
  cursor: not-allowed;
}

/* ---- Focused：HighlightBackground（2px FocusStrokeColorOuter，向外 2px） ---- */
.fui-combobox__surface[data-focus-visible] {
  outline: var(--strokeWidthThick) solid var(--colorStrokeFocus2);
  outline-offset: 2px;
}

/* ---- ComboBox 自身的 Pill：3×16、左内 1px、仅 Focused 显示 ---- */
.fui-combobox__pill {
  position: absolute;
  inset-inline-start: 1px; /* Pill Margin 1,0,0,0 */
  top: calc(50% - 8px); /* 高 16 居中 */
  width: 3px; /* ComboBoxItemPillWidth */
  height: 16px; /* ComboBoxItemPillHeight */
  border-radius: var(--borderRadiusSmall); /* ComboBoxItemPillCornerRadius 1.5 */
  background-color: var(--colorCompoundBrandBackground); /* AccentFillColorDefault */
  opacity: 0;
  pointer-events: none;
}

.fui-combobox__surface[data-focus-visible] .fui-combobox__pill {
  opacity: 1;
}

/* ---- ContentPresenter / EditableText ---- */
/* WinUI 里文本区独占 Grid 第 0 列、字形独占第 1 列（宽 38）；这里把 38px 折进
   输入框的右内边距，视觉与裁切位置一致，同时让输入框留在文档流里——它是控件宽度
   的唯一内在来源（surface 宽 = min(64px, 内容宽)，对应 ComboBoxThemeMinWidth） */
.fui-combobox__text {
  flex: 1 1 auto;
  min-width: 0;
  box-sizing: border-box;
  margin: 0;
  padding: 5px 38px 7px 12px; /* ComboBoxPadding 12,5,0,7 + 38px 字形列 */
  border: 0; /* 边框由 surface 提供（EditableText 的 BorderBrush 亦为 Transparent） */
  outline: none; /* 焦点矩形画在 surface 上 */
  background: transparent;
  color: inherit;
  font: inherit;
  text-overflow: ellipsis;
  cursor: inherit;
}

.fui-combobox[data-editable] .fui-combobox__text {
  padding: 5px 38px 6px 11px; /* ComboBoxEditableTextPadding 11,5,38,6 */
  cursor: text;
}

.fui-combobox__text::placeholder {
  color: var(--fui-combobox-placeholder);
  opacity: 1; /* Firefox 默认降透明度，WinUI 用实色 */
}

.fui-combobox__text::selection {
  background-color: var(--colorCompoundBrandBackground);
  color: var(--colorNeutralForegroundOnBrand);
}

/* ---- DropDownGlyph：12×12，右内边距 14 ---- */
.fui-combobox__chevron {
  position: absolute;
  inset-inline-end: 14px; /* DropDownGlyph Margin 0,0,14,0 */
  top: calc(50% - 6px);
  display: grid;
  place-items: center;
  width: 12px;
  height: 12px;
  color: var(--fui-combobox-chevron);
  pointer-events: none; /* 非可编辑态整块控件都是开关 */
  transition: transform var(--durationNormal) var(--curveDecelerateMid);
}

/* 按下态：箭头轻微下沉（WinUI 3 Gallery 的箭头按下只下沉、不翻转） */
.fui-combobox:not([data-disabled]) .fui-combobox__surface:active .fui-combobox__chevron {
  transform: translateY(1px); /* 略微下沉 */
  transition-duration: var(--durationFast);
  color: var(--colorNeutralForeground1); /* FocusedPressed 的 legacy 笔刷近似 */
}

/* ---- DropDownOverlay（仅可编辑态）：30×24、圆角 4、带 hover / pressed 底色 ---- */
.fui-combobox[data-editable] .fui-combobox__chevron {
  inset-inline-end: 4px; /* DropDownOverlay Margin 4,4,4,4 */
  top: 4px;
  width: 30px;
  height: 24px;
  border-radius: var(--borderRadiusMedium); /* ComboBoxDropDownButtonBackgroundCornerRadius 4 */
  background-color: transparent;
  pointer-events: auto;
  transition:
    background-color var(--durationFast) var(--curveEasyEase),
    transform var(--durationNormal) var(--curveDecelerateMid);
}

.fui-combobox[data-editable] .fui-combobox__surface:hover .fui-combobox__chevron {
  background-color: var(--colorSubtleBackgroundHover); /* ComboBoxDropDownBackgroundPointerOver */
}

.fui-combobox[data-editable] .fui-combobox__surface:active .fui-combobox__chevron {
  background-color: var(--colorSubtleBackgroundPressed); /* …BackgroundPointerPressed */
}

/* TextBoxFocusedOverlay*：ControlFillColorTertiary / ControlAltFillColorQuarternary
   在令牌集里都落到 …Pressed 一档 */
.fui-combobox[data-editable] .fui-combobox__surface[data-focused]:hover .fui-combobox__chevron {
  background-color: var(--colorNeutralBackground1Pressed);
}

/* ---- 可编辑态聚焦：TextBox 聚焦态的底部强调色边（2px，见合成背景） ---- */
.fui-combobox[data-editable] .fui-combobox__surface[data-focused] {
  --fui-combobox-highlight: var(
    --colorCompoundBrandStroke
  ); /* SystemAccentColorLight2 的库内代理 */
}

/* ---- KeepInteriorCornersSquare（仅可编辑态）：面板贴着控件时切平相邻圆角 ---- */
.fui-combobox[data-editable] .fui-combobox__surface[data-open][data-placement='bottom'] {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

.fui-combobox[data-editable] .fui-combobox__surface[data-open][data-placement='top'] {
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}

/* ---- PopupBorder：Acrylic 表面 + 1px SurfaceStrokeColorFlyout + 圆角 8 ---- */
/*    （面板规则整体挪到文件末尾的非 scoped <style> 块——原因见该块注释）      */

/* ---- ItemsPresenter：上下留白 4（ComboBoxDropdownContentMargin 0,4） ---- */
.fui-combobox__list {
  flex: 1 1 auto;
  min-height: 0;
  padding-block: 4px;
  overflow-y: auto;
  overscroll-behavior: contain;
  /* WinUI 下拉用 2px 自动隐藏导轨；Web 侧退化为细滚动条 */
  scrollbar-width: thin;
}

.fui-combobox__list::-webkit-scrollbar {
  width: var(--strokeWidthThick);
}

.fui-combobox__list::-webkit-scrollbar-thumb {
  border-radius: var(--borderRadiusCircular);
  background-color: var(--colorNeutralStroke1);
}

/* ---- ComboBoxItem：Margin 5,2 + Padding 11,5,11,7 + 圆角 4 ---- */
.fui-combobox__item {
  --fui-combobox-item-background: transparent;
  --fui-combobox-item-foreground: var(--colorNeutralForeground1);

  position: relative;
  box-sizing: border-box;
  display: block;
  margin: 2px 5px; /* ComboBoxItem Margin 5,2,5,2 */
  padding: 5px 11px 7px; /* ComboBoxItemThemePadding 11,5,11,7 */
  border-radius: var(--borderRadiusMedium); /* ComboBoxItemCornerRadius 3 */
  background-color: var(--fui-combobox-item-background);
  color: var(--fui-combobox-item-foreground);
  /* 项字号与控件一致（WinUI ControlContentThemeFontSize → 14；不靠面板继承，
     面板规则是全局块，项规则是 scoped 块，各自独立成立 */
  font-size: var(--fontSizeBase300);
  line-height: var(--lineHeightBase300);
  cursor: default;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition:
    background-color var(--durationFast) var(--curveEasyEase),
    color var(--durationFast) var(--curveEasyEase);
}

/* PointerOver：reka 的高亮（指针悬停与方向键同一通道）对应 WinUI 的 PointerOver 视觉 */
.fui-combobox__item[data-highlighted] {
  --fui-combobox-item-background: var(--colorSubtleBackgroundHover);
}

/* Pressed */
.fui-combobox__item:active {
  --fui-combobox-item-background: var(--colorSubtleBackgroundPressed);
  --fui-combobox-item-foreground: var(--colorNeutralForeground2);
}

/* Selected */
.fui-combobox__item[data-state='checked'] {
  --fui-combobox-item-background: var(--colorSubtleBackgroundSelected);
}

/* SelectedPointerOver */
.fui-combobox__item[data-state='checked'][data-highlighted] {
  --fui-combobox-item-background: var(--colorSubtleBackgroundPressed);
}

/* SelectedPressed */
.fui-combobox__item[data-state='checked']:active {
  --fui-combobox-item-background: var(--colorSubtleBackgroundHover);
  --fui-combobox-item-foreground: var(--colorNeutralForeground2);
}

/* Disabled / SelectedDisabled（写在最后，压过上面的交互态） */
.fui-combobox__item[data-disabled] {
  --fui-combobox-item-background: transparent;
  --fui-combobox-item-foreground: var(--colorNeutralForegroundDisabled);
  cursor: not-allowed;
}

.fui-combobox__item[data-disabled][data-state='checked'] {
  --fui-combobox-item-background: var(--colorSubtleBackgroundSelected);
  --fui-combobox-item-foreground: var(--colorNeutralForegroundDisabled);
}

/* ---- 下拉项的选中指示条：3×16，按下时 ScaleY → 0.625（167ms / 0,0,0,1） ---- */
.fui-combobox__item-pill {
  position: absolute;
  inset-inline-start: 0;
  top: calc(50% - 8px);
  width: 3px;
  height: 16px;
  border-radius: var(--borderRadiusSmall);
  background-color: var(--colorCompoundBrandBackground);
  opacity: 0;
  transition: transform var(--durationFast) var(--curveDecelerateMid);
}

.fui-combobox__item[data-state='checked'] .fui-combobox__item-pill {
  opacity: 1;
}

.fui-combobox__item[data-state='checked']:active .fui-combobox__item-pill {
  transform: scaleY(0.625); /* ComboBoxItemPillMinScale */
}

.fui-combobox__item-content {
  display: block;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* ---- 空态（WinUI 没有空态文案，这里只在消费方给了 #empty 时渲染内容） ---- */
.fui-combobox__empty {
  padding: 5px 11px 7px;
  color: var(--colorNeutralForeground3);
}

/* ---- 动效尊重系统减弱设置（面板的 split 动画在全局块里同口径覆盖） ---- */
@media (prefers-reduced-motion: reduce) {
  .fui-combobox__surface,
  .fui-combobox__chevron,
  .fui-combobox__item,
  .fui-combobox__item-pill {
    transition: none !important;
  }
}
</style>

<!-- ------------------------------------------------------------------ -->
<!-- 弹层（.fui-combobox__popup）：必须放在非 scoped 块里。                 -->
<!-- reka 的 ComboboxContent 把 class 落在弹层内容元素、把 Vue 的作用域 id   -->
<!-- 落在外层 Popper 包装上（inheritAttrs: false + 手动 v-bind），scoped    -->
<!-- 选择器永远匹配不到内容元素——底色 / 阴影 / 宽度 / 字号 / 动画会整组失效。 -->
<!-- 类名带 fui-combobox__ 前缀，全局作用域无碰撞风险。                      -->
<!-- WinUI 对照：PopupBorder（圆角 8 + 1px SurfaceStrokeColorFlyout +      -->
<!-- Acrylic 表面）+ SplitOpenThemeAnimation（从选中项纵向向两侧展开）。      -->
<!-- ------------------------------------------------------------------ -->
<style>
/* ---- PopupBorder：宽度对齐触发元素 + 抬升描边 + 圆角 8 + Acrylic 近似 ---- */
.fui-combobox__popup {
  /* 层级：下拉浮层档（0.4.2 刻度，见 @fluere-vue/designs 的 data/repo-tokens.json）。
     Teleport 到 body，需盖过页面内容；留组件局部变量以便消费方覆盖。
     模态里再开下拉的嵌套提升由 0.4.1 的 useFlyout 层级栈负责（zIndexStep） */
  --fui-combobox-popup-z: var(--zIndexNavFlyout);
  z-index: var(--fui-combobox-popup-z);
  box-sizing: border-box;
  /* WinUI：Popup 宽 = ComboBox.ActualWidth（面板与触发元素严格对齐） */
  width: var(--reka-combobox-trigger-width, 64px);
  max-width: var(--reka-combobox-content-available-width, 100vw); /* 不超出可视区 */
  max-height: min(
    var(--fui-combobox-max-height, 504px),
    var(--reka-combobox-content-available-height, 504px)
  );
  overflow: hidden;
  border: var(--strokeWidthThin) solid var(--colorNeutralStroke1);
  border-radius: var(--borderRadiusXLarge); /* OverlayCornerRadius 8 */
  background-color: var(--colorNeutralBackground1); /* Acrylic 表面近似（见文件头） */
  box-shadow: var(--shadow16);
  color: var(--colorNeutralForeground1); /* ComboBoxDropDownForeground */
  font-family: var(--fontFamilyBase);
  font-size: var(--fontSizeBase300);
  line-height: var(--lineHeightBase300);
}

/* 挂载后 ~ 原点量完前：收拢成选中项处的一条缝并透明（CSS 变量原点见 script） */
.fui-combobox__popup[data-split='pending'],
.fui-combobox__popup[data-split='playing'] {
  clip-path: inset(var(--fui-combobox-split-top, 0px) 0 var(--fui-combobox-split-bottom, 100%) 0);
  opacity: 0;
}

/* SplitOpenThemeAnimation 的 Web 近似：从选中项中线向上下两侧展开
   （fill both：起始帧贴 pending 收拢态、结束帧保持全开，animationend 后交还基础样式） */
.fui-combobox__popup[data-split='playing'] {
  animation: fui-combobox-split-open var(--durationGentle) var(--curveDecelerateMid) both;
}

@keyframes fui-combobox-split-open {
  from {
    clip-path: inset(var(--fui-combobox-split-top, 0px) 0 var(--fui-combobox-split-bottom, 100%) 0);
    opacity: 0;
  }

  to {
    clip-path: inset(0 0 0 0);
    opacity: 1;
  }
}

/* 可编辑态开面板：相邻圆角切平（ComboBoxHelper.KeepInteriorCornersSquare） */
.fui-combobox__popup[data-editable][data-side='bottom'] {
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}

.fui-combobox__popup[data-editable][data-side='top'] {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

/* 减弱动效：跳过 split 收拢与动画，面板直接可见（覆盖 pending / playing 态） */
@media (prefers-reduced-motion: reduce) {
  .fui-combobox__popup,
  .fui-combobox__popup[data-split] {
    animation: none !important;
    clip-path: none !important;
    opacity: 1 !important;
  }
}

/* ------------------------------------------------------------------ */
/* @property：把可编辑态聚焦的底部高亮带注册为可插值的 <color>，它在        */
/* surface 的 transition 中才能逐帧过渡（未注册的自定义属性默认不被动画     */
/* 插值）。@property 是全局注册，必须放在非 scoped 块里。                  */
/* ------------------------------------------------------------------ */
@property --fui-combobox-highlight {
  syntax: '<color>';
  inherits: false;
  initial-value: transparent;
}
</style>
