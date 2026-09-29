---
title: Progress Ring 进度环
description: 环形进度指示：不确定（转圈）与确定（弧长）两种形态，样式还原 WinUI 3 ProgressRing。
nav:
  title: Progress Ring 进度环
---

# Progress Ring 进度环

Progress Ring 用来指示正在进行、但暂不可量化的操作（不确定态「转圈」），或展示已可量化的进度（确定态弧长）。样式对齐 WinUI 3 / Windows App SDK 的 ProgressRing（`microsoft-ui-xaml` `winui3/release/2.0-stable`）：圆环几何（r≈14 / 32px 控件、stroke≈3、圆线帽）、品牌前景色、透明无底环、彗星动画（弧头亮、弧尾渐隐，≈450°/s 顺时针匀速）；组件为纯装饰指示（`pointer-events: none`、不进 Tab 序、SVG 对屏幕阅读器隐藏）。

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

| 属性（Props）   | 类型                             | 默认       | 说明                                                       |
| --------------- | -------------------------------- | ---------- | ---------------------------------------------------------- |
| `indeterminate` | `boolean`                        | `true`     | 不确定（转圈）模式，对齐 WinUI IsIndeterminate             |
| `active`        | `boolean`                        | `true`     | 激活；false 时透明且动画暂停，对齐 WinUI IsActive          |
| `modelValue`    | `number`                         | `0`        | 当前进度值（确定态生效，`v-model`）                        |
| `min`           | `number`                         | `0`        | 最小值                                                     |
| `max`           | `number`                         | `100`      | 最大值                                                     |
| `size`          | `'small' \| 'medium' \| 'large'` | `'medium'` | 尺寸：16 / 32（WinUI 默认）/ 48                            |
| `disabled`      | `boolean`                        | `false`    | 禁用（前景降级 …Disabled 档）                              |
| `label`         | `string`                         | `—`        | 可访问名称（`aria-label`）；纯装饰场景由消费方决定标注与否 |

> 实现要点：不确定态彗星弧头亮、弧尾渐变隐没（`linearGradient` 作用于 stroke），整环 0.8s/圈 线性匀速顺时针旋转（≈450°/s，对齐 WinUI Lottie 可见转速）；确定态弧长走 `stroke-dashoffset` 过渡。动画时长 / 缓动来自 Fluent `duration*`、`curve*` 令牌，并遵循 `prefers-reduced-motion`（减弱时停止旋转与过渡）。
