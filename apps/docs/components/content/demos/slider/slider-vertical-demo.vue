<script setup lang="ts">
import { FluereSlider } from '@fluere-vue/ui'
import { ref } from 'vue'

const { t } = useDocsI18n()

/** 演示用的初始值 */
const INITIAL_BASS = 60
const INITIAL_TREBLE = 35
/** 纵向滑块长度（px） */
const SLIDER_LENGTH = 160

const bass = ref(INITIAL_BASS)
const treble = ref(INITIAL_TREBLE)
</script>

<template>
  <div class="flex items-start gap-fluent-xxl">
    <div class="flex flex-col items-center gap-fluent-m">
      <FluereSlider
        v-model="bass"
        orientation="vertical"
        :vertical-length="SLIDER_LENGTH"
        :label="t('demos.slider.vertical.labelBass')"
      />
      <span class="text-sm text-colorNeutralForeground3">{{
        t('demos.slider.vertical.noteBass', { bass })
      }}</span>
    </div>
    <div class="flex flex-col items-center gap-fluent-m">
      <FluereSlider
        v-model="treble"
        orientation="vertical"
        :vertical-length="SLIDER_LENGTH"
        :label="t('demos.slider.vertical.labelTreble')"
      />
      <span class="text-sm text-colorNeutralForeground3">{{
        t('demos.slider.vertical.noteTreble', { treble })
      }}</span>
    </div>
    <p class="text-sm text-colorNeutralForeground3 max-w-[16rem]">
      {{ t('demos.slider.vertical.noteBefore') }}
      <code>inverted</code>
      {{ t('demos.slider.vertical.noteAfter') }}
    </p>
  </div>
</template>
