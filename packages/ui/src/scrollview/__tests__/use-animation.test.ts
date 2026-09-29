/* oxlint-disable capitalized-comments, id-length, no-magic-numbers, max-statements, no-null, prefer-destructuring, prefer-global-this, numeric-separators-style, consistent-function-scoping, typescript/array-type -- 测试代码：数值常量与简短标识符、注释为测试说明，豁免结构风格规则 */
/**
 * useAnimation：
 *  - decelerateEase 曲线在特定进度节点的数值正确（对照独立二分求解的参考值）
 *  - 滚动驱动（animateScrollTo）在特定时间节点的缓动数值正确、收敛、retarget 平滑
 *  - 缩放动画在特定时间节点的 zoom / offset 数值正确且围绕中心不变
 *
 * 时间控制：手动驱动 rAF 帧（见 helpers.installRafClock），每帧可精确指定时间戳，
 * 因此能断言到任意时间节点的精确数值。
 */

import { describe, expect, it, vi } from 'vitest'
import { SCROLL_CHASE_DECAY } from '../constants'
import { decelerateEase } from '../use-animation'
import { installRafClock, makeEngine } from './helpers'

/** cubic-bezier(0.1, 0.9, 0.2, 1) 的独立参考采样（二分法独立求解，与实现解耦） */
const DECELERATE_REF: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [0.1, 0.585273],
  [0.25, 0.84947],
  [0.4, 0.938083],
  [0.5, 0.966236],
  [0.6, 0.982598],
  [0.75, 0.994933],
  [0.9, 0.999381],
  [1, 1],
]

describe('decelerateEase（Fluent decelerate 曲线）', () => {
  it('端点正确且单调不减', () => {
    expect(decelerateEase(0)).toBe(0)
    expect(decelerateEase(1)).toBe(1)
    let previous = -1
    for (let i = 0; i <= 100; i += 1) {
      const value = decelerateEase(i / 100)
      expect(value).toBeGreaterThanOrEqual(previous)
      previous = value
    }
  })

  it('在特定进度节点与参考值一致', () => {
    for (const [progress, expected] of DECELERATE_REF) {
      expect(decelerateEase(progress)).toBeCloseTo(expected, 5)
    }
  })
})

