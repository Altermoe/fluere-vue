<script lang="ts">
/**
 * FluereProgressBar 组件 Props 契约
 *
 * 设计规范来源：WinUI 3 / Windows App SDK
 *   microsoft-ui-xaml `winui3/release/2.5.1`（commit ba3a8d5，本地快照 temp/winui-src）
 *   已核对版本漂移：`src/controls/dev/ProgressBar/` 下 ProgressBar.xaml /
 *   ProgressBar_themeresources.xaml / ProgressBar.cpp / ProgressBar.h / ProgressBar.idl
 *   在 tag `winui3/release/2.0.1`（最新 WinUI3 Gallery 发行版 v2.9.3 所用的
 *   WindowsAppSDK 2.0.1）与 2.5.1 之间逐字节一致（归一化 BOM/CRLF 后 diff 为空），
 *   故本地快照即 Gallery 行为基准。
 *
 * 读到的规范（文件 → 结论）：
 *  - ProgressBar.xaml：默认 Style = Foreground `ProgressBarForeground`、Background
 *    `ProgressBarBackground`、BorderThickness `ProgressBarBorderThemeThickness`、
 *    MinHeight `ProgressBarMinHeight`、Maximum 100、IsTabStop=False、
 *    VerticalAlignment=Center、CornerRadius `ProgressBarCornerRadius`；
 *    模板 = 外层 Border（BorderBrush/BorderThickness/Padding/CornerRadius）
 *    → 内层 Border（Clip = TemplateSettings.ClipRect）→ Grid（Height = MinHeight），
 *    Grid 内自下而上：ProgressBarTrack → DeterminateProgressBarIndicator →
 *    IndeterminateProgressBarIndicator → IndeterminateProgressBarIndicator2。
 *  - ProgressBar_themeresources.xaml：ProgressBarMinHeight=3、ProgressBarTrackHeight=1、
 *    ProgressBarCornerRadius=1.5、ProgressBarTrackCornerRadius=0.5、
 *    Light/Default 的 BorderThickness=0（HighContrast 才为 1）；
 *    Foreground=`AccentFillColorDefaultBrush`、Background=`ControlStrongStrokeColorDefault`、
 *    Paused=`SystemFillColorCaution`、Error=`SystemFillColorCritical`。
 *  - ProgressBar.cpp#UpdateStates：状态机 = error > paused > normal，且
 *    `IsIndeterminate && Visible` 时走 Indeterminate / IndeterminateError /
 *    IndeterminatePaused，否则走 Error / Paused / Determinate。
 *  - ProgressBar.cpp#SetProgressBarIndicatorWidth：确定态填充宽 = maxIndicatorWidth ×
 *    (value − min) / (max − min)（max==min 时 Width=0）；不确定态
 *    Indicator1 宽 = 40%·W、Indicator2 宽 = 60%·W，ShowPaused/ShowError 时 Indicator2
 *    宽 = 100%·W。
 *  - ProgressBar.cpp#UpdateWidthBasedTemplateSettings（W = 布局根实际宽）：
 *    ContainerAnimationStartPosition = −w1（w1 = 0.4W）→ 位移 −100%（自身宽）
 *    ContainerAnimationEndPosition = 3·w1 → 位移 300%
 *    Container2AnimationStartPosition = −1.5·w2（w2 = 0.6W）→ −150%
 *    Container2AnimationEndPosition = 1.66·w2 → 166%
 *    ContainerAnimationMidPosition = 0 → 0%
 *    容器尺寸变化时这几个值是**像素**，用百分比等价表达（见下方 style 块注释）。
 *  - ProgressBar.xaml#Indeterminate Storyboard（RepeatBehavior=Forever，周期 2s）：
 *    Indicator1 位移 t=0 Discrete(−w1) → t=1.5s Spline(3·w1, KeySpline .4,0,.6,1)
 *      → t=2s Discrete(3·w1)（即 1.5s 后原地保持）；
 *    Indicator2 位移 t=0 Discrete(−1.5·w2)、t=0.75s Discrete(−1.5·w2)
 *      → t=2s Spline(1.66·w2, KeySpline .4,0,.6,1)（0.75s 前原地保持）。
 *  - ProgressBar.xaml#IndeterminatePaused / IndeterminateError Storyboard（单次，750ms）：
 *    Indicator2 位移 keyframe 全部落在 0.167s→0.75s 区间（KeySpline 0,0,0,1），
 *    终值 ContainerAnimationMidPosition=0 ⇒ 100% 宽的指示条从左滑入并停在满格；
 *    同时 Indicator1/确定态指示条 Opacity=0、轨道 Opacity=0，Indicator2 填 paused/error 色。
 *  - ProgressBar.xaml 状态间 VisualTransition：Error/Paused → Determinate 用
 *    ColorAnimation Duration=0:0:0.167（本库取 `--durationFast`，见 style 块注释）；
 *    Updating → Determinate 用 RepositionThemeAnimation（无显式 Duration）。
 *  - ProgressBarAutomationPeer.cpp：ControlType=ProgressBar；**不确定态不提供
 *    RangeValue 模式**（GetPatternCore 返回 nullptr ⇒ 不暴露 aria-valuenow/min/max）；
 *    GetNameCore 会在 Error/Paused/Indeterminate 时给可访问名加本地化状态前缀
 *    （SR_ProgressBarErrorStatus 等）——本库暂无组件内建文案通道（i18n 属 0.3.0 目标 1.4），
 *    状态词由消费方通过 `label` 自行表达，此处不硬编码任何自然语言。
 *
 * 参考截图像素证据（WinUI3 Gallery ProgressBar 页，1:1 DPI；仅用于交叉验证几何，
 * 不作为取值依据——强调色取自截图机器的系统强调色 #295DA8，不是规范值）：
 *  - 确定态：进度条 130×3（x=30..159 / y=529..531），value=30 ⇒ 填充 38px ≈ 0.30×130；
 *    轨道**仅 1px 高**（y=530）、自填充右缘一直到 x=157，实测色 #868686 =
 *    `#72000000` 叠加在 #F3F3F3 上的合成值 ⇒ 印证 TrackHeight=1 与
 *    ControlStrongStrokeColorDefault=45% 黑。
 *  - 不确定态：蓝色滑块 52px ≈ 0.40×130 ⇒ 印证 Indicator1 = 40%·W。
 *
 * 状态模型（对齐 WinUI 三个 bool + RangeBase）：
 *  - indeterminate=false（默认）：确定态，填充宽 = (value − min) / (max − min)
 *  - indeterminate=true：忽略 value，两条滑块按 2s 循环滑动；showPaused / showError
 *    时退化为「100% 宽的 paused/error 色指示条停在满格」（对齐 WinUI 同名状态）
 *  - showError / showPaused：确定态下把填充改为 error / paused 色；error 优先
 */
