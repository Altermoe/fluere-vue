---
title: Scroll View 滚动视图
description: 对齐 WinUI 3 ScrollView 的容器控件：内容超出视口时滚动、平移、缩放。
nav:
  title: Scroll View 滚动视图
---

# Scroll View 滚动视图

对齐 WinUI 3 `ScrollView` 的容器控件：内容超出视口时滚动、平移、缩放，滚动条为 WinUI 3 的
overlay 样式（2px 细滑块，指针进入容器即显示；指针移到滚动条上时滑块加粗为 6px、药丸轨道连同两端步进按钮展开，离开后收起，2s 无交互整体淡出）。

## 基础用法（垂直）

默认 `content-orientation="vertical"`，滚轮 / 触控平移 / 拖动滚动条均可滚动。

::demo-block{title="基础用法（垂直）"}
#preview
:ScrollViewVerticalDemo
#code

```vue
<FluereScrollView class="h-80">
  <div v-for="row in rows" :key="row">第 {{ row }} 行内容 · Windows 11 原生滚动体验</div>
</FluereScrollView>
```

::

## 横向滚动

`content-orientation="horizontal"`，内容高度约束到视口，宽度自由增长。Shift + 滚轮或触控横向滑动。

::demo-block{title="横向滚动"}
#preview
:ScrollViewHorizontalDemo
#code

```vue
<FluereScrollView class="h-40" content-orientation="horizontal">
  <div class="flex gap-fluent-m">…卡片列表…</div>
</FluereScrollView>
```

::

## 双向滚动

`content-orientation="both"`，内容在横向与纵向均不受约束。

::demo-block{title="双向滚动"}
#preview
:ScrollViewBothDemo
#code

```vue
<FluereScrollView class="h-72" content-orientation="both">
  <div class="grid grid-cols-6 gap-fluent-m">…单元格…</div>
</FluereScrollView>
```

::

## 嵌套滚动

内层 ScrollView 位于外层内容之中。**鼠标滚轮归属**对齐 WinUI 3：指针停在内层上时由内层独占滚轮，
即使内层已滚到极限，外层也不会跟着滚动；把指针移到内层之外的外层内容上，滚轮才交给外层（触控 / 笔由指针捕获独占）。

::demo-block{title="嵌套滚动"}
#preview
:ScrollViewNestedDemo
#code

```vue
<FluereScrollView class="h-96">
  <!-- 外层内容 -->
  <FluereScrollView class="h-40">…内层 A 独占滚轮…</FluereScrollView>
  <FluereScrollView class="h-40">…内层 B 独占滚轮…</FluereScrollView>
</FluereScrollView>
```

::

## 焦点滚动

焦点（Tab 或程序化 `focus()`）进入内容内的元素时，元素自动滚进视口 —— 对齐 WinUI
`BringIntoViewOnFocusChange`（缺省开启），键盘用户不会把焦点留在视口之外；元素已在视口内时不产生动画。
该次滚动同样触发 `bring-into-view` 事件，可在回调中取消或改写目标偏移。

容器获得焦点（或焦点在内容内）时，方向键、PageUp / PageDown、Home / End 滚动视图；命中
`input` / `textarea` / `select` / `contenteditable` 时按键交还给输入控件。

## 缩放

`zoom-mode="enabled"`：Ctrl / Cmd + 滚轮或双指捏合缩放，缩放中心为指针位置。对齐 WinUI 的
`min-zoom-factor / max-zoom-factor` 约束。

::demo-block{title="缩放"}
#preview
:ScrollViewZoomDemo
#code

```vue
<FluereScrollView class="h-80" content-orientation="both" zoom-mode="enabled">
  <!-- Ctrl / Cmd + 滚轮 或双指捏合缩放 -->
</FluereScrollView>
```

::

## 滚动条可见性

`vertical-scroll-bar-visibility` 支持 `auto`（默认，overlay）/ `visible`（常驻）/ `hidden`（仍可滚动）。

