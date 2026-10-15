import { Fragment, createTextVNode, isVNode, type VNode } from 'vue'
import type { NavigationChildDescriptor } from './types'

/**
 * 子项收集器：把 `<FluereNavigationView>` 默认插槽里的
 * `<FluereNavigationViewItem>` / `...ItemHeader` / `...ItemSeparator` vnode
 * 读成「数据描述」—— **这是本组件唯一一处必须在渲染期解析 vnode 的地方**，理由与
 * `FluereTabView`（见 `tab-view/collection.ts` 文件头）完全一致：
 *
 * WinUI `NavigationView` 的模板把面板拆成若干 `ItemsRepeater`（`MenuItemsHost` /
 * `FooterMenuItemsHost`，`NavigationView.xaml:365-388`），而 `IsChildSelected` 需要
 * **沿祖先链回写**（`NavigationView.cpp:2509-2547`）。Vue 的 `provide/inject` 注册式收集
 * 只能在后代 `setup()` 之后拿到数据 —— 父组件第一次渲染时注册表还是空的，SSR 直出会缺
 * 整条面板、客户端水合后再补，既闪又水合不一致。因此这里在**父组件渲染期**直接读子 vnode
 * 的 props / slots，一次渲染就得到完整树（含递归的 `#children`）。
 *
 * 支持的结构（其余结构**不支持**，见 `navigation-view.vue` 的文档说明）：
 *   · 直接子元素：`<FluereNavigationViewItem … />` / `...ItemHeader` / `...ItemSeparator`
 *   · `v-for` / `v-if` / `<template v-for>`：编译成 `Fragment`（会被摊平），注释节点被过滤
 *   · 子项图标用 `#icon`、内容用默认插槽（或 `content` prop）、下级用 `#children`
 *   · **`#children` 里可以继续放本族组件**（递归收集），深度不限
 * 不支持的：把子项再包一层自定义组件 / 原生元素（那样 vnode 的 `type` 不再等于本族组件）。
 */

/** 描述种类：与三个子组件一一对应 */
export type NavigationNodeKind = 'item' | 'header' | 'separator'

/** 从子组件 vnode 收集出来的节点描述（内部契约，不对外导出） */
export interface NavigationNode {
  kind: NavigationNodeKind
  /** 稳定标识：`item` 用 `value`；`header` / `separator` 用收集顺序合成 */
  key: string
  /** `item` 的 `value`（`header` / `separator` 为 `undefined`） */
  value?: string | number
  /** 文本内容（`content` prop；插槽非文本时为空串） */
  content: string
  /** 默认插槽 / `content` 之外的富内容 */
  renderContent?: () => VNode[]
  /** `#icon` 插槽内容 */
  renderIcon?: () => VNode[]
  /** `#children` 插槽产出的下级节点（已递归收集） */
  children: NavigationNode[]
  /** 对应 `NavigationViewItem.SelectsOnInvoked`，缺省 `true` */
  selectsOnInvoked: boolean
  /** 对应 `Control.IsEnabled = false` */
  disabled: boolean
  /** 对应 `NavigationViewItem.HasUnrealizedChildren` */
  hasUnrealizedChildren: boolean
  /** 对应 `NavigationViewItem.IsExpanded`（受控时的当前值） */
  isExpanded?: boolean
  /** 对应 `NavigationViewItem.IsExpanded` 的非受控初值，缺省 `false` */
  defaultIsExpanded: boolean
  /** 覆盖可访问名 */
  ariaLabel?: string
  /** 显式传入的 `isChildSelected`（逃生口；不传则由选中值推导） */
  isChildSelected?: boolean
}

/** 把插槽值（函数 / vnode 数组 / 文本）统一成「返回 vnode 数组的函数」 */
const asRenderFn = (slot: unknown): (() => VNode[]) | undefined => {
  if (typeof slot === 'function') {
    return () => {
      const rendered = (slot as () => unknown)()
      return Array.isArray(rendered) ? (rendered as VNode[]) : [rendered as VNode]
    }
  }
  if (Array.isArray(slot)) {
    return () => slot as VNode[]
  }
  return undefined
}

