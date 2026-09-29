<script setup lang="ts">
import { FluereProgressBar, FluereRadioButton, FluereRadioGroup } from '@fluere-vue/ui'
import { computed, ref } from 'vue'

/**
 * 对齐 WinUI3 Gallery 的「Progress state」选项：Running / Paused / Error。
 * WinUI 的 ShowPaused / ShowError 是两个独立布尔，Error 优先（ProgressBar.cpp#UpdateStates）。
 */
const state = ref<'running' | 'paused' | 'error'>('running')
const showPaused = computed(() => state.value === 'paused')
const showError = computed(() => state.value === 'error')
</script>

<template>
  <div class="flex flex-col gap-fluent-l">
    <div class="flex items-center gap-fluent-m">
      <FluereProgressBar
        indeterminate
        :show-paused="showPaused"
        :show-error="showError"
        label="不确定态进度条状态示例"
        class="w-[130px]"
      />
      <span class="text-sm text-colorNeutralForeground2">{{ state }}</span>
    </div>
    <FluereRadioGroup v-model="state">
      <FluereRadioButton value="running">Running</FluereRadioButton>
      <FluereRadioButton value="paused">Paused</FluereRadioButton>
      <FluereRadioButton value="error">Error</FluereRadioButton>
    </FluereRadioGroup>
  </div>
</template>
