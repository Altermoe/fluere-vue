/**
 * 窗口视图（标签）的**数据源**（0.5.7 抽出）—— id / 图标 / 标题 key 的单一事实源。
 *
 * 消费方有三处，此前各自维护一份同样的三行清单（会漂移）：
 *  1. `components/shell/explorer-window.vue`：导航面板与标签条（视图 = 标签）；
 *  2. `components/shell/shell-taskbar.vue`：任务栏中间的固定入口；
 *  3. `components/shell/shell-start-menu.vue`：开始菜单「已固定」条目。
 *
 * 只放 **id / 图标 / 消息 key**，不放文案本身：`t()` 的入参类型是消息 key 联合，
 * 把它传进 util 需要放宽成 `(key: string) => string`（逆变不兼容，vue-tsc 会报错）；
 * 消费方自己 `t(view.titleKey)` 一次即可，key 仍是类型安全的。
 *
 * 为什么「首页 / 组件 / 指南」三项就是全部（不补设计令牌 / 路线图）：
 * 每一项都要有**真实内容**才配进清单（explorer-window.vue 既有口径：空条目 =
 * 把仿真做成装饰）；设计令牌页与路线图页尚不存在（docs/todo.md 2.4 未做）。
 * 页面落地后在此追加，并同步三处消费方的滚动 / 溢出实测。
 */
import {
  FluentIconDocument24Regular,
  FluentIconGrid24Regular,
  FluentIconHome24Regular,
} from '@fluere-vue/icons'
import type { Component } from 'vue'
import { SHELL_DEFAULT_TAB_ID } from './shell-window-state'
import type { ShellTabId } from './shell-window-state'

/** 视图标题的消息 key（均存在于 `i18n/locales/*.json` 的 `shell.tabs.*`） */
export type ShellViewTitleKey = 'shell.tabs.home' | 'shell.tabs.components' | 'shell.tabs.guide'

/** 一个窗口视图的静态定义 */
export interface ShellViewDefinition {
  /** 标签 id（状态机用） */
  id: ShellTabId
  /** 标题消息 key（消费方自行 `t()`） */
  titleKey: ShellViewTitleKey
  /** 侧栏 / 标签 / 固定入口共用的图标组件 */
  icon: Component
}

/** 全部窗口视图（顺序即导航面板与固定入口的顺序） */
export const SHELL_VIEWS: readonly ShellViewDefinition[] = [
  { id: SHELL_DEFAULT_TAB_ID, titleKey: 'shell.tabs.home', icon: FluentIconHome24Regular },
  { id: 'components', titleKey: 'shell.tabs.components', icon: FluentIconGrid24Regular },
  { id: 'guide', titleKey: 'shell.tabs.guide', icon: FluentIconDocument24Regular },
]
