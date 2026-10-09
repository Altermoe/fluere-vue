/**
 * `normalizeDocsVersion` 契约测试。
 *
 * 用例取自两条真实来源（值与产物内联的 `docsVersion` 一致）：
 * - CI 发布 tag 注入 `NUXT_PUBLIC_DOCS_VERSION=v0.0.1` → runtimeConfig 里是带 `v` 的原始值；
 * - 本地 / 分支构建回退根 `package.json` 的 `0.0.1` → 不带前缀。
 *
 * 模板统一写 `v{{ 规范化后的值 }}`，因此两条来源都必须只渲染出一个 `v`。
 */
import { describe, expect, it } from 'vitest'
import { normalizeDocsVersion } from '../docs-version'

describe('normalizeDocsVersion', () => {
  it('CI 注入值：剥掉一个 v 前缀', () => {
    expect(normalizeDocsVersion('v0.0.1')).toBe('0.0.1')
  })

  it('本地回退值：无前缀时保持原样', () => {
    expect(normalizeDocsVersion('0.0.1')).toBe('0.0.1')
  })

  it('前缀被写多遍时全部剥掉（防回归 vv0.0.1）', () => {
    expect(normalizeDocsVersion('vv0.0.1')).toBe('0.0.1')
    expect(normalizeDocsVersion('V0.1.0')).toBe('0.1.0')
  })

  it('空值给空串，不会渲染出裸 v', () => {
    expect(normalizeDocsVersion(undefined)).toBe('')
    expect(normalizeDocsVersion(null)).toBe('')
    expect(normalizeDocsVersion('')).toBe('')
    expect(normalizeDocsVersion('  v1.2.3 ')).toBe('1.2.3')
  })
})
