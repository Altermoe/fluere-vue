<script setup lang="ts">
/**
 * 路由切换骨架遮罩（主页与 `/os` 共用）。
 *
 * ## 为什么需要它，又为什么收成一个组件
 *
 * 写入方是 `plugins/docs-route-loading.client.ts`（订阅 Nuxt 的
 * `page:loading:start` / `page:loading:end`）。Nuxt 在「新目标页的异步数据就绪」之前
 * 会把整个新 fork（布局 + 页面）压住不渲染 —— 实测「主页 → /components/*」在 dev 下
 * 点击后要数秒才换视图、期间没有任何网络请求。这段时间里能立刻给出反馈的只有当前
 * 仍挂着的这一页，因此遮罩必须挂在**当前页**的布局上（`layouts/components.vue` /
 * `layouts/home.vue` / `/os` 的桌面页各挂一份）。
 *
 * 0.5.5 时这份遮罩的页面级样式写在 `pages/index.vue` 里；迁到 `/os` 后主页与桌面页
 * 都需要同一份，故收成组件（含离场 Transition 与层级说明），避免两处各写一份
 * 而漂移。
 *
 * ## 定位契约
 *
 * `position: fixed; inset: 0`：铺满**视口**而不是某个定位盒 —— 主页布局的
 * `FluereScrollView` 视口就是整个视口，`/os` 的桌面根也锁在视口上，两者一致。
 * `DocsRouteSkeleton` 自身是 `position: absolute; inset: 0`，因此本层必须给定尺寸，
 * fixed 正好提供。
 *
 * ## 层级
 *
 * `calc(var(--zIndexShell) - var(--zIndexStep))` = 1490：夹在桌面内容之上、
 * 任务栏（`--zIndexShell` = 1500）之下 —— 加载期间任务栏仍可操作（与文档内页
 * 「加载期间导航仍可操作」同一取舍）。不为此新造刻度：遮罩是**应用层 chrome**，
 * 语义就是「比任务栏低一档」，用步进表达比新增刻度更贴合既有体系
 * （AGENTS.md〈交互与弹层组件约定〉：浮层档位只能引用刻度；页面级 chrome 同理）。
 * 主页没有任务栏，遮罩自然铺满全屏，无需额外规则。
 *
 * ## 动效
 *
 * 离场走 accelerate（内容「离场」）语汇，与 `layouts/components.vue` 的
 * `.docs-route-skeleton-leave-*` 同一套约定。进入淡入由 `DocsRouteSkeleton` 自身的
 * animation 负责 —— 同一个组件也挂在没有 Transition 包裹的场景上，所以淡入不在这里
 * 写第二份。只做透明度，不叠加位移，避免为一个临时遮罩多起一个合成层。
 */
const routeLoading = useDocsRouteLoading()
</script>

<template>
  <Transition name="docs-route-skeleton">
    <div
      v-if="routeLoading"
      class="docs-route-overlay"
    >
      <DocsRouteSkeleton />
    </div>
  </Transition>
</template>

<style scoped>
.docs-route-overlay {
  position: fixed;
  inset: 0;
  z-index: calc(var(--zIndexShell) - var(--zIndexStep));
}

/*
 * 遮罩离场：accelerate（内容「离场」）语汇，与文档内页的布局同一套约定
 * （见 layouts/components.vue 的 `.docs-route-skeleton-leave-*`）。
 */
.docs-route-skeleton-leave-active {
  transition-property: opacity;
  transition-duration: var(--durationFast);
  transition-timing-function: var(--curveAccelerateMin);
}

.docs-route-skeleton-leave-to {
  opacity: 0;
}

/* 减少动效偏好：瞬时隐藏（骨架自身的波浪循环与淡入也已在组件内停用） */
@media (prefers-reduced-motion: reduce) {
  .docs-route-skeleton-leave-active {
    transition: none;
  }
}
</style>
