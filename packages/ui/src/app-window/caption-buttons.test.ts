/* oxlint-disable prefer-named-capture-group, no-magic-numbers, import/no-duplicates -- 样式契约测试要读 SFC 源码做文本解析（.vue 与 .vue?raw 是同一模块的两种视图），正则与下标属测试细节 */
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import FluereConfigProvider from '../config-provider/config-provider.vue'
import FluereCaptionButtons from './caption-buttons.vue'
import captionButtonsSfc from './caption-buttons.vue?raw'

/**
 * FluereCaptionButtons 契约测试。
 *
 * 规格来源（详见组件注释与 constants.ts）：
 *   - API / 能力语义：`AppWindowTitleBar`（不在 microsoft-ui-xaml 里，属系统层）⇒ 本组件
 *     只做逻辑代理，不改变任何窗口状态。
 *   - 视觉：无 A 级实现；几何取 Windows 11 系统度量（46×32、字形 10×10、描边 1px，
 *     依据 `TitleBarRightPaddingWidth` ← `AppWindowTitleBar.RightInset()` 这一 A 级线索 +
 *     参考图实测），字形形状中最大化 / 还原两条取自遗留 `WindowCaptionButton` 样式的
 *     `Path.Data`（`generic.xaml:15697-15786`）。
 *
 * jsdom 不解析 CSS 自定义属性（`var()`），拿不到可靠的计算样式 ⇒ 状态样式改为
 * 「从 SFC 源码解析出声明本身」做契约断言（与 infobar / progress-bar 测试同一手法，
 * 见 docs/style-spec.md §7.1）。
 */
