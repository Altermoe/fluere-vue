---
title: Menu Flyout
description: Command menu flyout with items, submenus, toggle items and separators; keyboard and layering aligned with WinUI 3 MenuFlyout.
nav:
  title: Menu Flyout
---

# Menu Flyout

A menu flyout hosts a group of **commands** (not a list of options — use `FluereSelect` for selection). It mirrors the WinUI 3 `MenuFlyout` family: a `role="menu"` panel opened at an anchor, with icon items, keyboard accelerator text, toggle items and nested submenus. Keyboard support is complete (↑↓ / Home / End / Tab / Enter / Space / ← / → / Esc).

## Basic usage

The default slot is the **trigger element**; menu content goes in the named `#content` slot. Selecting an item emits `select` on the root; by default the menu closes afterwards (`close-on-select="false"` keeps it open).

::demo-block{title="Basic menu"}
#preview
:MenuFlyoutBasicDemo
#code

```vue
<FluereMenuFlyout label="New" @select="onSelect">
  <FluereButton>New ▾</FluereButton>
  <template #content>
    <FluereMenuFlyoutItem text="Folder" :icon="FluentIconFolder24Regular" />
    <FluereMenuFlyoutItem text="Document" :icon="FluentIconDocument24Regular" />
    <FluereMenuFlyoutSeparator />
    <FluereMenuFlyoutItem text="More…" />
  </template>
</FluereMenuFlyout>
```

::

## Submenus

The **default slot** of `FluereMenuFlyoutSubItem` is the submenu content; the row label comes from the `text` prop (or the `#label` slot). The submenu opens on 400 ms hover or `→` / `Enter` / `Space`; `←` / `Esc` inside it closes only that level and returns focus to the sub-item. Submenus register `--zIndexSubmenu`, so a parent menu can never cover them.

::demo-block{title="Nested submenus"}
#preview
:MenuFlyoutSubmenuDemo
#code

```vue
<FluereMenuFlyout label="View">
  <FluereButton>View ▾</FluereButton>
  <template #content>
    <FluereMenuFlyoutItem text="Refresh" />
    <FluereMenuFlyoutSubItem text="Sort by">
      <FluereMenuFlyoutItem text="Name" />
      <FluereMenuFlyoutItem text="Date" />
      <FluereMenuFlyoutSubItem text="More">
        <FluereMenuFlyoutItem text="Size" />
      </FluereMenuFlyoutSubItem>
    </FluereMenuFlyoutSubItem>
  </template>
</FluereMenuFlyout>
```

::

## Toggle / accelerator / disabled

`FluereMenuFlyoutToggleItem` binds its checked state with `v-model:checked` and emits `role="menuitemcheckbox"` + `aria-checked`. `keyboard-accelerator-text` renders at the trailing edge (12px Caption text); `disabled` items are skipped by arrow navigation and cannot be invoked.

::demo-block{title="Toggle and states"}
#preview
:MenuFlyoutToggleDemo
#code

```vue
<FluereMenuFlyoutToggleItem v-model:checked="showHidden" text="Hidden files" />
<FluereMenuFlyoutItem text="Refresh" keyboard-accelerator-text="F5" />
<FluereMenuFlyoutItem text="Properties" disabled />
```

::

## Trigger-less mode: anchor and `showAt()`

