<script setup lang="ts">
/**
 * 主页（常规形态，0.5.6 起）。
 *
 * ## 本页只做三件事
 *
 *   ① 声明 `layout: 'home'`（固定 header + 滚动视口 + 路由遮罩，见 `layouts/home.vue`）；
 *   ② 渲染营销内容 —— 结构在 `components/home/home-content.vue`，与 `/os` 桌面窗口里的
 *      「首页」视图**共用同一份**；
 *   ③ 给出本页 SEO。
 *
 * ## 与 0.5.5 的关系（口径变更）
 *
 * 0.5.5 时首页首屏整屏接管为 Windows 桌面仿真。0.5.6 把仿真移到独立路由 `/os`
 * （`pages/os/index.vue` + `layouts/os.vue`），主页回到常规营销页 —— 这样
 * 「Explorer 仿真」可以作为独立章节继续演进，而不必让整站主页承担仿真的全部约束。
 * 因此本页**不再**挂 `DesktopShell`，也不再有「无布局」这条特例：路由遮罩改由布局
 * （本页在 `layouts/home.vue`，桌面页在 `pages/os/index.vue`）承载。
 * 口径已回写 `docs/design/explorer-layout.md` §0 与 `apps/docs/README.md`。
 */
definePageMeta({
  layout: 'home',
})

const { t } = useDocsI18n()

/*
 * 首页 SEO（i18n 一期 1.1）：description 走 i18n key，og:title 取品牌名；
 * `<title>` 不设——app.vue 的 titleTemplate 在无页面级 title 时回落 'FluereVue'。
 */
useSeoMeta({
  description: () => t('home.metaDescription'),
  ogTitle: 'FluereVue',
  ogDescription: () => t('home.metaDescription'),
})
</script>

<template>
  <!-- variant 缺省即 'page'：不渲染《WindowsOS 仿真边界》（那一段跟随仿真本身，落在 /os） -->
  <HomeContent />
</template>
