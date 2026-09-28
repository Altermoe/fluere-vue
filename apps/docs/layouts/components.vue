<script setup lang="ts">
import { FluereButton, FluereScrollView } from '@fluere-vue/ui'
import { componentNavGroups } from '../data/components-nav'

/** 仓库地址（外链） */
const REPOSITORY_URL = 'https://github.com/'

const route = useRoute()

const isActive = (slug: string) => route.path === `/components/${slug}`

/** 外链在新标签页打开；noopener/noreferrer 与 <a rel> 语义等价 */
const openRepository = () => {
  window.open(REPOSITORY_URL, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <div class="min-h-screen bg-colorNeutralBackground2 text-colorNeutralForeground1 font-base">
    <!-- Header -->
    <header
      class="sticky top-0 z-10 backdrop-blur-md bg-colorNeutralBackground1/80 border-b border-colorNeutralStroke1"
    >
      <div class="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <div class="flex items-center gap-8">
          <NuxtLink
            to="/"
            class="flex items-center gap-2 font-semibold text-lg"
          >
            <div
              class="w-6 h-6 rounded-fluent-md bg-colorBrandBackground text-colorBrandForegroundInverted flex items-center justify-center text-xs font-bold"
            >
              W
            </div>
            FluereVue
          </NuxtLink>
          <nav class="hidden md:flex items-center gap-6 text-sm text-colorNeutralForeground2">
            <NuxtLink
              to="/components"
              class="hover:text-colorNeutralForeground1 transition-colors"
            >
              Docs
            </NuxtLink>
            <NuxtLink
              to="/components/button"
              class="hover:text-colorNeutralForeground1 transition-colors"
            >
              Components
            </NuxtLink>
          </nav>
        </div>
        <div class="flex items-center gap-3 text-sm">
          <span class="text-colorNeutralForeground3">v0.0.1</span>
          <!--
            导航栏的按钮一律复用组件库的 FluereButton（站点自身即组件库的第一消费方）：
            GitHub 是外链，仍以按钮承载动作（组件库只提供 <button> 语义），由脚本开新标签页；
            outline + medium 与原手写样式的边框/内边距/高度对齐，视觉零漂移。
          -->
          <FluereButton
            appearance="outline"
            size="medium"
            title="在新标签页打开 GitHub 仓库"
            @click="openRepository"
          >
            GitHub
          </FluereButton>
          <ThemeToggle />
        </div>
      </div>
    </header>

    <!-- Mobile nav -->
    <nav
      class="lg:hidden max-w-7xl mx-auto px-6 pt-4 overflow-x-auto whitespace-nowrap"
      aria-label="组件导航"
    >
      <div class="flex gap-2 text-sm">
        <NuxtLink
          to="/components"
          class="px-3 py-1.5 rounded-fluent-md transition-colors"
          :class="
            route.path === '/components'
              ? 'bg-colorBrandBackground text-colorNeutralForegroundOnBrand font-medium'
              : 'bg-colorNeutralBackground1 text-colorNeutralForeground2 border border-colorNeutralStroke1'
          "
        >
          Overview
        </NuxtLink>
        <NuxtLink
          v-for="item in componentNavGroups.flatMap((g) => g.items).filter((i) => i.implemented)"
          :key="item.slug"
          :to="`/components/${item.slug}`"
          class="px-3 py-1.5 rounded-fluent-md transition-colors"
          :class="
            isActive(item.slug)
              ? 'bg-colorBrandBackground text-colorNeutralForegroundOnBrand font-medium'
              : 'bg-colorNeutralBackground1 text-colorNeutralForeground2 border border-colorNeutralStroke1'
          "
        >
          {{ item.name }}
        </NuxtLink>
      </div>
    </nav>

    <div class="max-w-7xl mx-auto px-6 flex gap-8 items-start">
      <!-- Sidebar -->
      <aside class="hidden lg:block w-60 shrink-0 sticky top-14 h-[calc(100vh-3.5rem)]">
        <FluereScrollView class="h-full">
          <nav class="space-y-7 py-4 pr-4">
            <NuxtLink
              to="/components"
              class="block px-3 py-1.5 rounded-fluent-md text-sm transition-colors"
              :class="
                route.path === '/components'
                  ? 'bg-colorBrandBackground text-colorNeutralForegroundOnBrand font-medium'
                  : 'text-colorNeutralForeground2 hover:bg-colorSubtleBackgroundHover hover:text-colorNeutralForeground1'
              "
            >
              Overview
            </NuxtLink>

            <section
              v-for="group in componentNavGroups"
              :key="group.id"
            >
              <h3
                class="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-colorNeutralForeground3"
              >
                {{ group.title }}
                <span class="ml-1 font-normal normal-case text-colorNeutralForeground3">{{
                  group.label
                }}</span>
              </h3>
              <ul class="space-y-0.5">
                <li
                  v-for="item in group.items"
                  :key="item.slug"
                >
                  <NuxtLink
                    v-if="item.implemented"
                    :to="`/components/${item.slug}`"
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
                      未实现
                    </span>
                  </span>
                </li>
              </ul>
            </section>
          </nav>
        </FluereScrollView>
      </aside>

      <!-- Content -->
      <main class="flex-1 min-w-0 p-fluent-xxxl">
        <slot />
      </main>
    </div>
  </div>
</template>
