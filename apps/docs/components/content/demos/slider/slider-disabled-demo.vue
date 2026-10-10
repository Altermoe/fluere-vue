<script setup lang="ts">
import { FluereSlider } from '@fluere-vue/ui'

const { t } = useDocsI18n()
</script>

<template>
  <div class="flex flex-col gap-fluent-l max-w-sm">
    <FluereSlider
      :model-value="35"
      disabled
      :header="t('demos.slider.disabled.headerInteractiveOff')"
    />
    <FluereSlider
      :model-value="0"
      disabled
      :header="t('demos.slider.disabled.headerMin')"
    />
    <FluereSlider
      :model-value="100"
      disabled
      :header="t('demos.slider.disabled.headerMax')"
    />
    <p class="text-sm text-colorNeutralForeground3">
      {{ t('demos.slider.disabled.note') }}
    </p>
  </div>
</template>
