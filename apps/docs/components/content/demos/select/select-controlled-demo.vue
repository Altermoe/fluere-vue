<script setup lang="ts">
import { FluereButton, FluereSelect } from '@fluere-vue/ui'
import { computed, ref } from 'vue'

const { t } = useDocsI18n()

/** 受控 + `change` 事件 + 清空（`modelValue = null` 回到占位符） */
const value = ref<string | null>('auto')
const lastChange = ref<string | null>(null)

const items = computed(() => [
  { value: 'auto', text: t('demos.select.controlled.auto') },
  { value: 'light', text: t('demos.select.controlled.light') },
  { value: 'dark', text: t('demos.select.controlled.dark') },
])

const changeLine = computed(() =>
  t('demos.select.controlled.changeLine', {
    value: lastChange.value ?? t('demos.select.basic.empty'),
  }),
)
</script>

<template>
  <div class="flex max-w-sm flex-col gap-fluent-m">
    <FluereSelect
      v-model="value"
      :items="items"
      :header="t('demos.select.controlled.label')"
      :placeholder="t('demos.select.basic.placeholder')"
      @change="(args) => (lastChange = args.value === null ? null : String(args.value))"
    />

    <div class="flex items-center gap-fluent-m">
      <FluereButton
        size="small"
        @click="value = null"
      >
        {{ t('demos.select.controlled.resetLabel') }}
      </FluereButton>
      <span class="text-sm text-colorNeutralForeground3">{{ changeLine }}</span>
    </div>
  </div>
</template>
