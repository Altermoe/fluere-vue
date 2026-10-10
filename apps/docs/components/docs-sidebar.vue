<script setup lang="ts">
/**
 * 组件导航的响应式外壳（Responsive Shell）。
 *
 * 职责仅限「在哪种视口下、以什么形态摆放导航面板」，不渲染任何导航条目：
 *  - ≥1024px（lg）：常驻在视口左缘、悬浮 header（h-14）之下的固定栏，
 *    自身独立 FluereScrollView 滚动；显隐用纯 CSS `hidden lg:block`（水合安全）。
 *  - <1024px：顶栏按钮（useDocsSidebar.toggle）驱动的抽屉浮层，向左滑出/滑入；
 *    展开时右侧覆盖半透明 blur 遮罩，点击遮罩收起。
 *
 * 抽屉开合状态由 useDocsSidebar 提供，与顶栏按钮共享。收起时机：
 * 遮罩点击 / Escape / 路由切换（选中新组件）/ 断点升至桌面。
 * `useMediaQuery` 的结果只用于「升到桌面时强制收起」，不参与模板渲染，
 * 避免服务端默认值（false）与客户端真实值不一致引发水合告警。
 */
import { useMediaQuery } from '@fluere-vue/hooks'
import { FluereScrollView } from '@fluere-vue/ui'

const route = useRoute()
const { open, close } = useDocsSidebar()
const { t } = useDocsI18n()

/** lg 断点（与 CSS `lg:` 同一阈值 1024px）。 */
const isDesktop = useMediaQuery('(min-width: 1024px)')

// 断点升到桌面时强制收起抽屉：否则状态滞留为「开」，下次缩回移动端会意外弹出
watch(isDesktop, (desktop) => {
  if (desktop) {
    close()
  }
})

// 选中新组件（路由变化）后收起抽屉，回到整页滚动视图
watch(() => route.fullPath, close)

// Escape 收起抽屉；仅在展开期间挂监听
const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    close()
  }
}
watch(
  open,
  (isOpen) => {
    if (!import.meta.client) {
      return
    }
    if (isOpen) {
      globalThis.addEventListener('keydown', onKeydown)
    } else {
      globalThis.removeEventListener('keydown', onKeydown)
    }
  },
  { immediate: true },
)
onScopeDispose(() => {
  if (import.meta.client) {
    globalThis.removeEventListener('keydown', onKeydown)
  }
})
</script>

<template>
  <!-- 桌面常驻栏：贴视口左缘、悬浮 header 之下；面板自带独立滚动 -->
  <aside class="absolute bottom-0 left-0 top-14 z-10 hidden w-60 lg:block">
    <FluereScrollView class="h-full">
      <DocsNavPanel />
    </FluereScrollView>
  </aside>

  <!--
    移动端抽屉：fixed 浮层。`lg:hidden` 为兜底——即便 open 状态滞留（断点竞态），
    桌面端也绝不显示。遮罩居右、面板居左；面板退出时向左滑出（translateX(-100%)）。
  -->
  <Transition name="docs-nav-drawer">
    <div
      v-if="open"
      class="fixed inset-0 z-30 lg:hidden"
      role="dialog"
      aria-modal="true"
      :aria-label="t('nav.componentNavDialog')"
    >
      <div
        class="docs-nav-drawer__mask absolute inset-0 bg-colorNeutralBackground1/60 backdrop-blur-sm"
        @click="close"
      />
      <!-- 面板从悬浮 header（h-14）之下开始：首条导航不被 header 遮住 -->
      <aside
        class="docs-nav-drawer__panel absolute bottom-0 left-0 top-14 flex w-72 max-w-[85vw] flex-col border-r border-colorNeutralStroke1 bg-colorNeutralBackground1"
      >
        <FluereScrollView class="min-h-0 flex-1">
          <DocsNavPanel />
        </FluereScrollView>
      </aside>
    </div>
  </Transition>
</template>

<style scoped>
/*
 * 抽屉动效：面板向左滑入/滑出，遮罩同步淡入淡出。
 * 进入用 decelerate（内容「落定」）、退出用 accelerate（内容「离场」），
 * 与 ScrollView 滚动条同一套 Fluent 动效约定（--durationFast + curve 令牌）。
 * 只动 transform / opacity（合成层属性），不触发回流。
 */
.docs-nav-drawer__panel {
  transition-property: transform;
}
.docs-nav-drawer__mask {
  transition-property: opacity;
}
.docs-nav-drawer-enter-active .docs-nav-drawer__panel,
.docs-nav-drawer-enter-active .docs-nav-drawer__mask {
  transition-duration: var(--durationFast);
  transition-timing-function: var(--curveDecelerateMid);
}
.docs-nav-drawer-leave-active .docs-nav-drawer__panel,
.docs-nav-drawer-leave-active .docs-nav-drawer__mask {
  transition-duration: var(--durationFast);
  transition-timing-function: var(--curveAccelerateMin);
}
.docs-nav-drawer-enter-from .docs-nav-drawer__panel,
.docs-nav-drawer-leave-to .docs-nav-drawer__panel {
  transform: translateX(-100%);
}
.docs-nav-drawer-enter-from .docs-nav-drawer__mask,
.docs-nav-drawer-leave-to .docs-nav-drawer__mask {
  opacity: 0;
}

/* 减少动效偏好：瞬时切换，不滑入滑出 */
@media (prefers-reduced-motion: reduce) {
  .docs-nav-drawer-enter-active,
  .docs-nav-drawer-leave-active {
    transition: none;
  }
}
</style>
