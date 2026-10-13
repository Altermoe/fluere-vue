/**
 * 标题栏拖拽判定与载荷组装（纯逻辑，无 DOM 依赖，可在 jsdom 下直测）。
 *
 * WinUI 侧的真值（`winui3/release/2.0.1`，src/controls/dev/TitleBar/TitleBar.cpp）：
 *   - 控件被设为窗口标题栏后，**整条标题栏区域都是非客户区**（拖拽由系统接管）。
 *   - `UpdateInteractableElementsList()` 把可交互元素收进清单，`UpdateDragRegion()`
 *     把它们按 `RasterizationScale` 换算成物理像素矩形，设成
 *     `InputNonClientPointerSource.SetRegionRects(NonClientRegionKind::Passthrough)` ——
 *     即在非客户区里「抠洞」。清单五块：`BackButton`（`Visible && Enabled`）、
 *     `PaneToggleButton`（`Visible`）、`LeftHeader`、`Content`、`RightHeader`。
 *   - `Icon` 走独立的 `NonClientRegionKind::Icon`（`UpdateIconRegion()`），**不在**
 *     passthrough 清单里 ⇒ 图标区仍可拖拽；Web 侧保留同一口径。
 *
 * Web 没有「非客户区」概念，等价做法是：pointerdown 命中的元素若落在
 * 「本组件的可交互区（`data-fui-app-window-nodrag`）」或「任何原生可交互元素 /
 * 消费方显式标记 `data-fui-app-window-drag-exempt`」之内，则不启动拖拽。
 *
 * 本库**只抛事件**（见 `FluereAppWindowProps.draggable`）：位置 / 尺寸由外部外壳控制，
 * 组件不写 `transform`、不写 `inset`。外壳一般用 CSS `translate` 承载位移（避免
 * `left`/`top` 触发重排）；需要 translate 值恒为整数时，开 `roundToInteger`
 * 即可（按累计位移取整、delta 取差值，见该选项注释）。
 */

import { ref } from 'vue'
import type { Ref } from 'vue'
import type {
  FluereAppWindowDragEndEventArgs,
  FluereAppWindowDragMoveEventArgs,
  FluereAppWindowDragStartEventArgs,
  FluereAppWindowTitleBarDoubleClickEventArgs,
} from './types'

/**
 * 禁拖候选选择器：本组件自己的可交互区域 + 任意原生可交互元素 + 消费方显式标记。
 *
 * `data-fui-app-window-nodrag` 由本组件写在「左头 / 标题栏中段 / 右头 / back / pane /
 * caption 区」这些与 WinUI passthrough 清单一一对应的容器上。
 */
export const DRAG_EXEMPT_SELECTOR = [
  '[data-fui-app-window-nodrag]',
  '[data-fui-app-window-drag-exempt]',
  'button',
  'a[href]',
  'input',
  'select',
  'textarea',
  'summary',
  '[contenteditable="true"]',
  '[role="button"]',
].join(',')

/** 判断指针落点是否属于「不可拖拽」区域（WinUI 的 passthrough 洞） */
export const isDragExemptTarget = (target: EventTarget | null | undefined): boolean => {
  if (target === null || target === undefined || !(target instanceof Element)) {
    return false
  }
  return target.closest(DRAG_EXEMPT_SELECTOR) !== null
}

export interface UseDragRegionOptions {
  /** 是否允许拖拽（对应 `draggable`，拖拽中途变 false 会立即结束本次拖拽） */
  enabled: () => boolean
  /** 拖拽开始（对应「按下点落在非客户区」） */
  onStart: (args: FluereAppWindowDragStartEventArgs) => void
  /** 拖拽移动（逐次位移 + 累计位移） */
  onMove: (args: FluereAppWindowDragMoveEventArgs) => void
  /** 拖拽结束（`canceled` 表示 Esc / pointercancel / 失去捕获） */
  onEnd: (args: FluereAppWindowDragEndEventArgs) => void
  /** 标题栏双击（Win11 系统行为：切换最大化；组件不自行改状态） */
  onDoubleClick: (args: FluereAppWindowTitleBarDoubleClickEventArgs) => void
  /**
   * 是否把位移取整（缺省 false）。
   *
   * true 时 `totalDeltaX/totalDeltaY` 四舍五入成**整数**，`deltaX/deltaY` 是
   * 相邻两次「取整后的累计位移」之差 —— 这样外壳叠到起点上做 `translate` 时，
   * translate 值恒为整数（不会亚像素模糊）；且**不会累积取整误差**（若逐次
   * 对 delta 取整，0.4 连续三次会被错算成 0，这里按累计值取整，总位移不丢）。
   */
  roundToInteger?: boolean
}

