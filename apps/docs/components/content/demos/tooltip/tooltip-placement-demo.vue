<script setup lang="ts">
import { FluereButton, FluereTooltip } from '@fluere-vue/ui'

const { t } = useDocsI18n()
</script>

<template>
  <div class="flex flex-wrap items-center gap-fluent-l">
    <FluereTooltip
      :content="t('demos.tooltip.placement.topContent')"
      placement="top"
    >
      <FluereButton>Top</FluereButton>
    </FluereTooltip>
    <FluereTooltip
      content="Placement = Bottom"
      placement="bottom"
    >
      <FluereButton>Bottom</FluereButton>
    </FluereTooltip>
    <FluereTooltip
      content="Placement = Left"
      placement="left"
    >
      <FluereButton>Left</FluereButton>
    </FluereTooltip>
    <FluereTooltip
      content="Placement = Right"
      placement="right"
    >
      <FluereButton>Right</FluereButton>
    </FluereTooltip>
  </div>
</template>
