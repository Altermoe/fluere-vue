/**
 * FluereAppWindow / FluereCaptionButtons 常量层。
 *
 * 只放「有 WinUI 资源名」的几何常量、caption 按钮的系统度量与自绘字形；
 * 取色与圆角一律在 SFC 的 `<style scoped>` 里以 Fluent token 表达。
 *
 * 来源：microsoft-ui-xaml
 *   模板 / 数值：`winui3/release/2.5.1`（commit ba3a8d5）
 *     src/controls/dev/TitleBar/TitleBar.xaml
 *     src/controls/dev/TitleBar/TitleBar_themeresources.xaml
 *     src/controls/dev/CommonStyles/CornerRadius_themeresources.xaml（ControlCornerRadius = 4）
 *   行为（状态机 / 高度判定 / 拖拽打洞）：`winui3/release/2.0.1`（commit 978ab63）
 *     src/controls/dev/TitleBar/TitleBar.cpp
 *   caption 字形（**遗留 chrome**，WinUI 3 控件路径不消费）：
 *     src/dxaml/xcp/dxaml/themes/generic.xaml:15697-15786 的 `x:Key="WindowCaptionButton"`
 *
 * 版本漂移（写在 types.ts 顶部，此处不重复）：控件目录在 2.0.1 → 2.5.1 有漂移，
 * 故 API / 行为以 2.0.1 为准；`TitleBar.xaml` / `TitleBar_themeresources.xaml` 两 tag 相同。
 */

/* ------------------------------------------------------------------ */
/* 标题栏几何（TitleBar_themeresources.xaml，三主题同值）               */
/* ------------------------------------------------------------------ */

/** `TitleBarCompactHeight` —— Content / LeftHeader / RightHeader 全空时的高度 */
export const TITLE_BAR_COMPACT_HEIGHT = 32

/** `TitleBarExpandedHeight` —— 三者任一非空时的高度（`TitleBar.cpp#UpdateHeight`） */
export const TITLE_BAR_EXPANDED_HEIGHT = 48

/** `TitleBarBackButtonWidth` */
export const TITLE_BAR_BACK_BUTTON_WIDTH = 40

/** `TitleBarPaneToggleButtonWidth` */
export const TITLE_BAR_PANE_TOGGLE_BUTTON_WIDTH = 40

/** 两个按钮样式里的 `Margin` = 2（四边 2 ⇒ 实测按钮 36×28，圆角 4） */
export const TITLE_BAR_BUTTON_MARGIN = 2

/** `TitleBarLeftPaddingWidth` —— 第 0 列；运行期被 `AppWindowTitleBar.LeftInset()` 覆盖，Web 无此值 */
export const TITLE_BAR_LEFT_PADDING_WIDTH = 2

/** `TitleBarRightPaddingWidth` —— 第 11 列；运行期被 `RightInset()`（= caption 区宽）覆盖 */
export const TITLE_BAR_RIGHT_PADDING_WIDTH = 0

/** `TitleBarLeftHeaderPaddingWidth` —— 第 4 列（左头 → 图标） */
export const TITLE_BAR_LEFT_HEADER_PADDING_WIDTH = 14

/** `TitleBarHeaderNegativeInsetPaddingWidth` —— `NegativeInsetSpacing` 下第 4 列压到 2 */
export const TITLE_BAR_HEADER_NEGATIVE_INSET_PADDING_WIDTH = 2

/** `TitleBarMinDragRegionWidth` —— 第 10 列（模板里没有任何元素占位，纯保留拖拽区） */
export const TITLE_BAR_MIN_DRAG_REGION_WIDTH = 48

/** `TitleBarDeactivatedOpacity` —— 失活时只作用于 Icon / LeftHeader / Content / RightHeader */
export const TITLE_BAR_DEACTIVATED_OPACITY = 0.5

/** `TitleBarIconMaxWidth` / `TitleBarIconMaxHeight` —— `PART_Icon` 的 Viewbox 上限 */
export const TITLE_BAR_ICON_MAX_SIZE = 16

/** `TitleBarCompactContentMargin` = 0,0,16,0（XAML 四值顺序 左,上,右,下 ⇒ 右 16） */
export const TITLE_BAR_COMPACT_CONTENT_MARGIN_END = 16

/** 标题 / 副标题字号：`CaptionTextBlockStyle` → `CaptionTextBlockFontSize` = 12（Normal） */
export const TITLE_BAR_TITLE_FONT_SIZE = 12