export interface FluereProgressBarProps {
  /**
   * 当前进度值（确定态生效，`v-model`），对齐 WinUI `RangeBase.Value`
   * @default 0
   */
  modelValue?: number

  /**
   * 最小值，对齐 WinUI `RangeBase.Minimum`
   * @default 0
   */
  min?: number

  /**
   * 最大值，对齐 WinUI `RangeBase.Maximum`
   * @default 100
   */
  max?: number

  /**
   * 不确定模式，对齐 WinUI `IsIndeterminate`
   * @default false
   */
  indeterminate?: boolean

  /**
   * 出错状态（填充改 `SystemFillColorCritical`），对齐 WinUI `ShowError`
   * @default false
   */
  showError?: boolean

  /**
   * 暂停状态（填充改 `SystemFillColorCaution`），对齐 WinUI `ShowPaused`
   * @default false
   */
  showPaused?: boolean

  /**
   * 轨道颜色，任意 CSS 颜色；对齐 WinUI `ProgressBar.Background`
   * （默认 `ControlStrongStrokeColorDefault`）。缺省不传则用语义 token 默认值。
   */
  backgroundColor?: string

  /**
   * 禁用（前景降级为 …Disabled 档；本库约定，WinUI 无此视觉态）
   * @default false
   */
  disabled?: boolean

