<script setup lang="ts">
import { FluereInput } from '@fluere-vue/ui'
import { ref } from 'vue'

const { t } = useDocsI18n()

const simple = ref('')
const custom = ref('secret')
</script>

<template>
  <div class="flex flex-col gap-fluent-l max-w-sm">
    <FluereInput
      v-model="simple"
      type="password"
      :placeholder="t('demos.input.password.placeholder')"
    />
    <FluereInput
      v-model="custom"
      type="password"
      :header="t('demos.input.password.header')"
      :placeholder="t('demos.input.password.placeholder')"
      password-char="#"
    />
    <p class="text-sm text-colorNeutralForeground3">
      {{ t('demos.input.password.note') }}
    </p>
  </div>
</template>
