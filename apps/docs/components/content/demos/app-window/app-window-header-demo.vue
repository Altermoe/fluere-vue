<script setup lang="ts">
import { FluentIconPerson24Regular } from '@fluere-vue/icons'
import { FluereAppWindow, FluereButton, FluereInput } from '@fluere-vue/ui'
import { ref } from 'vue'

/**
 * 头部插槽四件套（对齐 WinUI `TitleBar` 的属性位）：
 *   `#left-header`       → `LeftHeader`
 *   `#titlebar-content`  → `Content`（标题栏中段，**不是**窗口内容区）
 *   `#right-header`      → `RightHeader`
 *   返回 / 导航按钮       → `IsBackButtonVisible` / `IsPaneToggleButtonVisible`
 *
 * 有任一头部内容 ⇒ 标题栏走 48 高（对应 `TitleBar.cpp#UpdateHeight()`）；
 * 恰好只显示一个按钮时左头间距从 14 压到 2（对应 `LeftHeaderSpacing`）。
 * 塞在标题栏里的输入 / 按钮都是「非拖拽区」，不会误触发窗口拖动。
 */
const { t } = useDocsI18n()

const log = ref<string[]>([])
const record = (label: string): void => {
  log.value = [label, ...log.value].slice(0, 4)
}
</script>

<template>
  <div class="flex flex-col gap-fluent-l py-fluent-s">
    <FluereAppWindow
      class="h-[320px] w-full"
      :title="t('demos.app-window.header.title')"
      :is-back-button-visible="true"
      :is-pane-toggle-button-visible="true"
      @back-requested="record(t('demos.app-window.header.back'))"
      @pane-toggle-requested="record(t('demos.app-window.header.paneToggle'))"
    >
      <template #titlebar-content>
        <FluereInput
          class="w-[220px]"
          :placeholder="t('demos.app-window.header.searchPlaceholder')"
          :aria-label="t('demos.app-window.header.searchPlaceholder')"
        />
      </template>
      <template #right-header>
        <FluereButton
          appearance="subtle"
          icon-only
          :icon="FluentIconPerson24Regular"
          :aria-label="t('demos.app-window.header.account')"
          @click="record(t('demos.app-window.header.account'))"
        />
      </template>
      <template #content>
        <div class="flex flex-col gap-fluent-s p-fluent-xxl">
          <span class="text-xs text-colorNeutralForeground3">
            {{
              log.length === 0
                ? t('demos.app-window.header.notTriggered')
                : t('demos.app-window.header.eventLog', { entries: log.join(' · ') })
            }}
          </span>
        </div>
      </template>
    </FluereAppWindow>
  </div>
</template>
