/**
 * 帧时间基准：把 requestAnimationFrame 时间戳与 performance.now() 对齐。
 *
 * 滚动驱动 / 惯性在启动时用 performance.now() 记下基准时刻，逐帧回调拿到的却是
 * rAF 时间戳。二者同源（都是相对 timeOrigin 的 DOMHighResTimeStamp），但浏览器给
 * 出的帧时间戳是「本帧开始时刻」：同一帧内先派发输入事件（wheel / pointerdown /
 * keydown）再执行 rAF 回调时，回调时间戳可能早于输入处理时读到的 performance.now()，
 * 于是首帧帧长为负。
 *
 * 负帧长会让指数缓动的单帧闭合比例变成负数（step = 1 - e^(k·|dt|) < 0），offset
 * 朝目标反方向移动；惯性的 `offset += v · dt` 也会反向位移并放大速度。观感上就是
 * 「完全停下后再开始滚动时，先向反方向快速抖一下」。
 *
 * 因此逐帧积分统一走 frameStepSeconds：负帧长按 0（本帧不推进，等价于把时间基准
 * 对齐到首个 rAF 时间戳），超大帧长按 MAX_FRAME_DELTA_TIME 封顶（后台标签页恢复
 * 时不产生一次跳变）。绝对时长动画（缩放）只需要 frameElapsedMs 的非负钳制。
 */
/* oxlint-disable no-magic-numbers -- 0 是「帧长下限」的结构性边界（非负钳制），
 * 与各滚动模块用 MIN_OFFSET 表达的下界同源，语义由上方注释给出。 */
import { MAX_FRAME_DELTA_TIME, MS_PER_SECOND } from './constants'

/** 帧时间戳相对基准时刻的经过时间（毫秒）：负值按 0 处理 */
const frameElapsedMs = (now: number, previous: number): number => Math.max(0, now - previous)

/** 逐帧积分的帧长（秒）：非负且在 MAX_FRAME_DELTA_TIME 内 */
const frameStepSeconds = (now: number, previous: number): number =>
  Math.min(MAX_FRAME_DELTA_TIME, frameElapsedMs(now, previous) / MS_PER_SECOND)

export { frameElapsedMs, frameStepSeconds }
