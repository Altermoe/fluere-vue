<script setup lang="ts">
import { FluereButton, FluereContentDialog } from '@fluere-vue/ui'
import type { FluereContentDialogResult } from '@fluere-vue/ui'
import { ref } from 'vue'

/**
 * 可取消的关闭：`closing` 的 `args.cancel = true` 让弹窗留在原地。
 *
 * 与 WinUI 的差别：本库的 `cancel` 是同步标志（不做异步 Deferral），
 * 因此「确认删除」这类二次确认用一次 `closing` 就够了。
 */
const open = ref(false)
const needsConfirm = ref(true)
const log = ref<string[]>([])

const onClosing = (args: { result: FluereContentDialogResult; cancel: boolean }): void => {
  if (needsConfirm.value) {
    args.cancel = true
    needsConfirm.value = false
    log.value.push(`closing 被取消（result=${args.result}）`)
    return
  }
  log.value.push(`closing 放行（result=${args.result}）`)
}

const onClosed = (args: { result: FluereContentDialogResult }): void => {
  log.value.push(`closed(result=${args.result})`)
}

const show = (): void => {
  needsConfirm.value = true
  log.value = []
  open.value = true
}
</script>

<template>
  <div class="flex flex-col gap-fluent-l">
    <div class="flex items-center gap-fluent-m">
      <FluereButton
        data-cd-demo="cancel-open"
        @click="show"
      >
        打开（关闭需二次确认）
      </FluereButton>
      <span class="text-sm text-colorNeutralForeground2">第一次点「关闭」会被 cancel 拦下</span>
    </div>

    <ol
      v-if="log.length > 0"
      class="flex flex-col gap-fluent-xs text-sm text-colorNeutralForeground2"
    >
      <li
        v-for="(line, index) in log"
        :key="index"
      >
        {{ index + 1 }}. {{ line }}
      </li>
    </ol>

    <FluereContentDialog
      v-model:open="open"
      title="放弃未保存的更改？"
      primary-button-text="放弃"
      secondary-button-text="继续编辑"
      @closing="onClosing"
      @closed="onClosed"
    >
      第一次点击「放弃」或按 Esc 会被 `closing.cancel` 拦下，再点一次才真正关闭。
    </FluereContentDialog>
  </div>
</template>
