<script lang="ts">
/**
 * FluereSelect 组件 Props 契约
 *
 * 职责：**不可编辑**的下拉选择器 —— 从一组选项里选一项，触发元素只显示当前项文本 /
 * 占位符，不支持输入、不支持文本搜索。需要可输入或按文本筛选时用 `FluereCombobox`。
 *
 * 规格来源：microsoft-ui-xaml tag `winui3/release/2.5.1`（本地快照 `temp/winui-src`）
 *   src/controls/dev/ComboBox/ComboBox_themeresources.xaml
 *     · 触发面（`ComboBox*`）：
 *         Background / PointerOver / Pressed / Disabled / Unfocused / Focused
 *           ← ControlFillColorDefaultBrush / SecondaryBrush / TertiaryBrush / DisabledBrush
 *         BorderBrush ← ControlElevationBorderBrush（底边另压一档 ControlStrokeColorDefault）
 *     · 下拉项（`ComboBoxItem*`）：
 *         Background / PointerOver / Pressed / Selected / SelectedPointerOver /
 *         SelectedPressed / Disabled ← SubtleFillColorTransparent / Secondary / Tertiary /
 *         Secondary(Tertiary when unfocused) / Tertiary / Secondary / Disabled
 *         Foreground ← TextFillColorPrimary / Secondary(pressed) / Disabled
 *     · 下拉面（`ComboBoxDropDown*`）：背景 `SolidBackgroundFillColorTertiary`（≈ 卡片面）、
 *       圆角 `OverlayCornerRadius`、描边 `SurfaceStrokeColorFlyout`、投影 elevation 16
 *   （WinUI 里没有名为 `Select` 的控件：`Select` 是本库按 Web 习惯起的名字，
 *     视觉与状态一律以 `ComboBox` 的非编辑形态为准 —— 这条取舍写进文档页。）
 *
 * 与 `FluereCombobox` 的差异（文档页也逐条列出）：
 *   - 不可编辑：没有文本输入框、没有 `text` / `textSubmitted`；
 *   - 无文本搜索：不实现 WinUI 的 `IsTextSearchEnabled` 逐键前缀匹配（reka Select 自带
 *     的按字符跳转仍可用，属底座键盘行为，不等于可搜索下拉）；
 *   - 没有 `selectionChanged` 的 added/removed 双项载荷，只抛 `change`。
 *
 * token 映射与本库 `FluereCombobox` 的非编辑形态保持一致（同一套 WinUI 资源名 →
 * token，避免同一页面里两种下拉视觉漂移）：触发面 `--colorNeutralBackground1`
 * 三档 + `--colorNeutralStrokeAlpha`（四边）/ `--colorNeutralStroke1`（底边）、
 * 下拉项 `--colorSubtleBackground*`、下拉面 `--colorNeutralBackground1` +
 * `--colorNeutralStroke1` + `--borderRadiusXLarge` + `--shadow16`。
 *
 * 焦点：复用 0.4.3 的 `useFocusVisual`（WinUI 双层焦点矩形）。
 * 层级：复用 0.4.1 的 `useFlyout` 登记进层级栈（`--zIndexNavFlyout` + 嵌套提升）。
 */
import type { AcceptableValue, Direction } from 'reka-ui'

/** 下拉项（与 `FluereComboboxItem` 同形，便于两组件之间迁移） */
export interface FluereSelectItem<T = AcceptableValue> {
  /** 项的值（`v-model` 的取值） */
  value: T
  /** 显示文本；缺省用 `String(value)` */
  text?: string
  /** 该项是否禁用 */
  disabled?: boolean
}

/** `change` 事件的载荷 */
export interface FluereSelectChangeEventArgs<T = AcceptableValue> {
  /** 变更后的选中值（清空 / 未选中为 `null`） */
  value: T | null
}

