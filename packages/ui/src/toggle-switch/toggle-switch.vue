<script lang="ts">
/**
 * FluereToggleSwitch 组件 Props 契约
 *
 * 设计规范来源：WinUI 3 / Windows App SDK — ToggleSwitch
 * （src/controls/dev/CommonStyles/ToggleSwitch_themeresources.xaml）
 * 交互底座自研（todo「自定义实现」）：完整还原「点击切换 + 拖拽滑块到终点 +
 * 键盘切换 + 缓动动画」，不依赖 reka-ui 的 SwitchRoot（其 @click 会无条件 toggle，
 * 与拖拽语义冲突，反而要花更多力气去阻断双击）。
 * 取值一律经 Fluent 2 语义 token 落地（fluent-tokens：data/fluent-tokens.json）
 *
 * 状态模型（modelValue）：boolean。true=On / false=Off。
 *
 * 解剖（anatomy，对照 WinUI ControlTemplate）：
 * - root              button[role=switch]，整块可点击，点击任意处切换
 * - header            顶部说明行（WinUI HeaderContentPresenter，可选）
 * - row               主行：轨道 + 内容区
 *     track           WinUI OuterBorder（=Off 填色）+ SwitchKnobBounds（=On 填色）
 *                     合并为一个走 background 过渡的胶囊轨道 —— 比 WinUI 双矩形叠
 *                     opacity 更省绘制，视觉等价
 *     rail            滑块滑轨：宽 = travel（=轨道宽的一半），translateX 控制位
 *                     移（避免 left/right 触发布局，transform 走合成层）
 *     thumb           WinUI SwitchKnobOff/On：单个圆点，hover 圆点稍大、active 原地
 *                     变丸（固定外框 + clip-path 裁切显示，居中生长、不出轨道、零布局抖动）
 *     content         内容区：on-content / off-content 交叉淡入淡出 +
 *                     默认插槽为行标签（语义名）
 *
 * 尺寸（三档，仅标准 40×20 对齐 Gallery；其余按需扩展，几何取自 Fluent 尺寸标度）：
 *   small   轨道 32×16 · thumb 10 · travel 16
 *   medium  轨道 40×20 · thumb 12 · travel 20（WinUI 标准）
 *   large   轨道 48×24 · thumb 14 · travel 24
 *   其中 travel=轨道宽的一半=轨道高，分别对齐 spacing L / XL / XXL（16/20/24）；
 *   thumb 在 rail 内 flex 居中，translateX 只沿 X 轴移动 → 滑块到两端时
 *   与上下（Y 向）保持等距（垂直居中不被破坏），左右两端内缩也对称。
 *
 * 状态配色（对照 ToggleSwitch_themeresources.xaml，见样式段逐条注释）：
 *   rest / hover / pressed / checked / disabled / focus
 *
 * 无障碍：root 自带 role=switch + aria-checked；Space/Enter/◀▶ 键盘切换；
 * aria-label / aria-labelledby 自动接线；表单内 + name 时补隐藏原生复选框。
 */
export type FluereToggleSwitchSize = 'small' | 'medium' | 'large'

export interface FluereToggleSwitchProps {
  /**
   * 是否选中（v-model）
   * @default false
   */
  modelValue?: boolean

  /**
   * 是否禁用
   * @default false
   */
  disabled?: boolean

  /**
   * 尺寸：small / medium / large
   * @default 'medium'
   */
  size?: FluereToggleSwitchSize

  /**
   * 表单提交名（配合 name 自动补隐藏原生 checkbox input）
   */
  name?: string

  /**
   * 开启时提交给后端的值（配合 name 使用）
   * @default 'on'
   */
  value?: string

  /**
   * 可访问名称（无障碍）。缺省时优先取内容插槽文本，其次 header 插槽文本。
   */
  label?: string
}
</script>

<script setup lang="ts">
import { computed, ref, useId } from 'vue'

/**
 * 唯一 id 用 Vue 的 `useId()`（SSR / 水合一致）。
 * 不能用 `getCurrentInstance().uid`：它依赖实例创建顺序，服务端与客户端不一致，
 * 会让 label / aria-labelledby 指向的 id 在水合时报 attribute mismatch（见 docs/ssr-guide.md）。
 */
