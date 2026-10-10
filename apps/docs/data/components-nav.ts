/**
 * 组件注册表：`/components` 侧边导航栏 + Overview 卡片网格的**唯一数据源**。
 *
 * 分组参考 reka-ui 官网（https://reka-ui.com/docs/components/autocomplete）
 * 的原语分类：Basic / Form / Color / Dates / General。
 * - `implemented: true`  表示组件已实现，点击跳转到 `/components/{slug}` 文档页；
 *   这一支**必须**同时给出 `summary`（卡片一句话摘要）与 `icon`（卡片图标），
 *   类型上由 `ImplementedComponentNavItem` 强制，漏写会编译报错。
 * - `implemented: false` 表示尚未实现，侧边栏展示「未实现」占位提示。
 *
 * 卡片文案为什么单独写 `summary` 而不复用 `.md` frontmatter 的 `description`：
 * 后者是文档页的头部描述（含「遮罩层与弹窗的进入 / 退出缓动逐帧对齐 WinUI 3」这类
 * 规格细节），一行放不下；卡片只承载「这个组件是干什么的」。
 *
 * `palette` 是分组级的图标配色（Fluent 调色板家族名），由 Overview 卡片翻译成
 * `colorPalette<Family>Foreground2`；映射与依据见 `components/component-card.vue`。
 */
import {
  FluentIconAppsListDetail24Regular,
  FluentIconBadge24Regular,
  FluentIconCheckboxChecked24Regular,
  FluentIconCircleHalfFill24Regular,
  FluentIconControlButton24Regular,
  FluentIconDataBarHorizontal24Regular,
  FluentIconDualScreenVerticalScroll24Regular,
  FluentIconGlobe24Regular,
  FluentIconInfo24Regular,
  FluentIconNumberSymbol24Regular,
  FluentIconOptions24Regular,
  FluentIconRadioButton24Regular,
  FluentIconSquareMultiple24Regular,
  FluentIconSymbols24Regular,
  FluentIconTextbox24Regular,
  FluentIconToggleRight24Regular,
  FluentIconTooltipQuote24Regular,
} from '@fluere-vue/icons'
import type { Component } from 'vue'
import type { MessageSchema } from '~/i18n/schema'

/**
 * 展示名称 / 摘要的 i18n key 类型。
 *
 * 约定（与 docs/todo.md 目标 1.2 一致）：组件显示名（Button / Input …）是
 * 专有名词，双语都保持英文，不进 key；只有**分组标题**与**卡片一句话摘要**
 * 是会随语种变化的界面串，落到 `nav.groups.*` / `nav.summary.*`。
 * `MessageSchema` 由 zh-Hans 主语言 JSON 推导，写错 key 会在 vue-tsc 下报错。
 */

/** Overview 卡片图标的配色家族（Fluent 调色板，卡片侧映射到具体 token）。 */
type ComponentPalette = 'blue' | 'purple' | 'plum' | 'teal' | 'marigold'

/** 两个分支的公共字段。 */
interface ComponentNavItemBase {
  /** 组件 slug，对应 `/components/{slug}` 路由 */
  slug: string
  /** 展示名称（专有名词，双语保持英文，不进 i18n key） */
  name: string
}

/** 已实现：文档页存在，Overview 卡片需要的字段齐全。 */
interface ImplementedComponentNavItem extends ComponentNavItemBase {
  implemented: true
  /**
   * Overview 卡片的一句话摘要（i18n key，见 nav.summary.*）。
   * 只允许 MessageSchema 里真实存在的 key，键入错误由类型系统兜底。
   */
  summaryKey: keyof MessageSchema['nav']['summary']
  /** Overview 卡片图标（24px 字形，卡片按 32px 渲染） */
  icon: Component
}

/** 未实现：侧边栏占位。 */
interface PlannedComponentNavItem extends ComponentNavItemBase {
  implemented: false
}

type ComponentNavItem = ImplementedComponentNavItem | PlannedComponentNavItem

interface ComponentNavGroup {
  /** 分组 key，对应 i18n key `nav.groups.{id}`（分组标题随语种解析） */
  id: keyof MessageSchema['nav']['groups']
  /** 该分组的卡片图标配色 */
  palette: ComponentPalette
  items: ComponentNavItem[]
}

