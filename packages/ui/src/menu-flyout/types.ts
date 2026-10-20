import type { Component } from 'vue'

/**
 * MenuFlyout 族的公开类型（Props / 事件载荷 / 枚举）。
 *
 * ## 规格来源
 *
 * microsoft-ui-xaml tag `winui3/release/2.5.1`（本地快照 `temp/winui-src`）：
 *   - 模板与几何：`src/controls/dev/CommonStyles/MenuFlyout_themeresources.xaml`
 *   - 过渡常量：`src/dxaml/xcp/dxaml/lib/MenuPopupThemeTransition_Partial.h`
 *     （`s_OpacityChangeDuration = 83` / `s_OpenDuration = 250`）
 *   - 键盘：`src/dxaml/xcp/components/controls/KeyDownUp/inc/MenuFlyoutKeyPressProcess.h`、
 *     `src/dxaml/xcp/dxaml/lib/MenuFlyoutPresenter_Partial.cpp`、
 *     `src/dxaml/xcp/dxaml/lib/MenuFlyoutSubItem_Partial.cpp`、
 *     `src/dxaml/xcp/dxaml/lib/CascadingMenuHelper.cpp`
 *   - 默认值：`src/dxaml/xcp/dxaml/lib/FlyoutBase_partial.cpp`
 *     （`g_defaultPlacementMode = Top`、`FlyoutMargin = 4`）
 *   - 通用几何：`src/dxaml/xcp/dxaml/themes/generic.xaml`
 *     （`FlyoutThemeMinWidth = 96`、`ControlContentThemeFontSize = 14`）
 *
 * ## 与 WinUI 的命名映射
 *
 * | WinUI | 本库 |
 * | --- | --- |
 * | `MenuFlyout` | `FluereMenuFlyout` |
 * | `MenuFlyoutItem` | `FluereMenuFlyoutItem` |
 * | `MenuFlyoutSubItem` | `FluereMenuFlyoutSubItem` |
 * | `MenuFlyoutSeparator` | `FluereMenuFlyoutSeparator` |
 * | `ToggleMenuFlyoutItem` | `FluereMenuFlyoutToggleItem`（族前缀优先，便于按 MenuFlyout 聚合） |
 * | `FlyoutPlacementMode` | `FluereMenuFlyoutPlacement`（kebab-case，值语义一一对应） |
 *
 * ## 有意不实现（0.6.1 范围外，逐条落文档）
 *
 * - `SplitMenuFlyoutItem` / `RadioMenuFlyoutItem`（0.6.4 SplitButton 自带菜单形态；
 *   Radio 项等 0.7 的 ItemContainer 语义稳定后再评估）；
 * - `MenuFlyout.Items` 集合属性（Vue 侧用子组件 / `v-for` 表达）；
 * - `Command` / `CommandParameter`（Vue 侧用事件回调；与库内其他组件一致）；
 * - `MenuFlyoutPresenter` 作为独立公开组件（内部由根组件渲染）。
 */

/** 浮层相对触发元素的放置方式（对应 WinUI `FlyoutPlacementMode`，kebab-case）。 */
export type FluereMenuFlyoutPlacement =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-edge-aligned-left'
  | 'top-edge-aligned-right'
  | 'bottom-edge-aligned-left'
  | 'bottom-edge-aligned-right'
  | 'left-edge-aligned-top'
  | 'left-edge-aligned-bottom'
  | 'right-edge-aligned-top'
  | 'right-edge-aligned-bottom'

/**
 * 关闭原因。前五条与 `useFlyout` 的 `FlyoutCloseReason` 同名，最后一条是菜单族
 * 独有的「选中条目」路径（WinUI `MenuFlyoutItem::Invoke` 在触发 Click 后主动
 * `owningMenu->Close()`；本库在 `select` 之后按 `closeOnSelect` 关闭）。
 */
export type FluereMenuFlyoutCloseReason =
  | 'escape'
  | 'outside-pointer'
  | 'focus-leave'
  | 'trigger'
  | 'programmatic'
  | 'item-click'

/** 条目被选中时抛给 `FluereMenuFlyout` 的载荷。 */
export interface FluereMenuFlyoutSelectEventArgs {
  /** 条目 `value` Prop 原样回传（便于消费方把菜单项映射回命令） */
  value?: unknown
  /** 条目文本（`text` Prop；默认插槽仅用于渲染，不回填 select 载荷） */
  text?: string
  /** 仅 Toggle 项：选中后的勾选状态 */
  checked?: boolean
}

