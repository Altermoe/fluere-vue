import { mount } from '@vue/test-utils'
import { vi } from 'vitest'
import type { Mock } from 'vitest'
/* oxlint-disable capitalized-comments, id-length, init-declarations, no-magic-numbers, no-null, prefer-destructuring, exports-last, import/group-exports, typescript/array-type -- 测试工具：组合多个引擎与一次性工厂，豁免结构风格规则 */
/**
 * ScrollView 模块单元测试共享工具。
 *
 * 各 composable 都是接收「core 对象 + 依赖引擎」的工厂函数，这里用真实的
 * createScrollViewCore 构造被测对象（clamp / maxOffset / scaleAboutCenter 等
 * 计算即为被测逻辑本身），并暴露：
 *  - makeCore：构造 core（可覆写 props / events，可注入假元素）
 *  - makeEvents：全 spy 的事件集合
 *  - rAF 假时钟：手动驱动 requestAnimationFrame，让动画测试能精确断言到
 *    任意时间节点（不受 vitest 假计时器的帧边界影响）
 */
import { computed, defineComponent, effectScope, ref } from 'vue'
import { createScrollViewCore } from '../core'
import type { ScrollViewCore } from '../core'
import type { ScrollViewEvents } from '../events'
import type { ResolvedScrollViewProps } from '../types'
import { useAnimation } from '../use-animation'
import type { AnimationEngine } from '../use-animation'
import { useInertia } from '../use-inertia'
import type { InertiaEngine } from '../use-inertia'
import { useScrollApi } from '../use-scroll-api'
import type { ScrollApi } from '../use-scroll-api'
import type { ScrollBars } from '../use-scroll-bars'

const DEFAULT_PROPS: ResolvedScrollViewProps = {
  contentOrientation: 'vertical',
  horizontalScrollMode: 'enabled',
  verticalScrollMode: 'enabled',
  horizontalScrollBarVisibility: 'auto',
  verticalScrollBarVisibility: 'auto',
  horizontalScrollChainMode: 'auto',
  verticalScrollChainMode: 'auto',
  horizontalScrollRailMode: 'enabled',
  verticalScrollRailMode: 'enabled',
  zoomMode: 'disabled',
  zoomChainMode: 'auto',
  ignoredInputKinds: [],
  minZoomFactor: 0.1,
  maxZoomFactor: 10,
  horizontalAnchorRatio: Number.NaN,
  verticalAnchorRatio: Number.NaN,
  background: undefined,
  tabIndex: 0,
  label: undefined,
  agentCommands: true,
}

/** 每个事件一个 vi.fn 的事件集合（含 Mock 类型，便于断言调用参数） */
export type MockEvents = { [K in keyof ScrollViewEvents]: Mock }

export const makeEvents = (): ScrollViewEvents & MockEvents =>
  ({
    viewChanged: vi.fn(),
    extentChanged: vi.fn(),
    stateChanged: vi.fn(),
    scrollAnimationStarting: vi.fn(),
    scrollCompleted: vi.fn(),
    zoomAnimationStarting: vi.fn(),
    zoomCompleted: vi.fn(),
    anchorRequested: vi.fn(),
    bringIntoView: vi.fn(),
  }) as ScrollViewEvents & MockEvents

/** 模板 ref 的可注入版本（组件外 useTemplateRef 返回 null，测试按需赋值） */
type ElementName =
  | 'rootEl'
  | 'viewportEl'
  | 'contentEl'
  | 'vBarEl'
  | 'vThumbEl'
  | 'hBarEl'
  | 'hThumbEl'

export interface TestCore extends ScrollViewCore {
  events: ScrollViewEvents & MockEvents
  setElement: (name: ElementName, el: unknown) => void
}

export const makeCore = (
  options: {
    props?: Partial<ResolvedScrollViewProps>
    events?: ScrollViewEvents
  } = {},
): TestCore => {
  const events = options.events ?? makeEvents()
  const props = { ...DEFAULT_PROPS, ...options.props }
  const core = createScrollViewCore(props, events)
  const setElement = (name: ElementName, el: unknown): void => {
    ;(core[name] as { value: unknown }).value = el
  }
  return Object.assign(core, { events, setElement }) as TestCore
}

/** 最小可用的 bars 假对象（各模块仅使用其中部分字段） */
export const makeBars = (): ScrollBars =>
  ({
    barsVisible: ref(false),
    barsImmediate: ref(false),
    hovering: ref(false),
    panningActive: ref(false),
    thumbDragging: ref(false),
    trackExpanded: computed(() => false),
    showBars: vi.fn(),
    scheduleHide: vi.fn(),
    onPointerOverViewport: vi.fn(),
    onPointerOutViewport: vi.fn(),
    onBarPointerEnter: vi.fn(),
    onBarPointerLeave: vi.fn(),
  }) as unknown as ScrollBars

