---
title: Toggle Button 切换按钮
description: 三态切换按钮，选中时铺强调色，对齐 WinUI ToggleButton。
nav:
  title: Toggle Button 切换按钮
---

# Toggle Button 切换按钮

切换按钮在「未选中 / 选中 / 不确定」之间切换。与 Checkbox 的区别是它**本身就是一个按钮**——点击在位即切换，不额外画勾选框字形；与 Button 的区别是切换后**保持选中态**（铺满强调色）。样式还原 WinUI 3（Windows App SDK）的 `ToggleButton`。

## 基础用法

`v-model:checked` 双向绑定布尔值。这是**受控**组件：点击只抛 `update:checked`，是否改状态由消费方决定。

::demo-block{title="基础用法"}
#preview
:ToggleButtonBasicDemo
#code

```vue
<FluereToggleButton v-model:checked="bold">加粗</FluereToggleButton>
<FluereToggleButton v-model:checked="italic">倾斜</FluereToggleButton>
```

::

## 三态（不确定）

`checked` 支持 `null`（对应 WinUI `IsChecked` 的 `bool?`）。开启 `three-state` 后点击循环 `false → true → null → false`；不确定态的可访问名是 `aria-pressed="mixed"`（不是 `aria-checked`）。

::demo-block{title="三态开关"}
#preview
:ToggleButtonThreeStateDemo
#code

```vue
<FluereToggleButton v-model:checked="value" three-state>三态开关</FluereToggleButton>
```

::

## 尺寸 / 禁用 / 纯图标

三档尺寸与 Button 同档（Fluent 高度 24 / 32 / 40）。「选中且禁用」用 WinUI 的强调禁用档（带 alpha 的强调色）。纯图标形态用 `icon-only` + `label` 提供可访问名。

::demo-block{title="尺寸与状态一览"}
#preview
:ToggleButtonStatesDemo
#code

```vue
<FluereToggleButton v-model:checked="small" size="small">小</FluereToggleButton>
<FluereToggleButton v-model:checked="medium" size="medium">中</FluereToggleButton>
<FluereToggleButton v-model:checked="large" size="large">大</FluereToggleButton>
<FluereToggleButton disabled>禁用</FluereToggleButton>
<FluereToggleButton v-model:checked="on" disabled>禁用（已选中）</FluereToggleButton>
<FluereToggleButton icon-only :icon="FluentIconCheckmark24Regular" label="已选中" />
```

::

## 规格来源

| 项         | 值                                                                       |
| ---------- | ------------------------------------------------------------------------ |
| 控件       | WinUI 3 `ToggleButton`（`ButtonBase` 派生，三态来自 `IsChecked: bool?`） |
| tag/commit | `winui3/release/2.5.1` / `ba3a8d5`（本地快照 `temp/winui-src`）          |
| 关键文件   | `src/controls/dev/CommonStyles/ToggleButton_themeresources.xaml`         |

## 实现要点

