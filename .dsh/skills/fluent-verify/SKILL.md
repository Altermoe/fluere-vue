---
name: fluent-verify
description: Consistency audit checklist for Fluent 2 — verify that generated UI uses valid semantic tokens, honors color/contrast/rid-focus/a11y rules, and stays within the token scale. Pair with any fluent-* skill as the final check.
whenToUse: After generating or before shipping any UI that claims to follow Fluent 2 — run this to catch nonstandard colors, invented tokens, broken contrast, or scale violations, regardless of which framework/adapter was used.
---

# Fluent 2 Verify（一致性审计）

> **仓库从属声明（fluere-vue）**：本 skill 以 **Fluent 2 Web / `@fluentui/tokens`** 为事实源，仅用于**找线索与取 token 值（B 级）**；控件的几何 / 状态 / 动效等**行为**以 **WinUI 3 源码（A 级）** 为准，权威层级见仓库 `docs/style-spec.md` 与 `AGENTS.md`。在本仓库内**禁止**据本 skill 推断 WinUI 行为。

对「任意框架、任意 adapter」产出的 UI 做一致性自查。**框架无关**——它只对照语义 token 与设计规则做检查。

## 检查项

### 1. Token 合法性
- [ ] 界面只用 Fluent 语义 token（`colorNeutral*`、`colorBrand*`、`colorCompoundBrand*`、`colorPalette*`、`colorStatus*`、`spacing*`、`borderRadius*`、`strokeWidth*`、`duration*`、`curve*`）。
- [ ] **没有自创 token**（如 `colorNeutralForegroundXxx`、`colorMyCustomAccent`）。需要新值时选了最接近的语义 token 并注明偏差。
- [ ] 硬编码的 magic value（`#fafafa`、`12px`）有出处：能在 `data/tokens/fluent-tokens.json` 对照到某个 token。
- [ ] 引用的 token 确实存在（大小写、拼写与 `@fluentui/tokens` 一致；半角 `XXS` 不写成 `Xxs`）。
- [ ] 深色场景用的是 `dark` 语义集，浅色用 `light`；把两套混在一处。

### 2. 颜色 semantics / 层次
- [ ] 中性色承担主体，品牌色**少量**且只用于强调/主操作/链接/选中。
- [ ] 前景/背景层级符合数字语义：`Foreground1`>2>3（号越小越重要），`Background1`<2<3（号越大越高层容器）。
- [ ] 状态色（danger/warning/success/info）用法与其语义一致，未被误用为装饰。

### 3. 间距 / 圆角 / 尺寸
- [ ] 间距取自 `spacing*` 标度（4px 基准），无 7px / 13px 之类离群值。
- [ ] 同尺寸控件圆角一致走 token；大控件用更大 radius。
- [ ] 控件高度符合 Fluent 标度（button/input small 24 / medium 32 / large 40）。
- [ ] focus 描边用 `strokeWidthThick` + 对比色，且不改变布局尺寸。

### 4. 无障碍
- [ ] 对比度达 WCAG AA（正文 ≥4.5:1，大字号/UI ≥3:1）。
- [ ] 交互元素有可见 focus ring；icon-only 有 `aria-label`/等价物。
- [ ] 状态不只通过颜色传达（有文本/图标/aria）。
- [ ] 动效尊重 `prefers-reduced-motion`；触控热区 ≥40px。

### 5. 一致性（跨框架）
- [ ] 同一语义值在 React / CSS / Flutter 表达中对应同一 token 名（只有语法不同）。
- [ ] 主题切换（light↔dark）只换 token 值，不换结构。

## 输出格式（审计结果）

对每个违规项给出：
1. 位置（文件/组件/行）
2. 现状值（如 `#fafafa`）
3. 应替换的语义 token 名与取值（查 `fluent-tokens` 数据文件）
4. 修复建议（一句话）

汇总：`PASS` / `N items need fixing`。

## 与相邻 skill 的配合

- 拿不准 token 名/值 → `fluent-tokens` 的 `data/fluent-tokens.json`
- 组件结构是否符合规格 → `fluent-components`
- 是否遵守设计原则 → `fluent-foundations`
- 需要按框架修正 → 对应 `fluent-adapter-*`