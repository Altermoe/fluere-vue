/**
 * 层级栈契约（0.4.2 刻度 + 0.4.1 嵌套提升）。
 *
 * 关键断言是「值只引用 token，不在 TS 里重复刻度数字」与「嵌套浮层抬到宿主之上」——
 * 后者正是平面刻度表达不了、而模态里再开下拉会踩穿的那条路径。
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { FLYOUT_TIERS, acquireLayer, openLayerCount, resetLayerStack } from './layer-stack'

beforeEach(() => {
  resetLayerStack()
})

describe('层级栈', () => {
  it('栈底浮层直接用自己的档位 token', () => {
    const layer = acquireLayer('--zIndexNavFlyout')
    expect(layer.style).toEqual({ zIndex: 'var(--zIndexNavFlyout)' })
    expect(layer.depth).toBe(1)
    expect(openLayerCount()).toBe(1)
  })

  it('嵌套在宿主内的浮层抬到宿主之上（按 zIndexStep 步进）', () => {
    acquireLayer('--zIndexModal')
    const nested = acquireLayer('--zIndexNavFlyout')
    expect(nested.style).toEqual({
      zIndex: 'calc(var(--zIndexModal) + var(--zIndexStep))',
    })
    expect(nested.depth).toBe(2)
  })

  it('档位高于宿主的浮层仍用自己的档位（ToolTip 开在模态之上）', () => {
    acquireLayer('--zIndexModal')
    const tooltip = acquireLayer('--zIndexTooltip')
    expect(tooltip.style).toEqual({ zIndex: 'var(--zIndexTooltip)' })
  })

  it('多级嵌套逐级步进', () => {
    acquireLayer('--zIndexModal')
    acquireLayer('--zIndexNavFlyout')
    const third = acquireLayer('--zIndexMenu')
    expect(third.style.zIndex).toBe(
      'calc(calc(var(--zIndexModal) + var(--zIndexStep)) + var(--zIndexStep))',
    )
  })

  it('release 幂等，且出栈后不影响其它层', () => {
    const first = acquireLayer('--zIndexModal')
    const second = acquireLayer('--zIndexNavFlyout')
    first.release()
    first.release()
    expect(openLayerCount()).toBe(1)
    second.release()
    expect(openLayerCount()).toBe(0)
  })

  it('档位表顺序与层级刻度一致（栈底 → 栈顶）', () => {
    expect([...FLYOUT_TIERS]).toEqual([
      '--zIndexWindow',
      '--zIndexContent',
      '--zIndexNavFlyout',
      '--zIndexMenu',
      '--zIndexSubmenu',
      '--zIndexModal',
      '--zIndexTooltip',
      '--zIndexShell',
    ])
  })
})
