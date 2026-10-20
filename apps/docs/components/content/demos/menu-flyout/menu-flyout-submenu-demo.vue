<script setup lang="ts">
import {
  FluereButton,
  FluereMenuFlyout,
  FluereMenuFlyoutItem,
  FluereMenuFlyoutSubItem,
} from '@fluere-vue/ui'
import { ref } from 'vue'

const { t } = useDocsI18n()

const selected = ref('')

const onSelect = ({ text }: { text?: string }): void => {
  selected.value = text ?? ''
}
</script>

<template>
  <div class="flex max-w-md flex-col items-start gap-fluent-m">
    <FluereMenuFlyout
      :label="t('demos.menu-flyout.submenu.menuLabel')"
      @select="onSelect"
    >
      <FluereButton>{{ t('demos.menu-flyout.submenu.trigger') }}</FluereButton>
      <template #content>
        <FluereMenuFlyoutItem :text="t('demos.menu-flyout.submenu.refresh')" />
        <FluereMenuFlyoutSubItem :text="t('demos.menu-flyout.submenu.sort')">
          <FluereMenuFlyoutItem :text="t('demos.menu-flyout.submenu.sortByName')" />
          <FluereMenuFlyoutItem :text="t('demos.menu-flyout.submenu.sortByDate')" />
          <FluereMenuFlyoutSubItem :text="t('demos.menu-flyout.submenu.more')">
            <FluereMenuFlyoutItem :text="t('demos.menu-flyout.submenu.sortBySize')" />
            <FluereMenuFlyoutItem :text="t('demos.menu-flyout.submenu.sortByType')" />
          </FluereMenuFlyoutSubItem>
        </FluereMenuFlyoutSubItem>
        <FluereMenuFlyoutItem :text="t('demos.menu-flyout.submenu.details')" />
      </template>
    </FluereMenuFlyout>

    <p class="text-sm text-colorNeutralForeground3">
      {{
        selected
          ? t('demos.menu-flyout.submenu.statusLine', { action: selected })
          : t('demos.menu-flyout.submenu.hint')
      }}
    </p>
  </div>
</template>
