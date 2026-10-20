---
title: Menu Flyout 菜单浮层
description: 命令菜单浮层：条目 / 子菜单 / 勾选项 / 分隔线，键盘与层级对齐 WinUI 3 MenuFlyout。
nav:
  title: Menu Flyout 菜单浮层
---

# Menu Flyout 菜单浮层

菜单浮层承载一组**命令**（不是选项列表——下拉选择请用 `FluereSelect`）。它对齐 WinUI 3 的 `MenuFlyout` 族：触发器点击后在锚点处弹出 `role="menu"` 面板，条目支持图标、键盘加速键文本、勾选态与多级子菜单，键盘完整（↑↓ / Home / End / Tab / Enter / Space / ← / → / Esc）。

## 基础用法

默认插槽放**触发元素**，菜单内容放 `#content`（命名插槽）。选中条目会抛出根组件的 `select` 事件；默认选中后关闭，`close-on-select="false"` 可保持展开。

::demo-block{title="基础菜单"}
#preview
:MenuFlyoutBasicDemo
#code

```vue
<FluereMenuFlyout label="新建" @select="onSelect">
  <FluereButton>新建 ▾</FluereButton>
  <template #content>
    <FluereMenuFlyoutItem text="文件夹" :icon="FluentIconFolder24Regular" />
    <FluereMenuFlyoutItem text="文本文档" :icon="FluentIconDocument24Regular" />
    <FluereMenuFlyoutSeparator />
    <FluereMenuFlyoutItem text="更多…" />
  </template>
</FluereMenuFlyout>
```

::

## 子菜单

`FluereMenuFlyoutSubItem` 的**默认插槽**是子菜单内容；行文本走 `text` Prop（或 `#label` 插槽）。鼠标悬停 400ms 或按 `→` / `Enter` / `Space` 展开；子菜单内按 `←` / `Esc` 只关闭当前这一层并把焦点交回子项。子菜单登记 `--zIndexSubmenu`，父菜单永远盖不住它。

::demo-block{title="多级子菜单"}
#preview
:MenuFlyoutSubmenuDemo
#code

```vue
<FluereMenuFlyout label="视图">
  <FluereButton>视图 ▾</FluereButton>
  <template #content>
    <FluereMenuFlyoutItem text="刷新" />
    <FluereMenuFlyoutSubItem text="排序方式">
      <FluereMenuFlyoutItem text="按名称" />
      <FluereMenuFlyoutItem text="按日期" />
      <FluereMenuFlyoutSubItem text="更多">
        <FluereMenuFlyoutItem text="按大小" />
      </FluereMenuFlyoutSubItem>
    </FluereMenuFlyoutSubItem>
  </template>
</FluereMenuFlyout>
```

::

## 勾选项 / 加速键 / 禁用

`FluereMenuFlyoutToggleItem` 用 `v-model:checked` 绑定勾选态，输出 `role="menuitemcheckbox"` + `aria-checked`。`keyboard-accelerator-text` 显示在条目右端（12px Caption 文本）；`disabled` 条目不可聚焦、不可激活，箭头导航会跳过它。

::demo-block{title="勾选与状态"}
#preview
:MenuFlyoutToggleDemo
#code

```vue
<FluereMenuFlyoutToggleItem v-model:checked="showHidden" text="显示隐藏文件" />
<FluereMenuFlyoutItem text="刷新" keyboard-accelerator-text="F5" />
<FluereMenuFlyoutItem text="属性" disabled />
```

::

## 无触发器：锚点与 `showAt()`

`FluereSplitButton` / `FluereDropDownButton` 这类组件需要「由父组件决定何时弹出」。此时**不传默认插槽**，改用 `anchor` Prop 或暴露的 `showAt(element)`；`placement` 直接使用 WinUI `FlyoutPlacementMode` 的 kebab-case 值（SplitButton 的 A 级实现是 `bottom-edge-aligned-left`）。打开后焦点进入菜单首项，关闭（选中 / Esc / 外部点击）后归还到打开前的元素。

::demo-block{title="锚点模式（SplitButton 消费姿势）"}
#preview
:MenuFlyoutAnchorDemo
#code

```vue
<span ref="anchor">
  <FluereButton icon-only :icon="FluentIconChevronDown12Regular" aria-label="More new options" @click="openMenu" />
</span>

<FluereMenuFlyout
  ref="menu"
  label="更多操作"
  placement="bottom-edge-aligned-left"
  @select="onSelect"
>
  <template #content>
    <FluereMenuFlyoutItem text="文件夹" />
    <FluereMenuFlyoutItem text="文本文档" />
  </template>
</FluereMenuFlyout>
```

```ts
const openMenu = () => menu.value?.showAt(anchor.value)
```

::

