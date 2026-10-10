<script lang="ts">
/**
 * FluereConfigProvider 组件 Props 契约
 *
 * 组件库 i18n 的实例级 locale 注入点（基于 provide/inject，配合
 * `packages/hooks` 的 `provideLocale` / `useScopeMessages`）。
 *
 * 设计对齐 docs/todo.md 目标 1 · 1.4 与仓库「注入旗标做缺省」约定：
 *  - **实例级**，无全局可变单例 —— 每个 Provider 持有独立响应式 locale /
 *    messages，SSR 多请求（并发渲染）互不串语言；
 *  - 不入 `vue-i18n` 运行时：消息编译 / 解析 / 回退复用 `@intlify/core-base`
 *    （见 `packages/hooks/src/use-locale.ts` 顶部说明）；
 *  - 缺省不炸：不包 Provider 时，组件回落到内置缺省 locale zh-Hans。
 *
 * 解析优先级：显式文案 prop（如 `revealButtonLabel`）
 *   → 组件 `locale` prop（组件层处理）→ 本 Provider `locale` → 内置缺省 zh-Hans。
 * 缺 key 回退链 `zh-Hans → zh → en`；`en` 为终值兜底。
 */
import type { ProviderMessages } from '@fluere-vue/hooks'
import type { FluereLocale } from '@fluere-vue/utils'

export interface FluereConfigProviderProps {
  /**
   * 组件库内建文案所用的 locale（决定 loading/close/expand 等缺省可访问名）。
   * 归一由 hooks 完成（`zh-CN` / `zh` 都会落到 `zh-Hans`）；缺省 zh-Hans。
   * 可随文档站 / 应用当前语言切换而响应式更新。
   */
  locale?: FluereLocale | string

  /**
   * 按 locale × scope 的内建文案覆盖（不改源码也能改措辞）。
   * 结构 `{ 'zh-Hans': { input: { showPassword: '…' } }, en: { … } }`；
   * 只覆盖列出的 scope / key，其余仍取组件内置文案。
   */
  messages?: ProviderMessages
}
</script>

<script setup lang="ts">
import { provideLocale } from '@fluere-vue/hooks'

const props = defineProps<FluereConfigProviderProps>()

// 用 getter 传给 provideLocale，保证 props 变化（如文档站切语言）时响应式同步到后代
provideLocale({
  locale: () => props.locale,
  messages: () => props.messages,
})
</script>

<template>
  <slot />
</template>
