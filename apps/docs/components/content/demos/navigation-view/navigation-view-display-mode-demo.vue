<script setup lang="ts">
import {
  FluentIconDocument24Regular,
  FluentIconImage24Regular,
  FluentIconStar24Regular,
} from '@fluere-vue/icons'
import {
  FluereNavigationView,
  FluereNavigationViewItem,
  FluereRadioGroup,
  FluereRadioButton,
} from '@fluere-vue/ui'
import type { FluereNavigationPaneDisplayMode } from '@fluere-vue/ui'
import { computed, ref } from 'vue'

/**
 * DisplayMode 三档：`pane-display-mode` 对齐 WinUI `NavigationViewPaneDisplayMode`。
 *
 * · `auto`（缺省）：按容器宽度自适应 —— `>= 1008` Expanded、`0 < 宽 < 641` Minimal、
 *   其余（含 0）Compact（判据 `NavigationView.cpp:1452-1465`）。本库把 Minimal
 *   **降级为 Compact**（浮层焦点管理属 0.5.7），见文档页《与 WinUI 的差异》。
 * · `left` / `left-compact` / `left-minimal`：锁定一档，不再随宽度变。
 *
 * 拖动容器右下角或改窗口宽度即可看到 Auto 档切换；三档的差别是面板宽（320 / 48）
 * 与「紧凑且关闭时只留图标」。
 */
const { t, tm } = useDocsI18n()

const mode = ref<FluereNavigationPaneDisplayMode>('auto')
const labels = computed(() => tm('demos.navigation-view.display-mode.labels'))
const selected = ref<string | number | undefined>('a')

const modes: FluereNavigationPaneDisplayMode[] = ['auto', 'left', 'left-compact']
</script>

<template>
  <div class="flex w-full max-w-[720px] flex-col gap-fluent-s">
    <FluereRadioGroup v-model="mode">
      <FluereRadioButton
        v-for="(item, index) in modes"
        :key="item"
        :value="item"
      >
        {{ labels[index] ?? item }}
      </FluereRadioButton>
    </FluereRadioGroup>

    <div
      class="resize-x overflow-hidden rounded-fluent-xl border border-colorNeutralStroke2"
      style="width: 100%; min-width: 240px; max-width: 100%"
    >
      <FluereNavigationView
        v-model:selected-value="selected"
        :label="t('demos.navigation-view.display-mode.label')"
        :pane-display-mode="mode"
        pane-title="Nav"
        class="h-[280px]"
      >
        <FluereNavigationViewItem
          value="a"
          :content="labels[3] ?? ''"
        >
          <template #icon><FluentIconStar24Regular :size="20" /></template>
        </FluereNavigationViewItem>
        <FluereNavigationViewItem
          value="b"
          :content="labels[4] ?? ''"
        >
          <template #icon><FluentIconDocument24Regular :size="20" /></template>
        </FluereNavigationViewItem>
        <FluereNavigationViewItem
          value="c"
          :content="labels[5] ?? ''"
        >
          <template #icon><FluentIconImage24Regular :size="20" /></template>
        </FluereNavigationViewItem>

        <template #content>
          <div class="p-fluent-l text-sm text-colorNeutralForeground2">
            {{ t('demos.navigation-view.display-mode.body') }}
          </div>
        </template>
      </FluereNavigationView>
    </div>

    <span class="text-xs text-colorNeutralForeground3">
      {{ t('demos.navigation-view.display-mode.hint') }}
    </span>
  </div>
</template>
