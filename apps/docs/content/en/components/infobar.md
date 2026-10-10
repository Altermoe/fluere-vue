---
title: Info Bar
description: Application-level status banner with four Severity tiers, closable, optionally carrying action buttons; styling and typography restyle WinUI 3 InfoBar.
nav:
  title: Info Bar
---

# Info Bar

Info Bar tells the user that "the application state has changed" — something to be informed of, acknowledged, or acted upon. By default it stays in the content area until the user closes it, but it does not necessarily disrupt the user's flow (WinUI official description: _use an InfoBar control when a user should be informed of, acknowledge, or take action on a changed application state_).

The styling and typography align with the WinUI 3 / Windows App SDK InfoBar (`microsoft-ui-xaml` `winui3/release/2.5.1`, verified byte-for-byte identical to the WindowsAppSDK 2.0.1 used by the latest WinUI3 Gallery release v2.9.3 in the InfoBar directory):

- **Geometry**: min height 48 (`InfoBarMinHeight`), 1px border (`InfoBarBorderThickness`), corner radius 4 (`ControlCornerRadius`), content left padding 16 (`InfoBarContentRootPadding`).
- **Icon**: 16pt solid circle + inverted glyph (`InfoBarIconFontSize`), right whitespace 14, top/bottom 16 (`InfoBarIconMargin` = `0,16,14,16`).
- **Close button**: 38×38, margin 5, top-aligned, glyph 16 (`InfoBarCloseButtonStyle` / `InfoBarCloseButtonSize` / `InfoBarCloseButtonGlyphSize`).
- **Layout**: it does not use a fixed breakpoint, but decides horizontal / vertical layout live based on the content (see "Implementation notes" below).

## Severity: four levels

`severity` determines the background color, the filled-circle color and the icon glyph, mapping one-to-one to the four WinUI `InfoBarSeverity` tiers:

::demo-block{title="Four Severity tiers (aligned with Gallery example 1)"}
#preview
:InfobarSeverityDemo
#code

```vue
<FluereInfoBar open title="Title" severity="informational" message="…" />
<FluereInfoBar open title="Title" severity="success" message="…" />
<FluereInfoBar open title="Title" severity="warning" message="…" />
<FluereInfoBar open title="Title" severity="error" message="…" />
```

::

## Title / message / action button

`title` and `message` are two independent text slots: side-by-side horizontally, stacked vertically when wrapping. The `#action` slot corresponds to WinUI's `ActionButton` (`ButtonBase`); it can hold either a button or a hyperlink.

::demo-block{title="Long/short messages + Action Button / Hyperlink (aligned with Gallery example 2)"}
#preview
:InfobarMessageDemo
#code

```vue
<FluereInfoBar open title="Title" message="Essential app message…" />

<FluereInfoBar open title="Title" :message="longMessage">
  <template #action>
    <button type="button">Action</button>
  </template>
</FluereInfoBar>
```

::

## Expand / icon / closable toggles

The three toggles `v-model:open` (`IsOpen`), `is-icon-visible` (`IsIconVisible`) and `is-closable` (`IsClosable`) match the options panel of Gallery example 3. Clicking the close button emits `closeButtonClick` → `closing` → `closed` in sequence; setting `closing`'s `args.cancel` to `true` cancels the close (the component rolls `open` back to `true`).

::demo-block{title="Three toggles + event log (aligned with Gallery example 3)"}
#preview
:InfobarOptionsDemo
#code

```vue
<FluereInfoBar
  v-model:open="open"
  title="Title"
  :is-icon-visible="iconVisible"
  :is-closable="closable"
  message="…"
  @closing="onClosing"
  @closed="onClosed"
/>
```

::

::demo-block{title="Confirm before closing (Closing can be cancelled)"}
#preview
:InfobarClosableDemo
#code

```vue
const onClosing = (args) => { if (!confirmed.value) { args.cancel = true // roll back to open return
} }
```

::

## Content area and "no banner content" elevation

`#content` (alias `#default`) corresponds to WinUI's `Content` / `ContentTemplate`, landing on row 2 of the template. When `title` / `message` / `#action` are **all empty**, WinUI elevates the content area to row 0 (the `NoBannerContent` state) — the example below uses a checkbox to compare the two layouts.

::demo-block{title="Content on row 2 vs elevated to row 0"}
#preview
:InfobarContentDemo
#code

```vue
<FluereInfoBar open :title="withBanner ? 'Sync from cloud drive' : ''">
  <template #content>
    <span>Synced 40%</span>
  </template>
</FluereInfoBar>
```

::

## Custom icon (IconSource)

