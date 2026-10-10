// 文件名 `zh-Hans` 是 BCP-47 locale 标识（对应子路径导出 ./locales/zh-Hans），非 kebab-case 违规。
/* oxlint-disable unicorn/filename-case */
import type { LocaleOverrideMessages } from '@fluere-vue/hooks'
import { infoBarLocale } from '../src/infobar/locale'
import { inputLocale } from '../src/input/locale'
import { numberBoxLocale } from '../src/number-box/locale'
import { progressBarLocale } from '../src/progress-bar/locale'
import { progressRingLocale } from '../src/progress-ring/locale'
import { scrollViewLocale } from '../src/scrollview/locale'

/**
 * @fluere-vue/ui/locales/zh-Hans —— 简体中文内置文案聚合（todo §1.4 子路径导出）。
 *
 * 把各组件目录的 locale 切片（`*.ts`）按 scope 归成一个 bundle，消费方可整包传入：
 * ```ts
 * import zhHans from '@fluere-vue/ui/locales/zh-Hans'
 * <FluereConfigProvider :messages="{ 'zh-Hans': zhHans }">…</FluereConfigProvider>
 * ```
 * scope 名与组件内 `useScopeMessages(scope, …)` 一致（`input` / `infobar` /
 * `number-box` / `progress-bar` / `progress-ring` / `scroll-view`）。
 */
export const zhHans: LocaleOverrideMessages = {
  'input': inputLocale.zhHans,
  'infobar': infoBarLocale.zhHans,
  'number-box': numberBoxLocale.zhHans,
  'progress-bar': progressBarLocale.zhHans,
  'progress-ring': progressRingLocale.zhHans,
  'scroll-view': scrollViewLocale.zhHans,
}

export default zhHans
