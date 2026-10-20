<script setup lang="ts">
import {
  FluentIconDocument24Regular,
  FluentIconFolder24Regular,
  FluentIconImage24Regular,
} from '@fluere-vue/icons'
import {
  FluereButton,
  FluereMenuFlyout,
  FluereMenuFlyoutItem,
  FluereMenuFlyoutSeparator,
} from '@fluere-vue/ui'
import { computed, ref } from 'vue'

const { t } = useDocsI18n()

const selected = ref('')

const items = computed(() => [
  { id: 'folder', label: t('demos.menu-flyout.basic.folder'), icon: FluentIconFolder24Regular },
  {
    id: 'document',
    label: t('demos.menu-flyout.basic.document'),
    icon: FluentIconDocument24Regular,
  },
  { id: 'image', label: t('demos.menu-flyout.basic.image'), icon: FluentIconImage24Regular },
])

const onSelect = ({ text }: { text?: string }): void => {
  selected.value = text ?? ''
}
</script>

<template>
  <div class="flex max-w-md flex-col items-start gap-fluent-m">
    <FluereMenuFlyout
      :label="t('demos.menu-flyout.basic.menuLabel')"
      @select="onSelect"
    >
      <FluereButton>{{ t('demos.menu-flyout.basic.trigger') }}</FluereButton>
      <template #content>
        <FluereMenuFlyoutItem
          v-for="item in items"
          :key="item.id"
          :text="item.label"
          :icon="item.icon"
          :value="item.id"
        />
        <FluereMenuFlyoutSeparator />
        <FluereMenuFlyoutItem :text="t('demos.menu-flyout.basic.more')" />
      </template>
    </FluereMenuFlyout>

    <p class="text-sm text-colorNeutralForeground3">
      {{
        selected
          ? t('demos.menu-flyout.basic.statusLine', { action: selected })
          : t('demos.menu-flyout.basic.hint')
      }}
    </p>
  </div>
</template>
