<script setup lang="ts">
import { FluereInput } from '@fluere-vue/ui'
import { ref } from 'vue'

const { t } = useDocsI18n()

const displayName = ref('')
const email = ref('')
</script>

<template>
  <div class="flex max-w-sm flex-col gap-fluent-l">
    <FluereInput
      v-model="displayName"
      :header="t('demos.input.header.header')"
      :description="t('demos.input.header.description')"
    />
    <FluereInput
      v-model="email"
      type="email"
      :description="t('demos.input.header.emailDescription')"
    >
      <template #header
        >{{ t('demos.input.header.emailLabel') }}
        <span class="text-colorStatusDangerForeground1">*</span></template
      >
    </FluereInput>
    <p class="text-sm text-colorNeutralForeground3">
      {{ t('demos.input.header.noteLead') }} <code>aria-labelledby</code>
      {{ t('demos.input.header.noteMiddle') }} <code>aria-describedby</code
      >{{ t('demos.input.header.noteTail') }}
    </p>
  </div>
</template>
