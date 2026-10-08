/**
 * 把当前语种的 `<html lang>` 写进 SSR 的 head。
 *
 * 背景：@nuxtjs/i18n 不自动把 `lang` 属性挂到 `<html>`（`<use-locale-path>` 等只处理
 * 路由与导航），需要显式用 `useLocaleHead()` 取出 `htmlAttrs.lang` 再交给 `useHead`。
 * 这样 SSR 端即按路由前缀（zh-Hans → zh-CN、en → en）输出一致 `<html lang>`，
 * 水合后也不会漂移（locale 由路由后缀确定，与 `<use-color-mode>` 的运行时偏好解耦）。
 *
 * 顺带用 `useLocaleHead` 的 seo 输出补全 `alternate`（hreflang）等链接。
 */
export default defineNuxtPlugin(() => {
  const head = useLocaleHead({
    lang: true,
    seo: true,
  })
  useHead(() => ({
    htmlAttrs: {
      lang: head.value?.htmlAttrs?.lang ?? undefined,
    },
    link: head.value?.link ?? [],
    meta: head.value?.meta ?? [],
  }))
})
