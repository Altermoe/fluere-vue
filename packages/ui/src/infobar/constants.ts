/**
 * FluereInfoBar 常量层。
 *
 * 只放「有 WinUI 资源名」的几何 / 数值常量与 Severity → 图标映射；
 * 取色与圆角等一律在 SFC 的 `<style scoped>` 里以 Fluent token 表达（见 infobar.vue）。
 *
 * 来源：microsoft-ui-xaml `winui3/release/2.5.1`
 *   src/controls/dev/InfoBar/InfoBar_themeresources.xaml
 *   src/controls/dev/InfoBar/InfoBar.xaml
 *   src/controls/dev/InfoBar/InfoBarPanel.cpp
 */
import {
  FluentIconCheckmarkCircle16Filled,
  FluentIconDismissCircle16Filled,
  FluentIconErrorCircle16Filled,
  FluentIconInfo16Filled,
} from '@fluere-vue/icons'
import type { Component } from 'vue'
import type { FluereInfoBarSeverity } from './types'

/**
 * Severity → 内建图标（对应 `InfoBar.xaml` 里 `StandardIcon.Text` 的四个 Segoe 字形）。
 *
 * WinUI 是「圆心字形（`InfoBarIconBackgroundGlyph` = `&#xF136;`）叠加 Severity 字形
 * （`&#xF13F;` / `&#xF13C;` / `&#xF13D;` / `&#xF13E;`）」两个 16pt TextBlock 完全重合，
 * 观感即「Severity 色实心圆 + 反白内字形」。Fluent System Icons 里有同造型的单色图标
 * （实心圆 + 镂空字形），故 Web 侧一份图标即可，颜色见 infobar.vue 的 `.fui-infobar__icon-glyph`。
 *
 * 逐个挑选的依据是**图形**而不是图标名（参考图实测四个图标的墨迹 bbox 都是 15×15 的正圆）：
 *   Informational → `info_16_filled`           圆 + i（点在上）
 *   Success       → `checkmark_circle_16_filled` 圆 + 对勾
 *   Warning       → `error_circle_16_filled`     圆 + 感叹号（点在下）—— 注意 Fluent 把这个
 *                   造型命名为 error_circle；而 `warning_16_filled` 是**三角形**，与实机的
 *                   圆形信息条图标不符（参考图 warning 图标 bbox 为 15×15 正圆），故不采用
 *   Error         → `dismiss_circle_16_filled`   圆 + 叉（`error_circle_16_filled` 是感叹号，
 *                   也不是实机 Error 的叉号）
 */
export const INFO_BAR_SEVERITY_ICONS: Record<FluereInfoBarSeverity, Component> = {
  informational: FluentIconInfo16Filled,
  success: FluentIconCheckmarkCircle16Filled,
  warning: FluentIconErrorCircle16Filled,
  error: FluentIconDismissCircle16Filled,
}

/**
 * 方向判定阈值：`InfoBarMinHeight`
 *
 * `InfoBarPanel.cpp#MeasureOverride` 里 `minHeight = parent.MinHeight - (margin.Top + margin.Bottom)`，
 * 父级就是模板里那个 `MinHeight="{ThemeResource InfoBarMinHeight}"` 的 Grid。
 */
export const INFO_BAR_MIN_HEIGHT = 48

/**
 * 模板内层 Grid 的水平方向留白（逻辑像素），用来把「网格客户区宽」换算成
 * `InfoBarPanel` 的 `availableSize.Width`：
 *
 *   availableWidth = grid.clientWidth − gridPaddingStart − gridPaddingEnd
 *
 * 两段留白对应两个 WinUI 资源（XAML 里分别落在 Grid 的 Padding 与面板的 Margin 上，
 * 布局结果等价 —— 面板右边缘距离网格右边缘正好 16）：
 *   `InfoBarContentRootPadding` = 16,0,0,0 → gridPaddingStart
 *   `InfoBarPanelMargin`        = 0,0,16,0 → gridPaddingEnd
 */
export const INFO_BAR_PANEL_MARGIN_END = 16
export const INFO_BAR_CONTENT_ROOT_PADDING_START = 16

/**
 * 排版用到的边距常量（对应模板里挂在子元素上的附加属性）。
 *
 * 竖排时 Title 与 Message 的 `Margin` 中间值、以及 Action 的 `0,12,0,0` 会**直接相加**：
 * 渲染成同一个 flex / 网格排版容器时不存在「相邻块外边距折叠」，而 `InfoBarPanel` 的
 * `ArrangeOverride` 也正是把每个子元素依次往下叠（前一个的 bottom 再叠后一个的 top）。
 * 参考图的实测差值（内容顶 213 → 图标顶 229 → 标题顶 231 → 消息顶 246 → 按钮顶 258）
 * 与这组数值逐项吻合。
 *
 * 注意 XAML `Thickness` 的四值顺序是 **左,上,右,下**（与 CSS 不同）；这里一律拆成具名字段，
 * 免得又踩一次顺序坑。Icon / Panel 的上下内边距由 CSS 直接表达、不参与方向判定，故不在此列。
 */
export const INFO_BAR_METRICS = {
  /** `InfoBarPanelMargin` = 0,0,16,0（XAML 四值顺序为 左,上,右,下） */
  panelMarginEnd: INFO_BAR_PANEL_MARGIN_END,
  /** `InfoBarTitleVerticalOrientationMargin` = 0,14,0,0 → 上 14 */
  titleVerticalMarginTop: 14,
  /** `InfoBarMessageVerticalOrientationMargin` = 0,4,0,0 → 上 4 */
  messageVerticalMarginTop: 4,
  /** `InfoBarActionVerticalOrientationMargin` = 0,12,0,0 → 上 12 */
  actionVerticalMarginTop: 12,
  /** `InfoBarTitleHorizontalOrientationMargin` = 0,14,0,0 → 左 0、上 14 */
  titleHorizontalMarginStart: 0,
  titleHorizontalMarginTop: 14,
  /** `InfoBarMessageHorizontalOrientationMargin` = 12,14,0,0 → 左 12、上 14 */
  messageHorizontalMarginStart: 12,
  messageHorizontalMarginTop: 14,
  /** `InfoBarActionHorizontalOrientationMargin` = 16,8,0,0 → 左 16、上 8 */
  actionHorizontalMarginStart: 16,
  actionHorizontalMarginTop: 8,
} as const
