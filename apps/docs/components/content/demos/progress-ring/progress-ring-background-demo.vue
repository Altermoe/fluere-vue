<script setup lang="ts">
import { FluereProgressRing } from '@fluere-vue/ui'
</script>

<template>
  <div class="flex items-end gap-fluent-xl">
    <div class="flex flex-col items-center gap-fluent-s">
      <FluereProgressRing
        background-color="var(--colorNeutralStroke1)"
        label="不确定态（带轨道）"
      />
      <span class="text-xs text-colorNeutralForeground3">不确定 + 轨道</span>
    </div>
    <div class="flex flex-col items-center gap-fluent-s">
      <FluereProgressRing
        :model-value="20"
        :indeterminate="false"
        background-color="var(--colorNeutralStroke1)"
        label="确定态（带轨道）"
      />
      <span class="text-xs text-colorNeutralForeground3">确定 20% + 轨道</span>
    </div>
  </div>
</template>
