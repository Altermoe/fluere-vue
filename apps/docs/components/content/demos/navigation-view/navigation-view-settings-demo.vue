<script setup lang="ts">
import {
  FluentIconDocument24Regular,
  FluentIconFolder24Regular,
  FluentIconImage24Regular,
  FluentIconSettings24Regular,
} from '@fluere-vue/icons'
import {
  FluereNavigationView,
  FluereNavigationViewItem,
  FluereNavigationViewItemSeparator,
} from '@fluere-vue/ui'
import { computed, ref } from 'vue'

/**
 * 设置项与事件：底部「设置」项由 `is-settings-visible`（缺省 `true`）控制，
 * 可以用 `#settings` 插槽整块替换。
 *
 * 选中设置项时 `selectedValue` 取**保留哨兵值**（导出常量
 * `FLUERE_NAVIGATION_SETTINGS_VALUE`），并且 `itemInvoked` 的 `isSettingsInvoked`
 * 为 `true` —— 对应 WinUI 用对象身份判断 `IsSettingsItem(item)`。
 * `#paneFooter` 是面板底部（设置项上方）的自定义区，对应 `PaneFooter`。
 */
const { t, tm } = useDocsI18n()

const labels = computed(() => tm('demos.navigation-view.settings.labels'))
const selected = ref<string | number | undefined>('docs')
const lastEvent = ref('')

const onInvoked = (payload: { content: string; isSettingsInvoked: boolean }): void => {
  lastEvent.value = payload.isSettingsInvoked
    ? t('demos.navigation-view.settings.eventSettings')
    : t('demos.navigation-view.settings.eventItem', { content: payload.content })
}
</script>

<template>
  <div
    class="w-full max-w-[720px] overflow-hidden rounded-fluent-xl border border-colorNeutralStroke2"
  >
    <FluereNavigationView
      v-model:selected-value="selected"
      :label="t('demos.navigation-view.settings.label')"
      pane-display-mode="left"
      :default-is-pane-open="true"
      class="h-[320px]"
      @item-invoked="onInvoked"
    >
      <FluereNavigationViewItem
        value="docs"
        :content="labels[0] ?? ''"
      >
        <template #icon><FluentIconDocument24Regular :size="20" /></template>
      </FluereNavigationViewItem>
      <FluereNavigationViewItem
        value="media"
        :content="labels[1] ?? ''"
      >
        <template #icon><FluentIconImage24Regular :size="20" /></template>
      </FluereNavigationViewItem>
      <FluereNavigationViewItemSeparator />
      <FluereNavigationViewItem
        value="archive"
        :content="labels[2] ?? ''"
      >
        <template #icon><FluentIconFolder24Regular :size="20" /></template>
      </FluereNavigationViewItem>

      <!-- 面板底部自定义区（设置项上方），对应 WinUI `PaneFooter` -->
      <template #paneFooter>
        <div class="px-fluent-s py-fluent-xs text-xs text-colorNeutralForeground3">
          {{ t('demos.navigation-view.settings.footer') }}
        </div>
      </template>

      <!-- 覆盖内置设置项的内容（默认是齿轮图标 + 「设置」文案）。
           这里只演示「换文案 + 换图标」，交互仍由组件负责。 -->
      <template #settings>
        <button
          type="button"
          class="flex w-full items-center gap-fluent-s rounded-fluent-xl px-fluent-s py-fluent-xs text-left text-sm hover:bg-colorSubtleBackgroundHover"
          @click="onInvoked({ content: labels[3] ?? '', isSettingsInvoked: true })"
        >
          <FluentIconSettings24Regular :size="20" />
          <span>{{ labels[3] ?? '' }}</span>
        </button>
      </template>

      <template #content>
        <div class="flex flex-col gap-fluent-s p-fluent-l text-sm text-colorNeutralForeground2">
          <span>{{ t('demos.navigation-view.settings.body') }}</span>
          <span class="text-colorNeutralForeground3">{{ lastEvent }}</span>
        </div>
      </template>
    </FluereNavigationView>
  </div>
</template>
