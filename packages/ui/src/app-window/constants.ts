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

/** 字形描边宽度（参考图 1:1 实测 1px） */
export const CAPTION_BUTTON_GLYPH_STROKE_WIDTH = 1

/**
 * 最大化 / 还原字形的 `Path.Data`，**逐字抄自** WinUI 遗留 chrome 样式
 * `generic.xaml:15697-15786` 的 `WindowCaptionButton` 模板（`MinMaxStates` 组）：
 *   - `WindowStateNormal`（窗口未最大化 ⇒ 显示"最大化"字形）
 *   - `WindowStateMaximized`（已最大化 ⇒ 显示"还原"字形）
 *
 * 该样式属旧 `Windows.UI.Xaml` 系统 chrome，**WinUI 3 的 `TitleBar` 不消费它**
 * （`CWindowChrome.cpp` 只设 `ButtonBackgroundColor` 与 caption 区矩形，无绘制代码）；
 * 它是仓库里**唯一**存在的 caption 字形几何，故作为形状来源，并按下述方式落到本组件：
 *   - 原样式以 `Stretch="Fill"` 把一个 `Path` 填进 9×9 方框、`StrokeThickness` = 0.5
 *     （HC 3.0）；`Windows 11` 参考图实测字形外框 10×10、描边 1px ⇒ 本组件的外框取
 *     10（`CAPTION_BUTTON_GLYPH_SIZE`）、描边取 1（`CAPTION_BUTTON_GLYPH_STROKE_WIDTH`），
 *     并用 `vector-effect="non-scaling-stroke"` 复刻「描边厚度不随 Stretch 缩放」这一 XAML 行为。
 *   - 两条路径的自然边界几乎正方（正常 9.006×9.016、最大化 11.008×11.016），
 *     故 `preserveAspectRatio="none"` 的形变可忽略（<0.1%）。
 */
export const CAPTION_GLYPH_PATH_MAXIMIZE =
  'M 1.516 -0.001 L 7.451 0.009 C 8.751 0.019 9 1 8.981 1.477 L 9.002 7.558 M 9.002 7.547 C 8.929 8.669 8 9 7.43 9.015 L 1.464 9.005 C 0.374 8.973 0 8 -0.004 7.484 L -0.004 1.477 C 0 1 0.415 0.009 1.527 -0.001'

export const CAPTION_GLYPH_PATH_RESTORE =
  'M 1.516 -0.001 L 7.451 0.009 C 8.751 0.019 9 1 8.981 1.477 L 9.002 7.558 M 11 6 L 11 2 C 11 0 10 -2 8.011 -1.946 L 7.06 -1.969 L 3 -2 M 9.002 7.547 C 8.929 8.669 8 9 7.43 9.015 L 1.464 9.005 C 0.374 8.973 0 8 -0.004 7.484'

/**
 * 内联字形定义：`viewBox` 已经把路径边界向外扩 0.5（描边一半），避免 `overflow:hidden`
 * 把描边裁掉。
 *
 * 最小化与关闭字形**不在仓库里**：`WindowCaptionButton` 样式把 `Data` 绑到
 * `Content`（由非托管代码以字符串注入），原生 chrome 源码（`CWindowChrome.cpp` /
 * `WindowHelpers.cpp`）里没有任何字形数据。故这两条按参考图实测几何自绘：
 *   - 最小化：10×1 水平线（参考图 y = 按钮竖直中心那一行）
 *   - 关闭：10×10 叉，`butt` 端头（参考图两端无圆头）
 * 属**证据缺口**，实现时已用参考图交叉验证（见文档页《证据缺口》）。
 */
export interface CaptionGlyph {
  /** SVG viewBox（含描边余量） */
  viewBox: string
  /** 一条或多条 `d` 数据 */
  paths: readonly string[]
}

export const CAPTION_GLYPH_MINIMIZE: CaptionGlyph = {
  viewBox: '0 0 10 10',
  paths: ['M0.5 5H9.5'],
} as const

export const CAPTION_GLYPH_MAXIMIZE: CaptionGlyph = {
  // 自然边界：x -0.004..9.002（9.006）、y -0.001..9.015（9.016），各向外扩 0.5
  viewBox: '-0.504 -0.501 10.01 10.018',
  paths: [CAPTION_GLYPH_PATH_MAXIMIZE],
} as const

export const CAPTION_GLYPH_RESTORE: CaptionGlyph = {
  // 自然边界：x -0.004..11（11.008）、y -2..9.015（11.016），各向外扩 0.5
  viewBox: '-0.504 -2.501 12.016 12.018',
  paths: [CAPTION_GLYPH_PATH_RESTORE],
} as const

export const CAPTION_GLYPH_CLOSE: CaptionGlyph = {
  viewBox: '0 0 10 10',
  paths: ['M0.5 0.5 9.5 9.5', 'M9.5 0.5 0.5 9.5'],
} as const
