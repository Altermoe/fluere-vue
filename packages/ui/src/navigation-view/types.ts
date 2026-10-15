/**
 * FluereNavigationView / FluereNavigationViewItem 的类型契约。
 *
 * 规格来源：WinUI 3 / Windows App SDK — `Microsoft.UI.Xaml.Controls.NavigationView`
 *   `microsoft-ui-xaml` tag `winui3/release/2.5.1`（commit `ba3a8d5`）
 *   · `src/controls/dev/NavigationView/NavigationView.idl`（公开 API）
 *   · `src/controls/dev/NavigationView/NavigationView.cpp`（DisplayMode 状态机、键盘、选择）
 *   · `src/controls/dev/NavigationView/NavigationView.xaml` / `NavigationView_themeresources.xaml`
 *     （模板、几何、画刷、VisualTransition 关键帧）
 *   · `src/controls/dev/NavigationView/NavigationViewItem.cpp` / `NavigationViewItemPresenter.cpp`
 *   · `src/controls/dev/Generated/NavigationView.properties.cpp` /
 *     `NavigationViewItem.properties.cpp`（依赖属性默认值）
 *   · `src/controls/dev/SplitView/SplitView_themeresources.xaml`（pane 开合关键帧）
 *   · `src/controls/dev/AnimatedIcon/AnimatedVisuals/AnimatedChevronUpDownSmallVisualSource.cpp`
 *     （chevron LottieGen 产物）
 *   · `src/controls/dev/NavigationView/Strings/{en-us,zh-CN}/Resources.resw`（内建文案）
 *
 * 行为结论与逐条验收都写在 `navigation-view.vue` / `navigation-view-item.vue` 的文件头注释里，
 * 本文件只放类型。
 */

/**
 * 面板显示模式 —— 对齐 WinUI `NavigationViewDisplayMode`（`NavigationView.idl:6-11`）。
 *
 * ⚠️ 这是**运行时算出来的结果**，不是配置项。配置项是 `FluereNavigationPaneDisplayMode`
 * （对齐 `NavigationViewPaneDisplayMode`），两者不要混。
 */
export type FluereNavigationDisplayMode = 'minimal' | 'compact' | 'expanded'

/**
 * 面板显示模式配置 —— 对齐 WinUI `NavigationViewPaneDisplayMode`（`NavigationView.idl:24-31`）。
 *
 * | 值 | WinUI | DisplayMode 推导（`NavigationView.cpp:1455-1477`） |
 * | --- | --- | --- |
 * | `auto` | `Auto = 0`（缺省） | 按宽度自适应（见 `constants.ts` 的阈值） |
 * | `left` | `Left = 1` | 恒 `expanded` |
 * | `left-compact` | `LeftCompact = 3` | 恒 `compact` |
 * | `left-minimal` | `LeftMinimal = 4` | 恒 `minimal` |
 *
 * **`top`（`Top = 2`）不实现**：顶部导航是另一套模板（`TopNavArea` / `TopNavGrid` /
 * 溢出浮层），本库本期只做左侧面板；裁定写进 `navigation-view.vue` 的差异表。
 */
export type FluereNavigationPaneDisplayMode = 'auto' | 'left' | 'left-compact' | 'left-minimal'

/**
 * 焦点是否跟随选中 —— 对齐 WinUI `NavigationViewSelectionFollowsFocus`（`NavigationView.idl:35-39`）。
 *
 * `enabled` 时「获得焦点即 invoke」（`NavigationView.cpp:3060-3080`），且要求该项
 * `selectsOnInvoked`（`:3065`）。缺省 `disabled`（`Generated/NavigationView.properties.cpp:442`）。
 */
export type FluereNavigationSelectionFollowsFocus = 'disabled' | 'enabled'

/** `itemInvoked` 事件的载荷（对齐 `NavigationViewItemInvokedEventArgs`，`NavigationView.idl:81-93`） */
export interface FluereNavigationItemInvokedEventArgs {
  /** 被 invoke 的项标识（`FluereNavigationViewItem.value`） */
  value: string | number
  /** 被 invoke 的项的文本内容 */
  content: string
  /** 是否是内置「设置」项（对应 `IsSettingsInvoked`） */
  isSettingsInvoked: boolean
  /** 触发来源：指针点击 / 键盘（Enter / Space）/ 焦点跟随选中 */
  source: 'pointer' | 'keyboard' | 'focus'
}

