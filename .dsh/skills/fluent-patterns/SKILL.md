---
name: fluent-patterns
description: Fluent 2 layout & interaction patterns — page layout & grid, navigation, forms, tables/data display, command bars, and empty/error states. Framwork-agnostic blueprints; pair with fluent-components and a fluent-adapter-* to build concrete UI.
whenToUse: When designing the structure of a page, form, list, navigation, or data surface and need Fluent-consistent patterns rather than ad-hoc layout.
---

# Fluent 2 Patterns

> **仓库从属声明（fluere-vue）**：本 skill 以 **Fluent 2 Web / `@fluentui/tokens`** 为事实源，仅用于**找线索与取 token 值（B 级）**；控件的几何 / 状态 / 动效等**行为**以 **WinUI 3 源码（A 级）** 为准，权威层级见仓库 `docs/style-spec.md` 与 `AGENTS.md`。在本仓库内**禁止**据本 skill 推断 WinUI 行为。

组合 `fluent-components` 的控件，按 Fluent 习惯组织成页面与交互。**框架无关蓝图**，adapter 负责翻译。

## 页面与栅格

- 基准内容宽：Fluent 常用 **960px** 居中内容区，左右留白随断点缩放。
- 断点思路：小屏单列 → 中屏双列/侧栏 → 大屏多列。间距走 `spacingHorizontal*` 标度，不留 4px 之外的任意像素。
- 区块间距：上下用 `spacingVerticalL/XL/XXL`；区块内间距比区块间距小一档。
- 页面标题层级：page title 用 `title2/3`，section 用 `subtitle2/1`。

## 导航

- **Top/Brand nav**：左 logo + 主入口，右 用户/搜索/设置；选中项底部 active 指示线（brand）。
- **Left rail（侧边导航）**：收纳 icon + 文案的 menu 项，选中态 `colorSubtleBackgroundSelected` + brand 前景。
- **Breadcrumb**：当前页高亮 `colorNeutralForeground1`，上级链接 `colorNeutralForeground2`。分隔符用 `/`。
- **Tabs**：见 fluent-components；适用于同级并列视图切换。
- 保持「当前所处位置」总是可辨（active、面包屑、页面标题三者至少有两处）。

## 表单

- 字段默认**纵向堆叠**，label 在上；紧凑场景可 label 左对齐。
- 必填：视觉上可用 `*`,并配 `aria-required`；不要只靠颜色区分必填/选填。
- 校验错误：字段内联错误文本（danger 前景）+ `aria-describedby`；提交失败时集中在页面顶部给出摘要。
- 分组：字段组（fieldset/group）用 section 标题分层；按钮区（primary/secondary）靠表单底部/右侧。
- 间距：字段间 `spacingVerticalL`(16px)；同类 inline 字段间 `spacingHorizontalS/M`。

## 列表 / 数据展示

- 表格：表头 `body1Strong`(semibold) 或 `caption1}` 风格、`colorNeutralForeground2` 表头；行 hover 用 `colorSubtleBackgroundHover`；选中行 `colorSubtleBackgroundSelected`。列宽考虑最坏内容。
- 列表行：`body1` + 次级描述 `colorNeutralForeground2`；右侧操作区 hover/菜单。
- 分组：section 标题或 `divider`（`colorNeutralStroke2`）。
- 排序/筛选：表头可点击列用 link/brand 前景，排序指示用箭头图标（不单靠颜色）。

## Command bar / 工具栏

- 一行内：leading 是文件/视图级操作（primary 按钮、命令集），trailing 是刷新/视图设置/more。
- 图标按钮需 `aria-label`；成组操作用 `Menu` 收纳「更多」。
- 危险操作（删除）放在显式 danger 样式，且配确认对话框/二次确认。

## Empty & 错误态

- **Empty**：居中插画/图标 + `title3`~`subtitle2` 文案 + `body1` 说明 + 一个主操作，引导下一步。
- **Error**：danger 前景消息 + 图标 + 可重试的 primary 按钮；错误详情可见且可复制。
- **Loading**：先骨架屏（skeleton），后数据；长操作给进度/取消。
- 所有状态都提供**可访问**的状态播报（aria-live/status）与操作路径。

## 无障碍页面级检查

- 语义结构：`header/nav/main/footer`、`h1` 唯一。
- Focus 顺序 = 视觉顺序；dialog/overlay 要 focus trap。
- 表单 label 全部关联；icon 全部有文本可替代。

## 组合模板速查

| 场景 | 组合 |
|---|---|
| 通用 CRUD 页 | 顶部 command bar + 表格 + 行操作菜单 + 空态 |
| 设置页 | 左导航分段 + 右表单分组 + 保存/取消 |
| 详情页 | breadcrumb + 标题块 + 关键信息卡片 + 编辑入口 |
| 仪表盘 | 卡片网格 + 图（可视化另行规范）+ 筛选 command bar |

> 控件结构见 `fluent-components`；取值见 `fluent-tokens`；原则见 `fluent-foundations`。