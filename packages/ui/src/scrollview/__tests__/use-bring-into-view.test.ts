/* oxlint-disable capitalized-comments, id-length, no-magic-numbers, max-statements, no-null, prefer-destructuring, prefer-global-this, numeric-separators-style, consistent-function-scoping -- 测试代码：数值常量与简短标识符、注释为测试说明，豁免结构风格规则 */
/**
 * useBringIntoView：目标 offset 计算（元素在视口下方 / 上方 / 宽于视口）、
 * 边界钳制，以及 bring-into-view 事件可取消。
 */

import { describe, expect, it } from 'vitest'
import { useBringIntoView } from '../use-bring-into-view'
import { installRafClock, makeEngine, makeRectElement } from './helpers'

const makeBiv = () => {
  const { core, animation, dispose } = makeEngine()
  const biv = useBringIntoView(core, animation)
  return { core, animation, biv, dispose }
}

const setViewport = (core: { setElement: (name: 'viewportEl', el: unknown) => void }): void => {
  core.setElement('viewportEl', makeRectElement({ left: 0, top: 0, width: 300, height: 200 }))
}

describe('useBringIntoView', () => {
  it('元素在视口下方时滚动到恰好可见', () => {
    const clock = installRafClock()
    const { core, biv, dispose } = makeBiv()
    core.extentWidth.value = 2000
    core.extentHeight.value = 2000
    core.viewportWidth.value = 300
    core.viewportHeight.value = 200
    setViewport(core)

    const element = makeRectElement({ left: 100, top: 500, width: 100, height: 50 })
    const id = biv.bringIntoView(element as never)

    expect(core.events.bringIntoView).toHaveBeenCalledWith({
      targetHorizontalOffset: 0,
      targetVerticalOffset: 350, // 底部对齐视口底部
      correlationId: id,
      cancel: false,
    })
    clock.run(2000)
    expect(core.offsetY.value).toBe(350)
    clock.dispose()
    dispose()
  })

  it('元素在视口上方时滚动回顶部对齐', () => {
    const clock = installRafClock()
    const { core, biv, dispose } = makeBiv()
    core.extentWidth.value = 2000
    core.extentHeight.value = 2000
    core.viewportWidth.value = 300
    core.viewportHeight.value = 200
    core.offsetY.value = 500
    setViewport(core)

    const element = makeRectElement({ left: 100, top: -300, width: 100, height: 50 })
    const id = biv.bringIntoView(element as never)
    expect(core.events.bringIntoView).toHaveBeenCalledWith({
      targetHorizontalOffset: 0,
      targetVerticalOffset: 200, // 元素内容坐标 200 → 对齐视口顶部
      correlationId: id,
      cancel: false,
    })
    clock.run(2000)
    expect(core.offsetY.value).toBe(200)
    clock.dispose()
    dispose()
  })

  it('元素宽于视口时对齐左缘到 margin', () => {
    const { core, biv, dispose } = makeBiv()
    core.extentWidth.value = 2000
    core.extentHeight.value = 2000
    core.viewportWidth.value = 300
    core.viewportHeight.value = 200
    setViewport(core)

    const element = makeRectElement({ left: 100, top: 0, width: 800, height: 20 })
    const id = biv.bringIntoView(element as never, { margin: 20 })
    const args = core.events.bringIntoView.mock.calls[0]![0]
    expect(args.targetHorizontalOffset).toBe(80) // 左缘对齐 margin=20：100 - 20
    expect(args.cancel).toBe(false)
    expect(args.correlationId).toBe(id)
    dispose()
  })

  it('目标越界时钳制到 maxOffset', () => {
    const { core, biv, dispose } = makeBiv()
    core.extentHeight.value = 500
    core.viewportHeight.value = 200 // maxOffsetY = 300
    core.viewportWidth.value = 300
    core.extentWidth.value = 500
    setViewport(core)

    const element = makeRectElement({ left: 0, top: 2000, width: 50, height: 50 })
    biv.bringIntoView(element as never)
    expect(core.events.bringIntoView).toHaveBeenCalledWith(
      expect.objectContaining({ targetVerticalOffset: 300 }),
    )
    dispose()
  })

  it('bring-into-view 事件置 cancel 时跳过动画并补发 completed', () => {
    const { core, animation, biv, dispose } = makeBiv()
    core.extentHeight.value = 2000
    core.viewportHeight.value = 200
    core.viewportWidth.value = 300
    core.extentWidth.value = 2000
    setViewport(core)
    core.events.bringIntoView.mockImplementation(
      (args: { cancel: boolean; correlationId: number }) => {
        args.cancel = true
      },
    )

    const element = makeRectElement({ left: 0, top: 500, width: 50, height: 50 })
    const id = biv.bringIntoView(element as never)
    expect(core.interactionState.value).toBe('idle')
    expect(core.events.scrollCompleted).toHaveBeenCalledWith({ correlationId: id })
    expect(animation.getScrollTarget()).toEqual({ x: 0, y: 0 }) // 未启动动画
    dispose()
  })
})

