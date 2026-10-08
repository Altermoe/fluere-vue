---
title: Checkbox
description: Checkbox component, used to select one or more options from a set.
nav:
  title: Checkbox
---

# Checkbox

A checkbox allows users to select one or more options from a group. Its styling reproduces the WinUI 3 (Windows App SDK) CheckBox, and its interaction primitives reuse reka-ui. When transitioning from "unchecked" to "checked / indeterminate", the glyph eases in from left to right (matching the WinUI CheckGlyph drawing animation); when unchecking, the glyph disappears immediately.

## Basic usage

Bind a boolean value with `v-model`; by default the checkbox toggles after a single click.

::demo-block{title="Basic usage"}
#preview
:CheckboxBasicDemo
#code

```vue
<FluereCheckbox v-model="agree">同意服务条款</FluereCheckbox>
<FluereCheckbox v-model="subscribe">订阅产品更新</FluereCheckbox>
```

::

## Indeterminate (three-state)

`modelValue` supports `true` / `false` / `'indeterminate'`. The indeterminate state renders as a horizontal-bar glyph, and clicking again enters the checked state. When used with "select all", first read the child items, then write back to each child item.

::demo-block{title="Select all · Indeterminate state"}
#preview
:CheckboxIndeterminateDemo
#code

```vue
<FluereCheckbox :model-value="allState" @update:model-value="toggleAll">
  全选
</FluereCheckbox>
<FluereCheckbox v-model="a">选项 A</FluereCheckbox>
<FluereCheckbox v-model="b">选项 B</FluereCheckbox>
<FluereCheckbox v-model="c">选项 C</FluereCheckbox>
```

::

## Disabled

When `disabled`, it is not interactive, and the fill, stroke, glyph, and text fall into the disabled tier (matching WinUI `ControlStrokeColorDisabled` / `AccentFillColorDisabled`).

::demo-block{title="Disabled state"}
#preview
:CheckboxDisabledDemo
#code

```vue
<FluereCheckbox disabled>未勾选（禁用）</FluereCheckbox>
<FluereCheckbox disabled :model-value="true">已勾选（禁用）</FluereCheckbox>
<FluereCheckbox disabled :model-value="'indeterminate'">不确定（禁用）</FluereCheckbox>
```

::

## Form submission

When placed inside a `<form>` with a `name` prop, a hidden native `<input type="checkbox">` is automatically injected, and the checked result is submitted with the form (`value` is used as the submitted value, defaulting to `"on"`).

::demo-block{title="Form submission"}
#preview
:CheckboxBasicDemo
#code

```vue
<form @submit.prevent>
  <FluereCheckbox name="opt-in" value="yes">同意接收邮件</FluereCheckbox>
</form>
```

::

## API

| Prop (Props) | Type                                 | Default | Description                                               |
| ------------ | ------------------------------------ | ------- | --------------------------------------------------------- |
| `modelValue` | `boolean \| 'indeterminate' \| null` | `false` | Checked state (`v-model`)                                 |
| `disabled`   | `boolean`                            | `false` | Whether the checkbox is disabled                          |
| `name`       | `string`                             | `—`     | Form submission name, paired with the hidden native input |
| `value`      | `AcceptableValue`                    | `'on'`  | Value submitted to the backend when checked               |

> The box is fixed at 20px (matching WinUI `CheckBoxSize = 20`) and does not scale with size.
