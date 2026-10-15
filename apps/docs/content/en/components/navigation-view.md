---
title: Navigation View
description: A collapsible left navigation pane with group headers, hierarchical children, a selection indicator and a built-in settings item; DisplayMode and keys aligned to WinUI NavigationView.
nav:
  title: Navigation View
---

# Navigation View

`FluereNavigationView` + `FluereNavigationViewItem` (plus `...ItemHeader` / `...ItemSeparator`) map to WinUI 3 / Windows App SDK's **`Microsoft.UI.Xaml.Controls.NavigationView`**: a collapsible left pane plus a content area, with groups, multi-level children, a selection indicator and a built-in settings item. The `DisplayMode` state machine and the key bindings follow the source item by item.

```vue
<FluereNavigationView v-model:selected-value="selected" label="Navigation" pane-title="Explorer">
  <FluereNavigationViewItemHeader content="Quick access" />
  <FluereNavigationViewItem value="home" content="Home">
    <template #icon><FluentIconStar24Regular :size="20" /></template>
  </FluereNavigationViewItem>
  <template #content>Content area</template>
</FluereNavigationView>
```

::demo-block{title="Basic: groups, icons, selection indicator and settings item"}
#preview
:NavigationViewBasicDemo
#code

```vue
<FluereNavigationView v-model:selected-value="selected" label="Navigation" pane-title="Explorer">
  <template v-for="section in sections" :key="section.title">
    <FluereNavigationViewItemHeader :content="section.title" />
    <FluereNavigationViewItem
      v-for="item in section.items"
      :key="item.value"
      :value="item.value"
      :content="item.content"
    >
      <template #icon><component :is="item.icon" :size="20" /></template>
    </FluereNavigationViewItem>
  </template>
</FluereNavigationView>
```

::

## Version and evidence

| Item             | Value                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec source tag  | `winui3/release/2.5.1` (commit `ba3a8d5`)                                                                                                                                                                                                                                                                                                                                                                  |
| Key files        | `src/controls/dev/NavigationView/{NavigationView.idl,NavigationView.xaml,NavigationView_themeresources.xaml,NavigationView.cpp,NavigationViewItem.cpp,NavigationViewItemPresenter.cpp,NavigationViewItemHeader.cpp,NavigationViewItemSeparator.cpp}` + `Generated/{NavigationView,NavigationViewItem}.properties.cpp` + `SplitView/SplitView_themeresources.xaml` + `Strings/{en-us,zh-CN}/Resources.resw` |
| Built-in strings | 4 strings (pane toggle button / settings item) taken **verbatim** from upstream `Resources.resw` (see the table in `packages/ui/src/navigation-view/locale.ts`)                                                                                                                                                                                                                                            |

> **`perf2026` is not adopted**: upstream ships `NavigationBackButton_perf2026.xaml` (wired into `NavigationView.vcxitems`); this library follows the 0.5.1 `TitleBar` ruling — not read, not referenced, no corresponding branch.

## The DisplayMode state machine

`paneDisplayMode` (mapping to `NavigationViewPaneDisplayMode`) is **configuration**; `displayMode` is the **computed result**. Do not conflate them.