The `#icon` slot corresponds to WinUI's `IconSource`: when provided, it takes the `UserIconVisible` branch and the icon is placed in a 16px equally-proportioned container (aligned with `Viewbox`'s `MaxWidth/MaxHeight = InfoBarIconFontSize`); it is also hidden when `is-icon-visible=false`.

::demo-block{title="Custom icon"}
#preview
:InfobarIconDemo
#code

```vue
<FluereInfoBar open title="Custom icon" message="…">
  <template #icon>
    <FluentIconCloudArrowUp20Regular :size="16" />
  </template>
</FluereInfoBar>
```

::

## API

| Props                | Type                                                   | Default           | Description                                                                                                        |
| -------------------- | ------------------------------------------------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| `open`               | `boolean`                                              | `false`           | Whether expanded (`v-model:open`); aligned with WinUI `IsOpen`                                                     |
| `title`              | `string`                                               | `''`              | Title, 14px / SemiBold; aligned with WinUI `Title`                                                                 |
| `message`            | `string`                                               | `''`              | Message body, 14px / Normal; aligned with WinUI `Message`                                                          |
| `severity`           | `'informational' \| 'success' \| 'warning' \| 'error'` | `'informational'` | Severity; aligned with WinUI `InfoBarSeverity`                                                                     |
| `isIconVisible`      | `boolean`                                              | `true`            | Whether to show the icon column; aligned with WinUI `IsIconVisible`                                                |
| `isClosable`         | `boolean`                                              | `true`            | Whether to show the close button; aligned with WinUI `IsClosable`                                                  |
| `label`              | `string`                                               | `—`               | Accessible name of the root node; aligned with `AutomationProperties.Name`                                         |
| `closeButtonLabel`   | `string`                                               | `—`               | Accessible name of the close button (WinUI takes a resource, English "Close"; this library does not hardcode text) |
| `closeButtonTooltip` | `string`                                               | `—`               | Native tooltip of the close button; aligned with resource `InfoBarCloseButtonTooltip`                              |
| `closeButtonCommand` | `() => void`                                           | `—`               | Close-button click callback; aligned with WinUI `CloseButtonCommand`, executed before `closing`                    |

| Events (Emits)     | Payload              | Description                                                                                   |
| ------------------ | -------------------- | --------------------------------------------------------------------------------------------- |
| `update:open`      | `boolean`            | Update for `v-model:open`; aligned with WinUI `IsOpen` being overwritten                      |
| `opened`           | —                    | Content expanded; aligned with WinUI `Opened`                                                 |
| `closeButtonClick` | —                    | Close button clicked; aligned with WinUI `CloseButtonClick`, before `closing`                 |
| `closing`          | `{ reason, cancel }` | Close requested; set `cancel` to `true` to cancel (rolls back `open`), aligned with `Closing` |
| `closed`           | `{ reason }`         | Closed; `reason` is `'closeButton'` or `'programmatic'`, aligned with `Closed`                |

| Slots        | Description                                                                                                                 |
| ------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `icon`       | Corresponds to WinUI `IconSource`; when provided, replaces the built-in Severity icon                                       |
| `action`     | Corresponds to WinUI `ActionButton`; participates in the horizontal / vertical layout decision (no placeholder when absent) |
| `content`    | Corresponds to WinUI `Content` / `ContentTemplate`; lands on row 2 (elevated when there is no banner content)               |
| `default`    | Alias of `content`                                                                                                          |
| `close-icon` | Replaces the close-button glyph (default `dismiss_16_regular`)                                                              |

