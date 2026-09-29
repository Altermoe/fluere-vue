/**
 * 惯性引擎：触控松手 / AddScrollVelocity / AddZoomVelocity 的减速滑行。
 *
 * 依赖动画引擎的 cancelActiveAnimation（惯性开始前须停掉进行中的动画），
 * 二者共享 completed 事件与 correlation ID 契约；反过来动画引擎也通过
 * registerInertiaCancel 注入的取消回调在启动新动画前停住惯性，确保同一时刻
 * 只有一路 rAF 在写 offset。逐帧积分用 frame-timing 的非负帧长：rAF 时间戳
 * 可能早于启动时读到的 performance.now()，负帧长会让惯性反向位移并放大速度。
 */
/* oxlint-disable max-statements, no-ternary, no-magic-numbers, id-length --
 * 惯性引擎属于 FluereScrollView 的复杂交互流程（对齐 WinUI 3 ScrollView）：
 * 结构性的 0/1 字面量（速度衰减边界）与 Vector2 风格的 { x, y } 分量名属
 * API 对齐需要，强行套用结构风格规则会把单帧流程拆成碎片。
 */
import { onScopeDispose } from 'vue'
import {
  DEFAULT_INERTIA_DECAY,
  VELOCITY_EPSILON,
  ZOOM_VELOCITY_BOUNDARY,
  ZOOM_VELOCITY_STOP,
} from './constants'
import type { ScrollViewCore } from './core'
import { frameStepSeconds } from './frame-timing'
import type { AnimationEngine } from './use-animation'

/** 惯性引擎暴露给其他模块的对象 */
interface InertiaEngine {
  /** 取消进行中的惯性并（如配置了）补发 completed 事件；返回是否确实取消了惯性 */
  cancelInertia: () => boolean
  /** 以给定速度 / 衰减启动一段滚动或缩放惯性 */
  startInertia: (options: InertiaStartOptions) => void
}

interface InertiaStartOptions {
  /** 惯性类型：scroll（默认）或 zoom */
  kind?: 'scroll' | 'zoom'
  velocityX: number
  velocityY: number
  decayX: number
  decayY: number
  /** 缩放轴速度（zoom 时使用） */
  velocityZ?: number
  /** 缩放轴衰减率（zoom 时使用，默认 DEFAULT_INERTIA_DECAY） */
  decayZ?: number
  /** 缩放中心点（zoom 时使用） */
  centerX?: number
  centerY?: number
  /** 结束时是否补发 completed 事件（触控松手为 false，Add*Velocity 为 true） */
  emitCompletion?: boolean
  correlationId?: number
}

interface InertiaState {
  kind: 'scroll' | 'zoom'
  correlationId: number
  emitCompletion: boolean
  vx: number
  vy: number
  vz: number
  decayX: number
  decayY: number
  decayZ: number
  lastTime: number
  raf: number
  zBaseZoom: number
  zBaseOffsetX: number
  zBaseOffsetY: number
  centerX: number
  centerY: number
}

/** 速度仍存在但增量被边界吞掉时，立即停止惯性 */
const shouldStopScrollInertia = (
  current: InertiaState,
  deltaX: number,
  deltaY: number,
): boolean => {
  const movingX = Math.abs(current.vx) > VELOCITY_EPSILON
  const movingY = Math.abs(current.vy) > VELOCITY_EPSILON
  const hitX = movingX && Math.abs(deltaX) > VELOCITY_EPSILON
  const hitY = movingY && Math.abs(deltaY) > VELOCITY_EPSILON
  if (movingX && movingY) {
    return hitX && hitY
  }
  if (movingX) {
    return hitX
  }
  return hitY
}

