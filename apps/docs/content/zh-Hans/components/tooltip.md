---
title: Tooltip 提示
description: 悬停或键盘聚焦时，在 UI 元素旁显示补充信息的轻量浮层，样式还原 WinUI 3 ToolTip。
nav:
  title: Tooltip 提示
---

# Tooltip 提示

ToolTip 用来补充说明「这个元素做什么」或「用户该做什么」：指针悬停在目标元素上、或目标元素获得键盘焦点时出现（WinUI 官方描述：_A ToolTip shows more information about a UI element… The ToolTip is shown when a user hovers over or presses and holds the UI element._）。

样式、几何与动效对齐 WinUI 3 / Windows App SDK 的 ToolTip（`microsoft-ui-xaml` `winui3/release/2.5.1`；`ToolTip_themeresources.xaml` 与最新 WinUI3 Gallery 发行版 v2.9.3 所用的 WindowsAppSDK 2.0.1 逐字节一致）：

- **几何**：内边距 `9,6,9,8`（`ToolTipBorderPadding`）、最大宽 320（`ToolTipMaxWidth`）、圆角 4（`ControlCornerRadius`）、1px 描边（`ToolTipBorderThemeThickness`）。
- **配色**：底色 `AcrylicInAppFillColorDefaultBrush`（应用内 Acrylic）、前景 `TextFillColorPrimary`、描边 `SurfaceStrokeColorFlyout`。
- **排版**：字号 12（`ToolTipContentThemeFontSize`）、行高 16、`TextWrapping=Wrap`。
- **没有箭头**：WinUI 的 ToolTip 模板里只有一个 `ContentPresenter`，不存在 Pointer / 尖角，本组件同样不渲染箭头。

## 基础用法

包住任意元素即可；`content` 对应 WinUI 的 `ToolTipService.ToolTip="文本"` 用法。

::demo-block{title="简单 ToolTip（对齐 Gallery 示例）"}
#preview
:TooltipBasicDemo
#code

```vue
<FluereTooltip content="Simple ToolTip">
  <FluereButton>Button with a simple ToolTip.</FluereButton>
</FluereTooltip>
```

::

## 弹出方位

`placement` 对应 WinUI 的 `ToolTip.Placement`，缺省 `top`（即 WinUI 自动 ToolTip 的 `DefaultPlacementMode`）。空间不足时组件会自动翻转到相反方位并把提示面推回视口内（对齐 `ToolTipPositioning::QueryRelativePosition` 的「首选方位 → 对侧 → 贴边回推」）。

::demo-block{title="四个方位"}
#preview
:TooltipPlacementDemo
#code

```vue
<FluereTooltip content="Placement = Top（默认）" placement="top">
  <FluereButton>Top</FluereButton>
</FluereTooltip>
<FluereTooltip content="Placement = Bottom" placement="bottom">…</FluereTooltip>
<FluereTooltip content="Placement = Left" placement="left">…</FluereTooltip>
<FluereTooltip content="Placement = Right" placement="right">…</FluereTooltip>
```

::

## 显示延时与「重展示」

WinUI 把延时交给进程级的 `ToolTipService`：首次显示 = `SPI_GETMOUSEHOVERTIME`(400ms) × 2（鼠标 / 键盘）或 × 1（触摸），距上次打开不足 `BETWEEN_SHOW_DELAY_MS`(200ms) 时改走「重展示」路径（鼠标 1.5×、触摸 0）。`FluereTooltipProvider` 就是这层服务：把一组 ToolTip 包起来，它们共享同一个重展示窗口。

::demo-block{title="Provider（对齐 ToolTipService）与单例延时"}
#preview
:TooltipDelayDemo
#code

```vue
<FluereTooltipProvider :delay-duration="400" :skip-delay-duration="200">
  <FluereTooltip content="Simple ToolTip">
    <FluereButton>默认 400ms</FluereButton>
  </FluereTooltip>
  <FluereTooltip content="立即显示" :delay-duration="0">…</FluereTooltip>
</FluereTooltipProvider>
```

::