const componentNavGroups: ComponentNavGroup[] = [
  {
    id: 'basic',
    palette: 'blue',
    items: [
      {
        slug: 'button',
        name: 'Button',
        implemented: true,
        summaryKey: 'button',
        icon: FluentIconControlButton24Regular,
      },
      {
        slug: 'input',
        name: 'Input',
        implemented: true,
        summaryKey: 'input',
        icon: FluentIconTextbox24Regular,
      },
      {
        slug: 'scroll-view',
        name: 'Scroll View',
        implemented: true,
        summaryKey: 'scroll-view',
        icon: FluentIconDualScreenVerticalScroll24Regular,
      },
      {
        slug: 'icons',
        name: 'Icons',
        implemented: true,
        summaryKey: 'icons',
        icon: FluentIconSymbols24Regular,
      },
    ],
  },
  {
    id: 'form',
    palette: 'purple',
    items: [
      { slug: 'autocomplete', name: 'Autocomplete', implemented: false },
      {
        slug: 'checkbox',
        name: 'Checkbox',
        implemented: true,
        summaryKey: 'checkbox',
        icon: FluentIconCheckboxChecked24Regular,
      },
      {
        slug: 'combobox',
        name: 'Combobox',
        implemented: true,
        summaryKey: 'combobox',
        icon: FluentIconAppsListDetail24Regular,
      },
      { slug: 'editable', name: 'Editable', implemented: false },
      { slug: 'listbox', name: 'Listbox', implemented: false },
      {
        slug: 'number-box',
        name: 'Number Box',
        implemented: true,
        summaryKey: 'number-box',
        icon: FluentIconNumberSymbol24Regular,
      },
      { slug: 'label', name: 'Label', implemented: false },
      { slug: 'pin-input', name: 'Pin Input', implemented: false },
      {
        slug: 'radio-group',
        name: 'Radio Group',
        implemented: true,
        summaryKey: 'radio-group',
        icon: FluentIconRadioButton24Regular,
      },
      { slug: 'rating', name: 'Rating', implemented: false },
      { slug: 'select', name: 'Select', implemented: false },
      {
        slug: 'slider',
        name: 'Slider',
        implemented: true,
        summaryKey: 'slider',
        icon: FluentIconOptions24Regular,
      },
      {
        slug: 'switch',
        name: 'Switch',
        implemented: true,
        summaryKey: 'switch',
        icon: FluentIconToggleRight24Regular,
      },
      { slug: 'tags-input', name: 'Tags Input', implemented: false },
      { slug: 'toggle', name: 'Toggle', implemented: false },
      { slug: 'toggle-group', name: 'Toggle Group', implemented: false },
    ],
  },
  {
    id: 'color',
    palette: 'plum',
    items: [
      { slug: 'color-area', name: 'Color Area', implemented: false },
      { slug: 'color-field', name: 'Color Field', implemented: false },
      { slug: 'color-slider', name: 'Color Slider', implemented: false },
      { slug: 'color-swatch', name: 'Color Swatch', implemented: false },
      { slug: 'color-swatch-picker', name: 'Color Swatch Picker', implemented: false },
    ],
  },
  {
    id: 'dates',
    palette: 'marigold',
    items: [
      { slug: 'calendar', name: 'Calendar', implemented: false },
      { slug: 'date-field', name: 'Date Field', implemented: false },
      { slug: 'date-picker', name: 'Date Picker', implemented: false },
      { slug: 'date-range-field', name: 'Date Range Field', implemented: false },
      { slug: 'date-range-picker', name: 'Date Range Picker', implemented: false },
      { slug: 'range-calendar', name: 'Range Calendar', implemented: false },
      { slug: 'time-field', name: 'Time Field', implemented: false },
      { slug: 'time-range-field', name: 'Time Range Field', implemented: false },
      { slug: 'month-picker', name: 'Month Picker', implemented: false },
      { slug: 'month-range-picker', name: 'Month Range Picker', implemented: false },
      { slug: 'year-picker', name: 'Year Picker', implemented: false },
      { slug: 'year-range-picker', name: 'Year Range Picker', implemented: false },
    ],
  },
  {
    id: 'general',
    palette: 'teal',
    items: [
      { slug: 'accordion', name: 'Accordion', implemented: false },
      { slug: 'alert-dialog', name: 'Alert Dialog', implemented: false },
      { slug: 'aspect-ratio', name: 'Aspect Ratio', implemented: false },
      { slug: 'avatar', name: 'Avatar', implemented: false },
      { slug: 'collapsible', name: 'Collapsible', implemented: false },
      {
        slug: 'config-provider',
        name: 'Config Provider',
        implemented: true,
        summaryKey: 'config-provider',
        icon: FluentIconGlobe24Regular,
      },
      {
        slug: 'content-dialog',
        name: 'Content Dialog',
        implemented: true,
        summaryKey: 'content-dialog',
        icon: FluentIconSquareMultiple24Regular,
      },
      { slug: 'context-menu', name: 'Context Menu', implemented: false },
      { slug: 'dialog', name: 'Dialog', implemented: false },
      { slug: 'drawer', name: 'Drawer', implemented: false },
      { slug: 'dropdown-menu', name: 'Dropdown Menu', implemented: false },
      { slug: 'hover-card', name: 'Hover Card', implemented: false },
      {
        slug: 'info-badge',
        name: 'Info Badge',
        implemented: true,
        summaryKey: 'info-badge',
        icon: FluentIconBadge24Regular,
      },
      {
        slug: 'infobar',
        name: 'Info Bar',
        implemented: true,
        summaryKey: 'infobar',
        icon: FluentIconInfo24Regular,
      },
      { slug: 'menubar', name: 'Menubar', implemented: false },
      { slug: 'navigation-menu', name: 'Navigation Menu', implemented: false },
      { slug: 'pagination', name: 'Pagination', implemented: false },
      { slug: 'popover', name: 'Popover', implemented: false },
      {
        slug: 'progress',
        name: 'Progress Bar',
        implemented: true,
        summaryKey: 'progress',
        icon: FluentIconDataBarHorizontal24Regular,
      },
      {
        slug: 'progress-ring',
        name: 'Progress Ring',
        implemented: true,
        summaryKey: 'progress-ring',
        icon: FluentIconCircleHalfFill24Regular,
      },
      { slug: 'scroll-area', name: 'Scroll Area', implemented: false },
      { slug: 'separator', name: 'Separator', implemented: false },
      { slug: 'splitter', name: 'Splitter', implemented: false },
      { slug: 'stepper', name: 'Stepper', implemented: false },
      { slug: 'tabs', name: 'Tabs', implemented: false },
      { slug: 'toast', name: 'Toast', implemented: false },
      { slug: 'toolbar', name: 'Toolbar', implemented: false },
      {
        slug: 'tooltip',
        name: 'Tooltip',
        implemented: true,
        summaryKey: 'tooltip',
        icon: FluentIconTooltipQuote24Regular,
      },
      { slug: 'tree', name: 'Tree', implemented: false },
    ],
  },
]

export { componentNavGroups }
export type {
  ComponentNavGroup,
  ComponentNavItem,
  ComponentPalette,
  ImplementedComponentNavItem,
  PlannedComponentNavItem,
}