> **Accessibility**: the root renders `role="status"` (aligned with `InfoBarAutomationPeer`'s `ControlType=StatusBar`); the icon is a decorative element (`aria-hidden`, aligned with `AccessibilityView=Raw`); the close button is a native `<button>` whose accessible name is supplied by `closeButtonLabel`.
>
> **Implementation notes**
>
> - **The orientation decision is not a fixed breakpoint**, but a line-by-line port of `InfoBarPanel.cpp#MeasureOverride`: `nItems == 1` (only one item) **or** `totalWidth > availableSize.Width` (does not fit when laid out horizontally) **or** `heightOfTallestInHorizontal > InfoBarMinHeight` (an item's text wrapping in horizontal layout makes it taller than the min height) ⇒ vertical layout. The child sizes used for the decision come from a hidden mirror DOM with `visibility: hidden` + `width: max-content` (`aria-hidden`, not participating in layout), so long-text wrapping and container narrowing switch to vertical in real time, rather than guessing a breakpoint via `@container`.
> - **Spacing is orientation-sensitive**: vertical uses `VerticalOrientationMargin` (Title 14 / Message 4 / Action 12, plus the panel's own `0,14,0,18`); horizontal uses `HorizontalOrientationMargin` (Message left 12 / Action left 16, plus each text's `top: 14`). In XAML's `ArrangeOverride` the margins of two adjacent blocks are **added directly** (there is no margin collapsing); this component expresses the same semantics with a single flex container + adjacent-sibling margins.
> - **`Closing` can be cancelled**: consistent with WinUI, `Cancel=true` rolls `IsOpen` back to `true` and no longer emits `Closed`.
> - **Close-button colors**: WinUI redefines the button's background / foreground in `InfoBar.xaml` using the `AppBarButton*` family of resources (rest transparent, hover 5.9% black, pressed 6% black). Fluent 2 Web's token table has no two translucent tiers, so this library takes `colorSubtleBackground` / `…Hover` / `…Pressed` (nearest semantic tier); the difference is recorded in the component comments.
> - **The icon is a "solid monochrome circle + cut-out glyph"**: WinUI uses two 16pt TextBlocks that exactly overlap — `F136` (the circle center) fills with the Severity icon background, and the `F13x` glyph fills with `TextFillColorInverse` (white / black). Fluent System Icons' `*_16_filled` is itself a "solid circle + cut-out glyph" monochrome graphic, so this library fills one icon with the Severity icon color, and the cut-out glyph exposes the InfoBar background; the reference image's icon center measures near-white (`#F0F5FB`), indistinguishable at 16px. Icons are chosen **by their shape**, not their name: Warning uses `error_circle_16_filled` (circle + exclamation), Error uses `dismiss_circle_16_filled` (circle + cross), because `warning_16_filled` is a triangle and `error_circle`'s exclamation is not the real control's Error cross (the four reference icon ink bboxes are all 15×15 perfect circles).
> - **The four background tiers are "nearest semantic" rather than equal values**: Fluent 2 Web has no token equal to `SystemFillColor{Attention,Success,Caution,Critical}Background`; each is chosen by minimizing `max(light ΔE, dark ΔE)` (CIE ΔE76, measured via `temp/pw-infobar.mjs`):
>
>   | Severity      | WinUI original (Light/Dark)       | Our token                       | ΔE (Light/Dark) |
>   | ------------- | --------------------------------- | ------------------------------- | --------------- |
>   | Informational | `#F4F4F4` / `#323232` (composite) | `colorNeutralCardBackground`    | 2.1 / 0.5       |
>   | Success       | `#DFF6DD` / `#393D1B`             | `colorStatusSuccessBackground1` | 10.1 / 18.4     |
>   | Warning       | `#FFF4CE` / `#433519`             | `colorStatusWarningBackground1` | 17.5 / 18.5     |
>   | Error         | `#FDE7E9` / `#442726`             | `colorPaletteRedBackground1`    | 6.8 / 12.8      |
>
>   The reference image's measured values (`#DFF6DD` / `#FFF4CE` / `#FDE7E9` / icon background `#0F7B0F` / `#9D5D00` / `#C42B1C`) are **byte-for-byte identical** to the WinUI source resources, confirming the source readings are correct. If you need strict alignment with the real control's appearance, override the two local variables in the component:
>
>   ```css
>   .my-infobar {
>     --fui-infobar-bg: #dff6dd; /* InfoBarSuccessSeverityBackgroundBrush */
>     --fui-infobar-icon-bg: #0f7b0f; /* InfoBarSuccessSeverityIconBackground */
>   }
>   ```
>
> - **The icon ink is 1px smaller than the real control**: Segoe Fluent Icons' `F136` circle has a 15px ink diameter at 16pt and hugs the em-box left edge; Fluent System Icons' `*_16_filled` circle is `r=7` (**14px**, centered). Measured `iconLeft = +17` (reference +16), `iconD = 14` (reference 15), i.e. the right edge aligns and the left edge recedes by 1px — an icon-font geometry difference, traded for the consistency of the official Web icon set; the remaining structural measures (fill height, close-button center, first-line ink position, corner radii) all deviate ≤ 1px from the reference.
> - **Known gaps**: high-contrast themes are not implemented (under WinUI HC the background is `SystemColorWindowColorBrush`, border 2px, and the icon uses `Highlight` / `HighlightText`); the UIA notifications WinUI sends on open / close (`InfoBarOpenedNotification` / `InfoBarClosedNotification`) are UIA NotificationEvents and are not mapped to ARIA live regions, so this component does not add `aria-live`.
> - **API differences from WinUI**: `IconSource` → `#icon` slot, `ActionButton` → `#action` slot, `Content` / `ContentTemplate` → `#content` slot, `CloseButtonStyle` not exposed (styling fixed inside the component); the close-button text goes through a Prop (this library has no built-in text channel yet; i18n is target 1.4 of 0.3.0).
