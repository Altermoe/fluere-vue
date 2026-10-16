<script setup lang="ts">
/**
 * 桌面外壳（0.5.5 `DesktopShell`）—— `/os` 路由的根组件，0.5.9 起是**窗口管理器宿主**。
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
 * ├─ 窗口层                      z-index: var(--zIndexWindow)  ← 0
 * │  └─ ShellWindowHost × N      每扇应用窗口（宿主包装：位置 / 层级 / 拖拽 / 焦点）
 * │     └─ UI Gallery / Render Lab（内容）
 * └─ ShellTaskbar               z-index: var(--zIndexShell)   ← 1500（贴底固定）
 *     ├─ ShellStartMenu          开始按钮 + 开始菜单面板（--zIndexStartMenu 档）
 *     ├─ 中间图标区               应用入口（SHELL_APPS）+ GitHub；可横向滚动（箭头驱动）
 *     └─ 系统托盘                 时钟 + 内联控件 / 展开菜单（窄档压缩）
 * ```
 *
 * ## 多窗口：层级 + 焦点（0.5.9）
 *
 * 状态是 `ShellWindowManagerState`（`utils/shell-window-state.ts`，纯函数）：
 * **按应用分桶的窗口状态 + z 序 + 焦点**。本组件是唯一写入方（单向向下、事件向上），
 * 共享范围只有外壳这一棵子树，因此用「持有 state + props 向下 + 事件向上」而不是全局 store
 * —— 与组件库既有的受控 / 非受控口径一致（AGENTS.md〈交互与弹层组件约定〉）。
 *
 * 本期只做**层级管理 + 焦点切换**：点窗口内部 ⇒ 置顶 + 聚焦；任务栏 / 开始菜单入口 ⇒
 * 打开（还原）+ 置顶 + 聚焦，点焦点应用入口 ⇒ 最小化。**不做**边缘吸附 / 贴边顶满 /
 * Snap / 任务视图 / Alt+Tab（口径与来源见 explorer-layout.md §8）。
 *
 * 窗口的 z 值由 `windowZIndex()` 生成内联表达式
 * （`calc(var(--zIndexWindow) + N * var(--zIndexStep))`，全程引用刻度、无裸值）。
 *
 * 窗口的 **DOM 顺序固定为注册表顺序**（`SHELL_APPS`），层级只由 `z-index` 表达 ——
 * 不用 `v-for` 遍历 z 序，因为那样每次聚焦都会移动 DOM 节点；而 Render Lab 的 canvas
 * 一旦被搬动就可能丢上下文（WebGL 的标准行为是「从文档移除」才丢，但没必要冒这个险）。
 *
 * ## 窗口几何一律**实测**（多窗口后逐窗口一份）
 *
 * 窗口尺寸 / 静止位置 / 标题栏下缘都写在 CSS 里（`min(基准值, 视口可用区)` + 居中 +
 * 应用档位错开 + `--shell-desktop-margin`）。若在 TS 里再推导一份公式，两处一旦漂移，
 * 拖拽收敛的边界就会与实际窗口对不上。`measure()` 因此遍历窗口层内的
 * `[data-shell-window]`，按 `data-app-id` 记录每个窗口的实测值，`rect - offset`
 * 反推静止位置（`getBoundingClientRect` 不受父级裁剪影响，越界时同样正确）。
 *
 * ## 桌面 / 移动端切换**不用 `useMediaQuery` 参与渲染**
 *
 * 视觉分支全部交给 CSS 断点（`lg:` 前缀 = 64rem = 1024px，与 explorer-layout.md §2
 * 的降级判据、docs-sidebar.vue 的桌面常驻栏判据同阈值）。`useMediaQuery` 只在 `watch`
 * 里做副作用：退到移动档时**遍历所有应用**复位窗口位移
 * （移动档窗口铺满可视区，残留位移会把内容推出屏幕）。
 *
 * ⚠️ `docs-shell.css` 里那条移动档 `transform: none` 已删除：位移是内联 `transform`
 * （`shell-window-host.vue` 的 `:style`），内联样式永远压过样式表 —— 那条规则是死代码，
 * 真正生效的是这里的 JS 归零（与 0.5.5 的注释口径不同，已一并更正）。
 *
 * ## SSR：本组件处于 `ClientOnly` 边界之内（0.5.9 起）
 *
 * 挂载点是 `pages/os/index.vue` 的 `<ClientOnly>`，原则写在 docs/ssr-guide.md
 * 〈文档站桌面仿真的 ClientOnly 边界〉：**外壳内部不做 SSR 检查**（不再有
 * `import.meta.client` 判空、`ResizeObserver` 能力探测兜底这类死重），组件库不受此豁免。
 * 代价是 `/os` 的预渲染产物只有一块占位（`#fallback`），SEO head 仍由 `useSeoMeta` 直出。
 *
 * ## 已知缺口：高对比度（HC）未适配
 *
 * 外壳**不做** `forced-colors` 分支：壁纸渐变、任务栏 / 移动应用栏的 Mica 近似底色
 * 都沿用明暗两套令牌，HC 下不会切换为 `Canvas` / `CanvasText`。
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
import { SHELL_APP_IDS, SHELL_APPS, SHELL_DEFAULT_APP_ID } from '~/utils/shell-apps'
import type { ShellAppId } from '~/utils/shell-apps'
import {
  SHELL_DEFAULT_TAB_ID,
  activateApp,
  closeApp,
  closeTabInApp,
  containWindowOffset,
  createWindowManagerState,
  focusApp,
  maximizeApp,
  minimizeApp,
  openTabInApp,
  restoreApp,
  selectTabInApp,
  setAppOffset,
  toggleAppFromShell,
  windowOf,
  windowZIndex,
} from '~/utils/shell-window-state'
import type {
  ShellTabId,
  ShellWindowBase,
  ShellWindowGeometry,
  ShellWindowOffset,
  ShellWindowSize,
  ShellWindowStatus,
} from '~/utils/shell-window-state'
import DesktopWallpaper from './desktop-wallpaper.vue'
import ShellTaskbar from './shell-taskbar.vue'
import ShellWindowHost from './shell-window-host.vue'

const { t } = useDocsI18n()

/** 窗口管理器状态（本组件是唯一写入方） */
const state = ref(createWindowManagerState(SHELL_APP_IDS, SHELL_DEFAULT_APP_ID))

