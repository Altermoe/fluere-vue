<script setup lang="ts">
import { FluereInput } from '@fluere-vue/ui'
import { ref } from 'vue'

const displayName = ref('')
const email = ref('')
</script>

<template>
  <div class="flex max-w-sm flex-col gap-fluent-l">
    <FluereInput
      v-model="displayName"
      header="显示名称"
      description="将展示在个人资料页"
    />
    <FluereInput
      v-model="email"
      type="email"
      description="用于接收通知，不会公开"
    >
      <template #header>邮箱 <span class="text-colorStatusDangerForeground1">*</span></template>
    </FluereInput>
    <p class="text-sm text-colorNeutralForeground3">
      标题渲染成 <code>aria-labelledby</code> 指向的元素，说明挂到
      <code>aria-describedby</code>；两者都可用具名插槽替换默认文案。
    </p>
  </div>
</template>
