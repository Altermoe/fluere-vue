---
title: Select
description: A non-editable dropdown whose visuals follow the non-editable WinUI ComboBox.
nav:
  title: Select
---

# Select

`FluereSelect` is a **non-editable** dropdown: the trigger shows the current option (or a placeholder), a click opens the panel, and you pick an option with pointer or keyboard. The visuals mirror WinUI 3 (Windows App SDK) `ComboBox` in its non-editable form; the interaction base is reka-ui's `Select`.

## How it differs from Combobox

They look alike, but the responsibilities differ — picking the wrong one hands out input/search for free:

| Aspect      | `FluereSelect`                        | `FluereCombobox`                     |
| ----------- | ------------------------------------- | ------------------------------------ |
| Trigger     | Text + chevron only, **not editable** | Optionally an editable text input    |
| Text search | **None** (only the base's type-ahead) | Yes (`textSearchEnabled`)            |
| Event       | `change` (single value)               | `selectionChanged` (added / removed) |
| Best for    | Fixed enumerations                    | Filtering / free text                |

## Basic usage

`v-model` binds the selected value; `placeholder` shows while nothing is selected. Options come from `items` (`value` / `text` / `disabled`).

::demo-block{title="Basic usage"}
#preview
:SelectBasicDemo
#code

```vue
<FluereSelect v-model="value" :items="items" header="Refresh rate" placeholder="Select an option" />
```

::

## Controlled value and clearing

`modelValue` is the single source of truth; set it to `null` to fall back to the placeholder. Every selection emits `change`.

::demo-block{title="Controlled + change + clear"}
#preview
:SelectControlledDemo
#code

```vue
<FluereSelect v-model="value" :items="items" @change="(args) => (last = args.value)" />
<FluereButton size="small" @click="value = null">Clear selection</FluereButton>
```

::

## States and the empty list

`header` / `description` are linked to the trigger by id; disabled options are skipped by the keyboard; a whole `disabled` select never opens; when `items` is empty, `#empty` supplies the empty-state copy.

::demo-block{title="Header / description / disabled / empty"}
#preview
:SelectStatesDemo
#code

```vue
<FluereSelect
  v-model="v"
  :items="items"
  header="Sync speed"
  description="One option is disabled; the keyboard skips it."
/>
<FluereSelect v-model="v2" :items="items" disabled header="Disabled as a whole" />
<FluereSelect :items="[]" header="Empty list">
  <template #empty>No options</template>
</FluereSelect>
```

::

## Specification source

| Item       | Value                                                                           |
| ---------- | ------------------------------------------------------------------------------- |
| Control    | WinUI 3 `ComboBox` (**non-editable form**; WinUI has no control named `Select`) |
| tag/commit | `winui3/release/2.5.1` / `ba3a8d5`                                              |
| Key file   | `src/controls/dev/ComboBox/ComboBox_themeresources.xaml`                        |

## Implementation notes

- **Trigger**: `ComboBoxBackground*` ← `ControlFillColor*` → `--colorNeutralBackground1` / `…Hover` / `…Pressed` / `…Disabled`; all four sides use `ControlElevationBorderBrush` → `--colorNeutralStrokeAlpha`, the bottom edge uses `ControlStrokeColorDefault` → `--colorNeutralStroke1` (the same convention as this library's non-editable `FluereCombobox`, so two dropdowns on one page do not drift apart).
- **Items**: `ComboBoxItemBackground*` ← `SubtleFillColor*` → `--colorSubtleBackground` / `…Hover` / `…Pressed` / `…Selected`; the 3px selection pill uses `--colorCompoundBrandBackground`.
- **Panel**: `--borderRadiusXLarge` (OverlayCornerRadius), `--colorNeutralStroke1` border, `--shadow16` (elevation 16), `--colorNeutralBackground1` surface.
- **Layering and focus**: the popup goes through the 0.4.1 `useFlyout` (`--zIndexNavFlyout` plus nested-lift), the trigger through the 0.4.3 `useFocusVisual` (dual focus rectangle).
- **The panel styles must live in a non-scoped block**: reka's `SelectContent` puts its class on an element teleported to `body`, which never receives this component's `data-v-*` — scoped selectors fail silently (jsdom does not resolve `var()`, so unit tests cannot catch it).
- **Known gaps**: high contrast is not implemented; WinUI's `IsTextSearchEnabled` prefix matching is not implemented (the base's type-ahead is not search); the `size` scale and WinUI's `Compact` style are not built.

## API

### `FluereSelect`

| Prop                | Type                            | Default     | Mapping / notes                                              |
| ------------------- | ------------------------------- | ----------- | ------------------------------------------------------------ |
| `modelValue`        | `T \| null`                     | `undefined` | Controlled value (`v-model`); `undefined` means uncontrolled |
| `defaultValue`      | `T \| null`                     | `null`      | Uncontrolled initial value                                   |
| `items`             | `FluereSelectItem<T>[]`         | `[]`        | `ItemsSource`; each item has `value` / `text` / `disabled`   |
| `open`              | `boolean`                       | `undefined` | `v-model:open`; internal state when omitted                  |
| `defaultOpen`       | `boolean`                       | `false`     | Uncontrolled initial open state                              |
| `disabled`          | `boolean`                       | `false`     | `IsEnabled`                                                  |
| `placeholder`       | `string`                        | —           | `PlaceholderText`                                            |
| `header`            | `string`                        | —           | Heading above the trigger; also the accessible name          |
| `label`             | `string`                        | —           | Explicit accessible name (takes precedence over `header`)    |
| `description`       | `string`                        | —           | Helper text below the trigger                                |
| `name`              | `string`                        | —           | Passed to a hidden input for form submission                 |
| `by`                | `string \| ((a, b) => boolean)` | —           | Custom equality (required for object values)                 |
| `dir`               | `Direction`                     | —           | Text direction                                               |
| `maxDropDownHeight` | `number`                        | `504`       | `MaxDropDownHeight` in px                                    |

| Event               | Payload                | Mapping / notes                        |
| ------------------- | ---------------------- | -------------------------------------- |
| `update:modelValue` | `T \| null`            | Controlled write-back (`v-model`)      |
| `update:open`       | `boolean`              | Open-state write-back (`v-model:open`) |
| `change`            | `{ value: T \| null }` | Selection changed                      |

| Slot    | Notes                                                 |
| ------- | ----------------------------------------------------- |
| `item`  | Custom item rendering, scope `{ item, selected }`     |
| `empty` | Empty-list copy (the library adds no built-in string) |
