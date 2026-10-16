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
 * ```
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
import { computed, nextTick, onMounted, onScopeDispose, ref, watch } from 'vue'
import { useDocsI18n } from '~/composables/use-docs-i18n'
import {
  SHELL_DEFAULT_TAB_ID,
  closeTab,
  closeWindow,
  createShellWindowState,
  maximize,
  minimize,
  openTab,
  reopenWindow,
  restore,
  selectTab,
} from '~/utils/shell-window-state'
import type { ShellTabId, ShellWindowOffset, ShellWindowState } from '~/utils/shell-window-state'
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
   * 任务栏在移动档被 CSS 隐藏（`display: none`），实测高为 0 —— 此时**保留**
   * 上一次的有效值而不是写 0：写 0 会让拖拽收敛的纵向边界在移动档变宽松，
   * 而移动档的窗口本就是全屏无边框（不参与这套几何），保留旧值更无意外。
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
    }
  }
}

/** 传给窗口层的尺寸：优先实测值，未测量时用公式兜底 */
const windowSize = computed(() => measuredWindowSize.value ?? fallbackWindowSize.value)

onMounted(() => {
  measure()
  globalThis.addEventListener('resize', measure, { passive: true })
})

onScopeDispose(() => {
  if (import.meta.client) {
    globalThis.removeEventListener('resize', measure)
  }
})

/*
 * 窗口尺寸会随「视口宽度」变（CSS 里是 `min(基准值, 视口可用区)`），
 * 而视口变化只有 `window.resize` 一个信号 —— 上面已接。
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
        :window-width="windowSize.width"
        :window-height="windowSize.height"
        :desktop-width="desktopWidth"
        :desktop-height="desktopHeight"
        :taskbar-height="taskbarHeight"
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
      任务栏：始终渲染，移动档由 CSS 隐藏（`display: none`）。
      为什么不按视口 `v-if`：视口判据在 SSR 下拿不到真实值，用 `v-if` 会让
      服务端与客户端渲染出不同的 DOM 结构 ⇒ 水合不匹配。CSS 隐藏则结构一致。
    -->
    <ShellTaskbar
      ref="taskbarRef"
      :status="state.status"
      @toggle-window="onToggleWindow"
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
 */
@media (max-width: 63.999rem) {
  /*
   * 任务栏不渲染：移动端不该有一条 48px 的固定条占掉本就紧张的纵向空间。
   * 用 CSS 隐藏而不是模板 v-if —— 视口判据在 SSR 下拿不到真实值，
   * 用 v-if 会让服务端与客户端结构不一致 ⇒ 水合不匹配。
   */
  .docs-shell-desktop :deep(.docs-shell-taskbar) {
    display: none;
  }
}
</style>
