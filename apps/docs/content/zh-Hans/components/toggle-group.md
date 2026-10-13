---
title: Toggle Group 切换按钮组
description: 一组切换按钮，支持单选与多选；视觉以 WinUI ToggleButton 为准，分组语义按 WAI-ARIA / reka-ui。
nav:
  title: Toggle Group 切换按钮组
---

# Toggle Group 切换按钮组

`FluereToggleGroup` 把若干 [`FluereToggleButton`](./toggle-button.md) 组成一个语义化的组：`role="group"`、组内单一 Tab 停靠点（roving tabindex）、方向键 / Home / End 移动焦点，取值支持单选（`string`）与多选（`string[]`）。

> **WinUI 没有 ToggleGroup 控件**：`microsoft-ui-xaml` tag `winui3/release/2.5.1` 里只有 `ToggleButton`（`git ls-tree -r winui3/release/2.5.1 | grep -i togglegroup` 为空）。所以本组件的分工是——**每一项的视觉严格以 WinUI `ToggleButton` 为准**（每项直接复用 `FluereToggleButton` 的同一份 SFC 样式，不复制状态表），**分组语义**则以 WAI-ARIA 的 toggle button group 契约 + reka-ui 为准，这一层没有 A 级源码可对。

## 基础用法（单选）

`v-model` 绑定当前取值（`string`），`FluereToggleGroupItem` 的 `value` 决定各自的值。单选组只保留一个选中项；**再次点击已选中项会取消选中**（值为 `undefined`，ARIA toggle button 允许全部未按下，与 RadioGroup 的「必须选中一项」不同）。

::demo-block{title="单选"}
#preview
:ToggleGroupSingleDemo
#code

```vue
<FluereToggleGroup v-model="align" label="文本对齐">
  <FluereToggleGroupItem value="left">左对齐</FluereToggleGroupItem>
  <FluereToggleGroupItem value="center">居中</FluereToggleGroupItem>
  <FluereToggleGroupItem value="right">右对齐</FluereToggleGroupItem>
</FluereToggleGroup>
```

::

若业务要求「必须选中一项」，在 `update:modelValue` 里把 `undefined` 回退成旧值即可：

```vue
<FluereToggleGroup :model-value="align" @update:model-value="(value) => (align = value ?? align)">
  <!-- … -->
</FluereToggleGroup>
```

## 多选

`type="multiple"` 时 `v-model` 是 `string[]`，点击即增删数组元素。`type` 缺省时按 `modelValue` / `defaultValue` 是否为数组推断（数组 → 多选）。

::demo-block{title="多选"}
#preview
:ToggleGroupMultipleDemo
#code

```vue
<FluereToggleGroup v-model="formats" type="multiple" label="文本格式">
  <FluereToggleGroupItem
    value="bold"
    icon-only
    :icon="FluentIconTextBold24Regular"
    label="加粗"
  />
  <FluereToggleGroupItem
    value="italic"
    icon-only
    :icon="FluentIconTextItalic24Regular"
    label="倾斜"
  />
</FluereToggleGroup>
```

::

## 禁用

组上 `disabled` 会叠加到每一项（整组不可交互，方向键也不会进入）；只禁用个别项时在对应 `FluereToggleGroupItem` 上传 `disabled`，方向键会**跳过**它。

::demo-block{title="禁用"}
#preview
:ToggleGroupDisabledDemo
#code

```vue
<FluereToggleGroup v-model="plan" disabled>
  <FluereToggleGroupItem value="free">免费版</FluereToggleGroupItem>
  <FluereToggleGroupItem value="pro">专业版</FluereToggleGroupItem>
</FluereToggleGroup>

<FluereToggleGroup v-model="network">
  <FluereToggleGroupItem value="wifi">Wi-Fi</FluereToggleGroupItem>
  <FluereToggleGroupItem value="ethernet" disabled>以太网</FluereToggleGroupItem>
</FluereToggleGroup>
```

