<script setup lang="ts">
import { FluereText } from '@fluere-vue/ui'
import type { FluereTextVariant } from '@fluere-vue/ui'

/**
 * 复刻 WinUI3 Gallery v2.9.3 `WinUIGallery/Samples/Typography/TypographyPage.xaml`
 * 的 type ramp 列表：九个 `TypographyControl` 各占一行，列为
 * Example / Variable Font / SizeLineHeight / Style。
 *
 * 规格来源见 `packages/ui/src/text/text.vue` 文件头：
 * - A 级：`microsoft-ui-xaml` tag winui3/release/2.5.1 `CommonStyles/TextBlock_themeresources.xaml`
 *   （与 winui3/release/2.0.1 逐字节一致，后者即 Gallery v2.9.3 所用 WASDK）；
 * - 行高：Gallery `TypographyPage.xaml` 的 `SizeLineHeight` 字符串（XAML 里没有 `LineHeight` Setter）。
 *
 * 样本与所有标签都用 `FluereText` 渲染；表头按参考图用 caption 档 + 次级前景
 * （`TextFillColorSecondary` → `colorNeutralForeground3`，通过局部变量覆盖）。
 * 行 / 列的数据是语言无关的技术名词，不随语种变化；只有表头文案走 i18n。
 */
interface RampRow {
  /** 该行样本使用的文本档位 */
  variant: FluereTextVariant
  /** Example 列：档位名称，按该档自身样式渲染 */
  example: string
  /** Variable Font 列：WinUI 文档里的字体 / 字重描述 */
  font: string
  /** Size / Line height 列：文档化的 effective size / line height */
  size: string
  /** Style 列：对应的 WinUI `*TextBlockStyle` 静态资源 */
  style: string
}

const rows: RampRow[] = [
  {
    variant: 'caption',
    example: 'Caption',
    font: 'Small, Regular',
    size: '12/16 epx',
    style: 'CaptionTextBlockStyle',
  },
  {
    variant: 'body',
    example: 'Body',
    font: 'Text, Regular',
    size: '14/20 epx',
    style: 'BodyTextBlockStyle',
  },
  {
    variant: 'bodyStrong',
    example: 'Body Strong',
    font: 'Text, SemiBold',
    size: '14/20 epx',
    style: 'BodyStrongTextBlockStyle',
  },
  {
    variant: 'bodyLarge',
    example: 'Body Large',
    font: 'Text, Regular',
    size: '18/24 epx',
    style: 'BodyLargeTextBlockStyle',
  },
  {
    variant: 'bodyLargeStrong',
    example: 'Body Large Strong',
    font: 'Text, SemiBold',
    size: '18/24 epx',
    style: 'BodyLargeStrongTextBlockStyle',
  },
  {
    variant: 'subtitle',
    example: 'Subtitle',
    font: 'Display, SemiBold',
    size: '20/28 epx',
    style: 'SubtitleTextBlockStyle',
  },
  {
    variant: 'title',
    example: 'Title',
    font: 'Display, SemiBold',
    size: '28/36 epx',
    style: 'TitleTextBlockStyle',
  },
  {
    variant: 'titleLarge',
    example: 'Title Large',
    font: 'Display, SemiBold',
    size: '40/52 epx',
    style: 'TitleLargeTextBlockStyle',
  },
  {
    variant: 'display',
    example: 'Display',
    font: 'Display, SemiBold',
    size: '68/92 epx',
    style: 'DisplayTextBlockStyle',
  },
]

const { t } = useDocsI18n()
</script>

<template>
  <div
    class="text-ramp"
    role="table"
    :aria-label="t('demos.text.ramp.ariaLabel')"
  >
    <div
      class="text-ramp__row text-ramp__row--header"
      role="row"
    >
      <FluereText
        class="text-ramp__cell"
        variant="caption"
        role="columnheader"
      >
        {{ t('demos.text.ramp.columnExample') }}
      </FluereText>
      <FluereText
        class="text-ramp__cell"
        variant="caption"
        role="columnheader"
      >
        {{ t('demos.text.ramp.columnFont') }}
      </FluereText>
      <FluereText
        class="text-ramp__cell"
        variant="caption"
        role="columnheader"
      >
        {{ t('demos.text.ramp.columnSize') }}
      </FluereText>
      <FluereText
        class="text-ramp__cell"
        variant="caption"
        role="columnheader"
      >
        {{ t('demos.text.ramp.columnStyle') }}
      </FluereText>
    </div>

    <div
      v-for="(row, index) in rows"
      :key="row.variant"
      class="text-ramp__row"
      :class="{ 'text-ramp__row--card': index % 2 === 0 }"
      role="row"
    >
      <div
        class="text-ramp__cell"
        role="cell"
      >
        <FluereText :variant="row.variant">{{ row.example }}</FluereText>
      </div>
      <div
        class="text-ramp__cell"
        role="cell"
      >
        <FluereText variant="body">{{ row.font }}</FluereText>
      </div>
      <div
        class="text-ramp__cell"
        role="cell"
      >
        <FluereText variant="body">{{ row.size }}</FluereText>
      </div>
      <div
        class="text-ramp__cell"
        role="cell"
      >
        <FluereText variant="body">{{ row.style }}</FluereText>
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
 * 复刻参考图的列表形态：灰色底衬 + 表头 + 隔行卡片。
 * 列宽用比例（fr）而不是固定像素（第一列约 40%，保证 68px 的 Display 不越界），
 * 间距取 Fluent 间距 token；颜色只引用 token，不写硬编码色值（含表头的次级前景覆盖）。
 */
.text-ramp {
  display: flex;
  flex-direction: column;
  gap: var(--spacingVerticalXS);
  padding: var(--spacingVerticalS) var(--spacingHorizontalS);
  background-color: var(--colorNeutralBackground2);
  border-radius: var(--borderRadiusMedium);
}

.text-ramp__row {
  display: grid;
  /* 四列约 40% / 18% / 18% / 24%：第一列留足 68px Display 的宽度（846px 预览下仍有余量） */
  grid-template-columns: minmax(0, 2.2fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.3fr);
  align-items: center;
  gap: var(--spacingHorizontalL);
  padding: var(--spacingVerticalS) var(--spacingHorizontalL);
  border-radius: var(--borderRadiusMedium);
}

/* 表头：caption 档 + TextFillColorSecondary 对应的次级前景（#616161 = colorNeutralForeground3） */
.text-ramp__row--header {
  --fui-text-foreground: var(--colorNeutralForeground3);
  border-radius: 0;
  border-block-end: 1px solid var(--colorNeutralStroke1);
}

/* 隔行卡片：偶数行（Caption / Body Strong / Body Large Strong / Title / Display）为卡片面，
   奇数行露出根节点的灰底；明暗主题下两个 token 自动翻转。 */
.text-ramp__row--card {
  background-color: var(--colorNeutralBackground1);
}

.text-ramp__cell {
  min-inline-size: 0;
}
</style>
