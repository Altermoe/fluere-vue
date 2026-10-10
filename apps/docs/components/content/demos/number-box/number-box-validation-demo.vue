<script setup lang="ts">
import { FluereNumberBox } from '@fluere-vue/ui'
import { ref } from 'vue'

const { t } = useDocsI18n()

/** 演示用的初始值 */
const INITIAL_STRICT = 20
const INITIAL_LENIENT = 20

const strict = ref<number | null>(INITIAL_STRICT)
const lenient = ref<number | null>(INITIAL_LENIENT)
</script>

<template>
  <div class="flex flex-col gap-fluent-l max-w-sm">
    <FluereNumberBox
      v-model="strict"
      :min="0"
      :max="100"
      :header="t('demos.number-box.validation.headerDefault')"
      :description="t('demos.number-box.validation.descriptionDefault')"
    />
    <FluereNumberBox
      v-model="lenient"
      :min="0"
      :max="100"
      validation-mode="disabled"
      :header="t('demos.number-box.validation.headerDisabled')"
      :description="t('demos.number-box.validation.descriptionDisabled')"
    />
    <p class="text-sm text-colorNeutralForeground3">
      {{
        t('demos.number-box.validation.note', {
          strict: strict ?? '—',
          lenient: lenient ?? '—',
        })
      }}
    </p>
  </div>
</template>
