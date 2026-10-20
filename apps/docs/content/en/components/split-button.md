---
title: Split Button 拆分按钮
description: A split button whose primary area runs the default action while the arrow opens a flyout; visuals and keys aligned with WinUI SplitButton / ToggleSplitButton.
nav:
  title: Split Button 拆分按钮
---

# Split Button 拆分按钮

`FluereSplitButton` / `FluereToggleSplitButton` map to WinUI 3's **`Microsoft.UI.Xaml.Controls.SplitButton`** and **`ToggleSplitButton`**: one control with two independently reachable hit areas — the primary area runs the default action, the arrow opens a flyout; the toggle variant flips its checked state before running the action. Both share one template, state table and animation (the internal base is `split-button-base.vue`).

```vue
<FluereSplitButton label="New" @click="createDocument">
  New
  <template #flyout="{ close }">
    <button @click="pick('folder'); close()">Folder</button>
  </template>
</FluereSplitButton>
```

## Basic usage

Clicking the primary area emits `click`; clicking the arrow toggles the flyout. The `#flyout` slot receives `close()` so items can dismiss after selection (equivalent to calling `Flyout.Hide()` in XAML).

::demo-block{title="New ▾: default action + more options"}
#preview
:SplitButtonBasicDemo
#code

```vue
<FluereSplitButton label="New" @click="createDocument">
  New
  <template #flyout="{ close }">
    <ul class="m-0 flex w-56 list-none flex-col gap-fluent-xs p-0">
      <li v-for="action in actions" :key="action.id">
        <button @click="pick(action.label, close)">{{ action.label }}</button>
      </li>
    </ul>
  </template>
</FluereSplitButton>
```

::

## Toggle variant and disabled state

`FluereToggleSplitButton` corresponds to WinUI `ToggleSplitButton`: clicking the primary area emits `update:checked` → `isCheckedChanged` → `click` (matching the "Toggle then Click" order in `ToggleSplitButton.cpp#OnClickPrimary`); clicking the arrow **does not** change the checked state. `checked` is a controlled prop (same convention as `FluereToggleButton`).

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

| Action                       | Behavior                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------ |
| `Tab`                        | primary area → arrow area (two separate buttons; split per WAI-ARIA APG — see differences) |
| `Enter` / `Space` (primary)  | run the default action (emits `click`)                                                     |
| `Enter` / `Space` (arrow)    | open / close the flyout                                                                    |
| `Alt+↓` / `F4`               | open the flyout (aligned with WinUI `OnSplitButtonKeyUp`)                                  |
| `↓` (arrow)                  | open the flyout (APG split-button discovery addition)                                      |
| `Esc`                        | close the flyout and return focus to the element that opened it                            |
| outside click / focus leaves | close the flyout                                                                           |
| holding `Space` / `Enter`    | the whole control shows the pressed state (WinUI `m_isKeyDown` → `TouchPressed`)           |

- Primary accessible name: `label` (required for icon-only primary content), otherwise the default slot text;
- Arrow accessible name: `secondaryLabel`, falling back to the locale slice "更多选项 / More Options" (verbatim from upstream `SplitButtonSecondaryButtonName`);
- The arrow exposes `aria-haspopup` / `aria-expanded` / `aria-controls`; the flyout uses reka `PopoverContent`'s dialog semantics (`role="dialog"` labelled by the arrow's accessible name). `hasPopup` defaults to `'dialog'`; pass `'menu'` once menu content from 0.6.1 `MenuFlyout` is used;
- Clicking the primary area while the flyout is open only closes the flyout (equivalent to Popup light-dismiss) and does not emit `click`.

## Specification sources

| Item       | Value                                                                                                                                                                                                                                                                                                     |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Control    | WinUI 3 `SplitButton` / `ToggleSplitButton` (both derive from `ContentControl`)                                                                                                                                                                                                                           |
| tag/commit | `winui3/release/2.5.1` / `ba3a8d5` (local snapshot `temp/winui-src`)                                                                                                                                                                                                                                      |
| Key files  | `src/controls/dev/SplitButton/{SplitButton.xaml,SplitButton_themeresources.xaml,SplitButton.idl,SplitButton.cpp,ToggleSplitButton.cpp,SplitButtonAutomationPeer.cpp}` + `Strings/{en-us,zh-CN}/Resources.resw` + `src/controls/dev/AnimatedIcon/AnimatedVisuals/AnimatedChevronDownSmallVisualSource.cpp` |

