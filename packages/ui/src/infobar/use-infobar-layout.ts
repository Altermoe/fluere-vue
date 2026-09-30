/**
 * InfoBar 排版方向测量层。
 *
 * 为什么需要它：`InfoBarPanel.cpp#MeasureOverride` 是按**内容实时**判定横 / 竖排的
 * （长文本换行后自动改成竖排），而不是一个固定断点。要在 CSS 里还原，就必须拿到
 * 子项在「约束宽」下的期望尺寸，本模块用一层隐藏的、`width: max-content` 的镜像
 * DOM 来量（`visibility: hidden` + `aria-hidden`，不参与布局、不进无障碍树）。
 *
 * SSR 约束：`ResizeObserver` 只在 `onMounted` 内创建、`onScopeDispose` 断开
 * （与 `scrollview/use-measurement.ts` 同一写法）；服务端不触碰任何浏览器 API，
 * 服务端与首帧都取「无约束 ⇒ 横排」，与 WinUI 首次 layout（`availableSize.Width`
 * 为无穷）的落点一致，不产生水合不一致。
 */
import { computed, nextTick, onMounted, onScopeDispose, ref, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import {
  INFO_BAR_CONTENT_ROOT_PADDING_START,
  INFO_BAR_METRICS,
  INFO_BAR_MIN_HEIGHT,
  INFO_BAR_PANEL_MARGIN_END,
} from './constants'
import { resolveOrientation } from './layout'
import type { InfoBarChildMeasurement } from './layout'
import type { FluereInfoBarOrientation } from './types-internal'

/** 测量层里可被 量 的三个探针（对应 `InfoBarPanel` 的三个子项） */
type InfoBarMeasureName = 'title' | 'message' | 'action'

/** 测量层对外暴露的句柄 */
export interface InfoBarLayoutController {
  /**
   * 模板内层 Grid 的 DOM 句柄。用它换算面板的 `availableSize.Width`：
   * `clientWidth − Grid 左内边距（InfoBarContentRootPadding）− 右内边距（InfoBarPanelMargin）`。
   */
  contentCellRef: Ref<HTMLElement | null>
  /** 隐藏测量层的 DOM 句柄 */
  measureRef: Ref<HTMLElement | null>
  /** 排版方向结果（驱动根节点的 `data-orientation`） */
  orientation: ComputedRef<FluereInfoBarOrientation>
  /** 主动重新测量一次 */
  measure: () => void
}

/** 读取元素在「未约束」下的固有宽 / 高（`width: max-content` 容器里即固有尺寸） */
const readIntrinsic = (el: HTMLElement): { width: number; height: number } => ({
  width: Math.ceil(el.scrollWidth),
  height: Math.ceil(el.scrollHeight),
})

/**
 * 取某个探针的 WinUI 附加属性 Margin，统一转成 `(上, 右, 下, 左)` 四元组。
 *
 * 全部来自 `InfoBar_themeresources.xaml`（XAML 四值顺序是 **左,上,右,下**）：
 *   Title   Horizontal=0,14,0,0  → 左 0  上 14   Vertical=0,14,0,0
 *   Message Horizontal=12,14,0,0 → 左 12 上 14   Vertical=0,4,0,0
 *   Action  Horizontal=16,8,0,0  → 左 16 上 8    Vertical=0,12,0,0
 *
 * 横排的**上**边距同样参与判定：`InfoBarPanel.cpp` 用它算
 * `heightOfTallestInHorizontal = 子项高 + horizontalMargin.Top + horizontalMargin.Bottom`，
 * 因此「标题换行后加上边距超过 InfoBarMinHeight」也会切到竖排。
 */
const marginsOf = (
  name: InfoBarMeasureName,
): {
  vertical: readonly [number, number, number, number]
  horizontal: readonly [number, number, number, number]
} => {
  switch (name) {
    case 'title':
      return {
        vertical: [INFO_BAR_METRICS.titleVerticalMarginTop, 0, 0, 0],
        horizontal: [
          INFO_BAR_METRICS.titleHorizontalMarginTop,
          0,
          0,
          INFO_BAR_METRICS.titleHorizontalMarginStart,
        ],
      }
    case 'message':
      return {
        vertical: [INFO_BAR_METRICS.messageVerticalMarginTop, 0, 0, 0],
        horizontal: [
          INFO_BAR_METRICS.messageHorizontalMarginTop,
          0,
          0,
          INFO_BAR_METRICS.messageHorizontalMarginStart,
        ],
      }
    default:
      return {
        vertical: [INFO_BAR_METRICS.actionVerticalMarginTop, 0, 0, 0],
        horizontal: [
          INFO_BAR_METRICS.actionHorizontalMarginTop,
          0,
          0,
          INFO_BAR_METRICS.actionHorizontalMarginStart,
        ],
      }
  }
}

/**
 * 创建排版方向控制器。
 *
 * @param deps 触发重新测量的响应式依赖（文案 / Severity / 图标可见性 / 是否展开 …）
 */
export const useInfoBarLayout = (deps: () => readonly unknown[]): InfoBarLayoutController => {
  const contentCellRef = ref<HTMLElement | null>(null)
  const measureRef = ref<HTMLElement | null>(null)
  /** 面板可用宽；`Number.POSITIVE_INFINITY` = 尚未测量（对齐 WinUI 首次 layout） */
  const availableWidth = ref(Number.POSITIVE_INFINITY)
  const measurements = ref<Partial<Record<InfoBarMeasureName, InfoBarChildMeasurement>>>({})

  const orientation = computed<FluereInfoBarOrientation>(() => {
    const children: InfoBarChildMeasurement[] = []
    // 顺序固定为 Title → Message → Action，与模板里 InfoBarPanel 的子项顺序一致
    // （首元素左外边距 / 末元素右外边距会被判定函数按 `children.length` 忽略）
    for (const name of ['title', 'message', 'action'] as const) {
      const item = measurements.value[name]
      if (item) {
        children.push(item)
      }
    }
    return resolveOrientation(children, {
      availableWidth: availableWidth.value,
      minHeight: INFO_BAR_MIN_HEIGHT,
    })
  })

  const measure = (): void => {
    const cell = contentCellRef.value
    const host = measureRef.value
    // 面板可用宽 = 网格客户区宽 − 网格左右内边距（见 constants.ts 的换算说明）。
    // 取 `clientWidth` 已排除 1px 描边，与 XAML 里 Border 减掉 BorderThickness 的口径一致。
    availableWidth.value = cell
      ? Math.max(
          0,
          cell.clientWidth - INFO_BAR_CONTENT_ROOT_PADDING_START - INFO_BAR_PANEL_MARGIN_END,
        )
      : Number.POSITIVE_INFINITY

    const next: Partial<Record<InfoBarMeasureName, InfoBarChildMeasurement>> = {}
    if (host) {
      for (const name of ['title', 'message', 'action'] as const) {
        const el = host.querySelector(`[data-measure='${name}']`)
        if (!(el instanceof HTMLElement)) {
          continue
        }
        const { width, height } = readIntrinsic(el)
        // 与 WinUI 一致：任一边为 0 的子项不参与排版（`InfoBarPanel::MeasureOverride`）
        if (width === 0 || height === 0) {
          continue
        }
        const margins = marginsOf(name)
        next[name] = {
          fitWidth: width,
          fitHeight: height,
          verticalMargin: margins.vertical,
          horizontalMargin: margins.horizontal,
        }
      }
    }
    measurements.value = next
  }

  /** 尺寸 / 文案变化后，等一帧布局（`flush: 'post'`）再测量 */
  const scheduleMeasure = (): void => {
    void nextTick(measure)
  }

  let cellObserver: ResizeObserver | undefined
  let measureObserver: ResizeObserver | undefined

  onMounted(() => {
    const cell = contentCellRef.value
    const host = measureRef.value
    // 能力探测：没有 ResizeObserver 的环境退化为「挂载后测一次 + 依赖变化时重测」
    if (typeof ResizeObserver === 'function') {
      cellObserver = new ResizeObserver(scheduleMeasure)
      if (cell) {
        cellObserver.observe(cell)
      }
      if (host) {
        // 文案变化 → 测量层尺寸变化 → 重新判定方向
        measureObserver = new ResizeObserver(scheduleMeasure)
        measureObserver.observe(host)
      }
    }
    scheduleMeasure()
  })

  onScopeDispose(() => {
    cellObserver?.disconnect()
    measureObserver?.disconnect()
    cellObserver = undefined
    measureObserver = undefined
  })

  // 文案 / Severity / 图标可见性等变化时立即重测（不必等 ResizeObserver 回调）
  watch(deps, scheduleMeasure, { flush: 'post' })

  return { contentCellRef, measureRef, orientation, measure }
}
