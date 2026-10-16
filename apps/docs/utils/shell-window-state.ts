/**
 * 桌面外壳（0.5.5 `DesktopShell`）的窗口 / 标签状态机 —— **纯函数，无 DOM、无副作用**。
 *
 * 0.5.9 起分两层：
 *  - **每窗口**（本文件上半部分，0.5.5 语义不变）：`ShellWindowState` + `minimize` /
 *    `maximize` / `restore` / `closeWindow` / `reopenWindow` / `openTab` / `closeTab` /
 *    `selectTab` / `containWindowOffset`；
 *  - **窗口管理器**（本文件末尾）：`ShellWindowManagerState` = 按应用分桶的窗口状态 +
 *    z 序 + 焦点，纯函数负责「置顶 / 激活 / 最小化 / 关闭后的焦点回退 / 逐窗口标签操作」。
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
import type { ShellAppId } from './shell-apps'

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
 * 窗口的静止位置写在 `apps/docs/assets/docs-shell.css` 里（居中 + 应用档位错开 +
 * `--shell-desktop-margin`），
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

/* ------------------------------------------------------------------ */
/* 窗口管理器（0.5.9 多窗口：层级管理 + 焦点切换）                        */
/* ------------------------------------------------------------------ */

/**
 * 窗口 z 序的档位上限（rank 0..7 ⇒ `--zIndexWindow` + 0..70）。
 *
 * 为什么要有上限：z 值表达式是 `calc(var(--zIndexWindow) + rank * var(--zIndexStep))`，
 * 而 `--zIndexContent`(100) 是「窗口内容区浮起面」档 —— 超过 9 扇窗口就会把窗口抬到
 * 内容区浮起面之上，层级语义随即崩掉。上限只用于**夹取**（第 9 扇窗口和它同层），
 * 不做「拒绝打开」：仿真里没有那么多应用，夹取比报错温和。
 */
export const SHELL_MAX_WINDOWS = 8

/**
 * 窗口管理器状态（0.5.9）。
 *
 * 三个字段各自回答一个问题：
 *  - `windows`：**每个应用**的窗口形态（状态 / 最大化 / 位移 / 标签）—— 最小化或关闭
 *    窗口**不丢**这些数据（与实机一致：从任务栏还原回来的窗口回到原形态）。
 *  - `zOrder`：从**底到顶**的应用层序。最小化 / 关闭的应用**留在序里**：还原时先回到
 *    原层再置顶（`activateApp` 做这件事），不会因为一次最小化就改变固定的层序记忆。
 *  - `activeAppId`：当前**焦点**窗口（= 最上层可见窗口）。全部收起时为 `null`，
 *    此时任务栏入口一律呈「还原」语义。
 *
 * ## 来源与证据缺口（与 explorer-layout.md §1.1 同一条）
 *
 * Windows 的窗口层级 / 焦点由系统窗口管理器持有，`microsoft-ui-xaml` 里**没有**对应源码。
 * 口径来自 ① 用户 Windows 11 实机观察；② 通行语义：点击窗口内部把它带到最前并聚焦
 * （顶层窗口在 `WM_*` 消息里由系统维护 z 序），最小化 / 关闭后系统把焦点交给下一个
 * 可见顶层窗口。本期只实现这两条，吸附 / 贴边 / 任务视图属明确非目标。
 */
export interface ShellWindowManagerState {
  /** 按应用分桶的窗口状态（未被打开过的应用也有条目，状态为 `closed`） */
  windows: Record<ShellAppId, ShellWindowState>
  /** 从底到顶的层序 */
  zOrder: readonly ShellAppId[]
  /** 当前焦点窗口；全部收起时为 `null` */
  activeAppId: ShellAppId | null
}

/**
 * 创建初始管理器状态。
 *
 * 只有 `initialAppId` 是「已打开」（`normal`），其余应用初始为 `closed`（未运行）——
 * 与实机一致：桌面起步时应用没运行，点任务栏 / 开始菜单入口才打开。
 */
