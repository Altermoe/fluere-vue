<script setup lang="ts">
import { FluereNumberBox } from '@fluere-vue/ui'
import { ref } from 'vue'

const { t } = useDocsI18n()

/** 演示用的初始值 */
const INITIAL_TOTAL = 0
const INITIAL_BUDGET = 1000
const INITIAL_TAX_RATE = 0.06

const total = ref<number | null>(INITIAL_TOTAL)
const budget = ref<number | null>(INITIAL_BUDGET)
const taxRate = ref<number | null>(INITIAL_TAX_RATE)
</script>

<template>
  <div class="flex flex-col gap-fluent-l max-w-sm">
    <FluereNumberBox
      v-model="total"
      accepts-expression
      :placeholder="t('demos.number-box.expression.placeholder')"
      :header="t('demos.number-box.expression.headerResult')"
    />
    <FluereNumberBox
      v-model="budget"
      :min="0"
      :max="5000"
      accepts-expression
      :header="t('demos.number-box.expression.headerBudget')"
    />
    <FluereNumberBox
      v-model="taxRate"
      :min="0"
      :max="1"
      :step="0.01"
      accepts-expression
      :header="t('demos.number-box.expression.headerTaxRate')"
      :description="t('demos.number-box.expression.description')"
    />
    <p class="text-sm text-colorNeutralForeground3">
      {{
        t('demos.number-box.expression.note', {
          total: total ?? '—',
          budget: budget ?? '—',
          taxRate: taxRate ?? '—',
        })
      }}
    </p>
  </div>
</template>
