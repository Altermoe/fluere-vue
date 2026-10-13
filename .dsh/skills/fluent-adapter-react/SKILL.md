---
name: fluent-adapter-react
description: Consume Fluent 2 design tokens in React / Fluent UI React v9 — CSS-in-JS (makeStyles + @fluentui/tokens), runtime theme objects (webLightTheme/webDarkTheme), FluentProvider theming, TypeScript-first on Vite 8. Pair with fluent-tokens / fluent-components / fluent-patterns.
whenToUse: Building a React app and need to apply the Fluent design language via Fluent UI React v9 (@fluentui/react-components), TypeScript-first on Vite 8, or raw CSS-in-JS with the same tokens.
---

# Fluent 2 → React Adapter

> **仓库从属声明（fluere-vue）**：本 skill 以 **Fluent 2 Web / `@fluentui/tokens`** 为事实源，仅用于**找线索与取 token 值（B 级）**；控件的几何 / 状态 / 动效等**行为**以 **WinUI 3 源码（A 级）** 为准，权威层级见仓库 `docs/style-spec.md` 与 `AGENTS.md`。在本仓库内**禁止**据本 skill 推断 WinUI 行为。

Fluent 官方 React 实现是 **Fluent UI React v9**（`@fluentui/react-components`）。**TypeScript 优先、Vite 8 优先**：项目用 Vite 8（[Rolldown 稳定版](https://vite.dev/blog/announcing-vite8)）+ TS 模板。关键点在：同一份 token 有两种消费形态——

- **`tokens`**（来自 `@fluentui/tokens`）：值是 **`var(--...)` 引用**，专门给 CSS-in-JS / makeStyles 用。
- **`webLightTheme` / `webDarkTheme`**：值是**解析后的十六进制**，给运行时 JS theming / `FluentProvider` / 动态计算用。

两者对应同一 token 名，只是表达不同。这也是「同一设计语言、不同表达」的教科书例子。

## 脚手架（Vite 8 + TypeScript）

```bash
# React + TypeScript + Vite 8（Vite 8 是第一个 Rolldown 稳定版）
npm create vite@latest my-app -- --template react-ts
cd my-app && npm i @fluentui/react-components @fluentui/tokens
```

- 项目默认 `vite.config.ts` + `.tsx` 组件，TS 优先。
- `webLightTheme`/`webDarkTheme` 与 `tokens` 都带完整类型，随包附带类型定义。

## 方式 A：CSS-in-JS + makeStyles（推荐，静态时用 tokens）

```bash
npm i @fluentui/react-components @fluentui/tokens
```

```tsx
import { makeStyles, tokens, Button } from '@fluentui/react-components';

const useStyles = makeStyles({
  root: {
    backgroundColor: tokens.colorNeutralBackground2,
    color: tokens.colorNeutralForeground1,
    fontFamily: tokens.fontFamilyBase,
    borderRadius: tokens.borderRadiusMedium,
    padding: tokens.spacingHorizontalM,
    boxShadow: tokens.shadow4,
  },
});

export const Card = () => {
  const s = useStyles();
  return <div className={s.root}>Fluent Card</div>;
};
```

- `makeStyles` 在 build 时把 `tokens.x`（`var()`）展开成 CSS 变量并打包成原子 class，性能最好。
- token 名与 `@fluentui/tokens` 完全一致（`tokens.colorNeutralBackground2`）。
- 投影用 `tokens.shadowN`（N ∈ 2/4/8/16/28/64，另有 `tokens.shadowNBrand`）；档位用途见 `fluent-tokens` 的「高度 / 阴影」。

## 方式 B：运行时主题对象（动态变色时用 theme）

```tsx
import { FluentProvider, webLightTheme, webDarkTheme } from '@fluentui/react-components';

const theme = prefersDark ? webDarkTheme : webLightTheme;
<FluentProvider theme={theme}><App/></FluentProvider>
```

- `webLightTheme` / `webDarkTheme` 是已解析的对象（`theme.colorBrandBackground === '#0f6cbd'`）。切换主题直接换 provider 的主题即可，子组件用到的 CSS 变量自动跟随。
- 自定义品牌：`createLightTheme(brandWeb)`、`createDarkTheme(brandWeb)` / `createTeamsDarkTheme()` —— 传品牌 10–160 档，返回一套完整解析主题。

```tsx
import { createLightTheme } from '@fluentui/react-components';
import { brandTeams } from '@fluentui/tokens';
const teamsLight = createLightTheme(brandTeams);
```

## 使用 `tokens` vs `theme` 的选择

| 场景 | 用 |
|---|---|
| 组件内 className/样式（静态） | sure `tokens.*`（CSS 变量） |
| Provider 级主题 / 动态多主题 | `webLightTheme`/`webDarkTheme`/`create*Theme` |
| 读一次品牌主色给 JS 逻辑（非 CSS） | `theme.colorBrandBackground` |
| 绝大多数语义值 | `tokens.colorNeutralBackground1` 等 |

## Tooltips / 组件映射

Fluent UI React 提供现成组件（`Button`、`Input`、`Card`、`Dialog`、`TabList`…），其内部已消费 token。如果只用官方组件，通常连 `tokens` 都不必手写——**语义层由组件内置**。手写样式只在需要精确 token 绑定时用上面两种方式。

## 无障碍/细节

- icon-only 组件加 `aria-label`。
- 配色差异不能是唯一信息通道（配合图标/文案）。
- 动效尊重 `prefers-reduced-motion`。

> 结构规格见 `fluent-components`；模式见 `fluent-patterns`；取不到的名字查 `data/tokens/fluent-tokens.json`。