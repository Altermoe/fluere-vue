<script setup lang="ts">
import { FluereNumberBox } from '@fluere-vue/ui'
import { ref } from 'vue'

const { t } = useDocsI18n()

/** 演示用的初始值 */
const INITIAL_INTEGER = 25.8
const INITIAL_FIXED = 25.8
const INITIAL_GERMAN = 1234.5

const integer = ref<number | null>(INITIAL_INTEGER)
const fixed = ref<number | null>(INITIAL_FIXED)
const german = ref<number | null>(INITIAL_GERMAN)
</script>

<template>
  <div class="flex flex-col gap-fluent-l max-w-sm">
    <FluereNumberBox
      v-model="integer"
      :format-options="{ maximumFractionDigits: 0 }"
      :header="t('demos.number-box.format.headerInteger')"
      :description="t('demos.number-box.format.descriptionInteger')"
    />
    <FluereNumberBox
      v-model="fixed"
      :format-options="{ minimumFractionDigits: 2, maximumFractionDigits: 2 }"
      :header="t('demos.number-box.format.headerFixed')"
    />
    <FluereNumberBox
      v-model="german"
      locale="de-DE"
      :header="t('demos.number-box.format.headerLocale')"
      :description="t('demos.number-box.format.descriptionLocale')"
    />
  </div>
</template>
