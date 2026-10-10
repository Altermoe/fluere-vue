<script setup lang="ts">
import { FluereInput } from '@fluere-vue/ui'

const { t } = useDocsI18n()
</script>

<template>
  <div class="flex flex-col gap-fluent-l max-w-sm">
    <FluereInput
      appearance="outline"
      :placeholder="t('demos.input.appearance.outlinePlaceholder')"
    />
    <FluereInput
      appearance="underline"
      :placeholder="t('demos.input.appearance.underlinePlaceholder')"
    />
  </div>
</template>
