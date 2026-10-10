---
title: Tooltip
description: A lightweight overlay that shows supplementary information next to a UI element on hover or keyboard focus, restyling WinUI 3 ToolTip.
nav:
  title: Tooltip
---

# Tooltip

ToolTip provides extra explanation of "what this element does" or "what the user should do": it appears when the pointer hovers over the target element, or when the target element receives keyboard focus (WinUI official description: _A ToolTip shows more information about a UI element… The ToolTip is shown when a user hovers over or presses and holds the UI element._).

The styling, geometry and motion align with the WinUI 3 / Windows App SDK ToolTip (`microsoft-ui-xaml` `winui3/release/2.5.1`; `ToolTip_themeresources.xaml` byte-for-byte identical to the WindowsAppSDK 2.0.1 used by the latest WinUI3 Gallery release v2.9.3):

- **Geometry**: padding `9,6,9,8` (`ToolTipBorderPadding`), max width 320 (`ToolTipMaxWidth`), corner radius 4 (`ControlCornerRadius`), 1px border (`ToolTipBorderThemeThickness`).
- **Colors**: background `AcrylicInAppFillColorDefaultBrush` (in-app Acrylic), foreground `TextFillColorPrimary`, border `SurfaceStrokeColorFlyout`.
- **Typography**: font size 12 (`ToolTipContentThemeFontSize`), line height 16, `TextWrapping=Wrap`.
- **No arrow**: the WinUI ToolTip template has only a single `ContentPresenter`, with no Pointer / arrowhead, so this component does not render an arrow either.

## Basic usage

Wrap any element; `content` corresponds to the WinUI `ToolTipService.ToolTip="text"` usage.

::demo-block{title="Simple ToolTip (aligned with the Gallery example)"}
#preview
:TooltipBasicDemo
#code

```vue
<FluereTooltip content="Simple ToolTip">
  <FluereButton>Button with a simple ToolTip.</FluereButton>
</FluereTooltip>
```

::

## Placement

`placement` corresponds to WinUI's `ToolTip.Placement`, defaulting to `top` (i.e. the `DefaultPlacementMode` of an automatic WinUI ToolTip). When there is insufficient space, the component automatically flips to the opposite placement and pushes the tip back into the viewport (aligned with the "preferred placement → opposite side → edge-snapped push-back" in `ToolTipPositioning::QueryRelativePosition`).

::demo-block{title="Four placements"}
#preview
:TooltipPlacementDemo
#code

```vue
<FluereTooltip content="Placement = Top (default)" placement="top">
  <FluereButton>Top</FluereButton>
</FluereTooltip>
<FluereTooltip content="Placement = Bottom" placement="bottom">…</FluereTooltip>
<FluereTooltip content="Placement = Left" placement="left">…</FluereTooltip>
<FluereTooltip content="Placement = Right" placement="right">…</FluereTooltip>
```

::

## Show delay and "re-show"

WinUI delegates the delay to the process-level `ToolTipService`: first show = `SPI_GETMOUSEHOVERTIME`(400ms) × 2 (mouse / keyboard) or × 1 (touch); when less than `BETWEEN_SHOW_DELAY_MS`(200ms) has elapsed since the last opening, it takes the "re-show" path instead (mouse 1.5×, touch 0). `FluereTooltipProvider` is this service layer: wrap a group of ToolTips and they share the same re-show window.

::demo-block{title="Provider (aligned with ToolTipService) and per-instance delay"}
#preview
:TooltipDelayDemo
#code

```vue
<FluereTooltipProvider :delay-duration="400" :skip-delay-duration="200">
  <FluereTooltip content="Simple ToolTip">
    <FluereButton>Default 400ms</FluereButton>
  </FluereTooltip>
  <FluereTooltip content="Show immediately" :delay-duration="0">…</FluereTooltip>
</FluereTooltipProvider>
```

::

> You can also use it standalone without wrapping `FluereTooltipProvider`: the component carries its own default Provider (400 / 200), though you lose the "multiple ToolTips share a re-show window" feel.

## Content forms and disabled

`content` takes plain text; use the `#content` slot for rich content (icons, shortcuts, multi-paragraph text). `disabled` corresponds to WinUI's `ToolTip.IsEnabled = false` (WinUI sets the Popup's `Opacity` to 0 in that branch; this library expresses it as not expanding).

::demo-block{title="Plain text / long-text wrapping / rich content / disabled"}
#preview
:TooltipContentDemo
#code

```vue
<FluereTooltip content="Simple ToolTip">
  <FluereButton>Plain text (content)</FluereButton>
</FluereTooltip>

<FluereTooltip :content="longText">
  <FluereButton>Long text wraps automatically</FluereButton>
</FluereTooltip>

<FluereTooltip>
  <FluereButton>Rich content (#content)</FluereButton>
  <template #content>
    <span><strong>Save</strong> Ctrl + S</span>
  </template>
</FluereTooltip>
```

::

::demo-block{title="disabled"}
#preview
:TooltipDisabledDemo
#code

```vue
<FluereTooltip content="This won't show" disabled>
  <FluereButton>disabled</FluereButton>
</FluereTooltip>
```

::

## Controlled open

`v-model:open` corresponds to `ToolTip.IsOpen`; combined with `delay-duration` it can implement guides like "explain elsewhere after clicking a button".

```vue
<FluereTooltip v-model:open="open" content="Controlled tooltip">
  <FluereButton @click="open = !open">Toggle</FluereButton>
</FluereTooltip>
```

## API