describe('useAnimation · 滚动驱动', () => {
  it('离散滚动在特定时间节点的缓动数值正确并最终收敛', () => {
    const clock = installRafClock()
    const { core, animation, dispose } = makeEngine()
    core.extentHeight.value = 2000
    core.viewportHeight.value = 300

    animation.animateScrollTo(0, 1000, 7)
    expect(core.interactionState.value).toBe('animation')

    // 指数 ease-out 闭式解：offset(t) = from + (to-from) * (1 - e^(-k*t))
    clock.run(16) // t = 16ms
    expect(core.offsetY.value).toBeCloseTo(1000 * (1 - Math.exp(-SCROLL_CHASE_DECAY * 0.016)), 6)
    clock.run(16) // t = 32ms
    expect(core.offsetY.value).toBeCloseTo(1000 * (1 - Math.exp(-SCROLL_CHASE_DECAY * 0.032)), 6)
    clock.run(16 * 23) // t ≈ 400ms
    expect(core.offsetY.value).toBeGreaterThan(950)
    clock.run(1000) // 收敛到 0.5px 阈值内
    expect(core.offsetY.value).toBe(1000)
    expect(core.interactionState.value).toBe('idle')
    expect(core.events.scrollCompleted).toHaveBeenCalledTimes(1)
    expect(core.events.scrollCompleted.mock.calls[0]![0]).toEqual({ correlationId: 7 })
    clock.dispose()
    dispose()
  })

  it('滚动动画逐帧推进，offset 单调逼近目标（无回跳）', () => {
    const clock = installRafClock()
    const { core, animation, dispose } = makeEngine()
    core.extentHeight.value = 2000
    core.viewportHeight.value = 300
    animation.animateScrollTo(0, 1000, 1)
    let previous = core.offsetY.value
    for (let i = 0; i < 25; i += 1) {
      clock.step()
      expect(core.offsetY.value).toBeGreaterThan(previous)
      previous = core.offsetY.value
    }
    clock.dispose()
    dispose()
  })

  it('首帧时间戳早于调度时刻（浏览器帧起点语义）时不产生反向回退', () => {
    const clock = installRafClock()
    const { core, animation, dispose } = makeEngine()
    core.extentHeight.value = 2000
    core.viewportHeight.value = 300
    core.offsetY.value = 500

    // 输入事件处理结束时时钟为 1000ms，而首帧 rAF 时间戳是本帧起点（更早）：
    // 浏览器在同一帧内先派发输入事件、再执行 rAF 回调时会出现这种时间差
    clock.now = 1000
    animation.animateScrollTo(0, 1000, 1)
    let previous = core.offsetY.value
    clock.step(-8)
    expect(core.offsetY.value).toBeGreaterThanOrEqual(previous)

    for (let i = 0; i < 40; i += 1) {
      clock.step()
      expect(core.offsetY.value).toBeGreaterThanOrEqual(previous)
      previous = core.offsetY.value
    }
    clock.run(1000)
    expect(core.offsetY.value).toBe(1000)
    expect(core.interactionState.value).toBe('idle')
    clock.dispose()
    dispose()
  })

  it('滚轮式 retarget 平滑续接：不重启、不跳变、收敛到新目标且不补发 completed', () => {
    const clock = installRafClock()
    const { core, animation, dispose } = makeEngine()
    core.extentHeight.value = 3000
    core.viewportHeight.value = 300

    // 首次以 retarget=true 启动（无进行中动画 → 不补发 completed 的连续滚动）
    animation.animateScrollTo(0, 500, 99, true)
    clock.run(16)
    expect(core.offsetY.value).toBeGreaterThan(0)
    expect(animation.getScrollTarget().y).toBe(500)

    // 运行中续接目标到 1200
    animation.animateScrollTo(0, 1200, 99, true)
    expect(animation.getScrollTarget().y).toBe(1200)
    const before = core.offsetY.value
    clock.run(16)
    expect(core.offsetY.value).toBeGreaterThan(before)

    clock.run(2000)
    expect(core.offsetY.value).toBe(1200)
    expect(core.interactionState.value).toBe('idle')
    expect(core.events.scrollCompleted).not.toHaveBeenCalled()
    clock.dispose()
    dispose()
  })

  it('retarget 进行中的离散动画：结束时补发原 correlationId 的 completed', () => {
    const clock = installRafClock()
    const { core, animation, dispose } = makeEngine()
    core.extentHeight.value = 3000
    core.viewportHeight.value = 300

    animation.animateScrollTo(0, 500, 1)
    clock.run(16 * 3)
    animation.animateScrollTo(0, 900, 1, true)
    clock.run(2000)
    expect(core.offsetY.value).toBe(900)
    expect(core.events.scrollCompleted).toHaveBeenCalledTimes(1)
    expect(core.events.scrollCompleted.mock.calls[0]![0]).toEqual({ correlationId: 1 })
    clock.dispose()
    dispose()
  })

  it('getScrollTarget：动画中返回目标，空闲时返回当前 offset', () => {
    const clock = installRafClock()
    const { core, animation, dispose } = makeEngine()
    core.offsetY.value = 42
    expect(animation.getScrollTarget()).toEqual({ x: 0, y: 42 })

    core.extentHeight.value = 2000
    core.viewportHeight.value = 300
    animation.animateScrollTo(0, 500, 1)
    expect(animation.getScrollTarget().y).toBe(500)
    clock.dispose()
    dispose()
  })

  it('cancelActiveAnimation 取消进行中的滚动动画并补发 completed', () => {
    const clock = installRafClock()
    const { core, animation, dispose } = makeEngine()
    core.extentHeight.value = 2000
    core.viewportHeight.value = 300
    animation.animateScrollTo(0, 1000, 3)
    clock.run(32)
    animation.cancelActiveAnimation()
    expect(core.events.scrollCompleted).toHaveBeenCalledTimes(1)
    expect(core.events.scrollCompleted.mock.calls[0]![0]).toEqual({ correlationId: 3 })
    clock.dispose()
    dispose()
  })
})

