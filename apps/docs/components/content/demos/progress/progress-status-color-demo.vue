<script setup lang="ts">
import { FluereProgressBar } from '@fluere-vue/ui'
import { ref } from 'vue'

/** 确定态的 paused / error：填充色改 SystemFillColorCaution / SystemFillColorCritical */
const value = ref(60)
</script>

<template>
  <div class="flex flex-col gap-fluent-l">
    <div class="flex items-center gap-fluent-m">
      <FluereProgressBar
        v-model="value"
        label="正常"
        class="w-[130px]"
      />
      <span class="text-sm text-colorNeutralForeground2">normal</span>
    </div>
    <div class="flex items-center gap-fluent-m">
      <FluereProgressBar
        v-model="value"
        show-paused
        label="已暂停"
        class="w-[130px]"
      />
      <span class="text-sm text-colorNeutralForeground2">ShowPaused</span>
    </div>
    <div class="flex items-center gap-fluent-m">
      <FluereProgressBar
        v-model="value"
        show-error
        label="出错"
        class="w-[130px]"
      />
      <span class="text-sm text-colorNeutralForeground2">ShowError</span>
    </div>
  </div>
</template>
