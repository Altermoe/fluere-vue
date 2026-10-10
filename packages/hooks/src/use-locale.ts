import { normalizeLocale, resolveFallbackChain, type FluereLocale } from '@fluere-vue/utils'
/**
 * 组件库 i18n 的组合式层（基于 Vue provide/inject，复用 `@intlify/core-base`）。
 *
 * 职责 / 分工（对齐 docs/todo.md 目标 1 · 1.4）：
 *  - 纯函数层（locale 规整、回退链）在 `@fluere-vue/utils`；这里持有 **实例级**
 *    locale 上下文（provide/inject），**禁止全局可变单例** —— 否则 SSR 多请求
 *    之间会串语言。
 *  - 消息编译 / 解析 / 回退（`zh-Hans → zh → en`）复用 `@intlify/core-base`
 *    （vue-i18n 的底层、**非运行时**依赖）：`createCoreContext` + `translate`。
 *    不引入 `vue-i18n` 运行时。
 *  - 每组件一个消息 slice（组件目录内自 import，天然 tree-shakable）：
 *    `useScopeMessages(scope, slice, overrideLocale)` 在组件内就地构造 scope
 *    级 core context；Provider 只负责提供由 `FluereConfigProvider` 注入的
 *    `locale` 与可选 `messages` 覆盖，**不必知道组件共有哪些 scope**。
 *
 * 解析优先级：显式文案 prop（如 `revealButtonLabel`，组件层处理）
 *   → 组件 `locale` prop → Provider `locale` → 内置缺省 zh-Hans；
 *  Provider `messages` 按 locale × scope 深合并进组件内置 slice。
 *
 * 响应式：`t` 在渲染期读取「resolved locale / provider messages」两个响应式源，
 *  Provider 切 locale 时上下文 computed 重算、模板随之更新；SSR 与客户端同路径
 *  （core context 创建纯函数、不碰 window/document）。
 *
 * 缺省不炸：无 `FluereConfigProvider` 时 `useLocale` 注入静态默认上下文
 *  （locale=zh-Hans、无 messages），组件单用即可用。
 */
