<script setup lang="ts">
import { FluereButton } from '@fluere-vue/ui'

/** 仓库地址（外链） */
const REPOSITORY_URL = 'https://github.com/'

const navLinks = [
  { label: 'Docs', to: '/components' },
  { label: 'Components', to: '/components/button' },
]

/** 外链在新标签页打开；noopener/noreferrer 与 <a rel> 语义等价 */
const openRepository = () => {
  window.open(REPOSITORY_URL, '_blank', 'noopener,noreferrer')
}

const features = [
  {
    title: 'Accessibility out of the box.',
    subtitle: '遵循 WAI-ARIA 设计规范',
    items: [
      'WAI-ARIA compliant',
      'Keyboard navigation',
      'Focus management',
      'Screen reader support',
    ],
  },
  {
    title: 'Save time. Ship faster.',
    subtitle: '精心打磨的组件体系',
    items: ['丰富的基础组件', '一致的 API 设计', '开箱即用', '可组合的结构'],
  },
  {
    title: 'Developer Experience First.',
    subtitle: 'Unstyled, Customizable, Familiar API',
    items: [
      '完全可定制的样式',
      '与 UnoCSS 无缝集成',
      'TypeScript 类型友好',
      'Fluent Design 令牌系统',
    ],
  },
]

const stats = [
  { value: '40+', label: 'Components 组件' },
  { value: '100%', label: 'TypeScript 类型' },
  { value: 'MIT', label: 'License 许可' },
]

const ctLinks = [
  {
    title: 'Install and Setup',
    desc: '了解如何在项目中安装和配置 FluereVue，并构建和样式化你的第一个组件。',
    to: '/components',
  },
  {
    title: 'Browse components',
    desc: '查看 FluereVue 提供的所有组件和工具。',
    to: '/components/button',
  },
  {
    title: 'Explore Themes',
    desc: '探索 Fluent Design 主题系统和设计令牌。',
    to: '/components',
  },
]
</script>

