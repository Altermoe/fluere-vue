<script setup lang="ts">
/**
 * FluereScrollView 组件：WinUI 3（Windows App SDK）ScrollView 的 Web 对齐实现。
 * 参考：https://github.com/microsoft/microsoft-ui-xaml/tree/main/specs/ScrollingControls
 *
 * 本文件仅做「装配」：创建 core 并组合各职责 composable（测量 / 动画 / 惯性 /
 * 锚点 / 滚轮 / 触控 / 滚动条 / 键盘），业务逻辑按功能拆分到同目录模块：
 *
 *  - core.ts                   视图状态与基础视图操作（单一事实来源）
 *  - use-scroll-bars.ts        滚动条展示时机与拇指几何
 *  - use-measurement.ts        尺寸测量与约束联动
 *  - use-animation.ts          rAF 动画引擎与缓动曲线
 *  - use-inertia.ts            惯性滑行
 *  - use-scroll-api.ts         程序化 API（scrollTo / zoomTo / velocity …）
 *  - use-bring-into-view.ts    元素滚动进视口（BringIntoView）
 *  - use-agent-surface.ts      Agent 交互面（状态反射 + DOM 命令事件）
 *  - use-anchor.ts             锚点逻辑
 *  - use-wheel-input.ts        滚轮与滚动链式传递
 *  - use-pointer-input.ts      触控 / 笔平移（含手势分发）
 *  - use-pinch-input.ts        双指捏合缩放
 *  - use-scrollbar-input.ts    滚动条拖拽 / 轨道翻页 / 两端步进按钮
 *  - use-keyboard-input.ts     键盘方向键滚动
 *
 * Props 类型定义见 ./types.ts（对外由 @fluere-vue/ui 重新导出）。
 */

import { useScopeMessages } from '@fluere-vue/hooks'
import type { FluereLocale } from '@fluere-vue/utils'
import { computed, useId } from 'vue'
import { createScrollViewCore } from './core'
import { createScrollViewEvents } from './events'
import { scrollViewLocale } from './locale'
import type { FluereScrollViewProps, ScrollViewEmits } from './types'
import { useAgentSurface } from './use-agent-surface'
import { useAnchor } from './use-anchor'
import { useAnimation } from './use-animation'
import { useBringIntoView } from './use-bring-into-view'
import { useInertia } from './use-inertia'
import { useKeyboardInput } from './use-keyboard-input'
import { useMeasurement } from './use-measurement'
import { usePointerInput } from './use-pointer-input'
import { useScrollApi } from './use-scroll-api'
import { useScrollBars } from './use-scroll-bars'
import { useScrollbarInput } from './use-scrollbar-input'
import type { StepDirection } from './use-scrollbar-input'
import { useWheelInput } from './use-wheel-input'
/* ------------------------------------------------------------------ */
/* 轨道两端步进按钮描述（key 决定箭头朝向，direction 为偏移增量方向）    */
/* ------------------------------------------------------------------ */

interface TrackStep {
  key: 'decrement' | 'increment'
  direction: StepDirection
  /** 步进按钮的可访问名称 */
  label: string
}

/* ------------------------------------------------------------------ */
/* Props / Emits                                                       */
/* ------------------------------------------------------------------ */

const props = withDefaults(defineProps<FluereScrollViewProps>(), {
  contentOrientation: 'vertical',
  horizontalScrollMode: 'enabled',
  verticalScrollMode: 'enabled',
  horizontalScrollBarVisibility: 'auto',
  verticalScrollBarVisibility: 'auto',
  horizontalScrollChainMode: 'auto',
  verticalScrollChainMode: 'auto',
  horizontalScrollRailMode: 'enabled',
  verticalScrollRailMode: 'enabled',
  zoomMode: 'disabled',
  zoomChainMode: 'auto',
  ignoredInputKinds: () => [],
  minZoomFactor: 0.1,
  maxZoomFactor: 10,
  horizontalAnchorRatio: Number.NaN,
  verticalAnchorRatio: Number.NaN,
  background: undefined,
  tabIndex: 0,
  label: undefined,
  agentCommands: true,
})

/* ---- 内建文案：scope=`scroll-view`，locale prop 优先、否则跟随 Provider ---- */
const scrollI18n = useScopeMessages('scroll-view', scrollViewLocale, () => props.locale)

/** 两端步进按钮描述：label 随 locale 解析（template 自动解包 computed） */
const VERTICAL_TRACK_STEPS = computed<TrackStep[]>(() => [
  { key: 'decrement', direction: -1, label: scrollI18n.t('scrollUp') },
  { key: 'increment', direction: 1, label: scrollI18n.t('scrollDown') },
])
const HORIZONTAL_TRACK_STEPS = computed<TrackStep[]>(() => [
  { key: 'decrement', direction: -1, label: scrollI18n.t('scrollLeft') },
  { key: 'increment', direction: 1, label: scrollI18n.t('scrollRight') },
])

