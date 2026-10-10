<script setup lang="ts">
import { FluereProgressRing } from '@fluere-vue/ui'

const { t } = useDocsI18n()
</script>

<template>
  <div class="flex items-end gap-fluent-xl">
    <div class="flex flex-col items-center gap-fluent-s">
      <FluereProgressRing
        size="small"
        :label="t('demos.progress-ring.size.labelSmall')"
      />
      <span class="text-xs text-colorNeutralForeground3">small 16</span>
    </div>
    <div class="flex flex-col items-center gap-fluent-s">
      <FluereProgressRing :label="t('demos.progress-ring.size.labelMedium')" />
      <span class="text-xs text-colorNeutralForeground3">{{
        t('demos.progress-ring.size.noteMedium')
      }}</span>
    </div>
    <div class="flex flex-col items-center gap-fluent-s">
      <FluereProgressRing
        size="large"
        :label="t('demos.progress-ring.size.labelLarge')"
      />
      <span class="text-xs text-colorNeutralForeground3">large 48</span>
    </div>
  </div>
</template>
