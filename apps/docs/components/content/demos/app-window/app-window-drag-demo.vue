<script setup lang="ts">
import { FluereAppWindow } from '@fluere-vue/ui'
import { computed, ref } from 'vue'

/**
 * 拖拽由**外部外壳**负责：组件只抛 `dragStart` / `dragMove` / `dragEnd`
 * （逐次位移 `deltaX/deltaY` + 累计位移 `totalDeltaX/totalDeltaY`），
 * 位置与尺寸由消费方决定 —— 这正是 `docs/todo.md` 0.5.1 的「可拖拽设计」口径：
 * 组件不写 `position` / `inset` / `transform`，也不管层级。
 *
 * 本示例用 CSS `translate`（而非 `left` / `top`）承载位移：
 *   - `translate` 走合成层、不触发重排 / 重绘，拖拽更顺滑；
 *   - 开 `:round-to-integer="true"`（内部 `useDragRegion` 的取整配置）后，
 *     `dragMove` 的累计位移按「差值取整」收敛，translate 值恒为整数、
 *     不产生亚像素模糊，也不累积取整误差。
 *
 * 双击标题栏只抛 `titlebarDoubleClick`（Windows 11 的系统行为是切换最大化），
 * 这里由外壳把它翻成最大化状态，组件自身不自行改状态。
 */
const { t } = useDocsI18n()

const x = ref(24)
const y = ref(24)
/** 拖拽起点（按下时的窗口位置），`dragMove` 的累计位移直接叠在它上面 */
const origin = ref({ x: 0, y: 0 })
const maximized = ref(false)
const lastMove = ref(0)

/** CSS `translate` 承载位移；最大化时归零并由 `inset` 铺满画布 */
const translate = computed(() => (maximized.value ? '0px 0px' : `${x.value}px ${y.value}px`))
const inset = computed(() => (maximized.value ? '0px' : undefined))

const onDragStart = (): void => {
  origin.value = { x: x.value, y: y.value }
}
const onDragMove = (args: { totalDeltaX: number; totalDeltaY: number }): void => {
  x.value = origin.value.x + args.totalDeltaX
  y.value = origin.value.y + args.totalDeltaY
  lastMove.value = Math.round(Math.hypot(args.totalDeltaX, args.totalDeltaY))
}
const toggleMaximize = (): void => {
  maximized.value = !maximized.value
}
</script>

<template>
  <div class="flex flex-col gap-fluent-l py-fluent-s">
    <div
      class="relative h-[320px] w-full overflow-hidden rounded-fluent-l border border-colorNeutralStroke2 bg-colorNeutralBackground3"
    >
      <FluereAppWindow
        class="absolute h-[200px] w-[380px] transition-[translate,border-radius] duration-150"
        :style="{ translate, ...(inset ? { inset } : {}) }"
        :title="t('demos.app-window.drag.title')"
        :maximized="maximized"
        :round-to-integer="true"
        @drag-start="onDragStart"
        @drag-move="onDragMove"
        @titlebar-double-click="toggleMaximize"
      >
        <template #content>
          <div class="flex flex-col gap-fluent-xs p-fluent-l text-xs text-colorNeutralForeground3">
            <span>{{ t('demos.app-window.drag.position', { x, y }) }}</span>
            <span>{{ t('demos.app-window.drag.distance', { distance: lastMove }) }}</span>
            <span>{{ t('demos.app-window.drag.hint') }}</span>
          </div>
        </template>
      </FluereAppWindow>
    </div>
  </div>
</template>
