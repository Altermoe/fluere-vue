---
title: App Window
description: A window-chrome container: title-bar slots, drag regions, caption-button event proxying and the content viewport. Position, size and stacking stay outside.
nav:
  title: App Window
---

# App Window

`FluereAppWindow` provides the **chrome of a window**: corner radius, border and shadow, the title bar (icon, title, subtitle, left header, center content, right header, back and pane-toggle buttons), the caption buttons in the top-right corner, and a content area that only owns the **visible region**.

It maps to WinUI 3 / Windows App SDK's **`Microsoft.UI.Xaml.Controls.TitleBar`** (`microsoft-ui-xaml`) — a **composite control** — so the template, states and metrics follow it item by item:

- **12-column template**: `2 | Auto(back) | Auto(pane toggle) | Auto(left header) | 14(left header spacing) | Auto(icon) | Auto(title) | Auto(subtitle) | *(content) | Auto(right header) | 48(min drag region) | Auto(caption area)`.
- **Two heights**: 32 only when `Content` / `LeftHeader` / `RightHeader` are **all empty** (`TitleBarCompactHeight`); otherwise 48 (`TitleBarExpandedHeight`, `TitleBar.cpp#UpdateHeight`).
- **Zero-duration state changes**: the source calls `GoToState(..., false)` and has no `Storyboard` / `VisualTransition` at all, so title-bar internals never animate.
- **Dragging = non-client area plus punched holes**: the whole title bar is non-client, interactive elements become `NonClientRegionKind::Passthrough` holes, and the `Icon` uses its own `Icon` region — it is **not** in the passthrough list, so the icon area stays draggable.

## Version and evidence baseline

| Item               | Value                                                                                                                                                                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Behavior baseline  | tag `winui3/release/2.0.1` (commit `978ab63`) — the `WindowsAppSdkPackageVersion=2.0.1` pinned by WinUI3 Gallery v2.9.3                                                                                                                                      |
| Template / brushes | `winui3/release/2.5.1` (commit `ba3a8d5`) — the directory **drifts** between tags (`TitleBar.cpp` +382 lines, `AutoRefreshDragRegions` / `IsDragRegion` are `MUX_PUBLIC_V11`), but `TitleBar.xaml` and `TitleBar_themeresources.xaml` are **byte-identical** |
| Key files          | `src/controls/dev/TitleBar/{TitleBar.xaml,TitleBar_themeresources.xaml,TitleBar.idl,TitleBar.h,TitleBar.cpp,TitleBarAutomationPeer.cpp}`                                                                                                                     |

> **`perf2026` is not adopted**: `TitleBar_themeresources_perf2026.xaml` (new in 2.5.1) contains two real bugs (a renamed resource key whose reference was not updated, and the pane-toggle `Disabled` state painting the background onto the 16×16 icon instead of the button). This component follows the base file.

## Title bar: six slots and three buttons

| Slot                          | WinUI equivalent    | Notes                                                                                                          |
| ----------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------- |
| `#icon`                       | `IconSource`        | Lives in a 16×16 `Viewbox` (`TitleBarIconMaxWidth/Height`)                                                     |
| `#left-header`                | `LeftHeader`        | Counts towards the 32 → 48 height switch; not a drag region                                                    |
| `#titlebar-content`           | `Content`           | **Title-bar center** (star column, centered by default); `Compact` switches it to left + 16 end margin         |
| `#right-header`               | `RightHeader`       | Right-aligned; not a drag region                                                                               |
| `#titlebar`                   | none (escape hatch) | Replaces the whole title bar; caption buttons are still rendered here (`showCaptionButtons` can turn them off) |
| `#content` (alias `#default`) | none (window body)  | Application content: only the viewport (`overflow: clip`), scrolling belongs to the consumer                   |

Any of the latter four pushes the title bar to 48. When **exactly one** of back / pane-toggle is visible, the left-header spacing drops from 14 to 2 (`NegativeInsetSpacing`).

::demo-block{title="Header slots + back / pane-toggle buttons"}
#preview
:AppWindowHeaderDemo
#code

```vue
<FluereAppWindow
  title="Header slots"
  :is-back-button-visible="true"
  :is-pane-toggle-button-visible="true"
  @back-requested="…"
  @pane-toggle-requested="…"
>
  <template #titlebar-content>
    <FluereInput placeholder="Find a setting" aria-label="Find a setting" class="w-[220px]" />
  </template>
  <template #right-header>
    <FluereButton appearance="subtle" icon-only :icon="FluentIconPerson24Regular" aria-label="Account" />
  </template>
  <template #content>…</template>
</FluereAppWindow>
```

