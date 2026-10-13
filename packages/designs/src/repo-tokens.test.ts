/**
 * 仓库自有令牌（data/repo-tokens.json）的契约测试（0.4.2 / 0.4.4）。
 *
 * 这支事实源补的是 Fluent token 表里没有的档位（z-index 分层刻度等）。它与从
 * `@fluentui/tokens` 抽取的 `fluent-tokens.json` 分开放，是因为 `extract-tokens.mjs`
 * 会**整体重写**后者——手写值只有落在 repo-tokens.json 才不会被上游抽取冲掉。
 *
 * 这里守住四件事：
 *   ① 两支事实源不重名（重名会让生成结果取决于遍历顺序，generate.mjs 也会直接抛错）；
 *   ② 每个 token 都有明暗值与取值说明（来源 / 消费方）；
 *   ③ z-index 刻度保持《人工校验闸门》要求的相对顺序：
 *      窗口 < 内容区 < 导航浮层 < 菜单 < 子菜单 < 模态遮罩 < 外壳，ToolTip 在最上；
 *   ④ zIndexStep 为正，嵌套浮层才能按层级栈向上提升。
 */
import { describe, expect, it } from 'vitest'
import fluentData from '../data/fluent-tokens.json'
import repoData from '../data/repo-tokens.json'
import { mergeThemedValue } from '../scripts/theme-value.mjs'

/** data/*.json 里每个 token 的形状（Fluent 表里有数值型 token，如 fontWeight*，故允许 number） */
interface TokenValue {
  light: string | number
  dark: string | number
  kind?: string
  note?: string
}

const repo = repoData.tokens as Record<string, TokenValue>
const fluent = fluentData.tokens as Record<string, TokenValue>

/** 取某个刻度 token 的数值（缺失或非数字直接失败，避免静默跳过断言） */
const tierOf = (name: string): number => {
  const token = repo[name]
  if (!token) {
    throw new Error(`repo-tokens.json 缺少 ${name}`)
  }
  const value = Number(token.light)
  if (!Number.isFinite(value)) {
    throw new Error(`${name} 的 light 不是数值：${token.light}`)
  }
  return value
}

describe('data/repo-tokens.json', () => {
  it('与 Fluent token 表不重名', () => {
    const overlap = Object.keys(repo).filter((name) => name in fluent)
    expect(overlap).toEqual([])
  })

  it('每个 token 都有 light / dark 与取值说明', () => {
    for (const [name, token] of Object.entries(repo)) {
      expect(typeof token.light, name).toBe('string')
      expect(typeof token.dark, name).toBe('string')
      expect(token.note, name).toBeTruthy()
    }
  })

  it('z-index 刻度覆盖验收要求的层级顺序', () => {
    const tiers = [
      'zIndexWindow',
      'zIndexContent',
      'zIndexNavFlyout',
      'zIndexMenu',
      'zIndexSubmenu',
      'zIndexModal',
      'zIndexTooltip',
      'zIndexShell',
    ]
    const values = tiers.map((name) => tierOf(name))
    for (let index = 1; index < values.length; index += 1) {
      expect(values[index], `${tiers[index]} 应高于 ${tiers[index - 1]}`).toBeGreaterThan(
        values[index - 1] as number,
      )
    }
  })

  it('zIndexStep 为正数，保证层级栈能提升嵌套浮层', () => {
    expect(tierOf('zIndexStep')).toBeGreaterThan(0)
  })

  it('每个 token 都标了 kind（color / number）', () => {
    for (const [name, token] of Object.entries(repo)) {
      expect(['color', 'number'], name).toContain(token.kind)
    }
  })

  it('数值档位不做明暗区分（light-dark() 只接受颜色）', () => {
    for (const [name, token] of Object.entries(repo)) {
      if (token.kind === 'number') {
        expect(String(token.light), name).toBe(String(token.dark))
      }
    }
  })

  it('明暗不同的 token 都能合成合法 CSS（不会产出被浏览器整条丢弃的 light-dark()）', () => {
    for (const [name, token] of Object.entries(repo)) {
      if (String(token.light) === String(token.dark)) {
        continue
      }
      expect(() => mergeThemedValue(name, token.light, token.dark), name).not.toThrow()
    }
  })
})
