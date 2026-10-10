<script setup lang="ts">
import { FluereInput } from '@fluere-vue/ui'

const { t } = useDocsI18n()
</script>

<template>
  <div class="flex flex-col gap-fluent-l max-w-sm">
    <FluereInput
      invalid
      :placeholder="t('demos.input.invalid.placeholder')"
      aria-describedby="input-error-hint"
    />
    <p
      id="input-error-hint"
      class="text-sm text-colorStatusDangerForeground1"
    >
      {{ t('demos.input.invalid.errorHint') }}
    </p>
  </div>
</template>
