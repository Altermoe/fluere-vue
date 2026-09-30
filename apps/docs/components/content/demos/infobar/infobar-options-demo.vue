<script setup lang="ts">
import { FluereInfoBar } from '@fluere-vue/ui'
import { ref } from 'vue'

/** 对齐 Gallery 示例 3 的选项面板：Is Open / Is Icon Visible / Is Closable */
const open = ref(true)
const iconVisible = ref(true)
const closable = ref(true)

/** 记录真实关闭事件，便于观察 Closing / Closed 的时序与原因 */
const log = ref<string[]>([])
const onClosing = (args: { reason: string; cancel: boolean }) => {
  log.value = [...log.value, `closing(${args.reason})`]
}
const onClosed = (args: { reason: string }) => {
  log.value = [...log.value, `closed(${args.reason})`]
}
</script>

<template>
  <div class="flex flex-col gap-fluent-l">
    <div class="fui-infobar-demo-options">
      <label>
        <input
          v-model="open"
          type="checkbox"
        />
        Is Open
      </label>
      <label>
        <input
          v-model="iconVisible"
          type="checkbox"
        />
        Is Icon Visible
      </label>
      <label>
        <input
          v-model="closable"
          type="checkbox"
        />
        Is Closable
      </label>
    </div>

    <FluereInfoBar
      v-model:open="open"
      title="Title"
      :is-icon-visible="iconVisible"
      :is-closable="closable"
      message="Essential app message for your users to be informed of, acknowledge, or take action on."
      close-button-label="关闭"
      close-button-tooltip="关闭"
      @closing="onClosing"
      @closed="onClosed"
    />

    <FluereInfoBar
      v-model:open="open"
      severity="success"
      title="Title"
      :is-icon-visible="iconVisible"
      :is-closable="closable"
      message="两个 InfoBar 共用同一个 Is Open，切换时都能同步。"
      close-button-label="关闭"
      close-button-tooltip="关闭"
    />

    <p class="text-sm text-colorNeutralForeground2">
      事件日志：{{ log.length > 0 ? log.join(' → ') : '（未触发）' }}
    </p>
  </div>
</template>

<style scoped>
.fui-infobar-demo-options {
  display: flex;
  flex-direction: column;
  gap: var(--spacingVerticalS);
  font-family: var(--fontFamilyBase);
  font-size: var(--fontSizeBase300);
  color: var(--colorNeutralForeground1);
}
</style>
