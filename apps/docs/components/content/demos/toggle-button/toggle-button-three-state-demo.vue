<script setup lang="ts">
import { FluereToggleButton } from '@fluere-vue/ui'
import { computed, ref } from 'vue'

const { t } = useDocsI18n()

/**
 * 三态（对应 WinUI `ToggleButton.IsThreeState`）：
 * 点击循环 false → true → null（不确定态）→ false；`aria-pressed` 在不确定态为 `"mixed"`。
 */
const value = ref<boolean | null>(false)

const stateLabel = computed(() => {
  if (value.value === null) {
    return t('demos.toggle-button.threeState.stateIndeterminate')
  }
  return value.value
    ? t('demos.toggle-button.threeState.stateTrue')
    : t('demos.toggle-button.threeState.stateFalse')
})
</script>

<template>
  <div class="flex max-w-sm flex-col gap-fluent-m">
    <FluereToggleButton
      v-model:checked="value"
      three-state
    >
      {{ t('demos.toggle-button.threeState.label') }}
    </FluereToggleButton>
    <p class="text-sm text-colorNeutralForeground3">
      {{ t('demos.toggle-button.threeState.statusLine', { state: stateLabel }) }}
    </p>
  </div>
</template>
