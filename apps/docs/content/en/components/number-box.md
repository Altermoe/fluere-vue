---
title: NumberBox
description: A numeric input control for entering numbers, validating ranges and incremental stepping.
nav:
  title: NumberBox
---

# NumberBox

The NumberBox lets users enter and adjust numbers (quantity, price, tax rate, font size…). Its style and behavior reproduce the WinUI 3 (Windows App SDK) **NumberBox**: it is essentially a **TextBox + math parsing + `NaN` semantics**, so this component embeds `FluereInput` (consistent with the embedded TextBox in the WinUI template) and implements WinUI's value-handling semantics, validation modes, spin buttons and inline expressions.

Values follow WinUI's **Value ↔ Text dual channel**: when the value changes, the formatted text is written back to the input box; on blur or Enter, the text is parsed and the value updated. Clearing the input box yields `null` (corresponding to WinUI's `NaN`), at which point `placeholder` is shown.

> Difference from the original plan in `docs/todo.md`: reuse of reka-ui's `NumberField` was originally planned, but its `NumberFieldInput` has a few hard conflicts with WinUI — `Home` / `End` are mapped to min / max (WinUI leaves them to the TextBox to move the caret), invalid input clears the value on blur (WinUI keeps the original value), arrow keys snap to the step (WinUI adds directly), the wheel direction is reversed, and `LargeChange` is hardcoded to 10 steps. Here the "reuse" approach is kept but re-implemented as a self-contained implementation: the `format` / `parse` / `expression` / `step` four pure-function layers plus the `use-number-box` / `use-spin-repeat` two hooks, each unit-testable independently.

## Basic usage

`v-model` binds the numeric value, `header` is WinUI's title row (also the default accessible name), and `description` renders below the control and acts as `aria-describedby`.

::demo-block{title="Basic usage"}
#preview
:NumberBoxBasicDemo
#code

```vue
<FluereNumberBox v-model="quantity" header="数量" />
<FluereNumberBox v-model="price" header="单价" description="支持小数" />
```

::

## Range and step

`min` / `max` map to `Minimum` / `Maximum` (by default no bounds are set, in which case `aria-valuemin` / `aria-valuemax` are not rendered); `step` is `SmallChange` (arrow keys / wheel / spin buttons), `largeStep` is `LargeChange` (`PageUp` / `PageDown`). Consistent with WinUI: **no step snapping**, values are only clamped (or wrapped) when out of range.

::demo-block{title="Range and step"}
#preview
:NumberBoxStepDemo
#code

```vue
<FluereNumberBox
  v-model="quantity"
  :min="0"
  :max="500"
  :step="10"
  :large-step="100"
  header="数量"
/>
<FluereNumberBox v-model="ratio" :min="0" :max="1" :step="0.1" header="比例" />
```

::

Pass `wrap-enabled` for `IsWrapEnabled`: after reaching an endpoint the value wraps around to the other end, and both buttons stay usable.

## Spin buttons

`spinButtonPlacementMode` maps to `SpinButtonPlacementMode`: `hidden` (default) / `inline` (up/down buttons inline to the right of the input box) / `compact` (a button panel floats up on focus). `inline` shares a TextBox border with the input box; the buttons are 32×24, margin 4, corner radius 4; holding a button steps once immediately, then repeats every 250ms (the WinUI `RepeatButton` `Delay` / `Interval` defaults). Buttons never enter the Tab sequence (WinUI `IsTabStop=False`) but can be activated with `Enter` / `Space`.

::demo-block{title="Inline buttons"}
#preview
:NumberBoxInlineDemo
#code

```vue
<FluereNumberBox
  v-model="fontSize"
  :min="9"
  :max="72"
  spin-button-placement-mode="inline"
  header="字号"
/>
<FluereNumberBox
  v-model="zoom"
  :min="0.5"
  :max="3"
  :step="0.25"
  spin-button-placement-mode="inline"
  header="缩放"
/>
```

::

::demo-block{title="Compact buttons"}
#preview
:NumberBoxCompactDemo
#code

```vue
<FluereNumberBox
  v-model="opacity"
  :min="0"
  :max="100"
  spin-button-placement-mode="compact"
  header="不透明度"
/>
```

::

## Inline expressions