const instanceId = useId()
const labelId = computed(() => `fui-sw-${instanceId}-label`)
const headerId = computed(() => `fui-sw-${instanceId}-header`)

const props = withDefaults(defineProps<FluereToggleSwitchProps>(), {
  modelValue: undefined,
  disabled: false,
  size: 'medium',
  name: undefined,
  value: 'on',
  label: undefined,
})
const model = defineModel<boolean>({ default: false })

/** 拖拽一旦开始位移超过此阈值，即视为「拖动」（否则当点击处理切换状态） */
const DRAG_THRESHOLD = 4
/** 滑块进度最小值（= Off 端），同时是 travel 合法性的下界 */
const PROGRESS_MIN = 0
/** 滑块进度最大值（= On 端） */
const PROGRESS_MAX = 1
/** 拖拽释放切向判定中点：进度 ≥ 此值视为 On */
const DRAG_MIDPOINT = 0.5
/** 兜底 travel 像素（medium 档 40×20 的行程），读取失败时回退 */
const DEFAULT_TRAVEL_PX = 20

const rootEl = ref<HTMLElement | null>(null)
const disabled = computed(() => props.disabled)

/** 是否正在按下（同时驱动轨道按下配色 + 滑块 active 增宽） */
const pressed = ref(false)
/** 是否正在拖拽（驱动 will-change + 关闭过渡） */
const dragging = ref(false)
/**
 * 拖拽过程中的滑块进度 0..1。为空 = 非拖拽，位置由 modelValue 决定（0 或 1）。
 * 用 CSS 变量计算 translateX(calc(var(--travel) * progress))，SSR 无需读到像素。
 */
const dragProgress = ref<number | null>(null)

/** 每次渲染落地的滑块进度（拖拽中跟随指针，否则取 end 态 0/1） */
const styleProgress = computed(() =>
  dragging.value ? (dragProgress.value ?? PROGRESS_MIN) : model.value ? PROGRESS_MAX : PROGRESS_MIN,
)

/** 滑块滑轨位移。常态内联 transform 会随 progress 走 CSS transition；拖拽中才加 will-change */
const railStyle = computed(() => ({
  transform: `translateX(calc(var(--travel) * ${styleProgress.value}))`,
  ...(dragging.value ? { willChange: 'transform' } : {}),
}))

/** 读当前尺寸的 travel（px），拖拽钳位用。仅在浏览器指针交互时读取，SSR 安全 */
const travelPx = (): number => {
  const el = rootEl.value
  if (!el) {
    return DEFAULT_TRAVEL_PX
  }
  const raw = getComputedStyle(el).getPropertyValue('--travel').trim()
  const parsed = Number.parseFloat(raw)
  return Number.isFinite(parsed) && parsed > PROGRESS_MIN ? parsed : DEFAULT_TRAVEL_PX
}

const clamp01 = (v: number) =>
  v < PROGRESS_MIN ? PROGRESS_MIN : v > PROGRESS_MAX ? PROGRESS_MAX : v

let pointerId: number | null = null
let startX = 0
let startProgress = 0
let hasMoved = false
/** 「本次按下经历了拖动」标志：让随后的 click 直通，避免二次切换 */
const suppressClick = ref(false)

function onPointerDown(e: PointerEvent) {
  if (disabled.value) {
    return
  }
  pressed.value = true
  pointerId = e.pointerId
  startX = e.clientX
  startProgress = dragProgress.value ?? styleProgress.value
  hasMoved = false
  dragProgress.value = startProgress
  ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (disabled.value || pointerId === null || e.pointerId !== pointerId) {
    return
  }
  const dx = e.clientX - startX
  if (!hasMoved && Math.abs(dx) > DRAG_THRESHOLD) {
    hasMoved = true
    dragging.value = true
  }
  if (hasMoved) {
    dragProgress.value = clamp01(startProgress + dx / travelPx())
  }
}

function onPointerUp(_e: PointerEvent) {
  finishInteraction()
}

function onPointerCancel() {
  finishInteraction(true)
}

