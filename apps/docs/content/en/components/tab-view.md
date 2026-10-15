---
title: Tab View
description: A tab container: equal, size-to-content and compact widths, an overflow-scrolling tab strip and closable tabs, with keyboard and focus behaviour aligned to WinUI TabView.
nav:
  title: Tab View
---

# Tab View

`FluereTabView` + `FluereTabViewItem` map to WinUI 3 / Windows App SDK's **`Microsoft.UI.Xaml.Controls.TabView`**: a horizontally scrollable tab strip plus a content area that only shows the selected item, with close buttons, an add button and three width modes. Keys and focus behaviour follow the source item by item.

```vue
<FluereTabView v-model:selected-index="selected" label="Tabs">
  <FluereTabViewItem header="Documents" :is-closable="true">Panel content</FluereTabViewItem>
  <FluereTabViewItem header="Pictures">Panel content</FluereTabViewItem>
</FluereTabView>
```

::demo-block{title="Basic: icon, text and panel"}
#preview
:TabViewBasicDemo
#code

```vue
<FluereTabView v-model:selected-index="selected" label="Example tabs">
  <FluereTabViewItem v-for="tab in tabs" :key="tab.title" :header="tab.title">
    <template #icon><component :is="tab.icon" :size="16" /></template>
    <div class="p-fluent-l">…</div>
  </FluereTabViewItem>
</FluereTabView>
```

::

## Version and evidence baseline

| Item            | Value                                                                                                                                                                                                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec source tag | `winui3/release/2.5.1` (commit `ba3a8d5`)                                                                                                                                                                                                                                             |
| Key files       | `src/controls/dev/TabView/{TabView.xaml,TabView_themeresources.xaml,TabView.idl,TabView.cpp,TabViewItem.cpp,TabViewListView.cpp,TabViewAutomationPeer.cpp,TabViewItemAutomationPeer.cpp}` + `Generated/{TabView,TabViewItem}.properties.cpp` + `Strings/{en-us,zh-CN}/Resources.resw` |
| Built-in text   | Seven strings (close / add / scroll / announcement) copied **verbatim** from the upstream `Resources.resw` (mapping table in `packages/ui/src/tab-view/locale.ts`)                                                                                                                    |

> **`perf2026` is not adopted**: upstream ships `TabView_perf2026.xaml` (wired into `TabView.vcxitems:43`); this library keeps the 0.5.1 `TitleBar` ruling — not read, not referenced, no corresponding branch.
>
> **There is no `TabViewItem.idl`**: the public API of `TabViewItem` / `TabViewItemTemplateSettings` / `TabViewListView` / both automation peers lives entirely in `TabView.idl:203-285`.

## Template and metrics

| Structure          | Content                                                                                                                                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Root               | Two rows: `Auto` (tab strip) / `*` (content)                                                                                                                                                                                               |
| Four strip columns | `Auto MinWidth=2` (`TabStripHeader`) \| `Auto` (strip) \| `Auto` (add button, container `Padding 3,0,0,3`, bottom-aligned) \| `*` (`TabStripFooter`), with a 1 px bottom line under all four                                               |
| Top spacing        | The 8 px above the strip comes from `TabView.Padding = TabViewHeaderPadding(0,8,0,0)` (through `TabListView.Padding` into the `ItemsPresenter`) — **not** a margin                                                                         |
| Tab item columns   | `IconBox(Auto)` \| `ContentPresenter(*)` \| `CloseButton(Auto)`; the `ContentPresenter` has **no margin** in the source, all spacing comes from `TabContainer.Padding`                                                                     |
| Bottom line        | `TabViewBorderBrush` (`CardStrokeColorDefault`, 1 px)                                                                                                                                                                                      |
| Selected indicator | `SelectedBackgroundPath` (8 px top corners, 4 px overhang on both sides, radius-4 **concave** bottom corners) plus two 4×4 arc patches (`Fill=TabViewBorderBrush`); all three are `x:Load="False"` and become `Visible` only when selected |

Metric values come from `TabView_themeresources.xaml:239-269`:

