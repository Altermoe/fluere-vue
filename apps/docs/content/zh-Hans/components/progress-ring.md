---
title: Progress Ring 进度环
description: 环形进度指示：不确定（转圈）与确定（弧长）两种形态，样式还原 WinUI 3 ProgressRing。
nav:
  title: Progress Ring 进度环
---

# Progress Ring 进度环

Progress Ring 用来指示正在进行、但暂不可量化的操作（不确定态「转圈」），或展示已可量化的进度（确定态弧长）。

样式对齐 WinUI 3 / Windows App SDK 的 ProgressRing（`microsoft-ui-xaml` `winui3/release/2.5.1`，已核对与最新 WinUI3 Gallery 发行版 v2.9.3 所用的 WindowsAppSDK 2.0.1 源码逐字节一致）：圆环几何（r≈14 / 32px 控件、stroke≈3、两端圆线帽）、品牌前景色、可选轨道色；不确定态是**实色圆头弧段**的 2s 循环——弧先由圆点逐渐变长（上限半周长），随后尾端追上首端、弧又缩回圆点，如此往复；组件为纯装饰指示（`pointer-events: none`、不进 Tab 序、SVG 对屏幕阅读器隐藏）。

::demo-block{title="基础用法（不确定转圈）"}
#preview
:ProgressRingBasicDemo
#code

```vue
<FluereProgressRing label="正在加载" />
```

::

## 尺寸

默认 32×32（对齐 WinUI 默认尺寸）。另提供 `small=16`（对齐 WinUI MinWidth/MinHeight）与 `large=48`；圆环按 viewBox 矢量缩放，stroke 随尺寸等比变化。

::demo-block{title="三档尺寸"}
#preview
:ProgressRingSizeDemo
#code

```vue
<FluereProgressRing size="small" />
<FluereProgressRing />
<FluereProgressRing size="large" />
```

::

## 确定态进度

`:indeterminate="false"` 进入确定态：弧从正上方（12 点）顺时针增长到 `(value − min) / (max − min)`，value 变化时弧长平滑过渡。`min` 默认 0、`max` 默认 100。

::demo-block{title="确定态（拖动滑块改变进度）"}
#preview
:ProgressRingDeterminateDemo
#code

```vue
<FluereProgressRing :model-value="40" :indeterminate="false" label="下载进度" />
```

::

## 轨道（BackgroundColor）

`background-color` 传入任意 CSS 颜色即在圆环下方绘制轨道，对齐 WinUI `ProgressRing.Background`（WinUI3 Gallery 的「Background color」选项，落到 Lottie 里那条**不参与旋转**的整圆）。**缺省不传即不显示轨道**，与 WinUI 默认值 `ControlFillColorTransparentBrush` 一致；两种形态（不确定 / 确定）都支持。

::demo-block{title="带轨道的不确定态与确定态（对齐 WinUI3 Gallery）"}
#preview
:ProgressRingBackgroundDemo
#code

```vue
<FluereProgressRing background-color="var(--colorNeutralStroke1)" />
<FluereProgressRing
  :model-value="20"
  :indeterminate="false"
  background-color="var(--colorNeutralStroke1)"
/>
```

::

## 激活 / 隐藏

`:active="false"` 时整体透明且动画暂停（对齐 WinUI `IsActive=false` → `Opacity=0`），常用于「加载完即消失」的场景。

::demo-block{title="IsActive 开关"}
#preview
:ProgressRingActiveDemo
#code

```vue
<FluereProgressRing :active="active" />
```

::

## 禁用

`disabled` 时前景色降级为 `…Disabled` 档（不确定 / 确定两种形态均生效）。

::demo-block{title="禁用状态"}
#preview
:ProgressRingDisabledDemo
#code

```vue
<FluereProgressRing disabled />
<FluereProgressRing disabled :indeterminate="false" :model-value="60" />
```

::

## API

| 属性（Props）     | 类型                             | 默认       | 说明                                                                     |
| ----------------- | -------------------------------- | ---------- | ------------------------------------------------------------------------ |
| `indeterminate`   | `boolean`                        | `true`     | 不确定（转圈）模式，对齐 WinUI IsIndeterminate                           |
| `active`          | `boolean`                        | `true`     | 激活；false 时透明且动画暂停，对齐 WinUI IsActive                        |
| `modelValue`      | `number`                         | `0`        | 当前进度值（确定态生效，`v-model`）                                      |
| `min`             | `number`                         | `0`        | 最小值                                                                   |
| `max`             | `number`                         | `100`      | 最大值                                                                   |
| `size`            | `'small' \| 'medium' \| 'large'` | `'medium'` | 尺寸：16 / 32（WinUI 默认）/ 48                                          |
| `backgroundColor` | `string`                         | `—`        | 轨道（底环）颜色，任意 CSS 颜色；对齐 WinUI `Background`，缺省透明无轨道 |
| `disabled`        | `boolean`                        | `false`    | 禁用（前景降级 …Disabled 档）                                            |
| `label`           | `string`                         | `—`        | 可访问名称（`aria-label`）；纯装饰场景由消费方决定标注与否               |

> 实现要点：不确定态是实色圆头弧段（`RoundLineCap`，无渐变），2s / 一轮：弧长 0 → 半周长 → 0，起点与终点分别对应 Lottie 的 `TrimStart / TrimEnd` 分段线性关键帧，可见旋转 900°/轮（Lottie `RotationAngleInDegrees`，其 `cubic-bezier(.167,.167,.833,.833)` 缓动恒等线性），弧长为 0 时两端圆头合成一个「直径 = 线宽」的圆点，周期首尾在模 360° 下重合、无缝循环。
>
> 旋转与弧长由**同一条** `@keyframes` 驱动，且每项属性在周期边界处「视觉等价」（旋转跳 2 整圈、`stroke-dashoffset` 跳 1 整圈而此刻弧长为 0）。这是刻意设计：Lottie 的旋转跳变（900° ≡ 180°）与 dash 半圈跳变必须同时翻页才互相抵消，若拆成「父元素旋转 + 子元素 dash」两条动画，负载高时会出现一条已翻页、另一条未翻页的帧，整环瞬间翻转 180°（表现为「弧接近顶部时底部闪一个小圆点」）。
>
> 确定态弧长走 `stroke-dashoffset` 过渡。动画时长 / 缓动来自 Fluent `duration*`、`curve*` 令牌，并遵循 `prefers-reduced-motion`（减弱时停动画并停在半环）。
