<script setup lang="ts">
import { FluereScrollView } from '@fluere-vue/ui'

const { t } = useDocsI18n()

/* 演示常量（避免 lint no-magic-numbers） */
const HORIZONTAL_CARD_COUNT = 10
</script>

<template>
  <div class="h-40">
    <FluereScrollView
      class="h-full"
      content-orientation="horizontal"
    >
      <div class="flex gap-fluent-m p-fluent-l">
        <div
          v-for="index in HORIZONTAL_CARD_COUNT"
          :key="index"
          class="w-56 h-28 shrink-0 rounded-fluent-lg border border-colorNeutralStroke2 bg-colorNeutralBackground2 flex items-center justify-center text-colorNeutralForeground2"
        >
          {{ t('demos.scroll-view.horizontal.label', { index }) }}
        </div>
      </div>
    </FluereScrollView>
  </div>
</template>