## 规格来源

| 项         | 值                                                                                                                                                                   |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 控件       | WinUI 3 `MenuFlyout` / `MenuFlyoutItem` / `MenuFlyoutSubItem` / `ToggleMenuFlyoutItem` / `MenuFlyoutSeparator`                                                       |
| tag/commit | `winui3/release/2.5.1` / `ba3a8d5`（本地快照 `temp/winui-src`）                                                                                                      |
| 关键文件   | `CommonStyles/MenuFlyout_themeresources.xaml`、`dxaml/lib/MenuFlyout*_Partial.cpp`、`dxaml/lib/CascadingMenuHelper.cpp`、`KeyDownUp/inc/MenuFlyoutKeyPressProcess.h` |
| 默认值     | `dxaml/lib/FlyoutBase_partial.cpp`（placement 缺省 `Top`、`FlyoutMargin = 4`）、`themes/generic.xaml`（MinWidth 96）                                                 |

## 实现要点

- **模板结构照抄**：presenter = 1px 描边 + `OverlayCornerRadius`(8) + `MenuFlyoutPresenterThemePadding` 0,2,0,2 + `FlyoutThemeMinWidth` 96 + `MenuFlyoutThemeMinHeight` 32 + 纵向滚动；条目 = `Margin` 4,2,4,2、`Padding` 11,8,11,9、圆角 `ControlCornerRadius`(4)；分隔线 = 1px `DividerStrokeColorDefault`，横向 -4 跨过条目外边距。
- **面板级图标 / 勾选列占位**：`MenuFlyoutPresenter` 会统计本面板是否存在图标条目与 Toggle 条目。只有图标或只有 Toggle 时，普通条目文字让出 28px；两者同时存在时让出 56px、图标列再让 28px。每个子菜单**独立统计**自己的直接条目。
- **状态画刷**：PointerOver / Pressed / Disabled = `SubtleFillColorSecondary/Tertiary/Transparent` + `TextFillColorDisabled`；SubItem 多一个 `SubMenuOpened`（= Secondary）。WinUI 这些状态都是 VisualState Setter、没有 Storyboard，所以条目**不做背景过渡**。
- **键盘**：↑↓ 在可聚焦条目间循环（跳过 disabled）；`Home` / `End` 到首尾；`Tab` 被吞掉（WinUI `pbHandled = true` 且不移动焦点）；`Enter` / `Space` 激活；`→` / `Enter` / `Space` 展开子项；子菜单内 `←` / `Esc` 只关当前层；根菜单 `Esc` 关闭整个浮层。**Home / End 是 0.6.1 验收口径的补充**——WinUI 公开 keypress 处理里没有这两个键（负面证据），本库按 WAI-ARIA menu 要求补齐。
- **层级**：根面板 `--zIndexMenu`(1100)、子菜单 `--zIndexSubmenu`(1200)，打开时登记进 `useFlyout` 的层级栈；嵌套浮层会继续用 `--zIndexStep` 提升，父菜单不可能盖住子菜单。
- **动效**：`MenuPopupThemeTransition_Partial.h` 公开两个常量（透明度 83ms / 展开 250ms）；**关键帧实现不在公开源码树**（`CreateStoryboardImpl` 的 `.cpp` 未纳入快照），因此本实现用 `scaleY(ClosedRatio)` + opacity 的近似：根 `ClosedRatio = 0.5`、子菜单 `0.67`，展开 250ms（`--durationGentle` 同值）、收起 200ms（`--durationNormal`，**证据缺口**）。三个量都可在消费方覆写：`--fui-menu-flyout-open-duration` / `--fui-menu-flyout-close-duration` / `--fui-menu-flyout-closed-scale`；`prefers-reduced-motion` 下动画关闭，静态形态完全可见。
- **材质**：presenter 背景取 `DesktopAcrylicTransparentBrush` 的 FallbackColor 近似（`--acrylicBackgroundFillColorDefault`，亮 `#F9F9F9` / 暗 `#2C2C2C`）；真实 Acrylic 合成 + 噪点归 0.9.2。描边走 repo-token `--surfaceStrokeColorFlyout`（亮 / 暗两档，见 `design/explorer-layout.md`）。
- **已知差异 / 缺口**：高对比度未适配；reka 底座自带按字符 typeahead（WinUI `MenuFlyout` 无此前缀匹配行为，仅影响键入字母时的高亮跳转）；加速键文本「传了就显示」，不做 WinUI 的「仅硬件键盘存在时显示」探测（Web 无可靠 API）；`SplitMenuFlyoutItem` / `RadioMenuFlyoutItem` 不在 0.6.1 范围。

## API

### `FluereMenuFlyout`

