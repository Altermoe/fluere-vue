<script setup lang="ts">
/**
 * Render Lab 应用的**窗口内容**（0.5.9 新增）—— 一个持续旋转的 WebGL2 彩色三角。
 *
 * ## 为什么是「最小第二应用」
 *
 * 多窗口的层级 / 焦点切换必须有**第二扇窗口**才谈得上验收（单窗口下 z 序永不变化，
 * 见 `utils/shell-apps.ts` 的文件头）。本应用是本期的最小实现：独立窗口（宿主只给它
 * 框体 + 内容区），内容 = 一个 canvas。后续会长成重应用（材质 / 后处理 / 手势），
 * 因此这里刻意把**能纯函数化的部分**全部推到 `utils/render-lab.ts`，SFC 只留 WebGL 调用。
 *
 * ## 分层
 *
 * | 事项                                        | 归谁                        |
 * | ------------------------------------------- | --------------------------- |
 * | 窗口框体 / 位置 / 尺寸 / 层级 / 拖拽 / 焦点   | `shell-window-host.vue`     |
 * | canvas backing store 尺寸 / 旋转角 / 矩阵     | `utils/render-lab.ts`（单测）|
 * | WebGL 上下文 / 着色器 / 绘制 / 降级            | 本组件（只能浏览器实测）     |
 *
 * ## 颜色**全部来自设计令牌**（不写死色值）
 *
 * 三角形的三个顶点色 = `--windowsAccentPrimary` / `--windowsAccentLight2` /
 * 两者中点（`renderLabBlend`，见 utils/render-lab.ts 的理由）。
 *
 * 读取方式：往 `<body>` 临时插一个 `background-color: var(--token)` 的探针元素，
 * 读 `getComputedStyle` 的 `backgroundColor` 再删掉 —— 而不是
 * `getPropertyValue('--token')`。原因：自定义属性的计算值是**未解析的 token 流**
 * （`light-dark(#0f6cbd, #115ea3)` 原样返回），而真实属性（`background-color`）的
 * 计算值已经按当前 `color-scheme` / 明暗解析成 `rgb(...)`。两枚强调色恰好是纯 hex，
 * 用探针是为了**换任何一枚语义色都不用改这段代码**（并在明暗切换时重新取值）。
 *
 * 解析规则：`rgb()/rgba()` 的三个通道 ÷ 255（sRGB 直传，不做线性化 —— 演示用途，
 * 记录为已知简化）；**读不到时视为无法初始化**（降级文案说明令牌或 WebGL2 不可用）。
 *
 * ## 循环与「合理静态形态」
 *
 * - 常规档 + 未开启 reduced-motion + 标签页可见 ⇒ `requestAnimationFrame` 持续旋转；
 * - `prefers-reduced-motion: reduce` ⇒ 不启动循环，保留一帧静态三角（形状完整、居中）；
 * - 窗口最小化 / 关闭（`running=false`）或标签页切到后台 ⇒ 暂停循环，重显时继续
 *   （`preserveDrawingBuffer: true` 保证暂停期间画布仍有内容，不会被浏览器清空）；
 * - 容器尺寸 / DPR 变化 ⇒ 重设 backing store 与 `viewport` 并立刻重绘一帧。
 *
 * ## 失败模式
 *
 * - `getContext('webgl2')` 返回 `null`（浏览器不支持 / 被禁用 / 令牌读不到）⇒
 *   不建上下文，窗口内显示降级文案（i18n `shell.apps.renderLab.unsupported`）；
 * - `webglcontextlost` ⇒ `preventDefault()` + 暂停循环 + 显示降级文案；浏览器随后
 *   触发 `webglcontextrestored` 时重建渲染器并恢复（这是 WebGL 的标准恢复流程）。
 *
 * ## SSR：本组件处于 ClientOnly 边界之内
 *
 * 桌面仿真的挂载点是 `/os` 的 `<ClientOnly>`（原则见 docs/ssr-guide.md
 * 〈文档站桌面仿真的 ClientOnly 边界〉）。canvas / WebGL 正是**天然不可能 SSR** 的
 * 那类内容 —— 本组件因此**不做任何 SSR 检查**，也不需要 `import.meta.client` 守卫。
 */

