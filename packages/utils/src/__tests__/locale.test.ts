import { describe, expect, it } from 'vitest'
import { normalizeLocale, resolveFallbackChain } from '../locale'

describe('normalizeLocale', () => {
  it('把显式 locale 归一为内置枚举', () => {
    expect(normalizeLocale('zh-Hans')).toBe('zh-Hans')
    expect(normalizeLocale('en')).toBe('en')
  })

  it('把简体中文地区 / 别名收敛到 zh-Hans', () => {
    expect(normalizeLocale('zh-CN')).toBe('zh-Hans')
    expect(normalizeLocale('zh-cn')).toBe('zh-Hans')
    expect(normalizeLocale('zh')).toBe('zh-Hans')
    expect(normalizeLocale('zh_SG')).toBe('zh-Hans')
    expect(normalizeLocale('ZH-Hans')).toBe('zh-Hans')
  })

  it('把英文地区归一为 en（一期不细分美式 / 英式）', () => {
    expect(normalizeLocale('en-US')).toBe('en')
    expect(normalizeLocale('en-GB')).toBe('en')
    expect(normalizeLocale('EN')).toBe('en')
  })

  it('未命中或空输入回落到 zh-Hans，不放错', () => {
    expect(normalizeLocale('fr')).toBe('zh-Hans')
    expect(normalizeLocale('')).toBe('zh-Hans')
    expect(normalizeLocale('   ')).toBe('zh-Hans')
    expect(normalizeLocale(undefined)).toBe('zh-Hans')
    expect(normalizeLocale(null)).toBe('zh-Hans')
  })
})

describe('resolveFallbackChain', () => {
  it('zh-Hans 回退链含别名与英文兜底（缺 key 落英文）', () => {
    expect(resolveFallbackChain('zh-Hans')).toEqual(['zh-Hans', 'zh', 'en'])
  })

  it('en 为终值兜底，不混入中文', () => {
    expect(resolveFallbackChain('en')).toEqual(['en'])
  })
})
