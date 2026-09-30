/**
 * Agent 交互面：把视图状态反射到 DOM，并接受 DOM 命令事件。
 *
 * 存在的前提：本组件的偏移由内容 `transform` 表达、presenter 是 `overflow: clip`
 * （见 scroll-view.css 与 docs/style-spec.md 的「文档站内容区不是原生滚动容器」），
 * 因此**浏览器侧的原生滚动语义在本组件内不存在** —— `scrollTop` 恒为 0，
 * `scrollBy` / `scrollIntoView` / `scrollIntoViewIfNeeded` 都找不到可滚动祖先。
 * 页面自动化与 Agent 于是只剩「合成真实滚轮 / 拖拽」一条路，而且无法确认结果。
 * 本模块补两条通路（都不改动滚动实现本身）：
 *
 *  1. **只读反射**：`data-scroll-x/y`、`data-scroll-max-x/y`、`data-zoom-factor`、
 *     `data-scroll-state` 始终反映当前视图，调用方据此判断「动没动、还剩多少」，
 *     形成闭环；`aria-valuenow/max` 则只在视图静止时刷新，避免逐帧写 ARIA
 *     导致辅助技术反复播报。
 *  2. **命令事件**：`fluere:scroll-to` / `fluere:scroll-by` /
 *     `fluere:bring-into-view` 直接映射到程序化 API；命令落地（或无从落地）后
 *     派发 `fluere:scroll-settled` 回执，调用方无需轮询即可等到稳定帧。
 *
 * 注意：`data-*` 属性在偏移变化时逐帧重写，**不要在 CSS 里匹配这些属性**，
 * 否则动画期间每帧都会触发样式重算。
 *
 * 来源说明：这是 Web 侧的自动化扩展，不对应 WinUI ScrollView 的依赖属性
 * （原生侧同类职责由 UI Automation 的 ScrollPattern 承担）；本地 WinUI 快照
 * （temp/winui-src，winui3/release/2.5.1）未包含滚动控件源码，故不在此断言
 * peer 名称与逐条语义。
 */
