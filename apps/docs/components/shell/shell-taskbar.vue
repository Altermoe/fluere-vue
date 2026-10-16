<script setup lang="ts">
/**
 * 任务栏（0.5.6 `Taskbar` + 0.5.7 移动端压缩布局 + 0.5.9 应用级入口）。
 *
 * 0.5.5 的最小版（只有高度占位 + 窗口还原入口）已在 0.5.6 扩成三段式：
 *
 * ```
 * ┌ 最左：开始按钮（全宽度常驻） ┬ 中间：图标区（可横向滚动） ──────────┬ 最右：系统托盘 ┐
 * │ ShellStartMenu              │ [◀] 应用入口（SHELL_APPS）+ GitHub [▶] │ 内联控件 / 时钟  │
 * └─────────────────────────────┴──────────────────────────────────────┴────────────────┘
 * ```
 *
 * ## 入口语义：**应用级**（0.5.9 改口径）
 *
 * 0.5.5–0.5.8 的中间图标区是「窗口入口 + 首页/组件/指南三个**视图**固定入口 + GitHub」。
 * 0.5.9 引入仿真应用系统后改为**每个应用一个入口**（`SHELL_APPS`，顺序 = 注册表顺序）：
 * 点入口 = 打开 / 还原 / 置顶该应用的窗口；焦点应用且窗口在显示时 = 最小化
 * （与实机任务栏一致，逻辑在 `desktop-shell.vue#onActivateApp`）。
 * 视图（首页 / 组件 / 指南）之间的切换只留在窗口内的导航面板与标签条 ——
 * 任务栏承载的是「应用」，不是「应用内部的页面」。
 *
 * 可访问名 / 提示**随入口状态变化**（说的是「点击会发生什么」，与实机读屏口径一致）：
 * 焦点且显示 → 最小化；已最小化 → 还原；已关闭 → 打开；已打开但非焦点 → 切换。
 * 四句话各自是一个 key（`shell.taskbarApp*`），提示与可访问名共用同一句，避免两套说法打架。
 *
 * 激活指示条 = 「该应用窗口在桌面显示」。**不做** Win11「焦点窗口的指示条更长」的差异：
 * 那需要一条没有 A 级来源的宽度值（Windows 任务栏由系统外壳绘制），
 * 已记入 0.9.x 的缺口清单（explorer-layout.md §8）。
 *
 * ## 布局与移动端口径（2026-10-16 评审确认，替代 0.5.5「移动档整条隐藏」）
 *
 * - 三段用 `grid-template-columns: auto minmax(0,1fr) auto`：开始与托盘是 `auto`
 *   轨（内容多宽占多宽），中间 `minmax(0,1fr)` **允许收缩到 0** —— 窄视口下先挤压
 *   图标区（靠箭头滚动消化），开始按钮与托盘时间不被挤走；
 * - **开始按钮全宽度常驻**（`display: none` 的只有托盘内联组，见下）；
 * - **中间图标区不出现原生滚动条**：`overflow-x: auto` + `scrollbar-width: none` +
 *   `::-webkit-scrollbar { display: none }` —— 48px 定高里任何方向的滚动条都会把
 *   图标区挤扁（移动端验收「不能挤压高度」）；滚动改由两个箭头按钮驱动
 *   （`scrollLeft` 编程滚动，`scroll-behavior: smooth` 且尊重 reduced-motion）；
 * - 箭头**何时可见**：图标区真的放不下（`scrollWidth > clientWidth`）才显示；
 * - **托盘压缩但时间保留**：< 64rem 时内联控件组（ShellChrome：版本 / 语言 / 主题）
 *   `display: none`，换成一个展开按钮，控件收进展开按钮弹出的菜单 —— 时钟两行
 *   （时间 / 日期）在所有宽度可见。两处都渲染、只靠 CSS 互斥。
 *
 * 断点 64rem = 1024px，与 docs-shell.css 的窗口移动档规则、desktop-shell 的
 * `useMediaQuery` 同值。
 *
 * ## 结构归属
 *
 * - 开始按钮 + 开始菜单面板 = `ShellStartMenu`（自包含，见其文件头的焦点 / 键盘口径）；
 * - 托盘内联与弹出菜单共用 `ShellChrome`（站点 chrome 清单**只有一份**），
 *   弹出菜单的开合 / 焦点陷阱在本组件（与 StartMenu 同一套 useFocusTrap 口径）；
 * - GitHub 是「入口类」控件，落中间图标区（与版本 / 语言 / 主题这类「系统状控件」
 *   分开 —— 这是 0.5.7 把站点 chrome 从窗口标题栏收进托盘时的划分依据）。
 *
 * ## 搜索按钮不做
 *
 * 判定基准里的「搜索」依赖站内搜索（docs/todo.md 2.3 的 `Ctrl+K` 命令面板，0.6+）。
 * 本期没有可搜的东西，放一个点了没反应的搜索按钮就是坏按钮（AGENTS.md 红线），
 * 故不放；《WindowsOS 仿真边界》文案已同步去掉「搜索」（i18n `shell.boundary.scope`）。
 *
 * ## 层级
 *
 * `--zIndexShell`(1500) 是任务栏的档位（全站唯一允许出现在该档的层）；
 * 托盘弹出菜单引用 `--zIndexMenu`（菜单语义档）—— 它在任务栏已建立的叠放上下文内
 * 生效，仍属「引用刻度」，不写裸值。开始菜单面板的档位见 ShellStartMenu。
 *
 * ## 时钟（0.5.9：不再需要「挂载前渲染空文本」）
 *
 * 0.5.7–0.5.8 为了让 SSR 与首帧一致，时钟初值是 `null`（渲染空文本）再在 `onMounted`
 * 写入真实时间。外壳现在处于 `ClientOnly` 边界之内（原则见 docs/ssr-guide.md
 * 〈文档站桌面仿真的 ClientOnly 边界〉），**不存在服务端 / 客户端首帧的差异**，
 * 因此直接以 `new Date()` 起步；`--shell-tray-clock-w` 的预留宽度仍然需要
 * （分钟 / 日期进位会让文本宽度变化，不预留则图标区左右抖动）。
 *
 * ## 图标按钮的几何与状态（0.5.7 按参考图还原，2026-10-16）
 *
 * 参考图 = 用户在 Windows 11（2560×48 任务栏，100% 缩放）截的任务栏与开始按钮特写；
 * 测量方法、逐项数值与结论写在 docs/design/explorer-layout.md §4。要点：
 *
 * | 量             | 参考图实测                          | 本实现                                        |
 * | -------------- | ----------------------------------- | --------------------------------------------- |
 * | 图标命中区     | 40×40（首个热区 x 12..52 / y 4..43） | `size="large"` + `icon-only`（40×40）          |
 * | 图标           | 24×24                               | `:size="24"`（0.5.7 前是 20）                  |
 * | 热区间距       | 4px（槽 pitch 44）                   | 根 grid `column-gap` + 图标区/视口 `gap` = 4px |
 * | 任务栏内边距   | 左 12 / 右 20（含 8px 显示桌面条）    | `padding-inline: 12` + 托盘 `padding-inline-end: 8` |
 * | hover / pressed | 浅色填充 + 1px 描边（描边压填充）    | `.docs-shell-taskbar-icon`（docs-shell.css）   |
 *
 * **应用区左对齐**：图标区 `justify-content: flex-start`（0.5.7 前是 `center`）——
 * 实机任务栏是左对齐的，参考图里第一个应用热区紧跟开始按钮（56..96）。
 *
 * **滚动箭头只在真的溢出时占位**：`display: none` → `.is-scrollable` 时 `flex`。
 * 0.5.5 曾用 `visibility: hidden` 让箭头**始终占位**（避免「隐藏→变宽→放得下→仍隐藏」
 * 的测量死锁），代价是开始按钮与第一个应用之间凭空多出 32px —— 与参考图的「紧贴」
 * 冲突。改成 `display` 后死锁依然不存在，理由：箭头出现只会**缩小**视口 ⇒
 * `scrollWidth > clientWidth` 单调，不存在来回翻转；翻转后补一次测量（见
 * `syncScrollState` 的 `nextTick` 备注）即可让两端可用状态准确。
 *
 * ## 提示：`FluereTooltip`（0.5.7 起取代原生 `title`）
 *
 * 0.5.6 曾裁决「外壳内不挂 ToolTip、只用原生 `title`」，因为 `--zIndexTooltip`(1400)
 * 低于 `--zIndexShell`(1500)，提示会被任务栏自己盖住（explorer-layout.md §4 方案①）。
 * 0.5.7 按方案① 的正解落地：**外壳把自己登记进层级栈**
 * （`acquireLayer('--zIndexShell')`，见 desktop-shell.vue），外壳内打开的 ToolTip
 * 因此走「嵌套提升」分支，z = `calc(var(--zIndexShell) + var(--zIndexStep))` = 1510
 * —— 高于任务栏、且全程引用刻度（没有裸 z-index）。
 *
 * 只覆写 `--fui-tooltip-z` 是**无效的**：提示面的 z 由 `useFlyout` 以**内联样式**下发
 * （`tooltip-fixture.vue` 的 `:style="layerStyle"`），内联优先于组件样式表里的
 * `z-index: var(--fui-tooltip-z)`。该结论已回写 explorer-layout.md §4。
 *
 * ## 入口按钮的可访问性口径（0.5.5 结论沿用）
 *
 * 应用入口刻意**不用** `FluereButton` 的 `selected`（也就没有 `aria-pressed`）：
 * `selected=false` 时组件把 `aria-pressed` 整个丢掉（`button.vue:140`），同一按钮会
 * 时而带时而不带 —— 比没有 toggle 语义更糟。故入口是「动作按钮」（可访问名说明
 * 点击后果），窗口状态由激活指示条视觉表达。
 *
 * ## 移动端不回仿桌面的边界
 *
 * 任务栏在移动端**保留**（0.5.7 起；0.5.5 曾按「不仿桌面」整条隐藏，评审后改为
 * 压缩常驻 —— 回写见 explorer-layout.md §2 / §4 与 README〈仿真边界〉）。
 * 窗口因此在移动档为它让出高度（docs-shell.css 的窗口移动档规则）。
 *
 * ## 已知缺口：高对比度（HC）未适配
 *
 * 任务栏的 Mica 近似底色与上缘分隔线沿用明暗两套令牌，HC 下不切换为 `Canvas` /
 * `CanvasText`；激活指示条也保留品牌色。与外壳其余自绘部分同属一处缺口，
 * 说明见 desktop-shell.vue 文件头，补齐排期见 docs/todo.md 0.9.5。
 */