/** 取子项 vnode 的插槽对象（组件的 `children` 可能是对象 / 数组 / 文本三种形态） */
const readSlots = (children: VNode['children']): Record<string, unknown> => {
  if (children == null) {
    return {}
  }
  if (Array.isArray(children)) {
    return { default: () => children }
  }
  if (typeof children === 'string' || typeof children === 'number') {
    return { default: () => [createTextVNode(String(children))] }
  }
  if (typeof children === 'object') {
    return children as Record<string, unknown>
  }
  return {}
}

/**
 * 摊平 vnode 数组里的 `Fragment`（`v-for` / `<template>` 的产物）。
 * 注释 / 文本节点不需要在这里剔除——`collectNodes` 只认 `type` 等于本族组件的 vnode。
 */
const flattenVNodes = (nodes: readonly unknown[]): VNode[] =>
  nodes.flatMap((node) => {
    if (!isVNode(node)) {
      return []
    }
    if (node.type === Fragment && Array.isArray(node.children)) {
      return flattenVNodes(node.children as unknown[])
    }
    return [node]
  })

/** 从 props 里取字符串（缺省空串）；也接受数字（`content` 允许数字文本） */
const readString = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number') {
    return String(value)
  }
  return fallback
}

/**
 * 读原始 vnode props。
 *
 * **必须同时认 camelCase 与 kebab-case**：模板里写 `:selects-on-invoked="false"` 时，
 * 编译产物里的原始 prop 键就是 `'selects-on-invoked'`（Vue 只在创建组件实例时 camelize），
 * 而本组件读的是 vnode props 本身 —— 只认 camelCase 会把 `false` 当成「没传」。
 * 这条结论来自 0.5.3 TabView 的真实浏览器实测（见其 `collection.ts` 的长注释）。
 */
const readProp = (props: Record<string, unknown>, name: string): unknown => {
  if (name in props) {
    return props[name]
  }
  const kebab = name.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)
  return kebab in props ? props[kebab] : undefined
}

/**
 * 读布尔 prop —— 复刻 Vue 对 `Boolean` props 的转换：
 * 裸属性（`<FluereNavigationViewItem has-unrealized-children />`）编译成空串 `''`，
 * Vue 视其为 `true`；缺省（`undefined` / `null`）时用 fallback。
 */
const readBooleanProp = (value: unknown, fallback: boolean): boolean => {
  if (value === undefined || value === null) {
    return fallback
  }
  if (value === '') {
    return true
  }
  return typeof value === 'boolean' ? value : Boolean(value)
}

/** 读可选数字 / 字符串标识（`value`） */
const readValue = (value: unknown): string | number | undefined => {
  if (typeof value === 'string' || typeof value === 'number') {
    return value
  }
  return undefined
}

/** 本族三个组件的引用（用**引用相等**判定子项，避免误收同名的第三方组件） */
export interface NavigationNodeTypes {
  item: unknown
  header: unknown
  separator: unknown
}

/**
 * 递归收集节点。
 *
 * @param nodes 插槽产出的 vnode 数组
 * @param types 本族三个组件的引用
 * @param path 当前路径（用于合成 `header` / `separator` 的稳定 key）
 */