import { computed, nextTick, ref, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { ScrollViewCore } from './core'
import type {
  ScrollingAgentBringIntoViewDetail,
  ScrollingAgentScrollDetail,
  ScrollingAgentSettledDetail,
  ScrollingInteractionState,
  ScrollingScrollOptions,
} from './types'
import type { BringIntoViewController } from './use-bring-into-view'
import type { ScrollApi } from './use-scroll-api'

/** 入站命令事件名（页面 / Agent → 组件） */
const AGENT_SCROLL_TO_EVENT = 'fluere:scroll-to'
const AGENT_SCROLL_BY_EVENT = 'fluere:scroll-by'
const AGENT_BRING_INTO_VIEW_EVENT = 'fluere:bring-into-view'
/** 出站回执事件名（组件 → 页面 / Agent） */
const AGENT_SETTLED_EVENT = 'fluere:scroll-settled'

/** 对外公开的事件名表：页面自动化按名字派发 / 监听，避免拼写漂移 */
const SCROLL_VIEW_AGENT_EVENTS = {
  scrollTo: AGENT_SCROLL_TO_EVENT,
  scrollBy: AGENT_SCROLL_BY_EVENT,
  bringIntoView: AGENT_BRING_INTO_VIEW_EVENT,
  settled: AGENT_SETTLED_EVENT,
} as const

/** Agent 交互面暴露给模板的对象 */
interface AgentSurface {
  /* 只读反射（逐帧跟随视图，供 data-* 绑定） */
  scrollX: ComputedRef<number>
  scrollY: ComputedRef<number>
  maxScrollX: ComputedRef<number>
  maxScrollY: ComputedRef<number>
  zoomFactor: ComputedRef<number>
  scrollState: ComputedRef<ScrollingInteractionState>

  /* 滚动条 ARIA 取值（静止时刷新，供 aria-* 绑定） */
  ariaValueNowX: Ref<number>
  ariaValueNowY: Ref<number>
  ariaValueMaxX: Ref<number>
  ariaValueMaxY: Ref<number>

  /* 入站命令处理器（绑在根元素上） */
  onScrollTo: (event: Event) => void
  onScrollBy: (event: Event) => void
  onBringIntoView: (event: Event) => void
}

/** 反射给 Agent 的像素值一律取整：便于调用方直接做「到底了没有」的相等比较 */
const rounded = (source: Ref<number>): ComputedRef<number> =>
  computed(() => Math.round(source.value))

/** 只接受有限数：命令载荷里的 NaN / Infinity / 非数字一律视为未提供 */
const toFinite = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined

/** 命令载荷：非对象（未带 detail 或 detail 不是对象）一律当作空载荷，不抛错 */
const readDetail = <TDetail>(event: Event): TDetail | undefined => {
  const { detail } = event as CustomEvent<TDetail>
  return detail && typeof detail === 'object' ? detail : undefined
}

/** 把命令载荷里的 animationMode 折成程序化 API 的 options */
const scrollOptions = (
  detail: ScrollingAgentScrollDetail | undefined,
): ScrollingScrollOptions | undefined =>
  detail?.animationMode === undefined ? undefined : { animationMode: detail.animationMode }

/**
 * 只读反射与命令事件共用同一份状态；内容元素 id 不在这里生成 —— 组件用
 * `useId()` 生成后同时绑给内容元素与滚动条的 `aria-controls`。
 */
const useAgentSurface = (
  core: ScrollViewCore,
  api: ScrollApi,
  bringIntoView: BringIntoViewController,
): AgentSurface => {
  const { rootEl, contentEl, offsetX, offsetY, zoomFactor, scrollableWidth, scrollableHeight } =
    core

  const scrollX = rounded(offsetX)
  const scrollY = rounded(offsetY)
  const maxScrollX = rounded(scrollableWidth)
  const maxScrollY = rounded(scrollableHeight)

  /* ---- 滚动条 ARIA：只在视图静止时同步，避免逐帧刷新辅助技术 ---- */

  const ariaValueNowX = ref(Math.round(offsetX.value))
  const ariaValueNowY = ref(Math.round(offsetY.value))
  const ariaValueMaxX = ref(Math.round(scrollableWidth.value))
  const ariaValueMaxY = ref(Math.round(scrollableHeight.value))

  watch(
    () =>
      [
        core.interactionState.value,
        offsetX.value,
        offsetY.value,
        scrollableWidth.value,
        scrollableHeight.value,
      ] as const,
    ([state, x, y, maxX, maxY]) => {
      if (state !== 'idle') {
        return
      }
      ariaValueNowX.value = Math.round(x)
      ariaValueNowY.value = Math.round(y)
      ariaValueMaxX.value = Math.round(maxX)
      ariaValueMaxY.value = Math.round(maxY)
    },
  )

  /* ---- settled 回执：命令落地后派发一次，读值发生在派发时刻 ---- */

  let settleScheduled = false
  let commandPending = false

  const dispatchSettled = (): void => {
    const root = rootEl.value
    if (!root) {
      return
    }
    const detail: ScrollingAgentSettledDetail = {
      x: Math.round(offsetX.value),
      y: Math.round(offsetY.value),
      zoomFactor: zoomFactor.value,
    }
    root.dispatchEvent(
      new CustomEvent<ScrollingAgentSettledDetail>(AGENT_SETTLED_EVENT, {
        detail,
        bubbles: true,
      }),
    )
  }

  /** 合并同一刷新周期内的多次落地为一次回执；延后到 nextTick，保证 `data-*` 已更新 */
  const scheduleSettled = (): void => {
    if (settleScheduled) {
      return
    }
    settleScheduled = true
    void nextTick(() => {
      settleScheduled = false
      dispatchSettled()
    })
  }

  /** 一次命令处理完毕：已静止则直接排回执，否则等状态回到 idle（动画 / 惯性结束） */
  const finishCommand = (): void => {
    if (core.interactionState.value === 'idle') {
      scheduleSettled()
      return
    }
    commandPending = true
  }

  watch(
    () => core.interactionState.value,
    (state) => {
      if (state === 'idle' && commandPending) {
        commandPending = false
        scheduleSettled()
      }
    },
    // 必须同步观察：状态可能在同一个刷新周期内往返（idle → animation → idle，
    // 例如极短动画或空转的动画），pre-flush 观察者会把两次变更合并成「没变化」
    // 而不触发回调，回执就永远发不出去。
    { flush: 'sync' },
  )

  /* ---- 入站命令 ---- */

  const onScrollTo = (event: Event): void => {
    if (!core.props.agentCommands) {
      return
    }
    const detail = readDetail<ScrollingAgentScrollDetail>(event)
    const x = toFinite(detail?.x)
    const y = toFinite(detail?.y)
    if (x !== undefined || y !== undefined) {
      api.scrollTo(x ?? offsetX.value, y ?? offsetY.value, scrollOptions(detail))
    }
    finishCommand()
  }

  const onScrollBy = (event: Event): void => {
    if (!core.props.agentCommands) {
      return
    }
    const detail = readDetail<ScrollingAgentScrollDetail>(event)
    const x = toFinite(detail?.x) ?? 0
    const y = toFinite(detail?.y) ?? 0
    if (x !== 0 || y !== 0) {
      api.scrollBy(x, y, scrollOptions(detail))
    }
    finishCommand()
  }

  const onBringIntoView = (event: Event): void => {
    if (!core.props.agentCommands) {
      return
    }
    const detail = readDetail<ScrollingAgentBringIntoViewDetail>(event)
    let target: HTMLElement | null = detail?.element ?? null
    if (!target && detail?.selector) {
      target = rootEl.value?.querySelector<HTMLElement>(detail.selector) ?? null
    }
    // 只接受内容区内的元素：区域外的元素没有「滚入本视口」的目标可言
    if (target && contentEl.value?.contains(target)) {
      bringIntoView.bringIntoView(target, { margin: toFinite(detail?.margin) ?? 0 })
    }
    finishCommand()
  }

  return {
    scrollX,
    scrollY,
    maxScrollX,
    maxScrollY,
    zoomFactor: computed(() => zoomFactor.value),
    scrollState: computed(() => core.interactionState.value),
    ariaValueNowX,
    ariaValueNowY,
    ariaValueMaxX,
    ariaValueMaxY,
    onScrollTo,
    onScrollBy,
    onBringIntoView,
  }
}

export { SCROLL_VIEW_AGENT_EVENTS, useAgentSurface, type AgentSurface }
