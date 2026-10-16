<script setup lang="ts">
/**
 * Explorer 窗口层（0.5.5 `DesktopShell` 的中间层）。
 *
 * 结构 = `FluereAppWindow`（标题栏 + 内容区）+ 窗口内的 `FluereNavigationView`（导航面板）
 * + `FluereTabView`（视图切换）—— 对应 0.5.0 里程碑「能打开一个空 Explorer 窗口，
 * 导航可折叠、视图可切换」。
 *
 * ## 职责边界（为什么几何写在这里而不进 packages/ui）
 *
 * explorer-layout.md §1 明文裁定：**外壳负责几何，组件只负责圆角 / 阴影归零**。
 * `FluereAppWindow` 刻意不写 `position` / `inset` / `transform` / `z-index`
 * （组件注释 + 契约测试守着这一点），所以：
 *   - 窗口的尺寸 / 位置 / 拖拽位移**全部由这一层给**；
 *   - 圆角与阴影不在这里写 —— `maximized` prop 会让组件自己把圆角 / 阴影归零。
 *
 * `apps/docs/README.md`〈构件归属〉：桌面与任务栏的**组装**留在站点，只有通用 WinUI
 * 控件本体在 `@fluere-vue/ui`。本组件因此不是组件库的一部分。
 *
 * **拖拽位移的收敛**（0.5.8 起）只保证「标题栏完整可见」——窗口本体允许挂在桌面之外。
 * 规则与来源见 `utils/shell-window-state.ts#containWindowOffset` 与
 * `docs/design/explorer-layout.md` §1.1；本组件只负责按**增量**位移调用它
 * （几何量由外壳实测后经 `geometry` prop 传入，不在这里推导第二份 CSS 公式）。
 *
 * ## 四条实测得来的实现约束（不要"顺手优化"掉）
 *
 * ① **`FluereNavigationView` 根上写 `h-[...]` 无效**：组件根自带 `block-size: 100%`
 *    （选择器 `.fui-navigation-view[data-v-*]`，特异性 0,2,0），压过 UnoCSS 的
 *    `.h-[320px]`（0,1,0）。正确做法是**给它一个确定高度的父容器**，让它 `100%` 撑满
 *    —— 见 `.docs-shell-window__body` 的 `flex: 1 1 auto; min-block-size: 0`
 *    与组件上的 `flex-1 min-h-0`。
 * ② **三个组件的根都不写 `position`**（实测 `static`）：需要定位上下文时必须自己包一层，
 *    见 `.docs-shell-window__frame` 的 `position: relative`。
 * ③ **`FluereTabView` 根不写 `block-size`**：`h-full` / `flex-1 min-h-0` 都有效。
 * ④ **站点 chrome 已于 0.5.7 迁出窗口**（历史约束保留备查）：48px 定高标题栏装不下
 *    四个站点控件 —— 12 列 grid 的右头格是 `auto` 轨，390px 视口实测只剩 43px，
 *    控件换行成 108px 高并压到标签条上；0.5.5–0.5.6 因此拆了「标题栏 + 应用栏」两处
 *    互斥落点（实测数据与完整推理见 explorer-layout.md §6.3）。0.5.6 仿真独立路由、
 *    0.5.7 任务栏落地后，按原计划整体收进**任务栏系统托盘**（窄档收进展开菜单），
 *    本组件不再渲染任何站点 chrome —— 窗口关闭后主题 / 语言 / 版本入口也不会消失。
 *
 * ## 事件口径（避免同一个交互被处理两次）
 *
 * `FluereAppWindow` 的 caption 在最大化 / 还原时会**同时**抛 `update:maximized` 与
 * `maximize` / `restore`（见 caption-buttons.vue `onMaximizeRestore`）。这里**只认
 * `v-model:maximized`**，另两个语义事件不再接 —— 否则一次点击会改两次状态。
 *
 * `FluereTabView` **只抛事件不删数据**（`tabCloseRequested` / `addTabButtonClick`），
 * 删哪个、关完选谁由外壳的状态机决定（见 utils/shell-window-state.ts）。
 */

