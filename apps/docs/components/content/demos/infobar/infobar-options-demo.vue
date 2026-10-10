<script setup lang="ts">
import { FluereInfoBar } from '@fluere-vue/ui'
import { computed, ref } from 'vue'

const { t } = useDocsI18n()

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

/** 日志条目：没有事件时回落到「（未触发）」 */
const eventEntries = computed(() =>
  log.value.length > 0 ? log.value.join(' → ') : t('demos.infobar.options.notTriggered'),
)
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
      :close-button-label="t('demos.common.close')"
      :close-button-tooltip="t('demos.common.close')"
      @closing="onClosing"
      @closed="onClosed"
    />

    <FluereInfoBar
      v-model:open="open"
      severity="success"
      title="Title"
      :is-icon-visible="iconVisible"
      :is-closable="closable"
      :message="t('demos.infobar.options.sharedOpenMessage')"
      :close-button-label="t('demos.common.close')"
      :close-button-tooltip="t('demos.common.close')"
    />

    <p class="text-sm text-colorNeutralForeground2">
      {{ t('demos.infobar.options.eventLog', { entries: eventEntries }) }}
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