> 不套 `FluereTooltipProvider` 也能单独使用：组件会自带一层缺省 Provider（400 / 200），只是这样「多个 ToolTip 共享重展示窗口」的手感就没有了。

## 内容形态与禁用

`content` 传纯文本；需要富内容（图标、快捷键、多段文字）时用 `#content` 插槽。`disabled` 对应 WinUI 的 `ToolTip.IsEnabled = false`（WinUI 在该分支把 Popup 的 `Opacity` 置 0，本库表达为不展开）。

::demo-block{title="纯文本 / 长文本换行 / 富内容 / disabled"}
#preview
:TooltipContentDemo
#code

```vue
<FluereTooltip content="Simple ToolTip">
  <FluereButton>纯文本（content）</FluereButton>
</FluereTooltip>

<FluereTooltip :content="longText">
  <FluereButton>长文本自动换行</FluereButton>
</FluereTooltip>

<FluereTooltip>
  <FluereButton>富内容（#content）</FluereButton>
  <template #content>
    <span><strong>保存</strong> Ctrl + S</span>
  </template>
</FluereTooltip>
```

::

::demo-block{title="disabled"}
#preview
:TooltipDisabledDemo
#code

```vue
<FluereTooltip content="这条不会显示" disabled>
  <FluereButton>disabled</FluereButton>
</FluereTooltip>
```

::

## 受控展开

`v-model:open` 对应 `ToolTip.IsOpen`；配合 `delay-duration` 可以做出「点击按钮后在别处解释」之类的引导。

```vue
<FluereTooltip v-model:open="open" content="受控显示的提示">
  <FluereButton @click="open = !open">切换</FluereButton>
</FluereTooltip>
```

## API

| 属性（Props）   | 类型                                     | 默认        | 说明                                                                |
| --------------- | ---------------------------------------- | ----------- | ------------------------------------------------------------------- |
| `content`       | `string`                                 | `—`         | 提示文本；对齐 `ToolTipService.ToolTip="文本"` 的用法               |
| `open`          | `boolean`                                | `undefined` | 受控展开状态（`v-model:open`）；对齐 `ToolTip.IsOpen`               |
| `placement`     | `'top' \| 'bottom' \| 'left' \| 'right'` | `'top'`     | 弹出方位；对齐 `ToolTip.Placement`（缺省即 `DefaultPlacementMode`） |
| `sideOffset`    | `number`                                 | `4`         | 沿弹出方向的间距（px）；对齐 `HorizontalOffset` / `VerticalOffset`  |
| `align`         | `'start' \| 'center' \| 'end'`           | `'center'`  | 垂直于弹出方向的对齐方式（WinUI 侧恒为居中 + 贴边回推）             |
| `delayDuration` | `number`                                 | `—`         | 首次显示延时（ms）；缺省继承 Provider（无 Provider 时 400）         |
| `disabled`      | `boolean`                                | `false`     | 不展开；对齐 `ToolTip.IsEnabled = false`                            |
| `label`         | `string`                                 | `—`         | 提示面的可访问名；缺省取内容文本                                    |

| 事件（Emits） | 载荷      | 说明                                        |
| ------------- | --------- | ------------------------------------------- |
| `update:open` | `boolean` | `v-model:open` 的更新；对齐 `IsOpen` 被改写 |

| 插槽（Slots） | 说明                                                                      |
| ------------- | ------------------------------------------------------------------------- |
| `default`     | 触发元素（任意可聚焦元素；reka 会克隆它并补上 `aria-describedby`）        |
| `content`     | 提示内容；对应 WinUI 的 `ToolTip.Content` / `ContentTemplate`（富内容用） |

### `FluereTooltipProvider`

| 属性（Props）       | 类型     | 默认  | 说明                                                                          |
| ------------------- | -------- | ----- | ----------------------------------------------------------------------------- |
| `delayDuration`     | `number` | `400` | 首次显示延时；对齐 `ToolTipService.InitialShowDelay` 的缺省（400ms × 2）      |
| `skipDelayDuration` | `number` | `200` | 重展示窗口；对齐 `ToolTipService.BetweenShowDelay`（`BETWEEN_SHOW_DELAY_MS`） |

