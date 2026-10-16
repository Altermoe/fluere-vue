/**
 * 桌面外壳（0.5.5 `DesktopShell`）的窗口 / 标签状态机 —— **纯函数，无 DOM、无副作用**。
 *
 * 为什么单独抽成 utils 而不是写在 SFC 里：
 *  1. `apps/docs` 是 Nuxt 应用，`vitest.config.ts` 的 `include` 只收集 `apps/docs/utils/**`
 *     下的测试（组件级 / 页面级测试需要 @nuxt/test-utils，不在本仓范围）。把可测的逻辑
 *     放在这里，才谈得上「契约测试」而不是只靠浏览器肉眼验收。
 *  2. 窗口状态是**跨组件共享**的（标题栏抛事件、任务栏要还原、窗口层要读几何），
 *     但共享范围只有外壳这一棵子树 —— 用「外壳持有 state、向下传 props、向上收事件」
 *     比引入全局 store 更贴合组件库既有口径（受控 / 非受控都支持，见 AGENTS.md）。
 *
 * 状态语义对齐的既有契约：
 *  - `FluereAppWindow` 的 caption 事件**只是意图**：`minimize` / `maximize` / `restore` /
 *    `close` 不改任何窗口状态，`update:maximized` 也只是「请求」——真正改状态的是这里。
 *  - `FluereTabView` 的 `tabCloseRequested` / `addTabButtonClick` **同样只抛事件不删数据**
 *    （组件注释与 tab-view.vue 文件头明文），删不删、删完选谁由消费方决定。
 *    本模块的 `closeTab` 因此实现上游 `OnItemsChanged` 的**向后环形迁移**规则：
 *    关闭当前激活项后选中它**后面**的项，到末尾则回绕到第一项。
 */

/** 窗口状态档位 */
export type ShellWindowStatus =
  /** 常规显示（可拖拽；`maximized` 另计） */
  | 'normal'
  /** 已最小化：窗口隐藏，任务栏保留还原入口 */
  | 'minimized'
  /** 已关闭：窗口隐藏，桌面中央给「重新打开」占位卡片 */
  | 'closed'

/** 窗口平移量（px，相对居中基准位置） */
export interface ShellWindowOffset {
  x: number
  y: number
}

/** 桌面可视区尺寸（px） */
export interface ShellDesktopSize {
  width: number
  height: number
}

/** 窗口实际尺寸（px） */
export interface ShellWindowSize {
  width: number
  height: number
}

/** 标签（窗口内的视图）标识。用字符串而不是索引：关闭 / 重排后索引会漂移 */
export type ShellTabId = string

export interface ShellWindowState {
  /** 窗口状态档位 */
  status: ShellWindowStatus
  /** 是否最大化（仅 `status === 'normal'` 时有意义） */
  maximized: boolean
  /** 拖拽累计位移；最大化 / 关闭时归零 */
  offset: ShellWindowOffset
  /** 已打开的标签（顺序即 tab 条顺序） */
  openTabs: readonly ShellTabId[]
  /** 当前激活标签 */
  activeTab: ShellTabId
}

/**
 * 兜底空视图的标签 id。
 *
 * 为什么需要它：`FluereTabView` 的内容区是「未选中即卸载」，若允许把最后一个标签也关掉，
 * tab 条会塌成空壳、内容区没有任何 `TabsContent` —— 既没有可访问内容，也没有可恢复的入口。
 * 因此在关掉最后一个标签时保留一个**不可关闭**的占位视图（由 `isClosable: false` 表达），
 * 让「关完」这件事仍然有合理的静态形态。
 */
export const SHELL_BLANK_TAB_ID = '__shell_blank__'

/** 初始标签：默认停在站点首页视图 */
export const SHELL_DEFAULT_TAB_ID = 'home'

/** 创建一个初始状态（常规、未最大化、无位移、停在默认标签） */
export function createShellWindowState(
  initialTab: ShellTabId = SHELL_DEFAULT_TAB_ID,
): ShellWindowState {
  return {
    status: 'normal',
    maximized: false,
    offset: { x: 0, y: 0 },
    openTabs: [initialTab],
    activeTab: initialTab,
  }
}

/**
 * 最小化。
 *
 * **保留 `maximized` 与 `offset`** —— 对齐实机语义：从任务栏还原回来的窗口应当回到
 * 最小化之前的形态（Windows 不重置窗口尺寸与位置）。占位卡片（关闭态）不参与这条。
 */
export function minimize(state: ShellWindowState): ShellWindowState {
  return { ...state, status: 'minimized' }
}

/** 最大化：位移归零（最大化铺满可视区，拖拽位移失去意义） */
export function maximize(state: ShellWindowState): ShellWindowState {
  return { ...state, status: 'normal', maximized: true, offset: { x: 0, y: 0 } }
}

/** 还原：取消最大化并回到常规档 */
export function restore(state: ShellWindowState): ShellWindowState {
  return { ...state, status: 'normal', maximized: false }
}