/**
 * 桌面可视区尺寸（px）。
 *
 * 初值取构图变量的数值而非 0：首帧窗口必须有一个确定的尺寸与位置，否则会塌成一条线
 * 再"跳"到正确大小。这个初值只在挂载前生效，`onMounted` 后立刻被真实视口替换。
 */
const desktopWidth = ref(1600)
const desktopHeight = ref(1000)

/** 任务栏高度（px）。与 `--shellTaskbarHeight` 同源；读计算样式拿到真实值 */
const taskbarHeight = ref(48)

/** 桌面根节点（量可视区 + 定位参照） */
const rootRef = ref<HTMLElement | null>(null)

/** 窗口层容器（`measure()` 在它内部按 `[data-shell-window]` 找每扇窗口） */
const windowLayerRef = ref<HTMLElement | null>(null)

/**
 * 外壳在浮层层级栈里的句柄（挂载时登记 `--zIndexShell`，卸载时出栈）。
 * 类型不引 `FlyoutLayerHandle`（未从包入口导出），用 `acquireLayer` 的返回值推导。
 */
let shellLayer: ReturnType<typeof acquireLayer> | null = null

/** 桌面根的尺寸观察器（宿主 resize 的通用信号） */
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

/** 从「可能是组件实例」的 ref 里取出真实 DOM 元素（未挂载 / 多根时返回 null） */
const elementOf = (target: { $el?: unknown } | null | undefined): HTMLElement | null =>
  target?.$el instanceof HTMLElement ? target.$el : null

