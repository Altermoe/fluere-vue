<script lang="ts">
/**
 * FluereProgressRing 组件 Props 契约
 *
 * 设计规范来源：WinUI 3 / Windows App SDK
 *   microsoft-ui-xaml `winui3/release/2.5.1`（commit ba3a8d5）
 *   已核对：该快照与最新 WinUI3 Gallery 发行版 v2.9.3 所用的 WindowsAppSDK 2.0.1
 *   （tag `winui3/release/2.0.1`）在 `src/controls/dev/ProgressRing/` 下逐字节一致
 *   （xaml / themeresources / cpp / idl / 两个 AnimatedVisuals），不存在版本漂移。
 *  - ProgressRing.xaml               ：Width/Height=32、MinWidth/MinHeight=16、
 *     IsHitTestVisible=False、IsTabStop=False、模板仅一个 AnimatedVisualPlayer
 *  - ProgressRing_themeresources.xaml：Foreground=AccentFillColorDefaultBrush、
 *     Background=ControlFillColorTransparentBrush、ProgressRingStrokeThickness=4
 *     （后者是旧模板遗留值，实际描边由 Lottie 几何决定）
 *  - ProgressRing.cpp                ：IsActive=false → LayoutRoot.Opacity=0 + player.Stop()；
 *     Foreground/Background 通过主题属性注入 Lottie（Background 即轨道色）
 *  - AnimatedVisuals/ProgressRingIndeterminate.cpp：2s 不确定态 Lottie（几何与关键帧见下）
 *  - AnimatedVisuals/ProgressRingDeterminate.cpp  ：确定态弧（自 12 点顺时针增长）
 *
 * 不确定态动画（Lottie 舞台 80×80、圆心 (40,40)、r=7×5=35、stroke=1.5×5=7.5；
 * 归一化到 32px 控件：r=14、stroke=3、RoundLineCap）：
 *  - 容器旋转 RotationAngleInDegrees：0 → 450°（进度 0.5）→ 900°（进度 1.0），
 *    缓动 cubic-bezier(.167,.167,.833,.833)。因 x1=y1 且 x2=y2，该缓动恒等 y=x，
 *    即实际为**线性**：整环 2s 匀速旋转 2.5 圈（450°/s）。
 *  - 弧长由两组 TrimStart/TrimEnd 交替贡献（Trim 比例按整圈计），两组在进度 0.5 处
 *    用 opacity 阶跃瞬时交接，而交接帧两组几何**完全重合**，故 Web 端可合并为一条弧：
 *      进度 ∈ [0, 0.5]：起点≡0，终点 0 → 0.5（线性）⇒ 弧由 0 长到半圈；
 *                       尾端（起点）450°/s，头端（终点）630°/s，弧逐渐变长。
 *      进度 ∈ [0.5, 1]：终点≡0.5，起点 0 → 0.5（线性）⇒ 弧由半圈缩到 0；
 *                       头端 450°/s，尾端 630°/s 追上头端。
 *    弧两端均为 RoundLineCap ⇒ 弧长为 0 时收成一个「直径 = 线宽」的圆点；
 *    进度 1.0 与 0.0 的状态在模 360° 下重合 ⇒ 无缝循环。最大弧长 = 半周长。
 *  - 分解方式（Web 端实现要点）：Lottie 把「可见旋转 900°/周期」放在容器上，而 dash
 *    在周期首尾跳半圈，两者必须**同一帧翻页**才互相抵消。Web 端若照搬成「父元素旋转 +
 *    子元素 dash」两条动画，负载高时会出现一条翻页、另一条没翻的帧，整环瞬间翻转 180°
 *    （观感：弧接近顶部时底部闪一个小圆点）。故这里把旋转与 dash 合并为**同一条**
 *    keyframes，并让每条属性在边界处视觉等价（旋转跳 2 整圈、dashoffset 跳 +1 圈而
 *    此刻弧长为 0）——可见几何不变，边界不再依赖两条动画同步；推导见下方 style 块内注释。
 *  - 静态轨道：Lottie 中另有一条**不参与旋转**的整圆 SpriteShape，描边取主题属性
 *    Background → 对应本组件 `backgroundColor` Prop；WinUI 默认
 *    Background=ControlFillColorTransparentBrush（#00FFFFFF），故缺省不显示轨道。
 *
 * 状态模型：
 *  - indeterminate=true（默认）：忽略 value/min/max，播放「成长 → 收缩」2s 循环动画
 *  - indeterminate=false：确定态弧，value∈[min,max]，默认 0..100
 */
