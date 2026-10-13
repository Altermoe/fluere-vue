---
name: fluent-adapter-css
description: Emit Fluent 2 design tokens as CSS custom properties, an UnoCSS preset (TypeScript), or a Tailwind config. Ships a ready fluent.css (var(--TokenName)) and a generated preset-fluent.ts. TypeScript-first. Pair with fluent-tokens / fluent-components / fluent-patterns.
whenToUse: Targeting plain CSS, CSS Modules, CSS-in-JS, UnoCSS, or Tailwind CSS (TypeScript-first, e.g. Vite projects) and need Fluent tokens expressed in that framework.
---

# Fluent 2 → CSS / UnoCSS / Tailwind Adapter

> **仓库从属声明（fluere-vue）**：本 skill 以 **Fluent 2 Web / `@fluentui/tokens`** 为事实源，仅用于**找线索与取 token 值（B 级）**；控件的几何 / 状态 / 动效等**行为**以 **WinUI 3 源码（A 级）** 为准，权威层级见仓库 `docs/style-spec.md` 与 `AGENTS.md`。在本仓库内**禁止**据本 skill 推断 WinUI 行为。

把 Fluent token 翻译成 CSS 表达，跨 CSS 系列框架。本技能提供三种消费形态，**typeScript-first**（所有配置用 `.ts`）：

1. **纯 CSS**：自带的 **`fluent.css`**，每个值映射为 `var(--TokenName)`，token 名与 `@fluentui/tokens` 完全一致。
2. **UnoCSS**：自带的 **`preset-fluent.ts`**（TypeScript UnoCSS preset），注入变量 + 主题映射，开箱即用。
3. **Tailwind**：把 token 注入 `tailwind.config.ts` 主题。

三者共享同一 token 系统，**语义含义不变**——这是跨框架同一设计语言的关键。

## 1) 纯 CSS：直接使用

```html
<link rel="stylesheet" href="fluent.css">
<style>.app { background: var(--colorNeutralBackground1); color: var(--colorNeutralForeground1); }</style>
```

