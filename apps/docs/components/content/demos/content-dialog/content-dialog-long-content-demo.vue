<script setup lang="ts">
import { FluereButton, FluereContentDialog } from '@fluere-vue/ui'
import { ref } from 'vue'

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
      打开长内容弹窗
    </FluereButton>

    <FluereContentDialog
      v-model:open="open"
      title="服务条款摘要（无按钮）"
    >
      <p
        v-for="index in paragraphs"
        :key="index"
        class="mb-fluent-s"
      >
        第 {{ index }} 段：内容超过 `ContentDialogMaxHeight`（756）后由内容区内部滚动，
        命令区留在底部；本示例没有任何按钮，因此按 Esc 关闭（结果 `none`）。
      </p>
    </FluereContentDialog>
  </div>
</template>
