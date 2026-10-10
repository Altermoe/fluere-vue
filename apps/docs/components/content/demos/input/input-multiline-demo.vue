<script setup lang="ts">
import { FluereInput } from '@fluere-vue/ui'
import { ref } from 'vue'

const { t } = useDocsI18n()

const note = ref('')
const feedback = ref(t('demos.input.multiline.feedbackSeed'))
</script>

<template>
  <div class="flex max-w-md flex-col gap-fluent-l">
    <FluereInput
      v-model="note"
      multiline
      :header="t('demos.input.multiline.header')"
      :description="t('demos.input.multiline.description')"
      :placeholder="t('demos.input.multiline.placeholder')"
    />
    <FluereInput
      v-model="feedback"
      multiline
      :rows="6"
      :header="t('demos.input.multiline.feedbackHeader')"
      description="rows=6"
    />
  </div>
</template>