/** `FluereMenuFlyout` 的 Props。 */
export interface FluereMenuFlyoutProps {
  /**
   * 受控展开状态（`v-model:open`）。不传则内部自管。
   * @default undefined
   */
  open?: boolean
  /** 非受控初始展开状态。 @default false */
  defaultOpen?: boolean
  /**
   * 禁用触发元素的开合（对应 WinUI 的 `IsEnabled` 在触发器上的效果）。
   * 拦触发点击与 `showAt()`；命令式 `open()` 不拦（受控模式下最终仍由 `open` 决定）。
   * @default false
   */
  disabled?: boolean
  /**
   * 无触发器模式下的锚点元素。用于 SplitButton / DropDownButton 这类
   * 「由父组件决定何时弹出」的组件（WinUI `FlyoutBase.ShowAt(target)`）。
   * 传了 `anchor` 时不再渲染默认插槽里的触发元素。
   * @default undefined
   */
  anchor?: HTMLElement | null
  /**
   * 放置方式（对应 `FlyoutBase.Placement`）。缺省值与 WinUI 一致为 `top`；
   * SplitButton 的 A 级实现显式使用 `bottom-edge-aligned-left`。
   * @default 'top'
   */
  placement?: FluereMenuFlyoutPlacement
  /** 与锚点元素的间距（px）。WinUI `FlyoutBase::FlyoutMargin = 4`。 @default 4 */
  sideOffset?: number
  /** 沿边对齐方向的偏移（px）。 @default 0 */
  alignOffset?: number
  /** 菜单面板的可访问名（`role="menu"` 的 `aria-label`）。 @default undefined */
  label?: string
  /** 菜单面板的可访问名引用（优先于 `label`）。 @default undefined */
  labelledby?: string
  /**
   * 选中条目后是否关闭菜单（对应 WinUI `MenuFlyoutItem.Invoke` 的默认行为：
   * 未设置 `PreventDismissOnPointer` 时关闭整个菜单）。
   * @default true
   */
  closeOnSelect?: boolean
  /**
   * 文本方向（`FlowDirection` 的 Web 等价物）。不传时沿用 reka 的全局方向。
   * @default undefined
   */
  dir?: 'ltr' | 'rtl'
}

/** `FluereMenuFlyoutItem` 的 Props。 */
export interface FluereMenuFlyoutItemProps {
  /** 条目文本（对应 `MenuFlyoutItem.Text`）。未传时可只用默认插槽。 @default undefined */
  text?: string
  /** 16×16 前置图标组件（对应 `MenuFlyoutItem.Icon`）。 @default undefined */
  icon?: Component
  /**
   * 加速键文本（对应 `KeyboardAcceleratorTextOverride`）。显示在右端、
   * 12px `CaptionTextBlockStyle`；Web 无「键盘是否接入」的可靠探测，
   * 传了就显示（与 WinUI 仅在硬件键盘存在时显示略有差异，已在组件注释记账）。
   * @default undefined
   */
  keyboardAcceleratorText?: string
  /** 是否禁用（对应 `IsEnabled`）。 @default false */
  disabled?: boolean
  /** 选择载荷（回传给根组件 `select` 事件；不参与 DOM）。 @default undefined */
  value?: unknown
}

/** `FluereMenuFlyoutSubItem` 的 Props。 */
export interface FluereMenuFlyoutSubItemProps {
  /** 条目文本（对应 `MenuFlyoutSubItem.Text`）。 @default undefined */
  text?: string
  /** 16×16 前置图标组件（对应 `MenuFlyoutSubItem.Icon`）。 @default undefined */
  icon?: Component
  /** 是否禁用（对应 `IsEnabled`；禁用时不弹子菜单）。 @default false */
  disabled?: boolean
  /** 子菜单面板的可访问名（对应子 presenter 的 `AutomationProperties.Name`）。 @default undefined */
  label?: string
}

/** `FluereMenuFlyoutToggleItem` 的 Props（对应 WinUI `ToggleMenuFlyoutItem`）。 */
export interface FluereMenuFlyoutToggleItemProps {
  /** 条目文本（对应 `ToggleMenuFlyoutItem.Text`）。 @default undefined */
  text?: string
  /** 16×16 前置图标组件（对应 `ToggleMenuFlyoutItem.Icon`）。 @default undefined */
  icon?: Component
  /** 加速键文本（对应 `KeyboardAcceleratorTextOverride`）。 @default undefined */
  keyboardAcceleratorText?: string
  /** 是否禁用（对应 `IsEnabled`）。 @default false */
  disabled?: boolean
  /** 勾选状态（对应 `IsChecked`，`v-model:checked`）。 @default false */
  checked?: boolean
  /** 选择载荷（回传给根组件 `select` 事件；不参与 DOM）。 @default undefined */
  value?: unknown
}