import { FluentIconDocument24Regular } from '@fluere-vue/icons'
import {
  FluereAppWindow,
  FluereNavigationView,
  FluereNavigationViewItem,
  FluereScrollView,
  FluereTabView,
  FluereTabViewItem,
} from '@fluere-vue/ui'
import { computed } from 'vue'
import type { Component } from 'vue'
import HomeContent from '~/components/home/home-content.vue'
import { useComponentNav } from '~/composables/use-component-nav'
import { useDocsI18n } from '~/composables/use-docs-i18n'
import { SHELL_VIEWS } from '~/utils/shell-views'
import { SHELL_DEFAULT_TAB_ID, containWindowOffset, isBlankTab } from '~/utils/shell-window-state'
import type {
  ShellTabId,
  ShellWindowGeometry,
  ShellWindowOffset,
  ShellWindowState,
} from '~/utils/shell-window-state'

/*
 * 关于 `FLUERE_NAVIGATION_SETTINGS_VALUE`：那是组件库导出给消费方判断「选中的是不是
 * 内置设置项」的保留哨兵值。本外壳**关闭内置设置项**（`:is-settings-visible="false"`，
 * 理由见下方模板注释），因此不需要它 —— 这里不 import，避免出现"导入了却没用"的噪音。
 */

const props = defineProps<{
  /** 窗口状态机状态（由 desktop-shell.vue 持有） */
  state: ShellWindowState
  /**
   * 拖拽 / 视口收敛用的几何量（窗口尺寸、桌面可视区、窗口静止位置、任务栏高、顶端条带高）。
   *
   * 由外壳**实测**后传入 —— 窗口尺寸与静止位置都写在 CSS 里（`min(基准值, 视口可用区)`
   * + 居中 + `--shell-desktop-margin`），在 TS 里推导第二份必然漂移。
   * 收敛规则见 `containWindowOffset`（apps/docs/utils/shell-window-state.ts）。
   */
  geometry: ShellWindowGeometry
}>()

const emit = defineEmits<{
  /** 拖拽产生新的位移请求（外壳负责收敛后回写 state） */
  'update:offset': [value: ShellWindowOffset]
  /** 最大化 / 还原请求（`v-model:maximized` 的语义） */
  'update:maximized': [value: boolean]
  /** 最小化请求 */
  'minimize': []
  /** 关闭请求 */
  'close': []
  /** 打开 / 切换标签请求 */
  'openTab': [tab: ShellTabId]
  /** 关闭标签请求 */
  'closeTab': [tab: ShellTabId]
  /** 切换激活标签请求 */
  'selectTab': [tab: ShellTabId]
  /** 新建标签请求（TabView 的新建按钮） */
  'addTab': []
}>()

const { t } = useDocsI18n()
const localePath = useLocalePath()
const { implementedCards } = useComponentNav()

/**
 * 「指南」视图的入口：本期是「先从哪看起」的两个去处，正文归 0.6+ 的文档站改造。
 *
 * 与「首页」视图的营销内容分开：后者与站点主页**共用同一份**
 * （`components/home/home-content.vue`，`variant="desktop"` 多渲染《仿真边界》），
 * 而指南只是窗口内的两个链接，不值得为它再抽一层。
 */
const guideLinks = computed(() => [
  {
    title: t('home.getStarted'),
    desc: t('home.ctaCards.install.desc'),
    to: localePath('/components'),
  },
  {
    title: t('home.exploreComponents'),
    desc: t('home.ctaCards.browse.desc'),
    to: localePath('/components/button'),
  },
])

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
 */
let dragAnchor: ShellWindowOffset | null = null

/**
 * 拖拽中把位移收敛到「标题栏始终可见」后向上抛。
 *
 * 收敛**必须在这里做**而不是在父组件：父组件拿到的是最终的 `state.offset`，
 * 若先把越界值写进 state 再收敛，拖拽过程中窗口会先"抖出"桌面一帧。
 * `roundToInteger` 已在 `FluereAppWindow` 上打开，因此这里拿到的增量是整数
 * （`delta` 是「取整后的累计位移」之差，逐帧相加恰好等于起点 + 总位移）。
 */
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

