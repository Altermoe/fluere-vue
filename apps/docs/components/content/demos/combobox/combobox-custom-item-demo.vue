<script setup lang="ts">
import type { FluereComboboxItem } from '@fluere-vue/ui'
import { FluereCombobox } from '@fluere-vue/ui'
import { computed, ref } from 'vue'

const { t, tm } = useDocsI18n()

/** 自定义项：用 #item 插槽给每项加色块（对应 WinUI 的 ItemTemplate） */
const COLOR_VALUES = ['#0f6cbd', '#107c10', '#d13438', '#ffb900']
const colorTexts = computed(() => tm('demos.combobox.customItem.colors'))
const COLORS = computed<FluereComboboxItem<string>[]>(() =>
  COLOR_VALUES.map((value, index) => ({ value, text: colorTexts.value[index] ?? '' })),
)

const color = ref<string | null>('#0f6cbd')
const currentNote = computed(() =>
  t('demos.combobox.customItem.currentNote', { value: color.value ?? '—' }),
)
</script>

<template>
  <div class="flex flex-col gap-fluent-l max-w-xs">
    <FluereCombobox
      v-model="color"
      :items="COLORS"
      :header="t('demos.combobox.customItem.header')"
    >
      <template #item="{ item }">
        <span class="flex items-center gap-2">
          <span
            class="inline-block w-4 h-4 rounded-fluent-sm border border-colorNeutralStroke1"
            :style="{ backgroundColor: item.value }"
          />
          {{ item.text }}
        </span>
      </template>
    </FluereCombobox>
    <p class="text-sm text-colorNeutralForeground3">
      {{ currentNote }}
    </p>
  </div>
</template>
