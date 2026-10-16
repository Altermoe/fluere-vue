<script setup lang="ts">
/**
 * 桌面外壳（0.5.5 `DesktopShell`）—— `/os` 路由的根组件。
 *
 * 0.5.5 时它挂在站点首页（`pages/index.vue`）；0.5.6 起站点主页回到常规营销页，
 * 仿真整体迁到 `/os`（`pages/os/index.vue` + `layouts/os.vue`，
 * 口径见 docs/design/explorer-layout.md §0）。
 *
 * 三层结构（explorer-layout.md 第 0 节《范围与归属》锁定）：
 *
 * ```
 * docs-shell-desktop            position: relative（视口锁定，不滚动）
 * ├─ DesktopWallpaper           壁纸层：position: fixed，不建层（绘制次序在最下）
 * ├─ 窗口包装层                  z-index: var(--zIndexWindow)  ← 0
 * │  └─ ExplorerWindow           窗口（标题栏 + 导航 + 标签 + 内容滚动）
 * ├─ 关闭占位卡片                与窗口同层（互斥，不同时出现）
 * └─ ShellTaskbar               z-index: var(--zIndexShell)   ← 1500（贴底固定）
 *     ├─ ShellStartMenu          开始按钮 + 开始菜单面板（--zIndexStartMenu 档，0.5.7）
 *     ├─ 中间图标区               可横向滚动（箭头驱动，无原生滚动条）
 *     └─ 系统托盘                 时钟 + 内联控件 / 展开菜单（窄档压缩）
 * ```
 *
 * 任务栏**全宽度常驻**（0.5.7 起；0.5.5 曾在移动档整条隐藏，评审后改为压缩常驻），
 * 窗口在移动档为它让出 `calc(100% - var(--shell-taskbar-h))` 的高度。
 *
 * ## 文档级滚动被关闭（explorer-layout.md §2 锁定的假设）
 *
 * 根节点锁到视口高度（`100dvh`，回退 `100vh`）且 `overflow: hidden`；页面自身不滚动，
 * **滚动只发生在窗口内容区内部**。理由见该文档 §2：真实 Explorer 的滚动条属于窗口内容，
 * 把整页做成滚动会让任务栏 / 壁纸跟着走，仿真边界立刻破。
 *
 * ## 状态由本组件持有（单向向下、事件向上）
 *
 * 窗口状态是外壳子树内**唯一共享的可变数据**（标题栏抛意图 → 这里改 → 任务栏 / 窗口层读）。
 * 共享范围只有这一棵子树，因此用「持有 state + props 向下 + 事件向上」而不是全局 store ——
 * 与组件库既有的受控 / 非受控口径一致（AGENTS.md〈交互与弹层组件约定〉）。
 * 纯逻辑落在 `utils/shell-window-state.ts`（可在 vitest 里单测，见该目录的 __tests__）。
 *
 * ## 桌面 / 移动端切换**不用 `useMediaQuery` 参与渲染**
 *
 * 视觉分支全部交给 CSS 断点（`lg:` 前缀 = 64rem = 1024px，与 explorer-layout.md §2
 * 的降级判据、docs-sidebar.vue 的桌面常驻栏判据同阈值）。原因：`useMediaQuery` 在
 * SSR 下恒返回 `false`（packages/hooks/src/use-media-query.ts），若用它决定渲染什么，
 * 服务端与客户端首帧必然不一致 ⇒ 水合告警。它只在 `watch` 里做副作用
 * （退到移动档时复位窗口位移，避免回到桌面档时窗口已在屏幕外）。
 *
 * ## 已知缺口：高对比度（HC）未适配
 *
 * 外壳**不做** `forced-colors` 分支：壁纸渐变、任务栏 / 移动应用栏的 Mica 近似底色、
 * 关闭占位卡片与其按钮都沿用明暗两套令牌，HC 下不会切换为 `Canvas` / `CanvasText`。
 * 组件库内的控件（`FluereButton` / `FluereNavigationView` / `FluereTabView` 等）各自
 * 已有 HC 分支，缺口只在外壳自绘的这几处。
 *
 * 这与排期一致（HC 复核属 docs/todo.md 的 0.9.5），按 AGENTS.md〈Definition of Done〉
 * 「HC 若暂不实现需注明」在此显式记录，**不要当成已适配**；0.9.5 落地时按同一处补齐。
 */

