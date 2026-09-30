/**
 * FluereInfoBadge 公共类型契约
 *
 * 设计规范来源：WinUI 3 / Windows App SDK — InfoBadge
 *   microsoft-ui-xaml `winui3/release/2.5.1`（commit ba3a8d5，本地快照 temp/winui-src
 *   的 sparse-checkout 未含该目录，故本轮按 §3.2 单文件拉取到 temp/infobadge-src）
 *   已核对版本漂移：`InfoBadge.xaml` / `InfoBadge_themeresources.xaml` / `InfoBadge.idl` /
 *   `InfoBadge.cpp` / `InfoBadge.h` 在 tag `winui3/release/2.0.1`（最新 WinUI3 Gallery
 *   发行版 v2.9.3 所用的 WindowsAppSDK 2.0.1）与 `winui3/release/2.5.1` 之间**逐字节一致**
 *   ⇒ 本地快照即 Gallery 行为基准。Gallery 侧用法见 `WinUI-Gallery` v2.9.3
 *   `WinUIGallery/Samples/InfoBadge/InfoBadgePage.xaml` 与同目录四个 `.txt` 代码片段。
 *
 * 与 WinUI 的对应关系（逐项对齐 `InfoBadge.idl`）：
 *   Value        → `value`（`MUX_DEFAULT_VALUE("-1")`；`>= 0` 显示数字，`< -1` 在 WinUI 抛
 *                  `hresult_out_of_bounds`，Web 侧改为 Prop 校验）
 *   IconSource   → `icon` Prop / `#icon` 插槽（WinUI 传 `IconSource` 对象，Web 侧传组件或插槽）
 *   TemplateSettings.InfoBadgeCornerRadius
 *                → 根节点圆角（`borderRadius` 可覆盖，缺省 = 高度 / 2 ⇒ `borderRadiusCircular`）
 *   TemplateSettings.IconElement
 *                → 由 `IconSource` 解析出的图标元素（本库直接渲染组件）
 *   CornerRadius → `borderRadius`（Control 自带属性；`OnSizeChanged` 只在**消费方没设过**时
 *                  才接管为 `ActualHeight / 2`）
 *   AutomationProperties.Name → `label`（WinUI 侧 InfoBadge 没有 AutomationPeer，实际是挂在
 *                  父级 NavigationViewItem 上的，见 InfoBadgePage.xaml）
 *
 * 六套背景预设（`InfoBadge_themeresources.xaml` 的 Style 键）→ `severity`：
 *   DefaultInfoBadgeStyle            → `accent`（`AccentFillColorDefaultBrush`）
 *   Attention{Dot,Value,Icon}InfoBadgeStyle     → `attention`
 *   Informational{Dot,Value,Icon}InfoBadgeStyle  → `informational`
 *   Success{Dot,Value,Icon}InfoBadgeStyle        → `success`
 *   Caution{Dot,Value,Icon}InfoBadgeStyle        → `caution`
 *   Critical{Dot,Value,Icon}InfoBadgeStyle       → `critical`
 * 每档的 `Dot` / `Value` / `Icon` 三个 Style 只差「是否预置 IconSource」与「是否额外加
 * `Padding=0,4,0,2``」——底色完全相同，故本库合成一个 `severity` Prop：
 * 显示形态仍按 WinUI `InfoBadge.cpp#OnDisplayKindPropertiesChanged` 的三分支实时推导。
 *
 * 类型与 Props 说明集中在这一层：info-badge.vue 只做组合，constants.ts 只放数值常量与
 * Severity → 字形映射。
 */
import type { Component } from 'vue'

/**
 * 背景预设（对应 WinUI `InfoBadge_themeresources.xaml` 里的 Style 键）。
 *
 * - `accent`        `DefaultInfoBadgeStyle` → `AccentFillColorDefaultBrush`
 * - `attention`     `*InfoBadgeStyle` → `SystemFillColorAttentionBrush`
 * - `informational` `*InfoBadgeStyle` → `SystemFillColorSolidNeutralBrush`
 * - `success`       `*InfoBadgeStyle` → `SystemFillColorSuccessBrush`
 * - `caution`       `*InfoBadgeStyle` → `SystemFillColorCautionBrush`
 * - `critical`      `*InfoBadgeStyle` → `SystemFillColorCriticalBrush`
 *
 * 注意 `accent` 与 `attention` 在 WinUI 里是两个不同资源（`AccentFillColorDefaultBrush`
 * = `SystemAccentColor{Dark1,Light2}`、`SystemFillColorAttentionBrush` =
 * `SystemAccentColor{base,Light2}`，亮色主题下取值不同），但**系统强调色在 Web 上取不到**
 * （style-spec §2 的例外条款），本库两者都落到 `--colorCompoundBrandBackground`
 * （Fluent 默认强调色）；语义差异体现在内建字形上（`attention` 预置「星号」）。
 */
