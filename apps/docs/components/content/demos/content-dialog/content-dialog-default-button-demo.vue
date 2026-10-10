<script setup lang="ts">
import { FluereButton, FluereContentDialog } from '@fluere-vue/ui'
import type { FluereContentDialogButton } from '@fluere-vue/ui'
import { computed, ref } from 'vue'

const { t, tm } = useDocsI18n()

/**
 * 默认按钮（`DefaultButton`）：获得强调样式，并作为 Enter 的激活目标。
 *
 * 焦点规则与 WinUI 一致：焦点不在命令区（或正好落在默认按钮上）时保留强调态；
 * 焦点移到命令区里的**其它**按钮时，强调态会消失。
 */
// 选项值是固定枚举（非文案）留在代码里；文案为有序数组叶子
// demos.content-dialog.defaultButton.optionLabels
const OPTION_VALUES: FluereContentDialogButton[] = ['none', 'primary', 'secondary', 'close']
const optionLabels = computed(() => tm('demos.content-dialog.defaultButton.optionLabels'))
const options = computed(() =>
  OPTION_VALUES.map((value, index) => ({ value, label: optionLabels.value[index] ?? '' })),
)

const open = ref(false)
const defaultButton = ref<FluereContentDialogButton>('primary')

const show = (value: FluereContentDialogButton): void => {
  defaultButton.value = value
  open.value = true
}
</script>

<template>
  <div class="flex flex-col gap-fluent-l">
    <div class="flex flex-wrap items-center gap-fluent-s">
      <FluereButton
        v-for="option in options"
        :key="option.value"
        :data-cd-demo="`default-${option.value}`"
        size="small"
        @click="show(option.value)"
      >
        {{ option.label }}
      </FluereButton>
    </div>

    <FluereContentDialog
      v-model:open="open"
      :title="t('demos.content-dialog.defaultButton.title')"
      :primary-button-text="t('demos.content-dialog.defaultButton.primaryLabel')"
      :secondary-button-text="t('demos.content-dialog.defaultButton.secondaryLabel')"
      :close-button-text="t('demos.common.close')"
      :default-button="defaultButton"
    >
      <p>{{ t('demos.content-dialog.defaultButton.focusHint', { button: defaultButton }) }}</p>
      <p>
        <input :placeholder="t('demos.content-dialog.defaultButton.inputPlaceholder')" />
      </p>
    </FluereContentDialog>
  </div>
</template>
