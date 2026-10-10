<script setup lang="ts">
import { FluereButton, FluereContentDialog } from '@fluere-vue/ui'
import { ref } from 'vue'

const { t } = useDocsI18n()

/**
 * 全尺寸弹窗：对应 WinUI 的 `FullSizeDesired` → `FullDialogSizing`，
 * 模板只把 `BackgroundElement.VerticalAlignment` 置为 Stretch（横向仍居中）。
 */
const open = ref(false)
</script>

<template>
  <div class="flex flex-col gap-fluent-l">
    <FluereButton
      data-cd-demo="full-size-open"
      @click="open = true"
    >
      {{ t('demos.content-dialog.fullSize.openLabel') }}
    </FluereButton>

    <FluereContentDialog
      v-model:open="open"
      :title="t('demos.content-dialog.fullSize.title')"
      :primary-button-text="t('demos.content-dialog.fullSize.primaryLabel')"
      :close-button-text="t('demos.common.close')"
      full-size-desired
    >
      <p>{{ t('demos.content-dialog.fullSize.description') }}</p>
      <p>{{ t('demos.content-dialog.fullSize.scrollNote') }}</p>
    </FluereContentDialog>
  </div>
</template>
