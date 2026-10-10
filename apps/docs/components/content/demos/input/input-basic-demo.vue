<script setup lang="ts">
import { FluereInput } from '@fluere-vue/ui'
import { computed, ref } from 'vue'

const { t } = useDocsI18n()

const value = ref('')
const valueNote = computed(() =>
  t('demos.input.basic.valueNote', { value: value.value || t('demos.input.basic.emptyValue') }),
)
</script>

<template>
  <div class="flex flex-col gap-fluent-l max-w-sm">
    <FluereInput
      v-model="value"
      :placeholder="t('demos.input.basic.placeholder')"
    />
    <p class="text-sm text-colorNeutralForeground3">
      {{ valueNote }}
    </p>
    <FluereInput
      :placeholder="t('demos.input.basic.disabledPlaceholder')"
      disabled
    />
  </div>
</template>
