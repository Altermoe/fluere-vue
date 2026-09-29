<script setup lang="ts">
import { FluereProgressBar } from '@fluere-vue/ui'
</script>

<template>
  <div class="flex flex-col gap-fluent-m">
    <FluereProgressBar
      indeterminate
      label="不确定态进度条示例"
      class="w-[130px]"
    />
    <span class="text-sm text-colorNeutralForeground2">正在进行，无法量化进度…</span>
  </div>
</template>
