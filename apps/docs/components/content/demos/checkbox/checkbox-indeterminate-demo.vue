<script setup lang="ts">
import { FluereCheckbox } from '@fluere-vue/ui'
import { computed, ref } from 'vue'

const { t, tm } = useDocsI18n()

const optionA = ref(true)
const optionB = ref(true)
const optionC = ref(false)
const optionValues = computed(() => [optionA.value, optionB.value, optionC.value])

/** 三个子选项的可见文案（数组叶子：demos.checkbox.indeterminate.items） */
const optionTexts = computed(() => tm('demos.checkbox.indeterminate.items'))

const allState = computed<boolean | 'indeterminate'>(() => {
  if (optionValues.value.every(Boolean)) {
    return true
  }
  if (optionValues.value.some(Boolean)) {
    return 'indeterminate'
  }
  return false
})

const toggleAll = (value: boolean | 'indeterminate') => {
  const next = Boolean(value)
  optionA.value = next
  optionB.value = next
  optionC.value = next
}
</script>

<template>
  <div class="flex flex-col gap-fluent-l max-w-sm">
    <FluereCheckbox
      :model-value="allState"
      @update:model-value="toggleAll"
    >
      {{ t('demos.checkbox.indeterminate.selectAllLabel') }}
    </FluereCheckbox>
    <div class="ml-fluent-l flex flex-col gap-fluent-s">
      <FluereCheckbox v-model="optionA">{{ optionTexts[0] }}</FluereCheckbox>
      <FluereCheckbox v-model="optionB">{{ optionTexts[1] }}</FluereCheckbox>
      <FluereCheckbox v-model="optionC">{{ optionTexts[2] }}</FluereCheckbox>
    </div>
  </div>
</template>
