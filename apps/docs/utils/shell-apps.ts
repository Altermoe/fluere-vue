/**
 * 仿真应用注册表（0.5.9「仿真应用系统」的**元数据单一事实源**）。
 *
 * 一个「仿真应用」= 桌面上的一个应用身份 = 一扇窗口（`shell-window-host.vue`）+ 一份窗口内容
 * （`ui-gallery-window.vue` / `render-lab-window.vue`）。本模块只放**身份与呈现元数据**
 * （id / 标题 key / 副标题 key / 图标），不放组件、不放文案、不放状态：
 *
 *  - 不放组件：内容分派写在 `shell-window-host.vue` 的**字面量分支**里 —— AGENTS.md〈交互与
 *    弹层组件约定〉记着实测结论「`<component :is>` 分支上的事件不可靠转发」，宿主用两条
 *    字面量分支把两个应用的事件显式转译；加应用 = 加一条分支 + 一条注册表条目。
 *  - 不放文案：`t()` 的入参是消息 key 联合类型，传进 util 需要放宽成 `(key: string) => string`
 *    （逆变不兼容，vue-tsc 会报错）；消费方自己 `t(app.titleKey)` 一次即可，key 仍是类型安全的
 *    （与 `utils/shell-views.ts` 同一口径）。
 *  - 不放状态：窗口状态在 `utils/shell-window-state.ts`（纯函数，可在 vitest 里单测）。
 *
 * ## 顺序即「已固定」顺序
 *
 * 数组顺序 = 任务栏图标区顺序 = 开始菜单「已固定」顺序（与实机一致：固定顺序稳定，
 * 不随打开 / 焦点变化重排）。**不要**按最近使用重排。
 *
 * ## 为什么第二项是 Render Lab（WebGL2 彩色三角）
 *
 * 多窗口的层级与焦点切换必须有**第二扇窗口**才谈得上验收（单窗口下 z 序永不变化）。
 * Render Lab 是本期的最小第二应用：一个独立窗口（标题栏 + canvas），内容是一次
 * WebGL2 绘制，后续会长成重应用（见组件注释）。
 *
 * ## 归属
 *
 * 应用级组合（apps/docs/README.md〈构件归属〉），**不进** `@fluere-vue/ui`。
 */
import { FluentIconCube24Regular, FluentIconGrid24Regular } from '@fluere-vue/icons'
import type { Component } from 'vue'

/** 仿真应用标识（窗口状态 / z 序 / 入口都以它为键） */
export type ShellAppId = 'ui-gallery' | 'render-lab'

/** 应用标题消息 key（存在于 `i18n/locales/*.json` 的 `shell.apps.*`） */
export type ShellAppTitleKey = 'shell.apps.uiGallery.title' | 'shell.apps.renderLab.title'

/** 应用副标题消息 key（窗口标题栏第二行，与桌面壁纸外的仿真边界文案无关） */
export type ShellAppSubtitleKey = 'shell.apps.uiGallery.subtitle' | 'shell.apps.renderLab.subtitle'

/** 一个仿真应用的静态定义 */
export interface ShellAppDefinition {
  /** 应用 id（窗口管理器状态机的键） */
  id: ShellAppId
  /** 窗口标题 / 任务栏提示 / 开始菜单条目共用的标题 key */
  titleKey: ShellAppTitleKey
  /** 窗口标题栏副标题 key */
  subtitleKey: ShellAppSubtitleKey
  /** 窗口图标 / 任务栏入口图标 / 开始菜单条目图标（同一枚，避免三处漂移） */
  icon: Component
}

/** UI Gallery：组件库画廊（0.5.5–0.5.8 的「Explorer 窗口」就是它，0.5.9 起成为独立应用） */
const UI_GALLERY: ShellAppDefinition = {
  id: 'ui-gallery',
  titleKey: 'shell.apps.uiGallery.title',
  subtitleKey: 'shell.apps.uiGallery.subtitle',
  icon: FluentIconGrid24Regular,
}

/**
 * Render Lab：WebGL2 渲染演示（本期 = 一个持续旋转的彩色三角）。
 *
 * 图标选 `FluentIconCube24Regular`：立方体是图形 / 3D 渲染最常见的语义载体
 * （备选 `FluentIconTriangle24Regular` 更贴内容但语义偏窄，内容长大后就不再贴切）。
 */
const RENDER_LAB: ShellAppDefinition = {
  id: 'render-lab',
  titleKey: 'shell.apps.renderLab.title',
  subtitleKey: 'shell.apps.renderLab.subtitle',
  icon: FluentIconCube24Regular,
}

/** 桌面进入时的默认应用（唯一一个「已打开」窗口） */
export const SHELL_DEFAULT_APP_ID: ShellAppId = 'ui-gallery'

/** 全部仿真应用（顺序 = 任务栏固定顺序 = 开始菜单已固定顺序） */
export const SHELL_APPS: readonly ShellAppDefinition[] = [UI_GALLERY, RENDER_LAB]

/**
 * 按 id 取应用定义。
 *
 * 兜底返回默认应用而不是 `undefined`：id 是**字面量联合类型**，编译期已排除非法值；
 * 运行期走到兜底只可能是数据被外部改写，此时「返回一个可渲染的应用」比让整桌面炸掉好。
 */
export function findShellApp(id: ShellAppId): ShellAppDefinition {
  return SHELL_APPS.find((app) => app.id === id) ?? UI_GALLERY
}

/** 全部应用 id（窗口管理器初始化用；顺序与 `SHELL_APPS` 一致） */
export const SHELL_APP_IDS: readonly ShellAppId[] = SHELL_APPS.map((app) => app.id)
