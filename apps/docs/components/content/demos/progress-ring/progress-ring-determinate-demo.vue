<script setup lang="ts">
import { FluereProgressRing, FluereSlider } from '@fluere-vue/ui'
import { ref } from 'vue'

const value = ref(40)
</script>

<template>
  <div class="flex flex-col gap-fluent-l max-w-sm">
    <div class="flex items-center gap-fluent-m">
      <FluereProgressRing
        :model-value="value"
        :indeterminate="false"
        label="下载进度"
      />
      <span class="text-sm text-colorNeutralForeground2"> {{ Math.round(value) }}% </span>
    </div>
    <FluereSlider
      v-model="value"
      :min="0"
      :max="100"
      header="拖动改变进度"
    />
  </div>
</template>
