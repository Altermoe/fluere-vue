<script setup lang="ts">
import { FluereNumberBox, FluereProgressBar } from '@fluere-vue/ui'
import { ref } from 'vue'

/**
 * 对齐 WinUI3 Gallery「A determinate progress bar」示例：
 * ProgressBar（Width=130）+ 百分比文本 + NumberBox（SpinButtonPlacementMode=Inline）。
 */
const value = ref(30)
</script>

<template>
  <div class="flex flex-wrap items-center gap-fluent-m">
    <FluereProgressBar
      v-model="value"
      label="确定态进度条示例"
      class="w-[130px]"
    />
    <span class="w-[60px] text-center text-sm text-colorNeutralForeground2">
      {{ Math.round(value) }}%
    </span>
    <span class="text-sm text-colorNeutralForeground2">Progress</span>
    <FluereNumberBox
      v-model="value"
      :min="0"
      :max="100"
      spin-button-placement-mode="inline"
      label="调整进度条数值"
    />
  </div>
</template>