| `paneDisplayMode` | Behaviour                                 |
| ----------------- | ----------------------------------------- |
| `auto` (default)  | Adapts to container width (table below)   |
| `left`            | Always Expanded (320px pane)              |
| `left-compact`    | Always Compact (48px icon rail)           |
| `left-minimal`    | Same as Compact (see difference #2 below) |

The `auto` predicate is copied verbatim from `NavigationView.cpp:1452-1465` (default thresholds from `NavigationView.idl:176-180`):

| Container width           | Upstream result | This library                        |
| ------------------------- | --------------- | ----------------------------------- |
| `width >= 1008`           | Expanded        | Expanded                            |
| `0 < width < 641`         | **Minimal**     | **Compact** (downgraded, see below) |
| everything else (incl. 0) | Compact         | Compact                             |
| `width === 641`           | Compact         | Compact (the test is strictly less) |
| `NaN`                     | Compact         | Compact                             |

::demo-block{title="The three DisplayMode tiers and Auto adaptation"}
#preview
:NavigationViewDisplayModeDemo
#code

```vue
<FluereNavigationView v-model:selected-value="selected" :pane-display-mode="mode" pane-title="Nav">
  …
</FluereNavigationView>
```

::

## Pane open/close semantics

`isPaneOpen` is governed by the DisplayMode state machine (item by item from `NavigationView.cpp:1494-1512`):

- **Entering Expanded**: auto-opens only when `isPaneVisible` is true **and** the user has not manually closed it;
- **`Expanded → Compact`**: closes unconditionally;
- **Entering Minimal**: closes unconditionally (Minimal is downgraded to Compact here, so "anything but Expanded closes");
- "Manually closed" is a **single global** flag (upstream `m_wasForceClosed`, `NavigationView.h:466`) — there is **no per-mode memory**; changing `pane-display-mode` clears it (`:4211`).

The toggle button shares one code path across all modes (`:1662-1674`): open → close and set the flag; closed → open and clear it. `isPaneToggleButtonVisible` **only controls visibility**, not whether the pane can be toggled (`:4403-4407`).

A closed pane is **not zero-width**: it is the 48px icon rail (upstream `ListSizeCompact` sets `PaneContentGrid.Width` to `CompactPaneLength`, `NavigationView.xaml:83`), showing icons only while the text stays in the accessibility tree.

## Keyboard (item by item from the source)

| Key            | Precondition                    | Effect                                                                                                                                                               |
| -------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Enter`        | focus on an item                | invoke (select + expand + emit `itemInvoked`)                                                                                                                        |
| `Space`        | focus on an item and **no Alt** | same as above; `Alt+Space` is explicitly **not handled** (yields to the system window menu, `:2752-2761`)                                                            |
| `↑` / `↓`      | focus on an item                | move focus between **visible** items; crossing levels (into/out of expanded children, back to the parent) is equivalent to the source's XYFocus plus manual focusing |
| `Home` / `End` | focus on an item                | focus the first / last focusable item (`:2906-2950`)                                                                                                                 |
| `←` + `Alt`    | pane open and light-dismissible | close the pane (`:3136-3145`)                                                                                                                                        |
| `Tab`          | —                               | leave the pane (roving tabindex: one Tab stop per group)                                                                                                             |

**Keys the source does not have** (negative evidence — do not add them by intuition): `→` (`NavigationView` has zero hits for `VirtualKey::Right`), `Esc` (closing a Minimal pane belongs to core `SplitView.cpp:576-581`, not NavigationView), `Ctrl+digit`.

> Holding a key does not repeat invoke: upstream guards with `args.KeyStatus().WasKeyDown` (`:2724`); this library uses `event.repeat`.

## Selection and expansion semantics

- **Clicking an item with children both selects it and toggles expansion** (`OnNavigationViewItemInvoked:1067` does both, not either/or).
- **`selects-on-invoked="false"`**: invoke only expands and does not change selection (`:1048`), useful for group-header-like items; conversely, forcing such an item via `selectedValue` is rolled back (`:2281-2292`) — this library falls back to "nothing selected" and warns in dev.
- **`isChildSelected`**: selecting a child marks its **entire ancestor chain** (`UpdateIsChildSelected:2509-2547`); here the parent derives it at render time (read-only), so consumers never pass it.
- **Indicator drill-down**: starting at the selected item, as long as a node is "not itself selected but has a selected descendant" and its parent is expanded, the indicator is drawn at the **lowest visible level** (`FindLowestLevelContainerToDisplaySelectionIndicator:5562-5593`).
- **Closing the pane force-collapses top-level items but remembers their state** (`HandleExpansionStateMemory`, `NavigationViewItem.cpp:269-285`): reopening the pane restores it. **Top-level items only.**

::demo-block{title="Groups, hierarchy and ancestor-chain selection"}
#preview
:NavigationViewHierarchyDemo
#code

```vue
<FluereNavigationViewItem value="music" content="Music">
  <template #children>
    <FluereNavigationViewItem value="albums" content="Albums" />
    <FluereNavigationViewItem value="artists" content="Artists" />
  </template>
</FluereNavigationViewItem>
```

::

## Settings item and slots

| Slot          | Maps to WinUI                      | Notes                                         |
| ------------- | ---------------------------------- | --------------------------------------------- |
| default       | `MenuItems`                        | holds `Item` / `ItemHeader` / `ItemSeparator` |
| `#content`    | `ContentPresenter`                 | the content area                              |
| `#paneHeader` | `PaneHeader`                       | below the toggle button (expanded mode only)  |
| `#paneFooter` | `PaneFooter`                       | pane bottom, **above** the settings item      |
| `#settings`   | `SettingsItem` (`FooterMenuItems`) | replaces the built-in settings item entirely  |

When the built-in settings item is selected, `selectedValue` takes a **reserved sentinel value** (the exported constant `FLUERE_NAVIGATION_SETTINGS_VALUE`) and `itemInvoked` reports `isSettingsInvoked: true`. **Consumers must not use that string as a menu item `value`** (a contract test guards this).

::demo-block{title="Settings item, PaneFooter and events"}
#preview
:NavigationViewSettingsDemo
#code

```vue
<FluereNavigationView v-model:selected-value="selected" @item-invoked="onInvoked">
  <FluereNavigationViewItem value="docs" content="Documents" />
  <template #paneFooter>…</template>
  <template #settings>…</template>
</FluereNavigationView>
```

::

## Differences from WinUI (deliberate, recorded one by one)

1. **Left pane only**: `PaneDisplayMode`'s `Top` is not implemented — top navigation is a different template (`TopNavArea` / `TopNavGrid` / overflow `Flyout` / gamepad `BumperNavigation`). Consequently `ShoulderNavigationEnabled` is not implemented either (the source returns **false** for non-Top, `:3165-3170`, i.e. the left pane never had gamepad navigation), nor are `OverflowLabelMode`, `AutoSuggestBox` and the back/close buttons.
2. **`Minimal` is downgraded to `Compact`**: upstream Minimal means "pane as an overlay + focus trap" (`:4588-4596` sets `KeyboardNavigationMode` to `Cycle`); overlay focus management belongs to 0.5.7's `useFocusTrap`. Here, a width in the Minimal range renders as Compact (a persistent 48px pane) with no overlay.
3. **Children are "data-only subcomponents"**: the three child components **never mount** (the parent reads vnode props / slots at render time; see `collection.ts`), so they cannot emit and their slots **do not support scoped arguments**.
4. **`SelectedItem` becomes a value identity**: WinUI uses an object reference; the Vue side uses `selectedValue` (consistent with `FluereTabView`).
5. **No child flyout**: upstream moves children into a `ChildrenFlyout` when compact and closed (`NavigationViewItem.cpp:908-911`). Here, compact mode **hides the chevron and does not render children**, avoiding an arrow that appears to do nothing; expanding the pane shows children inline again.
6. **No "indicator sliding between items" position animation**: upstream `PlayIndicatorAnimations` (`NavigationView.cpp:2185-2235`) computes the offset between items with Composition, `600ms` across three easing segments plus a 200ms centre-point animation. Here only the current item's indicator fades in/out (upstream `ShowSelectionIndicator` likewise just sets `Opacity`, `NavigationViewItem.cpp:402-408`, with no transition), so the static form matches.
7. **The chevron expresses its two end states with a CSS rotation**: in the upstream default template `RotateExpandCollapseChevron` merely calls `Begin()` on two storyboards that **do not exist** (`NavigationView.xaml` has zero `Storyboard` entries and no `Rotate`/`Angle`) ⇒ it is a no-op for the default template; the actual rotation comes from the `AnimatedIcon` (`AnimatedChevronUpDownSmallVisualSource`). This library does not ship Lottie and only expresses the two static ends (expanded 180° / collapsed 0°).

## Evidence gaps (explicitly recorded)

- **Chevron per-frame keyframes**: the LottieGen output gives the total duration 433.33ms and 18 interval markers (`AnimatedChevronUpDownSmallVisualSource.cpp:104,782,789-825`), but the full path interpolation lives in the JSON source (not in this snapshot). This library only does the two static ends plus a single 50ms transition (override `--fui-navigation-view-chevron-duration`).
- **Duration of `ExpandCollapseRotate{Expanded,Collapsed}Storyboard` is unobtainable**: `NavigationViewItemPresenter.cpp:73-74` looks them up, but they do not exist in the default template, so there is no value to cite.
- **System accent colour**: the final value of `AccentFillColorDefaultBrush` is injected by the OS at runtime; the source tree only has an alias. This library reuses the repository's existing mapping, `--colorBrandBackground`.
- **High contrast**: the HC palette comes from the OS at runtime (`themeresources:136-201` are all `SystemColor*` references); this library implements no HC specifics beyond the `forced-colors` focus ring already handled by the 0.4.3 primitive.

## Token mapping

| WinUI resource                                                                           | Final colour (light / dark) | Token in this library                                                                                    |
| ---------------------------------------------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------- |
| `NavigationViewDefaultPaneBackground` ← `AcrylicInAppFillColorDefaultBrush`              | `#F9F9F9` / `#2C2C2C`       | `--acrylicInAppFillColorDefault`                                                                         |
| `NavigationViewExpandedPaneBackground` ← `SolidBackgroundFillColorTransparent`           | fully transparent           | `--colorTransparentBackground` (same appearance, different literal — see note 5 in the component header) |
| `NavigationViewContentBackground` ← `LayerFillColorDefaultBrush`                         | `#80FFFFFF` / `#4C3A3A3A`   | `--layerFillColorDefault`                                                                                |
| `NavigationViewItemBackground*` ← `SubtleFillColor{Transparent,Secondary,Tertiary}Brush` | —                           | `--subtleFillColorTransparent` / `--subtleFillColorSecondary` / `--subtleFillColorTertiary`              |
| `NavigationViewItemForeground*` ← `TextFillColor{Primary,Secondary,Disabled}Brush`       | —                           | `--colorNeutralForeground1` / `--colorNeutralForeground2` / `--colorNeutralForegroundDisabled`           |
| `NavigationViewSelectionIndicatorForeground` ← `AccentFillColorDefaultBrush`             | system accent               | `--colorBrandBackground`                                                                                 |
| `NavigationViewItemSeparatorForeground` ← `DividerStrokeColorDefaultBrush`               | `#0F000000` / `#15FFFFFF`   | `--dividerStrokeColorDefault`                                                                            |
| `NavigationViewContentGridBorderBrush` ← `CardStrokeColorDefaultBrush`                   | `#0F000000` / `#19000000`   | `--colorNeutralStrokeAlpha` (reusing the existing InfoBar / ContentDialog / TabView mapping)             |
| Disabled opacity ← `ListViewItemDisabledThemeOpacity`                                    | `0.3`                       | `--fui-navigation-view-disabled-opacity`                                                                 |

## Geometry (item by item from `NavigationView_themeresources.xaml`)

| Quantity                        | Value                                                          | Source                                  |
| ------------------------------- | -------------------------------------------------------------- | --------------------------------------- |
| Item min height                 | `36`                                                           | `:217`                                  |
| Icon box height / icon column   | `16` / `max(0, CompactPaneLength - 8)` = 40                    | `:219`, `:611-613`                      |
| Selection indicator             | `3 × 16`, radius `2`                                           | `:220-222`                              |
| Group header height / font size | `40` / `14` SemiBold                                           | `NavigationView.xaml:564`, `:1081-1086` |
| Separator                       | `1px`, `Margin 0,3,0,4`                                        | `:223`, `:247`                          |
| Level indentation               | `Depth() × 31`                                                 | `NavigationViewItemBase.h:63`           |
| Pane toggle button              | `40 × 36`                                                      | `:205-206`                              |
| Corner radius                   | item `OverlayCornerRadius`(8), button `ControlCornerRadius`(4) | `:447`, `:283`                          |
| Pane width                      | Expanded `320` / Compact `48`                                  | `NavigationView.idl:195,198`            |

## Pane open/close motion

The pane width animation comes from the SplitView template (NavigationView's pane is hosted by an internal `SplitView`):

| Direction | Resource                              | Value   | Keyframe easing                  |
| --------- | ------------------------------------- | ------- | -------------------------------- |
| Open      | `SplitViewPaneAnimationOpenDuration`  | `200ms` | `cubic-bezier(0, 0.35, 0.15, 1)` |
| Close     | `SplitViewPaneAnimationCloseDuration` | `100ms` | same                             |

Both durations map to `--durationNormal` / `--durationFaster`, and are set to `0ms` under `prefers-reduced-motion` or `motion="none"` — turning motion off **keeps a sensible static form** (the pane still opens and closes, the indicator stays visible, the chevron still points the right way).

## API

### `FluereNavigationView`

| Prop                         | Type                                                   | Default      | Maps to WinUI                               |
| ---------------------------- | ------------------------------------------------------ | ------------ | ------------------------------------------- |
| `paneDisplayMode`            | `'auto' \| 'left' \| 'left-compact' \| 'left-minimal'` | `'auto'`     | `PaneDisplayMode`                           |
| `isPaneOpen`                 | `boolean`                                              | —            | `IsPaneOpen` (`v-model:is-pane-open`)       |
| `defaultIsPaneOpen`          | `boolean`                                              | `true`       | dependency-property default of `IsPaneOpen` |
| `openPaneLength`             | `number`                                               | token `320`  | `OpenPaneLength`                            |
| `compactPaneLength`          | `number`                                               | token `48`   | `CompactPaneLength`                         |
| `compactModeThresholdWidth`  | `number`                                               | `641`        | `CompactModeThresholdWidth`                 |
| `expandedModeThresholdWidth` | `number`                                               | `1008`       | `ExpandedModeThresholdWidth`                |
| `isPaneToggleButtonVisible`  | `boolean`                                              | `true`       | `IsPaneToggleButtonVisible`                 |
| `isPaneVisible`              | `boolean`                                              | `true`       | `IsPaneVisible`                             |
| `isSettingsVisible`          | `boolean`                                              | `true`       | `IsSettingsVisible`                         |
| `selectedValue`              | `string \| number`                                     | —            | `SelectedItem` (`v-model:selected-value`)   |
| `defaultSelectedValue`       | `string \| number`                                     | —            | —                                           |
| `selectionFollowsFocus`      | `'disabled' \| 'enabled'`                              | `'disabled'` | `SelectionFollowsFocus`                     |
| `paneTitle`                  | `string`                                               | `''`         | `PaneTitle`                                 |
| `label`                      | `string`                                               | —            | `AutomationProperties.Name`                 |
| `dir`                        | `'ltr' \| 'rtl'`                                       | `'ltr'`      | `FlowDirection`                             |
| `motion`                     | `'auto' \| 'none'`                                     | `'auto'`     | —                                           |
| `locale`                     | `string`                                               | —            | —                                           |

| Event / slot                                             | Payload / notes                                                                     |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `update:isPaneOpen`                                      | `boolean`                                                                           |
| `update:selectedValue`                                   | `string \| number \| undefined`                                                     |
| `itemInvoked`                                            | `{ value, content, isSettingsInvoked, source: 'pointer' \| 'keyboard' \| 'focus' }` |
| `selectionChanged`                                       | `{ value, previousValue, isSettingsSelected }`                                      |
| `displayModeChanged`                                     | `{ displayMode: 'minimal' \| 'compact' \| 'expanded' }`                             |
| `#content` / `#paneHeader` / `#paneFooter` / `#settings` | see "Settings item and slots" above                                                 |

### `FluereNavigationViewItem`

| Prop                    | Type               | Default      | Maps to WinUI                        |
| ----------------------- | ------------------ | ------------ | ------------------------------------ |
| `value`                 | `string \| number` | **required** | (item identity on the Vue side)      |
| `content`               | `string`           | `''`         | `Content`                            |
| `selectsOnInvoked`      | `boolean`          | `true`       | `SelectsOnInvoked`                   |
| `isExpanded`            | `boolean`          | —            | `IsExpanded` (`v-model:is-expanded`) |
| `defaultIsExpanded`     | `boolean`          | `false`      | default of `IsExpanded`              |
| `hasUnrealizedChildren` | `boolean`          | `false`      | `HasUnrealizedChildren`              |
| `isChildSelected`       | `boolean`          | derived      | `IsChildSelected` (read-only here)   |
| `ariaLabel`             | `string`           | —            | `AutomationProperties.Name`          |
| `disabled`              | `boolean`          | `false`      | `Control.IsEnabled`                  |

| Slot        | Notes                                                      |
| ----------- | ---------------------------------------------------------- |
| default     | item text / rich content (takes precedence over `content`) |
| `#icon`     | icon (20px recommended)                                    |
| `#children` | child items (recursive; may nest `#children` again)        |

### `FluereNavigationViewItemHeader` / `FluereNavigationViewItemSeparator`

| Component                           | Props     | Maps to WinUI                 |
| ----------------------------------- | --------- | ----------------------------- |
| `FluereNavigationViewItemHeader`    | `content` | `NavigationViewItemHeader`    |
| `FluereNavigationViewItemSeparator` | —         | `NavigationViewItemSeparator` |

Both are **not focusable and hidden from AT** (upstream `IsTabStop=False` + `AccessibilityView=Raw`, `NavigationView.xaml:505-509`, `:574-576`).

## Browser verification

<!-- Relative paths outside content/ (./../../../../docs/…) are treated as site routes by
     `pnpm docs:generate`'s crawlLinks and 404, failing the whole command (see the docs:generate
     checklist item in AGENTS.md). Repository docs therefore use absolute links, as in scroll-view.md. -->

The style contract tests read the **SFC / CSS source text** (jsdom does not resolve `var()`, see
[style-spec §7.1](https://github.com/Altermoe/fluere-vue/blob/main/docs/style-spec.md)), so
"did the pane styles actually apply" must be measured as computed styles in a real browser —
especially because this component's row visuals live in the **non-scoped** `navigation-view.css`
(the same rows are rendered by the parent component and the recursive list component, whose
`data-v-*` ids differ, so one scoped block each would inevitably drift). The measurement results
are recorded in the component comments and in
[docs/todo.md](https://github.com/Altermoe/fluere-vue/blob/main/docs/todo.md) under 0.5.4.
