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

| 导出                                          | 源码                                                         | 文档                                                                                           |
| --------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `FluereAppWindow` / `FluereCaptionButtons`    | [app-window](./src/app-window/app-window.vue)                | [App Window](../../apps/docs/content/zh-Hans/components/app-window.md)                         |
| `FluereButton`                                | [button](./src/button/button.vue)                            | [Button](../../apps/docs/content/zh-Hans/components/button.md)                                 |
| `FluereToggleButton`                          | [toggle-button](./src/toggle-button/toggle-button.vue)       | [Toggle Button](../../apps/docs/content/zh-Hans/components/toggle-button.md)                   |
| `FluereToggleGroup` / `FluereToggleGroupItem` | [toggle-group](./src/toggle-group/toggle-group.vue)          | [Toggle Group](../../apps/docs/content/zh-Hans/components/toggle-group.md)                     |
| `FluereInput`                                 | [input](./src/input/input.vue)                               | [Input](../../apps/docs/content/zh-Hans/components/input.md)                                   |
| `FluereSelect`                                | [select](./src/select/select.vue)                            | [Select](../../apps/docs/content/zh-Hans/components/select.md)                                 |
| `FluereScrollView`                            | [scrollview](./src/scrollview/scroll-view.vue)               | [Scroll View](../../apps/docs/content/zh-Hans/components/scroll-view.md)                       |
| `FluereCheckbox`                              | [checkbox](./src/checkbox/checkbox.vue)                      | [Checkbox](../../apps/docs/content/zh-Hans/components/checkbox.md)                             |
| `FluereCombobox`                              | [combobox](./src/combobox/combobox.vue)                      | [Combobox](../../apps/docs/content/zh-Hans/components/combobox.md)                             |
| `FluereNumberBox`                             | [number-box](./src/number-box/number-box.vue)                | [Number Box](../../apps/docs/content/zh-Hans/components/number-box.md)                         |
| `FluereRadioGroup` / `FluereRadioButton`      | [radio](./src/radio/radio-group.vue)                         | [Radio Group](../../apps/docs/content/zh-Hans/components/radio-group.md)                       |
| `FluereSlider`                                | [slider](./src/slider/slider.vue)                            | [Slider](../../apps/docs/content/zh-Hans/components/slider.md)                                 |
| `FluereToggleSwitch`                          | [toggle-switch](./src/toggle-switch/toggle-switch.vue)       | [Switch](../../apps/docs/content/zh-Hans/components/switch.md)                                 |
| `FluereInfoBadge`                             | [info-badge](./src/info-badge/info-badge.vue)                | [Info Badge](../../apps/docs/content/zh-Hans/components/info-badge.md)                         |
| `FluereInfoBar`                               | [infobar](./src/infobar/infobar.vue)                         | [Info Bar](../../apps/docs/content/zh-Hans/components/infobar.md)                              |
| `FluereProgressBar`                           | [progress-bar](./src/progress-bar/progress-bar.vue)          | [Progress Bar](../../apps/docs/content/zh-Hans/components/progress.md)                         |
| `FluereProgressRing`                          | [progress-ring](./src/progress-ring/progress-ring.vue)       | [Progress Ring](../../apps/docs/content/zh-Hans/components/progress-ring.md)                   |
| `FluereContentDialog`                         | [content-dialog](./src/content-dialog/content-dialog.vue)    | [Content Dialog](../../apps/docs/content/zh-Hans/components/content-dialog.md)                 |
| `FluereSmokeLayer`                            | [overlay](./src/overlay/smoke-layer.vue)                     | [Content Dialog](../../apps/docs/content/zh-Hans/components/content-dialog.md)（共享弹层原语） |
| `FluereTooltip` / `FluereTooltipProvider`     | [tooltip](./src/tooltip/tooltip.vue)                         | [Tooltip](../../apps/docs/content/zh-Hans/components/tooltip.md)                               |
| `FluereConfigProvider`                        | [config-provider](./src/config-provider/config-provider.vue) | [Config Provider / i18n](../../apps/docs/content/zh-Hans/components/config-provider.md)        |

> 完整导出清单（含 `SCROLL_VIEW_AGENT_EVENTS` 与全部 Props / 事件类型）以 [index.ts](./index.ts) 为准；
> 英文文档与上表同名，位于 [content/en/components](../../apps/docs/content/en/components)。

## 共享原语（0.4.0 基建）

跨组件复用、没有独立视觉产出的基建，从这里导出；它们替代的是「每个浮层组件各写一遍」的返工。

| 导出                                               | 源码                                                                                                             | 职责与验收口径                                                                                                                                                                                                                     |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useFocusVisual` / `FOCUS_VISUAL_CLASS`            | [focus-visual](./src/focus-visual/use-focus-visual.ts) + [focus-visual.css](./src/focus-visual/focus-visual.css) | WinUI 双层焦点矩形（外 2px `colorStrokeFocus2` + 内 1px `colorStrokeFocus1`，紧贴无间隙，等价 `FocusVisualMargin = -3`），含 `forced-colors` 分支。几何与 A 级来源写在 CSS 文件头；组件只需挂类名，**不要再自写 `:focus-visible`** |
| `useFlyout`                                        | [flyout/use-flyout.ts](./src/flyout/use-flyout.ts)                                                               | 浮层统一原语：开关状态（复用 `@fluere-vue/hooks` 的 `useDisclosure`）、层级登记、Esc / 外部点击 / 焦点移出三条关闭路径（带 `FlyoutCloseReason`）、焦点归还、`role` / `aria-expanded` / `aria-haspopup` / `aria-modal` 契约         |
| `FLYOUT_TIERS` / `acquireLayer` / `openLayerCount` | [flyout/layer-stack.ts](./src/flyout/layer-stack.ts)                                                             | 浮层层级栈：`--zIndex*` 刻度是**平面**的，嵌套浮层（模态里的下拉）按 `--zIndexStep` 抬到宿主之上，值全程引用 token                                                                                                                 |
| z-index 刻度 + 材质令牌                            | [designs/data/repo-tokens.json](../designs/data/repo-tokens.json)                                                | `--zIndexWindow/Content/NavFlyout/Menu/Submenu/Modal/Tooltip/Shell` + `--zIndexStep`；Mica / Acrylic / Layer / Subtle / Smoke 画刷值。**组件里禁止再写裸的浮层 z-index 与就地 `backdrop-filter` 魔法值**                           |

> 契约与回归防线：`src/__tests__/z-index-tokens.test.ts`（样式里不得出现裸浮层 z-index）、
> `src/__tests__/flyout-migration.test.ts`（Tooltip / Combobox / ContentDialog 已接上层级栈）、
> `src/focus-visual/focus-visual.test.ts`、`src/flyout/*.test.ts`。

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
