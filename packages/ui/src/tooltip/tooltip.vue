<script lang="ts">
/**
 * FluereTooltip 组件 Props 契约
 *
 * 设计规范来源、读到的规范条目、WinUI 资源名 → Fluent token 映射、以及与本库
 * 有意为之的差异，全部集中在 `./types.ts` 的文件头注释里（单一事实源）；
 * 样式与结构在 `./tooltip-fixture.vue`（逐条标注对应的 WinUI 资源名）。
 *
 * 结构（对齐 WinUI `ToolTip_themeresources.xaml#DefaultToolTipStyle` 的 Template）：
 *   Popup（本库 = Teleport 到 body 的浮层）
 *     └ LayoutRoot（ContentPresenter：背景 / 描边 / 圆角 / 内边距 / MaxWidth / 文本换行）
 *         └ Content（本库 = `content` Prop 或 `#content` 插槽）
 * WinUI 的 Template 里**没有箭头 / 尖角**，所以本组件也不渲染 Pointer 指示器。
 *
 * 动效（对齐 `OpenStates` 的两个 VisualState）：
 *   Opened → `FadeInThemeAnimation`(LayoutRoot)：opacity 0 → 1
 *   Closed → `FadeOutThemeAnimation`(LayoutRoot)：opacity 1 → 0
 *   两者都是线性淡入淡出、只改 opacity。时长常量落在非公开的 `vsanimation.h`，
 *   公开源码树取不到 ⇒ 取 `--durationFaster`(100ms) + `--curveLinear`，并落成组件
 *   局部变量 `--fui-tooltip-fade-duration`（见 types.ts 的「动效取值」说明）。
 *   透明度放在**外层定位节点**上（`Presence` 以它的 `animationend` 决定卸载时机，
 *   同 ContentDialog 的结构决策，见 style-spec §7）。
 *
 * `prefers-reduced-motion` 下动画全部关闭，静态形态是「完全可见的提示面」，
 * 不会留下透明或半透明的残留（对应 WinUI 关闭动画后 `Opacity` 的稳态值）。
 */
export type { FluereTooltipAlign, FluereTooltipPlacement, FluereTooltipProps } from './types'
</script>

<script setup lang="ts">
import { TooltipRoot } from 'reka-ui'
import { computed, inject, ref, useId, useSlots, watch } from 'vue'
import FluereTooltipFixture from './tooltip-fixture.vue'
import FluereTooltipProvider from './tooltip-provider.vue'
import { TOOLTIP_PROVIDER_FLAG } from './types'
import type { FluereTooltipProps } from './types'

defineOptions({
  name: 'FluereTooltip',
  /**
   * 关闭属性继承：本组件模板有多个根节点，开启继承会让 `class` / `id` 之类的透传属性
   * 落到**触发元素**（`.fui-tooltip` 会被误挂到用户的按钮上）。
   */
  inheritAttrs: false,
})

const props = withDefaults(defineProps<FluereTooltipProps>(), {
  // WinUI `ToolTip.Placement` 的 DefaultPlacementMode 即 Top
  placement: 'top',
  // WinUI 的 Popup 在 Arrange 里按目标 Rect 计算偏移；参考图（WinUI3 Gallery
  // SampleCard + Button）实测间隙 4px
  sideOffset: 4,
  align: 'center',
  disabled: false,
  content: undefined,
  open: undefined,
  delayDuration: undefined,
  label: undefined,
})

const emit = defineEmits<{
  /** 展开状态变化；对齐 WinUI `ToolTip.IsOpen` 被改写（含 `v-model:open`） */
  'update:open': [value: boolean]
}>()

const slots = useSlots()

/**
 * 无障碍关联用的 id：reka 的触发元素靠 `aria-describedby` 指向内容里的
 * `VisuallyHidden role="tooltip"` 元素。reka 自己生成的那条 id 走内部 `useId`，
 * 而本组件包了一层后它不再把 `id` 透传给隐藏元素（`useForwardProps` 只保留
 * **显式写在模板上**的 props），于是 `aria-describedby` 会指向一个不存在的 id。
 * 这里用 Vue 的 `useId()` 生成（SSR / 水合一致，见 docs/ssr-guide.md），
 * 同时显式传给 `TooltipContent`，保证两侧 id 相同。
 */
const contentId = useId()

/** 受控 / 非受控：`open === undefined` 时不把 `open` 透传给 reka，交回它自己管理 */
const isControlled = computed(() => props.open !== undefined)

/** 真实展开状态：受控时跟 Prop 走，非受控时由 reka 抛回的 update:open 同步 */
const isOpen = ref(props.open ?? false)
watch(
  () => props.open,
  (value) => {
    if (value !== undefined) {
      isOpen.value = value
    }
  },
)

const onOpenChange = (value: boolean) => {
  isOpen.value = value
  emit('update:open', value)
}

/** 是否渲染提示内容（有文本 Prop 或有 `#content` 插槽） */
const hasContent = computed(() => Boolean(props.content) || Boolean(slots.content))

/**
 * WinUI 的 `ToolTipService` 是进程级服务、必然存在；reka 的 `TooltipProvider` 是可选的。
 * 祖先没有 `FluereTooltipProvider` 时，本组件自带一层缺省 Provider（400 / 200，与
 * `ToolTipService` 的缺省值一致），于是**不套 Provider 也能直接使用**；祖先提供了
 * 的话就直接挂 `TooltipRoot`，沿用祖先的配置（否则会破坏「多个 ToolTip 共享重展示
 * 窗口」的手感）。
 */
const hasAncestorProvider = inject(TOOLTIP_PROVIDER_FLAG, false)

/** `TooltipRoot` 的 Props（两条分支共用，避免写两遍） */
const rootProps = computed(() => ({
  open: isControlled.value ? props.open : undefined,
  delayDuration: props.delayDuration,
  disableHoverableContent: true,
  disabled: props.disabled || !hasContent.value,
}))

/** `FluereTooltipFixture` 的 Props（两条分支共用） */
const fixtureProps = computed(() => ({
  contentId,
  placement: props.placement,
  sideOffset: props.sideOffset,
  align: props.align,
  label: props.label,
  content: props.content,
  present: isOpen.value && !props.disabled,
}))
</script>

<template>
  <!--
    根节点结构：`TooltipRoot` 始终是唯一负责 open 状态与上下文的那一层；
    祖先没有 `FluereTooltipProvider` 时，在它外面再包一层缺省 Provider
    （400 / 200，与 WinUI `ToolTipService` 的缺省值一致），于是**不套 Provider
    也能直接使用**。`FluereTooltipFixture` 承载「触发元素 + 门户 + 提示面」。
  -->
  <FluereTooltipProvider
    v-if="!hasAncestorProvider"
    :delay-duration="400"
    :skip-delay-duration="200"
  >
    <TooltipRoot
      v-bind="rootProps"
      @update:open="onOpenChange"
    >
      <FluereTooltipFixture v-bind="fixtureProps">
        <template #trigger>
          <slot />
        </template>
        <template #content>
          <slot name="content">{{ content }}</slot>
        </template>
      </FluereTooltipFixture>
    </TooltipRoot>
  </FluereTooltipProvider>

  <TooltipRoot
    v-else
    v-bind="rootProps"
    @update:open="onOpenChange"
  >
    <FluereTooltipFixture v-bind="fixtureProps">
      <template #trigger>
        <slot />
      </template>
      <template #content>
        <slot name="content">{{ content }}</slot>
      </template>
    </FluereTooltipFixture>
  </TooltipRoot>
</template>
