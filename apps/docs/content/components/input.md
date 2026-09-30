---
title: Input 输入框
description: 输入框组件，用于获取用户文本输入。
nav:
  title: Input 输入框
---

# Input 输入框

输入框组件，用于获取用户文本输入。

## 基础用法

::demo-block{title="基础用法"}
#preview
:InputBasicDemo
#code

```vue
<FluereInput v-model="value" placeholder="请输入内容" />
<FluereInput placeholder="禁用状态" disabled />
```

::

## 尺寸

::demo-block{title="尺寸"}
#preview
:InputSizeDemo
#code

```vue
<FluereInput size="small" placeholder="Small (24px)" />
<FluereInput size="medium" placeholder="Medium (32px)" />
<FluereInput size="large" placeholder="Large (40px)" />
```

::

## 外观

::demo-block{title="外观"}
#preview
:InputAppearanceDemo
#code

```vue
<FluereInput appearance="outline" placeholder="Outline（默认）" />
<FluereInput appearance="underline" placeholder="Underline（下划线）" />
```

::

## 错误状态

::demo-block{title="错误状态"}
#preview
:InputInvalidDemo
#code

```vue
<FluereInput invalid placeholder="错误输入" aria-describedby="input-error-hint" />
<p id="input-error-hint">请输入有效的内容。</p>
```

::

## API

| 属性（Props） | 类型                                                                        | 默认        | 说明                                                                                              |
| ------------- | --------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------- |
| `modelValue`  | `string`                                                                    | `—`         | 输入值（`v-model`）                                                                               |
| `size`        | `'small' \| 'medium' \| 'large'`                                            | `'medium'`  | 尺寸，高度分别为 24 / 32 / 40 px（WinUI 默认 32）                                                 |
| `appearance`  | `'outline' \| 'underline'`                                                  | `'outline'` | 外观；`outline` 对应对齐 WinUI 的「抬升描边」，`underline` 为库扩展（只保留底边，WinUI 无此形态） |
| `disabled`    | `boolean`                                                                   | `false`     | 是否禁用                                                                                          |
| `invalid`     | `boolean`                                                                   | `false`     | 无效 / 错误态；库扩展（WinUI TextBox 无内建错误态），同时渲染 `aria-invalid`                      |
| `type`        | `'text' \| 'password' \| 'email' \| 'number' \| 'search' \| 'tel' \| 'url'` | `'text'`    | 原生 `type`                                                                                       |
| `placeholder` | `string`                                                                    | `—`         | 占位符                                                                                            |

> **本组件没有 Events 与 Slots**：模板就是单个原生 `<input>`，`defineModel` 只提供 `modelValue` / `update:modelValue` 一对，没有额外 `emits`；原生 input 不支持子内容，因此也没有插槽。`input` / `change` / `focus` / `blur` 等事件与 `autocomplete`、`maxlength`、`aria-describedby` 等属性直接落到原生 `<input>` 上，按原生用法传即可。
