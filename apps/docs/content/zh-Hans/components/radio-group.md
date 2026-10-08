---
title: Radio 单选
description: 单选按钮组件，用于在一组互斥选项中选择一个。
nav:
  title: Radio 单选
---

# Radio 单选

单选组件把 WinUI 3 / Windows App SDK 的 **RadioButton** 还原为两个协作组件：`FluereRadioGroup`（组容器，管 `v-model`、同组互斥与方向键导航）与 `FluereRadioButton`（每一项）。交互底座复用 reka-ui 的 RadioGroup，完整还原方向键在组内循环导航 / 选中、选中态品牌实心圆 + 白色内点、按住时内点浅显预览（WinUI 独有的 `PressedCheckGlyph`）。

## 基础用法

`v-model` 绑定当前选中值，`FluereRadioButton` 的 `value` 决定各自的值。同组互斥，点击任意项选其一。

::demo-block{title="基础用法"}
#preview
:RadioBasicDemo
#code

```vue
<FluereRadioGroup v-model="color">
  <FluereRadioButton value="red">番茄红</FluereRadioButton>
  <FluereRadioButton value="teal">蓝绿</FluereRadioButton>
  <FluereRadioButton value="blue">星辰蓝</FluereRadioButton>
</FluereRadioGroup>
```

::

## 横向组

默认纵向堆叠；传 `orientation="horizontal"` 改为横向排开（可叠加 `flex-wrap` 换行）。

::demo-block{title="横向排布"}
#preview
:RadioOrientationDemo
#code

```vue
<FluereRadioGroup v-model="align" orientation="horizontal">
  <FluereRadioButton value="left">左对齐</FluereRadioButton>
  <FluereRadioButton value="center">居中</FluereRadioButton>
  <FluereRadioButton value="right">右对齐</FluereRadioButton>
</FluereRadioGroup>
```

::

## 禁用

组级禁用传 `disabled`；只禁用个别项时在对应 `FluereRadioButton` 上传 `disabled`。

::demo-block{title="禁用状态"}
#preview
:RadioDisabledDemo
#code

```vue
<FluereRadioGroup v-model="plan" disabled>
  <FluereRadioButton value="free">免费版</FluereRadioButton>
  <FluereRadioButton value="pro">专业版</FluereRadioButton>
</FluereRadioGroup>

<FluereRadioGroup v-model="network">
  <FluereRadioButton value="wifi">Wi-Fi</FluereRadioButton>
  <FluereRadioButton value="ethernet" disabled>以太网</FluereRadioButton>
</FluereRadioGroup>
```

::

## 无障碍

`FluereRadioGroup` 自带 `role="radiogroup"`，每项自带 `role="radio"` + `aria-checked`；方向键（↑↓/←→ + Home/End）在组内循环导航并实时选中（reka roving focus）。可见文本本就在按钮内部，自动作为可访问名；若某项是纯图标（无可读文本），用 `label` 提供 `aria-label`；整组无可见标题时可在 `FluereRadioGroup` 上传 `label` 作为组的 `aria-label`。

## 表单提交

位于 `<form>` 内并传 `name` 时，会自动补隐藏原生 `<input type="radio">`，选中值随表单提交。建议把 `name` 放在组上即可让整组作为同一字段提交。

## API

### FluereRadioGroup

| 属性（Props）  | 类型                         | 默认       | 说明                                |
| -------------- | ---------------------------- | ---------- | ----------------------------------- |
| `modelValue`   | `AcceptableValue`            | `—`        | 当前选中值（`v-model`）             |
| `defaultValue` | `AcceptableValue`            | `—`        | 非受控初始选中值                    |
| `disabled`     | `boolean`                    | `false`    | 是否禁用整组单选项                  |
| `orientation`  | `'vertical' \| 'horizontal'` | `vertical` | 排布方向                            |
| `name`         | `string`                     | `—`        | 表单提交名（整组作为同一字段提交）  |
| `required`     | `boolean`                    | `false`    | 组内必选约束                        |
| `loop`         | `boolean`                    | `true`     | 方向键在首尾项之间循环导航          |
| `dir`          | `'ltr' \| 'rtl'`             | `—`        | 阅读方向（一般无需设置）            |
| `label`        | `string`                     | `—`        | 组的可访问名称（等价 `aria-label`） |

### FluereRadioButton

| 属性（Props） | 类型              | 默认    | 说明                                  |
| ------------- | ----------------- | ------- | ------------------------------------- |
| `value`       | `AcceptableValue` | `—`     | 该单选项的值（决定选中态 / 提交值）   |
| `disabled`    | `boolean`         | `false` | 是否禁用该项（叠加在组之上）          |
| `name`        | `string`          | `—`     | 该项表单提交名（通常用组上的 `name`） |
| `required`    | `boolean`         | `false` | 必选约束                              |
| `id`          | `string`          | `—`     | 原生 id，可与外部 label 的 `for` 关联 |
| `label`       | `string`          | `—`     | 纯图标时的 `aria-label` 兜底          |

> 圆（circle）固定 20px 直径（对应 WinUI 的 RadioButton 圆尺寸），不随尺寸缩放；选中态为「品牌色实心圆 + 白色内点」，按住时内点浅显预览——与 WinUI RadioButton 一致。
