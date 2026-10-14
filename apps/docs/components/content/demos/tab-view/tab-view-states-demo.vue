<script setup lang="ts">
import { FluereCheckbox, FluereTabView, FluereTabViewItem } from '@fluere-vue/ui'
import type { FluereTabViewCloseButtonOverlayMode } from '@fluere-vue/ui'
import { computed, ref } from 'vue'

/**
 * 状态与可关闭性：
 *  - `isClosable: false` ⇒ 关闭按钮折叠，且该 tab 不再进入焦点环的关闭按钮位；
 *  - `disabled: true` ⇒ 进不了焦点环、不能被选中（对应 `Control.IsEnabled = false`）；
 *  - `close-button-overlay-mode="on-pointer-over"` ⇒ **只有悬停或选中**时才显示关闭按钮
 *    （注意 `auto` 与 `always` 在上游走同一个分支，都是常显）。
 */
const { t, tm } = useDocsI18n()

const labels = computed(() => tm('demos.tab-view.states.tabs'))
const overlayOnPointerOver = ref(false)
const overlayMode = computed<FluereTabViewCloseButtonOverlayMode>(() =>
  overlayOnPointerOver.value ? 'on-pointer-over' : 'auto',
)
</script>

<template>
  <div class="flex max-w-[720px] flex-col gap-fluent-s">
    <FluereCheckbox v-model="overlayOnPointerOver">
      {{ t('demos.tab-view.states.overlayLabel') }}
    </FluereCheckbox>

    <FluereTabView
      :default-selected-index="0"
      :close-button-overlay-mode="overlayMode"
      :label="t('demos.tab-view.states.label')"
      class="h-[180px] overflow-hidden rounded-fluent-xl border border-colorNeutralStroke2 bg-colorNeutralBackground1/60"
    >
      <FluereTabViewItem
        :header="labels[0] ?? ''"
        :key="'closable'"
      >
        <div class="p-fluent-l text-sm text-colorNeutralForeground2">
          {{ t('demos.tab-view.states.hint') }}
        </div>
      </FluereTabViewItem>
      <FluereTabViewItem
        :key="'closable-unselected'"
        :header="labels[1] ?? ''"
      >
        <div class="p-fluent-l text-sm text-colorNeutralForeground2">
          {{ t('demos.tab-view.states.hint') }}
        </div>
      </FluereTabViewItem>
      <FluereTabViewItem
        :key="'not-closable'"
        :header="labels[2] ?? ''"
        :is-closable="false"
      >
        <div class="p-fluent-l text-sm text-colorNeutralForeground2">
          {{ t('demos.tab-view.states.hint') }}
        </div>
      </FluereTabViewItem>
      <FluereTabViewItem
        :key="'disabled'"
        :header="labels[3] ?? ''"
        disabled
      >
        <div class="p-fluent-l text-sm text-colorNeutralForeground2">
          {{ t('demos.tab-view.states.hint') }}
        </div>
      </FluereTabViewItem>
    </FluereTabView>

    <span class="text-xs text-colorNeutralForeground3">{{ t('demos.tab-view.states.hint') }}</span>
  </div>
</template>
