<script setup lang="ts">
import { FluereCaptionButtons, FluereCheckbox } from '@fluere-vue/ui'
import { computed, ref } from 'vue'

/**
 * `FluereCaptionButtons` 独立使用：它只做**逻辑代理** ——
 * 点击只抛 `minimize` / `maximize` / `restore` / `close` 与 `update:maximized`，
 * 不改变任何窗口状态；`maximized` 由消费方回传（这里用 `v-model:maximized` 演示）。
 *
 * 能力开关的口径（系统表现无 A 级源码，详见组件注释）：
 *   不可最小化 / 最大化 → 隐藏按钮；不可关闭 → 保留按钮但禁用。
 */
const { t } = useDocsI18n()

const maximized = ref(false)
const isMinimizable = ref(true)
const isMaximizable = ref(true)
const isClosable = ref(true)
const log = ref<string[]>([])

const labels = computed(() => ({
  minimize: t('demos.app-window.caption.minimize'),
  maximize: t('demos.app-window.caption.maximize'),
  restore: t('demos.app-window.caption.restore'),
  close: t('demos.app-window.caption.close'),
}))

const record = (label: string): void => {
  log.value = [label, ...log.value].slice(0, 4)
}
</script>

<template>
  <div class="flex flex-col gap-fluent-l py-fluent-s">
    <div
      class="flex items-center justify-between gap-fluent-l rounded-fluent-l border border-colorNeutralStroke1 bg-colorNeutralBackground1 px-fluent-l py-fluent-xs"
    >
      <div class="flex flex-wrap items-center gap-fluent-l">
        <FluereCheckbox v-model="isMinimizable">
          {{ t('demos.app-window.caption.minimizable') }}
        </FluereCheckbox>
        <FluereCheckbox v-model="isMaximizable">
          {{ t('demos.app-window.caption.maximizable') }}
        </FluereCheckbox>
        <FluereCheckbox v-model="isClosable">
          {{ t('demos.app-window.caption.closable') }}
        </FluereCheckbox>
      </div>
      <FluereCaptionButtons
        v-model:maximized="maximized"
        :is-minimizable="isMinimizable"
        :is-maximizable="isMaximizable"
        :is-closable="isClosable"
        :labels="labels"
        @minimize="record(labels.minimize)"
        @maximize="record(labels.maximize)"
        @restore="record(labels.restore)"
        @close="record(labels.close)"
      />
    </div>

    <span class="text-xs text-colorNeutralForeground3">
      {{
        log.length === 0
          ? t('demos.app-window.caption.notTriggered')
          : t('demos.app-window.caption.eventLog', { entries: log.join(' · ') })
      }}
    </span>
  </div>
</template>
