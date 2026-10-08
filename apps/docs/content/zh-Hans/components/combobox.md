---
title: Combobox 下拉框
description: 下拉选择框，用于从一组单行文本选项中选中一项，支持文本搜索与可编辑自定义值。
nav:
  title: Combobox 下拉框
---

# Combobox 下拉框

下拉框让用户从一组单行文本选项里选一项（颜色、字号、配送方式……）。样式与行为还原 WinUI 3（Windows App SDK 2.0）的 **ComboBox**：几何、状态色、下拉项指示条、面板定位与动画都逐项对照 `src/controls/dev/ComboBox/ComboBox_themeresources.xaml`；键位、文本搜索、可编辑态对照 `src/dxaml/xcp/dxaml/lib/ComboBox_Partial.cpp`。

交互底座复用 `reka-ui` 的 Combobox 原语（ARIA combobox 语义、roving highlight、弹层定位、外部点击关闭），本组件补齐 WinUI 的键位口径、文本搜索、可编辑态与视觉状态。

与 WinUI 一致的三条取值口径：

- **无选中就是 `null`**（对应 WinUI `SelectedIndex = -1`）：不传 `modelValue` 时为非受控，`null` 表示未选中，清空选中会抛出 `null`；
- **选项数据走 `items`**（对应 WinUI `ItemsSource`），每项 `{ value, text?, disabled? }`，`text` 缺省取 `String(value)`；
- **`selectionChangedTrigger` 决定何时提交**：缺省 `committed`——点击 / 回车 / 文本搜索才改选中项；开着面板按方向键只移动高亮（WinUI `SelectionChangedTrigger` 的缺省行为）。

## 基础用法

`v-model` 绑定选中值，`items` 提供选项，`header` 是 WinUI 的标题行（同时作为缺省的可访问名），未选中时显示 `placeholder`。

::demo-block{title="基础用法"}
#preview
:ComboboxBasicDemo
#code

```vue
<FluereCombobox v-model="picked" :items="COLORS" header="颜色" placeholder="请选择颜色" />
```

::

## 标题、说明与可访问名

`header` 对应 WinUI `Header`（`LineHeight 20`、下边距 8、字重 Normal），`description` 对应 `Description`（挂在控件下方并作为 `aria-describedby`），`label` 优先于 `header` 作为可访问名。

::demo-block{title="标题与说明"}
#preview
:ComboboxHeaderDemo
#code

```vue
<FluereCombobox
  v-model="fontSize"
  :items="FONT_SIZES"
  header="正文字号"
  description="Header 同时作为缺省的可访问名"
  label="正文字号选择器"
/>
```

::

## 选中与事件

`items` 的元素可以是任意类型，用 `by` 指定项身份（字段名或比较函数）、用 `text` 指定显示与搜索文本。`selectionChanged` 的载荷与 WinUI `SelectionChangedEventArgs` 对齐：`addedItem` / `removedItem` / `addedIndex` / `removedIndex`（单选，各至多一项；无选中时下标为 `-1`）。

::demo-block{title="对象项与选中事件"}
#preview
:ComboboxObjectDemo
#code

```vue
<FluereCombobox
  v-model="city"
  :items="CITIES.map((item) => ({ value: item, text: item.name }))"
  by="id"
  header="城市（对象项 + by）"
  @selection-changed="onSelectionChanged"
/>
```

::

需要「高亮走到哪就选到哪」（WinUI 的 `SelectionChangedTrigger = Always`，字体选择器那种手感）时，传 `selection-changed-trigger="always"`：

```vue
<FluereCombobox v-model="font" :items="FONTS" selection-changed-trigger="always" />
```

## 键盘与文本搜索

键盘口径逐条对照 WinUI 的两张键位表（`MainKeyDown` / `PopupKeyDown`）：

| 按键                     | 面板收起（非可编辑）           | 面板展开                           |
| ------------------------ | ------------------------------ | ---------------------------------- |
| `↑` / `↓`                | **直接改选中项**（跳过禁用项） | 移动高亮（`committed` 下不改选中） |
| `Home` / `End`           | 选首个 / 末个可选项            | 高亮首个 / 末个                    |
| `Enter`                  | 展开面板                       | 提交高亮项并收起                   |
| `Space`                  | 展开面板                       | 等价于 `Enter`                     |
| `Ctrl` / `Cmd` + `Enter` | —                              | 取消已选中项的选中                 |
| `Alt` + `↑` / `↓`        | 展开面板                       | 收起面板                           |
| `F4`                     | 展开面板                       | 收起面板                           |
| `Escape`                 | 不处理（冒泡给上层）           | 收起面板，不改选中项               |
| 字符键                   | 前缀搜索并直接选中命中项       | 同上（弹层把字符冒泡回控件）       |
| `Tab`                    | 焦点照常离开                   | 收起面板，焦点照常离开             |