`FluereSplitButton` / `FluereDropDownButton` decide **when** to open the flyout themselves. Leave the default slot empty and use the `anchor` prop or the exposed `showAt(element)`; `placement` uses kebab-case WinUI `FlyoutPlacementMode` values (SplitButton's A-level implementation uses `bottom-edge-aligned-left`). On open, focus moves to the first item; on close (select / Esc / outside click) it returns to the element that was focused before opening.

::demo-block{title="Anchor mode (SplitButton consumption)"}
#preview
:MenuFlyoutAnchorDemo
#code

```vue
<span ref="anchor">
  <FluereButton icon-only :icon="FluentIconChevronDown12Regular" aria-label="More new options" @click="openMenu" />
</span>

<FluereMenuFlyout
  ref="menu"
  label="More actions"
  placement="bottom-edge-aligned-left"
  @select="onSelect"
>
  <template #content>
    <FluereMenuFlyoutItem text="Folder" />
    <FluereMenuFlyoutItem text="Document" />
  </template>
</FluereMenuFlyout>
```

```ts
const openMenu = () => menu.value?.showAt(anchor.value)
```

::

## Specification source

| Item       | Value                                                                                                                                                                |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Control    | WinUI 3 `MenuFlyout` / `MenuFlyoutItem` / `MenuFlyoutSubItem` / `ToggleMenuFlyoutItem` / `MenuFlyoutSeparator`                                                       |
| tag/commit | `winui3/release/2.5.1` / `ba3a8d5` (local snapshot `temp/winui-src`)                                                                                                 |
| Key files  | `CommonStyles/MenuFlyout_themeresources.xaml`, `dxaml/lib/MenuFlyout*_Partial.cpp`, `dxaml/lib/CascadingMenuHelper.cpp`, `KeyDownUp/inc/MenuFlyoutKeyPressProcess.h` |
| Defaults   | `dxaml/lib/FlyoutBase_partial.cpp` (placement `Top`, `FlyoutMargin = 4`), `themes/generic.xaml` (MinWidth 96)                                                        |

## Implementation notes

- **Template structure is copied verbatim**: presenter = 1px border + `OverlayCornerRadius` (8) + `MenuFlyoutPresenterThemePadding` 0,2,0,2 + `FlyoutThemeMinWidth` 96 + `MenuFlyoutThemeMinHeight` 32 + vertical scroll; item = `Margin` 4,2,4,2, `Padding` 11,8,11,9, corner radius `ControlCornerRadius` (4); separator = 1px `DividerStrokeColorDefault` with horizontal -4 overhang.
- **Panel-level icon / check placeholders**: `MenuFlyoutPresenter` counts icon items and toggle items. With only icons or only toggles, regular item text is offset by 28 px; with both, by 56 px with icons shifted another 28 px. Every submenu counts its own direct items.
- **State brushes**: PointerOver / Pressed / Disabled = `SubtleFillColorSecondary/Tertiary/Transparent` + `TextFillColorDisabled`; sub-items add `SubMenuOpened` (= Secondary). WinUI uses VisualState setters with no storyboards here, so items do **not** animate their background.
- **Keyboard**: ↑↓ cycle through focusable items (skipping disabled); `Home` / `End` jump to first/last; `Tab` is swallowed (WinUI sets `pbHandled = true` without moving focus); `Enter` / `Space` invoke; `→` / `Enter` / `Space` open a submenu; `←` / `Esc` inside a submenu close only that level; `Esc` at root closes the whole flyout. **Home / End are a 0.6.1 acceptance addition** — WinUI's public keypress handling has no such keys (negative evidence); we follow the WAI-ARIA menu requirement.
- **Layering**: root panel `--zIndexMenu` (1100), submenu `--zIndexSubmenu` (1200), registered in the `useFlyout` layer stack; nested flyouts keep stepping up via `--zIndexStep`.
- **Motion**: `MenuPopupThemeTransition_Partial.h` exposes two constants (opacity 83 ms / open 250 ms); the **keyframe implementation is not in the public source tree** (`CreateStoryboardImpl` `.cpp` is absent from the snapshot), so this implementation approximates it with `scaleY(ClosedRatio)` + opacity: root `ClosedRatio = 0.5`, submenu `0.67`; open 250 ms (`--durationGentle`), close 200 ms (`--durationNormal`, **evidence gap**). All three values are overrideable: `--fui-menu-flyout-open-duration` / `--fui-menu-flyout-close-duration` / `--fui-menu-flyout-closed-scale`; `prefers-reduced-motion` removes the animation and leaves the static panel fully visible.
- **Material**: presenter background approximates the `DesktopAcrylicTransparentBrush` fallback color (`--acrylicBackgroundFillColorDefault`, light `#F9F9F9` / dark `#2C2C2C`); real Acrylic synthesis and noise are deferred to 0.9.2. Border uses repo-token `--surfaceStrokeColorFlyout`.
- **Known differences / gaps**: high contrast is not implemented; the reka base ships character typeahead (WinUI `MenuFlyout` has no prefix matching; it only affects highlight jumps when typing letters); accelerator text always renders when provided (no "hardware keyboard present" probe, unavailable on the web); `SplitMenuFlyoutItem` / `RadioMenuFlyoutItem` are out of scope for 0.6.1.

## API

### `FluereMenuFlyout`

| Prop            | Type                        | Default | Description                                                                   |
| --------------- | --------------------------- | ------- | ----------------------------------------------------------------------------- |
| `open`          | `boolean`                   | —       | Controlled open state (`v-model:open`)                                        |
| `defaultOpen`   | `boolean`                   | `false` | Uncontrolled initial state                                                    |
| `disabled`      | `boolean`                   | `false` | Disables the trigger (controlled `open` still works)                          |
| `anchor`        | `HTMLElement \| null`       | —       | Anchor for trigger-less mode (declarative `FlyoutBase.ShowAt`)                |
| `placement`     | `FluereMenuFlyoutPlacement` | `'top'` | Kebab-case `FlyoutPlacementMode`; SplitButton uses `bottom-edge-aligned-left` |
| `sideOffset`    | `number`                    | `4`     | Distance from the anchor (WinUI `FlyoutMargin = 4`)                           |
| `alignOffset`   | `number`                    | `0`     | Offset along the aligned edge                                                 |
| `label`         | `string`                    | —       | Accessible name of the menu panel                                             |
| `labelledby`    | `string`                    | —       | Accessible name reference (takes precedence over `label`)                     |
| `closeOnSelect` | `boolean`                   | `true`  | Close after an item is selected                                               |
| `dir`           | `'ltr' \| 'rtl'`            | —       | Text direction                                                                |

| Emit          | Payload                           | Description                                     |
| ------------- | --------------------------------- | ----------------------------------------------- |
| `update:open` | `boolean`                         | Controlled write-back                           |
| `opened`      | —                                 | WinUI `MenuFlyout.Opened`                       |
| `closed`      | `FluereMenuFlyoutCloseReason`     | WinUI `MenuFlyout.Closed` plus the close reason |
| `select`      | `FluereMenuFlyoutSelectEventArgs` | An item was selected (including submenu items)  |

| Slot      | Description                                         |
| --------- | --------------------------------------------------- |
| `default` | Trigger element (not rendered in trigger-less mode) |
| `content` | Menu content (items / submenus / separators)        |

| Expose          | Description                                  |
| --------------- | -------------------------------------------- |
| `showAt(el)`    | Open at the given element (SplitButton etc.) |
| `hide()`        | Close                                        |
| `open()`        | Open using the current anchor                |
| `close(reason)` | Close with an explicit reason                |
| `toggle()`      | Toggle open state                            |
| `isOpen`        | Current open state (`ComputedRef<boolean>`)  |

### `FluereMenuFlyoutItem`

| Prop                      | Type        | Default | Description                       |
| ------------------------- | ----------- | ------- | --------------------------------- |
| `text`                    | `string`    | —       | `MenuFlyoutItem.Text`             |
| `icon`                    | `Component` | —       | 16×16 icon                        |
| `keyboardAcceleratorText` | `string`    | —       | `KeyboardAcceleratorTextOverride` |
| `disabled`                | `boolean`   | false   | `IsEnabled`                       |
| `value`                   | `unknown`   | —       | Payload for the root `select`     |

| Emit     | Payload                           | Description      |
| -------- | --------------------------------- | ---------------- |
| `select` | `FluereMenuFlyoutSelectEventArgs` | Item was invoked |

| Slot      | Description                    |
| --------- | ------------------------------ |
| `default` | Custom text (overrides `text`) |
| `icon`    | Custom icon (overrides `icon`) |

### `FluereMenuFlyoutSubItem`

| Prop       | Type        | Default | Description                    |
| ---------- | ----------- | ------- | ------------------------------ |
| `text`     | `string`    | —       | `MenuFlyoutSubItem.Text`       |
| `icon`     | `Component` | —       | 16×16 icon                     |
| `disabled` | `boolean`   | false   | `IsEnabled`                    |
| `label`    | `string`    | —       | Accessible name of the submenu |

| Slot      | Description             |
| --------- | ----------------------- |
| `default` | Submenu content (items) |
| `label`   | Custom row label        |
| `icon`    | Custom icon             |

### `FluereMenuFlyoutToggleItem`

Adds `checked` (`boolean`, `v-model:checked`) and the `update:checked` / `change` emits to the item API; the `checked` field in the `select` payload is the **post-toggle** value.

### `FluereMenuFlyoutSeparator`

No props, slots or emits; renders `role="separator"`.
