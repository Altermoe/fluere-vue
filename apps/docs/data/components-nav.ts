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

/** Overview 卡片图标的配色家族（Fluent 调色板，卡片侧映射到具体 token）。 */
type ComponentPalette = 'blue' | 'purple' | 'plum' | 'teal' | 'marigold'

/** 两个分支的公共字段。 */
interface ComponentNavItemBase {
  /** 组件 slug，对应 `/components/{slug}` 路由 */
  slug: string
  /** 展示名称 */
  name: string
}

/** 已实现：文档页存在，Overview 卡片需要的字段齐全。 */
interface ImplementedComponentNavItem extends ComponentNavItemBase {
  implemented: true
  /** Overview 卡片的一句话摘要 */
  summary: string
  /** Overview 卡片图标（24px 字形，卡片按 32px 渲染） */
  icon: Component
}

/** 未实现：侧边栏占位。 */
interface PlannedComponentNavItem extends ComponentNavItemBase {
  implemented: false
}

type ComponentNavItem = ImplementedComponentNavItem | PlannedComponentNavItem

interface ComponentNavGroup {
  /** 分组 key */
  id: string
  /** 分组英文名 */
  title: string
  /** 分组中文名 */
  label: string
  /** 该分组的卡片图标配色 */
  palette: ComponentPalette
  items: ComponentNavItem[]
}

const componentNavGroups: ComponentNavGroup[] = [
  {
    id: 'basic',
    title: 'Basic',
    label: '基础',
    palette: 'blue',
    items: [
      {
        slug: 'button',
        name: 'Button',
        implemented: true,
        summary: '触发操作的按钮，五档外观与三种尺寸。',
        icon: FluentIconControlButton24Regular,
      },
      {
        slug: 'input',
        name: 'Input',
        implemented: true,
        summary: '单行 / 多行文本输入，支持标题、说明与密码形态。',
        icon: FluentIconTextbox24Regular,
      },
      {
        slug: 'scroll-view',
        name: 'Scroll View',
        implemented: true,
        summary: '内容超出视口时可滚动、平移与缩放的容器。',
        icon: FluentIconDualScreenVerticalScroll24Regular,
      },
      {
        slug: 'icons',
        name: 'Icons',
        implemented: true,
        summary: 'WinUI 3 / Fluent System Icons 图标组件。',
        icon: FluentIconSymbols24Regular,
      },
    ],
  },
  {
    id: 'form',
    title: 'Form',
    label: '表单',
    palette: 'purple',
    items: [
      { slug: 'autocomplete', name: 'Autocomplete', implemented: false },
      {
        slug: 'checkbox',
        name: 'Checkbox',
        implemented: true,
        summary: '在若干项中选择一个或多个，支持不确定态。',
        icon: FluentIconCheckboxChecked24Regular,
      },
      {
        slug: 'combobox',
        name: 'Combobox',
        implemented: true,
        summary: '从一组选项中选一项，支持文本搜索与可编辑。',
        icon: FluentIconAppsListDetail24Regular,
      },
      { slug: 'editable', name: 'Editable', implemented: false },
      { slug: 'listbox', name: 'Listbox', implemented: false },
      {
        slug: 'number-box',
        name: 'Number Box',
        implemented: true,
        summary: '录入数字，支持区间校验、步进与内联表达式。',
        icon: FluentIconNumberSymbol24Regular,
      },
      { slug: 'label', name: 'Label', implemented: false },
      { slug: 'pin-input', name: 'Pin Input', implemented: false },
      {
        slug: 'radio-group',
        name: 'Radio Group',
        implemented: true,
        summary: '在一组互斥选项中选择一个。',
        icon: FluentIconRadioButton24Regular,
      },
      { slug: 'rating', name: 'Rating', implemented: false },
      { slug: 'select', name: 'Select', implemented: false },
      {
        slug: 'slider',
        name: 'Slider',
        implemented: true,
        summary: '在连续区间内拖动取值。',
        icon: FluentIconOptions24Regular,
      },
      {
        slug: 'switch',
        name: 'Switch',
        implemented: true,
        summary: '在「开 / 关」两个状态间切换。',
        icon: FluentIconToggleRight24Regular,
      },
      { slug: 'tags-input', name: 'Tags Input', implemented: false },
      { slug: 'toggle', name: 'Toggle', implemented: false },
      { slug: 'toggle-group', name: 'Toggle Group', implemented: false },
    ],
  },
  {
    id: 'color',
    title: 'Color',
    label: '颜色',
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
    title: 'Dates',
    label: '日期',
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
    title: 'General',
    label: '通用',
    palette: 'teal',
    items: [
      { slug: 'accordion', name: 'Accordion', implemented: false },
      { slug: 'alert-dialog', name: 'Alert Dialog', implemented: false },
      { slug: 'aspect-ratio', name: 'Aspect Ratio', implemented: false },
      { slug: 'avatar', name: 'Avatar', implemented: false },
      { slug: 'collapsible', name: 'Collapsible', implemented: false },
      {
        slug: 'content-dialog',
        name: 'Content Dialog',
        implemented: true,
        summary: '模态对话框：标题 + 正文 + 主 / 次 / 关闭按钮。',
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
        summary: '非打断式小徽章：圆点 / 数值 / 图标三态。',
        icon: FluentIconBadge24Regular,
      },
      {
        slug: 'infobar',
        name: 'Info Bar',
        implemented: true,
        summary: '应用级状态提示横幅，四档 Severity、可关闭。',
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
        summary: '线性进度指示：不确定滑块与确定填充。',
        icon: FluentIconDataBarHorizontal24Regular,
      },
      {
        slug: 'progress-ring',
        name: 'Progress Ring',
        implemented: true,
        summary: '环形进度指示：不确定转圈与确定弧长。',
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
        summary: '悬停或聚焦时显示的补充信息浮层。',
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