import { useMediaQuery } from '@fluere-vue/hooks'
import { acquireLayer } from '@fluere-vue/ui'
import { computed, nextTick, onMounted, onScopeDispose, ref, watch } from 'vue'
import { useDocsI18n } from '~/composables/use-docs-i18n'
import {
  SHELL_DEFAULT_TAB_ID,
  closeTab,
  closeWindow,
  containWindowOffset,
  createShellWindowState,
  maximize,
  minimize,
  openTab,
  reopenWindow,
  restore,
  selectTab,
} from '~/utils/shell-window-state'
import type {
  ShellTabId,
  ShellWindowBase,
  ShellWindowGeometry,
  ShellWindowOffset,
  ShellWindowState,
} from '~/utils/shell-window-state'
import DesktopWallpaper from './desktop-wallpaper.vue'
import ExplorerWindow from './explorer-window.vue'
import ShellTaskbar from './shell-taskbar.vue'

const { t } = useDocsI18n()

/** 窗口状态机（本组件是唯一写入方） */
const state = ref<ShellWindowState>(createShellWindowState())

/**
 * 桌面可视区尺寸（px）。
 *
 * 初值取构图变量的数值而非 0：SSR 直出时窗口必须有一个确定的尺寸与位置，
 * 否则首帧会塌成一条线再"跳"到正确大小（观感上是一次可见的布局抖动）。
 * 这个初值只在挂载前生效，`onMounted` 后立刻被真实视口替换 —— 且它**不参与**
 * 任何会渲染出不同 DOM 结构的分支（尺寸只影响内联 style 的数值），
 * 因此不会产生水合不匹配。
 */
const desktopWidth = ref(1600)
const desktopHeight = ref(1000)

/** 任务栏高度（px）。与 `--shellTaskbarHeight` 同源；读计算样式拿到真实值 */
const taskbarHeight = ref(48)

/** 桌面根节点（量可视区 + 定位参照） */
const rootRef = ref<HTMLElement | null>(null)

/**
 * 外壳在浮层层级栈里的句柄（挂载时登记 `--zIndexShell`，卸载时出栈）。
 * 类型不引 `FlyoutLayerHandle`（未从包入口导出），用 `acquireLayer` 的返回值推导。
 */
let shellLayer: ReturnType<typeof acquireLayer> | null = null

/** 桌面根的尺寸观察器（宿主 resize 的通用信号；能力探测失败时为 `null`，见 `onMounted`） */
let resizeObserver: ResizeObserver | null = null

/*
 * 下面两个 ref 指向的是**子组件实例**（模板 ref 落在组件上时拿到的是公开实例，
 * 不是 DOM 元素），因此必须经过 `$el` 取根节点。
 *
 * ⚠️ 这里踩过一次真 bug：`taskbarRef` 一度按 `HTMLElement` 声明并直接调用
 * `getBoundingClientRect()`，SSR 直出看起来完全正常（`measure()` 只在 `onMounted`
 * 里跑，服务端不执行），但浏览器一水合就抛
 * `TypeError: bar.getBoundingClientRect is not a function` ⇒ 整页被错误页替换。
 * **单测与 SSR 直出都发现不了这类问题** —— 这正是必须做真实浏览器实测的原因。
 * 取值统一用下面的 `elementOf()`，且每处都做 `instanceof` 守卫。
 */
const taskbarRef = ref<{ $el?: unknown } | null>(null)
const windowRef = ref<{ $el?: unknown } | null>(null)

/** 从「可能是组件实例」的 ref 里取出真实 DOM 元素（未挂载 / 多根时返回 null） */
const elementOf = (target: { $el?: unknown } | null | undefined): HTMLElement | null =>
  target?.$el instanceof HTMLElement ? target.$el : null

/**
 * 窗口实际尺寸（px）。
 *
 * **从 DOM 实测而不是重算一遍 CSS 的 `min(...)`**：尺寸公式的权威实现在
 * `explorer-window.vue` 的样式里（`min(基准值, 视口可用区)`）。若这里再写一份 TS
 * 版本，两处一旦漂移，拖拽收敛的边界就会与实际窗口对不上（用户能看到窗口被拖出
 * 桌面、或拖不到边）。实测天然同步。
 *
 * `null` = 尚未测量（SSR / 首帧），此时用 `fallbackWindowSize` 的公式兜底。
 */
