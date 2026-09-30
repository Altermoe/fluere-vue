<script setup lang="ts">
/**
 * TooltipFixture —— `FluereTooltip` 的「触发元素 + 门户 + 提示面」模板片段。
 *
 * 为什么单独拆一个文件：宿主既可能是 `TooltipProvider`（本组件自带的缺省 Provider）
 * 也可能是 `TooltipRoot`（祖先已经提供 Provider），两条路径都要渲染同一段结构；
 * 抽成组件后模板只写一遍。它自己不读 reka 的上下文，上下文由**外层的 TooltipRoot**
 * 提供（内层再包一层 TooltipRoot 时读的仍是最近的那一层）。
 */
import { Presence, TooltipContent, TooltipPortal, TooltipTrigger } from 'reka-ui'
import { onMounted, ref } from 'vue'
import type { FluereTooltipAlign, FluereTooltipPlacement } from './types'

defineOptions({
  name: 'FluereTooltipFixture',
  /**
   * 关闭属性继承：本组件模板有多个根节点，开启继承会把透传属性落到**触发元素**上
   * （例如 `class` 被误挂到用户的按钮上）。
   */
  inheritAttrs: false,
})

defineProps<{
  /** 无障碍关联用的 id（由外层用 `useId()` 生成后统一传给内容与触发元素） */
  contentId: string
  placement: FluereTooltipPlacement
  sideOffset: number
  align: FluereTooltipAlign
  label?: string | undefined
  content?: string | undefined
  /** 内容是否可见（由外层推导，供 `Presence` 决定卸载时机） */
  present: boolean
}>()

/**
 * reka 的 `TooltipPortal` 在服务端与首次水合都会输出 `<teleport>` 占位 —— 与本库
 * 「挂载后才 Teleport」的 SSR 策略不一致（见 docs/ssr-guide.md 与 overlay/portal.vue）。
 * 这里延后到 `onMounted` 之后才开 portal，服务端与首次渲染都不产生占位节点。
 */
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})
</script>

<template>
  <!-- 触发元素：reka 会把本组件的默认插槽克隆成触发元素（等价 XAML 的
       `ToolTipService.ToolTip` 挂在目标元素上），并自动加 `aria-describedby`。
       具名插槽 VNode 不参与默认插槽，故这里只会取到调用方传入的那一个触发元素 -->
  <TooltipTrigger as-child>
    <slot name="trigger" />
  </TooltipTrigger>

  <TooltipPortal :disabled="!mounted">
    <Presence :present="present">
      <TooltipContent
        :id="contentId"
        class="fui-tooltip"
        :side="placement"
        :side-offset="sideOffset"
        :align="align"
        :aria-label="label"
        :avoid-collisions="true"
        :collision-boundary="[]"
        :collision-padding="4"
        :sticky="'partial'"
        position-strategy="fixed"
      >
        <slot name="content">{{ content }}</slot>
      </TooltipContent>
    </Presence>
  </TooltipPortal>
</template>

