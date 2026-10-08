---
title: Radio
description: A radio-button component for selecting one option from a mutually exclusive group.
nav:
  title: Radio
---

# Radio

The radio component recreates the WinUI 3 / Windows App SDK **RadioButton** as two collaborating components: `FluereRadioGroup` (the group container, managing `v-model`, mutual exclusivity within the group, and arrow-key navigation) and `FluereRadioButton` (each item). The interaction base reuses the reka-ui RadioGroup, fully reproducing arrow-key cyclic navigation / selection within the group, the brand-solid circle + white inner dot of the selected state, and a faint preview of the inner dot while pressed (the WinUI-exclusive `PressedCheckGlyph`).

## Basic usage

`v-model` binds the currently selected value, and each `FluereRadioButton`'s `value` determines its own value. Options within the same group are mutually exclusive; clicking any item selects exactly one.

::demo-block{title="Basic usage"}
#preview
:RadioBasicDemo
#code

```vue
<FluereRadioGroup v-model="color">
  <FluereRadioButton value="red">Tomato red</FluereRadioButton>
  <FluereRadioButton value="teal">Teal</FluereRadioButton>
  <FluereRadioButton value="blue">Starlight blue</FluereRadioButton>
</FluereRadioGroup>
```

::

## Horizontal group

By default the options stack vertically; pass `orientation="horizontal"` to lay them out horizontally (can be combined with `flex-wrap` to wrap).

::demo-block{title="Horizontal layout"}
#preview
:RadioOrientationDemo
#code

```vue
<FluereRadioGroup v-model="align" orientation="horizontal">
  <FluereRadioButton value="left">Left</FluereRadioButton>
  <FluereRadioButton value="center">Center</FluereRadioButton>
  <FluereRadioButton value="right">Right</FluereRadioButton>
</FluereRadioGroup>
```

::

## Disabled

Pass `disabled` on the group to disable it; to disable only individual items, pass `disabled` on the corresponding `FluereRadioButton`.

::demo-block{title="Disabled state"}
#preview
:RadioDisabledDemo
#code

```vue
<FluereRadioGroup v-model="plan" disabled>
  <FluereRadioButton value="free">Free</FluereRadioButton>
  <FluereRadioButton value="pro">Pro</FluereRadioButton>
</FluereRadioGroup>

<FluereRadioGroup v-model="network">
  <FluereRadioButton value="wifi">Wi-Fi</FluereRadioButton>
  <FluereRadioButton value="ethernet" disabled>Ethernet</FluereRadioButton>
</FluereRadioGroup>
```

::

## Accessibility

`FluereRadioGroup` carries `role="radiogroup"`, and each item carries `role="radio"` + `aria-checked`; the arrow keys (↑↓/←→ + Home/End) navigate cyclically within the group and select in real time (reka roving focus). The visible text is already inside the button and automatically serves as the accessible name; if an item is icon-only (no readable text), provide `aria-label` via `label`; if the whole group has no visible title, pass `label` on `FluereRadioGroup` as the group's `aria-label`.

## Form submission

When inside a `<form>` with `name` passed, a hidden native `<input type="radio">` is automatically added, and the selected value is submitted with the form. It is recommended to put `name` on the group so the whole group submits as a single field.

## API

### FluereRadioGroup

| Prop           | Type                         | Default    | Description                                                     |
| -------------- | ---------------------------- | ---------- | --------------------------------------------------------------- |
| `modelValue`   | `AcceptableValue`            | `—`        | Currently selected value (`v-model`)                            |
| `defaultValue` | `AcceptableValue`            | `—`        | Uncontrolled initial selection                                  |
| `disabled`     | `boolean`                    | `false`    | Whether to disable all options in the group                     |
| `orientation`  | `'vertical' \| 'horizontal'` | `vertical` | Layout direction                                                |
| `name`         | `string`                     | `—`        | Form submission name (the whole group submits as one field)     |
| `required`     | `boolean`                    | `false`    | Group-level required constraint                                 |
| `loop`         | `boolean`                    | `true`     | Arrow keys navigate cyclically between the first and last items |
| `dir`          | `'ltr' \| 'rtl'`             | `—`        | Reading direction (usually no need to set)                      |
| `label`        | `string`                     | `—`        | The group's accessible name (equivalent to `aria-label`)        |

### FluereRadioButton

| Prop       | Type              | Default | Description                                                           |
| ---------- | ----------------- | ------- | --------------------------------------------------------------------- |
| `value`    | `AcceptableValue` | `—`     | This option's value (determines the selected state / submitted value) |
| `disabled` | `boolean`         | `false` | Whether this item is disabled (layered on top of the group)           |
| `name`     | `string`          | `—`     | This item's form submission name (usually use the group's `name`)     |
| `required` | `boolean`         | `false` | Required constraint                                                   |
| `id`       | `string`          | `—`     | Native id, can be linked with an external label's `for`               |
| `label`    | `string`          | `—`     | `aria-label` fallback for icon-only items                             |

> The circle is a fixed 20px diameter (corresponding to the WinUI RadioButton's circle size) and does not scale with size; the selected state is a 「brand solid circle + white inner dot」, with a faint preview of the inner dot while pressed — consistent with the WinUI RadioButton.