  /**
   * 可访问名称（无障碍）。WinUI 会在 Error/Paused/Indeterminate 时给可访问名加
   * 本地化状态前缀，本库暂无内建文案通道，需要时请由消费方在 `label` 中体现。
   */
  label?: string
}
</script>

<script setup lang="ts">
/**
 * 语义底座复用 reka-ui 的 ProgressRoot（`role=progressbar` + `data-state`），
 * 但它固定 `aria-valuemin=0` 且只接受 0..max 的归一值，与本控件要还原的
 * WinUI `RangeBase`（min/max/value）语义不同，故：
 *   - 传给 reka 的是**归一化**后的值域（0..max−min）；
 *   - `aria-valuemin/max/now/valuetext` 由本组件按 WinUI 原始 min/max/value 显式覆盖
 *     （不确定态一律缺省：对齐 ProgressBarAutomationPeer 不提供 RangeValue 模式的结论）。
 */
import {
  ProgressIndicator as RekaProgressIndicator,
  ProgressRoot as RekaProgressRoot,
} from 'reka-ui'
import { computed, type CSSProperties } from 'vue'

const props = withDefaults(defineProps<FluereProgressBarProps>(), {
  modelValue: 0,
  min: 0,
  max: 100,
  indeterminate: false,
  showError: false,
  showPaused: false,
  backgroundColor: undefined,
  disabled: false,
  label: undefined,
})
const model = defineModel<number>({ default: 0 })

/** 钳位到 [min, max]（对齐 RangeBase 的取值域） */
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

/** WinUI：`abs(maximum − minimum) > DBL_EPSILON` 才算得出填充宽，否则 Width=0 */
const range = computed(() => props.max - props.min)
const hasRange = computed(() => Number.isFinite(range.value) && range.value > 0)

/** reka ProgressRoot 的值域固定为 0..max，故传归一值（max 为 0 时给 1，避免它判为非法） */
const normalizedMax = computed(() => (hasRange.value ? range.value : 1))
const normalizedValue = computed(() => (hasRange.value ? clampedValue.value - props.min : 0))

/** 确定态进度比例 0..1 */
const fraction = computed(() => normalizedValue.value / normalizedMax.value)

/**
 * 确定态填充宽（WinUI 直接设像素宽，这里用百分比等价表达）。
 * 不确定态 WinUI 会把确定态指示条的 Width 显式置 0。
 */
const fillWidth = computed(() => (props.indeterminate ? '0px' : `${fraction.value * 100}%`))

/** 状态机（ProgressBar.cpp#UpdateStates：error 优先于 paused） */
const status = computed(() => {
  if (props.showError) {
    return 'error'
  }
  if (props.showPaused) {
    return 'paused'
  }
  return 'normal'
})

/** aria 可读文本：百分比（与 FluereProgressRing 同口径） */
const ariaValueText = computed(() => `${Math.round(fraction.value * 100)}%`)

/** 根节点内联自定义属性：`--pb-track-color` = WinUI `ProgressBar.Background` */
const rootStyle = computed<CSSProperties>(() => {
  const style: CSSProperties = {}
  if (props.backgroundColor) {
    style['--pb-track-color'] = props.backgroundColor
  }
  return style
})

defineOptions({ name: 'FluereProgressBar' })
</script>

