---
title: Button
description: Button component, used to trigger an action.
nav:
  title: Button
---

# Button

A button component used to trigger an action.

## Appearance variants

::demo-block{title="Appearance variants"}
#preview
:ButtonAppearanceDemo
#code

```vue
<FluereButton appearance="primary">Primary</FluereButton>
<FluereButton appearance="secondary">Secondary</FluereButton>
<FluereButton appearance="outline">Outline</FluereButton>
<FluereButton appearance="subtle">Subtle</FluereButton>
<FluereButton appearance="transparent">Transparent</FluereButton>
```

::

## Sizes

::demo-block{title="Sizes"}
#preview
:ButtonSizeDemo
#code

```vue
<FluereButton size="small">Small</FluereButton>
<FluereButton size="medium">Medium</FluereButton>
<FluereButton size="large">Large</FluereButton>
```

::

## Shape

::demo-block{title="Shape"}
#preview
:ButtonShapeDemo
#code

```vue
<FluereButton shape="rounded">Rounded</FluereButton>
<FluereButton shape="circular">Circular</FluereButton>
<FluereButton shape="square">Square</FluereButton>
```

::

## Disabled state

::demo-block{title="Disabled state"}
#preview
:ButtonDisabledDemo
#code

```vue
<FluereButton appearance="primary" disabled>Primary</FluereButton>
<FluereButton appearance="secondary" disabled>Secondary</FluereButton>
<FluereButton appearance="outline" disabled>Outline</FluereButton>
<FluereButton appearance="subtle" disabled>Subtle</FluereButton>
<FluereButton appearance="transparent" disabled>Transparent</FluereButton>
```

::

## Selected state (Toggle)

::demo-block{title="Selected state (Toggle)"}
#preview
:ButtonSelectedDemo
#code

```vue
<FluereButton appearance="primary" selected>Primary</FluereButton>
<FluereButton appearance="secondary" selected>Secondary</FluereButton>
<FluereButton appearance="outline" selected>Outline</FluereButton>
<FluereButton appearance="subtle" selected>Subtle</FluereButton>
<FluereButton appearance="transparent" selected>Transparent</FluereButton>
```

::

## Block button

::demo-block{title="Block button"}
#preview
:ButtonBlockDemo
#code

```vue
<FluereButton appearance="primary" block>Block Primary</FluereButton>
<FluereButton appearance="secondary" block>Block Secondary</FluereButton>
```

::

## API

| Prop (Props)   | Type                                                                 | Default       | Description                                                                         |
| -------------- | -------------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------- |
| `appearance`   | `'primary' \| 'secondary' \| 'outline' \| 'subtle' \| 'transparent'` | `'secondary'` | Appearance variant; `primary` is the primary action filled with the brand color     |
| `size`         | `'small' \| 'medium' \| 'large'`                                     | `'medium'`    | Size, with heights of 24 / 32 / 40 px respectively                                  |
| `shape`        | `'rounded' \| 'circular' \| 'square'`                                | `'rounded'`   | Shape; `circular` uses `borderRadiusCircular`, `square` has sharp corners           |
| `disabled`     | `boolean`                                                            | `false`       | Whether the button is disabled                                                      |
| `selected`     | `boolean`                                                            | `false`       | Selected state (toggle-button mode), rendered as `aria-pressed`                     |
| `block`        | `boolean`                                                            | `false`       | Block display, fills the full width of the parent container                         |
| `type`         | `'button' \| 'submit' \| 'reset'`                                    | `'button'`    | Native `type`; `button` is the explicit default to avoid accidental form submission |
| `icon`         | `Component`                                                          | `—`           | Icon component (an icon from `@fluere-vue/icons`), decorative and hidden from AT    |
| `iconPosition` | `'before' \| 'after'`                                                | `'before'`    | Icon position relative to the text (only takes effect in icon + text mode)          |
| `iconOnly`     | `boolean`                                                            | `false`       | Show only the icon (compact, square mode); the content `<span>` is not rendered     |

| Slot (Slots) | Description                                                                               |
| ------------ | ----------------------------------------------------------------------------------------- |
| `default`    | Button text; not rendered when `iconOnly` is `true`                                       |
| `icon`       | Icon slot; when provided it replaces the `icon` Prop (the icon gets `aria-hidden="true"`) |

> This component does not declare `emits` and does not set `inheritAttrs: false`: events such as `click` and attributes such as `aria-*`, `id`, and `title` fall through directly to the root native `<button>`, so consumers can use them as they would with a native button. This is also why consumers must pass `aria-label` themselves in the `iconOnly` scenario — the icon is invisible to the accessibility tree, so the accessible name can only come from outside.
