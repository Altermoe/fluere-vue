<script setup lang="ts">
import { FluereProgressRing } from '@fluere-vue/ui'
</script>

<template>
  <div class="flex items-center gap-fluent-m">
    <FluereProgressRing label="正在加载" />
    <span class="text-sm text-colorNeutralForeground2">正在加载，请稍候…</span>
  </div>
</template>
