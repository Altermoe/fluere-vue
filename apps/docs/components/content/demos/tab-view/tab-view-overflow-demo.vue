<script setup lang="ts">
import { FluereTabView, FluereTabViewItem } from '@fluere-vue/ui'
import { computed } from 'vue'

/**
 * 溢出滚动：把 tab 条放进一个固定宽度（480px）的容器里，
 * 放不下时两侧出现滚动按钮（步长 50px，贴左 / 贴右时各自禁用）。
 *
 * 这两个按钮不进 Tab 序、对读屏隐藏（`aria-hidden` + `tabindex="-1"`），
 * 与 WinUI 把 `AutomationProperties.AccessibilityView` 设为 `Raw` 的做法一致。
 */
const { t } = useDocsI18n()

const count = 10
const titles = computed(() =>
  Array.from({ length: count }, (_, index) =>
    t('demos.tab-view.overflow.prefix', { index: index + 1 }),
  ),
)
</script>

<template>
  <div class="flex max-w-[720px] flex-col gap-fluent-s">
    <div
      class="w-[480px] max-w-full overflow-hidden rounded-fluent-xl border border-colorNeutralStroke2 bg-colorNeutralBackground1/60"
    >
      <FluereTabView
        :default-selected-index="0"
        :label="t('demos.tab-view.overflow.label')"
      >
        <FluereTabViewItem
          v-for="(title, index) in titles"
          :key="title"
          :header="title"
        >
          <div class="p-fluent-l text-sm text-colorNeutralForeground2">
            {{ t('demos.tab-view.basic.body', { index: index + 1 }) }}
          </div>
        </FluereTabViewItem>
      </FluereTabView>
    </div>
    <span class="text-xs text-colorNeutralForeground3">{{
      t('demos.tab-view.overflow.hint')
    }}</span>
  </div>
</template>
