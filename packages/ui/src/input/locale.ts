import type { ComponentLocaleSlice } from '@fluere-vue/hooks'

/**
 * FluereInput 的 locale 切片（todo §1.4 首批文案）。
 *
 * scope 名：`input`（Provider 覆盖时用 `messages[locale].input.<key>`）。
 * 优先级：显式 prop（`revealButtonLabel`）> 组件 `locale` prop > Provider
 *  > 内置缺省 zh-Hans；缺 key 回退 `zh-Hans → zh → en`。
 *
 * `showPassword` 对应 WinUI `PasswordBox` 显示按钮的本地化串
 *  `UIA_PASSWORDBOX_REVEAL`（`PasswordBox_Partial.cpp`）。原英文缺省值
 *  迁到本切片 en 侧；内置缺省语种为 zh-Hans。
 */
export const inputLocale: ComponentLocaleSlice = {
  zhHans: {
    showPassword: '显示密码',
  },
  en: {
    showPassword: 'Show password',
  },
}