/** `FluereSelect` 的 Props */
export interface FluereSelectProps<T = AcceptableValue> {
  /**
   * 受控选中值（对应 `ComboBox.SelectedItem` / `SelectedIndex`）
   * @default undefined
   */
  modelValue?: T | null
  /** 非受控初始选中值 */
  defaultValue?: T | null
  /** 选项列表（对应 `ItemsSource`） */
  items?: readonly FluereSelectItem<T>[]
  /**
   * 展开状态（`v-model:open`）；不传则内部自管
   * @default undefined
   */
  open?: boolean
  /** 非受控初始展开状态 */
  defaultOpen?: boolean
  /** 是否禁用（对应 `IsEnabled`） */
  disabled?: boolean
  /** 未选中时显示的占位文本（对应 `PlaceholderText`） */
  placeholder?: string
  /** 触发面上方的标题（与 Input / Combobox 同约定） */
  header?: string
  /** 可访问名（无 `header` 时建议给） */
  label?: string
  /** 触发面下方的说明文本 */
  description?: string
  /** 表单字段名（透传给隐藏 input，便于原生表单提交） */
  name?: string
  /** 自定义值相等判断（对象型选项时使用） */
  by?: string | ((a: T, b: T) => boolean)
  /** 文本方向（对应 `FlowDirection`） */
  dir?: Direction
  /**
   * 下拉面板最大高度（px）。WinUI `ComboBox` 的 MaxDropDownHeight 缺省 504
   * @default 504
   */
  maxDropDownHeight?: number
}
</script>

<script setup lang="ts" generic="T extends AcceptableValue = AcceptableValue">
import { FluentIconChevronDown12Regular } from '@fluere-vue/icons'
import {
  SelectContent,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectViewport,
} from 'reka-ui'
import { computed, ref, useId } from 'vue'
import { useFlyout } from '../flyout/use-flyout'
import { useFocusVisual } from '../focus-visual/use-focus-visual'

defineOptions({
  name: 'FluereSelect',
})

const props = withDefaults(defineProps<FluereSelectProps<T>>(), {
  modelValue: undefined,
  defaultValue: null,
  items: () => [],
  open: undefined,
  defaultOpen: false,
  disabled: false,
  placeholder: undefined,
  header: undefined,
  label: undefined,
  description: undefined,
  name: undefined,
  by: undefined,
  dir: undefined,
  maxDropDownHeight: 504,
})

const emit = defineEmits<{
  /** 受控选中值回写（`v-model`） */
  'update:modelValue': [value: T | null]
  /** 展开状态回写（`v-model:open`） */
  'update:open': [value: boolean]
  /** 选中项变化 */
  'change': [args: FluereSelectChangeEventArgs<T>]
}>()

const focusVisual = useFocusVisual()

/* ---------------- 选中值：受控 / 非受控 ---------------- */

const innerValue = ref<T | null>(props.defaultValue)

/** 当前选中值：受控以 prop 为准（`undefined` 表示非受控，`null` 是合法的「清空」） */
const currentValue = computed<T | null>(() =>
  props.modelValue === undefined ? innerValue.value : props.modelValue,
)

/** 值相等判断：`by` 优先，缺省用 `Object.is`（对象型选项请传 `by`） */
const isSameValue = (a: T | null, b: T | null): boolean => {
  if (props.by === undefined) {
    return Object.is(a, b)
  }
  if (typeof props.by === 'function') {
    return a !== null && b !== null && props.by(a, b)
  }
  const key = props.by
  return (
    a !== null &&
    b !== null &&
    typeof a === 'object' &&
    typeof b === 'object' &&
    (a as Record<string, unknown>)[key] === (b as Record<string, unknown>)[key]
  )
}

const selectedItem = computed(
  () => props.items.find((item) => isSameValue(item.value, currentValue.value)) ?? null,
)

/** 触发面显示的文本：选中项的 `text` → `String(value)` → 占位符 */
const displayText = computed(() => {
  if (selectedItem.value !== null) {
    return selectedItem.value.text ?? String(selectedItem.value.value)
  }
  return props.placeholder ?? ''
})

