<script lang="ts">
/**
 * FluereNavigationViewItemHeader —— **数据型子组件**（不挂载，见 `collection.ts`）。
 *
 * 对位 WinUI `NavigationViewItemHeader`（`NavigationView.idl:384-387`）。上游模板
 * （`NavigationView.xaml:503-571`）只有一层 `InnerHeaderGrid`（高 40）+ 一个
 * `TextBlock`（`NavigationViewItemHeaderTextStyle`：字号 14 / SemiBold / 不换行，`:1081-1086`）。
 *
 * 上游源码里它的行为只有两条（`NavigationViewItemHeader.cpp`）：
 *  1. **面板紧凑且自身是顶层项时把文字折叠**（`HeaderTextCollapsed`，高 0 + `Visibility=Collapsed`）
 *     —— 判据 `m_isClosedCompact && IsTopLevelItem()`（`:61-69`）；
 *  2. 缩进 `Depth() * c_itemIndentation`（31px，`:76-84`）。
 *
 * 本库把这两条搬进 `navigation-view.vue`（父组件持有整棵树，知道 compact 与深度）。
 */
export type { FluereNavigationViewItemHeaderProps } from './types'
</script>

<script setup lang="ts">
import { onMounted } from 'vue'
import type { FluereNavigationViewItemHeaderProps } from './types'

defineOptions({ name: 'FluereNavigationViewItemHeader' })

withDefaults(defineProps<FluereNavigationViewItemHeaderProps>(), {
  content: '',
})

onMounted(() => {
  if (import.meta.env.DEV) {
    // oxlint-disable-next-line no-console
    console.warn(
      '[FluereNavigationViewItemHeader] 本组件必须作为 <FluereNavigationView> 的直接子元素' +
        '（可包在 v-for / <template> 里）；当前写法下它被单独挂载了，不会被收集成分组标题。',
    )
  }
})
</script>

<template>
  <!-- 占位：正常情况下父组件只读 vnode、不会渲染到这里 -->
</template>
