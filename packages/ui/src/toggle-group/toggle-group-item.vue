<script lang="ts">
import type { Component } from 'vue'
import type { FluereToggleButtonProps } from '../toggle-button/toggle-button.vue'

/**
 * FluereToggleGroupItem 组件 Props 契约
 *
 * 组内的一项：**外观完全复用 `FluereToggleButton`**（同一份 SFC 的
 * `<style scoped>`，不复制状态表），本组件只负责三件事：
 *   1. 把 reka `ToggleGroupRoot` 的组上下文接上（取值 → 选中态、点击 → 回写组值）；
 *   2. 用 reka `RovingFocusItem` 提供 roving tabindex（组内只有一个 Tab 停靠点，
 *      方向键 / Home / End 在项之间移动焦点，跳过禁用项）；
 *   3. 继承组上的表现属性（目前是 `size`）。
 *
 * 为什么用 `RovingFocusItem` 而不是 reka 的 `ToggleGroupItem`：
 * `ToggleGroupItem` 内部渲染的是 reka 的 `Toggle`（一套中性按钮外观），拿不到本库
 * WinUI `ToggleButton` 的状态表；本库改为「reka 只管分组与焦点，外观只用本库按钮」，
 * 于是样式只有一处（`toggle-button.vue`），不会两套漂移。
 *
 * 用法：必须置于 `<FluereToggleGroup>` 内（组上下文由 reka provide/inject 注入，
 * 脱离组会直接抛出可读错误）。`value` 是该按钮在组内的取值：单选组是 `string`，
 * 多选组是 `string[]` 的一个成员。
 *
 * 无障碍：渲染出来的仍是原生 `<button>`，`aria-pressed` 由 `FluereToggleButton`
 * 依据选中态输出（三态项为 `mixed`）；纯图标项用 `label` 给 `aria-label`。
 */
export interface FluereToggleGroupItemProps {
  /**
   * 该按钮在组内的取值（单选：`string`；多选：`string[]` 的成员）
   */
  value: string

  /**
   * 是否禁用该项（叠加在组 `disabled` 之上）
   * @default false
   */
  disabled?: boolean

  /**
   * 尺寸档；缺省继承组上的 `size`，再缺省走 `FluereToggleButton` 的 `'medium'`
   */
  size?: FluereToggleButtonProps['size']

  /**
   * 是否撑满容器宽度（配合组的 `orientation="vertical"` 可做等宽纵排）
   * @default false
   */
  block?: boolean

  /**
   * 可访问名（等价 `aria-label`）；纯图标项必须提供
   */
  label?: string

  /**
   * 图标组件（`@fluere-vue/icons`），装饰性、对 AT 隐藏
   */
  icon?: Component

  /**
   * 是否仅显示图标（等比紧凑模式）
   * @default false
   */
  iconOnly?: boolean
}
</script>

<script setup lang="ts" generic="TIcon extends Component = Component">
import { RovingFocusItem, injectToggleGroupRootContext } from 'reka-ui'
import { computed, inject } from 'vue'
import FluereToggleButton from '../toggle-button/toggle-button.vue'
import { TOGGLE_GROUP_CONTEXT_KEY } from './context'

const props = withDefaults(defineProps<FluereToggleGroupItemProps>(), {
  disabled: false,
  size: undefined,
  block: false,
  label: undefined,
  icon: undefined,
  iconOnly: false,
})

defineOptions({ name: 'FluereToggleGroupItem' })

/**
 * 组上下文（reka 的 `ToggleGroupRoot` 提供）。这里刻意不传缺省值：脱离组使用时
 * reka 会抛出「Component must be used within `ToggleGroupRoot`」，比静默渲染一个
 * 不参与分组的按钮更容易排查。
 */
const group = injectToggleGroupRootContext()

/** 组级表现属性（本库自有，可选） */
const groupContext = inject(TOGGLE_GROUP_CONTEXT_KEY, undefined)

/** 选中态：组值是数组时看包含，否则看相等（单选组取消选中时组值为 `undefined`） */
const isPressed = computed(() => {
  const modelValue = group.modelValue.value
  return Array.isArray(modelValue) ? modelValue.includes(props.value) : modelValue === props.value
})

/** 禁用 = 项自己的 disabled 或组 disabled */
const isDisabled = computed(() => props.disabled || group.disabled?.value === true)

const resolvedSize = computed(() => props.size ?? groupContext?.size.value)

/** 点击只回写组值；选中态永远由组决定（不自持本地状态） */
const onToggle = () => {
  group.changeModelValue(props.value)
}
</script>

<template>
  <RovingFocusItem
    as-child
    :focusable="!isDisabled"
    :active="isPressed"
  >
    <FluereToggleButton
      :checked="isPressed"
      :disabled="isDisabled"
      :size="resolvedSize"
      :block="block"
      :label="label"
      :icon="icon"
      :icon-only="iconOnly"
      @update:checked="onToggle"
    >
      <!-- 只在消费方真的给了 #icon 时才透传，否则会盖掉按钮自身的 icon Prop 兜底 -->
      <template
        v-if="$slots.icon"
        #icon
      >
        <slot name="icon" />
      </template>

      <slot />
    </FluereToggleButton>
  </RovingFocusItem>
</template>