const measuredWindowSize = ref<{ width: number; height: number } | null>(null)

/**
 * 窗口**静止位置**（桌面坐标系里的左上角，px）。
 *
 * 同样是实测的：静止位置写在 `explorer-window.vue` 的 CSS 里（水平居中 +
 * `inset-block-start: var(--shell-desktop-margin)`），`transform` 只叠加拖拽位移，
 * 因此 `rect - offset` 就是静止位置 —— 任何 CSS 侧的改动（改留白 / 改居中口径）
 * 都会自动反映到收敛边界上，不需要在 TS 里同步第二份公式。
 *
 * `null` = 尚未测量，此时不做任何收敛（首帧位移恒为 0，越界无从谈起）。
 */
const measuredWindowBase = ref<ShellWindowBase | null>(null)

/**
 * 「窗口顶端条带」高度（px）：从窗口上缘量到**标题栏下缘**。
 *
 * 收敛只保证这段条带始终可见（`containWindowOffset`），所以它是收敛公式的必需入参。
 * 量到标题栏下缘而不是标题栏自身的 `height`：`FluereAppWindow` 根有 1px 描边、
 * 标题栏在描边之内 ⇒ 按 `height`(32) 收敛会让标题栏下缘（caption 按钮那一行）
 * 压进任务栏 1px（真实浏览器实测：标题栏下缘 953 / 任务栏上缘 952）。
 *
 * 标题栏高度本身由 `FluereAppWindow` 按 `TitleBarCompactHeight`(32) /
 * `TitleBarExpandedHeight`(48) 决定（A 级 `TitleBar_themeresources.xaml` +
 * `TitleBar.cpp#UpdateHeight`），本外壳**不复制这两个档位**：0.5.7 起标题栏里没有任何
 * 站点 chrome ⇒ 当前恒为 compact，但将来放回控件（0.6+ 地址栏）就会变 48，
 * 复制常量必然漂移。
 *
 * `33`（1px 描边 + 32）只是挂载前的兜底：此刻窗口还没渲染，量不到，
 * 而拖拽只可能发生在挂载之后。
 */
const measuredTitleBarBottom = ref(33)

/**
 * 桌面档媒体查询：**只用于副作用**（退到移动档时复位位移），不参与渲染。
 * 阈值 64rem = 1024px，与 CSS 的 `lg:` 同值。
 */
const isDesktop = useMediaQuery('(min-width: 64rem)')

/** 窗口实际尺寸：与 `explorer-window.vue` 的 CSS `min(...)` 保持同一套算法 */
const WINDOW_MAX_WIDTH = 1120
const WINDOW_MAX_HEIGHT = 720
const DESKTOP_MARGIN = 24

/**
 * 窗口尺寸的**回退计算**（仅在 DOM 尚未测量时使用，例如 SSR 首帧）。
 *
 * 与 `explorer-window.vue` 样式里的 `min(...)` 同公式 —— 那份是权威实现，
 * 这里只是"量不到时的合理默认"。挂载后立刻改用实测值，见 `measure()`。
 */
const fallbackWindowSize = computed(() => ({
  width: Math.max(0, Math.min(WINDOW_MAX_WIDTH, desktopWidth.value - DESKTOP_MARGIN * 2)),
  height: Math.max(
    0,
    Math.min(WINDOW_MAX_HEIGHT, desktopHeight.value - taskbarHeight.value - DESKTOP_MARGIN * 2),
  ),
}))