export type FluereProgressRingSize = 'small' | 'medium' | 'large'

export interface FluereProgressRingProps {
  /**
   * 是否不确定（转圈）模式，默认 true（对齐 WinUI IsIndeterminate）
   */
  indeterminate?: boolean

  /**
   * 是否激活；false 时整体透明且动画暂停（对齐 WinUI IsActive=false → Opacity=0 + player.Stop()）
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
   * 轨道（底环）颜色，任意 CSS 颜色；对齐 WinUI `ProgressRing.Background`
   * （WinUI3 Gallery 的「Background color」选项，Lottie 中那条静态整圆）。
   * 缺省不传 = 不显示轨道（对齐 WinUI 默认 ControlFillColorTransparentBrush）。
   */
  backgroundColor?: string

  /**
   * 禁用（前景降级为 …Disabled 档；轨道色按传入值原样渲染）
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
import { computed, type CSSProperties } from 'vue'

/**
 * viewBox 坐标系常量（归一化到 32px 控件，矢量随尺寸缩放）。
 * 不确定态 Lottie：80×80 舞台、r=35、stroke=7.5 ⇒ 32px 下 r=14、stroke=3（严格等比）。
 * 确定态 Lottie：32×32 舞台、r=8×1.77=14.16、stroke=1.5×1.77≈2.655 —— 与不确定态存在
 * 约 1.5% 的原始偏差（微软两份 Lottie 各自的舍入），此处统一取 r=14 / stroke=3，
 * 与「同一控件两种状态外观一致」的观感一致。
 */
const R = 14
const CIRCUMFERENCE = 2 * Math.PI * R

const props = withDefaults(defineProps<FluereProgressRingProps>(), {
  indeterminate: true,
  active: true,
  modelValue: 0,
  min: 0,
  max: 100,
  size: 'medium',
  backgroundColor: undefined,
  disabled: false,
  label: undefined,
})
const model = defineModel<number>({ default: 0 })

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

/**
 * 根节点内联自定义属性：
 *  - `--pr-c`：整圈长（dash 动画以 calc() 换算，保证 CSS 与模板几何同源）
 *  - `--pr-track-color`：轨道色（未传则缺省，CSS 回落 transparent）
 */
const rootStyle = computed<CSSProperties>(() => {
  const style: CSSProperties = { '--pr-c': `${CIRCUMFERENCE}px` }
  if (props.backgroundColor) {
    style['--pr-track-color'] = props.backgroundColor
  }
  return style
})

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
    :style="rootStyle"
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
        轨道：对齐 Lottie 中不参与旋转的整圆 SpriteShape（主题色 Background）。
        缺省 --pr-track-color 未定义 → transparent → 与 WinUI 默认透明轨道一致。
      -->
      <circle
        class="fui-pr__track"
        cx="16"
        cy="16"
        :r="R"
      />

