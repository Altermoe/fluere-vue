<script setup lang="ts">
import { FluereButton, FluereContentDialog } from '@fluere-vue/ui'
import type { FluereContentDialogButton } from '@fluere-vue/ui'
import { ref } from 'vue'

/**
 * 默认按钮（`DefaultButton`）：获得强调样式，并作为 Enter 的激活目标。
 *
 * 焦点规则与 WinUI 一致：焦点不在命令区（或正好落在默认按钮上）时保留强调态；
 * 焦点移到命令区里的**其它**按钮时，强调态会消失。
 */
const options: { value: FluereContentDialogButton; label: string }[] = [
  { value: 'none', label: '无默认按钮' },
  { value: 'primary', label: '主按钮为默认' },
  { value: 'secondary', label: '次按钮为默认' },
  { value: 'close', label: '关闭按钮为默认' },
]

const open = ref(false)
const defaultButton = ref<FluereContentDialogButton>('primary')

const show = (value: FluereContentDialogButton): void => {
  defaultButton.value = value
  open.value = true
}
</script>

<template>
  <div class="flex flex-col gap-fluent-l">
    <div class="flex flex-wrap items-center gap-fluent-s">
      <FluereButton
        v-for="option in options"
        :key="option.value"
        :data-cd-demo="`default-${option.value}`"
        size="small"
        @click="show(option.value)"
      >
        {{ option.label }}
      </FluereButton>
    </div>

    <FluereContentDialog
      v-model:open="open"
      title="默认按钮与 Enter"
      primary-button-text="确定"
      secondary-button-text="取消"
      close-button-text="关闭"
      :default-button="defaultButton"
    >
      <p>把焦点放在这段文字上按 Enter，会激活默认按钮（{{ defaultButton }}）。</p>
      <p><input placeholder="焦点在输入框里时，Enter 交给输入框自己处理" /></p>
    </FluereContentDialog>
  </div>
</template>
