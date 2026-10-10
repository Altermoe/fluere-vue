import type { ComponentLocaleSlice } from '@fluere-vue/hooks'

/**
 * FluereScrollView 的 locale 切片（todo §1.4 首批文案）。
 *
 * scope 名：`scroll-view`。覆盖两类可访问名：
 *  - 滚动条两端步进按钮（方向 step）的可读名；
 *  - 横向 / 纵向滚动条拇指（`role=scrollbar`）的可访问名。
 *
 * 这些原文在 Web 侧无 WinUI 对应本地化资源（WinUI 滚动条由系统 + AutomationPeer
 * 生成、样式资源里不含文字），故以库内建文案兜底；消费方可用 Provider messages
 * 覆盖。内置缺省语种 zh-Hans；缺 key 回退 `zh-Hans → zh → en`。
 */
export const scrollViewLocale: ComponentLocaleSlice = {
  zhHans: {
    scrollUp: '向上滚动',
    scrollDown: '向下滚动',
    scrollLeft: '向左滚动',
    scrollRight: '向右滚动',
    horizontalScrollBar: '水平滚动条',
    verticalScrollBar: '垂直滚动条',
  },
  en: {
    scrollUp: 'Scroll up',
    scrollDown: 'Scroll down',
    scrollLeft: 'Scroll left',
    scrollRight: 'Scroll right',
    horizontalScrollBar: 'Horizontal scroll bar',
    verticalScrollBar: 'Vertical scroll bar',
  },
}
