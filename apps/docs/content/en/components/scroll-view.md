---
title: Scroll View
description: A container control aligned with the WinUI 3 ScrollView: scrolls, pans, and zooms content that exceeds the viewport.
nav:
  title: Scroll View
---

# Scroll View

A container control aligned with the WinUI 3 `ScrollView`: when content exceeds the viewport it scrolls, pans, and zooms, with scrollbars styled like WinUI 3's
overlay style (a 2px thin thumb that appears once the pointer enters the container; when the pointer moves onto the scrollbar the thumb thickens to 6px, the pill-shaped track expands along with the step buttons at both ends, then collapses when the pointer leaves, and the whole thing fades out after 2s without interaction).

## Basic usage (vertical)

By default `content-orientation="vertical"`; the wheel / touch panning / dragging the scrollbar can all scroll.

::demo-block{title="Basic usage (vertical)"}
#preview
:ScrollViewVerticalDemo
#code

```vue
<FluereScrollView class="h-80">
  <div v-for="row in rows" :key="row">Row {{ row }} · native Windows 11 scrolling experience</div>
</FluereScrollView>
```

::

## Horizontal scrolling

With `content-orientation="horizontal"`, the content's height is constrained to the viewport while its width grows freely. Scroll horizontally with Shift + wheel or touch.

::demo-block{title="Horizontal scrolling"}
#preview
:ScrollViewHorizontalDemo
#code

```vue
<FluereScrollView class="h-40" content-orientation="horizontal">
  <div class="flex gap-fluent-m">…card list…</div>
</FluereScrollView>
```

::

## Bidirectional scrolling

With `content-orientation="both"`, the content is unconstrained in both horizontal and vertical directions.

::demo-block{title="Bidirectional scrolling"}
#preview
:ScrollViewBothDemo
#code

```vue
<FluereScrollView class="h-72" content-orientation="both">
  <div class="grid grid-cols-6 gap-fluent-m">…cells…</div>
</FluereScrollView>
```

::

## Nested scrolling

An inner ScrollView sits within the outer content. **Mouse-wheel ownership** aligns with WinUI 3: when the pointer stays over the inner scroll view, the inner one exclusively owns the wheel,
so even if the inner one has already scrolled to its limit the outer one will not scroll along; only when the pointer is moved to outer content outside the inner one does the wheel go to the outer view (touch / pen is exclusively captured by the pointer).

::demo-block{title="Nested scrolling"}
#preview
:ScrollViewNestedDemo
#code

```vue
<FluereScrollView class="h-96">
  <!-- Outer content -->
  <FluereScrollView class="h-40">…inner A owns the wheel…</FluereScrollView>
  <FluereScrollView class="h-40">…inner B owns the wheel…</FluereScrollView>
</FluereScrollView>
```

::

## Focus scrolling

When focus (Tab or programmatic `focus()`) enters an element inside the content, the element is automatically scrolled into view — aligned with WinUI
`BringIntoViewOnFocusChange` (enabled by default), so keyboard users never leave focus outside the viewport; no animation occurs if the element is already in view.
That scroll also fires the `bring-into-view` event, and the target offset can be cancelled or rewritten in the callback.

When the container gains focus (or focus is inside the content), the arrow keys, PageUp / PageDown, Home / End scroll the view; when an
`input` / `textarea` / `select` / `contenteditable` is hit, the keys are handed back to the input control.

## Zoom

With `zoom-mode="enabled"`: Ctrl / Cmd + wheel or pinch-to-zoom, with the pointer position as the zoom center. Aligned with the WinUI
`min-zoom-factor / max-zoom-factor` constraints.

::demo-block{title="Zoom"}
#preview
:ScrollViewZoomDemo
#code

```vue
<FluereScrollView class="h-80" content-orientation="both" zoom-mode="enabled">
  <!-- Ctrl / Cmd + wheel, or pinch to zoom -->
</FluereScrollView>
```

::

## Scrollbar visibility

