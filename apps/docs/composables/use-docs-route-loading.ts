/**
 * 文档站「路由加载中」共享状态。
 *
 * 写入方：plugins/docs-route-loading.client.ts（订阅 Nuxt 的
 * `page:loading:start` / `page:loading:end`）。
 * 读取方：各布局 / 页面里的遮罩控件 —— layouts/components.vue（文档内页）、
 * layouts/home.vue 与 pages/os/index.vue（主页与桌面仿真，共用
 * components/home/home-route-overlay.vue）。
 *
 * 用 Nuxt `useState` 而不是模块级 ref 或组件内 ref：
 *  - 状态要在「路由已开始加载、但目标布局还没挂载」的窗口里也成立——例如从主页
 *    跳进 /components/*（home 布局 → components 布局），此时发出加载信号的是插件，
 *    读取方要等目标布局挂载后才出现，只有跨组件的共享状态能接住这段窗口；
 *  - `useState` 在 SSR 下每请求隔离、客户端跨组件同引用，不会串请求。
 */
const DOCS_ROUTE_LOADING_KEY = 'docs-route-loading'

/** 当前是否有一次客户端路由跳转正在进行（含目标页组件 chunk 与页面内异步数据）。 */
export const useDocsRouteLoading = () => useState<boolean>(DOCS_ROUTE_LOADING_KEY, () => false)