/** 一个窗口的实测几何（尺寸 / 静止位置 / 顶端条带） */
interface ShellWindowMeasurement {
  /** 常规档实测尺寸（最大化 / 最小化期间**不更新**，理由见 `measure()`） */
  size: ShellWindowSize
  /** 静止位置：`rect − offset`（桌面坐标系） */
  base: ShellWindowBase
  /** 顶端条带：窗口上缘 → 标题栏下缘（含 1px 描边） */
  titleBarBottom: number
}

/**
 * 逐窗口实测缓存（**响应式**：它会作为 `geometry` prop 下发给窗口宿主，
 * 拖拽收敛在事件回调里读最新的 prop —— 若用非响应式容器，测量后的新值要等下一次
 * 无关重渲染才会到达宿主，拖拽边界就会用上一轮的旧值）。
 *
 * 只在常规档且非最大化时写入（理由见 `measure()`），因此写入频率很低。
 */
const measurements = ref<Record<string, ShellWindowMeasurement | undefined>>({})

/** 窗口尺寸上限与桌面留白（与 `docs-shell.css` 的 `--shell-window-*` / `--shell-desktop-margin` 同值） */
const WINDOW_MAX_WIDTH = 1120
const WINDOW_MAX_HEIGHT = 720
const DESKTOP_MARGIN = 24

/**
 * 顶端条带的挂载前兜底值：`1px 描边 + 32（compact 标题栏）`。
 *
 * 量到标题栏下缘而不是标题栏自身的 `height`：`FluereAppWindow` 根有 1px 描边、
 * 标题栏在描边之内 ⇒ 按 `height`(32) 收敛会让标题栏下缘（caption 按钮那一行）
 * 压进任务栏 1px（真实浏览器实测：标题栏下缘 953 / 任务栏上缘 952）。
 *
 * 标题栏高度本身由 `FluereAppWindow` 按 `TitleBarCompactHeight`(32) /
 * `TitleBarExpandedHeight`(48) 决定（A 级 `TitleBar_themeresources.xaml` +
 * `TitleBar.cpp#UpdateHeight`），本外壳**不复制这两个档位**：当前恒为 compact，
 * 但将来放回控件（0.6+ 地址栏）就会变 48，复制常量必然漂移。
 */
const FALLBACK_TITLE_BAR_BOTTOM = 33

/**
 * 窗口尺寸的**回退计算**（仅在 DOM 尚未测量时使用，例如挂载首帧）。
 *
 * 与 `docs-shell.css` 的 `min(...)` 同公式 —— 那份是权威实现，
 * 这里只是"量不到时的合理默认"。挂载后立刻改用实测值，见 `measure()`。
 */
const fallbackWindowSize = computed<ShellWindowSize>(() => ({
  width: Math.max(0, Math.min(WINDOW_MAX_WIDTH, desktopWidth.value - DESKTOP_MARGIN * 2)),
  height: Math.max(
    0,
    Math.min(WINDOW_MAX_HEIGHT, desktopHeight.value - taskbarHeight.value - DESKTOP_MARGIN * 2),
  ),
}))

/** 某窗口的尺寸：优先实测值，未测量时用公式兜底 */
const windowSizeOf = (appId: ShellAppId): ShellWindowSize =>
  measurements.value[appId]?.size ?? fallbackWindowSize.value

/** 某窗口的收敛几何量（喂给 `ShellWindowHost` 的 `geometry` prop） */
const windowGeometryOf = (appId: ShellAppId): ShellWindowGeometry => ({
  windowSize: windowSizeOf(appId),
  desktopSize: { width: desktopWidth.value, height: desktopHeight.value },
  base: measurements.value[appId]?.base ?? { x: 0, y: 0 },
  taskbarHeight: taskbarHeight.value,
  titleBarBottom: measurements.value[appId]?.titleBarBottom ?? FALLBACK_TITLE_BAR_BOTTOM,
})

/**
 * 量可视区、任务栏与**每一扇窗口**（挂载后 + 视口变化时）。
 *
 * 窗口只在**常规档**测量：最大化时窗口被 CSS 拉满（块高 = 100% - 任务栏），量到的是
 * 铺满尺寸而不是"常规窗口尺寸"；若把它缓存下来，还原后的拖拽边界就会按铺满尺寸算错。
 * 最小化 / 关闭时 `v-show` 使其 `display: none`，量到 0（守卫会跳过），
 * 因此缓存也自然保留着上一次的有效常规尺寸。
 */