::demo-block{title="滚动条可见性"}
#preview
:ScrollViewBarVisibilityDemo
#code

```vue
<FluereScrollView>…auto（默认，overlay）…</FluereScrollView>
<FluereScrollView vertical-scroll-bar-visibility="visible">…常驻…</FluereScrollView>
<FluereScrollView vertical-scroll-bar-visibility="hidden">…隐藏但可滚动…</FluereScrollView>
```

::

## 程序化 API

对齐 WinUI 方法：`scrollTo / scrollBy / zoomTo / zoomBy / addScrollVelocity / addZoomVelocity / bringIntoView`（支持动画与 correlation ID），
以及只读属性 `horizontalOffset / verticalOffset / zoomFactor / extentWidth / extentHeight / viewportWidth / viewportHeight /
scrollableWidth / scrollableHeight / state / currentAnchor`。完整签名见下方「方法」与「只读属性」两张表。

::demo-block{title="程序化 API"}
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
    …内容…
  </FluereScrollView>
  <button @click="sv?.scrollBy(0, 120)">下滚 120px</button>
  <button @click="sv?.scrollTo(0, 0)">回到顶部</button>
  <button @click="sv?.zoomBy(0.25)">放大</button>
</template>

<script setup lang="ts">
const sv = ref<InstanceType<typeof FluereScrollView>>()
</script>
```

::

## 事件

`view-changed / extent-changed / state-changed / scroll-animation-starting / scroll-completed / zoom-animation-starting / zoom-completed / anchor-requested / bring-into-view`，
载荷见下方「事件」表。这些是组件事件（`@event`）；供页面自动化使用的 **DOM 命令事件** 见「Agent / 自动化访问」，
事件名带 `fluere:` 前缀，在根元素上派发。

::demo-block{title="事件"}
#preview
:ScrollViewEventsDemo
#code

```vue
<FluereScrollView
  @view-changed="logEvent('view-changed')"
  @state-changed="logEvent(`state → ${$event}`)"
  @scroll-completed="logEvent(`scroll-completed #${$event.correlationId}`)"
>
  …内容…
</FluereScrollView>
```

::

## Agent / 自动化访问

<!-- style-spec 必须用绝对地址外链：content/ 之外的相对路径（./../../../docs/…）在 `pnpm docs:generate`
     预渲染时会被 crawlLinks 当成站内路由抓取并 404，从而让整条命令失败（详见 AGENTS.md 的 docs:generate 检查项）。 -->

本组件的偏移由内容 `transform` 表达、presenter 是 `overflow: clip`（**不是原生滚动容器**），
因此浏览器与自动化工具的原生滚动语义在这里不成立：`scrollTop` 恒为 `0`，
`scrollBy` / `scrollIntoView` / `scrollIntoViewIfNeeded` 都找不到可滚动祖先
（Playwright 点击视口外元素前的自动滚动同样失效，这也是
[style-spec §7](https://github.com/Altermoe/fluere-vue/blob/main/docs/style-spec.md) 记录的那条坑）。组件为此提供两条 DOM 通路，
**都不需要接触组件实例**：

- **只读反射**：根元素始终带一组状态属性，用来判断「动没动、还剩多少」；
- **命令事件**：在根元素上派发 `fluere:*` 事件即可驱动滚动，落地后收到回执。

### 只读反射属性

| 属性（Attribute）   | 说明                                                  |
| ------------------- | ----------------------------------------------------- |
| `data-scroll-x`     | 当前水平偏移（像素，取整）                            |
| `data-scroll-y`     | 当前垂直偏移（像素，取整）                            |
| `data-scroll-max-x` | 可滚动宽度上限（内容 × 缩放 − 视口，取整）            |
| `data-scroll-max-y` | 可滚动高度上限，取整                                  |
| `data-zoom-factor`  | 当前缩放系数                                          |
| `data-scroll-state` | `'idle' \| 'interaction' \| 'inertia' \| 'animation'` |

取整后可安全地做相等比较来判断「到底了没有」（`data-scroll-y === data-scroll-max-y`）。
这些属性在偏移变化时逐帧重写，**不要在 CSS 里匹配它们**（否则动画期间每帧都会触发样式重算；
仓库有契约测试守着这条约定）。

### 命令事件

在组件根元素（`.fui-scrollview`）上派发，`bubbles: true`，因此也可以挂在页面级监听。

| 事件（DOM 事件）         | 载荷（`event.detail`）             | 说明                                       |
| ------------------------ | ---------------------------------- | ------------------------------------------ |
| `fluere:scroll-to`       | `{ x?, y?, animationMode? }`       | 滚到绝对偏移；缺省分量保持不变             |
| `fluere:scroll-by`       | `{ x?, y?, animationMode? }`       | 按增量滚动；缺省分量按 `0` 处理            |
| `fluere:bring-into-view` | `{ element?, selector?, margin? }` | 把内容区内的元素滚入视口（`element` 优先） |
| `fluere:scroll-settled`  | `{ x, y, zoomFactor }`（**出站**） | 命令落地后由组件派发，用于等待稳定帧       |

载荷非法（非有限数、目标不可解析）时是空操作，不抛错；`bring-into-view` 只接受内容区内的元素。
`animationMode` 传 `'disabled'` 可跳过动画，适合截图前的确定性定位；
`agentCommands` 设为 `false` 可关闭命令事件（只读反射保留）。

```js
const el = document.querySelector('.fui-scrollview')

