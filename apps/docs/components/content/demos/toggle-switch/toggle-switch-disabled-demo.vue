<script setup lang="ts">
import { FluereToggleSwitch } from '@fluere-vue/ui'
import { ref } from 'vue'

const { t } = useDocsI18n()

const offDisabled = ref(false)
const onDisabled = ref(true)
</script>

<template>
  <div class="flex flex-col items-start gap-fluent-l">
    <FluereToggleSwitch
      v-model="offDisabled"
      disabled
    >
      {{ t('demos.toggle-switch.disabled.offLabel') }}
    </FluereToggleSwitch>
    <FluereToggleSwitch
      v-model="onDisabled"
      disabled
    >
      {{ t('demos.toggle-switch.disabled.onLabel') }}
    </FluereToggleSwitch>
  </div>
</template>
