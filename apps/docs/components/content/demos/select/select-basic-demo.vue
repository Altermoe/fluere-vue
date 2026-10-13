<script setup lang="ts">
import { FluereSelect } from '@fluere-vue/ui'
import { computed, ref } from 'vue'

const { t } = useDocsI18n()

/** 基础用法：不可编辑下拉 + 占位符 */
const value = ref<string | null>('week')

const items = computed(() => [
  { value: 'day', text: t('demos.select.basic.day') },
  { value: 'week', text: t('demos.select.basic.week') },
  { value: 'month', text: t('demos.select.basic.month') },
])

const statusLine = computed(() =>
  t('demos.select.basic.statusLine', { value: value.value ?? t('demos.select.basic.empty') }),
)
</script>

<template>
  <div class="flex max-w-sm flex-col gap-fluent-m">
    <FluereSelect
      v-model="value"
      :items="items"
      :header="t('demos.select.basic.label')"
      :placeholder="t('demos.select.basic.placeholder')"
    />
    <p class="text-sm text-colorNeutralForeground3">{{ statusLine }}</p>
  </div>
</template>
