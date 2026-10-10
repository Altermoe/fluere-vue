---
title: Slider
description: A slider component for dragging out a value within a continuous range.
nav:
  title: Slider
---

# Slider

The slider lets the user drag out a value within a continuous range (volume, brightness, font size, price range…). The style and feel reproduce WinUI 3 (Windows App SDK) **Slider**, and the interaction base reuses the reka-ui Slider: pointer dragging, snap-to-step, `Home` / `End` / arrow keys / `PageUp` / `PageDown` keyboard operation, `role="slider"` semantics, and form submission are all handled by the base, while this component is responsible for landing WinUI's geometry and states item by item.

All geometry comes from WinUI original values: the control is 32px tall (`SliderPreContentMargin` 14 + track 4 + `SliderPostContentMargin` 14), the track is 4px thick with a 2px corner radius, and the 18×18 layout box of the thumb is stretched out by a `Margin=-2` into a 22×22 visual outer ring (a perfect circle, whose radius converges to half its width), with a 12px inner dot.

Pointer interaction likewise aligns with WinUI: pressing on the thumb (the whole visible 22×22 outer ring counts) merely 「grabs」 the thumb without changing the value; pressing on the track outside the thumb moves the thumb's center to the pointer and jumps the value (`MoveThumbToPoint`).

## Basic usage

`v-model` binds the numeric value, and `min` / `max` / `step` determine the range and step size (default 0–100, step 1); `header` is the WinUI title row and also serves as the default accessible name.

::demo-block{title="Basic usage"}
#preview
:SliderBasicDemo
#code

```vue
<FluereSlider v-model="volume" header="Volume" />
<FluereSlider v-model="brightness" header="Brightness" />
```

::

## Title and value tooltip

Use `header` or the `#header` slot for the top title. When holding the thumb (or when it has keyboard focus), a WinUI value tooltip (Disambiguation UI) floats above the thumb: the text is formatted with the decimal places of `step`, up to 4; passing `tooltip="false"` corresponds to `IsThumbToolTipEnabled=false`.

::demo-block{title="Title + value tooltip"}
#preview
:SliderHeaderDemo
#code

```vue
<FluereSlider v-model="fontSize" :min="9" :max="72" header="Font size">
  <template #header>Font size ({{ fontSize }} px)</template>
</FluereSlider>
```

::

## Range and step

The arrow keys move one step at a time, `PageUp` / `PageDown` or `Shift` + arrow keys jump 10 steps, and `Home` / `End` go straight to either end; while dragging, the value snaps to `step` and is clamped within `[min, max]`.

::demo-block{title="Range and step"}
#preview
:SliderStepDemo
#code

```vue
<FluereSlider v-model="price" :min="0" :max="1000" :step="50" header="Price" />
<FluereSlider v-model="ratio" :min="0" :max="1" :step="0.1" header="Zoom" />
```

::

## Vertical

`orientation="vertical"` switches to vertical: the value increases bottom-up (consistent with WinUI, the minimum is at the bottom); pass `inverted` to reverse. The vertical height is controlled by `verticalLength` (default 200px).

::demo-block{title="Vertical"}
#preview
:SliderVerticalDemo
#code

```vue
<FluereSlider v-model="bass" orientation="vertical" :vertical-length="160" label="Bass" />
<FluereSlider v-model="treble" orientation="vertical" :vertical-length="160" label="Treble" />
```

::

## Tick marks

`tickPlacement` corresponds to the WinUI `TickPlacement`: `none` (default) / `inline` (inside the track) / `outside` (both sides of the track) / `top-left` / `bottom-right` (one side, which is left / right when vertical). Consistent with WinUI, no tick lines are drawn when `tickFrequency` is 0 (the default).

::demo-block{title="Tick marks"}
#preview
:SliderTicksDemo
#code

```vue
<FluereSlider v-model="inline" tick-placement="inline" :tick-frequency="10" />
<FluereSlider v-model="outside" tick-placement="outside" :tick-frequency="10" />
```

::

## Disabled

When `disabled`, it is not interactive, and the track, the value fill, the thumb, and the title all fall to the …Disabled tier; the inner dot stops at the WinUI `Disabled`-state size of 14px.

::demo-block{title="Disabled state"}
#preview
:SliderDisabledDemo
#code

```vue
<FluereSlider :model-value="35" disabled header="Disabled" />
```

::

## Form submission

When inside a `<form>` with `name` passed, a hidden native `<input type="hidden">` is added, submitting `name=value`.

::demo-block{title="Form submission"}
#preview
:SliderFormDemo
#code

```vue
<form @submit.prevent="onSubmit">
  <FluereSlider v-model="gain" name="gain" header="Gain" />
  <FluereButton type="submit" appearance="primary">Submit</FluereButton>
</form>
```

::

## API

| Prop             | Type                                                              | Default        | Description                                                                          |
| ---------------- | ----------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------ |
| `modelValue`     | `number`                                                          | `—`            | Current value (`v-model`); when omitted, falls back to `defaultValue` (uncontrolled) |
| `defaultValue`   | `number`                                                          | `min`          | Uncontrolled initial value                                                           |
| `min` / `max`    | `number`                                                          | `0` / `100`    | Range (WinUI `RangeBase.Minimum` / `Maximum`)                                        |
| `step`           | `number`                                                          | `1`            | Step size (WinUI `StepFrequency`)                                                    |
| `disabled`       | `boolean`                                                         | `false`        | Whether disabled                                                                     |
| `orientation`    | `'horizontal' \| 'vertical'`                                      | `'horizontal'` | Orientation                                                                          |
| `inverted`       | `boolean`                                                         | `false`        | Reversed (WinUI `IsDirectionReversed`)                                               |
| `header`         | `string`                                                          | `—`            | Top title (WinUI `Header`), also the default accessible name                         |
| `label`          | `string`                                                          | `—`            | Accessible name (takes precedence over `header`)                                     |
| `name`           | `string`                                                          | `—`            | Form submission name, paired with a hidden native input                              |
| `tooltip`        | `boolean`                                                         | `true`         | Value tooltip (WinUI `IsThumbToolTipEnabled`)                                        |
| `tickPlacement`  | `'none' \| 'inline' \| 'outside' \| 'top-left' \| 'bottom-right'` | `'none'`       | Tick position (WinUI `TickPlacement`)                                                |
| `tickFrequency`  | `number`                                                          | `0`            | Tick interval (WinUI `TickFrequency`), 0 = not drawn                                 |
| `verticalLength` | `number`                                                          | `200`          | Control length when vertical (px)                                                    |
| `dir`            | `'ltr' \| 'rtl'`                                                  | `—`            | Reading direction                                                                    |

| Event               | Payload  | Description                              |
| ------------------- | -------- | ---------------------------------------- |
| `update:modelValue` | `number` | Value changed (`v-model`)                |
| `valueCommit`       | `number` | Final value at the end of an interaction |

| Slot     | Description                    |
| -------- | ------------------------------ |
| `header` | Top title row (WinUI `Header`) |

> State colors cross-reference `Slider_themeresources.xaml`: the track is `ControlStrongFillColorDefault` (same on hover / pressed), the value fill is `AccentFillColorDefault` → `Secondary` → `Tertiary`, the thumb's outer ring is `ControlSolidFillColorDefault` + `ControlElevationBorderBrush`, and the inner dot scales at `0.86` / `1.167` / `0.71` (Disabled stops at `1.167`). The focus ring follows this repo's unified Fluent spec (`strokeWidthThick` + `colorCompoundBrandStroke`), which is a different way of landing the same intent as WinUI's two-color `FocusVisualMargin=-7,0` rect.
