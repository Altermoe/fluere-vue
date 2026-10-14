/**
 * 平移 / 捏合共用状态机（输入无关）。
 *
 * 触摸（use-touch-input，原生 Touch Events）与笔（use-pointer-input，Pointer
 * Events）两个适配层都驱动同一份状态机：把手势的「落点 / 移动 / 抬起」归一成
 * PanSample 交给这里，由本模块负责 activePointers 追踪、单指平移（含速度采样
 * 与惯性衔接）与双指捏合（委托 use-pinch-input）。
 *
 * 本层刻意不含任何输入种类判定（pointerType / 触摸 identifier）与指针捕获：
 * 前者属适配层职责，后者由指针适配层用 setPointerCapture 处理，原生触摸则由
 * 浏览器的「隐式触摸捕获」天然独占——这样同一个手势不会被两个 hook 重复处理。
 */
/* oxlint-disable max-statements, max-params, no-ternary, no-magic-numbers, id-length --
 * 指针输入属于 FluereScrollView 的复杂交互流程（对齐 WinUI 3 ScrollView）：
 * 平移状态机的结构性 0/1/2 字面量、Vector2 风格的 { x, y } 分量名、以及组合
 * 各子引擎的 4 参工厂签名均属 API 对齐需要，强行套用结构风格规则会把单次
 * 手势拆成碎片。
 */
import {
  DEFAULT_INERTIA_DECAY,
  INERTIA_SPEED_THRESHOLD,
  MIN_POINTER_DELTA_TIME,
  MS_PER_SECOND,
  RAIL_THRESHOLD,
  VELOCITY_SMOOTHING_ALPHA,
  VELOCITY_SMOOTHING_BETA,
} from './constants'
import type { ScrollViewCore } from './core'
import type { AnimationEngine } from './use-animation'
import type { InertiaEngine } from './use-inertia'
import { usePinchInput } from './use-pinch-input'
import type { ScrollBars } from './use-scroll-bars'

/** 归一化的手势采样点：触摸 identifier 与 PointerEvent.pointerId 都映射到 id */
interface PanSample {
  id: number
  x: number
  y: number
}

/** 平移 / 捏合状态机（由各输入适配层驱动） */
interface PanGesture {
  /** 一个指 / 笔落下 */
  begin: (sample: PanSample) => void
  /** 已落下的指 / 笔移动 */
  move: (sample: PanSample) => void
  /** 一个指 / 笔抬起或取消 */
  end: (id: number) => void
}

interface PanState {
  id: number
  startX: number
  startY: number
  lastX: number
  lastY: number
  vx: number
  vy: number
  lastT: number
  axis: 'both' | 'vertical' | 'horizontal' | undefined
}

/** 指数平滑更新滑行速度 */
const updatePanVelocity = (
  current: PanState,
  delta: { x: number; y: number; time: number },
): void => {
  current.vx =
    VELOCITY_SMOOTHING_ALPHA * current.vx + VELOCITY_SMOOTHING_BETA * (delta.x / delta.time)
  current.vy =
    VELOCITY_SMOOTHING_ALPHA * current.vy + VELOCITY_SMOOTHING_BETA * (delta.y / delta.time)
}

