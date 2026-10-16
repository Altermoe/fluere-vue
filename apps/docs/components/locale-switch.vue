<script setup lang="ts">
/**
 * 语言切换按钮（一期临时安置在文档页 header，紧邻 ThemeToggle）。
 *
 * 实现：
 *  - `useSwitchLocalePath`：返回「当前路由在目标语种下的等价路径」，切换后不丢位置
 *    （zh-Hans 无前缀、en 走 /en，见 nuxt.config 的 strategy: 'prefix_except_default'）；
 *  - `setLocale` 同步语言状态；偏好由 `detectBrowserLanguage.useCookie`
 *    （cookieKey 'fluere-docs-locale'）持久化。
 *
 * 最终落位属 todo 目标 2（托盘 / 任务栏）；这里只在 header 提供正式入口，
 * 供一期验收「/」（中文）与「/en」两种语言手动切换。
 *
 * 提示（0.5.7）：不再用原生 `title`，改 `FluereTooltip`。本组件同时被
 * `/os` 任务栏托盘消费（shell-chrome.vue），与任务栏其余图标的提示保持同一手感。
 */
import { FluereTooltip } from '@fluere-vue/ui'

const { locale, setLocale } = useI18n()
const switchLocalePath = useSwitchLocalePath()

const SWITCHABLE = ['zh-Hans', 'en'] as const
type SwitchLocale = (typeof SWITCHABLE)[number]

/** 按钮上显示的缩写：zh-Hans → 中，en → EN；展示「可切换到的目标语种」。 */
const LOCALE_ABBR: Record<SwitchLocale, string> = { 'zh-Hans': '中', 'en': 'EN' }

const current = computed<SwitchLocale>(() => (locale.value === 'en' ? 'en' : 'zh-Hans'))
const switchTo = computed<SwitchLocale>(() => (current.value === 'en' ? 'zh-Hans' : 'en'))

const switchLocale = () => {
  const target = switchTo.value
  setLocale(target)
  navigateTo(switchLocalePath(target))
}
</script>

<template>
  <!--
    提示走 `FluereTooltip`（不再是原生 `title`）：本按钮在 `/os` 任务栏托盘里，
    与任务栏其余图标的提示同一套手感与层级（外壳登记层级栈，见 desktop-shell.vue）。
    文案沿用本组件既有的两条字面量（aria-label 原本就是它们，未走 i18n key）——
    这里只把「同一条文案供 aria-label 与提示共用」写清楚，不改文案来源。
  -->
  <FluereTooltip
    :content="switchTo === 'en' ? 'Switch to English' : '切换到中文'"
    placement="top"
  >
    <button
      type="button"
      class="flex h-8 min-w-8 items-center justify-center rounded-fluent-md border border-colorNeutralStroke1 px-2 text-xs font-medium text-colorNeutralForeground2 transition-colors hover:bg-colorSubtleBackgroundHover hover:text-colorNeutralForeground1 active:bg-colorSubtleBackgroundPressed"
      :aria-label="switchTo === 'en' ? 'Switch to English' : '切换到中文'"
      @click="switchLocale"
    >
      {{ LOCALE_ABBR[switchTo] }}
    </button>
  </FluereTooltip>
</template>
