<script setup lang="ts">
import { FluereButton, FluereContentDialog } from '@fluere-vue/ui'
import { computed, ref } from 'vue'

const { t } = useDocsI18n()

/**
 * 八种按钮组合：对齐 WinUI 模板的 `ButtonsVisibilityStates`。
 *
 * 组合仅由「三个按钮文案是否为空」决定；按钮在命令区 5 列网格里的落位也随组合变化：
 * 三按钮时各占 1/3；两按钮时左右各半；单按钮时靠右占半宽。
 */
interface ButtonPreset {
  key: string
  label: string
  primary?: string
  secondary?: string
  close?: string
}

// 组合 key 是固定枚举（非文案）留在代码里；文案按角色取 demos.content-dialog.buttons.*，
// 逐字为「关闭」的关闭按钮文案统一复用 demos.common.close
const presets = computed<ButtonPreset[]>(() => [
  {
    key: 'all',
    label: t('demos.content-dialog.buttons.presetAllLabel'),
    primary: t('demos.content-dialog.buttons.saveLabel'),
    secondary: t('demos.content-dialog.buttons.dontSaveLabel'),
    close: t('demos.content-dialog.buttons.cancelLabel'),
  },
  {
    key: 'primary-secondary',
    label: t('demos.content-dialog.buttons.presetPrimarySecondaryLabel'),
    primary: t('demos.content-dialog.buttons.saveLabel'),
    secondary: t('demos.content-dialog.buttons.dontSaveLabel'),
  },
  {
    key: 'primary-close',
    label: t('demos.content-dialog.buttons.presetPrimaryCloseLabel'),
    primary: t('demos.content-dialog.buttons.okLabel'),
    close: t('demos.content-dialog.buttons.cancelLabel'),
  },
  {
    key: 'secondary-close',
    label: t('demos.content-dialog.buttons.presetSecondaryCloseLabel'),
    secondary: t('demos.content-dialog.buttons.laterLabel'),
    close: t('demos.content-dialog.buttons.cancelLabel'),
  },
  {
    key: 'primary',
    label: t('demos.content-dialog.buttons.presetPrimaryLabel'),
    primary: t('demos.content-dialog.buttons.okLabel'),
  },
  {
    key: 'secondary',
    label: t('demos.content-dialog.buttons.presetSecondaryLabel'),
    secondary: t('demos.content-dialog.buttons.laterLabel'),
  },
  {
    key: 'close',
    label: t('demos.content-dialog.buttons.presetCloseLabel'),
    close: t('demos.common.close'),
  },
  {
    key: 'none',
    label: t('demos.content-dialog.buttons.presetNoneLabel'),
  },
])

const open = ref(false)
const activeKey = ref('all')
const active = computed(
  () =>
    presets.value.find((preset) => preset.key === activeKey.value) ??
    (presets.value[0] as ButtonPreset),
)

const show = (preset: ButtonPreset): void => {
  activeKey.value = preset.key
  open.value = true
}
</script>

<template>
  <div class="flex flex-col gap-fluent-l">
    <div class="flex flex-wrap items-center gap-fluent-s">
      <FluereButton
        v-for="preset in presets"
        :key="preset.key"
        :data-cd-demo="`buttons-${preset.key}`"
        size="small"
        @click="show(preset)"
      >
        {{ preset.label }}
      </FluereButton>
    </div>

    <FluereContentDialog
      v-model:open="open"
      :title="t('demos.content-dialog.buttons.title')"
      :primary-button-text="active.primary"
      :secondary-button-text="active.secondary"
      :close-button-text="active.close"
    >
      {{ t('demos.content-dialog.buttons.currentPresetPrefix')
      }}<code>data-buttons="{{ active.key }}"</code
      >{{ t('demos.content-dialog.buttons.currentPresetSuffix', { label: active.label }) }}
    </FluereContentDialog>
  </div>
</template>