<template>
  <div class="min-h-screen bg-colorNeutralBackground1 text-colorNeutralForeground1 font-base">
    <!-- Nav -->
    <header
      class="sticky top-0 z-10 backdrop-blur-md bg-colorNeutralBackground1/80 border-b border-colorNeutralStroke1"
    >
      <div class="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
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
              v-for="link in navLinks"
              :key="link.to"
              :to="link.to"
              class="hover:text-colorNeutralForeground1 transition-colors"
            >
              {{ link.label }}
            </NuxtLink>
          </nav>
        </div>
        <div class="flex items-center gap-3 text-sm">
          <span class="text-colorNeutralForeground3">v0.0.1</span>
          <!-- 与 /components 布局同款：导航按钮复用组件库 Button；首页此前缺少主题切换入口 -->
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

    <main>
      <!-- Hero -->
      <section class="relative overflow-hidden">
        <div class="absolute inset-0 -z-10">
          <div
            class="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-fluent-circular bg-colorBrandBackground/10 blur-[120px]"
          ></div>
        </div>
        <div class="max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
          <a
            href="#"
            class="inline-flex items-center gap-2 px-3 py-1 rounded-fluent-circular border border-colorNeutralStroke1 bg-colorNeutralBackground2 text-xs text-colorNeutralForeground2 mb-8 hover:border-colorBrandStroke1 transition-colors"
          >
            <span class="w-1.5 h-1.5 rounded-fluent-circular bg-colorBrandBackground"></span>
            New: Button & Input 组件已发布
            <span class="text-colorNeutralForeground3">→</span>
          </a>
          <h1 class="text-5xl md:text-6xl font-bold tracking-tight leading-tight mb-6">
            Craft accessible web apps
            <br />
            <span
              class="bg-gradient-to-r from-colorBrandForeground1 to-colorCompoundBrandForeground1 bg-clip-text text-transparent"
            >
              with Vue 3
            </span>
          </h1>
          <p class="text-lg text-colorNeutralForeground2 max-w-2xl mx-auto mb-10 leading-relaxed">
            一个基于
            <a
              href="#"
              class="text-colorBrandForegroundLink hover:underline"
              >Fluent Design 2</a
            >
            设计规范的开源组件库， 提供
            <a
              href="#"
              class="text-colorBrandForegroundLink hover:underline"
              >可组合</a
            >
            的组件， 以及丰富的
            <a
              href="#"
              class="text-colorBrandForegroundLink hover:underline"
              >使用示例</a
            >， 随时可以集成到你的项目中。
          </p>
          <div class="flex items-center justify-center gap-4">
            <NuxtLink
              to="/components"
              class="px-5 py-2.5 rounded-fluent-md bg-colorBrandBackground text-colorNeutralForegroundOnBrand font-medium hover:bg-colorBrandBackgroundHover active:bg-colorBrandBackgroundPressed transition-colors"
            >
              Get started
            </NuxtLink>
            <NuxtLink
              to="/components/button"
              class="px-5 py-2.5 rounded-fluent-md border border-colorNeutralStroke1 text-colorNeutralForeground1 font-medium hover:bg-colorNeutralBackground1Hover transition-colors"
            >
              Explore components
            </NuxtLink>
          </div>
        </div>
      </section>

      <!-- Code preview -->
      <section class="max-w-4xl mx-auto px-6 pb-24">
        <div class="rounded-fluent-xl border border-colorNeutralStroke1 overflow-hidden shadow-8">
          <div
            class="flex items-center justify-between h-10 bg-colorNeutralBackground2/90 backdrop-blur-md border-b border-colorNeutralStroke1"
          >
            <div class="flex items-center gap-2 pl-4 pr-2 select-none">
              <svg
                class="w-4 h-4 text-colorNeutralForeground3"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                stroke-width="1.2"
                aria-hidden="true"
              >
                <path
                  d="M3 1.5h6l4 4v9H3z"
                  stroke-linejoin="round"
                />
                <path
                  d="M9 1.5v4h4"
                  stroke-linejoin="round"
                />
              </svg>
              <span class="text-xs text-colorNeutralForeground2 font-mono">App.vue</span>
            </div>
            <div class="flex items-center h-full">
              <button
                type="button"
                aria-label="Minimize"
                class="w-11 h-full flex items-center justify-center text-colorNeutralForeground2 hover:bg-colorSubtleBackgroundHover active:bg-colorSubtleBackgroundPressed transition-colors duration-fluent-faster"
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  aria-hidden="true"
                >
                  <path
                    d="M0.5 5.5h9"
                    stroke="currentColor"
                    stroke-width="1.1"
                    stroke-linecap="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                aria-label="Maximize"
                class="w-11 h-full flex items-center justify-center text-colorNeutralForeground2 hover:bg-colorSubtleBackgroundHover active:bg-colorSubtleBackgroundPressed transition-colors duration-fluent-faster"
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.1"
                  aria-hidden="true"
                >
                  <rect
                    x="1"
                    y="1"
                    width="7"
                    height="7"
                    rx="0.5"
                  />
                </svg>
              </button>
              <button
                type="button"
                aria-label="Close"
                class="w-11 h-full flex items-center justify-center text-colorNeutralForeground1 hover:bg-colorStatusDangerBackground3 hover:text-colorNeutralForegroundStaticInverted active:bg-colorStatusDangerBackground3Pressed transition-colors duration-fluent-faster"
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  stroke="currentColor"
                  stroke-width="1.1"
                  stroke-linecap="round"
                  aria-hidden="true"
                >
                  <path d="M1 1l8 8" />
                  <path d="M9 1L1 9" />
                </svg>
              </button>
            </div>
          </div>
          <pre
            class="bg-colorNeutralBackground2 p-6 text-sm font-mono leading-relaxed overflow-x-auto"
          ><code><span class="text-colorNeutralForeground3">&lt;script setup lang="ts"&gt;</span>
