/* oxlint-disable prefer-named-capture-group, no-magic-numbers -- 样式契约测试要读 SFC 源码做文本解析，正则与下标属测试细节 */
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { INFO_BAR_MIN_HEIGHT, INFO_BAR_SEVERITY_ICONS } from './constants'
import FluereInfoBar from './infobar.vue'
import infobarSfc from './infobar.vue?raw'
import { resolveOrientation } from './layout'
import type { InfoBarChildMeasurement } from './layout'

/**
 * 从 SFC 的 `<style>` 块解析出「选择器 → 声明」，用于断言状态样式。
 *
 * jsdom 不解析 CSS 自定义属性（var()），拿不到可靠的计算样式，所以这里退一步
 * 断言声明本身——守住 WinUI 还原规则（几何、配色、方向判定）。
 * 解析规则与 `progress-bar.test.ts` / `progress-ring.test.ts` 保持一致
 * （按 `}`/`{` 切块，同一选择器合并）。
 *
 * 对照来源：WinUI 3（microsoft-ui-xaml winui3/release/2.5.1，与最新 WinUI3 Gallery
 * 发行版 v2.9.3 所用的 WindowsAppSDK 2.0.1 在 InfoBar 目录下逐字节一致）
 *   src/controls/dev/InfoBar/InfoBar.xaml
 *   src/controls/dev/InfoBar/InfoBar_themeresources.xaml
 *   src/controls/dev/InfoBar/InfoBar.cpp
 *   src/controls/dev/InfoBar/InfoBarPanel.cpp
 */
