import { Comment, Fragment, Text } from 'vue'
import type { InjectionKey, VNode } from 'vue'
import type { FluereMenuFlyoutSelectEventArgs } from './types'

/**
 * MenuFlyout 族的内部上下文。
 *
 * 拆成三个 key，是因为三件事的生命周期不同：
 *   - `MENU_FLYOUT_KEY`：根级交互（选中回传、是否选中后关闭）；
 *   - `MENU_LAYOUT_KEY`：最近的菜单面板（根 / 某个子菜单）的列占位信息——
 *     WinUI 里每个 `MenuFlyoutPresenter` 都独立维护
 *     `ContainsIconItems` / `ContainsToggleItems`；
 *   - `MENU_SUBMENU_SCOPE_KEY`：最近一层菜单面板的子菜单作用域（兄弟子菜单互斥）。
 */

/** 条目对齐所需的面板级信息（WinUI `MenuFlyoutPresenter.GetContainsIconItems` 等）。 */
export interface MenuLayoutContext {
  /** 当前面板是否存在带图标的条目（含 SubItem / Toggle） */
  hasIcon: () => boolean
  /** 当前面板是否存在 Toggle 条目 */
  hasToggle: () => boolean
}

/** 根菜单注入给所有后代条目 / 子菜单的交互能力。 */
export interface MenuFlyoutContext {
  /** 选中条目：根组件负责抛 `select` 并记录关闭原因为 `item-click` */
  notifySelect: (payload: FluereMenuFlyoutSelectEventArgs) => void
  /** 选中后是否关闭（条目在 `select` 事件里据此 `preventDefault()` 阻止 reka 自动关闭） */
  closeOnSelect: () => boolean
}

/**
 * 一层菜单面板内的「子菜单作用域」。
 *
 * 每层（根 / 每个子菜单）各提供一份：条目只能关闭**与自己同级**的子菜单，
 * 否则子菜单内部的普通条目 hover 时会把自己的父菜单一起关掉。
 */
export interface MenuSubmenuScope {
  /** 关闭本层已打开的子菜单（`except` 为发起者自己的 id） */
  closeChildSubmenus: (except?: symbol) => void
  /** 注册一个子菜单的关闭函数；返回注销函数 */
  registerSubmenu: (id: symbol, close: () => void) => () => void
}

/** 菜单面板的布局上下文（根 / 子菜单各提供一份，取最近者）。 */
export const MENU_LAYOUT_KEY: InjectionKey<MenuLayoutContext> = Symbol('FluereMenuLayout')

/** 根菜单的交互上下文。 */
export const MENU_FLYOUT_KEY: InjectionKey<MenuFlyoutContext> = Symbol('FluereMenuFlyout')

/** 最近一层菜单面板的子菜单作用域。 */
export const MENU_SUBMENU_SCOPE_KEY: InjectionKey<MenuSubmenuScope> =
  Symbol('FluereMenuSubmenuScope')

/** 创建一层子菜单作用域（根组件与每个 SubItem 各一份）。 */
export const createSubmenuScope = (): MenuSubmenuScope => {
  const closers = new Map<symbol, () => void>()
  return {
    closeChildSubmenus: (except?: symbol) => {
      for (const [id, close] of closers) {
        if (id !== except) {
          close()
        }
      }
    },
    registerSubmenu: (id, close) => {
      closers.set(id, close)
      return () => {
        closers.delete(id)
      }
    },
  }
}

/** `MENU_SUBMENU_SCOPE_KEY` 的缺省值：没有作用域时什么也不关（组件独立使用的兜底）。 */
export const EMPTY_SUBMENU_SCOPE: MenuSubmenuScope = {
  closeChildSubmenus: () => undefined,
  registerSubmenu: () => () => undefined,
}

/**
 * 子菜单 hover 展开 / 收起的延时（ms）。
 *
 * 规格出处（负面证据 + 运行时来源）：
 *   `src/dxaml/xcp/dxaml/lib/CascadingMenuHelper.cpp:87-99` 在初始化时读注册表
 *   `HKCU\Control Panel\Desktop\MenuShowDelay`，读不到才用 `DefaultMenuShowDelay`；
 *   该常量定义在未纳入公开源码树（本快照取不到实现）的头文件里。
 *   Windows 11 100% 缩放下的系统缺省值为 **400ms**（`MenuShowDelay` 的出厂值），
 *   故这里取 400ms，并落成组件局部常量；消费方若要与系统设置一致，需要后续
 *   增加一个读系统偏好的入口（Web 无标准 API）——本版按证据缺口记账。
 */
export const SUBMENU_OPEN_DELAY = 400

/** 子菜单收起延时（同一系统值的另一分支 `DelayCloseSubMenu`）。 */
export const SUBMENU_CLOSE_DELAY = 400

/** 单个条目树节点（用于面板级图标 / 勾选检测）。 */
export interface MenuItemTypeRegistry {
  item: unknown
  subItem?: unknown
  toggle: unknown
}

/** 从组件类型上取编译期名字（Vue SFC 产物有 `__name`，用于避免 SubItem 自引用） */
const componentNameOf = (type: unknown): string | undefined => {
  if (typeof type !== 'object' || type === null) {
    return undefined
  }
  const record = type as Record<string, unknown>
  const vueName = record['__name']
  if (typeof vueName === 'string') {
    return vueName
  }
  return typeof record.name === 'string' ? record.name : undefined
}

/** `v-for` / `v-if` 产生的 Fragment 子节点递归展开。 */
export const flattenVNodes = (nodes: readonly VNode[]): VNode[] => {
  const result: VNode[] = []
  for (const node of nodes) {
    if (node.type === Fragment && Array.isArray(node.children)) {
      result.push(...flattenVNodes(node.children as VNode[]))
      continue
    }
    if (node.type === Comment || node.type === Text) {
      continue
    }
    result.push(node)
  }
  return result
}

/**
 * 从菜单内容 vnode 里检测面板级占位信息。
 *
 * 只扫描**直接子级**（Fragment 递归展开）：WinUI 的 `Items` 集合也只包含当前
 * presenter 的直接条目，子菜单里的条目由子 presenter 自己统计。
 */
export const inspectMenuItems = (
  nodes: readonly VNode[],
  registry: MenuItemTypeRegistry,
): { hasIcon: boolean; hasToggle: boolean } => {
  let hasIcon = false
  let hasToggle = false
  for (const node of flattenVNodes(nodes)) {
    const isSubItem =
      node.type === registry.subItem || componentNameOf(node.type) === 'FluereMenuFlyoutSubItem'
    if (node.type === registry.item || isSubItem) {
      if (node.props?.icon !== undefined && node.props.icon !== null) {
        hasIcon = true
      }
    } else if (node.type === registry.toggle) {
      hasToggle = true
      if (node.props?.icon !== undefined && node.props.icon !== null) {
        hasIcon = true
      }
    }
  }
  return { hasIcon, hasToggle }
}
