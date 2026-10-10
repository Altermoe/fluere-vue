import type { ComponentLocaleSlice } from '@fluere-vue/hooks'

/**
 * FluereInfoBar 的 locale 切片（todo §1.4 首批文案）。
 *
 * scope 名：`infobar`。`close` 对应 WinUI 已本地化资源 `InfoBarCloseButtonName`
 *  （英文 "Close"）。此前组件「不硬编码自然语言、closeButtonLabel 缺省不渲染」；
 *  接入 i18n 通道后由本切片提供 locale 驱动的缺省可访问名，显式 prop 仍优先。
 *
 * 内置缺省语种 zh-Hans；缺 key 回退 `zh-Hans → zh → en`。
 */
export const infoBarLocale: ComponentLocaleSlice = {
  zhHans: {
    close: '关闭',
  },
  en: {
    close: 'Close',
  },
}
