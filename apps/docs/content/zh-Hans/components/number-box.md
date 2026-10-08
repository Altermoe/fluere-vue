---
title: NumberBox 数字框
description: 数字输入框，用于录入数字、校验区间与步进取值。
nav:
  title: NumberBox 数字框
---

# NumberBox 数字框

数字框让用户输入与调整数字（数量、价格、税率、字号……）。样式与行为还原 WinUI 3（Windows App SDK）的 **NumberBox**：它本质上是一个 **TextBox + 数学解析 + `NaN` 语义**，因此本组件内嵌 `FluereInput`（与 WinUI 模板里内嵌 TextBox 一致），并把 WinUI 的取值口径、校验模式、增减按钮与内联表达式逐项落地。

取值遵循 WinUI 的 **Value ↔ Text 双通道**：值变化时用格式化文本回写输入框；失焦或回车时解析文本再更新值。清空输入框会得到 `null`（对应 WinUI 的 `NaN`），此时显示 `placeholder`。

> 与 `docs/todo.md` 原计划的差异：原本打算复用 reka-ui 的 `NumberField`，但它的 `NumberFieldInput` 与 WinUI 有几处硬冲突 —— `Home` / `End` 被映射成最小值 / 最大值（WinUI 交给 TextBox 移动光标）、非法输入在失焦时把值清空（WinUI 保留原值）、方向键按步长吸附（WinUI 直接相加）、滚轮方向相反、`LargeChange` 写死 10 步。这里保留「复用」的思路但改为自持实现：`format` / `parse` / `expression` / `step` 四个纯函数层 + `use-number-box` / `use-spin-repeat` 两个 hook，可单独单测。

## 基础用法

`v-model` 绑定数值，`header` 是 WinUI 的标题行（同时作为缺省的可访问名），`description` 渲染在控件下方并作为 `aria-describedby`。

::demo-block{title="基础用法"}
#preview
:NumberBoxBasicDemo
#code

```vue
<FluereNumberBox v-model="quantity" header="数量" />
<FluereNumberBox v-model="price" header="单价" description="支持小数" />
```

::

## 区间与步进

`min` / `max` 对应 `Minimum` / `Maximum`（缺省不设上下界，此时也不渲染 `aria-valuemin` / `aria-valuemax`）；`step` 是 `SmallChange`（方向键 / 滚轮 / 增减按钮），`largeStep` 是 `LargeChange`（`PageUp` / `PageDown`）。与 WinUI 一致：**不做步长吸附**，只在越界时钳制（或回绕）。

::demo-block{title="区间与步进"}
#preview
:NumberBoxStepDemo
#code

```vue
<FluereNumberBox
  v-model="quantity"
  :min="0"
  :max="500"
  :step="10"
  :large-step="100"
  header="数量"
/>
<FluereNumberBox v-model="ratio" :min="0" :max="1" :step="0.1" header="比例" />
```

::

传 `wrap-enabled` 对应 `IsWrapEnabled`：到端点后回绕到另一端，且两个按钮始终可用。

## 增减按钮

`spinButtonPlacementMode` 对应 `SpinButtonPlacementMode`：`hidden`（默认）/ `inline`（输入框右侧内联上 / 下按钮）/ `compact`（聚焦时浮出按钮面板）。`inline` 与输入框共用一个 TextBox 边框，按钮 32×24、外边距 4、圆角 4；按住按钮会立即步进一次，随后每 250ms 重复（WinUI `RepeatButton` 的 `Delay` / `Interval` 缺省值）。按钮不进入 Tab 序列（WinUI `IsTabStop=False`），但可用 `Enter` / `Space` 激活。

::demo-block{title="内联按钮"}
#preview
:NumberBoxInlineDemo
#code

```vue
<FluereNumberBox
  v-model="fontSize"
  :min="9"
  :max="72"
  spin-button-placement-mode="inline"
  header="字号"
/>
<FluereNumberBox
  v-model="zoom"
  :min="0.5"
  :max="3"
  :step="0.25"
  spin-button-placement-mode="inline"
  header="缩放"
/>
```

::

::demo-block{title="紧凑按钮"}
#preview
:NumberBoxCompactDemo
#code

```vue
<FluereNumberBox
  v-model="opacity"
  :min="0"
  :max="100"
  spin-button-placement-mode="compact"
  header="不透明度"
/>
```

::

