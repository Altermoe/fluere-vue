<script setup lang="ts">
import { FluereScrollView } from '@fluere-vue/ui'

const { t } = useDocsI18n()
</script>

<template>
  <div class="h-80">
    <FluereScrollView
      class="h-full"
      content-orientation="both"
      zoom-mode="enabled"
    >
      <div
        class="w-[800px] h-[600px] rounded-fluent-lg flex items-center justify-center text-4xl font-semibold"
        style="background: light-dark(#f3f3f3, #2b2b2b)"
      >
        {{ t('demos.scroll-view.zoom.label') }}
      </div>
    </FluereScrollView>
  </div>
</template>