export interface UseDragRegionReturn {
  /** 是否正在拖拽（供样式使用，如 `user-select: none`） */
  isDragging: Ref<boolean>
  /** `pointerdown` 处理：命中禁拖区 / 非主键 / 未启用时直接返回 */
  onPointerDown: (event: PointerEvent) => void
  onPointerMove: (event: PointerEvent) => void
  onPointerUp: (event: PointerEvent) => void
  onPointerCancel: (event: PointerEvent) => void
  onLostPointerCapture: (event: PointerEvent) => void
  onDoubleClick: (event: MouseEvent) => void
}

interface DragSession {
  pointerId: number
  startX: number
  startY: number
  lastX: number
  lastY: number
  lastTotalX: number
  lastTotalY: number
  captureTarget: Element
}

export const useDragRegion = (options: UseDragRegionOptions): UseDragRegionReturn => {
  const isDragging = ref(false)
  let session: DragSession | null = null

  /** 取整开关：对「累计位移」做四舍五入（`delta` 由两次累计之差得出，见 onPointerMove） */
  const roundTotal = (value: number): number =>
    options.roundToInteger === true ? Math.round(value) : value

  const detachEscape = (): void => {
    document.removeEventListener('keydown', onKeyDown)
  }

  const finish = (
    event: { pointerId: number; clientX: number; clientY: number },
    canceled: boolean,
  ): void => {
    const current = session
    if (current === null || current.pointerId !== event.pointerId) {
      return
    }
    session = null
    isDragging.value = false
    detachEscape()
    options.onEnd({
      pointerId: current.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      totalDeltaX: roundTotal(event.clientX - current.startX),
      totalDeltaY: roundTotal(event.clientY - current.startY),
      canceled,
    })
  }

  /**
   * Esc 取消本次拖拽（Win11 里拖动窗口时按 Esc 会中止）。
   * 只在拖拽进行中挂监听（与 `combobox.vue` 一致挂在 `document` 上），
   * 且必须在 pointerdown 之后（纯客户端路径），故不影响 SSR。
   */
  function onKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || session === null) {
      return
    }
    const current = session
    finish({ pointerId: current.pointerId, clientX: current.lastX, clientY: current.lastY }, true)
  }

  const onPointerDown = (event: PointerEvent): void => {
    if (!options.enabled() || session !== null || event.button !== 0 || !event.isPrimary) {
      return
    }
    if (isDragExemptTarget(event.target)) {
      return
    }
    const captureTarget = event.currentTarget
    if (
      !(captureTarget instanceof Element) ||
      typeof captureTarget.setPointerCapture !== 'function'
    ) {
      return
    }
    captureTarget.setPointerCapture(event.pointerId)
    session = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      lastTotalX: 0,
      lastTotalY: 0,
      captureTarget,
    }
    isDragging.value = true
    document.addEventListener('keydown', onKeyDown)
    options.onStart({ pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY })
  }

  const onPointerMove = (event: PointerEvent): void => {
    const current = session
    if (current === null || current.pointerId !== event.pointerId) {
      return
    }
    if (!options.enabled()) {
      finish(event, true)
      return
    }
    // 对「累计位移」取整（而非逐次 delta），保证 totalDelta 恒为整数且不累积误差。
    // delta 取「两次取整后的累计值之差」，于是 delta 也是整数且合计恰等于 totalDelta。
    const totalDeltaX = roundTotal(event.clientX - current.startX)
    const totalDeltaY = roundTotal(event.clientY - current.startY)
    const args = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      deltaX: totalDeltaX - current.lastTotalX,
      deltaY: totalDeltaY - current.lastTotalY,
      totalDeltaX,
      totalDeltaY,
    }
    current.lastX = event.clientX
    current.lastY = event.clientY
    current.lastTotalX = totalDeltaX
    current.lastTotalY = totalDeltaY
    options.onMove(args)
  }

  const onPointerUp = (event: PointerEvent): void => {
    finish(event, false)
  }

  const onPointerCancel = (event: PointerEvent): void => {
    finish(event, true)
  }

  const onLostPointerCapture = (event: PointerEvent): void => {
    // `pointerup` 之后浏览器会紧接着抛 `lostpointercapture`，此时 session 已清空 ⇒ 这里是空操作
    finish(event, true)
  }

  const onDoubleClick = (event: MouseEvent): void => {
    if (!options.enabled() || isDragExemptTarget(event.target)) {
      return
    }
    options.onDoubleClick({ clientX: event.clientX, clientY: event.clientY })
  }

  return {
    isDragging,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onLostPointerCapture,
    onDoubleClick,
  }
}