`accepts-expression` maps to `AcceptsExpression`: on blur or Enter it evaluates expressions composed of `+ - * / ^` and parentheses, with precedence `^` > `*` `/` > `+` `-`. After evaluation the raw expression is not preserved (it is replaced by the result).

::demo-block{title="Inline expressions"}
#preview
:NumberBoxExpressionDemo
#code

```vue
<FluereNumberBox v-model="total" accepts-expression placeholder="例如 (2+3)*4^2" header="计算值" />
```

::

## Validation modes

`validationMode` maps to `ValidationMode`:

- `invalidInputOverwritten` (default): on blur / Enter, invalid input is overwritten by the formatted text of the current value, and out-of-range values are clamped back into the range;
- `disabled`: keeps the user's input and out-of-range values, leaving validation to the consumer.

`Escape` always discards the input and returns to the current value; `Enter` commits the input (and swallows the key to avoid triggering an implicit form submission, matching how WinUI handles `Enter`).

::demo-block{title="Validation modes"}
#preview
:NumberBoxValidationDemo
#code

```vue
<FluereNumberBox v-model="strict" :min="0" :max="100" header="默认：非法输入被覆盖" />
<FluereNumberBox
  v-model="lenient"
  :min="0"
  :max="100"
  validation-mode="disabled"
  header="保留输入"
/>
```

::

## Formatting and locale

`formatOptions` (`Intl.NumberFormatOptions`) maps to `NumberFormatter`, and `locale` determines the decimal point / group separators / minus sign — **display and parsing share the same set of symbols**. SSR apps are recommended to pass `locale` explicitly: by default the runtime's default locale is used, but the server and browser defaults may differ (e.g. the de-DE decimal point), producing a hydration mismatch on the first frame.

WinUI's default `DecimalFormatter` is set to `IntegerDigits(1)` + `FractionDigits(0)`, which on several WinAppSDK versions rounds the displayed value to an integer ([microsoft/microsoft-ui-xaml#8780](https://github.com/microsoft/microsoft-ui-xaml/issues/8780): entering 25.8 shows 26 after blur). On the web side decimals are not dropped by default (`maximumFractionDigits: 20`), otherwise a usage such as `step = 0.1` becomes unusable at the display layer; pass `:format-options="{ maximumFractionDigits: 0 }"` to get WinUI's integer look. Before display, a WinUI-style 10-significant-digit rounding is also applied to wipe out floating-point noise such as `0.1 + 0.2 = 0.30000000000000004`.

::demo-block{title="Formatting and locale"}
#preview
:NumberBoxFormatDemo
#code

```vue
<FluereNumberBox
  v-model="integer"
  :format-options="{ maximumFractionDigits: 0 }"
  header="整数外观"
/>
<FluereNumberBox
  v-model="fixed"
  :format-options="{ minimumFractionDigits: 2, maximumFractionDigits: 2 }"
  header="固定两位小数"
/>
<FluereNumberBox v-model="german" locale="de-DE" header="de-DE：1.234,5" />
```

::

## Disabled

::demo-block{title="Disabled state"}
#preview
:NumberBoxDisabledDemo
#code

```vue
<FluereNumberBox
  :model-value="35"
  :min="0"
  :max="100"
  disabled
  spin-button-placement-mode="inline"
  header="禁用"
/>
```

::

## Form submission

When placed inside a `<form>` with a `name`, it adds a hidden native `<input type="hidden">` submitting `name=value` (an empty string when there is no value).

::demo-block{title="Form submission"}
#preview
:NumberBoxFormDemo
#code

```vue
<form @submit.prevent="onSubmit">
  <FluereNumberBox v-model="amount" name="amount" :min="0" :step="8" spin-button-placement-mode="inline" header="金额" />
  <FluereButton type="submit" appearance="primary">提交</FluereButton>
</form>
```

::

## API