## Implementation notes

- **Template copied layer by layer**: the `RootGrid` has three columns (primary `*` MinWidth 35 / separator 1 / arrow 35), the primary `Padding=11,6,11,7`, the arrow `Padding=0,0,12,0` with a 12×12 chevron, and each half has its own 1px border overlay (`1,1,0,1` + `4,0,0,4` / `0,1,1,1` + `0,4,4,0`). Height is content-driven (6 + 20 line height + 7 = 33px), matching the A-level template (which has no `MinHeight`).
- **State table follows `UpdateVisualStates` order**: `Disabled` (highest) > `FlyoutOpen` / `CheckedFlyoutOpen` > `Checked*` > pointer / keyboard press. The full `ControlFillColor*` / `TextFillColor*` / `ControlStrokeColorDefault` mapping table lives in the component header; values without an equal-value token (`TextOnAccentFillColorSecondary`, `ControlStrokeColorOnAccentTertiary`) fall back to component-local variables (`--fui-split-button-checked-pressed-foreground` / `-checked-divider`, one-line overridable).
- **Chevron animation reproduced frame by frame**: within the 483.3ms timeline of `AnimatedChevronDownSmallVisualSource`, `NormalToPressed` (150.8ms, moves down 1.875px) and `PressedToNormal` (316.7ms, first to −0.75px then back to 0, two easing segments) are implemented as two CSS keyframe animations; `prefers-reduced-motion` disables them and keeps the static chevron.
- **Flyout (temporary panel before 0.6.1)**: placement is fixed to `BottomEdgeAlignedLeft` (`side="bottom"` + `align="start"`, no offset); the panel follows `FlyoutPresenter_themeresources.xaml` for background / border / 8px radius / `16,15,16,17` padding / 96–456 size bounds; Acrylic is approximated with its FallbackColor (real compositing belongs to 0.9.2) and the shadow uses `--shadow16` (`FlyoutBase`'s elevation is not in the public snapshot — an **evidence gap**; override `--fui-split-button-flyout-shadow`). Menu-item keyboard navigation belongs to 0.6.1 `MenuFlyout`.
- **Controlled semantics**: both `open` (`v-model:open`) and the toggle variant's `checked` (`v-model:checked`) support controlled / uncontrolled usage; `open === undefined` means self-managed, otherwise the prop wins.

### Real-browser verification (2026-10-20)

Method: Chromium at 1440×1000 opens this page; the script reads `getComputedStyle` / `getBoundingClientRect` across rest / hover / pressed / open, flyout placement and stacking, keyboard paths and both color themes — **50/50 assertions passed** (the script lives in `temp/`, process screenshots are not committed; the expected values are also fixed in the component comments and contract tests).

| Item            | Measured                                                                                                                                |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Geometry        | height 33 (6 + 20 line height + 7), arrow 35, separator 1, chevron 12×12, radius 4, primary padding 11/6/7                              |
| rest            | background `#ffffff`, foreground `#242424`, arrow foreground `#424242`, border `#d1d1d1` (1px, outside the content box)                 |
| hover           | both halves `#f5f5f5`; arrow foreground switches to `#242424`                                                                           |
| pressed         | both halves `#e0e0e0`, foreground `#424242`; open state arrow foreground `#616161`                                                      |
| Flyout          | left-aligned and flush with the control's bottom edge (offset 0); padding 15/16/17, radius 8, background `#f9f9f9`, border `.059` black |
| Flyout stacking | `--zIndexMenu` (1100), teleported to `body`, `role=dialog` labelled by the arrow's accessible name                                      |
| Keyboard        | `Esc` closes and returns focus to the arrow; `F4` / `Alt+↓` open; `Tab` primary → arrow; holding `Space` presses both halves            |

> The first verification round caught a bug unit tests cannot see: after `Esc`, focus landed on `body` — reka `FocusScope` restores focus to `body` when there is no `PopoverTrigger`. Fixed by `useFlyout(returnFocus: true)` plus preventing the default `close-auto-focus`, leaving focus restoration to the primitive.

### Intentional differences from WinUI

1. **Focus / Tab order**: WinUI has a single Tab stop for the entire control (inner buttons have `IsTabStop=False`), so the arrow is reachable only by pointer or `Alt+↓` / `F4`; this library follows APG and makes the primary and arrow two separately tabbable `<button>`s (todo 0.6.4 requires "each reachable"), while keeping every WinUI shortcut. Each button consumes the shared 0.4.3 double focus rectangle (`FocusVisualMargin = -3`; WinUI's `-1` no longer applies to a two-button structure — 0.9.3 will unify).
2. **Touch pressed state**: A-level `TouchPressed` shows both halves pressed on touch; in the browser pointer model each half's `:active` gives single-area feedback, and the cross-half touch state is not implemented separately.
3. **Checked + disabled**: A-level `Disabled` takes precedence over `Checked*`, so a checked-and-disabled control shows the neutral disabled fill rather than an accent disabled color; this library follows that.

### Known gaps

- High contrast (HC) theme is not implemented (A-level uses `SystemColor*`);
- Flyout content is a generic panel; menu-item semantics (`role=menuitem`) and arrow / Home / End navigation belong to 0.6.1 `MenuFlyout`;
- Real Acrylic compositing and noise belong to 0.9.2; the flyout shadow level is an evidence gap (see above);
- The AppBar / CommandBar appearance (`SplitButtonCommandBarStyle` and the in-app-bar pointer resource) belongs to 0.8.3 `CommandBar`; this component implements the default appearance only.

## API

### `FluereSplitButton`

| Prop             | Type                                                  | Default    | Mapping / notes                                                           |
| ---------------- | ----------------------------------------------------- | ---------- | ------------------------------------------------------------------------- |
| `disabled`       | `boolean`                                             | `false`    | `IsEnabled`                                                               |
| `label`          | `string`                                              | —          | Primary accessible name (`AutomationProperties.Name`)                     |
| `secondaryLabel` | `string`                                              | —          | Arrow accessible name; defaults to locale "更多选项 / More Options"       |
| `open`           | `boolean`                                             | —          | Flyout open state (controlled, `v-model:open`); self-managed when omitted |
| `hasPopup`       | `'menu' \| 'listbox' \| 'tree' \| 'grid' \| 'dialog'` | `'dialog'` | Arrow `aria-haspopup`; pass `'menu'` for menu content                     |
| `type`           | `'button' \| 'submit' \| 'reset'`                     | `'button'` | Primary native button type (the arrow is always `button`)                 |
| `locale`         | `string`                                              | —          | Locale for built-in text, taking precedence over `FluereConfigProvider`   |

| Event         | Payload      | Mapping / notes                                                  |
| ------------- | ------------ | ---------------------------------------------------------------- |
| `click`       | `MouseEvent` | Primary click (WinUI `Click`); closes the flyout when it is open |
| `update:open` | `boolean`    | Flyout open write-back (`v-model:open`)                          |
| `opened`      | —            | Flyout opened (`Flyout.Opened`)                                  |
| `closed`      | —            | Flyout closed (`Flyout.Closed`)                                  |

| Slot      | Notes                                                                       |
| --------- | --------------------------------------------------------------------------- |
| `default` | Primary content                                                             |
| `flyout`  | Flyout content; slot prop: `close(reason?)` (equivalent to `Flyout.Hide()`) |

### `FluereToggleSplitButton`

On top of every `FluereSplitButton` prop / slot:

| Prop      | Type      | Default | Mapping / notes                             |
| --------- | --------- | ------- | ------------------------------------------- |
| `checked` | `boolean` | `false` | `IsChecked` (controlled, `v-model:checked`) |

Additional events:

| Event              | Payload   | Mapping / notes                              |
| ------------------ | --------- | -------------------------------------------- |
| `update:checked`   | `boolean` | Checked state write-back (`v-model:checked`) |
| `isCheckedChanged` | `boolean` | `IsCheckedChanged`, carrying the new value   |

Primary-click event order on `ToggleSplitButton`: `update:checked` → `isCheckedChanged` → `click`.
