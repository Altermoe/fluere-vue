/* oxlint-disable prefer-named-capture-group, no-magic-numbers, import/no-duplicates --
   样式契约测试要读 SFC 源码做文本解析（正则与下标属测试细节）；
   组件本体与 ?raw 源码是同一路径的两种取法，导入检查器把它们视作同一模块属误报 */
import { mount } from '@vue/test-utils'
import { TooltipProvider } from 'reka-ui'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import fixtureSfc from './tooltip-fixture.vue?raw'
import FluereTooltipProvider from './tooltip-provider.vue'
import providerSfc from './tooltip-provider.vue?raw'
import FluereTooltip from './tooltip.vue'
import type { FluereTooltipAlign, FluereTooltipPlacement } from './types'

/**
 * 从 SFC 的 `<style>` 块解析出「选择器 → 声明」，用于断言状态样式。
 *
 * jsdom 不解析 CSS 自定义属性（var()），拿不到可靠的计算样式，所以这里退一步
 * 断言声明本身——守住 WinUI 还原规则（几何、配色、层级、动效）。
 * 解析规则与 `infobar.test.ts` / `progress-bar.test.ts` 保持一致。
 *
 * 样式与结构在 `tooltip-fixture.vue`（FluereTooltip 只是宿主切换），因此样式契约
 * 读的是 fixture 的 `<style>` 块。
 *
 * 对照来源：WinUI 3（microsoft-ui-xaml winui3/release/2.5.1）
 *   src/controls/dev/CommonStyles/ToolTip_themeresources.xaml
 *   src/dxaml/xcp/dxaml/lib/ToolTip_Partial.cpp
 *   src/dxaml/xcp/dxaml/lib/ToolTipService_Partial.{h,cpp}
 *   src/dxaml/xcp/dxaml/lib/ThemeAnimations.cpp
 */
const readStyleText = (sfc: string): string =>
  (/<style[^>]*>(?<css>[\s\S]*?)<\/style>/.exec(sfc)?.groups?.css ?? '').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  )

