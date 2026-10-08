---
title: Checkbox 复选框
description: 复选框组件，用于在若干项中选择一个或多个选项。
nav:
  title: Checkbox 复选框
---

# Checkbox 复选框

复选框允许用户在一组选项中选择一个或多个。样式还原 WinUI 3（Windows App SDK）的 CheckBox，交互底座复用 reka-ui。从「未勾选」进入「勾选 / 不确定」时，字形自左向右缓动出现（对应 WinUI CheckGlyph 画入）；取消勾选时字形立即消失。

## 基础用法

使用 `v-model` 双向绑定布尔值；默认勾选框在点击一次后切换。

::demo-block{title="基础用法"}
#preview
:CheckboxBasicDemo
#code

```vue
<FluereCheckbox v-model="agree">同意服务条款</FluereCheckbox>
<FluereCheckbox v-model="subscribe">订阅产品更新</FluereCheckbox>
```

::

## 不确定（三态）

`modelValue` 支持 `true` / `false` / `'indeterminate'`。不确定态渲染为横杠字形，再次点击进入勾选态。配合「全选」时先读取子项，再反写回各子项。

::demo-block{title="全选 · 不确定态"}
#preview
:CheckboxIndeterminateDemo
#code

```vue
<FluereCheckbox :model-value="allState" @update:model-value="toggleAll">
  全选
</FluereCheckbox>
<FluereCheckbox v-model="a">选项 A</FluereCheckbox>
<FluereCheckbox v-model="b">选项 B</FluereCheckbox>
<FluereCheckbox v-model="c">选项 C</FluereCheckbox>
```

::

## 禁用

`disabled` 时不可交互，填充、描边、字形、文字落到禁用档（对应 WinUI `ControlStrokeColorDisabled` / `AccentFillColorDisabled`）。

::demo-block{title="禁用状态"}
#preview
:CheckboxDisabledDemo
#code

```vue
<FluereCheckbox disabled>未勾选（禁用）</FluereCheckbox>
<FluereCheckbox disabled :model-value="true">已勾选（禁用）</FluereCheckbox>
<FluereCheckbox disabled :model-value="'indeterminate'">不确定（禁用）</FluereCheckbox>
```

::

## 表单提交

位于 `<form>` 内并传 `name` 时，会自动补一个隐藏的原生 `<input type="checkbox">`，勾选结果随表单提交（`value` 作为提交值，默认 `"on"`）。

::demo-block{title="表单提交"}
#preview
:CheckboxBasicDemo
#code

```vue
<form @submit.prevent>
  <FluereCheckbox name="opt-in" value="yes">同意接收邮件</FluereCheckbox>
</form>
```

::

## API

| 属性（Props） | 类型                                 | 默认    | 说明                           |
| ------------- | ------------------------------------ | ------- | ------------------------------ |
| `modelValue`  | `boolean \| 'indeterminate' \| null` | `false` | 勾选状态（`v-model`）          |
| `disabled`    | `boolean`                            | `false` | 是否禁用                       |
| `name`        | `string`                             | `—`     | 表单提交名，配合隐藏原生 input |
| `value`       | `AcceptableValue`                    | `'on'`  | 勾选时提交给后端的值           |

> 块（box）固定 20px（对应 WinUI `CheckBoxSize = 20`），不随尺寸缩放。
