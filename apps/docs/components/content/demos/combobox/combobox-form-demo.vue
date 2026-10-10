<script setup lang="ts">
import type { FluereComboboxItem } from '@fluere-vue/ui'
import { FluereButton, FluereCombobox } from '@fluere-vue/ui'
import { computed, ref } from 'vue'

const { t, tm } = useDocsI18n()

const SHIPPING_VALUES = ['standard', 'express', 'pickup']
const shippingTexts = computed(() => tm('demos.combobox.form.shippingOptions'))
const SHIPPING = computed<FluereComboboxItem<string>[]>(() =>
  SHIPPING_VALUES.map((value, index) => ({ value, text: shippingTexts.value[index] ?? '' })),
)

const shipping = ref<string | null>('standard')
const submitted = ref('')

const onSubmit = (): void => {
  submitted.value = t('demos.combobox.form.submittedNote', {
    value: shipping.value ?? t('demos.combobox.form.emptyValue'),
  })
}
</script>

<template>
  <form
    class="flex flex-col gap-fluent-l max-w-xs"
    @submit.prevent="onSubmit"
  >
    <FluereCombobox
      v-model="shipping"
      :items="SHIPPING"
      name="shipping"
      :header="t('demos.combobox.form.header')"
    />
    <FluereButton
      type="submit"
      appearance="primary"
    >
      {{ t('demos.combobox.form.submitLabel') }}
    </FluereButton>
    <p
      v-if="submitted"
      class="text-sm text-colorNeutralForeground3"
    >
      {{ submitted }}
    </p>
  </form>
</template>
