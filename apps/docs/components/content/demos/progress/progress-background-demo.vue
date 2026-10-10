<script setup lang="ts">
import { FluereProgressBar } from '@fluere-vue/ui'
import { ref } from 'vue'

const { t } = useDocsI18n()

/**
 * 轨道色 = WinUI `ProgressBar.Background`（默认 ControlStrongStrokeColorDefault）。
 * WinUI 该值是 45% 黑（Light）/ 54.5% 白（Dark）的**半透明**色，Fluent 2 Web
 * 没有同值 token，故本库默认取语义位最近者；需要严格对齐实机时用
 * `background-color` 传入等价的半透明值即可。
 */
const value = ref(50)
</script>

<template>
  <div class="flex flex-col gap-fluent-l">
    <div class="flex items-center gap-fluent-m">
      <FluereProgressBar
        v-model="value"
        :label="t('demos.progress.background.labelDefault')"
        class="w-[130px]"
      />
      <span class="text-sm text-colorNeutralForeground2">{{
        t('demos.progress.background.noteDefault')
      }}</span>
    </div>
    <div class="flex items-center gap-fluent-m">
      <FluereProgressBar
        v-model="value"
        background-color="rgba(0, 0, 0, 0.45)"
        :label="t('demos.progress.background.labelWinui')"
        class="w-[130px]"
      />
      <span class="text-sm text-colorNeutralForeground2">{{
        t('demos.progress.background.noteWinui')
      }}</span>
    </div>
  </div>
</template>
