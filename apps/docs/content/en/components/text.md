---
title: Text
description: A style-only text component with the nine-step Windows type ramp (Caption → Display); sizes, line heights, weights, trimming and alignment align with WinUI 3 TextBlock.
nav:
  title: Text
---

# Text

`FluereText` is a **style-only component**: no interaction, state machine or motion. It turns the nine text styles of WinUI 3 (the Windows type ramp) into a closed `variant` set. It covers three things at once:

- **Size / line height / weight**: each of the nine steps maps to a `*TextBlockStyle` in `TextBlock_themeresources.xaml` (Caption / Body / BodyStrong / BodyLarge / BodyLargeStrong / Subtitle / Title / TitleLarge / Display);
- **Semantic element**: `as` renders a `span` (default) / `p` / `h1` / `strong` or any component;
- **Typesetting tweaks**: `truncate` is the Web single-line mapping of `TextTrimming=CharacterEllipsis`, and `align` corresponds to `TextBlock.TextAlignment`.

```vue
<FluereText variant="title">Settings</FluereText>
<FluereText as="p">Body copy uses the body step, 14 / line height 20.</FluereText>
<FluereText variant="caption" truncate>
  Long single-line text is trimmed with an ellipsis when the container is too narrow
</FluereText>
```

Specification source: `src/controls/dev/CommonStyles/TextBlock_themeresources.xaml` in `microsoft-ui-xaml` tag `winui3/release/2.5.1` (commit `ba3a8d5`). After normalizing BOM / CRLF, that file is **byte-for-byte identical** to the same file in tag `winui3/release/2.0.1` — the WindowsAppSDK version used by WinUI3 Gallery v2.9.3 — so the local snapshot is the behavioral baseline for Gallery.

## The nine-step Windows type ramp

`variant` is a closed set and does not accept arbitrary sizes / line heights (see "API differences from WinUI"). Each step corresponds to one `*TextBlockStyle`: sizes and weights come from the A-tier XAML, while the line heights are the documented effective line heights (12/16 … 68/92 epx) — see "Implementation notes" for their source and how they are expressed.

| Example           | Variable Font     | Size / Line height | WinUI Style                     | Our token                                                                |
| ----------------- | ----------------- | ------------------ | ------------------------------- | ------------------------------------------------------------------------ |
| Caption           | Small, Regular    | 12/16 epx          | `CaptionTextBlockStyle`         | `fontSizeBase200` / `lineHeightBase200` / `fontWeightRegular`            |
| Body              | Text, Regular     | 14/20 epx          | `BodyTextBlockStyle`            | `fontSizeBase300` / `lineHeightBase300` / `fontWeightRegular`            |
| Body Strong       | Text, SemiBold    | 14/20 epx          | `BodyStrongTextBlockStyle`      | `fontSizeBase300` / `lineHeightBase300` / `fontWeightSemibold`           |
| Body Large        | Text, Regular     | 18/24 epx          | `BodyLargeTextBlockStyle`       | component-local variables 18px / 24px (no 18/24 tier in the token table) |
| Body Large Strong | Text, SemiBold    | 18/24 epx          | `BodyLargeStrongTextBlockStyle` | same as above + `fontWeightSemibold`                                     |
| Subtitle          | Display, SemiBold | 20/28 epx          | `SubtitleTextBlockStyle`        | `fontSizeBase500` / `lineHeightBase500` / `fontWeightSemibold`           |
| Title             | Display, SemiBold | 28/36 epx          | `TitleTextBlockStyle`           | `fontSizeHero700` / `lineHeightHero700` / `fontWeightSemibold`           |
| Title Large       | Display, SemiBold | 40/52 epx          | `TitleLargeTextBlockStyle`      | `fontSizeHero900` / `lineHeightHero900` / `fontWeightSemibold`           |
| Display           | Display, SemiBold | 68/92 epx          | `DisplayTextBlockStyle`         | `fontSizeHero1000` / `lineHeightHero1000` / `fontWeightSemibold`         |

::demo-block{title="The nine-step type ramp (aligned with Gallery TypographyPage)"}
#preview
:TextRampDemo
#code

```vue
<FluereText variant="caption">Caption</FluereText>
<FluereText variant="body">Body</FluereText>
<FluereText variant="bodyStrong">Body Strong</FluereText>
<FluereText variant="bodyLarge">Body Large</FluereText>
<FluereText variant="bodyLargeStrong">Body Large Strong</FluereText>
<FluereText variant="subtitle">Subtitle</FluereText>
<FluereText variant="title">Title</FluereText>
<FluereText variant="titleLarge">Title Large</FluereText>
<FluereText variant="display">Display</FluereText>
```

::

## Semantic element, alignment and trimming

