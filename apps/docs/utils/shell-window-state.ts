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
 *  - 位移收敛（`containWindowOffset`）只保证**标题栏可见**，不保证窗口整块留在桌面内：
 *    规则、来源以及与 Win32 的差异都写在该函数注释里。
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

/** 窗口「静止位置」：未叠加拖拽位移时窗口左上角在桌面坐标系里的坐标（px） */
export interface ShellWindowBase {
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

/**
 * 拖拽收敛 / 视口收敛所需的全部几何量。
 *
 * `base` 与两个尺寸一样是**实测**的（`rect - offset`，见 `desktop-shell.vue#measure`）：
 * 窗口的静止位置写在 `explorer-window.vue` 的 CSS 里（居中 + `--shell-desktop-margin`），
 * 在 TS 里再推导一遍就会漂移（与 `windowSize` 同一条理由）。
 */
export interface ShellWindowGeometry {
  /** 窗口实际尺寸（px） */
  windowSize: ShellWindowSize
  /** 桌面可视区尺寸（px） */
  desktopSize: ShellDesktopSize
  /** 窗口静止位置（px，桌面坐标系） */
  base: ShellWindowBase
  /** 任务栏高度（px） */
  taskbarHeight: number
  /**
   * 标题栏**下缘**相对窗口上缘的偏移（px）—— 收敛保证这段「窗口顶端条带」始终可见。
   *
   * 刻意不是标题栏自身的 `height`：`FluereAppWindow` 的根带 1px 描边、标题栏在描边之内，
   * 所以条带 = 描边 + 标题栏高（compact 档实测 **33** = 1 + 32）。按 `height`(32) 收敛会
   * 让标题栏（连同 caption 按钮）下缘压进任务栏 1px —— 实测 1600×1000 视口下
   * 标题栏下缘 = 953、任务栏上缘 = 952。
   */
  titleBarBottom: number
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
 * 把窗口位移收敛到「**标题栏始终可见**」的范围 —— 拖拽中与视口（宿主）变化后共用同一条规则。
 *
 * ## 为什么要改掉「窗口整块留在桌面内」
 *
 * 0.5.5 的实现按「窗口整块不跑出桌面」收敛（`y ∈ ±(可用区高 − 窗口高) / 2`），
 * 于是窗口下缘碰到任务栏上缘就再也拖不动（实测 1600×1000 视口：只能下移 116px，
 * 窗口下缘停在任务栏**上方 92px**），与实机观感不符。Windows 11 里窗口**本体**
 * 不受桌面矩形限制：抓住标题栏往下拖，大部分窗口可以落到屏幕外，只剩标题栏压在
 * 任务栏上缘之上；往上拖则一直顶到桌面顶端为止。唯一被守住的是标题栏始终可见、抓得到。
 *
 * 反过来说，旧实现还有一处更严重的副作用：它是**对称**收敛，且没有把静止位置
 * （距顶 `--shell-desktop-margin` = 24）算进去 ⇒ 上拖到底时标题栏整条跑到桌面之上
 * （实测 `title.top = -91`，窗口彻底抓不到，只能靠任务栏还原入口救回来）。
 * 本次一并修掉。
 *
 * ## 规则
 *
 * 一句话：**标题栏必须完整可见**（这就是用户在实机上观察到的「标题栏一直被任务栏挡着
 * 也一直看得见」）。这条不变量的两个轴向表现不同，原因是标题栏的几何形状：
 * 它横跨窗口整宽、但只占顶端一条。
 *
 * 坐标系：`offset` 是相对**静止位置** `base` 的平移量 ⇒ 窗口左上角 = `base + offset`；
 * 桌面工作区 = `[0, desktopWidth] × [0, desktopHeight - taskbarHeight]`。
 *
 *  - **纵向（窗口本体可越界）**：顶端条带落在工作区内 —— 上缘 ≥ 桌面顶端、
 *    下缘 ≤ 任务栏上缘（下缘按 `titleBarBottom` 量，含窗口自身 1px 描边）。
 *    这就是「标题栏向下移动到被任务栏挡住为止」的判据：标题栏以下的部分可以任意
 *    挂在工作区之外（下拖到底时只剩标题栏可见）。
 *  - **横向（窗口本体不越界）**：标题栏横跨窗口整宽 ⇒「标题栏完整可见」在横向
 *    **等价于**「窗口整块留在桌面内」。这里刻意不做「可挂出左右边缘」：
 *    实测 1120px 窗口拖到左边界只留 48px 可见时，那 48px 恰好落在标题栏的
 *    **caption 按钮区**（`data-fui-app-window-nodrag`，nodrag 本身也是按钮）——
 *    窗口会卡在「拖得出去、拖不回来」，只剩最小化 / 关闭可点。
 *    Win32 之所以能放开横向，是因为它约束的是**光标锚点**（`rcWork.left ≤ pt.x ≤
 *    rcWork.right - 1`）而不是窗口矩形：被抓住的那一点（一定在可拖拽区内）永远可见，
 *    而 Web 里指针不受桌面矩形限制，没有等价物。故横向取更强的那条，宁可不越界。
 *
 * ## 与 Win32 的差异（明写，不是巧合）
 *
 * Win32 的 `WM_SYSCOMMAND SC_MOVE` 移动循环约束的是**拖拽锚点（光标）**而不是窗口矩形
 * （Wine 的逆向实现 `dlls/win32u/defwnd.c#sys_command_size_move`：
 * `pt.y = min(pt.y, rcWork.bottom - 1 - caption_height)`，`caption_height` = 非客户区上高）：
 * 光标始终留在工作区内，且下边界再内缩一个标题栏高度 ⇒ 被抓住的那一点永远可见。
 * 两者的**可观察结果一致**（窗口本体可越界、标题栏可见），差异只在边界那一像素级：
 * 锚点模型允许标题栏上缘高出桌面顶端 `抓取点在标题栏内的偏移`（抓到标题栏底部时
 * 整条标题栏几乎都在屏幕外），窗口矩形模型则要求标题栏整条可见。本仿真取后者 ——
 * 它是「标题栏一直可见」这句口径的**更强**形式，且在拖拽与 resize 两条路径上
 * 是同一个不变量（锚点模型在 resize 时没有锚点可用）。
 *
 * 退化情形（工作区比标题栏还矮 / 桌面比窗口还窄）：区间反转时**保留下界**（标题栏顶端
 * 贴住桌面顶端、窗口左缘贴住桌面左缘），即「至少让标题栏的开头可见」，而不是返回一个
 * 让窗口整体跑出去的中间值。
 *
 * 非有限值（NaN / Infinity）一律按 0 处理，避免脏值经内联 `translate3d` 传进样式。
 */
export function containWindowOffset(
  offset: ShellWindowOffset,
  geometry: ShellWindowGeometry,
): ShellWindowOffset {
  const width = finite(geometry.windowSize.width)
  const desktopWidth = finite(geometry.desktopSize.width)
  const desktopHeight = finite(geometry.desktopSize.height)
  const base = { x: finite(geometry.base.x), y: finite(geometry.base.y) }
  const taskbarHeight = Math.max(0, finite(geometry.taskbarHeight))
  const titleBarBottom = Math.max(0, finite(geometry.titleBarBottom))
  /* 工作区高度：视口比任务栏还矮时不允许出现负值 */
  const workHeight = Math.max(0, desktopHeight - taskbarHeight)

  // 纵向：顶端条带落在工作区内（上缘 ≥ 0、下缘 ≤ workHeight）；窗口本体可越界
  const topMin = -base.y
  const topMax = workHeight - titleBarBottom - base.y

  // 横向：窗口整块留在桌面内（标题栏横跨整宽 ⇒ 这就是「标题栏横向完整可见」）
  const leftMin = -base.x
  const leftMax = desktopWidth - width - base.x

  return {
    x: clampToRange(finite(offset.x), leftMin, leftMax),
    y: clampToRange(finite(offset.y), topMin, topMax),
  }
}

/** 数值区间收敛；`min > max`（区间反转）时返回 `min`（见 `containWindowOffset` 的退化段） */
function clampToRange(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max))
}

/** 非有限值归零（防 NaN / Infinity 污染内联 style） */
function finite(value: number): number {
  return Number.isFinite(value) ? value : 0
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
