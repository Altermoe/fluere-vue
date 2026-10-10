<script setup lang="ts">
import { FluereNumberBox } from '@fluere-vue/ui'

const { t } = useDocsI18n()
</script>

<template>
  <div class="flex flex-col gap-fluent-l max-w-sm">
    <FluereNumberBox
      :model-value="35"
      :min="0"
      :max="100"
      disabled
      spin-button-placement-mode="inline"
      :header="t('demos.number-box.disabled.headerSpin')"
    />
    <FluereNumberBox
      :model-value="null"
      disabled
      :header="t('demos.number-box.disabled.headerEmpty')"
      :placeholder="t('demos.number-box.disabled.placeholder')"
    />
    <p class="text-sm text-colorNeutralForeground3">
      {{ t('demos.number-box.disabled.note') }}
    </p>
  </div>
</template>
