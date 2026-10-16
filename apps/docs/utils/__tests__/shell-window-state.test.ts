/**
 * 桌面外壳窗口 / 标签状态机契约测试（0.5.5）。
 *
 * 这些逻辑为何必须被测试守住：窗口状态是外壳里**唯一跨组件共享的可变数据**
 * （标题栏抛意图 → 外壳改状态 → 任务栏 / 窗口层读状态）。它的正确性无法靠
 * 「浏览器里点一遍看着对」保证——尤其是两条容易被忽略的规则：
 *   ① 最小化要**保留**最大化与位移（实机语义），而关闭要**复位**（重新打开回到居中常规窗口）；
 *   ② 关闭激活标签时按上游 `OnItemsChanged` 的**向后环形迁移**选新激活项
 *      （这是 `FluereTabView` 组件注释明确交给消费方实现的那半条规则）。
 */
import { describe, expect, it } from 'vitest'
import {
  SHELL_BLANK_TAB_ID,
  SHELL_DEFAULT_TAB_ID,
  clampWindowOffset,
  closeTab,
  closeWindow,
  createShellWindowState,
  isBlankTab,
  maximize,
  minimize,
  openTab,
  reopenWindow,
  restore,
  selectTab,
} from '../shell-window-state'

describe('createShellWindowState', () => {
  it('初始为常规档、未最大化、无位移、停在默认标签', () => {
    const state = createShellWindowState()
    expect(state.status).toBe('normal')
    expect(state.maximized).toBe(false)
    expect(state.offset).toEqual({ x: 0, y: 0 })
    expect(state.openTabs).toEqual([SHELL_DEFAULT_TAB_ID])
    expect(state.activeTab).toBe(SHELL_DEFAULT_TAB_ID)
  })
})

describe('窗口状态档位', () => {
  it('最小化保留最大化与位移（还原时回到最小化前的形态）', () => {
    const dragged = { ...createShellWindowState(), maximized: true, offset: { x: 40, y: -20 } }
    const result = minimize(dragged)
    expect(result.status).toBe('minimized')
    expect(result.maximized).toBe(true)
    expect(result.offset).toEqual({ x: 40, y: -20 })
  })

  it('最大化把位移归零', () => {
    const dragged = { ...createShellWindowState(), offset: { x: 120, y: 80 } }
    const result = maximize(dragged)
    expect(result.maximized).toBe(true)
    expect(result.offset).toEqual({ x: 0, y: 0 })
  })

  it('最大化会一并回到常规档（从最小化态直接最大化也成立）', () => {
    const minimized = minimize(createShellWindowState())
    expect(maximize(minimized).status).toBe('normal')
  })

  it('还原取消最大化', () => {
    const result = restore(maximize(createShellWindowState()))
    expect(result.maximized).toBe(false)
    expect(result.status).toBe('normal')
  })

  it('关闭复位最大化与位移（重新打开回到居中常规窗口，而非继承上次形态）', () => {
    const dragged = { ...createShellWindowState(), maximized: true, offset: { x: 99, y: 99 } }
    const result = closeWindow(dragged)
    expect(result.status).toBe('closed')
    expect(result.maximized).toBe(false)
    expect(result.offset).toEqual({ x: 0, y: 0 })
  })

  it('重新打开回到常规档，且不改变标签', () => {
    const closed = closeWindow(openTab(createShellWindowState(), 'components'))
    const result = reopenWindow(closed)
    expect(result.status).toBe('normal')
    expect(result.activeTab).toBe('components')
  })

  it('所有变更函数都不修改入参（纯函数）', () => {
    const state = createShellWindowState()
    const snapshot = JSON.stringify(state)
    minimize(state)
    maximize(state)
    restore(state)
    closeWindow(state)
    reopenWindow(state)
    openTab(state, 'next')
    closeTab(state, SHELL_DEFAULT_TAB_ID)
    expect(JSON.stringify(state)).toBe(snapshot)
  })
})

