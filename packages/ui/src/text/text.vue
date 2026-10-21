<script lang="ts">
/**
 * FluereText 组件 Props 契约
 *
 * 定位：**纯样式组件**（无交互、无状态机、无动效），把 WinUI 3 的九档文本样式
 * （Windows type ramp）落成可复用的 Vue 组件。规格来源与核对过程如下。
 *
 * 一、A 级规格：`microsoft-ui-xaml` tag `winui3/release/2.5.1`（commit ba3a8d5）
 *   `src/controls/dev/CommonStyles/TextBlock_themeresources.xaml`
 *   （该文件在 tag `winui3/release/2.0.1`——WinUI3 Gallery v2.9.3 所用的
 *   WindowsAppSDK 版本——与 2.5.1 之间逐字节一致，故本地快照即 Gallery 行为基准）：
 *
 *     BaseTextBlockStyle：FontFamily=XamlAutoFontFamily、FontSize=14、FontWeight=SemiBold、
 *                         TextTrimming=CharacterEllipsis、TextWrapping=Wrap、
 *                         LineStackingStrategy=MaxHeight、TextLineBounds=Full
 *     CaptionTextBlockStyle       12 / Normal        （CaptionTextBlockFontSize=12）
 *     BodyTextBlockStyle          14 / Normal        （BodyTextBlockFontSize=14）
 *     BodyStrongTextBlockStyle    14 / SemiBold      （继承 Base 的缺省值）
 *     BodyLargeTextBlockStyle     18 / Normal        （BodyLargeTextBlockFontSize=18）
 *     BodyLargeStrongTextBlockStyle 18 / SemiBold
 *     SubtitleTextBlockStyle      20 / SemiBold      （SubtitleTextBlockFontSize=20）
 *     TitleTextBlockStyle         28 / SemiBold      （TitleTextBlockFontSize=28）
 *     TitleLargeTextBlockStyle    40 / SemiBold      （TitleLargeTextBlockFontSize=40）
 *     DisplayTextBlockStyle       68 / SemiBold      （DisplayTextBlockFontSize=68）
 *
 *   18px 及以上的六档（Body Large / Body Large Strong / Subtitle / Title / Title Large /
 *   Display）还额外设 `OpticalMarginAlignment=TrimSideBearings`（见「已知缺口」）。
 *
 * 二、行高：**不在 XAML 里**。`TextBlock_themeresources.xaml` 全文没有 `LineHeight`
 *   Setter（`LineStackingStrategy=MaxHeight` 表示用字体自然行高），页面表格里的
 *   `12/16 … 68/92 epx` 是「文档化的 effective line height」，来自
 *   WinUI3 Gallery v2.9.3 `WinUIGallery/Samples/Typography/TypographyPage.xaml`
 *   （九个 `TypographyControl` 的 `SizeLineHeight` 字符串）与微软官方
 *   《Typography in Windows》的 type ramp 表。Web 侧不写 `line-height` 会让行高
 *   随回退字体度量漂移，故这里把该表**显式钉住**。
 *
 *   → B 级 token 映射（`packages/designs/data/fluent-tokens.json`）：
 *       Caption 12/16  → fontSizeBase200 / lineHeightBase200
 *       Body 14/20     → fontSizeBase300 / lineHeightBase300
 *       Body Large 18/24 → **token 表无 18px / 24px 档**（Fluent 2 Web 的 body2 是 16/22，
 *                          没有 18 档）→ 组件局部变量 `--fui-text-body-large-*`（唯一硬值，
 *                          已留覆盖口子；依据 = Gallery 页面 `SizeLineHeight="18/24 epx"`）
 *       Subtitle 20/28 → fontSizeBase500 / lineHeightBase500
 *       Title 28/36    → fontSizeHero700 / lineHeightHero700
 *       Title Large 40/52 → fontSizeHero900 / lineHeightHero900
 *       Display 68/92  → fontSizeHero1000 / lineHeightHero1000
 *
 * 三、字体：`XamlAutoFontFamily` 在 WinUI 3 上落到 **Segoe UI Variable**
 *   （A 级旁证：`src/dxaml/xcp/core/inc/FontAndScriptServices.h` 的
 *   `c_strUltimateFallbackFontNameCobaltStorage = "Segoe UI Variable"`；
 *   微软《Typography in Windows》明确：Segoe UI Variable 的 optical size（opsz）
 *   轴是**自动**的，用 HTML 时「需要显式在 CSS 里指定 Segoe UI Variable 字体」，
 *   指定后浏览器同样自动按字号选光学尺寸）。
 *   → 根节点声明 `--fui-text-font-family: 'Segoe UI Variable', var(--fontFamilyBase)`：
 *     Fluent token 表只有 `fontFamilyBase`（静态 `Segoe UI` 起头），没有 variable font
 *     档位，故落组件局部变量；非 Windows 平台回落到 token 的完整字体栈。
 *
 * 四、前景 / 字重 / 截断映射：
 *   - 前景：`TextBlock` 缺省前景 = `TextFillColorPrimaryBrush`（`#E4000000` / `#FFFFFF`）
 *     → `--colorNeutralForeground1`（同仓库既有映射）；根节点用
 *     `--fui-text-foreground` 留覆盖口子，供「次级 / 三级文字」等场景一行覆盖，
 *     不再新增 `foreground` Prop（WinUI 的 TextBlock 也没有「颜色枚举」）。
 *   - `FontWeight`：Normal / SemiBold → `--fontWeightRegular` / `--fontWeightSemibold`。
 *   - `TextTrimming=CharacterEllipsis` + `TextWrapping=Wrap`：默认换行；`truncate` 时
 *     改单行 `nowrap + text-overflow: ellipsis`（Web 的 text-overflow 只对单行/块级盒
 *     生效，故同时显式 `display: block`——与 TextBlock 本身是块级元素一致）。
 *   - `TextAlignment`：`align` Prop → `text-align: start | center | end | justify`
 *     （Left/Right 在 Web 侧用逻辑值 start/end 表达；RTL 未实现属仓库级既知缺口）。
 *     注意 Web 的 `text-align` 可继承：不传 `align` 时不输出对齐类、跟随父级；
 *     WinUI 的 `TextAlignment` 默认 Left，需要与实机一致时显式传 `align="start"`。
 *
 * 五、已知缺口（显式记录，不写成「已对齐」）：
 *   - `TextAlignment` 的缺省值：Web 侧不传 `align` 时继承父级 `text-align`（可继承），
 *     WinUI 的 `TextAlignment` 默认为 Left 且不继承；需要严格对齐时显式传 `align="start"`。
 *   - `OpticalMarginAlignment=TrimSideBearings`（18px 以上六档）在 CSS 里**没有等价物**
 *     （`text-box-trim` 仍非稳定标准），本组件不模拟；影响是行首/行尾的侧边距微差，
 *     不改变字号、行高与字重。
 *   - `TextLineBounds=Full` / `LineStackingStrategy=MaxHeight` 的 XAML 行盒语义由显式
 *     `line-height` 近似表达。
 *   - 高对比度主题：WinUI HC 下 `TextFillColor*` 全部为 `SystemColorWindowTextColor`；
 *     Web 侧前景走 token（浏览器 forced-colors 会接管文字色），不另做 HC 分支。
 *   - `TextBlock` 是块级控件；本组件默认渲染 `span`（内联，便于嵌进按钮 / 标签 /
 *     段落），需要块级语义时传 `as="p"` / `as="h1"` 等 —— 这是有意的 Web 化差异。
 *
 * 与 WinUI 的 API 差异：`Text` 属性 → 默认插槽；`FontFamily` / `FontSize` / `LineHeight`
 * 不对外暴露（九档样式是封闭集合，token 与行高由 variant 决定）；`Foreground` →
 * `--fui-text-foreground` 局部变量；`TextAlignment` → `align`。
 */
