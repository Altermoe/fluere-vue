<script setup lang="ts">
import { FluereInput } from '@fluere-vue/ui'
import { ref } from 'vue'

const simple = ref('')
const custom = ref('secret')
</script>

<template>
  <div class="flex flex-col gap-fluent-l max-w-sm">
    <FluereInput
      v-model="simple"
      type="password"
      placeholder="请输入密码"
    />
    <FluereInput
      v-model="custom"
      type="password"
      header="密码"
      placeholder="请输入密码"
      password-char="#"
    />
    <p class="text-sm text-colorNeutralForeground3">
      WinUI
      规则：聚焦后按钮才出现，且只在本次聚焦期间「从空输入了内容」之后。上面的密码框预置了内容，
      清空后重新输入即可看到按钮；下面那个未预置内容的（原生掩码路径）直接输入就会出现。
    </p>
  </div>
</template>
