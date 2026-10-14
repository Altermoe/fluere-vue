import type { VNode } from 'vue'

/**
 * FluereTabView / FluereTabViewItem 的类型契约。
 *
 * 规格来源：WinUI 3 / Windows App SDK — `Microsoft.UI.Xaml.Controls.TabView`
 *   `microsoft-ui-xaml` tag `winui3/release/2.5.1`（commit `ba3a8d5`）
 *   · `src/controls/dev/TabView/TabView.idl`（公开 API，含 TabViewItem / TabViewListView /
 *     两个 AutomationPeer —— **不存在独立的 `TabViewItem.idl`**）
 *   · `src/controls/dev/TabView/TabView.cpp` / `TabViewItem.cpp`（行为与状态机）
 *   · `src/controls/dev/TabView/TabView.xaml` / `TabView_themeresources.xaml`（模板与画刷）
 *   · 依赖属性默认值在生成物 `src/controls/dev/Generated/TabView.properties.cpp` /
 *     `TabViewItem.properties.cpp`
 *
 * 行为结论与逐条验收都写在 `tab-view.vue` 的文件头注释里，本文件只放类型。
 */

/**
 * tab 条宽度模式 —— 对齐 WinUI `TabViewWidthMode`（`TabView.idl:6-11`）。
 *
 * | 值 | WinUI | 语义 |
 * | --- | --- | --- |
 * | `equal` | `Equal = 0`（缺省） | 所有 tab 等宽：`clamp(可用宽 / tab 数, minWidth, maxWidth)` |
 * | `size-to-content` | `SizeToContent = 1` | 宽度由内容决定（仍受 min / max 夹持） |
 * | `compact` | `Compact = 2` | 同 `size-to-content`，但**未选中**的 tab 折叠成只剩图标 |
 */
export type FluereTabViewWidthMode = 'equal' | 'size-to-content' | 'compact'

/**
 * 关闭按钮叠加模式 —— 对齐 WinUI `TabViewCloseButtonOverlayMode`（`TabView.idl:13-20`）。
 *
 * ⚠️ 源码事实：`Auto` 与 `Always` 在 `TabViewItem::UpdateCloseButton`（`TabViewItem.cpp:248-279`）
 * 里走**同一个 `default:` 分支**，行为完全一致（总是可见）。不要把 `auto` 脑补成
 * 「智能判断」—— 需要「hover / 选中才显示」必须显式用 `on-pointer-over`。
 */
export type FluereTabViewCloseButtonOverlayMode = 'auto' | 'on-pointer-over' | 'always'

/** `FluereTabView` 的 Props 契约 */
export interface FluereTabViewProps {
  /**
   * 当前选中的 tab 下标（`v-model:selectedIndex`）。
   *
   * · 传了就是受控：组件只按 Prop 渲染，变更通过 `update:selectedIndex` 抛回；
   * · 不传（`undefined`）就是非受控：内部从 `defaultSelectedIndex` 起步。
   *
   * 对应 WinUI `TabView.SelectedIndex`（默认 `0`，`Generated/TabView.properties.cpp:152`）。
   */
  selectedIndex?: number
  /**
   * 非受控初始选中下标；缺省 `0`（对齐 WinUI 的 `SelectedIndex` 默认值 —— 加载后默认选中第 0 个 tab）。
   */
  defaultSelectedIndex?: number
  /** 宽度模式，对应 `TabWidthMode`；缺省 `'equal'` */
  tabWidthMode?: FluereTabViewWidthMode
  /** 关闭按钮叠加模式，对应 `CloseButtonOverlayMode`；缺省 `'auto'`（与 `'always'` 同行为） */
  closeButtonOverlayMode?: FluereTabViewCloseButtonOverlayMode
  /** 「新建 tab」按钮是否显示，对应 `IsAddTabButtonVisible`；**缺省 `true`**（对齐 WinUI） */
  isAddTabButtonVisible?: boolean
  /**
   * tab 条根节点的可访问名（`aria-label`）。
   *
   * 必须显式给：WinUI `TabViewAutomationPeer` **没有重写 `GetNameCore`**
   * （`TabViewAutomationPeer.h` 无该函数），Web 侧没有 `AutomationProperties.Name`
   * 的等价回退，不给就是无名控件。
   */
  label?: string
  /** 文本方向，只影响方向键的前进方向判定（`FlowDirection`）；缺省 `'ltr'` */
  dir?: 'ltr' | 'rtl'
  /**
   * 是否把 `prefers-reduced-motion` 之外的自有过渡也关掉。
   * `'auto'`（缺省）跟随 `prefers-reduced-motion`；`'none'` 一律瞬时。
   */
  motion?: 'auto' | 'none'
  /** 内建文案（关闭 / 新建 / 滚动按钮）的 locale；优先于 `FluereConfigProvider` */
  locale?: string
}

