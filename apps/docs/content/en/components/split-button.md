---
title: Split Button
description: A split button whose primary area runs the default action while the arrow opens a flyout; visuals and keys aligned with WinUI SplitButton / ToggleSplitButton.
nav:
  title: Split Button
---

# Split Button

`FluereSplitButton` / `FluereToggleSplitButton` map to WinUI 3's **`Microsoft.UI.Xaml.Controls.SplitButton`** and **`ToggleSplitButton`**: one control with two independently reachable hit areas — the primary area runs the default action, the arrow opens a menu; the toggle variant flips its checked state before running the action. Both share one template, state table and animation (the internal base is `split-button-base.vue`), and the arrow's menu is hosted by `FluereMenuFlyout` from 0.6.1.

```vue
<FluereSplitButton label="New" @click="createDocument" @select="onCommand">
  New
  <template #flyout>
    <FluereMenuFlyoutItem text="Folder" value="folder" />
    <FluereMenuFlyoutItem text="Document" value="document" />
  </template>
</FluereSplitButton>
```

## Basic usage

Clicking the primary area emits `click`; clicking the arrow opens or closes the menu. `#flyout` is a **menu content** slot: put `FluereMenuFlyoutItem` / `FluereMenuFlyoutSubItem` / `FluereMenuFlyoutSeparator` / `FluereMenuFlyoutToggleItem` in it directly — menu semantics (`role=menu` / `menuitem*`), arrow-key navigation, submenus, close-on-select and layering are all handled by the menu family; activating an item bubbles up as the SplitButton's `select` (payload `{ value, text, checked? }`, identical to `FluereMenuFlyout`).

::demo-block{title="New ▾: default action + more options"}
#preview
:SplitButtonBasicDemo
#code

```vue
<FluereSplitButton label="New" @click="createDocument" @select="onCommand">
  New
  <template #flyout>
    <FluereMenuFlyoutItem text="Folder" value="folder" />
    <FluereMenuFlyoutItem text="Document" value="document" />
    <FluereMenuFlyoutItem text="Archive" value="archive" />
  </template>
</FluereSplitButton>
```

::

> The menu panel has built-in "close after selection" (`FluereMenuFlyout`'s `closeOnSelect` defaults to `true`), so items in `#flyout` **do not** need to call `close()` themselves. The slot still provides `close(reason?)` (equivalent to XAML's `Flyout.Hide()`) for custom content that wants to dismiss the menu on its own.

## Toggle variant and disabled state

`FluereToggleSplitButton` corresponds to WinUI `ToggleSplitButton`: clicking the primary area emits `update:checked` → `isCheckedChanged` → `click` in that order (matching the "Toggle then Click" order in `ToggleSplitButton.cpp#OnClickPrimary`); clicking the arrow **does not** change the checked state. `checked` is a controlled prop (same convention as `FluereToggleButton`).

::demo-block{title="Disabled state and toggle variant"}
#preview
:SplitButtonStatesDemo
#code

```vue
<FluereSplitButton disabled label="New">New</FluereSplitButton>
<FluereToggleSplitButton v-model:checked="pinned">Pin to Quick access</FluereToggleSplitButton>
```

::

## Keyboard and accessibility

| Action                      | Behavior                                                                                                                               |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `Tab`                       | primary area → arrow area (two separate buttons; this library splits them per WAI-ARIA APG — see "Intentional differences from WinUI") |
| `Enter` / `Space` (primary) | run the default action (emits `click`)                                                                                                 |
| `Enter` / `Space` (arrow)   | open / close the menu                                                                                                                  |
| `Alt+↓` / `F4`              | open the menu and move focus to the first item (aligned with WinUI `OnSplitButtonKeyUp`)                                               |
| `↓` (arrow)                 | open the menu (APG split-button discoverability addition)                                                                              |
| `↑` / `↓` (in menu)         | move focus between items (cycles, skips disabled; handled by `FluereMenuFlyout`)                                                       |
| `Home` / `End` (in menu)    | jump to the first / last focusable item                                                                                                |
| `Enter` / `Space` (in menu) | activate the current item, emit `select`, then close the menu                                                                          |
| `→` / `←` (submenu)         | open / close only the current submenu level                                                                                            |
| `Tab` (in menu)             | swallowed, focus does not move (aligned with WinUI `MenuFlyoutKeyPressProcess.h`)                                                      |
| `Esc`                       | close the current menu level; once the root menu closes, focus returns to the element that opened it                                   |
| outside click               | close the menu (light dismiss)                                                                                                         |
| holding `Space` / `Enter`   | the whole control enters the pressed state (aligned with WinUI `m_isKeyDown` → `TouchPressed`)                                         |

