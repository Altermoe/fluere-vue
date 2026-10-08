---
title: Combobox Dropdown
description: A dropdown select control for choosing one option from a set of single-line text options, with support for text search and editable custom values.
nav:
  title: Combobox Dropdown
---

# Combobox Dropdown

The dropdown lets users pick one item from a set of single-line text options (color, font size, shipping method…). Its style and behavior reproduce the **ComboBox** of WinUI 3 (Windows App SDK 2.0): geometry, state colors, dropdown item indicator bars, panel positioning and animation are all checked line by line against `src/controls/dev/ComboBox/ComboBox_themeresources.xaml`; key handling, text search and the editable state follow `src/dxaml/xcp/dxaml/lib/ComboBox_Partial.cpp`.

The interaction foundation reuses the Combobox primitive of `reka-ui` (ARIA combobox semantics, roving highlight, popup positioning, close on outside click); this component adds WinUI's key handling, text search, editable state and visual states.

Three value-handling conventions aligned with WinUI:

- **No selection means `null`** (matches WinUI `SelectedIndex = -1`): without `modelValue` it is uncontrolled, `null` means nothing is selected, and clearing the selection emits `null`;
- **Option data goes through `items`** (matches WinUI `ItemsSource`), each item `{ value, text?, disabled? }`, `text` defaults to `String(value)`;
- **`selectionChangedTrigger` decides when to commit**: default `committed` — a click / Enter / text search changes the selection; with the panel open, arrow keys only move the highlight (WinUI `SelectionChangedTrigger` default behavior).

## Basic usage

`v-model` binds the selected value, `items` supplies the options, `header` is WinUI's title row (also the default accessible name), and `placeholder` is shown when nothing is selected.

::demo-block{title="Basic usage"}
#preview
:ComboboxBasicDemo
#code

```vue
<FluereCombobox v-model="picked" :items="COLORS" header="颜色" placeholder="请选择颜色" />
```

::

## Title, description and accessible name

`header` maps to WinUI `Header` (`LineHeight 20`, bottom margin 8, weight Normal), `description` maps to `Description` (rendered below the control and used as `aria-describedby`), and `label` takes precedence over `header` as the accessible name.

::demo-block{title="Title and description"}
#preview
:ComboboxHeaderDemo
#code

```vue
<FluereCombobox
  v-model="fontSize"
  :items="FONT_SIZES"
  header="正文字号"
  description="Header 同时作为缺省的可访问名"
  label="正文字号选择器"
/>
```

::

## Selection and events

Elements of `items` can be of any type: use `by` to specify item identity (field name or compare function) and `text` to specify the display and search text. The payload of `selectionChanged` aligns with WinUI `SelectionChangedEventArgs`: `addedItem` / `removedItem` / `addedIndex` / `removedIndex` (single-select, at most one of each; index is `-1` when nothing is selected).

::demo-block{title="Object items and selection events"}
#preview
:ComboboxObjectDemo
#code

```vue
<FluereCombobox
  v-model="city"
  :items="CITIES.map((item) => ({ value: item, text: item.name }))"
  by="id"
  header="城市（对象项 + by）"
  @selection-changed="onSelectionChanged"
/>
```

::

For "highlight follows the selection" behavior (WinUI `SelectionChangedTrigger = Always`, the feel of a font picker), pass `selection-changed-trigger="always"`:

```vue
<FluereCombobox v-model="font" :items="FONTS" selection-changed-trigger="always" />
```

## Keyboard and text search

Key handling follows WinUI's two key maps line by line (`MainKeyDown` / `PopupKeyDown`):

| Key                      | Panel collapsed (non-editable)                            | Panel expanded                                                    |
| ------------------------ | --------------------------------------------------------- | ----------------------------------------------------------------- |
| `↑` / `↓`                | **changes the selection directly** (skips disabled items) | moves the highlight (does not change selection under `committed`) |
| `Home` / `End`           | selects first / last enabled item                         | highlights first / last                                           |
| `Enter`                  | opens the panel                                           | commits the highlighted item and closes                           |
| `Space`                  | opens the panel                                           | equivalent to `Enter`                                             |
| `Ctrl` / `Cmd` + `Enter` | —                                                         | deselects the currently selected item                             |
| `Alt` + `↑` / `↓`        | opens the panel                                           | closes the panel                                                  |
| `F4`                     | opens the panel                                           | closes the panel                                                  |
| `Escape`                 | not handled (bubbles to the parent)                       | closes the panel without changing the selection                   |
| Character keys           | prefix-searches and selects the hit directly              | same (the popup bubbles the character back to the control)        |
| `Tab`                    | focus leaves normally                                     | closes the panel; focus leaves normally                           |

Text search shares WinUI's semantics: item text is first `TrimStart(' ')` and then matched by **case-insensitive prefix match** (no substring / fuzzy matching); the search string accumulates when two keystrokes are ≤ **1000ms** apart and restarts otherwise; the new search string scans **circularly** starting from "current item + 1", and the hit directly becomes the selection. `text-search-enabled="false"` turns it off entirely (matches `IsTextSearchEnabled`). When focus is on the control and the panel is collapsed, the mouse wheel also changes the selection (WinUI only responds when focused and collapsed).