- `as` changes only the element, not the visuals: common combinations are `titleLarge` + `as="h1"`, `subtitle` + `as="h2"`, `body` + `as="p"` and `caption` + `as="span"`. `TextBlock` is a block-level control in XAML, while this component defaults to an inline `span` so it can sit inside buttons / labels / paragraphs; pass `as` explicitly when block-level semantics are needed.
- `align` corresponds to `TextBlock.TextAlignment`: `start` / `center` / `end` / `justify`. Web's `text-align` is inherited, so when `align` is omitted the component emits no alignment class and follows the parent; WinUI's `TextAlignment` defaults to Left and is not inherited — pass `align="start"` explicitly to match it.
- `truncate` emits single-line `nowrap + text-overflow: ellipsis` and explicitly `display: block` (`text-overflow` only applies to block-level boxes). Whether an ellipsis appears depends on the outer container constraining the width — the same precondition as XAML, where `TextBlock` must be constrained for `TextTrimming` to take effect.
- Secondary foreground is overridden in one line via `--fui-text-foreground`; no extra Prop is added (WinUI's `TextBlock` has no color enum either).

::demo-block{title="as / align / truncate / foreground override"}
#preview
:TextUsageDemo
#code

```vue
<FluereText as="h1" variant="titleLarge">Page title</FluereText>
<FluereText as="h2" variant="subtitle">Section title</FluereText>
<FluereText as="p" variant="body">Body paragraph.</FluereText>

<FluereText as="p" align="center">Centered</FluereText>
<FluereText as="p" align="justify">A long justified paragraph…</FluereText>

<div class="w-60">
  <FluereText truncate>Long text is trimmed with an ellipsis</FluereText>
</div>

<FluereText class="secondary">
  Secondary foreground (--fui-text-foreground overridden to colorNeutralForeground3)
</FluereText>
```

::

## API

| Props      | Type                                                                                                                            | Default  | Description                                                                                                                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `variant`  | `'caption' \| 'body' \| 'bodyStrong' \| 'bodyLarge' \| 'bodyLargeStrong' \| 'subtitle' \| 'title' \| 'titleLarge' \| 'display'` | `'body'` | One of the nine text styles, mapping to WinUI `*TextBlockStyle`; also emits `data-variant` and the `.fui-text--{variant}` class                                                                     |
| `as`       | `string \| Component`                                                                                                           | `'span'` | Element or component to render; pass semantic tags such as `p` / `h1` / `strong` here                                                                                                               |
| `truncate` | `boolean`                                                                                                                       | `false`  | Single-line trimming (Web mapping of `TextTrimming=CharacterEllipsis`), also sets `display: block`                                                                                                  |
| `align`    | `'start' \| 'center' \| 'end' \| 'justify'`                                                                                     | —        | Text alignment (corresponds to `TextBlock.TextAlignment`); when omitted it follows the parent's `text-align` (Web `text-align` is inherited); pass `start` explicitly to match WinUI's default Left |

| Slots     | Description                                         |
| --------- | --------------------------------------------------- |
| `default` | Text content (corresponds to WinUI `Text` property) |

### Overridable CSS local variables

| Local variable                      | Default                                      | Description                                                                                                           |
| ----------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `--fui-text-foreground`             | `var(--colorNeutralForeground1)`             | Foreground; maps `TextFillColorPrimaryBrush`; consumers override to `colorNeutralForeground3` etc. for secondary text |
| `--fui-text-font-family`            | `'Segoe UI Variable', var(--fontFamilyBase)` | Where `XamlAutoFontFamily` lands on WinUI 3; falls back to the token font stack on non-Windows platforms              |
| `--fui-text-body-large-font-size`   | `18px`                                       | Font size for the two Body Large steps; the token table has no equal 18px tier, hence a local variable                |
| `--fui-text-body-large-line-height` | `24px`                                       | Line height for the two Body Large steps; the token table has no equal 24px tier                                      |

```css
.secondary {
  --fui-text-foreground: var(--colorNeutralForeground3);
}
```

## Implementation notes

- **Evidence source (A-tier)**: `src/controls/dev/CommonStyles/TextBlock_themeresources.xaml` in `microsoft-ui-xaml` tag `winui3/release/2.5.1` (commit `ba3a8d5`). That file is byte-for-byte identical to the same file in tag `winui3/release/2.0.1` (the WindowsAppSDK version used by WinUI3 Gallery v2.9.3) after a normalized diff, so the default values of the nine `*TextBlockStyle` sets can serve directly as Gallery's behavioral baseline.
- **`BaseTextBlockStyle` defaults**: `FontFamily=XamlAutoFontFamily`, `FontSize=14`, `FontWeight=SemiBold`, `TextTrimming=CharacterEllipsis`, `TextWrapping=Wrap`, `LineStackingStrategy=MaxHeight`, `TextLineBounds=Full`; the nine steps override only `FontSize` / `FontWeight` (six steps — Body Large / Body Large Strong / Subtitle / Title / Title Large / Display — additionally set `OpticalMarginAlignment=TrimSideBearings`).
- **Line heights are not in the XAML**: `TextBlock_themeresources.xaml` contains no `LineHeight` Setter at all; 12/16 … 68/92 are the documented effective line heights, taken from the nine `SizeLineHeight` strings of the `TypographyControl`s in WinUI3 Gallery v2.9.3 `WinUIGallery/Samples/Typography/TypographyPage.xaml`, plus Microsoft's "Typography in Windows" type-ramp table. The Web must pin line heights explicitly, otherwise they drift with the fallback font's metrics, so every step sets `line-height`.
- **Body Large's 18 / 24 has no equal-valued token**: the Fluent 2 Web token table (`packages/designs/data/fluent-tokens.json`) has no 18px / 24px tier (`fontSizeBase350` does not exist; body2 is 16/22). This is not an equal-value mapping: both steps use the component-local variables `--fui-text-body-large-font-size` / `--fui-text-body-large-line-height`, overridable in one line.
- **Font and optical sizing**: WinUI 3's `XamlAutoFontFamily` lands on Segoe UI Variable (A-tier corroboration: `c_strUltimateFallbackFontNameCobaltStorage = "Segoe UI Variable"` in `src/dxaml/xcp/core/inc/FontAndScriptServices.h`). Microsoft's "Typography in Windows" states that the opsz optical-size axis is automatic, but when using HTML the CSS must specify Segoe UI Variable explicitly. The root therefore declares `--fui-text-font-family: 'Segoe UI Variable', var(--fontFamilyBase)` and sets `font-optical-sizing: auto` (the browser default is already auto; it is written out to pin the spec).
- **Foreground and secondary foreground**: the default `TextBlock` foreground is `TextFillColorPrimaryBrush` (`#E4000000` / `#FFFFFF`) → `colorNeutralForeground1` (the repository's existing mapping). The secondary text in the reference image's header corresponds to `TextFillColorSecondary` (`#9E000000`, composited on white to `#616161` = `colorNeutralForeground3`); the demo overrides it via `--fui-text-foreground: var(--colorNeutralForeground3)` without adding a Prop.
- **Web mappings for `truncate` / `align`**: `truncate` expresses `CharacterEllipsis` with single-line `nowrap + text-overflow: ellipsis` and explicitly `display: block` (`text-overflow` only applies to block-level boxes); `align` uses the logical values `start` / `end` to express the Left / Right values of `TextAlignment`.

### Browser verification

Contract tests assert the declarations in the SFC (jsdom does not resolve `var()`); in addition, Playwright + `getComputedStyle` measured the nine steps in a real browser on the docs site: computed size / line height / weight are 12/16/400, 14/20/400, 14/20/600, 18/24/400, 18/24/600, 20/28/600, 28/36/600, 40/52/600 and 68/92/600, with a font stack starting with `Segoe UI Variable`; the header secondary foreground is `#616161`, the dark foreground is `#FFFFFF`, `truncate` really produces an ellipsis (`scrollWidth > clientWidth`), and the compiled English headers render — 73 assertions in total. This style-only component has no focus, state or motion, so it has no `prefers-reduced-motion` branch.

### Known gaps (explicitly not aligned)

- **`OpticalMarginAlignment=TrimSideBearings` has no CSS equivalent** (`text-box-trim` is still not a stable standard), so the component does not emulate it; the impact is only a minor difference in the side bearings at the start / end of lines, not in size, line height or weight.
- **`TextAlignment` default difference**: WinUI's `TextBlock.TextAlignment` defaults to Left and is not inherited, while Web `text-align` is inherited; when `align` is omitted the component emits no alignment class and follows the parent. Pass `align="start"` explicitly to match WinUI's default.
- **`TextLineBounds=Full` / `LineStackingStrategy=MaxHeight` line-box semantics** are approximated by the explicit `line-height`, not reproduced property by property.
- **High-contrast themes**: under WinUI HC every `TextFillColor*` resolves to `SystemColorWindowTextColor`; on the Web the foreground uses tokens and the browser's forced-colors mode takes over text color, so no separate HC branch is implemented.
- **Block vs inline**: `TextBlock` is a block-level control, while this component defaults to an inline `span` (so it can sit inside buttons / labels / paragraphs); pass `as="p"` / `as="h1"` explicitly when block-level semantics are needed. This is an intentional Web-oriented difference.

## API differences from WinUI

| WinUI `TextBlock`                        | This library                                                        |
| ---------------------------------------- | ------------------------------------------------------------------- |
| `Text` property                          | Default slot                                                        |
| `Foreground`                             | `--fui-text-foreground` local variable (no extra Prop)              |
| `TextAlignment`                          | `align` Prop                                                        |
| `TextTrimming`                           | `truncate` Prop                                                     |
| `FontFamily` / `FontSize` / `LineHeight` | Not exposed (the nine styles are a closed set decided by `variant`) |
| `FontWeight`                             | Not exposed separately; fixed by `variant`                          |
| `OpticalMarginAlignment`                 | Not implemented (no CSS equivalent; see "Known gaps")               |

> A style-only component has no focus, state, motion or `prefers-reduced-motion` concerns; `variant` / `truncate` / `align` only emit class names, so consumers can override via `.fui-text--*` or the local variables.
