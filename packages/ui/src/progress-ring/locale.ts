import type { ComponentLocaleSlice } from '@fluere-vue/hooks'

/**
 * FluereProgressRing 的 locale 切片（todo §1.4 首批文案）。
 *
 * scope 名：`progress-ring`。`loading` 是不确定态（indeterminate）缺省的可访问名；
 * 确定态不补缺省名（有 `aria-valuetext` 的百分比足以表达进度）。显式 `label` prop
 * 压过 locale。内置缺省语种 zh-Hans；缺 key 回退 `zh-Hans → zh → en`。
 */
export const progressRingLocale: ComponentLocaleSlice = {
  zhHans: {
    loading: '加载中',
  },
  en: {
    loading: 'Loading',
  },
}
