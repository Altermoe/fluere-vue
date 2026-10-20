import { inject, provide } from 'vue'
import type { VNode } from 'vue'
import { inspectMenuItems, MENU_LAYOUT_KEY } from './context'
import type { MenuItemTypeRegistry } from './context'

/**
 * 面板级条目布局（图标列 / 勾选列占位）。
 *
 * WinUI 的 `MenuFlyoutPresenter` 用 `ContainsIconItems` / `ContainsToggleItems`
 * 决定每个条目的占位：只有图标或只有勾选时普通条目让出 28px，两者同时存在时
 * 让出 56px、图标列再让 28px。每个 presenter（根菜单 / 每个子菜单）独立统计
 * 自己的直接条目。
 *
 * 这里用 **getter** 而不是普通对象：条目在每次渲染时重新取当前 slot vnode 的
 * 统计结果，避免父级 slot 增删后占位不更新；也不引入响应式写入（SSR 稳定）。
 */

/** `MENU_LAYOUT_KEY` 的缺省值：没有布局上下文时按「无图标 / 无勾选」处理。 */
export const EMPTY_MENU_LAYOUT = {
  hasIcon: () => false,
  hasToggle: () => false,
} as const

/** 读取最近的菜单面板布局（条目组件用）。 */
export const useMenuLayout = () => inject(MENU_LAYOUT_KEY, EMPTY_MENU_LAYOUT)

/**
 * 为一个菜单面板提供布局上下文。
 * @param slot 面板内容插槽（根组件传 `#content`，SubItem 传默认插槽）
 * @param registry 本面板用到的条目组件类型（用于 vnode 类型识别）
 */
export const provideMenuLayout = (
  slot: (() => VNode[] | undefined) | undefined,
  registry: MenuItemTypeRegistry,
): void => {
  const hasIcon = (): boolean =>
    slot === undefined ? false : inspectMenuItems(slot() ?? [], registry).hasIcon
  const hasToggle = (): boolean =>
    slot === undefined ? false : inspectMenuItems(slot() ?? [], registry).hasToggle

  // 只读 getter 组成的普通对象：不触发额外渲染，SSR 下每次调用都得到同一结果。
  provide(MENU_LAYOUT_KEY, { hasIcon, hasToggle })
}
