---
title: Tab View 选项卡
description: 选项卡容器：等宽 / 按内容 / 折叠三种宽度模式，tab 条可溢出滚动、每项可关闭，键位与焦点表现对齐 WinUI TabView。
nav:
  title: Tab View 选项卡
---

# Tab View 选项卡

`FluereTabView` + `FluereTabViewItem` 对位 WinUI 3 / Windows App SDK 的 **`Microsoft.UI.Xaml.Controls.TabView`**：一条可横向滚动的 tab 条 + 一个只显示选中项的内容区，支持关闭按钮、新建按钮、三种宽度模式，键位与焦点表现逐条抄源码。

```vue
<FluereTabView v-model:selected-index="selected" label="选项卡">
  <FluereTabViewItem header="文档" :is-closable="true">面板内容</FluereTabViewItem>
  <FluereTabViewItem header="图片">面板内容</FluereTabViewItem>
</FluereTabView>
```

::demo-block{title="基础形态：图标 + 文本 + 面板"}
#preview
:TabViewBasicDemo
#code

```vue
<FluereTabView v-model:selected-index="selected" label="示例选项卡">
  <FluereTabViewItem v-for="tab in tabs" :key="tab.title" :header="tab.title">
    <template #icon><component :is="tab.icon" :size="16" /></template>
    <div class="p-fluent-l">…</div>
  </FluereTabViewItem>
</FluereTabView>
```

::

## 版本与证据口径

| 项         | 值                                                                                                                                                                                                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 规格源 tag | `winui3/release/2.5.1`（commit `ba3a8d5`）                                                                                                                                                                                                                                            |
| 关键文件   | `src/controls/dev/TabView/{TabView.xaml,TabView_themeresources.xaml,TabView.idl,TabView.cpp,TabViewItem.cpp,TabViewListView.cpp,TabViewAutomationPeer.cpp,TabViewItemAutomationPeer.cpp}` + `Generated/{TabView,TabViewItem}.properties.cpp` + `Strings/{en-us,zh-CN}/Resources.resw` |
| 内建文案   | 关闭 / 新建 / 滚动 / 播报共 7 条**逐字**取自上游 `Resources.resw`（见 `packages/ui/src/tab-view/locale.ts` 的对照表）                                                                                                                                                                 |

> **`perf2026` 不采纳**：上游存在 `TabView_perf2026.xaml`（已挂进 `TabView.vcxitems:43`），本库沿用 0.5.1 `TitleBar` 的裁定 —— 不读、不参考、不产生对应分支。
>
> **不存在 `TabViewItem.idl`**：`TabViewItem` / `TabViewItemTemplateSettings` / `TabViewListView` / 两个 AutomationPeer 的公开 API 全部写在 `TabView.idl:203-285` 里。

## 模板与几何

| 结构       | 内容                                                                                                                                                                             |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 根         | 两行：`Auto`（tab 条）/ `*`（内容区）                                                                                                                                            |
| tab 条四列 | `Auto MinWidth=2`（`TabStripHeader`）\| `Auto`（tab 条）\| `Auto`（新建按钮，容器 `Padding 3,0,0,3`、底部对齐）\| `*`（`TabStripFooter`），四列下方一条 1px 底边线               |
| 顶部留白   | tab 条上方 **8px** 来自 `TabView.Padding = TabViewHeaderPadding(0,8,0,0)`（经 `TabListView.Padding` 传到 `ItemsPresenter`），**不是 margin**                                     |
| tab 项三列 | `IconBox(Auto)` \| `ContentPresenter(*)` \| `CloseButton(Auto)`；`ContentPresenter` 原文**没有 Margin**，两侧间距全部来自 `TabContainer.Padding`                                 |
| 底边线     | `TabViewBorderBrush`（`CardStrokeColorDefault`，1px）                                                                                                                            |
| 选中指示条 | `SelectedBackgroundPath`（顶部圆角 8、左右各外扩 4px、底部两侧是半径 4 的**内凹**圆角）+ 两个 4×4 弧块（`Fill=TabViewBorderBrush`），三者都 `x:Load="False"`，选中时才 `Visible` |

