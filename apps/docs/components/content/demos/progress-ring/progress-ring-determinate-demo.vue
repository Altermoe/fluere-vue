<script setup lang="ts">
import { FluereProgressRing, FluereSlider } from '@fluere-vue/ui'
import { ref } from 'vue'

const { t } = useDocsI18n()

const value = ref(40)
</script>

<template>
  <div class="flex flex-col gap-fluent-l max-w-sm">
    <div class="flex items-center gap-fluent-m">
      <FluereProgressRing
        :model-value="value"
        :indeterminate="false"
        :label="t('demos.progress-ring.determinate.label')"
      />
      <span class="text-sm text-colorNeutralForeground2"> {{ Math.round(value) }}% </span>
    </div>
    <FluereSlider
      v-model="value"
      :min="0"
      :max="100"
      :header="t('demos.progress-ring.determinate.header')"
    />
  </div>
</template>
