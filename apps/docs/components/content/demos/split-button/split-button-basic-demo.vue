<script setup lang="ts">
import { FluereMenuFlyoutItem, FluereSplitButton } from '@fluere-vue/ui'
import { computed, ref } from 'vue'

const { t } = useDocsI18n()

/** 「新建」的默认动作 = 第一项；箭头区展开其余选项（对齐 Explorer 的「新建 ▾」） */
const actions = computed(() => [
  { id: 'folder', label: t('demos.split-button.basic.folder') },
  { id: 'document', label: t('demos.split-button.basic.document') },
  { id: 'archive', label: t('demos.split-button.basic.archive') },
])

const lastAction = ref('')

const runDefault = (): void => {
  lastAction.value = actions.value[0]?.label ?? ''
}

/** `#flyout` 里放 MenuFlyout 条目：选中后菜单族自动关闭，并把条目冒泡为 `select` */
const onSelect = ({ text }: { text?: string }): void => {
  lastAction.value = text ?? ''
}
</script>

<template>
  <div class="flex max-w-md flex-col gap-fluent-m">
    <FluereSplitButton
      :label="t('demos.split-button.basic.create')"
      @click="runDefault"
      @select="onSelect"
    >
      {{ t('demos.split-button.basic.create') }}
      <template #flyout>
        <FluereMenuFlyoutItem
          v-for="action in actions"
          :key="action.id"
          :text="action.label"
          :value="action.id"
        />
      </template>
    </FluereSplitButton>

    <p class="text-sm text-colorNeutralForeground3">
      {{
        lastAction
          ? t('demos.split-button.basic.statusLine', { action: lastAction })
          : t('demos.split-button.basic.hint')
      }}
    </p>
  </div>
</template>
