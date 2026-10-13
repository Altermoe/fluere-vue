<script setup lang="ts">
import { FluereToggleButton } from '@fluere-vue/ui'
import { computed, ref } from 'vue'

const { t } = useDocsI18n()

/** 文本格式开关：最短路径的「按下即切换」用法（v-model:checked 双向绑定） */
const bold = ref<boolean | null>(false)
const italic = ref<boolean | null>(true)

const statusLine = computed(() =>
  t('demos.toggle-button.basic.statusLine', {
    bold: String(bold.value),
    italic: String(italic.value),
  }),
)
</script>

<template>
  <div class="flex max-w-sm flex-col gap-fluent-m">
    <div class="flex items-center gap-fluent-m">
      <FluereToggleButton v-model:checked="bold">
        {{ t('demos.toggle-button.basic.boldLabel') }}
      </FluereToggleButton>
      <FluereToggleButton v-model:checked="italic">
        {{ t('demos.toggle-button.basic.italicLabel') }}
      </FluereToggleButton>
    </div>
    <p class="text-sm text-colorNeutralForeground3">{{ statusLine }}</p>
  </div>
</template>
