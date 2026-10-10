<script setup lang="ts">
import { FluereScrollView } from '@fluere-vue/ui'

const { t } = useDocsI18n()

/* 演示常量（避免 lint no-magic-numbers） */
const BAR_ROW_COUNT = 12
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-fluent-l">
    <div>
      <p class="text-sm text-colorNeutralForeground3 mb-2">
        {{ t('demos.scroll-view.barVisibility.labelAuto') }}
      </p>
      <div class="h-40">
        <FluereScrollView class="h-full">
          <div class="space-y-fluent-s p-fluent-m">
            <div
              v-for="index in BAR_ROW_COUNT"
              :key="index"
              class="h-8 rounded-fluent-md bg-colorNeutralBackground2 border border-colorNeutralStroke2"
            />
          </div>
        </FluereScrollView>
      </div>
    </div>
    <div>
      <p class="text-sm text-colorNeutralForeground3 mb-2">
        {{ t('demos.scroll-view.barVisibility.labelVisible') }}
      </p>
      <div class="h-40">
        <FluereScrollView
          class="h-full"
          vertical-scroll-bar-visibility="visible"
        >
          <div class="space-y-fluent-s p-fluent-m">
            <div
              v-for="index in BAR_ROW_COUNT"
              :key="index"
              class="h-8 rounded-fluent-md bg-colorNeutralBackground2 border border-colorNeutralStroke2"
            />
          </div>
        </FluereScrollView>
      </div>
    </div>
    <div>
      <p class="text-sm text-colorNeutralForeground3 mb-2">
        {{ t('demos.scroll-view.barVisibility.labelHidden') }}
      </p>
      <div class="h-40">
        <FluereScrollView
          class="h-full"
          vertical-scroll-bar-visibility="hidden"
        >
          <div class="space-y-fluent-s p-fluent-m">
            <div
              v-for="index in BAR_ROW_COUNT"
              :key="index"
              class="h-8 rounded-fluent-md bg-colorNeutralBackground2 border border-colorNeutralStroke2"
            />
          </div>
        </FluereScrollView>
      </div>
    </div>
  </div>
</template>
