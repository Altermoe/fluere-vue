/**
 * rehype 插件：把「Vue 模板片段」的 ```vue 围栏改标成 `vue-html`。
 *
 * ## 为什么需要它
 *
 * Shiki 的 `vue` 语法（`@shikijs/langs/vue`，即 SFC 语法）只在**顶层 SFC 块**
 * （`<template>` / `<script>` / `<style>`）里开启 HTML 子语法：根状态只认「块标签 +
 * 属性」，元素内容一律退化为纯文本。于是文档里最常见的写法——
 *
 * ```vue
 * <FluereSplitButton label="新建">
 *   <template #flyout>
 *     <FluereMenuFlyoutItem text="文件夹" value="folder" />
 *   </template>
 * </FluereSplitButton>
 * ```
 *
 * ——第一层标签能高亮，但**嵌套子元素（含 `<template>` 插槽）整段丢失高亮**
 * （实测 `vue` 与 `html` 同一段代码对比：`html` 正常、`vue` 子级全灰）。
 *
 * `@nuxtjs/mdc` 的内置高亮器对 `vue-html` / `vue-template` 两个语言名做了映射：
 * 换成 `vue` 语法 + `grammarContextCode: '<template>'`，即「假设代码已经位于
 * SFC 的 `<template>` 块内」再解析——这正是模板片段需要的语法上下文。所以这里
 * 只改语言名，不动 shiki / mdc 的高亮管线（不碰内部实现，升级风险最小）。
 *
 * ## 判定规则（只对 `vue` 围栏生效）
 *
 * - 以 `<script` / `<style` 开头 → 完整 SFC，保持 `vue`；
 * - 以 `<template>` 开头且开标签**没有** `#` / `v-slot` → SFC 模板块，保持 `vue`
 *   （`vue` 语法本来就能正确高亮它，换 `vue-html` 结果相同）；
 * - 以 `<template #x>` / `<template v-slot:x>` 开头 → 插槽模板片段，改 `vue-html`；
 * - 其余以 `<` 开头 → 组件模板片段，改 `vue-html`；
 * - 不以 `<` 开头（纯 JS / 注释 / 文本）→ 保持 `vue`，交给 `vue` 语法的原有行为。
 *
 * 该插件在 `nuxt.config.ts` 的 `content.build.markdown.rehypePlugins` 注册，
 * 按 @nuxt/content 的约定排在 `highlight` 插件之前（后者恒为最后一个）。
 *
 * ## 验证
 *
 * - 判定逻辑：`__tests__/rehype-vue-template-snippet.test.ts` 覆盖「模板片段 /
 *   插槽片段 / 完整 SFC / 纯 JS / 非 vue 语言 / 容器内嵌围栏 / 大小写」；
 * - 渲染结果：dev 与 `nuxt generate` 产物里，split-button 页 `#flyout` 嵌套行
 *   从「整行 1 个 token」变成 5 个 token；25 个组件页 / 142 个 Shiki 块在 Chromium
 *   里逐页断言「不存在整行单一 token 的嵌套标签行」；生产构建（Nitro）中该绝对
 *   路径插件同样生效（`nuxt generate` 静态产物实测通过）。
 */

const SFC_BLOCK_RE = /^<(?:script|style)\b/i
const TEMPLATE_BLOCK_RE = /^<template\b/i
/** 插槽写法：`#flyout` / `v-slot:flyout`。出现在 `<template>` 开标签里即视为片段。 */
const SLOT_MARKER_RE = /(?:#|v-slot[:=])/i

/**
 * 读取节点的纯文本（围栏代码在 rehype 阶段还是 `<pre><code>文本</code></pre>`）。
 * @param {any} node
 * @returns {string}
 */
function textContent(node) {
  if (node.type === 'text') {
    return node.value
  }
  if (!Array.isArray(node.children)) {
    return ''
  }
  let text = ''
  for (const child of node.children) {
    text += textContent(child)
  }
  return text
}

/**
 * 判断围栏源码是否属于「Vue 模板片段」（而非完整 SFC / 纯 JS）。
 * @param {string} code
 * @returns {boolean}
 */
export function isVueTemplateSnippet(code) {
  const first = code.trimStart()
  // 纯 JS / 注释 / 其它文本：不动，避免把 JS 代码当成模板解析。
  if (!first.startsWith('<')) {
    return false
  }
  // `<script setup>` / `<style scoped>` 开头的完整 SFC。
  if (SFC_BLOCK_RE.test(first)) {
    return false
  }
  if (TEMPLATE_BLOCK_RE.test(first)) {
    const end = first.indexOf('>')
    const openTag = end === -1 ? first : first.slice(0, end + 1)
    // `<template>`（SFC 模板块）保持 vue；`<template #x>` / `<template v-slot:x>` 是插槽片段。
    return SLOT_MARKER_RE.test(openTag)
  }
  // 组件模板片段。
  return true
}

/**
 * 遍历 HAST（只用到 element / text 两种节点，故不引 hast 类型依赖）。
 * @param {any} node
 */
function visit(node) {
  if (
    node.type === 'element' &&
    node.tagName === 'pre' &&
    String(node.properties?.language ?? '').toLowerCase() === 'vue'
  ) {
    if (isVueTemplateSnippet(textContent(node))) {
      node.properties.language = 'vue-html'
    }
  }
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      visit(child)
    }
  }
}

/**
 * rehype 插件入口：遍历整棵 HAST，就地改写围栏代码块的 `language` 属性。
 * @returns {(tree: any) => void}
 */
export default function rehypeVueTemplateSnippet() {
  return (tree) => {
    visit(tree)
  }
}
