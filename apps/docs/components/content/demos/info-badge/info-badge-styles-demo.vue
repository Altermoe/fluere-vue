<script setup lang="ts">
import { FluereCombobox, FluereInfoBadge } from '@fluere-vue/ui'
import type { FluereInfoBadgeSeverity } from '@fluere-vue/ui'
import { computed, ref } from 'vue'

/**
 * 对齐 Gallery 示例 2「Different InfoBadge Styles」：
 * 每一档 Style 都有 Dot / Value / Icon 三个变体，右侧 `Styles` ComboBox 切换
 * Attention / Informational / Success / Critical（Gallery 的下拉里没有 Caution，
 * 本库把五档都列出来）。
 *
 * Gallery 用 `Style="{StaticResource AttentionIconInfoBadgeStyle}"` 这类 XAML Style 选档，
 * 本库对应 `severity`（底色）+ `icon`（是否采用该档预置的 IconSource 字形）两个 Prop：
 *   `*DotInfoBadgeStyle`   → `severity="…"`
 *   `*ValueInfoBadgeStyle` → `severity="…" :value="10"`
 *   `*IconInfoBadgeStyle`  → `severity="…" icon`
 */
const SEVERITY_LABELS: Record<FluereInfoBadgeSeverity, string> = {
  accent: 'Accent',
  attention: 'Attention',
  informational: 'Informational',
  success: 'Success',
  caution: 'Caution',
  critical: 'Critical',
}

/** 五档有 `*IconInfoBadgeStyle` 预置字形的 Severity（`accent` 没有对应的 Icon 变体） */
const SELECTABLE: FluereInfoBadgeSeverity[] = [
  'attention',
  'informational',
  'success',
  'caution',
  'critical',
]

const items = SELECTABLE.map((value) => ({ value, text: SEVERITY_LABELS[value] }))

const severity = ref<FluereInfoBadgeSeverity>('attention')
const badgeValue = 10

const currentLabel = computed(() => SEVERITY_LABELS[severity.value])
</script>

<template>
  <div class="flex flex-wrap gap-fluent-xl items-start">
    <div class="flex flex-col gap-fluent-l flex-1 min-w-0">
      <div class="ib-styles-demo__row">
        <FluereInfoBadge
          :severity="severity"
          icon
        />
        <FluereInfoBadge
          :severity="severity"
          :value="badgeValue"
        />
        <FluereInfoBadge :severity="severity" />
      </div>

      <div>
        <p class="text-sm text-colorNeutralForeground2 mb-fluent-xs">
          {{ currentLabel }} · Dot / Value / Icon
        </p>
        <ul class="ib-styles-demo__all">
          <li
            v-for="name in SELECTABLE"
            :key="name"
            class="ib-styles-demo__all-item"
          >
            <FluereInfoBadge :severity="name" />
            <FluereInfoBadge
              :severity="name"
              :value="badgeValue"
            />
            <FluereInfoBadge
              :severity="name"
              icon
            />
            <span class="text-sm text-colorNeutralForeground2">{{ SEVERITY_LABELS[name] }}</span>
          </li>
        </ul>
      </div>
    </div>

    <div class="ib-styles-demo__options">
      <FluereCombobox
        v-model="severity"
        header="Styles"
        :items="items"
      />
    </div>
  </div>
</template>

<style scoped>
.ib-styles-demo__row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacingHorizontalXL);
  min-block-size: 72px;
  background-color: var(--colorNeutralBackground2);
  border-radius: var(--borderRadiusMedium);
}

.ib-styles-demo__all {
  display: flex;
  flex-direction: column;
  gap: var(--spacingVerticalMNudge);
  margin: 0;
  padding: 0;
  list-style: none;
}

.ib-styles-demo__all-item {
  display: flex;
  align-items: center;
  gap: var(--spacingHorizontalM);
}

.ib-styles-demo__all-item > :last-child {
  margin-inline-start: var(--spacingHorizontalS);
}

.ib-styles-demo__options {
  flex: 0 0 200px;
}
</style>
