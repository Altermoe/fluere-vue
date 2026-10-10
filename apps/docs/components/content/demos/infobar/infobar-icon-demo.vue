<script setup lang="ts">
import {
  FluentIconCloudArrowUp20Regular,
  FluentIconShieldCheckmark20Regular,
} from '@fluere-vue/icons'
/**
 * `#icon` 插槽对应 WinUI 的 `IconSource`（`InfoBarTemplateSettings.IconElement`）。
 * 提供插槽时组件走 `UserIconVisible` 分支：图标被放在一个 `MaxWidth/MaxHeight = 16`
 * 的 `Viewbox` 里等比缩放（`AspectRatio` 默认 `Uniform`），所以 20px 图标会被压到 16px。
 *
 * WinUI 的 `IsIconVisible=false` 会连自定义图标一起藏起来，本组件同口径。
 */
import { FluereInfoBar } from '@fluere-vue/ui'

const { t } = useDocsI18n()
</script>

<template>
  <div class="flex flex-col gap-fluent-l">
    <FluereInfoBar
      open
      :title="t('demos.infobar.icon.uploadTitle')"
      :message="t('demos.infobar.icon.uploadMessage')"
    >
      <template #icon>
        <FluentIconCloudArrowUp20Regular :size="16" />
      </template>
    </FluereInfoBar>

    <FluereInfoBar
      open
      severity="success"
      :title="t('demos.infobar.icon.severityTitle')"
      :message="t('demos.infobar.icon.severityMessage')"
    >
      <template #icon>
        <FluentIconShieldCheckmark20Regular :size="16" />
      </template>
    </FluereInfoBar>

    <FluereInfoBar
      open
      :title="t('demos.infobar.icon.hiddenTitle')"
      :message="t('demos.infobar.icon.hiddenMessage')"
      :is-icon-visible="false"
    >
      <template #icon>
        <FluentIconCloudArrowUp20Regular :size="16" />
      </template>
    </FluereInfoBar>
  </div>
</template>
