<script setup lang="ts">
import { FluereNumberBox } from '@fluere-vue/ui'
import { ref } from 'vue'

const { t } = useDocsI18n()

/** 演示用的初始值 */
const INITIAL_QUANTITY = 100
const INITIAL_RATIO = 0.4

const quantity = ref<number | null>(INITIAL_QUANTITY)
const ratio = ref<number | null>(INITIAL_RATIO)
</script>

<template>
  <div class="flex flex-col gap-fluent-l max-w-sm">
    <FluereNumberBox
      v-model="quantity"
      :min="0"
      :max="500"
      :step="10"
      :large-step="100"
      :header="t('demos.number-box.step.headerQuantity')"
    />
    <FluereNumberBox
      v-model="ratio"
      :min="0"
      :max="1"
      :step="0.1"
      :header="t('demos.number-box.step.headerRatio')"
    />
    <p class="text-sm text-colorNeutralForeground3">
      {{ t('demos.number-box.step.note') }}
    </p>
  </div>
</template>