`vertical-scroll-bar-visibility` supports `auto` (default, overlay) / `visible` (always shown) / `hidden` (still scrollable).

::demo-block{title="Scrollbar visibility"}
#preview
:ScrollViewBarVisibilityDemo
#code

```vue
<FluereScrollView>…auto (default, overlay)…</FluereScrollView>
<FluereScrollView vertical-scroll-bar-visibility="visible">…always shown…</FluereScrollView>
<FluereScrollView vertical-scroll-bar-visibility="hidden">…hidden but scrollable…</FluereScrollView>
```

::

## Programmatic API

Aligned with the WinUI methods: `scrollTo / scrollBy / zoomTo / zoomBy / addScrollVelocity / addZoomVelocity / bringIntoView` (supporting animation and correlation IDs),
plus the read-only properties `horizontalOffset / verticalOffset / zoomFactor / extentWidth / extentHeight / viewportWidth / viewportHeight /
scrollableWidth / scrollableHeight / state / currentAnchor`. Full signatures are in the 「Methods」 and 「Readonly properties」 tables below.

::demo-block{title="Programmatic API"}
#preview
:ScrollViewApiDemo
#code

```vue
<template>
  <FluereScrollView
    ref="sv"
    content-orientation="both"
    zoom-mode="enabled"
    @view-changed="refreshReadout"
  >
    …content…
  </FluereScrollView>
  <button @click="sv?.scrollBy(0, 120)">Scroll down 120px</button>
  <button @click="sv?.scrollTo(0, 0)">Back to top</button>
  <button @click="sv?.zoomBy(0.25)">Zoom in</button>
</template>

<script setup lang="ts">
const sv = ref<InstanceType<typeof FluereScrollView>>()
</script>
```

::

## Events

`view-changed / extent-changed / state-changed / scroll-animation-starting / scroll-completed / zoom-animation-starting / zoom-completed / anchor-requested / bring-into-view`,
with payloads in the 「Events」 table below. These are component events (`@event`); the **DOM command events** meant for page automation are in 「Agent / Automation access」,
their names carry the `fluere:` prefix and they are dispatched on the root element.

::demo-block{title="Events"}
#preview
:ScrollViewEventsDemo
#code

```vue
<FluereScrollView
  @view-changed="logEvent('view-changed')"
  @state-changed="logEvent(`state → ${$event}`)"
  @scroll-completed="logEvent(`scroll-completed #${$event.correlationId}`)"
>
  …content…
</FluereScrollView>
```

::

## Agent / Automation access

This component expresses its offset through a content `transform` and its presenter is `overflow: clip` (**not a native scroll container**),
so the native scrolling semantics of browsers and automation tools do not apply here: `scrollTop` is always `0`,
and `scrollBy` / `scrollIntoView` / `scrollIntoViewIfNeeded` can find no scrollable ancestor
(native auto-scrolling before Playwright clicks an element outside the viewport also fails, which is
the pitfall documented in [style-spec §7](./../../../docs/style-spec.md)). For this the component provides two DOM-based paths,
**neither of which requires touching the component instance**:

- **Read-only reflection**: the root element always carries a set of state attributes for determining 「whether it moved / how much is left」;
- **Command events**: dispatching `fluere:*` events on the root element drives the scrolling, and receipts are received once applied.

### Read-only reflection attributes

| Attribute           | Description                                                   |
| ------------------- | ------------------------------------------------------------- |
| `data-scroll-x`     | Current horizontal offset (pixels, rounded)                   |
| `data-scroll-y`     | Current vertical offset (pixels, rounded)                     |
| `data-scroll-max-x` | Maximum scrollable width (content × zoom − viewport, rounded) |
| `data-scroll-max-y` | Maximum scrollable height, rounded                            |
| `data-zoom-factor`  | Current zoom factor                                           |
| `data-scroll-state` | `'idle' \| 'interaction' \| 'inertia' \| 'animation'`         |

Once rounded, equality comparisons can safely determine 「whether it reached the end」 (`data-scroll-y === data-scroll-max-y`).
These attributes are rewritten frame by frame when the offset changes, **do not match them in CSS** (otherwise style recalculation is triggered on every frame during animation;
a contract test in the repo guards this rule).

### Command events

Dispatch on the component root element (`.fui-scrollview`), with `bubbles: true`, so they can also be attached at the page level.

| Event (DOM event)        | Payload (`event.detail`)              | Description                                                                      |
| ------------------------ | ------------------------------------- | -------------------------------------------------------------------------------- |
| `fluere:scroll-to`       | `{ x?, y?, animationMode? }`          | Scroll to an absolute offset; omitted parts keep their current value             |
| `fluere:scroll-by`       | `{ x?, y?, animationMode? }`          | Scroll by a delta; omitted parts are treated as `0`                              |
| `fluere:bring-into-view` | `{ element?, selector?, margin? }`    | Scroll an element inside the content into view (`element` takes precedence)      |
| `fluere:scroll-settled`  | `{ x, y, zoomFactor }` (**outbound**) | Dispatched by the component after a command lands, for waiting on a stable frame |

An invalid payload (a non-finite number, an unresolvable target) is a no-op and does not throw; `bring-into-view` only accepts elements inside the content.
Passing `animationMode` as `'disabled'` skips the animation, which suits deterministic positioning before a screenshot;
setting `agentCommands` to `false` disables the command events (read-only reflection is kept).

```js
const el = document.querySelector('.fui-scrollview')

