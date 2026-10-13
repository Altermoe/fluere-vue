---
name: fluent-adapter-vue
description: Apply Fluent 2 design tokens in Vue 3 (Vite, TypeScript-first) — integrate UnoCSS or plain CSS via the fluent tokens, and optionally register Fluent UI Web Components (@fluentui/web-components). Pair with fluent-tokens / fluent-components / fluent-patterns.
whenToUse: Building a Vue 3 (Vite) app — typically TypeScript-first — and want to carry the Fluent/Office design language, either with utility CSS (UnoCSS) or Fluent Web Components as custom elements.
---

# Fluent 2 → Vue 3 (Vite) Adapter

> **仓库从属声明（fluere-vue）**：本 skill 以 **Fluent 2 Web / `@fluentui/tokens`** 为事实源，仅用于**找线索与取 token 值（B 级）**；控件的几何 / 状态 / 动效等**行为**以 **WinUI 3 源码（A 级）** 为准，权威层级见仓库 `docs/style-spec.md` 与 `AGENTS.md`。在本仓库内**禁止**据本 skill 推断 WinUI 行为。

Vue 3 没有官方的 Fluent React 版等价物（React 版 `@fluentui/react-components` 不适用于 Vue），所以 Vue 侧用两条路线承载 Fluent 设计语言，**TypeScript 优先、Vite 优先**：

- **路线 A（推荐，轻量）**：UnoCSS / 纯 CSS 直接消费 Fluent token（`var(--TokenName)` + `fluent-*` 工具类）。用 Vue SFC 的 `<style>` / UnoCSS 生成工具类。
- **路线 B（组件化）**：注册 [Fluent UI Web Components](https://github.com/microsoft/fluentui/tree/master/packages/web-components)（`@fluentui/web-components`，框架无关的自定义元素），在 Vue 模板里直接用 `<fluent-button>` 等。

两条路线共享同一 token 语义，可混用。

## 脚手架（Vite + TypeScript）

```bash
# Vue 3 + TypeScript + Vite 8（优先；Vite 8 是首个基于 Rolldown 的稳定版，构建更快）
npm create vue@latest my-app -- --typescript
cd my-app
```

要点（**Vite 8 优先**）：
- **Vite 8**（[Vite 8.0 已稳定发布](https://vite.dev/blog/announcing-vite8)，基于 Rolldown）：优先用它，`create-vue`/`create-vite` 会装到当前稳定版；需要显式 Vite 8 时按官方模板升级该依赖即可。
- **TypeScript 优先**：`.vue` 用 `<script setup lang="ts">`，所有配置（`vite.config.ts`、`uno.config.ts`）用 `.ts`。

## 路线 A：UnoCSS + Fluent token（推荐）

参照 `fluent-adapter-css` 的 UnoCSS 段：`preset-fluent.ts` 注入变量 + 主题，`unocss/vite` 插件接入 Vite。
投影直接用 `shadow-N` 工具类（`shadow-16` → `box-shadow: var(--shadow16)`），档位用途见 `fluent-tokens` 的「高度 / 阴影」。

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'

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

```ts
// src/main.ts
import 'virtual:uno.css'
```

### Vue SFC 示例（TS script setup）

```vue
<script setup lang="ts">
import { ref } from 'vue'

const dark = ref(false)
</script>

<template>
  <main :data-theme="dark ? 'dark' : 'light'" class="bg-colorNeutralBackground1 min-h-screen">
    <button
      class="bg-colorBrandBackground text-colorNeutralForegroundOnBrand
             rounded-fluent-md px-fluent-m py-fluent-s
             hover:bg-colorBrandBackgroundHover cursor-pointer"
      @click="dark = !dark"
    >
      Toggle theme
    </button>
  </main>
</template>

<style scoped>
/* 需要精确 token 时也可以在 scoped style 里用 CSS 变量 */
.card { background: var(--colorNeutralBackground1); }
</style>
```

- `data-theme` 切换让 `presetFluent` 的 dark preflight 生效（语义值随主题翻转）。
- UnoCSS 工具类与 SFC `<style scoped>` 可共用同一 token 语义。

## 路线 B：Fluent UI Web Components

```bash
npm i @fluentui/web-components
```

```ts
// src/main.ts
import { provideFluentDesignSystem, fluentButton, fluentTextField, ... } from '@fluentui/web-components'
provideFluentDesignSystem().register(fluentButton(), fluentTextField() /* ... */)
```

在 Vue 模板里直接用自定义元素（Vue 3 原生支持自定义元素，记得在组件 `customElement` 或全局配置）：

```vue
<script setup lang="ts">
import { ref } from 'vue'

const value = ref('')
</script>

<template>
  <fluent-design-system-provider use-default-theme density="2">
    <fluent-button appearance="accent" @click="go">Save</fluent-button>
    <fluent-text-field v-model="value" placeholder="Name" />
  </fluent-design-system-provider>
</template>
```

自定义元素在 tsconfig 里声明，或在 `<script setup lang="ts">` 顶部用 `declare`：

```ts
declare global {
  namespace JSX {
    interface IntrinsicElements { 'fluent-button': any; 'fluent-text-field': any }
  }
}
```

> Vue 3 + TS 对自定义元素属性透传处理需注意：`appearance` 等 attribute 直接绑定；复杂配置（如 `density`）以数字/字符串形式绑定到 `<fluent-design-system-provider>`。

Web Components 自带一份 Fluent 设计令牌（`provideFluentDesignSystem`），其语义与 `@fluentui/tokens` 一致；如果你同时用 UnoCSS 注入的 token，二者数值对齐（同源 @fluentui/tokens）。

## 主题切换（统一）

- **UnoCSS 路线**：切换 `data-theme`，preflight 变量切换。
- **WCB 路线**：改 `<fluent-design-system-provider>` 的 `use-default-theme` / 自定义 theme 数据。

两条路线都保持「语义 token 名不变、值随主题」。

## 无障碍（Vue 特有注意）

- 事件：Vue 用 `@click`，原生 web 事件（如 `change`/`selectionchange`）照常透传。
- icon 按钮加 `aria-label`；状态不只靠颜色（配图标/文本/`aria-live`）。
- focus 由框架/组件提供，esc 确认 `:focus-visible` 有可见描边。
- 动效尊重 `prefers-reduced-motion`.

## 组件结构映射

| Fluent 概念 | Vue + UnoCSS | Vue + Web Components |
|---|---|---|
| primary button | `bg-colorBrandBackground ... rounded-fluent-md` | `<fluent-button appearance="accent">` |
| secondary | `bg-colorNeutralBackground1 border ...` | `<fluent-button appearance="outline">` |
| text input | `TextField` 样式 + token | `<fluent-text-field>` |
| card | `bg-* rounded-fluent-lg border` | `<fluent-card>` |
| dialog / overlay | 原生 `<dialog>` + token | WebC 组件或自建 |
| tabs / nav | 自建 + token | `<fluent-tabs>` |

## 生成/数据

- `preset-fluent.ts` / `fluent.css` 生成自 `data/tokens/fluent-tokens.json`（见 `fluent-adapter-css`：`node gen-preset.js` / `node gen-css.js`）。

> 结构规格见 `fluent-components`；模式见 `fluent-patterns`；设计原则见 `fluent-foundations`。