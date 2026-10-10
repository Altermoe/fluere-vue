---
title: Switch
description: A toggle component for switching between two states: on / off.
nav:
  title: Switch
---

# Switch

The toggle switch is used to switch between two mutually exclusive states (on / off), commonly representing whether a feature is enabled. The style reproduces the WinUI 3 / Windows App SDK ToggleSwitch: a self-built track + thumb that fully reproduces the WinUI feel of 「click to toggle / drag the thumb to the end / keyboard toggle / thumb enlarges on hover / thumb widens in place on active (pill shaped)」. Movement only uses `transform`, the easing animation is only enabled while toggling; the thumb only changes size within the rail and inherently cannot leave the track area, and no small backward jump occurs at the moment of toggling either.

## Basic usage

`v-model` binds a boolean. Clicking anywhere on the switch toggles it; dragging the thumb past halfway drops it to the target end, and less than halfway springs it back; the keyboard `Space` / `Enter` toggles, `◀` turns off, and `▶` turns on.

::demo-block{title="Basic usage"}
#preview
:ToggleSwitchBasicDemo
#code

```vue
<FluereToggleSwitch v-model="wifi">Wi-Fi</FluereToggleSwitch>
<FluereToggleSwitch v-model="bluetooth">Bluetooth</FluereToggleSwitch>
```

::

## Sizes

The standard WinUI ToggleSwitch track is 40×20 (`medium`). The web side additionally provides `small` (32×16) and `large` (48×24), keeping a 2:1 ratio; `travel` (thumb travel 16 / 20 / 24) aligns with Fluent `spacing` L / XL / XXL respectively.

::demo-block{title="Three sizes"}
#preview
:ToggleSwitchSizeDemo
#code

```vue
<FluereToggleSwitch size="small">small (32×16)</FluereToggleSwitch>
<FluereToggleSwitch size="medium">medium (40×20, WinUI standard)</FluereToggleSwitch>
<FluereToggleSwitch size="large">large (48×24)</FluereToggleSwitch>
```

::

## Title + switch content

Reproduces the WinUI three-layer structure: `#header` top description row, `#on-content` / `#off-content` cross-fading in the same cell to the right of the track, and the default slot as the row label (also semantically visible text).

::demo-block{title="Title + On/Off content"}
#preview
:ToggleSwitchHeaderContentDemo
#code

```vue
<FluereToggleSwitch v-model="notify">
  <template #header>System notifications</template>
  <template #off-content>Off</template>
  <template #on-content>On</template>
  Receive desktop notifications
</FluereToggleSwitch>
```

::

## Drag interaction

Hold and drag the thumb left or right and it follows the pointer; on release, if it passed the midpoint it lands on the other end, otherwise it springs back to its original state — consistent with WinUI. During a drag only `will-change: transform` is enabled (never resident in the idle state); after releasing, an easing curve smoothly animates the thumb to its end point.

::demo-block{title="Drag to toggle"}
#preview
:ToggleSwitchBasicDemo
#code

```vue
<FluereToggleSwitch v-model="vpn">VPN</FluereToggleSwitch>
```

::

## Disabled

When `disabled`, it is not interactive, and the track, the thumb, and the text all fall to the …Disabled tier.

::demo-block{title="Disabled state"}
#preview
:ToggleSwitchDisabledDemo
#code

```vue
<FluereToggleSwitch disabled>Off (disabled)</FluereToggleSwitch>
<FluereToggleSwitch disabled :model-value="true">On (disabled)</FluereToggleSwitch>
```

::

## Form submission

When inside a `<form>` with `name` passed, a hidden native `<input type="checkbox">` is added, and the enabled result is submitted with the form (`value` is the submitted value, default `"on"`).

::demo-block{title="Form submission"}
#preview
:ToggleSwitchBasicDemo
#code

```vue
<form @submit.prevent>
  <FluereToggleSwitch name="dark-mode" value="yes">Dark mode</FluereToggleSwitch>
</form>
```

::

## API

| Prop         | Type                             | Default    | Description                                             |
| ------------ | -------------------------------- | ---------- | ------------------------------------------------------- |
| `modelValue` | `boolean`                        | `false`    | Whether on (`v-model`)                                  |
| `disabled`   | `boolean`                        | `false`    | Whether disabled                                        |
| `size`       | `'small' \| 'medium' \| 'large'` | `'medium'` | Size (medium aligns with WinUI 40×20)                   |
| `name`       | `string`                         | `—`        | Form submission name, paired with a hidden native input |
| `value`      | `string`                         | `'on'`     | The value submitted when on                             |
| `label`      | `string`                         | `—`        | Accessible name (defaults to content/title text)        |

| Slot          | Description                      |
| ------------- | -------------------------------- |
| `default`     | Row label (semantic name)        |
| `header`      | Top title row (WinUI Header)     |
| `on-content`  | Text shown when on (cross-fade)  |
| `off-content` | Text shown when off (cross-fade) |

> Movement only uses `transform: translateX` (`calc(var(--travel) * progress)`), never touching `left/right`; there is no resident `will-change` in the normal state, enabled only during dragging; the animation duration comes from Fluent `duration*`, the easing from `curveEasyEase(Max)`, and `prefers-reduced-motion` is respected.