const hasSelection = computed(() => selectedItem.value !== null)

const onValueChange = (value: T | null = null): void => {
  innerValue.value = value
  emit('update:modelValue', value)
  emit('change', { value })
}

/* ---------------- 展开状态：受控 / 非受控 ---------------- */

const innerOpen = ref(props.defaultOpen)
const isOpen = computed(() => props.open ?? innerOpen.value)

const applyOpen = (value: boolean): void => {
  innerOpen.value = value
  emit('update:open', value)
}

/**
 * 层级登记（0.4.1）：复用 `useFlyout` 拿 `--zIndexNavFlyout` + 嵌套提升。
 * Esc / 外部点击由 reka `SelectContent`（DismissableLayer）负责，关闭后焦点归位交给
 * reka 的 SelectTrigger，故三处都不由原语重复接管；aria 契约（`role=combobox` /
 * `aria-expanded` / `aria-controls`）也由 reka 的 SelectTrigger 输出，这里不重复。
 * `layerStyle` **必须解构到顶层 ref** 再进模板 —— 模板不自动解包嵌套 ref，
 * 直接写 `flyout.layerStyle` 会静默丢掉 inline z-index（0.4.1 实测踩过）。
 */
const flyout = useFlyout({
  tier: '--zIndexNavFlyout',
  open: () => isOpen.value,
  onUpdateOpen: (value) => applyOpen(value),
  closeOnEscape: false,
  closeOnOutsidePointer: false,
  returnFocus: false,
})
const { layerStyle: flyoutLayerStyle } = flyout

/* ---------------- 无障碍与结构 ---------------- */

/** 标题 / 说明与触发面的关联 id（`useId` 保证 SSR 与水合一致） */
const baseId = useId()
const headerId = `${baseId}-header`
const descriptionId = `${baseId}-description`

const contentStyle = computed(() => ({
  '--fui-select-max-height': `${props.maxDropDownHeight}px`,
}))

const rootClass = computed(() => [
  'fui-select',
  focusVisual.class,
  {
    'fui-select--disabled': props.disabled,
    'fui-select--open': isOpen.value,
  },
])

const itemClass = (item: FluereSelectItem<T>): Record<string, boolean> => ({
  'fui-select__item--disabled': item.disabled === true,
})
</script>

<template>
  <SelectRoot
    :model-value="currentValue ?? undefined"
    :open="isOpen"
    :disabled="disabled"
    :name="name"
    :dir="dir"
    :by="by"
    @update:model-value="onValueChange"
    @update:open="applyOpen"
  >
    <div :class="rootClass">
      <span
        v-if="header"
        :id="headerId"
        class="fui-select__header"
      >
        {{ header }}
      </span>

      <SelectTrigger
        class="fui-select__surface"
        :aria-labelledby="label ? undefined : header ? headerId : undefined"
        :aria-label="label"
        :aria-describedby="description ? descriptionId : undefined"
        :style="focusVisual.style"
      >
        <span
          class="fui-select__text"
          :data-placeholder="hasSelection ? undefined : ''"
          >{{ displayText }}</span
        >

        <span class="fui-select__chevron">
          <FluentIconChevronDown12Regular />
        </span>
      </SelectTrigger>

      <span
        v-if="description"
        :id="descriptionId"
        class="fui-select__description"
      >
        {{ description }}
      </span>
    </div>

    <SelectPortal>
      <SelectContent
        class="fui-select__popup"
        :style="[contentStyle, flyoutLayerStyle]"
        position="popper"
        side="bottom"
        align="start"
        :side-offset="0"
        :avoid-collisions="true"
      >
        <SelectViewport class="fui-select__list">
          <!-- 空列表：由消费方给 `#empty` 文案（组件库不新增一条内建文案） -->
          <div
            v-if="items.length === 0"
            class="fui-select__empty"
          >
            <slot name="empty" />
          </div>

          <SelectItem
            v-for="(item, index) in items"
            :key="index"
            :value="item.value"
            :disabled="item.disabled"
            class="fui-select__item"
            :class="itemClass(item)"
          >
            <SelectItemIndicator class="fui-select__item-pill" />
            <SelectItemText class="fui-select__item-text">
              <slot
                name="item"
                :item="item"
                :selected="isSameValue(item.value, currentValue)"
                >{{ item.text ?? String(item.value) }}</slot
              >
            </SelectItemText>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>

