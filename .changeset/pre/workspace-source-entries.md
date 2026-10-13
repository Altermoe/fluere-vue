---
'@fluere-vue/ui': patch
'@fluere-vue/designs': patch
'@fluere-vue/hooks': patch
'@fluere-vue/icons': patch
'@fluere-vue/themes': patch
'@fluere-vue/utils': patch
---

修复仓库内开发链路对构建产物的强依赖：六个包的 `main` / `module` / `types` / `exports` 改为指向**源码**，发布时由 `publishConfig` 覆盖回 `dist`（pnpm/npm 官方支持的字段覆盖；`pnpm pack` 复核过 tarball 内清单与只读入口不变，消费方行为无变化）。

此前入口直指 `dist`，而 `dist` 已 gitignore：全新检出（CI / 新克隆）下 `pnpm dev`、`pnpm tsc`、`pnpm docs:generate` 会直接报 `No "exports" main defined in @fluere-vue/themes/package.json`；文档站也因此取不到任何组件 scoped 样式——`.fui-scrollview__presenter` 的 `position: absolute` / `overflow: clip` / `touch-action: none` 静默失效，ScrollView 视口塌成内容高度而无法滚动。

同时修正 `dist-smoke` 冒烟测试：`import('../../dist/index.js')` 是字面量说明符，Vite 在收集阶段即静态解析，未构建时直接报错、`skipIf` 形同虚设；改用 `pathToFileURL` + `@vite-ignore` 运行时求值，未构建时按注释契约真正跳过。

详见 `docs/adr/0001-library-build-tooling.md` §4.1。
