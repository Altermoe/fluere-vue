<script setup lang="ts">
import { FluentIconCloudArrowUp24Regular } from '@fluere-vue/icons'
import { FluereAppWindow } from '@fluere-vue/ui'

/**
 * 基础形态：标题 / 副标题 / 图标三件套走 WinUI `TitleBar` 的属性位，
 * 应用内容交给 `#content` 插槽（本组件只控制可视区域，不接管滚动）。
 *
 * 尺寸由消费方给（这里用 UnoCSS 工具类）：组件不写 `position` / `inset`，
 * 位置与尺寸完全外部控制。
 */
const { t } = useDocsI18n()
</script>

<template>
  <div class="flex justify-center py-fluent-s">
    <FluereAppWindow
      class="h-[300px] w-full max-w-[560px]"
      :title="t('demos.app-window.basic.title')"
      :subtitle="t('demos.app-window.basic.subtitle')"
    >
      <template #icon>
        <FluentIconCloudArrowUp24Regular :size="16" />
      </template>
      <template #content>
        <div class="p-fluent-xxl text-sm text-colorNeutralForeground2">
          {{ t('demos.app-window.basic.body') }}
        </div>
      </template>
    </FluereAppWindow>
  </div>
</template>
