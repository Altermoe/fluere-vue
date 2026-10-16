---
title: App Window 应用窗口
description: 窗口外框样式容器：标题栏插槽、可拖拽区、caption 按钮事件代理与内容可视区域；位置、尺寸与层级由外壳控制。
nav:
  title: App Window 应用窗口
---

# App Window 应用窗口

`FluereAppWindow` 提供**窗口外框的样式与结构**：圆角 / 描边 / 阴影、标题栏（图标、标题、副标题、左头、中段、右头、返回与导航按钮）、右上角 caption 按钮、以及只负责「可视区域」的内容区。

它对位的是 WinUI 3 / Windows App SDK 的 **`Microsoft.UI.Xaml.Controls.TitleBar`**（`microsoft-ui-xaml`）—— 这是一个**组合控件**，所以本组件的模板结构、状态与数值逐条对齐它：

- **模板 12 列**：`2 | Auto(返回) | Auto(导航) | Auto(左头) | 14(左头间距) | Auto(图标) | Auto(标题) | Auto(副标题) | *(中段) | Auto(右头) | 48(最小拖拽区) | Auto(caption 区)`。
- **高度两档**：`Content` / `LeftHeader` / `RightHeader` 三者**全空才 32**（`TitleBarCompactHeight`），任一非空则 48（`TitleBarExpandedHeight`，`TitleBar.cpp#UpdateHeight`）。
- **状态切换零时长**：源码里 `GoToState(..., false)`，没有任何 `Storyboard` / `VisualTransition`，所以标题栏内部切换**不加过渡**。
- **拖拽 = 非客户区 + 打洞**：整条标题栏属非客户区，可交互元素被设成 `NonClientRegionKind::Passthrough` 抠洞；`Icon` 走独立的 `Icon` region，**不在** passthrough 清单里 ⇒ 图标区仍可拖拽。

## 版本与证据口径

| 项              | 值                                                                                                                                                                                                                                              |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 行为基准 tag    | `winui3/release/2.0.1`（commit `978ab63`）—— 最新 WinUI3 Gallery 发行版 v2.9.3 的 `standalone.props` 里 `WindowsAppSdkPackageVersion=2.0.1`                                                                                                     |
| 模板 / 画刷来源 | `winui3/release/2.5.1`（commit `ba3a8d5`）—— 该控件目录两 tag **有漂移**（`TitleBar.cpp` +382 行、idl 新增 `AutoRefreshDragRegions` / `IsDragRegion` 等 `MUX_PUBLIC_V11`），但 `TitleBar.xaml` 与 `TitleBar_themeresources.xaml` **逐字节一致** |
| 关键文件        | `src/controls/dev/TitleBar/{TitleBar.xaml,TitleBar_themeresources.xaml,TitleBar.idl,TitleBar.h,TitleBar.cpp,TitleBarAutomationPeer.cpp}`                                                                                                        |

> **`perf2026` 不采纳**：2.5.1 新增的 `TitleBar_themeresources_perf2026.xaml` 有两处真 bug（`TitleBarPaneToggleButtonForegroundDisabled` 改名后引用没跟着改；PaneToggle 的 `Disabled` 态把背景设到了 16×16 图标上而非按钮底），本组件以 base 版为准。

## 标题栏：六个插槽与三个按钮

| 插槽                          | 对应 WinUI       | 说明                                                                    |
| ----------------------------- | ---------------- | ----------------------------------------------------------------------- |
| `#icon`                       | `IconSource`     | 落在 16×16 的 `Viewbox` 语义盒里（`TitleBarIconMaxWidth/Height`）       |
| `#left-header`                | `LeftHeader`     | 参与 32 → 48 的高度判定；属非拖拽区                                     |
| `#titlebar-content`           | `Content`        | **标题栏中段**（星号列、默认居中）；`Compact` 时改左对齐 + 右移 16      |
| `#right-header`               | `RightHeader`    | 右对齐；属非拖拽区                                                      |
| `#titlebar`                   | 无（本库逃生舱） | 整条标题栏替换；caption 按钮仍由本组件渲染（`showCaptionButtons` 可关） |
| `#content`（别名 `#default`） | 无（窗口内容）   | 应用内容区：只控制可视区域（`overflow: clip`），滚动交给消费方          |

