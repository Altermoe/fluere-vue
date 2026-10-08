<script setup lang="ts">
/**
 * 组件总览卡片（`/components` Overview 页专用，不属于组件库，故用 `docs-` 前缀）。
 *
 * 规格来源：参考图的生产者 —— WinUI 3 Gallery 的「全部示例」页。
 *   - 页面：WinUIGallery/Pages/AllControlsPage.xaml
 *     （`GridView` + `ControlItemTemplate`，ItemContainerStyle = IndentedGridViewItemStyle，
 *      Padding 24,16,24,36；<640 走 NarrowLayout）
 *   - 卡片：WinUIGallery/Styles/ItemTemplates.xaml#ControlItemTemplate
 *     Width 300 / Height 96 / Padding 8 / BorderThickness 1 / ColumnSpacing 16 /
 *     CornerRadius = OverlayCornerRadius；Image 宽 32、Margin 8,12,16,0（图标盒左内缩 8、上内缩 12）；
 *     Title = BodyStrongTextBlockStyle（14 SemiBold / 行高 20）、Margin 0,12,0,0、NoWrap；
 *     Subtitle = CaptionTextBlockStyle（12 / 行高 16）、TextTrimming=WordEllipsis
 *   - 间距：WinUIGallery/Styles/GridViewItem.xaml#IndentedGridViewItemStyle
 *     Margin 12,0,0,12 → 卡片之间横竖各 12
 *   - 窄屏：ItemTemplates.xaml 的 NarrowLayout（MinWindowWidth 0，WideLayout 为 Breakpoint640Plus）
 *     + GridViewItemStyleSmall → 卡片 Width=Auto / Height=120、内容拉伸
 *
 * 参考图实测复核（temp/ref-allcontrols.png，1066×883 原图，1:1 无缩放）：
 *   卡片宽 300 / 高 96 / 间距 12；页面底 #F9F9F9、卡片底 #FDFDFD、描边 #EAEAEA；
 *   图标盒左缘 = 卡片左缘 + 17、上缘 + 21；文字左缘 = 卡片左缘 + 65（= 17 + 32 + 16）；
 *   标题首行墨迹 y=33 起、摘要首行 y=56 起 —— 与上面的 XAML 数值逐项吻合。
 *
 * 颜色映射（WinUI 资源名 → token，方法见 docs/style-spec.md §6）：
 *   ControlFillColorDefaultBrush（Light `#B3FFFFFF` / Dark `#0FFFFFFF`，给 Mica 透底的半透明白）
 *     → var(--colorNeutralBackground1)
 *     依据：本页底色是 `colorNeutralBackground2`（#fafafa ≈ WinUI `LayerFillColorDefault`
 *     叠 `SolidBackgroundFillColorBase` 的合成值 #F9F9F9，参考图页面底实测同值）；
 *     70% 白叠上去合成 #FDFDFD（= 参考图卡片底实测值），与不透明 #ffffff 只差 2/255。
 *     与 packages/ui/src/input/input.vue 的 `ControlFillColorDefault` 落在同一条约定上
 *     （WinUI 半透明填充 → Fluent 不透明表面档）。
 *   CardStrokeColorDefaultBrush（`#0F000000`，5.9% 黑）→ var(--colorNeutralStrokeAlpha)
 *     （rgba(0,0,0,.05) / rgba(255,255,255,.1)；与 InfoBar / Input / ContentDialog 同一映射。
 *     参考图描边实测 #EAEAEA = 5.9% 黑叠 #F9F9F9，与 WinUI 原值一致）
 *   GridViewItemBackgroundPointerOver / …Pressed
 *     = SubtleFillColorSecondary / TertiaryBrush（GridViewItem_themeresources.xaml）
 *     → var(--colorSubtleBackgroundHover) / var(--colorSubtleBackgroundPressed)
 *     WinUI 把这层画在卡片半透明填充**之下**（合成后才 ~#FBFBFB，几乎不可见）；
 *     Web 侧没有这一层分层宿主，故按语义位直接作为 hover / pressed 填充
 *     （与 input.vue 的 SubtleFillColor* → colorSubtleBackground* 同一处理）。
 *   BodyStrongTextBlockStyle 前景 ← TextFillColorPrimary → var(--colorNeutralForeground1)
 *   CaptionTextBlockStyle 前景 ← TextFillColorSecondary（`#9E000000`，62% 黑 → 白底 #616161）
 *     → var(--colorNeutralForeground3)（#616161，同值）
 *   OverlayCornerRadius（8）→ var(--borderRadiusXLarge)
 *   焦点环沿用文档站既有写法（2px colorCompoundBrandStroke + 2px offset，见 github-link.vue）
 *
 * 两处**有意偏离** WinUI 的地方（都只影响 Web 上的手感，不改变静态外观）：
 *   1. hover / pressed 的换色加了 100ms 过渡（`durationFaster` + `curveEasyEase`）：
 *      WinUI 的 ListViewItemPresenter 是状态切换瞬时换色（模板里没有对应 Storyboard），
 *      这里沿用文档站链接的既有约定（github-link.vue 的 `transition-colors duration-fluent-faster`），
 *      避免鼠标划过时整片网格出现硬切。
 *   2. 标题用 `text-overflow: ellipsis`：XAML 侧是 `TextWrapping=NoWrap` 直接裁断。
 *      当前 16 个组件名都放得下（实测无一被裁），这条只是长名兜底。
 *
 * 图标：参考图里每张卡片的图标是 Gallery 自带的一张彩色 PNG；本库图标是单色
 * `currentColor` 字形，因此按 nav 分组取 Fluent 调色板的 **Foreground2** 档着色——
 * 既保留参考图的彩色观感，又让颜色携带「属于哪个分组」的信息。
 * 选 Foreground2 而不是 BorderActive / Background* 的理由：语义位就是「中性底上的彩色前景」，
 * 且明暗主题各有一档（Light 深色 / Dark 浅色），对比度由 token 保证。
 */
