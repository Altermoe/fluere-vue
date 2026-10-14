import { isVNode, Fragment, createTextVNode, type VNode } from 'vue'
import type { TabItemDescriptor } from './types'

/**
 * 子项收集器：把 `<FluereTabView>` 默认插槽里的 `<FluereTabViewItem>` vnode
 * 读成「数据描述」——**这是本组件唯一一处必须在渲染期解析 vnode 的地方**，理由：
 *
 * WinUI `TabView` 的模板把 tab 条与内容区分成两棵子树（`TabView.xaml:29-44`：
 * `TabColumn` 里的 `TabViewListView` + 下方 `ContentPresenter`），而 Vue 的
 * `provide/inject` 注册式收集**只能在后代 `setup()` 之后**拿到数据 —— 父组件第一次
 * 渲染时注册表还是空的，SSR 直出会缺整条 tab 条、客户端水合后再补，既闪又水合不一致。
 * 因此这里在**父组件渲染期**直接读子 vnode 的 props / slots（等价 React 的
 * `cloneElement` 收集），一次渲染就得到完整列表，SSR 与水合完全一致。
 *
 * 支持的结构（其余结构**不支持**，见 tab-view.vue 的文档说明）：
 *   · 直接子元素：`<FluereTabViewItem … />`
 *   · `v-for` / `v-if` / `<template v-for>`：编译成 `Fragment`（会被摊平），`v-if` 的
 *     注释节点被过滤；
 *   · 子项内容用默认插槽（或 `#content`）、头用 `header` prop 或 `#header` 插槽、图标用 `#icon`。
 * 不支持的：把子项再包一层自定义组件 / 原生元素（那样 vnode 的 `type` 不再等于本组件）。
 */

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
 * 注释 / 文本节点不需要在这里剔除——`collectTabItems` 只认 `type === itemType` 的 vnode。
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

/** 从 props 里取字符串（缺省空串）；也接受数字（`header` 允许数字文本） */
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
 * **必须同时认 camelCase 与 kebab-case**：模板里写 `:is-closable="false"` 时，
 * 编译产物里的原始 prop 键就是 `'is-closable'`（Vue 只在创建组件实例时 camelize），
 * 而本组件读的是 vnode props 本身 —— 只认 camelCase 会把 `false` 当成「没传」，
 * 关闭按钮于是照常渲染。这是**真实浏览器实测抓到的 bug**（jsdom 单测当时用
 * `v-bind` 传对象、键本来就是 camelCase，所以没暴露）。
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
 * 裸属性（`<FluereTabViewItem disabled />`）编译成空串 `''`，Vue 视其为 `true`；
 * 缺省（`undefined` / `null`）时用 fallback（`IsClosable` 缺省 `true`）。
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

/**
 * 收集默认插槽里的 tab 子项。
 *
 * @param nodes `<FluereTabView>` 默认插槽产出的 vnode 数组（`slots.default?.() ?? []`）
 * @param itemType `FluereTabViewItem` 组件对象（用**引用相等**判定子项）
 */
export const collectTabItems = (
  nodes: readonly unknown[],
  itemType: unknown,
): TabItemDescriptor[] => {
  const items: TabItemDescriptor[] = []

  for (const node of flattenVNodes(nodes)) {
    if (node.type !== itemType) {
      continue
    }

    const props = (node.props ?? {}) as Record<string, unknown>
    const slots = readSlots(node.children)
    const value = readProp(props, 'value')
    const hasExplicitValue = typeof value === 'string' || typeof value === 'number'
    const hasKey = node.key != null && node.key !== ''

    const index = items.length
    const identity = hasExplicitValue
      ? `v:${String(value)}`
      : hasKey
        ? `k:${String(node.key)}`
        : `i:${index}`

    const renderContent = asRenderFn(slots.content ?? slots.default)
    const ariaLabel = readProp(props, 'ariaLabel')

    items.push({
      index,
      identity,
      // 只有显式 `value` / `:key` 才算稳定标识：没有时退回下标语义（跟随会失真，见 tab-view.vue）
      hasStableIdentity: hasExplicitValue || hasKey,
      header: readString(readProp(props, 'header')),
      renderIcon: asRenderFn(slots.icon),
      renderHeader: asRenderFn(slots.header),
      renderContent: renderContent ?? (() => []),
      // `TabViewItem.IsClosable` 缺省 `true`（Generated/TabViewItem.properties.cpp:67-77）
      isClosable: readBooleanProp(readProp(props, 'isClosable'), true),
      disabled: readBooleanProp(readProp(props, 'disabled'), false),
      ariaLabel: typeof ariaLabel === 'string' ? ariaLabel : undefined,
    })
  }

  return items
}