| Prop (Props)              | Type                                      | Default                     | Description                                                                          |
| ------------------------- | ----------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------ |
| `modelValue`              | `number \| null`                          | `—`                         | Current value (`v-model`); `null` means no value (WinUI `NaN`)                       |
| `defaultValue`            | `number \| null`                          | `null`                      | Uncontrolled initial value                                                           |
| `min` / `max`             | `number`                                  | `—` (no bounds)             | Range (WinUI `Minimum` / `Maximum`)                                                  |
| `step`                    | `number`                                  | `1`                         | Step (WinUI `SmallChange`)                                                           |
| `largeStep`               | `number`                                  | `10`                        | Large step (WinUI `LargeChange`, `PageUp` / `PageDown`)                              |
| `disabled`                | `boolean`                                 | `false`                     | Whether the control is disabled                                                      |
| `header`                  | `string`                                  | `—`                         | Top title (WinUI `Header`), also the default accessible name                         |
| `label`                   | `string`                                  | `—`                         | Accessible name (takes precedence over `header`)                                     |
| `description`             | `string`                                  | `—`                         | Description below the control (WinUI `Description`), also used as `aria-describedby` |
| `placeholder`             | `string`                                  | `—`                         | Placeholder (WinUI `PlaceholderText`), shown only when there is no value             |
| `name`                    | `string`                                  | `—`                         | Form submission name, paired with the hidden native input                            |
| `locale`                  | `string`                                  | `—`                         | BCP 47 language tag; determines the formatting and parsing symbols                   |
| `formatOptions`           | `Intl.NumberFormatOptions`                | `maximumFractionDigits: 20` | Number formatting (WinUI `NumberFormatter`)                                          |
| `spinButtonPlacementMode` | `'hidden' \| 'compact' \| 'inline'`       | `'hidden'`                  | Spin button presentation (WinUI `SpinButtonPlacementMode`)                           |
| `validationMode`          | `'invalidInputOverwritten' \| 'disabled'` | `'invalidInputOverwritten'` | Validation mode (WinUI `ValidationMode`)                                             |
| `wrapEnabled`             | `boolean`                                 | `false`                     | Wrap around at the endpoints (WinUI `IsWrapEnabled`)                                 |
| `acceptsExpression`       | `boolean`                                 | `false`                     | Whether inline expressions are parsed (WinUI `AcceptsExpression`)                    |
| `increaseLabel`           | `string`                                  | `'Increase'`                | Accessible name of the plus button (localized from a resource in WinUI)              |
| `decreaseLabel`           | `string`                                  | `'Decrease'`                | Accessible name of the minus button                                                  |

| Event               | Payload                                                  | Description                                        |
| ------------------- | -------------------------------------------------------- | -------------------------------------------------- |
| `update:modelValue` | `number \| null`                                         | Value change (`v-model`)                           |
| `valueChanged`      | `{ oldValue: number \| null, newValue: number \| null }` | Value change (corresponds to WinUI `ValueChanged`) |

| Slot (Slots)  | Description                                         |
| ------------- | --------------------------------------------------- |
| `header`      | Top title row (WinUI `Header` / `HeaderTemplate`)   |
| `description` | Description below the control (WinUI `Description`) |

> Keyboard and pointer handling follow `NumberBox.cpp`: arrow keys step by `SmallChange`, `PageUp` / `PageDown` by `LargeChange`, `Enter` commits, `Escape` reverts, and gaining focus selects the whole text; the mouse wheel only responds while the input box holds focus, scrolling up increments (`MouseWheelDelta > 0`). WinUI leaves `Home` / `End` to the TextBox, and this component likewise does not treat them as step keys.
>
> Accessibility: the input box carries `role="spinbutton"` with `aria-valuenow` / `aria-valuemin` / `aria-valuemax` (the latter two are not rendered when no bounds are set, matching WinUI's behavior of composing them into the UIA name only once `Minimum` / `Maximum` are rewritten); the spin buttons do not enter the Tab sequence but can be activated by keyboard, and each carries an accessible name.
>
> Two web-side approximations: the compact popup approximates WinUI's Acrylic surface with `colorNeutralBackground1` + `shadow16` (the Fluent token set has no material tokens); when the inline buttons appear, the right side of the input box gives up an extra 84px to keep text from pressing onto the buttons (WinUI lets text press under the buttons).
>
> WinUI's `Text` property is not exposed as a separate prop: on the web side the input-box text is derived from `v-model` plus formatting (`Value → Text`); use `formatOptions` for custom text display. The WinUI initialization order of "when both `Text` and `Value` are set, `Value` wins" therefore does not apply.