`#icon` 之外的四件套都会把标题栏撑到 48 高；**恰好只有一个**返回 / 导航按钮可见时，左头间距从 14 压到 2（`LeftHeaderSpacingGroup` 的 `NegativeInsetSpacing`）。

::demo-block{title="头部四件套 + 返回 / 导航按钮"}
#preview
:AppWindowHeaderDemo
#code

```vue
<FluereAppWindow
  title="标题栏四件套"
  :is-back-button-visible="true"
  :is-pane-toggle-button-visible="true"
  @back-requested="…"
  @pane-toggle-requested="…"
>
  <template #titlebar-content>
    <FluereInput placeholder="查找设置" aria-label="查找设置" class="w-[220px]" />
  </template>
  <template #right-header>
    <FluereButton appearance="subtle" icon-only :icon="FluentIconPerson24Regular" aria-label="账户" />
  </template>
  <template #content>…</template>
</FluereAppWindow>
```

::

标题栏里的输入框 / 按钮都是**非拖拽区**，不会误触发窗口拖动（等价于 WinUI 把那块区域抠成 passthrough）。

## 内容区：只控制可视区域

内容区的高度是「窗口高 − 标题栏高」，并且 `overflow: clip` + `min-block-size: 0`：**它只决定内容的可视边界**，滚动由消费方决定（放 `FluereScrollView`，或自己的滚动容器）。窗口尺寸同样由消费方给 —— 组件不写 `position` / `inset` / `transform`。

::demo-block{title="基础形态：图标 + 标题 + 副标题 + 内容"}
#preview
:AppWindowBasicDemo
#code

```vue
<FluereAppWindow class="h-[300px] w-full max-w-[560px]" title="设置" subtitle="21RU0000CD">
  <template #icon>
    <FluentIconCloudArrowUp24Regular :size="16" />
  </template>
  <template #content>…</template>
</FluereAppWindow>
```

::

## Caption 按钮：只做逻辑代理

`FluereCaptionButtons` 渲染最小化 / 最大化（还原）/ 关闭三个原生 `<button>`，点击**只抛事件**：`minimize` / `maximize` / `restore` / `close`，并用 `v-model:maximized` 把「最大化 ⇄ 还原」的意图交回消费方 —— 组件本身**不改变任何窗口状态**，这正是 0.5.2「逻辑代理」的口径。

| 能力开关        | 表现                                        | 依据                                    |
| --------------- | ------------------------------------------- | --------------------------------------- |
| `isMinimizable` | false ⇒ **隐藏**按钮                        | 系统表现无 A 级源码，属**假设**（见下） |
| `isMaximizable` | false ⇒ **隐藏**按钮，字形不再切换          | 同上                                    |
| `isClosable`    | false ⇒ 保留按钮但**禁用**（原生 disabled） | 同上                                    |

::demo-block{title="caption 按钮 + 能力开关 + 事件日志"}
#preview
:AppWindowCaptionDemo
#code

```vue
<FluereCaptionButtons
  v-model:maximized="maximized"
  :is-minimizable="isMinimizable"
  :is-maximizable="isMaximizable"
  :is-closable="isClosable"
  @minimize="…"
  @maximize="…"
  @restore="…"
  @close="…"
/>
```

::

### caption 按钮的证据缺口（必须知道）

WinUI 3 的 `TitleBar` **模板里没有 caption 按钮**（12 列读完，无最小化 / 最大化 / 关闭）。它们由系统 DWM 绘制，`microsoft-ui-xaml` 里没有对应的 XAML 实现：

