---
title: Input
description: Input component, used to capture user text input, with support for header / description, multiline, and password forms.
nav:
  title: Input
---

# Input

The input allows users to enter single-line or multi-line text. Its styling and behavior reproduce the WinUI 3 (Windows App SDK) **TextBox** and **PasswordBox**: the three-line template (header / control / description), the elevated stroke with bottom highlight, the password reveal button with the `Alt+F8` shortcut, and the mask character and password reveal modes are all checked against the source line by line.

The password form has two mask paths, and the trade-off is described in [Password Box](#密码框): **without `passwordChar`** it uses the native browser `type="password"` (keeping the "password field" semantics for password managers / IMEs / screen readers, with the mask glyph determined by the browser); **with `passwordChar`** it uses a "display buffer" mask (glyph-accurate, but the field is `type="text"` in masked state, so screen readers and password managers no longer recognize it as a password field).

## Basic usage

Bind a string value with `v-model`; events and native attributes (`autocomplete`, `maxlength`, `aria-describedby`…) pass through directly to the internal `<input>` / `<textarea>`.

::demo-block{title="Basic usage"}
#preview
:InputBasicDemo
#code

```vue
<FluereInput v-model="value" placeholder="请输入内容" />
<FluereInput placeholder="禁用状态" disabled />
```

::

## Sizes

`size` takes `small` (24px) / `medium` (32px, default) / `large` (40px). The WinUI TextBox only has the 32px tier; the size tiers are an extension of this library. The header and description font sizes follow the selected size tier.

::demo-block{title="Sizes"}
#preview
:InputSizeDemo
#code

```vue
<FluereInput size="small" placeholder="Small (24px)" />
<FluereInput size="medium" placeholder="Medium (32px)" />
<FluereInput size="large" placeholder="Large (40px)" />
```

::

## Appearance

`appearance` takes `outline` (default, WinUI's "elevated stroke": light on top / left / right and heavy on the bottom edge) or `underline` (only the bottom edge remains; a library extension).

::demo-block{title="Appearance"}
#preview
:InputAppearanceDemo
#code

```vue
<FluereInput appearance="outline" placeholder="Outline（默认）" />
<FluereInput appearance="underline" placeholder="Underline（下划线）" />
```

::

## Header and description

`header` renders above the control (WinUI `TextBox.Header`, with an 8px bottom margin), and `description` renders below the control (`TextBox.Description`, with the foreground taken from `TextFillColorSecondary`). They respectively become the source of the input's `aria-labelledby` / `aria-describedby`, and can also be replaced with same-named slots; when consumers explicitly pass `aria-label` / `aria-describedby`, they are not overridden.

::demo-block{title="Header and description"}
#preview
:InputHeaderDemo
#code

```vue
<FluereInput v-model="displayName" header="显示名称" description="将展示在个人资料页" />
<FluereInput v-model="email" type="email" description="用于接收通知，不会公开">
  <template #header>邮箱 <span class="text-colorStatusDangerForeground1">*</span></template>
</FluereInput>
```

::

## Multiline text

`multiline` corresponds to WinUI `TextBox.AcceptsReturn = true` + `TextWrapping = Wrap` and renders a `<textarea>`: its height expands by `rows` (default 3), with the lower bound being the size tier height (WinUI `MinHeight` 32), and the bottom-right corner can be dragged to adjust the height.

::demo-block{title="Multiline text"}
#preview
:InputMultilineDemo
#code

```vue
<FluereInput v-model="note" multiline header="备注" description="缺省 3 行" />
<FluereInput v-model="feedback" multiline :rows="6" header="反馈" />
```

::

## Error state

`invalid` is a library extension (the WinUI TextBox has no built-in error state): it switches to the status-danger stroke and renders `aria-invalid`, and the bottom highlight also uses danger when focused.

::demo-block{title="Error state"}
#preview
:InputInvalidDemo
#code

```vue
<FluereInput invalid placeholder="错误输入" aria-describedby="input-error-hint" />
<p id="input-error-hint">请输入有效的内容。</p>
```

::

## Password box

`type="password"` corresponds to the WinUI **PasswordBox**:

- **Without `passwordChar`**: native `<input type="password">`. The mask glyph is determined by the browser (Chrome / Firefox draw `•`, while WinUI uses `●`) — this is an unavoidable difference on the Web, but in exchange password managers, autofill, IME composition, and the screen-reader "password field" role all keep working as normal.
- **With `passwordChar`** (the first code point is used when multiple characters are given): uses the "display buffer" mask, structurally isomorphic to WinUI handing the plaintext to the RichEdit password mode — the field contains the masked string, and the true value only lives in the component state, with each edit inferring the true value from the visible difference. The glyph matches the specified character exactly, at the cost that the field is `type="text"` in that state: **screen readers no longer treat it as a password field**, and the browser no longer offers password saving / filling.

::demo-block{title="Password box"}
#preview
:InputPasswordDemo
#code

```vue
<FluereInput v-model="simple" type="password" placeholder="请输入密码" />
<FluereInput
  v-model="custom"
  type="password"
  header="密码"
  placeholder="请输入密码"
  password-char="#"
/>
```

::

> **Copy interception (applies to both paths)**: in the masked state `copy` / `cut` / `dragstart` are all intercepted (the "Copy" entry in the context menu, `Ctrl+C` after selection, and dragging text all cannot retrieve the content), corresponding to WinUI's password mode offering no clipboard outlet and the text control's `TXTBIT_DISABLEDDRAG`. When the plaintext is shown (`peek` while held, or `visible`) copying is allowed — consistent with the "the eye-closed mode blocks copying" behavior.

> **Browser-measured differences between the two paths**: the native path (no `passwordChar`) is a `type="password"` control whose mask glyph is the browser's `•`; the display-buffer path (with `passwordChar`) is a `type="text"` control whose mask glyph is the specified character (the `#` in the example). The editing behavior of both paths has been verified item by item in a real browser: insert in the middle / backspace in the middle / replace selection / paste / `Ctrl+Z` undo / `Ctrl+Shift+Z` redo / the true value after select-all-and-delete all match the input (given the same mask glyph, the true value is inferred from the `beforeinput` edit range + `inputType`, not from glyph comparison).

## Reveal password

`passwordRevealMode` corresponds to WinUI `PasswordBox.PasswordRevealMode`:

| Value       | Behavior                                                                                                                                                                                                                                                                                                    |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `'peek'`    | **Default**. A "show" button appears on the right when focused + "empty → non-empty" during the current focus + the control width is wider than 5em; while **held**, the plaintext is shown and released immediately re-masks it. The keyboard equivalent is holding `Alt` + `F8` (releasing `F8` re-masks) |
| `'hidden'`  | Always masked, no button appears                                                                                                                                                                                                                                                                            |
| `'visible'` | Always shows plaintext, no button appears (the official sample uses a CheckBox to toggle between `hidden` / `visible`)                                                                                                                                                                                      |

A few details from the WinUI source (all guarded by contract tests): the button has `tabindex="-1"` (`IsTabStop=False`) and does not enter the Tab sequence; on focus the button is hidden first and only appears once content has been typed from empty during the current focus; the button does not appear when the control width is less than 5em (the `Minimum width … is 5em` in `ArrangeOverride`).

::demo-block{title="Reveal password"}
#preview
:InputPasswordRevealDemo
#code

```vue
<FluereInput
  v-model="password"
  type="password"
  aria-label="示例密码框"
  :password-reveal-mode="showPassword ? 'visible' : 'hidden'"
/>
<FluereCheckbox v-model="showPassword">Show password</FluereCheckbox>
```

::

## API

| Prop (Props)         | Type                                                                        | Default           | Description                                                                                                                                                               |
| -------------------- | --------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `modelValue`         | `string`                                                                    | `—`               | Input value (`v-model`)                                                                                                                                                   |
| `size`               | `'small' \| 'medium' \| 'large'`                                            | `'medium'`        | Size, with heights of 24 / 32 / 40 px respectively (WinUI default is 32)                                                                                                  |
| `appearance`         | `'outline' \| 'underline'`                                                  | `'outline'`       | Appearance; `outline` matches WinUI's "elevated stroke", `underline` is a library extension (only the bottom edge remains)                                                |
| `disabled`           | `boolean`                                                                   | `false`           | Whether the input is disabled                                                                                                                                             |
| `invalid`            | `boolean`                                                                   | `false`           | Invalid / error state; a library extension (the WinUI TextBox has no built-in error state), also renders `aria-invalid`                                                   |
| `type`               | `'text' \| 'password' \| 'email' \| 'number' \| 'search' \| 'tel' \| 'url'` | `'text'`          | Native `type` (ignored when `multiline` is true)                                                                                                                          |
| `placeholder`        | `string`                                                                    | `—`               | Placeholder                                                                                                                                                               |
| `header`             | `string`                                                                    | `—`               | Header, rendered above the control (WinUI `TextBox.Header`); also used as the accessible-name source                                                                      |
| `description`        | `string`                                                                    | `—`               | Description, rendered below the control (WinUI `TextBox.Description`), attached to `aria-describedby`                                                                     |
| `multiline`          | `boolean`                                                                   | `false`           | Multiline form (WinUI `AcceptsReturn` + `TextWrapping=Wrap`), renders a `<textarea>`                                                                                      |
| `rows`               | `number`                                                                    | `3`               | Number of multiline rows (only takes effect with `multiline`)                                                                                                             |
| `passwordRevealMode` | `'peek' \| 'hidden' \| 'visible'`                                           | `'peek'`          | Password reveal mode (WinUI `PasswordBox.PasswordRevealMode`, only takes effect with `type="password"`)                                                                   |
| `passwordChar`       | `string`                                                                    | `—`               | Mask character (WinUI `PasswordBox.PasswordChar`); without it the native `type="password"` is used, with it the display-buffer mask is used (see [Password Box](#密码框)) |
| `revealButtonLabel`  | `string`                                                                    | `'Show password'` | Accessible name of the "show" button (corresponds to the WinUI localized string `UIA_PASSWORDBOX_REVEAL`)                                                                 |

| Slot (Slots)  | Description                                          |
| ------------- | ---------------------------------------------------- |
| `header`      | Replaces the header content (WinUI `HeaderTemplate`) |
| `description` | Replaces the description content                     |

> **No extra Events**: `modelValue` / `update:modelValue` are provided by `v-model`; native events such as `input` / `change` / `focus` / `blur` / `keydown` and attributes such as `autocomplete`, `maxlength`, `aria-*` fall through directly to the internal `<input>` / `<textarea>`, so they can be passed as with a native field.

> **Two known Web-side differences** (both written into the component comments, not claimed as "aligned with real hardware"): ① with native `type="password"` the mask glyph is determined by the browser and WinUI's `●` cannot be specified; to specify a glyph you must use the display-buffer path (`passwordChar`), at the cost that screen readers / password managers no longer recognize the password field. ② With an explicit `passwordChar`, WinUI disables the IME in password mode (`InputScope = IS_PASSWORD`); the Web cannot disable the IME, so during IME composition `-webkit-text-security` is used to mask the plaintext, and the content is converged back into the masked string once composition ends.
