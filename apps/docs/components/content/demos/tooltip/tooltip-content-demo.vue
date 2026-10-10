<script setup lang="ts">
import { FluereButton, FluereTooltip } from '@fluere-vue/ui'
import { computed } from 'vue'

const { t } = useDocsI18n()

/** 长文本提示：WinUI Gallery 的英文样例句保持英文，换行说明走 i18n */
const longText = computed(() => t('demos.tooltip.content.longText'))
</script>

<template>
  <div class="flex flex-wrap items-center gap-fluent-l">
    <FluereTooltip content="Simple ToolTip">
      <FluereButton>{{ t('demos.tooltip.content.plainTextLabel') }}</FluereButton>
    </FluereTooltip>

    <FluereTooltip :content="longText">
      <FluereButton>{{ t('demos.tooltip.content.wrapLabel') }}</FluereButton>
    </FluereTooltip>

    <FluereTooltip>
      <FluereButton>{{ t('demos.tooltip.content.richContentLabel') }}</FluereButton>
      <template #content>
        <span class="flex items-center gap-2">
          <strong>{{ t('demos.tooltip.content.saveLabel') }}</strong>
          <span>Ctrl + S</span>
        </span>
      </template>
    </FluereTooltip>
  </div>
</template>