/** 收尾拖拽/点按：拖动则落到最近终点；点按（无位移）留给原生 click 切换 */
function finishInteraction(cancel = false) {
  if (pointerId === null) {
    return
  }
  pointerId = null
  if (cancel) {
    dragging.value = false
    pressed.value = false
    dragProgress.value = null
    return
  }
  if (hasMoved) {
    // 拖到中点右侧 → On，否则 Off；然后让滑块从当前进度缓动到终点
    model.value = (dragProgress.value ?? PROGRESS_MIN) >= DRAG_MIDPOINT
    suppressClick.value = true
  }
  dragging.value = false
  pressed.value = false
  dragProgress.value = null
}

/** 点击切换（原生 click：鼠标快速点按 + 触摸 tap）。拖动后此方法被降级为 no-op */
function handleClick() {
  if (suppressClick.value) {
    suppressClick.value = false
    return
  }
  if (disabled.value) {
    return
  }
  model.value = !model.value
}

/** 键盘：Space/Enter 切换，◀ 关 ▶ 开（preventDefault 阻断按钮原生 click，避免双切） */
function onKeydown(e: KeyboardEvent) {
  if (disabled.value) {
    return
  }
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault()
    model.value = !model.value
    return
  }
  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    model.value = false
    return
  }
  if (e.key === 'ArrowRight') {
    e.preventDefault()
    model.value = true
  }
}

/** 可访问名优先级：label > 行标签插槽 > header 插槽（均无时留给 on-content） */
const ariaLabel = computed(() => {
  if (props.label) {
    return props.label
  }
  return undefined
})
defineOptions({ name: 'FluereToggleSwitch' })
</script>

<template>
  <span class="fui-switch-host">
    <button
      ref="rootEl"
      type="button"
      role="switch"
      :disabled="disabled"
      :data-state="model ? 'checked' : 'unchecked'"
      :data-size="size"
      :data-disabled="disabled ? '' : undefined"
      :data-pressed="pressed ? '' : undefined"
      :data-dragging="dragging ? '' : undefined"
      :aria-checked="model ? 'true' : 'false'"
      :aria-label="ariaLabel ?? undefined"
      :aria-labelledby="
        !ariaLabel && $slots.default ? labelId : !ariaLabel && $slots.header ? headerId : undefined
      "
      class="fui-switch"
      @click="handleClick"
      @keydown="onKeydown"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerCancel"
    >
      <!-- 顶部说明行（WinUI HeaderContentPresenter，可选） -->
      <span
        v-if="$slots.header"
        :id="headerId"
        class="fui-switch__header"
      >
        <slot name="header" />
      </span>

      <!-- 主行：轨道 + 内容 -->
      <span class="fui-switch__row">
        <!-- 轨道：内部 rail 承载滑块，水平位移由 translateX 驱动 -->
        <span class="fui-switch__track">
          <!-- 限制内部椭圆渲染不能超出药丸区域 -->
          <div
            class="absolute inset-0"
            style="
              clip-path: inset(
                calc((var(--track-h) - var(--thumb-h-pressed) - 2px) / 2) round 999px
              );
            "
          >
            <!-- 负责移动逻辑 -->
            <span
              class="fui-switch__rail"
              :style="railStyle"
            >
              <!-- 负责填充元素实现 -->
              <span class="fui-switch__thumb" />
            </span>
          </div>
        </span>

        <span class="fui-switch__content">
          <!-- On/Off 内容：同一格交叉淡入淡出（WinUI OnContent/OffContent） -->
          <span
            v-if="$slots['on-content'] || $slots['off-content']"
            class="fui-switch__content-swap"
          >
            <span class="fui-switch__off-content">
              <slot name="off-content" />
            </span>
            <span class="fui-switch__on-content">
              <slot name="on-content" />
            </span>
          </span>
          <!-- 行标签（默认插槽，同时是有语义的可见文本） -->
          <span
            v-if="$slots.default"
            :id="labelId"
            class="fui-switch__label"
          >
            <slot />
          </span>
        </span>
      </span>
    </button>

    <!-- 表单提交：位于表单内 + name 时补隐藏原生 checkbox（随 form 提交） -->
    <input
      v-if="name"
      class="fui-switch__input"
      type="checkbox"
      :name="name"
      :value="value"
      :checked="model"
      :disabled="disabled"
    />
  </span>
</template>

