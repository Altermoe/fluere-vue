<script setup lang="ts">
import {
  FluentIconDocument24Regular,
  FluentIconFolder24Regular,
  FluentIconImage24Regular,
  FluentIconMusicNote224Regular,
  FluentIconStar24Regular,
} from '@fluere-vue/icons'
import {
  FLUERE_NAVIGATION_SETTINGS_VALUE,
  FluereNavigationView,
  FluereNavigationViewItem,
  FluereNavigationViewItemHeader,
} from '@fluere-vue/ui'
import type { Component } from 'vue'
import { computed, ref } from 'vue'

/**
 * 基础形态：可折叠面板 + 分组标题 + 选中指示条 + 内置设置项。
 *
 * 面板宽度按 WinUI `Auto` 档随容器宽度自适应（阈值 1008 / 641，见文档页《DisplayMode》）；
 * 也可以显式给 `pane-display-mode` 锁一档。这里给窗口一个固定宽度，方便在文档页里观察。
 */
const { t, tm } = useDocsI18n()

const icons: Record<string, Component> = {
  home: FluentIconStar24Regular,
  documents: FluentIconDocument24Regular,
  pictures: FluentIconImage24Regular,
  music: FluentIconMusicNote224Regular,
  downloads: FluentIconFolder24Regular,
}

const sections = computed(() =>
  tm('demos.navigation-view.basic.sections').map((section) => ({
    title: section.title,
    items: section.items.map((item) => ({
      value: item.value,
      content: item.content,
      icon: icons[item.value],
    })),
  })),
)

const selected = ref<string | number | undefined>('home')

/**
 * 展示用的选中项名。
 *
 * ⚠️ 选中内置设置项时 `selectedValue` 是**保留哨兵值**（`__fluere_navigation_settings__`），
 * 直接插值会把哨兵打印到页面上 —— 这里映射成「设置」文案。这也是给消费方的示范：
 * 拿到哨兵要做一次判定，别把它当普通 `value` 用。
 */
const labelByValue: Record<string, string> = {}
for (const section of sections.value) {
  for (const item of section.items) {
    labelByValue[String(item.value)] = item.content
  }
}
const selectedLabel = computed(() =>
  selected.value === FLUERE_NAVIGATION_SETTINGS_VALUE
    ? t('demos.navigation-view.basic.settingsLabel')
    : (labelByValue[String(selected.value ?? '')] ?? ''),
)
</script>

<template>
  <div
    class="w-full max-w-[720px] overflow-hidden rounded-fluent-xl border border-colorNeutralStroke2"
  >
    <FluereNavigationView
      v-model:selected-value="selected"
      :label="t('demos.navigation-view.basic.label')"
      pane-title="Explorer"
      class="h-[320px]"
      pane-display-mode="left"
      :default-is-pane-open="true"
    >
      <template
        v-for="section in sections"
        :key="section.title"
      >
        <FluereNavigationViewItemHeader :content="section.title" />
        <FluereNavigationViewItem
          v-for="item in section.items"
          :key="item.value"
          :value="item.value"
          :content="item.content"
        >
          <template #icon>
            <component
              :is="item.icon"
              :size="20"
            />
          </template>
        </FluereNavigationViewItem>
      </template>

      <template #content>
        <div class="p-fluent-l text-sm text-colorNeutralForeground2">
          {{ t('demos.navigation-view.basic.body', { value: selectedLabel }) }}
        </div>
      </template>
    </FluereNavigationView>
  </div>
</template>