文本搜索与 WinUI 同口径：项文本先 `TrimStart(' ')` 再**忽略大小写做前缀匹配**（不做子串 / 模糊匹配）；两次按键间隔 ≤ **1000ms** 时搜索串累积，超过则另起一次；新搜索串从「当前项 + 1」起**环状**扫描，命中即直接改选中项。`text-search-enabled="false"` 可整体关掉（对应 `IsTextSearchEnabled`）。焦点在控件上、面板收起时，滚轮也会改选中项（WinUI 只在聚焦且收起时响应）。

::demo-block{title="长列表与文本搜索"}
#preview
:ComboboxLongListDemo
#code

```vue
<FluereCombobox
  v-model="state"
  :items="STATES"
  header="州（输入 w 试试文本搜索）"
  placeholder="选择或直接输入首字母"
  :max-drop-down-height="200"
/>
```

::

面板最大高度缺省 504px（WinUI `DefaultComboBoxStyle` 的 `MaxDropDownHeight`，约 15 项），超出后列表内滚动。

## 可编辑态

`editable` 对应 WinUI `IsEditable`：输入框可输入自定义值，**输入不会过滤列表**（WinUI 的可编辑 ComboBox 只做行内补全，不过滤），面板仍由箭头热区 / `F4` / `Alt+↓` 打开。

- **行内补全**：输入前缀命中某项时补全为该项文本，并选中补全部分（WinUI `UpdateEditableTextBox(selectText: true)`），继续输入即替换；
- **`Enter` / 失焦提交**：文本匹配已有项 → 选中该项；否则抛 `textSubmitted`，并按 WinUI 的缺省行为把选中项清空、**保留文本**；
- **`textSubmitted` 的 `handled`**：置 `true` 即等同 WinUI `e.Handled = true`，组件不再改动选中项（便于校验后回填）；
- **`Escape`**：回滚文本到当前选中项（WinUI `CommitRevertEditableSearch(restoreValue: true)`）；
- 文本可用 `v-model:text` 受控（对应 WinUI `Text`）。

::demo-block{title="可编辑态"}
#preview
:ComboboxEditableDemo
#code

```vue
<FluereCombobox
  v-model="name"
  :items="RECENT_NAMES"
  editable
  header="名称（可自定义）"
  placeholder="输入或选择"
  @text-submitted="onTextSubmitted"
/>
```

::

## 自定义下拉项

用 `#item` 插槽覆盖行内容（对应 WinUI `ItemTemplate`），插槽参数是 `{ item, index }`。选中指示条、内边距、圆角与状态色仍由组件负责。

::demo-block{title="自定义下拉项"}
#preview
:ComboboxCustomItemDemo
#code

```vue
<FluereCombobox v-model="color" :items="COLORS" header="强调色">
  <template #item="{ item }">
    <span class="flex items-center gap-2">
      <span class="inline-block w-4 h-4 rounded-fluent-sm" :style="{ backgroundColor: item.value }" />
      {{ item.text }}
    </span>
  </template>
</FluereCombobox>
```

::

## 禁用

`disabled` 对应 WinUI `IsEnabled = false`（填充 / 前景 / 箭头 / 指示条全走禁用档，且不响应指针与键盘）；单个选项的 `disabled` 对应 `ComboBoxItem.IsEnabled = false`，不参与方向键选区与文本搜索。

::demo-block{title="禁用状态"}
#preview
:ComboboxDisabledDemo
#code

```vue
<FluereCombobox v-model="plan" :items="PLANS" header="可选中" />
<FluereCombobox v-model="locked" :items="PLANS" disabled header="整体禁用" />
```

::

## 表单提交

位于 `<form>` 内并传 `name` 时，会补一个隐藏的原生 `<input type="hidden">`，提交 `name=value`（无选中时提交空串），对应 WinUI `SelectedValue` 的用法。

::demo-block{title="表单提交"}
#preview
:ComboboxFormDemo
#code

```vue
<form @submit.prevent="onSubmit">
  <FluereCombobox v-model="shipping" :items="SHIPPING" name="shipping" header="配送方式" />
  <FluereButton type="submit" appearance="primary">提交</FluereButton>
</form>
```

::

## API

