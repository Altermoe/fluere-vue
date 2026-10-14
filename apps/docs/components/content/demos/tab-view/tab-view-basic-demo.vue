<script setup lang="ts">
import {
  FluentIconDocument24Regular,
  FluentIconImage24Regular,
  FluentIconStar24Regular,
} from '@fluere-vue/icons'
import { FluereTabView, FluereTabViewItem } from '@fluere-vue/ui'
import type { Component } from 'vue'
import { computed, ref } from 'vue'

/**
 * 基础形态：图标 + 文本 + 面板内容，`v-model:selected-index` 受控选中。
 *
 * 默认选中第 0 个（对齐 WinUI `TabView.SelectedIndex` 默认值 0）；
 * 非选中面板在切走后会被卸载 —— WinUI 也只有一个 `TabContentPresenter`。
 */
const { t, tm } = useDocsI18n()

const icons: Component[] = [
  FluentIconDocument24Regular,
  FluentIconImage24Regular,
  FluentIconStar24Regular,
]

const tabs = computed(() =>
  tm('demos.tab-view.basic.items').map((title, index) => ({
    title,
    icon: icons[index] ?? FluentIconDocument24Regular,
  })),
)

const selected = ref(0)
</script>

<template>
  <FluereTabView
    v-model:selected-index="selected"
    :label="t('demos.tab-view.basic.label')"
    class="h-[220px] max-w-[720px] overflow-hidden rounded-fluent-xl border border-colorNeutralStroke2 bg-colorNeutralBackground1/60"
  >
    <FluereTabViewItem
      v-for="(tab, index) in tabs"
      :key="tab.title"
      :header="tab.title"
    >
      <template #icon>
        <component
          :is="tab.icon"
          :size="16"
        />
      </template>
      <div class="p-fluent-l text-sm text-colorNeutralForeground2">
        {{ t('demos.tab-view.basic.body', { index: index + 1 }) }}
      </div>
    </FluereTabViewItem>
  </FluereTabView>
</template>
