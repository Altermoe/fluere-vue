---
name: fluent-components
description: Fluent 2 component specifications — anatomy, parts, states, sizing, and which design tokens each part uses — for the core control library. Framework-agnostic; pair with a fluent-adapter-* to emit concrete code for your target framework.
whenToUse: When building or customizing any of the core Fluent controls (button, text, input, select, checkbox, radio, switch, link, card, dialog, menu, tabs, etc.) and you need the Fluent-correct structure and token mapping.
---

# Fluent 2 Components

> **仓库从属声明（fluere-vue）**：本 skill 以 **Fluent 2 Web / `@fluentui/tokens`** 为事实源，仅用于**找线索与取 token 值（B 级）**；控件的几何 / 状态 / 动效等**行为**以 **WinUI 3 源码（A 级）** 为准，权威层级见仓库 `docs/style-spec.md` 与 `AGENTS.md`。在本仓库内**禁止**据本 skill 推断 WinUI 行为。

组件规格：解剖（anatomy）、部件（parts）、状态、尺寸，以及每个部件应绑定的语义 token。**框架无关**——你在任意框架实现的都是这套结构，`fluent-adapter-*` 负责翻译成某个框架的 API/css。

> 规格是设计契约；具体语法（className / style / prop）见 adapter。取值（色/字号等）见 `fluent-tokens` 的 `data/fluent-tokens.json`。

## 通用结构

一个 Fluent 控件通常由 **外观容器 + 语义标签 + 可访问状态** 组成：
1. **Root**（最外层，管 layout/裁剪/focus）
2. **Input/Control**（真实输入或交互主体）
3. **Label / Text**（语义可访问文本）
4. **State overlays**（focus ring、selected、disabled、loading、badge）
5. **Decorators**（prefix/suffix、icon、avatar、count）

## 通用状态与 token

| 状态 | 用的 token 组 |
|---|---|
| rest（默认） | `colorNeutralBackground*` / `colorNeutralForeground*` |
| hover | 对应 `…BackgroundHover` / `…ForegroundHover` |
| pressed | `…Pressed` |
| selected/focused | `…Selected` / `colorCompoundBrandStroke/Background` + focus ring |
| disabled | `colorNeutralForegroundDisabled` / `colorNeutralBackgroundDisabled` / `colorNeutralStrokeDisabled` |

Focus ring 约定：`strokeWidthThick`（2px），颜色用与背景对比的 `colorCompoundBrandStroke*` 或中性强调。

## Button

- 变体：**primary**（品牌底 `colorBrandBackground`、hover/pressed 用 `colorBrandBackgroundHover/Pressed`）、**secondary/outline**（`colorNeutralBackground1` + `colorNeutralStroke1`）、**subtle**（透明底，hover 才显 `colorSubtleBackgroundHover`）、**transparent**、**danger**（全局红系 `red` scale——如 `red.primary #d13438`；在支持 `colorPaletteRedBackground3` 的版本里优先用该语义 token）。
- 高度标度：small 24 / medium 32 / large 40（px）。
- 圆角：`borderRadiusMedium`（4px）。
- 内边距：`spacingHorizontalM`（12px）左右、垂直由高度标度定；图标与文字间距 `spacingHorizontalS`（8px）。
- 部件：`icon`（可选，自动预留文字间距）、`content`、`slot`（loading spinner 时替换 content）。
- Disabled 用 `colorNeutralBackgroundDisabled` 底 + `colorNeutralForegroundDisabled` 文 + 不响应交互。

## Text / Field

- 层级：caption2(10) / caption1(12) / body1(14) / body2(16) / subtitle2 / subtitle1(20) / title3(24) / title2(28) / title1(32) / largeTitle(40) / display(68)。字号后括号为 px（见 typography.styles）。
- 行高随字号成套取用；`lineHeightBase*`。
- 主文字 `colorNeutralForeground1`，次级 `colorNeutralForeground2/3`，禁用 `…Disabled`。
- 错误态 用全局红系（`red.primary #d13438` / `red.tint10`；支持时用 `colorPaletteRedForeground3`）+ 提示文本双通道。