const onDragStart = (): void => {
  dragAnchor = { x: props.state.offset.x, y: props.state.offset.y }
}

const onDragEnd = (): void => {
  dragAnchor = null
}

/** 双击标题栏 = 切换最大化（Win11 系统行为；组件只抛事件，是否响应由外壳决定） */
const onTitlebarDoubleClick = (): void => {
  emit('update:maximized', !props.state.maximized)
}

/**
 * 窗口位移的内联样式。
 *
 * 为什么用 `transform: translate3d` 而不是改 `top/left`：位移走合成层，拖拽不掉帧，
 * 且不影响布局（标题栏的 `ResizeObserver` 量中段内容时不会被自己触发的重排干扰）。
 * `state.offset` 在最大化 / 关闭时已被状态机归零，这里不需要额外判空。
 */
const frameStyle = computed(() => {
  const { x, y } = props.state.offset
  return {
    transform: `translate3d(${x}px, ${y}px, 0)`,
  }
})

/** 窗口内视图定义：标签 id → 标题 / 图标 / 是否可关闭 */
interface ShellView {
  id: ShellTabId
  title: string
  icon: Component
}

/**
 * 导航面板的条目（数据源 = 站点信息架构，不复制一份硬编码清单）。
 *
 * 静态定义（id / 图标 / 标题 key）自 0.5.7 起收敛到 `~/utils/shell-views` ——
 * 任务栏固定入口与开始菜单条目共用同一份，改清单只改一处。
 *
 * 条目刻意只有三项 —— 每一项目前都有**真实内容**（首页 = 营销页、组件 = 注册表卡片网格、
 * 指南 = 起步入口）。不为了"看起来像 Explorer"补空壳条目：空条目点开只有一句
 * 「暂无内容」，那是把仿真做成了装饰。剩余信息架构的去向：
 *  - 搜索 → 0.6 的 `Ctrl+K` 命令面板（docs/todo.md 2.3），开始菜单与任务栏都不放假搜索按钮；
 *  - 设置（主题 / 语言 / 版本）→ **已落任务栏系统托盘**（0.5.7），导航面板继续关闭内置设置项；
 *  - 设计令牌 / 路线图 → 等对应页面存在（docs/todo.md 2.4）。
 */
const views = computed<ShellView[]>(() =>
  SHELL_VIEWS.map((view) => ({ id: view.id, title: t(view.titleKey), icon: view.icon })),
)

/** 已打开标签的视图定义（顺序按状态机的 openTabs） */
const openViewList = computed(() =>
  props.state.openTabs.map((id) => views.value.find((view) => view.id === id) ?? fallbackView(id)),
)

/**
 * 兜底视图：状态机在关掉最后一个标签时会补 `SHELL_BLANK_TAB_ID`，
 * 它不在 `views` 里，因此单独给一份"空"的定义（内容区渲染「没有打开的视图」提示）。
 */
const fallbackView = (id: ShellTabId): ShellView => ({
  id,
  title: t('shell.tabs.blank'),
  icon: FluentIconDocument24Regular,
})

/** 当前激活标签在 openTabs 里的下标（喂给 `v-model:selected-index`） */
const activeIndex = computed(() => Math.max(0, props.state.openTabs.indexOf(props.state.activeTab)))

const onSelectedIndexChange = (index: number): void => {
  const tab = props.state.openTabs[index]
  if (tab) {
    emit('selectTab', tab)
  }
}

const onTabCloseRequested = (args: { index: number }): void => {
  const tab = props.state.openTabs[args.index]
  if (tab) {
    emit('closeTab', tab)
  }
}

/** 导航项选中值 ↔ 标签：`isSettingsVisible=false` 时面板里只有普通项，值即标签 id */
const onNavigationSelection = (value: string | number | undefined): void => {
  if (typeof value === 'string') {
    emit('openTab', value)
  }
}
</script>