/** 上一次渲染的选中态（用于「按 tab 身份跟随 / 被移除后迁移」） */
export interface TabSelectionSnapshot {
  /** 与 items 一一对应的稳定标识；无稳定标识的项为 `null` */
  identities: (string | null)[]
  /** 上一次解析出来的选中下标 */
  index: number
}

/** 下标夹到 `[0, count-1]`；`proposed < 0` 表示「不要选中任何 tab」（返回 -1） */
export const clampIndex = (proposed: number, count: number): number => {
  if (count <= 0) {
    return -1
  }
  if (!Number.isFinite(proposed)) {
    return 0
  }
  const index = Math.trunc(proposed)
  if (index < 0) {
    return -1
  }
  return Math.min(index, count - 1)
}

/**
 * 「选中的 tab 被移除后选谁」——照抄 `TabView::OnItemsChanged`（`TabView.cpp:764-832`）：
 *
 * ```cpp
 * int startIndex = static_cast<int>(args.Index());      // 被移除的下标
 * if (startIndex >= numItems) { startIndex = numItems - 1; }
 * int index = startIndex;
 * do {
 *     const auto nextItem = ContainerFromIndex(index).as<winrt::ListViewItem>();
 *     if (nextItem && nextItem.IsEnabled() && nextItem.Visibility() == winrt::Visibility::Visible) {
 *         SelectedItem(TabItems().GetAt(index));
 *         break;
 *     }
 *     index++;
 *     if (index >= numItems) { index = 0; }
 * } while (index != startIndex);          // 向后环形找第一个可用的；一圈都没有就不选
 * ```
 */
export const migrateAfterRemoval = (items: TabItemDescriptor[], removedIndex: number): number => {
  const count = items.length
  if (count === 0) {
    return -1
  }
  const start = Math.min(Math.max(removedIndex, 0), count - 1)
  let index = start
  do {
    if (!items[index]?.disabled) {
      return index
    }
    index = (index + 1) % count
  } while (index !== start)
  return -1
}

/**
 * 解析本次渲染真正生效的选中下标。
 *
 * 两种情形分开处理：
 *  ① **调用方要求的下标变了**（`proposed !== 上一次解析值`）⇒ 就是它（夹到合法区间）；
 *  ② **要求没变但 tab 列表变了** ⇒ 按「选中 tab 的身份」跟随：
 *     · 该 tab 还在 ⇒ 用它的新下标（插入 / 重排都不会改变选中项，等价 WinUI 的 `SelectedItem`）；
 *     · 该 tab 被移除 ⇒ 走 `migrateAfterRemoval` 的向后环形规则。
 *  没有稳定标识（既没 `value` 也没 `:key`）时不做身份跟随，退回下标夹取 —— 这条差异
 *  写在文档页里，提醒消费方给 `:key`。
 *
 * 纯函数：不写任何响应式状态，可以在渲染期安全调用（也正因如此，SSR 直出与水合一致）。
 */
export const resolveSelectedIndex = (
  items: TabItemDescriptor[],
  previous: TabSelectionSnapshot | null,
  proposed: number,
): number => {
  if (items.length === 0) {
    return -1
  }
  if (previous && previous.index === proposed) {
    const previousIdentity = previous.identities[previous.index]
    if (typeof previousIdentity === 'string') {
      const followed = items.findIndex(
        (item) => item.hasStableIdentity && item.identity === previousIdentity,
      )
      if (followed !== -1) {
        return followed
      }
      return migrateAfterRemoval(items, previous.index)
    }
  }
  return clampIndex(proposed, items.length)
}

/** 为下一次解析准备快照 */
export const snapshotSelection = (
  items: TabItemDescriptor[],
  index: number,
): TabSelectionSnapshot => ({
  identities: items.map((item) => (item.hasStableIdentity ? item.identity : null)),
  index,
})
