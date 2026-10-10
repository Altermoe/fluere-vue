import type { ComponentLocaleSlice } from '@fluere-vue/hooks'

/**
 * FluereNumberBox 的 locale 切片（todo §1.4 首批文案）。
 *
 * scope 名：`number-box`。对应 WinUI 已本地化资源 `SR_NumberBoxUpSpinButtonName`
 *  / `SR_NumberBoxDownSpinButtonName`（WordFormat 风格）；原英文缺省值迁到本切片
 *  en 侧，内置缺省语种为 zh-Hans。
 *
 * 优先级：显式 prop（`increaseLabel` / `decreaseLabel`）> 组件 `locale` prop
 *  > `FluereConfigProvider` > 内置缺省 zh-Hans；缺 key 回退 `zh-Hans → zh → en`。
 */
export const numberBoxLocale: ComponentLocaleSlice = {
  zhHans: {
    increase: '增加',
    decrease: '减少',
  },
  en: {
    increase: 'Increase',
    decrease: 'Decrease',
  },
}
