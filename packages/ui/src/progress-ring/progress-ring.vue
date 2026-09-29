<script lang="ts">
/**
 * FluereProgressRing 组件 Props 契约
 *
 * 设计规范来源：WinUI 3 / Windows App SDK（microsoft-ui-xaml
 *   winui3/release/2.0-stable，src/controls/dev/ProgressRing/）
 *  - ProgressRing.xaml            ：默认 Style（Width/Height=32、IsTabStop=False…）
 *  - ProgressRing_themeresources.xaml：前景/背景画刷与 ProgressRingStrokeThickness=4
 *  - AnimatedVisuals/ProgressRingIndeterminate.cpp：不确定态「彗星」Lottie（2s 循环、
 *    可见平滑旋转 0→900° → 匀速 450°/s，Web 端以 0.8s/圈 的无缝线性循环近似）
 *  - AnimatedVisuals/ProgressRingDeterminate.cpp  ：确定态弧（从 12 点顺时针增长）
 *
 * 逐条对照源码的还原要点：
 *  - 默认尺寸 32×32（Style Setter Width/Height=32，MinWidth/MinHeight=16）
 *  - Foreground = AccentFillColorDefaultBrush → colorCompoundBrandBackground
 *  - Background = ControlFillColorTransparentBrush → 无底色、**无轨道环**（透明）
 *  - IsHitTestVisible=False + IsTabStop=False → 纯装饰指示，不参与 Tab 序、不响应指针
 *  - IsIndeterminate 默认 true；IsActive=false 时 LayoutRoot.Opacity=0（动画随之停）
 *  - 圆环几何：Lottie 舞台 80×80、圆心(40,40)、r=35、StrokeThickness=1.5×5；
 *    归一化到 32px 控件：r≈14、stroke≈3、RoundLineCap（两端圆头）
 *  - Indeterminate 彗星：0.8s/圈 整环顺时针匀速旋转（≈450°/s，对齐 Lottie 可见转速）、
 *    弧头亮、弧尾渐变隐没
 *  - Determinate：弧从正上方（12 点）顺时针增长到 (value−min)/(max−min)，圆头、无轨道
 *
 * 状态模型：
 *  - indeterminate=true（默认）：忽略 value/min/max，播放彗星转圈动画
 *  - indeterminate=false：确定态弧，value∈[min,max]，默认 0..100
 */
export type FluereProgressRingSize = 'small' | 'medium' | 'large'

export interface FluereProgressRingProps {
  /**
   * 是否不确定（转圈）模式，默认 true（对齐 WinUI IsIndeterminate）
   */
  indeterminate?: boolean

  /**
   * 是否激活；false 时整体透明且动画暂停（对齐 WinUI IsActive=false → Opacity=0）
   * @default true
   */
  active?: boolean

  /**
   * 当前进度值（determinate 模式生效）
   * @default 0
   */
  modelValue?: number

  /**
   * 最小值
   * @default 0
   */
  min?: number

  /**
   * 最大值
   * @default 100
   */
  max?: number

  /**
   * 尺寸：small=16（对齐 WinUI MinWidth）/ medium=32（WinUI 默认）/ large=48
   * @default 'medium'
   */
  size?: FluereProgressRingSize

  /**
   * 禁用（前景降级为 …Disabled 档）
   * @default false
   */
  disabled?: boolean

  /**
   * 可访问名称（无障碍）。进度条属装饰性指示时请由消费方决定是否标注。
   */
  label?: string
}
</script>

<script setup lang="ts">
import { computed, useId } from 'vue'

/** viewBox 坐标系常量（归一化到 32px 控件，矢量随尺寸缩放） */
const R = 14
const CIRCUMFERENCE = 2 * Math.PI * R
/** 彗星弧长：Lottie 中弧峰值约占半环，观感取 ~30%（≈108°） */
const COMET_FRACTION = 0.3

