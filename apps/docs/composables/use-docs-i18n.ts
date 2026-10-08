/**
 * 类型友好的 useI18n 包装：把 `MessageSchema`（zh-Hans 主语言 JSON 的类型视图）
 * 与一期语种联合传进 vue-i18n 的泛型，让 `t()` / `tm()` 在 IDE 里按 schema 补全 key。
 *
 * 注意：vue-i18n 的 `t()` / `tm()` 参数类型接受任意字符串（要支持运行期拼 key），
 * 写错 key 并不会在 vue-tsc 下报错（实测），补全只是 IDE 辅助。
 *
 * 组件的句法统一用 `const { t, tm, locale } = useDocsI18n()`，不要在组件里裸写
 * `useI18n<{...}>()` —— 语种 / schema 变更只需改这里一处。
 *
 * - `t(key)`：取字符串文案（含插值）；
 * - `tm(key)`：取结构化消息（如 home.features.* 这种卡片），**叶子已解析为字符串**
 *   （形状不变、键序不变），可安全插值。
 *
 * ## 为什么这里的 `tm` 要和 vue-i18n 的不一样
 *
 * vue-i18n 的 `tm()` 返回**原始消息**：客户端语言文件被预编译成 message AST，
 * 于是结构化消息的叶子是 AST 节点 —— 直接插值会渲染成 `{"type":0,…}` 的 JSON，
 * 而 SSR 侧（原始 JSON 字符串）渲染的是正常文案，两端不一致即水合失配。
 * 官方对预编译消息给出的解法是用 `rt()` 解析；本 composable 把这一步内聚进来，
 * 所以对调用方而言 `tm()` 始终给字符串（判据、实测证据与递归实现见
 * `~/utils/i18n-message`）。**不要在文档站里绕过本 composable 裸用 `useI18n().tm()`。**
 *
 * 参考 vue-i18n 类型签名（composition + global scope）：
 *   useI18n<Schema, Locales>().其中 Composer 的 `t` / `tm` 依 schema 补全 key。
 */
import { useI18n } from 'vue-i18n'
import type { MessageSchema, AppLocale } from '~/i18n/schema'
import { resolveMessageTree } from '~/utils/i18n-message'

export const useDocsI18n = () => {
  const i18n = useI18n<{ message: MessageSchema }, AppLocale>()

  /**
   * 结构化消息读取器：`tm`（取原始消息树）+ 逐叶子 `rt`（解析 AST / 字符串）。
   *
   * 类型直接沿用 composer 的 `tm` 签名（key 补全不变、返回结构不变）：composer 声明的
   * 叶子就是字符串，本实现正是把运行期的两种形态（客户端 AST / SSR 字符串）都还原成
   * 该声明，故按同一签名标注；自行推导反而会把返回收窄成 key 联合，模板里
   * `feature.title` 这类访问会报错。
   */
  const tm: typeof i18n.tm = (key: Parameters<typeof i18n.tm>[0]) =>
    resolveMessageTree(i18n.tm(key), (message) => i18n.rt(message as Parameters<typeof i18n.rt>[0]))

  return { ...i18n, tm }
}
