/**
 * FluereInfoBadge 常量层。
 *
 * 只放「有 WinUI 资源名的几何数值」与 Severity → 内建字形映射；取色 / 圆角一律在
 * SFC 的 `<style scoped>` 里以 Fluent token 表达（见 info-badge.vue）。
 *
 * 来源：microsoft-ui-xaml `winui3/release/2.5.1`（与 Gallery v2.9.3 所用 WASDK 2.0.1 逐字节一致）
 *   src/controls/dev/InfoBadge/InfoBadge_themeresources.xaml
 *   src/controls/dev/InfoBadge/InfoBadge.xaml
 *   src/controls/dev/InfoBadge/InfoBadge.cpp
 */
import {
  FluentIconCheckmark16Filled,
  FluentIconDismiss16Filled,
  FluentIconImportant16Filled,
  FluentIconInfo16Regular,
  FluentIconTextAsterisk16Filled,
} from '@fluere-vue/icons'
import type { Component } from 'vue'
import type { FluereInfoBadgeIconSeverity, FluereInfoBadgeSeverity } from './types'

/** `InfoBadgeMinWidth` / `InfoBadgeMinHeight`（缺省主题与 Light 主题同为 4） */
export const INFO_BADGE_MIN_SIZE = 4

/** `InfoBadgeMaxHeight`（无同名 `MaxWidth` —— 宽由内容决定，见 `MeasureOverride`） */
export const INFO_BADGE_MAX_HEIGHT = 16

/** `InfoBadgeValueFontSize` */
export const INFO_BADGE_VALUE_FONT_SIZE = 11

/**
 * 图标态的等比容器尺寸（`Viewbox` 的高度）。
 *
 * WinUI 模板里没有任何一处直接用 `InfoBadgeIconWidth` / `InfoBadgeIconHeight`
 * （12 / 8（Default、Dark）或 12 / 9（Light、HighContrast）—— 这两个资源是**死资源**，
 * 模板里只用了 `ContentPresenter` 包在 `Viewbox` 里）：`Viewbox` 的
 * `VerticalAlignment=Stretch` 会把它撑满「`InfoBadgeMaxHeight` − 上下内边距 − 上下外边距」，
 * 再把 `IconSource` 解析出的图标等比缩放进去。两种图标形态的可用高都是 8：
 *   FontIcon 态（Attention / Informational）：`Padding=0,4,0,2` + `IconInfoBadgeFontIconMargin=4,0,4,2`
 *   Icon 态（Success / Caution / Critical）：`Padding=0`     + `IconInfoBadgeIconMargin=4,4,4,4`
 * 即 16 − (4 + 2) − (0 + 2) = 16 − (0) − (4 + 4) = 8。两侧外边距都是 4 + 4，
 * 所以两种形态的**几何完全等价**，本库统一用「4px 外边距 + 8px 图标框」表达。
 */
export const INFO_BADGE_ICON_SIZE = INFO_BADGE_MAX_HEIGHT - 4 * 2

/** `IconInfoBadgeIconMargin` = 4,4,4,4（等价于 FontIcon 态的 `Padding` + Margin，见上） */
export const INFO_BADGE_ICON_MARGIN = 4

/** `ValueInfoBadgeTextMargin` = 4,0,4,2（XAML Thickness 顺序为 左,上,右,下） */
export const INFO_BADGE_VALUE_MARGIN = { left: 4, top: 0, right: 4, bottom: 2 } as const

/** Severity → 底色对应的 WinUI 资源名（只用于注释与文档对照，取值在 SFC 的 style 块） */
export const INFO_BADGE_SEVERITY_BRUSH: Record<FluereInfoBadgeSeverity, string> = {
  accent: 'AccentFillColorDefaultBrush',
  attention: 'SystemFillColorAttentionBrush',
  informational: 'SystemFillColorSolidNeutralBrush',
  success: 'SystemFillColorSuccessBrush',
  caution: 'SystemFillColorCautionBrush',
  critical: 'SystemFillColorCriticalBrush',
}