<style scoped>
/* ------------------------------------------------------------------ */
/* 所有值均引用 Fluent 语义 token（var(--TokenName)），见 fluent-tokens  */
/* 明暗主题由 tokens.css 的 light-dark() + color-scheme 自动切换        */
/*                                                                     */
/* WinUI 3 对照（Windows App SDK 1.8，src/controls/dev/CommonStyles/   */
/* ToggleSwitch_themeresources.xaml + Common_themeresources.xaml）：    */
/*   轨道 /=  OuterBorder(Off 填色) + SwitchKnobBounds(On 填色) 合并    */
/*   ToggleSwitchFillOff*        = ControlAltFillColorSecondary..       */
/*     → colorNeutralBackground3/4/5（未选中轨道 rest/hover/pressed）   */
/*   ToggleSwitchStrokeOff*      = ControlStrongStrokeColorDefault/D..  */
/*     → colorNeutralStrokeAccessible / colorNeutralStrokeDisabled      */
/*   ToggleSwitchFillOn* / On*   = AccentFillColor Default..Tertiary    */
/*     → colorCompoundBrandBackground(/Hover/Pressed)                   */
/*   ToggleSwitchKnobFillOff*    = TextFillColorSecondary               */
/*     → colorNeutralForeground2                                        */
/*   ToggleSwitchKnobFillOn*     = TextOnAccentFillColorPrimary/…Disabled */
/*     → colorNeutralForegroundOnBrand / colorNeutralForegroundDisabled */
/*   ToggleSwitchContent/HeaderForeground = TextFillColorPrimary/…D     */
/*     → colorNeutralForeground1 / colorNeutralForegroundDisabled       */
/*   ToggleSwitchContainerBackground* = SubtleFillColorTransparent      */
/*     → 根/宿主背景透明，只露轨道                                         */
/* 动效：WinUI ControlFasterAnimationDuration + ControlFastOutSlowIn    */
/*   → transition(durationFast / durationNormal) + curveEasyEase(Max)   */
/* ------------------------------------------------------------------ */

/* ---- 宿主：定位 + 隐藏表单 input ---- */
.fui-switch-host {
  display: inline-block;
  position: relative;
}
.fui-switch__input {
  position: absolute;
  inset: 0;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

/* ---- 尺寸映射（仅 medium 对齐 WinUI；small/large 取 Fluent 尺寸标度） ---- */
/* travel（16/20/24）分别对齐 spacingHorizontal L / XL / XXL；              */
/* 轨道宽 = 2×travel，轨道高 = travel；thumb 在 rail 内 flex 居中 →          */
/* 滑块到两端时 Y 向等距、左右内缩也对称（满足需求 1）。                       */
.fui-switch {
  --track-w: 40px;
  --track-h: 20px;
  --travel: 20px; /* 轨道宽的一半 = 滑块行程 = 轨道高 */
  --thumb-w: 12px;
  --thumb-h: 12px;
  /* active 药丸宽 = travel - 1px（在行程内再多长 2px 水平视觉宽度，仍 < travel 不出轨道） */
  --thumb-w-pressed: 19px;
  --thumb-h-pressed: 14px;
  --thumb-scale-hover: 1.1667; /* hover 放大  12→14 */

  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacingVerticalSNudge);
  padding: 0;
  box-sizing: border-box;
  background: transparent; /* ToggleSwitchContainerBackground* = SubtleFillColorTransparent */
  color: var(--colorNeutralForeground1); /* ToggleSwitchContentForeground = TextFillColorPrimary */
  font-family: var(--fontFamilyBase);
  font-size: var(--fontSizeBase300);
  line-height: var(--lineHeightBase300);
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  outline: none;
}
.fui-switch[data-size='small'] {
  --track-w: 32px;
  --track-h: 16px;
  --travel: 16px; /* spacingHorizontalL */
  --thumb-w: 10px;
  --thumb-h: 10px;
  --thumb-w-pressed: 15px; /* small：匹配增宽（travel16 - 1px），仍 < travel */
  --thumb-h-pressed: 12px;
  --thumb-scale-hover: 1.2; /* 10→12 */
}
.fui-switch[data-size='large'] {
  --track-w: 48px;
  --track-h: 24px;
  --travel: 24px; /* spacingHorizontalXXL */
  --thumb-w: 14px;
  --thumb-h: 14px;
  --thumb-w-pressed: 23px; /* large：匹配增宽（travel24 - 1px），仍 < travel */
  --thumb-h-pressed: 16px;
  --thumb-scale-hover: 1.1429; /* 14→16 */
}