export function createWindowManagerState(
  appIds: readonly ShellAppId[],
  initialAppId: ShellAppId | null = null,
): ShellWindowManagerState {
  /*
   * `Record<ShellAppId, …>` 要求每个 id 都有条目，而 id 是**字面量联合**（编译期已知全集），
   * 运行时才由 `appIds` 决定填哪些 —— 因此先断言成完整 Record 再逐个填。
   * 填的是调用方给的全部 id（`SHELL_APP_IDS` 或测试夹具），不会留空洞；
   * 万一真缺了某个 id，`windowOf()` 的兜底也会给出一扇全新的常规窗口。
   */
  const windows = {} as Record<ShellAppId, ShellWindowState>
  for (const id of appIds) {
    windows[id] =
      id === initialAppId ? createShellWindowState() : closeWindow(createShellWindowState())
  }
  return { windows, zOrder: [...appIds], activeAppId: initialAppId }
}

/** 取某应用的窗口状态；条目缺失时给一份全新的常规窗口（不抛错，桌面上少一扇窗比整页崩好） */
export function windowOf(state: ShellWindowManagerState, appId: ShellAppId): ShellWindowState {
  return state.windows[appId] ?? createShellWindowState()
}

/** 写回单个应用的窗口状态（其余字段与其余应用原样保留） */
function withWindow(
  state: ShellWindowManagerState,
  appId: ShellAppId,
  next: ShellWindowState,
): ShellWindowManagerState {
  return { ...state, windows: { ...state.windows, [appId]: next } }
}

/** 某应用在 z 序里的层号（0 = 最底）；不在序里时按 0 处理 */
export function windowZIndexRank(state: ShellWindowManagerState, appId: ShellAppId): number {
  const index = state.zOrder.indexOf(appId)
  return index === -1 ? 0 : index
}

/**
 * 某窗口的 `z-index` 表达式 —— **全程引用刻度，不产生裸值**。
 *
 * 形态与 `desktop-shell.vue` 里窗口层的 `var(--zIndexWindow)` 同源：窗口层本身是 0 档，
 * 层内的兄弟窗口按 `--zIndexStep`(10) 逐档递增。返回值直接喂给内联 `:style` 的 `zIndex`，
 * 由 `shell-window-state.test.ts` 断言形态（契约测试扫不到内联 style 的 `z-index` 声明）。
 */
export function windowZIndex(state: ShellWindowManagerState, appId: ShellAppId): string {
  const rank = Math.min(windowZIndexRank(state, appId), SHELL_MAX_WINDOWS - 1)
  return rank === 0
    ? 'var(--zIndexWindow)'
    : `calc(var(--zIndexWindow) + ${rank} * var(--zIndexStep))`
}

/** 最上层**可见**窗口（跳过最小化 / 关闭与 `exclude`）；没有可见窗口时返回 `null` */
export function topMostVisibleApp(
  state: ShellWindowManagerState,
  exclude?: ShellAppId,
): ShellAppId | null {
  for (let index = state.zOrder.length - 1; index >= 0; index -= 1) {
    const id = state.zOrder[index]
    if (id === undefined || id === exclude) {
      continue
    }
    if (windowOf(state, id).status === 'normal') {
      return id
    }
  }
  return null
}

/** 置顶：把它移到 z 序末尾（不改变可见性 / 不改变焦点） */
export function raiseApp(
  state: ShellWindowManagerState,
  appId: ShellAppId,
): ShellWindowManagerState {
  if (!state.zOrder.includes(appId)) {
    return state
  }
  return { ...state, zOrder: [...state.zOrder.filter((id) => id !== appId), appId] }
}

/** 聚焦：置顶 + 设为焦点（窗口已可见时由窗口内的 pointerdown 触发） */
export function focusApp(
  state: ShellWindowManagerState,
  appId: ShellAppId,
): ShellWindowManagerState {
  return { ...raiseApp(state, appId), activeAppId: appId }
}

