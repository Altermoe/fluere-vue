<script setup lang="ts">
// 显式 import：`components/shell/**` 走 Nuxt 默认扫描只会得到 `ShellDesktopShell`
// 这类带目录前缀的自动导入名（读起来像组件库的 `Fluere*`），且依赖扫描时序 ——
// 实测新增页面若不写这一行，首次运行会渲染出「Failed to resolve component: DesktopShell」
// 的空壳。落点归属与命名理由见 AGENTS.md 与 apps/docs/README.md〈构件归属〉。
import DesktopShell from '~/components/shell/desktop-shell.vue'

/**
 * `/os`：Windows 桌面仿真（0.5.5 落地；0.5.6 从站点主页迁到这里）。
 *
 * ## 本页只做三件事
 *
 *   ① 声明 `layout: 'os'`（`layouts/os.vue` —— 只转发 slot，桌面自己接管视口）；
 *   ② 用 `<ClientOnly>` 挂载 `DesktopShell`（桌面仿真组件的**边界**，见下）；
 *   ③ 挂载路由切换骨架遮罩（同样只在客户端有意义）。
 *
 * ## ClientOnly 是桌面仿真的边界（0.5.9 起）
 *
 * 原则写在 docs/ssr-guide.md〈文档站桌面仿真的 ClientOnly 边界〉：文档站的桌面仿真组件
 * **一律实现为 ClientOnly 组件，其内部不做任何 SSR 检查**（仅限 `apps/docs` 实现侧；
 * `packages/ui` 等组件库仍必须 SSR 安全）。本页是这条边界的**唯一落点**。
 *
 * 为什么用 ClientOnly 而不是 `definePageMeta({ ssr: false })`：
 * 后者会把 `/os` 整条路由从静态产物里摘掉（本项目是 `nuxt generate` 静态部署，
 * 摘掉 = 线上 404）；ClientOnly 保留路由与 `useSeoMeta` 直出的 head，
 * 只放弃桌面 DOM 的服务端渲染。代价是 `/os` 的预渲染 HTML 里没有桌面结构，
 * 首屏由 `#fallback` 占位 —— 这也是 `#fallback` 要画满一屏、底色取壁纸令牌的原因
 * （否则会看到一帧白闪）。SEO 不受影响：标题 / 描述 / og 由 `useSeoMeta` 在服务端输出。
 *
 * ## 窗口里「首页」/「指南」/「组件」三个视图的内容**不在这里注入**
 *
 * 它们由 `components/shell/ui-gallery-window.vue` 按标签 id 直接渲染
 * （「首页」= 与站点主页共用的 `home-content.vue`、「组件」= 注册表卡片网格、
 * 「指南」= 两个起步入口）。视图内容属于窗口层（它知道有哪些标签、当前激活哪一个），
 * 页面层只负责「挂上外壳」。
 *
 * ## 遮罩为什么在本页而不在布局
 *
 * 遮罩只在**客户端**有意义（`useDocsRouteLoading` 由客户端插件写入），
 * 因此和外壳一起放进 ClientOnly；`HomeRouteOverlay` 与主页布局共用同一份实现
 * （fixed 定位，不依赖父级定位上下文）。
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
    <!--
      ClientOnly：桌面仿真组件一律只在客户端渲染（原则见文件头）。
      `#fallback` 是挂载前的占位：铺满视口 + 壁纸令牌底色，避免整页白闪 ——
      桌面外壳自己会锁 `100dvh` 并接管视口，占位只需与它的底色一致。
    -->
    <ClientOnly>
      <DesktopShell />

      <!-- 路由切换骨架遮罩（仅客户端；理由见文件头） -->
      <HomeRouteOverlay />

      <template #fallback>
        <div
          class="docs-os__fallback"
          aria-hidden="true"
        />
      </template>
    </ClientOnly>
  </div>
</template>

<style scoped>
/*
 * 页面根：只是遮罩与占位的定位上下文（`HomeRouteOverlay` 自身是 fixed，不依赖它）。
 * 桌面外壳自己锁视口（100dvh + overflow: hidden），因此这里不写高度 / 溢出。
 */
.docs-os {
  position: relative;
}

/*
 * 占位：与壁纸同底色（`--micaBackgroundFillColorBase` 是壁纸渐变的基色，
 * 见 docs/design/explorer-layout.md §5），锁同一视口高度 —— 桌面挂载后不会出现跳变。
 */
.docs-os__fallback {
  block-size: 100vh;
  block-size: 100dvh;
  background-color: var(--micaBackgroundFillColorBase);
}
</style>
