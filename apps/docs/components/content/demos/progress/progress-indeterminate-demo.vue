<script setup lang="ts">
import { FluereProgressBar } from '@fluere-vue/ui'

const { t } = useDocsI18n()
</script>

<template>
  <div class="flex flex-col gap-fluent-m">
    <FluereProgressBar
      indeterminate
      :label="t('demos.progress.indeterminate.label')"
      class="w-[130px]"
    />
    <span class="text-sm text-colorNeutralForeground2">{{
      t('demos.progress.indeterminate.note')
    }}</span>
  </div>
</template>
