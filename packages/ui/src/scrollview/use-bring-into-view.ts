/**
 * BringIntoView：把指定元素滚动进视口（对齐 WinUI ScrollView.BringIntoView）。
 *
 * 独立成模块是因为它与 ScrollTo 系列的目标计算完全不同（元素几何 → 目标偏移），
 * 且支持通过 bring-into-view 事件取消或调整目标。
 *
 * 同时承担「焦点跟随滚动」：焦点进入内容内的元素时自动把它滚进视口，
 * 对齐 WinUI ScrollPresenter 的 BringIntoViewOnFocusChange（缺省开启）——
 * 内容区不再依赖浏览器对文档的原生滚动，键盘用户也不会把焦点丢在视口之外。
 */
/* oxlint-disable max-statements, no-ternary, no-magic-numbers, id-length --
 * 元素对齐算法（WinUI BringIntoView 语义）的目标回退判定与结构性 0/1/2 字面量
 * （margin 倍数边界）属领域计算，且 API 刻意使用 Vector2 风格的 { x, y } 分量名。
 */
import { FOCUS_BRING_INTO_VIEW_MARGIN } from './constants'
import type { ScrollViewCore } from './core'
import type { ScrollingBringingIntoViewEventArgs } from './types'
import type { AnimationEngine } from './use-animation'

/** BringIntoView 暴露给外部 API 的对象 */
interface BringIntoViewController {
  bringIntoView: (element: HTMLElement, options?: { margin?: number }) => number
  /** 处理器（focusin）：焦点在内容内时把焦点元素滚进视口 */
  onFocusIn: (event: FocusEvent) => void
}

const useBringIntoView = (
  core: ScrollViewCore,
  animation: AnimationEngine,
): BringIntoViewController => {
  const {
    viewportEl,
    viewportWidth,
    viewportHeight,
    offsetX,
    offsetY,
    zoomFactor,
    clampX,
    clampY,
  } = core

  const computeTarget = (
    element: HTMLElement,
    margin: number,
  ): { targetX: number; targetY: number } => {
    const viewport = viewportEl.value
    const zoom = zoomFactor.value
    if (!viewport) {
      return { targetX: offsetX.value, targetY: offsetY.value }
    }
    const viewportRect = viewport.getBoundingClientRect()
    const elementRect = element.getBoundingClientRect()
    // 内容坐标约定：元素屏幕位置 = contentCoord * zoom - offset
    const contentX = (elementRect.left - viewportRect.left + offsetX.value) / zoom
    const contentY = (elementRect.top - viewportRect.top + offsetY.value) / zoom
    const contentWidth = elementRect.width / zoom
    const contentHeight = elementRect.height / zoom

    let targetX = offsetX.value
    let targetY = offsetY.value
    if (contentWidth > viewportWidth.value - margin * 2) {
      targetX = zoom * contentX - margin
    } else if (zoom * contentX - offsetX.value < margin) {
      targetX = zoom * contentX - margin
    } else if (
      zoom * contentX - offsetX.value + zoom * contentWidth >
      viewportWidth.value - margin
    ) {
      targetX = zoom * contentX + zoom * contentWidth - viewportWidth.value + margin
    }
    if (contentHeight > viewportHeight.value - margin * 2) {
      targetY = zoom * contentY - margin
    } else if (zoom * contentY - offsetY.value < margin) {
      targetY = zoom * contentY - margin
    } else if (
      zoom * contentY - offsetY.value + zoom * contentHeight >
      viewportHeight.value - margin
    ) {
      targetY = zoom * contentY + zoom * contentHeight - viewportHeight.value + margin
    }
    return { targetX: clampX(targetX), targetY: clampY(targetY) }
  }

  const bringIntoView = (element: HTMLElement, options?: { margin?: number }): number => {
    const id = core.nextId()
    if (!viewportEl.value) {
      core.emitScrollCompleted(id)
      return id
    }
    const margin = options?.margin ?? 0
    const target = computeTarget(element, margin)

    const args: ScrollingBringingIntoViewEventArgs = {
      targetHorizontalOffset: target.targetX,
      targetVerticalOffset: target.targetY,
      correlationId: id,
      cancel: false,
    }
    core.events.bringIntoView(args)
    if (args.cancel) {
      core.emitScrollCompleted(id)
      return id
    }
    if (target.targetX === offsetX.value && target.targetY === offsetY.value) {
      core.emitScrollCompleted(id)
      return id
    }
    core.events.scrollAnimationStarting({
      startPosition: { x: offsetX.value, y: offsetY.value },
      endPosition: { x: target.targetX, y: target.targetY },
      correlationId: id,
    })
    animation.animateScrollTo(target.targetX, target.targetY, id)
    return id
  }

  /**
   * 焦点进入内容内元素：把它滚进视口。
   *
   * 只认视口（presenter）内部的元素，外部（如滚动条步进按钮）不参与；
   * 元素已在视口内时目标偏移等于当前偏移，bringIntoView 会直接补发 completed、不产生动画。
   */
  const onFocusIn = (event: FocusEvent): void => {
    const target = event.target as HTMLElement | null
    const viewport = viewportEl.value
    if (!target || !viewport || !viewport.contains(target)) {
      return
    }
    bringIntoView(target, { margin: FOCUS_BRING_INTO_VIEW_MARGIN })
  }

  return { bringIntoView, onFocusIn }
}

export { useBringIntoView, type BringIntoViewController }