| 属性（Props）             | 类型                            | 默认          | 说明                                                               |
| ------------------------- | ------------------------------- | ------------- | ------------------------------------------------------------------ |
| `modelValue`              | `unknown \| null`               | `—`           | 当前选中值（`v-model`）；`null` 表示未选中（WinUI `SelectedItem`） |
| `defaultValue`            | `unknown \| null`               | `null`        | 非受控初始选中值                                                   |
| `items`                   | `FluereComboboxItem[]`          | `[]`          | 选项数据（WinUI `ItemsSource`）：`{ value, text?, disabled? }`     |
| `open`                    | `boolean`                       | `—`           | 面板展开状态（`v-model:open`，WinUI `IsDropDownOpen`）             |
| `defaultOpen`             | `boolean`                       | `false`       | 非受控初始展开状态                                                 |
| `disabled`                | `boolean`                       | `false`       | 是否禁用（WinUI `IsEnabled`）                                      |
| `editable`                | `boolean`                       | `false`       | 可编辑态（WinUI `IsEditable`）                                     |
| `text`                    | `string`                        | `—`           | 可编辑态文本（`v-model:text`，WinUI `Text`）                       |
| `defaultText`             | `string`                        | `''`          | 可编辑态非受控初始文本                                             |
| `placeholder`             | `string`                        | `—`           | 占位符（WinUI `PlaceholderText`），仅未选中时显示                  |
| `header`                  | `string`                        | `—`           | 顶部标题（WinUI `Header`），同时是缺省可访问名                     |
| `label`                   | `string`                        | `—`           | 可访问名称（优先于 `header`）                                      |
| `description`             | `string`                        | `—`           | 控件下方说明（WinUI `Description`），并作为 `aria-describedby`     |
| `name`                    | `string`                        | `—`           | 表单提交名，配合隐藏原生 input                                     |
| `by`                      | `string \| ((a, b) => boolean)` | `—`           | 对象项的项身份比较                                                 |
| `maxDropDownHeight`       | `number`                        | `504`         | 面板最大高度（WinUI `MaxDropDownHeight`）                          |
| `textSearchEnabled`       | `boolean`                       | `true`        | 是否启用前缀搜索（WinUI `IsTextSearchEnabled`）                    |
| `selectionChangedTrigger` | `'committed' \| 'always'`       | `'committed'` | 提交时机（WinUI `SelectionChangedTrigger`）                        |
| `dir`                     | `'ltr' \| 'rtl'`                | `—`           | 阅读方向                                                           |

| 事件（Events）      | 载荷                                                   | 说明                                   |
| ------------------- | ------------------------------------------------------ | -------------------------------------- |
| `update:modelValue` | `unknown \| null`                                      | 选中值变化（`v-model`）                |
| `update:open`       | `boolean`                                              | 面板展开状态变化（`v-model:open`）     |
| `update:text`       | `string`                                               | 可编辑态文本变化（`v-model:text`）     |
| `selectionChanged`  | `{ addedItem, removedItem, addedIndex, removedIndex }` | 对应 WinUI `SelectionChanged`          |
| `dropDownOpened`    | —                                                      | 对应 WinUI `DropDownOpened`            |
| `dropDownClosed`    | —                                                      | 对应 WinUI `DropDownClosed`            |
| `textSubmitted`     | `{ text: string, handled: boolean }`                   | 对应 WinUI `TextSubmitted`（可编辑态） |

| 插槽（Slots） | 说明                                                       |
| ------------- | ---------------------------------------------------------- |
| `item`        | 下拉项内容（`{ item, index }`），对应 WinUI `ItemTemplate` |
| `header`      | 顶部标题行（WinUI `Header` / `HeaderTemplate`）            |
| `description` | 控件下方说明（WinUI `Description`）                        |
| `empty`       | 选项为空时的内容（WinUI 没有空态文案，不提供即渲染空面板） |

> 无障碍：输入框带 `role="combobox"`、`aria-expanded` / `aria-controls` / `aria-activedescendant`，非可编辑态补 `readonly` 与 `aria-autocomplete="none"`，可编辑态为 `aria-autocomplete="list"`；下拉项是 `role="option"` + `aria-selected`，禁用项带 `aria-disabled`。焦点始终停在控件上（`TabNavigation="Once"` 语义），下拉项不进入 Tab 序列。

> 与 WinUI 的差异（均为 Web 侧近似，逐条记录）：
>
> 1. **Acrylic 表面**：Fluent 令牌集中没有材质令牌，浮层用 `colorNeutralBackground1` + `shadow16` 近似（与 NumberBox 紧凑浮层一致），未复刻 `AcrylicInAppFillColorDefaultBrush` 的模糊配方。
> 2. **浮层开启动画**：以 `clip-path` 从**选中项中线向上下两侧展开**近似 `SplitOpenThemeAnimation`（无选中时贴触发控件一侧；250ms / `0,0,0,1`）——面板先收拢成一条缝、实测选中项位置写入 CSS 变量后再起播；**关闭动画省略**——reka 的 `Presence` 会立即卸载内容，以保住 `aria-hidden` 语义正确。
> 3. **箭头按下态**：WinUI 3 Gallery 的箭头按下是**轻微下沉（不翻转）**，这里以 `translateY(1px)`（进 `durationFast` / 回 `durationNormal`）近似。
> 4. **焦点矩形**：WinUI 用 `FocusStrokeColorOuter`（浅色 `#E4000000` / 深色白），令牌集中对应 `colorStrokeFocus2`；组件库其余控件目前用 `colorCompoundBrandStroke`，本组件按 WinUI 源取色。仅键盘 / 程序化聚焦显示焦点矩形与 3×16 品牌色指示条（对应 WinUI `Focused` 与 `PointerFocused` 的区分）。
> 5. **`PageUp` / `PageDown`**：WinUI 在展开态按页移动高亮，这里只吃掉按键（阻止页面滚动），不移动高亮。
> 6. **项 `value` 不能是空字符串**：reka 底座用它表示「清空选中」，故 `value: ''` 会被拒绝（WinUI 无此限制）；需要空串语义时用 `null` 或哨兵值。
> 7. 文本超长时输入框用省略号截断（WinUI 是直接裁切）。
