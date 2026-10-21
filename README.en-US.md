# FluereVue

[简体中文](./README.md) | English

A Vue 3 component library modeled on the native Windows 11 / WinUI 3 controls, focused on reproducing each control's visual styling, interaction states, and animation details.

> **Public documentation site**: <https://fluere-vue.nahida.space>. If you are reading this README on npm, please visit the documentation site for component Props / events, live examples, and API tables.

FluereVue is built against real Windows behavior and the matching Windows App SDK source, not merely the Fluent Design web specification: each control is checked state by state (`rest` / `hover` / `pressed` / `selected` / `focus` / `disabled`) for size, corner radius, stroke, fill, and motion before it is implemented in the browser.

> Browsers cannot provide every native capability. System-level animations, haptic feedback, and native window behaviors are out of scope for a full reproduction; the implementation distinguishes **faithfully reproduced**, **approximated**, and **not supported**, with the evidence for each value documented in [docs/style-spec.md](./docs/style-spec.md).

## Features

| Area                     | Description                                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| **Control styling**      | Modeled on real WinUI 3 behavior; size, corner radius, stroke, fill, icons, and typography verified state by state              |
| **Interaction & motion** | Reproduces hover / pressed / focus / toggle / content-expand states, with durations and easing aligned to WinUI keyframes       |
| **Material effects**     | Web approximations of Mica / Acrylic                                                                                            |
| **Light & dark themes**  | Light / Dark, with optional follow-system preference                                                                            |
| **Accessibility**        | Focus rectangles, color contrast, and ARIA semantics                                                                            |
| **Icons**                | Vue icon components generated from Segoe Fluent Icons vector sources                                                            |
| **Tech stack**           | Vue 3 + TypeScript; self-contained component styles, on-demand imports, SSR-safe (see [docs/ssr-guide.md](./docs/ssr-guide.md)) |

## Project status & component coverage

Current version **0.5.0-alpha.1** (pre-release); all six packages are published to npm and ready to install. Component coverage:

| Component                                     | WinUI 3 control                                 | Status | Version    |
| --------------------------------------------- | ----------------------------------------------- | ------ | ---------- |
| `FluereButton`                                | Button / ToggleButton                           | Done   | 0.1.0-rc.1 |
| `FluereCheckbox`                              | CheckBox                                        | Done   | 0.1.0-rc.1 |
| `FluereToggleSwitch`                          | ToggleSwitch                                    | Done   | 0.1.0-rc.1 |
| `FluereRadioGroup` / `FluereRadioButton`      | RadioButton                                     | Done   | 0.1.0-rc.1 |
| `FluereSlider`                                | Slider                                          | Done   | 0.1.0-rc.1 |
| `FluereNumberBox`                             | NumberBox                                       | Done   | 0.1.0-rc.1 |
| `FluereCombobox`                              | ComboBox                                        | Done   | 0.1.0-rc.1 |
| `FluereContentDialog`                         | ContentDialog                                   | Done   | 0.1.0-rc.1 |
| `FluereInfoBadge`                             | InfoBadge                                       | Done   | 0.1.0-rc.1 |
| `FluereInfoBar`                               | InfoBar                                         | Done   | 0.1.0-rc.1 |
| `FluereProgressBar`                           | ProgressBar                                     | Done   | 0.1.0-rc.1 |
| `FluereProgressRing`                          | ProgressRing                                    | Done   | 0.1.0-rc.1 |
| `FluereInput`                                 | TextBox / PasswordBox                           | Done   | 0.1.0-rc.1 |
| `FluereTooltip`                               | ToolTip / ToolTipService                        | Done   | 0.1.0-rc.1 |
| `FluereConfigProvider`                        | — (i18n / global config)                        | Done   | 0.3.0-rc.1 |
| `FluereScrollView`                            | ScrollView                                      | Done   | 0.3.0-rc.1 |
| `FluereToggleButton`                          | ToggleButton                                    | Done   | 0.4.0      |
| `FluereToggleGroup` / `FluereToggleGroupItem` | — (grouped toggle, no same-named WinUI control) | Done   | 0.4.0      |
| `FluereSelect`                                | ComboBox (non-editable)                         | Done   | 0.4.0      |
| `FluereAppWindow`                             | TitleBar (window chrome)                        | Done   | 0.5.0      |
| `FluereCaptionButtons`                        | AppWindowTitleBar (caption buttons)             | Done   | 0.5.0      |
| `FluereTabView` / `FluereTabViewItem`         | TabView                                         | Done   | 0.5.0      |
| `FluereText`                                  | — (text styles / Windows type ramp)             | Done   | 0.6.0      |

