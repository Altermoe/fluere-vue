# @fluere-vue/hooks

FluereVue 共享 Hooks（基于 Vue 组合式 API，纯 ESM）。被 `@fluere-vue/ui` 的组件复用，也开放给消费方。

## 导出

- `useDisclosure` — 受控/非受控展开状态原语（open / toggle / close / open）。
- `useMediaQuery`（框询按钮） — 响应式 `matchMedia`，SSR 安全。
- `useReducedMotion` — 尊重 `prefers-reduced-motion`，SSR 安全。
- `provideLocale` / `useLocale` / `useScopeMessages` — 基于 provide/inject 的**实例级** locale 通道（与 `FluereConfigProvider` 配合），禁止全局可变单例（SSR 多请求隔离）。

## 安装

```bash
pnpm add @fluere-vue/hooks vue
```

`vue` 为对等依赖（peer），由消费方提供。

## 使用

```ts
import { useDisclosure, useReducedMotion } from '@fluere-vue/hooks'

const { open, toggle } = useDisclosure(false)
const reduced = useReducedMotion()
```

## 依赖关系

- 依赖 `@fluere-vue/utils`（环境探测 / locale 回退）。
- 依赖 `@intlify/core-base`（locale 消息解析，无 `vue-i18n` 运行时）。

## 构建

`pnpm --filter @fluere-vue/hooks build`（Vite 8 lib mode，纯 ESM，`dist/` 含 `.js` + `.d.ts`）。详见 `docs/adr/0001-library-build-tooling.md`。
