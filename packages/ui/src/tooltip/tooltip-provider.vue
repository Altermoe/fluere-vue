<script lang="ts">
/**
 * FluereTooltipProvider —— 一组 ToolTip 的共享延时上下文
 *
 * 为什么需要它：WinUI 的 `ToolTipService` 是**进程级**服务，`InitialShowDelay` /
 * `BetweenShowDelay` 是全局设定，而不是每个 ToolTip 各自一份。这里用 reka 的
 * `TooltipProvider` 表达同一语义：把一组（通常是一棵子树里的）ToolTip 包起来，
 * 于是「鼠标在控件之间快速移动」时共享同一个 200ms 重展示窗口 —— 这是 WinUI
 * 手感的关键一环（`ToolTipService_Partial.cpp` 的 `useReshowTimer` 判据）。
 *
 * 规范来源与资源映射见 `./types.ts`。SSR 安全：本组件只 provide/inject 响应式状态，
 * 不触碰 `window` / `document`，服务端与客户端输出一致。
 */
export type { FluereTooltipProviderProps } from './types'
</script>

<script setup lang="ts">
import { TooltipProvider } from 'reka-ui'
import { provide } from 'vue'
import { TOOLTIP_PROVIDER_FLAG } from './types'
import type { FluereTooltipProviderProps } from './types'

defineOptions({ name: 'FluereTooltipProvider' })

withDefaults(defineProps<FluereTooltipProviderProps>(), {
  // WinUI：SPI_GETMOUSEHOVERTIME(400ms) × 2（Mouse / Keyboard 的首次显示倍率）
  delayDuration: 400,
  // WinUI：BETWEEN_SHOW_DELAY_MS = 200
  skipDelayDuration: 200,
})

// 标记「已有 Provider」：FluereTooltip 据此决定是否需要自带缺省 Provider
provide(TOOLTIP_PROVIDER_FLAG, true)
</script>

<template>
  <TooltipProvider
    :delay-duration="delayDuration"
    :skip-delay-duration="skipDelayDuration"
  >
    <slot />
  </TooltipProvider>
</template>
