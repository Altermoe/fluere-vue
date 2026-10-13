---
title: Toggle Button
description: Three-state toggle button with an accent fill when checked, matching WinUI ToggleButton.
nav:
  title: Toggle Button
---

# Toggle Button

A toggle button switches between "unchecked / checked / indeterminate". Unlike a Checkbox it **is** the button — clicking it toggles in place with no separate check glyph; unlike a Button it **keeps** the checked state (filled with the accent color). The look mirrors WinUI 3 (Windows App SDK) `ToggleButton`.

## Basic usage

`v-model:checked` binds a boolean. This is a **controlled** component: clicking only emits `update:checked`, and the consumer decides whether the state changes.

::demo-block{title="Basic usage"}
#preview
:ToggleButtonBasicDemo
#code

```vue
<FluereToggleButton v-model:checked="bold">Bold</FluereToggleButton>
<FluereToggleButton v-model:checked="italic">Italic</FluereToggleButton>
```

::

## Three-state (indeterminate)

`checked` accepts `null` (WinUI `IsChecked` is `bool?`). With `three-state` a click cycles `false → true → null → false`; the indeterminate state exposes `aria-pressed="mixed"` (not `aria-checked`).

::demo-block{title="Three-state toggle"}
#preview
:ToggleButtonThreeStateDemo
#code

```vue
<FluereToggleButton v-model:checked="value" three-state>Three-state toggle</FluereToggleButton>
```

::

## Sizes / disabled / icon only

The three sizes match Button (Fluent heights 24 / 32 / 40). "Checked and disabled" uses WinUI's accent-disabled fill (a translucent accent color). The icon-only form takes `icon-only` plus `label` for the accessible name.

::demo-block{title="Sizes and states"}
#preview
:ToggleButtonStatesDemo
#code

```vue
<FluereToggleButton v-model:checked="small" size="small">Small</FluereToggleButton>
<FluereToggleButton v-model:checked="medium" size="medium">Medium</FluereToggleButton>
<FluereToggleButton v-model:checked="large" size="large">Large</FluereToggleButton>
<FluereToggleButton disabled>Disabled</FluereToggleButton>
<FluereToggleButton v-model:checked="on" disabled>Disabled, checked</FluereToggleButton>
<FluereToggleButton icon-only :icon="FluentIconCheckmark24Regular" label="Checked" />
```

::

## Specification source

| Item       | Value                                                                                   |
| ---------- | --------------------------------------------------------------------------------------- |
| Control    | WinUI 3 `ToggleButton` (derives from `ButtonBase`; three states via `IsChecked: bool?`) |
| tag/commit | `winui3/release/2.5.1` / `ba3a8d5` (local snapshot `temp/winui-src`)                    |
| Key file   | `src/controls/dev/CommonStyles/ToggleButton_themeresources.xaml`                        |

## Implementation notes

- **The state table follows the theme resources one by one**: unchecked uses `ControlFillColor*` (`--colorNeutralBackground1` / `…Hover` / `…Pressed` / `…Disabled`); checked uses `AccentFillColor*` (`--colorBrandBackground` / `…Hover` / `…Pressed`); the checked foreground is `TextOnAccentFillColorPrimaryBrush` → `--colorNeutralForegroundOnBrand`; the indeterminate resource group (`*Indeterminate`) is **identical** to the unchecked one. The full mapping lives in the component file header.
- **Three values have no same-value Fluent token**, so they become component-local variables carrying the exact WinUI values (one line to override): `AccentFillColorDisabledBrush` / `TextOnAccentFillColorDisabledBrush` → `--fui-toggle-button-checked-disabled-background` (`#37000000` light / `#28FFFFFF` dark) and `-foreground` (`#FFFFFF` light / `#87FFFFFF` dark); `TextOnAccentFillColorSecondaryBrush` (checked pressed foreground) → `--fui-toggle-button-checked-pressed-foreground` (`#B3FFFFFF` light / `#80000000` dark).
- **Only the background animates**: the template's `ContentPresenter.BackgroundTransition = BrushTransition Duration=0:0:0.083` gives `transition: background-color 83ms linear` (the public `BrushTransition` source exposes the duration but no easing, hence linear, as noted); `BorderBrush` / `Foreground` changes are `DiscreteObjectKeyFrame KeyTime=0` — instant, no transition. Note: this library's `FluereButton` still uses 150ms + `curveEasyEase` across three properties, a deviation from A-level that is a pre-existing convention to be unified later.
- **Focus** uses the 0.4.3 shared primitive `useFocusVisual` (outer 2px `--colorStrokeFocus2` + inner 1px `--colorStrokeFocus1`, equivalent to `FocusVisualMargin = -3`). The component deliberately writes **no** `:focus-visible` rule — at equal specificity source order would swallow the ring.
- **Controlled semantics**: a click only emits `update:checked`, alongside the WinUI-named `checked` / `unchecked` / `indeterminate` events; the three-state cycle follows `ToggleButton_Partial.cpp#OnToggleImpl` (`Indeterminate → Unchecked`, `Checked + IsThreeState → Indeterminate`, otherwise `Checked ⇄ Unchecked`).
- **Known gaps**: high contrast is not implemented (WinUI HC switches these brushes to `SystemColor*`); the `AppBarToggleButton` subtle appearance is not built; the font weight follows this library's Button (`--fontWeightMedium`) while WinUI `Button_themeresources` uses `FontWeight = Normal`; the pressed / disabled **border** has no separate step (A-level pressed uses `ControlStrokeColorDefaultBrush`, which Input / ComboBox in this library map to `--colorNeutralStrokeAlpha`, while this component still uses `--colorNeutralStroke1`); `BackgroundSizing = OuterBorderEdge` is not written as an explicit `background-clip` (CSS `border-box` is already equivalent — no measured visual difference).

## API

### `FluereToggleButton`

| Prop           | Type                              | Default    | Mapping / notes                                              |
| -------------- | --------------------------------- | ---------- | ------------------------------------------------------------ |
| `checked`      | `boolean \| null`                 | `false`    | `IsChecked` (`v-model:checked`); `null` means indeterminate  |
| `disabled`     | `boolean`                         | `false`    | `IsEnabled`                                                  |
| `size`         | `'small' \| 'medium' \| 'large'`  | `'medium'` | Same geometry as this library's Button: heights 24 / 32 / 40 |
| `threeState`   | `boolean`                         | `false`    | `IsThreeState`; enables the `false → true → null` cycle      |
| `type`         | `'button' \| 'submit' \| 'reset'` | `'button'` | Native button type                                           |
| `icon`         | `Component`                       | —          | Leading icon component                                       |
| `iconPosition` | `'before' \| 'after'`             | `'before'` | Icon before or after the label                               |
| `iconOnly`     | `boolean`                         | `false`    | Icon-only (square); pass `label` for the accessible name     |
| `block`        | `boolean`                         | `false`    | Stretch to the container width                               |
| `label`        | `string`                          | —          | `AutomationProperties.Name` → native `aria-label`            |

| Event            | Payload           | Mapping / notes                           |
| ---------------- | ----------------- | ----------------------------------------- |
| `update:checked` | `boolean \| null` | Controlled write-back (`v-model:checked`) |
| `checked`        | —                 | WinUI `Checked`                           |
| `unchecked`      | —                 | WinUI `Unchecked`                         |
| `indeterminate`  | —                 | WinUI `Indeterminate`                     |

| Slot      | Notes                     |
| --------- | ------------------------- |
| `default` | Button label              |
| `icon`    | Replace the built-in icon |