export type { FluereTextAlignment, FluereTextProps, FluereTextVariant } from './types'
</script>

<script setup lang="ts">
import { computed } from 'vue'
import type { FluereTextProps } from './types'

defineOptions({
  name: 'FluereText',
})

const props = withDefaults(defineProps<FluereTextProps>(), {
  variant: 'body',
  as: 'span',
  truncate: false,
  align: undefined,
})

/** 档位 / 截断 / 对齐都表达成类名，便于消费方覆写与契约测试断言 */
const textClasses = computed(() => [
  `fui-text--${props.variant}`,
  props.truncate ? 'fui-text--truncate' : '',
  props.align ? `fui-text--align-${props.align}` : '',
])
</script>

<template>
  <component
    :is="as"
    class="fui-text"
    :class="textClasses"
    :data-variant="variant"
  >
    <slot />
  </component>
</template>

<style scoped>
/*
 * 根节点：字体家族 + 前景色都用「组件局部变量 + 缺省值」表达。
 *
 * --fui-text-font-family：
 *   WinUI 的 XamlAutoFontFamily 在 WinUI 3 上落到 Segoe UI Variable（见 script 块第 3 节）。
 *   Fluent token 表只有静态 Segoe UI 起头的 fontFamilyBase，没有 variable font 档位，
 *   故这里按「无同值 token → 组件局部变量」落值，并用 var(--fontFamilyBase) 兜住非 Windows 平台。
 *
 * --fui-text-body-large-*：
 *   Body Large 的 18/24 在 token 表里没有同值档（Fluent 2 Web 无 fontSizeBase350 /
 *   lineHeightBase350）；数值依据是 WinUI Gallery TypographyPage.xaml 的
 *   `SizeLineHeight="18/24 epx"`，落局部变量以便消费方覆盖。
 */