const emit = defineEmits<ScrollViewEmits>()

/**
 * 内容元素 id：滚动条的 `aria-controls` 需要指回被滚动的元素。
 * 用 `useId()` 而非 `getCurrentInstance().uid`，保证 SSR 与水合一致
 * （见 docs/ssr-guide.md 第 9 节）。
 */
const contentId = `fui-scrollview-content-${useId()}`

/** 只在提供了可访问名时才加 `role="region"`：未命名的地标不如不加 */
const rootRole = computed(() => (props.label === undefined ? undefined : 'region'))

/* ------------------------------------------------------------------ */
/* 装配：创建核心状态并按职责组合各 composable                          */
/* ------------------------------------------------------------------ */

const core = createScrollViewCore(props, createScrollViewEvents(emit))
const bars = useScrollBars(core)
const animation = useAnimation(core, bars)
const inertia = useInertia(core, animation)
const api = useScrollApi(core, animation, inertia)
const bringIntoViewController = useBringIntoView(core, animation)
const agent = useAgentSurface(core, api, bringIntoViewController)
const anchor = useAnchor(core)
useMeasurement(core, anchor)
const wheel = useWheelInput(core, bars, api, animation)
const pointer = usePointerInput(core, bars, animation, inertia)
const scrollbar = useScrollbarInput(core, bars, api, animation, inertia)
const keyboard = useKeyboardInput(core, api)

/* 模板用到的绑定（顶层解构，确保模板内 ref 自动解包） */
const {
  rootEl,
  viewportEl,
  contentEl,
  vBarEl,
  vThumbEl,
  hBarEl,
  hThumbEl,
  computedHBarVisible,
  computedVBarVisible,
  contentOrientationClass,
  rootStyle,
} = core
const {
  barsVisible,
  barsImmediate,
  panningActive,
  trackExpanded,
  onPointerOverViewport,
  onPointerOutViewport,
  onBarPointerEnter,
  onBarPointerLeave,
} = bars
/** Agent 交互面：只读反射属性 + 滚动条 ARIA + 入站命令处理器（同样顶层解构） */
const {
  scrollX,
  scrollY,
  maxScrollX,
  maxScrollY,
  zoomFactor,
  scrollState,
  ariaValueNowX,
  ariaValueNowY,
  ariaValueMaxX,
  ariaValueMaxY,
  onScrollTo,
  onScrollBy,
  onBringIntoView,
} = agent

/** 双轴滚动条同时可见：两条轨道需各自让出角落，避免两端箭头相互重叠 */
const bothBarsVisible = computed(() => computedHBarVisible.value && computedVBarVisible.value)

/* ------------------------------------------------------------------ */
/* 对外暴露：只读状态 getter + 程序化方法                                */
/* ------------------------------------------------------------------ */

defineExpose({
  get horizontalOffset() {
    return core.offsetX.value
  },
  get verticalOffset() {
    return core.offsetY.value
  },
  get zoomFactor() {
    return core.zoomFactor.value
  },
  get extentWidth() {
    return core.extentWidth.value
  },
  get extentHeight() {
    return core.extentHeight.value
  },
  get viewportWidth() {
    return core.viewportWidth.value
  },
  get viewportHeight() {
    return core.viewportHeight.value
  },
  get scrollableWidth() {
    return core.scrollableWidth.value
  },
  get scrollableHeight() {
    return core.scrollableHeight.value
  },
  get state() {
    return core.interactionState.value
  },
  get currentAnchor() {
    return core.currentAnchor.value
  },
  scrollTo: api.scrollTo,
  scrollBy: api.scrollBy,
  zoomTo: api.zoomTo,
  zoomBy: api.zoomBy,
  addScrollVelocity: api.addScrollVelocity,
  addZoomVelocity: api.addZoomVelocity,
  bringIntoView: bringIntoViewController.bringIntoView,
  registerAnchorCandidate: anchor.registerAnchorCandidate,
  unregisterAnchorCandidate: anchor.unregisterAnchorCandidate,
})
</script>