import { useFocusTrap, useMediaQuery, useReducedMotion } from '@fluere-vue/hooks'
import {
  FluentIconChevronDown24Regular,
  FluentIconChevronLeft24Regular,
  FluentIconChevronRight24Regular,
  FluentIconChevronUp24Regular,
} from '@fluere-vue/icons'
import { FluereButton, FluereTooltip } from '@fluere-vue/ui'
import { computed, nextTick, onMounted, onScopeDispose, ref, useId, watch } from 'vue'
import { useDocsI18n } from '~/composables/use-docs-i18n'
import { REPOSITORY_URL } from '~/utils/docs-repo'
import { SHELL_APPS } from '~/utils/shell-apps'
import type { ShellAppId } from '~/utils/shell-apps'
import { formatTrayClock } from '~/utils/shell-clock'
import type { ShellWindowStatus } from '~/utils/shell-window-state'
import ShellChrome from './shell-chrome.vue'
import ShellStartMenu from './shell-start-menu.vue'

/** 时钟刷新间隔（ms）。分钟粒度的时钟不需要逐秒刷；取 15s 保证进位最迟 15s 反映 */
const CLOCK_REFRESH_MS = 15_000

/** 滚动判定容差（px）：亚像素 / 平滑滚动中间态不翻转箭头状态 */
const SCROLL_EPSILON = 1