- `CWindowChrome.cpp` 只把按钮底色设成全透明白、并维护 caption 区的 hit-test 矩形，**没有绘制代码**；`CWindowChrome.h` 里的 `enum class CaptionButtonState` 全仓无使用点。
- Microsoft 自己的 `specs/TitleBar/titlebar-functional-spec.md:47-48` 写明 "WinUI TitleBar does not handle Caption Buttons … handled by the AppWindow TitleBar"。
- 仓库里唯一存在的 caption 视觉是**旧系统 chrome** 的 `x:Key="WindowCaptionButton"` 样式（`src/dxaml/xcp/dxaml/themes/generic.xaml:15697-15786`，40×28 按钮、9×9 描边 `Path`、`WindowStateNormal/Maximized` 两段 `Path.Data`）—— 本组件**只用它的字形几何**。

因此下面的量都是「**系统度量**」，用 Windows 11 参考截图 1:1 交叉验证，并全部落成可覆盖的组件局部变量：

| 量                 | 取值                                           | 来源与验证                                                                                                                                                                                                                                  |
| ------------------ | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 单键宽 × 高        | **46 × 32**                                    | `TitleBarRightPaddingWidth` 运行期被 `AppWindowTitleBar.RightInset()` 覆盖（A 级线索）；参考图实测三键字形中心间距 **46.0 / 46.0**                                                                                                          |
| 字形外框 / 线宽    | **10 / 1px**（关闭叉 1.1px）                   | 参考图实测（最小化 10×1 横条、最大化 10×10 描边方框、关闭 10×10 叉）；关闭叉取 1.1 的像素依据见下「字形定值过程」                                                                                                                           |
| 字形墨色           | **`#000000` / `#FFFFFF`**（浅 / 深主题）       | 遗留样式 `WindowCaptionForeground` → `SystemControlForegroundBaseHighBrush` → `SystemBaseHighColor`（`generic.xaml:263` + `:4132`）；token 表无同值档（`colorNeutralForeground1` 浅色是 #242424），落成 `--fui-caption-buttons-glyph-color` |
| caption 区竖直位置 | **顶端对齐**                                   | 标题栏 48 高时，返回箭头墨迹中心 y≈23.5（= 48/2）而 caption 字形中心 y≈15.5（= 32/2）⇒ 按钮只占顶部 32                                                                                                                                      |
| hover / pressed 底 | `colorSubtleBackgroundHover` / `…Pressed`      | 标题栏按钮同族的 A 级画刷（`SubtleFillColorSecondary/Tertiary`）                                                                                                                                                                            |
| 关闭键 hover 红    | **`#C42B1C`**                                  | WinUI 系统色 `SystemFillColorCritical`（`Common_themeresources_any.xaml:282`）与 Windows 11 关闭键红逐字节一致；旧 chrome 里的 `#e81123` **只有定义行、零引用行**，不能当依据                                                               |
| 关闭键 pressed 红  | `colorStatusDangerBackground3Hover`（#B10E1C） | 无任何来源，取语义位最近的 token                                                                                                                                                                                                            |

字形形状的定值过程（1:1 冻结帧 ↔ Windows 11 参考图逐像素**平均绝对差 Δ** 候选扫描，越小越像；脚本 `temp/glyph-lab.mjs` + `temp/glyph-lab-compare.py`，属过程产物不进仓库，结论已落到 `packages/ui/src/app-window/constants.ts` 与组件注释）：

| 字形   | 定值                                                              | Δ        | 淘汰的备选                                     |
| ------ | ----------------------------------------------------------------- | -------- | ---------------------------------------------- |
| 最小化 | `M0 5.5H10`（`butt`；墨迹落在第 6 像素行，比几何中心低 0.5px）    | **0.00** | `M0.5 5H9.5` → 16.11                           |
| 最大化 | 10×10 方框，中线内缩 0.5、圆角 `r0.25`（`butt`）                  | **2.51** | 直角 → 3.38；遗留样式 `r≈1.67px` 大圆角 → 9.72 |
| 关闭   | 端点 `±0.55`（= 线宽÷2，圆头外缘贴满外框）、线宽 **1.1**、`round` | **3.19** | 线宽 1.0 → 15.74；线宽 1.2 → 11.08             |

