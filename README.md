# FluereVue

简体中文 | [English](./README.en-US.md)

以 Windows 11 / WinUI 3 原生控件为参考的 Vue 3 组件库，重点还原控件的视觉样式、交互状态和动画细节。

> **公网文档站**：<https://fluere-vue.nahida.space>（英文：<https://fluere-vue.nahida.space/en>）。在 npm 上阅读本说明时，组件的 Props / 事件、在线示例与 API 表请以文档站为准。

FluereVue 的实现基准是 Windows 实机表现与对应版本的 Windows App SDK 源码，而不只是 Fluent Design 的 Web 规范：开发时逐个核对控件在 `rest` / `hover` / `pressed` / `selected` / `focus` / `disabled` 等状态下的尺寸、圆角、描边、填充与动效，再在浏览器中实现。

> 浏览器无法提供全部原生能力。系统级动画、触觉反馈、原生窗口行为等内容不在完全复刻范围内；实现会区分**实际还原**、**近似实现**与**暂不支持**，取值依据见 [docs/style-spec.md](./docs/style-spec.md)。

## 特性

| 方向           | 说明                                                                                                      |
| -------------- | --------------------------------------------------------------------------------------------------------- |
| **控件样式**   | 参考 WinUI 3 实机表现，逐状态核对尺寸、圆角、描边、填充、图标与排版                                       |
| **交互与动效** | 还原 hover / pressed / focus / 开关切换 / 内容展开等状态，时长与缓动对齐 WinUI 关键帧                     |
| **材质效果**   | Mica / Acrylic 风格的 Web 近似实现                                                                        |
| **明暗主题**   | 支持 Light / Dark，并可跟随系统主题偏好                                                                   |
| **无障碍**     | 焦点矩形、颜色对比度与 ARIA 语义                                                                          |
| **图标**       | 基于 Segoe Fluent Icons 矢量源生成的 Vue 图标组件                                                         |
| **技术栈**     | Vue 3 + TypeScript；组件自包含样式、支持按需引入，SSR 安全（见 [docs/ssr-guide.md](./docs/ssr-guide.md)） |

## 项目状态与组件覆盖

当前版本 **0.5.0-alpha.1**（预发布），六个包均已发布到 npm，可直接安装使用。组件覆盖情况：

| 组件                                                                     | 对应 WinUI 3 控件                 | 状态   | 版本       |
| ------------------------------------------------------------------------ | --------------------------------- | ------ | ---------- |
| `FluereButton`                                                           | Button                            | 已完成 | 0.1.0-rc.1 |
| `FluereCheckbox`                                                         | CheckBox                          | 已完成 | 0.1.0-rc.1 |
| `FluereToggleSwitch`                                                     | ToggleSwitch                      | 已完成 | 0.1.0-rc.1 |
| `FluereRadioGroup` / `FluereRadioButton`                                 | RadioButton                       | 已完成 | 0.1.0-rc.1 |
| `FluereSlider`                                                           | Slider                            | 已完成 | 0.1.0-rc.1 |
| `FluereNumberBox`                                                        | NumberBox                         | 已完成 | 0.1.0-rc.1 |
| `FluereCombobox`                                                         | ComboBox                          | 已完成 | 0.1.0-rc.1 |
| `FluereContentDialog`                                                    | ContentDialog                     | 已完成 | 0.1.0-rc.1 |
| `FluereInfoBadge`                                                        | InfoBadge                         | 已完成 | 0.1.0-rc.1 |
| `FluereInfoBar`                                                          | InfoBar                           | 已完成 | 0.1.0-rc.1 |
| `FluereProgressBar`                                                      | ProgressBar                       | 已完成 | 0.1.0-rc.1 |
| `FluereProgressRing`                                                     | ProgressRing                      | 已完成 | 0.1.0-rc.1 |
| `FluereInput`                                                            | TextBox / PasswordBox             | 已完成 | 0.1.0-rc.1 |
| `FluereTooltip`                                                          | ToolTip / ToolTipService          | 已完成 | 0.1.0-rc.1 |
| `FluereConfigProvider`                                                   | —（i18n / 全局配置）              | 已完成 | 0.3.0-rc.1 |
| `FluereScrollView`                                                       | ScrollView                        | 已完成 | 0.3.0-rc.1 |
| `FluereToggleButton`                                                     | ToggleButton                      | 已完成 | 0.4.0      |
| `FluereToggleGroup` / `FluereToggleGroupItem`                            | —（分组切换，WinUI 无同名控件）   | 已完成 | 0.4.0      |
| `FluereSelect`                                                           | ComboBox（非编辑形态）            | 已完成 | 0.4.0      |
| `FluereAppWindow`                                                        | TitleBar（窗口外框）              | 已完成 | 0.5.0      |
| `FluereCaptionButtons`                                                   | AppWindowTitleBar（caption 按钮） | 已完成 | 0.5.0      |
| `FluereTabView` / `FluereTabViewItem`                                    | TabView                           | 已完成 | 0.5.0      |
| `FluereNavigationView` / `…Item` / `…ItemHeader` / `…ItemSeparator`      | NavigationView（左侧面板形态）    | 已完成 | 0.5.0      |
| `FluereMenuFlyout` / `…Item` / `…SubItem` / `…Separator` / `…ToggleItem` | MenuFlyout（命令菜单浮层）        | 已完成 | 0.6.0      |
| `FluereSplitButton` / `FluereToggleSplitButton`                          | SplitButton / ToggleSplitButton   | 已完成 | 0.6.0      |

