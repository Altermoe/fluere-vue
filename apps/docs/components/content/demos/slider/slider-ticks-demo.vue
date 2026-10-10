<script setup lang="ts">
import { FluereSlider } from '@fluere-vue/ui'
import { ref } from 'vue'

const { t } = useDocsI18n()

/** 演示用的初始值 */
const INITIAL_INLINE = 30
const INITIAL_OUTSIDE = 30
/** 每 10 一格刻度 */
const TICK_FREQUENCY = 10

const inline = ref(INITIAL_INLINE)
const outside = ref(INITIAL_OUTSIDE)
</script>

<template>
  <div class="flex flex-col gap-fluent-xxl max-w-sm">
    <FluereSlider
      v-model="inline"
      tick-placement="inline"
      :tick-frequency="TICK_FREQUENCY"
      :header="t('demos.slider.ticks.headerInline')"
    />
    <FluereSlider
      v-model="outside"
      tick-placement="outside"
      :tick-frequency="TICK_FREQUENCY"
      :header="t('demos.slider.ticks.headerOutside')"
    />
    <p class="text-sm text-colorNeutralForeground3">
      {{ t('demos.slider.ticks.note') }}
    </p>
  </div>
</template>
