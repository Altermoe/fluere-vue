<script setup lang="ts">
// 显式 import：`components/shell/**` 走 Nuxt 默认扫描只会得到 `ShellDesktopShell`
// 这类带目录前缀的自动导入名（读起来像组件库的 `Fluere*`），且依赖扫描时序 ——
// 实测新增页面若不写这一行，首次运行会渲染出「Failed to resolve component: DesktopShell」
// 的空壳。落点归属与命名理由见 AGENTS.md 与 apps/docs/README.md〈构件归属〉。
import DesktopShell from '~/components/shell/desktop-shell.vue'

/**
 * `/os`：Windows 桌面仿真（0.5.5 落地；0.5.6 从站点主页迁到这里）。
 *
 * ## 本页只做两件事
 *
 *   ① 声明 `layout: 'os'`（`layouts/os.vue` —— 只转发 slot，桌面自己接管视口）；
 *   ② 挂载 `DesktopShell`（壁纸 → 窗口 → 任务栏三层）与路由切换骨架遮罩。
 *
 * 窗口里「首页」/「指南」/「组件」三个视图的内容**不在这里注入**：
 * 它们由 `components/shell/explorer-window.vue` 按标签 id 直接渲染
 * （「首页」= 与站点主页共用的 `home-content.vue`、「组件」= 注册表卡片网格、
 * 「指南」= 两个起步入口）。0.5.5 时 `DesktopShell` 往外透传 `#home` / `#guide`
 * 插槽、由页面填内容 —— 那条链路在迁移时删掉了：视图内容属于窗口层（它知道有哪些
 * 标签、当前激活哪一个），页面层只需要负责「挂上外壳」。
 *
 * ## 遮罩为什么在本页而不在布局
 *
 * 遮罩只在**客户端**有意义（`useDocsRouteLoading` 由客户端插件写入，SSR 期恒为 false）。
 * 挂在页面里用 `ClientOnly` 兜住，服务端产物与水合首帧结构一致；`HomeRouteOverlay`
 * 与主页布局共用同一份实现（fixed 定位，不依赖父级定位上下文）。
 *
 * ## SEO
 *
 * `title` 走 i18n key（`<title>` 模板在 `app.vue`，渲染成「桌面仿真 · FluereVue」）；
 * description 与主页同源（`home.metaDescription`）—— 这一页就是主页营销内容的可交互呈现，
 * 不必再写一段同义描述。og 标签由 `plugins/i18n-head.ts` 的 `useLocaleHead` 统一输出。
 */
definePageMeta({
  layout: 'os',
})

const { t } = useDocsI18n()

useSeoMeta({
  title: () => t('nav.desktopSimulation'),
  description: () => t('home.metaDescription'),
  ogTitle: () => t('nav.desktopSimulation'),
  ogDescription: () => t('home.metaDescription'),
})
</script>

<template>
  <div class="docs-os">
    <DesktopShell />

    <!-- 路由切换骨架遮罩（仅客户端；理由见文件头） -->
    <ClientOnly>
      <HomeRouteOverlay />
    </ClientOnly>
  </div>
</template>

<style scoped>
/*
 * 页面根：只是遮罩的定位上下文（`HomeRouteOverlay` 自身是 fixed，不依赖它）。
 * 桌面外壳自己锁视口（100dvh + overflow: hidden），因此这里不写高度 / 溢出。
 */
.docs-os {
  position: relative;
}
</style>
