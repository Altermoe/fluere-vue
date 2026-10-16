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
  closeTab,
  closeWindow,
  containWindowOffset,
  createShellWindowState,
  isBlankTab,
  maximize,
  minimize,
  openTab,
  reopenWindow,
  restore,
  selectTab,
} from '../shell-window-state'
import type { ShellWindowGeometry } from '../shell-window-state'

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

describe('containWindowOffset', () => {
  /**
   * 基准几何：1600×1000 桌面、48 任务栏、1000×600 窗口、顶端条带 32。
   * 静止位置 = 水平居中（(1600-1000)/2 = 300）+ 距顶 24（`--shell-desktop-margin`）。
   * ⇒ 工作区 = 1600×952，窗口左上角 = (300+dx, 24+dy)。
   *
   * 真实值里条带是 **33**（1px 描边 + 32 标题栏，见 `ShellWindowGeometry.titleBarBottom`）；
   * 这里用 32 只是让算式好读，两条边界（工作区底 − 条带 − 基准上边距）不受影响。
   */
  const geometry: ShellWindowGeometry = {
    windowSize: { width: 1000, height: 600 },
    desktopSize: { width: 1600, height: 1000 },
    base: { x: 300, y: 24 },
    taskbarHeight: 48,
    titleBarBottom: 32,
  }
  /** 收敛后窗口左上角（桌面坐标系） */
  const topLeft = (offset: { x: number; y: number }) => ({
    x: geometry.base.x + offset.x,
    y: geometry.base.y + offset.y,
  })

  it('向下拖到底：标题栏下缘停在任务栏上缘，窗口本体挂在桌面之外', () => {
    const offset = containWindowOffset({ x: 0, y: 9999 }, geometry)
    // 952(工作区高) - 32(顶端条带) - 24(基准上边距) = 896
    expect(offset.y).toBe(896)

    const box = topLeft(offset)
    expect(box.y + geometry.titleBarBottom).toBe(952) // 标题栏下缘 = 任务栏上缘
    expect(box.y).toBeGreaterThan(0) // 标题栏整条可见
    // 窗口下缘 920 + 600 = 1520 > 1000 - 48：本体挂在任务栏之下（这正是本次要放开的行为）
    expect(box.y + geometry.windowSize.height).toBeGreaterThan(952)
  })

  it('条带按「描边 + 标题栏」量（真实值 33），不会让标题栏压进任务栏', () => {
    const withBorder: ShellWindowGeometry = { ...geometry, titleBarBottom: 33 }
    const offset = containWindowOffset({ x: 0, y: 9999 }, withBorder)
    // 952 - 33 - 24 = 895 ⇒ 窗口上缘 919、顶端条带下缘 952
    expect(offset.y).toBe(895)
    expect(withBorder.base.y + offset.y + withBorder.titleBarBottom).toBe(952)
  })

  it('向上拖到底：标题栏上缘停在桌面顶端，窗口本体可推出桌面上缘', () => {
    const offset = containWindowOffset({ x: 0, y: -9999 }, geometry)
    expect(offset.y).toBe(-24)
    expect(topLeft(offset).y).toBe(0)
  })

  it('区间内原样返回（不吸附、不吃位移）', () => {
    expect(containWindowOffset({ x: 10, y: -20 }, geometry)).toEqual({ x: 10, y: -20 })
  })

  it('横向：标题栏横跨整宽 ⇒ 窗口整块留在桌面内（不做「挂出左右边缘」）', () => {
    // 静止位置 x = 300，窗口宽 1000 ⇒ 左缘最小 0（offset −300）、右缘最大 1600（offset +300）
    expect(containWindowOffset({ x: -9999, y: 0 }, geometry).x).toBe(-300)
    expect(containWindowOffset({ x: 9999, y: 0 }, geometry).x).toBe(300)

    const left = containWindowOffset({ x: -9999, y: 0 }, geometry)
    const right = containWindowOffset({ x: 9999, y: 0 }, geometry)
    expect(geometry.base.x + left.x).toBe(0)
    expect(geometry.base.x + right.x + geometry.windowSize.width).toBe(1600)
  })

  it('窗口比桌面还宽（区间反转）时贴左缘，不把窗口推出桌面外', () => {
    const narrow: ShellWindowGeometry = {
      ...geometry,
      desktopSize: { width: 800, height: 1000 },
    }
    // 左缘贴 0（offset = −base.x = −300），而不是贴右缘或返回中间值
    expect(containWindowOffset({ x: 0, y: 0 }, narrow).x).toBe(-300)
  })

  it('窗口比桌面还大时：横向贴左缘、纵向仍只由标题栏决定', () => {
    const big: ShellWindowGeometry = {
      ...geometry,
      windowSize: { width: 2000, height: 1200 },
      base: { x: -200, y: 24 },
    }
    // 1600 − 2000 − (−200) = −200 < leftMin(−(−200) = 200) ⇒ 区间反转，贴左缘
    expect(containWindowOffset({ x: 100, y: 100 }, big).x).toBe(200)
    // 纵向与窗口高无关：向下到底 = 952 − 32 − 24
    expect(containWindowOffset({ x: 0, y: 9999 }, big).y).toBe(896)
  })

  it('非有限值归零（防 NaN / Infinity 污染内联 style）', () => {
    expect(containWindowOffset({ x: Number.NaN, y: 0 }, geometry).x).toBe(0)
    expect(containWindowOffset({ x: 0, y: Number.POSITIVE_INFINITY }, geometry).y).toBe(0)
  })

  it('几何量缺失（NaN）时不产生 NaN 位移', () => {
    const broken: ShellWindowGeometry = {
      ...geometry,
      base: { x: Number.NaN, y: Number.NaN },
      taskbarHeight: Number.NaN,
    }
    const offset = containWindowOffset({ x: 10, y: 10 }, broken)
    expect(Number.isFinite(offset.x)).toBe(true)
    expect(Number.isFinite(offset.y)).toBe(true)
  })

  it('桌面比任务栏还矮（区间反转）时保留下界：标题栏顶端贴桌面顶端', () => {
    const tiny: ShellWindowGeometry = {
      ...geometry,
      desktopSize: { width: 1600, height: 40 },
    }
    expect(containWindowOffset({ x: 0, y: 0 }, tiny).y).toBe(-24)
  })

  it('幂等：收敛过的位移再收敛不变（resize 修复不会来回抖）', () => {
    const once = containWindowOffset({ x: 9999, y: 9999 }, geometry)
    expect(containWindowOffset(once, geometry)).toEqual(once)
  })

  it('视口（宿主）缩小：同一份位移被重新收敛，标题栏仍在工作区内', () => {
    const shrunk: ShellWindowGeometry = {
      ...geometry,
      desktopSize: { width: 1600, height: 620 },
    }
    // 缩小前按 1000 高收敛到的位移（896）在 620 高的桌面里已越界
    const before = containWindowOffset({ x: 0, y: 9999 }, geometry)
    expect(before.y).toBe(896)

    const after = containWindowOffset(before, shrunk)
    const box = topLeft(after)
    const workHeight = 620 - 48
    expect(box.y).toBe(workHeight - 32) // 标题栏紧贴任务栏上缘
    expect(box.y).toBeGreaterThanOrEqual(0) // 标题栏在桌面内 ⇒ 窗口没被缩没
    expect(box.y + 32).toBeLessThanOrEqual(workHeight)
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