export type FluereInfoBadgeSeverity =
  | 'accent'
  | 'attention'
  | 'informational'
  | 'success'
  | 'caution'
  | 'critical'

/**
 * 有内建字形的五档 Severity。
 *
 * `InfoBadge_themeresources.xaml` 只给这五档定义了 `*IconInfoBadgeStyle`（含预置
 * `IconSource`）；`DefaultInfoBadgeStyle`（`accent`）没有对应的 Icon 变体，故不在其中。
 */
export type FluereInfoBadgeIconSeverity = Exclude<FluereInfoBadgeSeverity, 'accent'>

/** 显示形态（对应 `InfoBadge.cpp#OnDisplayKindPropertiesChanged` 的 Dot / Icon / FontIcon / Value 四态） */
export type FluereInfoBadgeDisplayKind = 'dot' | 'value' | 'icon'

export interface FluereInfoBadgeProps {
  /**
   * 徽章数值（对应 WinUI `Value`，`Int32`，缺省 `-1`）。
   *
   * - `>= 0` ⇒ `Value` 形态：徽章内显示该数字（11px，`InfoBadgeValueFontSize`）
   * - `< 0`  ⇒ 回到 `Icon` / `Dot` 形态
   * - `< -1` ⇒ WinUI 会抛 `hresult_out_of_bounds`（"Value must be equal to or greater than -1"）；
   *            本库按 `< 0` 处理（回落到 Icon / Dot 形态），不抛异常
   *
   * WinUI 的 `Value` 是 32 位整数，渲染即 `TextBlock.Text`；本库直接按字符串渲染传入值，
   * 传小数会原样显示（不做四舍五入）。
   * @default -1
   */
  value?: number

  /**
   * 背景预设（见 `FluereInfoBadgeSeverity`）。
   * @default 'accent'
   */
  severity?: FluereInfoBadgeSeverity

  /**
   * 图标（对应 WinUI `IconSource`）。
   *
   * - 传组件（如 `FluentIconAdd16Filled`）⇒ 直接作为图标渲染
   * - 传 `true` ⇒ 采用 `severity` 对应的**内建字形**（对应五个 `*IconInfoBadgeStyle`
   *   预置的 `IconSource`）；`severity === 'accent'` 没有内建字形，此时仍回到 `Dot` 形态
   * - 不传 / 传 `false` / 传 `null` ⇒ 不显示图标（对应 WinUI 未设 `IconSource`）
   *
   * 优先级低于 `#icon` 插槽（插槽用于放任意自定义内容，对应 WinUI 里把 `IconElement`
   * 直接塞进 `TemplateSettings` 的做法）；`value >= 0` 时 `Value` 形态优先，图标不渲染
   * （对齐 `OnDisplayKindPropertiesChanged` 的 if / else if 顺序）。
   */
  icon?: boolean | Component | null

  /**
   * 圆角（对应 Control 自带的 `CornerRadius`）。
   *
   * 不传时对齐 `InfoBadge.cpp#OnSizeChanged`：`CornerRadius = ActualHeight / 2`，
   * 本库用 `--borderRadiusCircular`（全圆角）表达同一几何；传值时按传入值渲染。
   */
  borderRadius?: string

  /**
   * 可访问名（对应 `AutomationProperties.Name`）。
   *
   * WinUI 的 InfoBadge **没有 AutomationPeer**（`Control.OnCreateAutomationPeer` 未重写，
   * UIA 树里不出现），Gallery 的做法是把名字挂在父级 `NavigationViewItem` 上
   * （`AutomationProperties.Name="Inbox, 5 notifications"`）。因此本组件缺省即
   * `aria-hidden="true"`（纯装饰、不抢 Tab 序）；只有在需要独立暴露给 AT 时才传本 Prop，
   * 此时渲染 `role="img"` + `aria-label`。
   */
  label?: string
}
