/* oxlint-disable capitalized-comments, id-length, no-magic-numbers, max-statements, no-null, prefer-destructuring, prefer-global-this, numeric-separators-style, consistent-function-scoping -- 测试代码：数值常量与简短标识符、注释为测试说明，豁免结构风格规则 */
/**
 * useInertia：滚动 / 缩放惯性的速度衰减、边界停止与缩放中心保持。
 */

import { describe, expect, it } from 'vitest'
import { installRafClock, makeEngine } from './helpers'

describe('useInertia', () => {
  it('滚动惯性推进 offset 并在速度归零后结束（不越界、位移有界）', () => {
    const clock = installRafClock()
    const { core, inertia, dispose } = makeEngine()
    core.extentHeight.value = 2000
    core.viewportHeight.value = 300
    inertia.startInertia({
      velocityX: 0,
      velocityY: 500,
      decayX: 0.95,
      decayY: 0.95,
      emitCompletion: false,
    })
    expect(core.interactionState.value).toBe('inertia')
    const first = core.offsetY.value
    clock.run(100)
    expect(core.offsetY.value).toBeGreaterThan(first)
    clock.run(4000)
    expect(core.interactionState.value).toBe('idle')
    // 指数衰减使总位移收敛（远小于初始速度 * 时间上界）
    expect(core.offsetY.value).toBeGreaterThan(0)
    expect(core.offsetY.value).toBeLessThan(500)
    expect(core.offsetY.value).toBeLessThanOrEqual(core.maxOffsetY.value)
    clock.dispose()
    dispose()
  })

  it('滚动惯性在边界处立即停止（offset 钳到 maxOffset）', () => {
    const clock = installRafClock()
    const { core, inertia, dispose } = makeEngine()
    core.extentHeight.value = 400
    core.viewportHeight.value = 300 // scrollable = 100
    inertia.startInertia({
      velocityX: 0,
      velocityY: 5000,
      decayX: 0.95,
      decayY: 0.95,
      emitCompletion: false,
    })
    clock.run(2000)
    expect(core.offsetY.value).toBe(100)
    expect(core.interactionState.value).toBe('idle')
    clock.dispose()
    dispose()
  })

  it('emitCompletion=true 结束时补发 scroll-completed', () => {
    const clock = installRafClock()
    const { core, inertia, dispose } = makeEngine()
    core.extentHeight.value = 2000
    core.viewportHeight.value = 300
    inertia.startInertia({
      velocityX: 0,
      velocityY: 300,
      decayX: 0.95,
      decayY: 0.95,
      emitCompletion: true,
      correlationId: 42,
    })
    clock.run(4000)
    expect(core.events.scrollCompleted).toHaveBeenCalledTimes(1)
    expect(core.events.scrollCompleted.mock.calls[0]![0]).toEqual({ correlationId: 42 })
    clock.dispose()
    dispose()
  })

  it('缩放惯性保持中心点内容坐标相对不变', () => {
    const clock = installRafClock()
    const { core, inertia, dispose } = makeEngine()
    core.extentWidth.value = 2000
    core.extentHeight.value = 2000
    core.viewportWidth.value = 300
    core.viewportHeight.value = 200
    const cx = 100
    const cy = 60
    const p0X = (core.offsetX.value + cx) / core.zoomFactor.value
    const p0Y = (core.offsetY.value + cy) / core.zoomFactor.value

    inertia.startInertia({
      kind: 'zoom',
      velocityX: 0,
      velocityY: 0,
      decayX: 0.95,
      decayY: 0.95,
      velocityZ: 0.3,
      decayZ: 0.95,
      centerX: cx,
      centerY: cy,
      emitCompletion: false,
    })
    clock.run(100)
    expect(core.zoomFactor.value).toBeGreaterThan(1)
    const pX = (core.offsetX.value + cx) / core.zoomFactor.value
    const pY = (core.offsetY.value + cy) / core.zoomFactor.value
    expect(pX).toBeCloseTo(p0X, 6)
    expect(pY).toBeCloseTo(p0Y, 6)
    clock.run(2000)
    expect(core.interactionState.value).toBe('idle')
    clock.dispose()
    dispose()
  })

  it('cancelInertia 取消并（如配置了）补发 completed', () => {
    const clock = installRafClock()
    const { core, inertia, dispose } = makeEngine()
    core.extentHeight.value = 2000
    core.viewportHeight.value = 300
    inertia.startInertia({
      velocityX: 0,
      velocityY: 500,
      decayX: 0.95,
      decayY: 0.95,
      emitCompletion: true,
      correlationId: 7,
    })
    clock.run(50)
    inertia.cancelInertia()
    expect(core.events.scrollCompleted).toHaveBeenCalledTimes(1)
    expect(core.events.scrollCompleted.mock.calls[0]![0]).toEqual({ correlationId: 7 })
    clock.dispose()
    dispose()
  })

  it('首帧时间戳早于调度时刻（浏览器帧起点语义）时不反向滑动', () => {
    const clock = installRafClock()
    const { core, inertia, dispose } = makeEngine()
    core.extentHeight.value = 2000
    core.viewportHeight.value = 300
    core.offsetY.value = 500

    // 输入事件处理结束时时钟为 1000ms，而首帧 rAF 时间戳是本帧起点（更早）
    clock.now = 1000
    inertia.startInertia({
      velocityX: 0,
      velocityY: 500,
      decayX: 0.95,
      decayY: 0.95,
      emitCompletion: false,
    })
    let previous = core.offsetY.value
    clock.step(-8)
    expect(core.offsetY.value).toBeGreaterThanOrEqual(previous)

    for (let i = 0; i < 30; i += 1) {
      clock.step()
      expect(core.offsetY.value).toBeGreaterThanOrEqual(previous)
      previous = core.offsetY.value
    }
    clock.dispose()
    dispose()
  })

  it('新的滚动动画打断进行中的惯性（同一时刻只有一路 offset 写入者）', () => {
    const clock = installRafClock()
    const { core, animation, inertia, dispose } = makeEngine()
    core.extentHeight.value = 5000
    core.viewportHeight.value = 300

    inertia.startInertia({
      velocityX: 0,
      velocityY: 600,
      decayX: 0.95,
      decayY: 0.95,
      emitCompletion: true,
      correlationId: 9,
    })
    clock.run(50)
    expect(core.interactionState.value).toBe('inertia')

    animation.animateScrollTo(0, 400, 8)
    // 惯性被立即打断并补发其 completed（不是等它自然滑停）
    expect(core.events.scrollCompleted).toHaveBeenCalledWith({ correlationId: 9 })

    // 惯性若未被停住，会一直把 offset 顶在目标之外，滚动驱动因差值始终超过收敛
    // 阈值而无法结束（interactionState 停在 'animation'）
    clock.run(800)
    expect(core.interactionState.value).toBe('idle')
    expect(core.offsetY.value).toBeLessThanOrEqual(400)
    clock.run(1000)
    expect(core.offsetY.value).toBe(400)
    clock.dispose()
    dispose()
  })
})
