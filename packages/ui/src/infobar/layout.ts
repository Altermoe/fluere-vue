/**
 * InfoBar 排版方向判定（纯函数）。
 *
 * 逐条照抄 `microsoft-ui-xaml` `winui3/release/2.5.1`
 * `src/controls/dev/InfoBar/InfoBarPanel.cpp#MeasureOverride`：
 *
 * ```cpp
 * // Since this panel is inside a *-sized grid column, availableSize.Width should not be infinite
 * // If there is only one item inside the panel, we will count it as vertical (the margins work out better that way)
 * // Also, if the height of any item is taller than the desired min height of the InfoBar,
 * // the items should be laid out vertically even though they may seem to fit due to text wrapping.
 * if (nItems == 1 || totalWidth > availableSize.Width || (minHeight > 0 && heightOfTallestInHorizontal > minHeight))
 * ```
 *
 * 判据里的三个量（原文在旁边注释里也写明了原因）：
 *   1. `nItems == 1`：只有一项时也走竖排（横排的四向 margin 组合在单项上更难看）；
 *   2. `totalWidth > availableSize.Width`：把各项按自身「适配宽」水平铺开后放不下；
 *   3. `heightOfTallestInHorizontal > minHeight`：某个子项在横排下加完 margin 后，
 *      已经比 InfoBar 的最小高度还高 —— 说明它其实是被文本换行撑高的，横排会难看。
 *
 * 注意判据 2 用的是子项的**适配宽**（`DesiredSize.Width`，即被 `availableSize.Width`
 * 约束后的换行宽度），不是「不换行的固有宽」。因此长文本在横排下会正确判定为放不下，
 * 而不是靠一个固定断点近似。子项尺寸由 `use-infobar-layout.ts` 的隐藏测量层提供。
 */
import type { FluereInfoBarOrientation } from './types-internal'

/** 单个子项在两种排向下的尺寸（WinUI 的 `DesiredSize` + 附加属性 Margin） */
export interface InfoBarChildMeasurement {
  /** 子项在被 `availableWidth` 约束后的期望宽（对应 `child.DesiredSize().Width`） */
  fitWidth: number
  /** 子项的期望高（对应 `child.DesiredSize().Height`） */
  fitHeight: number
  /** `InfoBarPanel.VerticalOrientationMargin` 的四值（上 / 右 / 下 / 左） */
  verticalMargin: readonly [number, number, number, number]
  /** `InfoBarPanel.HorizontalOrientationMargin` 的四值（上 / 右 / 下 / 左） */
  horizontalMargin: readonly [number, number, number, number]
}

/** `InfoBarPanel` 自身的度量参数 */
export interface InfoBarPanelMetrics {
  /**
   * 面板可用宽（对应 `availableSize.Width`，即 Grid 内容列的客户区宽）。
   *
   * WinUI 首次 layout 时该值为无穷（`Measure` 尚未拿到父级约束），此时必落横排；
   * 本库在 SSR / 首帧同样以「无约束」处理（见 `use-infobar-layout.ts`）。
   */
  availableWidth: number
  /** `InfoBarMinHeight` − 面板自身 margin 后的最小高（对应 `minHeight`，≤0 时该判据不参与） */
  minHeight: number
}

/**
 * 复刻 `InfoBarPanel::MeasureOverride`：按内容实时判定横 / 竖排。
 *
 * @param children 参与排版且**可见**的子项（WinUI 会跳过 `DesiredSize` 任一边为 0 的子项）
 */
export const resolveOrientation = (
  children: readonly InfoBarChildMeasurement[],
  metrics: InfoBarPanelMetrics,
): FluereInfoBarOrientation => {
  let totalWidth = 0
  let heightOfTallestInHorizontal = 0
  let count = 0

  for (const child of children) {
    // 与 WinUI 一致：任一边为 0 的子项完全跳过（既不计数也不参与求和）
    if (child.fitWidth === 0 || child.fitHeight === 0) {
      continue
    }

    // 忽略第一个子项的左边距与最后一个子项的右边距
    const horizontalStart = count > 0 ? child.horizontalMargin[3] : 0
    const horizontalEnd = count < children.length - 1 ? child.horizontalMargin[1] : 0
    totalWidth += child.fitWidth + horizontalStart + horizontalEnd

    const heightInHorizontal =
      child.fitHeight + child.horizontalMargin[0] + child.horizontalMargin[2]
    if (heightInHorizontal > heightOfTallestInHorizontal) {
      heightOfTallestInHorizontal = heightInHorizontal
    }

    count += 1
  }

  if (count === 0) {
    // 面板里什么都没有：WinUI 会走横排分支（totalWidth=0 ≤ availableWidth），
    // 且没有子项需要换行，横排是安全的中性形态。
    return 'horizontal'
  }

  const mustStackVertically =
    count === 1 ||
    totalWidth > metrics.availableWidth ||
    (metrics.minHeight > 0 && heightOfTallestInHorizontal > metrics.minHeight)

  return mustStackVertically ? 'vertical' : 'horizontal'
}
