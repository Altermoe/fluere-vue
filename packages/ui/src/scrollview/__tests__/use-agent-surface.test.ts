/* oxlint-disable capitalized-comments, init-declarations, max-statements, no-magic-numbers, id-length --
 * 测试代码：文件头为被测契约说明；组合式引擎需要在作用域内回填，故豁免 init-declarations；
 * 断言步骤数与几何 / 像素常量属测试表达。 */
/**
 * useAgentSurface：Agent 交互面的契约。
 *
 *  - **只读反射**：`data-scroll-*` 用的取整值逐帧跟随视图；滚动条
 *    `aria-valuenow / max` 只在视图静止时刷新（动画期间逐帧写 ARIA 会让
 *    辅助技术反复播报）。
 *  - **入站命令**：`fluere:scroll-to` / `scroll-by` / `bring-into-view` 映射到
 *    程序化 API；载荷非法或目标不可解析时是空操作，不抛错。
 *  - **出站回执**：命令落地（即时写完或动画 / 惯性结束）后派发一次
 *    `fluere:scroll-settled`，且派发时反射属性已是最终值。
 */
import { describe, expect, it } from 'vitest'
import { effectScope, nextTick } from 'vue'
import type { ResolvedScrollViewProps, ScrollingAgentSettledDetail } from '../types'
import { SCROLL_VIEW_AGENT_EVENTS, useAgentSurface } from '../use-agent-surface'
import type { AgentSurface } from '../use-agent-surface'
import { useAnimation } from '../use-animation'
import type { BringIntoViewController } from '../use-bring-into-view'
import { useBringIntoView } from '../use-bring-into-view'
import { useInertia } from '../use-inertia'
import type { ScrollApi } from '../use-scroll-api'
import { useScrollApi } from '../use-scroll-api'
import { installRafClock, makeBars, makeCore, type TestCore } from './helpers'

interface AgentHarness {
  core: TestCore
  agent: AgentSurface
  api: ScrollApi
  disposal: () => void
}

/** 组件外构造被测组合：core + api + bringIntoView + agent（同一 core，故共享状态） */
const makeHarness = (props: Partial<ResolvedScrollViewProps> = {}): AgentHarness => {
  const core = makeCore({ props })
  const scope = effectScope()
  let api!: ScrollApi
  let bringIntoView!: BringIntoViewController
  let agent!: AgentSurface
  scope.run(() => {
    const bars = makeBars()
    const animation = useAnimation(core, bars)
    const inertia = useInertia(core, animation)
    api = useScrollApi(core, animation, inertia)
    bringIntoView = useBringIntoView(core, animation)
    agent = useAgentSurface(core, api, bringIntoView)
  })
  return { core, api, agent, disposal: () => scope.stop() }
}

/** 派发一条命令事件（`bubbles` 与文档示例一致，便于页面级监听） */
const dispatchCommand = (target: EventTarget, name: string, detail: unknown): void => {
  target.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }))
}

/** 收集根元素上的回执，返回收到的载荷数组 */
const collectSettled = (root: HTMLElement): ScrollingAgentSettledDetail[] => {
  const received: ScrollingAgentSettledDetail[] = []
  root.addEventListener(SCROLL_VIEW_AGENT_EVENTS.settled, (event) => {
    received.push((event as CustomEvent<ScrollingAgentSettledDetail>).detail)
  })
  return received
}

/**
 * 建立与组件模板等价的绑定：三个命令处理器挂在根元素上。
 * 这里是测试侧的显式接线（组件里由模板 `@fluere:scroll-to` 等负责），
 * 若哪天模板漏绑，组件级用例会失败。
 */
const bindCommands = (root: HTMLElement, agent: AgentSurface): void => {
  root.addEventListener(SCROLL_VIEW_AGENT_EVENTS.scrollTo, agent.onScrollTo)
  root.addEventListener(SCROLL_VIEW_AGENT_EVENTS.scrollBy, agent.onScrollBy)
  root.addEventListener(SCROLL_VIEW_AGENT_EVENTS.bringIntoView, agent.onBringIntoView)
}

