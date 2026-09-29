/**
 * 程序化 API：对齐 WinUI ScrollView 方法签名，统一返回 correlation ID。
 *
 * 覆盖 scrollTo / scrollBy / zoomTo / zoomBy / addScrollVelocity /
 * addZoomVelocity，并负责动画 / 惯性取消与 completed 事件。
 * bringIntoView 独立见 ./use-bring-into-view。
 */
/* oxlint-disable max-statements, no-ternary, no-magic-numbers, id-length --
 * 程序化 API 属于 FluereScrollView 的复杂交互流程（对齐 WinUI 3 ScrollView）：
 * 结构性的 0/1 字面量（中心点回退）与 Vector2 风格的 { x, y } 分量名属
 * API 对齐需要，强行套用结构风格规则会把单次操作拆成碎片。
 */
import {
  DEFAULT_INERTIA_DECAY,
  HALF,
  OFFSET_VELOCITY_EPSILON,
  ZOOM_VELOCITY_EPSILON,
} from './constants'
import type { ScrollViewCore } from './core'
import type { ScrollingScrollOptions, ScrollingZoomOptions } from './types'
import type { AnimationEngine } from './use-animation'
import type { InertiaEngine } from './use-inertia'

/** 程序化 API 暴露给外部 / 输入模块的对象 */
interface ScrollApi {
  scrollTo: (
    horizontalOffset: number,
    verticalOffset: number,
    options?: ScrollingScrollOptions,
  ) => number
  scrollBy: (
    horizontalOffsetDelta: number,
    verticalOffsetDelta: number,
    options?: ScrollingScrollOptions,
  ) => number
  zoomTo: (
    zoom: number,
    centerPoint?: { x: number; y: number } | null,
    options?: ScrollingZoomOptions,
  ) => number
  zoomBy: (
    zoomFactorDelta: number,
    centerPoint?: { x: number; y: number } | null,
    options?: ScrollingZoomOptions,
  ) => number
  addScrollVelocity: (
    offsetsVelocity: { x: number; y: number },
    inertiaDecayRate?: { x: number; y: number } | null,
  ) => number
  addZoomVelocity: (
    zoomFactorVelocity: number,
    centerPoint?: { x: number; y: number } | null,
    inertiaDecayRate?: number | null,
  ) => number
}

