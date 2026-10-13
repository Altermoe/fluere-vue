---
name: fluent-foundations
description: Fluent 2 design principles, layout & spacing scale, elevation, color logic, and accessibility rules — the framework-agnostic design language layer. Pair with fluent-tokens, fluent-components, fluent-patterns, and a fluent-adapter-* for concrete code.
whenToUse: Establish structure for any Fluent-style UI regardless of framework — pick it alongside the component/pattern you are building and the adapter for your target framework.
---

# Fluent 2 Foundations

> **仓库从属声明（fluere-vue）**：本 skill 以 **Fluent 2 Web / `@fluentui/tokens`** 为事实源，仅用于**找线索与取 token 值（B 级）**；控件的几何 / 状态 / 动效等**行为**以 **WinUI 3 源码（A 级）** 为准，权威层级见仓库 `docs/style-spec.md` 与 `AGENTS.md`。在本仓库内**禁止**据本 skill 推断 WinUI 行为。

Fluent 2 的「设计语言」层：不绑定任何框架，规定**为什么**与**原则**。与 `fluent-tokens`（值）、`fluent-components`（规格）、`fluent-patterns`（模式）、`fluent-adapter-*`（翻译）搭配使用。

## 原则（Fluent 2 的四个支柱）

1. **Coherent（一致）**——同一语义 token 在不同框架/页面表达一致。宁可复用现有 token 与组件，不发明新值。
2. **` Acclimating/Bold 的克制**——Fluent 是「功能优先」的工业级设计：层次靠中性色与细节，不靠高饱和装饰。品牌色用于「强调」而非「铺陈」。
3. **Intentional（有意）**——每个视觉决策都要有依据：状态、层级、可读性、无障碍。禁止"看着好看"的任意间距/颜色。
4. **Responsive / Fluid（弹性）**——栅格、间距、字号都要能跨断点伸缩，用 token 标度而非硬编码像素。

## 尺寸与间距标度

Fluent 采用 **4px 基础单元** 的间距标度，语义 token 分层：

- `spacingHorizontal*` / `spacingVertical*`：水平/垂直间距。
- 常用档位：`XXS`=2·`XS`=4·`S`=8·`M`=12·`L`=16·`XL`=20·`XXL`=24·`XXXL`=32（px）。
- 光标细分档：`SNudge`=6、`MNudge`=10，用于精细微调。

**间距规则：**
- 组件内元素间距优先用 **spacing** 语义 token，不使用 4px 之外的活跃小数值。
- 组件之间的页面留白沿用同标度；不要在同一层级混用 4px 间隔与 7px 心算值。
- 控件之间的默认间距通常 ≥ `spacingHorizontalM`（12px）。

## 圆角标度

- `borderRadiusSmall`=2px（细密控件）
- `borderRadiusMedium`=4px（默认控件，如按钮）
- `borderRadiusLarge`=6px / `XLarge`=8px（卡片/面板）
- `2XLarge`=12 · `3XLarge`=16 · `4XLarge`=24 · `5XLarge`=32 · `6XLarge`=40
- `borderRadiusCircular`=10000px（pill / 圆形头像）

**规则：** 同尺寸控件圆角统一走 token；高度更高/更醒目的元素用更大的 radius。

## 层级与高度（Elevation）

平铺界面优先用 **边框与底色** 区分层级，而非投影。需要投影再走 `shadows` 段的高度的 token（见 fluent-tokens）。层级逻辑：
1. 背景基底（Background 1/2/3/4/5）
2. 在前层内容（Foreground 1–5，数字越小越重要/越靠前）
3. 叠加层（Overlay / dialog / popover）

投影标度只用这 6 档（数字 = 模糊半径量级，越靠前的层用越大档）：

| 层                     | token      | 用途                                                    |
| ---------------------- | ---------- | ------------------------------------------------------- |
| 贴地（可无投影）       | —          | 用 `colorNeutralStroke1` 描边 + `colorNeutralBackground*` 区分 |
| 轻微抬升               | `shadow2`  | 无描边卡片、按下态浮动按钮                              |
| 抬升                   | `shadow4`  | 卡片 / 列表项 / 网格项                                  |
| 浮层入口               | `shadow8`  | 命令栏、命令下拉、Tooltip、抬升 App Bar                 |
| 浮层（最常用）         | `shadow16` | Callout / Flyout / Popover / HoverCard                  |
| 面板                   | `shadow28` | 底部面板、侧边导航、抬升 Tab 栏                         |
| 模态（最高层）         | `shadow64` | 弹出式对话框、面板                                      |

品牌色表面上用对应的 `shadowNBrand`（Fluent 用 luminosity 方程修正过不透明度）。

> 阴影是**两层**（key + ambient）的**多值 token**：不要把它整体塞进 `light-dark()`（非法调用会让整条 `box-shadow` 被丢弃），
> 正确写法见 fluent-tokens 的「高度 / 阴影」；Windows 平台用描边替代 key 阴影，层级感靠描边 + 更浅的投影。

## 颜色逻辑（中性 vs 品牌）

- **中性色**（grey 标度）承担 90%+ 的界面表达：文字、背景、边框。层级靠中性色的深浅档位实现。
- **品牌色**（brand）只用于：
  - 主操作按钮 / 链接 / 选中态
  - 品牌触点（logo、强调）
- 语义状态色（danger / warning / success / info）来自 status shared colors，严格用于对应状态，不改写其含义。

## 无障碍（Accessibility）——硬性约束

- **对比度** WCAG 2.1 AA：正文 ≥ 4.5:1；大字号（≥18pt/24px）与 UI 组件 ≥ 3:1。用 `colorNeutralForeground*`/`colorBrandForeground*` 已保证的对比，不要在深背景上叠浅文字之外硬算。
- **Focus 可见**：交互元素必须有可辨识的 focus ring（默认走 `strokeWidthThick` + 品牌/中性对比 stroke）。
- **语义标签**：icon 按钮需 aria-label/alt；不依赖颜色单通道传达信息。
- **动效**：申请尊重 `prefers-reduced-motion`；动画时长与曲线见 fluent-tokens 的 durations / curves。
- **触控目标**：交互热区 ≥ 40px（Fluent 常用控制高度 32px，需内/外补足热区）。

## 字体与排版原则

- 中文/西文均用 `fontFamilyBase`（Segoe UI 体系 + 系统回退）。
- 层级用例见 `fluent-tokens` 的 typography styles（body1…display）。字号/行高成套使用，不要孤零零放大字号而不动行高。
- 主文字层级默认 weightRegular，标题 weightSemibold 或 Bold；避免靠加粗伪装层级。

## 决策速查

| 要做 | 用 |
|---|---|
| 加一层背景区分 | 升一级 `colorNeutralBackground*` className |
| 强调/主操作 | 品牌色 token，「品牌 = 少量」 |
| 分隔元素 | `strokeWidthThin`+中性 stroke |
| 提升层级 | 先试试更浅/更深中性色与更大 radius，再考虑投影 |
| 浮层投影 | `shadow16`（Flyout/Popover）、`shadow8`（Tooltip/下拉）、`shadow64`（Dialog）；不用手写 `box-shadow` 数值 |
| 状态反馈 | 语义状态色 + 文本/图标双通道 |

> 实现细节交给 `fluent-adapter-*`。本 skill 只回答「设计上该怎么做」。