const readStyleText = (): string =>
  (/<style[^>]*>(?<css>[\s\S]*?)<\/style>/.exec(infobarSfc)?.groups?.css ?? '').replace(
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

/** 构造一个子项测量结果（默认无附加属性 Margin） */
const child = (
  fitWidth: number,
  fitHeight: number,
  overrides: Partial<InfoBarChildMeasurement> = {},
): InfoBarChildMeasurement => ({
  fitWidth,
  fitHeight,
  verticalMargin: [0, 0, 0, 0],
  horizontalMargin: [0, 0, 0, 0],
  ...overrides,
})

describe('FluereInfoBar 渲染契约', () => {
  it('根节点是 role=status（对齐 InfoBarAutomationPeer 的 ControlType=StatusBar）', () => {
    const wrapper = mount(FluereInfoBar, { props: { open: true, title: 'Title' } })
    expect(wrapper.get('.fui-infobar').attributes('role')).toBe('status')
  })

  it('默认 open=false（对齐 IsOpen 缺省 false），且不渲染内容', () => {
    const wrapper = mount(FluereInfoBar, { props: { title: 'Title' } })
    expect(wrapper.get('.fui-infobar').attributes('data-severity')).toBe('informational')
    expect(wrapper.get('.fui-infobar').attributes('data-orientation')).toBe('horizontal')
    expect(wrapper.get('.fui-infobar').attributes('data-icon')).toBe('standard')
    expect(wrapper.get('.fui-infobar').attributes('data-closable')).toBe('true')
    expect(wrapper.find('.fui-infobar__content').exists()).toBe(false)
  })

  it('open=true 时渲染 Title / Message 与关闭按钮', () => {
    const wrapper = mount(FluereInfoBar, {
      props: { open: true, title: '标题', message: '正文', closeButtonLabel: '关闭' },
    })
    expect(wrapper.get('.fui-infobar__title').text()).toBe('标题')
    expect(wrapper.get('.fui-infobar__message').text()).toBe('正文')
    expect(wrapper.get('.fui-infobar__close').attributes('aria-label')).toBe('关闭')
  })

  it('只有 title 时也渲染 message 之外的两项，且 data-banner=true', () => {
    const wrapper = mount(FluereInfoBar, { props: { open: true, title: '仅标题' } })
    expect(wrapper.get('.fui-infobar').attributes('data-banner')).toBe('true')
    expect(wrapper.find('.fui-infobar__message').exists()).toBe(false)
  })

  it('没有 Title / Message / Action 时走 NoBannerContent：内容区行号上移到第 0 行', () => {
    const wrapper = mount(FluereInfoBar, {
      props: { open: true },
      slots: { content: '补充内容' },
    })
    expect(wrapper.get('.fui-infobar').attributes('data-banner')).toBe('false')
    expect(wrapper.get('.fui-infobar__body').attributes('style')).toContain('grid-row: 1')
    const withBanner = mount(FluereInfoBar, {
      props: { open: true, title: 'Title' },
      slots: { content: '补充内容' },
    })
    expect(withBanner.get('.fui-infobar').attributes('data-banner')).toBe('true')
    expect(withBanner.get('.fui-infobar__body').attributes('style')).toContain('grid-row: 2')
  })

  it('isIconVisible=false → data-icon=none 且不渲染图标列（对齐 NoIconVisible）', () => {
    const hidden = mount(FluereInfoBar, {
      props: { open: true, title: 'Title', isIconVisible: false },
    })
    expect(hidden.get('.fui-infobar').attributes('data-icon')).toBe('none')
    expect(hidden.find('.fui-infobar__icon').exists()).toBe(false)
    const shown = mount(FluereInfoBar, { props: { open: true, title: 'Title' } })
    expect(shown.get('.fui-infobar').attributes('data-icon')).toBe('standard')
    expect(shown.find('.fui-infobar__icon').exists()).toBe(true)
  })

  it('#icon 插槽取代内建图标（UserIconVisible 分支），并保留 16px 图标列几何', () => {
    const wrapper = mount(FluereInfoBar, {
      props: { open: true, title: 'Title' },
      slots: { icon: '<svg data-test="custom-icon" />' },
    })
    expect(wrapper.get('.fui-infobar').attributes('data-icon')).toBe('user')
    expect(wrapper.find('.fui-infobar__icon [data-test="custom-icon"]').exists()).toBe(true)
    expect(wrapper.find('.fui-infobar__icon-glyph').exists()).toBe(false)
  })

  it('isClosable=false → data-closable=false 且不渲染关闭按钮', () => {
    const wrapper = mount(FluereInfoBar, {
      props: { open: true, title: 'Title', isClosable: false },
    })
    expect(wrapper.get('.fui-infobar').attributes('data-closable')).toBe('false')
    expect(wrapper.find('.fui-infobar__close').exists()).toBe(false)
  })

  it('severity 透传为 data-severity，四档取值与 WinUI InfoBarSeverity 一一对应', () => {
    for (const severity of ['informational', 'success', 'warning', 'error'] as const) {
      const wrapper = mount(FluereInfoBar, { props: { open: true, title: 'T', severity } })
      expect(wrapper.get('.fui-infobar').attributes('data-severity')).toBe(severity)
    }
    // 四档各自对应一个独立的实心图标（对齐四个 VisualState 换字形）
    expect(new Set(Object.values(INFO_BAR_SEVERITY_ICONS)).size).toBe(4)
  })

  it('label 透传为 aria-label；未传时不渲染该属性', () => {
    expect(
      mount(FluereInfoBar, { props: { open: true, label: '系统提示' } })
        .get('.fui-infobar')
        .attributes('aria-label'),
    ).toBe('系统提示')
    expect(
      mount(FluereInfoBar, { props: { open: true } })
        .get('.fui-infobar')
        .attributes('aria-label'),
    ).toBeUndefined()
  })

  it('#content 与 #default 都能渲染内容区', () => {
    const named = mount(FluereInfoBar, {
      props: { open: true, title: 'T' },
      slots: { content: '命名内容' },
    })
    expect(named.get('.fui-infobar__body').text()).toBe('命名内容')
    const fallback = mount(FluereInfoBar, {
      props: { open: true, title: 'T' },
      slots: { default: '默认内容' },
    })
    expect(fallback.get('.fui-infobar__body').text()).toBe('默认内容')
  })

  it('#action 插槽参与排版（缺失时不占位）', () => {
    const withAction = mount(FluereInfoBar, {
      props: { open: true, title: 'T' },
      slots: { action: '<button type="button">Action</button>' },
    })
    expect(withAction.get('.fui-infobar__action').text()).toBe('Action')
    // 测量层同样要有 action 探针，方向判定才能算上它的宽度
    expect(withAction.get("[data-measure='action']").text()).toBe('Action')
    expect(
      mount(FluereInfoBar, { props: { open: true, title: 'T' } })
        .find('.fui-infobar__action')
        .exists(),
    ).toBe(false)
  })

  it('隐藏测量层不进无障碍树（aria-hidden），且与真实内容是同一份文案', () => {
    const wrapper = mount(FluereInfoBar, {
      props: { open: true, title: '标题', message: '正文' },
      slots: { action: '<button type="button">Action</button>' },
    })
    const measure = wrapper.get('.fui-infobar__measure')
    expect(measure.attributes('aria-hidden')).toBe('true')
    expect(measure.get("[data-measure='title']").text()).toBe('标题')
    expect(measure.get("[data-measure='message']").text()).toBe('正文')
    expect(measure.find("[data-measure='content']").exists()).toBe(false)
  })
})

describe('FluereInfoBar 关闭链路（对齐 InfoBar.cpp）', () => {
  it('点击关闭按钮：先抛 closeButtonClick + closeButtonCommand，再改写 open 并依次抛 closing / closed', async () => {
    const order: string[] = []
    /**
     * 用真正的父组件承载 `v-model:open`：`defineModel` 只在父级确实绑定了
     * `onUpdate:<name>` 时才把值写回本地（Vue `useModel` 的 `hasVModel` 分支），
     * 因此「点击 → 改写 open → Closing/Closed」这条链路必须由父级接住才完整。
     */
    const Host = defineComponent({
      components: { FluereInfoBar },
      setup() {
        const open = ref(true)
        return () =>
          h(FluereInfoBar, {
            'open': open.value,
            'title': 'Title',
            'closeButtonCommand': () => order.push('closeButtonCommand'),
            'onUpdate:open': (value: boolean) => {
              order.push('update:open')
              open.value = value
            },
            'onCloseButtonClick': () => order.push('closeButtonClick'),
            'onClosing': () => order.push('closing'),
            'onClosed': () => order.push('closed'),
          })
      },
    })
    const wrapper = mount(Host)
    await wrapper.get('.fui-infobar__close').trigger('click')
    await nextTick()
    // WinUI 顺序（InfoBar.cpp#OnCloseButtonClick → OnIsOpenPropertyChanged）：
    // CloseButtonClick → IsOpen=false → Closing → Closed
    expect(order).toStrictEqual([
      'closeButtonClick',
      'closeButtonCommand',
      'update:open',
      'closing',
      'closed',
    ])
    expect(wrapper.find('.fui-infobar__content').exists()).toBe(false)
  })

  it('closing 的载荷带 reason=closeButton，且 cancel 缺省为 false', async () => {
    const wrapper = mount(FluereInfoBar, { props: { open: true, title: 'T' } })
    await wrapper.get('.fui-infobar__close').trigger('click')
    await nextTick()
    const closing = wrapper.emitted('closing') as unknown as [{ reason: string; cancel: boolean }][]
    expect(closing[0]?.[0]).toStrictEqual({ reason: 'closeButton', cancel: false })
    expect(wrapper.emitted('closed')?.[0]?.[0]).toStrictEqual({ reason: 'closeButton' })
  })

  it('父组件把 open 改成 false 时走 programmatic 原因', async () => {
    const wrapper = mount(FluereInfoBar, { props: { open: true, title: 'T' } })
    await wrapper.setProps({ open: false })
    expect(wrapper.emitted('closing')?.[0]?.[0]).toStrictEqual({
      reason: 'programmatic',
      cancel: false,
    })
  })

  it('closing 里把 cancel 置为 true 可取消关闭：open 回滚为 true、不抛 closed', async () => {
    const wrapper = mount(FluereInfoBar, {
      props: { open: true, title: 'T' },
      attrs: {
        // 取消关闭
        onClosing: (args: { cancel: boolean }) => {
          args.cancel = true
        },
      },
    })
    await wrapper.get('.fui-infobar__close').trigger('click')
    expect(wrapper.emitted('closed')).toBeUndefined()
    expect(wrapper.emitted('update:open')?.at(-1)).toStrictEqual([true])
    // 关闭按钮仍可再次点击（内容仍在）
    expect(wrapper.find('.fui-infobar__content').exists()).toBe(true)
  })

  it('open=false → true 抛 opened，且关闭原因重置为 programmatic', async () => {
    const wrapper = mount(FluereInfoBar, { props: { open: true, title: 'T' } })
    await wrapper.setProps({ open: false })
    await wrapper.setProps({ open: true })
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('opened')).toHaveLength(1)
    await wrapper.setProps({ open: false })
    expect(wrapper.emitted('closing')?.at(-1)?.[0]).toStrictEqual({
      reason: 'programmatic',
      cancel: false,
    })
  })

  it('closeButtonCommand 先于 closing 执行（对齐 CloseButtonCommand 语义）', async () => {
    const calls: string[] = []
    const wrapper = mount(FluereInfoBar, {
      props: {
        open: true,
        title: 'T',
        closeButtonCommand: () => calls.push('command'),
      },
      attrs: { onClosing: () => calls.push('closing') },
    })
    await wrapper.get('.fui-infobar__close').trigger('click')
    await nextTick()
    expect(calls).toStrictEqual(['command', 'closing'])
  })

  it('closeButtonTooltip 走 FluereTooltip；不传时关闭按钮不带任何提示元素', async () => {
    // 传了提示文案：关闭按钮被 FluereTooltip 包住，默认插槽仍是那个按钮
    const withTip = mount(FluereInfoBar, {
      props: { open: true, closeButtonTooltip: 'Close' },
      attachTo: document.body,
    })
    const button = withTip.get('.fui-infobar__close')
    expect(button.attributes('data-state')).toBe('closed')
    // 提示面按需 Teleport 到 body，默认不渲染；且不再用原生 title
    expect(button.attributes('title')).toBeUndefined()
    expect(document.body.querySelector('.fui-tooltip')).toBeNull()

    // 不传提示文案：关闭按钮的 DOM 与是否包 Tooltip 无关（无额外包装层）
    const withoutTip = mount(FluereInfoBar, { props: { open: true } })
    expect(withoutTip.get('.fui-infobar__close').attributes('title')).toBeUndefined()
    expect(withoutTip.get('.fui-infobar__close').attributes('data-state')).toBeUndefined()
    withTip.unmount()
  })
})