const useScrollApi = (
  core: ScrollViewCore,
  animation: AnimationEngine,
  inertia: InertiaEngine,
): ScrollApi => {
  const {
    offsetX,
    offsetY,
    zoomFactor,
    viewportWidth,
    viewportHeight,
    clampX,
    clampY,
    setState,
    applyView,
    events,
  } = core

  const scrollTo = (
    horizontalOffset: number,
    verticalOffset: number,
    options?: ScrollingScrollOptions,
  ): number => {
    const id = core.nextId()
    const toX = clampX(horizontalOffset)
    const toY = clampY(verticalOffset)
    if (toX === offsetX.value && toY === offsetY.value) {
      animation.cancelActiveAnimation()
      inertia.cancelInertia()
      setState('idle')
      core.emitScrollCompleted(id)
      return id
    }
    const interrupted = animation.cancelActiveAnimation()
    inertia.cancelInertia()
    if (animation.resolveAnimationMode(options?.animationMode) === 'disabled') {
      offsetX.value = toX
      offsetY.value = toY
      applyView()
      // 打断后没有任何推进者：把 interactionState 归位，否则会停留在 'animation'
      if (interrupted) {
        setState('idle')
      }
      core.emitScrollCompleted(id)
      return id
    }
    events.scrollAnimationStarting({
      startPosition: { x: offsetX.value, y: offsetY.value },
      endPosition: { x: toX, y: toY },
      correlationId: id,
    })
    animation.animateScrollTo(toX, toY, id)
    return id
  }

  const scrollBy = (
    horizontalOffsetDelta: number,
    verticalOffsetDelta: number,
    options?: ScrollingScrollOptions,
  ): number =>
    scrollTo(offsetX.value + horizontalOffsetDelta, offsetY.value + verticalOffsetDelta, options)

  const zoomTo = (
    zoom: number,
    centerPoint?: { x: number; y: number } | null,
    options?: ScrollingZoomOptions,
  ): number => {
    const id = core.nextId()
    const fromZoom = zoomFactor.value
    const toZoom = Math.min(Math.max(zoom, core.props.minZoomFactor), core.props.maxZoomFactor)
    const centerX = centerPoint ? centerPoint.x : viewportWidth.value * HALF
    const centerY = centerPoint ? centerPoint.y : viewportHeight.value * HALF
    if (toZoom === fromZoom) {
      animation.cancelActiveAnimation()
      inertia.cancelInertia()
      setState('idle')
      core.emitZoomCompleted(id)
      return id
    }
    const interrupted = animation.cancelActiveAnimation()
    inertia.cancelInertia()
    if (animation.resolveAnimationMode(options?.animationMode) === 'disabled') {
      zoomFactor.value = toZoom
      offsetX.value = clampX(core.scaleAboutCenter(offsetX.value, centerX, toZoom / fromZoom))
      offsetY.value = clampY(core.scaleAboutCenter(offsetY.value, centerY, toZoom / fromZoom))
      applyView()
      // 同 scrollTo：非动画路径打断旧动画后需要把状态归位
      if (interrupted) {
        setState('idle')
      }
      core.emitZoomCompleted(id)
      return id
    }
    events.zoomAnimationStarting({
      centerPoint: { x: centerX, y: centerY },
      startZoomFactor: fromZoom,
      endZoomFactor: toZoom,
      correlationId: id,
    })
    animation.animateZoomTo(toZoom, { x: centerX, y: centerY }, id)
    return id
  }

  const zoomBy = (
    zoomFactorDelta: number,
    centerPoint?: { x: number; y: number } | null,
    options?: ScrollingZoomOptions,
  ): number => zoomTo(zoomFactor.value + zoomFactorDelta, centerPoint, options)

  const addScrollVelocity = (
    offsetsVelocity: { x: number; y: number },
    inertiaDecayRate?: { x: number; y: number } | null,
  ): number => {
    const id = core.nextId()
    const velocityX = offsetsVelocity.x
    const velocityY = offsetsVelocity.y
    if (
      Math.abs(velocityX) < OFFSET_VELOCITY_EPSILON &&
      Math.abs(velocityY) < OFFSET_VELOCITY_EPSILON
    ) {
      // 立即完成：必须先停住进行中的动画 / 惯性，否则「已 idle + 已 completed」
      // 的声明与仍在推进的视图相矛盾
      animation.cancelActiveAnimation()
      inertia.cancelInertia()
      setState('idle')
      core.emitScrollCompleted(id)
      return id
    }
    inertia.startInertia({
      velocityX,
      velocityY,
      decayX: inertiaDecayRate?.x ?? DEFAULT_INERTIA_DECAY,
      decayY: inertiaDecayRate?.y ?? DEFAULT_INERTIA_DECAY,
      emitCompletion: true,
      correlationId: id,
    })
    return id
  }

  const addZoomVelocity = (
    zoomFactorVelocity: number,
    centerPoint?: { x: number; y: number } | null,
    inertiaDecayRate?: number | null,
  ): number => {
    const id = core.nextId()
    const centerX = centerPoint ? centerPoint.x : viewportWidth.value * HALF
    const centerY = centerPoint ? centerPoint.y : viewportHeight.value * HALF
    if (Math.abs(zoomFactorVelocity) < ZOOM_VELOCITY_EPSILON) {
      // 同 addScrollVelocity：立即完成时先打断进行中的动画 / 惯性
      animation.cancelActiveAnimation()
      inertia.cancelInertia()
      setState('idle')
      core.emitZoomCompleted(id)
      return id
    }
    animation.cancelActiveAnimation()
    inertia.cancelInertia()
    setState('inertia')
    inertia.startInertia({
      kind: 'zoom',
      velocityX: 0,
      velocityY: 0,
      decayX: DEFAULT_INERTIA_DECAY,
      decayY: DEFAULT_INERTIA_DECAY,
      velocityZ: zoomFactorVelocity,
      decayZ: inertiaDecayRate ?? DEFAULT_INERTIA_DECAY,
      centerX,
      centerY,
      emitCompletion: true,
      correlationId: id,
    })
    return id
  }

  return {
    scrollTo,
    scrollBy,
    zoomTo,
    zoomBy,
    addScrollVelocity,
    addZoomVelocity,
  }
}

export { useScrollApi, type ScrollApi }