const measure = (): void => {
  const root = rootRef.value
  if (root) {
    desktopWidth.value = root.clientWidth
    desktopHeight.value = root.clientHeight
  }
  const bar = elementOf(taskbarRef.value)
  /*
   * 任务栏自 0.5.7 起在所有宽度常驻，正常情况下实测高恒 > 0。
   * 保留 `measured > 0` 守卫：若消费方把 `--shellTaskbarHeight` 覆写为 0（隐藏任务栏），
   * 这里不把 0 写进缓存 —— 拖拽收敛的纵向边界不至于因此失去下界语义。
   */
  if (bar) {
    const measured = bar.getBoundingClientRect().height
    if (measured > 0) {
      taskbarHeight.value = measured
    }
  }

  const layer = windowLayerRef.value
  if (layer) {
    const rootRect = root?.getBoundingClientRect()
    /* 一次测量产出一份新表（响应式替换，见 `measurements` 的注释） */
    const next: Record<string, ShellWindowMeasurement | undefined> = { ...measurements.value }
    for (const element of layer.querySelectorAll<HTMLElement>('[data-shell-window]')) {
      const appId = element.dataset.appId as ShellAppId | undefined
      if (!appId) {
        continue
      }
      const windowState = windowOf(state.value, appId)
      if (windowState.status !== 'normal' || windowState.maximized) {
        continue
      }
      const rect = element.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) {
        continue
      }
      const titleBar = element.querySelector('.fui-app-window__titlebar')
      const titleBarBottom = titleBar ? titleBar.getBoundingClientRect().bottom - rect.top : 0
      next[appId] = {
        size: { width: rect.width, height: rect.height },
        /*
         * 静止位置 = 实测矩形 − 当前位移（窗口的 `transform` 只叠加 `state.offset`）。
         * 减去桌面根自身的视口坐标，得到「桌面坐标系」；越界时 `rect` 依然是完整的
         * 变换后矩形（`getBoundingClientRect` 不受父级裁剪影响），所以越界状态下
         * 反推出来的基准位置同样正确 —— resize 收敛因此不需要先「摆正」窗口。
         */
        base: {
          x: rect.left - (rootRect?.left ?? 0) - windowState.offset.x,
          y: rect.top - (rootRect?.top ?? 0) - windowState.offset.y,
        },
        titleBarBottom:
          titleBarBottom > 0
            ? titleBarBottom
            : (next[appId]?.titleBarBottom ?? FALLBACK_TITLE_BAR_BOTTOM),
      }
    }
    measurements.value = next
  }
  /* 尺寸 / 基准位置都拿到之后，才谈得上收敛（见下方 `containAllOffsets`） */
  containAllOffsets()
}

/**
 * 把所有常规档窗口的位移重新收敛到「标题栏可见」的范围。
 *
 * **为什么视口变化后必须收敛**：拖拽允许窗口本体挂在桌面之外，一旦视口（外壳宿主）
 * 变小，原先合法的位移就可能把标题栏顶到工作区之外 —— 窗口在屏幕上彻底消失，
 * 而这是 Web 环境独有的风险（实机窗口位置由窗口管理器持有，显示器变化时系统会
 * 把窗口收回工作区）。收敛后标题栏必定仍在工作区内，用户永远能把窗口拖回来。
 *
 * 只处理常规档且非最大化的窗口；幂等：收敛过的位移再收敛不变（区间包含），
 * 因此「量一次 → 写一次 state」不会自激成循环。
 */
const containAllOffsets = (): void => {
  for (const appId of SHELL_APP_IDS) {
    const windowState = windowOf(state.value, appId)
    if (windowState.status !== 'normal' || windowState.maximized) {
      continue
    }
    const contained = containWindowOffset(windowState.offset, windowGeometryOf(appId))
    if (contained.x !== windowState.offset.x || contained.y !== windowState.offset.y) {
      state.value = setAppOffset(state.value, appId, contained)
    }
  }
}

