/**
 * vue-i18n「预编译消息（message AST）」工具。
 *
 * ## 为什么需要这一层：客户端语言文件不是原始 JSON，而是预编译 AST
 *
 * @nuxtjs/i18n v10 默认开启 `experimental.optimizeMessageBundling`，客户端包里的语言
 * 文件会经 `@intlify/unplugin-vue-i18n` 预编译成 **message AST**。实测（docs dev server）：
 *
 *   GET /_nuxt/i18n/locales/zh-Hans.json?import
 *   → const resource = { "nav": { "docs": {"type":0,"start":0,"end":4,"loc":{…},
 *       "body":{"type":2,…,"items":[{"type":3,…}],"static":"Docs"}}, … } }
 *
 * 而 SSR 侧（Nitro / Node 渲染）读到的仍是**原始 JSON 字符串**。两端形态不一致带来两个后果：
 *
 *  1. `t(key)` 两者都能用 —— vue-i18n 的 `t()` 内部对 AST 走 JIT 解析，字符串走编译，结果都是
 *     字符串；`tm(key)` 则是**原样返回**（官方文档：预编译消息要用 `rt()` 解析），结构化消息里的
 *     叶子在客户端是 AST 节点，直接插值会被 Vue 渲染成 JSON 文本。
 *  2. 于是「SSR 渲染字符串、客户端渲染 JSON」→ 水合失配。实测（修复前，Playwright 采集
 *     控制台）：首页 `/` 与 `/en` **各 19 条水合告警**（18 处 `[Vue warn]: Hydration text
 *     mismatch` + 1 条 `Hydration completed but contains mismatches.`），且这 18 个叶子
 *     在 DOM 里被补丁成 18 段 AST JSON；运行时切换语言（语言一变就重算这些卡片）同样命中。
 *
 * 所以：**结构化消息必须逐叶子经 `rt()` 解析为字符串**，本模块负责「识别 AST 叶子 + 递归解析」。
 * 调用方见 `~/composables/use-docs-i18n`（它把解析后的 `tm` 作为对外契约，杜绝裸用）。
 *
 * AST 判据与 vue-i18n 内部 `isMessageAST` 完全一致（`type === 0` 且带 `body` / `b`）；
 * 该函数未从 vue-i18n 公共入口导出，故按其判据等价实现，避免依赖内部路径。
 */

/** 单个 AST 节点的最小结构（只声明我们判据要用到的字段）。 */
interface MessageASTNode {
  type?: unknown
  body?: unknown
  b?: unknown
}

/**
 * 是否为 vue-i18n 的预编译消息 AST 根节点。
 *
 * 注意判据必须同时看 `type` 与 `body`：`type` 单独出现不足以判定，
 * 否则会把恰好带 `type` 字段的普通消息对象误判成 AST。
 */
export function isMessageAST(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const node = value as MessageASTNode
  return node.type === 0 && ('body' in node || 'b' in node)
}

/** 叶子解析器：把 AST 节点（或本来就已是字符串的消息）还原为最终字符串。 */
export type MessageLeafResolver = (message: unknown) => string

/**
 * 递归解析结构化消息：容器（对象 / 数组）形状与键序保持不变，叶子交给 `resolveLeaf`。
 *
 * - 客户端：叶子是 AST 节点 → 由 `resolveLeaf`（=`rt()`）解析为字符串；
 * - SSR：叶子本来就是字符串 → `rt()` 对字符串是恒等变换（`resolvedMessage` 语义）。
 *
 * 返回类型与入参同形（JSON 消息的叶子声明为字符串，解析后正好兑现该类型）。
 */
export function resolveMessageTree<T>(value: T, resolveLeaf: MessageLeafResolver): T {
  if (Array.isArray(value)) {
    return value.map((item) => resolveMessageTree(item, resolveLeaf)) as T
  }
  if (isMessageAST(value)) {
    return resolveLeaf(value) as T
  }
  if (typeof value === 'object' && value !== null) {
    const resolved: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value)) {
      resolved[key] = resolveMessageTree(item, resolveLeaf)
    }
    return resolved as T
  }
  return value
}