const useInertia = (core: ScrollViewCore, animation: AnimationEngine): InertiaEngine => {
  const { offsetX, offsetY, zoomFactor, clampX, clampY, applyView, commitView, setState } = core

  let inertia: InertiaState | undefined = undefined

  const cancelInertia = (): boolean => {
    if (!inertia) {
      return false
    }
    const cancelled = inertia
    globalThis.cancelAnimationFrame(cancelled.raf)
    inertia = undefined
    if (!cancelled.emitCompletion) {
      return true
    }
    if (cancelled.kind === 'scroll') {
      core.emitScrollCompleted(cancelled.correlationId)
    } else {
      core.emitZoomCompleted(cancelled.correlationId)
    }
    return true
  }

  // 反向注册：动画引擎（先于本模块创建）在启动新的滚动 / 缩放动画前会调用它，
  // 保证同一时刻只有一路 rAF 在写 offset（惯性滑行中被滚轮 / 键盘 / 请求接管时
  // 必须立刻停住，否则两路推进互相拉扯）。
  animation.registerInertiaCancel(cancelInertia)

  const finishInertia = (): void => {
    if (!inertia) {
      return
    }
    const finished = inertia
    globalThis.cancelAnimationFrame(finished.raf)
    inertia = undefined
    setState('idle')
    applyView()
    if (!finished.emitCompletion) {
      return
    }
    if (finished.kind === 'scroll') {
      core.emitScrollCompleted(finished.correlationId)
    } else {
      core.emitZoomCompleted(finished.correlationId)
    }
  }

  const scrollInertiaFrame = (current: InertiaState, deltaTime: number): boolean => {
    current.vx *= (1 - current.decayX) ** deltaTime
    current.vy *= (1 - current.decayY) ** deltaTime
    const beforeX = offsetX.value + current.vx * deltaTime
    const beforeY = offsetY.value + current.vy * deltaTime
    const nextX = clampX(beforeX)
    const nextY = clampY(beforeY)
    offsetX.value = nextX
    offsetY.value = nextY
    const speed = Math.hypot(current.vx, current.vy)
    const shouldStop =
      speed < 1 || shouldStopScrollInertia(current, nextX - beforeX, nextY - beforeY)
    if (shouldStop) {
      offsetX.value = clampX(offsetX.value)
      offsetY.value = clampY(offsetY.value)
    }
    return shouldStop
  }

  const zoomInertiaFrame = (current: InertiaState, deltaTime: number): boolean => {
    current.vz *= (1 - current.decayZ) ** deltaTime
    const minZoom = core.props.minZoomFactor
    const maxZoom = core.props.maxZoomFactor
    const beforeZoom = zoomFactor.value + current.vz * deltaTime
    const wasClamped = beforeZoom <= minZoom || beforeZoom >= maxZoom
    const nextZoom = Math.min(Math.max(beforeZoom, minZoom), maxZoom)
    zoomFactor.value = nextZoom
    offsetX.value = clampX(
      core.scaleAboutCenter(current.zBaseOffsetX, current.centerX, nextZoom / current.zBaseZoom),
    )
    offsetY.value = clampY(
      core.scaleAboutCenter(current.zBaseOffsetY, current.centerY, nextZoom / current.zBaseZoom),
    )
    const shouldStop = Math.abs(current.vz) < ZOOM_VELOCITY_STOP
    const shouldStopAtBoundary = wasClamped && Math.abs(current.vz) < ZOOM_VELOCITY_BOUNDARY
    return shouldStop || shouldStopAtBoundary
  }

  const inertiaTick = (now: number): void => {
    const current = inertia
    if (!current) {
      return
    }
    const deltaTime = frameStepSeconds(now, current.lastTime)
    current.lastTime = now

    const shouldStop =
      current.kind === 'scroll'
        ? scrollInertiaFrame(current, deltaTime)
        : zoomInertiaFrame(current, deltaTime)
    if (shouldStop) {
      finishInertia()
      return
    }
    commitView()
    current.raf = globalThis.requestAnimationFrame(inertiaTick)
  }

  const startInertia = (options: InertiaStartOptions): void => {
    animation.cancelActiveAnimation()
    cancelInertia()
    const kind = options.kind ?? 'scroll'
    const emitCompletion = options.emitCompletion ?? true
    const correlationId = options.correlationId ?? core.nextId()
    setState('inertia')
    inertia = {
      kind,
      correlationId,
      emitCompletion,
      vx: options.velocityX,
      vy: options.velocityY,
      vz: options.velocityZ ?? 0,
      decayX: options.decayX,
      decayY: options.decayY,
      decayZ: options.decayZ ?? DEFAULT_INERTIA_DECAY,
      lastTime: globalThis.performance.now(),
      raf: 0,
      zBaseZoom: zoomFactor.value,
      zBaseOffsetX: offsetX.value,
      zBaseOffsetY: offsetY.value,
      centerX: options.centerX ?? 0,
      centerY: options.centerY ?? 0,
    }
    inertia.raf = globalThis.requestAnimationFrame(inertiaTick)
  }

  onScopeDispose(() => {
    if (inertia) {
      globalThis.cancelAnimationFrame(inertia.raf)
    }
    inertia = undefined
  })

  return { cancelInertia, startInertia }
}

export { useInertia, type InertiaEngine, type InertiaStartOptions }