onMounted(() => {
  measure()
  globalThis.addEventListener('resize', measure, { passive: true })
  /*
   * 宿主尺寸变化还有一条 `window.resize` 收不到的路径：**外壳所在元素**被外层改尺寸
   * （站点里常是布局容器 / 预览框变化，不改变视口）。桌面根锁的是 `100dvh`，正常情况下
   * 两者同步；但「窗口所在的视口宿主 resize」这件事的通用信号是 `ResizeObserver`，
   * 它同时覆盖视口变化与容器变化，且能在同一帧里量到新尺寸（避免窗口先被裁掉一帧）。
   * 重复测量是幂等的（见 `containAllOffsets`）。
   *
   * ClientOnly 边界之内，直接建观察器即可（不再需要能力探测兜底）。
   */
  if (rootRef.value) {
    resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(rootRef.value)
  }
  /*
   * 外壳登记进**浮层层级栈**（0.5.7，explorer-layout.md §4 方案① 的正解）：
   * 任务栏是 `--zIndexShell`(1500) 档，而 `--zIndexTooltip`(1400) 低于它 —— 外壳内
   * 挂的 ToolTip 会被任务栏自己盖住。让外壳作为一个「宿主层」入栈后，外壳内随后打开的
   * 浮层命中层级栈的**嵌套提升**分支：z = `calc(var(--zIndexShell) + var(--zIndexStep))`
   * = 1510 > 1500，全程引用刻度、没有裸 z-index。
   *
   * 为什么不是覆写 `--fui-tooltip-z`：提示面的 z 由 `useFlyout` 以**内联样式**下发
   * （tooltip-fixture.vue 的 `:style="layerStyle"`），内联优先于样式表里的
   * `z-index: var(--fui-tooltip-z)` —— 覆写那个变量对打开态无效（已实测并回写文档）。
   */
  shellLayer = acquireLayer('--zIndexShell')
})

onScopeDispose(() => {
  globalThis.removeEventListener('resize', measure)
  resizeObserver?.disconnect()
  resizeObserver = null
  shellLayer?.release()
  shellLayer = null
})

/*
 * 窗口尺寸会随「视口宽度」变（CSS 里是 `min(基准值, 视口可用区)`），而视口变化只有
 * `window.resize` / `ResizeObserver` 两个信号 —— 上面已接。但**状态切换**
 * （最大化 / 还原 / 最小化还原）也会改变窗口尺寸，而它不触发 resize，
 * 因此这里补一个 watch：等 DOM 应用完 `is-maximized` 的样式再重新测量（下一帧），
 * 让下一次拖拽用新的边界。
 *
 * watch 的源用**拼接签名**而不是数组：数组 getter 每次都产生新引用 ⇒ 拖拽写位移
 * （同一批响应式依赖）也会触发回调，于是每一帧都重测一遍。签名字符串只在
 * 「档位 / 最大化」真的变化时才变。
 */
const windowLayoutSignature = computed(() =>
  SHELL_APP_IDS.map((appId) => {
    const windowState = windowOf(state.value, appId)
    return `${appId}:${windowState.status}:${windowState.maximized}`
  }).join('|'),
)

watch(windowLayoutSignature, () => {
  void nextTick().then(measure)
})

/**
 * 退到移动档时复位**所有**窗口的位移。
 *
 * 移动档是「全屏无边框」形态（`docs-shell.css` 的 `@media (max-width: 63.999rem)`），
 * 残留的拖拽位移会把内容推出屏幕；而移动档的标题栏也不再承担桌面窗口的拖拽语义，
 * 因此直接归零是安全的。只改数据、不改渲染结构。
 */
const isDesktop = useMediaQuery('(min-width: 64rem)')
watch(isDesktop, (desktop) => {
  if (!desktop) {
    for (const appId of SHELL_APP_IDS) {
      state.value = setAppOffset(state.value, appId, { x: 0, y: 0 })
    }
  }
})

