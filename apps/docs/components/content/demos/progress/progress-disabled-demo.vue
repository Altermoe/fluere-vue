<script setup lang="ts">
import { FluereProgressBar } from '@fluere-vue/ui'
import { ref } from 'vue'

const { t } = useDocsI18n()

const value = ref(60)
</script>

<template>
  <div class="flex flex-col gap-fluent-l">
    <div class="flex items-center gap-fluent-m">
      <FluereProgressBar
        v-model="value"
        disabled
        :label="t('demos.progress.disabled.labelDeterminate')"
        class="w-[130px]"
      />
      <span class="text-sm text-colorNeutralForeground2">{{
        t('demos.progress.disabled.noteDeterminate')
      }}</span>
    </div>
    <div class="flex items-center gap-fluent-m">
      <FluereProgressBar
        indeterminate
        disabled
        :label="t('demos.progress.disabled.labelIndeterminate')"
        class="w-[130px]"
      />
      <span class="text-sm text-colorNeutralForeground2">{{
        t('demos.progress.disabled.noteIndeterminate')
      }}</span>
    </div>
  </div>
</template>