::

Inputs and buttons placed in the title bar are **not drag regions** — pressing them never starts a window drag (the equivalent of WinUI punching that area into the passthrough list).

## Content area: viewport only

The content area is "window height minus title-bar height" with `overflow: clip` and `min-block-size: 0`: it **only defines the visible boundary**; scrolling is up to the consumer (put a `FluereScrollView`, or your own scroller, inside). Sizing is up to the consumer too — the component never writes `position` / `inset` / `transform`.

::demo-block{title="Basic: icon + title + subtitle + content"}
#preview
:AppWindowBasicDemo
#code

```vue
<FluereAppWindow class="h-[300px] w-full max-w-[560px]" title="Settings" subtitle="21RU0000CD">
  <template #icon>
    <FluentIconCloudArrowUp24Regular :size="16" />
  </template>
  <template #content>…</template>
</FluereAppWindow>
```

::

## Caption buttons: pure logic proxying

`FluereCaptionButtons` renders three native `<button>`s (minimize, maximize/restore, close) and **only emits**: `minimize` / `maximize` / `restore` / `close`, plus `v-model:maximized` to hand the "maximize ⇄ restore" intent back. The component itself **never changes any window state** — that is exactly the 0.5.2 "logic proxy" contract.

| Capability flag | Behavior                                                 | Basis                                                                    |
| --------------- | -------------------------------------------------------- | ------------------------------------------------------------------------ |
| `isMinimizable` | false ⇒ button **hidden**                                | No A-level source for the system behavior; recorded as an **assumption** |
| `isMaximizable` | false ⇒ button **hidden**, glyph no longer swaps         | same                                                                     |
| `isClosable`    | false ⇒ button **kept but disabled** (native `disabled`) | same                                                                     |

::demo-block{title="Caption buttons + capability flags + event log"}
#preview
:AppWindowCaptionDemo
#code

```vue
<FluereCaptionButtons
  v-model:maximized="maximized"
  :is-minimizable="isMinimizable"
  :is-maximizable="isMaximizable"
  :is-closable="isClosable"
  @minimize="…"
  @maximize="…"
  @restore="…"
  @close="…"
/>
```

::

### Caption-button evidence gaps

WinUI 3's `TitleBar` **has no caption buttons in its template** (all 12 columns read; no minimize / maximize / close). They are drawn by the system (DWM) and have no XAML implementation in `microsoft-ui-xaml`:

- `CWindowChrome.cpp` only makes the button background fully transparent and maintains the caption-region hit-test rectangles — **no drawing code**; `enum class CaptionButtonState` in `CWindowChrome.h` has no usage anywhere.
- Microsoft's own `specs/TitleBar/titlebar-functional-spec.md:47-48` states "WinUI TitleBar does not handle Caption Buttons … handled by the AppWindow TitleBar".
- The only caption visual in the tree is the legacy system-chrome `x:Key="WindowCaptionButton"` style (`src/dxaml/xcp/dxaml/themes/generic.xaml:15697-15786`, a 40×28 button, a 9×9 stroked `Path`, and the two `WindowStateNormal/Maximized` `Path.Data` strings). This component **only reuses its glyph geometry**.

Everything below is therefore a **system metric**, cross-checked against 1:1 Windows 11 screenshots and exposed as overridable component-local variables:

