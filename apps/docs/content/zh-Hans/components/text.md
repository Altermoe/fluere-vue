---
title: Text 文本
description: 纯样式文本组件：九档 Windows type ramp（Caption → Display），字号 / 行高 / 字重与截断 / 对齐逐项对齐 WinUI 3 TextBlock。
nav:
  title: Text 文本
---

# Text 文本

`FluereText` 是**纯样式组件**：没有交互、状态机与动效，只把 WinUI 3 的九档文本样式（Windows type ramp）落成封闭的 `variant`。它同时承担三件事：

- **字号 / 行高 / 字重**：九档逐项对应 `TextBlock_themeresources.xaml` 里的 `*TextBlockStyle`（Caption / Body / BodyStrong / BodyLarge / BodyLargeStrong / Subtitle / Title / TitleLarge / Display）；
- **语义标签**：`as` 决定渲染成 `span`（缺省）/ `p` / `h1` / `strong` 或任意组件；
- **排版微调**：`truncate` 是 `TextTrimming=CharacterEllipsis` 的 Web 单行映射，`align` 对应 `TextBlock.TextAlignment`。

```vue
<FluereText variant="title">设置</FluereText>
<FluereText as="p">正文使用 body 档，字号 14 / 行高 20。</FluereText>
<FluereText variant="caption" truncate>单行超长文本会在容器宽度不足时被省略号截断</FluereText>
```

规格来源：`microsoft-ui-xaml` 的 tag `winui3/release/2.5.1`（commit `ba3a8d5`）中的 `src/controls/dev/CommonStyles/TextBlock_themeresources.xaml`；该文件与 WinUI3 Gallery v2.9.3 所用的 WindowsAppSDK 版本 `winui3/release/2.0.1` 之间，归一化 BOM / CRLF 后**逐字节一致**，因此本地快照即 Gallery 的行为基准。

## 九档 Windows type ramp

`variant` 是封闭集合，不接受任意字号 / 行高（见「与 WinUI 的 API 差异」）。每一档对应一个 `*TextBlockStyle`，字号与字重取自 A 级 XAML；行高是文档化的 effective line height（12/16 … 68/92 epx），来源与落值方式见「实现要点」。

| Example           | Variable Font     | Size / Line height | WinUI Style                     | 本库 token                                                       |
| ----------------- | ----------------- | ------------------ | ------------------------------- | ---------------------------------------------------------------- |
| Caption           | Small, Regular    | 12/16 epx          | `CaptionTextBlockStyle`         | `fontSizeBase200` / `lineHeightBase200` / `fontWeightRegular`    |
| Body              | Text, Regular     | 14/20 epx          | `BodyTextBlockStyle`            | `fontSizeBase300` / `lineHeightBase300` / `fontWeightRegular`    |
| Body Strong       | Text, SemiBold    | 14/20 epx          | `BodyStrongTextBlockStyle`      | `fontSizeBase300` / `lineHeightBase300` / `fontWeightSemibold`   |
| Body Large        | Text, Regular     | 18/24 epx          | `BodyLargeTextBlockStyle`       | 组件局部变量 18px / 24px（token 表无 18/24 档）                  |
| Body Large Strong | Text, SemiBold    | 18/24 epx          | `BodyLargeStrongTextBlockStyle` | 同上 + `fontWeightSemibold`                                      |
| Subtitle          | Display, SemiBold | 20/28 epx          | `SubtitleTextBlockStyle`        | `fontSizeBase500` / `lineHeightBase500` / `fontWeightSemibold`   |
| Title             | Display, SemiBold | 28/36 epx          | `TitleTextBlockStyle`           | `fontSizeHero700` / `lineHeightHero700` / `fontWeightSemibold`   |
| Title Large       | Display, SemiBold | 40/52 epx          | `TitleLargeTextBlockStyle`      | `fontSizeHero900` / `lineHeightHero900` / `fontWeightSemibold`   |
| Display           | Display, SemiBold | 68/92 epx          | `DisplayTextBlockStyle`         | `fontSizeHero1000` / `lineHeightHero1000` / `fontWeightSemibold` |

::demo-block{title="九档 type ramp（对齐 Gallery TypographyPage）"}
#preview
:TextRampDemo
#code

```vue
<FluereText variant="caption">Caption</FluereText>
<FluereText variant="body">Body</FluereText>
<FluereText variant="bodyStrong">Body Strong</FluereText>
<FluereText variant="bodyLarge">Body Large</FluereText>
<FluereText variant="bodyLargeStrong">Body Large Strong</FluereText>
<FluereText variant="subtitle">Subtitle</FluereText>
<FluereText variant="title">Title</FluereText>
<FluereText variant="titleLarge">Title Large</FluereText>
<FluereText variant="display">Display</FluereText>
```

::

## 语义标签、对齐与截断