| 属性（Props）   | 类型                        | 默认    | 对应 / 说明                                                                  |
| --------------- | --------------------------- | ------- | ---------------------------------------------------------------------------- |
| `open`          | `boolean`                   | —       | 受控展开状态（`v-model:open`），不传自管                                     |
| `defaultOpen`   | `boolean`                   | `false` | 非受控初始展开                                                               |
| `disabled`      | `boolean`                   | `false` | 禁用触发元素开合（受控 `open` 仍可打开）                                     |
| `anchor`        | `HTMLElement \| null`       | —       | 无触发器模式的锚点（`FlyoutBase.ShowAt(target)` 的声明式等价物）             |
| `placement`     | `FluereMenuFlyoutPlacement` | `'top'` | `FlyoutPlacementMode`，kebab-case；SplitButton 用 `bottom-edge-aligned-left` |
| `sideOffset`    | `number`                    | `4`     | 与锚点间距（WinUI `FlyoutMargin = 4`）                                       |
| `alignOffset`   | `number`                    | `0`     | 沿边对齐偏移                                                                 |
| `label`         | `string`                    | —       | 菜单面板可访问名                                                             |
| `labelledby`    | `string`                    | —       | 菜单面板可访问名引用（优先于 `label`）                                       |
| `closeOnSelect` | `boolean`                   | `true`  | 选中条目后关闭                                                               |
| `dir`           | `'ltr' \| 'rtl'`            | —       | 文本方向                                                                     |

| 事件（Emits） | 载荷                              | 对应 / 说明                          |
| ------------- | --------------------------------- | ------------------------------------ |
| `update:open` | `boolean`                         | 受控回写                             |
| `opened`      | —                                 | WinUI `MenuFlyout.Opened`            |
| `closed`      | `FluereMenuFlyoutCloseReason`     | WinUI `MenuFlyout.Closed` + 关闭原因 |
| `select`      | `FluereMenuFlyoutSelectEventArgs` | 条目被选中（含子菜单条目）           |

| 插槽（Slots） | 说明                               |
| ------------- | ---------------------------------- |
| `default`     | 触发元素（无触发器模式下不渲染）   |
| `content`     | 菜单内容（条目 / 子菜单 / 分隔线） |

| 暴露（Expose）  | 说明                                             |
| --------------- | ------------------------------------------------ |
| `showAt(el)`    | 在指定元素处打开（SplitButton / DropDownButton） |
| `hide()`        | 关闭                                             |
| `open()`        | 用当前锚点打开                                   |
| `close(reason)` | 关闭并指定原因                                   |
| `toggle()`      | 开合切换                                         |
| `isOpen`        | 当前展开状态（`ComputedRef<boolean>`）           |

### `FluereMenuFlyoutItem`

| 属性（Props）             | 类型        | 默认  | 对应 / 说明                       |
| ------------------------- | ----------- | ----- | --------------------------------- |
| `text`                    | `string`    | —     | `MenuFlyoutItem.Text`             |
| `icon`                    | `Component` | —     | 16×16 图标                        |
| `keyboardAcceleratorText` | `string`    | —     | `KeyboardAcceleratorTextOverride` |
| `disabled`                | `boolean`   | false | `IsEnabled`                       |
| `value`                   | `unknown`   | —     | 回传给根 `select` 的载荷          |

| 事件（Emits） | 载荷                              | 说明       |
| ------------- | --------------------------------- | ---------- |
| `select`      | `FluereMenuFlyoutSelectEventArgs` | 条目被激活 |

| 插槽（Slots） | 说明                      |
| ------------- | ------------------------- |
| `default`     | 自定义文本（覆盖 `text`） |
| `icon`        | 自定义图标（覆盖 `icon`） |

### `FluereMenuFlyoutSubItem`

| 属性（Props） | 类型        | 默认  | 对应 / 说明              |
| ------------- | ----------- | ----- | ------------------------ |
| `text`        | `string`    | —     | `MenuFlyoutSubItem.Text` |
| `icon`        | `Component` | —     | 16×16 图标               |
| `disabled`    | `boolean`   | false | `IsEnabled`              |
| `label`       | `string`    | —     | 子菜单面板的可访问名     |

| 插槽（Slots） | 说明               |
| ------------- | ------------------ |
| `default`     | 子菜单内容（条目） |
| `label`       | 自定义子项行文本   |
| `icon`        | 自定义图标         |

### `FluereMenuFlyoutToggleItem`

属性在 `FluereMenuFlyoutItem` 基础上增加 `checked`（`boolean`，`v-model:checked`），事件增加 `update:checked` / `change`；`select` 载荷的 `checked` 是**切换后**的值。

### `FluereMenuFlyoutSeparator`

无 Props / Slots / Emits，仅渲染 `role="separator"`。
