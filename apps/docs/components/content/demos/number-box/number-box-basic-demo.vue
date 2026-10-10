<script setup lang="ts">
import { FluereNumberBox } from '@fluere-vue/ui'
import { ref } from 'vue'

const { t } = useDocsI18n()

/** 演示用的初始值（集中命名，避免散落的字面量） */
const INITIAL_QUANTITY = 12
const INITIAL_PRICE = 199.9

const quantity = ref<number | null>(INITIAL_QUANTITY)
const price = ref<number | null>(INITIAL_PRICE)
</script>

<template>
  <div class="flex flex-col gap-fluent-l max-w-sm">
    <FluereNumberBox
      v-model="quantity"
      :header="t('demos.number-box.basic.headerQuantity')"
    />
    <FluereNumberBox
      v-model="price"
      :header="t('demos.number-box.basic.headerPrice')"
      :description="t('demos.number-box.basic.description')"
    />
    <p class="text-sm text-colorNeutralForeground3">
      {{ t('demos.number-box.basic.note', { quantity: quantity ?? '—', price: price ?? '—' }) }}
    </p>
  </div>
</template>
