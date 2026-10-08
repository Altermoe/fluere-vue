<script setup lang="ts">
/**
 * 顶部导航栏的 GitHub 图标链接（文档站专用，不属于组件库）。
 * 组件名：Nuxt 自动导入为 `GithubLink`（scule 的 pascalCase 只大写每段首字母），
 * 因此模板里写 `<GithubLink />`，仓库地址与图标实现都收敛在本文件。
 *
 * 图标来源（GitHub 官方品牌资产，2025 版 Invertocat）：
 *   https://brand.github.com/foundations/logo → 官方下载包 `GitHub_Logos.zip`
 *   → `GitHub Logos/SVG/GitHub_Invertocat_Black.svg`（viewBox `0 0 98 96`，单条 path）。
 * 落地时只做三处等价处理：
 *   1. `fill="black"` 改为 `currentColor` —— 品牌规范要求 Invertocat 只用白 / 黑 / 灰 / 绿，
 *      而 colorNeutralForeground2 → colorNeutralForeground1 在明主题是 #424242 → #242424
 *      （灰 → 黑）、暗主题是 #d6d6d6 → #ffffff（灰 → 白），恰好落在允许范围内，
 *      也不会被强调色着色（链接色是蓝的，用它即等于修改 logo 配色）；
 *   2. 去掉 `clipPath` 包装 —— 其 rect 与 viewBox 等大，不产生任何裁剪；同时避免内联 SVG
 *      的 `id` 在多实例场景下重复；
 *   3. 去掉 `xmlns` / `fill="none"` —— HTML 内联 SVG 的默认命名空间与默认填充，无需重复声明。
 * `d` 与官方文件逐字一致（未做坐标精简或重绘），渲染结果已与官方 SVG 逐像素比对：
 * 98 × 96 画布上 alpha 掩码差异像素 0（测量脚本见 temp/docs-github-link-verify.mjs）。
 * 配色依据官方「Invertocat 只用白 / 黑 / 灰 / 绿」的规定（同页 Color 一节）；
 * 小尺寸版本另见 Primer Octicons 的 `mark-github-16` / `mark-github-24` —— 同一 Invertocat
 * 设计、为图标尺寸单独手调的路径：https://github.com/primer/octicons/tree/main/icons
 * 使用条款：官方允许「用 Invertocat 作为指向自己项目的社交按钮」，见
 * https://brand.github.com/foundations/logo 的 Usage / Legal 两节。
 *
 * 尺寸：图标 20px（与中号图标按钮内的 20px 图标一致，见 theme-toggle.vue），
 * 命中区 32px（h-8 w-8），与 header 其余控件同高且大于最小点击区域；
 * 宽度 `w-auto` 按 viewBox 等比推导，不做拉伸 / 压扁（品牌规范禁止变形）。
 */
const REPOSITORY_URL = 'https://github.com/Altermoe/fluere-vue'
const { t } = useDocsI18n()
</script>

<template>
  <!--
    外链用 <a> 承载：语义即链接（可新标签打开、可复制 URL），样式也按链接处理——
    无边框、无底色，只有图标颜色随 hover / active 变化（不再用 outline 按钮外观）；
    焦点环沿用组件库 Button 的写法（2px colorCompoundBrandStroke + 2px offset）。
    可访问名由链接的 aria-label 提供，图标对 AT 隐藏。
  -->
  <a
    :href="REPOSITORY_URL"
    target="_blank"
    rel="noopener noreferrer"
    class="docs-github-link inline-flex h-8 w-8 items-center justify-center text-colorNeutralForeground2 transition-colors duration-fluent-faster hover:text-colorNeutralForeground1 active:text-colorNeutralForeground1"
    :aria-label="t('github.openInNewTab')"
    :title="t('github.openInNewTab')"
  >
    <svg
      class="h-5 w-auto"
      viewBox="0 0 98 96"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M41.4395 69.3848C28.8066 67.8535 19.9062 58.7617 19.9062 46.9902C19.9062 42.2051 21.6289 37.0371 24.5 33.5918C23.2559 30.4336 23.4473 23.7344 24.8828 20.959C28.7109 20.4805 33.8789 22.4902 36.9414 25.2656C40.5781 24.1172 44.4062 23.543 49.0957 23.543C53.7852 23.543 57.6133 24.1172 61.0586 25.1699C64.0254 22.4902 69.2891 20.4805 73.1172 20.959C74.457 23.543 74.6484 30.2422 73.4043 33.4961C76.4668 37.1328 78.0937 42.0137 78.0937 46.9902C78.0937 58.7617 69.1934 67.6621 56.3691 69.2891C59.623 71.3945 61.8242 75.9883 61.8242 81.252L61.8242 91.2051C61.8242 94.0762 64.2168 95.7031 67.0879 94.5547C84.4102 87.9512 98 70.6289 98 49.1914C98 22.1074 75.9883 6.69539e-07 48.9043 4.309e-07C21.8203 1.92261e-07 -1.9479e-07 22.1074 -4.3343e-07 49.1914C-6.20631e-07 70.4375 13.4941 88.0469 31.6777 94.6504C34.2617 95.6074 36.75 93.8848 36.75 91.3008L36.75 83.6445C35.4102 84.2188 33.6875 84.6016 32.1562 84.6016C25.8398 84.6016 22.1074 81.1563 19.4277 74.7441C18.375 72.1602 17.2266 70.6289 15.0254 70.3418C13.877 70.2461 13.4941 69.7676 13.4941 69.1934C13.4941 68.0449 15.4082 67.1836 17.3223 67.1836C20.0977 67.1836 22.4902 68.9063 24.9785 72.4473C26.8926 75.2227 28.9023 76.4668 31.2949 76.4668C33.6875 76.4668 35.2187 75.6055 37.4199 73.4043C39.0469 71.7773 40.291 70.3418 41.4395 69.3848Z"
        fill="currentColor"
      />
    </svg>
  </a>
</template>

<style scoped>
.docs-github-link:focus-visible {
  outline: var(--strokeWidthThick) solid var(--colorCompoundBrandStroke);
  outline-offset: 2px;
}
</style>
