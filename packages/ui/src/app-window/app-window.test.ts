/* oxlint-disable prefer-named-capture-group, no-magic-numbers -- 样式契约测试要读 SFC 源码做文本解析，正则与下标属测试细节 */
import { mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { h, nextTick } from 'vue'
import FluereConfigProvider from '../config-provider/config-provider.vue'
import appWindowSfc from './app-window.vue?raw'
import FluereAppWindow from './app-window.vue'
import { DRAG_EXEMPT_SELECTOR, isDragExemptTarget } from './use-drag-region'
import { gateDisplayMode, resolveDisplayModeState } from './use-titlebar-display-mode'
import type { DisplayModeGate } from './use-titlebar-display-mode'

/**
 * FluereAppWindow 契约测试。
 *
 * 规格来源：microsoft-ui-xaml
 *   模板 / 数值 `winui3/release/2.5.1`（commit ba3a8d5）`src/controls/dev/TitleBar/TitleBar.xaml`
 *   + `TitleBar_themeresources.xaml`；行为 `winui3/release/2.0.1`（commit 978ab63）
 *   `TitleBar.cpp`（高度判定 / 折叠判定 / 拖拽打洞 / 失活态）。
 *
 * 两条与 WinUI 的系统差异在这里被固定成契约：
 *   1. **只抛事件**：组件不写 `position` / `inset` / `transform` / `z-index`，拖拽与双击
 *      只产生事件载荷。
 *   2. **点击类平台 API**（`setPointerCapture`）在 jsdom 里不存在 ⇒ 测试里补桩；
 *      SSR / 无捕获能力的环境退化为「不启动拖拽」（不抛错）。
 */
beforeAll(() => {
  if (typeof Element.prototype.setPointerCapture !== 'function') {
    Object.defineProperty(Element.prototype, 'setPointerCapture', {
      configurable: true,
      value: () => {},
      writable: true,
    })
    Object.defineProperty(Element.prototype, 'releasePointerCapture', {
      configurable: true,
      value: () => {},
      writable: true,
    })
  }
})

const wrappers: VueWrapper[] = []
const mountWindow = (options: Parameters<typeof mount>[1] = {}): VueWrapper => {
  const wrapper = mount(FluereAppWindow, options) as VueWrapper
  wrappers.push(wrapper)
  return wrapper
}

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) {
    wrapper.unmount()
  }
})

/** jsdom 里的 Event 没有 pointer / mouse 专有字段，这里按需挂到实例上 */
const domEvent = (type: string, init: Record<string, unknown>): Event => {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.assign(event, init)
  return event
}

const pointer = (type: string, init: Record<string, unknown>): Event =>
  domEvent(type, { button: 0, isPrimary: true, pointerId: 1, ...init })

/** 构造一个折叠判定状态（`m_isCompact` / `m_compactModeThresholdWidth`） */
const state = (
  isCompact: boolean,
  thresholdWidth: number,
): { isCompact: boolean; thresholdWidth: number } => ({
  isCompact,
  thresholdWidth,
})

const readStyleText = (): string =>
  (/<style[^>]*>(?<css>[\s\S]*?)<\/style>/.exec(appWindowSfc)?.groups?.css ?? '').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  )

