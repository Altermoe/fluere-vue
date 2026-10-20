<script setup lang="ts">
import { FluentIconChevronDown12Regular } from '@fluere-vue/icons'
import { FluereButton, FluereMenuFlyout, FluereMenuFlyoutItem } from '@fluere-vue/ui'
import { ref } from 'vue'

const { t } = useDocsI18n()

/** SplitButton 的消费姿势：父组件持有锚点元素，通过 `showAt()` 决定何时弹出 */
const anchor = ref<HTMLElement | null>(null)
const menu = ref<{ showAt: (target: HTMLElement) => void } | null>(null)
const selected = ref('')

const openMenu = (): void => {
  if (anchor.value) {
    menu.value?.showAt(anchor.value)
  }
}

const onSelect = ({ text }: { text?: string }): void => {
  selected.value = text ?? ''
}
</script>

<template>
  <div class="flex max-w-md flex-col items-start gap-fluent-m">
    <div class="flex w-fit items-center gap-fluent-xs">
      <FluereButton @click="onSelect({ text: t('demos.menu-flyout.anchor.primary') })">
        {{ t('demos.menu-flyout.anchor.primary') }}
      </FluereButton>
      <span
        ref="anchor"
        class="inline-flex"
      >
        <FluereButton
          icon-only
          :icon="FluentIconChevronDown12Regular"
          :aria-label="t('demos.menu-flyout.anchor.more')"
          @click="openMenu"
        />
      </span>
    </div>

    <!-- 无触发器模式：不渲染默认插槽，面板由 showAt() 在锚点处打开 -->
    <FluereMenuFlyout
      ref="menu"
      :label="t('demos.menu-flyout.anchor.menuLabel')"
      placement="bottom-edge-aligned-left"
      @select="onSelect"
    >
      <template #content>
        <FluereMenuFlyoutItem :text="t('demos.menu-flyout.anchor.folder')" />
        <FluereMenuFlyoutItem :text="t('demos.menu-flyout.anchor.document')" />
        <FluereMenuFlyoutItem :text="t('demos.menu-flyout.anchor.archive')" />
      </template>
    </FluereMenuFlyout>

    <p class="text-sm text-colorNeutralForeground3">
      {{
        selected
          ? t('demos.menu-flyout.anchor.statusLine', { action: selected })
          : t('demos.menu-flyout.anchor.hint')
      }}
    </p>
  </div>
</template>