- See the component pages on the [documentation site](https://fluere-vue.nahida.space) for each component's Props / events / examples.
- The **Version** column marks the milestone at which a component landed in the repository: `0.1.0-rc.1` is the general control batch, `0.3.0-rc.1` is the i18n / configuration batch, `0.4.0` closes out the primitives plus ToggleButton / ToggleGroup / Select, and `0.5.0` is the Explorer-skeleton batch (window chrome, caption buttons, tabs); the currently published `0.5.0-alpha.1` already includes the `0.4.0` and `0.5.0` batches.
- Per-version implementation order, acceptance criteria, and the 0.4.0 – 0.9.0-rc.1 schedule are in [docs/todo.md](./docs/todo.md).
- Live playground (components under development are updated continuously): <https://fluere-vue.nahida.space>

## Quick start

Requires Node >= 22.13. Install the packages:

```bash
pnpm add @fluere-vue/ui vue
```

Import the global styles (design tokens + component styles):

```ts
import '@fluere-vue/ui/style.css'
```

Minimal example:

```vue
<script setup lang="ts">
import { FluereButton } from '@fluere-vue/ui'
</script>

<template>
  <FluereButton appearance="primary">Save</FluereButton>
</template>
```

- `vue` (`^3.5`) is a peer dependency provided by the consumer; the packages are pure ESM, JS is tree-shakable on demand, and the stylesheet must be imported once as a whole.
- See [packages/ui/README.md](./packages/ui/README.md) for locale packs and `FluereConfigProvider` usage.
- This version is a pre-release, so `pnpm add` resolves `latest` (pre-releases do not move it: `latest` is still `0.3.0-alpha.2`); pin this pre-release with `@fluere-vue/ui@0.5.0-alpha.1`, or use the `@alpha` dist-tag.

> The packages have not reached a stable release (`0.3.0`), so breaking changes may still occur during the pre-release period; see [docs/release.md](./docs/release.md) for the release process and known caveats.

## Local development

Development requires Node >= 22.13 (26 recommended) and pnpm `11.27.0`. The pnpm version is pinned by the `packageManager` field in the root `package.json`; with Corepack enabled it is selected automatically.

```bash
pnpm install
pnpm dev          # documentation site at http://localhost:60727
```

Common commands:

| Command              | Purpose                                                                    |
| -------------------- | -------------------------------------------------------------------------- |
| `pnpm dev`           | Start the documentation site (port 60727)                                  |
| `pnpm build`         | Build `dist` for the six publishable packages in topological order         |
| `pnpm test`          | Run the full Vitest suite                                                  |
| `pnpm check`         | Required before delivery: lint + format + tsc + i18n + version consistency |
| `pnpm lint:ssr`      | SSR compatibility scan                                                     |
| `pnpm docs:generate` | Documentation-site pre-render check (used in CI instead of `docs:build`)   |

> `apps/playground` is currently a placeholder package (`private`, no dev script); the playground will be handled together with 0.4.0, see [docs/todo.md](./docs/todo.md).

Before changing a component, read [CONTRIBUTING.md](./CONTRIBUTING.md) (development workflow and acceptance checklist) and [docs/style-spec.md](./docs/style-spec.md) (the basis for style and behavior alignment); when checking upstream source, first set up the local WinUI source snapshot as described in style-spec §2/§3.

## Documentation & site

| Document                                   | Contents                                                                                        |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| [CONTRIBUTING.md](./CONTRIBUTING.md)       | Contribution workflow, standard process for adding / modifying components, Definition of Done   |
| [docs/style-spec.md](./docs/style-spec.md) | Alignment baseline, version-checking method, token mapping, and evidence chain                  |
| [docs/ssr-guide.md](./docs/ssr-guide.md)   | SSR-compatible development guidelines (tiered handling of browser APIs)                         |
| [docs/todo.md](./docs/todo.md)             | Component inventory, per-version implementation order, acceptance criteria, and near-term plans |
| [docs/release.md](./docs/release.md)       | Version management, Changesets, npm Trusted Publishing, and the first release                   |
| [docs/ci.md](./docs/ci.md)                 | GitHub Actions / OneDev workflows, checks, and reproducing CI locally                           |
| [docs/deployment.md](./docs/deployment.md) | OneDev deployment, Nginx, environment configuration, health checks, and rollback                |
| [docs/adr/](./docs/adr/)                   | Architecture decision records (e.g. build tool selection)                                       |
| [README.md](./README.md)                   | Chinese README (简体中文)                                                                       |
| [AGENTS.md](./AGENTS.md)                   | Repository conventions for code agents                                                          |

Online documentation site: <https://fluere-vue.nahida.space> (English: <https://fluere-vue.nahida.space/en>; source in [apps/docs](./apps/docs)).

- Since **0.5.5** the home page is taken over full-screen by a Windows desktop simulation (wallpaper → Explorer window → taskbar; the window assembles `FluereAppWindow` + `FluereNavigationView` + `FluereTabView`). The shell is an **application-level composition**: it lives entirely in [apps/docs/components/shell](./apps/docs/components/shell) and `apps/docs/utils/shell-window-state.ts`, and is **not** part of `@fluere-vue/ui` (so the component table above is unchanged). Layout assumptions, measured constraints, and the recorded deviation are in [docs/design/explorer-layout.md](./docs/design/explorer-layout.md) and [apps/docs/README.md](./apps/docs/README.md); the "WindowsOS simulation boundaries" text is now visible content inside the home-page window.

## Continuous integration & release

The project uses GitHub Actions and OneDev for continuous integration, releases, and deployment: GitHub Actions runs verification on pull requests / `main` and publishes to npm (Changesets + Trusted Publishing); OneDev runs the same verification and the documentation-site build, and deploys when a `v*` tag is pushed. See [docs/ci.md](./docs/ci.md), [docs/deployment.md](./docs/deployment.md), and [docs/release.md](./docs/release.md) for the job breakdown, local reproduction, and rollback steps.

## License

MIT © 夕云葛城 (2022-2026), see [LICENSE](./LICENSE); Chinese reference in [LICENSE.zh-CN.md](./LICENSE.zh-CN.md).
