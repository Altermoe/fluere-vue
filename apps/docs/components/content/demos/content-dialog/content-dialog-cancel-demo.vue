<script setup lang="ts">
import { FluereButton, FluereContentDialog } from '@fluere-vue/ui'
import type { FluereContentDialogResult } from '@fluere-vue/ui'
import { ref } from 'vue'

const { t } = useDocsI18n()

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
    log.value.push(t('demos.content-dialog.cancel.closingCancelled', { result: args.result }))
    return
  }
  log.value.push(t('demos.content-dialog.cancel.closingAllowed', { result: args.result }))
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
        {{ t('demos.content-dialog.cancel.openLabel') }}
      </FluereButton>
      <span class="text-sm text-colorNeutralForeground2">{{
        t('demos.content-dialog.cancel.note')
      }}</span>
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
      :title="t('demos.content-dialog.cancel.title')"
      :primary-button-text="t('demos.content-dialog.cancel.discardLabel')"
      :secondary-button-text="t('demos.content-dialog.cancel.keepEditingLabel')"
      @closing="onClosing"
      @closed="onClosed"
    >
      {{ t('demos.content-dialog.cancel.description') }}
    </FluereContentDialog>
  </div>
</template>