两处系统性修正（原先「粗笨 / 断线」的根因）：① **移除 `shape-rendering: crispEdges`** —— 它关掉抗锯齿后，45° 笔画退化成硬边阶梯、方框圆角被量化成块（Δ 15.7 vs 3.2）；② **线宽与端头改由 `path` 的呈现属性逐字形输出**（最小化 / 最大化 `1px` + `butt`、关闭叉 `1.1px` + `round`）—— CSS 规则的优先级高于呈现属性，若继续写在 `<style scoped>` 里会把逐字形值整个盖掉。

需要严格对齐实机时，覆盖这些局部变量即可：

```css
.my-caption-buttons {
  --fui-caption-buttons-button-width: 46px;
  --fui-caption-buttons-glyph-size: 10px;
  --fui-caption-buttons-glyph-color: #000000; /* 深色主题下是 #ffffff */
  --fui-caption-buttons-close-hover: #c42b1c;
  --fui-caption-buttons-close-pressed: #b22b26;
}
```

> 字形**线宽 / 端头 / 路径**不做成局部变量：它们与路径几何互相咬合（端点位置 = 线宽 ÷ 2），逐字形不同，覆盖其中一项就会破坏外框对齐 —— 要换字形请用 `minimize-icon` / `maximize-icon` / `restore-icon` / `close-icon` 四个插槽。

## 拖拽：只抛事件

`draggable`（缺省 true）时，在标题栏**非可交互区**按下会依次抛出：

| 事件                  | 载荷                                                                        |
| --------------------- | --------------------------------------------------------------------------- |
| `dragStart`           | `{ pointerId, clientX, clientY }`                                           |
| `dragMove`            | `{ pointerId, clientX, clientY, deltaX, deltaY, totalDeltaX, totalDeltaY }` |
| `dragEnd`             | `{ pointerId, clientX, clientY, totalDeltaX, totalDeltaY, canceled }`       |
| `titlebarDoubleClick` | `{ clientX, clientY }`（系统行为是切换最大化；组件不改状态）                |

- **逐次位移** `deltaX/deltaY` 方便增量更新，**累计位移** `totalDeltaX/totalDeltaY` 方便直接叠在起点上。
- `Esc` / `pointercancel` / 失去指针捕获 ⇒ `dragEnd.canceled = true`。
- 起点落在左头 / 中段 / 右头 / 返回 / 导航 / caption 按钮 / 任何原生可交互元素，或落在带 `data-fui-app-window-drag-exempt` 的元素里 ⇒ **不启动**拖拽。
- 拖拽期间标题栏**文本不可选中**（WinUI 里它属非客户区）。
- `roundToInteger`（缺省 false）时，`dragMove` / `dragEnd` 的**累计位移**四舍五入成整数、`delta` 取两次累计之差 —— 外层用 CSS `translate` 承载位移时可保证 translate 值恒为整数（无亚像素模糊），且**不累积取整误差**。

::demo-block{title="由外壳实现位移（组件只抛事件，用 translate 承载）"}
#preview
:AppWindowDragDemo
#code

```vue
<FluereAppWindow
  class="absolute h-[200px] w-[380px] transition-[translate,border-radius] duration-150"
  :style="{ translate: `${x}px ${y}px` }"
  :maximized="maximized"
  :round-to-integer="true"
  @drag-start="onDragStart"
  @drag-move="onDragMove"
  @titlebar-double-click="maximized = !maximized"
/>
```

::

> **为什么用 `translate` 而不是 `left` / `top`**：`translate` 走合成层、不触发重排 / 重绘，拖拽更顺滑；配合 `:round-to-integer="true"`，位移值恒为整数，不会因为亚像素值产生模糊或抖动。

## 状态与集成样式

| 状态                   | 表达                                             | 实现                                                                                                                                                       |
| ---------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| rest / hover / pressed | 返回、导航、caption 按钮                         | `colorSubtleBackground` / `…Hover` / `…Pressed`（对应 `SubtleFillColor*`）                                                                                 |
| disabled               | `isBackButtonEnabled=false` / `isClosable=false` | `colorNeutralBackgroundDisabled` + `colorNeutralForegroundDisabled`（`ControlFillColorDisabledBrush` / `TextFillColorDisabledBrush`）                      |
| focus                  | 键盘 Tab 到按钮                                  | WinUI 双层焦点矩形：外 2px `colorStrokeFocus2` + 内 1px `colorStrokeFocus1`                                                                                |
| 失活（非前台）         | `active=false`                                   | 标题 / 副标题换 `colorNeutralForeground3`（`TitleBarDeactivatedForegroundBrush`）；图标 / 左头 / 中段 / 右头 `Opacity=0.5`（`TitleBarDeactivatedOpacity`） |
| 最大化                 | `maximized=true`                                 | 圆角 `borderRadiusXLarge` → `borderRadiusNone`、阴影移除、caption 字形切「还原」                                                                           |