/** 量可视区与任务栏实际高度（挂载后 + 视口变化时） */
const measure = (): void => {
  if (!import.meta.client) {
    return
  }
  const root = rootRef.value
  if (root) {
    desktopWidth.value = root.clientWidth
    desktopHeight.value = root.clientHeight
  }
  const bar = elementOf(taskbarRef.value)
  /*
   * 任务栏自 0.5.7 起在所有宽度常驻（移动档压缩而非隐藏），正常情况下实测高恒 > 0。
   * 保留 `measured > 0` 守卫：若消费方把 `--shellTaskbarHeight` 覆写为 0（隐藏任务栏），
   * 这里不把 0 写进缓存 —— 拖拽收敛的纵向边界不至于因此失去下界语义。
   * 若消费方覆写了 `--shellTaskbarHeight`，桌面档下的实测值会立刻反映出来。
   */
  if (bar) {
    const measured = bar.getBoundingClientRect().height
    if (measured > 0) {
      taskbarHeight.value = measured
    }
  }
  /*
   * 窗口尺寸实测。
   *
   * 只在**常规档**测量：最大化时窗口被 CSS 拉满（块高 = 100% - 任务栏），量到的
   * 是铺满尺寸而不是"常规窗口尺寸"；若把它缓存下来，还原后的拖拽边界就会按铺满
   * 尺寸算错。最小化时 `v-show` 使其 `display: none`，量到 0（`rect` 守卫会跳过），
   * 因此缓存也自然保留着上一次的有效常规尺寸。
   *
   * 取元素统一走 `elementOf()`（组件实例 → `$el`，见上面 ref 声明的警告）。
   */
  if (state.value.status !== 'normal' || state.value.maximized) {
    return
  }
  const frame = elementOf(windowRef.value)
  if (frame) {
    const rect = frame.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) {
      measuredWindowSize.value = { width: rect.width, height: rect.height }
      /*
       * 静止位置 = 实测矩形 − 当前位移（窗口的 `transform` 只叠加 `state.offset`）。
       * 减去桌面根自身的视口坐标，得到「桌面坐标系」；越界时 `rect` 依然是完整的
       * 变换后矩形（`getBoundingClientRect` 不受父级裁剪影响），所以越界状态下
       * 反推出来的基准位置同样正确 —— resize 收敛因此不需要先「摆正」窗口。
       */
      const rootRect = root?.getBoundingClientRect()
      measuredWindowBase.value = {
        x: rect.left - (rootRect?.left ?? 0) - state.value.offset.x,
        y: rect.top - (rootRect?.top ?? 0) - state.value.offset.y,
      }
    }
    /*
     * 顶端条带：从窗口上缘量到标题栏下缘（含 1px 描边，见 `measuredTitleBarBottom`）。
     * 两个 rect 都被同一个 `transform` 平移，差值不受拖拽位移影响。
     *
     * 选 `.fui-app-window__titlebar`（组件内置标题栏）：本外壳用的是内置标题栏，
     * 没有走 `#titlebar` 自定义插槽；量不到时保留上一次的有效值（初始 33）。
     */
    const titleBar = frame.querySelector('.fui-app-window__titlebar')
    const titleBarBottom = titleBar ? titleBar.getBoundingClientRect().bottom - rect.top : 0
    if (titleBarBottom > 0) {
      measuredTitleBarBottom.value = titleBarBottom
    }
  }
  /* 尺寸 / 基准位置都拿到之后，才谈得上收敛（见下方 `containOffset`） */
  containOffset()
}

/**
 * 收敛用的几何量（拖拽中与视口变化后共用同一份）。
 *
 * 未测量（SSR / 首帧）时 `base` 退回 `{ 0, 0 }`：此时 `measuredWindowBase` 尚未填上，
 * 而拖拽只可能发生在挂载之后（`measure()` 在 `onMounted` 第一帧就跑过），
 * 因此这个兜底值不会被真实的拖拽消费到。
 */
const windowGeometry = computed<ShellWindowGeometry>(() => ({
  windowSize: windowSize.value,
  desktopSize: { width: desktopWidth.value, height: desktopHeight.value },
  base: measuredWindowBase.value ?? { x: 0, y: 0 },
  taskbarHeight: taskbarHeight.value,
  titleBarBottom: measuredTitleBarBottom.value,
}))

/**
 * 把当前位移重新收敛到「标题栏可见」的范围（拖拽中的收敛在 `explorer-window.vue`）。
 *
 * **为什么视口变化后必须收敛**：拖拽允许窗口本体挂在桌面之外，一旦视口（外壳宿主）
 * 变小，原先合法的位移就可能把标题栏顶到工作区之外 —— 窗口在屏幕上彻底消失，
 * 而这是 Web 环境独有的风险（实机窗口位置由窗口管理器持有，显示器变化时系统会
 * 把窗口收回工作区）。收敛后标题栏必定仍在工作区内，用户永远能把窗口拖回来。
 *
 * 只在常规档且非最大化时收敛：最大化铺满、最小化/关闭时 `v-show` 隐藏，
 * 三者的位移语义各由状态机负责（最大化与关闭会归零位移）。
 *
 * 幂等：收敛过的位移再收敛不变（`containWindowOffset` 的区间包含），因此
 * 「量一次 → 写一次 state」不会自激成循环 —— 何况本函数读的是 DOM，
 * 写 state 只改内联 `transform`，不会反过来改变被观察的尺寸。
 */
