# @fluere-vue/utils

FluereVue 共享工具函数（框架无关，纯 ESM）。供 `@fluere-vue/ui` / `@fluere-vue/hooks` 及消费方复用，避免各组件各自手搓「环境判断」「locale 回退」等逻辑。

## 导出

- **SSR 环境与浏览器能力探测**（`ssr.ts`）：`isClient` / `isServer` / `hasMatchMedia` / `hasResizeObserver` / `hasMutationObserver` / `hasIntersectionObserver` / `hasRequestAnimationFrame`。
  组件在 `setup()` 阶段必须用它们做能力探测，禁止直接访问 `window`/`document`/`matchMedia`（见 `docs/ssr-guide.md`）。
- **Locale**（`locale.ts`）：`normalizeLocale` / `resolveFallbackChain`，回退链 `zh-Hans → zh → en`（见 `docs/design/token-driven-style.md` 无关，属组件库 i18n 通道，相关文档进 `docs/`）。

## 安装

```bash
pnpm add @fluere-vue/utils
```

## 使用

```ts
import { isClient, normalizeLocale } from '@fluere-vue/utils'

if (isClient) {
  // 浏览器侧逻辑
}
const [primary, ...rest] = resolveFallbackChain('zh-CN') // ['zh-Hans','zh','en']
```

## 依赖关系

- 无运行时依赖（纯原语包）。
- 被 `@fluere-vue/hooks`（依赖）与 `@fluere-vue/ui`（依赖）消费。

## 构建

`pnpm --filter @fluere-vue/utils build`（Vite 8 lib mode，纯 ESM，`dist/` 含 `.js` + `.d.ts`）。详见 `docs/adr/0001-library-build-tooling.md`。