<span class="text-colorBrandForeground1">import</span> { Button } <span class="text-colorBrandForeground1">from</span> <span class="text-colorStatusSuccessForeground1">'@winui-vue/ui'</span>
<span class="text-colorNeutralForeground3">&lt;/script&gt;</span>

<span class="text-colorNeutralForeground3">&lt;template&gt;</span>
  <span class="text-colorStatusSuccessForeground1">&lt;Button</span> <span class="text-colorBrandForeground1">appearance</span>=<span class="text-colorStatusDangerForeground1">"primary"</span><span class="text-colorStatusSuccessForeground1">&gt;</span>
    Click me
  <span class="text-colorStatusSuccessForeground1">&lt;/Button&gt;</span>
<span class="text-colorNeutralForeground3">&lt;/template&gt;</span></code></pre>
        </div>
      </section>

      <!-- Features -->
      <section class="border-t border-colorNeutralStroke1 py-24">
        <div class="max-w-6xl mx-auto px-6">
          <div class="grid md:grid-cols-3 gap-8">
            <div
              v-for="feature in features"
              :key="feature.title"
              class="space-y-4"
            >
              <h3 class="text-xl font-semibold">{{ feature.title }}</h3>
              <p class="text-sm text-colorNeutralForeground2">{{ feature.subtitle }}</p>
              <ul class="space-y-2 pt-2">
                <li
                  v-for="item in feature.items"
                  :key="item"
                  class="flex items-center gap-2 text-sm text-colorNeutralForeground2"
                >
                  <svg
                    class="w-4 h-4 text-colorBrandForeground1"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path
                      d="M20 6 9 17l-5-5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                  {{ item }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <!-- Stats -->
      <section class="border-t border-colorNeutralStroke1 py-20">
        <div class="max-w-4xl mx-auto px-6">
          <div class="grid grid-cols-3 gap-8 text-center">
            <div
              v-for="stat in stats"
              :key="stat.label"
              class="space-y-2"
            >
              <div
                class="text-4xl md:text-5xl font-bold bg-gradient-to-r from-colorBrandForeground1 to-colorCompoundBrandForeground1 bg-clip-text text-transparent"
              >
                {{ stat.value }}
              </div>
              <div class="text-sm text-colorNeutralForeground3">{{ stat.label }}</div>
            </div>
          </div>
        </div>
      </section>

      <!-- CTA cards -->
      <section class="border-t border-colorNeutralStroke1 py-24">
        <div class="max-w-6xl mx-auto px-6">
          <h2 class="text-3xl font-bold text-center mb-4">Ready to get started?</h2>
          <p class="text-colorNeutralForeground2 text-center mb-12 max-w-xl mx-auto">
            无论你是在构建内部工具还是面向客户的产品，FluereVue 都能帮你快速打造流畅的用户界面。
          </p>
          <div class="grid md:grid-cols-3 gap-6">
            <NuxtLink
              v-for="card in ctLinks"
              :key="card.title"
              to="/components"
              class="group p-6 rounded-fluent-xl border border-colorNeutralStroke1 bg-colorNeutralBackground1 hover:bg-colorNeutralBackground1Hover hover:border-colorBrandStroke1 transition-all"
            >
              <h3
                class="font-semibold mb-2 group-hover:text-colorBrandForeground1 transition-colors"
              >
                {{ card.title }} →
              </h3>
              <p class="text-sm text-colorNeutralForeground2 leading-relaxed">
                {{ card.desc }}
              </p>
            </NuxtLink>
          </div>
        </div>
      </section>
    </main>

    <!-- Footer -->
    <footer class="border-t border-colorNeutralStroke1 py-10">
      <div
        class="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-colorNeutralForeground3"
      >
        <div class="flex items-center gap-2">
          <div
            class="w-5 h-5 rounded-fluent-md bg-colorBrandBackground text-colorNeutralForegroundOnBrand flex items-center justify-center text-xs font-bold"
          >
            W
          </div>
          FluereVue
        </div>
        <div>© 2026 FluereVue. MIT License.</div>
      </div>
    </footer>
  </div>
</template>
