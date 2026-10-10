/* oxlint-disable no-magic-numbers -- 断言里的数字就是被测输入、层数与 token 档位，抽成常量反而更难读 */
/**
 * 生成脚本的取值合成契约（`generated/tokens.css` 的回归防线）。
 *
 * 历史 bug：所有「明暗不同」的 token 一律写成 `light-dark(light, dark)`，而阴影是
 * 逗号分隔的多层值（`0 0 2px A, 0 8px 16px B`）→ 产出 4 个实参的非法 `light-dark()`，
 * 浏览器丢掉整条 `box-shadow`，`--shadow2..64` 全部失效。
 *
 * 这里既测纯函数（theme-value.mjs），也用真实 token 数据（data/fluent-tokens.json）
 * 全量扫一遍，保证任何人改数据、改脚本都不会再把非法 light-dark() 带进产物。
 */
import { describe, expect, it } from 'vitest'
import tokensData from '../data/fluent-tokens.json'
import { mergeThemedValue, splitTopLevel } from './theme-value.mjs'

interface ThemedToken {
  light: string
  dark: string
}

const tokens = tokensData.tokens as unknown as Record<string, ThemedToken>
const themedTokens = Object.entries(tokens).filter(
  ([, value]) => String(value.light) !== String(value.dark),
)

/** 取出所有 `light-dark(...)` 的括号内文本 */
const readLightDarkBodies = (css: string): string[] => {
  const marker = 'light-dark('
  const bodies: string[] = []
  let index = css.indexOf(marker)
  while (index !== -1) {
    let depth = 1
    let cursor = index + marker.length
    while (cursor < css.length && depth > 0) {
      const char = css[cursor]
      if (char === '(') {
        depth += 1
      } else if (char === ')') {
        depth -= 1
      }
      cursor += 1
    }
    bodies.push(css.slice(index + marker.length, cursor - 1))
    index = css.indexOf(marker, cursor)
  }
  return bodies
}

const SHADOW_SCALE = [2, 4, 8, 16, 28, 64]
/** 中性阴影的几何：0–16 档 2px 模糊，28 / 64 档 8px 模糊 */
const LARGE_SHADOW_MIN_STEP = 28

describe('splitTopLevel', () => {
  it('只按顶层逗号切分，括号内的逗号不切', () => {
    expect(splitTopLevel('0 0 2px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.14)')).toEqual([
      '0 0 2px rgba(0,0,0,0.12)',
      '0 1px 2px rgba(0,0,0,0.14)',
    ])
    expect(splitTopLevel('rgba(0,0,0,0.12)')).toEqual(['rgba(0,0,0,0.12)'])
    expect(splitTopLevel('cubic-bezier(0.33,0,0.67,1)')).toEqual(['cubic-bezier(0.33,0,0.67,1)'])
  })
})

describe('mergeThemedValue', () => {
  it('单值颜色 → 直接交给 light-dark()', () => {
    expect(mergeThemedValue('colorNeutralBackground1', '#ffffff', '#292929')).toBe(
      'light-dark(#ffffff, #292929)',
    )
    expect(
      mergeThemedValue('colorNeutralStrokeAlpha', 'rgba(0,0,0,0.05)', 'rgba(255,255,255,0.1)'),
    ).toBe('light-dark(rgba(0,0,0,0.05), rgba(255,255,255,0.1))')
  })

  it('多值阴影 → 逐层把颜色包成 light-dark()，几何保持字面量', () => {
    expect(
      mergeThemedValue(
        'shadow16',
        '0 0 2px rgba(0,0,0,0.12), 0 8px 16px rgba(0,0,0,0.14)',
        '0 0 2px rgba(0,0,0,0.24), 0 8px 16px rgba(0,0,0,0.28)',
      ),
    ).toBe(
      '0 0 2px light-dark(rgba(0,0,0,0.12), rgba(0,0,0,0.24)), ' +
        '0 8px 16px light-dark(rgba(0,0,0,0.14), rgba(0,0,0,0.28))',
    )
  })

  it('无法表达的结构直接抛错（宁可失败也不产出会被丢弃的 CSS）', () => {
    // 层数不一致
    expect(() =>
      mergeThemedValue('shadowX', '0 0 2px #000', '0 0 2px #000, 0 1px 2px #000'),
    ).toThrow(/层数不一致/)

    // 几何不同（light-dark() 包不住几何）
    expect(() =>
      mergeThemedValue('shadowX', '0 0 2px #000, 0 2px 4px #000', '0 1px 2px #111, 0 2px 4px #111'),
    ).toThrow(/相同几何/)

    // 单值既不是颜色、也不是「几何 + 颜色」（如字体族）
    expect(() => mergeThemedValue('fontFamilyBase', 'Segoe UI', 'Consolas')).toThrow(
      /相同几何 \+ 颜色/,
    )
  })

  it('单层阴影也能合成（几何 + 颜色的最小形态）', () => {
    expect(mergeThemedValue('shadowX', '0 0 2px #000', '0 0 2px #111')).toBe(
      '0 0 2px light-dark(#000, #111)',
    )
  })
})

describe('token 数据 → CSS 声明契约', () => {
  it('每个明暗不同的 token 都能合成合法声明，且 light-dark() 恒为两个实参', () => {
    expect(themedTokens.length).toBeGreaterThan(0)
    for (const [name, value] of themedTokens) {
      const merged = mergeThemedValue(name, value.light, value.dark)
      expect(merged).not.toBe('')
      for (const body of readLightDarkBodies(merged)) {
        expect(splitTopLevel(body)).toHaveLength(2)
      }
    }
  })

  it('中性阴影 6 档：两层阴影，每层颜色随明暗切换', () => {
    for (const step of SHADOW_SCALE) {
      const value = tokens[`shadow${step}`]!
      expect(value, `shadow${step} 应存在`).toBeDefined()
      const merged = mergeThemedValue(`shadow${step}`, value.light, value.dark)
      expect(readLightDarkBodies(merged)).toHaveLength(2)
      expect(merged).toContain(step < LARGE_SHADOW_MIN_STEP ? '0 0 2px' : '0 0 8px')
    }
  })

  it('品牌阴影 6 档：明暗同值，保持字面量（不需要 light-dark()）', () => {
    for (const step of SHADOW_SCALE) {
      const value = tokens[`shadow${step}Brand`]!
      expect(value, `shadow${step}Brand 应存在`).toBeDefined()
      expect(String(value.light)).toBe(String(value.dark))
      expect(value.light).not.toContain('light-dark(')
      expect(splitTopLevel(value.light)).toHaveLength(2)
    }
  })
})