const containOffset = (): void => {
  if (state.value.status !== 'normal' || state.value.maximized) {
    return
  }
  const current = state.value.offset
  const contained = containWindowOffset(current, windowGeometry.value)
  if (contained.x !== current.x || contained.y !== current.y) {
    state.value = { ...state.value, offset: contained }
  }
}

/** 传给窗口层的尺寸：优先实测值，未测量时用公式兜底 */
const windowSize = computed(() => measuredWindowSize.value ?? fallbackWindowSize.value)

onMounted(() => {
  measure()
  globalThis.addEventListener('resize', measure, { passive: true })
  /*
   * 宿主尺寸变化还有一条 `window.resize` 收不到的路径：**外壳所在元素**被外层改尺寸
   * （站点里常是布局容器 / 预览框变化，不改变视口）。桌面根锁的是 `100dvh`，正常情况下
   * 两者同步；但「窗口所在的视口宿主 resize」这件事的通用信号是 `ResizeObserver`，
   * 它同时覆盖视口变化与容器变化，且能在同一帧里量到新尺寸（避免窗口先被裁掉一帧）。
   *
   * `window.resize` 监听保留：能力探测失败（老浏览器 / jsdom）时它是唯一信号，
   * 而重复测量是幂等的（见 `containOffset`）。
   *
   * 只在 `onMounted` 建观察器：`ResizeObserver` 是浏览器专属 API，SSR 期间不存在
   * （docs/ssr-guide.md 的 Level 0 —— 浏览器 API 一律进生命周期，本处不需要在
   * `setup()` 期读值，因此不引 `@fluere-vue/utils` 的探测原语；`apps/docs` 也没有
   * 该包的 workspace 依赖，`typeof` 兜底只是给老浏览器留的退路）。
   */
  if (typeof globalThis.ResizeObserver === 'function' && rootRef.value) {
    resizeObserver = new globalThis.ResizeObserver(measure)
    resizeObserver.observe(rootRef.value)
  }
  /*
   * 外壳登记进**浮层层级栈**（0.5.7，explorer-layout.md §4 方案① 的正解）：
   * 任务栏是 `--zIndexShell`(1500) 档，而 `--zIndexTooltip`(1400) 低于它 —— 外壳内
   * 挂的 ToolTip 会被任务栏自己盖住（0.5.6 因此裁决「外壳内只用原生 title」）。
   * 让外壳作为一个「宿主层」入栈后，外壳内随后打开的浮层命中层级栈的**嵌套提升**
   * 分支：z = `calc(var(--zIndexShell) + var(--zIndexStep))` = 1510 > 1500，
   * 全程引用刻度、没有裸 z-index。
   *
   * 为什么不是覆写 `--fui-tooltip-z`：提示面的 z 由 `useFlyout` 以**内联样式**下发
   * （tooltip-fixture.vue 的 `:style="layerStyle"`），内联优先于样式表里的
   * `z-index: var(--fui-tooltip-z)` —— 覆写那个变量对打开态无效（已实测并回写文档）。
   *
   * 只在 `onMounted` 登记：层级栈是**模块级**状态，SSR 期间写入会污染并发渲染
   * （layer-stack.ts 顶部注释），首帧也不该带 inline z-index。
   */
  shellLayer = acquireLayer('--zIndexShell')
})

onScopeDispose(() => {
  if (import.meta.client) {
    globalThis.removeEventListener('resize', measure)
  }
  resizeObserver?.disconnect()
  resizeObserver = null
  shellLayer?.release()
  shellLayer = null
})

/*
 * 窗口尺寸会随「视口宽度」变（CSS 里是 `min(基准值, 视口可用区)`），
 * 而视口变化只有 `window.resize` / `ResizeObserver` 两个信号 —— 上面已接。
 * 但**状态切换**（最大化 / 还原）也会改变窗口尺寸，而它不触发 resize，
 * 因此这里补一个 watch：还原后重新测量，让下一次拖拽用新的边界。
 */