/** `FluereTabViewItem` 的 Props 契约（数据型子组件，见 `tab-view-item.vue`） */
export interface FluereTabViewItemProps {
  /**
   * tab 头文本。对应 WinUI `TabViewItem.Header`（`Object`，模板里直接当内容渲染）。
   * 需要富内容时用 `#header` 插槽；两者同时给时**插槽优先**。
   */
  header?: string
  /**
   * 是否可关闭，对应 WinUI `TabViewItem.IsClosable`（默认 `true`）。
   *
   * ⚠️ 上游属性名是 `IsClosable`，**不是** `IsTabClosable`（`TabView.idl:217-219`）。
   * `false` ⇒ 关闭按钮折叠（`CloseButtonCollapsed`），且该 tab 不再进入焦点环的关闭按钮位。
   */
  isClosable?: boolean
  /** 是否禁用，对应 WinUI `Control.IsEnabled = false`（进不了焦点环、不能被选中） */
  disabled?: boolean
  /**
   * 覆盖 tab 的可访问名。对应 `AutomationProperties.Name`：WinUI
   * `TabViewItemAutomationPeer::GetNameCore()` 在显式名称为空时回退到 `Header` 的字符串表示。
   */
  ariaLabel?: string
  /**
   * 稳定标识（可选）。**只有给了它（或 `v-for` 的 `:key`）**，本库才能像 WinUI 的
   * `SelectedItem` 那样做「按 tab 身份跟随 / 关闭后迁移」；否则退回按下标处理。
   */
  value?: string | number
}

/** `tabCloseRequested` 事件的载荷（对齐 `TabViewTabCloseRequestedEventArgs`，`TabView.idl:22-28`） */
export interface FluereTabViewTabCloseRequestedEventArgs {
  /** 被请求关闭的 tab 下标（触发时刻） */
  index: number
  /** 被请求关闭的 tab 头文本 */
  header: string
  /** 被请求关闭的 tab 的稳定标识（`value` / vnode key / 下标字符串） */
  identity: string
  /** 触发来源：关闭按钮 / 中键（本库不实现 Ctrl+F4 之外的其它入口时也会给 `'keyboard'`） */
  source: 'close-button' | 'keyboard'
}

/** 内部：从子组件 vnode 收集出来的 tab 描述（不对外导出为公开契约） */
export interface TabItemDescriptor {
  /** 当前下标（用于 reka Tabs 的 value） */
  index: number
  /** 稳定标识：`value` > vnode key > 下标字符串 */
  identity: string
  /** 是否有稳定标识（`value` 或 vnode key）；没有时不做身份跟随 */
  hasStableIdentity: boolean
  /** tab 头文本（`header` prop；`#header` 插槽非文本时为空串） */
  header: string
  /** `#icon` 插槽内容（可能为空） */
  renderIcon?: () => VNode[]
  /** `#header` 插槽内容（可能为空；有则优先于 `header` 文本） */
  renderHeader?: () => VNode[]
  /** 面板内容（`#content` / 默认插槽） */
  renderContent: () => VNode[]
  /** 对应 `TabViewItem.IsClosable` */
  isClosable: boolean
  /** 对应 `Control.IsEnabled = false` */
  disabled: boolean
  /** 覆盖可访问名 */
  ariaLabel?: string
}
