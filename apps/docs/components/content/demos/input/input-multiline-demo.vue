<script setup lang="ts">
import { FluereInput } from '@fluere-vue/ui'
import { ref } from 'vue'

const note = ref('')
const feedback = ref('第一行\n第二行')
</script>

<template>
  <div class="flex max-w-md flex-col gap-fluent-l">
    <FluereInput
      v-model="note"
      multiline
      header="备注"
      description="缺省 3 行，可拖动右下角调整高度"
      placeholder="请输入备注"
    />
    <FluereInput
      v-model="feedback"
      multiline
      :rows="6"
      header="反馈"
      description="rows=6"
    />
  </div>
</template>