<style scoped>
/* 触发面 / 标题 / 说明：本组件模板里的元素，scoped 生效 */
.fui-select {
  display: inline-flex;
  flex-direction: column;
  align-items: stretch;
  width: fit-content;
  min-width: 64px;
  font-family: var(--fontFamilyBase);
  font-size: var(--fontSizeBase300);
  line-height: var(--lineHeightBase300);
  color: var(--colorNeutralForeground1);
}

.fui-select__header {
  margin-bottom: var(--spacingVerticalS);
  color: var(--colorNeutralForeground1);
}

.fui-select--disabled .fui-select__header {
  color: var(--colorNeutralForegroundDisabled);
}

.fui-select__description {
  margin-top: var(--spacingVerticalXS);
  color: var(--colorNeutralForeground2);
  font-size: var(--fontSizeBase200);
  line-height: var(--lineHeightBase200);
}

.fui-select__surface {
  /* WinUI：ComboBoxBackground ← ControlFillColorDefaultBrush；
     四边 ControlElevationBorderBrush → --colorNeutralStrokeAlpha、
     底边 ControlStrokeColorDefault → --colorNeutralStroke1（与本库 Combobox 同口径） */
  --fui-select-background: var(--colorNeutralBackground1);
  --fui-select-border: var(--colorNeutralStrokeAlpha);
  --fui-select-border-bottom: var(--colorNeutralStroke1);
  --fui-select-foreground: var(--colorNeutralForeground1);
  --fui-select-placeholder: var(--colorNeutralForeground3);
  --fui-select-chevron: var(--colorNeutralForeground2);

  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: var(--spacingHorizontalS);
  min-width: 64px;
  max-width: 100%;
  min-height: 32px;
  padding: 5px 11px 7px 11px;
  border: var(--strokeWidthThin) solid var(--fui-select-border);
  border-bottom-color: var(--fui-select-border-bottom);
  border-radius: var(--borderRadiusMedium);
  background-color: var(--fui-select-background);
  color: var(--fui-select-foreground);
  font: inherit;
  text-align: start;
  cursor: pointer;
  transition: background-color var(--durationFast) var(--curveEasyEase);
}

/* WinUI：ComboBoxBackgroundPointerOver ← ControlFillColorSecondaryBrush */
.fui-select__surface:hover:not([data-disabled]) {
  --fui-select-background: var(--colorNeutralBackground1Hover);
}

/* WinUI：ComboBoxBackgroundPressed ← ControlFillColorTertiaryBrush */
.fui-select__surface:active:not([data-disabled]) {
  --fui-select-background: var(--colorNeutralBackground1Pressed);
}

.fui-select__surface[data-disabled] {
  --fui-select-background: var(--colorNeutralBackgroundDisabled);
  --fui-select-foreground: var(--colorNeutralForegroundDisabled);
  --fui-select-placeholder: var(--colorNeutralForegroundDisabled);
  --fui-select-chevron: var(--colorNeutralForegroundDisabled);
  cursor: not-allowed;
}

