<script setup lang="ts">
import { FluereButton, FluereContentDialog } from '@fluere-vue/ui'
import type { FluereContentDialogResult } from '@fluere-vue/ui'
import { ref } from 'vue'

/**
 * 基础示例：标题 + 正文 + 主/次按钮，`defaultButton` 为 Primary。
 *
 * 与 WinUI 的对应：`ShowAsync()` / `Hide()` → `v-model:open`；返回值 → `closed` 的
 * `args.result`（`primary` / `secondary` / `none`）。
 */
const open = ref(false)
const result = ref<FluereContentDialogResult | '—'>('—')
</script>

<template>
  <div class="flex flex-col gap-fluent-l">
    <div class="flex items-center gap-fluent-m">
      <FluereButton
        data-cd-demo="basic-open"
        @click="open = true"
      >
        删除草稿
      </FluereButton>
      <span class="text-sm text-colorNeutralForeground2">closed.result：{{ result }}</span>
    </div>

    <FluereContentDialog
      v-model:open="open"
      title="要删除这份草稿吗？"
      primary-button-text="删除"
      secondary-button-text="取消"
      default-button="primary"
      @closed="(args) => (result = args.result)"
    >
      删除后将从本机与云端一并移除，且无法恢复。
    </FluereContentDialog>
  </div>
</template>
