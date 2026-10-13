import type { ComponentLocaleSlice } from '@fluere-vue/hooks'

/**
 * FluereAppWindow 的 locale 切片（scope `app-window`）。
 *
 * 对应 WinUI 已本地化资源：
 *   - `NavigationBackButtonName`     = "Back"（`NavigationView/Strings/en-us/Resources.resw`，
 *     `TitleBar.cpp#LoadBackButton` 用它设 `AutomationProperties.Name`）
 *   - `NavigationBackButtonToolTip`  = "Back"（同上，用作 ToolTip 内容）
 *   - `NavigationButtonToggleName`   = "Toggle Navigation"（`TitleBar/Strings/en-us/Resources.resw`，
 *     `TitleBar.cpp#LoadPaneToggleButton` 用它同时设可访问名与 ToolTip）
 *
 * 注意 XAML 模板里那两个 `ToolTipService.ToolTip="Back"` / `"Navigation"` 只是占位字面量，
 * 按钮加载后会被上面的资源字符串覆盖 —— 所以是 "Toggle Navigation" 而不是 "Navigation"。
 *
 * 内置缺省语种 zh-Hans；缺 key 回退 `zh-Hans → zh → en`。
 */
export const appWindowLocale: ComponentLocaleSlice = {
  zhHans: {
    back: '返回',
    backTooltip: '返回',
    toggleNavigation: '切换导航',
    toggleNavigationTooltip: '切换导航',
  },
  en: {
    back: 'Back',
    backTooltip: 'Back',
    toggleNavigation: 'Toggle Navigation',
    toggleNavigationTooltip: 'Toggle Navigation',
  },
}

/**
 * FluereCaptionButtons 的 locale 切片（scope `caption-buttons`）。
 *
 * caption 按钮**没有任何 XAML / resw 来源**：WinUI 3 的 `TitleBar` 不含 caption 视觉，
 * 最小化 / 最大化 / 还原 / 关闭由系统（DWM）绘制，随系统语言本地化。
 * 故这里按 Windows 系统文案（简体中文 / 英文）提供内建值，属**证据缺口**：
 * 系统文案本身不在 `microsoft-ui-xaml` 里；`restore` 取 Windows 的 "Restore Down"（向下还原）。
 *
 * 内置缺省语种 zh-Hans；缺 key 回退 `zh-Hans → zh → en`。
 */
export const captionButtonsLocale: ComponentLocaleSlice = {
  zhHans: {
    minimize: '最小化',
    maximize: '最大化',
    restore: '向下还原',
    close: '关闭',
  },
  en: {
    minimize: 'Minimize',
    maximize: 'Maximize',
    restore: 'Restore Down',
    close: 'Close',
  },
}