const props = withDefaults(defineProps<FluereProgressRingProps>(), {
  indeterminate: true,
  active: true,
  modelValue: 0,
  min: 0,
  max: 100,
  size: 'medium',
  disabled: false,
  label: undefined,
})
const model = defineModel<number>({ default: 0 })

/**
 * 每实例唯一渐变 id。useId() 按渲染序列生成、SSR/水合一致
 * （不能用 getCurrentInstance().uid：服务端与客户端 uid 不同会触发水合告警）
 */
const gradId = `fui-pr-grad-${useId()}`

const clampedValue = computed(() => {
  const v = Number.isFinite(model.value) ? model.value : props.min
  if (v < props.min) {
    return props.min
  }
  if (v > props.max) {
    return props.max
  }
  return v
})

/** determinate 进度比例 0..1 */
const fraction = computed(() => {
  if (props.max <= props.min) {
    return 0
  }
  return (clampedValue.value - props.min) / (props.max - props.min)
})

/**
 * 确定态 dashoffset：dasharray 恒为 [C, C]，offset = C·(1−fraction)
 * → 可见弧 = 从 dash 起点（旋转 −90° 后落在 12 点）顺时针增长 C·fraction
 */
const determinateOffset = computed(() => CIRCUMFERENCE * (1 - fraction.value))

/** aria 可读文本：百分比 */
const ariaValueText = computed(() => `${Math.round(fraction.value * 100)}%`)

defineOptions({ name: 'FluereProgressRing' })
</script>

<template>
  <span
    class="fui-pr"
    role="progressbar"
    :data-state="indeterminate ? 'indeterminate' : 'determinate'"
    :data-size="size"
    :data-active="active ? '' : undefined"
    :data-disabled="disabled ? '' : undefined"
    :aria-label="label ?? undefined"
    :aria-valuemin="indeterminate ? undefined : min"
    :aria-valuemax="indeterminate ? undefined : max"
    :aria-valuenow="indeterminate ? undefined : clampedValue"
    :aria-valuetext="indeterminate ? undefined : ariaValueText"
  >
    <svg
      class="fui-pr__svg"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <!--
        彗星尾部渐隐渐变。gradientUnits=userSpaceOnUse：坐标建立在引用它的
        弧线所在的用户坐标系（= orbit 静态 rotate(-90°) 之后的坐标系）→
        渐变随 orbit 一起旋转，始终「弧头亮、弧尾隐」。
        该坐标系中弧线从 3 点（dash 起点，(30,16)）顺时针画出 108°：
        弧尾（渐隐端）= (30,16)；弧头（实色端）= 顺时针 108° 处 ≈(11.67,29.31)。
      -->
      <defs>
        <linearGradient
          :id="gradId"
          gradientUnits="userSpaceOnUse"
          x1="30"
          y1="16"
          x2="11.67"
          y2="29.31"
        >
          <stop
            class="fui-pr__grad-stop fui-pr__grad-tail"
            offset="0"
          />
          <stop
            class="fui-pr__grad-stop fui-pr__grad-head"
            offset="1"
          />
        </linearGradient>
      </defs>

      <!-- orbit：indeterminate 时整环匀速顺时针旋转（0.8s/圈 ≈ 450°/s） -->
      <g class="fui-pr__orbit">
        <circle
          class="fui-pr__arc"
          cx="16"
          cy="16"
          :r="R"
          :stroke-dasharray="
            indeterminate
              ? `${CIRCUMFERENCE * COMET_FRACTION} ${CIRCUMFERENCE}`
              : `${CIRCUMFERENCE} ${CIRCUMFERENCE}`
          "
          :stroke-dashoffset="indeterminate ? 0 : determinateOffset"
          :style="indeterminate ? { stroke: `url(#${gradId})` } : {}"
        />
      </g>
    </svg>
  </span>
</template>

