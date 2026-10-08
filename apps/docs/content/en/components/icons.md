---
title: Icons
description: Vue 3 icon components for WinUI 3 / Fluent System Icons.
nav:
  title: Icons
---

# Icons

Vue 3 icon components for WinUI 3 / Fluent System Icons, generated from the official open-source package `@fluentui/svg-icons`
(MIT, i.e. the vector source of the Segoe Fluent Icons font). A total of 2953 icon names × 10 / 12 / 16 / 20 / 24 / 28 / 32 / 48 sizes × regular / filled styles.

## Usage

::demo-block{title="Usage"}
#preview
:IconsUsageDemo
#code

```vue
import { FluentIconAdd20Filled } from '@fluere-vue/icons'

<FluentIconAdd20Filled />
<FluentIconAdd20Filled size="24" title="添加" />
```

::

## Icon browser

Search by icon name, filter by size and style, and click any icon to copy its component name.

:IconsBrowserDemo

## API

Each icon is an independent component, and the export name follows the rule `FluentIcon{Name}{Size}{Style}`:

- `{Name}`: the icon name converted to PascalCase, e.g. `accessibility_checkmark` → `AccessibilityCheckmark`;
- `{Size}`: `10` / `12` / `16` / `20` / `24` / `28` / `32` / `48`;
- `{Style}`: `Regular` / `Filled`.

Examples: `FluentIconAdd20Filled`, `FluentIconAccessibilityCheckmark24Regular`.

| Prop (Props) | Type               | Default            | Description                                                                                                                                            |
| ------------ | ------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `size`       | `number \| string` | Native design size | Rendered size (px). Defaults to the icon's native size (e.g. 20 for `FluentIconAdd20Filled`); when enlarging, use multiples of 2 to avoid blurriness   |
| `title`      | `string`           | `—`                | Accessibility title; when provided it renders a `<title>` and sets `role` to `img`, otherwise the icon is treated as decorative (`aria-hidden="true"`) |

> **attrs passthrough**: all undeclared attributes and events fall through to the root `<svg>`, so `class` / `style` / `aria-label` / `@click` can be passed directly as with a native SVG. `aria-label` and `title` have the same effect — if either is present the icon is considered to have an accessible name, and `aria-hidden` is no longer set.
>
> **Colors follow the text**: `fill="currentColor"`, so the icon color always equals the current text color; light/dark themes and semantic colors such as `colorNeutralForeground*` automatically take effect with no need to specify a color for the icon. The root node also carries `focusable="false"` (to avoid Tab focus in IE / legacy Edge) and `data-icon-name` (the original icon name, useful for testing and debugging).
