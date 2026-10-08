<script setup lang="ts">
/**
 * 组件导航面板（纯展示组件 / Presentational Panel）。
 *
 * 只负责「渲染导航条目」：Overview 入口、分组标题、组件链接（含未实现占位）、
 * 当前路由高亮。刻意不做：
 *  - 不感知视口尺寸、不实现任何响应式逻辑（断点显隐由外层外壳处理）；
 *  - 不决定自己摆在哪（常驻栏 / 抽屉）、不管理开合状态；
 *  - 不自带滚动容器——滚动由外层按摆放形态决定（常驻栏与抽屉各自包 ScrollView）。
 *
 * 数据来自 data/components-nav.ts（结构化）+ useComponentNav()（按 locale 解析显示名）。
 * 当前路由仅用于高亮态（非尺寸感知逻辑）。
 */
import { useComponentNav } from '~/composables/use-component-nav'
import { useDocsI18n } from '~/composables/use-docs-i18n'

const route = useRoute()
const { t } = useDocsI18n()
const { groups } = useComponentNav()
const localePath = useLocalePath()

const isActive = (slug?: string) =>
  slug === undefined
    ? route.path === localePath('/components')
    : route.path === localePath(`/components/${slug}`)
</script>

<template>
  <!-- 容器左右内边距：条目不再贴着常驻栏/抽屉边缘；右侧多留一点，
       让悬浮滚动条收起态（2px）也不会压住按钮文字。 -->
  <nav class="space-y-7 px-3 py-4 pr-6">
    <NuxtLink
      :to="localePath('/components')"
      class="block px-3 py-1.5 rounded-fluent-md text-sm transition-colors"
      :class="
        isActive()
          ? 'bg-colorBrandBackground text-colorNeutralForegroundOnBrand font-medium'
          : 'text-colorNeutralForeground2 hover:bg-colorSubtleBackgroundHover hover:text-colorNeutralForeground1'
      "
    >
      {{ t('nav.overview') }}
    </NuxtLink>

    <section
      v-for="group in groups"
      :key="group.id"
    >
      <h3
        class="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-colorNeutralForeground3"
      >
        <!-- 分组标题只有一份（按 locale 解析），不再有 title/label 中英双字段混写 -->
        {{ group.groupTitle }}
      </h3>
      <ul class="space-y-0.5">
        <li
          v-for="item in group.items"
          :key="item.slug"
        >
          <NuxtLink
            v-if="item.implemented"
            :to="localePath(`/components/${item.slug}`)"
            class="block px-3 py-1.5 rounded-fluent-md text-sm transition-colors"
            :class="
              isActive(item.slug)
                ? 'bg-colorBrandBackground text-colorNeutralForegroundOnBrand font-medium'
                : 'text-colorNeutralForeground2 hover:bg-colorSubtleBackgroundHover hover:text-colorNeutralForeground1'
            "
          >
            {{ item.name }}
          </NuxtLink>
          <span
            v-else
            class="flex items-center gap-2 px-3 py-1.5 rounded-fluent-md text-sm text-colorNeutralForeground3 opacity-50"
          >
            {{ item.name }}
            <span
              class="text-[10px] leading-none px-1 py-0.5 rounded-fluent-sm bg-colorNeutralBackground3 text-colorNeutralForeground3"
            >
              {{ t('nav.unimplemented') }}
            </span>
          </span>
        </li>
      </ul>
    </section>
  </nav>
</template>