// 1. Read state first: how much more needs to scroll?
const remaining = Number(el.dataset.scrollMaxY) - Number(el.dataset.scrollY)

// 2. Dispatch the command (bubbles lets page-level listeners receive it too)
el.dispatchEvent(
  new CustomEvent('fluere:scroll-by', { detail: { y: remaining, animationMode: 'disabled' } }),
)

// 3. Wait for the receipt before screenshotting / asserting
await new Promise((resolve) =>
  el.addEventListener('fluere:scroll-settled', resolve, { once: true }),
)
```

::demo-block{title="Agent interaction surface"}
#preview
:ScrollViewAgentDemo
#code

```vue
<FluereScrollView ref="sv" label="Log list" @view-changed="refresh">
  …content…
</FluereScrollView>
```

```ts
// Read-only reflection: read the DOM, never touch the instance
const root = sv.value.$el
const { scrollY, scrollMaxY } = root.dataset

// Command + receipt
root.addEventListener('fluere:scroll-settled', refresh)
root.dispatchEvent(
  new CustomEvent('fluere:bring-into-view', {
    detail: { selector: '[data-row="24"]' },
    bubbles: true,
  }),
)
```

::

> **Native semantics that still do not apply**: the component is not a native scroll container, so `el.scrollTop`, `el.scrollBy()`,
> `el.scrollIntoView()`, CDP `DOM.scrollIntoViewIfNeeded`, the browser's 「find in page」 and
> `#:~:text=` text fragment anchoring still do not work — use the command events above instead.
> There is another existing path: when focus enters an element in the content, the component automatically scrolls it into view per `BringIntoViewOnFocusChange`
> (aligned with WinUI, see `bringIntoView` in the 「Methods」 table).

## API

### Props