- 亮/暗主题：在 `<html>` 上切 `data-theme="light"` / `data-theme="dark"`，或在容器加 `.fluent-light` / `.fluent-dark`。
- 全局 token（spacing/radius/stroke/duration/curve/font/**shadow**）在 `:root` 永远可用。
- 高度（elevation）直接 `box-shadow: var(--shadow8)`：`--shadow2/4/8/16/28/64` 与品牌版 `--shadowNBrand` 都是两层阴影，
  颜色部分引用 `--color*Shadow*` 变量 —— 主题块换掉颜色变量，投影自动跟随。

## 2) UnoCSS（TypeScript 优先，推荐用于 Vite/TS 项目）

### 安装与配置

```bash
pnpm add -D unocss
```

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import UnoCSS from 'unocss/vite'
import vue from '@vitejs/plugin-vue'      // Vue 项目用；React 项目换成 @vitejs/plugin-react

export default defineConfig({
  plugins: [vue(), UnoCSS()],
})
```

```ts
// uno.config.ts
import { defineConfig, presetWind3 } from 'unocss'
import { presetFluent } from './preset-fluent'

export default defineConfig({
  presets: [presetWind3(), presetFluent()],
})
```

入口引入生成的样式：

```ts
// src/main.ts
import 'virtual:uno.css'
```

`preset-fluent.ts` 做两件事：
- **preflight**：自动注入全部 Fluent CSS 变量（`:root` 全局 + `[data-theme=light|dark]` 语义），无需再手引 `fluent.css`。
- **theme**：把 token 名注册为 UnoCSS 工具生成器，配色/间距/圆角/动效/投影直接可用。

### 使用

```html
<!-- 品牌主按钮 -->
<button class="bg-colorBrandBackground text-colorNeutralForegroundOnBrand
               rounded-fluent-md px-fluent-m duration-fluent-fast hover:bg-colorBrandBackgroundHover">
  Save
</button>

<!-- 浮层（Flyout / Popover / Callout）用 shadow16，对话框用 shadow64 -->
<div class="bg-colorNeutralBackground1 rounded-fluent-xl shadow-16">…</div>
```

对应关系：
- `bg-colorBrandBackground` → `background: var(--colorBrandBackground)`
- `text-colorNeutralForeground1` → `color: var(--colorNeutralForeground1)`
- `rounded-fluent-md` → `--borderRadiusMedium`
- `p-fluent-m` / `px-fluent-s` → `--spacingHorizontalM/S`
- `duration-fluent-fast` → `--durationFast`
- `shadow-8` / `shadow-16` / `shadow-2-brand` → `box-shadow: var(--shadow8/16/2Brand)`
- 任意自定义值也可直接写 `bg-[var(--colorNeutralBackground2)]`（无需 config）。

> `darkColors` 只在 `presetWind3` 的 dark variant 下覆盖，用于 `dark:bg-...`；单主题直接用 `bg-*` 即可。

## 3) Tailwind 映射（Tailwind 3/4，`.ts` 优先）

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{vue,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        neutral1: 'var(--colorNeutralBackground1)',
        neutral1hover: 'var(--colorNeutralBackground1Hover)',
        brand: 'var(--colorBrandBackground)',
        brandhover: 'var(--colorBrandBackgroundHover)',
        fg1: 'var(--colorNeutralForeground1)',
        fg2: 'var(--colorNeutralForeground2)',
        danger: '#d13438', // 全局 red.primary (#d13438)
        stroke1: 'var(--colorNeutralStroke1)',
      },
      spacing: {
        xxs: 'var(--spacingHorizontalXXS)',
        xs: 'var(--spacingHorizontalXS)',
        s: 'var(--spacingHorizontalS)',
        m: 'var(--spacingHorizontalM)',
        l: 'var(--spacingHorizontalL)',
        xl: 'var(--spacingHorizontalXL)',
        xxl: 'var(--spacingHorizontalXXL)',
        xxxl: 'var(--spacingHorizontalXXXL)',
      },
      borderRadius: { sm: 'var(--borderRadiusSmall)', md: 'var(--borderRadiusMedium)', lg: 'var(--borderRadiusLarge)', xl: 'var(--borderRadiusXLarge)' },
      borderWidth: { DEFAULT: 'var(--strokeWidthThin)', thick: 'var(--strokeWidthThick)' },
      transitionDuration: { fast: 'var(--durationFast)', normal: 'var(--durationNormal)' },
      // 高度：shadow-2 / shadow-4 / shadow-8 / shadow-16 / shadow-28 / shadow-64（+ brand 变体）
      boxShadow: {
        '2': 'var(--shadow2)', '4': 'var(--shadow4)', '8': 'var(--shadow8)',
        '16': 'var(--shadow16)', '28': 'var(--shadow28)', '64': 'var(--shadow64)',
        '2-brand': 'var(--shadow2Brand)', '4-brand': 'var(--shadow4Brand)', '8-brand': 'var(--shadow8Brand)',
        '16-brand': 'var(--shadow16Brand)', '28-brand': 'var(--shadow28Brand)', '64-brand': 'var(--shadow64Brand)',
      },
    },
  },
} satisfies Config
```

用 Tailwind 4（`@import "tailwindcss"` + CSS-first）时，在全局样式里用 `@theme` 引用变量即可。

## 命名约定

- CSS 变量名 = 精确 token 名（保留驼峰）：`--colorNeutralBackground2`、`--borderRadiusMedium`、`--spacingHorizontalM`。
- 语义 token 以 `--color...` 出现；全局以 `--spacing...`、`--borderRadius...`、`--strokeWidth...`、`--duration...`、`--curve...`、`--fontSize...`、`--shadow...` 等出现。
- 高度：`--shadow2/4/8/16/28/64`（中性）+ `--shadowNBrand`（品牌色表面）；UnoCSS 工具类 `shadow-N`。
- 组件用语义 token（`--colorCompoundBrandStroke`）而非全局灰色值（semantic-first）。

## 生成/更新文件

数值变更是从 token 数据再生成，不手改：

```bash
node gen-css.js          # 重新生成 fluent.css
node gen-preset.js       # 重新生成 preset-fluent.ts
# 也可显式指定路径
node gen-css.js --tokens <path/to/fluent-tokens.json> --out <path/to/fluent.css>
```

依赖：`data/tokens/fluent-tokens.json`（由 fluent-tokens 提供）。两个生成脚本都在 `skills/fluent-adapter-css/` 内。

### 路径怎么来（给后来 AI 的说明）

生成脚本里**没有写死任何绝对路径**。它们默认相对**脚本自身位置**解析：
- 输入 token 文件：默认 `<skill>/../../data/tokens/fluent-tokens.json`；
- 输出文件：默认与脚本同目录。

在跑脚本前，AI 必须**先确认该 token JSON 的真实地址**，任选其一：
1. 本仓库自带 `fluent-tokens` skill，其 `data/fluent-tokens.json` 就是真实输入（默认相对路径即可命中共仓库布局）；
2. 若 token 数据在别处（如由 `npm i @fluentui/tokens` 实时抽取而来），用 `--tokens <真实绝对或相对路径>` 指定；
3. 若环境里没有该文件，**停下来询问人类**：请人类提供 `fluent-tokens.json` 的位置，或由 AI 先按 `fluent-tokens` / `@fluentui/tokens` 抽取生成它，再喂给脚本。

脚本在找不到输入文件时会打印清晰错误提示并退出，不会用假的占位数据生成产物。

## 组件示例（CSS）

```css
.fluent-button--primary {
  background: var(--colorBrandBackground);
  color: var(--colorNeutralForegroundOnBrand);
  border: none;
  border-radius: var(--borderRadiusMedium);
  padding: 6px 12px;              /* 高 32 内 12px 水平 */
  font-family: var(--fontFamilyBase);
}
.fluent-button--primary:hover { background: var(--colorBrandBackgroundHover); }
.fluent-button--primary:active{ background: var(--colorBrandBackgroundPressed); }
.fluent-button--primary:focus-visible {
  outline: 2px solid var(--colorCompoundBrandStroke); outline-offset: 2px;
}

