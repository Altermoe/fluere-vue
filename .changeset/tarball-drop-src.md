---
'@fluere-vue/ui': patch
'@fluere-vue/designs': patch
'@fluere-vue/icons': patch
'@fluere-vue/themes': patch
---

发布 tarball 不再携带顶层源码：从 `ui` / `designs` / `icons` / `themes` 的 `files` 移除 `src/`。

消费方入口全部由 `publishConfig` 指向 `dist`，而 `dist/index.d.ts` 的类型图依赖保留在 `dist/src/**` 的 `.d.ts`（随 `dist` 保留，不能删）。实测 `ui` tarball 由 250 个文件 / 790 kB 降到 102 个文件 / 471 kB（unpacked 3.1 MB → 1.9 MB）；`pnpm smoke:dist` 复验消费方链路（六包安装 + publint / attw + SSR 渲染 + CSS 子路径）通过。