/** 造一个已接线的根元素并注入 core */
const bindRoot = (core: TestCore, agent: AgentSurface): HTMLElement => {
  const root = document.createElement('div')
  core.setElement('rootEl', root)
  bindCommands(root, agent)
  return root
}

/** 给元素钉一个矩形（jsdom 不做布局，getBoundingClientRect 恒为 0×0） */
const stubRect = (element: Element, rect: { top: number; height: number }): void => {
  element.getBoundingClientRect = (): DOMRect =>
    ({
      x: 0,
      y: rect.top,
      top: rect.top,
      left: 0,
      right: 300,
      bottom: rect.top + rect.height,
      width: 300,
      height: rect.height,
      toJSON: () => rect,
    }) as DOMRect
}

describe('useAgentSurface · 只读反射', () => {
  it('像素值取整后跟随视图变化', async () => {
    const { core, agent, disposal } = makeHarness()
    core.viewportHeight.value = 100
    core.extentHeight.value = 460.4
    core.offsetY.value = 120.6
    await nextTick()

    expect(agent.scrollY.value).toBe(121)
    // 可滚动高度 = 460.4 − 100 = 360.4 ⇒ 取整 360（与偏移同口径，便于相等比较）
    expect(agent.maxScrollY.value).toBe(360)
    expect(agent.scrollX.value).toBe(0)
    expect(agent.zoomFactor.value).toBe(1)
    disposal()
  })

  it('滚动条 ARIA 只在视图静止时刷新，动画期间不追帧', async () => {
    const { core, agent, disposal } = makeHarness()
    core.viewportHeight.value = 100
    core.extentHeight.value = 1000

    core.setState('animation')
    core.offsetY.value = 500
    await nextTick()
    expect(agent.ariaValueNowY.value).toBe(0)

    core.setState('idle')
    await nextTick()
    expect(agent.ariaValueNowY.value).toBe(500)
    expect(agent.ariaValueMaxY.value).toBe(900)
    disposal()
  })

  it('静止状态下的直接写入（reduced-motion 直通路径）同样会刷新 ARIA', async () => {
    const { core, agent, disposal } = makeHarness()
    core.viewportHeight.value = 100
    core.extentHeight.value = 1000

    // 状态从未离开 idle：直通写入偏移，ARIA 必须跟上
    core.offsetY.value = 250
    await nextTick()
    expect(agent.ariaValueNowY.value).toBe(250)
    disposal()
  })
})