| Quantity                | Value                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| Tab min height          | `32` (`TabViewItemMinHeight`)                                                              |
| Tab min / max width     | `100` / `240` (**only enforced in Equal mode, by code**)                                   |
| Tab padding             | `8,3,4,3` (close button visible) / `8,3,8,3` (collapsed)                                   |
| Header font size / icon | `12` / `16` (icon margin `0,0,10,0`)                                                       |
| Close button            | `32×24`, radius `4`, font size `12`, left margin `4`                                       |
| Add button              | `32×24`, radius `4`, font size `12`, container `3,0,0,3`                                   |
| Scroll buttons          | `32×24`, glyph font size `8`; containers `8,0,3,3` / `3,0,8,3`                             |
| Separator               | `1px`, `Margin 0,8,0,8`                                                                    |
| Border                  | `1`; selected `1,1,1,0` with `Margin -1,0,-1,1`                                            |
| Radii                   | selected background top corners `OverlayCornerRadius`(8), buttons `ControlCornerRadius`(4) |

## Keyboard (item by item)

`TabView` has **no `OnKeyDown`**; it owns three `KeyboardAccelerator`s (scope = this TabView, so they also fire while focus is inside the content) plus a `KeyDown` subscription on the add button. Arrow keys live on `TabViewItem`.

| Key                            | Precondition                          | Effect                                                                                                                 |
| ------------------------------ | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `Ctrl+F4`                      | selected item exists and `IsClosable` | raises `tabCloseRequested` (`source: 'keyboard'`); **never removes the tab**                                           |
| `Ctrl+Tab`                     | —                                     | moves the selection forward, wrapping, skipping disabled tabs (`MoveSelection(true)`)                                  |
| `Ctrl+Shift+Tab`               | —                                     | moves the selection backward (`MoveSelection(false)`)                                                                  |
| `←` / `→` (focus inside strip) | no Alt / Ctrl / Meta                  | walks the focus ring — `tab1 → its close button → tab2 → … → add button → back to tab1`; **does not change selection** |
| `Space` / `Enter`              | focus on a tab                        | selects it (base `TabsTrigger` keys)                                                                                   |

**Keys the source does not implement** (negative evidence, do not invent): `Ctrl+T` / `Ctrl+W` / `Ctrl+1..9` / `Home` / `End` / `Delete` / `Escape`. Those belong to the host app (WinUI Gallery / Terminal bind them themselves).

> Browser caveat: Chrome and Edge reserve `Ctrl+Tab` / `Ctrl+F4` for switching and closing browser tabs, so the page may never see the keydown. The component implements them regardless; usability depends on the host.

## Selection and closing semantics

