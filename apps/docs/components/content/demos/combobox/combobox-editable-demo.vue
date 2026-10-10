<script setup lang="ts">
import type { FluereComboboxItem, FluereComboboxTextSubmittedEventArgs } from '@fluere-vue/ui'
import { FluereCombobox } from '@fluere-vue/ui'
import { computed, ref } from 'vue'

const { t } = useDocsI18n()

/** 最近使用过的名称：可编辑态下用户也能输入列表外的值 */
const RECENT_NAMES: FluereComboboxItem<string>[] = [
  { value: 'Fluere', text: 'Fluere' },
  { value: 'WinUI', text: 'WinUI' },
  { value: 'Fluent 2', text: 'Fluent 2' },
]

const name = ref<string | null>('WinUI')
const log = ref('')
const selectedNote = computed(() =>
  t('demos.combobox.editable.selectedNote', { value: name.value ?? '—' }),
)

const onTextSubmitted = (args: FluereComboboxTextSubmittedEventArgs): void => {
  log.value = t('demos.combobox.editable.submitNote', { text: args.text })
}
</script>

<template>
  <div class="flex flex-col gap-fluent-l max-w-xs">
    <FluereCombobox
      v-model="name"
      :items="RECENT_NAMES"
      editable
      :header="t('demos.combobox.editable.header')"
      :placeholder="t('demos.combobox.editable.placeholder')"
      @text-submitted="onTextSubmitted"
    />
    <p class="text-sm text-colorNeutralForeground3">
      {{ selectedNote }}
    </p>
    <p
      v-if="log"
      class="text-sm text-colorNeutralForeground3"
    >
      {{ log }}
    </p>
  </div>
</template>
