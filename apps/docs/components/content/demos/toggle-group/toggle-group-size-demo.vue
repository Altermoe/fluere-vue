<script setup lang="ts">
import { FluereToggleGroup, FluereToggleGroupItem } from '@fluere-vue/ui'
import { computed, ref } from 'vue'

const { t, tm } = useDocsI18n()

/** 三档尺寸的可见文案与三个取值（数组叶子：demos.toggle-group.size.rangeItems） */
const rangeTexts = computed(() => tm('demos.toggle-group.size.rangeItems'))
const sizeLabels = computed(() => [
  t('demos.toggle-group.size.smallLabel'),
  t('demos.toggle-group.size.mediumLabel'),
  t('demos.toggle-group.size.largeLabel'),
])

/** 小：不传 modelValue（非受控，底座自管，default-value 给初值） */
/** 中：受控（v-model） */
const medium = ref<string | undefined>('week')
/** 大：纵向组 + 受控 */
const large = ref<string | undefined>('month')
</script>

<template>
  <div class="flex flex-col gap-fluent-l">
    <div class="flex flex-col gap-fluent-s">
      <p class="text-sm text-colorNeutralForeground2">{{ sizeLabels[0] }}</p>
      <FluereToggleGroup
        size="small"
        default-value="day"
      >
        <FluereToggleGroupItem value="day">{{ rangeTexts[0] }}</FluereToggleGroupItem>
        <FluereToggleGroupItem value="week">{{ rangeTexts[1] }}</FluereToggleGroupItem>
        <FluereToggleGroupItem value="month">{{ rangeTexts[2] }}</FluereToggleGroupItem>
      </FluereToggleGroup>
    </div>

    <div class="flex flex-col gap-fluent-s">
      <p class="text-sm text-colorNeutralForeground2">{{ sizeLabels[1] }}</p>
      <FluereToggleGroup v-model="medium">
        <FluereToggleGroupItem value="day">{{ rangeTexts[0] }}</FluereToggleGroupItem>
        <FluereToggleGroupItem value="week">{{ rangeTexts[1] }}</FluereToggleGroupItem>
        <FluereToggleGroupItem value="month">{{ rangeTexts[2] }}</FluereToggleGroupItem>
      </FluereToggleGroup>
    </div>

    <div class="flex flex-col gap-fluent-s">
      <p class="text-sm text-colorNeutralForeground2">{{ sizeLabels[2] }}</p>
      <FluereToggleGroup
        v-model="large"
        size="large"
        orientation="vertical"
      >
        <FluereToggleGroupItem value="day">{{ rangeTexts[0] }}</FluereToggleGroupItem>
        <FluereToggleGroupItem value="week">{{ rangeTexts[1] }}</FluereToggleGroupItem>
        <FluereToggleGroupItem value="month">{{ rangeTexts[2] }}</FluereToggleGroupItem>
      </FluereToggleGroup>
    </div>
  </div>
</template>