- Primary accessible name: `label` (required for icon-only primary content), otherwise the default slot text;
- Arrow accessible name: `secondaryLabel`, falling back to the locale slice "更多选项 / More Options" (verbatim from upstream `SplitButtonSecondaryButtonName`), also used as the menu panel's `aria-label`;
- The arrow exposes `aria-haspopup="menu"` (the default; `hasPopup` can override it) and `aria-expanded`. It **does not expose `aria-controls`**: the menu panel is rendered internally by `FluereMenuFlyout` (reka) and has no stable id, and the WAI-ARIA APG split-button / menu-button patterns only require `aria-haspopup` + `aria-expanded`;
- Without a `#flyout`, clicking the arrow and `Alt+↓` / `F4` are **no-ops** (aligned with the `GetFlyout() == null` early-return branch in `SplitButton.cpp#OpenFlyout`);
- While the menu is open, clicking the primary area only performs light dismiss and **does not** emit `click` (equivalent to Popup light dismiss);
- High contrast (HC) theme is not implemented (A-level uses `SystemColor*`).

## Specification sources

| Item       | Value                                                                                                                                                                                                                                                                                                     |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Control    | WinUI 3 `SplitButton` / `ToggleSplitButton` (both derive from `ContentControl`)                                                                                                                                                                                                                           |
| tag/commit | `winui3/release/2.5.1` / `ba3a8d5` (local snapshot `temp/winui-src`)                                                                                                                                                                                                                                      |
| Key files  | `src/controls/dev/SplitButton/{SplitButton.xaml,SplitButton_themeresources.xaml,SplitButton.idl,SplitButton.cpp,ToggleSplitButton.cpp,SplitButtonAutomationPeer.cpp}` + `Strings/{en-us,zh-CN}/Resources.resw` + `src/controls/dev/AnimatedIcon/AnimatedVisuals/AnimatedChevronDownSmallVisualSource.cpp` |
| Menu spec  | This library's `FluereMenuFlyout` (0.6.1): `CommonStyles/MenuFlyout_themeresources.xaml`, `dxaml/lib/MenuFlyout*_Partial.cpp`, `FlyoutBase_partial.cpp` (`FlyoutMargin = 4`); see [Menu Flyout](./menu-flyout) for details                                                                                |

## Implementation notes

