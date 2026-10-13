/**
 * FluereAppWindow / FluereCaptionButtons 公共类型契约
 *
 * 设计规范来源：WinUI 3 / Windows App SDK — `TitleBar`
 *   microsoft-ui-xaml `winui3/release/2.0.1`（commit 978ab63，最新 WinUI3 Gallery
 *   发行版 v2.9.3 的 `standalone.props` 里 `WindowsAppSdkPackageVersion=2.0.1`）。
 *   本地快照是 `winui3/release/2.5.1`（commit ba3a8d5），**该控件目录两 tag 有漂移**：
 *   `git diff --stat winui3/release/2.0.1 winui3/release/2.5.1 -- src/controls/dev/TitleBar`
 *   命中 `TitleBar.cpp`(+382) / `TitleBar.h`(+17) / `TitleBar.idl`(+18，新增
 *   `AutoRefreshDragRegions` / `IsDragRegion` / `RecomputeDragRegions`，均 `MUX_PUBLIC_V11`)
 *   / `TitleBar.vcxitems` / `TestUI/*` / `InteractionTests/*` / 新增
 *   `TitleBar_themeresources_perf2026.xaml`(+209)；而 `TitleBar.xaml` 与
 *   `TitleBar_themeresources.xaml` **两 tag 逐字节一致**（不在 diff 里）。
 *   ⇒ 模板与画刷按快照读，**API / 行为一律读 2.0.1**；`perf2026` 与 V11 新 API 不实现
 *   （perf2026 还有两处真 bug：`TitleBarPaneToggleButtonForegroundDisabled` 改名后引用没跟着改、
 *   PaneToggle 的 Disabled 态把背景设到了 16×16 图标上而非按钮底 —— 见 constants.ts）。
 *
 * WinUI 的 `TitleBar` 是**组合控件**，但它**只管标题栏**：
 *   - 它的模板里**没有 caption 按钮**（最小化 / 最大化 / 还原 / 关闭）；这些由系统（AppWindow
 *     → DWM）绘制。源码佐证：`TitleBar_themeresources.xaml` 里 `TitleBarRightPaddingWidth`
 *     在运行期被 `AppWindowTitleBar.RightInset()` 覆盖 —— 即「给系统 caption 区让出宽度」。
 *
 * 映射关系（WinUI → 本库），`TitleBar.idl`（2.0.1）逐项：
 *   Title                          → `title`
 *   Subtitle                       → `subtitle`
 *   IconSource                     → `#icon` 插槽（Web 无 IconSource 对象）
 *   LeftHeader                     → `#left-header` 插槽
 *   Content（`contentproperty`）    → `#titlebar-content` 插槽（标题栏中段，**不是**窗口内容区）
 *   RightHeader                    → `#right-header` 插槽
 *   IsBackButtonVisible (=false)   → `isBackButtonVisible`
 *   IsBackButtonEnabled (=true)    → `isBackButtonEnabled`
 *   IsPaneToggleButtonVisible(=false) → `isPaneToggleButtonVisible`
 *   BackRequested / PaneToggleRequested → `backRequested` / `paneToggleRequested`
 *   TemplateSettings.IconElement   → 不暴露（Web 侧 `#icon` 直接落在 16×16 盒子里）
 *   TitleBarAutomationPeer(Name 回退 Title、ControlType=TitleBar) → 根 `role="group"` +
 *     `aria-label`（缺省取 `title`）
 *   —— 应用内容（WinUI 里是窗口根元素，不属于 TitleBar）→ `#content`（别名 `#default`）
 *
 * 本库扩展（WinUI 侧由系统负责、Web 侧必须由组件承载）：
 *   caption 按钮（`FluereCaptionButtons`）、窗口圆角 / 阴影 / 描边、失活（非前台）态、
 *   标题栏拖拽、双击标题栏。这些的取值来源与证据缺口逐条写在 constants.ts 与
 *   caption-buttons.vue / app-window.vue 的样式注释里。
 *
 * 与 WinUI 的差异（有意为之）：
 *   - `TitleBar` 会真的写窗口标题（`appWindow.Title()`）并在清空时恢复默认标题；Web 侧
 *     `title` 只是渲染值，**不碰 `document.title`**（避免污染文档站 / SSR）。
 *   - 拖拽：WinUI 把整条标题栏设为非客户区、再把可交互元素「抠洞」（`SetRegionRects(
 *     NonClientRegionKind::Passthrough)`）；Web 无对应 API，改为「pointerdown 命中的元素落在
 *     可交互区或 `[data-fui-app-window-drag-exempt]` 内则不拖拽」+ 只抛事件（位置由外部控制）。
 *   - `Icon` 在 WinUI 里走独立的 `NonClientRegionKind::Icon`（右键出系统菜单），**不在**
 *     passthrough 列表里 ⇒ 图标区仍可拖拽；Web 侧保留这一口径（图标区不标记为禁拖）。
 */

import type { FluereLocale } from '@fluere-vue/utils'

/** 标题栏高度档位（对齐 `HeightGroup` 的 `CompactHeight` / `ExpandedHeight`） */
export type FluereAppWindowTitleBarSize = 'compact' | 'expanded'

/** 标题栏中段显示模式（对齐 `DisplayModeGroup` 的 `Expanded` / `Compact`） */
export type FluereAppWindowDisplayMode = 'expanded' | 'compact'

/** 左头与图标之间的间距档位（对齐 `LeftHeaderSpacingGroup`） */
export type FluereAppWindowLeftHeaderSpacing = 'default' | 'negative-inset'

