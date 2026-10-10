<script setup lang="ts">
import type { FluereComboboxItem } from '@fluere-vue/ui'
import { FluereCombobox } from '@fluere-vue/ui'
import { computed, ref } from 'vue'

const { t, tm } = useDocsI18n()

/** 演示用颜色列表（对应 WinUI Gallery 的 ComboBox 基础示例） */
const COLOR_VALUES = ['blue', 'green', 'red', 'yellow']
const colorTexts = computed(() => tm('demos.combobox.basic.colors'))
const COLORS = computed<FluereComboboxItem<string>[]>(() =>
  COLOR_VALUES.map((value, index) => ({ value, text: colorTexts.value[index] ?? '' })),
)

const picked = ref<string | null>(null)
const currentNote = computed(() =>
  t('demos.combobox.basic.currentNote', { value: picked.value ?? '—' }),
)
</script>

<template>
  <div class="flex flex-col gap-fluent-l max-w-xs">
    <FluereCombobox
      v-model="picked"
      :items="COLORS"
      :header="t('demos.combobox.basic.header')"
      :placeholder="t('demos.combobox.basic.placeholder')"
    />
    <p class="text-sm text-colorNeutralForeground3">
      {{ currentNote }}
    </p>
  </div>
</template>
