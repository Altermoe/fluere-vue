<script setup lang="ts">
import { FluereToggleGroup, FluereToggleGroupItem } from '@fluere-vue/ui'
import { computed, ref } from 'vue'

const { t, tm } = useDocsI18n()

/** 整组禁用：组上 disabled 会叠加到每一项 */
const plan = ref('free')
const planTexts = computed(() => tm('demos.toggle-group.disabled.planItems'))

/** 单项禁用：组可用，仅某一项不可选（方向键也会跳过它） */
const network = ref('wifi')
const networkTexts = computed(() => tm('demos.toggle-group.disabled.networkItems'))
</script>

<template>
  <div class="flex max-w-sm flex-col gap-fluent-l">
    <div class="flex flex-col gap-fluent-s">
      <p class="text-sm text-colorNeutralForeground2">
        {{ t('demos.toggle-group.disabled.groupDisabledLabel') }}
      </p>
      <FluereToggleGroup
        v-model="plan"
        disabled
      >
        <FluereToggleGroupItem value="free">{{ planTexts[0] }}</FluereToggleGroupItem>
        <FluereToggleGroupItem value="pro">{{ planTexts[1] }}</FluereToggleGroupItem>
      </FluereToggleGroup>
    </div>

    <div class="flex flex-col gap-fluent-s">
      <p class="text-sm text-colorNeutralForeground2">
        {{ t('demos.toggle-group.disabled.itemDisabledLabel') }}
      </p>
      <FluereToggleGroup v-model="network">
        <FluereToggleGroupItem value="wifi">{{ networkTexts[0] }}</FluereToggleGroupItem>
        <FluereToggleGroupItem
          value="ethernet"
          disabled
        >
          {{ networkTexts[1] }}
        </FluereToggleGroupItem>
      </FluereToggleGroup>
    </div>
  </div>
</template>
