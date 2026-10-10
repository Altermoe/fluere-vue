<script setup lang="ts">
import { FluereToggleSwitch } from '@fluere-vue/ui'
import { ref } from 'vue'

const { t } = useDocsI18n()

const small = ref(true)
const medium = ref(true)
const large = ref(false)
</script>

<template>
  <div class="flex flex-col items-start gap-fluent-l">
    <FluereToggleSwitch
      v-model="small"
      size="small"
    >
      {{ t('demos.toggle-switch.size.smallLabel') }}
    </FluereToggleSwitch>
    <FluereToggleSwitch
      v-model="medium"
      size="medium"
    >
      {{ t('demos.toggle-switch.size.mediumLabel') }}
    </FluereToggleSwitch>
    <FluereToggleSwitch
      v-model="large"
      size="large"
    >
      {{ t('demos.toggle-switch.size.largeLabel') }}
    </FluereToggleSwitch>
  </div>
</template>