import type { Component } from 'vue'
import type { ComponentPalette } from '~/data/components-nav'

const props = defineProps<{
  /** 目标路由（组件文档页 `/components/{slug}`） */
  to: string
  /** 卡片标题（组件名） */
  name: string
  /** 一句话摘要 */
  summary: string
  /** 卡片图标组件（24px 字形，按 32px 渲染） */
  icon: Component
  /** 图标配色家族（来自 nav 分组） */
  palette: ComponentPalette
}>()

/** 图标渲染尺寸：与 WinUI 模板的 `Image Width="32"` 一致（1× / 2× 均可整像素缩放）。 */
const ICON_SIZE = 32

/** 调色板家族 → Fluent 彩色前景 token（显式列出，不做字符串拼接）。 */
const PALETTE_FOREGROUND: Record<ComponentPalette, string> = {
  blue: 'var(--colorPaletteBlueForeground2)',
  purple: 'var(--colorPalettePurpleForeground2)',
  plum: 'var(--colorPalettePlumForeground2)',
  teal: 'var(--colorPaletteTealForeground2)',
  marigold: 'var(--colorPaletteMarigoldForeground2)',
}

const iconColor = computed(() => PALETTE_FOREGROUND[props.palette])
</script>

<template>
  <!-- 整张卡片就是一个链接：命中区 = 可见面，不需要额外的“查看更多”入口 -->
  <NuxtLink
    :to="to"
    class="docs-component-card"
  >
    <component
      :is="icon"
      :size="ICON_SIZE"
      class="docs-component-card__icon"
      :style="{ color: iconColor }"
    />
    <span class="docs-component-card__body">
      <span class="docs-component-card__title">{{ name }}</span>
      <span class="docs-component-card__summary">{{ summary }}</span>
    </span>
  </NuxtLink>
</template>

<style scoped>
.docs-component-card {
  display: flex;
  gap: var(
    --spacingHorizontalL
  ); /* 图标盒与文字之间 16：Image Margin 右 16（ColumnSpacing 不再叠加） */
  align-items: flex-start;
  width: 100%;
  height: 120px; /* NarrowLayout：Height 120 / Width Auto（拉伸） */
  padding: var(--spacingHorizontalS); /* 模板 Padding 8 */
  overflow: hidden;
  border: var(--strokeWidthThin) solid var(--colorNeutralStrokeAlpha); /* CardStrokeColorDefaultBrush */
  border-radius: var(--borderRadiusXLarge); /* OverlayCornerRadius 8 */
  background-color: var(--colorNeutralBackground1); /* ControlFillColorDefaultBrush */
  transition-property: background-color;
  transition-duration: var(--durationFaster);
  transition-timing-function: var(--curveEasyEase);
}

/* WideLayout（Breakpoint640Plus = 640px = Uno 的 sm 断点 40rem）：恢复模板的固定尺寸 */
@media (min-width: 40rem) {
  .docs-component-card {
    width: 300px;
    height: 96px;
  }
}

/* GridViewItem 的指针态：PointerOver / Pressed 背景 */
.docs-component-card:hover {
  background-color: var(--colorSubtleBackgroundHover);
}
.docs-component-card:active {
  background-color: var(--colorSubtleBackgroundPressed);
}
.docs-component-card:focus-visible {
  outline: var(--strokeWidthThick) solid var(--colorCompoundBrandStroke);
  outline-offset: 2px;
}

/* Image Margin 8,12,16,0：右侧 16 由 flex gap 承担，这里只给左上 */
.docs-component-card__icon {
  flex: none;
  margin: var(--spacingVerticalM) 0 0 var(--spacingHorizontalS);
}

.docs-component-card__body {
  display: flex;
  flex-direction: column;
  min-width: 0; /* 允许标题在 226px 文本列内收缩并出省略号 */
  padding-top: var(--spacingVerticalM); /* Title Margin 0,12,0,0 */
}

.docs-component-card__title {
  overflow: hidden;
  font-size: var(--fontSizeBase300); /* BodyStrong 14 */
  line-height: var(--lineHeightBase300); /* 20 */
  font-weight: var(--fontWeightSemibold);
  color: var(--colorNeutralForeground1);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.docs-component-card__summary {
  display: -webkit-box;
  overflow: hidden;
  /* 摘要按卡片可用高度裁行并补省略号（XAML 侧是固定 Height + TextTrimming）：
     120 − 2（描边）− 16（内边距）− 32（标题行） = 70px → 4 行；
     96  − 2 − 16 − 32 = 46px → 2 行（见下方断点）。 */
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  font-size: var(--fontSizeBase200); /* Caption 12 */
  line-height: var(--lineHeightBase200); /* 16 */
  color: var(--colorNeutralForeground3);
}

@media (min-width: 40rem) {
  .docs-component-card__summary {
    -webkit-line-clamp: 2;
  }
}
</style>