/** caption 按钮的可访问名覆盖（缺省取 `caption-buttons` locale 切片） */
export interface FluereCaptionButtonsLabels {
  /** 最小化按钮可访问名 */
  minimize?: string
  /** 最大化按钮可访问名（`maximized === false` 时使用） */
  maximize?: string
  /** 还原按钮可访问名（`maximized === true` 时使用） */
  restore?: string
  /** 关闭按钮可访问名 */
  close?: string
}

export interface FluereCaptionButtonsProps {
  /**
   * 窗口是否处于最大化状态（`v-model:maximized`）。
   *
   * **本组件不改变窗口几何**：它只用这个状态决定字形（最大化 ↔ 还原）与
   * `update:maximized` 的取值；真正的尺寸变化由消费方（外壳）负责。
   * @default false
   */
  maximized?: boolean

  /** 是否允许最小化（系统口径：false 时隐藏按钮，见组件注释的假设与缺口）@default true */
  isMinimizable?: boolean

  /** 是否允许最大化 / 还原（false 时隐藏按钮）@default true */
  isMaximizable?: boolean

  /** 是否允许关闭（false 时按钮保留但禁用 —— 与最小化 / 最大化不同）@default true */
  isClosable?: boolean

  /**
   * 窗口是否处于前台（对齐 `InputActivationListener.State != Deactivated`）。
   * false 时字形改用失活前景（`TitleBarDeactivatedForegroundBrush` 的语义位）。
   * @default true
   */
  active?: boolean

  /** 覆盖内建可访问名（优先于 locale 切片） */
  labels?: FluereCaptionButtonsLabels

  /** 内建文案的 locale（优先于 `FluereConfigProvider`），缺省 zh-Hans */
  locale?: FluereLocale | string
}

export interface FluereAppWindowProps extends FluereCaptionButtonsProps {
  /** 标题（对应 `Title`）：12px / Normal；空串时整块折叠（对齐 `TitleTextCollapsed`） */
  title?: string

  /** 副标题（对应 `Subtitle`）：12px / Normal，前景比标题弱一档 */
  subtitle?: string

  /** 是否显示返回按钮（对应 `IsBackButtonVisible`，缺省 false） */
  isBackButtonVisible?: boolean

  /** 返回按钮是否可用（对应 `IsBackButtonEnabled`，缺省 true） */
  isBackButtonEnabled?: boolean

  /** 是否显示导航（汉堡）按钮（对应 `IsPaneToggleButtonVisible`，缺省 false） */
  isPaneToggleButtonVisible?: boolean

  /** 是否渲染右上角 caption 按钮（本库扩展；WinUI 里由系统绘制）@default true */
  showCaptionButtons?: boolean

  /**
   * 标题栏是否可拖拽（对齐「整条标题栏属非客户区」的口径）。
   * 只影响是否抛出 drag 系列事件，组件不移动任何元素。
   * @default true
   */
  draggable?: boolean

  /**
   * 拖拽位移是否取整（透传给内部 `useDragRegion.roundToInteger`，缺省 false）。
   *
   * true 时 `dragMove` / `dragEnd` 的 `totalDeltaX/totalDeltaY` 四舍五入为整数，
   * `deltaX/deltaY` 为两次取整后累计值之差 —— 外壳叠加到起点上做 CSS `translate` 时
   * translate 值恒为整数（无亚像素模糊），且不累积取整误差。
   * @default false
   */
  roundToInteger?: boolean

  /**
   * 可访问名（对应 `AutomationProperties.Name`）；缺省回退 `title`
   * （对齐 `TitleBarAutomationPeer::GetNameCore`）。
   */
  label?: string

  /**
   * 组件自有过渡开关。`'auto'`（缺省）时尊重 `prefers-reduced-motion`；
   * `'none'` 时强制关闭（圆角 / 阴影 / 底色切换瞬间完成）。
   */
  motion?: 'auto' | 'none'
}

/** `dragStart` 载荷（坐标均为视口坐标） */
export interface FluereAppWindowDragStartEventArgs {
  /** 触发本次拖拽的 pointerId */
  pointerId: number
  /** 按下点 X */
  clientX: number
  /** 按下点 Y */
  clientY: number
}

/** `dragMove` 载荷 */
export interface FluereAppWindowDragMoveEventArgs {
  /** 本次拖拽的 pointerId */
  pointerId: number
  /** 当前 X */
  clientX: number
  /** 当前 Y */
  clientY: number
  /** 相对**上一次** dragMove 的位移 */
  deltaX: number
  /** 相对**上一次** dragMove 的位移 */
  deltaY: number
  /** 相对 dragStart 的累计位移 */
  totalDeltaX: number
  /** 相对 dragStart 的累计位移 */
  totalDeltaY: number
}

/** `dragEnd` 载荷 */
export interface FluereAppWindowDragEndEventArgs {
  /** 本次拖拽的 pointerId */
  pointerId: number
  /** 抬起 / 取消时的 X */
  clientX: number
  /** 抬起 / 取消时的 Y */
  clientY: number
  /** 相对 dragStart 的累计位移 */
  totalDeltaX: number
  /** 相对 dragStart 的累计位移 */
  totalDeltaY: number
  /** Esc / pointercancel / 失去指针捕获时为 true */
  canceled: boolean
}

/** `titlebarDoubleClick` 载荷 */
export interface FluereAppWindowTitleBarDoubleClickEventArgs {
  /** 双击点 X */
  clientX: number
  /** 双击点 Y */
  clientY: number
}
