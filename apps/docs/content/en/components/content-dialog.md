---
title: Content Dialog
description: A modal dialog: title + body + primary/secondary/close buttons, with the mask layer and dialog enter/exit easing aligned to WinUI 3 frame by frame.
nav:
  title: Content Dialog
---

# Content Dialog

Content Dialog is used to request confirmation or additional information from the user before continuing (official WinUI description: _use a content dialog to prompt the user to confirm an action or provide additional information_). It is a **modal** overlay: the mask swallows pointer input behind it, focus is trapped inside the dialog, and only `Esc` or a button can dismiss it.

The geometry, state machine and animations align with the ContentDialog of WinUI 3 / Windows App SDK (`microsoft-ui-xaml` `winui3/release/2.5.1`, verified to match the WindowsAppSDK 2.0.1 used by the latest WinUI3 Gallery release v2.9.3 on the target files):

- **Geometry**: `MinWidth` 320 / `MaxWidth` 548 / `MinHeight` 184 / `MaxHeight` 756, corner radius 8 (`OverlayCornerRadius`), stroke 1, padding 24, title-bottom spacing 12, button spacing 8.
- **Anatomy**: full-screen content layer (`LayoutRoot`) → centered surface (`BackgroundElement`: background color + stroke + shadow) → two rows (content `*` / command area `auto`) → content layer (`ContentDialogTopOverlay` background + bottom border) and a 5-column command-area grid.
- **Animation**: enter `scale 1.05 → 1` (250ms, `cubic-bezier(0,0,0,1)`) + `opacity 0 → 1` (83ms, linear); exit `scale 1 → 1.05` (167ms) + `opacity 1 → 0` (83ms); the mask only fades 83ms linear without scaling.

## Basic usage

`v-model:open` controls the open state (aligned with `ShowAsync()` / `Hide()`), and `closed` returns the result via `args.result` (`primary` / `secondary` / `none`, aligned with `ContentDialogResult`).

::demo-block{title="Basic: title + body + primary/secondary buttons (defaultButton = primary)"}
#preview
:ContentDialogBasicDemo
#code

```vue
<script setup lang="ts">
import { FluereButton, FluereContentDialog } from '@fluere-vue/ui'
import { ref } from 'vue'

const open = ref(false)
</script>

<template>
  <FluereButton @click="open = true">Delete draft</FluereButton>
  <FluereContentDialog
    v-model:open="open"
    title="Delete this draft?"
    primary-button-text="Delete"
    secondary-button-text="Cancel"
    default-button="primary"
    @closed="(args) => console.log(args.result)"
  >
    Deleting removes it from both this PC and the cloud, and it cannot be undone.
  </FluereContentDialog>
</template>
```

::

## Eight button combinations

The command-area state is derived purely from "whether each of the three button texts is empty" (aligned with the eight `ButtonsVisibilityStates` branches of `ChangeVisualState`):

| State (`data-buttons`)              | Trigger condition               | Button placement                                                                               |
| ----------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------- |
| `all`                               | all three texts present         | three columns each take 1/3, column spacing 8 + 8 (`FirstSpacer` = 8, `SecondaryColumn` = `*`) |
| `primary-secondary`                 | primary + secondary             | primary on column 1, secondary on column 5, each half width                                    |
| `primary-close` / `secondary-close` | primary+close / secondary+close | the first button on column 1, the close button on column 5                                     |
| `primary` / `secondary`             | only primary / only secondary   | that button moves to column 5 (right half width)                                               |
| `close`                             | only the close button           | close button on column 5                                                                       |
| `none`                              | all empty                       | the command area collapses entirely (`CommandSpace.Visibility = Collapsed`)                    |

::demo-block{title="Cycle through the eight combinations"}
#preview
:ContentDialogButtonsDemo
#code

```vue
<FluereContentDialog
  v-model:open="open"
  title="Command area button combinations"
  :primary-button-text="active.primary"
  :secondary-button-text="active.secondary"
  :close-button-text="active.close"
/>
```

::

## Default button and Enter

`default-button` decides which button gets the accent style (corresponds to `DefaultButton` + `AccentButtonStyle`). The focus rules match WinUI verbatim: when **focus is not in the command area** (or lands exactly on that button) the accent state is kept; when focus moves to another button in the command area, the accent state disappears (the `NoDefaultButton` branch). Pressing Enter activates the button pointed to by `default-button`, not the currently accented one.

::demo-block{title="Four DefaultButton values + Enter behavior"}
#preview
:ContentDialogDefaultButtonDemo
#code

```vue
<FluereContentDialog
  v-model:open="open"
  title="Default button and Enter"
  primary-button-text="OK"
  secondary-button-text="Cancel"
  close-button-text="Close"
  default-button="primary"
/>
```

::

## Cancel close (Closing's Cancel)

Setting `closing`'s `args.cancel = true` cancels the close: the dialog stays in place and no exit animation plays; the three buttons' click events (`primaryButtonClick` / `secondaryButtonClick` / `closeButtonClick`) can likewise use `args.cancel` to prevent the following close.

