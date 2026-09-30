---
title: Info Badge 徽章
description: 非打断式的小徽章：圆点 / 数值 / 图标三态，五档 Severity 底色，几何与配色还原 WinUI 3 InfoBadge。
nav:
  title: Info Badge 徽章
---

# Info Badge 徽章

Info Badge 用来在应用内**非打断地**提示「有新内容 / 有未读数 / 需要留意」，典型落点是 NavigationView 的菜单项、按钮的一角、列表项的尾部（WinUI 官方描述：_badging is a non-intrusive and intuitive way to display notifications or bring focus to an area within an app_）。

样式与几何对齐 WinUI 3 / Windows App SDK 的 InfoBadge（`microsoft-ui-xaml`，`InfoBadge` 目录在 `winui3/release/2.0.1`——最新 WinUI3 Gallery 发行版 v2.9.3 所用的 WindowsAppSDK 版本——与 `winui3/release/2.5.1` 之间**逐字节一致**）：

- **几何**：最小 4×4（`InfoBadgeMinWidth` / `InfoBadgeMinHeight`）、最大高 16（`InfoBadgeMaxHeight`）、**宽度不限**、圆角 = 实际高的一半（`InfoBadge.cpp#OnSizeChanged`）。
- **形态**：`Value >= 0` 显示数字（11px，`InfoBadgeValueFontSize`）；否则有 `IconSource` 显示图标；否则是一个 4×4 的圆点。
- **正方形规则**：`InfoBadge.cpp#MeasureOverride` 在「宽 < 高」时返回正方形，所以单个数字的徽章是**正圆**而不是窄胶囊。
- **图标框**：`Viewbox` 撑满「最大高 − 内外边距」= 8px（模板里的 `InfoBadgeIconWidth` / `InfoBadgeIconHeight` 两个资源**没有被模板引用**，是死资源）。

## 三种形态：Dot / Value / Icon

`value` 与 `icon` 两个 Prop 的组合决定形态，推导顺序逐字对齐 `InfoBadge.cpp#OnDisplayKindPropertiesChanged`（**Value 优先于 Icon**）：

| 条件                         | 形态    | 对应 WinUI                   |
| ---------------------------- | ------- | ---------------------------- |
| `value >= 0`                 | `value` | `Value` 视觉状态             |
| 有 `icon`（或 `#icon` 插槽） | `icon`  | `Icon` / `FontIcon` 视觉状态 |
| 都不满足                     | `dot`   | `Dot` 视觉状态（空状态）     |

::demo-block{title="Dot / Value / Icon 三态"}
#preview
:InfoBadgeKindsDemo
#code

```vue
<FluereInfoBadge />
<FluereInfoBadge :value="5" />
<FluereInfoBadge severity="attention" icon />
<FluereInfoBadge :icon="FluentIconAdd16Filled" />
```

::

## 五档 Severity

`severity` 对应 `InfoBadge_themeresources.xaml` 里的 Style 键：每一档都有 `Dot` / `Value` / `Icon` 三个变体，**底色完全相同**，差别只在「是否预置 `IconSource`」与「图标态是否额外加 `Padding=0,4,0,2`」（后者与 `IconInfoBadgeIconMargin` 在图标态下几何等价，见「实现要点」）。

| `severity`       | WinUI Style 前缀           | 底色资源                           |
| ---------------- | -------------------------- | ---------------------------------- |
| `accent`（缺省） | `DefaultInfoBadgeStyle`    | `AccentFillColorDefaultBrush`      |
| `attention`      | `Attention*InfoBadgeStyle` | `SystemFillColorAttentionBrush`    |
| `informational`  | `Informational*…`          | `SystemFillColorSolidNeutralBrush` |
| `success`        | `Success*…`                | `SystemFillColorSuccessBrush`      |
| `caution`        | `Caution*…`                | `SystemFillColorCautionBrush`      |
| `critical`       | `Critical*…`               | `SystemFillColorCriticalBrush`     |

::demo-block{title="不同 Severity × 三种形态（对齐 Gallery 示例 2）"}
#preview
:InfoBadgeStylesDemo
#code

```vue
<FluereInfoBadge :severity="severity" icon />
<FluereInfoBadge :severity="severity" :value="10" />
<FluereInfoBadge :severity="severity" />
```

::

## 嵌在 NavigationView / 其他控件里

徽章最常见的落点是导航项与控件一角。徽章本身是**纯装饰元素**，可访问名应当挂在承载它的控件上（Gallery 就是这么写的：`AutomationProperties.Name="Inbox, 5 notifications"`）。