// 1. 先读状态：还需要滚多少？
const remaining = Number(el.dataset.scrollMaxY) - Number(el.dataset.scrollY)

// 2. 派发命令（bubbles 让页面级监听也能收到）
el.dispatchEvent(
  new CustomEvent('fluere:scroll-by', { detail: { y: remaining, animationMode: 'disabled' } }),
)

// 3. 等回执再截图 / 断言
await new Promise((resolve) =>
  el.addEventListener('fluere:scroll-settled', resolve, { once: true }),
)
```

::demo-block{title="Agent 交互面"}
#preview
:ScrollViewAgentDemo
#code

```vue
<FluereScrollView ref="sv" label="日志列表" @view-changed="refresh">
  …内容…
</FluereScrollView>
```

```ts
// 只读反射：读 DOM，不碰组件实例
const root = sv.value.$el
const { scrollY, scrollMaxY } = root.dataset

// 命令 + 回执
root.addEventListener('fluere:scroll-settled', refresh)
root.dispatchEvent(
  new CustomEvent('fluere:bring-into-view', {
    detail: { selector: '[data-row="24"]' },
    bubbles: true,
  }),
)
```

::

> **仍不适用的原生语义**：组件不是原生滚动容器，因此 `el.scrollTop`、`el.scrollBy()`、
> `el.scrollIntoView()`、CDP `DOM.scrollIntoViewIfNeeded`、浏览器「在页面中查找」与
> `#:~:text=` 文本片段定位依旧不生效，请用上面的命令事件替代。
> 另有一条既有通路：焦点进入内容区元素时组件会按 `BringIntoViewOnFocusChange` 自动把它滚入视口
> （对齐 WinUI，见「方法」表的 `bringIntoView`）。

## API

### 属性（Props）