.fui-select__text {
  flex: auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* WinUI：PlaceholderText 用 TextFillColorTertiaryBrush */
.fui-select__text[data-placeholder] {
  color: var(--fui-select-placeholder);
}

.fui-select__chevron {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 12px;
  height: 12px;
  color: var(--fui-select-chevron);
  pointer-events: none;
  /* 复用 Combobox 的箭头旋转口径：展开时翻转，时长走 token */
  transition: transform var(--durationNormal) var(--curveDecelerateMid);
}

.fui-select--open .fui-select__chevron {
  transform: rotate(180deg);
}

@media (prefers-reduced-motion: reduce) {
  .fui-select__surface,
  .fui-select__chevron {
    transition: none;
  }
}
</style>

<!-- 下拉面板：reka 的 SelectContent 把 class 落在 Teleport 到 body 的元素上，
     拿不到本组件的 data-v-*，scoped 选择器会静默失效（见 AGENTS《scoped 样式》）。
     这里用非 scoped 块，类名保持 .fui-select__ 私有前缀。 -->
<style>
.fui-select__popup {
  --fui-select-item-background: transparent;
  --fui-select-item-foreground: var(--colorNeutralForeground1);

  z-index: var(--zIndexNavFlyout);
  box-sizing: border-box;
  width: var(--reka-select-trigger-width, 64px);
  max-width: var(--reka-select-content-available-width, 100vw);
  max-height: min(
    var(--fui-select-max-height, 504px),
    var(--reka-select-content-available-height, 504px)
  );
  overflow: hidden;
  border: var(--strokeWidthThin) solid var(--colorNeutralStroke1);
  border-radius: var(--borderRadiusXLarge);
  /* WinUI：ComboBoxDropDown 用 elevation 16 → --shadow16；底色取卡片面 */
  background-color: var(--colorNeutralBackground1);
  box-shadow: var(--shadow16);
  color: var(--colorNeutralForeground1);
  font-family: var(--fontFamilyBase);
  font-size: var(--fontSizeBase300);
  line-height: var(--lineHeightBase300);
}

.fui-select__list {
  min-height: 0;
  padding-block: 4px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
}

/* WinUI：ComboBoxItemBackground ← SubtleFillColorTransparentBrush（未悬停时透明） */
.fui-select__item {
  display: block;
  box-sizing: border-box;
  position: relative;
  margin: 2px 5px;
  padding: 5px 11px 7px;
  border-radius: var(--borderRadiusMedium);
  background-color: var(--fui-select-item-background);
  color: var(--fui-select-item-foreground);
  cursor: default;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition:
    background-color var(--durationFast) var(--curveEasyEase),
    color var(--durationFast) var(--curveEasyEase);
}

/* WinUI：ComboBoxItemBackgroundPointerOver ← SubtleFillColorSecondaryBrush */
.fui-select__item[data-highlighted] {
  --fui-select-item-background: var(--colorSubtleBackgroundHover);
}

/* WinUI：ComboBoxItemBackgroundPressed ← SubtleFillColorTertiaryBrush */
.fui-select__item:active {
  --fui-select-item-background: var(--colorSubtleBackgroundPressed);
  --fui-select-item-foreground: var(--colorNeutralForeground2);
}

/* WinUI：ComboBoxItemBackgroundSelected ← SubtleFillColorSecondaryBrush */
.fui-select__item[data-state='checked'] {
  --fui-select-item-background: var(--colorSubtleBackgroundSelected);
}

.fui-select__item[data-highlighted][data-state='checked'] {
  --fui-select-item-background: var(--colorSubtleBackgroundPressed);
}

.fui-select__item[data-disabled] {
  --fui-select-item-background: transparent;
  --fui-select-item-foreground: var(--colorNeutralForegroundDisabled);
  cursor: not-allowed;
}

.fui-select__item-pill {
  position: absolute;
  inset-inline-start: 0;
  top: calc(50% - 8px);
  width: 3px;
  height: 16px;
  border-radius: var(--borderRadiusSmall);
  background-color: var(--colorCompoundBrandBackground);
  opacity: 0;
}

.fui-select__item[data-state='checked'] .fui-select__item-pill {
  opacity: 1;
}

.fui-select__item-text {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fui-select__empty {
  padding: 5px 11px 7px;
  color: var(--colorNeutralForeground3);
}

@media (prefers-reduced-motion: reduce) {
  .fui-select__item {
    transition: none;
  }
}
</style>
