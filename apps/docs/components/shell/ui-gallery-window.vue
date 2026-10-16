<script setup lang="ts">
/**
 * UI Gallery 应用的**窗口内容**（0.5.9；此前叫 `explorer-window.vue`）。
 *
 * 结构 = 窗口内的 `FluereNavigationView`（导航面板）+ `FluereTabView`（视图切换），
 * 三个视图：首页（与站点主页共用营销内容）、组件（注册表卡片网格）、指南（两个起步入口）。
 * 对应 0.5.0 里程碑「能打开一个空 Explorer 窗口，导航可折叠、视图可切换」。
 *
 * ## 职责边界（0.5.9 拆分后）
 *
 * | 事项                                   | 归谁                                  |
 * | -------------------------------------- | ------------------------------------- |
 * | 窗口框体（标题栏 / caption / 圆角阴影） | `FluereAppWindow`（`@fluere-vue/ui`） |
 * | 窗口位置 / 尺寸 / 层级 / 拖拽 / 焦点    | `shell-window-host.vue`（每窗口一个） |
 * | 视图清单（id / 图标 / 标题 key）        | `utils/shell-views.ts`                |
 * | 窗口状态（标签 / 形态）                 | `utils/shell-window-state.ts`（纯函数）|
 * | **本组件**                              | 导航面板 + 标签条 + 三个视图的内容      |
 *
 * `explorer-layout.md` §1 明文裁定：**外壳负责几何，组件只负责圆角 / 阴影归零**。
 * 0.5.9 之前框体与几何都在这里，多窗口后每扇窗口都需要同一份几何 —— 于是几何上移到
 * `shell-window-host.vue`（挂 `docs-shell-window--<appId>`），几何规则统一在
 * `apps/docs/assets/docs-shell.css`，本组件只留内容。窗口的圆角 / 阴影仍不在这里写：
 * `maximized` prop 会让 `FluereAppWindow` 自己归零。
 *
 * ## 四条实测得来的实现约束（不要"顺手优化"掉）
 *
 * ① **`FluereNavigationView` 根上写 `h-[...]` 无效**：组件根自带 `block-size: 100%`
 *    （选择器 `.fui-navigation-view[data-v-*]`，特异性 0,2,0），压过 UnoCSS 的
 *    `.h-[320px]`（0,1,0）。正确做法是**给它一个确定高度的父容器**，让它 `100%` 撑满
 *    —— 见 `.docs-shell-window__body` 的 `flex: 1 1 auto; min-block-size: 0`
 *    与组件上的 `flex-1 min-h-0`。
 * ② **三个组件的根都不写 `position`**（实测 `static`）：需要定位上下文时必须自己包一层
 *    （0.5.9 起由 `shell-window-host.vue` 的宿主包装承担）。
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
 * `maximize` / `restore`（见 caption-buttons.vue `onMaximizeRestore`）。宿主
 * （`shell-window-host.vue`）**只认 `v-model:maximized`**，另两个语义事件不接 ——
 * 否则一次点击会改两次状态。
 *
 * `FluereTabView` **只抛事件不删数据**（`tabCloseRequested` / `addTabButtonClick`），
 * 删哪个、关完选谁由窗口管理器决定（见 utils/shell-window-state.ts）。
 *
 * ## SSR：本组件处于 ClientOnly 边界之内
 *
 * 桌面仿真的挂载点是 `/os` 的 `<ClientOnly>`（原则见 docs/ssr-guide.md
 * 〈文档站桌面仿真的 ClientOnly 边界〉），因此**本组件不做任何 SSR 检查**，
 * 也不需要为「服务端没有视口 / 没有 DOM」写兜底。组件库（`packages/ui`）不受此豁免。
 */

