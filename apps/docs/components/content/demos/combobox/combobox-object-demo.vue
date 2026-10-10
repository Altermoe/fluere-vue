<script setup lang="ts">
import type { FluereComboboxItem, FluereComboboxSelectionChangedEventArgs } from '@fluere-vue/ui'
import { FluereCombobox } from '@fluere-vue/ui'
import { computed, ref } from 'vue'

const { t, tm } = useDocsI18n()

interface City {
  id: number
  name: string
}

/** 对象项：用 `by` 指定项身份，`text` 决定显示与搜索文本 */
const cityNames = computed(() => tm('demos.combobox.object.cities'))
const CITIES = computed<City[]>(() =>
  cityNames.value.map((name, index) => ({ id: index + 1, name })),
)

/** 缺省选中上海（按名字找，避免下标字面量） */
const city = ref<City | null>(
  CITIES.value.find((item) => item.name === t('demos.combobox.object.defaultSelection')) ?? null,
)
const history = ref<string[]>([])
/** 选中项映射成组件要的选项数据（对象项 + 显示文本） */
const CITY_ITEMS = computed<FluereComboboxItem<City>[]>(() =>
  CITIES.value.map((item) => ({ value: item, text: item.name })),
)

const onSelectionChanged = (args: FluereComboboxSelectionChangedEventArgs<City>): void => {
  history.value = [
    ...history.value,
    t('demos.combobox.object.selectionNote', {
      added: args.addedItem?.name ?? 'null',
      addedIndex: args.addedIndex,
      removed: args.removedItem?.name ?? 'null',
      removedIndex: args.removedIndex,
    }),
  ]
}
</script>

<template>
  <div class="flex flex-col gap-fluent-l max-w-xs">
    <FluereCombobox
      v-model="city"
      :items="CITY_ITEMS"
      by="id"
      :header="t('demos.combobox.object.header')"
      @selection-changed="onSelectionChanged"
    />
    <ul class="text-sm text-colorNeutralForeground3 space-y-1">
      <li
        v-for="(entry, index) in history"
        :key="index"
      >
        {{ entry }}
      </li>
    </ul>
  </div>
</template>