| Prop                            | Type                                             | Default      | Description                                                                                                                                                                             |
| ------------------------------- | ------------------------------------------------ | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `contentOrientation`            | `'vertical' \| 'horizontal' \| 'none' \| 'both'` | `'vertical'` | Content layout direction, determines how the content is constrained by the viewport                                                                                                     |
| `horizontalScrollMode`          | `'enabled' \| 'disabled'`                        | `'enabled'`  | Whether the user may scroll horizontally                                                                                                                                                |
| `verticalScrollMode`            | `'enabled' \| 'disabled'`                        | `'enabled'`  | Whether the user may scroll vertically                                                                                                                                                  |
| `horizontalScrollBarVisibility` | `'auto' \| 'visible' \| 'hidden'`                | `'auto'`     | Horizontal scrollbar display strategy (`auto` is overlay, shown only when the pointer enters the container)                                                                             |
| `verticalScrollBarVisibility`   | `'auto' \| 'visible' \| 'hidden'`                | `'auto'`     | Vertical scrollbar display strategy                                                                                                                                                     |
| `horizontalScrollChainMode`     | `'auto' \| 'always' \| 'never'`                  | `'auto'`     | Chaining of horizontal scroll; see the 「Wheel ownership」 note below                                                                                                                   |
| `verticalScrollChainMode`       | `'auto' \| 'always' \| 'never'`                  | `'auto'`     | Chaining of vertical scroll, same semantics as above                                                                                                                                    |
| `horizontalScrollRailMode`      | `'enabled' \| 'disabled'`                        | `'enabled'`  | Horizontal touch panning rail                                                                                                                                                           |
| `verticalScrollRailMode`        | `'enabled' \| 'disabled'`                        | `'enabled'`  | Vertical touch panning rail                                                                                                                                                             |
| `zoomMode`                      | `'enabled' \| 'disabled'`                        | `'disabled'` | Whether the user may zoom                                                                                                                                                               |
| `zoomChainMode`                 | `'auto' \| 'always' \| 'never'`                  | `'auto'`     | Chaining of zoom                                                                                                                                                                        |
| `ignoredInputKinds`             | `ScrollingInputKinds \| ScrollingInputKinds[]`   | `[]`         | Input kinds to ignore; a single value or an array can be passed; such inputs are not responded to                                                                                       |
| `minZoomFactor`                 | `number`                                         | `0.1`        | Minimum zoom factor                                                                                                                                                                     |
| `maxZoomFactor`                 | `number`                                         | `10`         | Maximum zoom factor                                                                                                                                                                     |
| `horizontalAnchorRatio`         | `number`                                         | `NaN`        | Horizontal anchor ratio (0–1); `NaN` disables horizontal anchoring; `0` keeps the content's left edge against the viewport's left edge, `1` keeps the right edge against the right edge |
| `verticalAnchorRatio`           | `number`                                         | `NaN`        | Vertical anchor ratio (0–1); `NaN` disables vertical anchoring                                                                                                                          |
| `background`                    | `string`                                         | `—`          | Background color of the content area                                                                                                                                                    |
| `tabIndex`                      | `number`                                         | `0`          | Keyboard focusable (Arrow / PageUp / Home etc. arrow keys scroll)                                                                                                                       |
| `label`                         | `string`                                         | `—`          | Accessible name; once set the root element carries `role="region"`, letting screen readers and the accessibility-tree Agent recognize the scroll area                                   |
| `agentCommands`                 | `boolean`                                        | `true`       | Whether to respond to `fluere:*` DOM command events (see 「Agent / Automation access」); the read-only state reflection is always kept                                                  |

### Events

| Event                       | Payload                                               | Description                                                                 |
| --------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------- |
| `view-changed`              | —                                                     | The viewport offset or zoom changed (fires continuously during interaction) |
| `extent-changed`            | —                                                     | The content area size changed                                               |
| `state-changed`             | `'idle' \| 'interaction' \| 'inertia' \| 'animation'` | The interaction state changed                                               |
| `scroll-animation-starting` | `ScrollingScrollAnimationStartingEventArgs`           | A scroll animation is about to start; the target offset can be rewritten    |
| `scroll-completed`          | `ScrollingScrollCompletedEventArgs`                   | A scroll ended (includes `correlationId`)                                   |
| `zoom-animation-starting`   | `ScrollingZoomAnimationStartingEventArgs`             | A zoom animation is about to start                                          |
| `zoom-completed`            | `ScrollingZoomCompletedEventArgs`                     | A zoom ended (includes `correlationId`)                                     |
| `anchor-requested`          | `ScrollingAnchorRequestedEventArgs`                   | An anchor is requested (a custom anchor element can be returned)            |
| `bring-into-view`           | `ScrollingBringingIntoViewEventArgs`                  | About to scroll an element into view; the target offset can be rewritten    |