::demo-block{title="失活 / 最大化 / 零时长动效 + 焦点"}
#preview
:AppWindowStatesDemo
#code

```vue
<FluereAppWindow :active="active" :maximized="maximized" title="前台 / 失活" />
<FluereAppWindow motion="none" title="零时长动效 + 焦点" :is-back-button-visible="true" />
```

::

> **层级由外部控制**：组件**不写任何 `z-index`**。窗口层由外壳决定（文档站现有档位：ContentDialog / Combobox 下拉 `1000`、Tooltip `1100`）。
>
> **最大 / 最小化动画**：DWM 的窗口打开、最小化、最大化动画**没有任何关键帧可读**（不在 `microsoft-ui-xaml` 里），本库不做逐帧还原。组件只提供「可控过渡钩子」：`motion="auto"` 时给窗口框体的圆角 / 阴影 / 底色挂 token 化过渡（`--durationNormal` + `--curveDecelerateMid`，尊重 `prefers-reduced-motion`），几何动画由外壳用同一批 token 自行实现（见上面拖拽示例）。

## API

### `FluereAppWindow`

| 属性（Props）                                    | 类型                     | 默认     | 对应 / 说明                                                                 |
| ------------------------------------------------ | ------------------------ | -------- | --------------------------------------------------------------------------- |
| `title`                                          | `string`                 | `''`     | `Title`：12px / Normal，空串时整块折叠                                      |
| `subtitle`                                       | `string`                 | `''`     | `Subtitle`：12px / Normal，前景比标题弱一档                                 |
| `isBackButtonVisible`                            | `boolean`                | `false`  | `IsBackButtonVisible`                                                       |
| `isBackButtonEnabled`                            | `boolean`                | `true`   | `IsBackButtonEnabled`（真正禁用按钮，且不再算可交互区）                     |
| `isPaneToggleButtonVisible`                      | `boolean`                | `false`  | `IsPaneToggleButtonVisible`                                                 |
| `showCaptionButtons`                             | `boolean`                | `true`   | 本库扩展：WinUI 的 caption 按钮由系统绘制                                   |
| `isMinimizable` / `isMaximizable` / `isClosable` | `boolean`                | `true`   | 透传 caption 按钮的能力开关                                                 |
| `maximized`                                      | `boolean`                | `false`  | `v-model:maximized`；只影响圆角 / 阴影 / 字形，**不改几何**                 |
| `active`                                         | `boolean`                | `true`   | 前台态，false 走失活表现（WinUI 来自 `InputActivationListener`）            |
| `draggable`                                      | `boolean`                | `true`   | 标题栏是否可拖拽（只影响是否抛 drag 事件）                                  |
| `roundToInteger`                                 | `boolean`                | `false`  | 位移取整：累计位移按差值取整，translate 值恒为整数（见上文拖拽节）          |
| `label`                                          | `string`                 | `—`      | `AutomationProperties.Name`，缺省回退 `title`（对齐 peer 的 `GetNameCore`） |
| `motion`                                         | `'auto' \| 'none'`       | `'auto'` | 组件自有过渡开关（`auto` 尊重 `prefers-reduced-motion`）                    |
| `labels`                                         | `Partial<CaptionLabels>` | `—`      | 覆盖 caption 按钮可访问名                                                   |
| `locale`                                         | `string`                 | `—`      | 内建文案 locale（Back / Toggle Navigation），优先于 `FluereConfigProvider`  |

