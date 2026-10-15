import { inject, type CSSProperties, type ComputedRef, type InjectionKey } from 'vue'
import type { NavigationNode } from './collection'

/**
 * `FluereNavigationView` 与内部递归列表组件之间的上下文。
 *
 * 为什么用 `provide/inject` 而不是逐层传 props：导航树深度不限
 * （`#children` 可以继续嵌 `#children`），递归组件每一层都要转发同一批
 * 选中 / 展开 / 事件回调；用注入可以避免「新增一个 prop 要改三层签名」。
 *
 * 该上下文**只在本组件内部使用**，不对外导出。
 */

/** invoke 的触发来源（对齐 `NavigationViewItemInvokedEventArgs` 的语义，见 `types.ts`） */
export type NavigationInvokeSource = 'pointer' | 'keyboard' | 'focus'

/**
 * 内置「设置」项在 `selectedValue` 里占用的**保留值**。
 *
 * WinUI 用对象身份（`SelectedItem === SettingsItem`）表达「选中的是设置项」
 * （`NavigationView.cpp:2422-2427` 的 `IsSettingsItem(item)`）；Vue 侧的
 * `selectedValue` 是字符串 / 数字，因此需要一个哨兵值。
 *
 * ⚠️ **消费方不得把菜单项的 `value` 设成这个字符串**。契约测试有断言守这条。
 */
export const FLUERE_NAVIGATION_SETTINGS_VALUE = '__fluere_navigation_settings__'

/** 注入键（`Symbol.for` 便于跨包 / 多实例调试时辨认） */
export const NAVIGATION_VIEW_CONTEXT_KEY: InjectionKey<NavigationViewContextValue> = Symbol.for(
  'fluere-vue.navigation-view',
)

/** 内部上下文值 */
export interface NavigationViewContextValue {
  /** 当前选中值（含 `FLUERE_NAVIGATION_SETTINGS_VALUE` 哨兵） */
  selectedValue: ComputedRef<string | number | undefined>
  /**
   * 选中指示条应画在哪一项上 —— 对齐 `FindLowestLevelContainerToDisplaySelectionIndicator`
   * （`NavigationView.cpp:5562-5593`）：从选中项的顶层祖先往下走，只要当前节点
   * **自身未选中但后代被选中**就继续下钻；选中的项若被折叠则停在最近的可见祖先上。
   */
  indicatorValue: ComputedRef<string | number | undefined>
  /** 面板是否「紧凑且关闭」—— 上游此时只有图标、无文字、chevron 隐藏 */
  iconOnly: ComputedRef<boolean>
  /**
   * 是否隐藏展开箭头 —— 对齐 `UpdateVisualStateForChevron`（`NavigationViewItem.cpp:645`）：
   * `HasChildren() && !(m_isClosedCompact && ShouldRepeaterShowInFlyout())` 才显示。
   * 本库**不实现 flyout 子项**（见 `navigation-view.vue` 非目标），因此紧凑且关闭时
   * 一律隐藏箭头，避免出现「点了没反应」的箭头。
   */
  hideChevron: ComputedRef<boolean>
  /**
   * 解析某个项的展开状态：受控 `isExpanded` > 内部状态 > `defaultIsExpanded`；
   * 紧凑且关闭时**顶层项强制折叠**（对齐 `HandleExpansionStateMemory`，
   * `NavigationViewItem.cpp:269-285`），但内部状态保留，展开面板后自动恢复。
   */
  resolveExpanded: (node: NavigationNode, depth: number) => boolean
  /** invoke：选中 + 展开 + 抛事件 + 必要时关面板 */
  invoke: (node: NavigationNode, source: NavigationInvokeSource) => void
  /** 当前 locale 的取词函数（scope `navigation-view`） */
  t: (key: string) => string
  /** 焦点矩形类名（0.4.3 原语） */
  focusVisualClass: string
  /** 焦点矩形内联变量（0.4.3 原语） */
  focusVisualStyle: CSSProperties
  /** 文本方向（影响方向键的前进方向判定） */
  dir: ComputedRef<'ltr' | 'rtl'>
}

/** 在内部列表组件里取上下文；脱离 `FluereNavigationView` 时显式报错（比静默渲染更容易排查） */
export const useNavigationViewContext = (): NavigationViewContextValue => {
  const context = inject(NAVIGATION_VIEW_CONTEXT_KEY)
  if (!context) {
    throw new Error(
      '[FluereNavigationView] 内部列表组件必须在 <FluereNavigationView> 内部使用（缺少上下文）。',
    )
  }
  return context
}