const props = defineProps<{
  /** 每应用的窗口档位（决定入口是「打开 / 还原 / 切换 / 最小化」哪一种语义） */
  windows: Record<ShellAppId, ShellWindowStatus>
  /** 当前焦点应用（决定「最小化」还是「切换」）；全部收起时为 null */
  activeAppId: ShellAppId | null
}>()

const emit = defineEmits<{
  /**
   * 点击应用入口。
   * 语义是**切换**（与实机任务栏一致：焦点应用在显示 → 最小化；已收起 → 还原；
   * 其余 → 打开 / 置顶）。具体状态迁移由窗口管理器负责，任务栏只抛意图。
   */
  (event: 'activateApp', appId: ShellAppId): void
}>()

const { t, locale } = useDocsI18n()

/* ------------------------------------------------------------------ */
/* 应用入口（SHELL_APPS 顺序 = 任务栏固定顺序）                          */
/* ------------------------------------------------------------------ */

/** 入口状态四态：决定可访问名 / 提示文案，也决定激活指示条 */
type ShellAppEntryState = 'minimize' | 'restore' | 'open' | 'focus'

/** 入口状态 → 消息 key（四句话各自独立，提示与可访问名共用同一句） */
const ENTRY_LABEL_KEYS: Record<
  ShellAppEntryState,
  | 'shell.taskbarAppMinimize'
  | 'shell.taskbarAppRestore'
  | 'shell.taskbarAppOpen'
  | 'shell.taskbarAppFocus'
> = {
  minimize: 'shell.taskbarAppMinimize',
  restore: 'shell.taskbarAppRestore',
  open: 'shell.taskbarAppOpen',
  focus: 'shell.taskbarAppFocus',
}

/**
 * 一个入口当前处于哪一态（与 `toggleAppFromShell` 的状态迁移**同源**：
 * 焦点且显示 → 最小化；已最小化 → 还原；已关闭 → 打开；其余（已打开但非焦点）→ 切换）。
 */
const entryStateOf = (appId: ShellAppId): ShellAppEntryState => {
  const status = props.windows[appId] ?? 'closed'
  if (status === 'normal') {
    return props.activeAppId === appId ? 'minimize' : 'focus'
  }
  return status === 'minimized' ? 'restore' : 'open'
}

/**
 * 入口清单（图标 / 标题取自注册表单一事实源；文案随状态变化）。
 *
 * 提示与可访问名共用同一句：说的是**点击会发生什么**（与实机任务栏的读屏口径一致），
 * 而不是「当前是什么状态」—— 两套说法只会互相打架。
 */
const appEntries = computed(() =>
  SHELL_APPS.map((app) => {
    const title = t(app.titleKey)
    return {
      id: app.id,
      icon: app.icon,
      label: t(ENTRY_LABEL_KEYS[entryStateOf(app.id)], { app: title }),
      isRunning: props.windows[app.id] === 'normal',
      isFocused: props.activeAppId === app.id,
    }
  }),
)

/* ------------------------------------------------------------------ */
/* 中间图标区：横向滚动（无原生滚动条）+ 箭头                              */
/* ------------------------------------------------------------------ */

/** 图标区视口（`overflow-x: auto` 但滚动条被隐藏；箭头对它做编程滚动） */
const viewportRef = ref<HTMLElement | null>(null)

/** 图标区视口的尺寸观察器（挂载时建、卸载时断开） */
let scrollResizeObserver: ResizeObserver | null = null
/** 是否放不下（决定箭头可见性；初值 false = 挂载首帧「无箭头」，挂载后按实测翻转） */
const isScrollable = ref(false)
const canScrollPrev = ref(false)
const canScrollNext = ref(false)

/**
 * 量一次视口并写回三个状态。
 * 抽出来是因为箭头显隐翻转后要**再量一次**（见 `syncScrollState`），而那时元素相同。
 */
const applyScrollState = (viewport: HTMLElement): void => {
  /*
   * `clientWidth === 0` = 布局还没落地（水合首帧 / 样式表尚未生效 / 元素被临时隐藏）。
   * 此时 `scrollWidth` 可能已有内容宽，直接比较会把「还没量到」误判成「放不下」，
   * 而箭头一旦出现、后续又没有新的 resize 信号，就会**永久卡在可见状态**。
   * 因此零宽时统一按「不溢出」处理，等真正的布局信号（`ResizeObserver` / resize）再来量。
   */
  if (viewport.clientWidth <= 0) {
    isScrollable.value = false
    canScrollPrev.value = false
    canScrollNext.value = false
    return
  }
  const maxScroll = viewport.scrollWidth - viewport.clientWidth
  isScrollable.value = maxScroll > SCROLL_EPSILON
  canScrollPrev.value = viewport.scrollLeft > SCROLL_EPSILON
  canScrollNext.value = viewport.scrollLeft < maxScroll - SCROLL_EPSILON
}

/**
 * 同步滚动状态（挂载后、resize、scroll 事件时调用）。
 *
 * 初值三者皆 false（挂载首帧「无箭头」），挂载后按实测翻转 —— 与 0.5.7 的口径一致，
 * 只是「SSR 一致性」这个理由随 ClientOnly 边界失效（现在剩下的理由是：测量必须在
 * DOM 落地之后，`setup()` 期量不到）。
 *
 * 箭头从「不占位」翻到「占位」会缩小视口，因此翻转后补量一次（`nextTick` 等 DOM 落地）：
 * 该翻转是**单调**的（视口只会更窄 ⇒ 溢出只会更多），补量一次即收敛，不会来回抖动。
 */
