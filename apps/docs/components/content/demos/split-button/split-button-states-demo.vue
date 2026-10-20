<script setup lang="ts">
import { FluereMenuFlyoutItem, FluereSplitButton, FluereToggleSplitButton } from '@fluere-vue/ui'
import { computed, ref } from 'vue'

const { t } = useDocsI18n()

const pinned = ref(false)

const pinnedLabel = computed(() =>
  pinned.value
    ? t('demos.split-button.states.toggleStateOn')
    : t('demos.split-button.states.toggleStateOff'),
)
</script>

<template>
  <div class="flex max-w-md flex-col gap-fluent-m">
    <div class="flex flex-wrap items-center gap-fluent-m">
      <FluereSplitButton
        disabled
        :label="t('demos.split-button.states.disabledLabel')"
      >
        {{ t('demos.split-button.states.disabledLabel') }}
      </FluereSplitButton>

      <FluereToggleSplitButton
        v-model:checked="pinned"
        :secondary-label="t('demos.split-button.states.secondaryLabel')"
      >
        {{ t('demos.split-button.states.toggleLabel') }}
        <template #flyout>
          <FluereMenuFlyoutItem :text="t('demos.split-button.states.flyoutItem')" />
        </template>
      </FluereToggleSplitButton>
    </div>

    <p class="text-sm text-colorNeutralForeground3">
      {{ t('demos.split-button.states.statusLine', { state: pinnedLabel }) }}
    </p>
  </div>
</template>
