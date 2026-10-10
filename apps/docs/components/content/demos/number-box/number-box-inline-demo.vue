<script setup lang="ts">
import { FluereNumberBox } from '@fluere-vue/ui'
import { ref } from 'vue'

const { t } = useDocsI18n()

/** 演示用的初始值 */
const INITIAL_FONT_SIZE = 14
const INITIAL_ZOOM = 1.25

const fontSize = ref<number | null>(INITIAL_FONT_SIZE)
const zoom = ref<number | null>(INITIAL_ZOOM)
</script>

<template>
  <div class="flex flex-col gap-fluent-l max-w-sm">
    <FluereNumberBox
      v-model="fontSize"
      :min="9"
      :max="72"
      spin-button-placement-mode="inline"
      :header="t('demos.number-box.inline.headerFontSize')"
    />
    <FluereNumberBox
      v-model="zoom"
      :min="0.5"
      :max="3"
      :step="0.25"
      spin-button-placement-mode="inline"
      :header="t('demos.number-box.inline.headerZoom')"
    />
    <p class="text-sm text-colorNeutralForeground3">
      {{ t('demos.number-box.inline.note') }}
    </p>
  </div>
</template>
