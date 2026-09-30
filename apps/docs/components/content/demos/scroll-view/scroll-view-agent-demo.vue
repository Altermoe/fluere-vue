<script setup lang="ts">
import { FluereScrollView, SCROLL_VIEW_AGENT_EVENTS } from '@fluere-vue/ui'
import type { ScrollingAgentSettledDetail } from '@fluere-vue/ui'
import { onBeforeUnmount, onMounted, ref } from 'vue'

/* 演示常量（避免 lint no-magic-numbers） */
const ROW_COUNT = 30
const AGENT_STEP = 200
const TARGET_ROW = 24
const TARGET_SELECTOR = `[data-row="${TARGET_ROW}"]`
const LOG_MAX = 4
const LOG_START = 0
const TOP_OFFSET = 0

const sv = ref<InstanceType<typeof FluereScrollView>>()
const reflected = ref('')
const log = ref<string[]>([])

const pushLog = (tag: string): void => {
  log.value = [tag, ...log.value].slice(LOG_START, LOG_MAX)
}

/** 只读反射：Agent 读的是 DOM 属性，不是组件实例 */
const refresh = (): void => {
  const root = sv.value?.$el as HTMLElement | undefined
  if (!root) {
    return
  }
  const { scrollX, scrollY, scrollMaxY, zoomFactor, scrollState } = root.dataset
  reflected.value = `x=${scrollX} y=${scrollY} maxY=${scrollMaxY} zoom=${zoomFactor} state=${scrollState}`
}

/** 模拟 Agent：只派发 DOM 命令事件，不接触组件实例 */
const send = (name: string, detail: unknown): void => {
  const root = sv.value?.$el as HTMLElement | undefined
  root?.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }))
  pushLog(`→ ${name} ${JSON.stringify(detail)}`)
}

/** 回执：命令落地（动画 / 惯性结束）后才派发，可用来等待稳定帧 */
const onSettled = (event: Event): void => {
  const detail = (event as CustomEvent<ScrollingAgentSettledDetail>).detail
  pushLog(`← settled x=${detail.x} y=${detail.y}`)
  refresh()
}

onMounted(() => {
  refresh()
  ;(sv.value?.$el as HTMLElement | undefined)?.addEventListener(
    SCROLL_VIEW_AGENT_EVENTS.settled,
    onSettled,
  )
})

onBeforeUnmount(() => {
  ;(sv.value?.$el as HTMLElement | undefined)?.removeEventListener(
    SCROLL_VIEW_AGENT_EVENTS.settled,
    onSettled,
  )
})
</script>

<template>
  <div>
    <div class="h-56">
      <FluereScrollView
        ref="sv"
        class="h-full"
        label="日志列表"
        @view-changed="refresh"
      >
        <div class="space-y-fluent-s p-fluent-m">
          <div
            v-for="index in ROW_COUNT"
            :key="index"
            :data-row="index"
            class="h-8 rounded-fluent-md bg-colorNeutralBackground2 border border-colorNeutralStroke2 flex items-center px-fluent-m text-xs text-colorNeutralForeground3"
          >
            第 {{ index }} 行
          </div>
        </div>
      </FluereScrollView>
    </div>

    <div class="mt-fluent-m flex flex-wrap gap-fluent-s items-center">
      <button
        class="px-fluent-m py-fluent-s rounded-fluent-md border border-colorNeutralStroke1 bg-colorNeutralBackground1 hover:bg-colorNeutralBackground1Hover text-sm"
        @click="
          send(SCROLL_VIEW_AGENT_EVENTS.scrollBy, { y: AGENT_STEP, animationMode: 'disabled' })
        "
      >
        模拟 Agent：下滚 {{ AGENT_STEP }}px
      </button>
      <button
        class="px-fluent-m py-fluent-s rounded-fluent-md border border-colorNeutralStroke1 bg-colorNeutralBackground1 hover:bg-colorNeutralBackground1Hover text-sm"
        @click="send(SCROLL_VIEW_AGENT_EVENTS.bringIntoView, { selector: TARGET_SELECTOR })"
      >
        模拟 Agent：把第 {{ TARGET_ROW }} 行滚入视口
      </button>
      <button
        class="px-fluent-m py-fluent-s rounded-fluent-md border border-colorNeutralStroke1 bg-colorNeutralBackground1 hover:bg-colorNeutralBackground1Hover text-sm"
        @click="send(SCROLL_VIEW_AGENT_EVENTS.scrollTo, { y: TOP_OFFSET })"
      >
        模拟 Agent：回到顶部
      </button>
    </div>

    <code class="mt-fluent-m block text-xs font-mono text-colorNeutralForeground3 break-all">
      {{ reflected || '（读取 data-* 中…）' }}
    </code>
    <ul class="mt-fluent-s space-y-fluent-xs">
      <li
        v-for="(line, index) in log"
        :key="index"
        class="text-xs font-mono text-colorNeutralForeground3"
      >
        {{ line }}
      </li>
    </ul>
  </div>
</template>
