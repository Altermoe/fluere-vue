<script setup lang="ts">
/**
 * 全站 `<title>` 模板：页面给了 title 就输出「<title> · FluereVue」，没给则回落品牌名。
 *
 * 放在 app.vue（unhead 根层）而不是 nuxt.config：`app.head.title` 会与模板叠加成
 * 「FluereVue · FluereVue」，而函数式 titleTemplate 只能写在 useHead 里。
 * 页面级 title / description 由各页 useSeoMeta 提供（组件页取 content frontmatter，
 * 随语种切换，见 pages/components/[...slug].vue）。
 */
useHead({
  titleTemplate: (title) => (title ? `${title} · FluereVue` : 'FluereVue'),
})
</script>

<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