const syncScrollState = (): void => {
  const viewport = viewportRef.value
  if (!viewport) {
    return
  }
  const wasScrollable = isScrollable.value
  applyScrollState(viewport)
  if (isScrollable.value !== wasScrollable) {
    void nextTick().then(() => {
      const current = viewportRef.value
      if (current) {
        applyScrollState(current)
      }
    })
  }
}

/**
 * 箭头滚动一步：一屏（`clientWidth`）。
 * 一步超过可见宽 ⇒ 两端的到头判定由 scrollLeft 天然收敛，不需要手算边界。
 * 平滑与否尊重 `prefers-reduced-motion`（`@fluere-vue/hooks` 原语）。
 */
const reducedMotion = useReducedMotion()
const scrollIcons = (direction: 1 | -1): void => {
  const viewport = viewportRef.value
  if (!viewport) {
    return
  }
  viewport.scrollBy({
    left: direction * viewport.clientWidth,
    behavior: reducedMotion.value ? 'auto' : 'smooth',
  })
}

/* ------------------------------------------------------------------ */
/* 托盘：时钟 + 展开菜单（窄档）                                          */
/* ------------------------------------------------------------------ */

/**
 * 当前时刻。外壳处于 `ClientOnly` 边界之内（原则见 docs/ssr-guide.md），
 * 不存在服务端 / 客户端首帧的差异，因此直接以「现在」起步 —— 不再需要
 * 0.5.7–0.5.8 那套「初值 null、挂载后写入」的水合口径。
 */
const now = ref(new Date())
const clock = computed(() => formatTrayClock(now.value, locale.value))

/** `<time datetime>` 的 ISO 值（机器可读时间） */
const clockDateTime = computed(() => now.value.toISOString())

let clockTimer: ReturnType<typeof setInterval> | null = null

/* 托盘弹出菜单（窄档把内联控件收进来） */
const trayOpen = ref(false)
const trayId = useId()
const trayPanelRef = ref<HTMLElement | null>(null)
const trayTriggerRef = ref<{ $el?: unknown } | null>(null)

/** 从「可能是组件实例」的 ref 里取真实 DOM 元素（同 desktop-shell.vue 的踩坑记录） */
const elementOf = (target: { $el?: unknown } | null | undefined): HTMLElement | null =>
  target?.$el instanceof HTMLElement ? target.$el : null

/*
 * 托盘弹出菜单的焦点管理：与开始菜单同一套 useFocusTrap 口径
 * （Tab 困在面板内、Esc 关、点外面关、焦点归还展开按钮；外部点击抑制归还由 hook 判定）。
 */
useFocusTrap({
  container: () => trayPanelRef.value,
  trigger: () => elementOf(trayTriggerRef.value),
  active: () => trayOpen.value,
  onEscape: () => {
    trayOpen.value = false
  },
  onOutsidePointer: () => {
    trayOpen.value = false
  },
})

/**
 * 桌面档媒体查询：**只做副作用**（升到桌面档时收起弹出菜单 —— 展开按钮在桌面档
 * 已被 CSS 隐藏，留着打开的面板会孤悬），不参与渲染（渲染分支全是 CSS 断点）。
 */
const isDesktopWidth = useMediaQuery('(min-width: 64rem)')
watch(isDesktopWidth, (desktop) => {
  if (desktop) {
    trayOpen.value = false
  }
})

/** 展开 / 收起：切换即可（开合动画 0.9.x 再对齐，本期只做逻辑） */
const toggleTray = (): void => {
  trayOpen.value = !trayOpen.value
}

/* ------------------------------------------------------------------ */

onMounted(() => {
  now.value = new Date()
  clockTimer = setInterval(() => {
    now.value = new Date()
  }, CLOCK_REFRESH_MS)
  syncScrollState()
  globalThis.addEventListener('resize', syncScrollState, { passive: true })
  /*
   * `ResizeObserver` 是「图标区视口尺寸变化」的通用信号（视口 resize / 字体与语言切换
   * 导致入口文本宽度变化 / 水合后样式落地都会触发），比只听 `window.resize` 可靠：
   * 少了它，「布局还没落地就量过一次」的误判没有第二次纠正机会（实测踩到：
   * 静态产物里两个箭头永久可见）。箭头显隐自身会改变视口宽 ⇒ 该观察器会再触发一次，
   * 由 `applyScrollState` 的零宽守卫 + 单调性保证收敛（见 `syncScrollState`）。
   */
  if (viewportRef.value) {
    scrollResizeObserver = new ResizeObserver(syncScrollState)
    scrollResizeObserver.observe(viewportRef.value)
  }
})

onScopeDispose(() => {
  if (clockTimer !== null) {
    clearInterval(clockTimer)
    clockTimer = null
  }
  globalThis.removeEventListener('resize', syncScrollState)
  scrollResizeObserver?.disconnect()
  scrollResizeObserver = null
})
</script>

