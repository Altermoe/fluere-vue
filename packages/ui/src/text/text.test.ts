/* oxlint-disable import/no-duplicates, prefer-named-capture-group, no-magic-numbers -- 样式契约测试要同时以运行时组件与 ?raw 源码两种形式导入同一 SFC；正则与下标属测试细节 */
import { tokenNames } from '@fluere-vue/designs/token-names'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, markRaw } from 'vue'
import FluereText from './text.vue'
import textSfc from './text.vue?raw'
import type { FluereTextVariant } from './types'

/**
 * FluereText 契约测试。
 *
 * jsdom 不解析 CSS 自定义属性（var()），拿不到可靠的计算样式，因此这里分两层：
 *   ① 渲染契约：标签 / 类名 / data-variant / 属性透传 / 插槽；
 *   ② 样式契约：从 SFC 源码解析「选择器 → 声明」，逐条断言 WinUI type ramp 的
 *      字号 / 行高 / 字重映射与 token 引用（见 docs/style-spec §7.1）。
 *
 * 对照来源：WinUI 3 `TextBlock_themeresources.xaml`（tag winui3/release/2.5.1，与
 * 2.0.1 逐字节一致）+ WinUI3 Gallery `TypographyPage.xaml` 的 `SizeLineHeight` 字符串。
 */
const readStyleText = (): string =>
  (/<style[^>]*>(?<css>[\s\S]*?)<\/style>/.exec(textSfc)?.groups?.css ?? '').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  )

