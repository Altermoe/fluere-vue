<script lang="ts">
/**
 * FluereSplitButton —— 主区执行默认动作、箭头区展开浮层的拆分按钮。
 *
 * 规格来源与完整的状态表 / token 映射 / 动效关键帧写在内部基座
 * `./split-button-base.vue` 的文件头（单一事实源）；本文件只负责公开契约与事件转发。
 *
 * 与 WinUI 的对应：`Microsoft.UI.Xaml.Controls.SplitButton`（tag `winui3/release/2.5.1`）。
 * 勾选变体是独立的 `FluereToggleSplitButton`（对应 `ToggleSplitButton`）。
 */
export type { FluereSplitButtonFlyoutSlotProps, FluereSplitButtonProps } from './types'
</script>

<script setup lang="ts">
import SplitButtonBase from './split-button-base.vue'
import type { FluereSplitButtonProps } from './types'

defineOptions({
  name: 'FluereSplitButton',
})

withDefaults(defineProps<FluereSplitButtonProps>(), {
  // `open` 是受控判据：缺省必须保持 `undefined`，否则 Vue 的布尔 Prop 规则会把
  // 「未传」转成 `false`，组件永远进不了非受控分支（2026-10-20 首次跑测试抓到）
  open: undefined,
})

const emit = defineEmits<{
  /** 主区点击（对应 WinUI `Click`） */
  'click': [event: MouseEvent]
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
    :toggleable="false"
    @click="emit('click', $event)"
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
