<script setup lang="ts">
import { FluereInfoBar } from '@fluere-vue/ui'
import { ref } from 'vue'

const { t } = useDocsI18n()

/**
 * `Closing` 可取消：把 `args.cancel` 置为 true，组件会把 `open` 回滚为 true
 * （对齐 WinUI `InfoBarClosingEventArgs.Cancel`）。下面的示例「先确认再关闭」。
 */
const open = ref(true)
const pendingAfterCancel = ref(false)
const closeCount = ref(0)
const lastReason = ref('—')

const onClosing = (args: { reason: string; cancel: boolean }) => {
  if (!pendingAfterCancel.value) {
    // 首次点击不真的关掉，演示「取消关闭」
    args.cancel = true
    pendingAfterCancel.value = true
    return
  }
  lastReason.value = args.reason
}
const onClosed = (args: { reason: string }) => {
  closeCount.value += 1
  lastReason.value = args.reason
  pendingAfterCancel.value = false
}
const reopen = () => {
  pendingAfterCancel.value = false
  open.value = true
}
</script>

<template>
  <div class="flex flex-col gap-fluent-l">
    <FluereInfoBar
      v-model:open="open"
      severity="warning"
      :title="t('demos.infobar.closable.title')"
      :message="t('demos.infobar.closable.message')"
      :close-button-label="
        pendingAfterCancel
          ? t('demos.infobar.closable.confirmDiscardLabel')
          : t('demos.common.close')
      "
      @closing="onClosing"
      @closed="onClosed"
    />

    <div class="flex items-center gap-fluent-m">
      <button
        type="button"
        class="fui-infobar-demo-btn"
        @click="reopen"
      >
        {{ t('demos.infobar.closable.reopenLabel') }}
      </button>
      <span class="text-sm text-colorNeutralForeground2">{{
        t('demos.infobar.closable.closeStats', { closeCount, lastReason })
      }}</span>
    </div>
  </div>
</template>

<style scoped>
.fui-infobar-demo-btn {
  height: 32px;
  padding-inline: var(--spacingHorizontalM);
  border: 1px solid var(--colorNeutralStroke1);
  border-radius: var(--borderRadiusMedium);
  background-color: var(--colorNeutralBackground1);
  color: var(--colorNeutralForeground1);
  font-family: var(--fontFamilyBase);
  font-size: var(--fontSizeBase300);
  cursor: pointer;
}
</style>