<template>
  <!--
    任务栏根：`position: fixed` + 贴底（explorer-layout.md §4）。
    层级只引用刻度，不写裸值 —— 外壳侧同样受该约定约束。
    `role="toolbar"`：它承载一组命令按钮，且是窗口收起的唯一还原入口，
    给 AT 一个明确的容器语义（不是装饰条）。
    三段 grid：开始（auto）· 图标区（minmax(0,1fr)，可收缩）· 托盘（auto）。
  -->
  <div
    class="docs-shell-taskbar"
    role="toolbar"
    :aria-label="t('shell.taskbarLabel')"
  >
    <!-- 最左：开始按钮（全宽度常驻；面板与焦点逻辑见 ShellStartMenu） -->
    <div class="docs-shell-taskbar__zone docs-shell-taskbar__zone--start">
      <ShellStartMenu @activate-app="emit('activateApp', $event)" />
    </div>

    <!--
      中间：图标区。箭头与视口同排，三者 `flex: none` / `minmax(0,...)` 保证窄档
      只有视口被压缩（溢出转为滚动），开始按钮与托盘不被挤走。
      `justify-content: flex-start` = 应用区**向左紧贴开始按钮**（实机任务栏左对齐，
      参考图首个应用热区紧跟开始按钮，见文件头几何表）；
      `.is-scrollable` 由实测驱动（syncScrollState），只在真的溢出时才让箭头出现。
    -->
    <div
      class="docs-shell-taskbar__zone docs-shell-taskbar__zone--icons"
      :class="{ 'is-scrollable': isScrollable }"
    >
      <!--
        ⚠️ 显隐落在**外层 span**（`__scroll`）上，不写在 `FluereButton`：
        按钮根自带 `display: inline-flex`（组件自己的 scoped 规则），
        与本站的 `.docs-shell-taskbar__scroll { display: none }` **同特异性**（0,2,0）⇒
        由 CSS 注入顺序决定胜负。实测：dev 下本站规则在后来者位置生效（箭头正常隐藏），
        **生产构建（esbuild 打包 CSS）里库规则后到** ⇒ 两个箭头在宽视口永久可见
        （`nuxt generate` 的静态产物实测复现，见 temp/pw-shell-apps.mjs）。
        与托盘展开按钮同一解法（那里也是外层 span 承担断点显隐）。
      -->
      <span class="docs-shell-taskbar__scroll">
        <FluereTooltip
          :content="t('shell.taskbarScrollPrev')"
          placement="top"
        >
          <FluereButton
            class="docs-shell-taskbar-icon"
            appearance="subtle"
            size="medium"
            icon-only
            :disabled="!canScrollPrev"
            :aria-label="t('shell.taskbarScrollPrev')"
            @click="scrollIcons(-1)"
          >
            <template #icon>
              <FluentIconChevronLeft24Regular :size="20" />
            </template>
          </FluereButton>
        </FluereTooltip>
      </span>

      <!--
        视口：横向滚动、**滚动条全部隐藏**（scrollbar-width: none + webkit 伪元素），
        避免 48px 定高里冒出滚动条把图标区挤扁（移动端验收硬要求）。
        滚动能力本身保留（触控拖动 / 编程 scrollLeft 都可用），主交互是两侧箭头。
      -->
      <div
        ref="viewportRef"
        class="docs-shell-taskbar__viewport"
        @scroll.passive="syncScrollState"
      >
        <!--
          应用入口（`SHELL_APPS` 顺序 = 固定顺序）：点击 = 打开 / 还原 / 置顶该应用窗口；
          焦点应用且窗口在显示时 = 最小化（语义迁移见 desktop-shell 的 `onActivateApp`）。
          用 `FluereButton`（外观 / 尺寸 / 焦点环交给组件实现）+ `.docs-shell-taskbar-icon`
          （任务栏口径的 hover / pressed 状态色与描边，规则在 docs-shell.css）；
          提示走 `FluereTooltip`（外壳已登记层级栈，不会被任务栏盖住，见文件头）。
          `appearance="subtle"`：任务栏上的图标按钮不该有常驻底色。
        -->
        <span
          v-for="entry in appEntries"
          :key="entry.id"
          class="docs-shell-taskbar__slot"
        >
          <FluereTooltip
            :content="entry.label"
            placement="top"
          >
            <FluereButton
              class="docs-shell-taskbar__entry docs-shell-taskbar-icon"
              appearance="subtle"
              size="large"
              icon-only
              :aria-label="entry.label"
              @click="emit('activateApp', entry.id)"
            >
              <template #icon>
                <component
                  :is="entry.icon"
                  :size="24"
                />
              </template>
            </FluereButton>
          </FluereTooltip>

          <!--
            激活指示条：该应用窗口在桌面显示时出现（对齐实机任务栏「运行中的窗口」下划线）。
            装饰性 —— 对 AT 隐藏，状态由入口的 `aria-label` 文字承载。
            几何为应用层构图（无 WinUI 来源，Windows 任务栏由系统绘制）：宽 16 / 高 3 /
            圆角 `--borderRadiusCircular` / 前景 `--colorBrandBackground`
            （与 NavigationView 选中指示条同源，站内「选中」统一走强调色）。

            **焦点 / 非焦点在这里不区分**：Win11 焦点窗口的指示条更长、颜色也不同，但那两条
            都没有 A 级来源（Windows 任务栏由系统外壳绘制，参考图只覆盖 hover / pressed），
            本期只表达「运行中」；「哪个是焦点窗口」由标题栏的激活态表达。
            缺口记在 explorer-layout.md §8，0.9.x 用参考图补。
          -->
          <span
            class="docs-shell-taskbar__indicator"
            :class="{ 'is-active': entry.isRunning }"
            aria-hidden="true"
          />
        </span>

        <!--
          GitHub 固定入口（入口类控件归中间，系统状控件归托盘 —— 见文件头）。
          外链语义用 `<a>`（可新标签打开 / 复制地址），命中区与 hover / pressed 与
          任务栏图标按钮同档（`.docs-shell-taskbar-icon` 给描边与命中区，填充在本组件
          的 `.docs-shell-taskbar__github` 里 —— `<a>` 没有库按钮可覆写）；
          可访问名与提示走 `github.openInNewTab`（与 header 的 GithubLink 同一条文案）。
        -->
        <span class="docs-shell-taskbar__slot">
          <FluereTooltip
            :content="t('github.openInNewTab')"
            placement="top"
          >
            <a
              class="docs-shell-taskbar__github docs-shell-taskbar-icon"
              :href="REPOSITORY_URL"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="t('github.openInNewTab')"
            >
              <GithubMark class="docs-shell-taskbar__github-mark" />
            </a>
          </FluereTooltip>
        </span>
      </div>

      <span class="docs-shell-taskbar__scroll">
        <FluereTooltip
          :content="t('shell.taskbarScrollNext')"
          placement="top"
        >
          <FluereButton
            class="docs-shell-taskbar-icon"
            appearance="subtle"
            size="medium"
            icon-only
            :disabled="!canScrollNext"
            :aria-label="t('shell.taskbarScrollNext')"
            @click="scrollIcons(1)"
          >
            <template #icon>
              <FluentIconChevronRight24Regular :size="20" />
            </template>
          </FluereButton>
        </FluereTooltip>
      </span>
    </div>

    <!-- 最右：系统托盘（版本 / 语言 / 主题 + 时钟；窄档控件收进展开菜单） -->
    <div class="docs-shell-taskbar__zone docs-shell-taskbar__zone--tray">
      <!--
        桌面档内联控件（ShellChrome 清单的落点之一；与窄档弹出菜单按断点互斥）。
      -->
      <div class="docs-shell-taskbar__tray-inline">
        <ShellChrome />
      </div>

      <!--
        窄档展开按钮：把内联控件收进弹出菜单，托盘只保时钟 + 本按钮。
        `aria-expanded` / `aria-controls` 表达弹出关系；可访问名固定「托盘图标」，
        开合状态由 expanded 承载（与开始按钮同一口径）。

        ⚠️ `display` 的显隐落在**外层 span** 上（`__tray-expand`），不写在 `FluereButton`：
        按钮根自带 `display: inline-flex`（组件自己的 scoped 规则）且注入顺序在本组件之后，
        同特异性时后到者胜 ⇒ 直接写在按钮上会在桌面档被覆盖（实测踩到：桌面档展开按钮
        可见）。与 layouts/home.vue 的移动折叠按钮同一解法（外层容器承担断点显隐）。
      -->
      <span class="docs-shell-taskbar__tray-expand">
        <FluereTooltip
          :content="t('shell.trayIcons')"
          placement="top"
        >
          <FluereButton
            ref="trayTriggerRef"
            class="docs-shell-taskbar-icon"
            appearance="subtle"
            size="medium"
            icon-only
            :aria-expanded="trayOpen"
            :aria-controls="trayOpen ? trayId : undefined"
            :aria-label="t('shell.trayIcons')"
            @click="toggleTray"
          >
            <template #icon>
              <FluentIconChevronUp24Regular
                v-if="!trayOpen"
                :size="20"
              />
              <FluentIconChevronDown24Regular
                v-else
                :size="20"
              />
            </template>
          </FluereButton>
        </FluereTooltip>
      </span>

      <!--
        时钟：两行堆叠（时间 / 日期），**任何宽度都保留**（移动端只压控件不压时间）。
        `Intl.DateTimeFormat` 随 locale（zh 24h / en 12h，见 utils/shell-clock）。
        `<time datetime>` 给 AT 与机器可读时间；挂载前两行为空（水合口径见 now 注释）。
        宽度预留（--shell-tray-clock-w）避免挂载后时钟文本出现时图标区左右跳动。
      -->
      <time
        class="docs-shell-taskbar__clock"
        :datetime="clockDateTime"
      >
        <span class="docs-shell-taskbar__clock-time">{{ clock?.time ?? '' }}</span>
        <span class="docs-shell-taskbar__clock-date">{{ clock?.date ?? '' }}</span>
      </time>

      <!--
        窄档弹出菜单：承载被压缩掉的控件（同一份 ShellChrome 清单）。
        `v-if` 只由交互态驱动（初始关闭，SSR 两端一致）；焦点陷阱见 useFocusTrap 调用。
        面板材质与开始菜单同一档（Acrylic FallbackColor 近似 + SurfaceStrokeColorFlyout），
        锚点 = 托盘区（position: relative，局部定位非浮层档位），层级引用 --zIndexMenu。
      -->
      <div
        v-if="trayOpen"
        :id="trayId"
        ref="trayPanelRef"
        class="docs-shell-taskbar__tray-panel"
        role="group"
        :aria-label="t('shell.trayIcons')"
      >
        <ShellChrome />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ------------------------------------------------------------------ */
