<script setup lang="ts">
import { FluereText } from '@fluere-vue/ui'

/**
 * `as` / `align` / `truncate` / `--fui-text-foreground` 四项 Web 化能力的演示。
 *
 * - `as`：只改标签不改视觉（`titleLarge` + h1、`subtitle` + h2、`body` + p、`caption` + span）；
 * - `align`：对应 `TextBlock.TextAlignment`（start / center / end / justify）；
 * - `truncate`：`TextTrimming=CharacterEllipsis` 的单行映射，需外部容器约束宽度才会出现省略号
 *   （与 XAML 里 TextBlock 需要被约束才触发 trimming 的前提一致）；
 * - 前景覆盖：`TextFillColorSecondary`（`#9E000000`，白底合成 `#616161`）对应
 *   `colorNeutralForeground3`，按组件口径用局部变量覆盖，不新增 Prop。
 */
const { t } = useDocsI18n()
</script>

<template>
  <div class="text-usage">
    <section class="text-usage__section">
      <FluereText
        class="text-usage__label"
        variant="caption"
      >
        {{ t('demos.text.usage.asLabel') }}
      </FluereText>
      <div class="text-usage__stack">
        <FluereText
          as="h1"
          variant="titleLarge"
        >
          {{ t('demos.text.usage.asTitle') }}
        </FluereText>
        <FluereText
          as="h2"
          variant="subtitle"
        >
          {{ t('demos.text.usage.asSection') }}
        </FluereText>
        <FluereText
          as="p"
          variant="body"
        >
          {{ t('demos.text.usage.asBody') }}
        </FluereText>
        <FluereText
          as="span"
          variant="caption"
        >
          {{ t('demos.text.usage.asCaption') }}
        </FluereText>
      </div>
    </section>

    <section class="text-usage__section">
      <FluereText
        class="text-usage__label"
        variant="caption"
      >
        {{ t('demos.text.usage.alignLabel') }}
      </FluereText>
      <div class="text-usage__panel">
        <FluereText
          as="p"
          align="start"
        >
          {{ t('demos.text.usage.alignStart') }}
        </FluereText>
        <FluereText
          as="p"
          align="center"
        >
          {{ t('demos.text.usage.alignCenter') }}
        </FluereText>
        <FluereText
          as="p"
          align="end"
        >
          {{ t('demos.text.usage.alignEnd') }}
        </FluereText>
        <FluereText
          as="p"
          align="justify"
        >
          {{ t('demos.text.usage.alignJustify') }}
        </FluereText>
      </div>
    </section>

    <section class="text-usage__section">
      <FluereText
        class="text-usage__label"
        variant="caption"
      >
        {{ t('demos.text.usage.truncateLabel') }}
      </FluereText>
      <div class="text-usage__panel">
        <div
          class="max-w-sm"
          data-truncate-container
        >
          <FluereText truncate>
            {{ t('demos.text.usage.truncateSample') }}
          </FluereText>
        </div>
        <FluereText
          as="p"
          variant="caption"
        >
          {{ t('demos.text.usage.truncateHint') }}
        </FluereText>
      </div>
    </section>

    <section class="text-usage__section">
      <FluereText
        class="text-usage__label"
        variant="caption"
      >
        {{ t('demos.text.usage.foregroundLabel') }}
      </FluereText>
      <div class="text-usage__panel">
        <FluereText as="p">
          {{ t('demos.text.usage.foregroundPrimary') }}
        </FluereText>
        <FluereText
          as="p"
          class="text-usage__secondary"
        >
          {{ t('demos.text.usage.foregroundSecondary') }}
        </FluereText>
      </div>
    </section>
  </div>
</template>

<style scoped>
.text-usage {
  display: flex;
  flex-direction: column;
  gap: var(--spacingVerticalXL);
}

.text-usage__section {
  display: flex;
  flex-direction: column;
  gap: var(--spacingVerticalS);
}

/* 节标题是辅助说明：caption 档 + TextFillColorSecondary 对应的次级前景 */
.text-usage__label {
  --fui-text-foreground: var(--colorNeutralForeground3);
}

.text-usage__stack {
  display: flex;
  flex-direction: column;
  gap: var(--spacingVerticalS);
}

/* 对齐 / 截断 / 前景示例的底衬，只用于显出文本盒的宽度与对齐效果 */
.text-usage__panel {
  display: flex;
  flex-direction: column;
  gap: var(--spacingVerticalS);
  padding: var(--spacingVerticalM) var(--spacingHorizontalL);
  background-color: var(--colorNeutralBackground2);
  border-radius: var(--borderRadiusMedium);
}

/* 次级前景覆盖：TextFillColorSecondary → colorNeutralForeground3 */
.text-usage__secondary {
  --fui-text-foreground: var(--colorNeutralForeground3);
}
</style>
