// 图标库**发布入口**（构建 barrel）。
// 作用：让 vite-plugin-dts 能把 index.d.ts 拍平到 dist/index.d.ts（与 index.js 同层），
// 并让 dist/ 内 `./generated/*`、`./src/factory` 的相对声明自洽。
// 开发/测试仍走 packages/icons/src/index.ts（tsconfig.base.json 的 paths）。
export * from './generated/index'
export type { FluentIconName, FluentIconSize, FluentIconStyle } from './generated/names'
export { fluentIconNames } from './generated/names'
export type { FluentIconOptions, FluentIconProps } from './src/factory'
export { createFluentIcon } from './src/factory'
