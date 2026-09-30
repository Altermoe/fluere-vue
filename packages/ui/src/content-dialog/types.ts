/**
 * FluereContentDialog 公共类型契约
 *
 * 设计规范来源：WinUI 3 / Windows App SDK
 *   microsoft-ui-xaml `winui3/release/2.5.1`（commit ba3a8d5，本地快照 temp/winui-src）
 *   已核对与最新 WinUI3 Gallery 发行版 v2.9.3 所用 WindowsAppSDK 2.0.1 的关系：
 *   本轮读取的文件来自 2.5.1 快照，判定「无行为漂移」的口径与 InfoBar 条目一致
 *   （对目标控件目录做两 tag 间 diff，只允许构建工程文件差异）。
 *
 * 与 WinUI 的对应关系（逐项对齐 `ContentDialog` 的公共成员）：
 *   ShowAsync / Hide        → `v-model:open`（受控开关）+ `closed` 事件带回结果
 *   Title / TitleTemplate   → `title` Prop 与 `#title` 插槽
 *   Content / ContentTemplate → 默认插槽（`#default`）
 *   PrimaryButtonText       → `primaryButtonText`
 *   SecondaryButtonText     → `secondaryButtonText`
 *   CloseButtonText         → `closeButtonText`
 *   IsPrimaryButtonEnabled  → `isPrimaryButtonEnabled`（默认 true）
 *   IsSecondaryButtonEnabled → `isSecondaryButtonEnabled`（默认 true）
 *   DefaultButton           → `defaultButton`（默认 `'none'`）
 *   FullSizeDesired         → `fullSizeDesired`（默认 false）
 *   Opened                  → `opened`
 *   Closing（可 Cancel）    → `closing`（`args.cancel = true` 取消关闭）
 *   Closed                  → `closed`（`args.result`）
 *   PrimaryButtonClick / SecondaryButtonClick / CloseButtonClick
 *                           → `primaryButtonClick` / `secondaryButtonClick` / `closeButtonClick`
 *   PrimaryButtonCommand / SecondaryButtonCommand / CloseButtonCommand
 *                           → 不暴露：点击事件 + 消费方处理器已覆盖同一时序
 *                             （WinUI 也是「先抛事件、未被 Cancel 再执行 Command」）
 *   PrimaryButtonStyle / SecondaryButtonStyle / CloseButtonStyle
 *                           → 不暴露：三个按钮统一样式，仅按 DefaultButton 切换强调态
 *   AutomationProperties.Name → `ariaLabel`（仅在未提供 title 时作为可访问名）
 *   XamlRoot                → `to`（Web 侧门户目标；WinUI 由 XamlRoot / 窗口决定）
 *   不能与同一父节点下的另一个 Popup 弹窗共存（ContentDialogMetadata 断言）
 *                           → Web 侧不做强约束（同一容器内可叠放，由消费方负责）
 *
 * 类型与 Props 说明集中在这一层：content-dialog.vue 只做组合，纯逻辑模块
 * （button-layout / focus / use-content-dialog）反向依赖本文件。
 */

/** 关闭结果（对应 WinUI `ContentDialogResult`，成员与取值顺序一致） */
export type FluereContentDialogResult = 'none' | 'primary' | 'secondary'

/** 默认按钮（对应 WinUI `ContentDialogButton`） */
export type FluereContentDialogButton = 'none' | 'primary' | 'secondary' | 'close'

/** 命令区里真实存在的三个按钮位（`none` 不属于按钮位） */
export type FluereContentDialogButtonKind = 'primary' | 'secondary' | 'close'

/**
 * 命令区按钮可见性状态（对应 WinUI 模板的 `ButtonsVisibilityStates` 状态组）。
 * 由三个按钮文案是否为空实时推导（`ContentDialog_Partial.cpp#ChangeVisualState`）。
 */
export type FluereContentDialogButtonVisibility =
  | 'all'
  | 'none'
  | 'primary'
  | 'secondary'
  | 'close'
  | 'primary-secondary'
  | 'primary-close'
  | 'secondary-close'

/** `closing` 事件载荷（对应 WinUI `ContentDialogClosingEventArgs`） */
export interface FluereContentDialogClosingEventArgs {
  /** 本次关闭将要产生的返回值 */
  result: FluereContentDialogResult
  /** 置为 true 取消本次关闭（组件保持打开） */
  cancel: boolean
}

/** `closed` 事件载荷（对应 WinUI `ContentDialogClosedEventArgs`） */
export interface FluereContentDialogClosedEventArgs {
  /** 本次关闭的最终返回值 */
  result: FluereContentDialogResult
}

/** 三个按钮点击事件共用的载荷（对应 WinUI `ContentDialogButtonClickEventArgs`） */
export interface FluereContentDialogButtonClickEventArgs {
  /**
   * 置为 true 阻止本次点击继续关闭弹窗
   * （对应 WinUI 的 `args.Cancel`；本库为同步标志，不做异步 Deferral）
   */
  cancel: boolean
}

/** FluereContentDialog 组件 Props 契约 */
export interface FluereContentDialogProps {
  /**
   * 是否显示（受控，配合 `v-model:open`）
   * @default false
   */
  open?: boolean

  /**
   * 标题（对应 `Title`）。为空且未提供 `#title` 插槽时，标题行折叠
   * （对齐 `UpdateTitleSpaceVisibility`）
   */
  title?: string

  /**
   * 主按钮文案（对应 `PrimaryButtonText`）。为空则不渲染主按钮
   */
  primaryButtonText?: string

  /**
   * 次按钮文案（对应 `SecondaryButtonText`）。为空则不渲染次按钮
   */
  secondaryButtonText?: string

  /**
   * 关闭按钮文案（对应 `CloseButtonText`）。为空则不渲染关闭按钮
   */
  closeButtonText?: string

  /**
   * 主按钮是否可用（对应 `IsPrimaryButtonEnabled`）
   * @default true
   */
  isPrimaryButtonEnabled?: boolean

  /**
   * 次按钮是否可用（对应 `IsSecondaryButtonEnabled`）
   * @default true
   */
  isSecondaryButtonEnabled?: boolean

  /**
   * 默认按钮（对应 `DefaultButton`）：获得强调样式，并作为 Enter 的激活目标。
   * WinUI 的焦点规则：焦点落在命令区且不在该按钮上时，强调态会消失
   * @default 'none'
   */
  defaultButton?: FluereContentDialogButton

  /**
   * 是否占满内容区高度（对应 `FullSizeDesired` → `FullDialogSizing`：
   * 模板把 `BackgroundElement.VerticalAlignment` 置为 Stretch）
   * @default false
   */
  fullSizeDesired?: boolean

  /**
   * 无标题时的可访问名（对应 `AutomationProperties.Name`）。
   * 提供了 `title` / `#title` 时由标题承担可访问名，本 Prop 被忽略
   */
  ariaLabel?: string

  /**
   * 门户目标（Web 侧替代 WinUI 的 `XamlRoot`）：弹窗与遮罩层挂到该节点
   * @default 'body'
   */
  to?: string | HTMLElement
}
