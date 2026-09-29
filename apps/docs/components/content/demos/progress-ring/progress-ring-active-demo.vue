<script setup lang="ts">
import { FluereProgressRing, FluereToggleSwitch } from '@fluere-vue/ui'
import { ref } from 'vue'

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
        label="加载指示"
      />
      <span class="text-sm text-colorNeutralForeground2">
        {{ active ? '转圈中' : '已隐藏（IsActive=false）' }}
      </span>
    </div>
    <FluereToggleSwitch v-model="active">激活（IsActive）</FluereToggleSwitch>
  </div>
</template>