<template>
  <RekaProgressRoot
    class="fui-pb"
    :model-value="indeterminate ? null : normalizedValue"
    :max="normalizedMax"
    :data-state="indeterminate ? 'indeterminate' : 'determinate'"
    :data-status="status"
    :data-disabled="disabled ? '' : undefined"
    :style="rootStyle"
    :aria-label="label ?? undefined"
    :aria-valuemin="indeterminate ? undefined : min"
    :aria-valuemax="indeterminate ? undefined : max"
    :aria-valuenow="indeterminate ? undefined : clampedValue"
    :aria-valuetext="indeterminate ? undefined : ariaValueText"
  >
    <!--
      渲染顺序与 XAML 模板的 Grid 子元素一致（后者覆盖前者）：
      ProgressBarTrack → DeterminateProgressBarIndicator →
      IndeterminateProgressBarIndicator → IndeterminateProgressBarIndicator2
    -->
    <span class="fui-pb__track" />

    <!-- 确定态指示条（reka ProgressIndicator：仅用于承接 data-state / data-value） -->
    <RekaProgressIndicator
      class="fui-pb__fill"
      :style="{ width: fillWidth }"
    />

    <!-- 不确定态两条滑块 -->
    <span class="fui-pb__slide fui-pb__slide--one" />
    <span class="fui-pb__slide fui-pb__slide--two" />
  </RekaProgressRoot>
</template>

<style scoped>
/* ------------------------------------------------------------------ */
/* 所有值均引用 Fluent 语义 token（var(--TokenName)），见 fluent-tokens  */
/* 明暗主题由 tokens.css 的 light-dark() + color-scheme 自动切换        */
/*                                                                     */
/* WinUI 3 对照（src/controls/dev/ProgressBar/ProgressBar_themeresources.xaml）：
 *   ProgressBarMinHeight          = 3     → --pb-min-height
 *   ProgressBarTrackHeight        = 1     → --pb-track-height
 *   ProgressBarCornerRadius       = 1.5   → --pb-radius
 *   ProgressBarTrackCornerRadius  = 0.5   → --pb-track-radius
 *   ProgressBarBorderThemeThickness = 0（Light/Default；HC=1，未实现）→ 不绘制边框
 *   ProgressBarForeground          = AccentFillColorDefaultBrush
 *     → colorCompoundBrandBackground（强调色填充位，同 ProgressRing）
 *   ProgressBarBackground          = ControlStrongStrokeColorDefault
 *     → colorNeutralStrokeAccessible（中性强描边位；WinUI 是 45% 黑 / 54.5% 白，
 *       Fluent 2 Web 无同值 token，本库统一取语义位最近者，与 Checkbox /
 *       ToggleSwitch / Slider 的同一资源映射保持一致）
 *   ProgressBarPausedForegroundColor = SystemFillColorCaution
 *     → colorPaletteYellowForeground1（Light #817400 / Dark #feee66，与 WinUI 的
 *       #9D5D00 / #FCE100 同属「黄色警示」家族且取值最接近；Fluent 2 Web 的
 *       status warning 家族是橙色系，色相偏差更大）
 *   ProgressBarErrorForegroundColor  = SystemFillColorCritical
 *     → colorStatusDangerForeground3（Light #c50f1f ≈ WinUI #C42B1C；
 *       Dark #eeacb2 ≈ WinUI #FF99A4，两个主题都最接近）
 *   前景降级（本库约定，非 WinUI 资源）→ colorNeutralForegroundDisabled
 *                                                                     */