import { useReducedMotion } from '@fluere-vue/hooks'
import { onMounted, onScopeDispose, ref, watch } from 'vue'
import { useColorMode } from '~/composables/use-color-mode'
import { useDocsI18n } from '~/composables/use-docs-i18n'
import {
  RENDER_LAB_VERTEX_COUNT,
  RENDER_LAB_VERTEX_STRIDE_FLOATS,
  renderLabBlend,
  renderLabPixelSize,
  renderLabRotation,
  renderLabRotationMatrix,
  renderLabVertexData,
} from '~/utils/render-lab'
import type { RenderLabRgb } from '~/utils/render-lab'

const props = defineProps<{
  /**
   * 窗口是否处于常规档（`status === 'normal'`）。
   *
   * `false` = 最小化 / 关闭：本组件被宿主 `v-show` 隐藏（组件实例仍在），
   * 循环据此暂停 —— 隐藏时继续跑 rAF 是纯浪费（且 WebGL 在隐藏 canvas 上绘制无意义）。
   */
  running: boolean
}>()

const { t } = useDocsI18n()
/** 明暗模式（模块级 ref）：切换后令牌色要重新取一次，否则三角停在旧主题的配色 */
const { mode } = useColorMode()
const reducedMotion = useReducedMotion()

/** 根容器（`ResizeObserver` 的观察目标；canvas 撑满它） */
const rootRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

/**
 * 渲染器是否可用。
 *
 * 初值 `false`：挂载后按实测结果翻转 —— `false` 时显示降级文案、canvas 用 `v-show` 隐藏
 * （元素仍在 DOM 里，`getContext()` 在 `display: none` 的 canvas 上同样能建上下文）。
 * 上下文丢失期间也为 `false`（见 `onContextLost`）。
 */
const supported = ref(false)

/** 顶点着色的两枚令牌（第三枚取中点，见文件头） */
const COLOR_TOKENS = ['--windowsAccentPrimary', '--windowsAccentLight2'] as const

/**
 * 读一枚令牌的**解析后**颜色。
 *
 * 探针必须进文档树才能拿到解析值（`display: none` 的元素 `getComputedStyle` 仍可读，
 * 但挂到 `body` 上更稳），读完立即移除 —— 不留任何 DOM 痕迹、不触发额外布局读取成本。
 * `backgroundColor` 的计算值在支持 `light-dark()` 的引擎里已按当前 `color-scheme` 解析。
 */
const readTokenColor = (token: string): RenderLabRgb | null => {
  const probe = document.createElement('span')
  probe.setAttribute('aria-hidden', 'true')
  probe.style.position = 'absolute'
  probe.style.inlineSize = '0'
  probe.style.blockSize = '0'
  probe.style.pointerEvents = 'none'
  probe.style.backgroundColor = `var(${token})`
  document.body.appendChild(probe)
  const computed = getComputedStyle(probe).backgroundColor
  probe.remove()

  const channels = computed.match(/rgba?\((?<channels>[^)]+)\)/)?.groups?.channels
  if (!channels) {
    return null
  }
  const parts = channels.split(/[,\s/]+/).filter((part) => part.length > 0)
  const [red, green, blue] = parts.map((part) => Number.parseFloat(part))
  if (red === undefined || green === undefined || blue === undefined) {
    return null
  }
  if (![red, green, blue].every((value) => Number.isFinite(value))) {
    return null
  }
  return [red / 255, green / 255, blue / 255]
}

/** WebGL2 渲染器（上下文 + 程序 + 缓冲 + 旋转矩阵 uniform 位置） */
interface RenderLabRenderer {
  gl: WebGL2RenderingContext
  program: WebGLProgram
  buffer: WebGLBuffer
  rotationLocation: WebGLUniformLocation | null
}

