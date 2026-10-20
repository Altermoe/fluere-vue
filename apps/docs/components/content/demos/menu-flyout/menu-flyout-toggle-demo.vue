<script setup lang="ts">
import {
  FluereButton,
  FluereMenuFlyout,
  FluereMenuFlyoutItem,
  FluereMenuFlyoutSeparator,
  FluereMenuFlyoutToggleItem,
} from '@fluere-vue/ui'
import { ref } from 'vue'

const { t } = useDocsI18n()

const showHidden = ref(false)
const showExtensions = ref(true)

const onHiddenChange = (value: boolean): void => {
  showHidden.value = value
}
const onExtensionsChange = (value: boolean): void => {
  showExtensions.value = value
}
</script>

<template>
  <div class="flex max-w-md flex-col items-start gap-fluent-m">
    <FluereMenuFlyout :label="t('demos.menu-flyout.toggle.menuLabel')">
      <FluereButton>{{ t('demos.menu-flyout.toggle.trigger') }}</FluereButton>
      <template #content>
        <FluereMenuFlyoutToggleItem
          :text="t('demos.menu-flyout.toggle.hidden')"
          :checked="showHidden"
          @update:checked="onHiddenChange"
        />
        <FluereMenuFlyoutToggleItem
          :text="t('demos.menu-flyout.toggle.extensions')"
          :checked="showExtensions"
          @update:checked="onExtensionsChange"
        />
        <FluereMenuFlyoutSeparator />
        <FluereMenuFlyoutItem
          :text="t('demos.menu-flyout.toggle.refresh')"
          keyboard-accelerator-text="F5"
        />
        <FluereMenuFlyoutItem
          :text="t('demos.menu-flyout.toggle.properties')"
          :disabled="true"
        />
      </template>
    </FluereMenuFlyout>

    <p class="text-sm text-colorNeutralForeground3">
      {{
        t('demos.menu-flyout.toggle.statusLine', {
          hidden: showHidden ? t('demos.menu-flyout.common.on') : t('demos.menu-flyout.common.off'),
          extensions: showExtensions
            ? t('demos.menu-flyout.common.on')
            : t('demos.menu-flyout.common.off'),
        })
      }}
    </p>
  </div>
</template>