/* 动效（全部来自 ProgressBar.xaml 的 VisualState / VisualTransition）： */
/*   Indeterminate：Storyboard RepeatBehavior=Forever、周期 2s           */
/*     Indicator1：0s     位移 −w1（= −100% 自身宽）                     */
/*                1.5s   位移 3·w1（= 300%），KeySpline 0.4,0,0.6,1      */
/*                2s     保持 300%（Discrete）                           */
/*     Indicator2：0s / 0.75s 位移 −1.5·w2（= −150% 自身宽，Discrete）   */
/*                2s     位移 1.66·w2（= 166%），KeySpline 0.4,0,0.6,1   */
/*     XAML 的 `0.4,0,0.6,1`（标准 ease-in-out）在 Fluent token 表里无同值项， */
/*     取语义位最近的 `--curveEasyEase`(0.33,0,0.67,1)：7 点采样实测最大偏差       */
/*     5.64px / 246.5px 行程 ≈ 2.3%（仅影响 tween 曲线，首尾位置完全一致）          */
/*     tween 曲线，不影响任何静态几何与首尾位置）                          */
/*   IndeterminatePaused / IndeterminateError（单次 750ms）：            */
/*     Indicator2 宽 100%·W，位移 −0.9W（= −90% 自身宽）→ 0，             */
/*     KeySpline 0,0,0,1 ⇒ `--curveDecelerateMid`；终态停在满格           */
/*   Paused / Error 的填充变色：ColorAnimation Duration=0:0:0.167       */
/*     → `--durationFast`（本库对 167ms 的统一近似，同 Slider / ComboBox） */
/*   确定态 value 变化：WinUI 走 Updating → Determinate 的                 */
/*     RepositionThemeAnimation（未显式给 Duration，其默认时长不在          */
/*     microsoft-ui-xaml 快照内，取不到 A 级证据）⇒ 本库以                  */
/*     `width` 过渡（durationNormal + curveEasyEase）表达同一意图，并在     */
/*     prefers-reduced-motion 下关闭                                     */
/* ------------------------------------------------------------------ */

.fui-pb {
  /* WinUI 数值资源（ProgressBar_themeresources.xaml），有名字就不写魔法值 */
  --pb-min-height: 3px;
  --pb-track-height: 1px;
  --pb-radius: 1.5px;
  --pb-track-radius: 0.5px;
  position: relative;
  display: block;
  /* 模板 Grid Height = MinHeight=3（控件本体高度） */
  height: var(--pb-min-height);
  /* 模板内层 Border.Clip = RectangleGeometry（整块矩形）⇒ 超出部分裁掉 */
  overflow: clip;
  /* AGENTS 无障碍约定：纯指示元素不拦指针（WinUI 仅设 IsTabStop=False） */
  pointer-events: none;
  /* 前景 = ProgressBarForeground；填充走 currentColor，disabled 自动降级 */
  color: var(--colorCompoundBrandBackground);
}

/* ---- 轨道（ProgressBarTrack）：高 1、圆角 0.5、垂直居中、宽 = 控件宽 ---- */
.fui-pb__track {
  position: absolute;
  /* XAML 里轨道是 3px 高 Grid 中 VerticalAlignment=Center 的 1px 矩形，
     布局取整后落在整数像素上（= 参考图里唯一一行灰线）。
     用 top:50% + translateY(-50%) 会让这 1px 落在半像素上、被摊成两行各 50%，
     观感比 WinUI 淡一档；故直接写中心偏移量，默认 3/1 时为整数 1px。 */
  top: calc((var(--pb-min-height) - var(--pb-track-height)) / 2);
  left: 0;
  width: 100%;
  height: var(--pb-track-height);
  border-radius: var(--pb-track-radius);
  background-color: var(--pb-track-color, var(--colorNeutralStrokeAccessible));
}

/* ---- 确定态指示条：3px 高、圆角 1.5、左对齐、宽 = 进度比例 ---- */
.fui-pb__fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  border-radius: var(--pb-radius);
  background-color: currentColor;
  /* 值变化：对齐 Updating → Determinate 的位移补间意图；变色：ColorAnimation 167ms */
  transition:
    width var(--durationNormal) var(--curveEasyEase),
    background-color var(--durationFast) var(--curveEasyEase);
}

/* ---- 不确定态两条滑块：XAML 模板里初值 Opacity=0，仅 Indeterminate 状态置 1 ---- */
.fui-pb__slide {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  border-radius: var(--pb-radius);
  background-color: currentColor;
  opacity: 0;
}
/* SetProgressBarIndicatorWidth：40%·W / 60%·W */
.fui-pb__slide--one {
  width: 40%;
  /* 静态兜底位置 = 0% 关键帧（−w1 = −100% 自身宽），reduced-motion 另有可见兜底 */
  transform: translateX(-100%);
}
.fui-pb__slide--two {
  width: 60%;
  transform: translateX(-150%);
}

