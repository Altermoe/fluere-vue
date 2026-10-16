<script setup lang="ts">
 /**
 * `/os` 专用布局：桌面仿真的**独立布局**。
 *
 * 之所以要一条独立布局（而不是像 0.5.5 那样让页面裸挂外壳）：
 *
 *   - 桌面是**整屏接管**的界面 —— 它自己锁 `100dvh`（`desktop-shell.vue`）、关掉页面级
 *     滚动、并自带壁纸 / 窗口 / 任务栏三层。若沿用 `layouts/components.vue`，站点侧边栏
 *     与悬浮 header 会与桌面争抢视口；若让页面完全无布局，就等于把「外壳的落点」这件
 *     布局级的事写进页面（这也是 0.5.5 `pages/index.vue` 膨胀到 578 行的原因）。
 *   - 独立布局让 `/os` 成为仿真后续迭代的**固定落点**（0.5.6 起：站点主页是常规营销页，
 *     仿真在 `/os` 继续演进，见 `docs/design/explorer-layout.md` §0）。
 *
 * 本文件刻意只有 `<slot />`：桌面的视口、层级与滚动全部由 `DesktopShell` 掌管，
 * 布局层再加任何包裹元素都会引入第二个定位上下文（`DesktopShell` 的窗口层 /
 * 占位卡片是 `position: absolute`，需要一个 `position: relative` 的祖先 ——
 * 那个祖先就是外壳根节点本身）。
 */
</script>

<template>
  <slot />
</template>
