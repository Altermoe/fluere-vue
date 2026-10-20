/**
 * FluereSplitButton / FluereToggleSplitButton 公共类型契约
 *
 * 规格来源：microsoft-ui-xaml tag `winui3/release/2.5.1`（commit `ba3a8d5`，本地快照
 * `temp/winui-src`）：
 *   - `src/controls/dev/SplitButton/SplitButton.idl`（公共成员）、`SplitButton.cpp`
 *     （键盘 / 状态机 / 浮层开关）、`SplitButtonAutomationPeer.cpp`（UIA 模式）、
 *     `SplitButton.xaml`（模板与状态组）、`SplitButton_themeresources.xaml`（画刷 / 几何）；
 *   - `src/controls/dev/SplitButton/ToggleSplitButton.cpp`（`IsChecked` 与主区点击的
 *     先后顺序：先 `Toggle()` 再抛 `Click`）；
 *   - `src/controls/dev/SplitButton/Strings/{en-us,zh-CN}/Resources.resw`
 *     （箭头区可访问名 `More Options` / `更多选项`）。
 *
 * 与 WinUI 公共成员的对应：
 *   Flyout                   → `#flyout` 插槽（菜单内容）+ 内建 `FluereMenuFlyout`
 *                              （锚点模式；见 `./split-button-base.vue` 文件头的接入说明）。
 *                              未传 `#flyout` 时箭头区点击为 no-op —— 对齐
 *                              `SplitButton.cpp#OpenFlyout` 在 `GetFlyout() == null` 时
 *                              直接返回的分支。
 *   Command / CommandParameter → 不暴露：Vue 侧以 `click` 事件 + 消费方处理器覆盖同一时序
 *                              （与 `FluereContentDialog` 对 Command 的裁定一致）
 *   Click                    → `click`
 *   IsChecked                → `checked`（`v-model:checked`，受控；对齐本库 `FluereToggleButton`
 *                              的受控口径，点击只抛 `update:checked`）
 *   IsCheckedChanged         → `isCheckedChanged`（载荷为新值）
 *   Flyout.Opened/Closed     → `opened` / `closed`（本库把浮层内建后的等价事件上提）
 *   MenuFlyout `select`      → `select`（0.6.1 `MenuFlyout` 接入后新增：条目被激活时
 *                              冒泡到 SplitButton，便于 `v-for` 动态条目统一处理）
 *   AutomationProperties.Name → `label`（主区）/ `secondaryLabel`（箭头区，缺省走 locale）
 *
 * 有意与 WinUI 不同的两处（均写在组件文件头）：
 *   1. 键盘 / 焦点：WinUI 整个控件只有一个 Tab stop（内层按钮 `IsTabStop=False`），箭头区
 *      只能靠鼠标或 `Alt+Down` / `F4` 到达；本库按 WAI-ARIA APG 的 split button 模式把
 *      主区与箭头区做成**两个各自可 Tab 的 button**（todo 0.6.4 验收要求「各自可达」），
 *      同时保留 WinUI 的全部快捷键。逐元素焦点环由共享原语 `useFocusVisual` 提供。
 *   2. 浮层内部：WinUI 的 `FlyoutBase` 自带 Popup / 焦点管理；本库 0.6.1 起把
 *      `#flyout` 内容交给 `FluereMenuFlyout`（锚点模式）承载 —— 菜单语义、键盘导航、
 *      开合动效与层级都由菜单族负责，SplitButton 只负责「何时开 / 关」与触发区 aria。
 */
import type { FluereLocale } from '@fluere-vue/utils'
import type {
  FluereMenuFlyoutCloseReason,
  FluereMenuFlyoutSelectEventArgs,
} from '../menu-flyout/types'

/** `select` 事件的载荷（与 `FluereMenuFlyout` 的条目选中载荷同构） */
export type FluereSplitButtonSelectEventArgs = FluereMenuFlyoutSelectEventArgs

/** `#flyout` 插槽提供的上下文（等价 WinUI 里对 `Flyout.Hide()` 的访问） */
export interface FluereSplitButtonFlyoutSlotProps {
  /**
   * 关闭浮层；`reason` 语义同 `FluereMenuFlyout.close()`（默认 `programmatic`）。
   * 通常不需要手动调用：`FluereMenuFlyoutItem` 被激活后菜单会自行关闭。
   */
  close: (reason?: FluereMenuFlyoutCloseReason) => void
}

/** SplitButton 的 Props 契约（ToggleSplitButton 在其上追加 `checked`） */
export interface FluereSplitButtonProps {
  /**
   * 是否禁用（对应 `IsEnabled`）。禁用时主区与箭头区都不可点、不打开浮层
   * @default false
   */
  disabled?: boolean

  /**
   * 主区可访问名（对应 `AutomationProperties.Name`）。不传时由默认插槽文本提供；
   * 纯图标主区必须传
   */
  label?: string

  /**
   * 箭头区可访问名（对应上游 `SplitButtonSecondaryButtonName`）。
   * 缺省取 locale 切片里的「更多选项 / More Options」；同时用作菜单面板的 `aria-label`
   */
  secondaryLabel?: string

  /**
   * 浮层展开状态（受控）。`undefined` 时组件自管；传值时只认 Prop
   * （配合 `v-model:open`）
   */
  open?: boolean

  /**
   * 箭头区 `aria-haspopup`（决定读屏对浮层类型的播报）。
   * 0.6.1 起 `#flyout` 内容由内建 `FluereMenuFlyout` 承载，缺省即 `'menu'`；
   * 仅当消费方在 `#flyout` 里放了非菜单内容（例如表单）时才需要显式改成
   * `'dialog'` / `'listbox'` 等。
   * 不提供 `boolean` 形态：ARIA 的 `aria-haspopup="true"` 等价于菜单，
   * 直接用 `'menu'` 更明确。也**不要**改成含 `boolean` 的联合 / `Exclude<…, boolean>`
   * —— Vue 的 SFC 编译器会据此给 Prop 加 Boolean 运行时类型，未传时被转成 `false`
   * 并覆盖缺省值（2026-10-20 首次跑测试抓到）。
   * @default 'menu'
   */
  hasPopup?: 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog'

  /** 主区原生 button 类型（对应主区提交表单的场景）；箭头区恒为 `button` */
  type?: 'button' | 'submit' | 'reset'

  /**
   * 本组件内建文案（箭头区缺省可访问名）的 locale，优先于 `FluereConfigProvider`，
   * 缺省内置 zh-Hans。归一由 `@fluere-vue/utils` 完成（`zh-CN` / `zh` 落到 `zh-Hans`）
   */
  locale?: FluereLocale | string
}

/** ToggleSplitButton 的 Props 契约（追加受控勾选状态） */
export interface FluereToggleSplitButtonProps extends FluereSplitButtonProps {
  /**
   * 勾选状态（对应 `ToggleSplitButton.IsChecked`，受控）。
   * 主区点击只抛 `update:checked`，由消费方写回
   * @default false
   */
  checked?: boolean
}

/**
 * 内部基座 Props：两个公开组件共用同一套模板与状态机。
 *
 * `toggleable` 只用于内部基座区分「主区点击是否切换勾选」，**不**对外暴露 ——
 * 公开 API 用两个独立组件表达 WinUI 的两个 runtimeclass（`SplitButton` /
 * `ToggleSplitButton`），避免在 `FluereSplitButton` 上出现永远为 false 的 `checked`。
 */
export interface SplitButtonBaseProps extends FluereToggleSplitButtonProps {
  /** 内部：主区点击时是否切换 `checked`（等价 WinUI `ToggleSplitButton`） */
  toggleable?: boolean
}