/* ---- Indeterminate（running）：轨道隐藏，两条滑块按 2s 循环滑动 ---- */
.fui-pb[data-state='indeterminate'] .fui-pb__track {
  opacity: 0;
}
.fui-pb[data-state='indeterminate'] .fui-pb__fill {
  opacity: 0;
}
.fui-pb[data-state='indeterminate'][data-status='normal'] .fui-pb__slide {
  opacity: 1;
}
.fui-pb[data-state='indeterminate'][data-status='normal'] .fui-pb__slide--one {
  animation: fui-pb-slide-one 2s var(--curveEasyEase) infinite;
}
.fui-pb[data-state='indeterminate'][data-status='normal'] .fui-pb__slide--two {
  animation: fui-pb-slide-two 2s var(--curveEasyEase) infinite;
}

/* 第一条：0 → 1.5s 由 −100% 走到 300%（= −w1 → 3·w1），其后原地保持到 2s */
@keyframes fui-pb-slide-one {
  0% {
    transform: translateX(-100%);
  }
  75% {
    transform: translateX(300%);
  }
  100% {
    transform: translateX(300%);
  }
}

/* 第二条：0 → 0.75s 停在 −150%（= −1.5·w2），随后走到 166%（= 1.66·w2） */
@keyframes fui-pb-slide-two {
  0% {
    transform: translateX(-150%);
  }
  37.5% {
    transform: translateX(-150%);
  }
  100% {
    transform: translateX(166%);
  }
}

/* ---- IndeterminatePaused / IndeterminateError：100% 宽的指示条滑入并停在满格 ---- */
.fui-pb[data-state='indeterminate'][data-status='paused'] .fui-pb__slide--two,
.fui-pb[data-state='indeterminate'][data-status='error'] .fui-pb__slide--two {
  width: 100%;
  opacity: 1;
  transform: translateX(0);
  animation: fui-pb-park 750ms var(--curveDecelerateMid) both;
}
/* −0.9W = −90% 自身宽（w2=0.6W 时 −1.5·w2），终值 ContainerAnimationMidPosition=0 */
@keyframes fui-pb-park {
  0% {
    transform: translateX(-90%);
  }
  100% {
    transform: translateX(0);
  }
}
.fui-pb[data-state='indeterminate'][data-status='paused'] .fui-pb__slide--two {
  background-color: var(--colorPaletteYellowForeground1);
}
.fui-pb[data-state='indeterminate'][data-status='error'] .fui-pb__slide--two {
  background-color: var(--colorStatusDangerForeground3);
}

/* ---- 确定态 paused / error：填充改色（ColorAnimation 167ms） ---- */
.fui-pb[data-state='determinate'][data-status='paused'] .fui-pb__fill {
  background-color: var(--colorPaletteYellowForeground1);
}
.fui-pb[data-state='determinate'][data-status='error'] .fui-pb__fill {
  background-color: var(--colorStatusDangerForeground3);
}

/* ---- disabled：前景降级 …Disabled 档（本库约定；轨道色按传入值原样渲染） ---- */
.fui-pb[data-disabled] {
  color: var(--colorNeutralForegroundDisabled);
}

/* ---- 动效尊重系统减弱：停动画并留下合理静态形态（不出现空白条） ---- */
@media (prefers-reduced-motion: reduce) {
  .fui-pb__fill {
    transition: none;
  }
  /* 不确定态兜底：一条 40% 宽的静态指示条停在左端 */
  .fui-pb[data-state='indeterminate'][data-status='normal'] .fui-pb__slide--one {
    animation: none;
    transform: translateX(0);
  }
  .fui-pb[data-state='indeterminate'][data-status='normal'] .fui-pb__slide--two {
    animation: none;
    opacity: 0;
  }
  /* paused / error 兜底：满格指示条停在终态 */
  .fui-pb[data-state='indeterminate'][data-status='paused'] .fui-pb__slide--two,
  .fui-pb[data-state='indeterminate'][data-status='error'] .fui-pb__slide--two {
    animation: none;
    transform: translateX(0);
  }
}
</style>