const readStyleText = (): string =>
  (/<style[^>]*>(?<css>[\s\S]*?)<\/style>/.exec(captionButtonsSfc)?.groups?.css ?? '').replace(
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

describe('FluereCaptionButtons 渲染契约', () => {
  it('默认渲染三个原生 button（最小化 / 最大化 / 关闭），可访问名取内建 zh-Hans 文案', () => {
    const wrapper = mount(FluereCaptionButtons)
    const buttons = wrapper.findAll('button')
    expect(buttons).toHaveLength(3)
    expect(wrapper.get('.fui-caption-buttons__button--minimize').attributes('aria-label')).toBe(
      '最小化',
    )
    expect(wrapper.get('.fui-caption-buttons__button--maximize').attributes('aria-label')).toBe(
      '最大化',
    )
    expect(wrapper.get('.fui-caption-buttons__button--close').attributes('aria-label')).toBe('关闭')
    // 原生 button + 无 tabindex=-1 ⇒ 键盘可达（刻意不采纳遗留样式的 IsTabStop=False）
    for (const button of buttons) {
      expect(button.element.tagName).toBe('BUTTON')
      expect(button.attributes('type')).toBe('button')
      expect(button.attributes('tabindex')).toBeUndefined()
    }
  })

  it('maximized=true 时字形与可访问名切到「还原」（WindowStateMaximized）', () => {
    const wrapper = mount(FluereCaptionButtons, { props: { maximized: true } })
    const maximize = wrapper.get('.fui-caption-buttons__button--maximize')
    expect(maximize.attributes('data-glyph')).toBe('restore')
    expect(maximize.attributes('aria-label')).toBe('向下还原')
    expect(wrapper.get('.fui-caption-buttons').attributes('data-maximized')).toBe('true')
  })

  it('点击最大化按钮：先抛 update:maximized(true) 再抛 maximize；已最大化时抛 false + restore', async () => {
    const wrapper = mount(FluereCaptionButtons)
    await wrapper.get('.fui-caption-buttons__button--maximize').trigger('click')
    expect(wrapper.emitted('update:maximized')?.[0]).toEqual([true])
    expect(wrapper.emitted('maximize')).toHaveLength(1)
    expect(wrapper.emitted('restore')).toBeUndefined()

    const maximized = mount(FluereCaptionButtons, { props: { maximized: true } })
    await maximized.get('.fui-caption-buttons__button--maximize').trigger('click')
    expect(maximized.emitted('update:maximized')?.[0]).toEqual([false])
    expect(maximized.emitted('restore')).toHaveLength(1)
    expect(maximized.emitted('maximize')).toBeUndefined()
  })

  it('最小化 / 关闭只抛对应事件（不改变任何状态）', async () => {
    const wrapper = mount(FluereCaptionButtons)
    await wrapper.get('.fui-caption-buttons__button--minimize').trigger('click')
    await wrapper.get('.fui-caption-buttons__button--close').trigger('click')
    expect(wrapper.emitted('minimize')).toHaveLength(1)
    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(wrapper.emitted('update:maximized')).toBeUndefined()
  })

  it('能力开关：不可最小化 / 最大化时隐藏按钮，不可关闭时保留但禁用', () => {
    const wrapper = mount(FluereCaptionButtons, {
      props: { isMinimizable: false, isMaximizable: false, isClosable: false },
    })
    expect(wrapper.find('.fui-caption-buttons__button--minimize').exists()).toBe(false)
    expect(wrapper.find('.fui-caption-buttons__button--maximize').exists()).toBe(false)
    const close = wrapper.get('.fui-caption-buttons__button--close')
    expect(close.attributes('disabled')).toBeDefined()
  })

  it('禁用中的关闭按钮不抛 close（原生 disabled 拦住点击）', async () => {
    const wrapper = mount(FluereCaptionButtons, { props: { isClosable: false } })
    await wrapper.get('.fui-caption-buttons__button--close').trigger('click')
    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('labels prop 压过 locale；locale 切片随 provider 切换', () => {
    const override = mount(FluereCaptionButtons, {
      props: { labels: { close: '关闭窗口', minimize: '收起' } },
    })
    expect(override.get('.fui-caption-buttons__button--close').attributes('aria-label')).toBe(
      '关闭窗口',
    )
    expect(override.get('.fui-caption-buttons__button--minimize').attributes('aria-label')).toBe(
      '收起',
    )
    // 未覆盖的档位仍走内建文案
    expect(override.get('.fui-caption-buttons__button--maximize').attributes('aria-label')).toBe(
      '最大化',
    )

    const english = mount(FluereConfigProvider, {
      props: { locale: 'en' },
      slots: { default: () => h(FluereCaptionButtons) },
    })
    expect(english.get('.fui-caption-buttons__button--close').attributes('aria-label')).toBe(
      'Close',
    )
    english.unmount()
  })

  it('四个字形插槽可覆盖内建字形', () => {
    const wrapper = mount(FluereCaptionButtons, {
      props: { maximized: true },
      slots: {
        'minimize-icon': '<i class="custom-min">m</i>',
        'restore-icon': '<i class="custom-restore">r</i>',
        'close-icon': '<i class="custom-close">c</i>',
      },
    })
    expect(wrapper.find('.custom-min').exists()).toBe(true)
    expect(wrapper.find('.custom-restore').exists()).toBe(true)
    expect(wrapper.find('.custom-close').exists()).toBe(true)
    // 三个字形都被插槽接管 ⇒ 不再渲染内建 svg
    expect(wrapper.findAll('.fui-caption-buttons__glyph')).toHaveLength(0)

    // 未覆盖的档位仍用内建字形（这里只覆盖关闭键）
    const partial = mount(FluereCaptionButtons, {
      props: { maximized: true },
      slots: { 'close-icon': '<i class="custom-close">c</i>' },
    })
    expect(partial.find('.custom-close').exists()).toBe(true)
    expect(partial.findAll('.fui-caption-buttons__glyph')).toHaveLength(2)
  })

  it('active=false 通过 data-active 表达失活态', () => {
    const wrapper = mount(FluereCaptionButtons, { props: { active: false } })
    expect(wrapper.get('.fui-caption-buttons').attributes('data-active')).toBe('false')
  })

  it('每个字形都是 viewBox + path、且描边不随拉伸缩放（Stretch=Fill 的等价物）', () => {
    const wrapper = mount(FluereCaptionButtons)
    const glyphs = wrapper.findAll('.fui-caption-buttons__glyph')
    expect(glyphs).toHaveLength(3)
    for (const glyph of glyphs) {
      expect(glyph.attributes('viewBox')).toBeTruthy()
      expect(glyph.attributes('preserveAspectRatio')).toBe('none')
      expect(glyph.attributes('aria-hidden')).toBe('true')
    }
    for (const path of wrapper.findAll('.fui-caption-buttons__glyph path')) {
      expect(path.attributes('vector-effect')).toBe('non-scaling-stroke')
    }
  })
})

describe('FluereCaptionButtons 样式契约（读 SFC 源码）', () => {
  const rules = readStyleRules()

  it('几何取自系统度量：单键 46×32、字形 10、描边 1（落成局部变量，可被消费方覆盖）', () => {
    const root = rules.get('.fui-caption-buttons') ?? ''
    expect(root).toContain('--fui-caption-buttons-button-width: 46px')
    expect(root).toContain('--fui-caption-buttons-button-height: 32px')
    expect(root).toContain('--fui-caption-buttons-glyph-size: 10px')
    expect(root).toContain('--fui-caption-buttons-glyph-stroke: 1px')

    const button = rules.get('.fui-caption-buttons__button') ?? ''
    expect(button).toContain('inline-size: var(--fui-caption-buttons-button-width)')
    expect(button).toContain('block-size: var(--fui-caption-buttons-button-height)')
  })

  it('底 / 前景沿用 TitleBarBackButton* 一族画刷（SubtleFill + TextFill）', () => {
    const button = rules.get('.fui-caption-buttons__button') ?? ''
    expect(button).toContain('background-color: var(--colorSubtleBackground)')
    expect(button).toContain('color: var(--colorNeutralForeground1)')
    expect(rules.get('.fui-caption-buttons__button:hover') ?? '').toContain(
      'background-color: var(--colorSubtleBackgroundHover)',
    )
    expect(rules.get('.fui-caption-buttons__button:active') ?? '').toContain(
      'background-color: var(--colorSubtleBackgroundPressed)',
    )
    expect(rules.get('.fui-caption-buttons__button:disabled') ?? '').toContain(
      'background-color: var(--colorNeutralBackgroundDisabled)',
    )
  })

  it('关闭键红底 = SystemFillColorCritical #C42B1C（局部变量）+ 反白字形，按下取语义位最近的 token', () => {
    const root = rules.get('.fui-caption-buttons') ?? ''
    expect(root).toContain('--fui-caption-buttons-close-hover: #c42b1c')
    expect(root).toContain(
      '--fui-caption-buttons-close-pressed: var(--colorStatusDangerBackground3Hover)',
    )
    const hover = rules.get('.fui-caption-buttons__button--close:hover') ?? ''
    expect(hover).toContain('background-color: var(--fui-caption-buttons-close-hover)')
    expect(hover).toContain('color: var(--colorNeutralForegroundOnBrand)')
  })

  it('失活态前景走 TitleBarDeactivatedForegroundBrush 的语义位', () => {
    expect(
      rules.get(".fui-caption-buttons[data-active='false'] .fui-caption-buttons__button") ?? '',
    ).toContain('color: var(--colorNeutralForeground3)')
  })

  it('焦点矩形是 WinUI 双层（外 2px colorStrokeFocus2 + 内 1px colorStrokeFocus1）', () => {
    const focus = rules.get('.fui-caption-buttons__button:focus-visible') ?? ''
    expect(focus).toContain('var(--strokeWidthThick) var(--colorStrokeFocus2)')
    expect(focus).toContain('var(--colorStrokeFocus1)')
    expect(focus).toContain('inset')
    expect(focus).toContain('outline: none')
  })

  it('状态切换不加过渡（XAML 全为 KeyTime=0 的离散跳变）', () => {
    expect(readStyleText()).not.toContain('transition')
  })

  it('字形是描边路径：fill: none + stroke: currentColor + shape-rendering', () => {
    const glyph = rules.get('.fui-caption-buttons__glyph') ?? ''
    expect(glyph).toContain('fill: none')
    expect(glyph).toContain('stroke: currentColor')
    expect(glyph).toContain('stroke-width: var(--fui-caption-buttons-glyph-stroke)')
  })
})