<style>
/* 这里必须是**非 scoped** 的 `<style>`（组件库里唯一的例外，理由如下）：
  WinUI 的 ToolTip 是 Popup，本组件对应地把提示面 Teleport 到 body。而 reka 的
  `TooltipContent`（→ `DismissableLayer` → `PopperContent` → `Primitive`）内部元素
  的 scopeId 来自它自己的渲染上下文，拿不到本组件的 `data-v-*`（Vue 只会把 scopeId
  写给「渲染该 VNode 的组件自己的根 / 模板内元素」）⇒ 若写成 scoped，选择器
  `.fui-tooltip[data-v-x]` 永远匹配不上，整套样式静默失效（本轮实测：
  padding 0px / 透明底 / 16px 字号）。
  换成非 scoped 后没有任何副作用：`.fui-tooltip` 是本库私有的 BEM 前缀，
  不会与消费方样式冲突；触发元素那一侧仍然由 `<slot />` 的宿主自行承担样式。
*/
/* 明暗主题由 tokens.css 的 light-dark() + color-scheme 自动切换 */
.fui-tooltip {
  /* WinUI 资源：ToolTipBorderPadding = 9,6,9,8（Fluent 2 Web 无 9px 档，落成局部变量） */
  --fui-tooltip-padding-block-start: 6px;
  --fui-tooltip-padding-inline: 9px;
  --fui-tooltip-padding-block-end: 8px;
  /* WinUI 资源：ToolTipMaxWidth = 320（token 表无该档位，落成局部变量） */
  --fui-tooltip-max-width: 320px;
  /* WinUI 资源：ToolTipBackgroundBrush ← AcrylicInAppFillColorDefaultBrush
     → colorNeutralCardBackground（合成依据见 types.ts） */
  --fui-tooltip-background: var(--colorNeutralCardBackground);
  /* WinUI 资源：ToolTipBorderBrush ← SurfaceStrokeColorFlyout → colorNeutralStrokeAlpha */
  --fui-tooltip-border: var(--colorNeutralStrokeAlpha);
  /* WinUI 资源：FadeIn/FadeOutThemeAnimation 的时长（非公开 vsanimation.h，取最短淡入档） */
  --fui-tooltip-fade-duration: var(--durationFaster);
  /* 浮层层级：必须高于 ContentDialog（1000）与 Combobox 下拉（1000） */
  --fui-tooltip-z: 1100;

  z-index: var(--fui-tooltip-z);
  /* WinUI：ToolTip.IsHitTestVisible = false —— 提示面不吃指针。
     `disable-hoverable-content` 固定为 true（指针离开目标即关闭，与 WinUI 一致），
     因此这里不需要为「指针移入提示面」留出命中区 */
  pointer-events: none;
  box-sizing: border-box;
  padding: var(--fui-tooltip-padding-block-start) var(--fui-tooltip-padding-inline)
    var(--fui-tooltip-padding-block-end);
  max-width: var(--fui-tooltip-max-width);
  background: var(--fui-tooltip-background);
  border: var(--strokeWidthThin) solid var(--fui-tooltip-border);
  /* WinUI：CornerRadius = ControlCornerRadius(4) */
  border-radius: var(--borderRadiusMedium);
  /* WinUI：ApplyElevationEffect(LayoutRoot, 0, baseElevation 16) → shadow16 */
  box-shadow: var(--shadow16);
  /* WinUI：Foreground = TextFillColorPrimary → colorNeutralForeground1；
     FontSize = ToolTipContentThemeFontSize(12) → fontSizeBase200 / lineHeightBase200 */
  color: var(--colorNeutralForeground1);
  font-family: var(--fontFamilyBase);
  font-size: var(--fontSizeBase200);
  font-weight: var(--fontWeightRegular);
  line-height: var(--lineHeightBase200);
  /* WinUI：ContentPresenter 的 TextWrapping=Wrap */
  overflow-wrap: break-word;
  white-space: normal;
}

.fui-tooltip[data-state='delayed-open'],
.fui-tooltip[data-state='instant-open'] {
  animation: fui-tooltip-fade-in var(--fui-tooltip-fade-duration) var(--curveLinear) both;
}

.fui-tooltip[data-state='closed'] {
  animation: fui-tooltip-fade-out var(--fui-tooltip-fade-duration) var(--curveLinear) both;
}

@keyframes fui-tooltip-fade-in {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes fui-tooltip-fade-out {
  from {
    opacity: 1;
  }

  to {
    opacity: 0;
  }
}

/* 尊重 prefers-reduced-motion：关闭淡入淡出，静态形态是完全可见的提示面 */
@media (prefers-reduced-motion: reduce) {
  .fui-tooltip[data-state='delayed-open'],
  .fui-tooltip[data-state='instant-open'],
  .fui-tooltip[data-state='closed'] {
    animation: none;
  }
}
</style>
