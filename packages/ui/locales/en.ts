import type { LocaleOverrideMessages } from '@fluere-vue/hooks'
import { infoBarLocale } from '../src/infobar/locale'
import { inputLocale } from '../src/input/locale'
import { numberBoxLocale } from '../src/number-box/locale'
import { progressBarLocale } from '../src/progress-bar/locale'
import { progressRingLocale } from '../src/progress-ring/locale'
import { scrollViewLocale } from '../src/scrollview/locale'

/**
 * @fluere-vue/ui/locales/en —— 英文内置文案聚合（todo §1.4 子路径导出）。
 * 结构与 role 同 zh-Hans.ts，见其注释。
 */
export const en: LocaleOverrideMessages = {
  'input': inputLocale.en,
  'infobar': infoBarLocale.en,
  'number-box': numberBoxLocale.en,
  'progress-bar': progressBarLocale.en,
  'progress-ring': progressRingLocale.en,
  'scroll-view': scrollViewLocale.en,
}

export default en
