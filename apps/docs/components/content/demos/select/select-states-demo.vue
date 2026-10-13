<script setup lang="ts">
import { FluereSelect } from '@fluere-vue/ui'
import { computed, ref } from 'vue'

const { t } = useDocsI18n()

/** 状态一览：标题 + 说明、含禁用项、整组禁用、空列表 */
const withDisabled = ref<string | null>(null)
const disabledAll = ref<string | null>('none')

const items = computed(() => [
  { value: 'fast', text: t('demos.select.states.fast') },
  { value: 'medium', text: t('demos.select.states.medium') },
  { value: 'slow', text: t('demos.select.states.slow'), disabled: true },
])

const disabledItems = computed(() => [{ value: 'none', text: t('demos.select.states.none') }])
</script>

<template>
  <div class="flex max-w-sm flex-col gap-fluent-l">
    <FluereSelect
      v-model="withDisabled"
      :items="items"
      :header="t('demos.select.states.header')"
      :description="t('demos.select.states.description')"
      :placeholder="t('demos.select.basic.placeholder')"
    />

    <FluereSelect
      v-model="disabledAll"
      :items="disabledItems"
      disabled
      :header="t('demos.select.states.disabledHeader')"
    />

    <FluereSelect
      :items="[]"
      :header="t('demos.select.states.emptyHeader')"
      :placeholder="t('demos.select.basic.placeholder')"
    >
      <template #empty>{{ t('demos.select.states.emptyHint') }}</template>
    </FluereSelect>
  </div>
</template>
