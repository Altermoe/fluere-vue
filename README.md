# FluereVue

> 在 Web 中获得 Native 的体验。

FluereVue 是一个以 **Windows 11 / WinUI 3 原生控件**为基准的 Vue 3 组件库。它不按 Fluent Design 2 的 Web 规范做一套"网页版近似物"，而是回到 Windows 实机，把每个控件的尺寸、圆角、描边、压感、焦点、动效，一项一项还原到浏览器里。

我们希望你在浏览器里看到的，就是 Windows 11 上那个控件——而不是它的 Web 仿冒品。

## 我们想做的一件事

网页应用和原生应用之间，始终隔着一层"说不清哪里不对"的距离：按钮按下去没有压感、开关切换没有过渡、弹窗没有层次、主题切换闪一下白。单独看每一样都能忍，凑在一起，就成了"一看就是网页做的"。

FluereVue 想抹平这层距离。

## 为什么不用现成的 Fluent 系 Web 库

现有的 Fluent 系 Web 实现，大多以 Fluent Design 2 的 Web 设计规范为基准。为了适配通用网页，很多在 Windows 上理所当然的细节被简化甚至丢掉了：

- **动效被简化**：hover / pressed 的压感、焦点过渡、开关切换，时长与缓动和 Windows 对不上；
- **细节被削弱**：圆角、描边、状态层级、图标规格，各状态下的表现和实机有出入；
- **材质缺失**：Mica / Acrylic 的质感在网页端基本见不到；
- **焦点与无障碍打折**：焦点矩形、对比度、语义化，往往"能跑就行"。

结果就是：一眼能看出是网页，用起来像"丐版"。FluereVue 要做的，就是把 Web 版丢掉的那些体验细节，一项一项捡回来。

| 对比维度 | 常见的 Fluent 系 Web 库            | FluereVue                          |
| -------- | ---------------------------------- | ---------------------------------- |
| 设计基准 | Fluent Design 2 Web 规范           | WinUI 3 / Windows App SDK 原生控件 |
| 动效     | 简化版，时长/缓动与 Windows 不一致 | 逐项对照 WinUI 控件模板动画        |
| 组件细节 | 弱化（圆角、描边、状态层级等）     | 逐像素还原各状态                   |
| 材质     | 无或近似                           | Mica / Acrylic 的 Web 近似实现     |
| 无障碍   | 通用 Web 实现                      | 还原焦点矩形、对比度与 aria 语义   |

## 特性

- **逐像素还原**：尺寸、圆角、描边、填充、图标、排版，对照 WinUI 3 实机值逐项核对；
- **WinUI 动效**：指针 hover / pressed 压感、焦点过渡、开关与展开动画，时长与缓动对齐 Windows；
- **Mica / Acrylic 材质**：在 Web 上近似 Windows 11 的质感，让页面有光、有层次；
- **明暗主题**：Light / Dark，自动跟随系统偏好；
- **无障碍对齐**：焦点矩形、对比度、aria 语义还原 WinUI 行为；
- **内置图标**：基于 Segoe Fluent Icons 矢量源的图标组件，随用随取；
- **开箱即用**：Vue 3 + TypeScript，组件自带样式、支持按需引入，不依赖额外的构建配置。

## 快速开始

> 提示：尚未发布，敬请期待

```bash
pnpm add @fluere-vue/ui
```

```vue
<script setup lang="ts">
import { FluereButton } from '@fluere-vue/ui'
</script>

<template>
  <FluereButton appearance="primary">保存</FluereButton>
</template>
```

组件库自带设计令牌，引入即用，无需额外配置。

本地开发：`pnpm install` → `pnpm dev`（文档站）；`pnpm --filter @fluere-vue/playground dev`（实验场）。

## 组件进度

