---
title: Progress Ring
description: Circular progress indicator with two forms — indeterminate (rotating) and determinate (arc length) — restyling WinUI 3 ProgressRing.
nav:
  title: Progress Ring
---

# Progress Ring

Progress Ring indicates an operation that is underway but cannot yet be quantified (the indeterminate "spinner" state), or displays progress that can already be quantified (the determinate arc length).

The styling aligns with the WinUI 3 / Windows App SDK ProgressRing (`microsoft-ui-xaml` `winui3/release/2.5.1`, verified byte-for-byte identical to the WindowsAppSDK 2.0.1 sources used by the latest WinUI3 Gallery release v2.9.3): ring geometry (r≈14 / 32px control, stroke≈3, round line caps), brand foreground color, optional track color; the indeterminate state is a **solid round-tipped arc** cycling over 2s — the arc first grows from a dot (up to half the circumference), then the tail catches up to the head and the arc shrinks back into a dot, repeating endlessly; the component is a purely decorative indicator (`pointer-events: none`, out of the tab order, SVG hidden from screen readers).

::demo-block{title="Basic usage (indeterminate spinner)"}
#preview
:ProgressRingBasicDemo
#code

```vue
<FluereProgressRing label="Loading" />
```

::

## Sizes

Default 32×32 (aligned with the WinUI default size). Also provides `small=16` (aligned with WinUI MinWidth/MinHeight) and `large=48`; the ring scales vectorally via the viewBox, and the stroke scales proportionally with the size.

::demo-block{title="Three sizes"}
#preview
:ProgressRingSizeDemo
#code

```vue
<FluereProgressRing size="small" />
<FluereProgressRing />
<FluereProgressRing size="large" />
```

::

## Determinate progress

`:indeterminate="false"` enters the determinate state: the arc grows clockwise from the top (12 o'clock) to `(value − min) / (max − min)`, with the arc length transitioning smoothly as value changes. `min` defaults to 0, `max` defaults to 100.

::demo-block{title="Determinate (drag the slider to change progress)"}
#preview
:ProgressRingDeterminateDemo
#code

```vue
<FluereProgressRing :model-value="40" :indeterminate="false" label="Download progress" />
```

::

## Track (BackgroundColor)

Passing any CSS color to `background-color` draws a track beneath the ring, aligned with WinUI `ProgressRing.Background` (the "Background color" option in WinUI3 Gallery, which in Lottie is the full circle that does **not participate in the rotation**). **When omitted, the track is not shown**, consistent with the WinUI default `ControlFillColorTransparentBrush`; both forms (indeterminate / determinate) are supported.

::demo-block{title="Indeterminate and determinate with a track (aligned with WinUI3 Gallery)"}
#preview
:ProgressRingBackgroundDemo
#code

```vue
<FluereProgressRing background-color="var(--colorNeutralStroke1)" />
<FluereProgressRing
  :model-value="20"
  :indeterminate="false"
  background-color="var(--colorNeutralStroke1)"
/>
```

::

## Active / hidden

When `:active="false"`, the whole component becomes transparent and the animation pauses (aligned with WinUI `IsActive=false` → `Opacity=0`), commonly used for "disappear once loading is done" scenarios.

::demo-block{title="IsActive toggle"}
#preview
:ProgressRingActiveDemo
#code

```vue
<FluereProgressRing :active="active" />
```

::

## Disabled

When `disabled`, the foreground color downgrades to the `…Disabled` tier (effective in both indeterminate / determinate forms).

::demo-block{title="Disabled state"}
#preview
:ProgressRingDisabledDemo
#code

```vue
<FluereProgressRing disabled />
<FluereProgressRing disabled :indeterminate="false" :model-value="60" />
```

::

## API

| Props             | Type                             | Default    | Description                                                                                                         |
| ----------------- | -------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------- |
| `indeterminate`   | `boolean`                        | `true`     | Indeterminate (spinner) mode, aligned with WinUI IsIndeterminate                                                    |
| `active`          | `boolean`                        | `true`     | Active; transparent and animation paused when false, aligned with WinUI IsActive                                    |
| `modelValue`      | `number`                         | `0`        | Current progress value (effective in determinate state, `v-model`)                                                  |
| `min`             | `number`                         | `0`        | Minimum value                                                                                                       |
| `max`             | `number`                         | `100`      | Maximum value                                                                                                       |
| `size`            | `'small' \| 'medium' \| 'large'` | `'medium'` | Size: 16 / 32 (WinUI default) / 48                                                                                  |
| `backgroundColor` | `string`                         | `—`        | Track (background ring) color, any CSS color; aligned with WinUI `Background`, transparent with no track by default |
| `disabled`        | `boolean`                        | `false`    | Disabled (foreground downgraded to the …Disabled tier)                                                              |
| `label`           | `string`                         | `—`        | Accessible name (`aria-label`); whether to annotate is decided by the consumer for purely decorative scenarios      |

> Implementation notes: the indeterminate state is a solid round-tipped arc (`RoundLineCap`, no gradient), 2s per cycle: arc length 0 → half-circumference → 0, with the start and end points corresponding respectively to Lottie's `TrimStart / TrimEnd` segmented linear keyframes and a visible rotation of 900°/cycle (Lottie `RotationAngleInDegrees`, whose `cubic-bezier(.167,.167,.833,.833)` easing is identically linear); when the arc length is 0, the two round caps merge into a "diameter = line width" dot, and the cycle start and end coincide modulo 360°, looping seamlessly.
>
> Rotation and arc length are driven by the **same** `@keyframes`, and each property is "visually equivalent" at the cycle boundary (rotation jumps 2 full turns, `stroke-dashoffset` jumps 1 full turn while the arc length is 0 at that moment). This is a deliberate design: Lottie's rotation jump (900° ≡ 180°) and the dash's half-turn jump must flip pages at the same time to cancel each other out — if split into two animations ("parent rotates + child dash"), a high load could page one animation but not the other, flipping the whole ring 180° in one frame (manifesting as "a small dot flashing at the bottom when the arc is near the top").
>
> The determinate arc length transitions via `stroke-dashoffset`. Animation duration / easing come from the Fluent `duration*`, `curve*` tokens and honor `prefers-reduced-motion` (stopping the animation at the half-ring when reduced).
