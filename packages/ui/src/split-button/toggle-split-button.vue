<script lang="ts">
/**
 * FluereToggleSplitButton —— 带勾选状态的拆分按钮（对应 WinUI `ToggleSplitButton`）。
 *
 * 与 `FluereSplitButton` 共用内部的 `./split-button-base.vue`：模板、状态表、token 映射与
 * 箭头动效的规格来源都写在该文件头（单一事实源）；本文件只追加受控勾选契约。
 *
 * 勾选语义（对齐 `ToggleSplitButton.cpp`）：
 *   - 主区点击：先 `Toggle()` 再抛 `Click` ⇒ 本库依次抛 `update:checked`、
 *     `isCheckedChanged`、`click`；
 *   - 箭头区点击**不**改变勾选状态，只开浮层；
 *   - `checked` 为受控 Prop（沿用本库 `FluereToggleButton` 的口径，点击只回写）。
 */
export type { FluereSplitButtonFlyoutSlotProps, FluereToggleSplitButtonProps } from './types'
</script>

<script setup lang="ts">
import SplitButtonBase from './split-button-base.vue'
import type { FluereToggleSplitButtonProps } from './types'

defineOptions({
  name: 'FluereToggleSplitButton',
})

withDefaults(defineProps<FluereToggleSplitButtonProps>(), {
  checked: false,
  // 同 `FluereSplitButton`：`open` 缺省必须保持 `undefined`（受控判据）
  open: undefined,
})

const emit = defineEmits<{
  /** 主区点击（对应 WinUI `Click`，勾选状态已先切换） */
  'click': [event: MouseEvent]
  /** 勾选状态回写（`v-model:checked`） */
  'update:checked': [value: boolean]
  /** 勾选状态变化（对应 `IsCheckedChanged`） */
  'isCheckedChanged': [value: boolean]
  /** 浮层开关回写（`v-model:open`） */
  'update:open': [value: boolean]
  /** 浮层已打开（对应 `Flyout.Opened`） */
  'opened': []
  /** 浮层已关闭（对应 `Flyout.Closed`） */
  'closed': []
}>()
</script>

<template>
  <SplitButtonBase
    v-bind="$props"
    :toggleable="true"
    @click="emit('click', $event)"
    @update:checked="emit('update:checked', $event)"
    @is-checked-changed="emit('isCheckedChanged', $event)"
    @update:open="emit('update:open', $event)"
    @opened="emit('opened')"
    @closed="emit('closed')"
  >
    <slot />
    <template
      v-if="$slots.flyout"
      #flyout="slotProps"
    >
      <slot
        name="flyout"
        v-bind="slotProps"
      />
    </template>
  </SplitButtonBase>
</template>
