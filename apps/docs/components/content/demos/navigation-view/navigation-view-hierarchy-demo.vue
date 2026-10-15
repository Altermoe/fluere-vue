<script setup lang="ts">
import {
  FluentIconFolder24Regular,
  FluentIconFolderOpen24Regular,
  FluentIconDocument24Regular,
  FluentIconImage24Regular,
} from '@fluere-vue/icons'
import {
  FLUERE_NAVIGATION_SETTINGS_VALUE,
  FluereNavigationView,
  FluereNavigationViewItem,
  FluereNavigationViewItemHeader,
  FluereNavigationViewItemSeparator,
} from '@fluere-vue/ui'
import { computed, ref } from 'vue'

/**
 * 分组与层级：`FluereNavigationViewItemHeader` 是分组标题（不可聚焦、对 AT 隐藏），
 * `FluereNavigationViewItemSeparator` 是分隔线，子项放进父项的 `#children` 插槽。
 *
 * 父项点击「既选中也切换展开」（上游 `OnNavigationViewItemInvoked:1067` 把选中与
 * 展开两件事都做了，不是二选一）。折叠父项时子项不渲染；选中子项时父项拿到
 * `is-child-selected`，选中指示条下钻到子项（上游 `FindLowestLevelContainerToDisplaySelectionIndicator`）。
 */
const { t, tm } = useDocsI18n()

const labels = computed(() => tm('demos.navigation-view.hierarchy.labels'))
const selected = ref<string | number | undefined>('albums')

/**
 * `value → 展示名`（setup 期建表）。
 *
 * ⚠️ 选中内置设置项时 `selectedValue` 是**保留哨兵值**，直接插值会把哨兵打印到页面上；
 * 这里统一映射成展示名 —— 消费方拿到哨兵应做一次判定（见基础示例的同一处理）。
 */
const labelByValue: Record<string, string> = {
  library: labels.value[1] ?? '',
  music: labels.value[2] ?? '',
  albums: labels.value[3] ?? '',
  artists: labels.value[4] ?? '',
}
const selectedLabel = computed(
  () =>
    (selected.value === FLUERE_NAVIGATION_SETTINGS_VALUE
      ? t('demos.navigation-view.basic.settingsLabel')
      : labelByValue[String(selected.value ?? '')]) ?? '',
)
</script>

<template>
  <div
    class="w-full max-w-[720px] overflow-hidden rounded-fluent-xl border border-colorNeutralStroke2"
  >
    <FluereNavigationView
      v-model:selected-value="selected"
      :label="t('demos.navigation-view.hierarchy.label')"
      pane-display-mode="left"
      :default-is-pane-open="true"
      class="h-[320px]"
    >
      <FluereNavigationViewItemHeader :content="labels[0] ?? ''" />
      <FluereNavigationViewItem
        value="library"
        :content="labels[1] ?? ''"
      >
        <template #icon><FluentIconFolder24Regular :size="20" /></template>
      </FluereNavigationViewItem>

      <FluereNavigationViewItemSeparator />

      <FluereNavigationViewItem
        value="music"
        :content="labels[2] ?? ''"
        default-is-expanded
      >
        <template #icon><FluentIconFolderOpen24Regular :size="20" /></template>
        <template #children>
          <FluereNavigationViewItem
            value="albums"
            :content="labels[3] ?? ''"
          >
            <template #icon><FluentIconImage24Regular :size="20" /></template>
          </FluereNavigationViewItem>
          <FluereNavigationViewItem
            value="artists"
            :content="labels[4] ?? ''"
          >
            <template #icon><FluentIconDocument24Regular :size="20" /></template>
          </FluereNavigationViewItem>
        </template>
      </FluereNavigationViewItem>

      <template #content>
        <div class="p-fluent-l text-sm text-colorNeutralForeground2">
          {{ t('demos.navigation-view.hierarchy.body', { value: selectedLabel }) }}
        </div>
      </template>
    </FluereNavigationView>
  </div>
</template>
