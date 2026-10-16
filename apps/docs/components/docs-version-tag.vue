<script setup lang="ts">
/**
 * 顶部导航 / 页脚的版本徽标（文档站专用，不属于组件库）。
 *
 * 为什么单独成组件：同一个徽标出现在 layouts/components.vue（文档内页 header）、
 * layouts/home.vue（主页 header）与 components/shell/shell-chrome.vue（`/os` 桌面窗口
 * 的标题栏 / 移动应用栏）三处，内联会随各处布局漂移（历史上首页与组件页的顶栏就是
 * 这样分叉的）。
 *
 * 形态是「浅蓝 tag」而不是裸文本：窄视口下顶栏控件组空间不足时，裸文本会被 flex
 * 压成多行（版本号的连字符处折断，出现「v0.3.0- / alpha.1」）。因此这里
 *  - `whitespace-nowrap`：tag 内**不允许**折行；
 *  - 空间不足交给父级 `flex-wrap` 消化（header 整体换行，见 assets/docs-shell.css 的高度约定）。
 *
 * 配色全部走 Fluent 语义 token（无硬编码色值）：
 *  - 底色 `colorBrandBackground2`（品牌浅底色，浅蓝）→ 工具类 `bg-colorBrandBackground2`
 *  - 前景 `colorBrandForeground1`（品牌前景）→ 工具类 `text-colorBrandForeground1`
 *  - 圆角 `borderRadiusCircular` → `rounded-fluent-circular`（胶囊 tag）
 *
 * 版本号事实源与归一规则见 composables/use-docs-version.ts（`v` 前缀由模板自己拼一个，
 * 因为 runtimeConfig 的值可能带前缀也可能不带）。
 */
const version = useDocsVersion()
</script>

<template>
  <span
    class="inline-flex items-center whitespace-nowrap rounded-fluent-circular bg-colorBrandBackground2 px-2 py-0.5 text-xs font-medium text-colorBrandForeground1"
  >
    v{{ version }}
  </span>
</template>
