---
title: Info Bar 信息横幅
description: 应用级状态提示横幅：四档 Severity、可关闭、可带操作按钮，样式与排版还原 WinUI 3 InfoBar。
nav:
  title: Info Bar 信息横幅
---

# Info Bar 信息横幅

Info Bar 用来告知用户「应用状态发生了变化」——需要知悉、确认或采取行动。默认情况下它留在内容区内直到被用户关闭，但不一定打断用户流程（WinUI 官方描述：_use an InfoBar control when a user should be informed of, acknowledge, or take action on a changed application state_）。

样式与排版对齐 WinUI 3 / Windows App SDK 的 InfoBar（`microsoft-ui-xaml` `winui3/release/2.5.1`，已核对与最新 WinUI3 Gallery 发行版 v2.9.3 所用的 WindowsAppSDK 2.0.1 在 InfoBar 目录下逐字节一致）：

- **几何**：最小高 48（`InfoBarMinHeight`）、1px 描边（`InfoBarBorderThickness`）、圆角 4（`ControlCornerRadius`）、内容左内边距 16（`InfoBarContentRootPadding`）。
- **图标**：16pt 实心圆 + 反白字形（`InfoBarIconFontSize`），右侧留白 14、上下各 16（`InfoBarIconMargin` = `0,16,14,16`）。
- **关闭按钮**：38×38、外边距 5、顶端对齐、字形 16（`InfoBarCloseButtonStyle` / `InfoBarCloseButtonSize` / `InfoBarCloseButtonGlyphSize`）。
- **排版**：不是固定断点，而是按内容实时判定横排 / 竖排（见下方「实现要点」）。

## Severity：四档严重级别

`severity` 决定底色、圆心底色与图标字形，四档与 WinUI `InfoBarSeverity` 一一对应：

::demo-block{title="四档 Severity（对齐 Gallery 示例 1）"}
#preview
:InfobarSeverityDemo
#code

```vue
<FluereInfoBar open title="Title" severity="informational" message="…" />
<FluereInfoBar open title="Title" severity="success" message="…" />
<FluereInfoBar open title="Title" severity="warning" message="…" />
<FluereInfoBar open title="Title" severity="error" message="…" />
```

::

## 标题 / 正文 / 操作按钮

`title` 与 `message` 是两个独立文本位：横排时左右相邻，竖排（内容换行）时上下堆叠。`#action` 插槽对应 WinUI 的 `ActionButton`（`ButtonBase`），既可以放按钮，也可以放超链接。

::demo-block{title="长短消息 + Action Button / Hyperlink（对齐 Gallery 示例 2）"}
#preview
:InfobarMessageDemo
#code

```vue
<FluereInfoBar open title="Title" message="Essential app message…" />

<FluereInfoBar open title="Title" :message="longMessage">
  <template #action>
    <button type="button">Action</button>
  </template>
</FluereInfoBar>
```

::

## 展开 / 图标 / 可关闭三个开关

`v-model:open`（`IsOpen`）、`is-icon-visible`（`IsIconVisible`）、`is-closable`（`IsClosable`）三个开关与 Gallery 示例 3 的选项面板一致。点击关闭按钮时依次抛出 `closeButtonClick` → `closing` → `closed`，`closing` 的 `args.cancel` 置为 `true` 可以取消关闭（组件会把 `open` 回滚为 `true`）。

::demo-block{title="三个开关 + 事件日志（对齐 Gallery 示例 3）"}
#preview
:InfobarOptionsDemo
#code

```vue
<FluereInfoBar
  v-model:open="open"
  title="Title"
  :is-icon-visible="iconVisible"
  :is-closable="closable"
  message="…"
  @closing="onClosing"
  @closed="onClosed"
/>
```

::

::demo-block{title="关闭前确认（Closing 可取消）"}
#preview
:InfobarClosableDemo
#code

```vue
const onClosing = (args) => { if (!confirmed.value) { args.cancel = true // 回滚为打开 return } }
```

::

## 内容区（Content）与「无横幅内容」上移

`#content`（别名 `#default`）对应 WinUI 的 `Content` / `ContentTemplate`，落在模板的第 2 行。当 `title` / `message` / `#action` **全为空**时，WinUI 会把内容区上移到第 0 行（`NoBannerContent` 状态）——下面的示例用复选框对比两种排布。

::demo-block{title="Content 落在第 2 行 vs 上移到第 0 行"}
#preview
:InfobarContentDemo
#code

```vue
<FluereInfoBar open :title="withBanner ? '从云盘同步' : ''">
  <template #content>
    <span>已同步 40%</span>
  </template>
</FluereInfoBar>
```

::

## 自定义图标（IconSource）