/**
 * 关闭窗口。
 *
 * 复位 `maximized` 与 `offset`：重新打开时回到「居中常规窗口」这个确定形态，
 * 而不是继承上次的最大化 / 拖拽位置 —— 关闭态与最小化态在这里**刻意不同**，
 * 因为重新打开走的是「新开一个窗口」的语义。
 */
export function closeWindow(state: ShellWindowState): ShellWindowState {
  return {
    ...state,
    status: 'closed',
    maximized: false,
    offset: { x: 0, y: 0 },
  }
}

/** 重新打开（最小化还原 / 关闭后重开共用）：回到常规档 */
export function reopenWindow(state: ShellWindowState): ShellWindowState {
  return { ...state, status: 'normal' }
}

/**
 * 把拖拽位移收敛到「窗口不跑出桌面可视区」的范围。
 *
 * 坐标系：`offset` 是相对**居中基准位置**的平移量，因此
 *   - 左右各可移动 `(desktopWidth - windowWidth) / 2`；
 *   - 上下同理，但底部要扣掉任务栏高度（任务栏 `position: fixed` 恒在最下，
 *     窗口不允许钻到它下面 —— explorer-layout.md §1「任务栏仍可见」）。
 *
 * 溢出（窗口比可用区还大，例如小视口）时返回最大可用位移（可能是 0）。
 * **不做吸附 / 不做多屏 / 不做橡皮筋**（仿真边界明文不做真实窗口管理器）。
 */
// oxlint-disable-next-line eslint/max-params -- 四个入参是互相独立的几何量（位移 / 窗口尺寸 / 桌面尺寸 / 任务栏高），合成对象只会模糊「谁是桌面、谁是窗口」；参数顺序即文档
export function clampWindowOffset(
  offset: ShellWindowOffset,
  windowSize: ShellWindowSize,
  desktopSize: ShellDesktopSize,
  taskbarHeight: number,
): ShellWindowOffset {
  const availableHeight = Math.max(0, desktopSize.height - taskbarHeight)
  const limitX = Math.max(0, (desktopSize.width - windowSize.width) / 2)
  const limitY = Math.max(0, (availableHeight - windowSize.height) / 2)
  return {
    x: clamp(offset.x, -limitX, limitX),
    y: clamp(offset.y, -limitY, limitY),
  }
}

/** 数值区间收敛（`min > max` 时返回 `max`，即容错取上界） */
function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }
  return Math.min(Math.max(value, min), max)
}

/**
 * 打开（或切换到）一个标签。
 *
 * **幂等**：已打开的标签只切激活，不产生重复项 —— 导航面板反复点同一项不该堆出两个 tab。
 */
export function openTab(state: ShellWindowState, tab: ShellTabId): ShellWindowState {
  if (state.openTabs.includes(tab)) {
    return { ...state, activeTab: tab }
  }
  return { ...state, openTabs: [...state.openTabs, tab], activeTab: tab }
}

/**
 * 关闭一个标签，按上游 `OnItemsChanged` 的**向后环形迁移**规则决定新激活项。
 *
 * - 关闭的不是当前激活项 → 激活项不变；
 * - 关闭的是当前激活项 → 选中它**后面**的一项；已是最后一项则回绕到第一项；
 * - 关闭后只剩空 → 补上兜底空视图（见 `SHELL_BLANK_TAB_ID`）；
 * - 走兜底视图时**不允许**再关它（`isClosable` 由消费方按 `SHELL_BLANK_TAB_ID` 判定）。
 */
export function closeTab(state: ShellWindowState, tab: ShellTabId): ShellWindowState {
  const index = state.openTabs.indexOf(tab)
  if (index === -1) {
    return state
  }
  const remaining = state.openTabs.filter((item) => item !== tab)

  // 关掉最后一个：补兜底空视图，避免 tab 条 / 内容区塌成空壳
  if (remaining.length === 0) {
    return { ...state, openTabs: [SHELL_BLANK_TAB_ID], activeTab: SHELL_BLANK_TAB_ID }
  }

  if (state.activeTab !== tab) {
    return { ...state, openTabs: remaining }
  }

  // 向后环形迁移：优先取下一位，越界则回绕到第一位
  const nextActive = remaining[index] ?? remaining[0]
  return { ...state, openTabs: remaining, activeTab: nextActive as ShellTabId }
}

/** 切换激活标签（`FluereTabView` 的 `update:selectedIndex` 落到这里） */
export function selectTab(state: ShellWindowState, tab: ShellTabId): ShellWindowState {
  if (!state.openTabs.includes(tab)) {
    return state
  }
  return { ...state, activeTab: tab }
}

/** 标签是否为兜底空视图（消费方据此给它 `isClosable: false`） */
export function isBlankTab(tab: ShellTabId): boolean {
  return tab === SHELL_BLANK_TAB_ID
}
