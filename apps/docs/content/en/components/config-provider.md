---
title: Config Provider Localization
description: The i18n locale injection point for the library's built-in accessible-name strings.
nav:
  title: Config Provider Localization
---

# Config Provider Localization (i18n)

The library keeps its **built-in accessible names / default strings** in per-component
`locale.ts` slices (e.g. `input/locale.ts`, `infobar/locale.ts`). They default to the
built-in locale **zh-Hans**. `FluereConfigProvider` is the injection point: wrap it
around any components to switch the built-in strings for the whole subtree, or override
individual strings per `locale × scope`.

> Phase-one languages: `zh-Hans` (default; `zh-CN` / `zh` are aliased to it) and `en`.
> Date / number formatting goes through `Intl` and is unaffected by this provider
> (see the `locale` prop on NumberBox).

## Basic usage

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { FluereConfigProvider } from '@fluere-vue/ui'

// Follow your app's current language; default is zh-Hans, switch to 'en' for English
const locale = ref<'zh-Hans' | 'en'>('en')
</script>

<template>
  <FluereConfigProvider :locale="locale">
    <FluereNumberBox spin-button-placement-mode="inline" />
    <FluereProgressRing />
  </FluereConfigProvider>
</template>
```

Without a provider the components still work: they fall back to the built-in zh-Hans
default and never throw.

## Resolution order

| Level                           | Description                                                                                              |
| ------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Explicit text prop              | `revealButtonLabel`, `increaseLabel` / `decreaseLabel`, `closeButtonLabel`, `label` … — highest priority |
| Component `locale` prop         | overrides the built-in strings of a single component, beats the provider                                 |
| `FluereConfigProvider` `locale` | subtree-wide switch                                                                                      |
| Built-in default                | zh-Hans; missing keys fall back `zh-Hans → zh → en`                                                      |

## Overriding individual strings (no source change)

`messages` deep-merges into each component slice per `locale → scope → key`,
overriding only the listed entries:

```vue
<template>
  <FluereConfigProvider :messages="{ 'zh-Hans': { input: { showPassword: '显示明文' } } }">
    <FluereInput
      type="password"
      placeholder="Password"
    />
  </FluereConfigProvider>
</template>
```

The `scope` and the `key`s available in each slice are documented on the component pages
or in `packages/ui/src/<component>/locale.ts`.

## Built-in strings covered in phase one

- `input`: the password reveal button accessible name (`showPassword`)
- `number-box`: the spin button accessible names (`increase` / `decrease`)
- `scroll-view`: track step buttons and scrollbar thumb accessible names
  (`scrollUp` … / `horizontalScrollBar` / `verticalScrollBar`)
- `infobar`: the close button accessible name (`close`)
- `progress-ring` / `progress-bar`: the indeterminate "loading" name (`loading`)

> The library does not carry the `vue-i18n` runtime; message compilation / resolution
> and the fallback chain reuse `@intlify/core-base` (see `use-locale` in `packages/hooks`).
> The subpath exports `@fluere-vue/ui/locales/zh-Hans` and `/en` will ship with the
> 0.3 build pipeline (goal 3).

## API

| Prop       | Type                     | Default     | Description                                                                |
| ---------- | ------------------------ | ----------- | -------------------------------------------------------------------------- |
| `locale`   | `FluereLocale \| string` | `'zh-Hans'` | Subtree locale for built-in strings; `zh-CN` / `zh` normalize to `zh-Hans` |
| `messages` | `ProviderMessages`       | `—`         | Override individual strings per `locale → scope → key`                     |

## Accessibility and fallback

- The built-in strings are mostly AT-facing accessible names (loading / close / scroll),
  not visible text; visible text is still provided by the consumer (typically via
  `label`, header or slots).
- In development, a missing key warns and falls back to `en`; in production it falls back
  silently.
- SSR-safe: the provider's locale / messages are instance-scoped (provide/inject), so
  concurrent renders never leak languages. `packages/ui/src/__tests__/ssr-smoke.test.ts`
  covers both `zh-Hans` / `en` plus concurrent isolation.
