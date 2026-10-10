<script setup lang="ts">
import { FluereScrollView } from '@fluere-vue/ui'
import { ref } from 'vue'

const { t } = useDocsI18n()

/* 演示常量（避免 lint no-magic-numbers） */
const GRID_CELL_COUNT = 64
const SCROLL_STEP = 120
const ZOOM_STEP = 0.25
const OFFSET_DECIMALS = 1
const ZOOM_DECIMALS = 2
const WHOLE_DECIMALS = 0
const TOP_OFFSET = 0

/* 程序化 API 演示 */
const sv = ref<InstanceType<typeof FluereScrollView> | undefined>(undefined)
const readout = ref('')

const refreshReadout = (): void => {
  const current = sv.value
  if (!current) {
    return
  }
  readout.value = [
    `offset = (${current.horizontalOffset.toFixed(OFFSET_DECIMALS)}, ${current.verticalOffset.toFixed(OFFSET_DECIMALS)})`,
    `zoom = ${current.zoomFactor.toFixed(ZOOM_DECIMALS)}`,
    `scrollable = (${current.scrollableWidth.toFixed(WHOLE_DECIMALS)}, ${current.scrollableHeight.toFixed(WHOLE_DECIMALS)})`,
    `extent = (${current.extentWidth.toFixed(WHOLE_DECIMALS)}, ${current.extentHeight.toFixed(WHOLE_DECIMALS)})`,
    `viewport = (${current.viewportWidth.toFixed(WHOLE_DECIMALS)}, ${current.viewportHeight.toFixed(WHOLE_DECIMALS)})`,
    `state = ${current.state}`,
  ].join(' ')
}
</script>

<template>
  <div>
    <div class="h-56">
      <FluereScrollView
        ref="sv"
        class="h-full"
        content-orientation="both"
        zoom-mode="enabled"
        @view-changed="refreshReadout"
      >
        <div class="grid grid-cols-8 gap-fluent-s p-fluent-m">
          <div
            v-for="index in GRID_CELL_COUNT"
            :key="index"
            class="h-14 rounded-fluent-md bg-colorNeutralBackground2 border border-colorNeutralStroke2 flex items-center justify-center text-xs text-colorNeutralForeground3"
          >
            {{ index }}
          </div>
        </div>
      </FluereScrollView>
    </div>
    <div class="mt-fluent-m flex flex-wrap gap-fluent-s items-center">
      <button
        class="px-fluent-m py-fluent-s rounded-fluent-md border border-colorNeutralStroke1 bg-colorNeutralBackground1 hover:bg-colorNeutralBackground1Hover text-sm"
        @click="sv?.scrollBy(0, SCROLL_STEP)"
      >
        {{ t('demos.scroll-view.api.buttonScrollDown') }}
      </button>
      <button
        class="px-fluent-m py-fluent-s rounded-fluent-md border border-colorNeutralStroke1 bg-colorNeutralBackground1 hover:bg-colorNeutralBackground1Hover text-sm"
        @click="sv?.scrollBy(0, -SCROLL_STEP)"
      >
        {{ t('demos.scroll-view.api.buttonScrollUp') }}
      </button>
      <button
        class="px-fluent-m py-fluent-s rounded-fluent-md border border-colorNeutralStroke1 bg-colorNeutralBackground1 hover:bg-colorNeutralBackground1Hover text-sm"
        @click="sv?.scrollTo(TOP_OFFSET, TOP_OFFSET)"
      >
        {{ t('demos.scroll-view.api.buttonTop') }}
      </button>
      <button
        class="px-fluent-m py-fluent-s rounded-fluent-md border border-colorNeutralStroke1 bg-colorNeutralBackground1 hover:bg-colorNeutralBackground1Hover text-sm"
        @click="sv?.zoomBy(ZOOM_STEP)"
      >
        {{ t('demos.scroll-view.api.buttonZoomIn') }}
      </button>
      <button
        class="px-fluent-m py-fluent-s rounded-fluent-md border border-colorNeutralStroke1 bg-colorNeutralBackground1 hover:bg-colorNeutralBackground1Hover text-sm"
        @click="sv?.zoomBy(-ZOOM_STEP)"
      >
        {{ t('demos.scroll-view.api.buttonZoomOut') }}
      </button>
      <code class="text-xs text-colorNeutralForeground3 break-all">{{
        readout || t('demos.scroll-view.api.readout')
      }}</code>
    </div>
  </div>
</template>