describe('InfoBar 方向判定（逐条对齐 InfoBarPanel.cpp#MeasureOverride）', () => {
  const metrics = { availableWidth: 600, minHeight: INFO_BAR_MIN_HEIGHT }

  it('判据一：只有一个子项时走竖排', () => {
    expect(resolveOrientation([child(100, 20)], metrics)).toBe('vertical')
  })

  it('判据二：水平铺开后总宽超过可用宽时走竖排', () => {
    // 100 + 12(Message 左边距) + 500 = 612 > 600
    const children = [
      child(100, 20, { horizontalMargin: [0, 0, 0, 0] }),
      child(500, 20, { horizontalMargin: [0, 0, 0, 12] }),
    ]
    expect(resolveOrientation(children, metrics)).toBe('vertical')
    // 刚好放得下时保持横排
    const fits = [
      child(100, 20, { horizontalMargin: [0, 0, 0, 0] }),
      child(488, 20, { horizontalMargin: [0, 0, 0, 12] }),
    ]
    expect(resolveOrientation(fits, metrics)).toBe('horizontal')
  })

  it('判据二会忽略首项左外边距与末项右外边距（对齐 Arrange 的口径）', () => {
    const children = [
      child(100, 20, { horizontalMargin: [0, 999, 0, 999] }),
      child(500, 20, { horizontalMargin: [0, 999, 0, 0] }),
    ]
    // 首项左边距与末项右边距都不计入 ⇒ 100 + 12 + 500 = 612 > 600
    expect(resolveOrientation(children, metrics)).toBe('vertical')
  })

  it('判据三：某项在横排下的高（含上下 margin）超过 InfoBarMinHeight 时走竖排', () => {
    const children = [
      child(100, 20, { horizontalMargin: [14, 0, 0, 0] }),
      child(200, 40, { horizontalMargin: [14, 0, 0, 12] }),
    ]
    // 40 + 14 = 54 > 48 ⇒ 竖排
    expect(resolveOrientation(children, metrics)).toBe('vertical')
    const shorter = [
      child(100, 20, { horizontalMargin: [14, 0, 0, 0] }),
      child(200, 30, { horizontalMargin: [14, 0, 0, 12] }),
    ]
    // 30 + 14 = 44 ≤ 48 ⇒ 横排
    expect(resolveOrientation(shorter, metrics)).toBe('horizontal')
  })

  it('横排的上边距计入判据三（InfoBarPanel 用的是 horizontalMargin.Top/Bottom）', () => {
    // 真实取值：Title 上 14、Message 上 14、Action 上 8（InfoBar*HorizontalOrientationMargin）
    const children = [
      child(60, 20, { horizontalMargin: [14, 0, 0, 0] }),
      child(200, 30, { horizontalMargin: [14, 0, 0, 12] }),
    ]
    // 30 + 14 = 44 ≤ 48 ⇒ 横排
    expect(resolveOrientation(children, metrics)).toBe('horizontal')
    // 消息换行成两行（40）+ 14 = 54 > 48 ⇒ 竖排
    const wrapped = [
      child(60, 20, { horizontalMargin: [14, 0, 0, 0] }),
      child(200, 40, { horizontalMargin: [14, 0, 0, 12] }),
    ]
    expect(resolveOrientation(wrapped, metrics)).toBe('vertical')
  })

  it('任一边为 0 的子项被完全跳过（nItems 不计数）', () => {
    // 只有一个真实子项 ⇒ 判据一命中竖排
    expect(resolveOrientation([child(0, 20), child(120, 20)], metrics)).toBe('vertical')
    // 全部为空 ⇒ 中性横排（WinUI 的 totalWidth=0 ≤ availableWidth 分支）
    expect(resolveOrientation([child(0, 0), child(0, 0)], metrics)).toBe('horizontal')
  })

  it('availableWidth 为无穷（尚未测量 / SSR 首帧）时落横排', () => {
    expect(
      resolveOrientation([child(100, 20), child(200, 20, { horizontalMargin: [0, 0, 0, 12] })], {
        availableWidth: Number.POSITIVE_INFINITY,
        minHeight: INFO_BAR_MIN_HEIGHT,
      }),
    ).toBe('horizontal')
  })

  it('minHeight ≤ 0 时第三条判据不参与（复刻 C++ 的 minHeight > 0 前置条件）', () => {
    const children = [
      child(100, 20, { horizontalMargin: [14, 0, 0, 0] }),
      child(200, 80, { horizontalMargin: [14, 0, 0, 12] }),
    ]
    expect(resolveOrientation(children, { availableWidth: 600, minHeight: 0 })).toBe('horizontal')
  })
})

