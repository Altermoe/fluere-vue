# @fluere-vue/ui

基于 WinUI 3 的 Vue 3 组件实现（组件层）。

本文件**只做组件索引**：列出本包的公开导出、源码位置与对应文档页。
组件的规格、状态、动效、Props 契约与用法示例统一在顶层文档维护，见文末《相关文档》。

## 组件索引

| 导出                                      | 源码                                                      | 文档                                                                                           |
| ----------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `FluereButton`                            | [button](./src/button/button.vue)                         | [Button](../../apps/docs/content/zh-Hans/components/button.md)                                 |
| `FluereInput`                             | [input](./src/input/input.vue)                            | [Input](../../apps/docs/content/zh-Hans/components/input.md)                                   |
| `FluereScrollView`                        | [scrollview](./src/scrollview/scroll-view.vue)            | [Scroll View](../../apps/docs/content/zh-Hans/components/scroll-view.md)                       |
| `FluereCheckbox`                          | [checkbox](./src/checkbox/checkbox.vue)                   | [Checkbox](../../apps/docs/content/zh-Hans/components/checkbox.md)                             |
| `FluereCombobox`                          | [combobox](./src/combobox/combobox.vue)                   | [Combobox](../../apps/docs/content/zh-Hans/components/combobox.md)                             |
| `FluereNumberBox`                         | [number-box](./src/number-box/number-box.vue)             | [Number Box](../../apps/docs/content/zh-Hans/components/number-box.md)                         |
| `FluereRadioGroup` / `FluereRadioButton`  | [radio](./src/radio/radio-group.vue)                      | [Radio Group](../../apps/docs/content/zh-Hans/components/radio-group.md)                       |
| `FluereSlider`                            | [slider](./src/slider/slider.vue)                         | [Slider](../../apps/docs/content/zh-Hans/components/slider.md)                                 |
| `FluereToggleSwitch`                      | [toggle-switch](./src/toggle-switch/toggle-switch.vue)    | [Switch](../../apps/docs/content/zh-Hans/components/switch.md)                                 |
| `FluereInfoBadge`                         | [info-badge](./src/info-badge/info-badge.vue)             | [Info Badge](../../apps/docs/content/zh-Hans/components/info-badge.md)                         |
| `FluereInfoBar`                           | [infobar](./src/infobar/infobar.vue)                      | [Info Bar](../../apps/docs/content/zh-Hans/components/infobar.md)                              |
| `FluereProgressBar`                       | [progress-bar](./src/progress-bar/progress-bar.vue)       | [Progress Bar](../../apps/docs/content/zh-Hans/components/progress.md)                         |
| `FluereProgressRing`                      | [progress-ring](./src/progress-ring/progress-ring.vue)    | [Progress Ring](../../apps/docs/content/zh-Hans/components/progress-ring.md)                   |
| `FluereContentDialog`                     | [content-dialog](./src/content-dialog/content-dialog.vue) | [Content Dialog](../../apps/docs/content/zh-Hans/components/content-dialog.md)                 |
| `FluereSmokeLayer`                        | [overlay](./src/overlay/smoke-layer.vue)                  | [Content Dialog](../../apps/docs/content/zh-Hans/components/content-dialog.md)（共享弹层原语） |
| `FluereTooltip` / `FluereTooltipProvider` | [tooltip](./src/tooltip/tooltip.vue)                      | [Tooltip](../../apps/docs/content/zh-Hans/components/tooltip.md)                               |

> 完整导出清单（含 `SCROLL_VIEW_AGENT_EVENTS` 与全部 Props / 事件类型）以 [index.ts](./index.ts) 为准；
> 英文文档与上表同名，位于 [content/en/components](../../apps/docs/content/en/components)。

## 相关文档

- [根 README](../../README.md) — 项目定位、安装、快速开始、组件进度表
- [文档站](../../apps/docs) — 组件规格与在线示例（本地 `pnpm dev`，http://localhost:60727/components/）
- [AGENTS.md](../../AGENTS.md) — 开发约定与新增组件流程
- [docs/style-spec.md](../../docs/style-spec.md) — 对齐源与验证方法
