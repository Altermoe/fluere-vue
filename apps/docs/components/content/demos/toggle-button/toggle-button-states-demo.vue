<script setup lang="ts">
import { FluentIconCheckmark24Regular } from '@fluere-vue/icons'
import { FluereToggleButton } from '@fluere-vue/ui'
import { ref } from 'vue'

const { t } = useDocsI18n()

/** 尺寸三档 + 禁用（含「选中且禁用」的强调禁用档）+ 纯图标形态 */
const small = ref<boolean | null>(false)
const medium = ref<boolean | null>(true)
const large = ref<boolean | null>(false)
const checkedDisabled = ref<boolean | null>(true)
</script>

<template>
  <div class="flex flex-col gap-fluent-l">
    <div class="flex flex-wrap items-center gap-fluent-m">
      <FluereToggleButton
        v-model:checked="small"
        size="small"
      >
        {{ t('demos.toggle-button.states.smallLabel') }}
      </FluereToggleButton>
      <FluereToggleButton
        v-model:checked="medium"
        size="medium"
      >
        {{ t('demos.toggle-button.states.mediumLabel') }}
      </FluereToggleButton>
      <FluereToggleButton
        v-model:checked="large"
        size="large"
      >
        {{ t('demos.toggle-button.states.largeLabel') }}
      </FluereToggleButton>
    </div>

    <div class="flex flex-wrap items-center gap-fluent-m">
      <FluereToggleButton disabled>
        {{ t('demos.toggle-button.states.disabledLabel') }}
      </FluereToggleButton>
      <FluereToggleButton
        v-model:checked="checkedDisabled"
        disabled
      >
        {{ t('demos.toggle-button.states.disabledCheckedLabel') }}
      </FluereToggleButton>
      <FluereToggleButton
        icon-only
        :icon="FluentIconCheckmark24Regular"
        :label="t('demos.toggle-button.states.iconOnlyLabel')"
      />
    </div>
  </div>
</template>
