<script setup lang="ts">
import { FluereButton, FluereContentDialog } from '@fluere-vue/ui'
import { ref } from 'vue'

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
      打开全尺寸弹窗
    </FluereButton>

    <FluereContentDialog
      v-model:open="open"
      title="全尺寸弹窗"
      primary-button-text="确定"
      close-button-text="关闭"
      full-size-desired
    >
      <p>
        `fullSizeDesired` 让弹窗外框纵向撑满可用空间（上限仍是 `ContentDialogMaxHeight` =
        756），横向保持居中且不超过 `ContentDialogMaxWidth` = 548。
      </p>
      <p>内容仍是滚动的：超出高度时内容区内部滚动，命令区固定在底部。</p>
    </FluereContentDialog>
  </div>
</template>
