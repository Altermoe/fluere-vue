---
title: Info Badge
description: Non-intrusive small badge with three states — dot / value / icon — and five Severity background tiers; geometry and colors restyle WinUI 3 InfoBadge.
nav:
  title: Info Badge
---

# Info Badge

Info Badge **non-intrusively** signals "there is new content / unread count / something to notice" within an app; typical placements are NavigationView menu items, a corner of a button, or the end of a list item (WinUI official description: _badging is a non-intrusive and intuitive way to display notifications or bring focus to an area within an app_).

The styling and geometry align with the WinUI 3 / Windows App SDK InfoBadge (`microsoft-ui-xaml`, whose `InfoBadge` directory is **byte-for-byte identical** between `winui3/release/2.0.1` — the WindowsAppSDK version used by the latest WinUI3 Gallery release v2.9.3 — and `winui3/release/2.5.1`):

- **Geometry**: min 4×4 (`InfoBadgeMinWidth` / `InfoBadgeMinHeight`), max height 16 (`InfoBadgeMaxHeight`), **unlimited width**, corner radius = half the actual height (`InfoBadge.cpp#OnSizeChanged`).
- **Forms**: `Value >= 0` shows a number (11px, `InfoBadgeValueFontSize`); otherwise, if there is an `IconSource`, it shows the icon; otherwise it is a 4×4 dot.
- **Square rule**: `InfoBadge.cpp#MeasureOverride` returns a square when "width < height", so a single-number badge is a **perfect circle** rather than a narrow capsule.
- **Icon frame**: the `Viewbox` is filled to "max height − padding" = 8px (the two `InfoBadgeIconWidth` / `InfoBadgeIconHeight` resources in the template are **not referenced by the template** — they are dead resources).

## Three forms: Dot / Value / Icon

The combination of the `value` and `icon` Props determines the form, derived line-by-line in alignment with `InfoBadge.cpp#OnDisplayKindPropertiesChanged` (**Value takes precedence over Icon**):

| Condition                    | Form    | Corresponding WinUI              |
| ---------------------------- | ------- | -------------------------------- |
| `value >= 0`                 | `value` | `Value` visual state             |
| has `icon` (or `#icon` slot) | `icon`  | `Icon` / `FontIcon` visual state |
| neither                      | `dot`   | `Dot` visual state (empty state) |

::demo-block{title="Dot / Value / Icon three states"}
#preview
:InfoBadgeKindsDemo
#code

```vue
<FluereInfoBadge />
<FluereInfoBadge :value="5" />
<FluereInfoBadge severity="attention" icon />
<FluereInfoBadge :icon="FluentIconAdd16Filled" />
```

::

## Five Severity tiers

`severity` corresponds to the Style keys in `InfoBadge_themeresources.xaml`: each tier has `Dot` / `Value` / `Icon` variants with **exactly the same background**, differing only in "whether an `IconSource` is preset" and "whether the icon state adds `Padding=0,4,0,2`" (the latter is geometrically equivalent to `IconInfoBadgeIconMargin` in the icon state — see "Implementation notes").

| `severity`         | WinUI Style prefix         | Background resource                |
| ------------------ | -------------------------- | ---------------------------------- |
| `accent` (default) | `DefaultInfoBadgeStyle`    | `AccentFillColorDefaultBrush`      |
| `attention`        | `Attention*InfoBadgeStyle` | `SystemFillColorAttentionBrush`    |
| `informational`    | `Informational*…`          | `SystemFillColorSolidNeutralBrush` |
| `success`          | `Success*…`                | `SystemFillColorSuccessBrush`      |
| `caution`          | `Caution*…`                | `SystemFillColorCautionBrush`      |
| `critical`         | `Critical*…`               | `SystemFillColorCriticalBrush`     |

::demo-block{title="Different Severity × three forms (aligned with Gallery example 2)"}
#preview
:InfoBadgeStylesDemo
#code

```vue
<FluereInfoBadge :severity="severity" icon />
<FluereInfoBadge :severity="severity" :value="10" />
<FluereInfoBadge :severity="severity" />
```

::

## Embedded in NavigationView / other controls

The badge's most common placements are navigation items and control corners. The badge itself is a **purely decorative element**, and the accessible name should hang on the control hosting it (Gallery does this: `AutomationProperties.Name="Inbox, 5 notifications"`).

::demo-block{title="Embedded in a NavigationView navigation item (aligned with Gallery example 1)"}
#preview
:InfoBadgeNavigationDemo
#code

