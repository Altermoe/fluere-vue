<script lang="ts">
/**
 * FluerePortal —— 共享「门户」原语（`packages/ui` 内部使用，不进公开入口）。
 *
 * 为什么需要它：弹层类组件必须把 DOM 挪到 `document.body`，否则会被祖先的
 * `transform` / `overflow: clip` / `z-index` 上下文吞掉（文档站内容区就是
 * 自带 `transform` 的 ScrollView，见 temp/pw-*.mjs 的同样结论）。
 *
 * SSR 策略（对应 docs/ssr-guide.md 的 Level 1B「挂载后写入」）：
 *  - 服务端与客户端**首次渲染**都不输出任何内容，服务端因此不会产生
 *    `<teleport>` 占位、也不会与客户端水合结果不一致；
 *  - `onMounted` 之后才真正把插槽内容 Teleport 到目标节点。
 * 因此浮层组件在服务端恒为空，消费方无需再包 `<ClientOnly>`。
 *
 * 与 reka-ui 的关系：本原语只解决「什么时候、挪到哪」；reka 的 `DialogPortal`
 * 还绑定了 Dialog 上下文（focus trap / dismissable layer），因此它是 Dialog 侧的
 * 门户实现，本原语供不依赖 Dialog 上下文的浮层（如遮罩层）复用。
 */
export interface FluerePortalProps {
  /**
   * Teleport 目标：CSS 选择器或元素本身
   * @default 'body'
   */
  to?: string | HTMLElement

  /**
   * 是否禁用 Teleport（为 true 时在原位渲染，便于测试与内联布局场景）
   * @default false
   */
  disabled?: boolean
}
</script>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

defineOptions({ name: 'FluerePortal' })

withDefaults(defineProps<FluerePortalProps>(), {
  to: 'body',
  disabled: false,
})

/** 挂载标记：服务端 / 首次水合渲染为空，避免 teleport 占位引发水合不匹配 */
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})
</script>

<template>
  <Teleport
    v-if="mounted"
    :to="to"
    :disabled="disabled"
  >
    <slot />
  </Teleport>
</template>