/* 色值全部引用材质令牌；高度只读 --shell-taskbar-h（单位换算的唯一入口）。 */
/*                                                                     */
/* 映射说明（WinUI 资源名 → token）：                                    */
/*   任务栏底色：Windows 任务栏由系统外壳绘制，microsoft-ui-xaml 里没有   */
/*   对应资源（证据缺口，见 repo-tokens.json 的 shellTaskbarHeight）。    */
/*   这里取「浮在桌面壁纸之上的表面」这一语义位：                          */
/*     --layerOnMicaBaseAltFillColorDefault（亮 rgba(255,255,255,.702) / */
/*     暗 rgba(58,58,58,.451)）—— 与 NavigationView 面板浮层同源，        */
/*   保证「贴在壁纸上的表面」在站内是同一档。                           */
/*   上缘分隔线：--dividerStrokeColorDefault（与 TabView 的项分隔线同源）。*/
/*   托盘弹出菜单：与 StartMenu 面板同源（MenuFlyoutPresenter 的           */
/*   Acrylic FallbackColor + SurfaceStrokeColorFlyout，出处见             */
/*   shell-start-menu.vue 文件头的映射表）。                              */
/* ------------------------------------------------------------------ */

.docs-shell-taskbar {
  position: fixed;
  inset-block-end: 0;
  inset-inline: 0;
  block-size: var(--shell-taskbar-h);

  /*
   * 三段式：开始(auto) / 图标区(minmax(0,1fr)，允许被压到 0) / 托盘(auto)。
   * 窄视口的挤压顺序由此确定 —— 先压缩中间（交给箭头滚动消化），
   * 开始按钮与托盘时间永远拿得到空间。
   *
   * `column-gap` = 热区间距（参考图实测 4px：开始热区 12..52，首个应用热区 56..96）。
   * 两端的 `padding-inline` = 12px：参考图首个热区距屏幕左缘 12px（explorer-layout.md §4）。
   * 0.5.7 前是 4px，热区比参考图偏左 8px、应用区还居中（已按参考图改正）。
   */
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  column-gap: var(--spacingHorizontalXS);
  padding-inline: var(--spacingHorizontalM);

  /* 浮层档位：全站唯一允许出现在 --zIndexShell 的层（不写裸值） */
  z-index: var(--zIndexShell);

  border-block-start: var(--strokeWidthThin) solid var(--dividerStrokeColorDefault);
  background-color: var(--layerOnMicaBaseAltFillColorDefault);
  color: var(--colorNeutralForeground1);

  /*
   * 任务栏在滚动容器之外（`position: fixed`），不会随窗口内容滚动 —— 这与
   * explorer-layout.md §2「滚动发生在窗口内容区内部」是同一件事的两面。
   */
}

