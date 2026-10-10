/**
 * 组件库 i18n 的纯函数层（框架无关、SSR 安全、零依赖）。
 *
 * 职责：
 *  - 把消费方可能传入的任意 locale 字符串归一成内置枚举 `FluereLocale`；
 *  - 给出某个 locale 的回退链（todo §1.4：`zh-Hans → zh → en`）。
 *
 * 这里刻意**不**做消息解析 / 插值 —— 属 `packages/hooks` 的 `use-locale`
 * （复用 `@intlify/core-base`）；本文件保持零依赖，任何运行环境可安全 import。
 *
 * 约定：
 *  - `zh-Hans` 是内置缺省 locale（与文档站默认语种一致），并兼容
 *    `zh-CN` / `zh` 别名（映射到 `zh-Hans`）与大小写 / 连接符变体；
 *  - 未知 / 空输入一律回落到 `zh-Hans`，**永不放错**，保证 Provider 传
 *    任意值都不会让库抛异常（对齐「注入旗标做缺省」约定）。
 */

/** 组件库一期支持的 locale（简体中文 + 英语）。 */
export type FluereLocale = 'zh-Hans' | 'en'

/** locale 别名 → 内置枚举（键大小写不敏感，`-` / `_` 归一） */
const LOCALE_ALIASES: Record<string, FluereLocale> = {
  'zh-hans': 'zh-Hans',
  'zh-cn': 'zh-Hans',
  'zh-sg': 'zh-Hans', // 简体中文常用地区，归一为 zh-Hans（与 zh-CN 同呈现）
  'zh': 'zh-Hans',
  'zh_hans': 'zh-Hans',
  'zh_cn': 'zh-Hans',
  'en': 'en',
  'en-us': 'en',
  'en-gb': 'en', // 一期不区分英式 / 美式，统一 en
  'en_us': 'en',
}

/**
 * 把任意 locale 输入归一成 `FluereLocale`。
 *
 * 归一规则：转小写 + 把 `_` 归一成 `-`，再查别名表；命中即返回对应枚举，
 * 未命中 / 空输入回落到缺省 `zh-Hans`（不抛错）。Provider 与组件 `locale`
 * prop 都应先经过这里再进入回退链解析。
 */
export function normalizeLocale(input?: string | null): FluereLocale {
  if (typeof input !== 'string') {
    return 'zh-Hans'
  }
  const key = input.trim().toLowerCase().replaceAll('_', '-')
  return LOCALE_ALIASES[key] ?? 'zh-Hans'
}

/**
 * 给定一个已归一 locale 的回退链（消息 locale **键名**序列，最长匹配在先）。
 *
 * - `zh-Hans` → `['zh-Hans', 'zh', 'en']`：中文先查简体主包，再查 `zh`
 *   别名包，最后落到通用的英文兜底（缺 key 时英文出文案并在开发环境告警）。
 * - `en`      → `['en']`：英文即终值兜底（避免英文界面静默混入中文）。
 *
 * 一期组件消息只内置 `zh-Hans` 与 `en` 两侧；`zh` 作为 `zh-Hans` 的别名镜像
 * 保留在链上，是为了让「缺 key → 落英文并告警」的语义可被 `@intlify/core-base`
 * 的 fallbackLocale 如实执行，也便于消费方日后按 `zh` 别名单独覆盖。
 */
export function resolveFallbackChain(locale: FluereLocale): string[] {
  return locale === 'en' ? ['en'] : ['zh-Hans', 'zh', 'en']
}
