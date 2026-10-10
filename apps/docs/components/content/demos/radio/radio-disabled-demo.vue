<script setup lang="ts">
import { FluereRadioButton, FluereRadioGroup } from '@fluere-vue/ui'
import { computed, ref } from 'vue'

const { t, tm } = useDocsI18n()

const plan = ref('free')
const network = ref('5g')

/** 套餐选项文案（数组叶子：demos.radio.disabled.planItems） */
const planTexts = computed(() => tm('demos.radio.disabled.planItems'))
</script>

<template>
  <div class="flex flex-col gap-fluent-l max-w-sm">
    <!-- 整组禁用 -->
    <div class="flex flex-col gap-fluent-s">
      <p class="text-sm text-colorNeutralForeground2">
        {{ t('demos.radio.disabled.groupDisabledLabel') }}
      </p>
      <FluereRadioGroup
        v-model="plan"
        disabled
      >
        <FluereRadioButton value="free">{{ planTexts[0] }}</FluereRadioButton>
        <FluereRadioButton value="pro">{{ planTexts[1] }}</FluereRadioButton>
      </FluereRadioGroup>
    </div>
    <!-- 单个禁用：组可用，仅某一项不可选 -->
    <div class="flex flex-col gap-fluent-s">
      <p class="text-sm text-colorNeutralForeground2">
        {{ t('demos.radio.disabled.itemDisabledLabel') }}
      </p>
      <FluereRadioGroup v-model="network">
        <FluereRadioButton value="wifi">Wi-Fi</FluereRadioButton>
        <FluereRadioButton value="5g">{{
          t('demos.radio.disabled.cellularLabel')
        }}</FluereRadioButton>
        <!-- maintenanceNote 的 en 值带前导空格，保证英文站渲染成「Airplane mode (maintenance)」 -->
        <FluereRadioButton value="offline"
          >{{ t('demos.radio.disabled.airplaneLabel')
          }}<span class="text-colorNeutralForegroundDisabled">{{
            t('demos.radio.disabled.maintenanceNote')
          }}</span></FluereRadioButton
        >
        <FluereRadioButton
          value="ethernet"
          disabled
        >
          {{ t('demos.radio.disabled.ethernetLabel') }}
        </FluereRadioButton>
      </FluereRadioGroup>
    </div>
  </div>
</template>
