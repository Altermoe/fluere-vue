---
title: Toggle Group
description: A group of toggle buttons with single- and multi-select semantics; the visuals follow WinUI ToggleButton, the grouping semantics follow WAI-ARIA / reka-ui.
nav:
  title: Toggle Group
---

# Toggle Group

`FluereToggleGroup` turns several [`FluereToggleButton`](./toggle-button.md)s into a semantically grouped set: `role="group"`, a single Tab stop inside the group (roving tabindex), arrow-key / Home / End focus movement, and single-select (`string`) or multi-select (`string[]`) values.

> **WinUI has no ToggleGroup control**: the `microsoft-ui-xaml` tag `winui3/release/2.5.1` only ships `ToggleButton` (`git ls-tree -r winui3/release/2.5.1 | grep -i togglegroup` comes back empty). The split here is therefore: **each item's visuals follow WinUI `ToggleButton` exactly** (every item reuses the very same `FluereToggleButton` SFC, so there is no second state table), while the **grouping semantics** follow the WAI-ARIA toggle button group contract plus reka-ui — that layer has no A-level source to align with.

## Basic usage (single select)

`v-model` holds the current value (`string`) and each `FluereToggleGroupItem` provides its own `value`. A single-select group keeps one item pressed; **clicking the pressed item again clears the selection** (the value becomes `undefined` — ARIA toggle buttons may all be unpressed, unlike a RadioGroup which must keep one selected).

::demo-block{title="Single select"}
#preview
:ToggleGroupSingleDemo
#code

```vue
<FluereToggleGroup v-model="align" label="Text alignment">
  <FluereToggleGroupItem value="left">Align left</FluereToggleGroupItem>
  <FluereToggleGroupItem value="center">Center</FluereToggleGroupItem>
  <FluereToggleGroupItem value="right">Align right</FluereToggleGroupItem>
</FluereToggleGroup>
```

::

If your product requires "one item must stay selected", fold `undefined` back to the previous value:

```vue
<FluereToggleGroup :model-value="align" @update:model-value="(value) => (align = value ?? align)">
  <!-- … -->
</FluereToggleGroup>
```

## Multi select

With `type="multiple"` the `v-model` is a `string[]` and clicking adds or removes an element. When `type` is omitted it is inferred from the shape of `modelValue` / `defaultValue` (an array means multi-select).

::demo-block{title="Multi select"}
#preview
:ToggleGroupMultipleDemo
#code

```vue
<FluereToggleGroup v-model="formats" type="multiple" label="Text formats">
  <FluereToggleGroupItem
    value="bold"
    icon-only
    :icon="FluentIconTextBold24Regular"
    label="Bold"
  />
  <FluereToggleGroupItem
    value="italic"
    icon-only
    :icon="FluentIconTextItalic24Regular"
    label="Italic"
  />
</FluereToggleGroup>
```

::

## Disabled

`disabled` on the group is layered onto every item (the whole group is inert and the arrow keys never enter it). To disable individual items, pass `disabled` on those `FluereToggleGroupItem`s — the arrow keys **skip** them.

::demo-block{title="Disabled"}
#preview
:ToggleGroupDisabledDemo
#code

```vue
<FluereToggleGroup v-model="plan" disabled>
  <FluereToggleGroupItem value="free">Free</FluereToggleGroupItem>
  <FluereToggleGroupItem value="pro">Pro</FluereToggleGroupItem>
</FluereToggleGroup>

<FluereToggleGroup v-model="network">
  <FluereToggleGroupItem value="wifi">Wi-Fi</FluereToggleGroupItem>
  <FluereToggleGroupItem value="ethernet" disabled>Ethernet</FluereToggleGroupItem>
</FluereToggleGroup>
```

::

## Sizes, vertical layout and controlled / uncontrolled

`size` on the group sets one uniform size for its items (the 24 / 32 / 40 steps of `FluereToggleButton`); a `size` on the item wins. `orientation="vertical"` stacks the group and swaps the arrow keys from left/right to up/down. Without `modelValue` the group is **uncontrolled** (the underlying primitive keeps the state; `default-value` seeds it); with it, the group is controlled.

::demo-block{title="Sizes, controlled / uncontrolled"}
#preview
:ToggleGroupSizeDemo
#code

```vue
<!-- Uncontrolled: no modelValue, default-value seeds it -->
<FluereToggleGroup size="small" default-value="day">
  <FluereToggleGroupItem value="day">Day</FluereToggleGroupItem>
  <FluereToggleGroupItem value="week">Week</FluereToggleGroupItem>
  <FluereToggleGroupItem value="month">Month</FluereToggleGroupItem>
</FluereToggleGroup>

<!-- Controlled, vertical -->
<FluereToggleGroup v-model="large" size="large" orientation="vertical">
  <FluereToggleGroupItem value="day">Day</FluereToggleGroupItem>
  <FluereToggleGroupItem value="week">Week</FluereToggleGroupItem>
  <FluereToggleGroupItem value="month">Month</FluereToggleGroupItem>
</FluereToggleGroup>
```

::

## Accessibility

- The container is `role="group"`; when the group has no visible heading, pass `label` to provide its `aria-label`.
- Every item is a native `<button type="button">` and expresses its pressed state through `aria-pressed` (`"mixed"` for a three-state item); the accessible name comes from the visible text, or from `label` for icon-only items.
- **Roving tabindex**: Tab hands focus to the group container, which forwards it to the current item; from there `←` / `→` (or `↑` / `↓` for a vertical group) and `Home` / `End` move focus, disabled items are skipped, and `loop` (default `true`) wraps around. The focus ring reuses the 0.4.3 two-layer focus-rectangle primitive (`useFocusVisual`).
- Space / Enter trigger the toggle through the native `<button>`.

