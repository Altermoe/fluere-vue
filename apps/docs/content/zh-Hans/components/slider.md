---
title: Slider 滑块
description: 滑块组件，用于在连续区间内拖动取值。
nav:
  title: Slider 滑块
---

# Slider 滑块

滑块让用户在一个连续区间内拖动取值（音量、亮度、字号、价格区间……）。样式与手感还原 WinUI 3（Windows App SDK）的 **Slider**，交互底座复用 reka-ui 的 Slider：指针拖拽、按 step 吸附、`Home` / `End` / 方向键 / `PageUp` / `PageDown` 键盘操作、`role="slider"` 语义与表单提交都由底座承担，本组件负责把 WinUI 的几何与状态逐项落地。

几何全部取自 WinUI 原值：控件高 32px（`SliderPreContentMargin` 14 + 轨道 4 + `SliderPostContentMargin` 14）、轨道厚 4px、轨道圆角 2px、滑块 18×18 的布局盒外再靠 `Margin=-2` 撑出 22×22 的视觉外圈（正圆，半径按半宽收敛）、内点 12px。

指针交互同样对齐 WinUI：按在滑块上（整个 22×22 的可见外圈都算）只是「抓住」滑块，数值不变；按在滑块之外的轨道上才把滑块中心移到指针处跳值（`MoveThumbToPoint`）。

## 基础用法

`v-model` 绑定数值，`min` / `max` / `step` 决定区间与步进（默认 0–100、步进 1）；`header` 是 WinUI 的标题行，同时作为缺省的可访问名。

::demo-block{title="基础用法"}
#preview
:SliderBasicDemo
#code

```vue
<FluereSlider v-model="volume" header="音量" />
<FluereSlider v-model="brightness" header="亮度" />
```

::

## 标题与数值提示

顶部标题用 `header` 或 `#header` 插槽。按住滑块（或在键盘聚焦时）滑块上方会浮出 WinUI 的数值提示（Disambiguation UI）：文本按 `step` 的小数位格式化，最多保留 4 位；传 `tooltip="false"` 对应 `IsThumbToolTipEnabled=false`。

::demo-block{title="标题 + 数值提示"}
#preview
:SliderHeaderDemo
#code

```vue
<FluereSlider v-model="fontSize" :min="9" :max="72" header="字号">
  <template #header>字号（{{ fontSize }} px）</template>
</FluereSlider>
```

::

## 区间与步进

方向键按 `step` 走一步，`PageUp` / `PageDown` 或 `Shift` + 方向键跳 10 步，`Home` / `End` 直达两端；拖动时按 `step` 吸附并钳制在 `[min, max]` 内。

::demo-block{title="区间与步进"}
#preview
:SliderStepDemo
#code

```vue
<FluereSlider v-model="price" :min="0" :max="1000" :step="50" header="价格" />
<FluereSlider v-model="ratio" :min="0" :max="1" :step="0.1" header="缩放" />
```

::

## 纵向

`orientation="vertical"` 切换为纵向：取值自下而上递增（与 WinUI 一致，最小值在底部），传 `inverted` 反向。纵向高度由 `verticalLength`（默认 200px）决定。

::demo-block{title="纵向"}
#preview
:SliderVerticalDemo
#code

```vue
<FluereSlider v-model="bass" orientation="vertical" :vertical-length="160" label="低音" />
<FluereSlider v-model="treble" orientation="vertical" :vertical-length="160" label="高音" />
```

::

## 刻度线

`tickPlacement` 对应 WinUI `TickPlacement`：`none`（默认）/ `inline`（轨道内）/ `outside`（轨道两侧）/ `top-left` / `bottom-right`（单侧，纵向时即左 / 右）。与 WinUI 一致，`tickFrequency` 为 0（默认）时不画刻度线。

::demo-block{title="刻度线"}
#preview
:SliderTicksDemo
#code

