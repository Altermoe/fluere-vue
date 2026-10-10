<script setup lang="ts">
import { FluereScrollView } from '@fluere-vue/ui'

const { t } = useDocsI18n()

/* 演示常量（避免 lint no-magic-numbers） */
const VERTICAL_ROW_COUNT = 18
</script>

<template>
  <div class="h-80">
    <FluereScrollView class="h-full">
      <div class="p-fluent-l space-y-fluent-s">
        <div
          v-for="index in VERTICAL_ROW_COUNT"
          :key="index"
          class="rounded-fluent-lg border border-colorNeutralStroke2 bg-colorNeutralBackground2 px-fluent-l py-fluent-m text-colorNeutralForeground2"
        >
          {{ t('demos.scroll-view.vertical.label', { index }) }}
        </div>
      </div>
    </FluereScrollView>
  </div>
</template>