const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
in vec3 a_color;
uniform mat3 u_rotation;
out vec3 v_color;
void main() {
  vec3 rotated = u_rotation * vec3(a_position, 1.0);
  gl_Position = vec4(rotated.xy, 0.0, 1.0);
  v_color = a_color;
}
`

const FRAGMENT_SHADER = `#version 300 es
precision mediump float;
in vec3 v_color;
out vec4 out_color;
void main() {
  out_color = vec4(v_color, 1.0);
}
`

let renderer: RenderLabRenderer | null = null
let frameHandle = 0
let elapsedMs = 0
let lastTimestamp = 0
let resizeObserver: ResizeObserver | null = null

/** 编译 + 链接一个着色器程序；任一步失败返回 `null`（调用方转降级） */
const createProgram = (
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
): WebGLProgram | null => {
  const compile = (type: number, source: string): WebGLShader | null => {
    const shader = gl.createShader(type)
    if (!shader) {
      return null
    }
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader)
      return null
    }
    return shader
  }

  const vertexShader = compile(gl.VERTEX_SHADER, vertexSource)
  const fragmentShader = compile(gl.FRAGMENT_SHADER, fragmentSource)
  if (!vertexShader || !fragmentShader) {
    return null
  }
  const program = gl.createProgram()
  if (!program) {
    gl.deleteShader(vertexShader)
    gl.deleteShader(fragmentShader)
    return null
  }
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)
  // 着色器对象链接后即可释放（程序已持有它的副本）
  gl.deleteShader(vertexShader)
  gl.deleteShader(fragmentShader)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program)
    return null
  }
  return program
}

/** 建渲染器（上下文 + 程序 + 顶点缓冲 + 属性绑定）；失败返回 `null` */
const createRenderer = (canvas: HTMLCanvasElement): RenderLabRenderer | null => {
  /*
   * `preserveDrawingBuffer: true`：暂停（最小化 / 后台标签页 / reduced-motion 静态帧）
   * 期间画布仍保留最后一帧 —— 默认的 `false` 下浏览器可在合成后清空绘制缓冲，
   * 窗口重显时会看到一块空画布。代价是一次额外的拷贝，演示规模下可忽略。
   */
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
  })
  if (!gl) {
    return null
  }
  const program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER)
  if (!program) {
    return null
  }
  const buffer = gl.createBuffer()
  if (!buffer) {
    gl.deleteProgram(program)
    return null
  }

  const positionLocation = gl.getAttribLocation(program, 'a_position')
  const colorLocation = gl.getAttribLocation(program, 'a_color')
  if (positionLocation < 0 || colorLocation < 0) {
    gl.deleteBuffer(buffer)
    gl.deleteProgram(program)
    return null
  }

  gl.useProgram(program)
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  const stride = RENDER_LAB_VERTEX_STRIDE_FLOATS * Float32Array.BYTES_PER_ELEMENT
  gl.enableVertexAttribArray(positionLocation)
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, stride, 0)
  gl.enableVertexAttribArray(colorLocation)
  gl.vertexAttribPointer(
    colorLocation,
    3,
    gl.FLOAT,
    false,
    stride,
    2 * Float32Array.BYTES_PER_ELEMENT,
  )

  return {
    gl,
    program,
    buffer,
    rotationLocation: gl.getUniformLocation(program, 'u_rotation'),
  }
}

/** 释放渲染器持有的 GL 资源（上下文本身由浏览器回收，不 `loseContext()`） */
const destroyRenderer = (): void => {
  if (!renderer) {
    return
  }
  renderer.gl.deleteBuffer(renderer.buffer)
  renderer.gl.deleteProgram(renderer.program)
  renderer = null
}

/**
 * 按当前令牌色上传顶点数据（位置 + 颜色）。
 *
 * 返回 `false` = 令牌读不到 ⇒ 调用方转降级文案（这一条与「浏览器不支持 WebGL2」共用
 * 同一句文案：两者都是「渲染器起不来」，对用户而言无需区分）。
 */
const uploadColors = (): boolean => {
  if (!renderer) {
    return false
  }
  const primary = readTokenColor(COLOR_TOKENS[0])
  const light = readTokenColor(COLOR_TOKENS[1])
  if (!primary || !light) {
    return false
  }
  const data = renderLabVertexData([primary, light, renderLabBlend(primary, light)])
  const { gl } = renderer
  gl.bindBuffer(gl.ARRAY_BUFFER, renderer.buffer)
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
  return true
}

/** 画一帧（透明清屏 + 旋转矩阵 uniform + 三角） */
const drawFrame = (): void => {
  const canvas = canvasRef.value
  if (!renderer || !canvas) {
    return
  }
  const { gl } = renderer
  gl.clearColor(0, 0, 0, 0)
  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.uniformMatrix3fv(
    renderer.rotationLocation,
    false,
    renderLabRotationMatrix(renderLabRotation(elapsedMs)),
  )
  gl.drawArrays(gl.TRIANGLES, 0, RENDER_LAB_VERTEX_COUNT)
}

/**
 * 按容器尺寸重设 backing store 与视口并重绘一帧。
 *
 * 尺寸只在真的变化时才写 `canvas.width/height`：写属性会**重置画布**（清空绘制缓冲），
 * 每帧都写的话 `preserveDrawingBuffer` 也救不回暂停期间的内容。
 */
const resizeCanvas = (): void => {
  const canvas = canvasRef.value
  const root = rootRef.value
  if (!canvas || !root || !renderer) {
    return
  }
  const rect = root.getBoundingClientRect()
  const size = renderLabPixelSize(rect.width, rect.height, globalThis.devicePixelRatio)
  if (canvas.width !== size.width || canvas.height !== size.height) {
    canvas.width = size.width
    canvas.height = size.height
    renderer.gl.viewport(0, 0, size.width, size.height)
  }
  // 尺寸刚变过要立刻补一帧（循环暂停时这帧就是唯一内容）
  drawFrame()
}

const tick = (timestamp: number): void => {
  if (lastTimestamp !== 0) {
    elapsedMs += timestamp - lastTimestamp
  }
  lastTimestamp = timestamp
  drawFrame()
  frameHandle = globalThis.requestAnimationFrame(tick)
}

const startLoop = (): void => {
  if (frameHandle !== 0 || !renderer) {
    return
  }
  lastTimestamp = 0
  frameHandle = globalThis.requestAnimationFrame(tick)
}

const stopLoop = (): void => {
  if (frameHandle !== 0) {
    globalThis.cancelAnimationFrame(frameHandle)
    frameHandle = 0
  }
  lastTimestamp = 0
}

/**
 * 应用「是否该跑循环」的三个条件（窗口可见 / 未开启 reduced-motion / 标签页可见）。
 * 抽成一个函数：`watch` 与 `visibilitychange` 都调它，口径只有一份。
 */
const syncLoop = (): void => {
  const shouldRun = props.running && !reducedMotion.value && !document.hidden && renderer !== null
  if (shouldRun) {
    startLoop()
  } else {
    stopLoop()
  }
}

const onVisibilityChange = (): void => {
  syncLoop()
}

/**
 * 建渲染器并上传顶点数据；任一步失败都清干净并返回 `false`（调用方转降级文案）。
 * 抽出来是因为**首次初始化**与**上下文恢复**要走同一条路。
 */
const bootRenderer = (canvas: HTMLCanvasElement): boolean => {
  const created = createRenderer(canvas)
  if (!created) {
    return false
  }
  renderer = created
  if (!uploadColors()) {
    destroyRenderer()
    return false
  }
  return true
}

/** 上下文丢失：暂停 + 显示降级文案，等 `webglcontextrestored` 重建 */
const onContextLost = (event: Event): void => {
  event.preventDefault()
  stopLoop()
  destroyRenderer()
  supported.value = false
}

/** 上下文恢复：重建渲染器与顶点数据，恢复循环 */
const onContextRestored = (): void => {
  const canvas = canvasRef.value
  if (!canvas || !bootRenderer(canvas)) {
    supported.value = false
    return
  }
  supported.value = true
  resizeCanvas()
  syncLoop()
}

/** 初始化 renderer + 尺寸 + 循环；失败时转降级 */
const init = (): void => {
  const canvas = canvasRef.value
  if (!canvas || !bootRenderer(canvas)) {
    supported.value = false
    return
  }
  supported.value = true
  resizeCanvas()
  syncLoop()
}

onMounted(() => {
  init()

  const canvas = canvasRef.value
  const root = rootRef.value
  if (canvas) {
    canvas.addEventListener('webglcontextlost', onContextLost)
    canvas.addEventListener('webglcontextrestored', onContextRestored)
  }
  /*
   * 容器尺寸变化（窗口拖拽不改变尺寸，但最大化 / 还原 / 视口变化会）：
   * 只在 `onMounted` 建观察器 —— 浏览器 API 一律进生命周期（docs/ssr-guide.md Level 0 的
   * 纪律仍然成立；ClientOnly 只是让我们不必再写「服务端没有 ResizeObserver」的兜底）。
   */
  if (root) {
    resizeObserver = new ResizeObserver(resizeCanvas)
    resizeObserver.observe(root)
  }
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onScopeDispose(() => {
  stopLoop()
  resizeObserver?.disconnect()
  resizeObserver = null
  const canvas = canvasRef.value
  if (canvas) {
    canvas.removeEventListener('webglcontextlost', onContextLost)
    canvas.removeEventListener('webglcontextrestored', onContextRestored)
  }
  document.removeEventListener('visibilitychange', onVisibilityChange)
  destroyRenderer()
})

/** 窗口可见性 / reduced-motion 变化 ⇒ 重算循环（reduced-motion 静止帧由 drawFrame 保留） */
watch([() => props.running, reducedMotion], syncLoop)

/**
 * 明暗切换 ⇒ 重新读令牌色并重绘一帧（循环跑着时下一帧本来就会重绘，这里保证暂停态也更新）。
 */
watch(mode, () => {
  if (!renderer) {
    return
  }
  if (uploadColors()) {
    drawFrame()
  }
})
</script>

<template>
  <!--
    内容根：撑满 `FluereAppWindow` 的内容区（宿主负责框体 / 尺寸 / 层级）。
    背景留给窗口自身的表面色，canvas 透明清屏 ⇒ 三角「浮」在窗口底色上。
  -->
  <div
    ref="rootRef"
    class="docs-shell-render-lab"
  >
    <!--
      canvas：`role="img"` + 可访问名（它是一幅会动的图，不是可交互控件）。
      `v-show` 而不是 `v-if`：上下文需要在挂载时就能建（`display: none` 不影响
      `getContext()`），且 `v-show` 保留画布内容。
    -->
    <canvas
      v-show="supported"
      ref="canvasRef"
      class="docs-shell-render-lab__canvas"
      role="img"
      :aria-label="t('shell.apps.renderLab.canvasLabel')"
    />

    <!--
      降级：WebGL2 不可用 / 令牌读不到 / 上下文丢失期间。
      文案说明「哪两类原因」，不假装是内容（AGENTS.md 红线：不留坏按钮式的空洞）。
    -->
    <p
      v-if="!supported"
      class="docs-shell-render-lab__fallback"
    >
      {{ t('shell.apps.renderLab.unsupported') }}
    </p>
  </div>
</template>

<style scoped>
/* ------------------------------------------------------------------ */
/* 视觉值一律引用 token；本组件不写窗口几何（归 assets/docs-shell.css）。 */
/* ------------------------------------------------------------------ */

.docs-shell-render-lab {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1 1 auto;
  min-block-size: 0;
}

.docs-shell-render-lab__canvas {
  display: block;
  /* 撑满内容区；backing store 尺寸由 resizeCanvas 按 DPR 单独设置 */
  inline-size: 100%;
  block-size: 100%;
}

.docs-shell-render-lab__fallback {
  margin: 0;
  padding: var(--spacingVerticalL) var(--spacingHorizontalXL);
  color: var(--colorNeutralForeground2);
  font-size: var(--fontSizeBase300);
  line-height: var(--lineHeightBase300);
  text-align: center;
}
</style>