`#icon` 插槽对应 WinUI 的 `IconSource`：提供后走 `UserIconVisible` 分支，图标被放进一个 16px 的等比容器（对齐 `Viewbox` 的 `MaxWidth/MaxHeight = InfoBarIconFontSize`），`is-icon-visible=false` 时同样隐藏。

::demo-block{title="自定义图标"}
#preview
:InfobarIconDemo
#code

```vue
<FluereInfoBar open title="自定义图标" message="…">
  <template #icon>
    <FluentIconCloudArrowUp20Regular :size="16" />
  </template>
</FluereInfoBar>
```

::

## API

| 属性（Props）        | 类型                                                   | 默认              | 说明                                                                   |
| -------------------- | ------------------------------------------------------ | ----------------- | ---------------------------------------------------------------------- |
| `open`               | `boolean`                                              | `false`           | 是否展开（`v-model:open`）；对齐 WinUI `IsOpen`                        |
| `title`              | `string`                                               | `''`              | 标题，14px / SemiBold；对齐 WinUI `Title`                              |
| `message`            | `string`                                               | `''`              | 正文，14px / Normal；对齐 WinUI `Message`                              |
| `severity`           | `'informational' \| 'success' \| 'warning' \| 'error'` | `'informational'` | 严重级别；对齐 WinUI `InfoBarSeverity`                                 |
| `isIconVisible`      | `boolean`                                              | `true`            | 是否显示图标列；对齐 WinUI `IsIconVisible`                             |
| `isClosable`         | `boolean`                                              | `true`            | 是否显示关闭按钮；对齐 WinUI `IsClosable`                              |
| `label`              | `string`                                               | `—`               | 根节点可访问名；对齐 `AutomationProperties.Name`                       |
| `closeButtonLabel`   | `string`                                               | `—`               | 关闭按钮可访问名（WinUI 取资源，英文 "Close"；本库不硬编码文案）       |
| `closeButtonTooltip` | `string`                                               | `—`               | 关闭按钮原生提示；对齐资源 `InfoBarCloseButtonTooltip`                 |
| `closeButtonCommand` | `() => void`                                           | `—`               | 关闭按钮点击回调；对齐 WinUI `CloseButtonCommand`，先于 `closing` 执行 |

| 事件（Emits）      | 载荷                 | 说明                                                                    |
| ------------------ | -------------------- | ----------------------------------------------------------------------- |
| `update:open`      | `boolean`            | `v-model:open` 的更新；对齐 WinUI `IsOpen` 被改写                       |
| `opened`           | —                    | 内容已展开；对齐 WinUI `Opened`                                         |
| `closeButtonClick` | —                    | 关闭按钮被点击；对齐 WinUI `CloseButtonClick`，先于 `closing`           |
| `closing`          | `{ reason, cancel }` | 请求关闭；把 `cancel` 置为 `true` 可取消（回滚 `open`），对齐 `Closing` |
| `closed`           | `{ reason }`         | 已关闭；`reason` 为 `'closeButton'` 或 `'programmatic'`，对齐 `Closed`  |

| 插槽（Slots） | 说明                                                                      |
| ------------- | ------------------------------------------------------------------------- |
| `icon`        | 对应 WinUI `IconSource`；提供后取代内建 Severity 图标                     |
| `action`      | 对应 WinUI `ActionButton`；参与横 / 竖排判定（缺失时不占位）              |
| `content`     | 对应 WinUI `Content` / `ContentTemplate`；落在第 2 行（无横幅内容时上移） |
| `default`     | `content` 的别名                                                          |
| `close-icon`  | 替换关闭按钮的字形（默认 `dismiss_16_regular`）                           |