```vue
<FluereSlider v-model="inline" tick-placement="inline" :tick-frequency="10" />
<FluereSlider v-model="outside" tick-placement="outside" :tick-frequency="10" />
```

::

## 禁用

`disabled` 时不可交互，轨道、数值填充、滑块与标题一起落到 …Disabled 档；内点停在 WinUI `Disabled` 状态里的 14px 尺寸。

::demo-block{title="禁用状态"}
#preview
:SliderDisabledDemo
#code

```vue
<FluereSlider :model-value="35" disabled header="禁用" />
```

::

## 表单提交

位于 `<form>` 内并传 `name` 时，会补一个隐藏的原生 `<input type="hidden">`，提交 `name=value`。

::demo-block{title="表单提交"}
#preview
:SliderFormDemo
#code

```vue
<form @submit.prevent="onSubmit">
  <FluereSlider v-model="gain" name="gain" header="增益" />
  <FluereButton type="submit" appearance="primary">提交</FluereButton>
</form>
```

::

## API

| 属性（Props）    | 类型                                                              | 默认           | 说明                                                |
| ---------------- | ----------------------------------------------------------------- | -------------- | --------------------------------------------------- |
| `modelValue`     | `number`                                                          | `—`            | 当前值（`v-model`），缺省时走 `defaultValue` 非受控 |
| `defaultValue`   | `number`                                                          | `min`          | 非受控初始值                                        |
| `min` / `max`    | `number`                                                          | `0` / `100`    | 区间（WinUI `RangeBase.Minimum` / `Maximum`）       |
| `step`           | `number`                                                          | `1`            | 步进（WinUI `StepFrequency`）                       |
| `disabled`       | `boolean`                                                         | `false`        | 是否禁用                                            |
| `orientation`    | `'horizontal' \| 'vertical'`                                      | `'horizontal'` | 方向                                                |
| `inverted`       | `boolean`                                                         | `false`        | 反向（WinUI `IsDirectionReversed`）                 |
| `header`         | `string`                                                          | `—`            | 顶部标题（WinUI `Header`），同时是缺省可访问名      |
| `label`          | `string`                                                          | `—`            | 可访问名称（优先于 `header`）                       |
| `name`           | `string`                                                          | `—`            | 表单提交名，配合隐藏原生 input                      |
| `tooltip`        | `boolean`                                                         | `true`         | 数值提示（WinUI `IsThumbToolTipEnabled`）           |
| `tickPlacement`  | `'none' \| 'inline' \| 'outside' \| 'top-left' \| 'bottom-right'` | `'none'`       | 刻度位置（WinUI `TickPlacement`）                   |
| `tickFrequency`  | `number`                                                          | `0`            | 刻度间隔（WinUI `TickFrequency`），0 = 不画         |
| `verticalLength` | `number`                                                          | `200`          | 纵向时的控件长度（px）                              |
| `dir`            | `'ltr' \| 'rtl'`                                                  | `—`            | 阅读方向                                            |

| 事件（Events）      | 载荷     | 说明                   |
| ------------------- | -------- | ---------------------- |
| `update:modelValue` | `number` | 值变化（`v-model`）    |
| `valueCommit`       | `number` | 一次交互结束时的最终值 |

| 插槽（Slots） | 说明                         |
| ------------- | ---------------------------- |
| `header`      | 顶部标题行（WinUI `Header`） |

> 状态配色对照 `Slider_themeresources.xaml`：轨道 `ControlStrongFillColorDefault`（hover / pressed 同色）、数值填充 `AccentFillColorDefault` → `Secondary` → `Tertiary`、滑块外圈 `ControlSolidFillColorDefault` + `ControlElevationBorderBrush`、内点缩放 `0.86` / `1.167` / `0.71`（Disabled 停在 `1.167`）。焦点环走本库统一的 Fluent 规范（`strokeWidthThick` + `colorCompoundBrandStroke`），与 WinUI 的 `FocusVisualMargin=-7,0` 双色矩形是同一意图的两种落地。
