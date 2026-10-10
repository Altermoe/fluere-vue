# @fluere-vue/docs

Nuxt 4 文档站（应用层，演示"可感知开发"）。

- 页面级样式使用 UnoCSS 工具类，颜色一律用**精确 token 名**（`bg-colorBrandBackground`、`p-fluent-m`、`rounded-fluent-md`），由 `@fluere-vue/themes` 的 `presetFluere` 注入 token 变量。
- 组件示例页直接消费 `@fluere-vue/ui`（组件样式自包含）。

## 命令

```bash
pnpm dev          # 本地开发
pnpm build        # 生产构建
pnpm generate     # 静态生成
```

## i18n 约定（一期：zh-Hans 默认 + en）

- **界面串**一律进 `apps/docs/i18n/locales/{zh-Hans,en}.json`（主语言 zh-Hans，双语言 key 集合必须同构），组件内用 `useDocsI18n()` 的 `t()` / `tm()`（Nuxt 自动导入；不要裸写 `useI18n`——`tm` 必须逐叶子解析预编译 AST，否则水合失配，见 `composables/use-docs-i18n.ts`）。
- **正文**走 `apps/docs/content/{zh-Hans,en}/**`（@nuxt/content 双 collection）；组件页 frontmatter 的 `title` / `description` 直接进 `useSeoMeta`，每语言独立 `title` / `og:*`（见 `pages/components/[...slug].vue`），`<title>` 模板在 `app.vue`。
- **demo 预览文案**：key 结构 `demos.<目录>.<示例>.<角色>`（如 `demos.checkbox.basic.agreeLabel`，示例名 = 文件名去掉 `<目录>-` 前缀与 `-demo.vue` 后缀），跨组件通用短语收敛在 `demos.common.*`。script 里取值必须包 `computed(() => t(...))` / `computed(() => tm(...))`，语种切换才会重算。英文正文 `#code` 围栏里的界面文案要与 `en.json` 的译文**逐字一致**（`/en` 页的预览与代码样例才对得上）。
- **闸门**：`pnpm i18n:check`（已接入 `pnpm check` / CI）阻断两件事——① 双语言 key 集合不一致；② pages / layouts / components / composables / data / plugins / utils 里**剥掉注释后**残留的中文界面串。有意硬编码（当前仅语言切换控件的目标语种标签）写进 `scripts/i18n-check.mjs` 的 `HARDCODED_ALLOW` 并注明理由。
