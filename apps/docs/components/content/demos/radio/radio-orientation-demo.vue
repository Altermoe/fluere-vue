<script setup lang="ts">
import { FluereRadioButton, FluereRadioGroup } from '@fluere-vue/ui'
import { computed, ref } from 'vue'

const { t, tm } = useDocsI18n()

const align = ref('left')

/** 三个对齐选项的可见文案（数组叶子：demos.radio.orientation.items） */
const alignTexts = computed(() => tm('demos.radio.orientation.items'))
</script>

<template>
  <div class="flex flex-col gap-fluent-l max-w-md">
    <FluereRadioGroup
      v-model="align"
      orientation="horizontal"
      class="flex-wrap"
    >
      <FluereRadioButton value="left">{{ alignTexts[0] }}</FluereRadioButton>
      <FluereRadioButton value="center">{{ alignTexts[1] }}</FluereRadioButton>
      <FluereRadioButton value="right">{{ alignTexts[2] }}</FluereRadioButton>
    </FluereRadioGroup>
    <p class="text-sm text-colorNeutralForeground3">
      {{ t('demos.radio.orientation.alignLabel', { align }) }}
    </p>
  </div>
</template>
