/* oxlint-disable capitalized-comments, id-length, no-magic-numbers, max-statements, prefer-global-this, consistent-function-scoping, max-params -- 测试代码：数值常量与简短标识符、注释为测试说明，豁免结构风格规则 */
/**
 * useTouchInput（原生触摸适配层）：
 *  - 单指平移方向正确（内容跟随手指）与速度阈值下的惯性衔接
 *  - `touchmove` 调用 preventDefault（关键回归：独占手势，阻止原生滚动 / 手势接管）
 *  - 起点落在滚动条内的触摸不纳入本层（不启动平移、不 preventDefault）
 *  - ignoredInputKinds 命中 touch 时不响应
 *  - 双指捏合以两指中点为缩放中心原地缩放
 */

import { describe, expect, it, vi } from 'vitest'
import { useAnimation } from '../use-animation'
import { useInertia } from '../use-inertia'
import { usePanGesture } from '../use-pan-gesture'
import { useTouchInput } from '../use-touch-input'
import { installRafClock, makeBars, makeCore, makeRectElement, mountSetup } from './helpers'

/** 单点触摸载荷（identifier 即引擎里的手势 id） */
const madeTouch = (id: number, x: number, y: number): Touch =>
  ({ identifier: id, clientX: x, clientY: y }) as unknown as Touch

/** 合成触摸事件（最小字段）；target 决定是否命中滚动条 */
const touchEvent = (touches: Touch[], target: EventTarget = document.body): TouchEvent =>
  ({
    target,
    cancelable: true,
    changedTouches: touches,
    preventDefault: vi.fn(),
  }) as unknown as TouchEvent

const mountTouch = (props: Record<string, unknown> = {}) =>
  mountSetup(() => {
    const core = makeCore({ props: props as never })
    const bars = makeBars()
    const animation = useAnimation(core, bars)
    const inertia = useInertia(core, animation)
    const gesture = usePanGesture(core, bars, animation, inertia)
    const touch = useTouchInput(core, gesture)
    return { core, bars, gesture, touch }
  })

describe('useTouchInput · 单指平移', () => {
  it('内容跟随手指：向下滑 offset 减小（内容下移），向上滑恢复；touchmove 独占手势', () => {
    const clock = installRafClock()
    const { result, unmount } = mountTouch()
    const { core, touch } = result
    core.extentHeight.value = 1000
    core.viewportHeight.value = 300
    core.offsetY.value = 100
    core.setElement('viewportEl', makeRectElement({ width: 300, height: 300 }))

    touch.onTouchStart(touchEvent([madeTouch(1, 50, 100)]))
    const move = touchEvent([madeTouch(1, 50, 140)]) // 下移 40
    touch.onTouchMove(move)
    expect(core.offsetY.value).toBe(60)
    expect(move.preventDefault).toHaveBeenCalled()

    touch.onTouchMove(touchEvent([madeTouch(1, 50, 100)])) // 上移 40
    expect(core.offsetY.value).toBe(100)
    clock.dispose()
    unmount()
  })

  it('低速松手不进入惯性，高速松手进入惯性', () => {
    const clock = installRafClock()
    const { result, unmount } = mountTouch()
    const { core, touch } = result
    core.extentHeight.value = 2000
    core.viewportHeight.value = 300
    core.offsetY.value = 200
    core.setElement('viewportEl', makeRectElement({ width: 300, height: 300 }))

    // 低速：40px / 400ms → 100px/s < 阈值
    touch.onTouchStart(touchEvent([madeTouch(1, 50, 100)]))
    clock.step(400)
    touch.onTouchMove(touchEvent([madeTouch(1, 50, 140)]))
    touch.onTouchEnd(touchEvent([madeTouch(1, 50, 140)]))
    expect(core.interactionState.value).toBe('idle')

    // 高速：40px / 20ms → 2000px/s > 阈值
    touch.onTouchStart(touchEvent([madeTouch(1, 50, 100)]))
    clock.step(20)
    touch.onTouchMove(touchEvent([madeTouch(1, 50, 140)]))
    touch.onTouchEnd(touchEvent([madeTouch(1, 50, 140)]))
    expect(core.interactionState.value).toBe('inertia')
    clock.dispose()
    unmount()
  })

  it('触摸平移中滚动条显示', () => {
    const clock = installRafClock()
    const { result, unmount } = mountTouch()
    const { core, bars, touch } = result
    core.extentHeight.value = 1000
    core.viewportHeight.value = 300
    core.setElement('viewportEl', makeRectElement({ width: 300, height: 300 }))
    touch.onTouchStart(touchEvent([madeTouch(1, 50, 100)]))
    expect(bars.panningActive.value).toBe(true)
    expect(bars.showBars).toHaveBeenCalled()
    clock.dispose()
    unmount()
  })

  it('!touchcancel 与 touchend 一致收尾（不再平移）', () => {
    const clock = installRafClock()
    const { result, unmount } = mountTouch()
    const { core, touch } = result
    core.extentHeight.value = 1000
    core.viewportHeight.value = 300
    core.setElement('viewportEl', makeRectElement({ width: 300, height: 300 }))

    touch.onTouchStart(touchEvent([madeTouch(1, 50, 100)]))
    touch.onTouchMove(touchEvent([madeTouch(1, 50, 140)]))
    const before = core.offsetY.value
    touch.onTouchCancel(touchEvent([madeTouch(1, 50, 140)]))
    touch.onTouchMove(touchEvent([madeTouch(1, 50, 180)]))
    expect(core.offsetY.value).toBe(before)
    clock.dispose()
    unmount()
  })
})

