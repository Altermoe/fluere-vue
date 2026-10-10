---
title: Config Provider 本地化
description: 组件库内建文案的 locale 注入点（i18n），用于切换语言与覆盖个别措辞。
nav:
  title: Config Provider 本地化
---

# Config Provider 本地化（i18n）

组件库把**内建的可访问名 / 缺省文案**集中到每个组件目录下的 `locale.ts` 切片（如
`input/locale.ts`、`infobar/locale.ts`）。这些文案默认跟随内置缺省语种 **zh-Hans**。
`FluereConfigProvider` 是它们的 locale 注入点：把它包在任何组件之上，即可切换整棵
子树的内建文案，或按 locale × scope 覆盖个别措辞。

> 一期语言：`zh-Hans`（默认，兼容 `zh-CN` / `zh`）与 `en`；日期 / 数字格式化走
> `Intl`，不受本 Provider 影响（数字框的 locale prop 见 NumberBox）。

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { FluereConfigProvider } from '@fluere-vue/ui'

// 随应用当前语言切换即可；缺省 zh-Hans，切 'en' 整体转英文内建文案
const locale = ref<'zh-Hans' | 'en'>('en')
</script>

<template>
  <FluereConfigProvider :locale="locale">
    <FluereNumberBox spin-button-placement-mode="inline" />
    <FluereProgressRing />
  </FluereConfigProvider>
</template>
```

无需 Provider 时组件仍可用：自动回落内置缺省 zh-Hans，不会抛错。

## 解析优先级

| 层级                            | 说明                                                                                             |
| ------------------------------- | ------------------------------------------------------------------------------------------------ |
| 显式文案 prop                   | 如 `revealButtonLabel`、`increaseLabel` / `decreaseLabel`、`closeButtonLabel`、`label`，最高优先 |
| 组件 `locale` prop              | 只改单个组件的内建文案，压过 Provider                                                            |
| `FluereConfigProvider` `locale` | 子树级切换                                                                                       |
| 内置缺省                        | zh-Hans；缺 key 回退链 `zh-Hans → zh → en`                                                       |

## 覆盖个别措辞（无需改源码）

`messages` 按 `locale → scope → key` 深合并进各组件内置切片，只覆盖列出的项：

```vue
<template>
  <FluereConfigProvider :messages="{ 'zh-Hans': { input: { showPassword: '显示明文' } } }">
    <FluereInput
      type="password"
      placeholder="密码"
    />
  </FluereConfigProvider>
</template>
```

`scope` 与各切片里的 `key` 见各组件文档或 `packages/ui/src/<component>/locale.ts`。

## 首批覆盖的内建文案

- `input`：显示按钮可访问名（`showPassword`）
- `number-box`：增减按钮可访问名（`increase` / `decrease`）
- `scroll-view`：辐射两端步进与滚动条拇指可访问名（`scrollUp` … / `horizontalScrollBar` / `verticalScrollBar`）
- `infobar`：关闭按钮可访问名（`close`）
- `progress-ring` / `progress-bar`：不确定态「加载中」（`loading`）

> 组件库不引入 `vue-i18n` 运行时；消息编译 / 解析 / 回退复用 `@intlify/core-base`
> （见 `packages/hooks` 的 `use-locale`）。语言包子路径导出
> `@fluere-vue/ui/locales/zh-Hans` / `/en` 随 0.3 目标 3 构建落地。

## API

| 属性（Props） | 类型                     | 默认        | 说明                                                   |
| ------------- | ------------------------ | ----------- | ------------------------------------------------------ |
| `locale`      | `FluereLocale \| string` | `'zh-Hans'` | 子树内建文案的 locale；`zh-CN` / `zh` 归一为 `zh-Hans` |
| `messages`    | `ProviderMessages`       | `—`         | 按 `locale → scope → key` 覆盖个别文案                 |

## 无障碍与回退

- 内建文案主要为 AT 用的可访问名（loading / close / scroll 等），不是可见文本；
  可见文案依旧由消费方（常经 `label` / header / 插槽）提供。
- 开发环境缺 key 会告警并回退到 `en`；生产静默回退，不刷屏。
- SSR 安全：Provider 的 locale / messages 均为实例级（provide/inject），
  并发渲染互不串语言；`packages/ui/src/__tests__/ssr-smoke.test.ts` 覆盖了
  `zh-Hans` / `en` 两种 locale 下各组件与并发隔离。