## Input / Textarea / Select

- 高度：small 24 / medium 32 / large 40。
- 底 `colorNeutralBackground1`（或 `colorNeutralBackground2` 在小组件区）、描边 `colorNeutralStroke1`（hover `colorNeutralStroke1Hover`）、focus 时描边 `colorCompoundBrandStroke` + `strokeWidthThick`。
- 内侧 padding：高压缩布局可缩小，语义内边距用 `spacingHorizontalM` 档位内取。
- Placeholder `colorNeutralForeground4`、disabled `…Disabled`。
- Appearance size 中默认 2px 描边在 focus/hover 时保持 2px（不要因 focus 撑大布局——可用 box-shadow 模拟描边）。

## Checkbox / Radio / Switch

- 未选 `colorNeutralStrokeAccessible`（图形），选中 `colorCompoundBrandBackground`，勾号 `colorNeutralForegroundOnBrand`。
- Hover 用 `colorCompoundBrandBackgroundHover`；disabled 全套 `…Disabled`。
- 触控目标 ≥ 40px；视觉图形小但热区大。

## Card

- 底 `colorNeutralBackground1`（置于更高层背景时）或 `colorNeutralBackground2/3`。
- 描边 `colorNeutralStroke1`/`colorNeutralStroke2`（subtle 形态用 `colorTransparentStroke` + 阴影）。
- 圆角 `borderRadiusLarge`（6px）或 `XLarge`（8px）。
- 头部：`title` = `subtitle2`，`description` = `body2` `colorNeutralForeground2`；actions 区靠右。

## Dialog / Surface

- Overlay：`colorOverlay`（半透明黑，默认 ~30%）。
- 表面 `colorNeutralBackground1`，圆角 `borderRadiusXLarge`（8px）/ `2XLarge`。
- 层级投影用 `shadow64`（弹出式对话框 / 面板；Callout 层用 `shadow16`）、标题 `subtitle1`、body `body1`、footer 右对齐 primary/secondary 按钮。

## Menu / Popover / Tooltip

- 表面 `colorNeutralBackground1`（或 WebView 用 `colorNeutralBackground2`），圆角 `borderRadiusMedium`/`Large`，描边 `colorNeutralStroke1`，投影 `shadow8`（Tooltip / 命令下拉）/ `shadow16`（Flyout / Popover / Callout）。
- 菜单项 hover/selected 用 `colorSubtleBackgroundHover/Selected`；danger item 用全局红系（`red.primary`；支持时用 `colorPaletteRedForeground3`）。
- 弹出层需 `pointer-events` 处理与 focus trap（无障碍）。

## Tabs / Nav

- 指示器（selected）用 `colorCompoundBrandStroke`（底部 2px active line）。
- rest tab `colorNeutralForeground2`，hover/selected 用 `colorNeutralForeground1`/`colorCompoundBrandForeground1`。
- 计数有序 tab：`colorBrandBackgroundInverted` 之类 badge token。

## 通用 BODY / SECTION tokens（可能出现）

- `fontFamilyBase` / `fontFamilyMonospace` / `fontFamilyNumeric`
- `fontWeightRegular(400)/Medium/600 Semibold/Bold700`

## 命名与一致提醒

- 部件命名遵循语义：`root`、`icon`、`content`、`label`、`input`、`control`、`indicator`、`backdrop` 等。
- **同一组件在 React/CSS/Flutter 中必须映射到同一语义 token**，只是语法不同——这就是跨框架同一设计语言的关键。
- 查 token 具体数值一律看 `fluent-tokens/data/fluent-tokens.json`。

> 组合这些组件成页面 → `fluent-patterns`。设计原则 → `fluent-foundations`。