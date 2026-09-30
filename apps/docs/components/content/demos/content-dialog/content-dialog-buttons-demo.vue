<script setup lang="ts">
import { FluereButton, FluereContentDialog } from '@fluere-vue/ui'
import { ref } from 'vue'

/**
 * 八种按钮组合：对齐 WinUI 模板的 `ButtonsVisibilityStates`。
 *
 * 组合仅由「三个按钮文案是否为空」决定；按钮在命令区 5 列网格里的落位也随组合变化：
 * 三按钮时各占 1/3；两按钮时左右各半；单按钮时靠右占半宽。
 */
interface ButtonPreset {
  key: string
  label: string
  primary?: string
  secondary?: string
  close?: string
}

const presets: ButtonPreset[] = [
  { key: 'all', label: '三个按钮', primary: '保存', secondary: '不保存', close: '取消' },
  { key: 'primary-secondary', label: '主 + 次', primary: '保存', secondary: '不保存' },
  { key: 'primary-close', label: '主 + 关', primary: '确定', close: '取消' },
  { key: 'secondary-close', label: '次 + 关', secondary: '稍后再说', close: '取消' },
  { key: 'primary', label: '仅主按钮', primary: '确定' },
  { key: 'secondary', label: '仅次按钮', secondary: '稍后再说' },
  { key: 'close', label: '仅关闭按钮', close: '关闭' },
  { key: 'none', label: '无按钮（Esc 关闭）' },
]

const open = ref(false)
const active = ref<ButtonPreset>(presets[0] as ButtonPreset)

const show = (preset: ButtonPreset): void => {
  active.value = preset
  open.value = true
}
</script>

<template>
  <div class="flex flex-col gap-fluent-l">
    <div class="flex flex-wrap items-center gap-fluent-s">
      <FluereButton
        v-for="preset in presets"
        :key="preset.key"
        :data-cd-demo="`buttons-${preset.key}`"
        size="small"
        @click="show(preset)"
      >
        {{ preset.label }}
      </FluereButton>
    </div>

    <FluereContentDialog
      v-model:open="open"
      title="命令区按钮组合"
      :primary-button-text="active.primary"
      :secondary-button-text="active.secondary"
      :close-button-text="active.close"
    >
      当前组合：<code>data-buttons="{{ active.key }}"</code> （{{ active.label }}）。
    </FluereContentDialog>
  </div>
</template>
