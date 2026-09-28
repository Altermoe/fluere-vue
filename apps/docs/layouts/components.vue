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

/** 内容区顶部偏移（水平 / 垂直同值，均为 0） */
const CONTENT_TOP_OFFSET = 0

/**
 * 右侧主内容区的滚动由 FluereScrollView 接管（结构见模板注释）。
 * 文档级滚动被 app shell 关闭后，「切换组件页回到顶部」不再由浏览器负责，
 * 因此这里显式把内容区偏移复位：`animationMode: 'disabled'` 即瞬时复位，
 * 与原先浏览器对 document 的复位等价（不引入一段多余滚动动画）。
 */
const contentScrollView = ref<InstanceType<typeof FluereScrollView>>()

watch(
  () => route.fullPath,
  () => {
    contentScrollView.value?.scrollTo(CONTENT_TOP_OFFSET, CONTENT_TOP_OFFSET, {
      animationMode: 'disabled',
    })
  },
)
</script>

<template>
  <!--
    app shell：整屏 flex 列，高度锁定到视口，文档级滚动由此关闭。
    桌面端左右两栏各自用 FluereScrollView 承担内部滚动（左：组件导航，右：主内容），
    对齐 WinUI 窗口内「NavigationView + 独立滚动内容区」的结构；移动端只剩主内容一栏，
    同一套 shell 让内容区仍由 FluereScrollView 滚动，不退回文档级滚动。
    ScrollView 的 presenter 是绝对定位，宿主必须有确定高度（见文件末尾 .docs-shell）。
  -->
  <div
    class="docs-shell flex flex-col overflow-hidden bg-colorNeutralBackground2 text-colorNeutralForeground1 font-base"
  >
    <!-- Header：shell 自身不滚动，无需 sticky 也始终贴顶 -->
    <header
      class="shrink-0 z-10 backdrop-blur-md bg-colorNeutralBackground1/80 border-b border-colorNeutralStroke1"
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
      class="lg:hidden shrink-0 w-full max-w-7xl mx-auto px-6 pt-4 overflow-x-auto whitespace-nowrap"
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

    <!-- 两栏区：flex-1 + min-h-0 吃掉 header / 移动端 nav 之外的剩余高度；
         align-items 保持默认 stretch，两栏才能拿到确定高度供 ScrollView 撑满 -->
    <div class="w-full max-w-7xl mx-auto px-6 flex gap-8 flex-1 min-h-0">
      <!-- Sidebar -->
      <aside class="hidden lg:block w-60 shrink-0 min-h-0">
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

      <!-- Content：主内容滚动改由 FluereScrollView 承担（原先跟随文档级滚动）。
           内边距放进滚动内容里，滚动条才会贴住内容区右缘，而不是浮在留白中间。 -->
      <main class="flex-1 min-w-0 min-h-0">
        <FluereScrollView
          ref="contentScrollView"
          class="h-full"
        >
          <div class="p-fluent-xxxl">
            <slot />
          </div>
        </FluereScrollView>
      </main>
    </div>
  </div>
</template>

<style scoped>
/*
 * app shell 高度：dvh 优先（移动端地址栏收放会改变可见视口高度），
 * 不支持 dvh 的旧浏览器回退 vh。必须是确定高度，否则 FluereScrollView 的
 * 绝对定位 presenter 会塌成 0 高、内容不可见。
 */
.docs-shell {
  height: 100vh;
  height: 100dvh;
}
</style>