watch(
  () => [state.value.status, state.value.maximized] as const,
  () => {
    // 等 DOM 应用完 `is-maximized` 的样式再量（下一帧）
    void nextTick().then(measure)
  },
)

/**
 * 退到移动档时复位窗口位移。
 *
 * 移动档是「全屏无边框」形态（`explorer-window.vue` 的 `@media (max-width: 63.999rem)`），
 * 残留的拖拽位移会把内容推出屏幕；而移动档的标题栏也不再承担桌面窗口的拖拽语义，
 * 因此直接归零是安全的。
 *
 * 注意这一步**只改数据、不改渲染结构**（位移只影响内联 style 的数值），
 * 所以不会在水合阶段产生结构差异。
 */
watch(isDesktop, (desktop) => {
  if (!desktop) {
    state.value = { ...state.value, offset: { x: 0, y: 0 } }
  }
})

/* ------------------------------------------------------------------ */
/* 状态变更（唯一写入路径都在这里，子组件只抛意图）                       */
/* ------------------------------------------------------------------ */

const onMinimize = (): void => {
  state.value = minimize(state.value)
}

/**
 * 最大化 / 还原。
 *
 * `FluereAppWindow` 的 caption 在最大化 / 还原时**同时**抛 `update:maximized` 与
 * `maximize` / `restore`（见 caption-buttons.vue `onMaximizeRestore`）。本外壳只接
 * `v-model:maximized`，语义事件一律不接 —— 否则一次点击会改两次状态。
 */
const onUpdateMaximized = (value: boolean): void => {
  state.value = value ? maximize(state.value) : restore(state.value)
}

const onClose = (): void => {
  state.value = closeWindow(state.value)
}

/** 任务栏入口：显示中 → 最小化；已收起 → 还原（与实机任务栏的切换语义一致） */
const onToggleWindow = (): void => {
  state.value = state.value.status === 'normal' ? minimize(state.value) : reopenWindow(state.value)
}

/** 关闭占位卡片的「重新打开」 */
const onReopen = (): void => {
  state.value = reopenWindow(state.value)
}

const onUpdateOffset = (offset: ShellWindowOffset): void => {
  state.value = { ...state.value, offset }
}

const onOpenTab = (tab: ShellTabId): void => {
  state.value = openTab(state.value, tab)
}

const onCloseTab = (tab: ShellTabId): void => {
  state.value = closeTab(state.value, tab)
}

const onSelectTab = (tab: ShellTabId): void => {
  state.value = selectTab(state.value, tab)
}

/**
 * 从任务栏（固定入口 / 开始菜单条目）打开标签。
 *
 * 与窗口内导航的 `openTab` 不同，这条路径还承担**还原窗口**：用户完全可能在
 * 窗口已最小化 / 已关闭时点固定入口（实机任务栏点固定应用 = 把它弄到前台）。
 * `reopenWindow` 只复位 status（保留 openTabs / maximized 之外的形态语义由状态机
 * 各自负责），`openTab` 幂等选中标签。
 */
const onOpenTabFromShell = (tab: ShellTabId): void => {
  state.value = reopenWindow(openTab(state.value, tab))
}

/** 新建标签：当前只提供「回到首页视图」这一个有意义的去处（真实新建属 0.6+ 的地址栏） */
const onAddTab = (): void => {
  state.value = openTab(state.value, SHELL_DEFAULT_TAB_ID)
}

/** 窗口是否应当渲染（最小化 / 关闭时隐藏，但保留在 DOM 外的方式见模板 `v-show` 注释） */
const isWindowVisible = computed(() => state.value.status === 'normal')

/** 关闭占位是否显示 */
const isClosableVisible = computed(() => state.value.status === 'closed')
</script>