几何值逐条来自 `TabView_themeresources.xaml:239-269`：

| 量                   | 值                                                                       |
| -------------------- | ------------------------------------------------------------------------ |
| tab 最小高度         | `32`（`TabViewItemMinHeight`）                                           |
| tab 最小 / 最大宽度  | `100` / `240`（**只在 Equal 模式经代码生效**）                           |
| tab 内边距           | `8,3,4,3`（关闭按钮可见）/ `8,3,8,3`（不可见）                           |
| header 字号 / 图标盒 | `12` / `16`（图标间距 `0,0,10,0`）                                       |
| 关闭按钮             | `32×24`、圆角 `4`、字号 `12`、左边距 `4`                                 |
| 新建按钮             | `32×24`、圆角 `4`、字号 `12`、容器 `3,0,0,3`                             |
| 滚动按钮             | `32×24`、字形字号 `8`；容器 `8,0,3,3` / `3,0,8,3`                        |
| 分隔线               | `1px`、`Margin 0,8,0,8`                                                  |
| 边框                 | `1`；选中态 `1,1,1,0` + `Margin -1,0,-1,1`                               |
| 圆角                 | 选中背景顶角 `OverlayCornerRadius`(8)、三个按钮 `ControlCornerRadius`(4) |

## 键盘（逐条对齐源码）

`TabView` **没有 `OnKeyDown`**，只有三个 `KeyboardAccelerator`（作用域 = 该 TabView，焦点在内容区里也生效）+ 新建按钮的一条 `KeyDown`；方向键在 `TabViewItem` 级。

| 触发键                       | 前置条件                  | 效果                                                                                         |
| ---------------------------- | ------------------------- | -------------------------------------------------------------------------------------------- |
| `Ctrl+F4`                    | 选中项存在且 `IsClosable` | 抛 `tabCloseRequested`（`source: 'keyboard'`）；**不删除 tab**                               |
| `Ctrl+Tab`                   | —                         | 向后环形换选中（跳过禁用项）：`MoveSelection(true)`                                          |
| `Ctrl+Shift+Tab`             | —                         | 向前环形换选中：`MoveSelection(false)`                                                       |
| `←` / `→`（焦点在 tab 条内） | 不含 Alt / Ctrl / Meta    | 在焦点环上移动焦点 —— `tab1 → tab1 关闭按钮 → tab2 → … → 新建按钮 → 回到 tab1`；**不改选中** |
| `Space` / `Enter`            | 焦点在 tab 上             | 选中该 tab（底座 `TabsTrigger` 的键位）                                                      |

**源码里没有的键**（负面证据，不要按直觉补）：`Ctrl+T` / `Ctrl+W` / `Ctrl+1..9` / `Home` / `End` / `Delete` / `Escape`。它们属宿主应用职责（WinUI Gallery / Terminal 各自绑定）。

> 浏览器限制：`Ctrl+Tab` / `Ctrl+F4` 在 Chrome / Edge 里是「切换 / 关闭浏览器标签页」的保留快捷键，页面可能收不到 keydown；组件照实现，可用性取决于宿主环境。

## 选择与关闭语义

- **焦点移动不改选中**（`SingleSelectionFollowsFocus=False`）：方向键只挪焦点，`Ctrl+Tab` / 点击 / `Space` / `Enter` 才改选中。
- **组件绝不自行删除 tab**：关闭按钮与 `Ctrl+F4` 都只抛 `tabCloseRequested`（对齐 `TabView.TabCloseRequested`，`TabViewItem.CloseRequested` 合并进同一个事件）。删不删、删完选谁由消费方决定。
- **删掉当前选中项时自动迁移**：按 `TabView::OnItemsChanged` 的规则 —— `start = min(被移除下标, 剩余数 - 1)`，从该位置**向后环形**找第一个可用项；一圈都没有就不选中任何 tab。在**受控**模式下这个结果通过 `update:selectedIndex` 抛回。
- **按身份跟随**：给子项 `:key`（或 `value`）后，在选中项之前插入 / 重排不会改变选中项（等价 WinUI 的 `SelectedItem`）；没给稳定标识时退回下标语义。
- **焦点归还**：切换 tab 时若焦点原本在旧面板里（面板会被卸载），焦点会送进新面板的第一个可聚焦元素；面板里没有可聚焦元素时回落到该 tab 本身（对齐 `UpdateTabContent`）。
- **新增按钮只抛事件**，并额外用 `aria-live` 播报「已添加新选项卡。」（对应上游的 UIA `ItemAdded` 通知）。