<style scoped>
/* ------------------------------------------------------------------ */
/* 所有值均引用 Fluent 语义 token（var(--TokenName)）。                  */
/* 对照 WinUI 3（microsoft-ui-xaml winui3/release/2.0-stable）：       */
/*   ProgressRingForegroundThemeBrush = AccentFillColorDefaultBrush      */
/*     → colorCompoundBrandBackground                                   */
/*   ProgressRingBackgroundThemeBrush = ControlFillColorTransparentBrush */
/*     → 根/轨道背景透明，不绘制任何底环                                  */
/*   StrokeThickness≈3（归一化）、RoundLineCap、无 TabStop、无指针命中   */
/* ------------------------------------------------------------------ */

.fui-pr {
  /* 尺寸：medium=32（WinUI 默认）；small=16（WinUI MinWidth）；large=48 */
  --pr-size: 32px;
  display: inline-flex;
  width: var(--pr-size);
  height: var(--pr-size);
  vertical-align: middle;
  color: var(--colorCompoundBrandBackground);
  /* IsHitTestVisible=False / IsTabStop=False：纯装饰指示 */
  pointer-events: none;
}
.fui-pr[data-size='small'] {
  --pr-size: 16px;
}
.fui-pr[data-size='large'] {
  --pr-size: 48px;
}

.fui-pr__svg {
  display: block;
  width: 100%;
  height: 100%;
}

/* ---- orbit：static rotate(-90deg) 把 dash 起点落到 12 点；
       indeterminate 的 keyframes 在此基础上匀速旋转（渐变 userSpaceOnUse
       建立在弧线坐标系 = orbit 本地系，因此随 orbit 一起旋转、始终弧头亮弧尾隐） ---- */
.fui-pr__orbit {
  transform-box: view-box;
  transform-origin: 16px 16px;
  transform: rotate(-90deg);
}
.fui-pr[data-state='indeterminate'] .fui-pr__orbit {
  animation: fui-pr-orbit 0.8s linear infinite;
}
@keyframes fui-pr-orbit {
  from {
    transform: rotate(-90deg);
  }
  to {
    transform: rotate(270deg);
  }
}

/* ---- 弧线：r=14 / stroke≈3（medium）/ 圆头（dash 起点由 orbit 的 −90° 落到 12 点） ---- */
.fui-pr__arc {
  /* determinate 默认实色前景：走 currentColor（跟随根 color，disabled 自动降级）；
     indeterminate 由内联 stroke=url(#grad) 覆盖为彗星渐变 */
  stroke: currentColor;
  stroke-width: 3;
  stroke-linecap: round;
}
/* determinate：value 变化时弧长平滑增长（对齐 WinUI 弧长动画） */
.fui-pr[data-state='determinate'] .fui-pr__arc {
  transition: stroke-dashoffset var(--durationNormal) var(--curveEasyEase);
}

/* ---- 彗星渐变色标（CSS 变量驱动，明暗/disabled 自动切换） ---- */
.fui-pr__grad-stop {
  stop-color: var(--colorCompoundBrandBackground);
}
.fui-pr__grad-tail {
  stop-opacity: 0; /* 弧尾隐没 */
}
.fui-pr__grad-head {
  stop-opacity: 1; /* 弧头实色 */
}

/* ---- disabled：前景降级 …Disabled 档 ---- */
.fui-pr[data-disabled] {
  color: var(--colorNeutralForegroundDisabled);
}
.fui-pr[data-disabled] .fui-pr__grad-stop {
  stop-color: var(--colorNeutralForegroundDisabled);
}

/* ---- inactive（IsActive=false）：整体透明 + 动画暂停（对齐 WinUI Inactive 态） ---- */
.fui-pr:not([data-active]) {
  opacity: 0;
}
.fui-pr:not([data-active]) .fui-pr__orbit {
  animation-play-state: paused;
}

/* ---- 动效尊重系统减弱 ---- */
@media (prefers-reduced-motion: reduce) {
  .fui-pr[data-state='indeterminate'] .fui-pr__orbit {
    animation: none;
  }
  .fui-pr[data-state='determinate'] .fui-pr__arc {
    transition: none;
  }
}
</style>