<template>
  <!--
    定位包装层：`FluereAppWindow` 根是 `position: static`（实测），所有三个被组装组件的根
    都不提供定位上下文。窗口的尺寸 / 居中 / 拖拽位移都写在这一层上。
    `relative` 同时让将来的窗口内浮层（0.6 的地址栏下拉等）有锚点。
  -->
  <div
    class="docs-shell-window"
    :class="{ 'is-maximized': state.maximized }"
    :style="frameStyle"
  >
    <FluereAppWindow
      class="docs-shell-window__frame"
      :title="t('shell.windowTitle')"
      :subtitle="t('shell.windowSubtitle')"
      :maximized="state.maximized"
      :active="state.status === 'normal'"
      :round-to-integer="true"
      :motion="'auto'"
      :label="t('shell.windowLabel')"
      @update:maximized="emit('update:maximized', $event)"
      @minimize="emit('minimize')"
      @close="emit('close')"
      @drag-start="onDragStart"
      @drag-move="onDragMove"
      @drag-end="onDragEnd"
      @titlebar-double-click="onTitlebarDoubleClick"
    >
      <template #icon>
        <BrandLogo :size="16" />
      </template>

      <!--
        0.5.7：站点 chrome 已迁入任务栏系统托盘（ShellChrome 不再出现在窗口里，
        见文件头④与 shell-chrome.vue 的落点表）。这里刻意**不占位** `#right-header`：
        按 A 级 `TitleBar.cpp#UpdateHeight()` 的判据，Content / LeftHeader / RightHeader
        三者全空时标题栏收为 **32（compact）**——标题栏里不再有任何控件，收窄是源码
        规定的行为，不是回归（icon / title 不参与判据，见 app-window.vue 的
        `titleBarSize`）。若将来标题栏要放回控件（0.6+ 的地址栏 / 窗口内搜索），
        放回即自动回到 48。
      -->

      <!--
        窗口内容区。`FluereAppWindow` 的 `__content` 是 `flex: 1 1 auto; display: flex;
        flex-direction: column; overflow: clip` —— 高度确定、内部滚动交给消费方，
        因此这里只需把下一层撑满 + `min-block-size: 0`（否则 flex 子项不收缩，
        内部滚动区撑破窗口）。
      -->
      <div class="docs-shell-window__body">
        <!--
          `FluereNavigationView`：面板开合受控（外壳持有状态，将来任务栏 / 键盘也能联动），
          `pane-display-mode="auto"` 走缺省阈值（≥1008 Expanded / 收窄 Compact），
          与 explorer-layout.md §3 的假设一致 —— 外壳不干预 DisplayMode。

          刻意**关闭内置设置项**：`FLUERE_NAVIGATION_SETTINGS_VALUE` 是保留哨兵值，
          其消费路径（判断"选中的是不是设置项"）需要一个「设置」入口才有意义；
          设置类控件（主题 / 语言 / 版本）已由**任务栏系统托盘**承担（0.5.7），
          导航面板里再放一个语义重复的入口只会让两个"设置"互相打架。
        -->
        <FluereNavigationView
          class="docs-shell-window__nav flex-1 min-h-0"
          :is-settings-visible="false"
          :is-pane-toggle-button-visible="true"
          :pane-display-mode="'auto'"
          :selected-value="state.activeTab"
          :label="t('shell.navLabel')"
          :pane-title="t('shell.paneTitle')"
          @update:selected-value="onNavigationSelection"
        >
          <FluereNavigationViewItem
            v-for="view in views"
            :key="view.id"
            :value="view.id"
            :content="view.title"
          >
            <template #icon>
              <component
                :is="view.icon"
                :size="20"
              />
            </template>
          </FluereNavigationViewItem>

          <template #content>
            <!--
              `FluereTabView`：根不写 `block-size`，因此 `h-full` 有效（实测）。
              `label` 必传 —— WinUI 的 tab 条 peer 没有 GetNameCore 回退
              （组件 types.ts 明文），不传会得到一个无语义名 tablist。
            -->
            <FluereTabView
              class="docs-shell-window__tabs h-full"
              :selected-index="activeIndex"
              :tab-width-mode="'size-to-content'"
              :close-button-overlay-mode="'on-pointer-over'"
              :label="t('shell.tabsLabel')"
              @update:selected-index="onSelectedIndexChange"
              @tab-close-requested="onTabCloseRequested"
              @add-tab-button-click="emit('addTab')"
            >
              <FluereTabViewItem
                v-for="view in openViewList"
                :key="view.id"
                :value="view.id"
                :header="view.title"
                :is-closable="!isBlankTab(view.id)"
              >
                <template #icon>
                  <component
                    :is="view.icon"
                    :size="16"
                  />
                </template>

                <!--
                  每个视图一个**独立滚动区**：滚动边界在窗口内容区内
                  （explorer-layout.md §2 锁定的假设），壁纸与任务栏不随滚动移动。
                  ScrollView 的 presenter 是绝对定位，宿主必须有确定高度 ——
                  `h-full` 由 `__panel` 的确定高度提供（见样式块）。
                -->
                <FluereScrollView class="docs-shell-window__panel-scroll h-full">
                  <div class="docs-shell-window__panel-inner">
                    <!--
                      「首页」视图 = 与站点主页共用的营销内容（`variant="desktop"` 让它在
                      页脚之后多渲染《WindowsOS 仿真边界》三段）。
                      0.5.5 时这段内容由页面经 `DesktopShell` 的 `#home` 插槽注入；
                      迁移到 /os 时改为窗口层直接渲染 —— 视图内容属于「知道有哪些标签」的这一层，
                      页面层只负责挂上外壳（见 pages/os/index.vue 的文件头）。
                    -->
                    <HomeContent
                      v-if="view.id === SHELL_DEFAULT_TAB_ID"
                      variant="desktop"
                    />
                    <template v-else-if="view.id === 'components'">
                      <ul class="docs-shell-window__grid">
                        <li
                          v-for="card in implementedCards"
                          :key="card.slug"
                        >
                          <ComponentCard
                            :to="`/components/${card.slug}`"
                            :name="card.name"
                            :summary="card.summary"
                            :icon="card.icon"
                            :palette="card.palette"
                          />
                        </li>
                      </ul>
                    </template>
                    <template v-else-if="view.id === 'guide'">
                      <h2 class="docs-shell-window__guide-title">{{ t('shell.tabs.guide') }}</h2>
                      <ul class="docs-shell-window__guide-grid">
                        <li
                          v-for="card in guideLinks"
                          :key="card.title"
                        >
                          <NuxtLink
                            :to="card.to"
                            class="docs-shell-window__guide-card"
                          >
                            <h3 class="docs-shell-window__guide-card-title">{{ card.title }} →</h3>
                            <p class="docs-shell-window__guide-card-desc">{{ card.desc }}</p>
                          </NuxtLink>
                        </li>
                      </ul>
                    </template>
                    <template v-else>
                      <p class="docs-shell-window__empty">{{ t('shell.tabs.blankHint') }}</p>
                    </template>
                  </div>
                </FluereScrollView>
              </FluereTabViewItem>
            </FluereTabView>
          </template>
        </FluereNavigationView>
      </div>
    </FluereAppWindow>
  </div>
