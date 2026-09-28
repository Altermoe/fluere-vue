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

对齐 WinUI 方法：`scrollTo / scrollBy / zoomTo / zoomBy / bringIntoView`（支持动画与 correlation ID），以及只读属性
`horizontalOffset / verticalOffset / zoomFactor / scrollableWidth / scrollableHeight / state`。

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

`view-changed / extent-changed / state-changed / scroll-completed / zoom-completed`。

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