describe('useTouchInput · 守卫', () => {
  it('起点落在滚动条内：既不启动平移，也不 preventDefault', () => {
    const clock = installRafClock()
    const { result, unmount } = mountTouch()
    const { core, touch } = result
    core.extentHeight.value = 1000
    core.viewportHeight.value = 300
    core.offsetY.value = 100
    core.setElement('viewportEl', makeRectElement({ width: 300, height: 300 }))

    const bar = document.createElement('div')
    bar.className = 'fui-scrollview__scrollbar'
    const thumb = document.createElement('span')
    bar.appendChild(thumb)

    touch.onTouchStart(touchEvent([madeTouch(1, 50, 100)], thumb))
    const move = touchEvent([madeTouch(1, 50, 160)], thumb)
    touch.onTouchMove(move)
    expect(core.offsetY.value).toBe(100)
    expect(move.preventDefault).not.toHaveBeenCalled()
    clock.dispose()
    unmount()
  })

  it('ignoredInputKinds 命中 touch 时整段不响应', () => {
    const clock = installRafClock()
    const { result, unmount } = mountTouch({ ignoredInputKinds: ['touch'] })
    const { core, touch } = result
    core.extentHeight.value = 1000
    core.viewportHeight.value = 300
    core.offsetY.value = 100
    core.setElement('viewportEl', makeRectElement({ width: 300, height: 300 }))

    touch.onTouchStart(touchEvent([madeTouch(1, 50, 100)]))
    const move = touchEvent([madeTouch(1, 50, 160)])
    touch.onTouchMove(move)
    expect(core.offsetY.value).toBe(100)
    expect(move.preventDefault).not.toHaveBeenCalled()
    clock.dispose()
    unmount()
  })
})

describe('useTouchInput · 双指捏合', () => {
  it('以两指中点为缩放中心原地缩放，抬指后结束', () => {
    const clock = installRafClock()
    const { result, unmount } = mountTouch({ zoomMode: 'enabled' })
    const { core, touch } = result
    core.extentWidth.value = 2000
    core.extentHeight.value = 2000
    core.viewportWidth.value = 300
    core.viewportHeight.value = 200
    core.setElement('viewportEl', makeRectElement({ width: 300, height: 200 }))

    touch.onTouchStart(touchEvent([madeTouch(1, 50, 50)]))
    touch.onTouchStart(touchEvent([madeTouch(2, 100, 60)])) // 两指成立 → 开始捏合
    const cx = 75
    const cy = 55

    touch.onTouchMove(touchEvent([madeTouch(2, 150, 70)])) // 距离翻倍 → zoom 2
    expect(core.zoomFactor.value).toBeCloseTo(2, 5)
    // 中点所在内容坐标不变（原地缩放）
    const pX = (core.offsetX.value + cx) / core.zoomFactor.value
    const pY = (core.offsetY.value + cy) / core.zoomFactor.value
    expect(pX).toBeCloseTo(cx, 5)
    expect(pY).toBeCloseTo(cy, 5)

    touch.onTouchEnd(touchEvent([madeTouch(1, 50, 50)])) // 只剩一指 → 结束捏合
    expect(core.interactionState.value).toBe('idle')
    clock.dispose()
    unmount()
  })
})
