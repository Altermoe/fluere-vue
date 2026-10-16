<script setup lang="ts">
/**
 * 窗口宿主（0.5.9）—— **每扇应用窗口一个**：负责框体、几何、层级、拖拽与焦点，
 * 内容由具体应用组件提供（当前：UI Gallery / Render Lab）。
 *
 * ## 为什么要有这一层
 *
 * 0.5.5–0.5.8 只有一扇窗口，框体（`FluereAppWindow`）+ 几何（位置 / 尺寸 / 最大化 /
 * 移动档）+ 拖拽收敛全写在 `explorer-window.vue` 里。多窗口后这三件事对**每扇窗口
 * 都相同**，而内容各不相同 —— 于是把它们提到宿主层，应用组件只写内容：
 *
 * | 事项                                   | 归谁                                      |
 * | -------------------------------------- | ----------------------------------------- |
 * | 窗口位置 / 尺寸 / 最大化 / 移动档 / 层级 | 本组件 + `assets/docs-shell.css`          |
 * | 标题栏 / caption / 圆角 / 阴影           | `FluereAppWindow`（`@fluere-vue/ui`）     |
 * | 拖拽位移的**收敛规则**（纯函数）          | `utils/shell-window-state.ts#containWindowOffset` |
 * | 窗口状态（z 序 / 焦点 / 最小化 / 关闭）   | `desktop-shell.vue`（窗口管理器）          |
 * | 内容                                   | `ui-gallery-window.vue` / `render-lab-window.vue` |
 *
 * ## 内容分派用**字面量分支**，不用 `<component :is>`
 *
 * AGENTS.md〈交互与弹层组件约定〉记着实测结论：`<component :is>` 分支上的
 * 事件不会被可靠转发（父组件的处理函数一次都没触发，产物无报错、只是内部状态改了外部不知道）。
 * 窗口组件的 `update:offset` / `openTab` 等正是**不能被吞**的那类事件，因此这里老老实实
 * 写两条字面量分支（加应用 = 加一条分支），宿主把事件显式转译后向上抛给窗口管理器。
 *
 * ## 拖拽位移的收敛（0.5.8 口径，多窗口后逐窗口独立）
 *
 * 只保证「标题栏完整可见」：规则与来源见 `containWindowOffset` 与 explorer-layout.md §1.1。
 * 收敛**必须在这里**做而不是父组件：父组件拿到的是最终的 `state.offset`，若先把越界值
 * 写进状态再收敛，拖拽过程中窗口会先"抖出"桌面一帧。按**增量**位移推进（锚点 = 上一次
 * 收敛后的位移），撞边界后反向拖拽第一帧就有响应（无死区）。
 *
 * ## 焦点
 *
 * 窗口内任意 `pointerdown`（capture）⇒ `focus` 事件 ⇒ 窗口管理器把它置顶并设为焦点。
 * 焦点窗口的标题栏是**激活态**（`FluereAppWindow` 的 `active` prop），其余窗口是失活态。
 * 这与实机一致（点击窗口内部把它带到最前）。不做 Alt+Tab / 任务视图（明确非目标）。
 *
 * ## SSR：本组件处于 ClientOnly 边界之内
 *
 * 挂载点是 `/os` 的 `<ClientOnly>`（原则见 docs/ssr-guide.md〈文档站桌面仿真的
 * ClientOnly 边界〉），因此**不做 SSR 检查**。`measure()` 那类 DOM 读取本来就在
 * `onMounted` 之后的路径上（归 `desktop-shell.vue`），本组件只在事件回调里碰 DOM。
 */

import { FluereAppWindow } from '@fluere-vue/ui'
import { computed } from 'vue'
import { useDocsI18n } from '~/composables/use-docs-i18n'
import type { ShellAppDefinition } from '~/utils/shell-apps'
import { containWindowOffset } from '~/utils/shell-window-state'
import type {
  ShellTabId,
  ShellWindowGeometry,
  ShellWindowOffset,
  ShellWindowState,
} from '~/utils/shell-window-state'
import RenderLabWindow from './render-lab-window.vue'
import UiGalleryWindow from './ui-gallery-window.vue'

