<script setup lang="ts">
/**
 * `/components` 首页（Overview）：已实现组件的卡片网格。
 *
 * 卡片外观对齐参考图（WinUI 3 Gallery「全部示例」页）的规格与映射说明，
 * 全部写在 `components/component-card.vue` 的头部注释里；本页只负责
 * ① 从组件注册表里挑出已实现项 ② 按 WinUI 模板的固定卡片尺寸 / 12px 间距排网格。
 *
 * 几何来源（同参考图）：
 *   - 列：AllControlsPage.xaml 的 `GridView`（WideLayout 固定 300px 卡片 + 换列，
 *     NarrowLayout 单列拉伸）→ `repeat(auto-fill, 300px)` / `minmax(0, 1fr)`
 *   - 间距：IndentedGridViewItemStyle 的 `Margin 12,0,0,12` → gap 12
 *   - 断点：WideLayout 的 `Breakpoint640Plus` = 640px = Uno 的 sm（40rem）
 *   - 标题：WinUI Gallery 页头 `TitleTextBlockStyle`（28 SemiBold）量级，
 *     这里取文档站正文 `<h1>` 同档（docs-prose：fontSizeHero800 / 32 + Semibold），
 *     让 Overview 与各组件页的页标题视觉一致。
 */
import { useComponentNav } from '~/composables/use-component-nav'
import { useDocsI18n } from '~/composables/use-docs-i18n'

definePageMeta({
  layout: 'components',
})

const { t } = useDocsI18n()
const { implementedCards } = useComponentNav()

// 每语言独立的 SEO meta（i18n 一期 1.1）：标题与描述句走 i18n key，随语种切换；
// og:url / hreflang / og:locale 由 plugins/i18n-head.ts 的 useLocaleHead 统一输出。
useSeoMeta({
  title: () => t('components.overviewTitle'),
  description: () => t('components.overviewLead', { count: implementedCards.value.length }),
  ogTitle: () => t('components.overviewTitle'),
  ogDescription: () => t('components.overviewLead', { count: implementedCards.value.length }),
})
</script>

<template>
  <div>
    <header>
      <h1 class="docs-components-overview__title">{{ t('components.overviewTitle') }}</h1>
      <p class="docs-components-overview__lead">
        {{ t('components.overviewLead', { count: implementedCards.length }) }}
      </p>
    </header>

    <ul class="docs-component-grid">
      <li
        v-for="card in implementedCards"
        :key="card.slug"
      >
        <ComponentCard
          :to="`/components/${card.slug}`"
          :name="card.name"
          :summary="card.summary"
          :icon="card.icon"
          :palette="card.palette"
        />
      </li>
    </ul>
  </div>
</template>

<style scoped>
/* 页标题与引导句：与 docs-prose 的 h1 / p 同档（assets/docs-prose.css） */
.docs-components-overview__title {
  font-size: var(--fontSizeHero800); /* 32 */
  line-height: var(--lineHeightHero800); /* 40 */
  font-weight: var(--fontWeightSemibold);
  color: var(--colorNeutralForeground1);
}

.docs-components-overview__lead {
  margin-top: var(--spacingVerticalS);
  font-size: var(--fontSizeBase300); /* 14 */
  line-height: var(--lineHeightBase300); /* 20 */
  color: var(--colorNeutralForeground2);
}

/*
 * 卡片网格：窄屏单列（NarrowLayout，卡片自身拉伸），≥640px 起固定 300px 卡片、
 * 按可用宽度自动换列（WideLayout 的 GridView 行为）。
 * 列表标记与缩进由 presetWind4 的 preflight 抹平（`ul { list-style: none }` + `* { padding: 0 }`），
 * 这里不再重复复位。
 */
.docs-component-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--spacingHorizontalM); /* 卡片之间横竖各 12 */
  margin-top: var(--spacingVerticalL); /* 与 Gallery 的 GridView Padding 上 16 同档 */
}

@media (min-width: 40rem) {
  .docs-component-grid {
    grid-template-columns: repeat(auto-fill, 300px);
  }
}
</style>
