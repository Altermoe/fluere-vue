/**
 * 标题栏「中段折叠」判定层（对齐 `DisplayModeGroup`）。
 *
 * WinUI 真值（`winui3/release/2.0.1`，src/controls/dev/TitleBar/TitleBar.cpp#OnSizeChanged`）：
 *
 * ```cpp
 * if (!m_compactModeThresholdWidth && contentArea.DesiredSize().Width >= contentAreaGrid.ActualWidth())
 * {
 *     m_compactModeThresholdWidth = args.NewSize().Width;   // 记录「当时的控件宽度」当回退阈值
 *     m_isCompact = true;  GoToState(Compact);
 * }
 * else if (m_isCompact && args.NewSize().Width >= m_compactModeThresholdWidth)
 * {
 *     m_compactModeThresholdWidth = 0.0;
 *     m_isCompact = false; GoToState(Expanded); UpdateTitle(); UpdateSubtitle();
 * }
 * ```
 *
 * 两处细节必须照抄：
 *   1. 判据是「中段的**期望宽** ≥ 中段格的**可用宽**」，不是固定断点 —— 所以长内容也会触发折叠。
 *   2. 回退用的阈值是**进入折叠那一刻的标题栏宽度**（不是 0 也不是中段宽），
 *      因此必须记住它，否则会被抖动卡在折叠态。
 *
 * 优先级：`TitleBar.xaml` 里 `TitleTextGroup` 先声明、`DisplayModeGroup` 后声明，两组都会写
 * `PART_TitleText.Visibility` ⇒ **后声明的 Compact 胜出**（标题 / 副标题被折叠）。本组件用
 * `data-display-mode='compact'` 一次性表达这个结果，不拆成两个互相打架的状态位。
 *
 * SSR 约束：`ResizeObserver` 只在 `onMounted` 内创建、`onScopeDispose` 断开（与
 * `infobar/use-infobar-layout.ts` 同一写法）；服务端与首帧取「Expanded」，
 * 与 WinUI 首次 layout 无从判定折叠的落点一致，不产生水合不一致。
 */

