---
title: Progress Bar 进度条
description: 线性进度指示：不确定（滑块循环）与确定（按比例填充）两种形态，样式还原 WinUI 3 ProgressBar。
nav:
  title: Progress Bar 进度条
---

# Progress Bar 进度条

Progress Bar 用一条 3px 高的细线指示「正在进行、但不可量化」的操作（不确定态：两条滑块循环滑动），或展示「已知总量」的完成比例（确定态：自左向右按比例填充）。

样式对齐 WinUI 3 / Windows App SDK 的 ProgressBar（`microsoft-ui-xaml` `winui3/release/2.5.1`，已核对与最新 WinUI3 Gallery 发行版 v2.9.3 所用的 WindowsAppSDK 2.0.1 源码逐字节一致）：

- **几何**：控件高 3（`ProgressBarMinHeight`）、圆角 1.5（`ProgressBarCornerRadius`）；轨道高 **1**（`ProgressBarTrackHeight`）、圆角 0.5（`ProgressBarTrackCornerRadius`）并垂直居中——所以「凹槽」看起来比指示条细。
- **配色**：填充 `AccentFillColorDefaultBrush`；轨道 `ControlStrongStrokeColorDefault`；暂停 `SystemFillColorCaution`；出错 `SystemFillColorCritical`。
- **动效**：不确定态 2s / 轮（滑块 1：0→1.5s 从左扫到右后停留；滑块 2：0.75s 后起步，2s 时到右端），`RepeatBehavior=Forever`。

::demo-block{title="不确定态（正在进行，无法量化）"}
#preview
:ProgressIndeterminateDemo
#code

```vue
<FluereProgressBar indeterminate label="正在进行" />
```

::

## 确定态进度

`:indeterminate="false"`（默认）即确定态：填充宽 = `(value − min) / (max − min)`，自左向右增长。`min` 默认 0、`max` 默认 100，`value` 自动钳位到该区间；`max === min` 时按 WinUI 的分支把填充宽置 0。

下面这个示例与 WinUI3 Gallery 的「A determinate progress bar」一致：进度条 + 百分比文本 + 内联 `NumberBox`。

::demo-block{title="确定态（用 NumberBox 调整进度）"}
#preview
:ProgressDeterminateDemo
#code

```vue
<FluereProgressBar v-model="value" label="确定态进度条示例" style="width: 130px" />
<FluereNumberBox v-model="value" :min="0" :max="100" spin-button-placement-mode="inline" />
```

::

## 状态：Running / Paused / Error

WinUI 用两个独立布尔表达异常态：`showPaused`（`ShowPaused`）与 `showError`（`ShowError`），两者同为真时 **error 优先**（`ProgressBar.cpp#UpdateStates` 的判断顺序）。

- 确定态：只改填充色（暂停 → `SystemFillColorCaution`，出错 → `SystemFillColorCritical`），过渡时长 167ms。
- 不确定态：退化为「一条 **100% 宽**的 paused / error 色指示条从左滑入并停在满格」（WinUI 在 `IndeterminatePaused` / `IndeterminateError` 状态里把第二条滑块宽度设为满宽、位移收到 0），轨道同时隐藏。

::demo-block{title="不确定态的三种进度状态（对齐 Gallery 的 Progress state 选项）"}
#preview
:ProgressStatesDemo
#code

```vue
<FluereProgressBar
  indeterminate
  :show-paused="state === 'paused'"
  :show-error="state === 'error'"
/>
```

::

::demo-block{title="确定态的 paused / error 填充色"}
#preview
:ProgressStatusColorDemo
#code

```vue
<FluereProgressBar v-model="value" />
<FluereProgressBar v-model="value" show-paused />
<FluereProgressBar v-model="value" show-error />
```

::

## 轨道色（Background）

`background-color` 对应 WinUI `ProgressBar.Background`（默认 `ControlStrongStrokeColorDefault`）。WinUI 该值是**半透明**的 45% 黑（Light）/ 54.5% 白（Dark），Fluent 2 Web 的 token 表里没有同值项，因此本库默认取语义位最近的 `colorNeutralStrokeAccessible`；若要严格对齐实机观感，可用 `background-color` 传入等价半透明色。

::demo-block{title="默认轨道色 vs WinUI 原值（45% 黑）"}
#preview
:ProgressBackgroundDemo
#code

```vue
<FluereProgressBar v-model="value" />
<FluereProgressBar v-model="value" background-color="rgba(0, 0, 0, 0.45)" />
```