::

## 尺寸、纵向与受控 / 非受控

组上 `size` 决定组内统一尺寸（`FluereToggleButton` 的 24 / 32 / 40 三档），项自己的 `size` 优先。`orientation="vertical"` 改为竖排，同时把方向键从左右换成上下。不传 `modelValue` 时是**非受控**（底座自管状态，`default-value` 给初值），传了就是受控。

::demo-block{title="尺寸与受控 / 非受控"}
#preview
:ToggleGroupSizeDemo
#code

```vue
<!-- 非受控：不传 modelValue，default-value 给初值 -->
<FluereToggleGroup size="small" default-value="day">
  <FluereToggleGroupItem value="day">日</FluereToggleGroupItem>
  <FluereToggleGroupItem value="week">周</FluereToggleGroupItem>
  <FluereToggleGroupItem value="month">月</FluereToggleGroupItem>
</FluereToggleGroup>

<!-- 受控 + 纵向 -->
<FluereToggleGroup v-model="large" size="large" orientation="vertical">
  <FluereToggleGroupItem value="day">日</FluereToggleGroupItem>
  <FluereToggleGroupItem value="week">周</FluereToggleGroupItem>
  <FluereToggleGroupItem value="month">月</FluereToggleGroupItem>
</FluereToggleGroup>
```

::

## 无障碍

- 容器是 `role="group"`；组内没有可见标题时用 `label` 提供 `aria-label`。
- 每一项都是原生 `<button type="button">`，选中态由 `aria-pressed` 表达（三态项为 `"mixed"`）；可访问名来自可见文本，纯图标项用 `label`。
- **roving tabindex**：Tab 先把焦点交给组容器，再落到组内当前项；随后用 `←` / `→`（纵向组为 `↑` / `↓`）、`Home` / `End` 在项之间移动焦点，跳过禁用项，`loop`（缺省 `true`）让首尾循环。焦点环沿用 0.4.3 的双层焦点矩形原语（`useFocusVisual`）。
- Space / Enter 触发切换由原生 `<button>` 保证。

## 规格来源

| 项           | 值                                                                                                          |
| ------------ | ----------------------------------------------------------------------------------------------------------- |
| 控件         | WinUI 3 **没有** ToggleGroup 控件；视觉以 `ToggleButton` 为准，分组语义以 WAI-ARIA / reka-ui 为准           |
| tag/commit   | `winui3/release/2.5.1` / `ba3a8d5`（本地快照 `temp/winui-src`）                                             |
| 视觉关键文件 | `src/controls/dev/CommonStyles/ToggleButton_themeresources.xaml`（完整映射表见 `toggle-button.vue` 文件头） |
| 行为关键文件 | `src/dxaml/xcp/dxaml/lib/ToggleButton_Partial.cpp`（`ChangeVisualState` / `OnToggleImpl`）                  |
| 分组底座     | reka-ui `2.10.1`：`ToggleGroupRoot`（取值语义 + roving focus）、`RovingFocusItem`（roving tabindex）        |

## 实现要点

- **视觉只有一处**：`FluereToggleGroupItem` 渲染的就是 `FluereToggleButton`（`toggle-group-item.vue` 里没有第二个 `<style>` 块、也没有任何颜色 / 描边声明），组里组外的按钮共用同一份状态表、几何与焦点原语，不会两套漂移。
- **底座分工**：reka 的 `ToggleGroupRoot` 产出 `role="group"`、管 single / multiple 取值、提供 roving focus；项这边用 `RovingFocusItem`（**不用** reka 的 `ToggleGroupItem`——它渲染的是 reka 自己的中性按钮外观，拿不到本库的 WinUI 外观）+ 注入 reka 的组上下文读写取值。
- **单选可清空**：沿用 reka / ARIA toggle button 语义——再次点击已选中项 → 值变 `undefined`；要「必须选中一项」用上面「基础用法」里的一行配方。
- **受控 / 非受控**：`modelValue === undefined` 时原样交给底座自管，并用底座抛回的 `update:modelValue` 回写本地状态；受控时只认 Prop。
- **组级尺寸**：WinUI 里「一组切换按钮」只是并排的按钮，没有组级尺寸概念；本库用自有 provide/inject 把组上的 `size` 下发给项（`--fui-*` 之外的库内扩展，见 `toggle-group/context.ts`），避免同组 24 / 32 / 40 混排。
- **已知缺口**：① 高对比度未实现（与库内其它组件一致，WinUI HC 下这些画刷走 `SystemColor*`）；② 组容器间距是本库自定（`--spacingHorizontalXS` 4px），WinUI 无对应控件可对；③ 未暴露 reka 的 `name` / `required`，需要随表单提交时请自行在组外补隐藏 `input`。