| 组件                                     | 对应 WinUI 3 控件     | 状态   |
| ---------------------------------------- | --------------------- | ------ |
| `FluereButton`                           | Button / ToggleButton | 已完成 |
| `FluereCheckbox`                         | CheckBox              | 已完成 |
| `FluereToggleSwitch`                     | ToggleSwitch          | 已完成 |
| `FluereRadioGroup` / `FluereRadioButton` | RadioButton           | 已完成 |
| `FluereSlider`                           | Slider                | 已完成 |
| `FluereNumberBox`                        | NumberBox             | 已完成 |
| `FluereCombobox`                         | ComboBox              | 已完成 |
| `FluereContentDialog`                    | ContentDialog         | 已完成 |
| `FluereInfoBadge`                        | InfoBadge             | 已完成 |
| `FluereInfoBar`                          | InfoBar               | 已完成 |
| `FluereProgressBar`                      | ProgressBar           | 已完成 |
| `FluereProgressRing`                     | ProgressRing          | 已完成 |
| `FluereInput`                            | TextBox               | 开发中 |
| `FluereScrollView`                       | ScrollView            | 开发中 |

### 0.1.0-rc.1 组件清单

实施顺序与验收标准见 [docs/todo.md](./docs/todo.md)。

- **Wave 1 · 核心表单**：Checkbox、ToggleSwitch、RadioButton / RadioGroup、Slider、NumberBox、Combobox
- **Wave 2 · 反馈与状态**：ProgressRing、ProgressBar、InfoBar、Badge
- **Wave 3 · 弹层与微交互**：ContentDialog（含共享弹层原语 `FluereSmokeLayer` / `useDisclosure`）、Tooltip
- **Wave 4 · 高级交互**：ToggleButton / ToggleGroup、Avatar / Persona、DropDownButton
- **rc.1 不做**（推给 0.2）：NavigationView、ListView / GridView / DataGrid、TreeView、CalendarDatePicker / TimePicker、MenuBar 完整版、RatingControl、CommandBar

## 我们怎么做还原

还原基准只有一个：**WinUI 3 Gallery 示例应用与 Windows 11 实机表现**。每个控件都逐状态核对——rest / hover / pressed / selected / focus / disabled——再把视觉、动效、材质逐项落到浏览器里。

我们也清楚 Web 的边界：系统级动效、触觉反馈、原生窗口行为等，无法 100% 复刻。这些部分会明确标注是"近似"还是"做不到"，不夸大承诺。

## 项目结构

| 包                         | 职责                                                   |
| -------------------------- | ------------------------------------------------------ |
| `packages/designs`         | 设计令牌唯一事实源，产出 `tokens.css` 与 UnoCSS preset |
| `packages/themes`          | 主题适配层，对外提供 `presetFluere`                    |
| `packages/ui`              | 组件实现（自包含样式）                                 |
| `packages/icons`           | 生成自 Segoe Fluent Icons 的 Vue 图标组件              |
| `packages/hooks` / `utils` | 共享 Hooks 与工具函数                                  |
| `apps/docs` / `playground` | 文档站与实验场                                         |

## 路线图

- **阶段一 · 核心表单**：Button 族、CheckBox、RadioButton、TextBox、Slider、ToggleSwitch 等
- **阶段二 · 导航与容器**：NavigationView、TabView、TreeView、ListView 等
- **阶段三 · 动效与材质**：统一动画库，Mica / Acrylic 完善
- **阶段四 · 无障碍与发布**：单测与视觉回归、npm 发布、文档站上线

## 开发与贡献

欢迎任何形式的贡献。开发环境需要 Node 与 pnpm（^11.1.1）。

新增组件的流程、对齐源与验收清单见 [AGENTS.md](./AGENTS.md)（开发前必读）与 [docs/style-spec.md](./docs/style-spec.md)（样式与行为对齐源）：先在 WinUI 3 Gallery 与**对应版本的 Windows App SDK 源码 tag** 确认规格与各状态细节 → 补设计令牌 → 实现组件 → 添加文档示例 → 按 Definition of Done 逐项核对。

常用命令：`pnpm dev`（文档站）、`pnpm build`、`pnpm lint`、`pnpm tsc`、`pnpm check`。

## 许可证

MIT © 夕云葛城
