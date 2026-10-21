/* oxlint-disable import/no-nodejs-modules -- 契约测试需要读 apps/docs 的 CSS / SFC 源码 */
/**
 * 文档站代码块样式的**源码契约测试**（`apps/docs/assets/content-code.css`）。
 *
 * 为什么读源码而不是挂载测量：jsdom 不解析 `var()`（见 docs/style-spec §7.1），
 * `getComputedStyle` 拿到的背景 / 圆角 / 描边全是空串；因此这里只用文本断言守住
 * 三条「光看截图看不出来、单测也不会失败」的约束：
 *
 *   ① **独立代码卡面必须排除 demo-block `#code` 槽**（`.docs-prose pre.shiki`
 *      用 `:not(.demo-block__code *)` 选中）。一旦有人图省事去掉 `:not`，
 *      demo-block 的代码区就会「卡片里再套一层卡片」—— 视觉上只是多一圈边框，
 *      很容易漏掉。
 *   ② **深色切换只改 color / 字形，不改 background**。@nuxt/content 会清空 Shiki
 *      `<pre>` 的内联样式（未配置 wrapperStyle），`--shiki-*-bg` 未定义；写
 *      `background-color: var(--shiki-dark-bg) !important` 是「计算值阶段非法」的
 *      声明，会把 background 重置为 initial，把卡面底色压掉（实战踩过）。
 *   ③ **独立卡面与 `#code` 区字号 / 行高保持一致**（13px / 1.6），避免两块代码
 *      排版各走一套。
 *
 * 视觉值本身（底色 / 描边 / 圆角 / 明暗取值）由真实浏览器测量，结论写在
 * content-code.css 的文件头注释里；本测试只断言「声明式约束」。
 */
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/** `apps/docs` 根（本测试文件位于 apps/docs/utils/__tests__/） */
const docsRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

/** 去掉注释（契约断言不应被注释里的示例 / 说明文字误伤） */
const stripComments = (text: string): string =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')

const contentCodeCss = stripComments(
  readFileSync(join(docsRoot, 'assets', 'content-code.css'), 'utf8'),
)
const demoBlockVue = stripComments(
  readFileSync(join(docsRoot, 'components', 'content', 'demo-block.vue'), 'utf8'),
)

/** 取出指定选择器后的第一条规则体（选择器需唯一，取 `{` 到下一个 `}`）。 */
const ruleBody = (css: string, selector: string): string => {
  const start = css.indexOf(selector)
  expect(start, `未找到选择器：${selector}`).toBeGreaterThanOrEqual(0)
  const brace = css.indexOf('{', start)
  expect(brace, `选择器缺规则体：${selector}`).toBeGreaterThanOrEqual(0)
  const end = css.indexOf('}', brace)
  return css.slice(brace + 1, end)
}

/** 独立代码卡面的选择器（必须排除 demo-block 的 #code 槽）。 */
const CARD_SELECTOR = '.docs-prose pre.shiki:not(.demo-block__code *)'

describe('代码块样式：独立卡面', () => {
  it('选择器排除 demo-block #code 槽（防「卡片套卡片」）', () => {
    expect(contentCodeCss).toContain(`${CARD_SELECTOR} {`)
    expect(contentCodeCss).toContain(`${CARD_SELECTOR} code {`)
  })

  it('卡面用令牌声明表面：背景 / 描边 / 圆角', () => {
    const card = ruleBody(contentCodeCss, CARD_SELECTOR)
    expect(card).toContain('background-color: var(--colorNeutralBackground1)')
    expect(card).toContain('border: var(--strokeWidthThin) solid var(--colorNeutralStroke1)')
    expect(card).toContain('border-radius: var(--borderRadiusXLarge)')
    // 间距同样走 token，不写 magic number。
    expect(card).toContain('padding: var(--spacingVerticalM) var(--spacingHorizontalL)')
    expect(card).toContain('margin-block: var(--spacingVerticalL)')
    // 长行在卡面内滚动，不撑宽正文容器。
    expect(card).toContain('overflow-x: auto')
  })

  it('卡面不写硬编码色值', () => {
    const card = ruleBody(contentCodeCss, CARD_SELECTOR)
    expect(card).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i)
  })

  it('与 demo-block #code 区排版一致（13px / 1.6）', () => {
    const card = ruleBody(contentCodeCss, CARD_SELECTOR)
    const demoCode = ruleBody(demoBlockVue, ':deep(pre.shiki)')
    for (const body of [card, demoCode]) {
      expect(body).toContain('font-size: 13px')
      expect(body).toContain('line-height: 1.6')
    }
  })
})

describe('代码块样式：深色主题切换', () => {
  it('只切 color / 字形，不写 background（--shiki-*-bg 未定义，写了会压掉卡面）', () => {
    // 整份文件都不应再出现对背景变量的覆写（两套暗色规则都不许）。
    expect(contentCodeCss).not.toContain('--shiki-dark-bg')
    expect(contentCodeCss).toContain('color: var(--shiki-dark) !important')
    expect(contentCodeCss).toContain('font-style: var(--shiki-dark-font-style) !important')
    expect(contentCodeCss).toContain('font-weight: var(--shiki-dark-font-weight) !important')
    expect(contentCodeCss).toContain(
      'text-decoration: var(--shiki-dark-text-decoration) !important',
    )
  })

  it('手动切换（data-color-mode）与系统偏好两条路径都在', () => {
    expect(contentCodeCss).toContain("html[data-color-mode='dark'] .shiki")
    expect(contentCodeCss).toContain('@media (prefers-color-scheme: dark)')
    expect(contentCodeCss).toContain('html:not([data-color-mode]) .shiki')
  })
})
