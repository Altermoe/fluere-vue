<script setup lang="ts">
import type { FluereComboboxItem } from '@fluere-vue/ui'
import { FluereCombobox } from '@fluere-vue/ui'
import { computed, ref } from 'vue'

const { t } = useDocsI18n()

/** 设置项风格的列表：标题 + 说明 + 可访问名 */
const FONT_SIZES: FluereComboboxItem<number>[] = [
  { value: 12, text: '12 px' },
  { value: 14, text: '14 px' },
  { value: 16, text: '16 px' },
  { value: 20, text: '20 px' },
]

/** 缺省字号（px） */
const DEFAULT_FONT_SIZE = 14

const fontSize = ref<number | null>(DEFAULT_FONT_SIZE)
const sizeNote = computed(() =>
  t('demos.combobox.header.sizeNote', { value: fontSize.value ?? '—' }),
)
</script>

<template>
  <div class="flex flex-col gap-fluent-l max-w-xs">
    <FluereCombobox
      v-model="fontSize"
      :items="FONT_SIZES"
      :header="t('demos.combobox.header.header')"
      :description="t('demos.combobox.header.description')"
      :label="t('demos.combobox.header.label')"
    />
    <p class="text-sm text-colorNeutralForeground3">
      {{ sizeNote }}
    </p>
  </div>
</template>