<template>
  <!--
    桌面根：锁定视口高度 + 关闭文档级滚动（explorer-layout.md §2）。
    高度用 dvh 优先 / vh 回退 —— 与 layouts/components.vue 的既有写法一致
    （移动端地址栏收放会改变可见视口高度）。

    `is-desktop` 由 CSS 断点驱动（lg: = 1024px），**不是** useMediaQuery 的结果，
    因此 SSR 与水合结构一致。移动档整屏降级为「无边框窗口 + 页面滚动」。
  -->
  <div
    ref="rootRef"
    class="docs-shell-desktop"
    :aria-label="t('shell.desktopLabel')"
  >
    <DesktopWallpaper />

    <!--
      窗口层：`--zIndexWindow`(0) 档 —— 落在壁纸之上、任务栏之下。
      包装层承担层级（窗口本体由 explorer-window.vue 内部定位）。

      `v-show` 而非 `v-if`：最小化后再次还原时，窗口内部的导航面板开合状态、
      标签选择与滚动位置都不该被重置（实机最小化也不会丢窗口内部状态）。
      v-show 只是 `display: none`，DOM 与组件状态完整保留。
    -->
    <div
      v-show="isWindowVisible"
      class="docs-shell-desktop__window-layer"
    >
      <ExplorerWindow
        ref="windowRef"
        :state="state"
        :geometry="windowGeometry"
        @update:offset="onUpdateOffset"
        @update:maximized="onUpdateMaximized"
        @minimize="onMinimize"
        @close="onClose"
        @open-tab="onOpenTab"
        @close-tab="onCloseTab"
        @select-tab="onSelectTab"
        @add-tab="onAddTab"
      />
    </div>

    <!--
      关闭占位：窗口关闭后给一个**可恢复**的落点，而不是让它彻底消失
      （docs/todo.md 0.5.2「『关闭』不伪装成坏按钮」）。与窗口层同档、互斥显示，
      因此不需要额外的层级刻度。
    -->
    <div
      v-if="isClosableVisible"
      class="docs-shell-desktop__placeholder"
      role="status"
    >
      <p class="docs-shell-desktop__placeholder-text">{{ t('shell.closed.hint') }}</p>
      <button
        type="button"
        class="docs-shell-desktop__placeholder-action"
        @click="onReopen"
      >
        {{ t('shell.closed.action') }}
      </button>
    </div>

    <!--
      任务栏：**全宽度常驻**（0.5.7 起），移动档换压缩布局（开始常驻 / 箭头滚动 /
      托盘保时间），切换全部由 shell-taskbar.vue 内的 CSS 断点承担。
      这里始终渲染、绝不按视口 `v-if` —— 视口判据在 SSR 下拿不到真实值，
      用 `v-if` 会让服务端与客户端渲染出不同的 DOM 结构 ⇒ 水合不匹配。
      `active-tab`：固定入口的激活指示条（当前视图是否在显示）。
      `open-tab`：固定入口与开始菜单条目 —— 走「还原窗口 + 打开标签」的统一路径。
    -->
    <ShellTaskbar
      ref="taskbarRef"
      :status="state.status"
      :active-tab="state.activeTab"
      @toggle-window="onToggleWindow"
      @open-tab="onOpenTabFromShell"
    />
  </div>
</template>

<style scoped>
/* ------------------------------------------------------------------ */
/* 视觉值一律引用 token 或 --shell-* 局部变量。                          */
/* 层级只引用 --zIndex* 刻度（外壳侧同受该约定约束，见 explorer-layout §7） */
/* ------------------------------------------------------------------ */

.docs-shell-desktop {
  /*
   * 视口锁定：桌面层自身不滚动（滚动在窗口内容区内部，见 explorer-layout.md §2）。
   * dvh 优先 / vh 回退，与 layouts/components.vue 的 .docs-shell 同一手法。
   */
  block-size: 100vh;
  block-size: 100dvh;
  position: relative;
  overflow: hidden;

  background-color: var(--micaBackgroundFillColorBase);
  color: var(--colorNeutralForeground1);
  font-family: var(--fontFamilyBase);
}

/*
 * 窗口层：`--zIndexWindow` = 0。
 *
 * 显式写 0 而不是省略 `z-index`：窗口层与任务栏层是**兄弟**，任务栏靠 1500 取胜没问题；
 * 但窗口层与「关闭占位卡片」也互为兄弟且互斥，显式 0 能让「谁在这档」这件事在源码里
 * 一眼可见（也便于契约测试扫描）。
 */
.docs-shell-desktop__window-layer {
  position: absolute;
  inset: 0;
  z-index: var(--zIndexWindow);
}

/*
 * 关闭占位卡片。
 *
 * 位置：桌面中央、任务栏之上留出任务栏高度 —— 与窗口的常规落位同一构图。
 * 这是**应用层构图**（无 WinUI 来源），故尺寸走构图变量而非令牌。
 */
