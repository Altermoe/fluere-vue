/**
 * 视图过渡（View Transition API）——「圆形揭示」。
 *
 * 主题切换时以切换按钮为圆心，向外扩散一枚圆形区域完成 color-scheme 切换：
 * 浏览器把「旧主题」与「新主题」各截一张整页快照叠放，旧快照作底层、新快照作顶层，
 * 这里只用 Web Animations API 推动顶层快照的 `clip-path`，被裁掉的部分自然露出
 * 底层旧主题，于是得到「新主题从按钮处向外扩圆」的动效（基础样式见
 * assets/theme-transition.css）。逐元素的 transition 无法做到这种整页揭示，
 * 且无需为任何组件补过渡声明。
 *
 * 几何量一律用「视口百分比」表达，这是本实现抗缩放的关键：
 * - 圆心 `x% / y%` 相对快照盒（= 布局视口，`documentElement.clientWidth/Height`）；
 * - 半径按 `clip-path: circle()` 的百分比参考长度 √(w²+h²)/√2 折算。
 *
 * 页面缩放（page zoom）只改变 CSS 像素 ↔ 设备像素的换算比例，而 `clientX/Y`、
 * 元素矩形、`clientWidth/Height` 同为 CSS 像素、百分比又纯属相对量，因此圆心不会
 * 随缩放漂移，半径也始终能覆盖最远角；DPR（deviceScaleFactor）同理与之无关。
 */

/** 视口坐标点（CSS 像素） */
interface ViewportPoint {
  x: number
  y: number
}

/** 圆形揭示几何：圆心与半径，全部为百分比（含义见文件头注释） */
interface CircularReveal {
  x: number
  y: number
  radius: number
}

interface CircularRevealOptions {
  /** 状态变更回调，在视图过渡的更新回调内同步执行 */
  apply: () => void
  /** 指针位置（视口坐标），键盘触发时省略 */
  point?: ViewportPoint | undefined
  /** 指针位置缺失时的锚点元素（取几何中心为圆心） */
  anchor?: Element | null | undefined
}

/** 百分比基准：`ratio * PERCENT` 得到百分比 */
const PERCENT = 100

/** 视口尺寸退化为 0（理论上的极端情况）时的兜底边长 */
const FALLBACK_VIEWPORT_SIZE = 1

/** 无法取得指针/锚点时，圆心落在视口正中 */
const CENTER_PERCENT = 50

/** 取中点：位置 × MIDPOINT_FACTOR */
const MIDPOINT_FACTOR = 0.5

/** 覆盖最远角时预留的半径余量，避免边界像素漏出旧快照 */
const RADIUS_SAFETY = 1.02

/** 兜底的动效参数（token 不可用时）：对齐 --durationSlower / --curveDecelerateMid */
const FALLBACK_DURATION_MS = 400
const FALLBACK_EASING = 'cubic-bezier(0,0,0,1)'
const DURATION_TOKEN = '--durationUltraSlow'
const EASING_TOKEN = '--curveEasyEase'

/**
 * `clip-path: circle()` 半径百分比的参考长度：√(width² + height²) / √2。
 * 即 `半径 = 参考长度 × 百分比`。
 */
const circleRadiusReference = (width: number, height: number) =>
  Math.hypot(width, height) / Math.SQRT2

/**
 * 把「视口内的圆心」换算成 clip-path 百分比几何：
 * 半径取圆心到最远角的距离，保证终帧完整覆盖视口。
 */
const resolveCircularReveal = (input: {
  center: ViewportPoint
  viewport: { width: number; height: number }
}): CircularReveal => {
  const { center, viewport } = input
  const width = viewport.width || FALLBACK_VIEWPORT_SIZE
  const height = viewport.height || FALLBACK_VIEWPORT_SIZE
  const reference = circleRadiusReference(width, height)
  const cornerDistance = Math.hypot(
    Math.max(center.x, width - center.x),
    Math.max(center.y, height - center.y),
  )
  return {
    x: (center.x / width) * PERCENT,
    y: (center.y / height) * PERCENT,
    radius: (cornerDistance / reference) * PERCENT * RADIUS_SAFETY,
  }
}

/** 用户是否要求减少动效（此时不做揭示，直接切换） */
const prefersReducedMotion = () =>
  typeof globalThis.matchMedia === 'function' &&
  globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches

/** 读取 Fluent 动效 token；自定义属性在计算值里仍是原始 token 文本，WAAPI 可直接使用 */
const readToken = (name: string, fallback: string) => {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

const readDuration = () => {
  const parsed = Number.parseFloat(readToken(DURATION_TOKEN, String(FALLBACK_DURATION_MS)))
  return Number.isFinite(parsed) ? parsed : FALLBACK_DURATION_MS
}

/** 键盘激活（Enter/Space）的 MouseEvent 坐标恒为 0，此时回退到按钮中心 */
const resolveCenter = (
  point: ViewportPoint | undefined,
  anchor: Element | null | undefined,
  viewport: { width: number; height: number },
): ViewportPoint => {
  if (point) {
    return point
  }
  if (anchor) {
    const rect = anchor.getBoundingClientRect()
    return {
      x: rect.left + rect.width * MIDPOINT_FACTOR,
      y: rect.top + rect.height * MIDPOINT_FACTOR,
    }
  }
  return {
    x: viewport.width * MIDPOINT_FACTOR || CENTER_PERCENT,
    y: viewport.height * MIDPOINT_FACTOR || CENTER_PERCENT,
  }
}

/** 正在进行的揭示，用于处理快速连点 */
let activeTransition: ViewTransition | null = null

/**
 * 执行一次「圆形揭示」。任何环境不支持（无 View Transition API）、用户偏好减少动效、
 * 或上一次揭示尚未结束时，都会退化为同步切换 —— 状态变更始终由 `apply` 完成，
 * 动效只是锦上添花。
 */
const runCircularReveal = async ({
  apply,
  point,
  anchor,
}: CircularRevealOptions): Promise<void> => {
  if (typeof document === 'undefined') {
    apply()
    return
  }

  const startViewTransition = document.startViewTransition?.bind(document)

  if (!startViewTransition || prefersReducedMotion()) {
    apply()
    return
  }

  // 快速连点：立即结束上一段揭示并同步切换，避免新快照与播放中的动画打架。
  if (activeTransition) {
    activeTransition.skipTransition()
    activeTransition = null
    apply()
    return
  }

  const viewport = {
    width: document.documentElement.clientWidth,
    height: document.documentElement.clientHeight,
  }
  const { x, y, radius } = resolveCircularReveal({
    center: resolveCenter(point, anchor, viewport),
    viewport,
  })

  try {
    const transition = startViewTransition(() => {
      apply()
    })
    activeTransition = transition
    await transition.ready
    document.documentElement.animate(
      {
        // 圆心与半径都是百分比：缩放页面下不产生坐标漂移
        clipPath: [`circle(0% at ${x}% ${y}%)`, `circle(${radius}% at ${x}% ${y}%)`],
      },
      {
        duration: readDuration(),
        easing: readToken(EASING_TOKEN, FALLBACK_EASING),
        pseudoElement: '::view-transition-new(root)',
      },
    )
    await transition.finished
  } catch {
    // 过渡被跳过或中途取消：apply 已写入最终状态，无需补偿
  } finally {
    activeTransition = null
  }
}

export { circleRadiusReference, resolveCircularReveal, runCircularReveal }
export type { CircularReveal, CircularRevealOptions, ViewportPoint }
