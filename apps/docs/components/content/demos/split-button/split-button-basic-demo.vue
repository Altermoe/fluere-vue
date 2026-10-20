<script setup lang="ts">
import { FluereSplitButton } from '@fluere-vue/ui'
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

const pick = (label: string, close: () => void): void => {
  lastAction.value = label
  close()
}
</script>

<template>
  <div class="flex max-w-md flex-col gap-fluent-m">
    <FluereSplitButton
      :label="t('demos.split-button.basic.create')"
      @click="runDefault"
    >
      {{ t('demos.split-button.basic.create') }}
      <template #flyout="{ close }">
        <ul class="m-0 flex w-56 list-none flex-col gap-fluent-xs p-0">
          <li
            v-for="action in actions"
            :key="action.id"
          >
            <button
              type="button"
              class="w-full cursor-pointer rounded-fluent-md border-0 bg-transparent px-3 py-2 text-start text-sm text-colorNeutralForeground1 hover:bg-colorSubtleBackgroundHover active:bg-colorSubtleBackgroundPressed"
              @click="pick(action.label, close)"
            >
              {{ action.label }}
            </button>
          </li>
        </ul>
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
