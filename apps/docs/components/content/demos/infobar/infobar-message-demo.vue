<script setup lang="ts">
import { FluereInfoBar } from '@fluere-vue/ui'

const { t } = useDocsI18n()

/**
 * 对齐 Gallery 示例 2：长短消息 + Action Button / Hyperlink。
 *
 * 注意竖排间距来自 WinUI 的三个 VerticalOrientationMargin（Title 14 / Message 4 /
 * Action 12），Action 既可以是 Button 也可以是 Hyperlink —— Web 侧都是一段普通内容。
 */
const longMessage =
  'A long essential app message for your users to be informed of, acknowledge, or take action on. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin dapibus dolor vitae justo rutrum, ut lobortis nibh mattis. Aenean id elit commodo, semper felis nec.'
</script>

<template>
  <div class="flex flex-col gap-fluent-l">
    <FluereInfoBar
      open
      title="Title"
      message="Essential app message for your users to be informed of, acknowledge, or take action on."
      :close-button-label="t('demos.common.close')"
    />
    <FluereInfoBar
      open
      title="Title"
      :message="longMessage"
      :close-button-label="t('demos.common.close')"
    >
      <template #action>
        <button
          type="button"
          class="fui-infobar-demo-action"
        >
          Action
        </button>
      </template>
    </FluereInfoBar>
    <FluereInfoBar
      open
      title="Title"
      :message="t('demos.infobar.message.hyperlinkMessage')"
      :close-button-label="t('demos.common.close')"
    >
      <template #action>
        <a
          class="fui-infobar-demo-link"
          href="#infobar"
          >{{ t('demos.infobar.message.learnMoreLabel') }}</a
        >
      </template>
    </FluereInfoBar>
  </div>
</template>

<style scoped>
/* 页面级示例样式（不属于组件本体）：模拟 WinUI 的 ActionButton / HyperlinkButton */
.fui-infobar-demo-action {
  min-width: 96px; /* InfoBarActionButtonMinWidth（已废弃的资源，仍与实机一致） */
  min-height: 24px;
  padding: 0 8px 1px;
  border: 1px solid var(--colorNeutralStroke1);
  border-radius: var(--borderRadiusSmall);
  background-color: var(--colorNeutralBackground1);
  color: var(--colorNeutralForeground1);
  font-family: var(--fontFamilyBase);
  font-size: var(--fontSizeBase400);
  cursor: pointer;
}
.fui-infobar-demo-link {
  color: var(--colorBrandForegroundLink);
  font-size: var(--fontSizeBase400);
  text-decoration: none;
}
</style>
