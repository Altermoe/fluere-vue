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
</script>

<template>
  <div class="flex flex-col gap-fluent-l">
    <FluereInfoBar
      open
      title="自定义图标"
      message="InfoBar 的 IconSource 换成云盘上传图标，Severity 仍决定底色。"
    >
      <template #icon>
        <FluentIconCloudArrowUp20Regular :size="16" />
      </template>
    </FluereInfoBar>

    <FluereInfoBar
      open
      severity="success"
      title="自定义图标 + 自定底色"
      message="图标随 Severity 一起换，但图标本身完全由消费方提供。"
    >
      <template #icon>
        <FluentIconShieldCheckmark20Regular :size="16" />
      </template>
    </FluereInfoBar>

    <FluereInfoBar
      open
      title="自定义图标但关闭图标显示"
      message="is-icon-visible=false 时自定义图标同样不渲染（对齐 NoIconVisible 分支）。"
      :is-icon-visible="false"
    >
      <template #icon>
        <FluentIconCloudArrowUp20Regular :size="16" />
      </template>
    </FluereInfoBar>
  </div>
</template>
