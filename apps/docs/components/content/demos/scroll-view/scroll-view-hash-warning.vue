<script setup lang="ts">
/**
 * Scroll View 文档页顶部的一条警示条（FluereInfoBar，warning 档）：
 *
 * 本站正文区由 ScrollView 承载，而 ScrollView 的滚动偏移用 CSS transform 表达、
 * presenter 是 `overflow: clip`（**不是原生滚动容器**）——因此原生 hash 锚点
 * （URL `#…`）不会触发滚动（`scrollTop` 恒为 0）。该缺陷目前**暂不修复**，
 * 已在 nuxt.config.ts 把正文 h2 标题的锚点链接关闭（渲染为普通文本），
 * 这里用 InfoBar 向读者显式标出这一现状。
 *
 * 文案走 i18n（`demos.scroll-view.hashWarning.*`），随当前语种切换。
 */
import { FluereInfoBar } from '@fluere-vue/ui'

const { t } = useDocsI18n()
</script>

<template>
  <div class="my-fluent-xl">
    <FluereInfoBar
      open
      severity="warning"
      :title="t('demos.scroll-view.hashWarning.title')"
      :message="t('demos.scroll-view.hashWarning.message')"
    />
  </div>
</template>