- **Focus movement does not change selection** (`SingleSelectionFollowsFocus=False`): arrow keys only move focus; `Ctrl+Tab`, clicks, `Space` and `Enter` change selection.
- **The component never removes tabs**: the close button and `Ctrl+F4` only raise `tabCloseRequested` (matching `TabView.TabCloseRequested`; `TabViewItem.CloseRequested` is folded into the same event). Whether to remove — and what to select next — is the consumer's decision.
- **Removing the selected tab migrates the selection** using `TabView::OnItemsChanged`: `start = min(removedIndex, count - 1)`, then scan **forward with wrapping** for the first enabled tab; if the full loop finds none, nothing stays selected. In **controlled** mode the result is reported back through `update:selectedIndex`.
- **Identity following**: with a `:key` (or `value`) on the items, inserting or reordering in front of the selected tab keeps it selected (equivalent to WinUI's `SelectedItem`); without a stable identity the component falls back to index semantics.
- **Focus restoration**: when the focus sat inside the old panel (which gets unmounted), it is moved into the first focusable element of the new panel, falling back to the tab itself — matching `UpdateTabContent`.
- **The add button only raises events** and additionally announces "New tab added." through a polite `aria-live` region (mirroring upstream's UIA `ItemAdded` notification).

::demo-block{title="Closing and adding: the consumer owns the data"}
#preview
:TabViewCloseDemo
#code

```vue
<FluereTabView
  v-model:selected-index="selected"
  label="Closable tabs"
  @tab-close-requested="onCloseRequested"
  @add-tab-button-click="onAddClick"
>
  <FluereTabViewItem v-for="(id, index) in openIds" :key="id" :header="titleOf(id, index)">
    …
  </FluereTabViewItem>
</FluereTabView>
```

::

## Width modes (`tabWidthMode`)

| Value             | WinUI             | Semantics                                                                                               |
| ----------------- | ----------------- | ------------------------------------------------------------------------------------------------------- |
| `equal` (default) | `Equal = 0`       | width = `clamp(available / count, 100, 240)`, measured in code (see the component header)               |
| `size-to-content` | `SizeToContent=1` | width follows content; no item width is assigned                                                        |
| `compact`         | `Compact = 2`     | same as `size-to-content`, but **unselected** tabs collapse to their icon (the selected one stays full) |

::demo-block{title="The three width modes side by side"}
#preview
:TabViewWidthModeDemo
#code

```vue
<FluereTabView :tab-width-mode="mode" :default-selected-index="0" label="Width mode">
  <FluereTabViewItem header="Tab one">…</FluereTabViewItem>
  <FluereTabViewItem header="Tab two">…</FluereTabViewItem>
</FluereTabView>
```

::

## Overflow scrolling

When space runs out the tabs are **squeezed to their floor first, then overflow**: in `equal` mode (the default) each tab is `clamp(available / count, 100, 240)`, so tabs shrink to `TabViewItemMinWidth = 100` before anything overflows; once they really do overflow (`scrollWidth - clientWidth > 0.5`) two scroll buttons appear — 50 px steps, with "backward" disabled at the left edge and "forward" disabled at the right edge (threshold `0.1`), and **holding a button scrolls continuously**: one step on press, then a repeat every `100ms` after a `50ms` delay (matching the upstream `RepeatButton`'s `Delay="50" Interval="100"`, `TabView.xaml:158,165`).

**No scrollbar is drawn while overflowing**: the upstream `TabScrollViewerStyle` template (`TabView.xaml:133-173`) contains **no scrollbar part** — only the `ScrollContentPresenter` plus the two arrow containers. `ScrollViewer.ComputedHorizontalScrollBarVisibility` is bound solely to those two containers' `Visibility` (`:157,163`), i.e. it decides whether the arrows show, nothing else. This library mirrors that: `overflow-x: auto` keeps native scrolling (wheel / Shift + wheel / touch / horizontal wheel deltas) while `scrollbar-width: none` + `::-webkit-scrollbar` **hides the native scrollbar**. The tab height therefore stays `32` and the strip row stays `40` (8 + 32): a classic scrollbar adds ≈ `15px` to that row (measured `40 → 55` in a headful Chromium), inflating the strip and squeezing the content.

Both buttons are `tabindex="-1"` + `aria-hidden="true"` — **out of the tab order and hidden from screen readers**, matching WinUI's `IsTabStop=False` + `AccessibilityView=Raw`. With the scrollbar hidden the mouse has the arrows and the wheel (WinUI's strip has no scrollbar either, so this is alignment rather than a concession).

> Known caveat: inside a `FluereScrollView` (such as this documentation site) vertical wheel input is claimed by the outer scroller under the "nearest scrollable container owns the wheel" rule — with the pointer over the tab strip, Shift + wheel will not scroll the strip (horizontal wheel deltas and trackpad horizontal swipes are unaffected). On a standalone page Shift + wheel scrolls the strip horizontally (verified with a minimal reproduction). That is pre-existing scroll-chain behaviour, not a consequence of hiding the scrollbar.

::demo-block{title="Ten tabs squeezed into 480 px"}
#preview
:TabViewOverflowDemo
#code

```vue
<div class="w-[480px] overflow-hidden">
  <FluereTabView :default-selected-index="0" label="Overflowing tab strip">
    <FluereTabViewItem v-for="title in titles" :key="title" :header="title">…</FluereTabViewItem>
  </FluereTabView>
</div>
```

::

## States and the close button

| State                        | Trigger                                 | Appearance (token)                                                                                                                                     |
| ---------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| rest                         | —                                       | background `--layerOnMicaBaseAltFillColorTransparent` (transparent), text `--colorNeutralForeground2`                                                  |
| hover                        | pointer over (not selected / disabled)  | background `--layerOnMicaBaseAltFillColorSecondary`; the trailing separator hides                                                                      |
| pressed                      | pointer down (not selected / disabled)  | background `--layerOnMicaBaseAltFillColorDefault`, text `--colorNeutralForeground3`                                                                    |
| selected                     | selected                                | background `--solidBackgroundFillColorTertiary`, 8 px top corners, 1 px `--colorNeutralStrokeAlpha` border, text `--colorNeutralForeground1`, SemiBold |
| disabled                     | `disabled`                              | text `--colorNeutralForegroundDisabled`, not clickable, out of the focus ring                                                                          |
| focus                        | keyboard focus                          | the `useFocusVisual` double ring (2 px outer + 1 px inner, equivalent to `FocusVisualMargin = -3`)                                                     |
| close button hover / pressed | pointer over / down on the close button | background `--subtleFillColorSecondary` / `--subtleFillColorTertiary`, text `--colorNeutralForeground1`                                                |
| add button hover / pressed   | pointer over / down                     | same as above                                                                                                                                          |

**Every state switches instantly**: upstream's hover / pressed / selected / disabled are plain `VisualState.Setters` and every `GoToState(..., false)`; the file contains no `EasingFunction` at all. The component therefore writes **no `transition`**.

`closeButtonOverlayMode` has three values: `auto` (default) and `always` take **the same `default:` branch** (always visible); only `on-pointer-over` hides the button until hover or selection. That is the literal source behaviour — do not read `auto` as "smart".

::demo-block{title="Closability, disabled state and on-pointer-over"}
#preview
:TabViewStatesDemo
#code

```vue
<FluereTabView :close-button-overlay-mode="overlayMode" :default-selected-index="0" label="States">
  <FluereTabViewItem header="Closable (selected)">…</FluereTabViewItem>
  <FluereTabViewItem header="Closable (unselected)">…</FluereTabViewItem>
  <FluereTabViewItem header="Not closable" :is-closable="false">…</FluereTabViewItem>
  <FluereTabViewItem header="Disabled" disabled>…</FluereTabViewItem>
</FluereTabView>
```

::

## Differences from WinUI (item by item)

1. **Items are data-only child components**: `FluereTabViewItem` never mounts (the parent reads its props/slots during render), so it cannot emit; `TabViewItem.CloseRequested` is folded into the root `tabCloseRequested`. Item slots **do not receive scope arguments** (`#header="{ … }"` gets nothing).
2. **Items must be direct children of `FluereTabView`** (they may sit inside `v-for` / `<template>` / `v-if`). Wrapping them in an extra element or custom component makes them ignored, with a development warning.
3. **No `TabItemsSource` / `TabItemTemplate` / virtualization**: use `v-for` plus child components on the web.
4. **No `AddTabButtonCommand`**: only `addTabButtonClick`.
5. **The base library renders `disabled="false"`** on the `role="tab"` element: browsers and AT ignore that attribute on non-form elements, so disabled semantics are carried by `aria-disabled` (styles always key off `[data-disabled]`).
6. **Ellipsis instead of hard clipping** for long headers: WinUI's `ContentPresenter` sets no `TextTrimming` (text is clipped mid-glyph); the web side uses `text-overflow: ellipsis`. This is the only deliberate typography difference.
7. **The 4×4 concave corners of the selected background are expressed with a CSS mask**: upstream draws a runtime-generated path plus two arc patches — equivalent geometry, not pixel-identical (see "evidence gaps").
8. **The `TabViewBorderBrush` mapping**: in Light / Default it is an alias to `CardStrokeColorDefault` (a `Color`, not a `Brush`) and the implicit conversion cannot be proven from source; this library treats it as the same value and **reuses the existing mapping** `--colorNeutralStrokeAlpha` (what InfoBar / ContentDialog already do).
9. **Not implemented**: drag reordering, tear-out, middle-click close, `TabStripDragOver` / `TabStripDrop` / `TabDrag*` events, `ItemContainerTransitions` (their durations/keyframes are outside the control directory) and a high-contrast palette (only a `forced-colors` focus-ring fallback).

## API

### `FluereTabView`

| Prop                     | Type                                        | Default   | Notes                                                                                                |
| ------------------------ | ------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------- |
| `selectedIndex`          | `number`                                    | `—`       | `v-model:selected-index`; passing it makes the component controlled                                  |
| `defaultSelectedIndex`   | `number`                                    | `0`       | uncontrolled initial index (matches WinUI's `SelectedIndex` default of `0`)                          |
| `tabWidthMode`           | `'equal' \| 'size-to-content' \| 'compact'` | `'equal'` | `TabWidthMode`                                                                                       |
| `closeButtonOverlayMode` | `'auto' \| 'on-pointer-over' \| 'always'`   | `'auto'`  | `CloseButtonOverlayMode`; `auto` and `always` behave identically                                     |
| `isAddTabButtonVisible`  | `boolean`                                   | `true`    | `IsAddTabButtonVisible`                                                                              |
| `label`                  | `string`                                    | `—`       | accessible name of the tab strip (`aria-label`); upstream's peer has no name fallback, so provide it |
| `dir`                    | `'ltr' \| 'rtl'`                            | `—`       | only affects the arrow-key direction (`FlowDirection`)                                               |
| `motion`                 | `'auto' \| 'none'`                          | `'auto'`  | only gates smooth scrolling of the scroll buttons; `auto` honours `prefers-reduced-motion`           |
| `locale`                 | `string`                                    | `—`       | built-in text locale, takes precedence over `FluereConfigProvider`                                   |

| Event                  | Payload                               | Notes                                                                                    |
| ---------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------- |
| `update:selectedIndex` | `number`                              | selection changes; in controlled mode it also carries a migrated result                  |
| `tabCloseRequested`    | `{ index, header, identity, source }` | close request (`source` is `'close-button'` / `'keyboard'`); the component never mutates |
| `addTabButtonClick`    | `MouseEvent`                          | add button click; the component never adds a tab                                         |

| Slot                                    | Notes                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------- |
| `default`                               | the `FluereTabViewItem` list (direct children)                                  |
| `tab-strip-header` / `tab-strip-footer` | custom content at either end of the strip (`TabStripHeader` / `TabStripFooter`) |
| `add`                                   | icon of the add button (defaults to the `Add` glyph)                            |

### `FluereTabViewItem`

| Prop         | Type               | Default | Notes                                                                               |
| ------------ | ------------------ | ------- | ----------------------------------------------------------------------------------- |
| `header`     | `string`           | `''`    | `Header`; the `#header` slot wins over it                                           |
| `isClosable` | `boolean`          | `true`  | `IsClosable` (not `IsTabClosable`)                                                  |
| `disabled`   | `boolean`          | `false` | `Control.IsEnabled = false`                                                         |
| `ariaLabel`  | `string`           | `—`     | `AutomationProperties.Name`; otherwise AT reads the header text (matching the peer) |
| `value`      | `string \| number` | `—`     | stable identity (same role as `:key`) for selection following                       |

| Slot                  | Notes                                       |
| --------------------- | ------------------------------------------- |
| `default` (`content`) | panel content; unmounted while not selected |
| `header`              | rich header (wins over the `header` text)   |
| `icon`                | icon (16×16 box)                            |

## Browser measurements (reproducible)

Playwright with the system Chrome (1280×900 / DPR 1) against this page: base geometry via `temp/pw-tab-view.mjs` (53 assertions), the overflow scrollbar / hold-to-repeat specifics via `temp/pw-tab-view-overflow.mjs` (21 assertions, **headful required** — overlay-scrollbar environments cannot reproduce that 15 px):

| Quantity                                                              | Measured                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| strip height / tab height                                             | `40` (8 px top spacing + 32 + the inline 1 px bottom line) / `32`                                                                                                                                                                                                                                                                                                                                                                |
| tab padding / header font size                                        | `3px 4px 3px 8px` (close button visible, see below) / `12px`                                                                                                                                                                                                                                                                                                                                                                     |
| equal tab width                                                       | row 718 − left content 2 − add button area 35 − right content 0 = 681 ⇒ `227` (3 tabs); with 7 tabs the available width is shared and the overflowing case falls back to the `100` floor                                                                                                                                                                                                                                         |
| selected                                                              | pseudo-element fill `rgb(249, 249, 249)`, top corners `8px`, insets `-1px -4px 0px -4px`, weight `600`, `border-width: 1px 1px 0px`, `margin: 0px -1px`, `z-index: 1`                                                                                                                                                                                                                                                            |
| unselected hover                                                      | `rgba(0, 0, 0, 0.04)` (token is `rgba(0, 0, 0, 0.039)`, Chrome serializes it to 0.04)                                                                                                                                                                                                                                                                                                                                            |
| focus ring                                                            | on a tab: `outline: 2px solid rgb(0,0,0)` + `outline-offset: 1px` + `box-shadow: rgb(255,255,255) 0 0 0 1px`; the roving item is `tabindex=0`                                                                                                                                                                                                                                                                                    |
| `Ctrl+Tab`                                                            | selection `0 → 1` while focus stays in the strip (selection only, no focus move)                                                                                                                                                                                                                                                                                                                                                 |
| overflow (480 px / 10 tabs)                                           | single tab `100`; both scroll buttons visible with `aria-hidden=true`; the forward button adds `+50` to `scrollLeft`; at the end "forward" is `disabled` while "backward" works; holding "forward" repeats (one step on press, then every `100ms` after `50ms`, stopping itself at the end)                                                                                                                                      |
| no scrollbar while overflowing (headful Chromium, classic scrollbars) | before: `scroller.offsetHeight - clientHeight = 15`, `.fui-tab-view__strip-row` **`55`**, tab still `32`; after hiding the native scrollbar the row is **`40`** with `offsetHeight - clientHeight = 0` and tab `32`, while `scrollWidth (998) > clientWidth (355)` and `scrollBy(50)` / Shift + wheel keep working — method: `chromium.launch({ headless: false })` (overlay-scrollbar environments cannot reproduce that 15 px) |
| width modes                                                           | `size-to-content` is narrower than equal (content driven); `compact` gives unselected headers `display: none` with a `16` px icon box, while the selected tab keeps its text                                                                                                                                                                                                                                                     |
| closability / overlay mode                                            | `isClosable=false` renders no close button; a `disabled` item reports `aria-disabled=true`; with `on-pointer-over` the button is absent until hover                                                                                                                                                                                                                                                                              |
| close chain                                                           | selecting a tab and pressing `Ctrl+F4` makes the consumer remove it (3 → 2) while a selection remains (forward-wrapping migration)                                                                                                                                                                                                                                                                                               |
| panels                                                                | only the selected panel carries content, the rest are `hidden`                                                                                                                                                                                                                                                                                                                                                                   |
| dark                                                                  | selected fill `rgb(40, 40, 40)`, foreground `rgb(255, 255, 255)`, unselected transparent                                                                                                                                                                                                                                                                                                                                         |

> **Two real bugs the browser run caught** (all numeric assertions were green at the time):
> ① kebab-case template props (`:is-closable="false"`) keep the key `is-closable` in the **raw vnode props**, so matching only camelCase treated `false` as "not passed" and the close button still rendered (see `collection.ts#readProp`);
> ② the selected background is a positioned pseudo-element and, by paint order, covered the in-flow icon and text, leaving the selected tab a solid block of colour (content is now lifted to the same layer, guarded by an `elementFromPoint` assertion).

## Implementation notes and evidence gaps

- **Items are collected during render** (`collection.ts`): `provide/inject` registration only receives data after a descendant's `setup()`, which would leave the whole strip missing from SSR output; instead the parent reads the child vnodes' props/slots while rendering (equivalent to React's `cloneElement`), producing the full list in a single pass.
- **Selection resolution is a pure function** (`resolveSelectedIndex`): no reactive writes during render, so SSR and hydration agree; migration results are synced back or emitted from `onUpdated`.
- **Equal widths are measured in code**: upstream's `UpdateTabWidths` does the same. CSS cannot express it — the scroller's width derives from its content, so `flex: 1 1 0` would be circular. Until a measurement exists, CSS falls back to `inline-size: auto` (still clamped by min / max).
- **Evidence gaps**: ① the selected-background path is generated at runtime with `StringCchPrintf` + `XamlReader::Load`, so no literal string exists in the repo to compare against; ② the durations/keyframes of the three `ThemeTransition`s (`AddDeleteThemeTransition` etc.) and the drag theme animations live outside the control directory; ③ high-contrast colours all come from the OS at runtime; ④ the `Color` → `Brush` implicit conversion for `TabViewBorderBrush` is unproven; ⑤ upstream's `TabViewTests.KeyboardTest` is marked `Ignore` (#7546), so `Space`-class semantics are reference only.