## Spec source

| Item            | Value                                                                                                                        |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Control         | WinUI 3 has **no** ToggleGroup control; visuals follow `ToggleButton`, grouping semantics follow WAI-ARIA / reka-ui          |
| tag/commit      | `winui3/release/2.5.1` / `ba3a8d5` (local snapshot `temp/winui-src`)                                                         |
| Visual source   | `src/controls/dev/CommonStyles/ToggleButton_themeresources.xaml` (full mapping table in the `toggle-button.vue` file header) |
| Behavior source | `src/dxaml/xcp/dxaml/lib/ToggleButton_Partial.cpp` (`ChangeVisualState` / `OnToggleImpl`)                                    |
| Grouping engine | reka-ui `2.10.1`: `ToggleGroupRoot` (value semantics + roving focus), `RovingFocusItem` (roving tabindex)                    |

## Implementation notes

- **One single source of visuals**: `FluereToggleGroupItem` renders `FluereToggleButton` itself (`toggle-group-item.vue` has no second `<style>` block and declares no colour or stroke at all), so buttons inside and outside a group share one state table, one geometry and one focus primitive — they cannot drift apart.
- **Division of labour with the primitive**: reka's `ToggleGroupRoot` produces `role="group"`, manages the single / multiple value semantics and provides roving focus; the item uses `RovingFocusItem` (**not** reka's `ToggleGroupItem`, which renders reka's own neutral button look) plus injection of the reka group context to read and write the value.
- **Single select can be cleared**: this follows reka / ARIA toggle button semantics — clicking the pressed item again yields `undefined`; use the one-liner from "Basic usage" when one item must stay selected.
- **Controlled / uncontrolled**: when `modelValue === undefined` it is forwarded as-is so the primitive self-manages, and the `update:modelValue` it emits is written back locally; when controlled, only the prop is honoured.
- **Group-level size**: in WinUI "a group of toggle buttons" is just buttons placed next to each other, with no group-level size concept; this library pushes the group `size` down to items through its own provide/inject (a library extension documented in `toggle-group/context.ts`) so a group cannot mix 24 / 32 / 40 px items.
- **Known gaps**: ① high contrast is not implemented (same as the rest of the library — WinUI's HC brushes are `SystemColor*`); ② the container gap is our own choice (`--spacingHorizontalXS`, 4px) because WinUI has no control to align with; ③ reka's `name` / `required` are not exposed — add a hidden `input` yourself when the group must be submitted with a form.

## API

### `FluereToggleGroup`

| Prop           | Type                             | Default                 | Description                                                            |
| -------------- | -------------------------------- | ----------------------- | ---------------------------------------------------------------------- |
| `modelValue`   | `string \| string[]`             | —                       | Current value (`v-model`); omit it for an uncontrolled group           |
| `defaultValue` | `string \| string[]`             | —                       | Initial value for the uncontrolled case                                |
| `type`         | `'single' \| 'multiple'`         | inferred from the value | Single (`string`) / multiple (`string[]`); an array means `'multiple'` |
| `disabled`     | `boolean`                        | `false`                 | Disables the whole group                                               |
| `orientation`  | `'horizontal' \| 'vertical'`     | `'horizontal'`          | Layout direction; also selects left/right vs up/down arrow navigation  |
| `loop`         | `boolean`                        | `true`                  | Arrow keys wrap around between the first and last item                 |
| `dir`          | `'ltr' \| 'rtl'`                 | —                       | Reading direction (rarely needed)                                      |
| `size`         | `'small' \| 'medium' \| 'large'` | —                       | Uniform size for the items; an item's own `size` wins                  |
| `label`        | `string`                         | —                       | Accessible name of the group (equivalent to `aria-label`)              |

| Emit                | Payload                           | Description                                                        |
| ------------------- | --------------------------------- | ------------------------------------------------------------------ |
| `update:modelValue` | `string \| string[] \| undefined` | Value change; a single-select group emits `undefined` when cleared |

| Slot      | Description                          |
| --------- | ------------------------------------ |
| `default` | The list of `FluereToggleGroupItem`s |

### `FluereToggleGroupItem`

| Prop       | Type                             | Default   | Description                                                          |
| ---------- | -------------------------------- | --------- | -------------------------------------------------------------------- |
| `value`    | `string`                         | —         | The item's value inside the group (**required**)                     |
| `disabled` | `boolean`                        | `false`   | Disables this item (layered on top of the group `disabled`)          |
| `size`     | `'small' \| 'medium' \| 'large'` | inherited | Size step; inherits the group `size`, then falls back to `'medium'`  |
| `block`    | `boolean`                        | `false`   | Stretches the item to the container width                            |
| `label`    | `string`                         | —         | Accessible name (equivalent to `aria-label`); required for icon-only |
| `icon`     | `Component`                      | —         | Icon component (`@fluere-vue/icons`), decorative and hidden from AT  |
| `iconOnly` | `boolean`                        | `false`   | Renders the icon only (compact square)                               |

| Slot      | Description                |
| --------- | -------------------------- |
| `default` | The button label           |
| `icon`    | Replaces the built-in icon |

> `FluereToggleGroupItem` must live inside `FluereToggleGroup`: the group context comes from reka's provide/inject, and using the item outside a group throws a readable error. Its visuals, disabled colours and focus ring all come from `FluereToggleButton`, so those three tables apply to every item in the group as well.
