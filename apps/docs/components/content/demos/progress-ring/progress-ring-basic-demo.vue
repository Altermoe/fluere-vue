<script setup lang="ts">
import { FluereProgressRing } from '@fluere-vue/ui'

const { t } = useDocsI18n()
</script>

<template>
  <div class="flex items-center gap-fluent-m">
    <FluereProgressRing :label="t('demos.progress-ring.basic.label')" />
    <span class="text-sm text-colorNeutralForeground2">{{
      t('demos.progress-ring.basic.note')
    }}</span>
  </div>
</template>