</template>

<style scoped>
/* ------------------------------------------------------------------ */
/* 视觉值一律引用 token 或 --shell-* / --fui-* 局部变量。                */
/* 窗口的圆角 / 描边 / 阴影 / 底色**不在本层写** —— 它们属于              */
/* `FluereAppWindow`（explorer-layout.md §1：外壳不得再写圆角 / 阴影 /   */
/* 描边值），最大化时由组件的 `maximized` prop 自行归零。                 */
/* ------------------------------------------------------------------ */

.docs-shell-window {
  /*
   * 尺寸：取「基准尺寸」与「桌面可视区减去留白 / 任务栏」的较小者。
   * 基准值只作上限（超宽屏上不让窗口无限拉伸），见 docs-shell.css 的构图变量注释。
   */
  inline-size: min(var(--shell-window-w), calc(100% - 2 * var(--shell-desktop-margin)));
  block-size: min(
    var(--shell-window-h),
    calc(100% - var(--shell-taskbar-h) - 2 * var(--shell-desktop-margin))
  );

  /*
   * 居中 + 拖拽位移（transform 由模板内联 style 覆盖 translate3d 部分）。
   * 用绝对定位而非 flex 居中：拖拽位移是相对"居中基准位置"的平移，
   * 居中基准必须与位移解耦，否则位移会参与居中计算、越拖越偏。
   */
  position: absolute;
  inset-block-start: var(--shell-desktop-margin);
  inset-inline-start: 50%;
  margin-inline-start: calc(
    min(var(--shell-window-w), calc(100% - 2 * var(--shell-desktop-margin))) / -2
  );

  display: flex;
  flex-direction: column;
  /* 不使用时会显示窗口内容，避免拖拽期间出现选中文本的蓝底 */
  user-select: none;
}