### Methods

Called through a template ref; each returns the `correlationId` of this operation, for matching against the payloads of `scroll-completed` / `zoom-completed`.

| Method                      | Signature                                                                                                   | Description                                                                                    |
| --------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `scrollTo`                  | `(horizontalOffset: number, verticalOffset: number, options?: ScrollingScrollOptions) => number`            | Scroll to an absolute offset                                                                   |
| `scrollBy`                  | `(horizontalOffsetDelta: number, verticalOffsetDelta: number, options?: ScrollingScrollOptions) => number`  | Scroll by a delta                                                                              |
| `zoomTo`                    | `(zoom: number, centerPoint?: { x, y } \| null, options?: ScrollingZoomOptions) => number`                  | Zoom to a specified factor; `centerPoint` is the zoom center (defaults to the viewport center) |
| `zoomBy`                    | `(zoomFactorDelta: number, centerPoint?: { x, y } \| null, options?: ScrollingZoomOptions) => number`       | Zoom by a delta                                                                                |
| `addScrollVelocity`         | `(offsetsVelocity: { x, y }, inertiaDecayRate?: { x, y } \| null) => number`                                | Append scroll velocity (inertial scrolling)                                                    |
| `addZoomVelocity`           | `(zoomFactorVelocity: number, centerPoint?: { x, y } \| null, inertiaDecayRate?: number \| null) => number` | Append zoom velocity                                                                           |
| `bringIntoView`             | `(element: HTMLElement, options?: { margin?: number }) => number`                                           | Scroll an element into view (auto-triggered by the focused element)                            |
| `registerAnchorCandidate`   | `(element: HTMLElement) => void`                                                                            | Register an anchor candidate (or mark with `data-can-scroll-anchor`)                           |
| `unregisterAnchorCandidate` | `(element: HTMLElement) => void`                                                                            | Unregister an anchor candidate                                                                 |

`ScrollingScrollOptions` / `ScrollingZoomOptions` take `'disabled' \| 'enabled' \| 'auto'` for `animationMode` (default `'auto'`), plus a placeholding `snapPointsMode`.

### Readonly properties

| Readonly property  | Type                                                  | Description                            |
| ------------------ | ----------------------------------------------------- | -------------------------------------- |
| `horizontalOffset` | `number`                                              | Current horizontal offset              |
| `verticalOffset`   | `number`                                              | Current vertical offset                |
| `zoomFactor`       | `number`                                              | Current zoom factor                    |
| `extentWidth`      | `number`                                              | Content area width                     |
| `extentHeight`     | `number`                                              | Content area height                    |
| `viewportWidth`    | `number`                                              | Viewport width                         |
| `viewportHeight`   | `number`                                              | Viewport height                        |
| `scrollableWidth`  | `number`                                              | Scrollable width (content − viewport)  |
| `scrollableHeight` | `number`                                              | Scrollable height (content − viewport) |
| `state`            | `'idle' \| 'interaction' \| 'inertia' \| 'animation'` | Current interaction state              |
| `currentAnchor`    | `HTMLElement \| null`                                 | The currently active anchor element    |

### Slots

| Slot      | Description        |
| --------- | ------------------ |
| `default` | Scrollable content |

> **Wheel ownership** (aligned with WinUI 3): when the pointer is inside this component and that direction is actually scrollable, this wheel is owned exclusively by the component — even at the scroll limit it will not scroll the outer ScrollView; when `horizontal/verticalScrollChainMode` is `auto` / `never`, reaching the limit swallows the wheel (equivalent to `overscroll-behavior: contain`), and only when it is `always` is the unconsumed remaining delta explicitly handed to the outer view. When the current direction has no scrollable content, or that direction is disabled, the wheel is not owned and bubbles to the outer view. Touch / pen is exclusively captured by the pointer and does not go through this determination.
