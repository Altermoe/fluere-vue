---
'@fluere-vue/ui': patch
'@fluere-vue/designs': patch
'@fluere-vue/hooks': patch
'@fluere-vue/icons': patch
'@fluere-vue/themes': patch
'@fluere-vue/utils': patch
---

补齐 npm 发布前的构建基建：Vite 8 lib mode（纯 ESM）产物 + 完整 `exports` / `files` / `sideEffects` / `peerDependencies` 等包元数据，`@fluere-vue/ui` 的 `.d.ts` 改由 `vue-tsc` 生成（保留 SFC 精确 Props）。接入 Changesets（fixed 统一版本）与发布检查（publint / attw）。配套文档见 `docs/adr/0001-library-build-tooling.md`、`docs/release.md`。构建与认知不变：入口现指向 `dist`，消费端需 `import '@fluere-vue/ui/style.css'`。
