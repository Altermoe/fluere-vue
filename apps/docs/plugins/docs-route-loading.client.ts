/**
 * 文档站路由加载态与路由组件预取（仅客户端）。
 *
 * 1）加载态（喂给 DocsRouteSkeleton）
 *    起点挂在路由器全局 `beforeEach` 上：它早于「懒加载路由组件解析」
 *    （后者发生在更晚的 beforeRouteEnter 阶段，见 vue-router 的
 *    `extractComponentsGuards`：进入记录里的函数式组件会在那里被 await），
 *    所以状态在点击瞬间就置位，早于 chunk 下载。
 *    终点用 Nuxt 的 `page:loading:end`：目标页 Suspense 解析完成
 *    （含 `await useAsyncData` 这类页面内异步数据）或导航失败时触发。
 *    两者合起来恰好框住「点击 → 新页面可用」的全过程。
 *
 *    首跳（水合时 vue-router 对当前地址的那次 push）不算用户触发的切换：
 *    SSR 已经把这一页渲染进 HTML，若此时置位，客户端会多渲染一层骨架，
 *    与服务端产物不一致（Hydration node mismatch）。判据用 `from.matched.length === 0`
 *    （vue-router 的 START_LOCATION 没有匹配记录），**不能**用 `nuxtApp.isHydrating`：
 *    实测首页（`/`，无布局、同步 setup）在 `app:mounted` 之后 `isHydrating` 仍会持续
 *    一段时间（`app:suspense:resolve` 迟迟不触发），拿它当判据会把用户这段时间里的
 *    点击一并跳过，等于没有加载态。
 *
 * 2）路由组件预取
 *    NuxtLink 在 dev 下刻意跳过组件预取（nuxt-link.ts 里
 *    `!import.meta.dev && ... preloadRouteComponents(...)`），文档站的跳转不应被
 *    chunk 加载阻塞，于是在 `link:prefetch` 里无条件补上：该钩子在「链接可见」与
 *    （开启 interaction 后）「指针悬停 / 聚焦」时都会被 NuxtLink 调用，
 *    于是点击之前目标页 chunk 通常已就位，vue-router 的懒加载解析不再等网络。
 *    生产环境下 Nuxt 内置逻辑已做同一件事，重复调用会命中 `_routePreloaded` 缓存，
 *    是空操作。
 *
 *    另外在 `app:mounted` 后做一次空闲预热：可见性预取依赖 Nuxt 的 `onNuxtReady`，
 *    而它挂在 `app:suspense:resolve` 上——首页那条路径上它可能很久都不来，
 *    于是「首页 → 文档页」的首次跳转仍要现下载页面组件与布局。这里对所有路由记录
 *    直接跑一遍 `link:prefetch`（Nuxt 自己的处理器负责目标布局与命名中间件）
 *    加页面组件预取，把这段补齐。
 */
export default defineNuxtPlugin((nuxtApp) => {
  const router = useRouter()
  const routeLoading = useDocsRouteLoading()

  router.beforeEach((_to, from) => {
    // from.matched 为空 = vue-router 的 START_LOCATION：水合首跳，见文件头注释
    if (from.matched.length === 0 || nuxtApp.isHydrating) {
      return
    }
    routeLoading.value = true
  })

  nuxtApp.hook('page:loading:end', () => {
    routeLoading.value = false
  })

  /** 预取一条路由：页面组件 chunk + （交给 Nuxt）目标布局与命名中间件 */
  const prefetchRoute = (name: string) => {
    const target = { name }
    void preloadRouteComponents(target, router).catch(() => {})
    try {
      const resolved = router.resolve(target)
      // callHook 的返回值可能是 void（同步钩子），先包一层 Promise 才能安全吞异常
      void Promise.resolve(nuxtApp.callHook('link:prefetch', resolved.fullPath)).catch(() => {})
    } catch {
      // 参数补不全的路由解析会抛错：跳过布局预取即可，页面组件已在上一步预取
    }
  }

  nuxtApp.hook('link:prefetch', (url) => {
    // 外链（带协议）没有路由组件可预取；其余交给 router.resolve，未命中的路径会自行返回。
    if (/^[a-z][\w+.-]*:/i.test(url)) {
      return
    }
    void preloadRouteComponents(url, router).catch(() => {})
  })

  // 空闲预热：文档站页面模块数量有限，一次性取回后，任何点击都不会再等组件下载
  nuxtApp.hook('app:mounted', () => {
    const warmUp = () => {
      for (const record of router.getRoutes()) {
        if (typeof record.name === 'string') {
          prefetchRoute(record.name)
        }
      }
    }
    if (typeof globalThis.requestIdleCallback === 'function') {
      globalThis.requestIdleCallback(warmUp, { timeout: 2000 })
    } else {
      setTimeout(warmUp, 200)
    }
  })
})