const props = defineProps<{
  /** 本窗口所属应用的元数据（标题 / 副标题 / 图标都来自注册表） */
  app: ShellAppDefinition
  /** 本窗口的状态（由窗口管理器持有） */
  state: ShellWindowState
  /**
   * 拖拽 / 视口收敛用的几何量（窗口尺寸、桌面可视区、窗口静止位置、任务栏高、顶端条带高）。
   *
   * 由外壳**实测**后按窗口传入 —— 窗口尺寸与静止位置都写在 CSS 里（`min(基准值, 视口可用区)`
   * + 居中 + `--shell-desktop-margin` + 应用档位错开），在 TS 里推导第二份必然漂移。
   */
  geometry: ShellWindowGeometry
  /** 是否是焦点窗口（激活态标题栏） */
  isActive: boolean
  /** 层级表达式（`utils/shell-window-state.ts#windowZIndex` 生成，引用刻度） */
  zIndex: string
}>()

const emit = defineEmits<{
  /** 窗口内部被按下：请求置顶 + 设为焦点 */
  'focus': []
  /** 拖拽产生新的位移请求（窗口管理器负责收敛后回写状态） */
  'update:offset': [value: ShellWindowOffset]
  /** 最大化 / 还原请求（`v-model:maximized` 的语义） */
  'update:maximized': [value: boolean]
  /** 最小化请求 */
  'minimize': []
  /** 关闭请求 */
  'close': []
  /** 打开 / 切换标签请求（仅 UI Gallery） */
  'openTab': [tab: ShellTabId]
  /** 关闭标签请求（仅 UI Gallery） */
  'closeTab': [tab: ShellTabId]
  /** 切换激活标签请求（仅 UI Gallery） */
  'selectTab': [tab: ShellTabId]
  /** 新建标签请求（仅 UI Gallery） */
  'addTab': []
}>()

const { t } = useDocsI18n()

/**
 * 拖拽锚点：上一次**收敛后**的位移（`null` = 本次拖拽还没产生位移）。
 *
 * 收敛按**增量**位移推进，而不是「拖拽起点位移 + 累计位移」：
 *   - 累计口径会把越界量一直累计下去，撞到边界后反向上拖要先「抵消」越界量窗口才会动
 *     （Web 里指针能跑到视口任意位置，实测死区可达数百像素，观感是「窗口卡住了」）；
 *   - 增量口径下越界量被直接丢弃 ⇒ 反向拖拽第一帧就有响应。
 *
 * 这与 Win32 move loop 把锚点重置到**已收敛**光标位置同向
 * （`dlls/win32u/defwnd.c#sys_command_size_move`：`capture_point = pt`（`pt` 已钳过），
 * 见 `containWindowOffset` 的差异说明），只是 Web 里没有物理光标边界，故取更顺手的一侧。
 *
 * 每个宿主实例一份（模块级作用域内是每组件实例独立的闭包变量），多窗口互不干扰。
 */
let dragAnchor: ShellWindowOffset | null = null

const onDragStart = (): void => {
  dragAnchor = { x: props.state.offset.x, y: props.state.offset.y }
}

const onDragMove = (args: { deltaX: number; deltaY: number }): void => {
  // 最大化时不响应拖拽：铺满状态下没有可移动的空间，且 Win11 里最大化标题栏也不拖动窗口
  if (props.state.maximized) {
    return
  }
  const from = dragAnchor ?? props.state.offset
  const next = containWindowOffset(
    { x: from.x + args.deltaX, y: from.y + args.deltaY },
    props.geometry,
  )
  dragAnchor = next
  emit('update:offset', next)
}

const onDragEnd = (): void => {
  dragAnchor = null
}