| Props           | Type                                     | Default     | Description                                                                                                 |
| --------------- | ---------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------- |
| `content`       | `string`                                 | `—`         | Tooltip text; aligned with the `ToolTipService.ToolTip="text"` usage                                        |
| `open`          | `boolean`                                | `undefined` | Controlled open state (`v-model:open`); aligned with `ToolTip.IsOpen`                                       |
| `placement`     | `'top' \| 'bottom' \| 'left' \| 'right'` | `'top'`     | Placement; aligned with `ToolTip.Placement` (default is `DefaultPlacementMode`)                             |
| `sideOffset`    | `number`                                 | `4`         | Gap along the placement direction (px); aligned with `HorizontalOffset` / `VerticalOffset`                  |
| `align`         | `'start' \| 'center' \| 'end'`           | `'center'`  | Alignment perpendicular to the placement direction (WinUI side is always centered + edge-snapped push-back) |
| `delayDuration` | `number`                                 | `—`         | First-show delay (ms); defaults to inheriting the Provider (400 without a Provider)                         |
| `disabled`      | `boolean`                                | `false`     | Do not expand; aligned with `ToolTip.IsEnabled = false`                                                     |
| `label`         | `string`                                 | `—`         | Accessible name of the tip surface; defaults to the content text                                            |

| Events (Emits) | Payload   | Description                                                        |
| -------------- | --------- | ------------------------------------------------------------------ |
| `update:open`  | `boolean` | Update for `v-model:open`; aligned with `IsOpen` being overwritten |

| Slots     | Description                                                                                           |
| --------- | ----------------------------------------------------------------------------------------------------- |
| `default` | Trigger element (any focusable element; reka clones it and adds `aria-describedby`)                   |
| `content` | Tooltip content; corresponds to WinUI's `ToolTip.Content` / `ContentTemplate` (used for rich content) |

### `FluereTooltipProvider`

| Props               | Type     | Default | Description                                                                              |
| ------------------- | -------- | ------- | ---------------------------------------------------------------------------------------- |
| `delayDuration`     | `number` | `400`   | First-show delay; aligned with `ToolTipService.InitialShowDelay`'s default (400ms × 2)   |
| `skipDelayDuration` | `number` | `200`   | Re-show window; aligned with `ToolTipService.BetweenShowDelay` (`BETWEEN_SHOW_DELAY_MS`) |

> **Accessibility**: the trigger element gets `aria-describedby` attached automatically by reka, pointing to a hidden `role="tooltip"` element inside the tip surface — consistent with how WinUI associates the ToolTip with the target element (screen readers announce the supplementary description on focus). The tip surface itself is `pointer-events: none` (aligned with `ToolTip.IsHitTestVisible = false`) and contains no focusable elements (aligned with `IsTabStop = false`), so it does not steal the tab order.
>
> **Implementation notes**
>
> - **The background is a B-tier approximation of Acrylic**: `AcrylicInAppFillColorDefaultBrush` is an `AcrylicBrush` (Light `TintColor #FCFCFC` / `TintOpacity 0` / `FallbackColor #F9F9F9` / `TintLuminosityOpacity 0.85`; Dark `#2C2C2C` / `0.15` / `#2C2C2C` / `0.96`). Fluent 2 Web's token table has no "in-app Acrylic" tier, so this library maps it to `colorNeutralCardBackground` (`#fafafa` / `#333333`): Dark's TintColor matches its Dark value, and Light's FallbackColor `#F9F9F9` differs from `#fafafa` by only 1 gray step (the reference image measures the tip surface as `#F9F9F9`). If you need strict alignment with the real control, override the local variable:
>
>   ```css
>   .my-app {
>     --fui-tooltip-background: #f9f9f9;
>   }
>   ```
>
> - **The motion value is the only B-tier value**: WinUI's open / close use `FadeInThemeAnimation` / `FadeOutThemeAnimation` (which only change `LayoutRoot.Opacity`, 0↔1, linear). `ThemeAnimations.cpp` merely delegates to `ThemeGenerator::AddTimelinesForThemeAnimation(TAS_FADEIN / TAS_FADEOUT, …)`, and the duration constant lives in the **non-public** `vsanimation.h` (not findable in the public source tree) ⇒ this library takes the shortest fade-in tier `--durationFaster`(100ms) + `--curveLinear` and turns it into a component local variable, overridable by consumers in one line:
>
>   ```css
>   .fui-tooltip {
>     --fui-tooltip-fade-duration: 167ms;
>   }
>   ```
>
> - **`prefers-reduced-motion` has a fallback appearance**: with the animation off, the tip surface is still a fully visible static form (the `both`-filled final frame `opacity: 1`), leaving no transparent residue.
> - **Z-order**: `z-index: 1100`, above ContentDialog and Combobox dropdowns at 1000, aligning with "ToolTip is always on top".
> - **Touch long-press does not show**: WinUI shows the tip on touch long-press (Touch mode 1× delay); on the Web, reka's triggers only recognize `pointerenter` / `pointermove` (`pointerType === 'touch'` is explicitly skipped) and `focus`, so on touch it only shows after "tap then focus", and long-press does not show (the native touch tooltip is still available). Known difference.
> - **The 5s auto-hide of `SPI_GETMESSAGEDURATION` is not implemented**: WinUI moves the ToolTip away from under the mouse and closes it after 5s; on the Web, forcibly hiding by time causes flicker when "the mouse is still over the control", so this library only does "close on leave / blur".
> - **`PlacementMode.Mouse` mouse-following is not implemented**: the default is `top` (the default placement of an automatic WinUI ToolTip); consumers who want pointer-following can listen to `pointermove` themselves and pass `placement` / `sideOffset`.
> - **Known gaps**: high-contrast themes are not implemented (under WinUI HC the foreground / border use `SystemColorWindowTextColorBrush` and the background uses `SystemColorWindowColor`); the remaining supporting `ToolTipService` properties (`ShowDuration` / `KeyboardAcceleratorToolTip` / the equivalent of `PlacementTarget`) are not exposed in this release.