<template>
  <div
    ref="rootEl"
    class="fui-scrollview"
    :class="{
      'fui-scrollview--bars-visible': barsVisible,
      'fui-scrollview--bars-expanded': trackExpanded,
      'fui-scrollview--bars-immediate': barsImmediate,
      'fui-scrollview--panning': panningActive,
      'fui-scrollview--both-bars': bothBarsVisible,
    }"
    :style="rootStyle"
    :role="rootRole"
    :aria-label="props.label"
    :data-scroll-x="scrollX"
    :data-scroll-y="scrollY"
    :data-scroll-max-x="maxScrollX"
    :data-scroll-max-y="maxScrollY"
    :data-zoom-factor="zoomFactor"
    :data-scroll-state="scrollState"
    :tabindex="props.tabIndex"
    @wheel="wheel.onWheel"
    @keydown="keyboard.onKeyDown"
    @pointerover="onPointerOverViewport"
    @pointerout="onPointerOutViewport"
    @fluere:scroll-to="onScrollTo"
    @fluere:scroll-by="onScrollBy"
    @fluere:bring-into-view="onBringIntoView"
  >
    <div
      ref="viewportEl"
      class="fui-scrollview__presenter"
      @focusin="bringIntoViewController.onFocusIn"
      @pointerdown="pointer.onPointerDown"
      @pointermove="pointer.onPointerMove"
      @pointerup="pointer.onPointerUp"
      @pointercancel="pointer.onPointerUp"
    >
      <div
        ref="contentEl"
        :id="contentId"
        class="fui-scrollview__content"
        :class="contentOrientationClass"
      >
        <slot />
      </div>
    </div>

    <!-- 横向滚动条：轨道（药丸 + 两端步进按钮）在下，滑块在上 -->
    <div
      v-if="computedHBarVisible"
      ref="hBarEl"
      class="fui-scrollview__scrollbar fui-scrollview__scrollbar--horizontal"
      @pointerenter="onBarPointerEnter"
      @pointerleave="onBarPointerLeave"
      @pointerdown="scrollbar.onHBarPointerDown"
      @pointermove="scrollbar.onThumbPointerMove"
      @pointerup="scrollbar.onBarPointerUp"
      @pointercancel="scrollbar.onBarPointerUp"
      @lostpointercapture="scrollbar.onBarPointerUp"
    >
      <div class="fui-scrollview__track">
        <button
          v-for="step in HORIZONTAL_TRACK_STEPS"
          :key="step.key"
          type="button"
          tabindex="-1"
          class="fui-scrollview__track-button"
          :class="`fui-scrollview__track-button--${step.key}`"
          :aria-label="step.label"
          @pointerdown="scrollbar.onStepPointerDown('horizontal', step.direction, $event)"
        >
          <svg
            class="fui-scrollview__track-arrow"
            viewBox="0 0 8 5"
            aria-hidden="true"
          >
            <path d="M1 3.7 4 0.9 7 3.7Z" />
          </svg>
        </button>
      </div>
      <div
        ref="hThumbEl"
        class="fui-scrollview__thumb fui-scrollview__thumb--horizontal"
        role="scrollbar"
        tabindex="-1"
        aria-orientation="horizontal"
        :aria-label="scrollI18n.t('horizontalScrollBar')"
        aria-valuemin="0"
        :aria-valuemax="ariaValueMaxX"
        :aria-valuenow="ariaValueNowX"
        :aria-controls="contentId"
      />
    </div>
    <!-- 纵向滚动条：结构与横向一致，仅轴向不同 -->
    <div
      v-if="computedVBarVisible"
      ref="vBarEl"
      class="fui-scrollview__scrollbar fui-scrollview__scrollbar--vertical"
      @pointerenter="onBarPointerEnter"
      @pointerleave="onBarPointerLeave"
      @pointerdown="scrollbar.onVBarPointerDown"
      @pointermove="scrollbar.onThumbPointerMove"
      @pointerup="scrollbar.onBarPointerUp"
      @pointercancel="scrollbar.onBarPointerUp"
      @lostpointercapture="scrollbar.onBarPointerUp"
    >
      <div class="fui-scrollview__track">
        <button
          v-for="step in VERTICAL_TRACK_STEPS"
          :key="step.key"
          type="button"
          tabindex="-1"
          class="fui-scrollview__track-button"
          :class="`fui-scrollview__track-button--${step.key}`"
          :aria-label="step.label"
          @pointerdown="scrollbar.onStepPointerDown('vertical', step.direction, $event)"
        >
          <svg
            class="fui-scrollview__track-arrow"
            viewBox="0 0 8 5"
            aria-hidden="true"
          >
            <path d="M1 3.7 4 0.9 7 3.7Z" />
          </svg>
        </button>
      </div>
      <div
        ref="vThumbEl"
        class="fui-scrollview__thumb fui-scrollview__thumb--vertical"
        role="scrollbar"
        tabindex="-1"
        aria-orientation="vertical"
        :aria-label="scrollI18n.t('verticalScrollBar')"
        aria-valuemin="0"
        :aria-valuemax="ariaValueMaxY"
        :aria-valuenow="ariaValueNowY"
        :aria-controls="contentId"
      />
    </div>
    <div
      v-if="bothBarsVisible"
      class="fui-scrollview__separator"
    />
  </div>
</template>

<style src="./scroll-view.css" scoped />