import {
  compile,
  createCoreContext,
  registerMessageCompiler,
  resolveValue,
  translate,
  type CoreContext,
} from '@intlify/core-base'
import {
  computed,
  inject,
  provide,
  readonly,
  shallowRef,
  toValue,
  watch,
  type InjectionKey,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue'

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

/** 某个组件 scope 内、按 locale 归组的两侧内置文案。 */
export interface ComponentLocaleSlice {
  /** 简体中文内置文案（内置缺省语种）。 */
  zhHans: Readonly<Record<string, string>>
  /** 英文内置文案（回退链的终值兜底）。 */
  en: Readonly<Record<string, string>>
}

/** Provider 的 messages 覆盖：locale → scope → key → 串。 */
export type LocaleOverrideMessages = Record<string, Record<string, string>>
export type ProviderMessages = Partial<Record<FluereLocale, Readonly<LocaleOverrideMessages>>>

/** 注入给后代的实例级 locale 上下文。 */
export interface LocaleContext {
  /** 当前已归一 locale（无 Provider 时为内置缺省 zh-Hans）。 */
  readonly locale: Readonly<Ref<FluereLocale>>
  /** Provider 提供的按 locale × scope 的消息覆盖（可为空）。 */
  readonly messages: Readonly<Ref<ProviderMessages | undefined>>
  /** 命令式切换 locale（Provider 之外的管理方式）。 */
  readonly setLocale: (locale: FluereLocale | string) => void
}

/** `useScopeMessages` 的返回：组件即插即用的解析句柄。 */
export interface ScopeMessages {
  /** 实际生效的归一 locale（用于 data-locale 等属性）。 */
  readonly locale: Readonly<Ref<FluereLocale>>
  /**
   * 按 scope 内 key 取出当前文案；可选命名插值参数（一期文案多为纯串）。
   * 渲染期调用会跟踪 locale / messages 依赖 ⇒ Provider 切 locale 时即时更新。
   */
  readonly t: (path: string, params?: Record<string, string | number>) => string
}

/* ------------------------------------------------------------------ */
/* 为 `@intlify/core-base` 注册缺省能力（纯函数、无实例状态）           */
/* ------------------------------------------------------------------ */

/**
 * 组件库用的 `core-base.mjs` 是**精简构建**：它默认不内置消息编译器，也不内置
 * 支持点路径的深解析器（默认 messageResolver 只是 `obj[path]` 括号取值）。
 * 这里在模块加载时做两次幂等的**纯函数注册**：
 *
 *  1. `registerMessageCompiler(compile)`：把 intlify 消息编译器挂上（与
 *     vue-i18n 自身的做法一致）。注册的是无状态纯函数，不携带任何按请求的
 *     locale / messages 数据 —— 不是「全局可变 locale 单例」，SSR 并发安全。
 *  2. 每次 `createCoreContext` 显式传 `messageResolver: resolveValue`：让
 *     `input.showPassword` 这类点路径能深解析到嵌套消息（默认只做括号取值）。
 *
 *  好处：不需要每 context 传自定义 `messageCompiler`（避免它每次抛
 *  「Custom Message Compiler is experimental」的告警），且内置文案仍是普通串。
 */
registerMessageCompiler(compile)

/** 缺 key 只在开发环境告警（生产静默回退，不刷屏）。 */
const isDev = (): boolean => {
  // 经 globalThis 取 NODE_ENV：浏览器端 process 不存在 → 视为开发环境；
  // 不直接引用 `process` 全局，避免浏览器库类型检查被迫依赖 @types/node。
  const nodeEnv = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env
    ?.NODE_ENV
  return nodeEnv === undefined || nodeEnv !== 'production'
}

/* ------------------------------------------------------------------ */
/* Provider / 注入                                                     */
/* ------------------------------------------------------------------ */

const LOCALE_CONTEXT_KEY: InjectionKey<LocaleContext> = Symbol.for('fluere-vue.locale')

/** 无 Provider 时的静态默认上下文（只读，恒 zh-Hans，不串状态）。 */
const DEFAULT_LOCALE_REF = shallowRef<FluereLocale>('zh-Hans')
const DEFAULT_MESSAGES_REF = shallowRef<ProviderMessages | undefined>(undefined)
const DEFAULT_CONTEXT: LocaleContext = Object.freeze({
  locale: readonly(DEFAULT_LOCALE_REF),
  messages: readonly(DEFAULT_MESSAGES_REF),
  setLocale: () => {},
})

export interface ProvideLocaleOptions {
  /**
   * Provider 当前 locale（可响应式传入）。归一化由本函数完成；
   * `undefined` / 空视为「用内置缺省 zh-Hans」。
   */
  locale?: MaybeRefOrGetter<FluereLocale | string | undefined>
  /**
   * 按 locale × scope 的消息覆盖，覆盖组件内置 slice（仅该 scope 生效）。
   */
  messages?: MaybeRefOrGetter<ProviderMessages | undefined>
}

/**
 * 在当前 Vue 组件实例建立 locale 上下文并 `provide` 给后代。
 *
 * 每个调用各自持有独立 ref（实例级）；跟随 provider prop 变化同步。
 * 由 `FluereConfigProvider` 调用；应用侧也可直接调用以省略 Provider 壳。
 */
export function provideLocale(options: ProvideLocaleOptions = {}): LocaleContext {
  const locale = shallowRef<FluereLocale>(normalizeLocale(toValue(options.locale)))
  const messages = shallowRef<ProviderMessages | undefined>(toValue(options.messages))

  watch(
    () => toValue(options.locale),
    (value) => {
      locale.value = normalizeLocale(value)
    },
  )
  watch(
    () => toValue(options.messages),
    (value) => {
      messages.value = value
    },
    { deep: true },
  )

  const setLocale = (value: FluereLocale | string): void => {
    locale.value = normalizeLocale(value)
  }

  const ctx: LocaleContext = {
    locale: readonly(locale),
    messages: readonly(messages),
    setLocale,
  }
  provide(LOCALE_CONTEXT_KEY, ctx)
  return ctx
}

/** 读取祖先 locale 上下文；无 Provider 时返回内置缺省（不抛错）。 */
export function useLocale(): LocaleContext {
  return inject(LOCALE_CONTEXT_KEY, DEFAULT_CONTEXT)
}

/* ------------------------------------------------------------------ */
/* Scope 级文案解析                                                    */
/* ------------------------------------------------------------------ */

/** `buildScopeContext` 的入参（聚成对象以满足最大参数个数约束）。 */
interface BuildScopeContextInput {
  scope: string
  slice: ComponentLocaleSlice
  resolvedLocale: FluereLocale
  providerMessages: ProviderMessages | undefined
}

/** 构造 scope 级的 core context（locale / 回退 / 消息 / 编译器）。 */
function buildScopeContext({
  scope,
  slice,
  resolvedLocale,
  providerMessages,
}: BuildScopeContextInput): CoreContext {
  // zh-Hans 与 zh 别名镜像同内容；en 为终值兜底。Provider 覆盖按 locale×scope 并入。
  const zh = providerMessages?.['zh-Hans']?.[scope]
  const en = providerMessages?.['en']?.[scope]
  // 每 locale 下就是该 scope 扁平 key → 串（slice 已在 scope 内）；Provider 覆盖并入。
  // messages 用宽松 Record 类型，避免 core-base 把 Locales 收窄成枚举后拒绝 string 兜底。
  const messages: Record<string, Record<string, string>> = {
    'zh-Hans': { ...slice.zhHans, ...zh },
    'zh': { ...slice.zhHans, ...zh },
    'en': { ...slice.en, ...en },
  }
  return createCoreContext({
    // 显式放宽 locale 到 string：core-base 会把 locale / messages / fallbackLocale
    // 的 Locales 收窄成同一枚举，而我们带有 `zh` 别名键与 string 兜底，用 `as string`
    // 跳出该枚举收紧（运行期回退链仍由 fallbackLocale 驱动）。
    locale: resolvedLocale as string,
    // core-base 的 fallbackLocale 只需**备用** locale（主 locale 由 locale 字段负责）；
    // 复用 utils 的链并去掉主 locale 自身。
    fallbackLocale: resolveFallbackChain(resolvedLocale).filter((l) => l !== resolvedLocale),
    // messages 覆盖含 `zh` 别名键（详见底部 outer `as any` 收敛说明）
    messages,
    // 点路径深解析（见文件顶部注册说明）；缺省括号取值解析不了嵌套消息
    messageResolver: resolveValue,
    missingWarn: isDev(),
    fallbackWarn: isDev(),
    onMissing: (_ctx: CoreContext, locale: string, key: string) => {
      // 只在开发环境告警（todo §1.4：缺 key 落到 en 并只在开发环境告警）
      if (isDev()) {
        // oxlint-disable-next-line no-console -- 开发环境缺 key 提示
        console.warn(
          `[fluere-vue] 组件 ${scope} 缺少 locale "${locale}" 的文案 key "${key}"，已回退。`,
        )
      }
    },
    // core-base 的 createCoreContext 泛型会把 locale / fallbackLocale / messages 的
    // `Locales` 收窄成同一枚举（要求三者严格一致）。我们的设计含 `zh` 别名键与 string
    // 兜底，刻意跳出该收紧（运行期回退链由 messageResolver + fallbackLocale 驱动，
    // 不受类型影响）。这里对整个 options 做一次 `any` 收敛，避免 20+ 处泛型冲突。
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any -- 见上：core-base 收紧过强，行内收敛
  } as any)
}

/**
 * 在组件内按 scope 解析内置文案 + Provider 覆盖 + locale 优先级。
 *
 * @param scope           组件 scope 名（如 `input` / `number-box`、Provider
 *                        覆盖时用它定位 `messages[locale][scope]`）。
 * @param slice           组件自 import 的内置切片（`{ zhHans, en }`）。
 * @param overrideLocale  组件自身的 `locale` prop（可为空 —— 空则跟随 Provider）。
 * @returns { locale, t } `t` 渲染期调用即响应式跟随 Provider 切语言。
 */
export function useScopeMessages(
  scope: string,
  slice: ComponentLocaleSlice,
  overrideLocale?: MaybeRefOrGetter<FluereLocale | string | undefined>,
): ScopeMessages {
  const ctx = useLocale()

  const resolvedLocale = computed<FluereLocale>(() => {
    const raw = toValue(overrideLocale)
    // 未显式给 locale prop 时跟随 Provider；空/缺省才回落到内置 zh-Hans
    if (raw === undefined || raw === null || raw === '') {
      return ctx.locale.value
    }
    return normalizeLocale(raw)
  })

  const context = computed(() =>
    buildScopeContext({
      scope,
      slice,
      resolvedLocale: resolvedLocale.value,
      providerMessages: ctx.messages.value,
    }),
  )

  const t = (path: string, params?: Record<string, string | number>): string => {
    // slice 已按 scope 切片，key 就是 scope 内的路径，无需再拼 scope 前缀
    const result =
      params === undefined ? translate(context.value, path) : translate(context.value, path, params)
    return typeof result === 'string' ? result : String(result)
  }

  return { locale: readonly(resolvedLocale), t }
}
