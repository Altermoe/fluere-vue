<script setup lang="ts">
import { FluereProgressRing } from '@fluere-vue/ui'
</script>

<template>
  <div class="flex items-center gap-fluent-xl">
    <FluereProgressRing
      disabled
      label="禁用的转圈"
    />
    <FluereProgressRing
      disabled
      :indeterminate="false"
      :model-value="60"
      label="禁用的进度"
    />
  </div>
</template>
