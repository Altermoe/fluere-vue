import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { presetFluere } from '@fluere-vue/themes'
import { presetWind4, type Preset } from 'unocss'

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
  modules: ['@unocss/nuxt', '@nuxt/content'],
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
  app: {
    head: {
      htmlAttrs: {
        lang: 'zh-CN',
      },
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
