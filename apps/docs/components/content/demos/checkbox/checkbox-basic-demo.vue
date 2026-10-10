<script setup lang="ts">
import { FluereCheckbox } from '@fluere-vue/ui'
import { ref } from 'vue'

const { t } = useDocsI18n()

const agree = ref(false)
const subscribe = ref(true)
</script>

<template>
  <div class="flex flex-col gap-fluent-l max-w-sm">
    <FluereCheckbox v-model="agree">{{ t('demos.checkbox.basic.agreeLabel') }}</FluereCheckbox>
    <FluereCheckbox v-model="subscribe">{{
      t('demos.checkbox.basic.subscribeLabel')
    }}</FluereCheckbox>
    <p class="text-sm text-colorNeutralForeground3">
      {{ t('demos.checkbox.basic.statusLine', { agree, subscribe }) }}
    </p>
  </div>
</template>