/**
 * Severity → 内建字形（对应 `InfoBadge_themeresources.xaml` 里 `*IconInfoBadgeStyle`
 * 预置的 `IconSource`）。
 *
 * ## 选型方法：先证明「WinUI 用的是裸字形」，再按**图形**而不是图标名挑
 *
 * WinUI 的五个 Icon 预置分两类：
 *   FontIconSource：Attention `Glyph=&#xEA38;`、Informational `Glyph=&#xF13F;`
 *   SymbolIconSource：Success `Symbol=Accept`(E8FB)、Caution `Symbol=Important`(E171)、
 *                     Critical `Symbol=Cancel`(E711)
 * 把官方 Segoe Fluent Icons 字体（<https://aka.ms/SegoeFluentIcons>，仅本地验证）
 * 在 16px 圆底上按真实尺寸渲染出来比对（脚本 `temp/infobadge-visual/glyph-badge-compare.mjs`）
 * 可以确认：**五个字形都是「裸字形」**，圆底由 InfoBadge 本体提供 —— 这一点很关键，
 * 因为 InfoBar 用的是 `F136`（实心圆）+ `F13F`（i）**两个字形叠加**，而 InfoBadge 的
 * `InformationalIconInfoBadgeStyle` 只给了 `F13F` 一个字形，没有叠加圆底。
 * 因此五个映射都必须挑「不带圆的裸字形」，不能照搬 InfoBar 的 `*_filled` 圆角色标。
 *
 * 逐个结论（图形依据见 `temp/infobadge-visual/glyph-compare.png`、
 * `glyph-badge-compare.png`、`final-icon-compare.png` 三张实测图）：
 *   attention     Segoe `EA38 Asterisk`（8 芒星号）→ `text_asterisk_16_filled`（同为 8 芒星号）
 *   informational Segoe `F13F`（**裸 i**）→ `info_16_regular`
 *                 Fluent System Icons 没有裸字形 `i`：`info_16_filled` 是「实心圆 + 镂空 i」，
 *                 直接放上去会得到「白圆盘 + 徽章色 i」，前景 / 底色关系和 WinUI 相反
 *                 （实测墨迹覆盖率 78% vs 本库 22%）；`info_16_regular` 是同一份 i
 *                 （子路径与 filled 的镂空 i 几何完全相同）外面多一圈 1 单位宽的白环，
 *                 i 仍是白色前景 ⇒ 只有「多一圈细环」这一处结构性偏差。
 *                 已用 `temp/infobadge-visual/find-bare-i.mjs` 对 16px filled 全量 1,729 个
 *                 图标做「窄高包围盒 + 恰好两个连通块 + 上块更小」的自动扫描，短名单为空，
 *                 可确认该字形在官方图标集里不存在。
 *   success       Segoe `E8FB Accept`（裸对勾）→ `checkmark_16_filled`（裸对勾）
 *   caution       Segoe `E171 Important`（裸感叹号）→ `important_16_filled`（裸感叹号）
 *   critical      Segoe `E711 Cancel`（裸叉）→ `dismiss_16_filled`（裸叉）
 *
 * 一律取 `filled`（除 informational 外）：字形框只有 8px（= 原生尺寸的一半），
 * `regular` 的 1 单位描边在 8px 下只剩 0.5px，会糊成一团浅灰。
 *
 * 墨迹尺寸实测（`temp/pw-infobadge.mjs` 第 3 节 / `temp/infobadge-visual/measure-segoe-ink.mjs`）：
 * WinUI 侧 1x 墨迹 attention 7.0×7.0、success 8.0×5.5、caution 3.0×8.0、critical 5.5×5.5，
 * 本库依次为 6×6 / 6×5 / 2×6 / 6×6（逐轴差 ≤ 2px）—— 差异来自两套图标集的设计留白
 * （Fluent 16px 字形墨迹约占外框 12/16，Segoe 符号字形几乎填满 em 框），
 * **图标框的映射本身是对的**（Fluent 的 viewBox ↔ Segoe 的 em 框，都由 Viewbox 缩放）。
 */
export const INFO_BADGE_SEVERITY_ICONS: Record<FluereInfoBadgeIconSeverity, Component> = {
  attention: FluentIconTextAsterisk16Filled,
  informational: FluentIconInfo16Regular,
  success: FluentIconCheckmark16Filled,
  caution: FluentIconImportant16Filled,
  critical: FluentIconDismiss16Filled,
}