/* 浮层：表面 + 圆角 + 两层阴影，全部走 token */
.fluent-flyout {
  background: var(--colorNeutralBackground1);
  border: 1px solid var(--colorNeutralStroke1);
  border-radius: var(--borderRadiusXLarge);
  box-shadow: var(--shadow16);    /* Callout / Flyout / Popover / HoverCard */
}
```

## 注意事项

- 只引用已存在的 `--TokenName`；拿不准值时查 `fluent.css` / `preset-fluent.ts` 或 `data/tokens/fluent-tokens.json`。
- focus 用 `outline/box-shadow` 模拟描边，避免改变布局尺寸。
- 自定义属性值（`rgba`、`cubic-bezier`）可直接套用。
- **多值 token（阴影）不要整体塞进 `light-dark()`**：它只接受两个 `<color>` 参数，`light-dark(明, 暗)` 里塞逗号分隔的多层值 = 4 个实参的非法调用，浏览器会把整条 `box-shadow` 丢掉。本适配器用
  `:root` + `:root[data-theme]` 主题块（阴影放 `:root`、颜色变量随主题切），天然规避；若你要改用 `light-dark()`，必须**逐层**包颜色
  （`0 0 2px light-dark(a, b), 0 8px 16px light-dark(c, d)`）。详见 `fluent-tokens` 的「高度 / 阴影」。
- TypeScript 优先：所有框架配置统一用 `.ts` 文件（`uno.config.ts` / `tailwind.config.ts` / `vite.config.ts`），并保证类型推导（`satisfies Config`、`defineConfig`）。

> 结构/组件规格见 `fluent-components`；设计原则见 `fluent-foundations`。