describe('useAgentSurface · 入站命令', () => {
  it('scroll-to 写绝对偏移并回执（取整后的当前值）', async () => {
    const { core, agent, disposal } = makeHarness()
    core.viewportHeight.value = 100
    core.extentHeight.value = 1000
    const root = bindRoot(core, agent)

    const settled = collectSettled(root)
    dispatchCommand(root, SCROLL_VIEW_AGENT_EVENTS.scrollTo, {
      y: 300,
      animationMode: 'disabled',
    })
    expect(core.offsetY.value).toBe(300)

    await nextTick()
    expect(settled).toEqual([{ x: 0, y: 300, zoomFactor: 1 }])
    disposal()
  })

  it('scroll-by 按增量滚动；缺省分量按 0 处理', async () => {
    const { core, agent, disposal } = makeHarness()
    core.viewportHeight.value = 100
    core.extentHeight.value = 1000
    const root = bindRoot(core, agent)

    dispatchCommand(root, SCROLL_VIEW_AGENT_EVENTS.scrollBy, { y: 200, animationMode: 'disabled' })
    expect(core.offsetY.value).toBe(200)

    dispatchCommand(root, SCROLL_VIEW_AGENT_EVENTS.scrollBy, { y: 200, animationMode: 'disabled' })
    expect(core.offsetX.value).toBe(0)
    expect(core.offsetY.value).toBe(400)
    disposal()
  })

  it('带动画的命令在动画结束后才回执', async () => {
    const clock = installRafClock()
    const { core, agent, disposal } = makeHarness()
    core.viewportHeight.value = 100
    core.extentHeight.value = 1000
    const root = bindRoot(core, agent)

    const settled = collectSettled(root)
    dispatchCommand(root, SCROLL_VIEW_AGENT_EVENTS.scrollBy, { y: 400 })
    expect(core.interactionState.value).toBe('animation')
    expect(settled).toHaveLength(0)

    clock.run(1200)
    // 回执由「状态回到 idle」的观察者触发，而派发本身又排在 nextTick 上：
    // 需要两跳（第一跳跑观察者并排回执，第二跳才派发）才能观察到
    await nextTick()
    await nextTick()
    expect(core.offsetY.value).toBe(400)
    expect(settled).toEqual([{ x: 0, y: 400, zoomFactor: 1 }])
    clock.dispose()
    disposal()
  })

  it('bring-into-view 用内容区内的元素算出目标偏移；区域外元素为空操作', async () => {
    const { core, agent, disposal } = makeHarness()
    const root = bindRoot(core, agent)
    const viewport = document.createElement('div')
    const content = document.createElement('div')
    const inside = document.createElement('div')
    const outside = document.createElement('div')
    core.setElement('viewportEl', viewport)
    core.setElement('contentEl', content)
    content.append(inside)
    root.append(outside)

    core.viewportHeight.value = 100
    core.viewportWidth.value = 300
    core.extentHeight.value = 1000
    stubRect(viewport, { top: 0, height: 100 })
    // 元素在视口下方 250px 处、高 20px ⇒ 目标偏移 250 + 20 − 100 = 170
    stubRect(inside, { top: 250, height: 20 })

    dispatchCommand(root, SCROLL_VIEW_AGENT_EVENTS.bringIntoView, { element: inside })
    expect(core.events.bringIntoView).toHaveBeenLastCalledWith(
      expect.objectContaining({ targetVerticalOffset: 170 }),
    )

    dispatchCommand(root, SCROLL_VIEW_AGENT_EVENTS.bringIntoView, { element: outside })
    expect(core.events.bringIntoView).toHaveBeenCalledTimes(1)
    disposal()
  })

  it('载荷非法 / 无 detail 时是空操作，不抛错', async () => {
    const { core, agent, disposal } = makeHarness()
    core.viewportHeight.value = 100
    core.extentHeight.value = 1000
    const root = bindRoot(core, agent)

    expect(() => {
      dispatchCommand(root, SCROLL_VIEW_AGENT_EVENTS.scrollTo, undefined)
      dispatchCommand(root, SCROLL_VIEW_AGENT_EVENTS.scrollBy, { y: Number.NaN })
      dispatchCommand(root, SCROLL_VIEW_AGENT_EVENTS.bringIntoView, { selector: '[data-x]' })
    }).not.toThrow()
    expect(core.offsetY.value).toBe(0)
    disposal()
  })

  it('根元素尚未挂载时命令仍生效，回执静默跳过', async () => {
    const { core, agent, disposal } = makeHarness()
    core.viewportHeight.value = 100
    core.extentHeight.value = 1000
    // 处理器挂在别处，core.rootEl 仍为 null：命令照常生效，回执无处可派发
    const target = document.createElement('div')
    bindCommands(target, agent)

    expect(() => {
      dispatchCommand(target, SCROLL_VIEW_AGENT_EVENTS.scrollBy, {
        y: 100,
        animationMode: 'disabled',
      })
    }).not.toThrow()
    expect(core.offsetY.value).toBe(100)
    await nextTick()
    disposal()
  })

  it('agentCommands=false 时忽略命令', async () => {
    const { core, agent, disposal } = makeHarness({ agentCommands: false })
    core.viewportHeight.value = 100
    core.extentHeight.value = 1000
    const root = bindRoot(core, agent)

    const settled = collectSettled(root)
    dispatchCommand(root, SCROLL_VIEW_AGENT_EVENTS.scrollBy, { y: 300, animationMode: 'disabled' })
    await nextTick()

    expect(core.offsetY.value).toBe(0)
    expect(settled).toHaveLength(0)
    disposal()
  })
})
