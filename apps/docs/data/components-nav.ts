/**
 * `/components` 侧边导航栏数据。
 *
 * 分组参考 reka-ui 官网（https://reka-ui.com/docs/components/autocomplete）
 * 的原语分类：Form / Color / Dates / General。
 * - `implemented: true`  表示组件已实现，点击跳转到 `/components/{slug}` 文档页
 * - `implemented: false` 表示尚未实现，侧边栏展示「未实现」占位提示
 */
interface ComponentNavItem {
  /** 组件 slug，对应 `/components/{slug}` 路由 */
  slug: string
  /** 展示名称 */
  name: string
  /** 是否已实现（存在对应文档页） */
  implemented: boolean
}

interface ComponentNavGroup {
  /** 分组 key */
  id: string
  /** 分组英文名 */
  title: string
  /** 分组中文名 */
  label: string
  items: ComponentNavItem[]
}

const componentNavGroups: ComponentNavGroup[] = [
  {
    id: 'basic',
    title: 'Basic',
    label: '基础',
    items: [
      { slug: 'button', name: 'Button', implemented: true },
      { slug: 'input', name: 'Input', implemented: true },
      { slug: 'scroll-view', name: 'Scroll View', implemented: true },
      { slug: 'icons', name: 'Icons', implemented: true },
    ],
  },
  {
    id: 'form',
    title: 'Form',
    label: '表单',
    items: [
      { slug: 'autocomplete', name: 'Autocomplete', implemented: false },
      { slug: 'checkbox', name: 'Checkbox', implemented: true },
      { slug: 'combobox', name: 'Combobox', implemented: true },
      { slug: 'editable', name: 'Editable', implemented: false },
      { slug: 'listbox', name: 'Listbox', implemented: false },
      { slug: 'number-box', name: 'Number Box', implemented: true },
      { slug: 'label', name: 'Label', implemented: false },
      { slug: 'pin-input', name: 'Pin Input', implemented: false },
      { slug: 'radio-group', name: 'Radio Group', implemented: true },
      { slug: 'rating', name: 'Rating', implemented: false },
      { slug: 'select', name: 'Select', implemented: false },
      { slug: 'slider', name: 'Slider', implemented: true },
      { slug: 'switch', name: 'Switch', implemented: true },
      { slug: 'tags-input', name: 'Tags Input', implemented: false },
      { slug: 'toggle', name: 'Toggle', implemented: false },
      { slug: 'toggle-group', name: 'Toggle Group', implemented: false },
    ],
  },
  {
    id: 'color',
    title: 'Color',
    label: '颜色',
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
    items: [
      { slug: 'accordion', name: 'Accordion', implemented: false },
      { slug: 'alert-dialog', name: 'Alert Dialog', implemented: false },
      { slug: 'aspect-ratio', name: 'Aspect Ratio', implemented: false },
      { slug: 'avatar', name: 'Avatar', implemented: false },
      { slug: 'collapsible', name: 'Collapsible', implemented: false },
      { slug: 'context-menu', name: 'Context Menu', implemented: false },
      { slug: 'dialog', name: 'Dialog', implemented: false },
      { slug: 'drawer', name: 'Drawer', implemented: false },
      { slug: 'dropdown-menu', name: 'Dropdown Menu', implemented: false },
      { slug: 'hover-card', name: 'Hover Card', implemented: false },
      { slug: 'menubar', name: 'Menubar', implemented: false },
      { slug: 'navigation-menu', name: 'Navigation Menu', implemented: false },
      { slug: 'pagination', name: 'Pagination', implemented: false },
      { slug: 'popover', name: 'Popover', implemented: false },
      { slug: 'progress', name: 'Progress Bar', implemented: true },
      { slug: 'progress-ring', name: 'Progress Ring', implemented: true },
      { slug: 'scroll-area', name: 'Scroll Area', implemented: false },
      { slug: 'separator', name: 'Separator', implemented: false },
      { slug: 'splitter', name: 'Splitter', implemented: false },
      { slug: 'stepper', name: 'Stepper', implemented: false },
      { slug: 'tabs', name: 'Tabs', implemented: false },
      { slug: 'toast', name: 'Toast', implemented: false },
      { slug: 'toolbar', name: 'Toolbar', implemented: false },
      { slug: 'tooltip', name: 'Tooltip', implemented: false },
      { slug: 'tree', name: 'Tree', implemented: false },
    ],
  },
]

export { componentNavGroups }
export type { ComponentNavGroup, ComponentNavItem }
