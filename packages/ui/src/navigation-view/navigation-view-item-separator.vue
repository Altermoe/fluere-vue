<script lang="ts">
 /**
 * FluereNavigationViewItemSeparator —— **数据型子组件**（不挂载，见 `collection.ts`）。
 *
 * 对位 WinUI `NavigationViewItemSeparator`（`NavigationView.idl:375-380`）。上游模板
 * （`NavigationView.xaml:572-605`）是一条 1px 高的 `Rectangle`，颜色
 * `NavigationViewItemSeparatorForeground` ← `DividerStrokeColorDefaultBrush`；
 * 边距 `NavigationViewItemSeparatorMargin = 0,3,0,4`（`themeresources:247`）。
 *
 * 上游源码行为（`NavigationViewItemSeparator.cpp`）：左侧面板恒用 `HorizontalLine`
 * （紧凑时 `HorizontalLineCompact`，两者边距同值）、顶部导航用 `VerticalLine`；
 * 缩进同 header（`Depth() * c_itemIndentation`）。本库只做左侧，因此只有水平线一态。
 */
</script>

<script setup lang="ts">
import { onMounted } from 'vue'

defineOptions({ name: 'FluereNavigationViewItemSeparator' })

onMounted(() => {
  if (import.meta.env.DEV) {
    // oxlint-disable-next-line no-console
    console.warn(
      '[FluereNavigationViewItemSeparator] 本组件必须作为 <FluereNavigationView> 的直接子元素' +
        '（可包在 v-for / <template> 里）；当前写法下它被单独挂载了，不会被收集成分隔线。',
    )
  }
})
</script>

<template>
  <!-- 占位：正常情况下父组件只读 vnode、不会渲染到这里 -->
</template>
