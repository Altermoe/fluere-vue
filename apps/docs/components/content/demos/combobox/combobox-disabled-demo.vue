<script setup lang="ts">
import type { FluereComboboxItem } from '@fluere-vue/ui'
import { FluereCombobox } from '@fluere-vue/ui'
import { computed, ref } from 'vue'

const { t, tm } = useDocsI18n()

/** 含不可选项的列表：不可选项不参与方向键选区与文本搜索 */
const PLAN_VALUES: { value: string; disabled?: boolean }[] = [
  { value: 'free' },
  { value: 'pro' },
  { value: 'team', disabled: true },
  { value: 'enterprise' },
]
const planTexts = computed(() => tm('demos.combobox.disabled.plans'))
const PLANS = computed<FluereComboboxItem<string>[]>(() =>
  PLAN_VALUES.map((item, index) => ({ ...item, text: planTexts.value[index] ?? '' })),
)

const plan = ref<string | null>('pro')
const locked = ref<string | null>('team')
</script>

<template>
  <div class="flex flex-col gap-fluent-l max-w-xs">
    <FluereCombobox
      v-model="plan"
      :items="PLANS"
      :header="t('demos.combobox.disabled.enabledHeader')"
    />
    <FluereCombobox
      v-model="locked"
      :items="PLANS"
      disabled
      :header="t('demos.combobox.disabled.disabledHeader')"
    />
  </div>
</template>