::

## 禁用

`disabled` 时前景降级为 `…Disabled` 档（本库约定：WinUI 的 ProgressBar 模板里没有 Disabled 视觉态，因为该控件本就不接受交互）。

::demo-block{title="禁用状态"}
#preview
:ProgressDisabledDemo
#code

```vue
<FluereProgressBar v-model="value" disabled />
<FluereProgressBar indeterminate disabled />
```

::

## API

| 属性（Props）     | 类型      | 默认    | 说明                                                                            |
| ----------------- | --------- | ------- | ------------------------------------------------------------------------------- |
| `modelValue`      | `number`  | `0`     | 当前进度值（确定态生效，`v-model`）；对齐 WinUI `RangeBase.Value`               |
| `min`             | `number`  | `0`     | 最小值；对齐 WinUI `RangeBase.Minimum`                                          |
| `max`             | `number`  | `100`   | 最大值；对齐 WinUI `RangeBase.Maximum`                                          |
| `indeterminate`   | `boolean` | `false` | 不确定态；对齐 WinUI `IsIndeterminate`                                          |
| `showError`       | `boolean` | `false` | 出错态（填充 `SystemFillColorCritical`）；对齐 WinUI `ShowError`，优先于 paused |
| `showPaused`      | `boolean` | `false` | 暂停态（填充 `SystemFillColorCaution`）；对齐 WinUI `ShowPaused`                |
| `backgroundColor` | `string`  | `—`     | 轨道色（任意 CSS 颜色）；对齐 WinUI `ProgressBar.Background`                    |
| `disabled`        | `boolean` | `false` | 禁用（前景降级 …Disabled 档，本库约定）                                         |
| `label`           | `string`  | `—`     | 可访问名称（`aria-label`）                                                      |

> **无障碍**：确定态渲染 `role="progressbar"` + `aria-valuemin/valuemax/aria-valuenow` + 百分比 `aria-valuetext`；不确定态**不暴露 RangeValue 语义**（对齐 `ProgressBarAutomationPeer.GetPatternCore` 在 `IsIndeterminate` 时返回 `nullptr`）。WinUI 会在 Error / Paused / Indeterminate 时给可访问名加本地化状态前缀（`SR_ProgressBarErrorStatus` 等），本库暂无组件内建文案通道（i18n 属 0.3.0 目标 1.4），需要时请在 `label` 中自行体现。
>
> **实现要点**
>
> - 语义底座复用 reka-ui 的 `ProgressRoot`（`role` / `data-state`），但它的值域固定为 `0..max` 且不允许负 `min`，因此传给它的是**归一化**值域，`aria-valuemin/max/now` 由组件按 WinUI 原始值域显式覆盖。
> - 不确定态两条滑块的位移全部来自 `ProgressBarTemplateSettings`：以 `W` 为控件宽，`w₁ = 0.4W`、`w₂ = 0.6W`；滑块 1 位移 `−w₁ → 3w₁`（即自身宽的 `−100% → 300%`，1.5s 走完、2s 前保持），滑块 2 位移 `−1.5w₂ → 1.66w₂`（`−150% → 166%`，0.75s 起走、2s 到达）。XAML 的关键帧缓动是 `KeySpline="0.4,0,0.6,1"`（标准 ease-in-out），Fluent token 表无同值项，取语义位最近的 `--curveEasyEase`（`0.33,0,0.67,1`）：冻结帧 7 点采样实测最大偏差 **5.64px / 246.5px 行程 ≈ 2.3%**，仅影响 tween 曲线，首尾位置与 WinUI 完全一致。
> - 确定态的填充是**像素宽**（WinUI 直接设 `Width`），本库以百分比等价表达；值变化时的补间在 WinUI 侧走 `Updating → Determinate` 的 `RepositionThemeAnimation`（未显式给 Duration，默认时长不在 `microsoft-ui-xaml` 快照内，取不到 A 级证据），本库用 `width` 过渡（`durationNormal` + `curveEasyEase`）表达同一意图。
> - 暂停 / 出错的变色是 XAML 里显式的 `ColorAnimation Duration="0:0:0.167"`，本库按仓库对 167ms 的统一近似取 `--durationFast`。
> - 动效遵循 `prefers-reduced-motion`：关闭时不确定态留下「一条 40% 宽的静态指示条停在左端」，paused / error 停在满格终态，不会出现空白条。
