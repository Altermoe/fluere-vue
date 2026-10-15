<script lang="ts">
/**
 * FluereNavigationViewItem —— **数据型子组件**（不会把自己渲染到 DOM 里）。
 *
 * 与 `FluereTabViewItem` 同族设计，理由见 `collection.ts` 文件头：
 * `FluereNavigationView` 在渲染期读取子项 vnode 的 props / slots，把整棵导航树收成
 * 数据描述，再由父组件负责把每一行渲染进 `role="navigation"` 的列表里。
 *
 * 为什么不做成「会挂载的普通组件」：
 *  1. `isChildSelected`（祖先链上有选中项）必须**沿 IndexPath 逐层回写**
 *     （WinUI `NavigationView.cpp:2509-2547`）。若子项自己挂载，父组件第一次渲染时拿不到
 *     子项注册表，SSR 直出会缺整条面板、客户端水合后再补 ⇒ 闪 + 水合不一致。
 *  2. 折叠面板时父组件要**强制折叠**顶层项并记忆状态（`HandleExpansionStateMemory`，
 *     `NavigationViewItem.cpp:269-285`），这需要父组件持有整棵树。
 *
 * 因此：
 *  · 组件**不会挂载**（父组件从不渲染这些 vnode），`setup()` 里没有任何逻辑；
 *  · 若它真的挂载了，说明写法不受支持（被包在别的组件 / 原生元素里，或脱离了
 *    `FluereNavigationView`），`onMounted` 里给一条开发期警告；
 *  · 子项插槽**不支持作用域参数**（`#children="{ … }"` 拿不到值）——父组件调用插槽函数时
 *    不传参；需要作用域数据请用 `v-for` 在消费方自己的模板里展开。
 *
 * Props 语义与默认值逐条对齐 WinUI `NavigationViewItem`（`NavigationView.idl:321-373` +
 * `Generated/NavigationViewItem.properties.cpp`）：`Content` / `SelectsOnInvoked`（默认 true）/
 * `IsExpanded`（默认 false）/ `HasUnrealizedChildren`（默认 false）/ `IsChildSelected`（默认 false）。
 */
export type { FluereNavigationViewItemProps } from './types'
</script>

<script setup lang="ts">
import { onMounted } from 'vue'
import type { FluereNavigationViewItemProps } from './types'

defineOptions({ name: 'FluereNavigationViewItem' })

// 默认值与 `collection.ts` 里的读取口径必须保持一致（那边手工兜底，因为本组件不挂载）
withDefaults(defineProps<FluereNavigationViewItemProps>(), {
  content: '',
  selectsOnInvoked: true,
  isExpanded: undefined,
  defaultIsExpanded: false,
  hasUnrealizedChildren: false,
  ariaLabel: undefined,
  disabled: false,
  isChildSelected: undefined,
})

onMounted(() => {
  if (import.meta.env.DEV) {
    // oxlint-disable-next-line no-console
    console.warn(
      '[FluereNavigationViewItem] 本组件必须作为 <FluereNavigationView> 的**直接子元素**' +
        '（可包在 v-for / <template> 里；下级项放进它的 #children 插槽）；' +
        '当前写法下它被单独挂载了，不会被收集成导航项 —— 请检查是否套了额外的元素 / 组件。',
    )
  }
})
</script>

<template>
  <!-- 占位：正常情况下父组件只读 vnode、不会渲染到这里 -->
</template>