| 事件（Emits）                                 | 载荷                   | 说明                                   |
| --------------------------------------------- | ---------------------- | -------------------------------------- |
| `backRequested`                               | —                      | 对齐 WinUI `BackRequested`             |
| `paneToggleRequested`                         | —                      | 对齐 WinUI `PaneToggleRequested`       |
| `update:maximized`                            | `boolean`              | caption 的最大化 / 还原意图            |
| `minimize` / `maximize` / `restore` / `close` | —                      | caption 的语义事件（组件不改窗口状态） |
| `dragStart` / `dragMove` / `dragEnd`          | 见上表                 | 标题栏拖拽（只抛事件）                 |
| `titlebarDoubleClick`                         | `{ clientX, clientY }` | 标题栏双击（系统行为：切换最大化）     |

| 插槽（Slots）                    | 说明                       |
| -------------------------------- | -------------------------- |
| `icon`                           | `IconSource`；16×16 盒子   |
| `left-header`                    | `LeftHeader`；参与高度判定 |
| `titlebar-content`               | `Content`（标题栏中段）    |
| `right-header`                   | `RightHeader`              |
| `titlebar`                       | 整条标题栏替换（逃生舱）   |
| `content` / `default`            | 内容区（只控制可视区域）   |
| `back-icon` / `pane-toggle-icon` | 替换返回 / 导航按钮字形    |

### `FluereCaptionButtons`

| 属性（Props）   | 类型                     | 默认    | 说明                                    |
| --------------- | ------------------------ | ------- | --------------------------------------- |
| `maximized`     | `boolean`                | `false` | `v-model:maximized`；决定字形与可访问名 |
| `isMinimizable` | `boolean`                | `true`  | false ⇒ 隐藏最小化按钮                  |
| `isMaximizable` | `boolean`                | `true`  | false ⇒ 隐藏最大化 / 还原按钮           |
| `isClosable`    | `boolean`                | `true`  | false ⇒ 关闭按钮保留但禁用              |
| `active`        | `boolean`                | `true`  | false ⇒ 字形转弱（失活）                |
| `labels`        | `Partial<CaptionLabels>` | `—`     | 覆盖可访问名（优先于 locale）           |
| `locale`        | `string`                 | `—`     | 内建文案 locale                         |

| 事件（Emits）          | 载荷      | 说明                            |
| ---------------------- | --------- | ------------------------------- |
| `update:maximized`     | `boolean` | 切换意图                        |
| `minimize`             | —         | 最小化意图                      |
| `maximize` / `restore` | —         | 由当前 `maximized` 决定抛哪一个 |
| `close`                | —         | 关闭意图                        |

| 插槽（Slots）                                                     | 说明         |
| ----------------------------------------------------------------- | ------------ |
| `minimize-icon` / `maximize-icon` / `restore-icon` / `close-icon` | 替换内建字形 |

## 浏览器实测（可复现）

Playwright + 系统 Chrome（1280×900 / DPR 1）在文档站本页实测的计算样式（脚本与截图属过程产物，只留在 `temp/`；结论如下）：

| 量                             | 实测                                                                                                                                                 |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 标题栏高度                     | `32`（无头部插槽）/ `48`（有）                                                                                                                       |
| 窗口圆角 / 描边 / 内容区       | `8px` / `1px` / `overflow: clip`                                                                                                                     |
| 标题 / 副标题                  | `font-size: 12px` / 前景 `rgb(66, 66, 66)`                                                                                                           |
| 返回按钮                       | `40 × 44`、圆角 `4px`、左缘偏移 `5`（1 描边 + 2 内边距 + 2 Margin）                                                                                  |
| caption 单键 / 区宽 / 键心间距 | `46 × 32` / `138` / `46`                                                                                                                             |
| caption 字形                   | `10 × 10`、居中、`stroke-width` 属性 `1`（关闭叉 `1.1`）、`shape-rendering: auto`、48 高时顶端对齐（`offsetTop: 0`）                                 |
| caption 字形墨色 / 保真度      | 浅色 `rgb(0, 0, 0)` / 深色 `rgb(255, 255, 255)`；与 Windows 11 参考图 1:1 逐像素**墨量**平均差 **2.09/255**（最小化 0.00 / 最大化 2.73 / 关闭 3.59） |
| 最小化 hover / 关闭键 hover    | `rgb(245, 245, 245)` / `rgb(196, 43, 28)`（= #C42B1C）+ 白字形                                                                                       |
| 焦点矩形                       | `inset 0 0 0 2px rgb(0,0,0), inset 0 0 0 3px rgb(255,255,255)`                                                                                       |
| 失活标题                       | `rgb(97, 97, 97)`                                                                                                                                    |
| 最大化                         | 圆角 `0px`、无阴影、caption 字形 `restore`                                                                                                           |
| `motion`                       | `none` ⇒ `transition-duration: 0s`；`auto` ⇒ `border-radius, box-shadow, background-color`                                                           |
| 拖拽（真实指针）               | 外壳用 CSS `translate` 承载：拖动 `+60 / +40 px` 后 `translate:60px 40px`（roundToInteger 下为整数）；拖动中 `data-dragging=true`                    |