/* 最大化：铺满可视区、顶部不留白，底部仍给任务栏留出高度 */
.docs-shell-window.is-maximized {
  inset-block-start: 0;
  inset-inline-start: 0;
  margin-inline-start: 0;
  inline-size: 100%;
  block-size: calc(100% - var(--shell-taskbar-h));
}

.docs-shell-window__frame {
  /* 撑满 wrapper：wrapper 给出确定尺寸，窗口本体只需要吃掉它 */
  flex: 1 1 auto;
  min-block-size: 0;
}

/* 窗口内容区（`FluereAppWindow` 的 `#content`）：链式高度的中间一环 */
.docs-shell-window__body {
  display: flex;
  /*
   * 纵向排布：0.5.7 起只剩导航视图一个子项（移动档应用栏已随 chrome 迁出），
   * flex 列布局保留 —— 将来标题栏内搜索（0.6+）等头部行可以自然插到导航之上。
   */
  flex-direction: column;
  flex: 1 1 auto;
  min-block-size: 0;
}

/*
 * 导航视图：**不写 block-size**。
 *
 * 根上写 `h-[...]` / `block-size` 都无效 —— 组件根自带 `block-size: 100%`
 * （`.fui-navigation-view[data-v-*]` 特异性 0,2,0），压过 UnoCSS 工具类（0,1,0）。
 * 正确做法是让父容器（`.docs-shell-window__body`，有确定高度）撑出高度，
 * 组件用 `flex-1 min-h-0` 吃掉余量（工具类 `flex-1` = `flex: 1 1 0%` 属于
 * flex 属性，不与 `block-size` 冲突，因此有效）。
 */
.docs-shell-window__nav {
  /* flex-1 / min-h-0 由模板工具类提供；这里只补 `inline-size` 由组件自管（100%） */
  display: flex;
}

/* tab 视图：根不写 block-size ⇒ `h-full` 有效 */
.docs-shell-window__tabs {
  min-inline-size: 0;
}

/*
 * 视图内容容器。
 *
 * `FluereScrollView` 的 presenter 是绝对定位，宿主必须有**确定高度**才滚得动；
 * 这里的高度来自 tab 面板（`.fui-tab-view__panel` 是 `flex: 1 1 auto; min-block-size: 0`），
 * 而面板高度又来自 tab 根（`h-full`）—— 一整条链都是确定高度。
 */
.docs-shell-window__panel-scroll {
  /* 滚动内容与窗口右缘留一点呼吸（滚动条自身由 ScrollView 绘制） */
  background-color: transparent;
}

.docs-shell-window__panel-inner {
  padding: var(--spacingVerticalXXL) var(--spacingHorizontalXXL) var(--spacingVerticalXXXL);
}

/* 组件总览网格：复用 /components Overview 的卡片几何（300px 自动填充 + 12px 间距） */
.docs-shell-window__grid {
  display: grid;
  gap: var(--spacingHorizontalM);
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  list-style: none;
  margin: 0;
  padding: 0;
}

.docs-shell-window__empty {
  margin: 0;
  color: var(--colorNeutralForeground3);
  font-size: var(--fontSizeBase300);
  line-height: var(--lineHeightBase300);
}

/* ---- 「指南」视图（窗口内滚动的两个起步入口，几何与营销内容同档） ---- */