## API

### `FluereToggleGroup`

| 属性（Props）  | 类型                             | 默认           | 说明                                                      |
| -------------- | -------------------------------- | -------------- | --------------------------------------------------------- |
| `modelValue`   | `string \| string[]`             | —              | 当前取值（`v-model`）；不传则非受控                       |
| `defaultValue` | `string \| string[]`             | —              | 非受控初始值                                              |
| `type`         | `'single' \| 'multiple'`         | 按取值形状推断 | 单选（`string`）/ 多选（`string[]`）；数组 → `'multiple'` |
| `disabled`     | `boolean`                        | `false`        | 禁用整组                                                  |
| `orientation`  | `'horizontal' \| 'vertical'`     | `'horizontal'` | 排布方向；同时决定方向键用左右还是上下                    |
| `loop`         | `boolean`                        | `true`         | 方向键在首尾项之间循环                                    |
| `dir`          | `'ltr' \| 'rtl'`                 | —              | 阅读方向（一般无需设置）                                  |
| `size`         | `'small' \| 'medium' \| 'large'` | —              | 组内统一尺寸档；项自己的 `size` 优先                      |
| `label`        | `string`                         | —              | 组的可访问名称（等价 `aria-label`）                       |

| 事件（Emits）       | 载荷                              | 说明                                         |
| ------------------- | --------------------------------- | -------------------------------------------- |
| `update:modelValue` | `string \| string[] \| undefined` | 取值变化；单选组取消选中时载荷为 `undefined` |

| 插槽（Slots） | 说明                                |
| ------------- | ----------------------------------- |
| `default`     | 组内的 `FluereToggleGroupItem` 列表 |

### `FluereToggleGroupItem`

| 属性（Props） | 类型                             | 默认    | 说明                                                |
| ------------- | -------------------------------- | ------- | --------------------------------------------------- |
| `value`       | `string`                         | —       | 该按钮在组内的取值（**必填**）                      |
| `disabled`    | `boolean`                        | `false` | 是否禁用该项（叠加在组 `disabled` 之上）            |
| `size`        | `'small' \| 'medium' \| 'large'` | 继承组  | 尺寸档；缺省继承组上的 `size`，再缺省为 `'medium'`  |
| `block`       | `boolean`                        | `false` | 撑满容器宽度                                        |
| `label`       | `string`                         | —       | 可访问名（等价 `aria-label`）；纯图标项必须提供     |
| `icon`        | `Component`                      | —       | 图标组件（`@fluere-vue/icons`），装饰性、对 AT 隐藏 |
| `iconOnly`    | `boolean`                        | `false` | 仅显示图标（等比紧凑模式）                          |

| 插槽（Slots） | 说明         |
| ------------- | ------------ |
| `default`     | 按钮文本     |
| `icon`        | 替换内建图标 |

> `FluereToggleGroupItem` 必须位于 `FluereToggleGroup` 内：组上下文由 reka 的 provide/inject 提供，脱离组会直接抛出可读错误。它的外观、禁用配色、焦点环全部来自 `FluereToggleButton`，因此那三张表同样适用于组内每一项。
