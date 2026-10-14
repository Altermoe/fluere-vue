/**
 * 触摸输入适配层：用原生 Touch Events 驱动共用的平移 / 捏合状态机。
 *
 * 与「笔」（use-pointer-input，走 Pointer Events）分离，保证同一触摸手势只会
 * 被一个 hook 处理。触摸事件在整段手势中由浏览器隐式捕获并稳定冒泡到
 * presenter，因此无需 setPointerCapture。
 *
 * 关键点：`touchmove` 上调用 `preventDefault()`（监听器以 `passive: false` 注册）
 * —— 压掉残余的原生滚动 / 手势，避免浏览器在 `pointermove` 交付前用
 * `pointercancel` 抢走手势（这正是「触摸屏上滑不动」类问题的根因）。`touchstart`
 * 不 preventDefault，以保留内容区内元素（链接 / 按钮）的轻点。
 *
 * 起点落在滚动条命中区内的触摸不纳入本层（滚动条自有指针交互），既不注册进
 * 状态机也不 preventDefault，避免抢占滚动条拖拽。
 */
/* oxlint-disable max-statements, id-length, no-magic-numbers, unicorn/prefer-spread --
 * 触摸适配层属 FluereScrollView 的交互流程（对齐 WinUI 3 ScrollView）：
 * TouchList 是 array-like（未声明 iterable，运行时无 Symbol.iterator），
 * 只能用 Array.from 展开而非展开运算符；`activeIds.size === 0` 的结构性 0
 * 字面量与简短标识符（id / el）属 DOM 事件适配需要。
 */
import { onMounted, onScopeDispose } from 'vue'
import type { ScrollViewCore } from './core'
import type { PanGesture } from './use-pan-gesture'

/** 触摸输入层暴露给模板 / 测试的对象 */
interface TouchInput {
  onTouchStart: (event: TouchEvent) => void
  onTouchMove: (event: TouchEvent) => void
  onTouchEnd: (event: TouchEvent) => void
  onTouchCancel: (event: TouchEvent) => void
}

/** 滚动条命中区类名（与模板 / use-scroll-bars 一致） */
const BAR_CLASS = 'fui-scrollview__scrollbar'

const useTouchInput = (core: ScrollViewCore, gesture: PanGesture): TouchInput => {
  const isInputIgnored = (): boolean => {
    const list = Array.isArray(core.props.ignoredInputKinds)
      ? core.props.ignoredInputKinds
      : [core.props.ignoredInputKinds]
    return list.includes('all') || list.includes('touch')
  }

  /** 本层已接管的触摸 id（决定是否 preventDefault / 是否驱动状态机） */
  const activeIds = new Set<number>()

  const startedOnBar = (event: TouchEvent): boolean => {
    const target = event.target
    return target instanceof Element && target.closest(`.${BAR_CLASS}`) !== null
  }

  const onTouchStart = (event: TouchEvent): void => {
    if (isInputIgnored() || startedOnBar(event)) {
      return
    }
    for (const touch of Array.from(event.changedTouches)) {
      if (activeIds.has(touch.identifier)) {
        continue
      }
      activeIds.add(touch.identifier)
      gesture.begin({ id: touch.identifier, x: touch.clientX, y: touch.clientY })
    }
  }

  const onTouchMove = (event: TouchEvent): void => {
    if (activeIds.size === 0) {
      return
    }
    // 非 passive + preventDefault：独占手势，阻止原生滚动 / 手势接管
    if (event.cancelable) {
      event.preventDefault()
    }
    for (const touch of Array.from(event.changedTouches)) {
      if (activeIds.has(touch.identifier)) {
        gesture.move({ id: touch.identifier, x: touch.clientX, y: touch.clientY })
      }
    }
  }

  const endTouches = (event: TouchEvent): void => {
    for (const touch of Array.from(event.changedTouches)) {
      if (activeIds.delete(touch.identifier)) {
        gesture.end(touch.identifier)
      }
    }
  }

  let attachedEl: HTMLElement | null = null

  onMounted(() => {
    const viewport = core.viewportEl.value
    if (!viewport) {
      return
    }
    attachedEl = viewport
    viewport.addEventListener('touchstart', onTouchStart, { passive: false })
    viewport.addEventListener('touchmove', onTouchMove, { passive: false })
    viewport.addEventListener('touchend', endTouches)
    viewport.addEventListener('touchcancel', endTouches)
  })

  onScopeDispose(() => {
    const el = attachedEl
    if (!el) {
      return
    }
    el.removeEventListener('touchstart', onTouchStart)
    el.removeEventListener('touchmove', onTouchMove)
    el.removeEventListener('touchend', endTouches)
    el.removeEventListener('touchcancel', endTouches)
    attachedEl = null
  })

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd: endTouches,
    onTouchCancel: endTouches,
  }
}

export { useTouchInput, type TouchInput }
