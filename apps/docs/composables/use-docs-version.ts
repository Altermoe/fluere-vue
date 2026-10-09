/**
 * 页面展示用的版本号（已剥掉 `v` 前缀，模板自己拼一个 `v`）。
 *
 * 为什么不直接读 `runtimeConfig.public.docsVersion`：CI 里 `NUXT_PUBLIC_DOCS_VERSION=v0.0.1`
 * 会在运行时**原样覆盖** config 算出的值（前缀还在），本地回退根版本时又不带前缀；
 * 两种来源都要归一，且只在这一处归一，见 utils/docs-version.ts。
 */
import { normalizeDocsVersion } from '../utils/docs-version'

export function useDocsVersion() {
  return computed(() => normalizeDocsVersion(useRuntimeConfig().public.docsVersion))
}