describe('FluereInfoBar 样式契约（WinUI 3 InfoBar 资源）', () => {
  const rules = readStyleRules()

  it('几何：MinHeight=48、描边 1px、圆角 ControlCornerRadius=4、内容左内边距 16', () => {
    const root = rules.get('.fui-infobar') ?? ''
    expect(root).toContain('--fui-infobar-min-height: 48px')
    expect(root).toContain('--fui-infobar-border-width: 1px')
    expect(root).toContain('container-type: inline-size')
    const grid = rules.get('.fui-infobar__grid') ?? ''
    expect(grid).toContain('min-height: var(--fui-infobar-min-height)')
    expect(grid).toContain('padding-inline-start: var(--fui-infobar-content-padding-start)')
    // InfoBarPanelMargin 是**面板**的右边距，不能写成网格右内边距（否则关闭按钮列左移 16px）
    expect(grid).not.toContain('padding-inline-end')
    expect(grid).toContain('grid-template-columns: auto minmax(0, 1fr) auto')
    expect(rules.get('.fui-infobar__panel') ?? '').toContain(
      'margin-inline-end: var(--fui-infobar-panel-margin-end)',
    )
    const content = rules.get('.fui-infobar__content') ?? ''
    expect(content).toContain(
      'border: var(--fui-infobar-border-width) solid var(--colorNeutralStrokeAlpha)',
    )
    expect(content).toContain('border-radius: var(--borderRadiusMedium)')
  })

  it('图标：16px 字号 + Margin 0,16,14,16（InfoBarIconFontSize / InfoBarIconMargin）', () => {
    const icon = rules.get('.fui-infobar__icon') ?? ''
    expect(icon).toContain('width: var(--fui-infobar-icon-size)')
    expect(icon).toContain(
      'margin-block: var(--fui-infobar-icon-margin-top) var(--fui-infobar-icon-margin-top)',
    )
    expect(icon).toContain('margin-inline-end: var(--fui-infobar-icon-margin-end)')
    expect(rules.get('.fui-infobar') ?? '').toContain('--fui-infobar-icon-size: 16px')
  })

  it('关闭按钮：38×38 + Margin 5 + Top 对齐 + 16px 字形（InfoBarCloseButtonStyle）', () => {
    const close = rules.get('.fui-infobar__close') ?? ''
    expect(close).toContain('width: var(--fui-infobar-close-size)')
    expect(close).toContain('height: var(--fui-infobar-close-size)')
    expect(close).toContain('margin: var(--fui-infobar-close-margin)')
    expect(close).toContain('justify-self: end')
    const root = rules.get('.fui-infobar') ?? ''
    expect(root).toContain('--fui-infobar-close-size: 38px')
    expect(root).toContain('--fui-infobar-close-margin: 5px')
    expect(root).toContain('--fui-infobar-close-glyph: 16px')
  })

  it('第一个可见子项不吃起始边距（对齐 ArrangeOverride 的 hasPreviousElement 规则）', () => {
    // Title 缺席时 Message 不该凭空多出 12px 左边距；竖排时 Title 不该叠加 14px 上边距
    expect(
      rules.get(".fui-infobar[data-orientation='horizontal'] .fui-infobar__panel > :first-child") ??
        '',
    ).toContain('margin-inline-start: 0')
    expect(
      rules.get(".fui-infobar[data-orientation='vertical'] .fui-infobar__panel > :first-child") ??
        '',
    ).toContain('margin-block-start: 0')
  })

  it('竖排：Panel 内边距 0,14,0,18 + Title 14 / Message 4 / Action 12 的中间距', () => {
    expect(
      rules.get(".fui-infobar[data-orientation='vertical'] .fui-infobar__panel") ?? '',
    ).toContain('flex-direction: column')
    expect(
      rules.get(".fui-infobar[data-orientation='vertical'] .fui-infobar__panel") ?? '',
    ).toContain('padding-block: 14px 18px')
    expect(
      rules.get(".fui-infobar[data-orientation='vertical'] .fui-infobar__title") ?? '',
    ).toContain('margin-block-start: 14px')
    expect(
      rules.get(".fui-infobar[data-orientation='vertical'] .fui-infobar__message") ?? '',
    ).toContain('margin-block-start: 4px')
    expect(
      rules.get(".fui-infobar[data-orientation='vertical'] .fui-infobar__action") ?? '',
    ).toContain('margin-block-start: 12px')
  })

  it('横排：Panel 内边距全 0 + Message 左 12 / Action 左 16（HorizontalOrientationMargin）', () => {
    expect(
      rules.get(".fui-infobar[data-orientation='horizontal'] .fui-infobar__panel") ?? '',
    ).toContain('flex-direction: row')
    expect(
      rules.get(".fui-infobar[data-orientation='horizontal'] .fui-infobar__panel") ?? '',
    ).toContain('padding-block: 0')
    expect(
      rules.get(".fui-infobar[data-orientation='horizontal'] .fui-infobar__message") ?? '',
    ).toContain('margin-inline-start: 12px')
    expect(
      rules.get(".fui-infobar[data-orientation='horizontal'] .fui-infobar__action") ?? '',
    ).toContain('margin-inline-start: 16px')
    expect(
      rules.get(".fui-infobar[data-orientation='horizontal'] .fui-infobar__title") ?? '',
    ).toContain('margin-block-start: 14px')
  })

  it('字号/字重：Title SemiBold、Message Normal，均 14px/20px（InfoBarTitle/MessageFontSize）', () => {
    // WinUI FontSize=14 ⇒ Fluent 2 Web 的 --fontSizeBase300（14px），行高同档 20px
    const title = rules.get('.fui-infobar__title') ?? ''
    expect(title).toContain('font-size: var(--fontSizeBase300)')
    expect(title).toContain('line-height: var(--lineHeightBase300)')
    expect(title).toContain('font-weight: var(--fontWeightSemibold)')
    expect(title).toContain('color: var(--colorNeutralForeground1)')
    const message = rules.get('.fui-infobar__message') ?? ''
    expect(message).toContain('font-size: var(--fontSizeBase300)')
    expect(message).toContain('line-height: var(--lineHeightBase300)')
    expect(message).toContain('font-weight: var(--fontWeightRegular)')
    expect(message).toContain('color: var(--colorNeutralForeground1)')
  })

  it('四档 Severity 的底色 / 圆心底色各自映射到 token（图标为单色实心圆 + 镂空字形）', () => {
    const informational =
      rules.get(".fui-infobar[data-severity='informational'] .fui-infobar__grid") ?? ''
    expect(informational).toContain('--fui-infobar-bg: var(--colorNeutralCardBackground)')
    expect(informational).toContain('--fui-infobar-icon-bg: var(--colorCompoundBrandBackground)')

    const success = rules.get(".fui-infobar[data-severity='success'] .fui-infobar__grid") ?? ''
    expect(success).toContain('--fui-infobar-bg: var(--colorStatusSuccessBackground1)')
    expect(success).toContain('--fui-infobar-icon-bg: var(--colorStatusSuccessForeground3)')

    const warning = rules.get(".fui-infobar[data-severity='warning'] .fui-infobar__grid") ?? ''
    expect(warning).toContain('--fui-infobar-bg: var(--colorStatusWarningBackground1)')
    expect(warning).toContain('--fui-infobar-icon-bg: var(--colorPaletteYellowForeground1)')

    const error = rules.get(".fui-infobar[data-severity='error'] .fui-infobar__grid") ?? ''
    expect(error).toContain('--fui-infobar-bg: var(--colorPaletteRedBackground1)')
    expect(error).toContain('--fui-infobar-icon-bg: var(--colorStatusDangerForeground3)')

    // 内建字形着 Severity 图标底色（Fluent 的 *_16_filled 是单色图形，字形为镂空），
    // 自定义 `#icon` 插槽则走继承前景色（TextFillColorPrimary → colorNeutralForeground1）
    expect(rules.get('.fui-infobar__icon-glyph') ?? '').toContain(
      'color: var(--fui-infobar-icon-bg, var(--colorCompoundBrandBackground))',
    )
    expect(rules.get('.fui-infobar__icon') ?? '').toContain('color: var(--colorNeutralForeground1)')
  })

  it('内容区上移（NoBannerContent）由 grid-row 内联样式承担，行号来自 data-banner', () => {
    expect(rules.get('.fui-infobar__body') ?? '').toContain('grid-column: 2')
  })

  it('关闭按钮状态：hover / pressed / focus-visible / disabled 齐全', () => {
    expect(rules.get('.fui-infobar__close:hover') ?? '').toContain(
      'background-color: var(--colorSubtleBackgroundHover)',
    )
    expect(rules.get('.fui-infobar__close:active') ?? '').toContain(
      'background-color: var(--colorSubtleBackgroundPressed)',
    )
    expect(rules.get('.fui-infobar__close:focus-visible') ?? '').toContain(
      'outline: var(--strokeWidthThick) solid var(--colorCompoundBrandStroke)',
    )
    expect(rules.get('.fui-infobar__close:disabled') ?? '').toContain(
      'color: var(--colorNeutralForegroundDisabled)',
    )
  })

  it('测量层是绝对定位的隐藏层（不参与布局、不拦指针）', () => {
    const measure = rules.get('.fui-infobar__measure') ?? ''
    expect(measure).toContain('position: absolute')
    expect(measure).toContain('width: max-content')
    expect(measure).toContain('visibility: hidden')
    expect(measure).toContain('pointer-events: none')
    expect(rules.get('.fui-infobar__measure-item') ?? '').toContain('width: max-content')
  })

  it('动效尊重系统减弱：关闭按钮过渡归零', () => {
    expect(rules.get('.fui-infobar__close') ?? '').toContain(
      'background-color var(--durationFaster) var(--curveEasyEase)',
    )
    expect(rules.get('.fui-infobar__close') ?? '').toContain('transition: none')
  })

  it('样式块不含硬编码色值（只允许 var(--Token) 与 currentColor）', () => {
    const colors = readStyleText().match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g) ?? []
    expect(colors).toEqual([])
  })
})