/** 双击标题栏 = 切换最大化（Win11 系统行为；组件只抛事件，是否响应由外壳决定） */
const onTitlebarDoubleClick = (): void => {
  emit('update:maximized', !props.state.maximized)
}

/** 激活态 = 焦点窗口且处于常规档（最小化 / 关闭时窗口本身被 v-show 隐藏） */
const isWindowActive = computed(() => props.isActive && props.state.status === 'normal')

/**
 * 拖拽位移的内联样式。
 *
 * 为什么用 `transform: translate3d` 而不是改 `top/left`：位移走合成层，拖拽不掉帧，
 * 且不影响布局（标题栏的 `ResizeObserver` 量中段内容时不会被自己触发的重排干扰）。
 * `state.offset` 在最大化 / 关闭时已被状态机归零，这里不需要额外判空。
 * `zIndex` 来自窗口管理器（`calc(var(--zIndexWindow) + N * var(--zIndexStep))`）。
 */
const frameStyle = computed(() => ({
  transform: `translate3d(${props.state.offset.x}px, ${props.state.offset.y}px, 0)`,
  zIndex: props.zIndex,
}))
</script>

<template>
  <!--
    定位包装：`FluereAppWindow` 根是 `position: static`（实测），窗口的尺寸 / 居中 /
    拖拽位移 / 层级都写在这一层上。类名 `docs-shell-window` 的几何规则在
    assets/docs-shell.css（宿主与应用共享的契约），`docs-shell-window--<appId>` 是应用档位。
    `data-shell-window` + `data-app-id` 供 desktop-shell 的 `measure()` 定位本窗口
    （这两个属性写在**本组件自己的模板元素**上，不受 inheritAttrs 影响，可靠）。

    `@pointerdown.capture`：窗口内任意处按下即请求置顶 + 聚焦（实机语义），
    用 capture 是为了在 caption 按钮 / 拖拽之前就完成层级切换。
  -->
  <div
    class="docs-shell-window"
    :class="[`docs-shell-window--${app.id}`, { 'is-maximized': state.maximized }]"
    :style="frameStyle"
    :data-app-id="app.id"
    data-shell-window
    @pointerdown.capture="emit('focus')"
  >
    <FluereAppWindow
      class="docs-shell-window__frame"
      :title="t(app.titleKey)"
      :subtitle="t(app.subtitleKey)"
      :maximized="state.maximized"
      :active="isWindowActive"
      :round-to-integer="true"
      :motion="'auto'"
      :label="t('shell.appWindowLabel', { app: t(app.titleKey) })"
      @update:maximized="emit('update:maximized', $event)"
      @minimize="emit('minimize')"
      @close="emit('close')"
      @drag-start="onDragStart"
      @drag-move="onDragMove"
      @drag-end="onDragEnd"
      @titlebar-double-click="onTitlebarDoubleClick"
    >
      <template #icon>
        <component
          :is="app.icon"
          :size="16"
        />
      </template>

      <!--
        0.5.7 起窗口标题栏里没有任何站点 chrome：按 A 级 `TitleBar.cpp#UpdateHeight()` 的判据，
        Content / LeftHeader / RightHeader 三者全空时标题栏收为 **32（compact）** —— 收窄是
        源码规定的行为，不是回归（icon / title 不参与判据，见 app-window.vue 的 `titleBarSize`）。
        若将来标题栏要放回控件（0.6+ 的地址栏 / 窗口内搜索），放回即自动回到 48。
      -->

      <!-- 内容分派：字面量分支（理由见文件头「内容分派用字面量分支」） -->
      <UiGalleryWindow
        v-if="app.id === 'ui-gallery'"
        :state="state"
        @open-tab="emit('openTab', $event)"
        @close-tab="emit('closeTab', $event)"
        @select-tab="emit('selectTab', $event)"
        @add-tab="emit('addTab')"
      />
      <RenderLabWindow
        v-else-if="app.id === 'render-lab'"
        :running="state.status === 'normal'"
      />
    </FluereAppWindow>
  </div>
</template>