/** 视口替身：只对指定元素返回 contains 命中（模拟真实 DOM 的包含关系） */
const setViewportContaining = (
  core: { setElement: (name: 'viewportEl', el: unknown) => void },
  contained: unknown,
): void => {
  core.setElement(
    'viewportEl',
    makeRectElement(
      { left: 0, top: 0, width: 300, height: 200 },
      { contains: (node: unknown) => node === contained },
    ),
  )
}

describe('useBringIntoView · 焦点跟随滚动（BringIntoViewOnFocusChange）', () => {
  it('焦点元素在视口下方时滚进视口，并留 8px 余量', () => {
    const clock = installRafClock()
    const { core, biv, dispose } = makeBiv()
    core.extentWidth.value = 2000
    core.extentHeight.value = 2000
    core.viewportWidth.value = 300
    core.viewportHeight.value = 200
    const focused = makeRectElement({ left: 100, top: 500, width: 100, height: 50 })
    setViewportContaining(core, focused)

    biv.onFocusIn({ target: focused } as unknown as FocusEvent)

    expect(core.events.bringIntoView).toHaveBeenCalledWith({
      targetHorizontalOffset: 0,
      targetVerticalOffset: 358, // 底缘对齐 + margin：500 + 50 - 200 + 8
      correlationId: expect.any(Number),
      cancel: false,
    })
    clock.run(2000)
    expect(core.offsetY.value).toBe(358)
    clock.dispose()
    dispose()
  })

  it('焦点元素已在视口内时不产生动画，仅补发 completed', () => {
    const { core, animation, biv, dispose } = makeBiv()
    core.extentWidth.value = 2000
    core.extentHeight.value = 2000
    core.viewportWidth.value = 300
    core.viewportHeight.value = 200
    const focused = makeRectElement({ left: 100, top: 50, width: 100, height: 50 })
    setViewportContaining(core, focused)

    biv.onFocusIn({ target: focused } as unknown as FocusEvent)

    expect(core.events.scrollCompleted).toHaveBeenCalledTimes(1)
    expect(animation.getScrollTarget()).toEqual({ x: 0, y: 0 })
    expect(core.offsetY.value).toBe(0)
    dispose()
  })

  it('焦点落在视口之外（如滚动条步进按钮）时不参与滚动', () => {
    const { core, biv, dispose } = makeBiv()
    core.extentHeight.value = 2000
    core.viewportHeight.value = 200
    setViewportContaining(core, makeRectElement({ top: 10 }))

    biv.onFocusIn({ target: makeRectElement({ top: 900 }) } as unknown as FocusEvent)

    expect(core.events.bringIntoView).not.toHaveBeenCalled()
    dispose()
  })

  it('视口尚未挂载（SSR / 未 attach）时不抛错', () => {
    const { core, biv, dispose } = makeBiv()

    expect(() =>
      biv.onFocusIn({ target: makeRectElement({ top: 900 }) } as unknown as FocusEvent),
    ).not.toThrow()
    expect(core.events.bringIntoView).not.toHaveBeenCalled()
    dispose()
  })

  it('无焦点目标（target 为 null）时静默返回', () => {
    const { core, biv, dispose } = makeBiv()
    setViewportContaining(core, null)

    expect(() => biv.onFocusIn({ target: null } as unknown as FocusEvent)).not.toThrow()
    expect(core.events.bringIntoView).not.toHaveBeenCalled()
    dispose()
  })
})