describe('useAnimation · 缩放动画', () => {
  it('缩放动画在特定时间节点的 zoom / offset 数值正确且围绕中心不变', () => {
    const clock = installRafClock()
    const { core, animation, dispose } = makeEngine()
    core.extentWidth.value = 2000
    core.extentHeight.value = 2000
    core.viewportWidth.value = 300
    core.viewportHeight.value = 200
    const centerX = 120
    const centerY = 80

    animation.animateZoomTo(2, { x: centerX, y: centerY }, 5)
    // 单帧精确推进到 progress = 0.25 / 0.5 / 0.75 / 1（缩放不按帧长封顶）
    clock.step(100) // t=100ms, progress 0.25
    expect(core.zoomFactor.value).toBeCloseTo(1 + 0.84947, 5)
    // 中心点所在内容坐标不变：(offset + center)/zoom 恒定
    const pX = (core.offsetX.value + centerX) / core.zoomFactor.value
    const pY = (core.offsetY.value + centerY) / core.zoomFactor.value
    expect(pX).toBeCloseTo(centerX, 5)
    expect(pY).toBeCloseTo(centerY, 5)

    clock.step(100) // t=200ms, progress 0.5
    expect(core.zoomFactor.value).toBeCloseTo(1 + 0.966236, 5)
    clock.step(100) // t=300ms, progress 0.75
    expect(core.zoomFactor.value).toBeCloseTo(1 + 0.994933, 5)
    clock.step(100) // t=400ms, progress 1 → 结束
    expect(core.zoomFactor.value).toBe(2)
    expect(core.interactionState.value).toBe('idle')
    expect(core.events.zoomCompleted).toHaveBeenCalledTimes(1)
    expect(core.events.zoomCompleted.mock.calls[0]![0]).toEqual({ correlationId: 5 })
    clock.dispose()
    dispose()
  })

  it('缩放越过内容上界时 offset 被钳制（内容边缘贴住视口）', () => {
    const clock = installRafClock()
    const { core, animation, dispose } = makeEngine()
    core.extentWidth.value = 400
    core.extentHeight.value = 400
    core.viewportWidth.value = 320
    core.viewportHeight.value = 200

    // 缩小越过上界：目标 offset=250 超过新 maxOffset(200)，钳到 200
    core.zoomFactor.value = 2
    core.offsetY.value = 400 * 2 - 200 // 600 = zoom=2 时的 maxOffsetY
    animation.animateZoomTo(1, { x: 0, y: 100 }, 5)
    clock.run(400)
    expect(core.zoomFactor.value).toBe(1)
    expect(core.offsetY.value).toBe(200)
    expect(core.offsetY.value).toBe(core.maxOffsetY.value)
    clock.dispose()
    dispose()
  })

  it('缩放越过内容下界时 offset 钳到 0', () => {
    const clock = installRafClock()
    const { core, animation, dispose } = makeEngine()
    core.extentWidth.value = 400
    core.extentHeight.value = 400
    core.viewportWidth.value = 320
    core.viewportHeight.value = 200

    // 绕 y=150 中心缩小：目标 offset=(0+150)*0.5-150=-75 → 钳到 0
    core.zoomFactor.value = 2
    core.offsetY.value = 0
    animation.animateZoomTo(1, { x: 0, y: 150 }, 5)
    clock.run(400)
    expect(core.zoomFactor.value).toBe(1)
    expect(core.offsetY.value).toBe(0)
    clock.dispose()
    dispose()
  })
})

describe('useAnimation · 动画偏好', () => {
  it('reduced-motion 下 auto 解析为 disabled，enabled 仍直通', () => {
    // useAnimation 通过 window.matchMedia（带 SSR 守卫）读取偏好；测试里注入
    const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'matchMedia')
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: true,
        media: '',
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    })
    try {
      const { animation, dispose } = makeEngine()
      expect(animation.resolveAnimationMode('auto')).toBe('disabled')
      expect(animation.resolveAnimationMode('enabled')).toBe('enabled')
      expect(animation.resolveAnimationMode('disabled')).toBe('disabled')
      dispose()
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(window, 'matchMedia', originalDescriptor)
      } else {
        Reflect.deleteProperty(window, 'matchMedia')
      }
    }
  })

  it('无 matchMedia（SSR / 测试默认）时 auto 解析为 enabled', () => {
    if (window.matchMedia !== undefined) {
      Reflect.deleteProperty(window, 'matchMedia')
    }
    const { animation, dispose } = makeEngine()
    expect(animation.resolveAnimationMode('auto')).toBe('enabled')
    dispose()
  })
})