      <!--
        弧线：静态 rotate(-90deg) 把路径起点（SVG circle 自 3 点起笔）摆到 12 点，
        与 Lottie 的 0° 基准对齐。
        indeterminate：旋转与 dash 由**同一条** CSS 动画驱动（理由见 style 块内注释：
        拆成「<g> 旋转 + <circle> dash」两条动画时，周期边界会被拆开应用，
        整环瞬间翻转 180°，表现为「弧接近顶部时底部闪一个小圆点」）；
        determinate：dash 走内联属性（属性优先级低于 CSS 声明，故 dash 相关 CSS
        只写在 [data-state='indeterminate'] 选择器内）。
      -->
      <circle
        class="fui-pr__arc"
        cx="16"
        cy="16"
        :r="R"
        :stroke-dasharray="indeterminate ? undefined : `${CIRCUMFERENCE} ${CIRCUMFERENCE}`"
        :stroke-dashoffset="indeterminate ? undefined : determinateOffset"
      />
    </svg>
  </span>
</template>

<style scoped>
/* ------------------------------------------------------------------ */
/* 所有值均引用 Fluent 语义 token（var(--TokenName)）。                  */
/* 对照 WinUI 3 ProgressRing：                                         */
/*   ProgressRingForegroundThemeBrush = AccentFillColorDefaultBrush      */
/*     → colorCompoundBrandBackground                                   */
/*   ProgressRingBackgroundThemeBrush = ControlFillColorTransparentBrush */
/*     → 缺省无可见轨道；传 backgroundColor 即绘制 Lottie 的静态整圆底环 */
/*   RoundLineCap、无 TabStop、无指针命中                                */
/* ------------------------------------------------------------------ */

.fui-pr {
  /* 尺寸：medium=32（WinUI 默认）；small=16（WinUI MinWidth）；large=48 */
  --pr-size: 32px;
  /* 整圈长兜底（r=14 → 2πr≈87.965）：模板会以内联 --pr-c 覆盖 */
  --pr-c: 87.965px;
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

/* ---- 轨道：静态整圆，r 与 stroke 和弧线一致（Lottie 中同为 r=7×5 / stroke=1.5×5）---- */
.fui-pr__track {
  stroke: var(--pr-track-color, transparent);
  stroke-width: 3;
}

/* ---- 弧线：r=14 / stroke=3（medium）/ 圆头；
       静态 rotate(-90deg) 把 dash 起点（SVG circle 自 3 点起笔）落到 12 点 ---- */
.fui-pr__arc {
  /* determinate 实色前景：走 currentColor（跟随根 color，disabled 自动降级）；
     indeterminate 同为实色（Lottie 用的就是主题色实心描边，无渐变） */
  stroke: currentColor;
  stroke-width: 3;
  stroke-linecap: round;
  transform-box: view-box;
  transform-origin: 16px 16px;
  transform: rotate(-90deg);
}

/* ---- indeterminate：**同一条动画**同时驱动「旋转 + 弧长 + 弧位置」 ----
   Lottie 的分解是「容器旋转 900°/周期」+「两组 Trim 在此消彼长」，两者在周期首尾
   各自跳变、且必须同时翻页才对得上（旋转跳 900° ≡ 180°，dash 跳半圈 ≡ −180°）。
   若把旋转与 dash 拆到两个元素、两条动画上（如 <g> 旋转 + <circle> dash），
   周期边界一旦被浏览器拆开应用（负载高时会出现），整环会瞬间翻转 180°——
   观感就是「弧接近顶部时，底部突然闪一个小圆点」。因此这里：
     1) 旋转与 dash 合并进同一条 keyframes、同一个元素；
     2) 每条属性各自在边界处「视觉等价」，即便被拆开也不会产生可见跳变：
        transform   −90° → 180° → 630°：边界跳 720° = 2 整圈 → 原始角度不变；
        dasharray   0 → 半圈 → 0        ：连续，无跳变；
        dashoffset  0 → −C/2 → −C       ：边界跳 +C，而此处弧长为 0、图案周期恰为 C，
                                          → 圆点仍在路径原点，位置不变。
   可见几何与 Lottie 完全一致（弧中线恒为 1080°·p、弧长 = 360°·min(p,1−p) + 圆头）。
   静态声明（半环）同时作为 prefers-reduced-motion 关闭动画后的兜底外观。 */
.fui-pr[data-state='indeterminate'] .fui-pr__arc {
  stroke-dasharray: calc(var(--pr-c) / 2) var(--pr-c);
  stroke-dashoffset: 0;
  animation: fui-pr-arc 2s linear infinite;
}
@keyframes fui-pr-arc {
  0% {
    transform: rotate(-90deg);
    stroke-dasharray: 0 var(--pr-c);
    stroke-dashoffset: 0;
  }
  50% {
    transform: rotate(180deg);
    stroke-dasharray: calc(var(--pr-c) / 2) var(--pr-c);
    stroke-dashoffset: calc(var(--pr-c) * -0.5);
  }
  100% {
    transform: rotate(630deg);
    stroke-dasharray: 0 var(--pr-c);
    stroke-dashoffset: calc(var(--pr-c) * -1);
  }
}

/* ---- determinate：value 变化时弧长平滑增长（对齐 WinUI 弧长动画） ---- */
.fui-pr[data-state='determinate'] .fui-pr__arc {
  transition: stroke-dashoffset var(--durationNormal) var(--curveEasyEase);
}

/* ---- disabled：前景降级 …Disabled 档（轨道色按传入值原样渲染） ---- */
.fui-pr[data-disabled] {
  color: var(--colorNeutralForegroundDisabled);
}

/* ---- inactive（IsActive=false）：整体透明 + 动画暂停（对齐 WinUI Inactive 态） ---- */
.fui-pr:not([data-active]) {
  opacity: 0;
}
.fui-pr:not([data-active]) .fui-pr__arc {
  animation-play-state: paused;
}

/* ---- 动效尊重系统减弱：停动画，落到静态半环兜底外观 ---- */
@media (prefers-reduced-motion: reduce) {
  .fui-pr[data-state='indeterminate'] .fui-pr__arc {
    animation: none;
  }
  .fui-pr[data-state='determinate'] .fui-pr__arc {
    transition: none;
  }
}
</style>
