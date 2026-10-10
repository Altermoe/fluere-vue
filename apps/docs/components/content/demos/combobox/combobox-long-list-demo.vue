<script setup lang="ts">
import type { FluereComboboxItem } from '@fluere-vue/ui'
import { FluereCombobox } from '@fluere-vue/ui'
import { computed, ref } from 'vue'

const { t } = useDocsI18n()

/** 长列表：面板最高 504px（约 15 项）后滚轮滚动，输入首字母可直接跳选 */
const STATES: FluereComboboxItem<string>[] = [
  'Alabama',
  'Alaska',
  'Arizona',
  'Arkansas',
  'California',
  'Colorado',
  'Connecticut',
  'Delaware',
  'Florida',
  'Georgia',
  'Hawaii',
  'Idaho',
  'Illinois',
  'Indiana',
  'Iowa',
  'Kansas',
  'Kentucky',
  'Louisiana',
  'Maine',
  'Maryland',
  'Massachusetts',
  'Michigan',
  'Minnesota',
  'Mississippi',
  'Missouri',
  'Montana',
  'Nebraska',
  'Nevada',
  'New Hampshire',
  'New Jersey',
].map((name) => ({ value: name, text: name }))

const state = ref<string | null>(null)
const currentNote = computed(() =>
  t('demos.combobox.longList.currentNote', { value: state.value ?? '—' }),
)
</script>

<template>
  <div class="flex flex-col gap-fluent-l max-w-xs">
    <FluereCombobox
      v-model="state"
      :items="STATES"
      :header="t('demos.combobox.longList.header')"
      :placeholder="t('demos.combobox.longList.placeholder')"
      :max-drop-down-height="200"
    />
    <p class="text-sm text-colorNeutralForeground3">
      {{ currentNote }}
    </p>
  </div>
</template>