## 内联表达式

`accepts-expression` 对应 `AcceptsExpression`：失焦或回车时求值 `+ - * / ^` 与括号组成的表达式，优先级为 `^` > `*` `/` > `+` `-`。求值后原始表达式不会被保留（会替换为结果）。

::demo-block{title="内联表达式"}
#preview
:NumberBoxExpressionDemo
#code

```vue
<FluereNumberBox v-model="total" accepts-expression placeholder="例如 (2+3)*4^2" header="计算值" />
```

::

## 校验模式

`validationMode` 对应 `ValidationMode`：

- `invalidInputOverwritten`（默认）：失焦 / 回车时，非法输入被当前值的格式化文本覆盖，越界值钳制回区间；
- `disabled`：保留用户输入与越界值，交给消费方自行校验。

`Escape` 始终丢弃输入、回到当前值；`Enter` 结算输入（并吃掉按键，避免触发隐式表单提交，与 WinUI 处理 `Enter` 的方式一致）。

::demo-block{title="校验模式"}
#preview
:NumberBoxValidationDemo
#code

```vue
<FluereNumberBox v-model="strict" :min="0" :max="100" header="默认：非法输入被覆盖" />
<FluereNumberBox
  v-model="lenient"
  :min="0"
  :max="100"
  validation-mode="disabled"
  header="保留输入"
/>
```

::

## 格式化与区域设置

`formatOptions`（`Intl.NumberFormatOptions`）对应 `NumberFormatter`，`locale` 决定小数点 / 分组分隔符 / 负号 —— **显示与解析共用同一套符号**。SSR 应用建议显式传 `locale`：缺省时用运行环境的默认区域设置，而服务端与浏览器的默认值可能不同（例如 de-DE 的小数点），首帧会出现水合不一致。