/** `selectionChanged` 事件的载荷（对齐 `NavigationViewSelectionChangedEventArgs`，`NavigationView.idl:67-77`） */
export interface FluereNavigationSelectionChangedEventArgs {
  /** 新的选中项标识；无选中时为 `undefined` */
  value: string | number | undefined
  /** 之前选中的项标识 */
  previousValue: string | number | undefined
  /** 选中的是否是内置「设置」项（对应 `IsSettingsSelected`） */
  isSettingsSelected: boolean
}

/** `displayModeChanged` 事件的载荷（对齐 `NavigationViewDisplayModeChangedEventArgs`） */
export interface FluereNavigationDisplayModeChangedEventArgs {
  /** 新的运行时显示模式 */
  displayMode: FluereNavigationDisplayMode
}

/** `FluereNavigationView` 的 Props 契约 */
export interface FluereNavigationViewProps {
  /**
   * 面板显示模式配置，对应 `PaneDisplayMode`；缺省 `'auto'`。
   *
   * ⚠️ `'auto'` 依赖容器宽度测量（`ResizeObserver`）。SSR 直出时没有宽度，本组件用
   * **确定性的预测量缺省值 `expanded`** 渲染，挂载后再按实测宽度更新 —— 与
   * `useMediaQuery` 同一套「服务端缺省 + 挂载后修正」口径，不会产生水合不匹配。
   */
  paneDisplayMode?: FluereNavigationPaneDisplayMode
  /**
   * 面板是否展开（`v-model:isPaneOpen`）。
   *
   * · 传了就是受控：组件只按 Prop 渲染，变更通过 `update:isPaneOpen` 抛回；
   * · 不传（`undefined`）就是非受控：内部从 `defaultIsPaneOpen` 起步。
   *
   * 对应 WinUI `NavigationView.IsPaneOpen`，**默认 `true`**（`NavigationView.idl:174-175`）。
   * 受 `DisplayMode` 状态机支配：进入 `minimal` 恒关、`expanded → compact` 恒关、
   * 进入 `expanded` 且用户没有手动关过才自动开（`NavigationView.cpp:1494-1512`）。
   */
  isPaneOpen?: boolean
  /** 非受控初始展开状态；缺省 `true`（对齐 WinUI） */
  defaultIsPaneOpen?: boolean
  /** 展开档面板宽（px）；缺省走令牌 `--navigationPaneExpandedWidth`（WinUI `OpenPaneLength` = 320） */
  openPaneLength?: number
  /** 紧凑档面板宽（px）；缺省走令牌 `--navigationPaneCompactWidth`（WinUI `CompactPaneLength` = 48） */
  compactPaneLength?: number
  /** Auto 档进入 Compact 的宽度下界；缺省 `641`（`NavigationView.idl:176-177`） */
  compactModeThresholdWidth?: number
  /** Auto 档进入 Expanded 的宽度下界；缺省 `1008`（`NavigationView.idl:179-180`） */
  expandedModeThresholdWidth?: number
  /**
   * 是否显示面板开关（汉堡）按钮，对应 `IsPaneToggleButtonVisible`；缺省 `true`。
   * ⚠️ 它只控**可见性**，不控可开合性（`NavigationView.cpp:4403-4407`）。
   */
  isPaneToggleButtonVisible?: boolean
  /** 面板是否可见，对应 `IsPaneVisible`；缺省 `true`。`false` 时面板不占位（`NavigationView.cpp:2681-2684`） */
  isPaneVisible?: boolean
  /** 是否显示内置「设置」项，对应 `IsSettingsVisible`；缺省 `true`（`NavigationView.idl:189-190`） */
  isSettingsVisible?: boolean
  /**
   * 当前选中项的标识（`v-model:selectedValue`）。
   *
   * Vue 侧用「值标识」而不是 WinUI 的 `SelectedItem` 对象引用 —— 与 `FluereTabView`
   * 的选中口径一致（见其组件注释第 3 条）。`undefined` = 非受控。
   */
  selectedValue?: string | number
  /** 非受控初始选中项标识；缺省 `undefined`（不选中任何项，对齐 WinUI 的 `SelectedItem` 默认 null） */
  defaultSelectedValue?: string | number
  /** 焦点是否跟随选中，对应 `SelectionFollowsFocus`；缺省 `'disabled'` */
  selectionFollowsFocus?: FluereNavigationSelectionFollowsFocus
  /**
   * 面板顶部标题文本（对应 `PaneTitle`）。
   * 缺省空 —— WinUI 里 `PaneTitle` 为空时 `UpdatePaneToggleSize` 走的是「按钮宽 = 面板宽」分支
   * （`NavigationView.cpp:4625-4637`），本组件同口径。
   */
  paneTitle?: string
  /**
   * 面板导航区的可访问名（`aria-label`）。
   *
   * 必须显式给：WinUI 侧该名字来自 `AutomationProperties.Name`（模板里绑到
   * `MenuItemsHost`，`NavigationView.xaml:365-368`），Web 侧没有等价回退，不给就是无名导航区。
   */
  label?: string
  /** 文本方向，只影响方向键的前进方向判定；缺省 `'ltr'` */
  dir?: 'ltr' | 'rtl'
  /**
   * 是否把 `prefers-reduced-motion` 之外的自有过渡也关掉。
   * `'auto'`（缺省）跟随 `prefers-reduced-motion`；`'none'` 一律瞬时。
   */
  motion?: 'auto' | 'none'
  /** 内建文案（开关按钮 / 设置项 / 搜索按钮）的 locale；优先于 `FluereConfigProvider` */
  locale?: string
}