::demo-block{title="Long list and text search"}
#preview
:ComboboxLongListDemo
#code

```vue
<FluereCombobox
  v-model="state"
  :items="STATES"
  header="州（输入 w 试试文本搜索）"
  placeholder="选择或直接输入首字母"
  :max-drop-down-height="200"
/>
```

::

The panel's maximum height defaults to 504px (WinUI `DefaultComboBoxStyle` `MaxDropDownHeight`, roughly 15 items); beyond that the list scrolls internally.

## Editable state

`editable` maps to WinUI `IsEditable`: the input box accepts a custom value, and **typing does not filter the list** (an editable WinUI ComboBox only does inline completion, not filtering); the panel is still opened via the arrow hotspot / `F4` / `Alt+↓`.

- **Inline completion**: when a typed prefix matches an item, it completes to that item's text and selects the completed part (WinUI `UpdateEditableTextBox(selectText: true)`); continued typing replaces it;
- **`Enter` / commit on blur**: text matching an existing item → selects that item; otherwise it emits `textSubmitted` and, following WinUI's default behavior, clears the selection while **keeping the text**;
- **`textSubmitted` `handled`**: setting `true` equals WinUI `e.Handled = true`, and the component no longer changes the selection (convenient for filling the value back after validation);
- **`Escape`**: rolls the text back to the current selection (WinUI `CommitRevertEditableSearch(restoreValue: true)`);
- The text can be controlled with `v-model:text` (maps to WinUI `Text`).

::demo-block{title="Editable state"}
#preview
:ComboboxEditableDemo
#code

```vue
<FluereCombobox
  v-model="name"
  :items="RECENT_NAMES"
  editable
  header="名称（可自定义）"
  placeholder="输入或选择"
  @text-submitted="onTextSubmitted"
/>
```

::

## Custom dropdown items

Use the `#item` slot to override row content (maps to WinUI `ItemTemplate`); slot params are `{ item, index }`. The selection indicator bar, padding, corner radius and state colors are still handled by the component.

::demo-block{title="Custom dropdown items"}
#preview
:ComboboxCustomItemDemo
#code

```vue
<FluereCombobox v-model="color" :items="COLORS" header="强调色">
  <template #item="{ item }">
    <span class="flex items-center gap-2">
      <span class="inline-block w-4 h-4 rounded-fluent-sm" :style="{ backgroundColor: item.value }" />
      {{ item.text }}
    </span>
  </template>
</FluereCombobox>
```

::

## Disabled

`disabled` maps to WinUI `IsEnabled = false` (fill / foreground / arrow / indicator bar all use the disabled slots, and it ignores pointer and keyboard); an individual option's `disabled` maps to `ComboBoxItem.IsEnabled = false` and is excluded from arrow-key selection and text search.

::demo-block{title="Disabled state"}
#preview
:ComboboxDisabledDemo
#code

```vue
<FluereCombobox v-model="plan" :items="PLANS" header="可选中" />
<FluereCombobox v-model="locked" :items="PLANS" disabled header="整体禁用" />
```

::

## Form submission

When placed inside a `<form>` with a `name`, it adds a hidden native `<input type="hidden">` submitting `name=value` (an empty string when nothing is selected), matching the use of WinUI `SelectedValue`.

::demo-block{title="Form submission"}
#preview
:ComboboxFormDemo
#code

```vue
<form @submit.prevent="onSubmit">
  <FluereCombobox v-model="shipping" :items="SHIPPING" name="shipping" header="配送方式" />
  <FluereButton type="submit" appearance="primary">提交</FluereButton>
</form>
```

::

## API

| Prop (Props)              | Type                            | Default       | Description                                                                                 |
| ------------------------- | ------------------------------- | ------------- | ------------------------------------------------------------------------------------------- |
| `modelValue`              | `unknown \| null`               | `—`           | Current selected value (`v-model`); `null` means nothing is selected (WinUI `SelectedItem`) |
| `defaultValue`            | `unknown \| null`               | `null`        | Uncontrolled initial selected value                                                         |
| `items`                   | `FluereComboboxItem[]`          | `[]`          | Option data (WinUI `ItemsSource`): `{ value, text?, disabled? }`                            |
| `open`                    | `boolean`                       | `—`           | Panel open state (`v-model:open`, WinUI `IsDropDownOpen`)                                   |
| `defaultOpen`             | `boolean`                       | `false`       | Uncontrolled initial open state                                                             |
| `disabled`                | `boolean`                       | `false`       | Whether the control is disabled (WinUI `IsEnabled`)                                         |
| `editable`                | `boolean`                       | `false`       | Editable state (WinUI `IsEditable`)                                                         |
| `text`                    | `string`                        | `—`           | Editable-state text (`v-model:text`, WinUI `Text`)                                          |
| `defaultText`             | `string`                        | `''`          | Uncontrolled initial text in editable state                                                 |
| `placeholder`             | `string`                        | `—`           | Placeholder (WinUI `PlaceholderText`), shown only when nothing is selected                  |
| `header`                  | `string`                        | `—`           | Top title (WinUI `Header`), also the default accessible name                                |
| `label`                   | `string`                        | `—`           | Accessible name (takes precedence over `header`)                                            |
| `description`             | `string`                        | `—`           | Description below the control (WinUI `Description`), also used as `aria-describedby`        |
| `name`                    | `string`                        | `—`           | Form submission name, paired with the hidden native input                                   |
| `by`                      | `string \| ((a, b) => boolean)` | `—`           | Item-identity comparison for object items                                                   |
| `maxDropDownHeight`       | `number`                        | `504`         | Maximum panel height (WinUI `MaxDropDownHeight`)                                            |
| `textSearchEnabled`       | `boolean`                       | `true`        | Whether prefix search is enabled (WinUI `IsTextSearchEnabled`)                              |
| `selectionChangedTrigger` | `'committed' \| 'always'`       | `'committed'` | Commit timing (WinUI `SelectionChangedTrigger`)                                             |
| `dir`                     | `'ltr' \| 'rtl'`                | `—`           | Reading direction                                                                           |

