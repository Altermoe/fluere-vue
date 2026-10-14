<script setup lang="ts">
import {
  FluentIconDocument24Regular,
  FluentIconFolder24Regular,
  FluentIconStar24Regular,
} from '@fluere-vue/icons'
import {
  FluereRadioGroup,
  FluereRadioButton,
  FluereTabView,
  FluereTabViewItem,
} from '@fluere-vue/ui'
import type { FluereTabViewWidthMode } from '@fluere-vue/ui'
import type { Component } from 'vue'
import { computed, ref } from 'vue'

/**
 * 三种宽度模式的对照：
 *  - `equal`（缺省）：每个 tab 宽度 = `clamp(可用宽 / tab 数, 100, 240)`（代码测量，见组件注释）；
 *  - `size-to-content`：宽度由内容决定；
 *  - `compact`：同 `size-to-content`，但**未被选中**的 tab 折叠成只剩图标。
 */
const { t, tm } = useDocsI18n()

const icons: Component[] = [
  FluentIconDocument24Regular,
  FluentIconFolder24Regular,
  FluentIconStar24Regular,
]
const tabs = computed(() =>
  tm('demos.tab-view.widthMode.tabs').map((title, index) => ({
    title,
    icon: icons[index] ?? FluentIconDocument24Regular,
  })),
)

const modes: FluereTabViewWidthMode[] = ['equal', 'size-to-content', 'compact']
const mode = ref<FluereTabViewWidthMode>('equal')
const modeLabel = (value: FluereTabViewWidthMode): string => {
  const key: Record<FluereTabViewWidthMode, string> = {
    'equal': 'demos.tab-view.widthMode.equal',
    'size-to-content': 'demos.tab-view.widthMode.sizeToContent',
    'compact': 'demos.tab-view.widthMode.compact',
  }
  return t(key[value])
}
</script>

<template>
  <div class="flex max-w-[720px] flex-col gap-fluent-s">
    <FluereRadioGroup
      v-model="mode"
      :label="t('demos.tab-view.widthMode.label')"
      class="flex flex-wrap gap-fluent-l"
    >
      <FluereRadioButton
        v-for="value in modes"
        :key="value"
        :value="value"
        >{{ modeLabel(value) }}</FluereRadioButton
      >
    </FluereRadioGroup>

    <FluereTabView
      :default-selected-index="0"
      :tab-width-mode="mode"
      :label="t('demos.tab-view.widthMode.label')"
      class="h-[180px] overflow-hidden rounded-fluent-xl border border-colorNeutralStroke2 bg-colorNeutralBackground1/60"
    >
      <FluereTabViewItem
        v-for="tab in tabs"
        :key="tab.title"
        :header="tab.title"
      >
        <template #icon>
          <component
            :is="tab.icon"
            :size="16"
          />
        </template>
        <div class="p-fluent-l text-sm text-colorNeutralForeground2">{{ tab.title }}</div>
      </FluereTabViewItem>
    </FluereTabView>

    <span class="text-xs text-colorNeutralForeground3">{{
      t('demos.tab-view.widthMode.hint')
    }}</span>
  </div>
</template>