const readStyleRules = (): Map<string, string> => {
  const rules = new Map<string, string>()
  for (const block of readStyleText()
    .replace(/@media[^{]*{/g, '')
    .split('}')) {
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

describe('FluereAppWindow 渲染契约', () => {
  it('根是 role=group，可访问名缺省回退 title（对齐 TitleBarAutomationPeer）', () => {
    const wrapper = mountWindow({ props: { title: '设置' } })
    const root = wrapper.get('.fui-app-window')
    expect(root.attributes('role')).toBe('group')
    expect(root.attributes('aria-label')).toBe('设置')
  })

  it('label prop 压过 title；两者都空时不输出 aria-label', () => {
    const labelled = mountWindow({ props: { title: '设置', label: '应用窗口' } })
    expect(labelled.get('.fui-app-window').attributes('aria-label')).toBe('应用窗口')
    const bare = mountWindow()
    expect(bare.get('.fui-app-window').attributes('aria-label')).toBeUndefined()
  })

  it('高度档位：LeftHeader / 标题栏中段 / RightHeader 全空才 compact（对齐 UpdateHeight）', () => {
    expect(
      mountWindow({ props: { title: 'T' } })
        .get('.fui-app-window')
        .attributes('data-titlebar-size'),
    ).toBe('compact')
    const withSubtitleOnly = mountWindow({ props: { title: 'T', subtitle: 'S' } })
    expect(withSubtitleOnly.get('.fui-app-window').attributes('data-titlebar-size')).toBe('compact')

    const withRightHeader = mountWindow({ slots: { 'right-header': () => h('span', 'r') } })
    expect(withRightHeader.get('.fui-app-window').attributes('data-titlebar-size')).toBe('expanded')

    const withContent = mountWindow({ slots: { 'titlebar-content': () => h('span', 'c') } })
    expect(withContent.get('.fui-app-window').attributes('data-titlebar-size')).toBe('expanded')

    const withLeftHeader = mountWindow({ slots: { 'left-header': () => h('span', 'l') } })
    expect(withLeftHeader.get('.fui-app-window').attributes('data-titlebar-size')).toBe('expanded')
  })

  it('左头间距：两个按钮都不可见或都可见 → default；恰好一个可见 → negative-inset', () => {
    const neither = mountWindow()
    expect(neither.get('.fui-app-window').attributes('data-left-header-spacing')).toBe('default')

    const both = mountWindow({
      props: { isBackButtonVisible: true, isPaneToggleButtonVisible: true },
    })
    expect(both.get('.fui-app-window').attributes('data-left-header-spacing')).toBe('default')

    const onlyBack = mountWindow({ props: { isBackButtonVisible: true } })
    expect(onlyBack.get('.fui-app-window').attributes('data-left-header-spacing')).toBe(
      'negative-inset',
    )

    const onlyPane = mountWindow({ props: { isPaneToggleButtonVisible: true } })
    expect(onlyPane.get('.fui-app-window').attributes('data-left-header-spacing')).toBe(
      'negative-inset',
    )
  })

  it('标题 / 副标题 / 图标 / 三个头部插槽各就各位，内容区用 #content（别名 default）', () => {
    const wrapper = mountWindow({
      props: { title: '标题', subtitle: '副标题' },
      slots: {
        'icon': () => h('i', { class: 'my-icon' }, 'i'),
        'left-header': () => h('span', { class: 'my-left' }, 'l'),
        'right-header': () => h('span', { class: 'my-right' }, 'r'),
        'content': () => h('div', { class: 'my-body' }, 'body'),
      },
    })
    expect(wrapper.get('.fui-app-window__title').text()).toBe('标题')
    expect(wrapper.get('.fui-app-window__subtitle').text()).toBe('副标题')
    expect(wrapper.find('.my-icon').exists()).toBe(true)
    expect(wrapper.find('.my-left').exists()).toBe(true)
    expect(wrapper.find('.my-right').exists()).toBe(true)
    expect(wrapper.get('.my-body').text()).toBe('body')

    // default 是 #content 的别名
    const viaDefault = mountWindow({
      slots: { default: () => h('div', { class: 'my-body' }, 'b') },
    })
    expect(viaDefault.get('.fui-app-window__content .my-body').text()).toBe('b')
  })

  it('#titlebar 逃生舱替换整条标题栏，caption 按钮仍渲染（showCaptionButtons=false 可关）', () => {
    const custom = mountWindow({ slots: { titlebar: () => h('div', { class: 'my-bar' }, 'bar') } })
    expect(custom.find('.my-bar').exists()).toBe(true)
    expect(custom.find('.fui-app-window__title').exists()).toBe(false)
    expect(custom.find('.fui-caption-buttons').exists()).toBe(true)

    const noCaptions = mountWindow({
      props: { showCaptionButtons: false },
      slots: { titlebar: () => h('div', { class: 'my-bar' }, 'bar') },
    })
    expect(noCaptions.find('.fui-caption-buttons').exists()).toBe(false)
  })

  it('返回 / 导航按钮：可见性、禁用与事件', async () => {
    const wrapper = mountWindow({
      props: { isBackButtonVisible: true, isPaneToggleButtonVisible: true },
    })
    const back = wrapper.get('.fui-app-window__nav-button--back')
    expect(back.attributes('aria-label')).toBe('返回')
    await back.trigger('click')
    expect(wrapper.emitted('backRequested')).toHaveLength(1)

    const pane = wrapper.get('.fui-app-window__nav-button--pane-toggle')
    expect(pane.attributes('aria-label')).toBe('切换导航')
    await pane.trigger('click')
    expect(wrapper.emitted('paneToggleRequested')).toHaveLength(1)

    const disabled = mountWindow({
      props: { isBackButtonVisible: true, isBackButtonEnabled: false },
    })
    expect(disabled.get('.fui-app-window__nav-button--back').attributes('disabled')).toBeDefined()

    const hidden = mountWindow()
    expect(hidden.find('.fui-app-window__nav-button').exists()).toBe(false)
  })

  it('caption 按钮的事件与 props 由本组件透传（含 v-model:maximized）', async () => {
    const wrapper = mountWindow({ props: { maximized: false } })
    await wrapper.get('.fui-caption-buttons__button--maximize').trigger('click')
    expect(wrapper.emitted('update:maximized')?.[0]).toEqual([true])
    expect(wrapper.emitted('maximize')).toHaveLength(1)

    await wrapper.get('.fui-caption-buttons__button--minimize').trigger('click')
    expect(wrapper.emitted('minimize')).toHaveLength(1)

    await wrapper.get('.fui-caption-buttons__button--close').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)

    const maximized = mountWindow({ props: { maximized: true } })
    await maximized.get('.fui-caption-buttons__button--maximize').trigger('click')
    expect(maximized.emitted('restore')).toHaveLength(1)
    expect(maximized.get('.fui-app-window').attributes('data-maximized')).toBe('true')

    const limited = mountWindow({ props: { isMaximizable: false, isClosable: false } })
    expect(limited.find('.fui-caption-buttons__button--maximize').exists()).toBe(false)
    expect(limited.get('.fui-caption-buttons__button--close').attributes('disabled')).toBeDefined()
  })

  it('active / motion 通过 data-* 表达', () => {
    const wrapper = mountWindow({ props: { active: false, motion: 'none' } })
    expect(wrapper.get('.fui-app-window').attributes('data-active')).toBe('false')
    expect(wrapper.get('.fui-app-window').attributes('data-motion')).toBe('none')
  })
})

describe('FluereAppWindow 拖拽契约（只抛事件，不移动任何元素）', () => {
  it('在标题栏空白处按下并移动：dragStart → dragMove（逐次 + 累计）→ dragEnd', async () => {
    const wrapper = mountWindow({ props: { title: 'T' } })
    const bar = wrapper.get('.fui-app-window__titlebar')
    bar.element.dispatchEvent(pointer('pointerdown', { pointerId: 7, clientX: 100, clientY: 50 }))
    await nextTick()
    expect(wrapper.emitted('dragStart')?.[0]).toEqual([{ pointerId: 7, clientX: 100, clientY: 50 }])
    expect(wrapper.get('.fui-app-window').attributes('data-dragging')).toBe('true')

    bar.element.dispatchEvent(pointer('pointermove', { pointerId: 7, clientX: 130, clientY: 70 }))
    bar.element.dispatchEvent(pointer('pointermove', { pointerId: 7, clientX: 140, clientY: 60 }))
    const moves = wrapper.emitted('dragMove') ?? []
    expect(moves[0]?.[0]).toEqual({
      pointerId: 7,
      clientX: 130,
      clientY: 70,
      deltaX: 30,
      deltaY: 20,
      totalDeltaX: 30,
      totalDeltaY: 20,
    })
    expect(moves[1]?.[0]).toEqual({
      pointerId: 7,
      clientX: 140,
      clientY: 60,
      deltaX: 10,
      deltaY: -10,
      totalDeltaX: 40,
      totalDeltaY: 10,
    })

    bar.element.dispatchEvent(pointer('pointerup', { pointerId: 7, clientX: 140, clientY: 60 }))
    await nextTick()
    expect(wrapper.emitted('dragEnd')?.[0]?.[0]).toEqual({
      pointerId: 7,
      clientX: 140,
      clientY: 60,
      totalDeltaX: 40,
      totalDeltaY: 10,
      canceled: false,
    })
    expect(wrapper.get('.fui-app-window').attributes('data-dragging')).toBe('false')
  })

  it('从可交互区起手不触发拖拽（等价于 WinUI 的 passthrough 打洞）', async () => {
    const wrapper = mountWindow({
      props: { isBackButtonVisible: true },
      slots: {
        'left-header': () => h('div', { class: 'my-left' }, 'l'),
        'titlebar-content': () => h('div', { class: 'my-center' }, 'c'),
        'right-header': () => h('div', { class: 'my-right' }, 'r'),
      },
    })
    const targets = [
      wrapper.get('.fui-app-window__nav-button--back').element,
      wrapper.get('.my-left').element,
      wrapper.get('.my-center').element,
      wrapper.get('.my-right').element,
      wrapper.get('.fui-caption-buttons__button--close').element,
    ]
    for (const [index, target] of targets.entries()) {
      target.dispatchEvent(pointer('pointerdown', { pointerId: index + 1, clientX: 1, clientY: 1 }))
    }
    await nextTick()
    expect(wrapper.emitted('dragStart')).toBeUndefined()

    // 消费方显式标记为禁拖的元素同样不触发
    const exemptWrapper = mountWindow({
      slots: {
        'titlebar-content': () =>
          h('div', { 'class': 'my-drop', 'data-fui-app-window-drag-exempt': '' }, 'd'),
      },
    })
    exemptWrapper
      .get('.my-drop')
      .element.dispatchEvent(pointer('pointerdown', { pointerId: 9, clientX: 1, clientY: 1 }))
    await nextTick()
    expect(exemptWrapper.emitted('dragStart')).toBeUndefined()
    // 该元素确实命中禁拖选择器（选择器还覆盖 button / input 等原生可交互元素）
    expect(isDragExemptTarget(exemptWrapper.get('.my-drop').element)).toBe(true)
    expect(DRAG_EXEMPT_SELECTOR).toContain('button')
  })

  it('Esc 取消本次拖拽（dragEnd.canceled = true）', async () => {
    const wrapper = mountWindow()
    const bar = wrapper.get('.fui-app-window__titlebar')
    bar.element.dispatchEvent(pointer('pointerdown', { pointerId: 3, clientX: 10, clientY: 10 }))
    bar.element.dispatchEvent(pointer('pointermove', { pointerId: 3, clientX: 40, clientY: 25 }))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(wrapper.emitted('dragEnd')?.[0]?.[0]).toEqual({
      pointerId: 3,
      clientX: 40,
      clientY: 25,
      totalDeltaX: 30,
      totalDeltaY: 15,
      canceled: true,
    })
    expect(wrapper.get('.fui-app-window').attributes('data-dragging')).toBe('false')
  })

  it('pointercancel 同样以 canceled=true 结束', async () => {
    const wrapper = mountWindow()
    const bar = wrapper.get('.fui-app-window__titlebar')
    bar.element.dispatchEvent(pointer('pointerdown', { pointerId: 5, clientX: 0, clientY: 0 }))
    bar.element.dispatchEvent(pointer('pointercancel', { pointerId: 5, clientX: 0, clientY: 0 }))
    await nextTick()
    expect(wrapper.emitted('dragEnd')?.[0]?.[0]).toMatchObject({ canceled: true })
  })

  it('roundToInteger=true：累计位移取整为整数，delta 取两次累计之差（不累积取整误差）', async () => {
    const wrapper = mountWindow({ props: { title: 'T', roundToInteger: true } })
    const bar = wrapper.get('.fui-app-window__titlebar')
    bar.element.dispatchEvent(pointer('pointerdown', { pointerId: 2, clientX: 100, clientY: 50 }))
    await nextTick()
    // 0.4 的逐次位移若对 delta 取整会被错算成 0；这里对「累计值」取整，总位移不丢
    bar.element.dispatchEvent(
      pointer('pointermove', { pointerId: 2, clientX: 130.4, clientY: 70.6 }),
    )
    bar.element.dispatchEvent(
      pointer('pointermove', { pointerId: 2, clientX: 140.8, clientY: 60.2 }),
    )
    const moves = wrapper.emitted('dragMove') ?? []
    expect(moves[0]?.[0]).toEqual({
      pointerId: 2,
      clientX: 130.4,
      clientY: 70.6,
      deltaX: 30,
      deltaY: 21,
      totalDeltaX: 30,
      totalDeltaY: 21,
    })
    expect(moves[1]?.[0]).toEqual({
      pointerId: 2,
      clientX: 140.8,
      clientY: 60.2,
      deltaX: 11,
      deltaY: -11,
      totalDeltaX: 41,
      totalDeltaY: 10,
    })
    // delta 合计恰等于总累计位移（无取整误差累积），dragEnd 的 totalDelta 同样取整为整数
    bar.element.dispatchEvent(pointer('pointerup', { pointerId: 2, clientX: 140.8, clientY: 60.2 }))
    await nextTick()
    expect(wrapper.emitted('dragEnd')?.[0]?.[0]).toEqual({
      pointerId: 2,
      clientX: 140.8,
      clientY: 60.2,
      totalDeltaX: 41,
      totalDeltaY: 10,
      canceled: false,
    })
  })

  it('draggable=false 时不产生任何拖拽事件', async () => {
    const wrapper = mountWindow({ props: { draggable: false } })
    const bar = wrapper.get('.fui-app-window__titlebar')
    bar.element.dispatchEvent(pointer('pointerdown', { pointerId: 1, clientX: 0, clientY: 0 }))
    bar.element.dispatchEvent(pointer('pointermove', { pointerId: 1, clientX: 20, clientY: 20 }))
    await nextTick()
    expect(wrapper.emitted('dragStart')).toBeUndefined()
    expect(wrapper.emitted('dragMove')).toBeUndefined()
  })

  it('标题栏双击抛 titlebarDoubleClick（系统行为是切换最大化，组件不改状态）', async () => {
    const wrapper = mountWindow()
    const bar = wrapper.get('.fui-app-window__titlebar')
    bar.element.dispatchEvent(domEvent('dblclick', { clientX: 12, clientY: 8 }))
    await nextTick()
    expect(wrapper.emitted('titlebarDoubleClick')?.[0]).toEqual([{ clientX: 12, clientY: 8 }])
    expect(wrapper.emitted('update:maximized')).toBeUndefined()
  })
})

describe('折叠判定（resolveDisplayModeState，逐字对齐 TitleBar.cpp#OnSizeChanged）', () => {
  it('中段期望宽 ≥ 可用宽时进入 Compact，并记住当时的标题栏宽度当阈值', () => {
    const next = resolveDisplayModeState(state(false, 0), {
      titleBarWidth: 600,
      desiredWidth: 320,
      availableWidth: 320,
    })
    expect(next).toEqual({ isCompact: true, thresholdWidth: 600 })
  })

  it('折叠后宽度**严格大于**阈值才退出（同一宽度不退出，避免进折叠本身触发的自激振荡）', () => {
    const compact = state(true, 600)
    // 宽度还没到阈值：保持折叠
    expect(
      resolveDisplayModeState(compact, {
        titleBarWidth: 599,
        desiredWidth: 300,
        availableWidth: 320,
      }),
    ).toEqual(compact)
    // 宽度**等于**阈值：XAML 里不会有这个事件；Web 会因为「进折叠改变了中段可用宽」再量一次，
    // 沿用源码的 `>=` 会立刻退出并振荡 ⇒ 这里必须保持折叠
    expect(
      resolveDisplayModeState(compact, {
        titleBarWidth: 600,
        desiredWidth: 300,
        availableWidth: 138,
      }),
    ).toEqual(compact)
    // 真的变大：退出
    expect(
      resolveDisplayModeState(compact, {
        titleBarWidth: 601,
        desiredWidth: 300,
        availableWidth: 138,
      }),
    ).toEqual({ isCompact: false, thresholdWidth: 0 })
  })

  it('尚无有效测量时不折叠（Web 守卫：SSR 后首帧 / jsdom 的 0 尺寸）', () => {
    const initial = state(false, 0)
    expect(
      resolveDisplayModeState(initial, { titleBarWidth: 0, desiredWidth: 0, availableWidth: 0 }),
    ).toEqual(initial)
    expect(
      resolveDisplayModeState(initial, {
        titleBarWidth: 0,
        desiredWidth: 200,
        availableWidth: 0,
      }),
    ).toEqual(initial)
    expect(
      resolveDisplayModeState(initial, {
        titleBarWidth: 800,
        desiredWidth: 0,
        availableWidth: 500,
      }),
    ).toEqual(initial)
  })

  it('中段可用宽被挤到 0 时同样折叠（判据是 desired >= available，不是断点）', () => {
    expect(
      resolveDisplayModeState(state(false, 0), {
        titleBarWidth: 520,
        desiredWidth: 200,
        availableWidth: 0,
      }),
    ).toEqual({ isCompact: true, thresholdWidth: 520 })
  })
})

describe('翻转闸门（gateDisplayMode：连续两次一致才落地，抗 resize 抖动）', () => {
  const tight = { titleBarWidth: 600, desiredWidth: 320, availableWidth: 320 }
  const roomy = { titleBarWidth: 600, desiredWidth: 100, availableWidth: 320 }

  it('第一次提案只登记不落地，第二次同样的提案才落地', () => {
    const first = gateDisplayMode({ signature: '' }, state(false, 0), tight)
    expect(first.state).toEqual(state(false, 0))
    expect(first.gate.signature).toBe('compact')

    const second = gateDisplayMode(first.gate, first.state, tight)
    expect(second.state).toEqual({ isCompact: true, thresholdWidth: 600 })
    expect(second.gate.signature).toBe('')
  })

  it('提案之间夹一次「无翻转」的测量会清空待定（抖动时不落地）', () => {
    const first = gateDisplayMode({ signature: '' }, state(false, 0), tight)
    const reset = gateDisplayMode(first.gate, first.state, roomy)
    expect(reset.state).toEqual(state(false, 0))
    expect(reset.gate.signature).toBe('')

    // 实测抖动序列：compact 提案 → 放得下 → compact 提案 ⇒ 全程不落状态
    const again = gateDisplayMode(reset.gate, reset.state, tight)
    expect(again.state).toEqual(state(false, 0))
  })

  it('稳定后连续两次提案即可落地（最终状态一定会生效）', () => {
    let gate: DisplayModeGate = { signature: '' }
    let current = state(false, 0)
    for (const sample of [tight, roomy, tight, tight]) {
      const result = gateDisplayMode(gate, current, sample)
      gate = result.gate
      current = result.state
    }
    expect(current).toEqual({ isCompact: true, thresholdWidth: 600 })
  })
})

describe('禁拖判定（isDragExemptTarget）', () => {
  it('原生可交互元素与其后代都算可交互区；普通容器不算', () => {
    const host = document.createElement('div')
    host.innerHTML = `
      <div class="plain"><span id="plain-child">x</span></div>
      <button id="btn"><span id="btn-child">x</span></button>
      <div data-fui-app-window-nodrag><span id="nodrag-child">x</span></div>
      <div data-fui-app-window-drag-exempt><span id="exempt-child">x</span></div>
      <input id="input" />
    `
    document.body.append(host)
    expect(isDragExemptTarget(host.querySelector('#plain-child'))).toBe(false)
    expect(isDragExemptTarget(host.querySelector('#btn'))).toBe(true)
    expect(isDragExemptTarget(host.querySelector('#btn-child'))).toBe(true)
    expect(isDragExemptTarget(host.querySelector('#nodrag-child'))).toBe(true)
    expect(isDragExemptTarget(host.querySelector('#exempt-child'))).toBe(true)
    expect(isDragExemptTarget(host.querySelector('#input'))).toBe(true)
    expect(isDragExemptTarget(null)).toBe(false)
    host.remove()
  })
})

describe('FluereAppWindow 样式契约（读 SFC 源码）', () => {
  const rules = readStyleRules()

  it('标题栏几何：32 / 48、按钮宽 40、图标 16、最小拖拽区 48、左头间距 14→2', () => {
    const root = rules.get('.fui-app-window') ?? ''
    expect(root).toContain('--fui-app-window-titlebar-height: 32px')
    expect(root).toContain('--fui-app-window-nav-button-width: 40px')
    expect(root).toContain('--fui-app-window-icon-size: 16px')
    expect(root).toContain('--fui-app-window-min-drag-region: 48px')
    expect(root).toContain('--fui-app-window-left-header-padding: 14px')
    expect(rules.get(".fui-app-window[data-titlebar-size='expanded']") ?? '').toContain(
      '--fui-app-window-titlebar-height: 48px',
    )
    expect(
      rules.get(
        ".fui-app-window[data-left-header-spacing='negative-inset'] .fui-app-window__titlebar",
      ) ?? '',
    ).toContain('--fui-app-window-left-header-padding: 2px')
  })

  it('窗口框体走 token：底色 / 描边 / 圆角 / 阴影（最大化时圆角归零、去阴影）', () => {
    const root = rules.get('.fui-app-window') ?? ''
    expect(root).toContain('--fui-app-window-surface: var(--colorNeutralBackground2)')
    expect(root).toContain('--fui-app-window-border: var(--colorNeutralStroke2)')
    expect(root).toContain('--fui-app-window-radius: var(--borderRadiusXLarge)')
    expect(root).toContain('--fui-app-window-shadow: var(--shadow64)')
    expect(root).toContain('border: var(--strokeWidthThin) solid var(--fui-app-window-border)')
    const maximized = rules.get(".fui-app-window[data-maximized='true']") ?? ''
    expect(maximized).toContain('border-radius: var(--fui-app-window-radius-maximized)')
    expect(maximized).toContain('box-shadow: none')
  })

  it('Compact 折叠标题 / 副标题（DisplayModeGroup 后声明胜出）并把中段改左对齐', () => {
    const title =
      rules.get(".fui-app-window[data-display-mode='compact'] .fui-app-window__title") ?? ''
    const subtitle =
      rules.get(".fui-app-window[data-display-mode='compact'] .fui-app-window__subtitle") ?? ''
    expect(title).toContain('display: none')
    expect(subtitle).toContain('display: none')
    expect(
      rules.get(".fui-app-window[data-display-mode='compact'] .fui-app-window__titlebar-content") ??
        '',
    ).toContain('justify-content: flex-start')
  })

  it('失活态：标题 / 副标题换前景，图标 / 左头 / 中段 / 右头只改 Opacity 0.5', () => {
    const root = rules.get('.fui-app-window') ?? ''
    expect(root).toContain('--fui-app-window-deactivated-opacity: 0.5')
    expect(
      rules.get(".fui-app-window[data-active='false'] .fui-app-window__title") ?? '',
    ).toContain('color: var(--colorNeutralForeground3)')
    expect(rules.get(".fui-app-window[data-active='false'] .fui-app-window__icon") ?? '').toContain(
      'opacity: var(--fui-app-window-deactivated-opacity)',
    )
    expect(
      rules.get(".fui-app-window[data-active='false'] .fui-app-window__left-header") ?? '',
    ).toContain('opacity: var(--fui-app-window-deactivated-opacity)')
    expect(
      rules.get(".fui-app-window[data-active='false'] .fui-app-window__titlebar-content") ?? '',
    ).toContain('opacity: var(--fui-app-window-deactivated-opacity)')
    expect(
      rules.get(".fui-app-window[data-active='false'] .fui-app-window__right-header") ?? '',
    ).toContain('opacity: var(--fui-app-window-deactivated-opacity)')
  })

  it('排版走 token：标题 12px / lineHeightBase200，副标题用 Secondary 前景', () => {
    const text = rules.get('.fui-app-window__title,\n.fui-app-window__subtitle') ?? ''
    const title = rules.get('.fui-app-window__title') ?? ''
    const subtitle = rules.get('.fui-app-window__subtitle') ?? ''
    expect(`${text} ${title}`).toContain('font-size: var(--fontSizeBase200)')
    expect(`${text} ${title}`).toContain('line-height: var(--lineHeightBase200)')
    expect(subtitle).toContain('color: var(--colorNeutralForeground2)')
  })

  it('返回 / 导航按钮的底与前景沿用 TitleBarBackButton* 一族，并带双层焦点矩形', () => {
    const button = rules.get('.fui-app-window__nav-button') ?? ''
    expect(button).toContain('inline-size: var(--fui-app-window-nav-button-width)')
    expect(button).toContain('border-radius: var(--fui-app-window-nav-button-radius)')
    expect(button).toContain('background-color: var(--colorSubtleBackground)')
    expect(rules.get('.fui-app-window__nav-button:hover') ?? '').toContain(
      'background-color: var(--colorSubtleBackgroundHover)',
    )
    expect(rules.get('.fui-app-window__nav-button:active') ?? '').toContain(
      'background-color: var(--colorSubtleBackgroundPressed)',
    )
    const focus = rules.get('.fui-app-window__nav-button:focus-visible') ?? ''
    expect(focus).toContain('var(--strokeWidthThick) var(--colorStrokeFocus2)')
    expect(focus).toContain('var(--colorStrokeFocus1)')
  })

  it('内容区只控制可视区域（overflow: clip + min-block-size: 0），不接管滚动', () => {
    const content = rules.get('.fui-app-window__content') ?? ''
    expect(content).toContain('overflow: clip')
    expect(content).toContain('min-block-size: 0')
    expect(content).toContain('flex: 1 1 auto')
  })

  it('组件不写层级 / 定位：根节点没有 z-index / position / transform', () => {
    const root = rules.get('.fui-app-window') ?? ''
    expect(root).not.toContain('z-index')
    expect(root).not.toContain('position:')
    expect(root).not.toContain('transform')
    expect(readStyleText()).not.toContain('z-index')
  })

  it('组件自有过渡只在 motion=auto 下挂，并在 prefers-reduced-motion 下关闭', () => {
    const auto = rules.get(".fui-app-window[data-motion='auto']") ?? ''
    expect(auto).toContain('transition:')
    expect(auto).toContain('var(--fui-app-window-transition-duration)')
    expect(auto).toContain('var(--fui-app-window-transition-curve)')
    const css = readStyleText()
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    // 标题栏内部状态一律无过渡：出现 transition 的选择器只有根节点那条（+ 它的 reduced-motion 关闭）
    const transitionSelectors = [...css.matchAll(/(?<selector>[^{}]+)\{[^{}]*transition:/g)]
      .map((match) => (match.groups?.selector ?? '').trim())
      .filter((selector) => !selector.startsWith('@media'))
    expect(new Set(transitionSelectors)).toEqual(new Set([".fui-app-window[data-motion='auto']"]))
    expect(css).toContain('transition: none')
  })
})

describe('FluereAppWindow 与 Provider 协同（locale 内建文案）', () => {
  it('locale=en 时返回 / 导航按钮取英文可访问名，caption 按钮同步切英文', () => {
    const wrapper = mount(FluereConfigProvider, {
      props: { locale: 'en' },
      slots: {
        default: () =>
          h(FluereAppWindow, { isBackButtonVisible: true, isPaneToggleButtonVisible: true }),
      },
    })
    wrappers.push(wrapper)
    expect(wrapper.get('.fui-app-window__nav-button--back').attributes('aria-label')).toBe('Back')
    expect(wrapper.get('.fui-app-window__nav-button--pane-toggle').attributes('aria-label')).toBe(
      'Toggle Navigation',
    )
    expect(wrapper.get('.fui-caption-buttons__button--close').attributes('aria-label')).toBe(
      'Close',
    )
  })
})