- 每个组件的 Props / 事件 / 示例见[文档站](#文档与站点)的组件页。
- 「版本」列是组件进入仓库的里程碑：`0.1.0-rc.1` 为通用控件清单批次，`0.3.0-rc.1` 为 i18n / 配置通道批次，`0.4.0` 为基建 + 通用件收尾批次（`ToggleButton` / `ToggleGroup` / `Select`），`0.5.0` 为 Explorer 骨架批次（窗口外框 + caption 按钮 + 选项卡 + 导航视图）；当前已发布的 `0.5.0-alpha.1` 包含截至 `0.5.0` 批次的组件；`0.6.0` 批次为仓库内已落地、尚未随版本发布。
- 逐版本实施顺序、验收口径与 0.4.0 – 0.9.0-rc.1 排期见 [docs/todo.md](./docs/todo.md)。
- 在线体验（开发中的组件同步更新）：<https://fluere-vue.nahida.space>

## 快速开始

需要 Node >= 22.13。安装包：

```bash
pnpm add @fluere-vue/ui vue
```

引入全局样式（设计令牌 + 组件样式）：

```ts
import '@fluere-vue/ui/style.css'
```

最小示例：

```vue
<script setup lang="ts">
import { FluereButton } from '@fluere-vue/ui'
</script>

<template>
  <FluereButton appearance="primary">保存</FluereButton>
</template>
```

- `vue`（`^3.5`）是对等依赖，由消费方提供；包为纯 ESM，JS 可按需 tree-shake，样式需整体引入一次。
- 语言包与 `FluereConfigProvider` 用法见 [packages/ui/README.md](./packages/ui/README.md)。
- 本版本为预发布，`pnpm add` 默认取 `latest`（预发布不会移动它，`latest` 仍停在 `0.3.0-alpha.2`）；需要锁定本预发布版本时写 `@fluere-vue/ui@0.5.0-alpha.1`，或直接用 `@alpha` dist-tag。

> 包尚未发布稳定版（`0.3.0`），预发布期间仍可能出现破坏性变更；发版流程与已知注意事项见 [docs/release.md](./docs/release.md)。

## 本地开发

开发环境需要 Node >= 22.13（推荐 26）与 pnpm `11.27.0`。pnpm 版本由根 `package.json` 的 `packageManager` 字段指定，启用 Corepack 后会自动使用对应版本。

```bash
pnpm install
pnpm dev          # 文档站 http://localhost:60727
```

常用命令：

| 命令                 | 作用                                                |
| -------------------- | --------------------------------------------------- |
| `pnpm dev`           | 启动文档站（端口 60727）                            |
| `pnpm build`         | 按拓扑构建六个可发布包的 `dist`                     |
| `pnpm test`          | Vitest 全量测试                                     |
| `pnpm check`         | 交付前必跑：lint + format + tsc + i18n + 版本一致性 |
| `pnpm lint:ssr`      | SSR 兼容性扫描                                      |
| `pnpm docs:generate` | 文档站预渲染校验（CI 中替代 `docs:build`）          |

> `apps/playground` 目前是占位包（`private`，无 dev 脚本），实验场随 0.4.0 一起处理，见 [docs/todo.md](./docs/todo.md)。

动手改组件前请先读 [CONTRIBUTING.md](./CONTRIBUTING.md)（开发流程与验收清单）与 [docs/style-spec.md](./docs/style-spec.md)（样式与行为的对齐依据）；涉及源码核对时要先在本地拉起 WinUI 源码快照，方法见 style-spec §2/§3。

## 文档与站点

| 文档                                       | 内容                                                    |
| ------------------------------------------ | ------------------------------------------------------- |
| [CONTRIBUTING.md](./CONTRIBUTING.md)       | 贡献流程、新增 / 修改组件的标准流程、Definition of Done |
| [docs/style-spec.md](./docs/style-spec.md) | 对齐基准、版本核对方法、token 映射与验证证据链          |
| [docs/ssr-guide.md](./docs/ssr-guide.md)   | SSR 兼容开发规范（浏览器 API 分级处理）                 |
| [docs/todo.md](./docs/todo.md)             | 组件清单、逐版本实施顺序、验收标准与近期计划            |
| [docs/release.md](./docs/release.md)       | 版本管理、Changesets、npm Trusted Publishing 与首次发布 |
| [docs/ci.md](./docs/ci.md)                 | GitHub Actions / OneDev 工作流、检查任务与本地复现 CI   |
| [docs/deployment.md](./docs/deployment.md) | OneDev 部署、Nginx、环境配置、健康检查与回滚            |
| [docs/adr/](./docs/adr/)                   | 架构决策记录（如构建工具选型）                          |
| [README.en-US.md](./README.en-US.md)       | 英文版 README（English）                                |
| [AGENTS.md](./AGENTS.md)                   | 面向代码 Agent 的仓库操作约定                           |

在线文档站：<https://fluere-vue.nahida.space>（英文：<https://fluere-vue.nahida.space/en>；源站代码在 [apps/docs](./apps/docs)）。

- 首页自 **0.5.5** 起整屏接管为 Windows 桌面仿真（壁纸层 → Explorer 窗口 → 任务栏层；窗口内由 `FluereAppWindow` + `FluereNavigationView` + `FluereTabView` 组装）。外壳属**应用级组合**，实现全在 [apps/docs/components/shell](./apps/docs/components/shell) 与 `apps/docs/utils/shell-window-state.ts`，**不进 `@fluere-vue/ui`**（上表组件进度表因此不变）；布局假设、实测约束与偏离记录见 [docs/design/explorer-layout.md](./docs/design/explorer-layout.md) 与 [apps/docs/README.md](./apps/docs/README.md)，《WindowsOS 仿真边界》已作为可见文案落在首页窗口内。

## 持续集成与发布

项目通过 GitHub Actions 与 OneDev 执行持续集成、发布与部署：GitHub Actions 负责 PR / `main` 上的验证，以及 npm 发布（Changesets + Trusted Publishing）；OneDev 负责同一套验证与文档站构建，并在推送 `v*` tag 时部署。具体 job 分工、本地复现方式与回滚步骤见 [docs/ci.md](./docs/ci.md)、[docs/deployment.md](./docs/deployment.md) 与 [docs/release.md](./docs/release.md)。

## 许可证

MIT © 夕云葛城（2022-2026），详见 [LICENSE](./LICENSE)；中文对照见 [LICENSE.zh-CN.md](./LICENSE.zh-CN.md)。
