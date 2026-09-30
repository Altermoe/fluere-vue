---
title: Button 按钮
description: 按钮组件，用于触发操作。
nav:
  title: Button 按钮
---

# Button 按钮

按钮组件，用于触发操作。

## 外观变体

::demo-block{title="外观变体"}
#preview
:ButtonAppearanceDemo
#code

```vue
<FluereButton appearance="primary">Primary</FluereButton>
<FluereButton appearance="secondary">Secondary</FluereButton>
<FluereButton appearance="outline">Outline</FluereButton>
<FluereButton appearance="subtle">Subtle</FluereButton>
<FluereButton appearance="transparent">Transparent</FluereButton>
```

::

## 尺寸

::demo-block{title="尺寸"}
#preview
:ButtonSizeDemo
#code

```vue
<FluereButton size="small">Small</FluereButton>
<FluereButton size="medium">Medium</FluereButton>
<FluereButton size="large">Large</FluereButton>
```

::

## 形状

::demo-block{title="形状"}
#preview
:ButtonShapeDemo
#code

```vue
<FluereButton shape="rounded">Rounded</FluereButton>
<FluereButton shape="circular">Circular</FluereButton>
<FluereButton shape="square">Square</FluereButton>
```

::

## 禁用状态

::demo-block{title="禁用状态"}
#preview
:ButtonDisabledDemo
#code

```vue
<FluereButton appearance="primary" disabled>Primary</FluereButton>
<FluereButton appearance="secondary" disabled>Secondary</FluereButton>
<FluereButton appearance="outline" disabled>Outline</FluereButton>
<FluereButton appearance="subtle" disabled>Subtle</FluereButton>
<FluereButton appearance="transparent" disabled>Transparent</FluereButton>
```

::

## 选中状态（Toggle）

::demo-block{title="选中状态（Toggle）"}
#preview
:ButtonSelectedDemo
#code

```vue
<FluereButton appearance="primary" selected>Primary</FluereButton>
<FluereButton appearance="secondary" selected>Secondary</FluereButton>
<FluereButton appearance="outline" selected>Outline</FluereButton>
<FluereButton appearance="subtle" selected>Subtle</FluereButton>
<FluereButton appearance="transparent" selected>Transparent</FluereButton>
```

::

## 块级按钮

::demo-block{title="块级按钮"}
#preview
:ButtonBlockDemo
#code

```vue
<FluereButton appearance="primary" block>Block Primary</FluereButton>
<FluereButton appearance="secondary" block>Block Secondary</FluereButton>
```

::

## API

| 属性（Props）  | 类型                                                                 | 默认          | 说明                                                        |
| -------------- | -------------------------------------------------------------------- | ------------- | ----------------------------------------------------------- |
| `appearance`   | `'primary' \| 'secondary' \| 'outline' \| 'subtle' \| 'transparent'` | `'secondary'` | 外观变体；`primary` 为品牌色填充的主要行动点                |
| `size`         | `'small' \| 'medium' \| 'large'`                                     | `'medium'`    | 尺寸，高度分别为 24 / 32 / 40 px                            |
| `shape`        | `'rounded' \| 'circular' \| 'square'`                                | `'rounded'`   | 形状；`circular` 取 `borderRadiusCircular`，`square` 为直角 |
| `disabled`     | `boolean`                                                            | `false`       | 是否禁用                                                    |
| `selected`     | `boolean`                                                            | `false`       | 选中态（Toggle button 模式），渲染为 `aria-pressed`         |
| `block`        | `boolean`                                                            | `false`       | 块级显示，占满父容器宽度                                    |
| `type`         | `'button' \| 'submit' \| 'reset'`                                    | `'button'`    | 原生 `type`；显式默认 `button`，避免在表单里意外触发提交    |
| `icon`         | `Component`                                                          | `—`           | 图标组件（`@fluere-vue/icons` 的图标），装饰性、对 AT 隐藏  |
| `iconPosition` | `'before' \| 'after'`                                                | `'before'`    | 图标相对文本的位置（仅图标 + 文本模式生效）                 |
| `iconOnly`     | `boolean`                                                            | `false`       | 仅显示图标（等比紧凑模式），此时不渲染内容 `<span>`         |

| 插槽（Slots） | 说明                                                              |
| ------------- | ----------------------------------------------------------------- |
| `default`     | 按钮文本；`iconOnly` 为 `true` 时不渲染                           |
| `icon`        | 图标位；提供后取代 `icon` Prop（图标会带上 `aria-hidden="true"`） |

> 本组件不声明 `emits`、也不设置 `inheritAttrs: false`：`click` 等事件与 `aria-*`、`id`、`title` 等属性直接落到根节点原生 `<button>` 上，消费方按原生按钮的用法传即可。这也是 `iconOnly` 场景下需要消费方自行传 `aria-label` 的原因——图标对无障碍树不可见，可访问名只能来自外部。
