/**
 * 版本号展示规范化：剥掉开头的 `v` / `V` 前缀（可能被写多遍）。
 *
 * 版本号事实源是仓库根 `package.json`（形如 `0.0.1`）；CI 发布 tag 时把它作为
 * `NUXT_PUBLIC_DOCS_VERSION`（形如 `v0.0.1`）注入。两种来源前缀不一致，而页面模板统一写成
 * `v{{ 版本号 }}`，所以消费点必须把前缀剥干净 —— 历史 bug：徽标曾渲染成 `vv0.0.1`。
 *
 * 为什么不放在 `nuxt.config` 里：`runtimeConfig` 的 `NUXT_PUBLIC_*` 环境变量覆盖发生在
 * config 计算**之后**（实测产物里内联的 `docsVersion` 仍是带 `v` 的原始值），config 里的
 * `.replace()` 会被静默绕过。规范化只能放在消费点，且只放这一处。
 */
export function normalizeDocsVersion(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/^[vV]+/, '')
}