- **Template copied layer by layer**: the `RootGrid` has three columns (primary `*` MinWidth 35 / separator 1 / arrow 35), the primary `Padding=11,6,11,7`, the arrow `Padding=0,0,12,0` with a 12×12 chevron, and each half has its own 1px border overlay (`1,1,0,1` + `4,0,0,4` / `0,1,1,1` + `0,4,4,0`). Height is content-driven (6 + 20 line height + 7 = 33px), matching the A-level template (which has no `MinHeight`).
- **State table follows `UpdateVisualStates` order**: `Disabled` (highest) > `FlyoutOpen` / `CheckedFlyoutOpen` > `Checked*` > pointer / keyboard press. The full `ControlFillColor*` / `TextFillColor*` / `ControlStrokeColorDefault` mapping table lives in the component header; values without an equal-value token (`TextOnAccentFillColorSecondary`, `ControlStrokeColorOnAccentTertiary`) fall back to component-local variables (`--fui-split-button-checked-pressed-foreground` / `-checked-divider`, one-line overridable).
- **Chevron animation reproduced frame by frame**: within the 483.3ms timeline of `AnimatedChevronDownSmallVisualSource`, `NormalToPressed` (150.8ms, moves down 1.875px) and `PressedToNormal` (316.7ms, first to −0.75px then back to 0, two easing segments) are implemented as two CSS keyframe animations; `prefers-reduced-motion` disables them and keeps the static chevron.
- **Menu host = built-in `FluereMenuFlyout` (anchor mode)**: the control root is the anchor (equivalent to WinUI `FlyoutBase.ShowAt(*this)`); `placement` is fixed to `bottom-edge-aligned-left` (`FlyoutPlacementMode::BottomEdgeAlignedLeft` in `SplitButton.cpp#OpenFlyout`); the gap to the anchor uses A-level `FlyoutBase::FlyoutMargin = 4`. Panel geometry / brushes / open-close motion (250ms / 200ms) / layering (`--zIndexMenu`) are all owned by the menu family's presenter — this component **no longer** duplicates a `FlyoutPresenter` style (the temporary unscoped panel styles from the first 0.6.4 release have been removed).
- **Close paths and focus**: `Esc` / outside pointerdown / item selection / clicking the arrow again are handled by the menu family. On keyboard close paths (`Esc`, `Enter` on an item) focus returns to the element that opened the menu (normally the arrow). **Pointer light dismiss** follows the reka modal-menu semantics: while open, `body { pointer-events: none }`, so hits on the primary area / arrow / outside resolve to `<html>`; the buttons never receive pointerdown / click, the menu only closes, and focus lands on `body` (see the measurements below and difference 6 under "Intentional differences from WinUI").
- **Controlled semantics**: both `open` (`v-model:open`, passed through to the menu family's controlled state) and the toggle variant's `checked` (`v-model:checked`) support controlled / uncontrolled usage; `open === undefined` means self-managed, otherwise the prop wins.

### Real-browser verification (2026-10-20, re-measured after the MenuFlyout integration)

Method: Chromium at 1440×1000 opens this page; the script `temp/pw-split-button-menu.mjs` reads `getComputedStyle` / `getBoundingClientRect`, covering control states, menu geometry / computed styles / layering, the full keyboard path, the three pointer close paths and both light and dark themes — **94/94 assertions pass** (process screenshots live in `temp/split-button-verify/`, not committed). The expected values are also fixed in the component comments and contract tests.

| Item             | Measured                                                                                                                                                                                                                                                              |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Control geometry | height 33 (6 + 20 line height + 7), arrow 35, separator 1, chevron 12×12, radius 4                                                                                                                                                                                    |
| rest             | background `#ffffff`, foreground `#242424`, arrow foreground `#424242`, border `#d1d1d1` (1px, outside the content box)                                                                                                                                               |
| hover            | both halves `#f5f5f5`; arrow foreground switches to `#242424`                                                                                                                                                                                                         |
| pressed          | both halves `#e0e0e0`, foreground `#424242`; open state arrow foreground `#616161`                                                                                                                                                                                    |
| Menu geometry    | left-aligned with the control's left edge (Δ 0.00px); 4.00px gap from the control's bottom edge; presenter padding 2px 0, radius 8, border 1px                                                                                                                        |
| Menu appearance  | presenter background light `#f9f9f9` / dark `#2c2c2c` (Acrylic FallbackColor approximation); border light `rgba(0,0,0,0.06)` / dark `rgba(0,0,0,0.2)`; shadow not `none`                                                                                              |
| Menu layering    | computed `z-index` = 1100 (matches `:root --zIndexMenu`), teleported to `body`, `role=menu` + the arrow's accessible name                                                                                                                                             |
| Items            | padding 8 / 11 / 9 / 11, margin 2 / 4, radius 4, font size 14 / line height 20; hover background light `#f5f5f5` / dark `#383838`                                                                                                                                     |
| Keyboard         | `Esc` closes and returns focus to the arrow; `F4` / `Alt+↓` open and focus the first item; `↑↓` / `Home` / `End` work; `Tab` does not move; `Enter` selects and closes                                                                                                |
| Pointer          | while open, clicking the primary area / arrow / outside are all light dismiss (the buttons' click handlers never fire; `activeElement = body`); clicking the arrow once while open closes it; clicking the primary area while closed runs the default action as usual |

### Intentional differences from WinUI

1. **Focus / Tab order**: WinUI has a single Tab stop for the entire control (inner buttons have `IsTabStop=False`), so the arrow is reachable only by pointer or `Alt+↓` / `F4`; this library follows APG and makes the primary and arrow two separately tabbable `<button>`s (todo 0.6.4 requires "each reachable"), while keeping every WinUI shortcut. Each button consumes the shared 0.4.3 double focus rectangle (`FocusVisualMargin = -3`; WinUI's `-1` no longer applies to a two-button structure — 0.9.3 will unify).
2. **Menu content scope**: WinUI's `Flyout` can hold any `FlyoutBase`; this library's `#flyout` always goes through `FluereMenuFlyout` (`role=menu`), with semantics and keyboard treated as a menu. Use `FluereContentDialog` instead when a dialog form is needed.
3. **Touch pressed state**: A-level `TouchPressed` shows both halves pressed on touch; in the browser pointer model each half's `:active` gives single-area feedback, and the cross-half touch state is not implemented separately.
4. **Checked + disabled**: A-level `Disabled` takes precedence over `Checked*`, so a checked-and-disabled control shows the neutral disabled fill rather than an accent disabled color; this library follows that.
5. **Where the menu keyboard capabilities come from**: `↑↓` cycling / `Tab` swallowed / `Enter`·`Space` activation / submenu `→`·`←`·`Esc` are aligned with A-level one by one; `Home` / `End` were added in 0.6.1 per WAI-ARIA (WinUI's public keypress handling has no such keys — negative evidence); the reka base also ships character typeahead, whereas WinUI has no prefix matching (recorded in the differences table on the `FluereMenuFlyout` doc page).
6. **Focus target of light dismiss**: the menu is a reka modal menu (`body { pointer-events: none }` while open), so a pointer click on the primary area / arrow / outside only closes the menu and does not hand focus to the clicked element (measured `activeElement = body`). WinUI's Flyout light dismiss also does not activate the underlying control, but its focus target has no A-level evidence; this is recorded as an intentional difference under "do not steal focus".

### Known gaps

- High contrast (HC) theme is not implemented (A-level uses `SystemColor*`);
- The menu material is a solid approximation of the Acrylic FallbackColor; real Acrylic compositing and noise belong to 0.9.2 (see `FluereMenuFlyout`);
- `SplitMenuFlyoutItem` / `RadioMenuFlyoutItem` are outside the 0.6.1 menu family (in WinUI, the SplitButton menu form can be composed from regular `MenuFlyoutItem`s);
- AppBar / CommandBar appearance (`SplitButtonCommandBarStyle` and the command-bar pointer resources) belongs to 0.8.3 `CommandBar`; this component implements the default appearance only.

## API

### `FluereSplitButton`

| Prop             | Type                                                  | Default    | Mapping / notes                                                                  |
| ---------------- | ----------------------------------------------------- | ---------- | -------------------------------------------------------------------------------- |
| `disabled`       | `boolean`                                             | `false`    | `IsEnabled`                                                                      |
| `label`          | `string`                                              | —          | Primary accessible name (`AutomationProperties.Name`)                            |
| `secondaryLabel` | `string`                                              | —          | Arrow / menu panel accessible name; defaults to locale "更多选项 / More Options" |
| `open`           | `boolean`                                             | —          | Menu open state (controlled, `v-model:open`); self-managed when omitted          |
| `hasPopup`       | `'menu' \| 'listbox' \| 'tree' \| 'grid' \| 'dialog'` | `'menu'`   | Arrow `aria-haspopup`; only override when non-menu content goes in `#flyout`     |
| `type`           | `'button' \| 'submit' \| 'reset'`                     | `'button'` | Primary native button type (the arrow is always `button`)                        |
| `locale`         | `string`                                              | —          | Locale for built-in text, taking precedence over `FluereConfigProvider`          |

| Event         | Payload                            | Mapping / notes                                                                       |
| ------------- | ---------------------------------- | ------------------------------------------------------------------------------------- |
| `click`       | `MouseEvent`                       | Primary click (WinUI `Click`); while the menu is open it only closes the menu         |
| `update:open` | `boolean`                          | Menu open write-back (`v-model:open`)                                                 |
| `opened`      | —                                  | Menu opened (`Flyout.Opened`)                                                         |
| `closed`      | —                                  | Menu closed (`Flyout.Closed`)                                                         |
| `select`      | `FluereSplitButtonSelectEventArgs` | Menu item activated (`{ value?, text?, checked? }`, same shape as `FluereMenuFlyout`) |

| Slot      | Notes                                                                                                                                             |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `default` | Primary content                                                                                                                                   |
| `flyout`  | Menu content: put `FluereMenuFlyoutItem` / `…SubItem` / `…Separator` / `…ToggleItem`; slot prop: `close(reason?)` (equivalent to `Flyout.Hide()`) |

### `FluereToggleSplitButton`

On top of every `FluereSplitButton` prop / slot / event:

| Prop      | Type      | Default | Mapping / notes                             |
| --------- | --------- | ------- | ------------------------------------------- |
| `checked` | `boolean` | `false` | `IsChecked` (controlled, `v-model:checked`) |

Additional events:

| Event              | Payload   | Mapping / notes                              |
| ------------------ | --------- | -------------------------------------------- |
| `update:checked`   | `boolean` | Checked state write-back (`v-model:checked`) |
| `isCheckedChanged` | `boolean` | `IsCheckedChanged`, carrying the new value   |

Primary-click event order on `ToggleSplitButton`: `update:checked` → `isCheckedChanged` → `click`.