import { computed, onMounted, onScopeDispose, ref, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { FluereAppWindowDisplayMode } from './types'

/** 折叠判定的内部状态（与 C++ 的两个成员一一对应） */
export interface TitleBarDisplayModeState {
  /** `m_isCompact` */
  isCompact: boolean
  /** `m_compactModeThresholdWidth` */
  thresholdWidth: number
}

/** 折叠判定输入 */
export interface TitleBarDisplayModeInput {
  /** 当前标题栏宽度（对应 `SizeChangedEventArgs.NewSize().Width`） */
  titleBarWidth: number
  /** 中段内容的期望宽（对应 `contentArea.DesiredSize().Width`） */
  desiredWidth: number
  /** 中段格的可用宽（对应 `contentAreaGrid.ActualWidth()`） */
  availableWidth: number
}

/**
 * 纯函数版状态机：复刻 `TitleBar.cpp#OnSizeChanged` 的两条分支（可独立单测）。
 *
 * 与源码的两处差异，都是「XAML 事件模型 vs Web 观察者模型」的必然翻译，逐条记录：
 *
 *  1. **退出判据用严格大于**（`titleBarWidth > thresholdWidth`，源码是 `>=`）。
 *     XAML 的 `SizeChanged` 只在尺寸**真的变化**时触发，所以「在同一个宽度上刚进折叠又立刻退出」
 *     不可能发生；Web 侧进折叠本身会改变中段的可用宽（标题 / 副标题折叠后那一列归零），
 *     于是 `ResizeObserver` 会在**同一个标题栏宽度**上再发一次回调 —— 若沿用 `>=`，
 *     就会「进折叠 → 立刻退出 → 再进折叠」自激振荡（实测 640 宽视口下每几百毫秒翻一次）。
 *     改用严格大于后，同一宽度上不会退出；窗口真的变大时才退出（比源码晚 1px，可忽略）。
 *  2. **测量防抖 + 翻转闸门**（见 `MEASURE_DEBOUNCE_MS` / `gateDisplayMode`）：
 *     一次改尺寸会连发多轮回调，途中的布局只更新了一部分，需要等布局稳定并连续两次一致才落状态。
 */
export const resolveDisplayModeState = (
  state: TitleBarDisplayModeState,
  input: TitleBarDisplayModeInput,
): TitleBarDisplayModeState => {
  const { isCompact, thresholdWidth } = state
  const { titleBarWidth, desiredWidth, availableWidth } = input

  // Web 侧守卫：标题栏宽度或中段期望宽还没量到（SSR 后首帧、jsdom 的 0 尺寸）时不折叠。
  // 注意**不**守卫 `availableWidth`：WinUI 的判据是 `desired >= available`，
  // 中段可用宽被挤到 0 时同样应当折叠（`200 >= 0` 成立）。
  if (titleBarWidth <= 0 || desiredWidth <= 0) {
    return state
  }

  if (thresholdWidth === 0 && desiredWidth >= availableWidth) {
    // 首次放不下：记住「进入折叠时的宽度」当回退阈值
    return { isCompact: true, thresholdWidth: titleBarWidth }
  }
  if (isCompact && titleBarWidth > thresholdWidth) {
    // 宽度**真的**变大到阈值以上：退出折叠并清空阈值（下次放不下会重新记录）
    return { isCompact: false, thresholdWidth: 0 }
  }
  return state
}

/**
 * 翻转闸门：**连续两次测量都提出同一次翻转**才允许落地。
 *
 * 为什么需要它：WinUI 的 `SizeChanged` 是逐次、有序的尺寸事件，一次判定就是对的结果；
 * 而 Web 的一次改尺寸会触发多轮 `ResizeObserver` 回调（标题栏 / 中段格 / 隐藏镜像各自
 * 观察），中间几帧的布局可能只更新了一部分（例如镜像还没换行、可用宽还在旧值），
 * 若每次测量都直接落状态，`Compact` 会在 resize 过程中来回翻（实测：640 宽下
 * 第一帧 compact、下一帧又 expanded）。
 *
 * 语义：状态**从不因为「没有翻转提案」而变化**；`signature` 只在提案出现时记下，
 * 下一次测量若提出同一次翻转就落地，否则清空重来。
 */
/**
 * 测量防抖窗口（毫秒）。
 *
 * 一次改尺寸会连发多轮 `ResizeObserver` 回调（标题栏 / 中段格 / 隐藏镜像各自观察），
 * 途中的布局只更新了一部分；等到不再有新回调后的这一小段时间再量，拿到的才是稳定布局
 * —— 与 XAML 里逐次有序的 `SizeChanged` 等价。代价是折叠比尺寸变化晚约 100ms 生效。
 */
const MEASURE_DEBOUNCE_MS = 100

export interface DisplayModeGate {
  /** 上一次「未被落地」的翻转提案（空串 = 无待定提案） */
  signature: string
}

export const gateDisplayMode = (
  gate: DisplayModeGate,
  state: TitleBarDisplayModeState,
  input: TitleBarDisplayModeInput,
): { gate: DisplayModeGate; state: TitleBarDisplayModeState } => {
  const next = resolveDisplayModeState(state, input)
  if (next === state) {
    // 本次没有翻转提案：清空待定
    return { gate: { signature: '' }, state }
  }
  const signature = next.isCompact ? 'compact' : 'expanded'
  if (gate.signature !== signature) {
    // 第一次看到这次翻转：记下待定，等下一次同样的提案
    return { gate: { signature }, state }
  }
  return { gate: { signature: '' }, state: next }
}

export interface TitleBarDisplayModeController {
  /** 标题栏整行（量 `titleBarWidth`） */
  titleBarRef: Ref<HTMLElement | null>
  /** 中段内容格（量 `availableWidth`） */
  contentCellRef: Ref<HTMLElement | null>
  /** 隐藏镜像层宿主（量 `desiredWidth`：`width: max-content` 下的固有宽） */
  measureRef: Ref<HTMLElement | null>
  /** `data-display-mode` 的取值 */
  displayMode: ComputedRef<FluereAppWindowDisplayMode>
  /** 主动重测一次 */
  measure: () => void
}

/**
 * @param enabled 是否提供 `#titlebar-content`（对应 `Content() != nullptr`；为 false 时恒 Expanded）
 * @param deps    触发重测的响应式依赖（插槽内容 / 语言 / 字号 …）
 */
export const useTitleBarDisplayMode = (
  enabled: () => boolean,
  deps: () => readonly unknown[],
): TitleBarDisplayModeController => {
  const titleBarRef = ref<HTMLElement | null>(null)
  const contentCellRef = ref<HTMLElement | null>(null)
  const measureRef = ref<HTMLElement | null>(null)
  const state = ref<TitleBarDisplayModeState>({ isCompact: false, thresholdWidth: 0 })
  /** 翻转闸门（非响应式：只是防抖用的过程状态） */
  let gate: DisplayModeGate = { signature: '' }

  const displayMode = computed<FluereAppWindowDisplayMode>(() =>
    enabled() && state.value.isCompact ? 'compact' : 'expanded',
  )

  const measure = (): void => {
    if (!enabled()) {
      state.value = { isCompact: false, thresholdWidth: 0 }
      gate = { signature: '' }
      return
    }
    const titleBar = titleBarRef.value
    const cell = contentCellRef.value
    const host = measureRef.value
    if (titleBar === null || cell === null || host === null) {
      return
    }
    const desired = host.querySelector('[data-fui-app-window-measure]')
    const gated = gateDisplayMode(gate, state.value, {
      titleBarWidth: titleBar.clientWidth,
      desiredWidth: desired instanceof HTMLElement ? Math.ceil(desired.scrollWidth) : 0,
      availableWidth: cell.clientWidth,
    })
    gate = gated.gate
    state.value = gated.state
    if (gate.signature !== '') {
      // 有翻转提案待定：下一拍（布局已稳定）再确认一次，保证最终状态一定落地
      scheduleMeasure()
    }
  }

  /** 布局变化后等布局稳定再量，避免读到 resize 中途的瞬时布局 */
  const scheduleMeasure = (): void => {
    if (measureTimer !== undefined) {
      clearTimeout(measureTimer)
    }
    measureTimer = setTimeout(() => {
      measureTimer = undefined
      measure()
    }, MEASURE_DEBOUNCE_MS)
  }

  let measureTimer: ReturnType<typeof setTimeout> | undefined = undefined
  let cellObserver: ResizeObserver | undefined = undefined
  let measureObserver: ResizeObserver | undefined = undefined

  onMounted(() => {
    // 能力探测：没有 ResizeObserver 的环境退化为「挂载后测一次 + 依赖变化时重测」
    if (typeof ResizeObserver === 'function') {
      cellObserver = new ResizeObserver(scheduleMeasure)
      if (contentCellRef.value !== null) {
        cellObserver.observe(contentCellRef.value)
      }
      measureObserver = new ResizeObserver(scheduleMeasure)
      if (measureRef.value !== null) {
        measureObserver.observe(measureRef.value)
      }
      if (titleBarRef.value !== null) {
        cellObserver.observe(titleBarRef.value)
      }
    }
    scheduleMeasure()
  })

  onScopeDispose(() => {
    cellObserver?.disconnect()
    measureObserver?.disconnect()
    cellObserver = undefined
    measureObserver = undefined
  })

  watch(deps, scheduleMeasure, { flush: 'post' })

  return { titleBarRef, contentCellRef, measureRef, displayMode, measure }
}