import { FluentIconDocument24Regular } from '@fluere-vue/icons'
import {
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
import { SHELL_DEFAULT_TAB_ID, isBlankTab } from '~/utils/shell-window-state'
import type { ShellTabId, ShellWindowState } from '~/utils/shell-window-state'

/*
 * 关于 `FLUERE_NAVIGATION_SETTINGS_VALUE`：那是组件库导出给消费方判断「选中的是不是
 * 内置设置项」的保留哨兵值。本外壳**关闭内置设置项**（`:is-settings-visible="false"`，
 * 理由见下方模板注释），因此不需要它 —— 这里不 import，避免出现"导入了却没用"的噪音。
 */

const props = defineProps<{
  /** 本应用的窗口状态（由 `desktop-shell.vue` 的窗口管理器持有） */
  state: ShellWindowState
}>()

const emit = defineEmits<{
  /** 打开 / 切换标签请求 */
  openTab: [tab: ShellTabId]
  /** 关闭标签请求 */
  closeTab: [tab: ShellTabId]
  /** 切换激活标签请求 */
  selectTab: [tab: ShellTabId]
  /** 新建标签请求（TabView 的新建按钮） */
  addTab: []
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

/** 窗口内视图定义：标签 id → 标题 / 图标 */
interface ShellView {
  id: ShellTabId
  title: string
  icon: Component
}

/**
 * 导航面板的条目（数据源 = 站点信息架构，不复制一份硬编码清单）。
 *
 * 静态定义（id / 图标 / 标题 key）收敛在 `~/utils/shell-views` —— 本应用的导航面板与
 * 标签条共用同一份（0.5.9 起任务栏 / 开始菜单改为**应用级**入口，不再消费视图清单）。
 *
 * 条目刻意只有三项 —— 每一项目前都有**真实内容**（首页 = 营销页、组件 = 注册表卡片网格、
 * 指南 = 起步入口）。不为了"看起来像 Explorer"补空壳条目：空条目点开只有一句
 * 「暂无内容」，那是把仿真做成了装饰。剩余信息架构的去向：
 *  - 搜索 → 0.6 的 `Ctrl+K` 命令面板（docs/todo.md 2.3），本应用不放假搜索按钮；
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
    窗口内容区（`FluereAppWindow` 的默认插槽 = 它的 `__content`）：链式高度的中间一环。
    `FluereAppWindow` 的 `__content` 是 `flex: 1 1 auto; display: flex; flex-direction: column;
    overflow: clip` —— 高度确定、内部滚动交给消费方，因此这里只需把下一层撑满 +
    `min-block-size: 0`（否则 flex 子项不收缩，内部滚动区撑破窗口）。
  -->
  <div class="docs-shell-window__body">
    <!--
      `FluereNavigationView`：面板开合受控（外壳持有状态），`pane-display-mode="auto"`
      走缺省阈值（≥1008 Expanded / 收窄 Compact），与 explorer-layout.md §3 的假设一致
      —— 外壳不干预 DisplayMode。

      `pane-title` 用**应用名**（0.5.9 起窗口属于某个应用，导航面板标题不再是写死的
      「Explorer」；消息 key 见 utils/shell-apps.ts）。

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
      :pane-title="t('shell.apps.uiGallery.title')"
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
                  视图内容属于「知道有哪些标签」的这一层，页面层只负责挂外壳
                  （见 pages/os/index.vue 的文件头）。
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
</template>

<style scoped>
/* ------------------------------------------------------------------ */
/* 视觉值一律引用 token 或 --shell-* / --fui-* 局部变量。                */
/* 窗口的几何（位置 / 尺寸 / 最大化 / 移动档）与圆角 / 阴影 / 描边都不在   */
/* 本层写：前者在 assets/docs-shell.css（宿主挂载点决定），后者属于        */
/* `FluereAppWindow`（explorer-layout.md §1：外壳不得再写圆角 / 阴影 /    */
/* 描边值）。                                                           */
/* ------------------------------------------------------------------ */

/* 窗口内容区：链式高度的中间一环（宿主包装 → 本元素 → 导航视图 → 标签 → 滚动区） */
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
  /* flex-1 / min-h-0 由模板工具类提供；这里只补 `display`（与组件根同向的 flex 容器） */
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
</style>