::demo-block{title="嵌在 NavigationView 导航项里（对齐 Gallery 示例 1）"}
#preview
:InfoBadgeNavigationDemo
#code

```vue
<NavigationViewItem Content="Inbox" Icon="Mail" AutomationProperties.Name="Inbox, 5 notifications">
  <NavigationViewItem.InfoBadge>
    <InfoBadge Value="5" />
  </NavigationViewItem.InfoBadge>
</NavigationViewItem>
```

::

::demo-block{title="叠在按钮一角（对齐 Gallery 示例 3）"}
#preview
:InfoBadgeOverlayDemo
#code

```vue
<FluereButton icon-only :icon="FluentIconArrowSync20Regular" aria-label="Refresh required" />
<FluereInfoBadge severity="critical" :icon="FluentIconImportant16Filled" />
```

::

## 动态数值

`value` 是响应式的：`>= 0` 显示数字，`< 0` 回到圆点形态（WinUI 的 `Value` 缺省就是 `-1`）。

::demo-block{title="NumberBox 驱动 InfoBadge.Value（对齐 Gallery 示例 4）"}
#preview
:InfoBadgeDynamicDemo
#code

```vue
<FluereInfoBadge :value="value ?? -1" />
<FluereNumberBox
  v-model="value"
  header="InfoBadge Value"
  :min="-1"
  spin-button-placement-mode="inline"
/>
```

::

## API

| 属性（Props）  | 类型                                                                                 | 默认       | 说明                                                                               |
| -------------- | ------------------------------------------------------------------------------------ | ---------- | ---------------------------------------------------------------------------------- |
| `value`        | `number`                                                                             | `-1`       | 徽章数值（`Int32`）；`>= 0` 显示数字，`< 0` 回落到图标 / 圆点；对齐 WinUI `Value`  |
| `severity`     | `'accent' \| 'attention' \| 'informational' \| 'success' \| 'caution' \| 'critical'` | `'accent'` | 背景预设；对齐六套 `*InfoBadgeStyle`                                               |
| `icon`         | `boolean \| Component \| null`                                                       | `—`        | 图标；`true` 取 `severity` 的内建字形，也可直接传图标组件；对齐 WinUI `IconSource` |
| `borderRadius` | `string`                                                                             | `—`        | 圆角；不传时对齐 `OnSizeChanged` 的 `ActualHeight / 2`（全圆角）                   |
| `label`        | `string`                                                                             | `—`        | 可访问名；不传则整个徽章 `aria-hidden`（对齐「InfoBadge 没有 AutomationPeer」）    |

| 插槽（Slots） | 说明                                                                         |
| ------------- | ---------------------------------------------------------------------------- |
| `icon`        | 对应 WinUI `IconSource`；提供后进入 Icon 形态，并覆盖 `icon` Prop 与内建字形 |