::demo-block{title="关闭与新建：数据由消费方管理"}
#preview
:TabViewCloseDemo
#code

```vue
<FluereTabView
  v-model:selected-index="selected"
  label="可关闭选项卡"
  @tab-close-requested="onCloseRequested"
  @add-tab-button-click="onAddClick"
>
  <FluereTabViewItem v-for="(id, index) in openIds" :key="id" :header="titleOf(id, index)">
    …
  </FluereTabViewItem>
</FluereTabView>
```

::

## 宽度模式（`tabWidthMode`）

| 值                | WinUI             | 语义                                                                        |
| ----------------- | ----------------- | --------------------------------------------------------------------------- |
| `equal`（缺省）   | `Equal = 0`       | 每项宽度 = `clamp(可用宽 / tab 数, 100, 240)`（代码测量，见组件注释）       |
| `size-to-content` | `SizeToContent=1` | 宽度由内容决定，不设 item 宽                                                |
| `compact`         | `Compact = 2`     | 同 `size-to-content`，但**未被选中**的 tab 折叠成只剩图标（选中项强制恢复） |

::demo-block{title="三种宽度模式对照"}
#preview
:TabViewWidthModeDemo
#code

```vue
<FluereTabView :tab-width-mode="mode" :default-selected-index="0" label="宽度模式">
  <FluereTabViewItem header="选项卡一">…</FluereTabViewItem>
  <FluereTabViewItem header="选项卡二">…</FluereTabViewItem>
</FluereTabView>
```

::

## 溢出滚动

tab 条溢出时两侧出现滚动按钮：步长 `50px`，贴左禁止「向后」、贴右禁止「向前」（判定阈值 `0.1`）。两个按钮 `tabindex="-1"` + `aria-hidden="true"` —— **不进 Tab 序、对读屏隐藏**，与 WinUI 的 `IsTabStop=False` + `AccessibilityView=Raw` 一致。tab 条本身用 `overflow-x: auto`（对应上游把 `HorizontalScrollBarVisibility` 置为 `Visible`），滚轮 / 触摸可直接滚动。

::demo-block{title="十个 tab 挤在 480px 里"}
#preview
:TabViewOverflowDemo
#code

```vue
<div class="w-[480px] overflow-hidden">
  <FluereTabView :default-selected-index="0" label="溢出的选项卡条">
    <FluereTabViewItem v-for="title in titles" :key="title" :header="title">…</FluereTabViewItem>
  </FluereTabView>
</div>
```

::

## 状态与关闭按钮

| 状态                   | 触发                        | 表现（token）                                                                                                                       |
| ---------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| rest                   | —                           | 底 `--layerOnMicaBaseAltFillColorTransparent`（透明）、字 `--colorNeutralForeground2`                                               |
| hover                  | 指针悬停（未选中 / 未禁用） | 底 `--layerOnMicaBaseAltFillColorSecondary`；右侧分隔线隐藏                                                                         |
| pressed                | 指针按下（未选中 / 未禁用） | 底 `--layerOnMicaBaseAltFillColorDefault`、字 `--colorNeutralForeground3`                                                           |
| selected               | 选中                        | 底 `--solidBackgroundFillColorTertiary` + 顶角 8 + 1px `--colorNeutralStrokeAlpha` 描边 + 字 `--colorNeutralForeground1` + SemiBold |
| disabled               | `disabled`                  | 字 `--colorNeutralForegroundDisabled`、不可点、不进焦点环                                                                           |
| focus                  | 键盘聚焦                    | `useFocusVisual` 双层焦点矩形（外 2px + 内 1px，等价 `FocusVisualMargin = -3`）                                                     |
| 关闭按钮 hover/pressed | 指针悬停 / 按下关闭按钮     | 底 `--subtleFillColorSecondary` / `--subtleFillColorTertiary`，字 `--colorNeutralForeground1`                                       |
| 新建按钮 hover/pressed | 指针悬停 / 按下             | 同上                                                                                                                                |

