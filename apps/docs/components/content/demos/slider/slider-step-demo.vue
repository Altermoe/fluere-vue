<script setup lang="ts">
import { FluereSlider } from '@fluere-vue/ui'
import { ref } from 'vue'

const { t } = useDocsI18n()

/** 演示用的初始值 */
const INITIAL_PRICE = 250
const INITIAL_RATIO = 0.4

const price = ref(INITIAL_PRICE)
const ratio = ref(INITIAL_RATIO)
</script>

<template>
  <div class="flex flex-col gap-fluent-l max-w-sm">
    <FluereSlider
      v-model="price"
      :min="0"
      :max="1000"
      :step="50"
      :header="t('demos.slider.step.headerPrice')"
    />
    <FluereSlider
      v-model="ratio"
      :min="0"
      :max="1"
      :step="0.1"
      :header="t('demos.slider.step.headerRatio')"
    />
    <p class="text-sm text-colorNeutralForeground3">
      {{ t('demos.slider.step.note', { price, ratio: ratio.toFixed(1) }) }}
    </p>
  </div>
</template>