::demo-block{title="Confirm before closing (closing.cancel)"}
#preview
:ContentDialogCancelDemo
#code

```vue
<script setup lang="ts">
const onClosing = (args) => {
  if (needConfirm.value) {
    args.cancel = true // block it the first time
    needConfirm.value = false
  }
}
</script>

<template>
  <FluereContentDialog
    v-model:open="open"
    title="Discard unsaved changes?"
    @closing="onClosing"
  />
</template>
```

::

## Full size and long content

`full-size-desired` maps to `FullSizeDesired` → `FullDialogSizing` (only changes the surface's vertical alignment to Stretch; horizontal stays centered); when content exceeds the height, the content area scrolls internally while the command area stays fixed at the bottom. WinUI's `ContentScrollViewer` sets `VerticalScrollBarVisibility` to Disabled, so the **scrollbar is invisible** yet the content still scrolls.

::demo-block{title="FullSizeDesired: fill vertically (max 756)"}
#preview
:ContentDialogFullSizeDemo
#code

```vue
<FluereContentDialog v-model:open="open" title="Full-size dialog" full-size-desired />
```

::

::demo-block{title="Long content + no buttons: content area scrolls, Esc closes"}
#preview
:ContentDialogLongContentDemo
#code

```vue
<!-- giving none of the three button texts ⇒ data-buttons="none", command area collapsed -->
<FluereContentDialog v-model:open="open" title="Terms of service summary (no buttons)">
  <p v-for="index in paragraphs" :key="index">Paragraph {{ index }}…</p>
</FluereContentDialog>
```

::

## API

| Prop (Props)               | Type                                            | Default  | Description                                                                         |
| -------------------------- | ----------------------------------------------- | -------- | ----------------------------------------------------------------------------------- |
| `open`                     | `boolean`                                       | `false`  | Whether shown (`v-model:open`); aligned with `ShowAsync()` / `Hide()`               |
| `title`                    | `string`                                        | `''`     | Title, 20px / SemiBold, max 2 lines; aligned with `Title`                           |
| `primaryButtonText`        | `string`                                        | `''`     | Primary button text; empty means not rendered; aligned with `PrimaryButtonText`     |
| `secondaryButtonText`      | `string`                                        | `''`     | Secondary button text; empty means not rendered; aligned with `SecondaryButtonText` |
| `closeButtonText`          | `string`                                        | `''`     | Close button text; empty means not rendered; aligned with `CloseButtonText`         |
| `isPrimaryButtonEnabled`   | `boolean`                                       | `true`   | Whether the primary button is enabled; aligned with `IsPrimaryButtonEnabled`        |
| `isSecondaryButtonEnabled` | `boolean`                                       | `true`   | Whether the secondary button is enabled; aligned with `IsSecondaryButtonEnabled`    |
| `defaultButton`            | `'none' \| 'primary' \| 'secondary' \| 'close'` | `'none'` | Default button (accent style + Enter target); aligned with `DefaultButton`          |
| `fullSizeDesired`          | `boolean`                                       | `false`  | Fill vertically (max 756); aligned with `FullSizeDesired`                           |
| `ariaLabel`                | `string`                                        | `—`      | Accessible name when there is no title; aligned with `AutomationProperties.Name`    |
| `to`                       | `string \| HTMLElement`                         | `'body'` | Portal target (web-side replacement for `XamlRoot`)                                 |

| Event                  | Payload              | Description                                                                    |
| ---------------------- | -------------------- | ------------------------------------------------------------------------------ |
| `update:open`          | `boolean`            | Update for `v-model:open`                                                      |
| `opened`               | —                    | The dialog was opened; aligned with `Opened`                                   |
| `primaryButtonClick`   | `{ cancel }`         | Primary button clicked; `cancel = true` prevents the following close           |
| `secondaryButtonClick` | `{ cancel }`         | Secondary button clicked; same as above                                        |
| `closeButtonClick`     | `{ cancel }`         | Close button clicked; same as above                                            |
| `closing`              | `{ result, cancel }` | Close requested; `cancel = true` cancels the close; aligned with `Closing`     |
| `closed`               | `{ result }`         | Closed; `result` ∈ `'primary' \| 'secondary' \| 'none'`; aligned with `Closed` |

| Slot (Slots) | Description                                                              |
| ------------ | ------------------------------------------------------------------------ |
| `title`      | Corresponds to `Title` / `TitleTemplate`; replaces `title` when provided |
| `default`    | Corresponds to `Content` / `ContentTemplate`                             |

> **Accessibility**: the content layer renders `role="dialog"` + `aria-modal="true"` (aligned with the dialog's `IsDialog` + modal semantics in WinUI), and the accessible name is taken from the title (`ariaLabel` when there is no title); initial focus follows WinUI's three-level priority (first focusable element in the content area → default button → first focusable button in the command area); `Tab` loops inside the dialog, and once closed focus returns to the element focused before opening; the mask is hidden from AT.
>
> **Shared overlay primitive**: the mask is provided by `FluereSmokeLayer` (standalone Teleport + reka `Presence`, 83ms linear fade in/out, body-scroll lock, `aria-hidden`), and the state machine is provided by `useDisclosure` from `@fluere-vue/hooks` (`isOpen` / `isClosing` / `requestClose` / `finishClose` / `cancelClose`, SSR-safe and respects `prefers-reduced-motion`). Future Tooltip / Flyout components reuse the same primitive.
>
> **Implementation notes**
>
> - **The animation is not a single animation**: reka's `Presence` decides the unmount timing from the first `animationend` on the node, while WinUI's scale (250 / 167ms) and fade (83ms) have different durations. So this component puts **the scale on the content-layer root node** (the longest one, which gates the unmount so the exit animation is never cut off), **the opacity on the inner surface** (finishes at 83ms and stays 0, so the scale during the remaining time is invisible), and the mask runs its own 83ms on a separate Teleport layer — isomorphic to WinUI's "two Popups, one Storyboard with multiple targets" structure.
> - **The animation aligns with the source frame by frame**: in `ContentDialogOpenCloseThemeTransition::CreateStoryboardImpl` (`LayoutTransition_partial.cpp`), the Load branch registers `ScaleX/Y` 1.05 → 1.0 (250ms, `TimingFunctionDescription{cp3.X=0}` = cubic-bezier(0,0,0,1)) and `Opacity` 0 → 1 (83ms, linear), and the Unload branch is symmetric (167ms / 83ms); `s_OpenScaleDuration=250` / `s_CloseScaleDuration=167` / `s_OpacityChangeDuration=83` correspond one-to-one with `ControlNormalAnimationDuration` / `ControlFastAnimationDuration` / `ControlFasterAnimationDuration` in `Common_themeresources_any.xaml`. The 250ms and easing both hit tokens (`--durationGentle` / `--curveDecelerateMid`); 167ms / 83ms have no same-value token, so they become component local variables with the source noted.
> - **The mask and the dialog share the same layer**: both have `z-index` 1000, and the painting order is driven by the Teleport mount order (mask first, dialog after) — this lets a further-Teleported overlay inside the dialog (such as a Combobox dropdown, also 1000) stay above the dialog.
> - **Clicking the mask does not close**: the WinUI ContentDialog has no light-dismiss path, so this component likewise `preventDefault()`s `pointer-down-outside` / `interact-outside` / `focus-outside`; only `Esc` and the three buttons can close it.
> - **`Esc` and the close button**: aligned with `ExecuteCloseAction()` — when a clickable close button exists, it is "programmatically clicked" (going through `closeButtonClick` first), otherwise it closes directly with `none`.
> - **Color mapping** (WinUI resource → token): `ContentDialogBackground` ← `SolidBackgroundFillColorBase` → `colorNeutralBackground2` (ΔE 2.3 / 0.6); `ContentDialogTopOverlay` ← the result of compositing `LayerFillColorAlt` underneath → `colorNeutralBackground1` (ΔE 0 / 1.4); `ContentDialogBorderBrush` ← `SurfaceStrokeColorDefault` (composited `#C1C1C1` / `#424242`) → `colorNeutralStroke2` (ΔE 31 / 16); `ContentDialogSeparatorBorderBrush` ← `CardStrokeColorDefault` → `colorNeutralStrokeAlpha`; `ContentDialogSmokeFill` ← `SmokeFillColorDefault` (30% black) → `colorBackgroundOverlay` (40% / 50%). The Fluent 2 Web token table has no equivalent entry; to strictly match the real machine, override the local variables:
>
>   ```css
>   .my-dialog .fui-content-dialog__surface {
>     --fui-content-dialog-surface: #f3f3f3; /* SolidBackgroundFillColorBase */
>     --fui-content-dialog-border: #c1c1c1; /* SurfaceStrokeColorDefault composited value */
>   }
>   ```
>
> - **The shadow is a B-grade approximation**: `PrepareContent` projects the shadow with `ApplyElevationEffect(depth 0, baseElevation 128)`; the source only gives elevation values with no px to convert, so here the Fluent 2 maximum tier `--shadow64` is taken by overlay semantics.
> - **`prefers-reduced-motion`**: the scale and fade are disabled (`animation: none`); the static form is the final state (`scale 1` / `opacity 1`), and close becomes an immediate unmount.
> - **Narrow viewport**: WinUI absolute sizes such as `MinWidth 320` are aligned with the viewport on the web via `min(..., 100%)` (WinUI assumes a desktop window is wide enough), a responsive supplement.
> - **Differences from WinUI**: the cancellation of `ButtonClick` / `Closing` is a **synchronous flag** (no async Deferral); `Enter` is not taken over on button / a / input / textarea / select / summary / contenteditable / `role=button` (WinUI reaches the same effect through the routed event's `Handled`); focus is restored when the exit animation ends (WinUI restores focus when the closing flow starts); Command properties such as `PrimaryButtonCommand` and the three `*ButtonStyle` are not exposed (covered by click events / fixed styles); no hard constraint of "only one Popup per parent" is enforced; high-contrast themes are not implemented (a known gap).
