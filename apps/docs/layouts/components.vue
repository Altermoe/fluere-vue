<script setup lang="ts">
import { FluentIconNavigation24Regular } from '@fluere-vue/icons'
import { FluereButton, FluereScrollView } from '@fluere-vue/ui'

/** 仓库地址（外链） */
const REPOSITORY_URL = 'https://github.com/'

const route = useRoute()
const { open, toggle } = useDocsSidebar()

/** 外链在新标签页打开；noopener/noreferrer 与 <a rel> 语义等价 */
const openRepository = () => {
  window.open(REPOSITORY_URL, '_blank', 'noopener,noreferrer')
}

/** 内容区顶部偏移（水平 / 垂直同值，均为 0） */
const CONTENT_TOP_OFFSET = 0

/**
 * 主内容区的滚动由 FluereScrollView 接管（结构见模板注释）。
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
    app shell：整体锁定到视口高度（dvh），文档级滚动由此关闭。
    - FluereScrollView 绝对定位占满整个视口 → 滚动视口是「整页」而非仅内容区，
      鼠标落在右侧任何留白（含超宽屏容器外边距）滚轮都能滚动；
    - header 悬浮叠加在滚动视口上（毛玻璃），内容从其下方滚过；
    - 左侧导航由 DocsSidebar 承担：桌面常驻栏贴视口左缘，移动端为抽屉浮层。
    ScrollView 的 presenter 是绝对定位，宿主必须有确定高度（见文件末尾 .docs-shell）。
  -->
  <div
    class="docs-shell relative overflow-hidden bg-colorNeutralBackground2 text-colorNeutralForeground1 font-base"
  >
    <!-- 整页滚动视口：占满视口。FluereScrollView 根节点自带 scoped `position: relative`
         （与工具类同特异性、组件样式注入更晚），不能直接在组件上定位，
         故用普通 div 包裹做定位，组件自身只负责填满（h-full）。
         pt-14 为悬浮 header 让出初始可视区；lg:pl 为常驻侧边栏
         （w-60=15rem + gap-8=2rem）让出横向空间，使文档内容对齐到侧边栏右缘之外。 -->
    <div class="absolute inset-0">
      <FluereScrollView
        ref="contentScrollView"
        class="h-full"
      >
        <div class="pt-14 lg:pl-[calc(15rem+2rem)]">
          <div class="mx-auto w-full max-w-7xl px-6">
            <div class="p-fluent-xxxl">
              <slot />
            </div>
          </div>
        </div>
      </FluereScrollView>
    </div>

    <!-- 侧边栏：桌面常驻 + 移动端抽屉，响应式逻辑全部内聚于此 -->
    <DocsSidebar />

    <!-- Header：悬浮叠加层，自身不滚动，内容从其下方滚过 -->
    <header
      class="absolute inset-x-0 top-0 z-40 border-b border-colorNeutralStroke1 bg-colorNeutralBackground1/80 backdrop-blur-md"
    >
      <div class="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <div class="flex items-center gap-3 md:gap-8">
          <!-- 移动端导航折叠按钮：仅 <lg 显示；图标取 WinUI 汉堡钮（Navigation）。
               外层 div 承担 lg:hidden——FluereButton 根节点自带 scoped display:flex，
               与工具类同特异性且组件样式注入更晚，直接在按钮上写 lg:hidden 会被覆盖。 -->
          <div class="lg:hidden">
            <FluereButton
              appearance="outline"
              size="medium"
              icon-only
              :aria-label="open ? '关闭组件导航' : '打开组件导航'"
              :title="open ? '关闭组件导航' : '打开组件导航'"
              @click="toggle"
            >
              <template #icon>
                <FluentIconNavigation24Regular :size="20" />
              </template>
            </FluereButton>
          </div>
          <NuxtLink
            to="/"
            class="flex items-center gap-2 font-semibold text-lg"
          >
            <div
              class="flex h-6 w-6 items-center justify-center rounded-fluent-md bg-colorBrandBackground text-xs font-bold text-colorBrandForegroundInverted"
            >
              W
            </div>
            FluereVue
          </NuxtLink>
          <nav class="hidden items-center gap-6 text-sm text-colorNeutralForeground2 md:flex">
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
