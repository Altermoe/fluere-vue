<script lang="ts">
/**
 * FluereTabViewItem —— **数据型子组件**（不会把自己渲染到 DOM 里）。
 *
 * 它存在的意义是「让消费方用声明式写法描述一个 tab」：
 * `FluereTabView` 在渲染期读取子项 vnode 的 props / slots（见 `collection.ts` 的文件头，
 * 那里解释了为什么不能用 provide/inject 注册式收集：SSR 直出会缺 tab 条），
 * 然后由 `FluereTabView` 负责把 tab 头渲染进 `role="tablist"`、把内容渲染进 `role="tabpanel"`。
 *
 * 因此：
 *  · 组件**不会挂载**（父组件从不渲染这些 vnode），`setup()` 里没有任何逻辑；
 *  · 若它真的挂载了，说明写法不受支持（被包在别的组件 / 原生元素里，或脱离了 `FluereTabView`），
 *    `onMounted` 里给一条开发期警告；
 *  · 子项插槽**不支持作用域参数**（`#header="{ … }"` 拿不到值）——父组件调用插槽函数时
 *    不传参；需要作用域数据请用 `v-for` 在消费方自己的模板里展开。
 *
 * Props 语义与默认值逐条对齐 WinUI `TabViewItem`（`TabView.idl:203-230` +
 * `Generated/TabViewItem.properties.cpp`）：`Header` / `IconSource` / `IsClosable`（默认 true）。
 */
export type { FluereTabViewItemProps } from './types'
</script>

<script setup lang="ts">
import { onMounted } from 'vue'
import type { FluereTabViewItemProps } from './types'

defineOptions({ name: 'FluereTabViewItem' })

// 默认值与 `collection.ts` 里的读取口径必须保持一致（那边手工兜底，因为本组件不挂载）
withDefaults(defineProps<FluereTabViewItemProps>(), {
  header: '',
  isClosable: true,
  disabled: false,
  ariaLabel: undefined,
  value: undefined,
})

onMounted(() => {
  if (import.meta.env.DEV) {
    // oxlint-disable-next-line no-console
    console.warn(
      '[FluereTabViewItem] 本组件必须作为 <FluereTabView> 的**直接子元素**（可包在 v-for / <template> 里）；' +
        '当前写法下它被单独挂载了，不会被收集成 tab —— 请检查是否套了额外的元素 / 组件。',
    )
  }
})
</script>

<template>
  <!-- 占位：正常情况下父组件只读 vnode、不会渲染到这里 -->
</template>
