<script setup lang="ts">
import { FluereButton, FluereNumberBox } from '@fluere-vue/ui'
import { ref } from 'vue'

const { t } = useDocsI18n()

/** 演示用的初始金额 */
const INITIAL_AMOUNT = 128

const amount = ref<number | null>(INITIAL_AMOUNT)
const submitted = ref('')

const onSubmit = (event: Event) => {
  const data = new FormData(event.target as HTMLFormElement)
  submitted.value = String(data.get('amount') ?? '')
}
</script>

<template>
  <form
    class="flex flex-col gap-fluent-l max-w-sm"
    @submit.prevent="onSubmit"
  >
    <FluereNumberBox
      v-model="amount"
      name="amount"
      :min="0"
      :max="10000"
      :step="8"
      spin-button-placement-mode="inline"
      :header="t('demos.number-box.form.headerAmount')"
    />
    <div class="flex items-center gap-fluent-m">
      <FluereButton
        type="submit"
        appearance="primary"
      >
        {{ t('demos.number-box.form.buttonSubmit') }}
      </FluereButton>
      <span class="text-sm text-colorNeutralForeground3">
        {{ t('demos.number-box.form.note', { submitted: submitted || '—' }) }}
      </span>
    </div>
  </form>
</template>
