<script setup lang="ts">
import { FluereToggleSwitch } from '@fluere-vue/ui'
import { ref } from 'vue'

const { t } = useDocsI18n()

const wifi = ref(true)
const bluetooth = ref(false)
const vpn = ref(true)
</script>

<template>
  <div class="flex flex-col gap-fluent-l max-w-sm">
    <FluereToggleSwitch v-model="wifi"> Wi-Fi </FluereToggleSwitch>
    <FluereToggleSwitch v-model="bluetooth">{{
      t('demos.toggle-switch.basic.bluetoothLabel')
    }}</FluereToggleSwitch>
    <FluereToggleSwitch v-model="vpn"> VPN </FluereToggleSwitch>
    <p class="text-sm text-colorNeutralForeground3">
      {{ t('demos.toggle-switch.basic.statusLine', { wifi, bluetooth, vpn }) }}
    </p>
  </div>
</template>
