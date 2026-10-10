<script setup lang="ts">
import { FluereSlider } from '@fluere-vue/ui'
import { ref } from 'vue'

const { t } = useDocsI18n()

/** 演示用的初始值（集中命名，避免散落的字面量） */
const INITIAL_VOLUME = 45
const INITIAL_BRIGHTNESS = 80

const volume = ref(INITIAL_VOLUME)
const brightness = ref(INITIAL_BRIGHTNESS)
</script>

<template>
  <div class="flex flex-col gap-fluent-l max-w-sm">
    <FluereSlider
      v-model="volume"
      :header="t('demos.slider.basic.headerVolume')"
    />
    <FluereSlider
      v-model="brightness"
      :header="t('demos.slider.basic.headerBrightness')"
    />
    <p class="text-sm text-colorNeutralForeground3">
      {{ t('demos.slider.basic.note', { volume, brightness }) }}
    </p>
  </div>
</template>