.docs-shell-desktop__placeholder {
  position: absolute;
  inset-block-end: var(--shell-taskbar-h);
  inset-block-start: 0;
  inset-inline: 0;
  z-index: var(--zIndexWindow);

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacingVerticalL);
}

.docs-shell-desktop__placeholder-text {
  margin: 0;
  color: var(--colorNeutralForeground2);
  font-size: var(--fontSizeBase300);
  line-height: var(--lineHeightBase300);
}

/*
 * 「重新打开」按钮：这里刻意用原生 `<button>` 而不是 `FluereButton`。
 *
 * 理由：`FluereButton` 的根自带 scoped 样式（display / 尺寸），本处的视觉是
 * 「桌面中央的单一行动点」，形态与库内按钮档位都不同（更像一个强调文本链接）。
 * 手写时值一律走令牌（用 `colorBrandForegroundLink` 三态），不引入新色值。
 */
.docs-shell-desktop__placeholder-action {
  padding: var(--spacingVerticalS) var(--spacingHorizontalL);
  border: var(--strokeWidthThin) solid var(--colorNeutralStroke2);
  border-radius: var(--borderRadiusMedium);
  background-color: var(--cardBackgroundFillColorDefault);
  color: var(--colorBrandForegroundLink);
  font-family: inherit;
  font-size: var(--fontSizeBase300);
  line-height: var(--lineHeightBase300);
  cursor: pointer;
  transition-property: color, background-color, border-color;
  transition-duration: var(--durationFaster);
  transition-timing-function: var(--curveEasyEase);
}

.docs-shell-desktop__placeholder-action:hover {
  color: var(--colorBrandForegroundLinkHover);
  border-color: var(--colorNeutralStroke1);
}

.docs-shell-desktop__placeholder-action:active {
  color: var(--colorBrandForegroundLinkPressed);
}

/*
 * 焦点环：复用组件库的双层焦点矩形口径（外 2px + 内 1px，见 0.4.3 useFocusVisual）。
 * 这里是应用层的一次性补偿 —— 手写按钮拿不到 `useFocusVisual` 的类，因此按同样的
 * token 表达：外描边 `colorStrokeFocus2`(外) / `colorStrokeFocus1`(内)。
 */
.docs-shell-desktop__placeholder-action:focus-visible {
  outline: var(--strokeWidthThick) solid var(--colorStrokeFocus2);
  outline-offset: var(--spacingHorizontalXXS);
}

/* 减少动效偏好：色彩过渡停用（保留 hover / pressed / focus 的静态形态差异） */
@media (prefers-reduced-motion: reduce) {
  .docs-shell-desktop__placeholder-action {
    transition: none;
  }
}

/*
 * 移动端降级：不仿桌面（apps/docs/README.md〈WindowsOS 仿真边界〉）。
 *
 * 断点 64rem = 1024px，与 explorer-window.vue 的 `lg:` 前缀、
 * `useMediaQuery('(min-width: 64rem)')` 三处同值。
 *
 * ⚠️ **这里与 explorer-layout.md §2〈降级〉的「页面滚动」有一处已记录的偏离**：
 * 该段写的是「全屏无边框窗口 + 页面滚动，窗口内容不再单独滚动」。实际实现保持
 * **窗口内滚动**（桌面根继续锁视口），原因是一条硬约束：
 * `FluereScrollView` 的 presenter 是绝对定位，宿主**必须有确定高度**才滚得动
 * （见 packages/ui/src/scrollview 与 layouts/components.vue 的同款注释）；
 * 若移动档改为页面滚动，就要把内容渲染器换成非 ScrollView 的实现 —— 那会让
 * 服务端与客户端渲染出不同的 DOM 结构（水合不匹配），除非再做一层同构的
 * 高度测量，收益不抵复杂度。
 *
 * 用户可见结果一致（都能滚动看到全部内容），且 0.5.0 的验收要点
 * 「移动端不溢出不重叠 / 降级为全屏无边框」完全满足。该偏离已回写
 * docs/design/explorer-layout.md §2 的降级段。
 *
 * 0.5.7 补记：**任务栏不再在移动档隐藏**（评审改口径：压缩常驻 —— 开始按钮常驻、
 * 中间箭头滚动、托盘保时间）。因此本文件在该断点下没有任何需要隐藏的层，
 * 只剩 explorer-window.vue 给窗口让出任务栏高度这一处联动；窗口降级形态不变。
 */
</style>