WinUI 的默认 `DecimalFormatter` 被设成 `IntegerDigits(1)` + `FractionDigits(0)`，在多个 WinAppSDK 版本上会把显示值四舍五入到整数（[microsoft/microsoft-ui-xaml#8780](https://github.com/microsoft/microsoft-ui-xaml/issues/8780)：输入 25.8 失焦后显示 26）。Web 侧缺省不丢小数（`maximumFractionDigits: 20`），否则 `step = 0.1` 这类用法在显示层直接不可用；需要 WinUI 的整数观感时传 `:format-options="{ maximumFractionDigits: 0 }"` 即可。显示前还会做一次 WinUI 的 10 位有效数字舍入，抹掉 `0.1 + 0.2 = 0.30000000000000004` 这类浮点噪声。

::demo-block{title="格式化与区域设置"}
#preview
:NumberBoxFormatDemo
#code

```vue
<FluereNumberBox
  v-model="integer"
  :format-options="{ maximumFractionDigits: 0 }"
  header="整数外观"
/>
<FluereNumberBox
  v-model="fixed"
  :format-options="{ minimumFractionDigits: 2, maximumFractionDigits: 2 }"
  header="固定两位小数"
/>
<FluereNumberBox v-model="german" locale="de-DE" header="de-DE：1.234,5" />
```

::

## 禁用

::demo-block{title="禁用状态"}
#preview
:NumberBoxDisabledDemo
#code

```vue
<FluereNumberBox
  :model-value="35"
  :min="0"
  :max="100"
  disabled
  spin-button-placement-mode="inline"
  header="禁用"
/>
```

::

## 表单提交

位于 `<form>` 内并传 `name` 时，会补一个隐藏的原生 `<input type="hidden">`，提交 `name=value`（无值时提交空串）。

::demo-block{title="表单提交"}
#preview
:NumberBoxFormDemo
#code

```vue
<form @submit.prevent="onSubmit">
  <FluereNumberBox v-model="amount" name="amount" :min="0" :step="8" spin-button-placement-mode="inline" header="金额" />
  <FluereButton type="submit" appearance="primary">提交</FluereButton>
</form>
```

::

## API

| 属性（Props）             | 类型                                      | 默认                        | 说明                                                           |
| ------------------------- | ----------------------------------------- | --------------------------- | -------------------------------------------------------------- |
| `modelValue`              | `number \| null`                          | `—`                         | 当前值（`v-model`）；`null` 表示无值（WinUI 的 `NaN`）         |
| `defaultValue`            | `number \| null`                          | `null`                      | 非受控初始值                                                   |
| `min` / `max`             | `number`                                  | `—`（不设界）               | 区间（WinUI `Minimum` / `Maximum`）                            |
| `step`                    | `number`                                  | `1`                         | 步长（WinUI `SmallChange`）                                    |
| `largeStep`               | `number`                                  | `10`                        | 大步长（WinUI `LargeChange`，`PageUp` / `PageDown`）           |
| `disabled`                | `boolean`                                 | `false`                     | 是否禁用                                                       |
| `header`                  | `string`                                  | `—`                         | 顶部标题（WinUI `Header`），同时是缺省可访问名                 |
| `label`                   | `string`                                  | `—`                         | 可访问名称（优先于 `header`）                                  |
| `description`             | `string`                                  | `—`                         | 控件下方说明（WinUI `Description`），并作为 `aria-describedby` |
| `placeholder`             | `string`                                  | `—`                         | 占位符（WinUI `PlaceholderText`），仅无值时显示                |
| `name`                    | `string`                                  | `—`                         | 表单提交名，配合隐藏原生 input                                 |
| `locale`                  | `string`                                  | `—`                         | BCP 47 语言标记，决定格式化与解析符号                          |
| `formatOptions`           | `Intl.NumberFormatOptions`                | `maximumFractionDigits: 20` | 数值格式（WinUI `NumberFormatter`）                            |
| `spinButtonPlacementMode` | `'hidden' \| 'compact' \| 'inline'`       | `'hidden'`                  | 增减按钮呈现方式（WinUI `SpinButtonPlacementMode`）            |
| `validationMode`          | `'invalidInputOverwritten' \| 'disabled'` | `'invalidInputOverwritten'` | 校验模式（WinUI `ValidationMode`）                             |
| `wrapEnabled`             | `boolean`                                 | `false`                     | 到端点后回绕（WinUI `IsWrapEnabled`）                          |
| `acceptsExpression`       | `boolean`                                 | `false`                     | 是否解析内联表达式（WinUI `AcceptsExpression`）                |
| `increaseLabel`           | `string`                                  | `'Increase'`                | 加号按钮可访问名（WinUI 由资源本地化）                         |
| `decreaseLabel`           | `string`                                  | `'Decrease'`                | 减号按钮可访问名                                               |

| 事件（Events）      | 载荷                                                     | 说明                                |
| ------------------- | -------------------------------------------------------- | ----------------------------------- |
| `update:modelValue` | `number \| null`                                         | 值变化（`v-model`）                 |
| `valueChanged`      | `{ oldValue: number \| null, newValue: number \| null }` | 值变化（对应 WinUI `ValueChanged`） |

| 插槽（Slots） | 说明                                            |
| ------------- | ----------------------------------------------- |
| `header`      | 顶部标题行（WinUI `Header` / `HeaderTemplate`） |
| `description` | 控件下方说明（WinUI `Description`）             |

> 键盘与指针口径对照 `NumberBox.cpp`：方向键按 `SmallChange`、`PageUp` / `PageDown` 按 `LargeChange`、`Enter` 结算、`Escape` 回滚、获得焦点即全选文本；滚轮仅在输入框持有焦点时响应，向上滚为增（`MouseWheelDelta > 0`）。WinUI 把 `Home` / `End` 留给 TextBox，本组件同样不把它们当作步进键。
>
> 无障碍：输入框带 `role="spinbutton"` 与 `aria-valuenow` / `aria-valuemin` / `aria-valuemax`（未设置上下界时后两者不渲染，对应 WinUI 只在 `Minimum` / `Maximum` 被改写时才把它们拼进 UIA name 的口径）；增减按钮不进 Tab 序列但可键盘激活，并带可访问名。
>
> 两处 Web 侧近似：紧凑浮层用 `colorNeutralBackground1` + `shadow16` 近似 WinUI 的 Acrylic 表面（Fluent 令牌集中没有材质令牌）；内联按钮出现时输入框右侧额外让出 84px，避免文本压到按钮上（WinUI 允许文本压在按钮下方）。
>
> WinUI 的 `Text` 属性不作为独立 prop 暴露：Web 侧输入框文本由 `v-model` 加格式化派生（`Value → Text`），需要自定义文本展示时用 `formatOptions`；WinUI「同时设置 `Text` 与 `Value` 时以 `Value` 为准」的初始化顺序因此不适用。