.fui-text {
  --fui-text-font-family: 'Segoe UI Variable', var(--fontFamilyBase);
  --fui-text-body-large-font-size: 18px;
  --fui-text-body-large-line-height: 24px;
  margin: 0;
  padding: 0;
  color: var(--fui-text-foreground, var(--colorNeutralForeground1));
  font-family: var(--fui-text-font-family);
  /* Segoe UI Variable 的 opsz 轴自动匹配字号（CSS 缺省即 auto，这里写出来固定规格） */
  font-optical-sizing: auto;
}

/* CaptionTextBlockStyle：CaptionTextBlockFontSize=12 / 行高 16 / Normal */
.fui-text--caption {
  font-size: var(--fontSizeBase200);
  font-weight: var(--fontWeightRegular);
  line-height: var(--lineHeightBase200);
}

/* BodyTextBlockStyle：BodyTextBlockFontSize=14 / 行高 20 / Normal */
.fui-text--body {
  font-size: var(--fontSizeBase300);
  font-weight: var(--fontWeightRegular);
  line-height: var(--lineHeightBase300);
}

/* BodyStrongTextBlockStyle：14 / 行高 20 / SemiBold（继承 BaseTextBlockStyle 的缺省字重） */
.fui-text--bodyStrong {
  font-size: var(--fontSizeBase300);
  font-weight: var(--fontWeightSemibold);
  line-height: var(--lineHeightBase300);
}

/* BodyLargeTextBlockStyle：BodyLargeTextBlockFontSize=18 / 行高 24 / Normal（token 表无 18/24 档） */
.fui-text--bodyLarge {
  font-size: var(--fui-text-body-large-font-size);
  font-weight: var(--fontWeightRegular);
  line-height: var(--fui-text-body-large-line-height);
}

/* BodyLargeStrongTextBlockStyle：18 / 行高 24 / SemiBold */
.fui-text--bodyLargeStrong {
  font-size: var(--fui-text-body-large-font-size);
  font-weight: var(--fontWeightSemibold);
  line-height: var(--fui-text-body-large-line-height);
}

/* SubtitleTextBlockStyle：SubtitleTextBlockFontSize=20 / 行高 28 / SemiBold */
.fui-text--subtitle {
  font-size: var(--fontSizeBase500);
  font-weight: var(--fontWeightSemibold);
  line-height: var(--lineHeightBase500);
}

/* TitleTextBlockStyle：TitleTextBlockFontSize=28 / 行高 36 / SemiBold */
.fui-text--title {
  font-size: var(--fontSizeHero700);
  font-weight: var(--fontWeightSemibold);
  line-height: var(--lineHeightHero700);
}

/* TitleLargeTextBlockStyle：TitleLargeTextBlockFontSize=40 / 行高 52 / SemiBold */
.fui-text--titleLarge {
  font-size: var(--fontSizeHero900);
  font-weight: var(--fontWeightSemibold);
  line-height: var(--lineHeightHero900);
}

/* DisplayTextBlockStyle：DisplayTextBlockFontSize=68 / 行高 92 / SemiBold */
.fui-text--display {
  font-size: var(--fontSizeHero1000);
  font-weight: var(--fontWeightSemibold);
  line-height: var(--lineHeightHero1000);
}

/*
 * TextTrimming=CharacterEllipsis 的 Web 映射：单行 nowrap + text-overflow。
 * text-overflow 只对块级盒生效，故显式 display: block；此时元素尺寸由外部容器决定
 * （与 XAML 里 TextBlock 需要约束宽/高才会触发 trimming 的前提一致）。
 */
.fui-text--truncate {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* TextBlock.TextAlignment：缺省不输出对齐类（Web 侧跟随父级 text-align） */
.fui-text--align-start {
  text-align: start;
}

.fui-text--align-center {
  text-align: center;
}

.fui-text--align-end {
  text-align: end;
}

.fui-text--align-justify {
  text-align: justify;
}
</style>