/* 三段通用：允许收缩、内容不换行 */
.docs-shell-taskbar__zone {
  display: flex;
  align-items: center;
  min-inline-size: 0;
}

.docs-shell-taskbar__zone--start {
  flex: none;
  /*
   * 纵向拉满：开始菜单面板以 `inset-block-end: 100%` 锚在本段顶边 ——
   * 拉满后顶边 = 任务栏上缘，面板贴着任务栏往上展开；否则（段高 = 按钮 40 居中）
   * 面板会向下嵌进任务栏 4px（半高差）。
   */
  align-self: stretch;
  align-items: stretch;
}

/*
 * 图标区：`flex-start` = 应用区**向左紧贴开始按钮**（实机任务栏左对齐）。
 * 0.5.7 前是 `center`，宽视口下整组图标会飘到任务栏中间，与参考图不符。
 * 段内 `gap` = 热区间距 4px（箭头出现时与图标之间同样留 4px）。
 */
.docs-shell-taskbar__zone--icons {
  flex: 1 1 auto;
  gap: var(--spacingHorizontalXS);
  justify-content: flex-start;
}

.docs-shell-taskbar__zone--tray {
  position: relative; /* 托盘弹出菜单的锚点（局部定位，非浮层档位） */
  flex: none;
  /*
   * 纵向拉满：与开始段同理，弹出菜单 `inset-block-end: 100%` 锚在段顶边 = 任务栏上缘。
   * 段内是 flex + align-items: center（继承），控件组与时钟仍垂直居中。
   */
  align-self: stretch;
  gap: var(--spacingHorizontalXS);
  justify-content: flex-end;

  /*
   * 右端多留 8px：参考图实测时钟文本距屏幕右缘 **20px**（任务栏内边距 12 + 8）。
   * 这 8px 是 Windows 11「显示桌面」条的固有占位（实机在最右端留一条不可见窄条，
   * 悬停才显形）。本仿真不实现该按钮（点了没反应的按钮 = 坏按钮，AGENTS.md 红线），
   * 但保留它的间距 —— 否则时钟会贴到屏幕右缘，与参考图右端留白对不上。
   */
  padding-inline-end: var(--spacingHorizontalS);
}

/*
 * 图标区视口：横向可滚、**任何滚动条都不出现**。
 * - `scrollbar-width: none`（Firefox / 现代 Chromium 标准属性）；
 * - `::-webkit-scrollbar { display: none }`（Safari / 旧 Chromium 私有伪元素）；
 * - `overflow-y: hidden`：任务栏只有 48px 高，纵向滚动条同样禁掉。
 * 两套都写才谈得上「不出现原生滚动条挤压高度」—— 少任何一套都会在对应引擎露馅。
 */
.docs-shell-taskbar__viewport {
  display: flex;
  align-items: center;
  /* 热区间距 4px（参考图：槽 pitch 44 = 40 热区 + 4 缝） */
  gap: var(--spacingHorizontalXS);
  min-inline-size: 0;

  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;

  scroll-behavior: smooth;
  /* 触控拖动时不在边缘把页面滚动抢走 */
  overscroll-behavior-x: contain;
}

.docs-shell-taskbar__viewport::-webkit-scrollbar {
  display: none;
}

/*
 * 箭头：**只在真的放不下时存在**（`display`，不是 `visibility`）。
 * 0.5.5 用 `visibility: hidden` 让箭头始终占位（换取「测量前提不变」），代价是开始
 * 按钮与第一个应用热区之间凭空多出 32px —— 与参考图的「紧贴」冲突。改 `display`
 * 后死锁依然不成立：箭头出现只让视口更窄 ⇒ 溢出单调，不会来回翻转；翻转后
 * `syncScrollState` 会补量一次（见该函数注释）。
 */
.docs-shell-taskbar__scroll {
  flex: none;
  display: none;
}

.docs-shell-taskbar__zone--icons.is-scrollable .docs-shell-taskbar__scroll {
  display: inline-flex;
}