/**
 * 激活（打开 / 还原 + 置顶 + 聚焦）—— 任务栏与开始菜单入口的统一路径。
 *
 * 最小化或关闭的窗口在这里被**还原**：`reopenWindow` 只复位 `status`，
 * `maximized` / `offset` / `openTabs` 一律保留（见 `minimize` 的注释：实机从任务栏
 * 还原的窗口回到最小化之前的形态；关闭态则在 `closeWindow` 里已复位形态）。
 */
export function activateApp(
  state: ShellWindowManagerState,
  appId: ShellAppId,
): ShellWindowManagerState {
  const raised = raiseApp(state, appId)
  return {
    ...withWindow(raised, appId, reopenWindow(windowOf(raised, appId))),
    activeAppId: appId,
  }
}

/** 任务栏入口的切换语义：焦点窗口 → 最小化；其余 → 激活（打开 / 还原 + 置顶） */
export function toggleAppFromShell(
  state: ShellWindowManagerState,
  appId: ShellAppId,
): ShellWindowManagerState {
  const window = windowOf(state, appId)
  if (window.status === 'normal' && state.activeAppId === appId) {
    return minimizeApp(state, appId)
  }
  return activateApp(state, appId)
}

/** 最小化；若最小化的正是焦点窗口，把焦点交给下一个最上层可见窗口 */
export function minimizeApp(
  state: ShellWindowManagerState,
  appId: ShellAppId,
): ShellWindowManagerState {
  const next = withWindow(state, appId, minimize(windowOf(state, appId)))
  return {
    ...next,
    activeAppId: state.activeAppId === appId ? topMostVisibleApp(next) : next.activeAppId,
  }
}

/** 关闭；若关闭的正是焦点窗口，把焦点交给下一个最上层可见窗口（关闭后入口仍在任务栏） */
export function closeApp(
  state: ShellWindowManagerState,
  appId: ShellAppId,
): ShellWindowManagerState {
  const next = withWindow(state, appId, closeWindow(windowOf(state, appId)))
  return {
    ...next,
    activeAppId: state.activeAppId === appId ? topMostVisibleApp(next) : next.activeAppId,
  }
}

/**
 * 最大化 / 还原。
 *
 * 只改窗口形态并把焦点给它（入口都在这扇窗口自己的 caption 上，用户此刻点的就是它）；
 * **不置顶** —— 实机里最大化不会把窗口提到别的窗口之上（层序是另一件事）。
 */
export function maximizeApp(
  state: ShellWindowManagerState,
  appId: ShellAppId,
): ShellWindowManagerState {
  return { ...withWindow(state, appId, maximize(windowOf(state, appId))), activeAppId: appId }
}

/** 还原（取消最大化） */
export function restoreApp(
  state: ShellWindowManagerState,
  appId: ShellAppId,
): ShellWindowManagerState {
  return { ...withWindow(state, appId, restore(windowOf(state, appId))), activeAppId: appId }
}

/** 写回拖拽位移（收敛由消费方用 `containWindowOffset` 完成，与 0.5.8 口径一致） */
export function setAppOffset(
  state: ShellWindowManagerState,
  appId: ShellAppId,
  offset: ShellWindowOffset,
): ShellWindowManagerState {
  return withWindow(state, appId, { ...windowOf(state, appId), offset })
}

/** 在某应用的窗口里打开（或切换到）标签 */
export function openTabInApp(
  state: ShellWindowManagerState,
  appId: ShellAppId,
  tab: ShellTabId,
): ShellWindowManagerState {
  return withWindow(state, appId, openTab(windowOf(state, appId), tab))
}

/** 关闭某应用窗口里的标签 */
export function closeTabInApp(
  state: ShellWindowManagerState,
  appId: ShellAppId,
  tab: ShellTabId,
): ShellWindowManagerState {
  return withWindow(state, appId, closeTab(windowOf(state, appId), tab))
}

/** 切换某应用窗口里的激活标签 */
export function selectTabInApp(
  state: ShellWindowManagerState,
  appId: ShellAppId,
  tab: ShellTabId,
): ShellWindowManagerState {
  return withWindow(state, appId, selectTab(windowOf(state, appId), tab))
}