/** `FluereNavigationViewItem` 的 Props 契约 */
export interface FluereNavigationViewItemProps {
  /**
   * 项的稳定标识。**必填** —— 选中 / 展开 / `isChildSelected` 的祖先链推导都靠它。
   * 对应 WinUI 里「用 `SelectedItem` 对象引用做身份」的那件事，Vue 侧换成值标识。
   */
  value: string | number
  /**
   * 项文本。对应 WinUI `NavigationViewItem.Content`（模板里当内容渲染）。
   * 需要富内容时用默认插槽；两者同时给时**插槽优先**。
   */
  content?: string
  /**
   * 是否在 invoke 时改选中，对应 `SelectsOnInvoked`；**缺省 `true`**。
   *
   * `false` ⇒ invoke 只展开 / 不选中（`NavigationView.cpp:1048`），且 API 强行选中它会被回滚
   * （`:2281-2292`、`:3516-3539`）。分组标题类的项用它。
   */
  selectsOnInvoked?: boolean
  /**
   * 是否展开子项（`v-model:isExpanded`）。
   * 传了就是受控；不传则内部从 `defaultIsExpanded` 起步（缺省 `false`，对齐 `IsExpanded`）。
   * **没有子项时该值不生效**（`ChangeIsExpandedNavigationViewItem` 的前置条件，
   * `NavigationView.cpp:5554-5560`）。
   */
  isExpanded?: boolean
  /** 非受控初始展开状态；缺省 `false` */
  defaultIsExpanded?: boolean
  /**
   * 声明「还有未实例化的子项」（对应 `HasUnrealizedChildren`）。
   * 参与「是否有子项」判定（`NavigationView.cpp:5538-5547`），也决定 chevron 出不出现。
   */
  hasUnrealizedChildren?: boolean
  /**
   * 覆盖项的可访问名。对应 `AutomationProperties.Name`：WinUI
   * `NavigationViewItemAutomationPeer::GetNameCore()` 在显式名称为空时回退到 `Content`
   * 的字符串表示，两者都空才回退到内建 `NavigationViewItem` 文案。
   */
  ariaLabel?: string
  /** 是否禁用，对应 `Control.IsEnabled = false`（进不了焦点环、不能被选中） */
  disabled?: boolean
  /**
   * 祖先链上是否有选中项（对应只读依赖属性 `IsChildSelected`）。
   *
   * ⚠️ **与 WinUI 的差异**：WinUI 由 `UpdateIsChildSelected` 在每次选中变化时沿 IndexPath
   * 逐层回写（`NavigationView.cpp:2509-2547`）；本组件改为**在渲染期读子项 vnode 的 `value`
   * 自行推导**（`collection.ts`），因此它是**只读的内部状态**，不需要消费方传。
   * 显式传入会覆盖推导值（逃生口，主要给「子项不在 `#children` 插槽里」的场景）。
   */
  isChildSelected?: boolean
}

/** `FluereNavigationViewItemHeader` 的 Props 契约（对齐 `NavigationViewItemHeader`） */
export interface FluereNavigationViewItemHeaderProps {
  /** 分组标题文本。对应 WinUI `Content`；也可用默认插槽。 */
  content?: string
}

/** 内部：从 `#children` 插槽收集出来的子项描述 */
export interface NavigationChildDescriptor {
  /** 子项标识（`value`） */
  value: string | number
  /** 子项是否禁用（禁用的子项不参与「祖先链选中」推导的……实际上参与，见组件注释） */
  disabled: boolean
}
