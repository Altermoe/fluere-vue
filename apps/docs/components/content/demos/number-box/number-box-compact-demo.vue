<script setup lang="ts">
import { FluereNumberBox } from '@fluere-vue/ui'
import { ref } from 'vue'

const { t } = useDocsI18n()

/** 演示用的初始值 */
const INITIAL_OPACITY = 80
const INITIAL_COLUMNS = 4

const opacity = ref<number | null>(INITIAL_OPACITY)
const columns = ref<number | null>(INITIAL_COLUMNS)
</script>

<template>
  <div class="flex flex-col gap-fluent-l max-w-sm">
    <FluereNumberBox
      v-model="opacity"
      :min="0"
      :max="100"
      spin-button-placement-mode="compact"
      :header="t('demos.number-box.compact.headerOpacity')"
    />
    <FluereNumberBox
      v-model="columns"
      :min="1"
      :max="12"
      spin-button-placement-mode="compact"
      :header="t('demos.number-box.compact.headerColumns')"
    />
    <p class="text-sm text-colorNeutralForeground3">
      {{ t('demos.number-box.compact.note') }}
    </p>
  </div>
</template>