const readStyleRules = (sfc: string): Map<string, string> => {
  const rules = new Map<string, string>()
  const blocks = readStyleText(sfc)
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

/** 取出单个关键帧块的内容 */
const readKeyframes = (sfc: string, name: string): string => {
  const match = new RegExp(`@keyframes ${name}\\s*\\{(?<body>[\\s\\S]*?)\\n\\}`).exec(
    readStyleText(sfc),
  )
  return (match?.groups?.body ?? '').replace(/\s+/g, ' ').trim()
}

const tooltipRules = readStyleRules(fixtureSfc)
const rule = (selector: string): string => tooltipRules.get(selector) ?? ''

/** 断言「某条声明落在该规则里」——用包含匹配，避免顺序敏感 */
const declares = (selector: string, declaration: string): boolean =>
  rule(selector).includes(declaration)

interface MountOptions {
  content?: string
  open?: boolean
  disabled?: boolean
  placement?: FluereTooltipPlacement
  sideOffset?: number
  align?: FluereTooltipAlign
  delayDuration?: number
}

/**
 * 挂载产生的 wrapper 列表：`attachTo: document.body` 会把宿主节点插进 body。
 * 用例末尾统一在 afterEach 里卸载（Teleport 出来的提示面会随宿主一起移除），
 * 不要直接清空 body —— 那会让 Vue 卸载时找不到宿主而抛错。
 */
const mountedWrappers: { unmount: () => void }[] = []
afterEach(() => {
  for (const wrapper of mountedWrappers.splice(0)) {
    wrapper.unmount()
  }
})

/**
 * 在 `TooltipProvider` 里挂载（reka 的 Tooltip 必须在 Provider 之下）。
 * 默认插槽 = 触发元素（对齐 XAML 里 `ToolTipService.ToolTip` 挂在目标元素上）。
 */
const renderTooltip = (options: MountOptions = {}) => {
  const { content = 'Simple ToolTip', ...props } = options
  const wrapper = mount(
    defineComponent({
      render: () =>
        h(
          FluereTooltipProvider,
          { delayDuration: 0, skipDelayDuration: 0 },
          {
            default: () =>
              h(
                FluereTooltip,
                { content, ...props },
                { default: () => h('button', { type: 'button' }, '按钮') },
              ),
          },
        ),
    }),
    { attachTo: document.body },
  )
  mountedWrappers.push(wrapper)
  return wrapper
}

/** 挂载「只有 #content 插槽」的变体（默认插槽仍是触发元素） */
const renderTooltipWithContentSlot = (props: Record<string, unknown> = {}) => {
  const wrapper = mount(
    defineComponent({
      render: () =>
        h(
          FluereTooltipProvider,
          { delayDuration: 0, skipDelayDuration: 0 },
          {
            default: () =>
              h(FluereTooltip, props, {
                default: () => h('button', { type: 'button' }, '按钮'),
                content: () => h('strong', { class: 'rich' }, '富文本提示'),
              }),
          },
        ),
    }),
    { attachTo: document.body },
  )
  mountedWrappers.push(wrapper)
  return wrapper
}

/**
 * 等一次真实宏任务：reka 用 `setTimeout` 实现延时打开（`useTimeoutFn`），
 * `nextTick()` 只是微任务，等不到它。
 */
const flushTimer = async (): Promise<void> => {
  await nextTick()
  await new Promise((resolve) => {
    setTimeout(resolve, 20)
  })
  await nextTick()
}

/** 指针进入触发元素（reka 用 pointermove 判定 hover 进入） */
const pointerEnter = async (el: Element): Promise<void> => {
  el.dispatchEvent(new Event('pointermove', { bubbles: true }))
  await flushTimer()
  await flushTimer()
}

/** 指针离开触发元素 */
const pointerLeave = async (el: Element): Promise<void> => {
  el.dispatchEvent(new Event('pointerleave', { bubbles: true }))
  await flushTimer()
}

describe('FluereTooltip 渲染契约', () => {
  it('未展开时把默认插槽渲染成触发元素，且不输出提示面', () => {
    const wrapper = renderTooltip()
    expect(wrapper.get('button').text()).toBe('按钮')
    expect(document.body.querySelector('.fui-tooltip')).toBeNull()
    expect(wrapper.get('button').attributes('data-state')).toBe('closed')
    // 关闭态不挂 aria-describedby（避免把不可见的 id 暴露给 AT）
    expect(wrapper.get('button').attributes('aria-describedby')).toBeUndefined()
  })

  it('指针进入后展开：输出提示面、内容为 content、role=tooltip 与触发元素 id 对齐', async () => {
    const wrapper = renderTooltip()
    await pointerEnter(wrapper.get('button').element)

    const surface = document.body.querySelector('.fui-tooltip')
    expect(surface).not.toBeNull()
    expect(surface?.textContent).toContain('Simple ToolTip')
    // WinUI 的 ToolTip 模板在视觉层没有箭头 / 尖角，只有背景 + 描边 + 文本
    expect(document.body.querySelector('[data-reka-popper-arrow], .fui-tooltip__arrow')).toBeNull()

    // 可访问性：reka 用 VisuallyHidden 的 role=tooltip 承载文本，触发元素的
    // aria-describedby 指向它（对齐 WinUI 把 ToolTip 与目标元素关联的语义）
    const described = document.body.querySelector('[role="tooltip"]')
    expect(described).not.toBeNull()
    expect(described?.textContent).toContain('Simple ToolTip')
    const describedBy = wrapper.get('button').attributes('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(describedBy).toBe(described?.getAttribute('id'))

    // 默认方位与 WinUI 的 DefaultPlacementMode 一致
    expect(surface?.getAttribute('data-side')).toBe('top')

    await pointerLeave(wrapper.get('button').element)
    expect(document.body.querySelector('.fui-tooltip')).toBeNull()
  })

  it('提示面里没有可聚焦元素（ToolTip.IsTabStop=false）', async () => {
    const wrapper = renderTooltip()
    await pointerEnter(wrapper.get('button').element)
    const surface = document.body.querySelector('.fui-tooltip')
    expect(surface?.querySelectorAll('a, button, input, select, textarea, [tabindex]').length).toBe(
      0,
    )
  })

  it('受控 open=true 直接展开（v-model:open）', async () => {
    renderTooltip({ open: true })
    await flushTimer()
    expect(document.body.querySelector('.fui-tooltip')).not.toBeNull()
  })

  it('受控 open 从 true 变为 false 时收起（v-model:open）', async () => {
    const wrapper = mount(
      defineComponent({
        props: { open: { type: Boolean, default: true } },
        render() {
          return h(
            FluereTooltipProvider,
            { delayDuration: 0, skipDelayDuration: 0 },
            {
              default: () =>
                h(
                  FluereTooltip,
                  { content: 'Simple ToolTip', open: this.open },
                  { default: () => h('button', { type: 'button' }, '按钮') },
                ),
            },
          )
        },
      }),
      { attachTo: document.body },
    )
    mountedWrappers.push(wrapper)
    await flushTimer()
    expect(document.body.querySelector('.fui-tooltip')).not.toBeNull()

    await wrapper.setProps({ open: false })
    await flushTimer()
    expect(document.body.querySelector('.fui-tooltip')).toBeNull()
  })

  it('展开后抛出 update:open（受控模式下由消费方决定是否接受）', async () => {
    const wrapper = renderTooltip()
    await pointerEnter(wrapper.get('button').element)
    expect(wrapper.findComponent(FluereTooltip).emitted('update:open')?.[0]).toEqual([true])
  })

  it('关闭后抛出 update:open(false)', async () => {
    const wrapper = renderTooltip()
    await pointerEnter(wrapper.get('button').element)
    await pointerLeave(wrapper.get('button').element)
    const events = wrapper.findComponent(FluereTooltip).emitted('update:open') ?? []
    expect(events.at(-1)).toEqual([false])
  })

  it('disabled=true 时不展开（对齐 ToolTip.IsEnabled=false 置 Popup Opacity 0）', async () => {
    const wrapper = renderTooltip({ disabled: true })
    await pointerEnter(wrapper.get('button').element)
    expect(document.body.querySelector('.fui-tooltip')).toBeNull()
  })

  it('没有 content 也没有 #content 插槽时不展开', async () => {
    const wrapper = renderTooltip({ content: '' })
    await pointerEnter(wrapper.get('button').element)
    expect(document.body.querySelector('.fui-tooltip')).toBeNull()
  })

  it('#content 插槽可承载富内容', async () => {
    renderTooltipWithContentSlot({ open: true })
    await flushTimer()
    const rich = document.body.querySelector('.fui-tooltip .rich')
    expect(rich?.textContent).toBe('富文本提示')
  })
})

describe('FluereTooltipProvider 契约', () => {
  it('默认延时与 WinUI 的 InitialShowDelay 缺省值一致（400 / 200）', () => {
    const wrapper = mount(FluereTooltipProvider, { slots: { default: () => h('span', 'x') } })
    const provider = wrapper.findComponent(TooltipProvider)
    expect(provider.props('delayDuration')).toBe(400)
    expect(provider.props('skipDelayDuration')).toBe(200)
  })

  it('provider SFC 不访问浏览器 API（SSR 安全）', () => {
    expect(providerSfc).not.toMatch(/\bwindow\.|\bdocument\.|\bnavigator\./)
  })
})

describe('FluereTooltip 样式契约（WinUI 资源名 → Fluent token）', () => {
  // 载荷：ToolTipBorderPadding = 9,6,9,8（Fluent 2 Web 无 9px 档，落成局部变量）
  it('内边距按 ToolTipBorderPadding 的三条局部变量落地', () => {
    expect(declares('.fui-tooltip', '--fui-tooltip-padding-block-start: 6px')).toBe(true)
    expect(declares('.fui-tooltip', '--fui-tooltip-padding-inline: 9px')).toBe(true)
    expect(declares('.fui-tooltip', '--fui-tooltip-padding-block-end: 8px')).toBe(true)
    expect(
      declares(
        '.fui-tooltip',
        'padding: var(--fui-tooltip-padding-block-start) var(--fui-tooltip-padding-inline) var(--fui-tooltip-padding-block-end)',
      ),
    ).toBe(true)
  })

  // 载荷：ToolTipMaxWidth = 320
  it('最大宽度 320px 走局部变量', () => {
    expect(declares('.fui-tooltip', '--fui-tooltip-max-width: 320px')).toBe(true)
    expect(declares('.fui-tooltip', 'max-width: var(--fui-tooltip-max-width)')).toBe(true)
  })

  // 载荷：ToolTipBackgroundBrush ← AcrylicInAppFillColorDefaultBrush
  it('底色映射到 colorNeutralCardBackground', () => {
    expect(
      declares('.fui-tooltip', '--fui-tooltip-background: var(--colorNeutralCardBackground)'),
    ).toBe(true)
    expect(declares('.fui-tooltip', 'background: var(--fui-tooltip-background)')).toBe(true)
  })

  // 载荷：ToolTipBorderBrush ← SurfaceStrokeColorFlyout（#33000000 / #0F000000）
  it('描边映射到 colorNeutralStrokeAlpha，宽度走 strokeWidthThin', () => {
    expect(declares('.fui-tooltip', '--fui-tooltip-border: var(--colorNeutralStrokeAlpha)')).toBe(
      true,
    )
    expect(
      declares('.fui-tooltip', 'border: var(--strokeWidthThin) solid var(--fui-tooltip-border)'),
    ).toBe(true)
  })

  // 载荷：CornerRadius = ControlCornerRadius(4)
  it('圆角走 borderRadiusMedium（ControlCornerRadius=4）', () => {
    expect(declares('.fui-tooltip', 'border-radius: var(--borderRadiusMedium)')).toBe(true)
  })

  // 载荷：ApplyElevationEffect(LayoutRoot, 0, baseElevation 16)
  it('阴影走 shadow16（与 baseElevation 16 同值）', () => {
    expect(declares('.fui-tooltip', 'box-shadow: var(--shadow16)')).toBe(true)
  })

  // 载荷：Foreground = TextFillColorPrimary；FontSize = ToolTipContentThemeFontSize(12)
  it('前景 / 字体走 colorNeutralForeground1 + fontSizeBase200 / lineHeightBase200 / fontFamilyBase', () => {
    expect(declares('.fui-tooltip', 'color: var(--colorNeutralForeground1)')).toBe(true)
    expect(declares('.fui-tooltip', 'font-family: var(--fontFamilyBase)')).toBe(true)
    expect(declares('.fui-tooltip', 'font-size: var(--fontSizeBase200)')).toBe(true)
    expect(declares('.fui-tooltip', 'line-height: var(--lineHeightBase200)')).toBe(true)
  })

  it('文本按 TextWrapping=Wrap 换行', () => {
    expect(declares('.fui-tooltip', 'white-space: normal')).toBe(true)
    expect(declares('.fui-tooltip', 'overflow-wrap: break-word')).toBe(true)
  })

  it('层级高于 ContentDialog（1000）与 Combobox 下拉（1000）', () => {
    expect(declares('.fui-tooltip', '--fui-tooltip-z: 1100')).toBe(true)
    expect(declares('.fui-tooltip', 'z-index: var(--fui-tooltip-z)')).toBe(true)
  })

  // 载荷：ToolTip.IsHitTestVisible / IsTabStop 皆为 false
  it('提示面不吃指针（IsHitTestVisible=false）', () => {
    expect(declares('.fui-tooltip', 'pointer-events: none')).toBe(true)
  })

  // 载荷：OpenStates 的 FadeInThemeAnimation / FadeOutThemeAnimation 都只改 opacity、linear
  it('打开 / 关闭各有一条 opacity 淡入淡出，缓动为 linear', () => {
    expect(
      declares(
        ".fui-tooltip[data-state='delayed-open']",
        'animation: fui-tooltip-fade-in var(--fui-tooltip-fade-duration) var(--curveLinear) both',
      ),
    ).toBe(true)
    expect(
      declares(
        ".fui-tooltip[data-state='instant-open']",
        'animation: fui-tooltip-fade-in var(--fui-tooltip-fade-duration) var(--curveLinear) both',
      ),
    ).toBe(true)
    expect(
      declares(
        ".fui-tooltip[data-state='closed']",
        'animation: fui-tooltip-fade-out var(--fui-tooltip-fade-duration) var(--curveLinear) both',
      ),
    ).toBe(true)

    // 淡入淡出的时长常量落在非公开的 vsanimation.h，取值落成局部变量以便覆盖
    expect(declares('.fui-tooltip', '--fui-tooltip-fade-duration: var(--durationFaster)')).toBe(
      true,
    )
  })

  it('关键帧只动 opacity，起止值分别为 0/1 与 1/0', () => {
    const fadeIn = readKeyframes(fixtureSfc, 'fui-tooltip-fade-in')
    expect(fadeIn).toContain('from { opacity: 0; }')
    expect(fadeIn).toContain('to { opacity: 1; }')

    const fadeOut = readKeyframes(fixtureSfc, 'fui-tooltip-fade-out')
    expect(fadeOut).toContain('from { opacity: 1; }')
    expect(fadeOut).toContain('to { opacity: 0; }')
  })

  it('prefers-reduced-motion 下关闭动画，静默形态是完全可见的提示面', () => {
    const css = readStyleText(fixtureSfc)
    const reduced = /@media \(prefers-reduced-motion: reduce\)\s*\{(?<body>[\s\S]*)\n\}/.exec(css)
    expect(reduced).not.toBeNull()
    const body = (reduced?.groups?.body ?? '').replace(/\s+/g, ' ')
    expect(body).toContain('animation: none')
    // 关闭动画后 opacity 的稳态由 `both` 填充的末帧决定：打开态必须停在 1
    expect(readKeyframes(fixtureSfc, 'fui-tooltip-fade-in')).toContain('to { opacity: 1; }')
  })

  it('全部视觉值都是 var(--Token) 或已声明的局部变量，没有裸色值', () => {
    const declarations = [...tooltipRules.values()].join(' ')
    const suspicious = declarations.match(/#[0-9a-f]{3,8}\b|rgb\(|rgba\(|hsl\(/gi) ?? []
    expect(suspicious).toEqual([])
  })
})

describe('FluereTooltip 组件契约（props 默认值）', () => {
  it('placement 默认 top、sideOffset 默认 4、align 默认 center', () => {
    const wrapper = renderTooltip()
    const tooltip = wrapper.findComponent(FluereTooltip)
    expect(tooltip.props('placement')).toBe('top')
    expect(tooltip.props('sideOffset')).toBe(4)
    expect(tooltip.props('align')).toBe('center')
  })

  it('默认非受控（open 为 undefined）', () => {
    const wrapper = renderTooltip()
    expect(wrapper.findComponent(FluereTooltip).props('open')).toBeUndefined()
  })
})
