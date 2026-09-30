<script setup lang="ts">
import { FluereButton, FluereTooltip } from '@fluere-vue/ui'
</script>

<template>
  <div class="flex flex-wrap items-center gap-fluent-l">
    <FluereTooltip content="这条会显示">
      <FluereButton>可用</FluereButton>
    </FluereTooltip>
    <FluereTooltip
      content="这条不会显示"
      disabled
    >
      <FluereButton>disabled</FluereButton>
    </FluereTooltip>
  </div>
</template>