| Quantity              | Value                                         | Source and verification                                                                                                                                                                               |
| --------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Button width × height | **46 × 32**                                   | `TitleBarRightPaddingWidth` is overridden at runtime by `AppWindowTitleBar.RightInset()` (A-level lead); measured glyph-center pitch **46.0 / 46.0** in the reference screenshot                      |
| Glyph box / stroke    | **10 / 1px**                                  | Measured: minimize = 10×1 bar, maximize = 10×10 stroked square, close = 10×10 cross                                                                                                                   |
| Vertical placement    | **top-aligned**                               | With a 48-high title bar the back-arrow ink center is y≈23.5 (= 48/2) while the caption glyph center is y≈15.5 (= 32/2) ⇒ the buttons occupy only the top 32                                          |
| Hover / pressed fill  | `colorSubtleBackgroundHover` / `…Pressed`     | The same A-level brush family as the title-bar buttons (`SubtleFillColorSecondary/Tertiary`)                                                                                                          |
| Close hover red       | **`#C42B1C`**                                 | WinUI system color `SystemFillColorCritical` (`Common_themeresources_any.xaml:282`), identical to Windows 11; the legacy `#e81123` is **defined but never referenced** and cannot be used as evidence |
| Close pressed red     | `colorStatusDangerBackground3Hover` (#B10E1C) | No source at all; nearest semantic token                                                                                                                                                              |

Override these local variables for a stricter match:

```css
.my-caption-buttons {
  --fui-caption-buttons-button-width: 46px;
  --fui-caption-buttons-glyph-size: 10px;
  --fui-caption-buttons-close-hover: #c42b1c;
  --fui-caption-buttons-close-pressed: #b22b26;
}
```

## Dragging: events only

With `draggable` (default true), pressing the title bar **outside interactive regions** emits:

| Event                 | Payload                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| `dragStart`           | `{ pointerId, clientX, clientY }`                                                                      |
| `dragMove`            | `{ pointerId, clientX, clientY, deltaX, deltaY, totalDeltaX, totalDeltaY }`                            |
| `dragEnd`             | `{ pointerId, clientX, clientY, totalDeltaX, totalDeltaY, canceled }`                                  |
| `titlebarDoubleClick` | `{ clientX, clientY }` (the system behavior is toggling maximize; the component does not change state) |

- **Per-event deltas** (`deltaX/deltaY`) suit incremental updates; **totals** (`totalDeltaX/totalDeltaY`) can be applied straight to the drag origin.
- `Esc` / `pointercancel` / losing pointer capture ⇒ `dragEnd.canceled = true`.
- Pressing inside left header / center / right header / back / pane toggle / caption buttons / any native interactive element, or inside an element carrying `data-fui-app-window-drag-exempt` ⇒ **no drag starts**.
- Title-bar text is **not selectable** while dragging (it is a non-client area in WinUI).
- With `roundToInteger` (default false), `dragMove` / `dragEnd` **totals** round to whole numbers and `delta` is the difference between two consecutive rounded totals — so an outer CSS `translate` stays integer (no sub-pixel blur) with **no accumulated rounding error**.

::demo-block{title="Position owned by the shell (component only emits), carried by translate"}
#preview
:AppWindowDragDemo
#code

```vue
<FluereAppWindow
  class="absolute h-[200px] w-[380px] transition-[translate,border-radius] duration-150"
  :style="{ translate: `${x}px ${y}px` }"
  :maximized="maximized"
  :round-to-integer="true"
  @drag-start="onDragStart"
  @drag-move="onDragMove"
  @titlebar-double-click="maximized = !maximized"
/>
```

::

> **Why `translate` instead of `left` / `top`**: `translate` runs on the compositor and does not trigger reflow / repaint, keeping the drag smooth; with `:round-to-integer="true"` the offset stays a whole number, so there is no blur or jitter from sub-pixel values.

## States and integrated styling

| State                  | Expressed by                                     | Implementation                                                                                                                                                                           |
| ---------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| rest / hover / pressed | back, pane toggle, caption buttons               | `colorSubtleBackground` / `…Hover` / `…Pressed` (`SubtleFillColor*`)                                                                                                                     |
| disabled               | `isBackButtonEnabled=false` / `isClosable=false` | `colorNeutralBackgroundDisabled` + `colorNeutralForegroundDisabled` (`ControlFillColorDisabledBrush` / `TextFillColorDisabledBrush`)                                                     |
| focus                  | Tab onto a button                                | WinUI double-layer focus rectangle: 2px `colorStrokeFocus2` outside, 1px `colorStrokeFocus1` inside                                                                                      |
| inactive               | `active=false`                                   | title / subtitle switch to `colorNeutralForeground3` (`TitleBarDeactivatedForegroundBrush`); icon / left header / center / right header get `Opacity=0.5` (`TitleBarDeactivatedOpacity`) |
| maximized              | `maximized=true`                                 | radius `borderRadiusXLarge` → `borderRadiusNone`, shadow removed, caption glyph switches to "restore"                                                                                    |

::demo-block{title="Inactive / maximized / zero-duration states + focus"}
#preview
:AppWindowStatesDemo
#code

```vue
<FluereAppWindow :active="active" :maximized="maximized" title="Active / inactive" />
<FluereAppWindow
  motion="none"
  title="Zero-duration states + focus"
  :is-back-button-visible="true"
/>
```

::

> **Stacking stays outside**: the component writes **no `z-index`** at all. The window layer is the shell's decision (existing docs tiers: ContentDialog / Combobox popups `1000`, Tooltip `1100`).
>
> **Maximize / minimize animation**: DWM's window open, minimize and maximize animations have **no readable keyframes** (they are not in `microsoft-ui-xaml`), so this library makes no frame-accurate claim. The component only offers controllable hooks: with `motion="auto"` the window frame transitions radius / shadow / background with design tokens (`--durationNormal` + `--curveDecelerateMid`, honoring `prefers-reduced-motion`); geometry animation is up to the shell using the same tokens (see the drag demo above).

## API

### `FluereAppWindow`

| Prop                                             | Type                     | Default  | Mapping / notes                                                                                 |
| ------------------------------------------------ | ------------------------ | -------- | ----------------------------------------------------------------------------------------------- |
| `title`                                          | `string`                 | `''`     | `Title`: 12px / Normal; an empty string collapses the block                                     |
| `subtitle`                                       | `string`                 | `''`     | `Subtitle`: 12px / Normal, weaker foreground than the title                                     |
| `isBackButtonVisible`                            | `boolean`                | `false`  | `IsBackButtonVisible`                                                                           |
| `isBackButtonEnabled`                            | `boolean`                | `true`   | `IsBackButtonEnabled` (really disables the button and removes it from the interactive set)      |
| `isPaneToggleButtonVisible`                      | `boolean`                | `false`  | `IsPaneToggleButtonVisible`                                                                     |
| `showCaptionButtons`                             | `boolean`                | `true`   | Library extension: WinUI draws caption buttons in the system                                    |
| `isMinimizable` / `isMaximizable` / `isClosable` | `boolean`                | `true`   | Forwarded to the caption buttons                                                                |
| `maximized`                                      | `boolean`                | `false`  | `v-model:maximized`; affects radius / shadow / glyph only, never geometry                       |
| `active`                                         | `boolean`                | `true`   | Active state; false renders the deactivated look (WinUI reads `InputActivationListener`)        |
| `draggable`                                      | `boolean`                | `true`   | Whether the title bar drags (only gates the drag events)                                        |
| `roundToInteger`                                 | `boolean`                | `false`  | Round deltas via consecutive rounded totals so a `translate` stays integer (see Dragging above) |
| `label`                                          | `string`                 | `—`      | `AutomationProperties.Name`, falls back to `title` (peer `GetNameCore`)                         |
| `motion`                                         | `'auto' \| 'none'`       | `'auto'` | Component-owned transitions (`auto` honors `prefers-reduced-motion`)                            |
| `labels`                                         | `Partial<CaptionLabels>` | `—`      | Overrides caption-button accessible names                                                       |
| `locale`                                         | `string`                 | `—`      | Built-in copy locale (Back / Toggle Navigation), beats `FluereConfigProvider`                   |

| Emit                                          | Payload                | Notes                                             |
| --------------------------------------------- | ---------------------- | ------------------------------------------------- |
| `backRequested`                               | —                      | Matches WinUI `BackRequested`                     |
| `paneToggleRequested`                         | —                      | Matches WinUI `PaneToggleRequested`               |
| `update:maximized`                            | `boolean`              | Caption maximize / restore intent                 |
| `minimize` / `maximize` / `restore` / `close` | —                      | Caption semantic events (no window state touched) |
| `dragStart` / `dragMove` / `dragEnd`          | see above              | Title-bar dragging (events only)                  |
| `titlebarDoubleClick`                         | `{ clientX, clientY }` | Double click (system behavior: toggle maximize)   |

| Slot                             | Notes                                       |
| -------------------------------- | ------------------------------------------- |
| `icon`                           | `IconSource`; 16×16 box                     |
| `left-header`                    | `LeftHeader`; participates in height        |
| `titlebar-content`               | `Content` (title-bar center)                |
| `right-header`                   | `RightHeader`                               |
| `titlebar`                       | Replaces the whole title bar (escape hatch) |
| `content` / `default`            | Content area (viewport only)                |
| `back-icon` / `pane-toggle-icon` | Replace the back / pane-toggle glyphs       |

### `FluereCaptionButtons`

| Prop            | Type                     | Default | Notes                                      |
| --------------- | ------------------------ | ------- | ------------------------------------------ |
| `maximized`     | `boolean`                | `false` | `v-model:maximized`; drives glyph and name |
| `isMinimizable` | `boolean`                | `true`  | false ⇒ minimize button hidden             |
| `isMaximizable` | `boolean`                | `true`  | false ⇒ maximize / restore button hidden   |
| `isClosable`    | `boolean`                | `true`  | false ⇒ close button kept but disabled     |
| `active`        | `boolean`                | `true`  | false ⇒ dimmed glyph (inactive)            |
| `labels`        | `Partial<CaptionLabels>` | `—`     | Overrides accessible names (beats locale)  |
| `locale`        | `string`                 | `—`     | Built-in copy locale                       |

| Emit                   | Payload   | Notes                               |
| ---------------------- | --------- | ----------------------------------- |
| `update:maximized`     | `boolean` | Toggle intent                       |
| `minimize`             | —         | Minimize intent                     |
| `maximize` / `restore` | —         | Picked from the current `maximized` |
| `close`                | —         | Close intent                        |

| Slot                                                              | Notes                       |
| ----------------------------------------------------------------- | --------------------------- |
| `minimize-icon` / `maximize-icon` / `restore-icon` / `close-icon` | Replace the built-in glyphs |

## Measured in a real browser (reproducible)

Computed styles measured with Playwright + system Chrome (1280×900 / DPR 1) on this very page (the script and screenshots are process artifacts under `temp/`; the conclusions are below):

| Quantity                         | Measured                                                                                                                                             |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Title-bar height                 | `32` (no header slots) / `48` (with header slots)                                                                                                    |
| Window radius / border / content | `8px` / `1px` / `overflow: clip`                                                                                                                     |
| Title / subtitle                 | `font-size: 12px` / foreground `rgb(66, 66, 66)`                                                                                                     |
| Back button                      | `40 × 44`, radius `4px`, left offset `5` (1 border + 2 padding + 2 margin)                                                                           |
| Caption button / area / pitch    | `46 × 32` / `138` / `46`                                                                                                                             |
| Caption glyph                    | `10 × 10`, centered, `stroke-width: 1px`, top-aligned in a 48-high bar (`offsetTop: 0`)                                                              |
| Minimize hover / close hover     | `rgb(245, 245, 245)` / `rgb(196, 43, 28)` (= #C42B1C) + white glyph                                                                                  |
| Focus rectangle                  | `inset 0 0 0 2px rgb(0,0,0), inset 0 0 0 3px rgb(255,255,255)`                                                                                       |
| Inactive title                   | `rgb(97, 97, 97)`                                                                                                                                    |
| Maximized                        | radius `0px`, no shadow, caption glyph `restore`                                                                                                     |
| `motion`                         | `none` ⇒ `transition-duration: 0s`; `auto` ⇒ `border-radius, box-shadow, background-color`                                                           |
| Dragging (real pointer)          | carried by CSS `translate`; a `+60 / +40 px` drag yields `translate: 60px 40px` (integer with `roundToInteger`); `data-dragging=true` while dragging |

## Implementation notes

- **Height logic mirrors `UpdateHeight()`**: only `LeftHeader` / `Content` / `RightHeader` count; `Title` / `Subtitle` do not affect the height tier.
- **Compact folding is "last declared group wins"**: both `TitleTextGroup` and `DisplayModeGroup` write `PART_TitleText.Visibility`, and the latter is declared later ⇒ `Compact` hides title / subtitle and moves the center content from centered to left with a 16 end margin. The criterion is not a breakpoint but "desired width of the center ≥ its available width" (`contentArea.DesiredSize().Width >= contentAreaGrid.ActualWidth()`), with the threshold remembered from the moment folding started; the Web side measures desired width through a hidden mirror (`visibility: hidden` + `aria-hidden` + `inert`).
- **Web equivalent of punching passthrough holes**: `pointerdown` does not start a drag when it lands in `[data-fui-app-window-nodrag]`, a native interactive element, or `[data-fui-app-window-drag-exempt]`. `Esc` cancels; `pointercancel` and lost capture end as `canceled=true`.
- **Back / pane-toggle buttons skip the AnimatedIcon animation for now**: WinUI uses `AnimatedBackVisualSource` / `AnimatedGlobalNavigationButtonVisualSource` (LottieGen output, `c_durationTicks` = 13333333 ≈ 1.3333 s, 48×48 canvas, 12 markers, `Foreground` theme property). This library ships static glyphs for now; the animation lands with 0.5.4 `NavigationView` (the slots are already in place).
- **Known gaps**: high-contrast is not implemented (WinUI HC switches the title bar to `SystemControl*` / `SystemColor*`); the material tokens landed in 0.4.4 (`micaBackgroundFillColorBase` / `acrylicInAppFillColorDefault` / `layerFillColorDefault` and friends — see `sources.materials` in `packages/designs/data/repo-tokens.json`), but **material composition** (gradient + translucent layers + noise) belongs to 0.9.1 / 0.9.2, so the window surface still uses `colorNeutralBackground2` (reusing the existing `SolidBackgroundFillColorBase` mapping) and **no `backdrop-filter`** is written.
- **`Title` never writes `document.title`**: WinUI really renames the window and restores the default title when cleared; the Web side leaves the document title alone (no docs-site or SSR pollution).
