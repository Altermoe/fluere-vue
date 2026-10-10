<script setup lang="ts">
import { FluereInfoBar } from '@fluere-vue/ui'
import { ref } from 'vue'

const { t } = useDocsI18n()

/**
 * `#content` 对应 WinUI 的 `InfoBar.Content`：它落在模板的第 2 行。
 *
 * 当 Title / Message / Action 全为空时（`NoBannerContent` 状态），内容区会上移到
 * 第 0 行 —— 用下面的复选框对比两种排布。
 */
const withBanner = ref(false)
const progress = ref(40)
</script>

<template>
  <div class="flex flex-col gap-fluent-l">
    <label class="fui-infobar-demo-option">
      <input
        v-model="withBanner"
        type="checkbox"
      />
      {{ t('demos.infobar.content.withBannerLabel') }}
    </label>

    <FluereInfoBar
      open
      :title="withBanner ? t('demos.infobar.content.syncTitle') : ''"
      :message="withBanner ? t('demos.infobar.content.syncMessage') : ''"
    >
      <template #content>
        <div class="fui-infobar-demo-content">
          <span>{{ t('demos.infobar.content.syncedLabel', { progress }) }}</span>
          <input
            v-model.number="progress"
            type="range"
            min="0"
            max="100"
          />
        </div>
      </template>
    </FluereInfoBar>
  </div>
</template>

<style scoped>
.fui-infobar-demo-option {
  display: flex;
  gap: var(--spacingHorizontalXS);
  align-items: center;
  font-family: var(--fontFamilyBase);
  font-size: var(--fontSizeBase300);
  color: var(--colorNeutralForeground1);
}
.fui-infobar-demo-content {
  display: flex;
  gap: var(--spacingHorizontalS);
  align-items: center;
  padding-block: var(--spacingVerticalS);
  font-family: var(--fontFamilyBase);
  font-size: var(--fontSizeBase300);
  color: var(--colorNeutralForeground1);
}
</style>
