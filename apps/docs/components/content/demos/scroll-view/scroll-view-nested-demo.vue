<script setup lang="ts">
import { FluereScrollView } from '@fluere-vue/ui'

const { t } = useDocsI18n()

/* 演示常量（避免 lint no-magic-numbers） */
const NESTED_OUTER_ROW_COUNT = 4
const NESTED_OUTER_TAIL_COUNT = 6
const NESTED_INNER_ROW_COUNT = 10
</script>

<template>
  <div class="h-96">
    <FluereScrollView class="h-full">
      <div class="space-y-fluent-l p-fluent-l">
        <div
          v-for="index in NESTED_OUTER_ROW_COUNT"
          :key="`nested-outer-${index}`"
          class="rounded-fluent-lg border border-colorNeutralStroke2 bg-colorNeutralBackground2 px-fluent-l py-fluent-m text-colorNeutralForeground2"
        >
          {{ t('demos.scroll-view.nested.labelOuter', { index }) }}
        </div>

        <div class="h-40">
          <FluereScrollView class="h-full">
            <div class="space-y-fluent-s p-fluent-m">
              <div
                v-for="index in NESTED_INNER_ROW_COUNT"
                :key="`nested-inner-a-${index}`"
                class="h-8 rounded-fluent-md border border-colorNeutralStroke2 bg-colorNeutralBackground2 px-fluent-s flex items-center text-xs text-colorNeutralForeground3"
              >
                {{ t('demos.scroll-view.nested.labelInnerA', { index }) }}
              </div>
            </div>
          </FluereScrollView>
        </div>

        <div class="h-40">
          <FluereScrollView class="h-full">
            <div class="space-y-fluent-s p-fluent-m">
              <div
                v-for="index in NESTED_INNER_ROW_COUNT"
                :key="`nested-inner-b-${index}`"
                class="h-8 rounded-fluent-md border border-colorNeutralStroke2 bg-colorNeutralBackground2 px-fluent-s flex items-center text-xs text-colorNeutralForeground3"
              >
                {{ t('demos.scroll-view.nested.labelInnerB', { index }) }}
              </div>
            </div>
          </FluereScrollView>
        </div>

        <div
          v-for="index in NESTED_OUTER_TAIL_COUNT"
          :key="`nested-outer-tail-${index}`"
          class="rounded-fluent-lg border border-colorNeutralStroke2 bg-colorNeutralBackground2 px-fluent-l py-fluent-m text-colorNeutralForeground2"
        >
          {{ t('demos.scroll-view.nested.labelOuterTail', { index }) }}
        </div>
      </div>
    </FluereScrollView>
  </div>
</template>
