/**
 * FluereInfoBar 公共类型契约
 *
 * 设计规范来源：WinUI 3 / Windows App SDK — InfoBar
 *   microsoft-ui-xaml `winui3/release/2.5.1`（commit ba3a8d5，本地快照 temp/winui-src）
 *   已核对版本漂移：`git diff --stat winui3/release/2.0.1 winui3/release/2.5.1 --
 *   src/controls/dev/InfoBar` 仅命中 `InfoBar.vcxitems`（多 6 行 Type=StylePerf2026
 *   构建条目），`InfoBar.xaml` / `InfoBar_themeresources.xaml` / `InfoBar.cpp` /
 *   `InfoBar.h` / `InfoBar.idl` / `InfoBarPanel.cpp` / `InfoBarAutomationPeer.cpp`
 *   在 tag `winui3/release/2.0.1`（最新 WinUI3 Gallery 发行版 v2.9.3 所用的
 *   WindowsAppSDK 2.0.1）与 2.5.1 之间逐字节一致 ⇒ 本地快照即 Gallery 行为基准。
 *
 * 与 WinUI 的对应关系（逐项对齐 `InfoBar.idl`）：
 *   IsOpen                  → `open`（`v-model:open`，`MUX_DEFAULT_VALUE("false")`）
 *   Title                   → `title`
 *   Message                 → `message`
 *   Severity                → `severity`（默认 Informational）
 *   IsIconVisible           → `isIconVisible`（默认 true）
 *   IsClosable              → `isClosable`（默认 true）
 *   ActionButton            → `#action` 插槽（WinUI 是 `ButtonBase` 对象，Web 侧用插槽表达）
 *   Content/ContentTemplate → `#content`（别名 `#default`）插槽
 *   IconSource              → `#icon` 插槽（WinUI 是 `IconSource` 对象，Web 侧用插槽表达）
 *   CloseButtonCommand /
 *   CloseButtonCommandParameter → `closeButtonCommand`（点击时回调；参数由闭包携带）
 *   CloseButtonClick / Closing / Closed / Opened → `closeButtonClick` /
 *   `closing`（可取消）/ `closed` / `opened`
 *   CloseButtonStyle        → 不暴露（Web 侧样式固定，见组件内注释）
 *   AutomationProperties.Name → `label`
 *
 * 类型与 Props 说明集中在这一层：infobar.vue 只做组合，纯逻辑模块
 * （constants / layout / use-infobar-layout）反向依赖本文件。
 */

/** 严重级别（对应 WinUI `InfoBarSeverity`，成员顺序一致） */
export type FluereInfoBarSeverity = 'informational' | 'success' | 'warning' | 'error'

/**
 * 关闭原因（对应 WinUI `InfoBarCloseReason`）
 * - `closeButton`  用户点击关闭按钮（`IsOpen` 被置为 false 之后抛 `Closing`）
 * - `programmatic` 代码直接设置 `IsOpen`（含父组件改 `open`、`IsOpen` 重置时的默认值）
 */
export type FluereInfoBarCloseReason = 'closeButton' | 'programmatic'

/** `closing` 事件载荷（对应 WinUI `InfoBarClosingEventArgs`） */
export interface FluereInfoBarClosingEventArgs {
  /** 本次关闭的原因 */
  reason: FluereInfoBarCloseReason
  /**
   * 置为 true 可取消本次关闭：组件会把 `open` 回滚为 true
   * （对应 WinUI `InfoBarClosingEventArgs.Cancel`）
   */
  cancel: boolean
}

/** `closed` 事件载荷（对应 WinUI `InfoBarClosedEventArgs`） */
export interface FluereInfoBarClosedEventArgs {
  /** 本次关闭的原因 */
  reason: FluereInfoBarCloseReason
}

export interface FluereInfoBarProps {
  /**
   * 是否展开（`v-model:open`）。对应 WinUI `IsOpen`，缺省 false（`MUX_DEFAULT_VALUE("false")`）；
   * 置为 false 时内容整体 `display: none`（对齐模板里 `InfoBarCollapsed` 把
   * `ContentRoot.Visibility` 设为 `Collapsed`），并依次抛出 `closing` / `closed`。
   */
  open?: boolean

  /**
   * 标题（对应 WinUI `Title`）：14px / SemiBold，与 `message` 在同一排版容器里，
   * 横排时左右相邻、竖排时上下堆叠。
   */
  title?: string

  /**
   * 正文（对应 WinUI `Message`）：14px / Normal，`TextWrapping=WrapWholeWords`。
   */
  message?: string

  /**
   * 严重级别（对应 WinUI `Severity`）：决定底色、圆心底色、图标字形与图标前景色
   * @default 'informational'
   */
  severity?: FluereInfoBarSeverity

  /**
   * 是否显示图标（对应 WinUI `IsIconVisible`）。置为 false 时图标列塌陷，
   * `title` / `message` 左移到 16px（对齐 `NoIconVisible` 状态）
   * @default true
   */
  isIconVisible?: boolean

  /**
   * 是否显示关闭按钮（对应 WinUI `IsClosable`）
   * @default true
   */
  isClosable?: boolean

  /**
   * 可访问名称（对应 `AutomationProperties.Name`）。
   *
   * WinUI 的 InfoBar 是 `ControlType=StatusBar` 的 UIA landmark（`LandmarkType=Custom` +
   * `IsDialog=True`），并会在打开 / 关闭时用本地化的「severity + title + message」
   * 发 UIA 通知；本库暂无组件内建文案通道（i18n 属 0.3.0 目标 1.4），故可访问名由
   * 消费方通过本 Prop 提供，组件不硬编码任何自然语言。
   */
  label?: string

  /**
   * 关闭按钮的可访问名（WinUI 取资源 `InfoBarCloseButtonName`，英文为 "Close"）。
   * 不传则该属性不渲染，由消费方自行本地化。
   */
  closeButtonLabel?: string

  /**
   * 关闭按钮的原生提示（WinUI 取资源 `InfoBarCloseButtonTooltip`，英文为 "Close"）。
   * 不传则不渲染 `title`。
   */
  closeButtonTooltip?: string

  /**
   * 关闭按钮点击回调（对应 WinUI `CloseButtonCommand`）。
   *
   * 时序与 WinUI 一致：先执行本回调，再把 `open` 置为 false，随后抛 `closing`；
   * 若 `closing` 被取消，`open` 回滚为 true（此时本回调**不会**被再次调用）。
   */
  closeButtonCommand?: () => void
}
