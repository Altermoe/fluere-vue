<script setup lang="ts">
import { FluereProgressBar } from '@fluere-vue/ui'
import { ref } from 'vue'

const value = ref(60)
</script>

<template>
  <div class="flex flex-col gap-fluent-l">
    <div class="flex items-center gap-fluent-m">
      <FluereProgressBar
        v-model="value"
        disabled
        label="禁用的确定态进度条"
        class="w-[130px]"
      />
      <span class="text-sm text-colorNeutralForeground2">disabled（确定态）</span>
    </div>
    <div class="flex items-center gap-fluent-m">
      <FluereProgressBar
        indeterminate
        disabled
        label="禁用的不确定态进度条"
        class="w-[130px]"
      />
      <span class="text-sm text-colorNeutralForeground2">disabled（不确定态）</span>
    </div>
  </div>
</template>
