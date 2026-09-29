<script setup lang="ts">
import { FluereProgressRing } from '@fluere-vue/ui'
</script>

<template>
  <div class="flex items-end gap-fluent-xl">
    <div class="flex flex-col items-center gap-fluent-s">
      <FluereProgressRing
        size="small"
        label="小型"
      />
      <span class="text-xs text-colorNeutralForeground3">small 16</span>
    </div>
    <div class="flex flex-col items-center gap-fluent-s">
      <FluereProgressRing label="中等" />
      <span class="text-xs text-colorNeutralForeground3">medium 32（WinUI 默认）</span>
    </div>
    <div class="flex flex-col items-center gap-fluent-s">
      <FluereProgressRing
        size="large"
        label="大型"
      />
      <span class="text-xs text-colorNeutralForeground3">large 48</span>
    </div>
  </div>
</template>
