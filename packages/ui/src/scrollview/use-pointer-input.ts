/**
 * 笔输入适配层：用 Pointer Events 驱动共用的平移 / 捏合状态机（use-pan-gesture）。
 *
 * 只处理 `pointerType === 'pen'`：
 *  - 触摸由 use-touch-input（原生 Touch Events）独占，鼠标不参与拖拽平移，
 *    两者都在入口直接跳过，避免同一个手势被多个 hook 重复处理；
 *  - 指针捕获留在本层（begin 时 setPointerCapture、end 时 releasePointerCapture），
 *    状态机本身不关心捕获——原生触摸依赖浏览器的隐式触摸捕获。
 */
/* oxlint-disable max-statements, no-ternary, no-magic-numbers --
 * 指针输入属于 FluereScrollView 的复杂交互流程（对齐 WinUI 3 ScrollView）：
 * 结构性字面量与简短的标识符属 DOM 事件适配需要。
 */
import type { ScrollViewCore } from './core'
import type { PanGesture } from './use-pan-gesture'

/** 指针输入层暴露给模板的对象 */
interface PointerInput {
  onPointerDown: (event: PointerEvent) => void
  onPointerMove: (event: PointerEvent) => void
  onPointerUp: (event: PointerEvent) => void
}

/** 滚动条命中区类名（与模板 / use-scroll-bars 一致） */
const BAR_CLASS = 'fui-scrollview__scrollbar'

const usePointerInput = (core: ScrollViewCore, gesture: PanGesture): PointerInput => {
  const { viewportEl } = core

  const isInputIgnored = (): boolean => {
    const list = Array.isArray(core.props.ignoredInputKinds)
      ? core.props.ignoredInputKinds
      : [core.props.ignoredInputKinds]
    return list.includes('all') || list.includes('pen')
  }

  const onPointerDown = (event: PointerEvent): void => {
    if (event.pointerType !== 'pen' || isInputIgnored()) {
      return
    }
    const target = event.target as HTMLElement | null
    if (target && target.closest && target.closest(`.${BAR_CLASS}`)) {
      return
    }
    const viewport = viewportEl.value
    if (!viewport) {
      return
    }
    viewport.setPointerCapture(event.pointerId)
    gesture.begin({ id: event.pointerId, x: event.clientX, y: event.clientY })
  }

  const onPointerMove = (event: PointerEvent): void => {
    if (event.pointerType !== 'pen') {
      return
    }
    gesture.move({ id: event.pointerId, x: event.clientX, y: event.clientY })
  }

  const onPointerUp = (event: PointerEvent): void => {
    if (event.pointerType !== 'pen') {
      return
    }
    viewportEl.value?.releasePointerCapture?.(event.pointerId)
    gesture.end(event.pointerId)
  }

  return { onPointerDown, onPointerMove, onPointerUp }
}

export { usePointerInput, type PointerInput }
