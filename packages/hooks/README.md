# @fluere-vue/hooks

FluereVue 共享 Hooks（基于 Vue 组合式 API，纯 ESM）。被 `@fluere-vue/ui` 的组件复用，也开放给消费方。

## 导出

- `useDisclosure` — 受控/非受控展开状态原语（open / toggle / close / open）。
- `useFocusTrap` — 浮层焦点管理原语（Tab 陷阱 / Esc / 点击外部关闭 / 焦点归还，含外部点击的归还抑制），SSR 安全（0.5.7 起；消费方如文档站 StartMenu / 托盘弹层，0.6 `MenuFlyout` 复用）。
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
import { useDisclosure, useFocusTrap, useReducedMotion } from '@fluere-vue/hooks'
import { ref } from 'vue'

const { open, toggle } = useDisclosure(false)
const reduced = useReducedMotion()

// 浮层：激活时把焦点困在面板里，Esc / 点击外部关闭，关闭后焦点归还触发器
const panelRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)
useFocusTrap({
  container: () => panelRef.value,
  trigger: () => triggerRef.value,
  active: () => open.value,
  onEscape: () => (open.value = false),
  onOutsidePointer: () => (open.value = false),
})
```

## 依赖关系

- 依赖 `@fluere-vue/utils`（环境探测 / locale 回退）。
- 依赖 `@intlify/core-base`（locale 消息解析，无 `vue-i18n` 运行时）。

## 构建

`pnpm --filter @fluere-vue/hooks build`（Vite 8 lib mode，纯 ESM，`dist/` 含 `.js` + `.d.ts`）。详见 `docs/adr/0001-library-build-tooling.md`。
