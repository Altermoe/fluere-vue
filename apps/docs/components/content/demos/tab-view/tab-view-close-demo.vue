<script setup lang="ts">
import { FluereTabView, FluereTabViewItem } from '@fluere-vue/ui'
import type { FluereTabViewTabCloseRequestedEventArgs } from '@fluere-vue/ui'
import { computed, ref } from 'vue'

/**
 * 可关闭 + 新建：**数据由消费方管理**。
 *
 * 关闭按钮只抛 `tabCloseRequested`、新建按钮只抛 `addTabButtonClick`，
 * 组件本身不增删 tab（照抄 WinUI `TabView` 只抛 `TabCloseRequested` 的语义）。
 * 这里在事件里改自己的列表；删掉当前选中项时，组件会按 `OnItemsChanged`
 * 的规则自动迁移选中（向后环形找第一个可用项）。
 *
 * 列表存的是稳定 id、标题用 i18n 数组推导（切换语言时标题跟着变，`:key` 不变）。
 */
const { t, tm } = useDocsI18n()

const INITIAL_IDS = ['overview', 'details', 'settings'] as const
const initialTitles = computed(() => tm('demos.tab-view.close.tabs'))

const openIds = ref<string[]>([...INITIAL_IDS])
const selected = ref(0)
const log = ref('')

const titleOf = (id: string, index: number): string => {
  const knownIndex = INITIAL_IDS.indexOf(id as (typeof INITIAL_IDS)[number])
  if (knownIndex !== -1) {
    return initialTitles.value[knownIndex] ?? id
  }
  return `${initialTitles.value[0] ?? ''} ${index + 1}`
}

const onCloseRequested = (args: FluereTabViewTabCloseRequestedEventArgs): void => {
  openIds.value = openIds.value.filter((_, index) => index !== args.index)
  log.value = t('demos.tab-view.close.eventClose', { header: args.header })
}

const onAddClick = (): void => {
  let index = openIds.value.length
  let id = `extra-${index}`
  while (openIds.value.includes(id)) {
    index += 1
    id = `extra-${index}`
  }
  openIds.value = [...openIds.value, id]
  log.value = t('demos.tab-view.close.eventAdd')
}
</script>

<template>
  <div class="flex max-w-[720px] flex-col gap-fluent-s">
    <FluereTabView
      v-model:selected-index="selected"
      :label="t('demos.tab-view.close.label')"
      class="h-[200px] overflow-hidden rounded-fluent-xl border border-colorNeutralStroke2 bg-colorNeutralBackground1/60"
      @tab-close-requested="onCloseRequested"
      @add-tab-button-click="onAddClick"
    >
      <FluereTabViewItem
        v-for="(id, index) in openIds"
        :key="id"
        :header="titleOf(id, index)"
      >
        <div class="p-fluent-l text-sm text-colorNeutralForeground2">
          {{ t('demos.tab-view.basic.body', { index: index + 1 }) }}
        </div>
      </FluereTabViewItem>
    </FluereTabView>

    <span
      v-if="openIds.length === 0"
      class="text-xs text-colorNeutralForeground3"
      >{{ t('demos.tab-view.close.empty') }}</span
    >
    <span class="text-xs text-colorNeutralForeground3">
      {{ log === '' ? t('demos.tab-view.close.eventNone') : log }}
    </span>
    <span class="text-xs text-colorNeutralForeground3">{{ t('demos.tab-view.close.hint') }}</span>
  </div>
</template>