**所有状态都是瞬时切换**：上游 TabViewItem 的 hover / pressed / selected / disabled 全部是 `VisualState.Setters`，且所有 `GoToState(..., false)`，文件里没有任何 `EasingFunction`。因此本组件**不写任何 `transition`**。

`closeButtonOverlayMode` 三档：`auto`（缺省）与 `always` 走**同一个 `default:` 分支**（总是显示），只有 `on-pointer-over` 是「悬停或选中才显示」—— 这是源码字面行为，不要按直觉把 `auto` 当成智能判断。

::demo-block{title="可关闭性、禁用与 on-pointer-over"}
#preview
:TabViewStatesDemo
#code

```vue
<FluereTabView :close-button-overlay-mode="overlayMode" :default-selected-index="0" label="状态">
  <FluereTabViewItem header="可关闭（选中）">…</FluereTabViewItem>
  <FluereTabViewItem header="可关闭（未选中）">…</FluereTabViewItem>
  <FluereTabViewItem header="不可关闭" :is-closable="false">…</FluereTabViewItem>
  <FluereTabViewItem header="禁用" disabled>…</FluereTabViewItem>
</FluereTabView>
```

::

## 与 WinUI 的差异（逐条）

1. **子项是「数据型子组件」**：`FluereTabViewItem` 不会挂载（父组件在渲染期读它的 props / slots），因此它**不能** emit；`TabViewItem.CloseRequested` 合并进根组件的 `tabCloseRequested`。子项插槽**不支持作用域参数**（`#header="{ … }"` 拿不到值）。
2. **子项必须是 `FluereTabView` 的直接子元素**（可以包在 `v-for` / `<template>` / `v-if` 里）。套了额外的原生元素或自定义组件时它会被忽略，并在开发期打印一条警告。
3. **没有 `TabItemsSource` / `TabItemTemplate` / 虚拟化**：Web 侧用 `v-for` + 子组件即可。
4. **没有 `AddTabButtonCommand`**：只抛 `addTabButtonClick`。
5. **`disabled` 属性会被底座写成 `disabled="false"`**：浏览器与 AT 都忽略非表单元素上的该属性，禁用语义由 `aria-disabled` 表达（样式一律用 `[data-disabled]`）。
6. **header 超出时省略号**：WinUI 的 `ContentPresenter` 没设 `TextTrimming`（会硬裁），Web 侧用 `text-overflow: ellipsis` 更可读 —— 这是唯一一处主动的排版差异。
7. **选中背景的 4×4 内凹圆角用 CSS mask 表达**：上游是运行时生成的路径 + 两个弧块；等价几何，但不是逐像素一致（见「证据缺口」）。
8. **`TabViewBorderBrush` 的映射**：上游 Light / Default 下它是指向 `CardStrokeColorDefault`（一个 `Color`）的别名，隐式转换路径无法从源码证实；本库按同值处理并**沿用仓库既有映射** `--colorNeutralStrokeAlpha`（InfoBar / ContentDialog 用的就是它）。
9. **不做**：拖拽重排、tear-out 撕出、中键关闭、`TabStripDragOver` / `TabStripDrop` / `TabDrag*` 事件、`ItemContainerTransitions`（其时长 / 关键帧不在控件目录内）、高对比度色板（只保留 `forced-colors` 焦点环兜底）。

## API

### `FluereTabView`