| 属性（Props）                   | 类型                                             | 默认         | 说明                                                                                          |
| ------------------------------- | ------------------------------------------------ | ------------ | --------------------------------------------------------------------------------------------- |
| `contentOrientation`            | `'vertical' \| 'horizontal' \| 'none' \| 'both'` | `'vertical'` | 内容布局方向，决定内容如何受视口约束                                                          |
| `horizontalScrollMode`          | `'enabled' \| 'disabled'`                        | `'enabled'`  | 是否允许用户水平滚动                                                                          |
| `verticalScrollMode`            | `'enabled' \| 'disabled'`                        | `'enabled'`  | 是否允许用户垂直滚动                                                                          |
| `horizontalScrollBarVisibility` | `'auto' \| 'visible' \| 'hidden'`                | `'auto'`     | 水平滚动条展示策略（`auto` 为 overlay，指针进入容器才显示）                                   |
| `verticalScrollBarVisibility`   | `'auto' \| 'visible' \| 'hidden'`                | `'auto'`     | 垂直滚动条展示策略                                                                            |
| `horizontalScrollChainMode`     | `'auto' \| 'always' \| 'never'`                  | `'auto'`     | 水平滚动的链式传递；见下方「滚轮归属」说明                                                    |
| `verticalScrollChainMode`       | `'auto' \| 'always' \| 'never'`                  | `'auto'`     | 垂直滚动的链式传递，语义同上                                                                  |
| `horizontalScrollRailMode`      | `'enabled' \| 'disabled'`                        | `'enabled'`  | 水平触控平移导轨                                                                              |
| `verticalScrollRailMode`        | `'enabled' \| 'disabled'`                        | `'enabled'`  | 垂直触控平移导轨                                                                              |
| `zoomMode`                      | `'enabled' \| 'disabled'`                        | `'disabled'` | 是否允许用户缩放                                                                              |
| `zoomChainMode`                 | `'auto' \| 'always' \| 'never'`                  | `'auto'`     | 缩放的链式传递                                                                                |
| `ignoredInputKinds`             | `ScrollingInputKinds \| ScrollingInputKinds[]`   | `[]`         | 需要忽略的输入种类，可传单个值或数组；命中则对该输入不响应                                    |
| `minZoomFactor`                 | `number`                                         | `0.1`        | 最小缩放系数                                                                                  |
| `maxZoomFactor`                 | `number`                                         | `10`         | 最大缩放系数                                                                                  |
| `horizontalAnchorRatio`         | `number`                                         | `NaN`        | 水平锚点比例（0~1），`NaN` 表示不启用水平锚定；`0` 让内容左缘贴住视口左缘、`1` 让右缘贴住右缘 |
| `verticalAnchorRatio`           | `number`                                         | `NaN`        | 垂直锚点比例（0~1），`NaN` 表示不启用垂直锚定                                                 |
| `background`                    | `string`                                         | `—`          | 内容区背景色                                                                                  |
| `tabIndex`                      | `number`                                         | `0`          | 键盘可聚焦（Arrow / PageUp / Home 等方向键滚动）                                              |
| `label`                         | `string`                                         | `—`          | 可访问名；设置后根元素带 `role="region"`，供屏幕阅读器与无障碍树型 Agent 识别该滚动区域       |
| `agentCommands`                 | `boolean`                                        | `true`       | 是否响应 `fluere:*` DOM 命令事件（见「Agent / 自动化访问」）；只读状态反射始终保留            |

### 事件（Events）

| 事件（Events）              | 载荷                                                  | 说明                                         |
| --------------------------- | ----------------------------------------------------- | -------------------------------------------- |
| `view-changed`              | —                                                     | 视口偏移或缩放发生变化（交互过程中连续触发） |
| `extent-changed`            | —                                                     | 内容区尺寸发生变化                           |
| `state-changed`             | `'idle' \| 'interaction' \| 'inertia' \| 'animation'` | 交互状态变化                                 |
| `scroll-animation-starting` | `ScrollingScrollAnimationStartingEventArgs`           | 滚动动画即将开始，可改写目标偏移             |
| `scroll-completed`          | `ScrollingScrollCompletedEventArgs`                   | 一次滚动结束（含 `correlationId`）           |
| `zoom-animation-starting`   | `ScrollingZoomAnimationStartingEventArgs`             | 缩放动画即将开始                             |
| `zoom-completed`            | `ScrollingZoomCompletedEventArgs`                     | 一次缩放结束（含 `correlationId`）           |
| `anchor-requested`          | `ScrollingAnchorRequestedEventArgs`                   | 请求锚点（可返回自定义锚点元素）             |
| `bring-into-view`           | `ScrollingBringingIntoViewEventArgs`                  | 即将把元素滚入视口，可改写目标偏移           |