describe('clampWindowOffset', () => {
  const windowSize = { width: 1000, height: 600 }
  const desktop = { width: 1600, height: 1000 }
  const taskbar = 48

  it('左右各可移动到「窗口贴边」为止', () => {
    // (1600 - 1000) / 2 = 300
    expect(clampWindowOffset({ x: 999, y: 0 }, windowSize, desktop, taskbar).x).toBe(300)
    expect(clampWindowOffset({ x: -999, y: 0 }, windowSize, desktop, taskbar).x).toBe(-300)
  })

  it('纵向可用区扣掉任务栏高度', () => {
    // (1000 - 48 - 600) / 2 = 176
    expect(clampWindowOffset({ x: 0, y: 999 }, windowSize, desktop, taskbar).y).toBe(176)
    expect(clampWindowOffset({ x: 0, y: -999 }, windowSize, desktop, taskbar).y).toBe(-176)
  })

  it('区间内原样返回', () => {
    expect(clampWindowOffset({ x: 10, y: -20 }, windowSize, desktop, taskbar)).toEqual({
      x: 10,
      y: -20,
    })
  })

  it('窗口比可用区还大时位移收敛为 0（小视口不产生负位移）', () => {
    const big = { width: 2000, height: 1200 }
    expect(clampWindowOffset({ x: 100, y: 100 }, big, desktop, taskbar)).toEqual({ x: 0, y: 0 })
  })

  it('非有限值归零（防 NaN / Infinity 污染内联 style）', () => {
    expect(clampWindowOffset({ x: Number.NaN, y: 0 }, windowSize, desktop, taskbar).x).toBe(0)
    expect(
      clampWindowOffset({ x: 0, y: Number.POSITIVE_INFINITY }, windowSize, desktop, taskbar).y,
    ).toBe(0)
  })

  it('桌面高度小于任务栏时不产生负的纵向可用区', () => {
    const result = clampWindowOffset(
      { x: 0, y: 0 },
      { width: 100, height: 100 },
      { width: 1600, height: 40 },
      taskbar,
    )
    expect(result.y).toBe(0)
  })
})

describe('标签状态', () => {
  it('打开已存在的标签是幂等的（只切激活，不重复堆 tab）', () => {
    const once = openTab(createShellWindowState(), 'components')
    const twice = openTab(once, 'components')
    expect(twice.openTabs).toEqual([SHELL_DEFAULT_TAB_ID, 'components'])
    expect(twice.activeTab).toBe('components')
  })

  it('打开新标签会追加到末尾并激活', () => {
    const result = openTab(openTab(createShellWindowState(), 'a'), 'b')
    expect(result.openTabs).toEqual([SHELL_DEFAULT_TAB_ID, 'a', 'b'])
    expect(result.activeTab).toBe('b')
  })

  it('关闭非激活标签不改变激活项', () => {
    const state = openTab(openTab(createShellWindowState(), 'a'), 'b')
    const result = closeTab(state, 'a')
    expect(result.openTabs).toEqual([SHELL_DEFAULT_TAB_ID, 'b'])
    expect(result.activeTab).toBe('b')
  })

  it('关闭激活标签时向后环形迁移（取后一项）', () => {
    // [home, a, b]，激活 a 且 a 后面还有 b → 关掉 a 后应激活 b
    const state = openTab(openTab(createShellWindowState(), 'a'), 'b')
    expect(closeTab(selectTab(state, 'a'), 'a').activeTab).toBe('b')
  })

  it('关闭最后一个位置的激活标签时回绕到第一项', () => {
    const state = openTab(openTab(createShellWindowState(), 'a'), 'b')
    // 激活末位 b，关掉它 → 越界，回绕到第一项
    expect(closeTab(state, 'b').activeTab).toBe(SHELL_DEFAULT_TAB_ID)
  })

  it('关闭最后一个标签时补兜底空视图（tab 条与内容区都不塌成空壳）', () => {
    const result = closeTab(createShellWindowState(), SHELL_DEFAULT_TAB_ID)
    expect(result.openTabs).toEqual([SHELL_BLANK_TAB_ID])
    expect(result.activeTab).toBe(SHELL_BLANK_TAB_ID)
    expect(isBlankTab(result.activeTab)).toBe(true)
  })

  it('关闭不存在的标签是 no-op', () => {
    const state = createShellWindowState()
    expect(closeTab(state, 'nope')).toBe(state)
  })

  it('切换标签只认已打开的项', () => {
    const state = createShellWindowState()
    expect(selectTab(state, 'nope')).toBe(state)
    expect(selectTab(openTab(state, 'a'), 'a').activeTab).toBe('a')
  })

  it('isBlankTab 只对兜底视图成立（消费方据此给 isClosable: false）', () => {
    expect(isBlankTab(SHELL_BLANK_TAB_ID)).toBe(true)
    expect(isBlankTab(SHELL_DEFAULT_TAB_ID)).toBe(false)
  })
})
