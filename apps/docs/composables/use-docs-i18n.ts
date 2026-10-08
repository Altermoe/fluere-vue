/**
 * 类型友好的 useI18n 包装：把 `MessageSchema`（zh-Hans 主语言 JSON 的类型视图）
 * 与一期语种联合传进 vue-i18n 的泛型，让 `t()` 在 IDE 里补全 key、写错 key
 * 在 vue-tsc 下编译报错（而不是静默返回原文案）。
 *
 * 组件的句法统一用 `const { t, tm, locale } = useDocsI18n()`，不要在组件里裸写
 * `useI18n<{...}>()` —— 语种 / schema 变更只需改这里一处。
 *
 * - `t(key)`：取字符串文案（含插值）；
 * - `tm(key)`：取消息对象（如 home.features.* 这种结构化卡片，可安全返回对象类型，
 *   不会被收窄成 string）。
 *
 * 参考 vue-i18n 类型签名（composition + global scope）：
 *   useI18n<Schema, Locales>().其中 Composer 的 `t` / `tm` 依 schema 补全 key。
 */
import { useI18n } from 'vue-i18n'
import type { MessageSchema, AppLocale } from '~/i18n/schema'

export const useDocsI18n = () => useI18n<{ message: MessageSchema }, AppLocale>()
