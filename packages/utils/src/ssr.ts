/**
 * SSR 环境与浏览器能力探测（框架无关，可在任何 Vue 运行环境使用）。
 *
 * 组件库代码会在服务端（Node SSR）与浏览器各执行一遍：`window` / `document`
 * / `navigator` / `matchMedia` / `ResizeObserver` 等浏览器专属 API 在 Node 中
 * 不存在，`setup()` 阶段直接访问会抛错（典型症状：整页 500）。这里统一用
 * 「能力探测」提供 SSR 安全的判断，供各组件 / composable 复用，避免各自手搓
 * `typeof` 判断。
 *
 * 设计约定：
 *  - `isClient` / `isServer`：**平台环境**判断（是否存在 `window`）。运行环境
 *    不会在进程生命周期内变化，故导出为导入时求值的常量。
 *  - `hasXxx()`：**浏览器能力**探测，导出为调用时求值的函数——能力可能被
 *    测试运行时 stub（如 `vi.stubGlobal('matchMedia', …)`），或在不同宿主
 *    （iframe / worker / jsdom）下不同，须在真正访问前一刻判定。
 *
 * 使用约定：
 *  - 仅适合在 `setup()` 期「读取、但不渲染进模板」的场合；需要渲染进模板的
 *    值必须挂载后再写入（否则触发水合不匹配），或用 `<ClientOnly>` 包裹。
 */

/** 是否运行在客户端（存在 `window` 的环境，含 jsdom 测试） */
// oxlint-disable-next-line unicorn/prefer-global-this -- 检测浏览器环境只能用 window，globalThis 在 Node 中恒存在
const isClient = typeof window !== 'undefined'

/** 是否运行在服务端（Node SSR 或纯 node 环境） */
const isServer = !isClient

/** `matchMedia` 是否可用（prefers-reduced-motion 等媒体查询） */
const hasMatchMedia = (): boolean => typeof globalThis.matchMedia === 'function'

/**
 * `document` 是否可用（DOM 监听 / 焦点操作）。
 *
 * 与 `isClient`（导入时求值的平台常量）不同，这里按**调用时**求值：单测可以
 * `vi.stubGlobal('document', undefined)` 复现「无 DOM 环境」验证副作用为零
 * （hooks 的 `useFocusTrap` SSR 用例即如此），运行期能力也可能被宿主改变。
 */
const hasDocument = (): boolean => typeof globalThis.document !== 'undefined'

/** `ResizeObserver` 是否可用（视口 / 内容尺寸监听） */
const hasResizeObserver = (): boolean => typeof globalThis.ResizeObserver === 'function'

/** `MutationObserver` 是否可用（DOM 变更监听） */
const hasMutationObserver = (): boolean => typeof globalThis.MutationObserver === 'function'

/** `IntersectionObserver` 是否可用（元素进入视口监听） */
const hasIntersectionObserver = (): boolean => typeof globalThis.IntersectionObserver === 'function'

/** `requestAnimationFrame` 是否可用（动画帧调度） */
const hasRequestAnimationFrame = (): boolean =>
  typeof globalThis.requestAnimationFrame === 'function'

export {
  isClient,
  isServer,
  hasMatchMedia,
  hasDocument,
  hasResizeObserver,
  hasMutationObserver,
  hasIntersectionObserver,
  hasRequestAnimationFrame,
}