/* ---- 主行 ---- */
.fui-switch__row {
  display: flex;
  align-items: center;
  gap: var(--spacingHorizontalM); /* 轨道与内容间距 12px */
}

/* ---- 轨道：胶囊，Off/On 用 background-color 过渡（合并 WinUI 双矩形） ---- */
.fui-switch__track {
  position: relative;
  width: var(--track-w);
  height: var(--track-h);
  box-sizing: border-box;
  flex-shrink: 0;
  border-radius: var(--borderRadiusCircular); /* RadiusX/Y=10 → 全圆 */
  background-color: var(--colorNeutralBackground3); /* ToggleSwitchFillOff */
  border: var(--strokeWidthThin) solid var(--colorNeutralStrokeAccessible); /* StrokeOff */
  transition:
    background-color var(--durationFast) var(--curveEasyEase),
    border-color var(--durationFast) var(--curveEasyEase);
}

/* ---- rail：宽 = 行程 travel 再扣去两侧描边，translateX 驱动位移，transform 走合成层 ---- */
.fui-switch__rail {
  position: absolute;
  left: 0;
  top: 0;
  box-sizing: border-box;
  width: calc(
    var(--travel) - 2 * var(--strokeWidthThin)
  ); /* = 轨道宽的一半，扣描边 → 端点不压轨道描边 */
  height: 100%;
  display: flex;
  align-items: center; /* 垂直居中 → 滑块到两端仍与上下等距（需求 1） */
  justify-content: center;
  /* 位移用 translateX + CSS 变量，不用 left/right；常态保留过渡，拖拽时关闭 */
  transition: transform var(--durationNormal) var(--curveEasyEaseMax);
}
.fui-switch[data-dragging] .fui-switch__rail {
  transition: none; /* 拖拽时跟随指针，去掉缓动 */
}

/* ---- thumb：固定「最大外框」（= active 药丸 19×14 / 15×12 / 23×16），形状由 clip-path 裁切决定 ---- */
/* 关键：width/height/border-radius 全部静态（在 active 时不变）→ 不触发布局/回流，        */
/* 彻底消除 Chrome 改 width/height 产生的像素抖动。常态只露中央圆点，hover 露稍大圆点，        */
/* active 全露药丸；三态都是 inset(... round ...)，圆角可随 clip-path 平滑插值。             */
.fui-switch__thumb {
  box-sizing: border-box;
  /* 外框恒为 pressed 尺寸：活动时不再改布局尺寸，形状只靠 clip-path 裁切 */
  width: var(--thumb-w-pressed);
  height: var(--thumb-h-pressed);
  border-radius: calc(var(--thumb-h-pressed) / 2); /* 药丸外框的静态圆角（< 直径 → 胶囊） */
  background-color: var(--colorNeutralForeground2); /* ToggleSwitchKnobFillOff */
  /* 常态：从固定药丸四周裁掉 (pressed - rest)/2，露出居中的 rest 直径圆点 */
  clip-path: inset(
    calc((var(--thumb-h-pressed) - var(--thumb-h)) / 2)
      calc((var(--thumb-w-pressed) - var(--thumb-w)) / 2) round calc(var(--thumb-h) / 2)
  );
  will-change: auto;
  transition:
    clip-path var(--durationFast) var(--curveEasyEaseMax),
    background-color var(--durationFast) var(--curveEasyEase);
}

/* ---- 轨道/滑块 On 配色 ---- */
.fui-switch[data-state='checked'] .fui-switch__track {
  background-color: var(--colorCompoundBrandBackground); /* ToggleSwitchFillOn */
  border-color: var(--colorCompoundBrandBackground); /* ToggleSwitchStrokeOn */
}
.fui-switch[data-state='checked'] .fui-switch__thumb {
  background-color: var(--colorNeutralForegroundOnBrand); /* ToggleSwitchKnobFillOn */
}