/* ------------------------------------------------------------------ */
/* 组合式引擎：在 effectScope 中创建，避免 onScopeDispose 的无作用域警告   */
/* ------------------------------------------------------------------ */

/** 在独立 effectScope 中执行工厂（使 onScopeDispose 有活跃作用域、可正常清理） */
export const scoped = <T>(factory: () => T): { value: T; dispose: () => void } => {
  const scope = effectScope()
  const value = scope.run(factory) as T
  return { value, dispose: () => scope.stop() }
}

/** 常用引擎组合：core + bars + animation + inertia + api（全部在作用域内创建） */
export interface EngineHarness {
  core: TestCore
  bars: ScrollBars
  animation: AnimationEngine
  inertia: InertiaEngine
  api: ScrollApi
  dispose: () => void
}

export const makeEngine = (
  options: {
    props?: Partial<ResolvedScrollViewProps>
    events?: ScrollViewEvents
  } = {},
): EngineHarness => {
  const core = makeCore(options)
  const scope = effectScope()
  let bars!: ScrollBars
  let animation!: AnimationEngine
  let inertia!: InertiaEngine
  let api!: ScrollApi
  scope.run(() => {
    bars = makeBars()
    animation = useAnimation(core, bars)
    inertia = useInertia(core, animation)
    api = useScrollApi(core, animation, inertia)
  })
  return { core, bars, animation, inertia, api, dispose: () => scope.stop() }
}

/**
 * 在真实组件 setup 中执行工厂：让使用 onMounted / onScopeDispose 等生命周期
 * hook 的 composable（如 useWheelInput / useMeasurement）有合法的组件上下文。
 */
export const mountSetup = <T>(factory: () => T): { result: T; unmount: () => void } => {
  const Host = defineComponent({
    setup() {
      return { result: factory() }
    },
    render: () => null,
  })
  const wrapper = mount(Host)
  const result = (wrapper.vm as { result: T }).result
  return { result, unmount: () => wrapper.unmount() }
}

/** 假元素：提供模块所需的最小 DOM 面（getBoundingClientRect + style） */
export type RectElement = {
  getBoundingClientRect: () => DOMRect
  style: Record<string, string>
} & Record<string, unknown>

/** 构造一个矩形假元素（getBoundingClientRect 返回指定矩形） */
export const makeRectElement = (
  rect: { left?: number; top?: number; width?: number; height?: number } = {},
  extra: Record<string, unknown> = {},
): RectElement => {
  const left = rect.left ?? 0
  const top = rect.top ?? 0
  const width = rect.width ?? 0
  const height = rect.height ?? 0
  return {
    getBoundingClientRect: () =>
      ({
        left,
        top,
        width,
        height,
        right: left + width,
        bottom: top + height,
        x: left,
        y: top,
        toJSON: () => ({}),
      }) as DOMRect,
    style: {},
    ...extra,
  } as RectElement
}

/* ------------------------------------------------------------------ */
/* rAF 假时钟：逐帧手动驱动，完全确定的时间节点                          */
/* ------------------------------------------------------------------ */

/** 由测试逐帧驱动的 requestAnimationFrame 假实现（支持多个并发回调，便于嵌套组件测试） */
export interface RafClock {
  now: number
  /** 推进一帧（默认 16ms），调用已注册的回调并返回触发时间戳 */
  step: (deltaMs?: number) => number
  /** 推进多帧 */
  run: (totalMs: number, deltaMs?: number) => void
  /** 清理 stub */
  dispose: () => void
}

export const installRafClock = (): RafClock => {
  const pending = new Map<number, (time: number) => void>()
  let rafId = 1
  const clock: RafClock = {
    now: 0,
    step(deltaMs = 16) {
      clock.now += deltaMs
      // 快照后清空：回调内新注册的 rAF 留到下一帧，与浏览器语义一致
      const batch = [...pending.values()]
      pending.clear()
      for (const cb of batch) {
        cb(clock.now)
      }
      return clock.now
    },
    run(totalMs, deltaMs = 16) {
      let elapsed = 0
      while (elapsed < totalMs) {
        elapsed += deltaMs
        clock.step(deltaMs)
      }
    },
    dispose() {
      vi.unstubAllGlobals()
    },
  }
  vi.stubGlobal('requestAnimationFrame', (cb: (time: number) => void) => {
    const id = rafId
    rafId += 1
    pending.set(id, cb)
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    pending.delete(id)
  })
  vi.spyOn(performance, 'now').mockImplementation(() => clock.now)
  return clock
}