> **无障碍**：WinUI 的 InfoBadge **没有 `AutomationPeer`**（`Control.OnCreateAutomationPeer` 未重写，UIA 树里不出现），Gallery 因此把可访问名挂在父级 `NavigationViewItem` 上。本组件缺省渲染 `aria-hidden="true"`、不抢 Tab 序、不拦截指针；只有显式传入 `label` 时才渲染 `role="img"` + `aria-label`（独立使用场景）。组件不硬编码任何自然语言。
>
> **实现要点**
>
> - **形态是实时推导的，不是一个 `variant` 枚举**：`InfoBadge.cpp#OnDisplayKindPropertiesChanged` 里 `Value >= 0` → `Value` 态，否则 `IconSource != null` → `FontIcon` / `Icon` 态，否则 `Dot` 态。本组件的 `displayKind` computed 与之逐字对应（含「Value 优先于 Icon」），并通过 `data-display-kind` 暴露出来，便于样式与测试断言。
> - **两种图标形态在几何上等价**：模板里 FontIcon 态用 `InfoBadgePadding`（被 `*IconInfoBadgeStyle` 覆盖为 `0,4,0,2`）+ `IconInfoBadgeFontIconMargin`（`4,0,4,2`），Icon 态用 `InfoBadgePadding`（`0`）+ `IconInfoBadgeIconMargin`（`4,4,4,4`）——两者都得到「上下 4 + 4、左右 4 + 4」与 8px 的 `Viewbox` 高度，所以本库统一用「8px 图标框 + 4px 外边距」一份规则表达，不再需要 `padding` Prop。
> - **`MeasureOverride` 的正方形规则用 CSS 表达**：Value / Icon 两态的最终高都被 `InfoBadgeMaxHeight` 夹到 16，因此「宽 < 高则取正方形」等价于这两态各加一条 `min-inline-size: 16px`；Dot 态的高就是 `InfoBadgeMinHeight`（4，与 `MinWidth` 相等），不受影响。
> - **数值行高锁定为 `lineHeightBase100`（14px）**：14 + `ValueInfoBadgeTextMargin` 的下外边距 2 = 16 = `InfoBadgeMaxHeight`，与 WinUI 里 `TextBlock` 的自然行高（≈14.67px）被 `MaxHeight` 夹到 16 的结果一致，且不随 Web 字体度量漂移；`4,0,4,2` 这个上下不对称的外边距造成的「文字视觉中心比徽章中心高 1px」也一并保留。
> - **`InfoBadgeIconWidth` / `InfoBadgeIconHeight` 不落地**：这两个资源（12 / 8，Light 与 HC 主题下是 12 / 9）在 `InfoBadge.xaml` 的模板里**没有被引用**，图标实际尺寸由 `Viewbox` 撑满可用高决定 —— 死资源不写进代码，避免下次照着它去“还原”。
> - **五档底色与 InfoBar 共用一套映射**：`SystemFillColor{Attention,Success,Caution,Critical}Brush` 与 InfoBar 的 `InfoBar*SeverityIconBackground` 是**同一批资源**，故沿用 `colorCompoundBrandBackground` / `colorStatusSuccessForeground3` / `colorPaletteYellowForeground1` / `colorStatusDangerForeground3`；`informational` 的 `SystemFillColorSolidNeutralBrush` 在 Fluent 2 Web 里没有同值项，按 `max(亮色 ΔE, 暗色 ΔE)` 最小取 `colorNeutralForeground4`（CIE ΔE76，脚本 `temp/pw-infobadge.mjs` 会实测复核）：
>
>   | Severity      | WinUI 原值（Light / Dark）   | 本库 token                        | ΔE（Light / Dark） |
>   | ------------- | ---------------------------- | --------------------------------- | ------------------ |
>   | accent        | 系统强调色                   | `colorCompoundBrandBackground`    | —（见下）          |
>   | attention     | 系统强调色（`…ColorLight2`） | `colorCompoundBrandBackground`    | —（见下）          |
>   | informational | `#8A8A8A` / `#9D9D9D`        | `colorNeutralForeground4`         | 10.2 / 1.5         |
>   | success       | `#0F7B0F` / `#6CCB5F`        | `colorStatusSuccessForeground3`   | 0.4 / 30.8         |
>   | caution       | `#9D5D00` / `#FCE100`        | `colorPaletteYellowForeground1`   | 26.5 / 23.0        |
>   | critical      | `#C42B1C` / `#FF99A4`        | `colorStatusDangerForeground3`    | 7.3 / 15.2         |
>   | 前景          | `#FFFFFF` / `#000000`        | `colorNeutralForegroundInverted2` | 0.0 / 14.2         |
>
>   **强调色不在仓库里**（style-spec §2 的例外条款）：`AccentFillColorDefaultBrush` / `SystemFillColorAttentionBrush` 都由系统强调色在运行时注入，实机与截图的蓝可能是用户的自定义色，故两者都取 Fluent 默认强调色 token，`accent` 与 `attention` 在 Web 上同色 —— 语义差异体现在内建字形上。`success` 的暗色一档 ΔE 偏大（30.8），这是与 InfoBar 保持同一映射的代价；需要严格对齐实机时用下面的局部变量覆盖。
>
>   六档底色与前景都留了覆盖口子（同 InfoBar 口径）：
>
>   ```css
>   .my-badge {
>     --fui-info-badge-bg: #dff6dd; /* 例如 SystemFillColorSuccess 原值 */
>     --fui-info-badge-fg: #ffffff;
>   }
>   ```
>
> - **五档内建字形都是「裸字形」，且是照图形挑的**：把官方 Segoe Fluent Icons 字体按真实尺寸（16px 圆底 + 8px 字形框）渲染出来比对（脚本 `temp/infobadge-visual/glyph-badge-compare.mjs`）可以确认，`*IconInfoBadgeStyle` 预置的五个字形**都不带圆底**——圆底由徽章本体提供。这一点很关键：InfoBar 用的是 `F136`（实心圆）+ `F13F`（i）**两个字形叠加**，而 `InformationalIconInfoBadgeStyle` 只给了 `F13F` 一个字形，**不能照搬 InfoBar 的圆形图标**。
>
>   | Severity        | WinUI `IconSource`                  | Segoe 字形             | 本库图标                  |
>   | --------------- | ----------------------------------- | ---------------------- | ------------------------- |
>   | `attention`     | `FontIconSource Glyph=&#xEA38;`     | `Asterisk`（8 芒星号） | `text_asterisk_16_filled` |
>   | `informational` | `FontIconSource Glyph=&#xF13F;`     | 裸 `i`                 | `info_16_regular`         |
>   | `success`       | `SymbolIconSource Symbol=Accept`    | `E8FB` 裸对勾          | `checkmark_16_filled`     |
>   | `caution`       | `SymbolIconSource Symbol=Important` | `E171` 裸感叹号        | `important_16_filled`     |
>   | `critical`      | `SymbolIconSource Symbol=Cancel`    | `E711` 裸叉            | `dismiss_16_filled`       |
>
>   已知偏差：Fluent System Icons **没有裸字形 `i`**（已对 16px filled 全量 1,729 个图标做「窄高包围盒 + 恰好两个连通块 + 上块更小」的自动扫描，短名单为空，见 `temp/infobadge-visual/find-bare-i.mjs`）。`info_16_filled` 是「实心圆 + 镂空 i」，直接放上去会得到**白圆盘 + 徽章色 i**（前景 / 底色关系与 WinUI 相反，实测墨迹覆盖率 78% vs 本库 22%）；`info_16_regular` 是同一份 `i`（子路径与 filled 的镂空 i 几何完全相同）外面多一圈 1 单位宽的白环，`i` 仍是白色前景 —— 只多一处细环的偏差，故选 regular。需要完全一致时用 `#icon` 插槽换成自绘字形。
>
>   **墨迹尺寸实测**（`temp/pw-infobadge.mjs` 第 3 节）：WinUI 侧用官方 Segoe Fluent Icons 字体量出字形墨迹与线盒，按「`Viewbox` 把**线盒**（= 1em）缩放到 8px 图标框」换算成 1x 尺寸（脚本 `temp/infobadge-visual/measure-segoe-ink.mjs`）；本库侧从 1:1 元素截图统计与底色有差异的像素外接框。
>
>   | Severity        | 本库图标墨迹（1x） | WinUI 1x 墨迹   | Δ           |
>   | --------------- | ------------------ | --------------- | ----------- |
>   | `attention`     | 6×6                | 7.0×7.0         | −1.0        |
>   | `success`       | 6×5                | 8.0×5.5         | −2.0 / −0.5 |
>   | `caution`       | 2×6                | 3.0×8.0         | −1.0 / −2.0 |
>   | `critical`      | 6×6                | 5.5×5.5         | +0.5        |
>   | `informational` | 8×8（细环 + i）    | 0.8×3.3（裸 i） | 结构性偏差  |
>
>   前四档差 1–2px，来源是两套图标集的**设计留白**不同：Fluent System Icons 的 16px 字形墨迹约占外框 12/16，Segoe 的符号字形几乎填满 em 框；**图标框的映射本身是对的**（Fluent 的 `viewBox` ↔ Segoe 的 em 框，二者都由 `Viewbox` 缩放）。`informational` 那一行是上面说的结构性偏差 —— WinUI 的 `F13F` 是一根 0.8px 宽的细 `i`（1x 下几乎不可见），本库在官方图标集里找不到裸 `i`，退而取「细环 + `i`」。
>
> - **参考图交叉验证**（C 级证据，只比尺度无关的量）：Gallery 截图里强调色徽章高度均为 **16px**、`Different InfoBadge Styles` 一行为 **16×16（Icon）/ 19×16（Value「10」）/ 4×16（Dot）**、NavigationView 里「5」那枚数值徽章是 **16×16 正圆** —— 与 `InfoBadgeMaxHeight=16`、`MeasureOverride` 的正方形规则、`InfoBadgeMinWidth/Height=4` 逐项吻合（见 `temp/pw-infobadge.mjs` 第 4 节与 `temp/visual-infobadge/` 下的截图）。唯一差异是 Value 胶囊比实机宽约 3px（宽高比 1.38 vs 1.19），来自 Web 字体度量（Segoe UI vs Segoe UI Variable）。
> - **已知缺口**：高对比度主题未实现（WinUI HC 下底色 `SystemControlHighlightAccentBrush`、前景 `SystemControlHighlightAltChromeWhiteBrush`）；`InfoBadgeIconWidth / Height` 两个死资源不落地。组件没有任何 Storyboard / VisualTransition，因此不涉及动效与 `prefers-reduced-motion`。
> - **与 WinUI 的 API 差异**：`Value < -1` 时 WinUI 抛 `hresult_out_of_bounds`，本库按 `< 0` 处理（回落到 Dot），渲染期不抛异常；`IconSource` → `icon` Prop / `#icon` 插槽；`TemplateSettings` 不对外暴露。