/* ------------------------------------------------------------------ */
/* caption 按钮：系统度量（**无 A 级 XAML 模板**，见文件头缺口说明）     */
/* ------------------------------------------------------------------ */

/**
 * 单键宽度：46。
 *
 * 依据（两条独立证据）：
 *  1. WinUI 的 `TitleBarRightPaddingWidth` 运行期被 `AppWindowTitleBar.RightInset()` 覆盖，
 *     即整块 caption 区由系统给宽度；Windows 11 该系统度量为 3×46 = 138。
 *  2. 参考图（Windows 11 设置窗口，1:1 截图）实测三键字形中心间距 **46.0 / 46.0**。
 */
export const CAPTION_BUTTON_WIDTH = 46

/** 单键高度：与标题栏 `TitleBarCompactHeight` 同值（`TitleBarCompactHeight` = 32） */
export const CAPTION_BUTTON_HEIGHT = TITLE_BAR_COMPACT_HEIGHT

/**
 * 三个按钮的可视总宽（= 3 × 46 = 138）：标题栏为 48 高时，caption 按钮**顶端对齐**、
 * 只占顶部 32。
 *
 * 证据：参考图（设置窗口，标题栏 48 高：返回箭头墨迹竖直中心 y≈23.5 ⇒ 48/2=
 * 24）而 caption 字形竖直中心 y≈15.5 ⇒ 32/2 = 16，即按钮占 0..32、顶端对齐。
 */
export const CAPTION_BUTTONS_AREA_WIDTH = CAPTION_BUTTON_WIDTH * 3

/** 字形外框边长（参考图实测：最小化 10×1、最大化 10×10 描边方框、关闭 10×10 叉） */
export const CAPTION_BUTTON_GLYPH_SIZE = 10

/** 字形描边宽度基线：1（参考图 1:1 实测最小化横条与方框边均为 1px 实心） */
export const CAPTION_BUTTON_GLYPH_STROKE_WIDTH = 1

/**
 * 关闭叉的描边宽度：1.1。
 *
 * 参考图实测「每行墨量 ≈1.40」（核心像素覆盖 90% + 两侧各 25%），对应 45° 细线的
 * 线宽 ≈1.0；但 Chrome 把 45° 上的 1px 描边**退化成硬边阶梯**（无 AA 过渡，
 * temp/glyph-lab.mjs 实测），只有 1.1px 才会重新产生参考图那种 AA 过渡
 * （逐像素平均绝对差：1.1px → 3.2/255，1px → 15.7/255，1.2px → 11.1/255）。
 */
export const CAPTION_BUTTON_GLYPH_STROKE_WIDTH_CLOSE = 1.1

/**
 * 最大化字形：10×10 圆角方框（描边 1 ⇒ 墨迹恰好压满 10×10 外框）。
 *
 * 几何来源与实测校准（`winui3/release/2.5.1` + Windows 11 参考图 1:1 实测，
 * 测量脚本 temp/glyph-lab.mjs / temp/glyph-lab-compare.py）：
 *   - 遗留 chrome 样式（`generic.xaml:15697-15786` 的 `WindowCaptionButton`，
 *     `WindowStateNormal`）给的是**同一拓扑**的路径，但其角部是 r≈1.5/9（≈16.7%）的
 *     大圆角：按 10px 外框渲染时角像素覆盖 72%，且上边被切短约 1px。
 *   - 参考图实测：方框外框 10×10、四边 1px 实心、**四角像素覆盖 58%**（= 极小的
 *     圆角），对应中线圈半径 ≈0.25。候选扫描的平均绝对差：r0.25 → **2.51**、
 *     r0.5 → 2.60、r0（直角）→ 3.38、遗留大圆角 → 9.72（越接近参考图越小）⇒ 取 0.25。
 *   - 参考图里方框内侧还有约 6% 的灰度溢出（像素 217/255），Chrome 描边不复刻该溢出；
 *     差值 <1 个灰度级，忽略。
 */
export const CAPTION_GLYPH_PATH_MAXIMIZE =
  'M0.75 0.5H9.25A0.25 0.25 0 0 1 9.5 0.75V9.25A0.25 0.25 0 0 1 9.25 9.5H0.75A0.25 0.25 0 0 1 0.5 9.25V0.75A0.25 0.25 0 0 1 0.75 0.5Z'