```vue
<NavigationViewItem Content="Inbox" Icon="Mail" AutomationProperties.Name="Inbox, 5 notifications">
  <NavigationViewItem.InfoBadge>
    <InfoBadge Value="5" />
  </NavigationViewItem.InfoBadge>
</NavigationViewItem>
```

::

::demo-block{title="Overlaid on a button corner (aligned with Gallery example 3)"}
#preview
:InfoBadgeOverlayDemo
#code

```vue
<FluereButton icon-only :icon="FluentIconArrowSync20Regular" aria-label="Refresh required" />
<FluereInfoBadge severity="critical" :icon="FluentIconImportant16Filled" />
```

::

## Dynamic value

`value` is reactive: `>= 0` shows the number, `< 0` falls back to the dot form (WinUI's `Value` defaults to `-1`).

::demo-block{title="NumberBox driving InfoBadge.Value (aligned with Gallery example 4)"}
#preview
:InfoBadgeDynamicDemo
#code

```vue
<FluereInfoBadge :value="value ?? -1" />
<FluereNumberBox
  v-model="value"
  header="InfoBadge Value"
  :min="-1"
  spin-button-placement-mode="inline"
/>
```

::

## API

| Props          | Type                                                                                 | Default    | Description                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------ |
| `value`        | `number`                                                                             | `-1`       | Badge value (`Int32`); `>= 0` shows a number, `< 0` falls back to icon / dot; aligned with WinUI `Value`           |
| `severity`     | `'accent' \| 'attention' \| 'informational' \| 'success' \| 'caution' \| 'critical'` | `'accent'` | Background preset; aligned with the six `*InfoBadgeStyle` sets                                                     |
| `icon`         | `boolean \| Component \| null`                                                       | `—`        | Icon; `true` uses `severity`'s built-in glyph, or pass an icon component directly; aligned with WinUI `IconSource` |
| `borderRadius` | `string`                                                                             | `—`        | Corner radius; when omitted, aligned with `OnSizeChanged`'s `ActualHeight / 2` (fully rounded)                     |
| `label`        | `string`                                                                             | `—`        | Accessible name; when omitted the whole badge is `aria-hidden` (aligned with "InfoBadge has no AutomationPeer")    |

| Slots  | Description                                                                                                                 |
| ------ | --------------------------------------------------------------------------------------------------------------------------- |
| `icon` | Corresponds to WinUI `IconSource`; when provided, enters the Icon form and overrides the `icon` Prop and the built-in glyph |

> **Accessibility**: WinUI's InfoBadge has **no `AutomationPeer`** (`Control.OnCreateAutomationPeer` is not overridden, so it does not appear in the UIA tree); Gallery therefore hangs the accessible name on the parent `NavigationViewItem`. This component renders `aria-hidden="true"` by default, does not take the tab order and does not intercept pointers; `role="img"` + `aria-label` is rendered only when a `label` is explicitly passed (standalone usage). The component does not hardcode any natural language.
>
> **Implementation notes**
>
> - **The form is derived live, not a `variant` enum**: in `InfoBadge.cpp#OnDisplayKindPropertiesChanged`, `Value >= 0` → `Value` state, otherwise `IconSource != null` → `FontIcon` / `Icon` state, otherwise `Dot` state. This component's `displayKind` computed corresponds to it word for word (including "Value takes precedence over Icon") and is exposed via `data-display-kind` for styling and test assertions.
> - **The two icon forms are geometrically equivalent**: in the template, the FontIcon state uses `InfoBadgePadding` (overridden to `0,4,0,2` by `*IconInfoBadgeStyle`) + `IconInfoBadgeFontIconMargin` (`4,0,4,2`), and the Icon state uses `InfoBadgePadding` (`0`) + `IconInfoBadgeIconMargin` (`4,4,4,4`) — both yield "top+bottom 4+4, left+right 4+4" and an 8px `Viewbox` height, so this library expresses both with a single "8px icon frame + 4px margin" rule and no longer needs a `padding` Prop.
> - **`MeasureOverride`'s square rule is expressed in CSS**: the final heights of the Value / Icon states are both clamped to 16 by `InfoBadgeMaxHeight`, so "square when width < height" is equivalent to adding a `min-inline-size: 16px` to each of those two states; the Dot state's height is `InfoBadgeMinHeight` (4, equal to `MinWidth`) and is unaffected.
> - **The value line height is locked to `lineHeightBase100` (14px)**: 14 + `ValueInfoBadgeTextMargin`'s bottom margin 2 = 16 = `InfoBadgeMaxHeight`, matching the result in WinUI where the `TextBlock`'s natural line height (≈14.67px) is clamped to 16 by `MaxHeight`, and it does not drift with Web font metrics; the "the text's visual center is 1px above the badge's center" caused by the vertically asymmetric `4,0,4,2` margin is also preserved.
> - **`InfoBadgeIconWidth` / `InfoBadgeIconHeight` are not implemented**: these two resources (12 / 8, and 12 / 9 under Light and HC themes) are **not referenced** in `InfoBadge.xaml`'s template — the actual icon size is determined by the `Viewbox` filling the available height. Dead resources are not written into code, to avoid "restoring" according to them next time.
> - **The five background tiers share one mapping with InfoBar**: `SystemFillColor{Attention,Success,Caution,Critical}Brush` are the **same resources** as InfoBar's `InfoBar*SeverityIconBackground`, so it reuses `colorCompoundBrandBackground` / `colorStatusSuccessForeground3` / `colorPaletteYellowForeground1` / `colorStatusDangerForeground3`; `informational`'s `SystemFillColorSolidNeutralBrush` has no equal-valued entry in Fluent 2 Web, so it takes `colorNeutralForeground4` by minimizing `max(light ΔE, dark ΔE)` (CIE ΔE76; `temp/pw-infobadge.mjs` re-checks by measurement):
>
>   | Severity      | WinUI original (Light / Dark)        | Our token                         | ΔE (Light / Dark) |
>   | ------------- | ------------------------------------ | --------------------------------- | ----------------- |
>   | accent        | system accent color                  | `colorCompoundBrandBackground`    | — (see below)     |
>   | attention     | system accent color (`…ColorLight2`) | `colorCompoundBrandBackground`    | — (see below)     |
>   | informational | `#8A8A8A` / `#9D9D9D`                | `colorNeutralForeground4`         | 10.2 / 1.5        |
>   | success       | `#0F7B0F` / `#6CCB5F`                | `colorStatusSuccessForeground3`   | 0.4 / 30.8        |
>   | caution       | `#9D5D00` / `#FCE100`                | `colorPaletteYellowForeground1`   | 26.5 / 23.0       |
>   | critical      | `#C42B1C` / `#FF99A4`                | `colorStatusDangerForeground3`    | 7.3 / 15.2        |
>   | foreground    | `#FFFFFF` / `#000000`                | `colorNeutralForegroundInverted2` | 0.0 / 14.2        |
>
>   **The accent colors are not in the repository** (the exception clause of style-spec §2): `AccentFillColorDefaultBrush` / `SystemFillColorAttentionBrush` are both injected at runtime by the system accent color, and the blue in the real control and screenshots may be the user's custom color, so both take the Fluent default accent token, making `accent` and `attention` the same color on the Web — the semantic difference shows in the built-in glyph. `success`'s dark tier has a large ΔE (30.8), the cost of keeping the same mapping as InfoBar; override with the local variables below if you need strict alignment with the real control.
>
>   Both the six background tiers and the foreground leave override hooks (same approach as InfoBar):
>
>   ```css
>   .my-badge {
>     --fui-info-badge-bg: #dff6dd; /* e.g. SystemFillColorSuccess original value */
>     --fui-info-badge-fg: #ffffff;
>   }
>   ```
>
> - **The five built-in glyphs are all "bare glyphs", chosen by their shape**: rendering the official Segoe Fluent Icons font at the real size (16px circle base + 8px glyph frame) and comparing (script `temp/infobadge-visual/glyph-badge-compare.mjs`) confirms that the five glyphs preset by `*IconInfoBadgeStyle` are all **without a circle base** — the circle base is provided by the badge body. This is critical: InfoBar uses **two stacked glyphs**, `F136` (solid circle) + `F13F` (i), while `InformationalIconInfoBadgeStyle` gives only the single `F13F` glyph, **so the InfoBar circular icon cannot be copied**.
>
>   | Severity        | WinUI `IconSource`                  | Segoe glyph               | Our icon                  |
>   | --------------- | ----------------------------------- | ------------------------- | ------------------------- |
>   | `attention`     | `FontIconSource Glyph=&#xEA38;`     | `Asterisk` (8-point star) | `text_asterisk_16_filled` |
>   | `informational` | `FontIconSource Glyph=&#xF13F;`     | bare `i`                  | `info_16_regular`         |
>   | `success`       | `SymbolIconSource Symbol=Accept`    | `E8FB` bare check         | `checkmark_16_filled`     |
>   | `caution`       | `SymbolIconSource Symbol=Important` | `E171` bare exclamation   | `important_16_filled`     |
>   | `critical`      | `SymbolIconSource Symbol=Cancel`    | `E711` bare cross         | `dismiss_16_filled`       |
>
>   Known deviation: Fluent System Icons has **no bare glyph `i`** (an automatic scan over all 1,729 16px filled icons for "narrow bounding box + exactly two connected components + smaller upper component" returned an empty shortlist; see `temp/infobadge-visual/find-bare-i.mjs`). `info_16_filled` is a "solid circle + cut-out i", so placing it directly yields a **white disc + badge-colored i** (foreground / background relationship inverted from WinUI; measured ink coverage 78% vs 22% for ours); `info_16_regular` is the same `i` (its subpaths are geometrically identical to the filled's cut-out i) with an extra 1-unit-wide white ring around it, and the `i` is still a white foreground — the only deviation is one extra thin ring, hence `regular` was chosen. Use the `#icon` slot to swap in a hand-drawn glyph when exact matching is required.
>
>   **Ink-size measurements** (`temp/pw-infobadge.mjs`, section 3): on the WinUI side, the official Segoe Fluent Icons font is used to measure the glyph ink and line box, converted to 1× size by "the `Viewbox` scales the **line box** (= 1em) to the 8px icon frame" (script `temp/infobadge-visual/measure-segoe-ink.mjs`); on our side, the pixels differing from the background are counted on 1:1 element screenshots to get the bounding box.
>
>   | Severity        | Our icon ink (1x)   | WinUI 1x ink     | Δ                    |
>   | --------------- | ------------------- | ---------------- | -------------------- |
>   | `attention`     | 6×6                 | 7.0×7.0          | −1.0                 |
>   | `success`       | 6×5                 | 8.0×5.5          | −2.0 / −0.5          |
>   | `caution`       | 2×6                 | 3.0×8.0          | −1.0 / −2.0          |
>   | `critical`      | 6×6                 | 5.5×5.5          | +0.5                 |
>   | `informational` | 8×8 (thin ring + i) | 0.8×3.3 (bare i) | structural deviation |
>
>   The first four tiers differ by 1–2px, originating in the two icon sets' **different design whitespace**: Fluent System Icons' 16px glyph ink occupies about 12/16 of the bounding box, while Segoe's symbol glyphs nearly fill the em box; **the icon-frame mapping itself is correct** (Fluent's `viewBox` ↔ Segoe's em box, both scaled by `Viewbox`). The `informational` row is the structural deviation described above — WinUI's `F13F` is a 0.8px-wide thin `i` (almost invisible at 1×), and since this library can't find a bare `i` in the official icon set, it falls back to "thin ring + i".
>
> - **Reference-image cross-validation** (C-tier evidence, comparing only scale-independent quantities): in the Gallery screenshots the accent badge heights are all **16px**, the `Different InfoBadge Styles` row is **16×16 (Icon) / 19×16 (Value "10") / 4×16 (Dot)**, and the "5" value badge in the NavigationView is a **16×16 perfect circle** — each coincides with `InfoBadgeMaxHeight=16`, `MeasureOverride`'s square rule, and `InfoBadgeMinWidth/Height=4` (see `temp/pw-infobadge.mjs` section 4 and the screenshots under `temp/visual-infobadge/`). The only difference is that the Value capsule is about 3px wider than the real control (aspect ratio 1.38 vs 1.19), from Web font metrics (Segoe UI vs Segoe UI Variable).
> - **Known gaps**: high-contrast themes are not implemented (under WinUI HC the background is `SystemControlHighlightAccentBrush` and the foreground `SystemControlHighlightAltChromeWhiteBrush`); the two dead resources `InfoBadgeIconWidth / Height` are not implemented. The component has no Storyboard / VisualTransition, so motion and `prefers-reduced-motion` are not involved.
> - **API differences from WinUI**: WinUI throws `hresult_out_of_bounds` when `Value < -1`; this library treats it as `< 0` (falling back to Dot) and does not throw during rendering; `IconSource` → `icon` Prop / `#icon` slot; `TemplateSettings` is not exposed.
