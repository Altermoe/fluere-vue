<script setup lang="ts">
import { FluereButton, FluereContentDialog } from '@fluere-vue/ui'
import { ref } from 'vue'

const { t } = useDocsI18n()

/**
 * 长内容与无按钮：内容区内部滚动（WinUI 的 `ContentScrollViewer`
 * 把 `VerticalScrollBarVisibility` 设为 Disabled，即看不到滚动条），
 * 没有任何按钮时命令区整体折叠，Esc 是唯一的关闭方式。
 */
const open = ref(false)
const paragraphs = Array.from({ length: 12 }, (_, index) => index + 1)
</script>

<template>
  <div class="flex flex-col gap-fluent-l">
    <FluereButton
      data-cd-demo="long-content-open"
      @click="open = true"
    >
      {{ t('demos.content-dialog.longContent.openLabel') }}
    </FluereButton>

    <FluereContentDialog
      v-model:open="open"
      :title="t('demos.content-dialog.longContent.title')"
    >
      <p
        v-for="index in paragraphs"
        :key="index"
        class="mb-fluent-s"
      >
        {{ t('demos.content-dialog.longContent.paragraph', { index }) }}
      </p>
    </FluereContentDialog>
  </div>
</template>
