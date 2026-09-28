/**
 * 移动端组件导航抽屉的开合状态。
 *
 * 顶栏折叠按钮（layouts/components.vue）与抽屉浮层（components/docs-sidebar.vue）
 * 通过这个 composable 共享同一状态：用 Nuxt `useState` 保证 SSR 每请求隔离、
 * 客户端跨组件共享同一引用（模块级 ref 会在 SSR 时串请求，不可用）。
 *
 * 抽屉仅在 <1024px 的移动端模式下有意义；桌面端（≥1024px）由 CSS `lg:hidden`
 * 兜底隐藏，即便状态滞留也不会显示。
 */
export const useDocsSidebar = () => {
  /** 抽屉是否展开 */
  const open = useState<boolean>('docs-sidebar-open', () => false)

  /** 顶栏按钮：展开 <-> 收起 */
  const toggle = () => {
    open.value = !open.value
  }

  /** 收起抽屉：遮罩点击 / Escape / 路由切换 / 断点升至桌面时调用 */
  const close = () => {
    open.value = false
  }

  return { open, toggle, close }
}
