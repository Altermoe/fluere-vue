---
title: Progress Bar
description: Linear progress indicator: indeterminate (slider loop) and determinate (proportional fill) forms, styling reproduced from the WinUI 3 ProgressBar.
nav:
  title: Progress Bar
---

# Progress Bar

Progress Bar uses a 3px-high thin line to indicate an operation that "is in progress but cannot be quantified" (indeterminate state: two sliders loop), or to show the completion ratio of a "known total" (determinate state: fills proportionally from left to right).

The styling aligns with the ProgressBar of WinUI 3 / Windows App SDK (`microsoft-ui-xaml` `winui3/release/2.5.1`, verified byte-for-byte identical to the WindowsAppSDK 2.0.1 source used by the latest WinUI3 Gallery release v2.9.3):

- **Geometry**: control height 3 (`ProgressBarMinHeight`), corner radius 1.5 (`ProgressBarCornerRadius`); track height **1** (`ProgressBarTrackHeight`), corner radius 0.5 (`ProgressBarTrackCornerRadius`) and vertically centered — so the "groove" looks thinner than the indicator bar.
- **Colors**: fill `AccentFillColorDefaultBrush`; track `ControlStrongStrokeColorDefault`; paused `SystemFillColorCaution`; error `SystemFillColorCritical`.
- **Animation**: indeterminate state 2s / cycle (slider 1: sweeps from left to right by 0→1.5s then rests; slider 2: starts after 0.75s and reaches the right end at 2s), `RepeatBehavior=Forever`.

::demo-block{title="Indeterminate state (in progress, unquantifiable)"}
#preview
:ProgressIndeterminateDemo
#code

```vue
<FluereProgressBar indeterminate label="正在进行" />
```

::

## Determinate progress

`:indeterminate="false"` (default) is the determinate state: fill width = `(value − min) / (max − min)`, growing from left to right. `min` defaults to 0, `max` defaults to 100, and `value` is automatically clamped into that range; when `max === min`, the fill width is set to 0 following WinUI's branch.

The example below matches WinUI3 Gallery's "A determinate progress bar": progress bar + percentage text + an inline `NumberBox`.

::demo-block{title="Determinate (adjust progress with a NumberBox)"}
#preview
:ProgressDeterminateDemo
#code

```vue
<FluereProgressBar v-model="value" label="确定态进度条示例" style="width: 130px" />
<FluereNumberBox v-model="value" :min="0" :max="100" spin-button-placement-mode="inline" />
```

::

## States: Running / Paused / Error

WinUI expresses the exceptional states with two independent booleans: `showPaused` (`ShowPaused`) and `showError` (`ShowError`); when both are true **error takes precedence** (the evaluation order in `ProgressBar.cpp#UpdateStates`).

