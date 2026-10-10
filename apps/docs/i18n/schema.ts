/**
 * 文档站 message 类型化 schema（类型友好 + IDE 感知的核心）。
 *
 * 约定：zh-Hans 是主语言（master schema），en 是同构回退。这里以 zh-Hans 的
 * 运行时 JSON 作为 `MessageSchema` 的事实源：Editor 与 vue-tsc 都能从
 * `t('...')` 的字符串参数反推出可补全的 key 集合；key 写错或缺失时类型报错。
 *
 * 用法：
 * ```ts
 * import type { MessageSchema } from '~/i18n/schema'
 * const { t } = useI18n<{ message: MessageSchema }, 'zh-Hans' | 'en'>()
 * // t('nav.components') 有补全；t('nav.不存在') 编译报错
 * ```
 *
 * `as const` 保持字面量结构，供 `MessageSchema` 递归出每一层的 key 联合。
 * JSON 可被 itty 直接 import，无需额外 resolveJsonModule 开关
 * （本仓 tsconfig.base.json 已开）。
 */
import type zhHans from './locales/zh-Hans.json'

/** 由 zh-Hans 主语言推导出的完整 message 结构（运行时 JSON 的类型视图）。 */
export type MessageSchema = typeof zhHans

/** 文档站一期支持的语种（与 nuxt.config i18n.locales 对齐）。 */
export type AppLocale = 'zh-Hans' | 'en'
