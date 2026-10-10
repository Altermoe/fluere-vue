<script setup lang="ts">
import { FluereButton, FluereContentDialog } from '@fluere-vue/ui'
import type { FluereContentDialogResult } from '@fluere-vue/ui'
import { ref } from 'vue'

const { t } = useDocsI18n()

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
        {{ t('demos.content-dialog.basic.openLabel') }}
      </FluereButton>
      <span class="text-sm text-colorNeutralForeground2">closed.result：{{ result }}</span>
    </div>

    <FluereContentDialog
      v-model:open="open"
      :title="t('demos.content-dialog.basic.title')"
      :primary-button-text="t('demos.content-dialog.basic.primaryLabel')"
      :secondary-button-text="t('demos.content-dialog.basic.cancelLabel')"
      default-button="primary"
      @closed="(args) => (result = args.result)"
    >
      {{ t('demos.content-dialog.basic.description') }}
    </FluereContentDialog>
  </div>
</template>
