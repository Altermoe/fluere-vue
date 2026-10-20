<script setup lang="ts">
import { FluereSplitButton, FluereToggleSplitButton } from '@fluere-vue/ui'
import { computed, ref } from 'vue'

const { t } = useDocsI18n()

const pinned = ref(false)

const pinnedLabel = computed(() =>
  pinned.value
    ? t('demos.split-button.states.toggleStateOn')
    : t('demos.split-button.states.toggleStateOff'),
)

const closeOnly = (close: () => void): void => {
  close()
}
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
        <template #flyout="{ close }">
          <div class="flex w-56 flex-col gap-fluent-xs">
            <button
              type="button"
              class="cursor-pointer rounded-fluent-md border-0 bg-transparent px-3 py-2 text-start text-sm text-colorNeutralForeground1 hover:bg-colorSubtleBackgroundHover active:bg-colorSubtleBackgroundPressed"
              @click="closeOnly(close)"
            >
              {{ t('demos.split-button.states.flyoutItem') }}
            </button>
          </div>
        </template>
      </FluereToggleSplitButton>
    </div>

    <p class="text-sm text-colorNeutralForeground3">
      {{ t('demos.split-button.states.statusLine', { state: pinnedLabel }) }}
    </p>
  </div>
</template>