## 实现要点

- **高度判定照抄 `UpdateHeight()`**：只有 `LeftHeader` / `Content` / `RightHeader` 参与，`Title` / `Subtitle` 不影响高度档位。
- **caption 字形与原系统 chrome 的三处偏离（2026-10-16 校准）**：① 去掉 `shape-rendering: crispEdges`（它关掉抗锯齿，45° 笔画退化成硬边阶梯）；② 线宽 / 端头改由 `path` 的呈现属性逐字形输出（CSS 优先级高于呈现属性，留在样式块里会把逐字形值盖掉）；③ 墨色改用局部变量 `light-dark(#000000, #ffffff)`（= `WindowCaptionForeground` → `SystemBaseHighColor`，token 表无同值档）。字形几何的候选 Δ 扫描见上文《caption 按钮的证据缺口》。
- **Compact 折叠是「后声明组胜出」**：`TitleTextGroup` 与 `DisplayModeGroup` 都会写 `PART_TitleText.Visibility`，后者声明在后 ⇒ `Compact` 生效时标题 / 副标题折叠、中段由居中改左对齐并右移 16。判据不是断点，而是「中段期望宽 ≥ 中段可用宽」（`contentArea.DesiredSize().Width >= contentAreaGrid.ActualWidth()`），阈值是**进入折叠那一刻的标题栏宽度**；Web 侧用一层隐藏镜像量期望宽（`visibility: hidden` + `aria-hidden` + `inert`）。
- **拖拽打洞的 Web 等价物**：`pointerdown` 命中 `[data-fui-app-window-nodrag]`、原生可交互元素或 `[data-fui-app-window-drag-exempt]` 时不启动拖拽 —— 对应 WinUI 的 passthrough 矩形。`Esc` 取消、`pointercancel` / 失去捕获同样以 `canceled=true` 收尾。
- **返回 / 导航按钮暂不做 AnimatedIcon 动画**：WinUI 用 `AnimatedBackVisualSource` / `AnimatedGlobalNavigationButtonVisualSource`（LottieGen 产物，`c_durationTicks` = 13333333 ≈ 1.3333 s、画布 48×48、12 个 marker、主题属性 `Foreground`），本库先用静态字形，动画随 0.5.4 `NavigationView` 落地（插槽已留出）。
- **未知缺口**：高对比度主题未实现（WinUI HC 下 `TitleBar` 走 `SystemControl*` / `SystemColor*`）；材质令牌已由 0.4.4 落进 `@fluere-vue/designs`（`micaBackgroundFillColorBase` / `acrylicInAppFillColorDefault` / `layerFillColorDefault` 等，见 `packages/designs/data/repo-tokens.json` 的 `sources.materials`），但**材质合成**（渐变 + 半透明层 + 噪点）属 0.9.1 / 0.9.2，本轮窗口底色仍用 `colorNeutralBackground2`（沿用 `SolidBackgroundFillColorBase` 的既有映射），**不写 `backdrop-filter`**。
- **`Title` 不写 `document.title`**：WinUI 会真的改窗口标题并在清空时恢复默认标题，Web 侧不碰文档标题（避免污染文档站与 SSR）。