| Event               | Payload                                                | Description                                           |
| ------------------- | ------------------------------------------------------ | ----------------------------------------------------- |
| `update:modelValue` | `unknown \| null`                                      | Selected value change (`v-model`)                     |
| `update:open`       | `boolean`                                              | Panel open state change (`v-model:open`)              |
| `update:text`       | `string`                                               | Editable-state text change (`v-model:text`)           |
| `selectionChanged`  | `{ addedItem, removedItem, addedIndex, removedIndex }` | Corresponds to WinUI `SelectionChanged`               |
| `dropDownOpened`    | —                                                      | Corresponds to WinUI `DropDownOpened`                 |
| `dropDownClosed`    | —                                                      | Corresponds to WinUI `DropDownClosed`                 |
| `textSubmitted`     | `{ text: string, handled: boolean }`                   | Corresponds to WinUI `TextSubmitted` (editable state) |

| Slot (Slots)  | Description                                                                                               |
| ------------- | --------------------------------------------------------------------------------------------------------- |
| `item`        | Dropdown item content (`{ item, index }`), corresponds to WinUI `ItemTemplate`                            |
| `header`      | Top title row (WinUI `Header` / `HeaderTemplate`)                                                         |
| `description` | Description below the control (WinUI `Description`)                                                       |
| `empty`       | Content when there are no options (WinUI has no empty-state text; if not provided an empty panel renders) |

> Accessibility: the input box carries `role="combobox"`, `aria-expanded` / `aria-controls` / `aria-activedescendant`; the non-editable state adds `readonly` and `aria-autocomplete="none"`, while the editable state uses `aria-autocomplete="list"`; dropdown items are `role="option"` + `aria-selected`, and disabled items carry `aria-disabled`. Focus stays on the control (`TabNavigation="Once"` semantics); dropdown items never enter the Tab sequence.

> Differences from WinUI (all are web-side approximations, recorded line by line):
>
> 1. **Acrylic surface**: the Fluent token set has no material tokens, so the popup approximates the surface with `colorNeutralBackground1` + `shadow16` (same as the compact NumberBox popup); the blur recipe of `AcrylicInAppFillColorDefaultBrush` is not reproduced.
> 2. **Popup open animation**: a `clip-path` that expands from the **horizontal midline of the selected item toward both the top and the bottom** approximates `SplitOpenThemeAnimation` (when nothing is selected it hugs the trigger-control side; 250ms / `0,0,0,1`) — the panel first collapses into a thin slit, then plays only after the measured selected-item position is written into a CSS variable; **the close animation is omitted** — reka's `Presence` unmounts content immediately in order to keep `aria-hidden` semantics correct.
> 3. **Arrow pressed state**: the WinUI 3 Gallery arrow press is **a slight press-down (not a flip)**, approximated here with `translateY(1px)` (in via `durationFast` / back via `durationNormal`).
> 4. **Focus rectangle**: WinUI uses `FocusStrokeColorOuter` (light `#E4000000` / white in dark), which maps to `colorStrokeFocus2` in the token set; the other controls of the component library currently use `colorCompoundBrandStroke`, while this component takes its color from the WinUI source. The focus rectangle and the 3×16 brand-color indicator bar appear only for keyboard / programmatic focus (corresponding to the distinction between WinUI `Focused` and `PointerFocused`).
> 5. **`PageUp` / `PageDown`**: WinUI moves the highlight by page while expanded; here the keys are only swallowed (to prevent page scrolling), without moving the highlight.
> 6. **An item `value` cannot be an empty string**: the reka foundation uses it to mean "clear the selection", so `value: ''` is rejected (WinUI has no such restriction); use `null` or a sentinel value when empty-string semantics are needed.
> 7. When text is too long, the input box truncates it with an ellipsis (WinUI just clips it).
