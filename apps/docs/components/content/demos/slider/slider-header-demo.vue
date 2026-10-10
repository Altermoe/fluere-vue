<script setup lang="ts">
import { FluereSlider } from '@fluere-vue/ui'
import { ref } from 'vue'

const { t } = useDocsI18n()

/** 演示用的初始字号 */
const INITIAL_FONT_SIZE = 14

const fontSize = ref(INITIAL_FONT_SIZE)
</script>

<template>
  <div class="flex flex-col gap-fluent-l max-w-sm">
    <FluereSlider
      v-model="fontSize"
      :min="9"
      :max="72"
      :step="1"
      :header="t('demos.slider.header.header')"
    >
      <template #header>{{ t('demos.slider.header.headerSlot', { fontSize }) }}</template>
    </FluereSlider>
    <FluereSlider
      v-model="fontSize"
      :label="t('demos.slider.header.label')"
    />
    <p class="text-sm text-colorNeutralForeground3">
      {{ t('demos.slider.header.note') }}
    </p>
  </div>
</template>