- **状态表逐条对齐主题资源**：未选中走 `ControlFillColor*`（`--colorNeutralBackground1` / `…Hover` / `…Pressed` / `…Disabled`）；选中走 `AccentFillColor*`（`--colorBrandBackground` / `…Hover` / `…Pressed`）；选中前景 `TextOnAccentFillColorPrimaryBrush` → `--colorNeutralForegroundOnBrand`；不确定态的资源组（`*Indeterminate`）与未选中**同源**。完整映射表写在组件文件头。
- **Fluent token 表无同值档的三条**落组件局部变量，值取 WinUI 原值（可一行覆写）：`AccentFillColorDisabledBrush` / `TextOnAccentFillColorDisabledBrush` → `--fui-toggle-button-checked-disabled-background`（亮 `#37000000` / 暗 `#28FFFFFF`）与 `-foreground`（亮 `#FFFFFF` / 暗 `#87FFFFFF`）；`TextOnAccentFillColorSecondaryBrush`（选中态按下前景）→ `--fui-toggle-button-checked-pressed-foreground`（亮 `#B3FFFFFF` / 暗 `#80000000`）。
- **动效只过渡背景**：模板里的 `ContentPresenter.BackgroundTransition = BrushTransition Duration=0:0:0.083` ⇒ `transition: background-color 83ms linear`（`BrushTransition` 公开源码只给时长、没给缓动，按线性处理并注明）；状态切换里的 `BorderBrush` / `Foreground` 都是 `DiscreteObjectKeyFrame KeyTime=0`，**瞬切不过渡**。注：本库 `FluereButton` 仍是 150ms + `curveEasyEase` 且三项一起过渡，与 A 级有偏差（既有口径，待统一）。
- **焦点**走 0.4.3 的共享原语 `useFocusVisual`（外 2px `--colorStrokeFocus2` + 内 1px `--colorStrokeFocus1`，等价 `FocusVisualMargin = -3`）；组件内**不写** `:focus-visible`，否则同特异性会按源码顺序把焦点环吃掉。
- **受控语义**：点击只抛 `update:checked`，并附带 WinUI 同名的 `checked` / `unchecked` / `indeterminate` 事件；三态循环对齐 `ToggleButton_Partial.cpp#OnToggleImpl`（`Indeterminate → Unchecked`、`Checked + IsThreeState → Indeterminate`、其余 `Checked ⇄ Unchecked`）。
- **已知缺口**：高对比度未实现（WinUI HC 下这些画刷走 `SystemColor*`）；`AppBarToggleButton` 的 subtle 外观未做；字重沿用本库 Button 的 `--fontWeightMedium`（WinUI 的 `Button_themeresources` 是 `FontWeight = Normal`）；按下 / 禁用态的**描边**未单列档（A 级 pressed 用 `ControlStrokeColorDefaultBrush`、库内 Input / ComboBox 对它的口径是 `--colorNeutralStrokeAlpha`，本组件仍用 `--colorNeutralStroke1`）；`BackgroundSizing = OuterBorderEdge` 未显式写 `background-clip`（CSS 默认 `border-box` 已等价，实测无视觉差异）。

## API

### `FluereToggleButton`

| 属性（Props）  | 类型                              | 默认       | 对应 / 说明                                          |
| -------------- | --------------------------------- | ---------- | ---------------------------------------------------- |
| `checked`      | `boolean \| null`                 | `false`    | `IsChecked`（`v-model:checked`）；`null` = 不确定态  |
| `disabled`     | `boolean`                         | `false`    | `IsEnabled`                                          |
| `size`         | `'small' \| 'medium' \| 'large'`  | `'medium'` | 几何沿用本库 Button：高度 24 / 32 / 40               |
| `threeState`   | `boolean`                         | `false`    | `IsThreeState`；开启后点击循环 `false → true → null` |
| `type`         | `'button' \| 'submit' \| 'reset'` | `'button'` | 原生 button 类型                                     |
| `icon`         | `Component`                       | —          | 前置图标组件                                         |
| `iconPosition` | `'before' \| 'after'`             | `'before'` | 图标在文本前 / 后                                    |
| `iconOnly`     | `boolean`                         | `false`    | 仅图标（等比紧凑），可访问名请用 `label`             |
| `block`        | `boolean`                         | `false`    | 撑满容器宽度                                         |
| `label`        | `string`                          | —          | `AutomationProperties.Name` → 原生 `aria-label`      |

| 事件（Emits）    | 载荷              | 对应 / 说明                         |
| ---------------- | ----------------- | ----------------------------------- |
| `update:checked` | `boolean \| null` | 受控回写（`v-model:checked`）       |
| `checked`        | —                 | WinUI `Checked`：进入勾选           |
| `unchecked`      | —                 | WinUI `Unchecked`：取消勾选         |
| `indeterminate`  | —                 | WinUI `Indeterminate`：进入不确定态 |

| 插槽（Slots） | 说明         |
| ------------- | ------------ |
| `default`     | 按钮文本     |
| `icon`        | 替换内建图标 |