/* 图标槽：按钮 + 其下方的激活指示条合成一列，指示条贴着任务栏内缘 */
.docs-shell-taskbar__slot {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

/*
 * 入口按钮：命中区 40×40（参考图实测热区 x 12..52 / y 4..43）。
 * `size="large"` + `icon-only` 已给出 40×40（`aspect-ratio: 1`），这里只兜住
 * 「内容把宽度撑大」的情况；hover / pressed 状态色与 1px 描边由
 * `.docs-shell-taskbar-icon`（docs-shell.css）提供 —— 两个消费方共用一份规则。
 */
.docs-shell-taskbar__entry {
  min-inline-size: 40px;
}

/*
 * GitHub 固定入口：外链语义（`<a>`），命中区与 hover / pressed 与任务栏图标按钮同档
 * —— 描边与命中区来自 `.docs-shell-taskbar-icon`，填充在这里写（`<a>` 不是库按钮，
 * 没有可覆写的 `--colorSubtleBackground*`）。图标色在 hover / pressed 时提亮，
 * 与 header 的 GithubLink 同一口径。
 */
.docs-shell-taskbar__github {
  display: flex;
  align-items: center;
  justify-content: center;
  min-block-size: 40px;
  border-radius: var(--borderRadiusMedium);
  color: var(--colorNeutralForeground2);
  text-decoration-line: none;
  transition-property: color, background-color;
  transition-duration: var(--durationFaster);
  transition-timing-function: var(--curveEasyEase);
}

/* 填充阶梯与库按钮同一对 token（hover = ControlFillColorSecondary / pressed = Tertiary） */
.docs-shell-taskbar__github:hover:not(:focus-visible) {
  background-color: var(--controlFillColorSecondary);
  color: var(--colorNeutralForeground1);
}

.docs-shell-taskbar__github:active:not(:focus-visible) {
  background-color: var(--controlFillColorTertiary);
  color: var(--colorNeutralForeground1);
}

.docs-shell-taskbar__github:focus-visible {
  outline: var(--strokeWidthThick) solid var(--colorStrokeFocus2);
  outline-offset: var(--spacingHorizontalXXS);
}

.docs-shell-taskbar__github-mark {
  /* 与任务栏其余图标同档：24px 图标高（参考图实测应用图标 24×24） */
  block-size: 24px;
  inline-size: auto;
}

/*
 * 激活指示条：窗口 / 视图显示时出现。用 `opacity` 过渡而不是 `display` / 尺寸变化 ——
 * 只动一个合成属性，且 reduced-motion 下停用后仍留下正确的静态形态（有 / 无）。
 */
.docs-shell-taskbar__indicator {
  position: absolute;
  inset-block-end: calc(-1 * var(--spacingVerticalXS));
  inline-size: 16px;
  block-size: 3px;
  border-radius: var(--borderRadiusCircular);
  background-color: var(--colorBrandBackground);
  opacity: 0;
  transition-property: opacity;
  transition-duration: var(--durationFaster);
  transition-timing-function: var(--curveEasyEase);
}

.docs-shell-taskbar__indicator.is-active {
  opacity: 1;
}

/* ---- 托盘 ---- */

/* 桌面档内联控件（窄档隐藏，改由展开按钮弹出） */
.docs-shell-taskbar__tray-inline {
  display: flex;
  align-items: center;
}

/*
 * 展开按钮：桌面档隐藏（内联组直接可见），窄档显示 —— 互斥但两处都渲染。
 * 选择器命中的元素是**外层 span**（按钮的断点显隐外壳，见模板内 ⚠️ 注释），
 * 不要把它挪回 FluereButton —— 按钮根自带 display 且注入更晚，会盖掉本规则。
 */
.docs-shell-taskbar__tray-expand {
  display: none;
}

/*
 * 时钟：两行堆叠（时间在上、日期在下，Windows 11 任务栏口径）。
 * 预留宽度 = 构图变量 --shell-tray-clock-w（docs-shell.css）：
 * 挂载前两行为空、挂载后填入文本，若不预留，图标区会在时钟出现的一帧整体平移。
 */
.docs-shell-taskbar__clock {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-inline-size: var(--shell-tray-clock-w);

  /* 应用层构图（无 WinUI 来源：Windows 任务栏时钟由系统外壳绘制） */
  font-size: var(--fontSizeBase200);
  line-height: var(--lineHeightBase200);
  text-align: end;
}

.docs-shell-taskbar__clock-time {
  color: var(--colorNeutralForeground1);
}

.docs-shell-taskbar__clock-date {
  color: var(--colorNeutralForeground2);
}

/* 托盘弹出菜单（材质出处见 shell-start-menu.vue 文件头的映射表） */
.docs-shell-taskbar__tray-panel {
  position: absolute;
  inset-block-end: 100%;
  inset-inline-end: 0;
  /*
   * 菜单档位（--zIndexMenu）。在任务栏的 --zIndexShell 叠放上下文内生效 ——
   * 仍是引用刻度而非裸值，语义上表达「这是一层菜单浮起面」。
   */
  z-index: var(--zIndexMenu);

  display: flex;
  align-items: center;
  gap: var(--spacingHorizontalM);
  padding: var(--spacingHorizontalS) var(--spacingHorizontalM);
  margin-block-end: var(--spacingVerticalXXS);

  background-color: var(
    --fui-shell-tray-panel-background,
    var(--acrylicBackgroundFillColorDefault)
  );
  border: var(--strokeWidthThin) solid var(--surfaceStrokeColorFlyout);
  border-radius: var(--borderRadiusXLarge);
  box-shadow: var(--shadow16);
}

/* 减少动效偏好：色彩过渡停用（保留 hover / pressed / focus 的静态形态差异） */
@media (prefers-reduced-motion: reduce) {
  .docs-shell-taskbar__viewport {
    scroll-behavior: auto;
  }

  .docs-shell-taskbar__indicator {
    transition: none;
  }

  .docs-shell-taskbar__github {
    transition: none;
  }
}

/*
 * 窄档（< 64rem）：托盘压缩 —— 时间保留，其余控件收进展开按钮的弹出菜单。
 * 只切 display、不增删 DOM（SSR / 水合结构一致）。
 */
@media (max-width: 63.999rem) {
  .docs-shell-taskbar__tray-inline {
    display: none;
  }

  .docs-shell-taskbar__tray-expand {
    display: flex;
  }
}
</style>
