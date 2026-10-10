<script setup lang="ts">
import { FluereCheckbox } from '@fluere-vue/ui'

const { t } = useDocsI18n()
</script>

<template>
  <div class="flex flex-col gap-fluent-l max-w-sm">
    <FluereCheckbox disabled>{{ t('demos.checkbox.disabled.uncheckedLabel') }}</FluereCheckbox>
    <FluereCheckbox
      disabled
      :model-value="true"
    >
      {{ t('demos.checkbox.disabled.checkedLabel') }}
    </FluereCheckbox>
    <FluereCheckbox
      disabled
      :model-value="'indeterminate'"
    >
      {{ t('demos.checkbox.disabled.indeterminateLabel') }}
    </FluereCheckbox>
  </div>
</template>
