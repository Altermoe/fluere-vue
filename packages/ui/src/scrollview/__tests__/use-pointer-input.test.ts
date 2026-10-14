/* oxlint-disable capitalized-comments, id-length, no-magic-numbers, max-statements, no-null, prefer-destructuring, prefer-global-this, numeric-separators-style, consistent-function-scoping -- 测试代码：数值常量与简短标识符、注释为测试说明，豁免结构风格规则 */
/**
 * usePointerInput（笔适配层）：
 *  - 只响应 pointerType==='pen'，触摸（由 use-touch-input 独占）与鼠标一律忽略
 *  - 笔平移方向正确（内容跟随笔）与速度阈值下的惯性衔接；begin 时指针捕获
 *  - 双笔（两指等价）捏合以中点为中心原地缩放
 */

import { describe, expect, it, vi } from 'vitest'
import { usePointerInput } from '../use-pointer-input'
import { installRafClock, makeEngine } from './helpers'

const makeViewport = (): Record<string, unknown> => ({
  setPointerCapture: vi.fn(),
  releasePointerCapture: vi.fn(),
  getBoundingClientRect: () => ({
    left: 0,
    top: 0,
    width: 300,
    height: 200,
    right: 300,
    bottom: 200,
  }),
})

const makeHarness = (props: Record<string, unknown> = {}) => {
  const { core, bars, gesture, dispose } = makeEngine({
    props: { zoomMode: 'disabled', ...props } as never,
  })
  const pointer = usePointerInput(core, gesture)
  return { core, bars, gesture, pointer, dispose }
}

const penDown = (id: number, x: number, y: number): PointerEvent =>
  ({ pointerType: 'pen', button: 0, pointerId: id, clientX: x, clientY: y }) as PointerEvent
const penMove = (id: number, x: number, y: number): PointerEvent =>
  ({ pointerType: 'pen', pointerId: id, clientX: x, clientY: y }) as PointerEvent
const penUp = (id: number): PointerEvent => ({ pointerType: 'pen', pointerId: id }) as PointerEvent
const touchPan = (id: number, x: number, y: number): PointerEvent =>
  ({ pointerType: 'touch', button: 0, pointerId: id, clientX: x, clientY: y }) as PointerEvent
const mousePan = (id: number, x: number, y: number): PointerEvent =>
  ({ pointerType: 'mouse', button: 0, pointerId: id, clientX: x, clientY: y }) as PointerEvent

describe('usePointerInput · 笔平移', () => {
  it('内容跟随笔：向下拖 offset 减小（内容下移），向上拖恢复', () => {
    const clock = installRafClock()
    const { core, pointer, dispose } = makeHarness()
    core.extentHeight.value = 1000
    core.viewportHeight.value = 300
    core.offsetY.value = 100
    core.setElement('viewportEl', makeViewport())

    pointer.onPointerDown(penDown(1, 50, 100))
    pointer.onPointerMove(penMove(1, 50, 140)) // 下移 40
    expect(core.offsetY.value).toBe(60)
    pointer.onPointerMove(penMove(1, 50, 100)) // 上移 40
    expect(core.offsetY.value).toBe(100)
    clock.dispose()
    dispose()
  })

  it('begin 时对視口做指针捕获（手势生命周期内事件不再外溢）', () => {
    const clock = installRafClock()
    const { core, pointer, dispose } = makeHarness()
    core.extentHeight.value = 1000
    core.viewportHeight.value = 300
    const viewport = makeViewport()
    core.setElement('viewportEl', viewport)

    pointer.onPointerDown(penDown(7, 50, 100))
    expect(viewport.setPointerCapture).toHaveBeenCalledWith(7)
    pointer.onPointerUp(penUp(7))
    expect(viewport.releasePointerCapture).toHaveBeenCalledWith(7)
    clock.dispose()
    dispose()
  })

  it('低速松手不进入惯性，高速松手进入惯性', () => {
    const clock = installRafClock()
    const { core, pointer, dispose } = makeHarness()
    core.extentHeight.value = 2000
    core.viewportHeight.value = 300
    core.offsetY.value = 200
    core.setElement('viewportEl', makeViewport())

    // 低速：40px / 400ms → 100px/s < 阈值
    pointer.onPointerDown(penDown(1, 50, 100))
    clock.step(400)
    pointer.onPointerMove(penMove(1, 50, 140))
    pointer.onPointerUp(penUp(1))
    expect(core.interactionState.value).toBe('idle')

    // 高速：40px / 20ms → 2000px/s > 阈值
    pointer.onPointerDown(penDown(1, 50, 100))
    clock.step(20)
    pointer.onPointerMove(penMove(1, 50, 140))
    pointer.onPointerUp(penUp(1))
    expect(core.interactionState.value).toBe('inertia')
    clock.dispose()
    dispose()
  })

  it('平移中滚动条显示', () => {
    const clock = installRafClock()
    const { core, bars, pointer, dispose } = makeHarness()
    core.extentHeight.value = 1000
    core.viewportHeight.value = 300
    core.setElement('viewportEl', makeViewport())
    pointer.onPointerDown(penDown(1, 50, 100))
    expect(bars.panningActive.value).toBe(true)
    expect(bars.showBars).toHaveBeenCalled()
    clock.dispose()
    dispose()
  })
})

describe('usePointerInput · 输入种类隔离', () => {
  it('触摸与鼠标一律忽略（触摸由 use-touch-input 独占）', () => {
    const clock = installRafClock()
    const { core, bars, pointer, dispose } = makeHarness()
    core.extentHeight.value = 1000
    core.viewportHeight.value = 300
    core.offsetY.value = 100
    core.setElement('viewportEl', makeViewport())

    pointer.onPointerDown(touchPan(1, 50, 100))
    pointer.onPointerMove(touchPan(1, 50, 160))
    expect(core.offsetY.value).toBe(100)
    expect(bars.panningActive.value).toBe(false)

    pointer.onPointerDown(mousePan(2, 50, 100))
    pointer.onPointerMove(mousePan(2, 50, 160))
    expect(core.offsetY.value).toBe(100)
    clock.dispose()
    dispose()
  })
})

describe('usePointerInput · 捏合（两笔）', () => {
  it('以两笔中点为缩放中心原地缩放，抬笔后结束', () => {
    const clock = installRafClock()
    const { core, pointer, dispose } = makeHarness({ zoomMode: 'enabled' })
    core.extentWidth.value = 2000
    core.extentHeight.value = 2000
    core.viewportWidth.value = 300
    core.viewportHeight.value = 200
    core.setElement('viewportEl', makeViewport())

    pointer.onPointerDown(penDown(1, 50, 50))
    pointer.onPointerDown(penDown(2, 100, 60)) // 两笔成立 → 开始捏合
    const cx = 75
    const cy = 55

    pointer.onPointerMove(penMove(2, 150, 70)) // 距离翻倍 → zoom 2
    expect(core.zoomFactor.value).toBeCloseTo(2, 5)
    // 中点所在内容坐标不变（原地缩放）
    const pX = (core.offsetX.value + cx) / core.zoomFactor.value
    const pY = (core.offsetY.value + cy) / core.zoomFactor.value
    expect(pX).toBeCloseTo(cx, 5)
    expect(pY).toBeCloseTo(cy, 5)

    pointer.onPointerUp(penUp(1)) // 只剩一笔 → 结束捏合
    expect(core.interactionState.value).toBe('idle')
    clock.dispose()
    dispose()
  })
})
