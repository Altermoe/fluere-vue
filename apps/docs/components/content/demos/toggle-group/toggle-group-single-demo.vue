<script setup lang="ts">
import { FluereToggleGroup, FluereToggleGroupItem } from '@fluere-vue/ui'
import { computed, ref } from 'vue'

const { t, tm } = useDocsI18n()

/** 单选：v-model 是 string；组用「值 → 选中项」表达互斥 */
const values = ['left', 'center', 'right'] as const
const align = ref<string | undefined>('left')

/** 三个选项的可见文案（数组叶子：demos.toggle-group.single.items） */
const alignTexts = computed(() => tm('demos.toggle-group.single.items'))

/** 状态行：把取值换成可见文案；取消选中（undefined）时给一个「未选择」兜底 */
const currentLabel = computed(() => {
  const index = values.indexOf(align.value as (typeof values)[number])
  const name = index !== -1 ? alignTexts.value[index] : t('demos.toggle-group.single.emptyLabel')
  return t('demos.toggle-group.single.currentLabel', { align: name })
})
</script>

<template>
  <div class="flex max-w-sm flex-col gap-fluent-m">
    <FluereToggleGroup
      v-model="align"
      :label="t('demos.toggle-group.single.groupLabel')"
    >
      <FluereToggleGroupItem value="left">{{ alignTexts[0] }}</FluereToggleGroupItem>
      <FluereToggleGroupItem value="center">{{ alignTexts[1] }}</FluereToggleGroupItem>
      <FluereToggleGroupItem value="right">{{ alignTexts[2] }}</FluereToggleGroupItem>
    </FluereToggleGroup>
    <p class="text-sm text-colorNeutralForeground3">{{ currentLabel }}</p>
    <p class="text-sm text-colorNeutralForeground3">
      {{ t('demos.toggle-group.single.hint') }}
    </p>
  </div>
</template>