/* ------------------------------------------------------------------ */
/* 状态变更（唯一写入路径都在这里，子组件只抛意图）                       */
/* ------------------------------------------------------------------ */

/** 窗口内部按下：置顶 + 聚焦 */
const onFocus = (appId: ShellAppId): void => {
  state.value = focusApp(state.value, appId)
}

/**
 * 最大化 / 还原。
 *
 * `FluereAppWindow` 的 caption 在最大化 / 还原时**同时**抛 `update:maximized` 与
 * `maximize` / `restore`（见 caption-buttons.vue `onMaximizeRestore`）。本外壳只接
 * `v-model:maximized`，语义事件一律不接 —— 否则一次点击会改两次状态。
 */
const onUpdateMaximized = (appId: ShellAppId, value: boolean): void => {
  state.value = value ? maximizeApp(state.value, appId) : restoreApp(state.value, appId)
}

const onMinimize = (appId: ShellAppId): void => {
  state.value = minimizeApp(state.value, appId)
}

const onClose = (appId: ShellAppId): void => {
  state.value = closeApp(state.value, appId)
}

const onUpdateOffset = (appId: ShellAppId, offset: ShellWindowOffset): void => {
  state.value = setAppOffset(state.value, appId, offset)
}

const onOpenTab = (appId: ShellAppId, tab: ShellTabId): void => {
  state.value = openTabInApp(state.value, appId, tab)
}

const onCloseTab = (appId: ShellAppId, tab: ShellTabId): void => {
  state.value = closeTabInApp(state.value, appId, tab)
}

const onSelectTab = (appId: ShellAppId, tab: ShellTabId): void => {
  state.value = selectTabInApp(state.value, appId, tab)
}

/**
 * 新建标签：当前只提供「回到首页视图」这一个有意义的去处（真实新建属 0.6+ 的地址栏）。
 * 默认标签 id 归 UI Gallery 应用（`ShellTabId` 是纯字符串，窗口管理器不校验语义）。
 */
const onAddTab = (appId: ShellAppId): void => {
  state.value = openTabInApp(state.value, appId, SHELL_DEFAULT_TAB_ID)
}

/**
 * 任务栏 / 开始菜单入口：**切换**语义（与实机一致）。
 * 焦点应用且窗口在显示 ⇒ 最小化；其余（最小化 / 已关闭 / 非焦点）⇒ 激活
 * （还原或重新打开 + 置顶 + 聚焦）。
 */
const onActivateApp = (appId: ShellAppId): void => {
  state.value = toggleAppFromShell(state.value, appId)
}

/** 任务栏要的每应用窗口档位（最小投影：任务栏不关心标签 / 位移 / 最大化） */
const windowStatuses = computed<Record<ShellAppId, ShellWindowStatus>>(() => {
  const statuses = {} as Record<ShellAppId, ShellWindowStatus>
  for (const appId of SHELL_APP_IDS) {
    statuses[appId] = windowOf(state.value, appId).status
  }
  return statuses
})
</script>

