<script setup lang="ts">
import { FluereButton, FluereTooltip, FluereTooltipProvider } from '@fluere-vue/ui'

const { t } = useDocsI18n()
</script>

<template>
  <!-- Provider 对应 WinUI 的 ToolTipService：一组 ToolTip 共享同一个 InitialShowDelay
       与 BetweenShowDelay，鼠标在相邻控件之间快速移动时会跳过延时 -->
  <FluereTooltipProvider
    :delay-duration="400"
    :skip-delay-duration="200"
  >
    <div class="flex flex-wrap items-center gap-fluent-l">
      <FluereTooltip content="Simple ToolTip">
        <FluereButton>{{ t('demos.tooltip.delay.defaultDelayLabel') }}</FluereButton>
      </FluereTooltip>
      <FluereTooltip
        :content="t('demos.tooltip.delay.instantContent')"
        :delay-duration="0"
      >
        <FluereButton>delayDuration = 0</FluereButton>
      </FluereTooltip>
    </div>
  </FluereTooltipProvider>
</template>
