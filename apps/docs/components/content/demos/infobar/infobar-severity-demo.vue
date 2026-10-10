<script setup lang="ts">
import { FluereInfoBar } from '@fluere-vue/ui'

const { t } = useDocsI18n()

/** 对齐 Gallery 示例 1：四档 Severity 并排对照 */
</script>

<template>
  <div class="flex flex-col gap-fluent-l">
    <FluereInfoBar
      open
      title="Title"
      severity="informational"
      message="Essential app message for your users to be informed of, acknowledge, or take action on."
      :close-button-label="t('demos.common.close')"
      :close-button-tooltip="t('demos.common.close')"
    />
    <FluereInfoBar
      open
      title="Title"
      severity="success"
      message="Essential app message for your users to be informed of, acknowledge, or take action on."
      :close-button-label="t('demos.common.close')"
      :close-button-tooltip="t('demos.common.close')"
    />
    <FluereInfoBar
      open
      title="Title"
      severity="warning"
      message="Essential app message for your users to be informed of, acknowledge, or take action on."
      :close-button-label="t('demos.common.close')"
      :close-button-tooltip="t('demos.common.close')"
    />
    <FluereInfoBar
      open
      title="Title"
      severity="error"
      message="Essential app message for your users to be informed of, acknowledge, or take action on."
      :close-button-label="t('demos.common.close')"
      :close-button-tooltip="t('demos.common.close')"
    />
  </div>
</template>
