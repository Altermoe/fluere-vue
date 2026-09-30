/**
 * FluereInfoBar 内部类型（不对外导出）。
 *
 * 只有逻辑模块之间共享的形状放这里；对外契约见 `./types.ts`。
 */

/**
 * InfoBar 内容区的排版方向。
 *
 * 对应 `InfoBarPanel.cpp#MeasureOverride` 里 `m_isVertical` 的两种结果：
 * 横排（Title / Message / Action 同一行）与竖排（三者自上而下堆叠）。
 */
export type FluereInfoBarOrientation = 'horizontal' | 'vertical'
