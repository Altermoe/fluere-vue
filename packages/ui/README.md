# @fluere-vue/ui

基于 WinUI 3 的 Vue 3 组件实现（组件层）。

本文件**只做组件索引**：列出本包的公开导出、源码位置与对应文档页。
组件的规格、状态、动效、Props 契约与用法示例统一在顶层文档维护，见文末《相关文档》。

## 安装与按需引入

```bash
pnpm add @fluere-vue/ui vue
# 全局 token + 组件 scoped 样式：
import '@fluere-vue/ui/style.css'
```

- **纯 ESM**；`vue` 为对等依赖（peer），由消费方提供。JS 可 tree-shake——`import { FluereButton } from '@fluere-vue/ui'` 只打包你引用的组件（组件 scoped 样式在 `style.css`，需全量引入）。
- **子路径**：
  - `@fluere-vue/ui/style.css` — 全部视觉样式（Flutter tokens + 组件 scoped）；
  - `@fluere-vue/ui/locales/zh-Hans` / `@fluere-vue/ui/locales/en` — 语言包子路径导出
    （各组件 locale 切片的聚合 bundle，供 `FluereConfigProvider` 传入 `messages`）。
- 构建产物 `dist/` 由 `pnpm --filter @fluere-vue/ui build` 生成（Vite lib mode + `vue-tsc` 产出 `.d.ts`），详见 `docs/adr/0001-library-build-tooling.md`。

## 组件索引

| 导出                                      | 源码                                                         | 文档                                                                                           |
| ----------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `FluereButton`                            | [button](./src/button/button.vue)                            | [Button](../../apps/docs/content/zh-Hans/components/button.md)                                 |
| `FluereInput`                             | [input](./src/input/input.vue)                               | [Input](../../apps/docs/content/zh-Hans/components/input.md)                                   |
| `FluereScrollView`                        | [scrollview](./src/scrollview/scroll-view.vue)               | [Scroll View](../../apps/docs/content/zh-Hans/components/scroll-view.md)                       |
| `FluereCheckbox`                          | [checkbox](./src/checkbox/checkbox.vue)                      | [Checkbox](../../apps/docs/content/zh-Hans/components/checkbox.md)                             |
| `FluereCombobox`                          | [combobox](./src/combobox/combobox.vue)                      | [Combobox](../../apps/docs/content/zh-Hans/components/combobox.md)                             |
| `FluereNumberBox`                         | [number-box](./src/number-box/number-box.vue)                | [Number Box](../../apps/docs/content/zh-Hans/components/number-box.md)                         |
| `FluereRadioGroup` / `FluereRadioButton`  | [radio](./src/radio/radio-group.vue)                         | [Radio Group](../../apps/docs/content/zh-Hans/components/radio-group.md)                       |
| `FluereSlider`                            | [slider](./src/slider/slider.vue)                            | [Slider](../../apps/docs/content/zh-Hans/components/slider.md)                                 |
| `FluereToggleSwitch`                      | [toggle-switch](./src/toggle-switch/toggle-switch.vue)       | [Switch](../../apps/docs/content/zh-Hans/components/switch.md)                                 |
| `FluereInfoBadge`                         | [info-badge](./src/info-badge/info-badge.vue)                | [Info Badge](../../apps/docs/content/zh-Hans/components/info-badge.md)                         |
| `FluereInfoBar`                           | [infobar](./src/infobar/infobar.vue)                         | [Info Bar](../../apps/docs/content/zh-Hans/components/infobar.md)                              |
| `FluereProgressBar`                       | [progress-bar](./src/progress-bar/progress-bar.vue)          | [Progress Bar](../../apps/docs/content/zh-Hans/components/progress.md)                         |
| `FluereProgressRing`                      | [progress-ring](./src/progress-ring/progress-ring.vue)       | [Progress Ring](../../apps/docs/content/zh-Hans/components/progress-ring.md)                   |
| `FluereContentDialog`                     | [content-dialog](./src/content-dialog/content-dialog.vue)    | [Content Dialog](../../apps/docs/content/zh-Hans/components/content-dialog.md)                 |
| `FluereSmokeLayer`                        | [overlay](./src/overlay/smoke-layer.vue)                     | [Content Dialog](../../apps/docs/content/zh-Hans/components/content-dialog.md)（共享弹层原语） |
| `FluereTooltip` / `FluereTooltipProvider` | [tooltip](./src/tooltip/tooltip.vue)                         | [Tooltip](../../apps/docs/content/zh-Hans/components/tooltip.md)                               |
| `FluereConfigProvider`                    | [config-provider](./src/config-provider/config-provider.vue) | [Config Provider / i18n](../../apps/docs/content/zh-Hans/components/config-provider.md)        |

> 完整导出清单（含 `SCROLL_VIEW_AGENT_EVENTS` 与全部 Props / 事件类型）以 [index.ts](./index.ts) 为准；
> 英文文档与上表同名，位于 [content/en/components](../../apps/docs/content/en/components)。

## 组件库内建文案与 i18n（todo 目标 1 · 1.4）

组件库内建的 **a11y 可访问名 / 缺省文案**（如输入框显示按钮、数字框增减按钮、滚动条、
InfoBar 关闭按钮、进度条不确定态）默认跟随内置缺省语种 **zh-Hans**。要切换语言或覆盖
个别措辞，用 `FluereConfigProvider`：

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { FluereConfigProvider } from '@fluere-vue/ui'
const locale = ref<'zh-Hans' | 'en'>('en')
</script>

<template>
  <FluereConfigProvider :locale="locale">
    <!-- 库内组件将按 locale 取英文内建文案 -->
  </FluereConfigProvider>
</template>
```

- **解析优先级**：显式文案 prop（如 `revealButtonLabel`）→ 组件 `locale` prop →
  `FluereConfigProvider` → 内置缺省 zh-Hans；缺 key 回退链 `zh-Hans → zh → en`。
- **按需 / tree-shaking**：每组件一个消息切片，位于各组件目录 `locale.ts`
  （如 `./src/input/locale.ts`），组件在 setup 中 `useScopeMessages` 自 import，
  不引入 `vue-i18n` 运行时（复用 `@intlify/core-base`；见 `packages/hooks` 的
  `use-locale`）。语言包子路径导出 `@fluere-vue/ui/locales/zh-Hans` / `/en`
  随 0.3 目标 3 的构建落地时提供聚合入口。
- **Provider messages 覆盖**：`messages={{ 'zh-Hans': { input: { showPassword: '…' } } }}`
  可在不改源码的前提下微调个别文案。
- 详见 [Config Provider / i18n](../../apps/docs/content/zh-Hans/components/config-provider.md)。

## 相关文档

- [根 README](../../README.md) — 项目定位、安装、快速开始、组件进度表
- [文档站](../../apps/docs) — 组件规格与在线示例（本地 `pnpm dev`，http://localhost:60727/components/）
- [AGENTS.md](../../AGENTS.md) — 开发约定与新增组件流程
- [docs/style-spec.md](../../docs/style-spec.md) — 对齐源与验证方法
