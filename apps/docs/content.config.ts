import { defineContentConfig, defineCollection, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    /*
     * 组件文档按语种拆分成两个 collection（默认语种 zh-Hans 与英语 en），
     * 路由前缀与 @nuxtjs/i18n 的 `prefix_except_default` 策略对齐：
     *  - zh-Hans（默认语种，无前缀）：源文件在 content/zh-Hans/**，文档 path=/components/<slug>
     *  - en（带 /en 前缀）：源文件在 content/en/**，source.prefix='/en' 让文档 path=/en/components/<slug>
     * 这样 pages/components/[...slug].vue 直接以当前 locale 选择 collection、
     * 并按 route.path 精确匹配即可；无需在页面里二次拼接/裁剪语言前缀。
     * collection 名必须是合法 JS 标识符，故用 `content_en`（下划线）。
     * 正文目录按语种拆分，杜绝「双语混写在同一个文件里」导致无法并行翻译 / 评级漂移。
     */
    content: defineCollection({
      type: 'page',
      source: {
        include: 'zh-Hans/**/*.md',
        // 关键：不写 source.prefix 时，source 的固定目录段（zh-Hans/）会作为文档 path
        // 的前缀（得到 /zh-hans/components/...，与默认语种的无前缀路由不匹配）。
        // 显式置 '' 让文档 path 精确地落在 /components/<slug>，才能与 /（zh 默认）对齐。
        prefix: '',
        exclude: ['**/*.draft.md'],
      },
      schema: z.object({
        title: z.string(),
        description: z.string().optional(),
        nav: z.object({ title: z.string() }).optional(),
      }),
    }),
    content_en: defineCollection({
      type: 'page',
      source: {
        include: 'en/**/*.md',
        prefix: '/en',
        exclude: ['**/*.draft.md'],
      },
      schema: z.object({
        title: z.string(),
        description: z.string().optional(),
        nav: z.object({ title: z.string() }).optional(),
      }),
    }),
  },
})