.docs-shell-window__guide-title {
  margin: 0 0 var(--spacingVerticalS);
  color: var(--colorNeutralForeground1);
  font-size: var(--fontSizeBase600);
  font-weight: var(--fontWeightSemibold);
  line-height: var(--lineHeightBase600);
  text-align: center;
}

.docs-shell-window__guide-grid {
  display: grid;
  gap: var(--spacingHorizontalXXL);
  margin: 0;
  margin-block-start: var(--spacingVerticalXXL);
  padding: 0;
  list-style: none;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
}

/* 与营销内容里的 CTA 卡片同款（同 token、同 hover 三态） */
.docs-shell-window__guide-card {
  display: block;
  padding: var(--spacingVerticalXXL) var(--spacingHorizontalXXL);
  border: var(--strokeWidthThin) solid var(--colorNeutralStroke1);
  border-radius: var(--borderRadiusXLarge);
  background-color: var(--colorNeutralBackground1);
  text-decoration-line: none;
  transition-property: background-color, border-color;
  transition-duration: var(--durationFaster);
  transition-timing-function: var(--curveEasyEase);
}

.docs-shell-window__guide-card:hover {
  border-color: var(--colorBrandStroke1);
  background-color: var(--colorNeutralBackground1Hover);
}

.docs-shell-window__guide-card-title {
  margin: 0 0 var(--spacingVerticalS);
  color: var(--colorNeutralForeground1);
  font-size: var(--fontSizeBase400);
  font-weight: var(--fontWeightSemibold);
  line-height: var(--lineHeightBase400);
}

.docs-shell-window__guide-card-desc {
  margin: 0;
  color: var(--colorNeutralForeground2);
  font-size: var(--fontSizeBase300);
  line-height: var(--lineHeightBase300);
}

/*
 * 移动端降级：不仿桌面（apps/docs/README.md〈WindowsOS 仿真边界〉）。
 *
 * 断点 64rem = 1024px，与 desktop-shell.vue 的 `@media`、`useMediaQuery('(min-width: 64rem)')`
 * 三处同值。
 *
 * 形态：「全屏无边框窗口 + 常驻压缩任务栏」（0.5.7 起任务栏在移动档不再隐藏，
 * 改为压缩常驻 —— 开始按钮常驻、图标区箭头滚动、托盘保时间，见 shell-taskbar.vue）。
 * 因此窗口铺满可视区时**必须为任务栏让出高度**（`calc(100% - var(--shell-taskbar-h))`），
 * 否则底部内容会被任务栏盖住（任务栏底色是半透明的，被盖住的内容会"透"出来更难看）。
 * 标题栏仍保留（图标 + 标题 + caption；chrome 控件已迁去托盘，标题栏此时按
 * `UpdateHeight` 判据为 compact 32，见模板内的注释）。
 *
 * 圆角不在这里归零：`.is-maximized` 已经给了 `border-radius: 0` 的语义，但那条
 * 由 `state.maximized` 驱动，移动档与它无关。这里**不写圆角**——桌面档下窗口的
 * 圆角由 `FluereAppWindow` 按 `maximized` prop 决定，外壳不该越过组件改它的圆角
 * （explorer-layout.md §1：外壳不得再写圆角 / 阴影 / 描边值）。移动档保留 8px 圆角，
 * 与「浮在壁纸上的一个窗口」观感一致，并且不违反版式（无溢出、无重叠）。
 */
@media (max-width: 63.999rem) {
  .docs-shell-window {
    inline-size: 100%;
    /* 铺满宽度、高度为可视区减去常驻任务栏（0.5.7：任务栏移动档常驻） */
    block-size: calc(100% - var(--shell-taskbar-h));
    inset-block-start: 0;
    inset-inline-start: 0;
    margin-inline-start: 0;

    /*
     * 移动档禁用位移：`desktop-shell.vue` 会在退到移动档时把 offset 归零，
     * 这里同时把 transform 钉死，避免极端时序（先 resize、后归零的那一帧）
     * 出现窗口被推出屏幕的闪动。
     */
    transform: none;
  }
}
</style>