| 属性（Props）            | 类型                                        | 默认      | 对应 / 说明                                                          |
| ------------------------ | ------------------------------------------- | --------- | -------------------------------------------------------------------- |
| `selectedIndex`          | `number`                                    | `—`       | `v-model:selected-index`；传了即受控，不传为非受控                   |
| `defaultSelectedIndex`   | `number`                                    | `0`       | 非受控初始项（对齐 WinUI `SelectedIndex` 默认 `0`）                  |
| `tabWidthMode`           | `'equal' \| 'size-to-content' \| 'compact'` | `'equal'` | `TabWidthMode`                                                       |
| `closeButtonOverlayMode` | `'auto' \| 'on-pointer-over' \| 'always'`   | `'auto'`  | `CloseButtonOverlayMode`；`auto` 与 `always` 同行为                  |
| `isAddTabButtonVisible`  | `boolean`                                   | `true`    | `IsAddTabButtonVisible`                                              |
| `label`                  | `string`                                    | `—`       | tab 条的可访问名（`aria-label`）。上游 peer 无名称回退，**建议必填** |
| `dir`                    | `'ltr' \| 'rtl'`                            | `—`       | 只影响方向键的前进方向判定（`FlowDirection`）                        |
| `motion`                 | `'auto' \| 'none'`                          | `'auto'`  | 只作用于滚动按钮的平滑滚动；`auto` 尊重 `prefers-reduced-motion`     |
| `locale`                 | `string`                                    | `—`       | 内建文案 locale，优先于 `FluereConfigProvider`                       |

| 事件（Emits）          | 载荷                                  | 说明                                                                  |
| ---------------------- | ------------------------------------- | --------------------------------------------------------------------- |
| `update:selectedIndex` | `number`                              | 选中变化；受控模式下含「迁移后的结果」                                |
| `tabCloseRequested`    | `{ index, header, identity, source }` | 关闭请求（`source` 为 `'close-button'` / `'keyboard'`）；组件不删数据 |
| `addTabButtonClick`    | `MouseEvent`                          | 新建按钮点击；组件不新增 tab                                          |

| 插槽（Slots）                           | 说明                                                              |
| --------------------------------------- | ----------------------------------------------------------------- |
| `default`                               | `FluereTabViewItem` 列表（必须是直接子元素）                      |
| `tab-strip-header` / `tab-strip-footer` | tab 条左右两端的自定义内容（`TabStripHeader` / `TabStripFooter`） |
| `add`                                   | 新建按钮的图标（默认是 `Add` 字形）                               |

### `FluereTabViewItem`

| 属性（Props） | 类型               | 默认    | 对应 / 说明                                                            |
| ------------- | ------------------ | ------- | ---------------------------------------------------------------------- |
| `header`      | `string`           | `''`    | `Header`；`#header` 插槽优先于它                                       |
| `isClosable`  | `boolean`          | `true`  | `IsClosable`（不是 `IsTabClosable`）                                   |
| `disabled`    | `boolean`          | `false` | `Control.IsEnabled = false`                                            |
| `ariaLabel`   | `string`           | `—`     | `AutomationProperties.Name`；缺省时 AT 从 header 文本取名（对齐 peer） |
| `value`       | `string \| number` | `—`     | 稳定标识（等价 `:key`），用于「按身份跟随选中」                        |

| 插槽（Slots）          | 说明                               |
| ---------------------- | ---------------------------------- |
| `default`（`content`） | 面板内容；非选中时会被卸载         |
| `header`               | 富文本标题（优先于 `header` 文本） |
| `icon`                 | 图标（16×16 盒）                   |

## 浏览器实测（可复现）

Playwright + 系统 Chrome（1280×900 / DPR 1，脚本 `temp/pw-tab-view.mjs`，共 53 条断言全绿）在文档站本页实测：

