import type { ComponentLocaleSlice } from '@fluere-vue/hooks'

/**
 * SplitButton 的 locale 切片（scope `split-button`）。
 *
 * 文案**逐字取自上游资源**（不是本库自译）：
 *   `src/controls/dev/SplitButton/Strings/en-us/Resources.resw`
 *   `src/controls/dev/SplitButton/Strings/zh-CN/Resources.resw`
 * （tag `winui3/release/2.5.1`，commit `ba3a8d5`）。
 *
 * | key | 上游资源名 | en-us | zh-CN |
 * | --- | --- | --- | --- |
 * | `moreOptions` | `SplitButtonSecondaryButtonName` | `More Options` | `更多选项` |
 *
 * 上游 resw 里只有这一条文案（comment：`Automation name for the secondary button.`）；
 * `ToggleSplitButton` 复用同一模板与同一箭头区，因此**不**再单独建切片。
 *
 * 内置缺省语种 zh-Hans；缺 key 回退 `zh-Hans → zh → en`。
 */
export const splitButtonLocale: ComponentLocaleSlice = {
  zhHans: {
    moreOptions: '更多选项',
  },
  en: {
    moreOptions: 'More Options',
  },
}