export const collectNodes = (
  nodes: readonly unknown[],
  types: NavigationNodeTypes,
  path = '',
): NavigationNode[] => {
  const result: NavigationNode[] = []
  let ordinal = 0

  for (const node of flattenVNodes(nodes)) {
    const kind: NavigationNodeKind | undefined =
      node.type === types.item
        ? 'item'
        : node.type === types.header
          ? 'header'
          : node.type === types.separator
            ? 'separator'
            : undefined
    if (kind === undefined) {
      continue
    }

    const props = (node.props ?? {}) as Record<string, unknown>
    const slots = readSlots(node.children)
    const index = ordinal
    ordinal += 1
    const key = `${path}${kind}:${index}`

    if (kind === 'item') {
      const value = readValue(readProp(props, 'value'))
      if (value === undefined) {
        // `value` 是必填契约：没有它无法做选中 / 展开 / 祖先链推导。
        // 这里直接跳过而不是猜一个下标 —— 静默错位比报错更难查。
        continue
      }
      const children = collectNodes(
        asRenderFn(slots.children)?.() ?? [],
        types,
        `${path}${String(value)}/`,
      )
      const isExpandedRaw = readProp(props, 'isExpanded')
      result.push({
        kind,
        key,
        value,
        content: readString(readProp(props, 'content')),
        renderContent: asRenderFn(slots.default),
        renderIcon: asRenderFn(slots.icon),
        children,
        // `NavigationViewItem.SelectsOnInvoked` 缺省 `true`
        // （Generated/NavigationViewItem.properties.cpp:130）
        selectsOnInvoked: readBooleanProp(readProp(props, 'selectsOnInvoked'), true),
        disabled: readBooleanProp(readProp(props, 'disabled'), false),
        hasUnrealizedChildren: readBooleanProp(readProp(props, 'hasUnrealizedChildren'), false),
        // 受控与否由「是否显式传了」决定：`undefined` 视为非受控
        isExpanded: typeof isExpandedRaw === 'boolean' ? isExpandedRaw : undefined,
        // `NavigationViewItem.IsExpanded` 缺省 `false`
        // （Generated/NavigationViewItem.properties.cpp:97）
        defaultIsExpanded: readBooleanProp(readProp(props, 'defaultIsExpanded'), false),
        ariaLabel: readString(readProp(props, 'ariaLabel')) || undefined,
        isChildSelected:
          typeof readProp(props, 'isChildSelected') === 'boolean'
            ? (readProp(props, 'isChildSelected') as boolean)
            : undefined,
      })
      continue
    }

    result.push({
      kind,
      key,
      content: readString(readProp(props, 'content')),
      renderContent: asRenderFn(slots.default),
      renderIcon: undefined,
      children: [],
      selectsOnInvoked: false,
      disabled: false,
      hasUnrealizedChildren: false,
      defaultIsExpanded: false,
    })
  }

  return result
}

/** 只保留 `item`（用于 `#footer` 的 `footerMenuItems` 等只需条目的场合） */
export const filterItems = (nodes: NavigationNode[]): NavigationNode[] =>
  nodes.filter((node) => node.kind === 'item')

/** 深度优先展平所有 `item`（含各级子项） */
export const flattenItems = (nodes: NavigationNode[]): NavigationNode[] =>
  nodes.flatMap((node) =>
    node.kind === 'item' ? [node, ...flattenItems(node.children)] : flattenItems(node.children),
  )

/** 判断 `value` 是否出现在该节点的**后代**里（不含自身）—— 对应 WinUI 的 `IsChildSelected` 推导 */
export const hasSelectedDescendant = (
  node: NavigationNode,
  selectedValue: string | number | undefined,
): boolean => {
  if (selectedValue === undefined) {
    return false
  }
  return flattenItems(node.children).some((child) => child.value === selectedValue)
}

/** 判断某个 `value` 是否在给定节点列表里（含递归后代）—— 用于校验受控选中值是否存在 */
export const containsValue = (
  nodes: NavigationNode[],
  value: string | number | undefined,
): boolean => {
  if (value === undefined) {
    return false
  }
  return flattenItems(nodes).some((node) => node.value === value)
}

/** 给 `FluereNavigationViewItem` 的静态类型用的轻量描述（见 `types.ts` 的 `NavigationChildDescriptor`） */
export const toChildDescriptors = (nodes: NavigationNode[]): NavigationChildDescriptor[] =>
  filterItems(nodes).map((node) => ({
    value: node.value as string | number,
    disabled: node.disabled,
  }))