| 量                        | 实测                                                                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| tab 条高 / 单 tab 高      | `40`（8px 顶部留白 + 32 + 行内 1px 底边线）/ `32`                                                                                                 |
| tab padding / header 字号 | `3px 4px 3px 8px`（关闭按钮可见，见下）/ `12px`                                                                                                   |
| Equal 单 tab 宽           | 行宽 718 − 左内容 2 − 新建按钮区 35 − 右内容 0 = 681 ⇒ `227`（3 项）；7 项时仍按可用宽均分，溢出时落到下限 `100`                                  |
| 选中态                    | 伪元素填充 `rgb(249, 249, 249)`、顶角 `8px`、四边 `-1px -4px 0px -4px`、字重 `600`、`border-width: 1px 1px 0px`、`margin: 0px -1px`、`z-index: 1` |
| 未选中 hover              | `rgba(0, 0, 0, 0.04)`（令牌 `rgba(0, 0, 0, 0.039)`，Chrome 序列化成 0.04）                                                                        |
| 焦点矩形                  | tab 上 `outline: 2px solid rgb(0,0,0)` + `outline-offset: 1px` + `box-shadow: rgb(255,255,255) 0 0 0 1px`；roving 下聚焦项 `tabindex=0`           |
| `Ctrl+Tab`                | 选中 `0 → 1`，焦点仍停在 tab 条（只改选中、不动焦点）                                                                                             |
| 溢出（480px / 10 个 tab） | 单 tab `100`；两个滚动按钮可见且 `aria-hidden=true`；点「向前」`scrollLeft +50`；到右端后「向前」`disabled`、「向后」可用                         |
| 宽度模式                  | `size-to-content` 宽度小于 Equal（按内容收紧）；`compact` 未选中项 header `display: none`、图标盒 `16`、选中项仍显示文本                          |
| 可关闭性 / 叠加模式       | `isClosable=false` 无关闭按钮；`disabled` 项 `aria-disabled=true`；`on-pointer-over` 未悬停时无按钮、悬停后出现                                   |
| 关闭链路                  | 点选中项后 `Ctrl+F4` ⇒ 消费方删掉该项（3 → 2），且仍有选中项（向后环形迁移）                                                                      |
| 面板                      | 只有选中面板有内容，其余带 `hidden`                                                                                                               |
| 暗色                      | 选中填充 `rgb(40, 40, 40)`、前景 `rgb(255, 255, 255)`、未选中透明                                                                                 |

> **实测抓到的两个真 bug**（数值断言当时全绿，只有浏览器暴露）：
> ① 模板里的 kebab-case 属性（`:is-closable="false"`）在**原始 vnode props** 里的键就是 `is-closable`，只认 camelCase 会把 `false` 当「没传」⇒ 关闭按钮照常渲染（见 `collection.ts#readProp`）；
> ② 选中背景是定位伪元素，按绘制次序会盖住常规流里的图标与文本 ⇒ 选中项整片纯色（现已把内容提升到同一层级，`elementFromPoint` 断言守住）。

## 实现要点与证据缺口

- **子项收集在渲染期完成**（`collection.ts`）：`provide/inject` 注册式收集要等后代 `setup()`，SSR 直出会缺整条 tab 条；这里在父组件渲染期直接读子 vnode 的 props / slots（等价 React 的 `cloneElement`），一次渲染得到完整列表。
- **选中解析是纯函数**（`resolveSelectedIndex`）：渲染期不写响应式状态，SSR 与水合一致；迁移结果在 `onUpdated` 里回填 / 抛回。
- **Equal 宽度在代码里量**：上游 `UpdateTabWidths` 也是这么做的（CSS 无法表达：scroller 宽度由内容决定，`flex: 1 1 0` 会形成循环依赖）。量到之前 CSS 退回 `inline-size: auto`（仍受 min / max 夹持）。
- **证据缺口**：① 选中背景的路径真值由 `StringCchPrintf` + `XamlReader::Load` 运行时生成，仓库里没有可对照的实例字符串；② 三个 `ThemeTransition`（`AddDeleteThemeTransition` 等）与拖拽主题动画的时长 / 关键帧不在控件目录内；③ 高对比度色板全部来自系统运行时；④ `TabViewBorderBrush` 的 `Color` → `Brush` 隐式转换未证实；⑤ 上游键盘测试 `TabViewTests.KeyboardTest` 被标记 `Ignore`（#7546），`Space` 一类语义只能当参考。
