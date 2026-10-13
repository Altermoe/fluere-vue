---
title: Select 下拉选择
description: 不可编辑的下拉选择器，视觉对齐 WinUI ComboBox 的非编辑形态。
nav:
  title: Select 下拉选择
---

# Select 下拉选择

`FluereSelect` 是**不可编辑**的下拉选择器：触发面只显示当前项文本（或占位符），点击展开面板、点选或键盘选一项。视觉还原 WinUI 3（Windows App SDK）的 `ComboBox` 非编辑形态，交互底座复用 reka-ui 的 `Select`。

## 与 Combobox 的差异

两者长得像，但职责不同——选错会把「可输入 + 可搜索」的能力白送出去：

| 维度     | `FluereSelect`                | `FluereCombobox`                      |
| -------- | ----------------------------- | ------------------------------------- |
| 触发面   | 只有文本 + 箭头，**不可输入** | 可选可编辑输入框（`editable`）        |
| 文本搜索 | **无**（仅有底座按字符跳转）  | 有（`textSearchEnabled`）             |
| 事件     | `change`（单项）              | `selectionChanged`（added / removed） |
| 适用场景 | 取值固定的枚举项              | 需要输入过滤 / 自由文本的场景         |

## 基础用法

`v-model` 绑定选中值；未选中时显示 `placeholder`。选项用 `items` 传（`value` / `text` / `disabled`）。

::demo-block{title="基础用法"}
#preview
:SelectBasicDemo
#code

```vue
<FluereSelect v-model="value" :items="items" header="刷新频率" placeholder="请选择" />
```

::

## 受控与清空

`modelValue` 是唯一事实源；把它设为 `null` 即可回到占位符。每次选中都会抛 `change`。

::demo-block{title="受控 + change + 清空"}
#preview
:SelectControlledDemo
#code

```vue
<FluereSelect v-model="value" :items="items" @change="(args) => (last = args.value)" />
<FluereButton size="small" @click="value = null">清空选择</FluereButton>
```

::

## 状态与空列表

`header` / `description` 与触发面按 id 关联；禁用项键盘会跳过；整组 `disabled` 时不展开；`items` 为空时用 `#empty` 给空态文案。

::demo-block{title="标题 / 说明 / 禁用 / 空列表"}
#preview
:SelectStatesDemo
#code

```vue
<FluereSelect v-model="v" :items="items" header="同步速度" description="含一个不可选项。" />
<FluereSelect v-model="v2" :items="items" disabled header="整组禁用" />
<FluereSelect :items="[]" header="空列表">
  <template #empty>没有可选项</template>
</FluereSelect>
```

::

## 规格来源

| 项         | 值                                                                   |
| ---------- | -------------------------------------------------------------------- |
| 控件       | WinUI 3 `ComboBox`（**非编辑形态**；WinUI 没有名为 `Select` 的控件） |
| tag/commit | `winui3/release/2.5.1` / `ba3a8d5`                                   |
| 关键文件   | `src/controls/dev/ComboBox/ComboBox_themeresources.xaml`             |

## 实现要点

- **触发面**：`ComboBoxBackground*` ← `ControlFillColor*` → `--colorNeutralBackground1` / `…Hover` / `…Pressed` / `…Disabled`；四边 `ControlElevationBorderBrush` → `--colorNeutralStrokeAlpha`、底边 `ControlStrokeColorDefault` → `--colorNeutralStroke1`（与本库 `FluereCombobox` 非编辑形态同一套口径，避免同页两种下拉视觉漂移）。
- **下拉项**：`ComboBoxItemBackground*` ← `SubtleFillColor*` → `--colorSubtleBackground` / `…Hover` / `…Pressed` / `…Selected`；选中项左侧 3px 指示条用 `--colorCompoundBrandBackground`。
- **下拉面**：圆角 `--borderRadiusXLarge`（OverlayCornerRadius）、描边 `--colorNeutralStroke1`、`--shadow16`（elevation 16）、底色 `--colorNeutralBackground1`。
- **层级与焦点**：下拉走 0.4.1 的 `useFlyout`（`--zIndexNavFlyout` + 嵌套提升），触发面走 0.4.3 的 `useFocusVisual`（双层焦点矩形）。
- **面板样式必须写在非 scoped 块**：reka 的 `SelectContent` 把 class 落在 Teleport 到 body 的元素上，拿不到本组件的 `data-v-*`——scoped 选择器会静默失效（jsdom 不解析 `var()`，单测发现不了）。
- **已知缺口**：高对比度未实现；不实现 WinUI 的 `IsTextSearchEnabled` 前缀匹配（底座按字符跳转不算搜索）；`size` 档位与 WinUI 的 `Compact` 样式未做。

## API

### `FluereSelect`

| 属性（Props）       | 类型                            | 默认        | 对应 / 说明                                       |
| ------------------- | ------------------------------- | ----------- | ------------------------------------------------- |
| `modelValue`        | `T \| null`                     | `undefined` | 受控选中值（`v-model`）；`undefined` 为非受控     |
| `defaultValue`      | `T \| null`                     | `null`      | 非受控初始值                                      |
| `items`             | `FluereSelectItem<T>[]`         | `[]`        | `ItemsSource`；每项 `value` / `text` / `disabled` |
| `open`              | `boolean`                       | `undefined` | `v-model:open`；不传则内部自管                    |
| `defaultOpen`       | `boolean`                       | `false`     | 非受控初始展开状态                                |
| `disabled`          | `boolean`                       | `false`     | `IsEnabled`                                       |
| `placeholder`       | `string`                        | —           | `PlaceholderText`                                 |
| `header`            | `string`                        | —           | 触发面上方标题；同时作为可访问名                  |
| `label`             | `string`                        | —           | 显式可访问名（优先于 `header`）                   |
| `description`       | `string`                        | —           | 触发面下方说明                                    |
| `name`              | `string`                        | —           | 透传隐藏 input 的字段名                           |
| `by`                | `string \| ((a, b) => boolean)` | —           | 自定义值相等判断（对象型选项必传）                |
| `dir`               | `Direction`                     | —           | 文本方向                                          |
| `maxDropDownHeight` | `number`                        | `504`       | `MaxDropDownHeight`（px）                         |

| 事件（Emits）       | 载荷                   | 对应 / 说明                    |
| ------------------- | ---------------------- | ------------------------------ |
| `update:modelValue` | `T \| null`            | 受控回写（`v-model`）          |
| `update:open`       | `boolean`              | 展开状态回写（`v-model:open`） |
| `change`            | `{ value: T \| null }` | 选中项变化                     |

| 插槽（Slots） | 说明                                          |
| ------------- | --------------------------------------------- |
| `item`        | 自定义项渲染，作用域参数 `{ item, selected }` |
| `empty`       | 空列表文案（组件库不新增内建文案）            |
