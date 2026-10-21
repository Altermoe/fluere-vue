/**
 * `apps/docs/utils/rehype-vue-template-snippet.mjs` 的契约测试。
 *
 * 背景：Shiki 的 `vue`（SFC）语法只在顶层 `<template>` / `<script>` / `<style>`
 * 块里开启 HTML 子语法，组件模板片段（如 `<FluereSplitButton>…`）的嵌套子元素会
 * 整段丢失高亮。插件在 rehype 阶段（highlight 之前）把这类围栏的 language 改标成
 * `vue-html`，由 @nuxtjs/mdc 的内置映射换成 `vue` + `grammarContextCode: '<template>'`。
 *
 * 这里只测「改写判定」这条纯逻辑；Shiki / MDC 的实际渲染结果由真实浏览器截图与
 * `pnpm docs:generate` 的产物验证（见 nuxt.config.ts 里的注册注释）。
 */
import { describe, expect, it } from 'vitest'
import rehypeVueTemplateSnippet, { isVueTemplateSnippet } from '../rehype-vue-template-snippet.mjs'

interface TextNode {
  type: 'text'
  value: string
}

interface ElementNode {
  type: 'element'
  tagName: string
  properties: Record<string, unknown>
  children: (ElementNode | TextNode)[]
}

interface RootNode {
  type: 'root'
  children: ElementNode[]
}

/** 构造 rehype 阶段（highlight 之前）的 `<pre><code>源码</code></pre>` 节点。 */
function createPre(code: string, language = 'vue'): ElementNode {
  return {
    type: 'element',
    tagName: 'pre',
    properties: { language },
    children: [
      {
        type: 'element',
        tagName: 'code',
        properties: {},
        children: [{ type: 'text', value: code }],
      },
    ],
  }
}

/** 跑一遍插件，返回 `<pre>` 节点（就地改写，返回便于断言）。 */
function transform(pre: ElementNode, pluginsTree?: ElementNode[]): ElementNode {
  const tree: RootNode = { type: 'root', children: pluginsTree ?? [pre] }
  rehypeVueTemplateSnippet()(tree as unknown as object)
  return pre
}

const SPLIT_BUTTON_SNIPPET = `<FluereSplitButton label="新建" @click="createDocument" @select="onCommand">
  新建
  <template #flyout>
    <FluereMenuFlyoutItem text="文件夹" value="folder" />
  </template>
</FluereSplitButton>`

const FULL_SFC = `<script setup lang="ts">
const open = ref(false)
</script>

<template>
  <FluereButton @click="open = true">打开</FluereButton>
</template>`

describe('isVueTemplateSnippet：围栏判定', () => {
  it('组件模板片段（含嵌套 <template #slot>）→ 片段', () => {
    expect(isVueTemplateSnippet(SPLIT_BUTTON_SNIPPET)).toBe(true)
    expect(isVueTemplateSnippet('<FluereButton appearance="primary">提交</FluereButton>')).toBe(
      true,
    )
    expect(isVueTemplateSnippet('<div>\n  <span>嵌套</span>\n</div>')).toBe(true)
  })

  it('以插槽 <template #x> / <template v-slot:x> 开头 → 片段', () => {
    expect(
      isVueTemplateSnippet(
        '<template #item="{ item }">\n  <span>{{ item.text }}</span>\n</template>',
      ),
    ).toBe(true)
    expect(isVueTemplateSnippet('<template v-slot:footer>\n  <span>确定</span>\n</template>')).toBe(
      true,
    )
  })

  it('完整 SFC（<script> / <style> 开头）→ 不换语言', () => {
    expect(isVueTemplateSnippet(FULL_SFC)).toBe(false)
    expect(isVueTemplateSnippet('<style scoped>\n.x { color: red }\n</style>')).toBe(false)
  })

  it('SFC 模板块（裸 <template> 开头）→ 不换语言', () => {
    expect(
      isVueTemplateSnippet('<template>\n  <FluereButton>提交</FluereButton>\n</template>'),
    ).toBe(false)
    expect(isVueTemplateSnippet('<template lang="pug">\ntemplate\n</template>')).toBe(false)
  })

  it('纯 JS / 注释 → 不换语言（保持 vue 原有行为）', () => {
    expect(isVueTemplateSnippet("import { ref } from 'vue'\nconst a = ref(0)")).toBe(false)
    expect(isVueTemplateSnippet('// 只是一段注释\nconst a = 1')).toBe(false)
    expect(isVueTemplateSnippet('')).toBe(false)
  })
})

describe('rehypeVueTemplateSnippet：改写围栏 language', () => {
  it('模板片段 → vue-html', () => {
    const pre = createPre(SPLIT_BUTTON_SNIPPET)
    transform(pre)
    expect(pre.properties.language).toBe('vue-html')
  })

  it('完整 SFC → 保持 vue', () => {
    const pre = createPre(FULL_SFC)
    transform(pre)
    expect(pre.properties.language).toBe('vue')
  })

  it('只改 vue，其它语言（html / ts）原样不动', () => {
    for (const language of ['html', 'ts', 'json', 'vue-html']) {
      const pre = createPre(SPLIT_BUTTON_SNIPPET, language)
      transform(pre)
      expect(pre.properties.language).toBe(language)
    }
  })

  it('语言名大小写不敏感（Vue → 仍按 vue 处理）', () => {
    const pre = createPre(SPLIT_BUTTON_SNIPPET, 'Vue')
    transform(pre)
    expect(pre.properties.language).toBe('vue-html')
  })

  it('不误伤行内 <code>（没有 language / 不在 pre 内）', () => {
    const inlineCode: ElementNode = {
      type: 'element',
      tagName: 'code',
      properties: {},
      children: [{ type: 'text', value: '<FluereButton>' }],
    }
    transform(createPre('', 'text'), [inlineCode])
    expect(inlineCode.properties).toEqual({})
  })

  it('递归遍历：包在 blockquote 等容器里的围栏同样改标', () => {
    const pre = createPre(SPLIT_BUTTON_SNIPPET)
    const blockquote: ElementNode = {
      type: 'element',
      tagName: 'blockquote',
      properties: {},
      children: [pre],
    }
    rehypeVueTemplateSnippet()({ type: 'root', children: [blockquote] } as unknown as object)
    expect(pre.properties.language).toBe('vue-html')
  })
})
