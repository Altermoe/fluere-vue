<script setup lang="ts">
import { FluereProgressRing } from '@fluere-vue/ui'

const { t } = useDocsI18n()
</script>

<template>
  <div class="flex items-end gap-fluent-xl">
    <div class="flex flex-col items-center gap-fluent-s">
      <FluereProgressRing
        background-color="var(--colorNeutralStroke1)"
        :label="t('demos.progress-ring.background.labelIndeterminate')"
      />
      <span class="text-xs text-colorNeutralForeground3">{{
        t('demos.progress-ring.background.noteIndeterminate')
      }}</span>
    </div>
    <div class="flex flex-col items-center gap-fluent-s">
      <FluereProgressRing
        :model-value="20"
        :indeterminate="false"
        background-color="var(--colorNeutralStroke1)"
        :label="t('demos.progress-ring.background.labelDeterminate')"
      />
      <span class="text-xs text-colorNeutralForeground3">{{
        t('demos.progress-ring.background.noteDeterminate')
      }}</span>
    </div>
  </div>
</template>
