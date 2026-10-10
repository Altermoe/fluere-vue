<script setup lang="ts">
import { FluereButton, FluereTooltip } from '@fluere-vue/ui'

const { t } = useDocsI18n()
</script>

<template>
  <div class="flex flex-wrap items-center gap-fluent-l">
    <FluereTooltip :content="t('demos.tooltip.disabled.showContent')">
      <FluereButton>{{ t('demos.tooltip.disabled.enabledLabel') }}</FluereButton>
    </FluereTooltip>
    <FluereTooltip
      :content="t('demos.tooltip.disabled.hideContent')"
      disabled
    >
      <FluereButton>disabled</FluereButton>
    </FluereTooltip>
  </div>
</template>