> **无障碍**：根节点渲染 `role="status"`（对齐 `InfoBarAutomationPeer` 的 `ControlType=StatusBar`）；图标是装饰元素（`aria-hidden`，对齐 `AccessibilityView=Raw`）；关闭按钮是原生 `<button>`，可访问名由 `closeButtonLabel` 提供。
>
> **实现要点**
>
> - **方向判定不是固定断点**，而是逐条复刻 `InfoBarPanel.cpp#MeasureOverride`：`nItems == 1`（只有一项）**或** `totalWidth > availableSize.Width`（水平铺开后放不下）**或** `heightOfTallestInHorizontal > InfoBarMinHeight`（某项在横排下已被文本换行撑得比最小高还高）⇒ 竖排。判定用的子项尺寸来自一层 `visibility: hidden` + `width: max-content` 的隐藏镜像 DOM（`aria-hidden`，不参与布局），因此长文本换行、容器变窄都能实时切到竖排，而不是靠 `@container` 猜一个断点。
> - **间距方向敏感**：竖排用 `VerticalOrientationMargin`（Title 14 / Message 4 / Action 12，外加面板自身的 `0,14,0,18`），横排用 `HorizontalOrientationMargin`（Message 左 12 / Action 左 16，外加各文本的 `top: 14`）。两个相邻块的 margin 在 XAML 的 `ArrangeOverride` 里是**直接相加**的（不存在外边距折叠），本组件用同一个 flex 容器 + 相邻兄弟 margin 表达同一语义。
> - **`Closing` 可取消**：与 WinUI 一致，`Cancel=true` 时把 `IsOpen` 回滚为 `true`，且不再抛 `Closed`。
> - **关闭按钮配色**：WinUI 在 `InfoBar.xaml` 里用 `AppBarButton*` 一族资源重定义了按钮的底色 / 前景（rest 透明、hover 5.9% 黑、pressed 6% 黑）。Fluent 2 Web 的 token 表没有这两个半透明档，本库取 `colorSubtleBackground` / `…Hover` / `…Pressed`（语义位最近者），差异记录在组件注释里。
> - **图标是「单色实心圆 + 镂空字形」**：WinUI 用两个 16pt TextBlock 完全重合——`F136` 圆心着 Severity 图标底色、`F13x` 字形着 `TextFillColorInverse`（白 / 黑）。Fluent System Icons 的 `*_16_filled` 本身就是「实心圆 + 镂空字形」的单色图形，故本库用一份图标着 Severity 图标底色，字形由镂空露出 InfoBar 底色；参考图图标中心实测为近白（`#F0F5FB`），16px 下两者不可分辨。图标是按**图形**挑的而不是按名字：Warning 用 `error_circle_16_filled`（圆 + 感叹号）、Error 用 `dismiss_circle_16_filled`（圆 + 叉），因为 `warning_16_filled` 是三角形、`error_circle` 的感叹号也不是实机 Error 的叉号（参考图四个图标墨迹 bbox 都是 15×15 正圆）。
> - **四档底色是「语义位最近」而非同值**：Fluent 2 Web 没有 `SystemFillColor{Attention,Success,Caution,Critical}Background` 的同值 token，逐项按 `max(亮色 ΔE, 暗色 ΔE)` 最小挑选（CIE ΔE76，实测由 `temp/pw-infobar.mjs` 输出）：
>
>   | Severity      | WinUI 原值（Light/Dark）        | 本库 token                      | ΔE（Light/Dark） |
>   | ------------- | ------------------------------- | ------------------------------- | ---------------- |
>   | Informational | `#F4F4F4` / `#323232`（合成后） | `colorNeutralCardBackground`    | 2.1 / 0.5        |
>   | Success       | `#DFF6DD` / `#393D1B`           | `colorStatusSuccessBackground1` | 10.1 / 18.4      |
>   | Warning       | `#FFF4CE` / `#433519`           | `colorStatusWarningBackground1` | 17.5 / 18.5      |
>   | Error         | `#FDE7E9` / `#442726`           | `colorPaletteRedBackground1`    | 6.8 / 12.8       |
>
>   参考图的实测值（`#DFF6DD` / `#FFF4CE` / `#FDE7E9` / 图标底色 `#0F7B0F` / `#9D5D00` / `#C42B1C`）与 WinUI 源码资源**逐字节一致**，可反证源码读取无误。若需要严格对齐实机观感，可覆盖组件内的两个局部变量：
>
>   ```css
>   .my-infobar {
>     --fui-infobar-bg: #dff6dd; /* InfoBarSuccessSeverityBackgroundBrush */
>     --fui-infobar-icon-bg: #0f7b0f; /* InfoBarSuccessSeverityIconBackground */
>   }
>   ```
>
> - **图标墨迹比实机小 1px**：Segoe Fluent Icons 的 `F136` 圆在 16pt 下墨迹直径 15px 且贴齐 em 框左缘；Fluent System Icons 的 `*_16_filled` 圆是 `r=7`（**14px**，居中）。实测 `iconLeft = +17`（参考 +16）、`iconD = 14`（参考 15），即右缘对齐、左缘内缩 1px —— 属图标字体几何差异，换取的是官方 Web 图标集的一致性；其余结构量（填充高、关闭按钮中心、首行墨迹位置、圆角）与参考图偏差均 ≤ 1px。
> - **已知缺口**：高对比度主题未实现（WinUI HC 下底色为 `SystemColorWindowColorBrush`、描边 2px、图标用 `Highlight` / `HighlightText`）；WinUI 打开 / 关闭时发的 UIA 通知（`InfoBarOpenedNotification` / `InfoBarClosedNotification`）是 UIA NotificationEvent，不映射到 ARIA live region，故本组件不引入 `aria-live`。
> - **与 WinUI 的 API 差异**：`IconSource` → `#icon` 插槽、`ActionButton` → `#action` 插槽、`Content` / `ContentTemplate` → `#content` 插槽、`CloseButtonStyle` 不暴露（样式固定在本组件内）；关闭按钮文案走 Prop（本库暂无组件内建文案通道，i18n 属 0.3.0 目标 1.4）。
