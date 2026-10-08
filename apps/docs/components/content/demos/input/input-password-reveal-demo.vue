<script setup lang="ts">
import { FluereCheckbox, FluereInput } from '@fluere-vue/ui'
import { ref } from 'vue'

const showPassword = ref(false)
const password = ref('123456')
</script>

<template>
  <div class="flex max-w-sm flex-col gap-fluent-l">
    <div class="flex items-center gap-fluent-m">
      <!-- 布局类给宿主 div：FluereInput 的 attrs 会落到内层 input / textarea 上 -->
      <div class="flex-1">
        <FluereInput
          v-model="password"
          type="password"
          aria-label="示例密码框"
          :password-reveal-mode="showPassword ? 'visible' : 'hidden'"
        />
      </div>
      <FluereCheckbox v-model="showPassword">Show password</FluereCheckbox>
    </div>
    <p class="text-sm text-colorNeutralForeground3">
      对应 WinUI 官方样例的第三种形态：`passwordRevealMode` 在 `hidden` / `visible`
      之间由消费方切换， 此时不出现内建「显示」按钮（与 `peek` 模式互斥）。
    </p>
  </div>
</template>