> **无障碍**：触发元素由 reka 自动挂 `aria-describedby`，指向提示面内的隐藏 `role="tooltip"` 元素 —— 与 WinUI 把 ToolTip 关联到目标元素的语义一致（读屏在聚焦时朗读补充说明）。提示面本身 `pointer-events: none`（对齐 `ToolTip.IsHitTestVisible = false`），内部不含可聚焦元素（对齐 `IsTabStop = false`），不会抢 Tab 序。
>
> **实现要点**
>
> - **底色是 Acrylic 的 B 级近似**：`AcrylicInAppFillColorDefaultBrush` 是 `AcrylicBrush`（Light `TintColor #FCFCFC` / `TintOpacity 0` / `FallbackColor #F9F9F9` / `TintLuminosityOpacity 0.85`；Dark `#2C2C2C` / `0.15` / `#2C2C2C` / `0.96`）。Fluent 2 Web 的 token 表里没有「应用内 Acrylic」这一档，本库映射到 `colorNeutralCardBackground`（`#fafafa` / `#333333`）：Dark 的 TintColor 与它的 Dark 值同值，Light 的 FallbackColor `#F9F9F9` 与 `#fafafa` 只差 1 个灰阶（参考图实测提示面就是 `#F9F9F9`）。需要严格对齐实机时覆盖局部变量即可：
>
>   ```css
>   .my-app {
>     --fui-tooltip-background: #f9f9f9;
>   }
>   ```
>
> - **动效取值是唯一一处 B 级值**：WinUI 打开 / 关闭分别是 `FadeInThemeAnimation` / `FadeOutThemeAnimation`（只改 `LayoutRoot.Opacity`，0↔1，linear）。`ThemeAnimations.cpp` 只转调 `ThemeGenerator::AddTimelinesForThemeAnimation(TAS_FADEIN / TAS_FADEOUT, …)`，而时长常量落在**非公开**的 `vsanimation.h`（公开源码树里查不到）⇒ 本库取最短淡入档 `--durationFaster`(100ms) + `--curveLinear`，并落成组件局部变量，消费方可一行覆盖：
>
>   ```css
>   .fui-tooltip {
>     --fui-tooltip-fade-duration: 167ms;
>   }
>   ```
>
> - **`prefers-reduced-motion` 有兜底外观**：动画关掉后提示面仍是完全可见的静态形态（`both` 填充的末帧 `opacity: 1`），不会留下透明残留。
> - **层级**：`z-index: 1100`，高于 ContentDialog 与 Combobox 下拉的 1000，对齐「ToolTip 永远在最上层」。
> - **触摸长按不弹**：WinUI 触摸长按（Touch 模式 1x 延时）会弹提示；Web 侧 reka 的触发只认 `pointerenter` / `pointermove`（`pointerType === 'touch'` 被显式跳过）与 `focus`，故触摸端只在「点按后获得焦点」时生效，长按不弹（触摸端的原生 tooltip 仍可用）。属已知差异。
> - **不实现 `SPI_GETMESSAGEDURATION` 的 5s 自动隐藏**：WinUI 会在 5s 后把 ToolTip 从鼠标下方挪开并关闭；Web 上按时间强行隐藏会在「鼠标仍停在控件上」时产生闪烁，故本库只做「离开 / 失焦即关」。
> - **不实现 `PlacementMode.Mouse` 的鼠标跟随**：默认 `top`（WinUI 自动 ToolTip 的缺省方位），需要跟随指针的消费方可自行监听 `pointermove` 后传入 `placement` / `sideOffset`。
> - **已知缺口**：高对比度主题未实现（WinUI HC 下前景 / 描边走 `SystemColorWindowTextColorBrush`、底色走 `SystemColorWindowColor`）；`ToolTipService` 的其余随附属性（`ShowDuration` / `KeyboardAcceleratorToolTip` / `PlacementTarget` 的等价物）本期不暴露。