- Determinate: only the fill color changes (paused → `SystemFillColorCaution`, error → `SystemFillColorCritical`), transition 167ms.
- Indeterminate: degrades into "a **100%-wide** paused / error indicator bar that slides in from the left and stops at full" (in the `IndeterminatePaused` / `IndeterminateError` states WinUI sets the second slider's width to full and its offset to 0), while the track is hidden.

::demo-block{title="The three indeterminate progress states (aligned with Gallery's Progress state option)"}
#preview
:ProgressStatesDemo
#code

```vue
<FluereProgressBar
  indeterminate
  :show-paused="state === 'paused'"
  :show-error="state === 'error'"
/>
```

::

::demo-block{title="Determinate paused / error fill colors"}
#preview
:ProgressStatusColorDemo
#code

```vue
<FluereProgressBar v-model="value" />
<FluereProgressBar v-model="value" show-paused />
<FluereProgressBar v-model="value" show-error />
```

::

## Track color (Background)

`background-color` maps to WinUI `ProgressBar.Background` (default `ControlStrongStrokeColorDefault`). In WinUI this value is **semi-transparent** — 45% black (Light) / 54.5% white (Dark) — and the Fluent 2 Web token table has no same-value entry, so this library defaults to the semantically nearest `colorNeutralStrokeAccessible`; to strictly match the real-machine look, pass an equivalent semi-transparent color via `background-color`.

::demo-block{title="Default track color vs WinUI's original value (45% black)"}
#preview
:ProgressBackgroundDemo
#code

```vue
<FluereProgressBar v-model="value" />
<FluereProgressBar v-model="value" background-color="rgba(0, 0, 0, 0.45)" />
```

::

## Disabled

When `disabled`, the foreground degrades to the `…Disabled` slot (a library convention: the WinUI ProgressBar template has no Disabled visual state, because the control does not accept interaction to begin with).

::demo-block{title="Disabled state"}
#preview
:ProgressDisabledDemo
#code

```vue
<FluereProgressBar v-model="value" disabled />
<FluereProgressBar indeterminate disabled />
```

::

## API

| Prop (Props)      | Type      | Default | Description                                                                                                |
| ----------------- | --------- | ------- | ---------------------------------------------------------------------------------------------------------- |
| `modelValue`      | `number`  | `0`     | Current progress value (effective in determinate state, `v-model`); aligned with WinUI `RangeBase.Value`   |
| `min`             | `number`  | `0`     | Minimum value; aligned with WinUI `RangeBase.Minimum`                                                      |
| `max`             | `number`  | `100`   | Maximum value; aligned with WinUI `RangeBase.Maximum`                                                      |
| `indeterminate`   | `boolean` | `false` | Indeterminate state; aligned with WinUI `IsIndeterminate`                                                  |
| `showError`       | `boolean` | `false` | Error state (fill `SystemFillColorCritical`); aligned with WinUI `ShowError`, takes precedence over paused |
| `showPaused`      | `boolean` | `false` | Paused state (fill `SystemFillColorCaution`); aligned with WinUI `ShowPaused`                              |
| `backgroundColor` | `string`  | `—`     | Track color (any CSS color); aligned with WinUI `ProgressBar.Background`                                   |
| `disabled`        | `boolean` | `false` | Disabled (foreground degrades to the …Disabled slot, library convention)                                   |
| `label`           | `string`  | `—`     | Accessible name (`aria-label`)                                                                             |

> **Accessibility**: the determinate state renders `role="progressbar"` + `aria-valuemin/valuemax/aria-valuenow` + a percentage `aria-valuetext`; the indeterminate state **does not expose RangeValue semantics** (aligned with `ProgressBarAutomationPeer.GetPatternCore` returning `nullptr` when `IsIndeterminate`). WinUI prepends a localized status prefix to the accessible name in Error / Paused / Indeterminate (`SR_ProgressBarErrorStatus` etc.); this library currently has no built-in copy channel in the component (i18n belongs to 0.3.0 goal 1.4), so reflect it in `label` yourself when needed.
>
> **Implementation notes**
>
> - The semantic foundation reuses reka-ui's `ProgressRoot` (`role` / `data-state`), but its value domain is fixed to `0..max` and it does not allow a negative `min`, so a **normalized** domain is passed to it, and `aria-valuemin/max/now` are explicitly overridden by the component according to WinUI's original domain.
> - The displacements of the two indeterminate sliders all come from `ProgressBarTemplateSettings`: with `W` as the control width, `w₁ = 0.4W`, `w₂ = 0.6W`; slider 1 moves `−w₁ → 3w₁` (i.e. `−100% → 300%` of its own width, finishing in 1.5s and held until 2s); slider 2 moves `−1.5w₂ → 1.66w₂` (`−150% → 166%`, starting at 0.75s, arriving at 2s). The XAML keyframe easing is `KeySpline="0.4,0,0.6,1"` (standard ease-in-out); the Fluent token table has no same-value entry, so the semantically nearest `--curveEasyEase` (`0.33,0,0.67,1`) is used: a 7-point frozen-frame sample measured a max deviation of **5.64px / 246.5px travel ≈ 2.3%**, affecting only the tween curve — the start and end positions match WinUI exactly.
> - The determinate fill is a **pixel width** (WinUI sets `Width` directly); this library expresses it equivalently as a percentage; the tween on value changes goes through the `Updating → Determinate` `RepositionThemeAnimation` in WinUI (no explicit Duration, and the default duration is not inside the `microsoft-ui-xaml` snapshot, so no A-grade evidence is available); this library expresses the same intent with a `width` transition (`durationNormal` + `curveEasyEase`).
> - The paused / error color change is an explicit `ColorAnimation Duration="0:0:0.167"` in the XAML; this library uses `--durationFast` following the repo's uniform approximation of 167ms.
> - The animation honors `prefers-reduced-motion`: when disabled, the indeterminate state leaves "a 40%-wide static indicator bar resting at the left end", and paused / error rest at the full final state; a blank bar never appears.
