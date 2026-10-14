import type { ComponentLocaleSlice } from '@fluere-vue/hooks'

/**
 * TabView 的 locale 切片（scope `tab-view`）。
 *
 * 8 条文案**逐字取自上游资源**（不是本库自译）：
 *   `src/controls/dev/TabView/Strings/en-us/Resources.resw`
 *   `src/controls/dev/TabView/Strings/zh-CN/Resources.resw`
 * （tag `winui3/release/2.5.1`，commit `ba3a8d5`）。
 *
 * | key | 上游资源名 | en-us | zh-CN |
 * | --- | --- | --- | --- |
 * | `addButtonName` | `TabViewAddButtonName` | `Add New Tab` | `添加新标签页` |
 * | `addButtonTooltip` | `TabViewAddButtonTooltip` | `Add new tab` | `添加新标签页` |
 * | `closeButtonName` | `TabViewCloseButtonName` | `Close Tab` | `关闭标签页` |
 * | `closeButtonTooltip` | `TabViewCloseButtonTooltipWithKA` | `Close tab (Ctrl+F4)` | `关闭选项卡(Ctrl+F4)` |
 * | `scrollDecreaseTooltip` | `TabViewScrollDecreaseButtonTooltip` | `Scroll tab list backward` | `向后滚动选项卡列表` |
 * | `scrollIncreaseTooltip` | `TabViewScrollIncreaseButtonTooltip` | `Scroll tab list forward` | `向前滚动选项卡列表` |
 * | `newTabAddedNotification` | `TabViewNewTabAddedNotification` | `New tab added.` | `已添加新选项卡。` |
 *
 * 说明（照抄上游的两处不一致，不算笔误）：
 *  - 上游 zh-CN 的 `TabViewAddButtonName/Tooltip` 用「标签页」，而 close / scroll / notification
 *    用「选项卡」；本库保持原样，避免自造第二套词汇。
 *  - `TabViewCloseButtonTooltip`（不带 KA）在本 tag 内**没有任何代码引用**
 *    （`TabView.cpp:84` 只用了 `...WithKA`），故本库只用 `closeButtonTooltip` 一条。
 *
 * 内置缺省语种 zh-Hans；缺 key 回退 `zh-Hans → zh → en`。
 */
export const tabViewLocale: ComponentLocaleSlice = {
  zhHans: {
    addButtonName: '添加新标签页',
    addButtonTooltip: '添加新标签页',
    closeButtonName: '关闭标签页',
    closeButtonTooltip: '关闭选项卡(Ctrl+F4)',
    scrollDecreaseTooltip: '向后滚动选项卡列表',
    scrollIncreaseTooltip: '向前滚动选项卡列表',
    newTabAddedNotification: '已添加新选项卡。',
  },
  en: {
    addButtonName: 'Add New Tab',
    addButtonTooltip: 'Add new tab',
    closeButtonName: 'Close Tab',
    closeButtonTooltip: 'Close tab (Ctrl+F4)',
    scrollDecreaseTooltip: 'Scroll tab list backward',
    scrollIncreaseTooltip: 'Scroll tab list forward',
    newTabAddedNotification: 'New tab added.',
  },
}
