import type { ComponentLocaleSlice } from '@fluere-vue/hooks'

/**
 * NavigationView 的 locale 切片（scope `navigation-view`）。
 *
 * 文案**逐字取自上游资源**（不是本库自译）：
 *   `src/controls/dev/NavigationView/Strings/en-us/Resources.resw`
 *   `src/controls/dev/NavigationView/Strings/zh-CN/Resources.resw`
 * （tag `winui3/release/2.5.1`，commit `ba3a8d5`）。
 *
 * | key | 上游资源名 | en-us | zh-CN |
 * | --- | --- | --- | --- |
 * | `paneToggleButtonClosedName` | `NavigationButtonClosedName` | `Open Navigation` | `打开导航` |
 * | `paneToggleButtonOpenName` | `NavigationButtonOpenName` | `Close Navigation` | `关闭导航` |
 * | `settingsButtonName` | `SettingsButtonName` | `Settings` | `设置` |
 * | `defaultItemName` | `NavigationViewItemDefaultControlName` | `NavigationViewItem` | `NavigationViewItem` |
 *
 * 上游 resw 里还有 6 条文案（`NavigationViewSearchButtonName` / `NavigationBackButtonName` /
 * `NavigationBackButtonToolTip` / `NavigationCloseButtonName` / `NavigationOverflowButtonName` /
 * `NavigationOverflowButtonText` / `NavigationOverflowButtonToolTip`），分别属于
 * **自动建议框**、**返回按钮**、**关闭按钮**、**顶部导航溢出按钮** —— 这四类本库本期都不实现
 * （见 `navigation-view.vue` 的非目标表），因此**不收录**，避免留下没有消费方的死文案。
 *
 * `paneToggleButtonOpenName` 在上游同时用作「开关按钮的自动化名（打开态）」与「关闭按钮的
 * tooltip」（`Resources.resw` 的 comment），本库只消费前者（无关闭按钮）。
 *
 * 内置缺省语种 zh-Hans；缺 key 回退 `zh-Hans → zh → en`。
 */
export const navigationViewLocale: ComponentLocaleSlice = {
  zhHans: {
    paneToggleButtonClosedName: '打开导航',
    paneToggleButtonOpenName: '关闭导航',
    settingsButtonName: '设置',
    defaultItemName: 'NavigationViewItem',
  },
  en: {
    paneToggleButtonClosedName: 'Open Navigation',
    paneToggleButtonOpenName: 'Close Navigation',
    settingsButtonName: 'Settings',
    defaultItemName: 'NavigationViewItem',
  },
}