<template>
  <!--
    桌面根：锁定视口高度 + 关闭文档级滚动（explorer-layout.md §2）。
    高度用 dvh 优先 / vh 回退 —— 与 layouts/components.vue 的既有写法一致
    （移动端地址栏收放会改变可见视口高度）。
  -->
  <div
    ref="rootRef"
    class="docs-shell-desktop"
    :aria-label="t('shell.desktopLabel')"
  >
    <DesktopWallpaper />

    <!--
      窗口层：`--zIndexWindow`(0) 档 —— 落在壁纸之上、任务栏之下。
      容器整体 `pointer-events: none`（桌面空白区的点击不被整屏层吞掉），
      每扇窗口自己 `pointer-events: auto`（规则在 assets/docs-shell.css）。

      DOM 顺序 = 注册表顺序（不随焦点重排，见文件头）；层级只由 `zIndex` 表达。
      `v-show` 而非 `v-if`：最小化 / 关闭后再次还原时，窗口内部的导航面板开合状态、
      标签选择、滚动位置与 WebGL 画布都不该被重置（实机也一样），
      且 Render Lab 的 canvas 被移出文档会丢上下文。
    -->
    <div
      ref="windowLayerRef"
      class="docs-shell-desktop__window-layer"
    >
      <ShellWindowHost
        v-for="app in SHELL_APPS"
        v-show="windowStatuses[app.id] === 'normal'"
        :key="app.id"
        :app="app"
        :state="windowOf(state, app.id)"
        :geometry="windowGeometryOf(app.id)"
        :is-active="state.activeAppId === app.id"
        :z-index="windowZIndex(state, app.id)"
        @focus="onFocus(app.id)"
        @update:maximized="onUpdateMaximized(app.id, $event)"
        @minimize="onMinimize(app.id)"
        @close="onClose(app.id)"
        @update:offset="onUpdateOffset(app.id, $event)"
        @open-tab="onOpenTab(app.id, $event)"
        @close-tab="onCloseTab(app.id, $event)"
        @select-tab="onSelectTab(app.id, $event)"
        @add-tab="onAddTab(app.id)"
      />
    </div>

    <!--
      任务栏：**全宽度常驻**，移动档换压缩布局（开始常驻 / 箭头滚动 / 托盘保时间），
      切换全部由 shell-taskbar.vue 内的 CSS 断点承担。
      两个入参都是最小投影：`windows` = 每应用窗口档位（决定入口是「最小化」还是
      「还原 / 打开」语义），`activeAppId` = 焦点应用（决定应用名称取哪个）。
    -->
    <ShellTaskbar
      ref="taskbarRef"
      :windows="windowStatuses"
      :active-app-id="state.activeAppId"
      @activate-app="onActivateApp"
    />
  </div>
</template>

<style scoped>
/* ------------------------------------------------------------------ */
/* 视觉值一律引用 token 或 --shell-* 局部变量。                          */
/* 层级只引用 --zIndex* 刻度（外壳侧同受该约定约束，见 explorer-layout §7） */
/* 窗口几何（尺寸 / 居中 / 最大化 / 移动档）统一在 assets/docs-shell.css， */
/* 因为它由「宿主包装 + 应用档位」共享（见该文件「窗口几何」段）。        */
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
 * 显式 0 能让「谁在这档」这件事在源码里一眼可见（也便于契约测试扫描）。
 * 层内每扇窗口按 `--zIndexStep` 逐档递增（`windowZIndex` 生成内联值）。
 *
 * `pointer-events: none`：容器铺满整个桌面（`inset: 0`），若可命中，桌面空白区的
 * 点击会全部落在它身上而不是「桌面根」。窗口自己把命中收回来（docs-shell.css）。
 */
.docs-shell-desktop__window-layer {
  position: absolute;
  inset: 0;
  z-index: var(--zIndexWindow);
  pointer-events: none;
}

/*
 * 移动端降级：不仿桌面（apps/docs/README.md〈WindowsOS 仿真边界〉）。
 *
 * 断点 64rem = 1024px，与 assets/docs-shell.css 的窗口移动档规则、
 * `useMediaQuery('(min-width: 64rem)')` 同值。
 *
 * ⚠️ 与 explorer-layout.md §2〈降级〉的「页面滚动」有一处已记录的偏离：实际实现保持
 * **窗口内滚动**（桌面根继续锁视口）。原因是一条硬约束：`FluereScrollView` 的 presenter
 * 是绝对定位，宿主**必须有确定高度**才滚得动（见 packages/ui/src/scrollview 与
 * layouts/components.vue 的同款注释）；若移动档改为页面滚动，就要把内容渲染器换成
 * 非 ScrollView 的实现 —— 那会让结构不再同构（0.5.9 起已是 ClientOnly，水合不再是
 * 约束，但收益仍不抵复杂度）。用户可见结果一致（都能滚动看到全部内容）。
 * 该偏离已回写 docs/design/explorer-layout.md §2 的降级段。
 *
 * 本文件在该断点下没有任何需要隐藏的层：任务栏常驻、窗口几何由 docs-shell.css 接管，
 * 唯一联动是「窗口为任务栏让出高度」。
 */
</style>
