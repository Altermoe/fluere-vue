/* oxlint-disable capitalized-comments, id-length, no-magic-numbers, max-statements, no-null, prefer-destructuring, prefer-global-this, numeric-separators-style, consistent-function-scoping -- 测试代码：数值常量与简短标识符、注释为测试说明，豁免结构风格规则 */
/**
 * useScrollApi：scrollTo / scrollBy / zoomTo / zoomBy / addScrollVelocity /
 * addZoomVelocity 的目标钳制、原地缩放、no-op 与 correlation 事件契约。
 */

import { describe, expect, it } from 'vitest'
import { installRafClock, makeEngine } from './helpers'

describe('useScrollApi', () => {
  const setVertical = (core: {
    extentHeight: { value: number }
    viewportHeight: { value: number }
  }): void => {
    core.extentHeight.value = 1000
    core.viewportHeight.value = 200 // scrollable = 800
  }

  it('scrollTo 动画路径：发出 scroll-animation-starting、缓动到目标并补发 completed', () => {
    const clock = installRafClock()
    const { core, api, dispose } = makeEngine()
    setVertical(core)
    const id = api.scrollTo(0, 600)
    expect(core.events.scrollAnimationStarting).toHaveBeenCalledWith({
      startPosition: { x: 0, y: 0 },
      endPosition: { x: 0, y: 600 },
      correlationId: id,
    })
    expect(core.interactionState.value).toBe('animation')
    clock.run(2000)
    expect(core.offsetY.value).toBe(600)
    expect(core.events.scrollCompleted).toHaveBeenCalledTimes(1)
    expect(core.events.scrollCompleted.mock.calls[0]![0]).toEqual({ correlationId: id })
    clock.dispose()
    dispose()
  })

  it('scrollTo（disabled）直接落位并钳制到边界', () => {
    const { core, api, dispose } = makeEngine()
    setVertical(core)
    const id = api.scrollTo(0, 99999, { animationMode: 'disabled' })
    expect(core.offsetY.value).toBe(800)
    expect(core.interactionState.value).toBe('idle')
    expect(core.events.scrollCompleted).toHaveBeenCalledWith({ correlationId: id })
    expect(core.events.scrollAnimationStarting).not.toHaveBeenCalled()
    dispose()
  })

  it('scrollTo 目标等于当前位置时为 no-op，立即补发 completed', () => {
    const { core, api, dispose } = makeEngine()
    const id = api.scrollTo(0, 0)
    expect(core.interactionState.value).toBe('idle')
    expect(core.events.scrollCompleted).toHaveBeenCalledTimes(1)
    expect(core.events.scrollCompleted.mock.calls[0]![0]).toEqual({ correlationId: id })
    dispose()
  })

  it('scrollBy 按增量偏移并钳制', () => {
    const { core, api, dispose } = makeEngine()
    setVertical(core)
    core.offsetY.value = 700
    api.scrollBy(0, 300, { animationMode: 'disabled' })
    expect(core.offsetY.value).toBe(800)
    api.scrollBy(0, -1000, { animationMode: 'disabled' })
    expect(core.offsetY.value).toBe(0)
    dispose()
  })

  it('zoomTo（disabled）原地缩放：指针位置相对不变', () => {
    const { core, api, dispose } = makeEngine()
    core.extentWidth.value = 2000
    core.extentHeight.value = 2000
    core.viewportWidth.value = 300
    core.viewportHeight.value = 200
    const centerX = 120
    const centerY = 80
    api.zoomTo(2, { x: centerX, y: centerY }, { animationMode: 'disabled' })
    expect(core.zoomFactor.value).toBe(2)
    const pX = (core.offsetX.value + centerX) / 2
    const pY = (core.offsetY.value + centerY) / 2
    expect(pX).toBeCloseTo(centerX, 10)
    expect(pY).toBeCloseTo(centerY, 10)
    dispose()
  })

  it('zoomTo 钳制到 min/maxZoomFactor', () => {
    const { core, api, dispose } = makeEngine()
    api.zoomTo(100, { x: 0, y: 0 }, { animationMode: 'disabled' })
    expect(core.zoomFactor.value).toBe(10) // maxZoomFactor
    api.zoomTo(0.001, null, { animationMode: 'disabled' })
    expect(core.zoomFactor.value).toBe(0.1) // minZoomFactor
    dispose()
  })

  it('zoomTo 动画路径发出 zoom-animation-starting 并最终收敛', () => {
    const clock = installRafClock()
    const { core, api, dispose } = makeEngine()
    core.extentWidth.value = 2000
    core.extentHeight.value = 2000
    core.viewportWidth.value = 300
    core.viewportHeight.value = 200
    const id = api.zoomTo(1.5, { x: 100, y: 50 })
    expect(core.events.zoomAnimationStarting).toHaveBeenCalledWith({
      centerPoint: { x: 100, y: 50 },
      startZoomFactor: 1,
      endZoomFactor: 1.5,
      correlationId: id,
    })
    clock.run(2000)
    expect(core.zoomFactor.value).toBe(1.5)
    expect(core.events.zoomCompleted).toHaveBeenCalledTimes(1)
    expect(core.events.zoomCompleted.mock.calls[0]![0]).toEqual({ correlationId: id })
    clock.dispose()
    dispose()
  })

  it('zoomBy 按增量叠加', () => {
    const { core, api, dispose } = makeEngine()
    core.zoomFactor.value = 1
    api.zoomBy(0.5, null, { animationMode: 'disabled' })
    expect(core.zoomFactor.value).toBe(1.5)
    dispose()
  })

  it('addScrollVelocity 低于阈值立即完成，高于阈值进入惯性', () => {
    const { core, api, dispose } = makeEngine()
    setVertical(core)
    const low = api.addScrollVelocity({ x: 0, y: 0.005 })
    expect(core.events.scrollCompleted).toHaveBeenCalledWith({ correlationId: low })
    expect(core.interactionState.value).toBe('idle')
    api.addScrollVelocity({ x: 0, y: 500 })
    expect(core.interactionState.value).toBe('inertia')
    dispose()
  })

  it('scrollTo（disabled）打断进行中的动画后 interactionState 归位 idle', () => {
    const clock = installRafClock()
    const { core, api, dispose } = makeEngine()
    setVertical(core)
    const first = api.scrollTo(0, 600)
    clock.run(50)
    expect(core.interactionState.value).toBe('animation')

    const second = api.scrollTo(0, 300, { animationMode: 'disabled' })
    expect(core.offsetY.value).toBe(300)
    expect(core.interactionState.value).toBe('idle')
    // 旧动画被打断后补发其 completed，随后补发本次的 completed
    expect(core.events.scrollCompleted.mock.calls.map((call) => call[0])).toEqual([
      { correlationId: first },
      { correlationId: second },
    ])
    clock.run(1000)
    expect(core.offsetY.value).toBe(300)
    clock.dispose()
    dispose()
  })

  it('addScrollVelocity 低于阈值时停住进行中的动画，不再继续推进', () => {
    const clock = installRafClock()
    const { core, api, dispose } = makeEngine()
    setVertical(core)
    const scrollId = api.scrollTo(0, 600)
    clock.run(50)
    const stopped = core.offsetY.value

    const id = api.addScrollVelocity({ x: 0, y: 0 })
    expect(core.interactionState.value).toBe('idle')
    // 立即完成时也要打断旧动画，否则「已 idle + 已 completed」与仍在推进的视图矛盾
    expect(core.events.scrollCompleted).toHaveBeenCalledWith({ correlationId: scrollId })
    expect(core.events.scrollCompleted).toHaveBeenCalledWith({ correlationId: id })
    clock.run(1000)
    expect(core.offsetY.value).toBe(stopped)
    clock.dispose()
    dispose()
  })

  it('addZoomVelocity 低于阈值立即完成，高于阈值进入缩放惯性', () => {
    const { core, api, dispose } = makeEngine()
    const low = api.addZoomVelocity(0.00001)
    expect(core.events.zoomCompleted).toHaveBeenCalledWith({ correlationId: low })
    expect(core.interactionState.value).toBe('idle')
    api.addZoomVelocity(0.2)
    expect(core.interactionState.value).toBe('inertia')
    dispose()
  })
})