const readStyleRules = (): Map<string, string> => {
  const rules = new Map<string, string>()
  const blocks = readStyleText()
    .replace(/@media[^{]*{/g, '')
    .split('}')
  for (const block of blocks) {
    const [selectorText, declarations] = block.split('{')
    if (selectorText !== undefined && declarations !== undefined) {
      const decl = declarations.replace(/\s+/g, ' ').trim()
      for (const selector of selectorText.split(',')) {
        const key = selector.replace(/\s+/g, ' ').trim()
        if (!key) {
          continue
        }
        const prev = rules.get(key)
        rules.set(key, prev ? `${prev} ${decl}` : decl)
      }
    }
  }
  return rules
}

const rules = readStyleRules()

/** 九档样式 → 期望的字号 / 行高 / 字重声明（逐条对应 WinUI `*TextBlockStyle`） */
const VARIANT_STYLES: Record<
  FluereTextVariant,
  { fontSize: string; fontWeight: string; lineHeight: string; styleName: string }
> = {
  caption: {
    fontSize: 'var(--fontSizeBase200)',
    fontWeight: 'var(--fontWeightRegular)',
    lineHeight: 'var(--lineHeightBase200)',
    styleName: 'CaptionTextBlockStyle',
  },
  body: {
    fontSize: 'var(--fontSizeBase300)',
    fontWeight: 'var(--fontWeightRegular)',
    lineHeight: 'var(--lineHeightBase300)',
    styleName: 'BodyTextBlockStyle',
  },
  bodyStrong: {
    fontSize: 'var(--fontSizeBase300)',
    fontWeight: 'var(--fontWeightSemibold)',
    lineHeight: 'var(--lineHeightBase300)',
    styleName: 'BodyStrongTextBlockStyle',
  },
  bodyLarge: {
    fontSize: 'var(--fui-text-body-large-font-size)',
    fontWeight: 'var(--fontWeightRegular)',
    lineHeight: 'var(--fui-text-body-large-line-height)',
    styleName: 'BodyLargeTextBlockStyle',
  },
  bodyLargeStrong: {
    fontSize: 'var(--fui-text-body-large-font-size)',
    fontWeight: 'var(--fontWeightSemibold)',
    lineHeight: 'var(--fui-text-body-large-line-height)',
    styleName: 'BodyLargeStrongTextBlockStyle',
  },
  subtitle: {
    fontSize: 'var(--fontSizeBase500)',
    fontWeight: 'var(--fontWeightSemibold)',
    lineHeight: 'var(--lineHeightBase500)',
    styleName: 'SubtitleTextBlockStyle',
  },
  title: {
    fontSize: 'var(--fontSizeHero700)',
    fontWeight: 'var(--fontWeightSemibold)',
    lineHeight: 'var(--lineHeightHero700)',
    styleName: 'TitleTextBlockStyle',
  },
  titleLarge: {
    fontSize: 'var(--fontSizeHero900)',
    fontWeight: 'var(--fontWeightSemibold)',
    lineHeight: 'var(--lineHeightHero900)',
    styleName: 'TitleLargeTextBlockStyle',
  },
  display: {
    fontSize: 'var(--fontSizeHero1000)',
    fontWeight: 'var(--fontWeightSemibold)',
    lineHeight: 'var(--lineHeightHero1000)',
    styleName: 'DisplayTextBlockStyle',
  },
}

const VARIANTS = Object.keys(VARIANT_STYLES) as FluereTextVariant[]

/** 读取某条规则的声明表：`font-size: x; line-height: y` → Map */
const declarationsOf = (rule: string): Map<string, string> => {
  const declarations = new Map<string, string>()
  for (const part of rule.split(';')) {
    const [property, value] = part.split(':')
    if (property !== undefined && value !== undefined) {
      declarations.set(property.trim(), value.trim())
    }
  }
  return declarations
}

describe('FluereText 渲染契约', () => {
  it('缺省渲染 span + body 档，并输出 data-variant 供样式/测试定位', () => {
    const wrapper = mount(FluereText, { slots: { default: () => '正文' } })
    const root = wrapper.find('span')
    expect(root.exists()).toBe(true)
    expect(root.text()).toBe('正文')
    expect(root.classes()).toContain('fui-text')
    expect(root.classes()).toContain('fui-text--body')
    expect(root.attributes('data-variant')).toBe('body')
    wrapper.unmount()
  })

  it('九档 variant 各自输出对应类名与 data-variant', () => {
    for (const variant of VARIANTS) {
      const wrapper = mount(FluereText, { props: { variant } })
      const root = wrapper.find('span')
      expect(root.classes()).toContain(`fui-text--${variant}`)
      expect(root.attributes('data-variant')).toBe(variant)
      wrapper.unmount()
    }
  })

  it('as 可换成语义标签（p / h1 / strong）', () => {
    const paragraph = mount(FluereText, { props: { as: 'p' } })
    expect(paragraph.find('p').exists()).toBe(true)
    paragraph.unmount()

    const heading = mount(FluereText, { props: { as: 'h1', variant: 'titleLarge' } })
    expect(heading.find('h1').classes()).toContain('fui-text--titleLarge')
    heading.unmount()

    const strong = mount(FluereText, { props: { as: 'strong', variant: 'bodyStrong' } })
    expect(strong.find('strong').exists()).toBe(true)
    strong.unmount()
  })

  it('as 传组件时也能渲染，并把 class / 属性透传到其单根节点', () => {
    const Box = markRaw(defineComponent({ render: () => h('div') }))
    const wrapper = mount(FluereText, {
      props: { as: Box, variant: 'caption' },
      attrs: { class: 'custom-text', id: 'caption-1' },
    })
    const root = wrapper.find('div')
    expect(root.exists()).toBe(true)
    expect(root.classes()).toEqual(
      expect.arrayContaining(['fui-text', 'fui-text--caption', 'custom-text']),
    )
    expect(root.attributes('id')).toBe('caption-1')
    wrapper.unmount()
  })

  it('truncate 输出截断类；缺省不输出', () => {
    const plain = mount(FluereText)
    expect(plain.find('span').classes()).not.toContain('fui-text--truncate')
    plain.unmount()

    const truncated = mount(FluereText, { props: { truncate: true } })
    expect(truncated.find('span').classes()).toContain('fui-text--truncate')
    truncated.unmount()
  })

  it('align 输出对齐类；缺省不输出', () => {
    const plain = mount(FluereText)
    expect(
      plain
        .find('span')
        .classes()
        .some((name) => name.startsWith('fui-text--align-')),
    ).toBe(false)
    plain.unmount()

    for (const align of ['start', 'center', 'end', 'justify'] as const) {
      const wrapper = mount(FluereText, { props: { align } })
      expect(wrapper.find('span').classes()).toContain(`fui-text--align-${align}`)
      wrapper.unmount()
    }
  })
})

describe('FluereText 样式契约（对齐 TextBlock_themeresources.xaml / type ramp）', () => {
  it('根节点固定字体家族与前景，并声明可覆盖的局部变量', () => {
    const root = declarationsOf(rules.get('.fui-text') ?? '')
    expect(root.get('font-family')).toBe('var(--fui-text-font-family)')
    expect(root.get('color')).toBe('var(--fui-text-foreground, var(--colorNeutralForeground1))')
    expect(root.get('font-optical-sizing')).toBe('auto')
    // TextBlock 缺省 Margin / Padding 都是 0（换成 p / h1 时不带浏览器外边距）
    expect(root.get('margin')).toBe('0')
    expect(root.get('padding')).toBe('0')
    // 不设 text-align：缺省对齐跟随父级（Web 可继承），与 WinUI 的「默认 Left」差异已写进注释
    expect(root.get('text-align')).toBeUndefined()
    // 字体：Segoe UI Variable 起头（XamlAutoFontFamily 在 WinUI 3 的落点），token 栈兜底
    expect(root.get('--fui-text-font-family')).toBe("'Segoe UI Variable', var(--fontFamilyBase)")
    // Body Large 18/24：token 表无同值档，落组件局部变量（依据 Gallery SizeLineHeight）
    expect(root.get('--fui-text-body-large-font-size')).toBe('18px')
    expect(root.get('--fui-text-body-large-line-height')).toBe('24px')
  })

  it('九档 variant 的字号 / 行高 / 字重逐项对齐 WinUI 样式', () => {
    for (const variant of VARIANTS) {
      const style = VARIANT_STYLES[variant]
      const declarations = declarationsOf(rules.get(`.fui-text--${variant}`) ?? '')
      expect(declarations.get('font-size'), variant).toBe(style.fontSize)
      expect(declarations.get('line-height'), variant).toBe(style.lineHeight)
      expect(declarations.get('font-weight'), variant).toBe(style.fontWeight)
    }
  })

  it('18px 档用局部变量表达（token 表无 18 / 24 档）', () => {
    for (const variant of ['bodyLarge', 'bodyLargeStrong'] as const) {
      const declarations = declarationsOf(rules.get(`.fui-text--${variant}`) ?? '')
      expect(declarations.get('font-size')).toBe('var(--fui-text-body-large-font-size)')
      expect(declarations.get('line-height')).toBe('var(--fui-text-body-large-line-height)')
    }
  })

  it('truncate = 单行 nowrap + ellipsis（TextTrimming 的 Web 映射）', () => {
    const declarations = declarationsOf(rules.get('.fui-text--truncate') ?? '')
    expect(declarations.get('display')).toBe('block')
    expect(declarations.get('overflow')).toBe('hidden')
    expect(declarations.get('text-overflow')).toBe('ellipsis')
    expect(declarations.get('white-space')).toBe('nowrap')
  })

  it('align 四档映射到 text-align', () => {
    for (const align of ['start', 'center', 'end', 'justify'] as const) {
      const declarations = declarationsOf(rules.get(`.fui-text--align-${align}`) ?? '')
      expect(declarations.get('text-align'), align).toBe(align)
    }
  })

  it('样式里引用的 token 都真实存在（防止拼写漂移）', () => {
    const variables = [...readStyleText().matchAll(/var\(--(?<name>[\w-]+)/g)]
      .map((match) => match.groups?.name ?? '')
      // --fui-text-* 是本组件的局部变量（含消费方覆盖口子），不要求出现在 token 表里
      .filter((name) => name && !name.startsWith('fui-text-'))
    expect(variables.length).toBeGreaterThan(0)
    for (const name of variables) {
      expect(tokenNames, `未定义的 token: --${name}`).toHaveProperty(name)
    }
  })

  it('样式里没有硬编码颜色（颜色只能走 token / 局部变量）', () => {
    const styleText = readStyleText()
    expect(styleText).not.toMatch(/#[0-9a-f]{3,8}\b/i)
    expect(styleText).not.toMatch(/\b(?:rgb|hsl)a?\(/i)
  })
})
