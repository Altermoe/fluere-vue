<script setup lang="ts">
import { FluereButton, FluereTooltip } from '@fluere-vue/ui'

const longText =
  'A ToolTip shows more information about a UI element. You might show information about what the element does, or what the user should do. 提示文本会在 320px 处自动换行。'
</script>

<template>
  <div class="flex flex-wrap items-center gap-fluent-l">
    <FluereTooltip content="Simple ToolTip">
      <FluereButton>纯文本（content）</FluereButton>
    </FluereTooltip>

    <FluereTooltip :content="longText">
      <FluereButton>长文本自动换行</FluereButton>
    </FluereTooltip>

    <FluereTooltip>
      <FluereButton>富内容（#content）</FluereButton>
      <template #content>
        <span class="flex items-center gap-2">
          <strong>保存</strong>
          <span>Ctrl + S</span>
        </span>
      </template>
    </FluereTooltip>
  </div>
</template>
