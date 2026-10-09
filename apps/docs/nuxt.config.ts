import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { presetFluere } from '@fluere-vue/themes'
import { presetWind4, type Preset } from 'unocss'

/** 版本号事实源：仓库根 package.json（相对本配置文件定位，避免依赖 cwd）。 */
const rootVersion = (
  JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as {
    version: string
  }
).version

/**
 * 判断某条 optimizeDeps.include 条目是否能被逐级解析为真实模块。
 * 形如 "@nuxt/content > @nuxtjs/mdc > remark-gfm" 的深层条目，
 * 在 pnpm 的隔离布局下无法解析（@nuxt/content 内部缺少对 @nuxtjs/mdc 的链接）。
 * 若任一跳转失败则视为无法解析。
 */
function resolveOptimizeDepsEntry(id: string, rootDir: string) {
  const requireFrom = createRequire(`${rootDir}/nuxt.config.ts`)
  let baseDir = rootDir
  for (const part of id.split('>').map((s) => s.trim())) {
    try {
      // 先按包主入口解析，取所在目录作为下一跳的搜索起点
      baseDir = dirname(requireFrom.resolve(part, { paths: [baseDir] }))
    } catch {
      return false
    }
  }
  return true
}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: false },
  modules: ['@nuxtjs/i18n', '@unocss/nuxt', '@nuxt/content'],
  i18n: {
    // 路由策略：默认语种（zh-Hans）不带前缀，其余语种（en）走 /en 前缀。
    // 一期语言固定 zh-Hans（作为 zh-CN 的默认呈现）+ en。
    strategy: 'prefix_except_default',
    defaultLocale: 'zh-Hans',
    locales: [
      { code: 'zh-Hans', language: 'zh-CN', name: '简体中文', file: 'zh-Hans.json' },
      { code: 'en', language: 'en', name: 'English', file: 'en.json' },
    ],
    // v10 起语言文件按需懒加载（lazy 选项已被移除，不再需要显式声明）
    // fallbackLocale 属 vue-i18n 配置，见 i18n/configs/i18n.config.ts
    baseUrl: 'https://fluere-vue.nahida.website',
    // 记住上次语言选择；key 命名风格与既有的 fluere-docs-color-mode 保持一致。
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'fluere-docs-locale',
      cookieSecure: false,
      redirectOn: 'root',
    },
    vueI18n: './configs/i18n.config.ts',
  },
  content: {
    // 用 Node 原生 sqlite（v22.5+），避免 pnpm 原生构建脚本被禁导致的 better-sqlite3 绑定问题
    experimental: { sqliteConnector: 'native' },
    build: {
      markdown: {
        highlight: {
          theme: {
            default: 'github-light',
            dark: 'github-dark',
          },
          langs: ['js', 'ts', 'json', 'vue', 'html', 'css', 'shell', 'md', 'mdc', 'yaml'],
        },
      },
    },
  },
  // content-code.css：Shiki 代码块明暗增强；theme-transition.css：主题切换的圆形揭示；
  // docs-prose.css：正文（MDC prose）排版——回补 presetWind4 preflight 抹平的
  // 标题层级 / 段落间距 / 列表标记 / 链接三态（作用域 .docs-prose）
  css: ['~/assets/content-code.css', '~/assets/theme-transition.css', '~/assets/docs-prose.css'],
  vite: {
    plugins: [
      {
        name: 'prune-unresolvable-optimize-deps',
        config(config) {
          // 某些 Nuxt 模块（如 @nuxt/content）注入的 optimizeDeps.include 深层
          // 条目（如 "@nuxt/content > @nuxtjs/mdc > remark-gfm"）在 pnpm 隔离
          // 布局下无法解析，会触发 NUXT_B7002 启动警告。Vite 的 config 钩子在
          // 所有模块合并到最终配置之后触发，这里把无法解析的条目过滤掉
          // （仅影响 dev 预打包提示，不影响运行正确性）。
          const include = config.optimizeDeps?.include
          if (!Array.isArray(include)) return
          return {
            optimizeDeps: {
              include: include.filter((id) => resolveOptimizeDepsEntry(id, process.cwd())),
            },
          }
        },
      },
    ],
  },
  unocss: {
    presets: [presetWind4(), presetFluere() as Preset],
    content: {
      pipeline: {
        include: [
          // 扫描当前 docs 项目内的文件
          /\.(vue|svelte|[jt]sx|mdx?|astro|elm|php|phtml|html)($|\?)/,
        ],
      },
    },
  },
  experimental: {
    defaults: {
      nuxtLink: {
        // 默认只有「可见性预取」；补上交互预取，指针移入 / 键盘聚焦目标链接时就
        // 预加载目标页组件 chunk，点击后 vue-router 不必再等组件下载完才完成跳转。
        // 具体预取动作见 plugins/docs-route-loading.client.ts。
        prefetchOn: { visibility: true, interaction: true },
      },
    },
  },
  devServer: {
    port: 60727,
  },
  // 版本号单一事实源 = 仓库根 package.json（子包版本由 `pnpm version:sync` 同步）。
  // CI 里由发布 tag 注入 NUXT_PUBLIC_DOCS_VERSION（形如 v0.1.0），本地/分支构建回退到根版本；
  // 页面一律读 runtimeConfig.public.docsVersion，禁止再硬编码 vX.Y.Z。
  runtimeConfig: {
    public: {
      docsVersion: String(process.env.NUXT_PUBLIC_DOCS_VERSION || rootVersion).replace(/^v/, ''),
    },
  },
  app: {
    head: {
      // 说明：<html lang> 不再在这里硬编码，改由 @nuxtjs/i18n 的 useLocaleHead
      // 按路由前缀输出（zh-Hans→zh-CN、en→en），保证 SSR 与水合一致。
      title: 'FluereVue',
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
      // 首帧前按已保存偏好（或系统偏好）写入 <html>，避免明暗切换闪烁。
      // 与 composables/useColorMode.ts 保持同一套取值规则。
      script: [
        {
          innerHTML:
            "(function(){try{var k='fluere-docs-color-mode';var s=localStorage.getItem(k);var m=(s==='dark'||s==='light')?s:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');var el=document.documentElement;el.style.colorScheme=m;el.dataset.colorMode=m;}catch(e){}})();",
          tagPosition: 'head',
        },
      ],
    },
  },
})
