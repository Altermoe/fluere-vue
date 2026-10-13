<script setup lang="ts">
import {
  FluentIconTextBold24Regular,
  FluentIconTextItalic24Regular,
  FluentIconTextUnderline24Regular,
} from '@fluere-vue/icons'
import { FluereToggleGroup, FluereToggleGroupItem } from '@fluere-vue/ui'
import { computed, ref } from 'vue'

const { t, tm } = useDocsI18n()

/** 多选：v-model 是 string[]，数组元素就是被按下的项 */
const formats = ref<string[]>(['bold'])

const formatTexts = computed(() => tm('demos.toggle-group.multiple.items'))

/**
 * 项是纯图标（无可见文本），可见文案只出现在状态行与 `label`（可访问名）里；
 * 图标与取值一一对应，所以这里按数组下标取文案。
 */
const items = computed(() => [
  { value: 'bold', label: formatTexts.value[0], icon: FluentIconTextBold24Regular },
  { value: 'italic', label: formatTexts.value[1], icon: FluentIconTextItalic24Regular },
  {
    value: 'underline',
    label: formatTexts.value[2],
    icon: FluentIconTextUnderline24Regular,
  },
])

const selectedLabel = computed(() => {
  const list = items.value
    .filter((item) => formats.value.includes(item.value))
    .map((item) => item.label)
    .join(', ')
  return list.length > 0
    ? t('demos.toggle-group.multiple.selectedLabel', { list })
    : t('demos.toggle-group.multiple.emptyLabel')
})
</script>

<template>
  <div class="flex max-w-sm flex-col gap-fluent-m">
    <FluereToggleGroup
      v-model="formats"
      type="multiple"
      :label="t('demos.toggle-group.multiple.groupLabel')"
    >
      <FluereToggleGroupItem
        v-for="item in items"
        :key="item.value"
        :value="item.value"
        :icon="item.icon"
        :label="item.label"
        icon-only
      />
    </FluereToggleGroup>
    <p class="text-sm text-colorNeutralForeground3">{{ selectedLabel }}</p>
  </div>
</template>
