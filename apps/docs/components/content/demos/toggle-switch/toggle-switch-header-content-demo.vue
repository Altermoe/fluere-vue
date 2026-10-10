<script setup lang="ts">
import { FluereToggleSwitch } from '@fluere-vue/ui'
import { ref } from 'vue'

const { t } = useDocsI18n()

const notify = ref(false)
const promo = ref(true)
</script>

<template>
  <div class="flex flex-col items-start gap-fluent-l max-w-sm">
    <FluereToggleSwitch v-model="notify">
      <template #header>{{ t('demos.toggle-switch.headerContent.notifyHeader') }}</template>
      <template #off-content>{{ t('demos.toggle-switch.headerContent.notifyOffLabel') }}</template>
      <template #on-content>{{ t('demos.toggle-switch.headerContent.notifyOnLabel') }}</template>
      {{ t('demos.toggle-switch.headerContent.notifyLabel') }}
    </FluereToggleSwitch>

    <FluereToggleSwitch v-model="promo">
      <template #header>{{ t('demos.toggle-switch.headerContent.promoHeader') }}</template>
      <template #off-content> Off </template>
      <template #on-content> On </template>
      {{ t('demos.toggle-switch.headerContent.promoLabel') }}
    </FluereToggleSwitch>
  </div>
</template>