- `as` 只改标签，不改视觉：`titleLarge` + `as="h1"`、`subtitle` + `as="h2"`、`body` + `as="p"`、`caption` + `as="span"` 是常见组合。`TextBlock` 在 XAML 里是块级控件，本组件默认用内联 `span` 便于嵌进按钮 / 标签 / 段落；需要块级语义时显式传 `as`。
- `align` 对应 `TextBlock.TextAlignment`：`start` / `center` / `end` / `justify`。Web 的 `text-align` 可继承，因此 `align` 不传时组件不输出对齐类、跟随父级；WinUI 的 `TextAlignment` 缺省是 Left 且不继承，需要与之一致时显式传 `align="start"`。
- `truncate` 输出单行 `nowrap + text-overflow: ellipsis`，并显式 `display: block`（`text-overflow` 只对块级盒生效）；是否出现省略号取决于外部容器是否约束了宽度，这与 XAML 里 `TextBlock` 需要被约束才会触发 `TextTrimming` 的前提一致。
- 次级前景通过 `--fui-text-foreground` 一行覆盖，不新增 Prop（WinUI 的 `TextBlock` 也没有颜色枚举）。

::demo-block{title="as / align / truncate / 前景覆盖"}
#preview
:TextUsageDemo
#code

```vue
<FluereText as="h1" variant="titleLarge">页面标题</FluereText>
<FluereText as="h2" variant="subtitle">小节标题</FluereText>
<FluereText as="p" variant="body">正文段落。</FluereText>

<FluereText as="p" align="center">居中对齐</FluereText>
<FluereText as="p" align="justify">两端对齐的长段落……</FluereText>

<div class="w-60">
  <FluereText truncate>超长文本会被省略号截断</FluereText>
</div>

<FluereText class="secondary">
  次级前景（--fui-text-foreground 覆盖为 colorNeutralForeground3）
</FluereText>
```

::

## API

| 属性（Props） | 类型                                                                                                                            | 默认     | 说明                                                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `variant`     | `'caption' \| 'body' \| 'bodyStrong' \| 'bodyLarge' \| 'bodyLargeStrong' \| 'subtitle' \| 'title' \| 'titleLarge' \| 'display'` | `'body'` | 九档文本样式，逐项对应 WinUI `*TextBlockStyle`；同时输出 `data-variant` 与 `.fui-text--{variant}` 类名                             |
| `as`          | `string \| Component`                                                                                                           | `'span'` | 渲染的标签或组件；`p` / `h1` / `strong` 等语义标签由此传入                                                                         |
| `truncate`    | `boolean`                                                                                                                       | `false`  | 单行截断（`TextTrimming=CharacterEllipsis` 的 Web 映射），同时 `display: block`                                                    |
| `align`       | `'start' \| 'center' \| 'end' \| 'justify'`                                                                                     | —        | 文本对齐（对应 `TextBlock.TextAlignment`）；不传时跟随父级 `text-align`（Web 可继承）；需要与 WinUI 缺省 Left 一致时显式传 `start` |

| 插槽（Slots） | 说明                               |
| ------------- | ---------------------------------- |
| `default`     | 文本内容（对应 WinUI `Text` 属性） |

### 可覆盖的 CSS 局部变量

| 局部变量                            | 缺省值                                       | 说明                                                                                                 |
| ----------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `--fui-text-foreground`             | `var(--colorNeutralForeground1)`             | 前景色；映射 `TextFillColorPrimaryBrush`，次级 / 三级文字在消费方覆盖为 `colorNeutralForeground3` 等 |
| `--fui-text-font-family`            | `'Segoe UI Variable', var(--fontFamilyBase)` | `XamlAutoFontFamily` 在 WinUI 3 的落点；非 Windows 平台回落到 token 的字体栈                         |
| `--fui-text-body-large-font-size`   | `18px`                                       | Body Large 两档的字号；token 表无 18px 同值档，故落局部变量                                          |
| `--fui-text-body-large-line-height` | `24px`                                       | Body Large 两档的行高；token 表无 24px 同值档                                                        |

```css
.secondary {
  --fui-text-foreground: var(--colorNeutralForeground3);
}
```

## 实现要点

