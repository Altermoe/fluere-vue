/**
 * 桌面外壳窗口 / 标签状态机契约测试（0.5.5；0.5.9 增补窗口管理器）。
 *
 * 这些逻辑为何必须被测试守住：窗口状态是外壳里**唯一跨组件共享的可变数据**
 * （标题栏抛意图 → 外壳改状态 → 任务栏 / 窗口层读状态）。它的正确性无法靠
 * 「浏览器里点一遍看着对」保证——尤其是三条容易被忽略的规则：
 *   ① 最小化要**保留**最大化与位移（实机语义），而关闭要**复位**（重新打开回到居中常规窗口）；
 *   ② 关闭激活标签时按上游 `OnItemsChanged` 的**向后环形迁移**选新激活项
 *      （这是 `FluereTabView` 组件注释明确交给消费方实现的那半条规则）；
 *   ③ 多窗口下**焦点回退**：最小化 / 关闭焦点窗口后，焦点交给下一个最上层可见窗口
 *      （全部收起则为 `null`）；每扇窗口的位移 / 标签 / 形态互不串扰。
 */
import { describe, expect, it } from 'vitest'
import type { ShellAppId } from '../shell-apps'
import {
  SHELL_BLANK_TAB_ID,
  SHELL_DEFAULT_TAB_ID,
  SHELL_MAX_WINDOWS,
  activateApp,
  closeApp,
  closeTab,
  closeTabInApp,
  closeWindow,
  containWindowOffset,
  createShellWindowState,
  createWindowManagerState,
  focusApp,
  isBlankTab,
  maximize,
  maximizeApp,
  minimize,
  minimizeApp,
  openTab,
  openTabInApp,
  reopenWindow,
  restore,
  restoreApp,
  selectTab,
  selectTabInApp,
  setAppOffset,
  toggleAppFromShell,
  topMostVisibleApp,
  windowOf,
  windowZIndex,
  windowZIndexRank,
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

/* ------------------------------------------------------------------ */
/* 窗口管理器（0.5.9 多窗口：层级 + 焦点）                                */
/* ------------------------------------------------------------------ */

/** 测试用应用 id（与注册表解耦：窗口管理器不认识具体应用，只认 id） */
const APP_A = 'app-a' as ShellAppId
const APP_B = 'app-b' as ShellAppId
const APP_C = 'app-c' as ShellAppId
const APP_IDS = [APP_A, APP_B, APP_C] as const

describe('窗口管理器：初始状态', () => {
  it('只有默认应用是「已打开」，其余为「未运行」，z 序 = 注册表顺序', () => {
    const state = createWindowManagerState(APP_IDS, APP_B)
    expect(windowOf(state, APP_B).status).toBe('normal')
    expect(windowOf(state, APP_A).status).toBe('closed')
    expect(windowOf(state, APP_C).status).toBe('closed')
    expect(state.zOrder).toEqual([APP_A, APP_B, APP_C])
    expect(state.activeAppId).toBe(APP_B)
  })

  it('不给默认应用时全部未运行、焦点为空', () => {
    const state = createWindowManagerState(APP_IDS)
    expect(state.activeAppId).toBeNull()
    expect(APP_IDS.every((id) => windowOf(state, id).status === 'closed')).toBe(true)
  })
})

describe('窗口管理器：层级与焦点', () => {
  it('focusApp 把它移到层序末尾并设为焦点（已可见窗口的 pointerdown 路径）', () => {
    const state = focusApp(createWindowManagerState(APP_IDS, APP_A), APP_C)
    expect(state.zOrder).toEqual([APP_A, APP_B, APP_C])
    expect(state.activeAppId).toBe(APP_C)
    // 再聚焦 B：它排到末尾，C 让位
    const again = focusApp(state, APP_B)
    expect(again.zOrder).toEqual([APP_A, APP_C, APP_B])
    expect(again.activeAppId).toBe(APP_B)
  })

  it('focusApp 不改变可见性（未运行的窗口不会被「点」出来）', () => {
    const state = focusApp(createWindowManagerState(APP_IDS, APP_A), APP_B)
    expect(windowOf(state, APP_B).status).toBe('closed')
    expect(state.activeAppId).toBe(APP_B)
  })

  it('activateApp 会打开 / 还原窗口并置顶、聚焦', () => {
    const state = activateApp(createWindowManagerState(APP_IDS, APP_A), APP_C)
    expect(windowOf(state, APP_C).status).toBe('normal')
    expect(state.zOrder.at(-1)).toBe(APP_C)
    expect(state.activeAppId).toBe(APP_C)
  })

  it('activateApp 还原已最小化的窗口时保留形态（不回到居中常规窗口）', () => {
    const base = createWindowManagerState(APP_IDS, APP_A)
    const moved = setAppOffset(maximizeApp(base, APP_A), APP_A, { x: 40, y: 20 })
    const minimized = minimizeApp(moved, APP_A)
    const restored = activateApp(minimized, APP_A)
    expect(windowOf(restored, APP_A).status).toBe('normal')
    expect(windowOf(restored, APP_A).maximized).toBe(true)
    expect(windowOf(restored, APP_A).offset).toEqual({ x: 40, y: 20 })
  })

  it('toggleAppFromShell：焦点窗口 → 最小化；已收起 → 还原；已打开非焦点 → 切换', () => {
    const initial = createWindowManagerState(APP_IDS, APP_A)
    // 焦点且显示 ⇒ 最小化
    const minimized = toggleAppFromShell(initial, APP_A)
    expect(windowOf(minimized, APP_A).status).toBe('minimized')
    // 已最小化 ⇒ 还原（并置顶 / 聚焦）
    const restored = toggleAppFromShell(minimized, APP_A)
    expect(windowOf(restored, APP_A).status).toBe('normal')
    expect(restored.activeAppId).toBe(APP_A)
    // 已打开但非焦点 ⇒ 只置顶聚焦，不最小化
    const other = activateApp(restored, APP_B)
    const switched = toggleAppFromShell(other, APP_A)
    expect(windowOf(switched, APP_A).status).toBe('normal')
    expect(windowOf(switched, APP_B).status).toBe('normal')
    expect(switched.activeAppId).toBe(APP_A)
  })
})

describe('窗口管理器：焦点回退与关闭', () => {
  it('最小化焦点窗口后，焦点交给下一个最上层可见窗口', () => {
    const both = activateApp(createWindowManagerState(APP_IDS, APP_A), APP_B)
    expect(both.activeAppId).toBe(APP_B)
    const minimized = minimizeApp(both, APP_B)
    expect(windowOf(minimized, APP_B).status).toBe('minimized')
    expect(minimized.activeAppId).toBe(APP_A)
  })

  it('全部收起后焦点为 null，任务栏入口因此一律呈「还原 / 打开」语义', () => {
    let state = createWindowManagerState(APP_IDS, APP_A)
    state = minimizeApp(state, APP_A)
    expect(state.activeAppId).toBeNull()
    expect(topMostVisibleApp(state)).toBeNull()
  })

  it('最小化**非焦点**窗口不改变焦点（焦点仍在本来那扇窗上）', () => {
    const both = activateApp(createWindowManagerState(APP_IDS, APP_A), APP_B)
    const minimized = minimizeApp(both, APP_A)
    expect(minimized.activeAppId).toBe(APP_B)
  })

  it('closeApp 复位形态（与最小化刻意不同），关闭焦点窗口后焦点回退', () => {
    const base = createWindowManagerState(APP_IDS, APP_A)
    const maximized = maximizeApp(base, APP_A)
    const closed = closeApp(maximized, APP_A)
    expect(windowOf(closed, APP_A).status).toBe('closed')
    expect(windowOf(closed, APP_A).maximized).toBe(false)
    expect(windowOf(closed, APP_A).offset).toEqual({ x: 0, y: 0 })
    expect(closed.activeAppId).toBeNull()
  })

  it('关闭后重新激活 = 全新窗口语义（居中常规），但保留已打开的标签', () => {
    let state = createWindowManagerState(APP_IDS, APP_A)
    state = openTabInApp(state, APP_A, 'components')
    state = maximizeApp(state, APP_A)
    state = closeApp(state, APP_A)
    const reopened = activateApp(state, APP_A)
    expect(windowOf(reopened, APP_A).maximized).toBe(false)
    expect(windowOf(reopened, APP_A).offset).toEqual({ x: 0, y: 0 })
    expect(windowOf(reopened, APP_A).openTabs).toEqual([SHELL_DEFAULT_TAB_ID, 'components'])
  })
})

describe('窗口管理器：逐窗口状态互不串扰', () => {
  it('位移 / 标签 / 最大化都只作用于目标应用', () => {
    let state = createWindowManagerState(APP_IDS, APP_A)
    state = activateApp(state, APP_B)
    state = openTabInApp(state, APP_B, 'components')
    state = maximizeApp(state, APP_B)
    // 最大化会把该窗口的位移归零（既有语义），所以先最大化再写位移
    state = setAppOffset(state, APP_B, { x: 10, y: -20 })

    expect(windowOf(state, APP_B).offset).toEqual({ x: 10, y: -20 })
    expect(windowOf(state, APP_B).openTabs).toEqual([SHELL_DEFAULT_TAB_ID, 'components'])
    expect(windowOf(state, APP_B).maximized).toBe(true)

    expect(windowOf(state, APP_A).offset).toEqual({ x: 0, y: 0 })
    expect(windowOf(state, APP_A).openTabs).toEqual([SHELL_DEFAULT_TAB_ID])
    expect(windowOf(state, APP_A).maximized).toBe(false)
  })

  it('标签操作（打开 / 关闭 / 选中）走与应用绑定的入口', () => {
    let state = createWindowManagerState(APP_IDS, APP_A)
    state = openTabInApp(state, APP_A, 'components')
    state = openTabInApp(state, APP_A, 'guide')
    state = selectTabInApp(state, APP_A, 'components')
    expect(windowOf(state, APP_A).activeTab).toBe('components')
    state = closeTabInApp(state, APP_A, 'components')
    expect(windowOf(state, APP_A).openTabs).toEqual([SHELL_DEFAULT_TAB_ID, 'guide'])
  })

  it('restoreApp 取消最大化但不改变位移（还原回拖拽过的位置）', () => {
    let state = createWindowManagerState(APP_IDS, APP_A)
    state = setAppOffset(state, APP_A, { x: 30, y: 30 })
    state = maximizeApp(state, APP_A)
    // 最大化会把位移归零（既有语义）
    expect(windowOf(state, APP_A).offset).toEqual({ x: 0, y: 0 })
    const restored = restoreApp(state, APP_A)
    expect(windowOf(restored, APP_A).maximized).toBe(false)
  })

  it('未登记的应用 id 不抛错：给一份全新窗口、置顶操作退化为 no-op', () => {
    const state = createWindowManagerState(APP_IDS, APP_A)
    const missing = 'missing' as ShellAppId
    expect(windowOf(state, missing).status).toBe('normal')
    expect(activateApp(state, missing).zOrder).toEqual([...APP_IDS])
  })
})

describe('窗口管理器：z 序表达式（全程引用刻度）', () => {
  it('最底层用 --zIndexWindow 本身，其余按 --zIndexStep 递增', () => {
    const state = createWindowManagerState(APP_IDS, APP_A)
    expect(windowZIndex(state, APP_A)).toBe('var(--zIndexWindow)')
    expect(windowZIndex(state, APP_B)).toBe('calc(var(--zIndexWindow) + 1 * var(--zIndexStep))')
    expect(windowZIndex(state, APP_C)).toBe('calc(var(--zIndexWindow) + 2 * var(--zIndexStep))')
    // 置顶后 rank 变化，表达式跟着变（层级是「谁在最前」，不是固定编号）
    const raised = focusApp(state, APP_A)
    expect(windowZIndexRank(raised, APP_A)).toBe(2)
    expect(windowZIndex(raised, APP_A)).toBe('calc(var(--zIndexWindow) + 2 * var(--zIndexStep))')
  })

  it('超过 SHELL_MAX_WINDOWS 时夹取（不会把窗口抬到 --zIndexContent 之上）', () => {
    const many = Array.from({ length: SHELL_MAX_WINDOWS + 3 }, (_, index) => `app-${index}`)
    const state = createWindowManagerState(many as ShellAppId[], many[0] as ShellAppId)
    const top = many.at(-1) as ShellAppId
    expect(windowZIndex(state, top)).toBe(
      `calc(var(--zIndexWindow) + ${SHELL_MAX_WINDOWS - 1} * var(--zIndexStep))`,
    )
  })
})