/**
 * 还原字形：前置方框（与最大化字形**同一条路径**）+ 后置方框可见部分。
 *
 * 拓扑逐字取自遗留 chrome 样式的 `WindowStateMaximized`（`M 11 6 L 11 2 C 11 0 10 -2
 * 8.011 -1.946 L 7.06 -1.969 L 3 -2`）—— 即「后置方框只画右边缘 + 顶边缘」的经典
 * 还原造型；坐标沿用遗留自然空间（前置方框 9×9、后置方框 8×8 偏移 (3,−2)，
 * 总边界 11.008×11.016），故 `viewBox` 与置信比例保持原样。
 * 角部曲率按最大化字形的实测口径收紧（遗留 r≈1.5 → 0.3 自然单位，渲染后同为 ≈0.25px），
 * 使两个状态下的方框观感一致；仅此一处偏离遗留数据，理由是参考图实测（见上）。
 * `linecap: round` 是遗留样式的显式声明（`StrokeStartLineCap`/`StrokeEndLineCap` = Round）。
 */
export const CAPTION_GLYPH_PATH_RESTORE_FRONT =
  'M0.3 0H8.7A0.3 0.3 0 0 1 9 0.3V8.7A0.3 0.3 0 0 1 8.7 9H0.3A0.3 0.3 0 0 1 0 8.7V0.3A0.3 0.3 0 0 1 0.3 0Z'

export const CAPTION_GLYPH_PATH_RESTORE_BACK = 'M11 6L11 2C11 0 10 -2 8.011 -1.946L7.06 -1.969L3 -2'

/**
 * 字形定义。
 *
 * 坐标口径：`viewBox` 与墨迹一一对应 —— 除还原字形（沿用遗留自然空间）外，字形都定义在
 * `0 0 10 10` 的 10px 方框里，**墨迹恰好压满这个方框**（描边以 0.5 为中心线内缩，
 * 端点内缩 = 线宽 ÷ 2），这样 1 用户单位 = 1px，且描边不会被 `overflow: hidden` 裁掉。
 *
 * 最小化与关闭字形**不在仓库里**：`WindowCaptionButton` 样式把 `Data` 绑到 `Content`
 * （由非托管代码以字符串注入），原生 chrome 源码（`CWindowChrome.cpp` / `WindowHelpers.cpp`）
 * 里没有任何字形数据。故这两条按参考图实测几何自绘：
 *   - 最小化：10×1 实心横条，**墨迹落在方框第 6 行**（y 5..6，即比外框中心低 0.5px ——
 *     系统光栅化把 1px 横条取整到像素行的结果）。逐像素与参考图**完全一致**（Δ = 0.00）。
 *   - 关闭：10×10 叉，端点 (±0.55, ±0.55)（= 线宽 ÷ 2 ⇒ 圆头外缘正好贴满外框），
 *     `round` 端头（遗留样式的显式声明，参考图那 4 个角像素的高覆盖也与之吻合）。
 */
export interface CaptionGlyph {
  /** SVG viewBox（与墨迹外框一一对应） */
  viewBox: string
  /** 一条或多条 `d` 数据 */
  paths: readonly string[]
  /** 描边宽度（用户单位，= px）；缺省 `CAPTION_BUTTON_GLYPH_STROKE_WIDTH` */
  strokeWidth?: number
  /** 端头样式；缺省 `butt` */
  linecap?: 'butt' | 'round'
}

export const CAPTION_GLYPH_MINIMIZE: CaptionGlyph = {
  viewBox: '0 0 10 10',
  paths: ['M0 5.5H10'],
  linecap: 'butt',
} as const

export const CAPTION_GLYPH_MAXIMIZE: CaptionGlyph = {
  viewBox: '0 0 10 10',
  paths: [CAPTION_GLYPH_PATH_MAXIMIZE],
  linecap: 'butt',
} as const

export const CAPTION_GLYPH_RESTORE: CaptionGlyph = {
  // 遗留自然空间：x -0.004..11（11.008）、y -2..9.015（11.016），各向外扩 0.5
  viewBox: '-0.504 -2.501 12.016 12.018',
  paths: [CAPTION_GLYPH_PATH_RESTORE_FRONT, CAPTION_GLYPH_PATH_RESTORE_BACK],
  linecap: 'round',
} as const

export const CAPTION_GLYPH_CLOSE: CaptionGlyph = {
  viewBox: '0 0 10 10',
  paths: ['M0.55 0.55 9.45 9.45', 'M9.45 0.55 0.55 9.45'],
  strokeWidth: CAPTION_BUTTON_GLYPH_STROKE_WIDTH_CLOSE,
  linecap: 'round',
} as const
