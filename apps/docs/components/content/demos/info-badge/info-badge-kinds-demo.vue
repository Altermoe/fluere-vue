<script setup lang="ts">
import { FluentIconAdd16Filled } from '@fluere-vue/icons'
import { FluereInfoBadge } from '@fluere-vue/ui'

/**
 * 三种形态的最小对照（对齐 `InfoBadge.cpp#OnDisplayKindPropertiesChanged` 的三分支）：
 *   Dot    ← `Value = -1` 且没有 `IconSource`
 *   Value  ← `Value >= 0`（优先于图标）
 *   Icon   ← 有 `IconSource`（`icon` Prop 或 `#icon` 插槽）
 *
 * 后两个用自定义 `IconSource` / `#icon` 插槽；`MeasureOverride` 的「宽 < 高取正方形」
 * 让单个数字成为正圆，两位数则是圆角胶囊 —— 两个都列出来对照。
 */
const SINGLE_DIGIT = 5
const BADGE_VALUE = 10
</script>

<template>
  <div class="ib-kinds-demo">
    <figure>
      <FluereInfoBadge />
      <figcaption>Dot（无 value / 无 icon）</figcaption>
    </figure>

    <figure>
      <FluereInfoBadge :value="SINGLE_DIGIT" />
      <figcaption>Value（单个数字是正圆）</figcaption>
    </figure>

    <figure>
      <FluereInfoBadge :value="BADGE_VALUE" />
      <figcaption>Value（两位数变成胶囊）</figcaption>
    </figure>

    <figure>
      <FluereInfoBadge
        severity="success"
        icon
      />
      <figcaption>Icon（severity 内建字形）</figcaption>
    </figure>

    <figure>
      <FluereInfoBadge :icon="FluentIconAdd16Filled" />
      <figcaption>Icon（自定义 icon Prop）</figcaption>
    </figure>

    <figure>
      <FluereInfoBadge severity="attention">
        <template #icon>
          <FluentIconAdd16Filled />
        </template>
      </FluereInfoBadge>
      <figcaption>Icon（#icon 插槽，优先级最高）</figcaption>
    </figure>
  </div>
</template>

<style scoped>
.ib-kinds-demo {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: var(--spacingHorizontalXXL);
}

.ib-kinds-demo figure {
  /* 首行固定 24px 且居中：Dot（4px）与 Value / Icon（16px）才能落在同一条基线上 */
  display: grid;
  grid-template-rows: 24px auto;
  align-items: center;
  justify-items: center;
  gap: var(--spacingVerticalS);
  margin: 0;
}

.ib-kinds-demo figcaption {
  max-inline-size: 120px;
  text-align: center;
  font-size: var(--fontSizeBase200);
  color: var(--colorNeutralForeground3);
}
</style>