- **证据来源（A 级）**：`microsoft-ui-xaml` tag `winui3/release/2.5.1`（commit `ba3a8d5`）的 `src/controls/dev/CommonStyles/TextBlock_themeresources.xaml`。该文件与 tag `winui3/release/2.0.1`（WinUI3 Gallery v2.9.3 所用的 WindowsAppSDK 版本）逐字节一致（归一化 diff），因此九档 `*TextBlockStyle` 的缺省值可直接作为 Gallery 的行为基准。
- **`BaseTextBlockStyle` 的缺省值**：`FontFamily=XamlAutoFontFamily`、`FontSize=14`、`FontWeight=SemiBold`、`TextTrimming=CharacterEllipsis`、`TextWrapping=Wrap`、`LineStackingStrategy=MaxHeight`、`TextLineBounds=Full`；九档只覆盖 `FontSize` / `FontWeight`（Body Large / Body Large Strong / Subtitle / Title / Title Large / Display 六档另加 `OpticalMarginAlignment=TrimSideBearings`）。
- **行高不在 XAML 里**：`TextBlock_themeresources.xaml` 全文没有 `LineHeight` Setter；12/16 … 68/92 是文档化的 effective line height，来自 WinUI3 Gallery v2.9.3 `WinUIGallery/Samples/Typography/TypographyPage.xaml` 九个 `TypographyControl` 的 `SizeLineHeight` 字符串，以及微软《Typography in Windows》的 type ramp 表。Web 侧必须显式钉住行高，否则会随回退字体的度量漂移，因此每一档都写了 `line-height`。
- **Body Large 的 18 / 24 没有同值 token**：Fluent 2 Web token 表（`packages/designs/data/fluent-tokens.json`）没有 18px / 24px 档（`fontSizeBase350` 不存在，body2 是 16/22）。这不是同值映射，两档落组件局部变量 `--fui-text-body-large-font-size` / `--fui-text-body-large-line-height`，消费方可一行覆盖。
- **字体与光学尺寸**：WinUI 3 的 `XamlAutoFontFamily` 落到 Segoe UI Variable（A 级旁证：`src/dxaml/xcp/core/inc/FontAndScriptServices.h` 的 `c_strUltimateFallbackFontNameCobaltStorage = "Segoe UI Variable"`）。微软《Typography in Windows》说明：opsz 光学尺寸轴自动生效，但用 HTML 时需要在 CSS 里显式指定 Segoe UI Variable。因此根节点声明 `--fui-text-font-family: 'Segoe UI Variable', var(--fontFamilyBase)`，并写 `font-optical-sizing: auto`（浏览器缺省即 auto，写出来是为固定规格）。
- **前景与次级前景**：`TextBlock` 缺省前景是 `TextFillColorPrimaryBrush`（`#E4000000` / `#FFFFFF`）→ `colorNeutralForeground1`（仓库既有映射）。参考图里表头的次级文字对应 `TextFillColorSecondary`（`#9E000000`，白底合成 `#616161` = `colorNeutralForeground3`），demo 通过 `--fui-text-foreground: var(--colorNeutralForeground3)` 覆盖，不新增 Prop。
- **`truncate` / `align` 的 Web 映射**：`truncate` 用单行 `nowrap + text-overflow: ellipsis` 表达 `CharacterEllipsis`，并显式 `display: block`（`text-overflow` 只对块级盒生效）；`align` 用逻辑值 `start` / `end` 表达 `TextAlignment` 的 Left / Right。

### 浏览器实测（验证）

契约测试逐档断言 SFC 的声明文本（jsdom 不解析 `var()`）；此外用 Playwright + `getComputedStyle` 在文档站真实浏览器里量过九档：计算字号 / 行高 / 字重依次为 12/16/400、14/20/400、14/20/600、18/24/400、18/24/600、20/28/600、28/36/600、40/52/600、68/92/600，字体栈以 `Segoe UI Variable` 起头；表头次级前景 `#616161`、暗色前景 `#FFFFFF`、`truncate` 实际出现省略号（`scrollWidth > clientWidth`）、英文页消息编译后的表头均通过，共 73 项断言。纯样式组件不涉及焦点、状态与动效，故无 `prefers-reduced-motion` 分支。

### 已知缺口（明确未对齐）

- **`OpticalMarginAlignment=TrimSideBearings` 在 CSS 里没有等价物**（`text-box-trim` 仍非稳定标准），本组件不模拟；影响只是行首 / 行尾的侧边距微差，不改变字号、行高与字重。
- **`TextAlignment` 的缺省值差异**：WinUI 的 `TextBlock.TextAlignment` 缺省是 Left 且不继承；Web 的 `text-align` 可继承，`align` 不传时组件不输出对齐类、跟随父级。需要与 WinUI 缺省一致时显式传 `align="start"`。
- **`TextLineBounds=Full` / `LineStackingStrategy=MaxHeight` 的 XAML 行盒语义**由显式 `line-height` 近似表达，不是逐属性等价。
- **高对比度主题**：WinUI HC 下 `TextFillColor*` 全部为 `SystemColorWindowTextColor`；Web 侧前景走 token，由浏览器 forced-colors 接管文字色，不另做 HC 分支。
- **块级 / 内联差异**：`TextBlock` 是块级控件，而本组件默认渲染内联 `span`（便于嵌进按钮 / 标签 / 段落）；需要块级语义时显式传 `as="p"` / `as="h1"`。这是有意的 Web 化差异。

## 与 WinUI 的 API 差异

| WinUI `TextBlock`                        | 本库                                            |
| ---------------------------------------- | ----------------------------------------------- |
| `Text` 属性                              | 默认插槽                                        |
| `Foreground`                             | `--fui-text-foreground` 局部变量（不新增 Prop） |
| `TextAlignment`                          | `align` Prop                                    |
| `TextTrimming`                           | `truncate` Prop                                 |
| `FontFamily` / `FontSize` / `LineHeight` | 不暴露（九档样式是封闭集合，由 `variant` 决定） |
| `FontWeight`                             | 不单独暴露，随 `variant` 固定                   |
| `OpticalMarginAlignment`                 | 不实现（CSS 无等价物，见「已知缺口」）          |

> 纯样式组件不涉及焦点、状态、动效与 `prefers-reduced-motion`；`variant` / `truncate` / `align` 都只输出类名，消费方可按 `.fui-text--*` 或局部变量覆写。
