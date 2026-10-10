<script setup lang="ts">
import { FluereProgressRing } from '@fluere-vue/ui'

const { t } = useDocsI18n()
</script>

<template>
  <div class="flex items-center gap-fluent-xl">
    <FluereProgressRing
      disabled
      :label="t('demos.progress-ring.disabled.labelIndeterminate')"
    />
    <FluereProgressRing
      disabled
      :indeterminate="false"
      :model-value="60"
      :label="t('demos.progress-ring.disabled.labelDeterminate')"
    />
  </div>
</template>
