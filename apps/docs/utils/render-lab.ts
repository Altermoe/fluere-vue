/**
 * Render Lab 应用的**纯计算部分**（无 DOM、无 WebGL 上下文）—— 可在 vitest 里单测。
 *
 * ## 为什么要把这几行抽出来
 *
 * `render-lab-window.vue` 里绝大多数代码是 WebGL 调用（`getContext` / 着色器 / 绘制），
 * 它们在 jsdom 里跑不起来（没有 WebGL2 上下文，也没有 `@nuxt/test-utils` 做组件级测试）。
 * 于是把**能纯函数化的判定**全部搬到这里，浏览器里的真实验收只负责「画出来了没有、
 * 像素对不对、降级文案出没出」这类只能实测的部分（见 explorer-layout.md §7）。
 *
 * 三件事：设备像素比换算（backing store 尺寸）、旋转角（时间 → 弧度）、旋转矩阵（mat3）。
 * 三角形顶点数据也放这里：它是**构图参数**（无 WinUI 来源），单独成常量便于测试与覆写。
 */

/** backing store 的设备像素比上限。超过 2 的收益肉眼不可见，代价是 4 倍填充率 */
export const RENDER_LAB_MAX_DPR = 2

/** 旋转一圈的时长（ms）。取 8s：明显看得出在转，又不会快到让人分心 */
export const RENDER_LAB_TURN_MS = 8000

/** 三角形顶点数（内接正三角形） */
export const RENDER_LAB_VERTEX_COUNT = 3

/**
 * 顶点位置（NDC，`[-1, 1]`；每个顶点 2 个分量，共 6 个数）。
 *
 * 正三角形外接圆半径 0.75 —— 留出边距，免得旋转到「尖朝左右」时顶点贴到画布边缘被裁。
 * 三个顶点：上、左下、右下（逆时针，正面朝向观察者）。
 */
export const RENDER_LAB_POSITIONS = new Float32Array([
  0, 0.75, -0.6495190528, -0.375, 0.6495190528, -0.375,
])

/** backing store 尺寸（设备像素） */
export interface RenderLabPixelSize {
  /** canvas `width` 属性（设备像素，≥ 1） */
  width: number
  /** canvas `height` 属性（设备像素，≥ 1） */
  height: number
  /** 实际采用的设备像素比（已夹到 `[1, RENDER_LAB_MAX_DPR]`） */
  dpr: number
}

/**
 * CSS 尺寸 + `devicePixelRatio` → canvas backing store 尺寸。
 *
 * 规则：DPR 夹到 `[1, 2]`（`RENDER_LAB_MAX_DPR`）；非有限值按 1 处理；结果至少 1×1
 * （`<canvas width="0">` 在部分引擎上会退化成 300×150 的默认尺寸，反而画出错误的画布）。
 */
export function renderLabPixelSize(
  cssWidth: number,
  cssHeight: number,
  devicePixelRatio: number,
): RenderLabPixelSize {
  const rawDpr = Number.isFinite(devicePixelRatio) ? devicePixelRatio : 1
  const dpr = Math.min(Math.max(rawDpr, 1), RENDER_LAB_MAX_DPR)
  const width = Math.max(1, Math.round((Number.isFinite(cssWidth) ? cssWidth : 0) * dpr))
  const height = Math.max(1, Math.round((Number.isFinite(cssHeight) ? cssHeight : 0) * dpr))
  return { width, height, dpr }
}

/**
 * 已运行时长（ms）→ 绕 Z 轴旋转角（弧度）。
 *
 * 取模而不是累加：长时间运行后浮点精度不会退化，且「标签页切回来」不会一次跳好几圈。
 * 非有限值按 0 处理（NaN 传进矩阵会让整块画布消失）。
 */
export function renderLabRotation(elapsedMs: number): number {
  const elapsed = Number.isFinite(elapsedMs) ? elapsedMs : 0
  return ((elapsed % RENDER_LAB_TURN_MS) / RENDER_LAB_TURN_MS) * Math.PI * 2
}

/**
 * 绕 Z 轴的旋转矩阵（**列主序 mat3**，9 个分量）。
 *
 * 列主序（column-major）是 WebGL / GLSL 的 `mat3` 布局约定：数组前三个数是第一列。
 * 直接喂给 `uniformMatrix3fv(location, false, matrix)`。
 */
export function renderLabRotationMatrix(angle: number): Float32Array {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return new Float32Array([cos, sin, 0, -sin, cos, 0, 0, 0, 1])
}

/** sRGB 三元组，分量取值 `[0, 1]`（三角形顶点的颜色） */
export type RenderLabRgb = readonly [number, number, number]

/** 交错顶点缓冲的步长（float 数）：`x, y, r, g, b` */
export const RENDER_LAB_VERTEX_STRIDE_FLOATS = 5

/**
 * 两个 token 色的中点（第三个顶点用它）。
 *
 * 为什么不引第三枚颜色令牌：`--windowsAccent*` 只有 Primary / Light2 两枚，
 * 而三角形需要三个顶点色。取中点让三色同源（同一套强调色token），
 * 不引入任何新的色值 —— 若将来有了第三枚语义色，替换此处即可。
 */
export function renderLabBlend(a: RenderLabRgb, b: RenderLabRgb): RenderLabRgb {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]
}

/**
 * 交错顶点数据（每个顶点 `x, y, r, g, b`，共 `RENDER_LAB_VERTEX_COUNT` 个顶点）。
 *
 * 交错（interleaved）而非分两个缓冲：一次 `bufferData` + 两条 `vertexAttribPointer`
 * 就够，且数据布局在测试里可以逐位断言（颜色确实落在对应顶点上）。
 */
export function renderLabVertexData(colors: readonly RenderLabRgb[]): Float32Array {
  const data = new Float32Array(RENDER_LAB_VERTEX_COUNT * RENDER_LAB_VERTEX_STRIDE_FLOATS)
  for (let index = 0; index < RENDER_LAB_VERTEX_COUNT; index += 1) {
    const color = colors[index] ?? [0, 0, 0]
    const offset = index * RENDER_LAB_VERTEX_STRIDE_FLOATS
    data[offset] = RENDER_LAB_POSITIONS[index * 2] ?? 0
    data[offset + 1] = RENDER_LAB_POSITIONS[index * 2 + 1] ?? 0
    data[offset + 2] = color[0]
    data[offset + 3] = color[1]
    data[offset + 4] = color[2]
  }
  return data
}
