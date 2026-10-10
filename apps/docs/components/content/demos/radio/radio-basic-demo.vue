<script setup lang="ts">
import { FluereRadioButton, FluereRadioGroup } from '@fluere-vue/ui'
import { computed, ref } from 'vue'

const { t, tm } = useDocsI18n()

const color = ref('red')

/** 三个颜色选项的可见文案（数组叶子：demos.radio.basic.items） */
const colorTexts = computed(() => tm('demos.radio.basic.items'))
</script>

<template>
  <div class="flex flex-col gap-fluent-l max-w-sm">
    <FluereRadioGroup v-model="color">
      <FluereRadioButton value="red">{{ colorTexts[0] }}</FluereRadioButton>
      <FluereRadioButton value="teal">{{ colorTexts[1] }}</FluereRadioButton>
      <FluereRadioButton value="blue">{{ colorTexts[2] }}</FluereRadioButton>
    </FluereRadioGroup>
    <p class="text-sm text-colorNeutralForeground3">
      {{ t('demos.radio.basic.currentLabel', { color }) }}
    </p>
  </div>
</template>