/* ---- hover -- */
/* 未选中 hover：轨道暗一档（ControlAltFillColorSecondary→Tertiary），描边不变 */
.fui-switch:hover:not(:disabled):not([data-disabled])[data-state='unchecked'] .fui-switch__track {
  background-color: var(--colorNeutralBackground4);
}
.fui-switch:hover:not(:disabled):not([data-disabled]) .fui-switch__thumb {
  /* hover 圆点稍大：把裁掉的四周收到 hover 圆直径，仍为圆（clip-path，不动布局） */
  clip-path: inset(
    calc((var(--thumb-h-pressed) - var(--thumb-h) * var(--thumb-scale-hover)) / 2)
      calc((var(--thumb-w-pressed) - var(--thumb-w) * var(--thumb-scale-hover)) / 2) round
      calc(var(--thumb-h) * var(--thumb-scale-hover) / 2)
  );
}
/* 选中 hover：AccentFillColorDefault→Secondary */
.fui-switch:hover:not(:disabled):not([data-disabled])[data-state='checked'] .fui-switch__track {
  background-color: var(--colorCompoundBrandBackgroundHover);
  border-color: var(--colorCompoundBrandBackgroundHover);
}

/* ---- pressed -- */
/* active：轨道按下配色 + 滑块仅在原地「变丸」（固定外框 + clip-path 裁切，居中生长）
   -- 不做任何位移/锚定缩放，也不改布局尺寸；滑块始终被 rail 夹在轨道内
   （active 宽度 < travel，天然无法离开轨道区域）。 */
.fui-switch[data-pressed]:not(:disabled):not([data-disabled])[data-state='unchecked']
  .fui-switch__track {
  background-color: var(--colorNeutralBackground5); /* ControlAltFillColorQuarternary */
}
.fui-switch[data-pressed]:not(:disabled):not([data-disabled])[data-state='checked']
  .fui-switch__track {
  background-color: var(--colorCompoundBrandBackgroundPressed);
  border-color: var(--colorCompoundBrandBackgroundPressed);
}
/* 药丸 = 全露固定外框。形状与几何都不再变，仅 clip-path 从圆点切到 inset(0)，
   （inset 圆角可插值 → 圆←→药丸平滑过渡），零布局、零回流。 */
.fui-switch[data-pressed]:not(:disabled):not([data-disabled]) .fui-switch__thumb {
  clip-path: inset(0 round calc(var(--thumb-h-pressed) / 2));
}

/* ---- disabled：全套 …Disabled 档（置于状态规则之后以赢得同权重平局） ---- */
.fui-switch:disabled {
  color: var(--colorNeutralForegroundDisabled); /* TextFillColorDisabled */
  cursor: not-allowed;
}
.fui-switch:disabled .fui-switch__track {
  background-color: var(--colorNeutralBackgroundDisabled); /* AccentFillColorDisabled */
  border-color: var(--colorNeutralStrokeDisabled); /* ControlStrongStrokeColorDisabled */
}
.fui-switch:disabled .fui-switch__thumb {
  background-color: var(--colorNeutralForegroundDisabled); /* KnobFillOff/O 禁用 */
  box-shadow: none;
}

/* ---- 内容区 ---- */
.fui-switch__content {
  display: flex;
  align-items: center;
  gap: var(--spacingHorizontalS);
  min-width: 0;
  color: inherit;
}
.fui-switch__content-swap {
  display: grid;
}
.fui-switch__on-content,
.fui-switch__off-content {
  grid-area: 1 / 1;
  opacity: 0;
  white-space: nowrap;
  transition: opacity var(--durationFast) var(--curveEasyEase);
}
.fui-switch[data-state='checked'] .fui-switch__on-content {
  opacity: 1;
}
.fui-switch[data-state='unchecked'] .fui-switch__off-content {
  opacity: 1;
}
.fui-switch__label {
  min-width: 0;
}

/* ---- header：顶部说明行 ---- */
.fui-switch__header {
  color: inherit;
}

/* ---- focus：a11y focus ring ---- */
.fui-switch:focus-visible {
  outline: var(--strokeWidthThick) solid var(--colorCompoundBrandStroke);
  outline-offset: 2px;
}

/* ---- 动效尊重系统减弱 -- */
@media (prefers-reduced-motion: reduce) {
  .fui-switch,
  .fui-switch * {
    transition: none !important;
  }
}
</style>