### 方法（Methods）

通过模板 ref 调用；都返回本次操作的 `correlationId`，用于与 `scroll-completed` / `zoom-completed` 的载荷对应。

| 方法（Methods）             | 签名                                                                                                        | 说明                                                     |
| --------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `scrollTo`                  | `(horizontalOffset: number, verticalOffset: number, options?: ScrollingScrollOptions) => number`            | 滚动到绝对偏移                                           |
| `scrollBy`                  | `(horizontalOffsetDelta: number, verticalOffsetDelta: number, options?: ScrollingScrollOptions) => number`  | 按增量滚动                                               |
| `zoomTo`                    | `(zoom: number, centerPoint?: { x, y } \| null, options?: ScrollingZoomOptions) => number`                  | 缩放到指定系数，`centerPoint` 为缩放中心（默认视口中心） |
| `zoomBy`                    | `(zoomFactorDelta: number, centerPoint?: { x, y } \| null, options?: ScrollingZoomOptions) => number`       | 按增量缩放                                               |
| `addScrollVelocity`         | `(offsetsVelocity: { x, y }, inertiaDecayRate?: { x, y } \| null) => number`                                | 追加滚动速度（惯性滚动）                                 |
| `addZoomVelocity`           | `(zoomFactorVelocity: number, centerPoint?: { x, y } \| null, inertiaDecayRate?: number \| null) => number` | 追加缩放速度                                             |
| `bringIntoView`             | `(element: HTMLElement, options?: { margin?: number }) => number`                                           | 把元素滚入视口（焦点元素自动触发）                       |
| `registerAnchorCandidate`   | `(element: HTMLElement) => void`                                                                            | 注册锚点候选（也可用 `data-can-scroll-anchor` 标记）     |
| `unregisterAnchorCandidate` | `(element: HTMLElement) => void`                                                                            | 注销锚点候选                                             |

`ScrollingScrollOptions` / `ScrollingZoomOptions` 的 `animationMode` 取 `'disabled' \| 'enabled' \| 'auto'`（默认 `'auto'`），另有 `snapPointsMode` 占位。

### 只读属性（Readonly）

| 属性（Readonly）   | 类型                                                  | 说明                      |
| ------------------ | ----------------------------------------------------- | ------------------------- |
| `horizontalOffset` | `number`                                              | 当前水平偏移              |
| `verticalOffset`   | `number`                                              | 当前垂直偏移              |
| `zoomFactor`       | `number`                                              | 当前缩放系数              |
| `extentWidth`      | `number`                                              | 内容区宽度                |
| `extentHeight`     | `number`                                              | 内容区高度                |
| `viewportWidth`    | `number`                                              | 视口宽度                  |
| `viewportHeight`   | `number`                                              | 视口高度                  |
| `scrollableWidth`  | `number`                                              | 可滚动宽度（内容 − 视口） |
| `scrollableHeight` | `number`                                              | 可滚动高度（内容 − 视口） |
| `state`            | `'idle' \| 'interaction' \| 'inertia' \| 'animation'` | 当前交互状态              |
| `currentAnchor`    | `HTMLElement \| null`                                 | 当前生效的锚点元素        |

### 插槽（Slots）

| 插槽（Slots） | 说明     |
| ------------- | -------- |
| `default`     | 滚动内容 |

> **滚轮归属**（对齐 WinUI 3）：指针位于本组件内、且该方向确实可滚动时，本次滚轮由本组件独占——即使已到滚动极限也不会滚到外层 ScrollView；`horizontal/verticalScrollChainMode` 为 `auto` / `never` 时到极限即吞掉滚轮（等价 `overscroll-behavior: contain`），为 `always` 时才把未消化的剩余增量显式交给外层。本方向没有可滚动内容、或该方向被禁用时不占有滚轮，冒泡交给外层。触控 / 笔由指针捕获独占，不走这套判定。
