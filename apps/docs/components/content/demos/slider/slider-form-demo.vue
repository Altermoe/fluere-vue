<script setup lang="ts">
import { FluereButton, FluereSlider } from '@fluere-vue/ui'
import { ref } from 'vue'

const { t } = useDocsI18n()

/** 演示用的初始增益 */
const INITIAL_GAIN = 70

const gain = ref(INITIAL_GAIN)
const submitted = ref('')

const onSubmit = (event: Event) => {
  const data = new FormData(event.target as HTMLFormElement)
  submitted.value = String(data.get('gain') ?? '')
}
</script>

<template>
  <form
    class="flex flex-col gap-fluent-l max-w-sm"
    @submit.prevent="onSubmit"
  >
    <FluereSlider
      v-model="gain"
      name="gain"
      :header="t('demos.slider.form.header')"
    />
    <div class="flex items-center gap-fluent-m">
      <FluereButton
        type="submit"
        appearance="primary"
      >
        {{ t('demos.slider.form.buttonSubmit') }}
      </FluereButton>
      <span class="text-sm text-colorNeutralForeground3">
        {{ t('demos.slider.form.note', { submitted: submitted || '—' }) }}
      </span>
    </div>
  </form>
</template>
