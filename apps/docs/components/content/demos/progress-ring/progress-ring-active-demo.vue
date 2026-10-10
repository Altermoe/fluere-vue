<script setup lang="ts">
import { FluereProgressRing, FluereToggleSwitch } from '@fluere-vue/ui'
import { ref } from 'vue'

const { t } = useDocsI18n()

const active = ref(true)
</script>

<template>
  <div class="flex flex-col gap-fluent-l">
    <div
      class="flex items-center gap-fluent-m"
      :class="active ? '' : 'opacity-50'"
    >
      <FluereProgressRing
        :active="active"
        :label="t('demos.progress-ring.active.label')"
      />
      <span class="text-sm text-colorNeutralForeground2">{{
        active
          ? t('demos.progress-ring.active.statusSpinning')
          : t('demos.progress-ring.active.statusHidden')
      }}</span>
    </div>
    <FluereToggleSwitch v-model="active">{{
      t('demos.progress-ring.active.labelToggle')
    }}</FluereToggleSwitch>
  </div>
</template>