const usePanGesture = (
  core: ScrollViewCore,
  bars: ScrollBars,
  animation: AnimationEngine,
  inertia: InertiaEngine,
): PanGesture => {
  const {
    viewportEl,
    offsetX,
    offsetY,
    clampX,
    clampY,
    commitView,
    setState,
    canScrollHorizontal,
    canScrollVertical,
  } = core

  let panning: PanState | undefined = undefined
  const activePointers = new Map<number, { x: number; y: number }>()
  const pinch = usePinchInput(core, bars, () => activePointers)

  const shouldRail = (): boolean => {
    if (!canScrollHorizontal() || !canScrollVertical()) {
      return true
    }
    return (
      core.props.horizontalScrollRailMode === 'enabled' &&
      core.props.verticalScrollRailMode === 'enabled'
    )
  }

  const dominantPanAxis = (totalX: number, totalY: number): 'both' | 'vertical' | 'horizontal' => {
    if (!shouldRail()) {
      return 'both'
    }
    return Math.abs(totalX) > Math.abs(totalY) ? 'horizontal' : 'vertical'
  }

  const beginPan = (sample: PanSample): void => {
    animation.cancelActiveAnimation()
    inertia.cancelInertia()
    panning = {
      id: sample.id,
      startX: sample.x,
      startY: sample.y,
      lastX: sample.x,
      lastY: sample.y,
      vx: 0,
      vy: 0,
      lastT: globalThis.performance.now(),
      axis: undefined,
    }
    bars.panningActive.value = true
    setState('interaction')
    bars.showBars(true)
  }

  const applyPanDelta = (deltaX: number, deltaY: number): void => {
    const movedX = canScrollHorizontal() ? deltaX : 0
    const movedY = canScrollVertical() ? deltaY : 0
    if (movedX === 0 && movedY === 0) {
      return
    }
    // 内容坐标约定：手指向下（deltaY>0）时内容跟随下移 = offset 减小
    offsetX.value = clampX(offsetX.value - movedX)
    offsetY.value = clampY(offsetY.value - movedY)
    commitView()
  }

  const panMove = (sample: PanSample): void => {
    if (!panning || sample.id !== panning.id) {
      return
    }
    const now = globalThis.performance.now()
    const deltaTime = Math.max(MIN_POINTER_DELTA_TIME, now - panning.lastT)
    const deltaX = sample.x - panning.lastX
    const deltaY = sample.y - panning.lastY
    updatePanVelocity(panning, { x: deltaX, y: deltaY, time: deltaTime })
    panning.lastX = sample.x
    panning.lastY = sample.y
    panning.lastT = now

    if (panning.axis === undefined) {
      const totalX = sample.x - panning.startX
      const totalY = sample.y - panning.startY
      if (Math.hypot(totalX, totalY) > RAIL_THRESHOLD) {
        panning.axis = dominantPanAxis(totalX, totalY)
      }
    }
    let panX = deltaX
    let panY = deltaY
    if (panning.axis === 'vertical') {
      panX = 0
    }
    if (panning.axis === 'horizontal') {
      panY = 0
    }
    applyPanDelta(panX, panY)
  }

  const endPan = (applyInertia: boolean): void => {
    if (!panning) {
      return
    }
    const current = panning
    panning = undefined
    bars.panningActive.value = false
    if (!applyInertia) {
      return
    }
    // 内容坐标约定：vx/vy 为手指速度（向下为正），而 offset 随手指反向变化，
    // 故惯性速度取负，使松手后内容沿手指方向继续滑行
    const velocityX = canScrollHorizontal() ? -current.vx * MS_PER_SECOND : 0
    const velocityY = canScrollVertical() ? -current.vy * MS_PER_SECOND : 0
    if (Math.hypot(velocityX, velocityY) > INERTIA_SPEED_THRESHOLD) {
      inertia.startInertia({
        velocityX,
        velocityY,
        decayX: DEFAULT_INERTIA_DECAY,
        decayY: DEFAULT_INERTIA_DECAY,
        emitCompletion: false,
      })
      return
    }
    offsetX.value = clampX(offsetX.value)
    offsetY.value = clampY(offsetY.value)
    setState('idle')
    core.applyView()
  }

  const begin = (sample: PanSample): void => {
    activePointers.set(sample.id, { x: sample.x, y: sample.y })
    if (core.props.zoomMode === 'enabled' && activePointers.size === 2) {
      endPan(false)
      const viewport = viewportEl.value
      if (viewport) {
        pinch.beginPinch(viewport)
      }
      return
    }
    if (activePointers.size === 1) {
      beginPan(sample)
    }
  }

  const move = (sample: PanSample): void => {
    const point = activePointers.get(sample.id)
    if (point) {
      point.x = sample.x
      point.y = sample.y
    }
    if (pinch.isActive()) {
      pinch.onPointerMove()
      return
    }
    panMove(sample)
  }

  const end = (id: number): void => {
    const existed = activePointers.delete(id)
    if (!existed) {
      return
    }
    if (pinch.isActive()) {
      pinch.onPointerUp(activePointers.size)
      return
    }
    if (!panning || id !== panning.id) {
      return
    }
    endPan(true)
  }

  return { begin, move, end }
}

export { usePanGesture, type PanGesture, type PanSample }
