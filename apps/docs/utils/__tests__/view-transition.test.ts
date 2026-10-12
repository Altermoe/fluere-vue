// 本测试需读 token 表原文（node:fs），属测试专用合理用途（同 dist-smoke.test.ts）。
/* oxlint-disable import/no-nodejs-modules */
/**
 * `parseCssTimeMs` 契约测试 —— 防「生产压缩把 `500ms` 写成 `.5s`，被旧实现误读成
 * 0.5 毫秒」的回归。
 *
 * 事实源与缺陷复盘：圆形揭示的时长取自 CSS 变量 `--durationUltraSlow`，而生产构建的
 * CSS 压缩器会把 `500ms` 改写成 `.5s`（dev 下是未压缩的 `500ms`，两种形态在实测产物里
 * 都出现过）。`Number.parseFloat('.5s')` = `0.5`，而 WAAPI 的 `duration` 单位是毫秒
 * ⇒ 揭示动效退化成瞬时，只剩阻断交互的快照覆盖层（线上 0.3.0-alpha.1 的真实缺陷）。
 *
 * 因此这里既覆盖两种单位写法，也直接对 token 表做解析断言：只要 token 换单位
 * （ms ↔ s）或写成裸数字，测试都应当仍然通过。
 *
 * 生产构建实测（可复现的验证方法，脚本属过程产物不入库）：
 *   `pnpm docs:build` → `node .output/server/index.mjs` → CDP 打开站点点击主题按钮：
 *   - `Element.prototype.animate` 收到 `duration: 500`、`easing: cubic-bezier(.33,0,.67,1)`、
 *     `pseudoElement: ::view-transition-new(root)`；
 *   - `startViewTransition().ready → finished` ≈ 500ms（实测 565ms，含两帧快照开销）；
 *   - 过渡中采 `getComputedStyle(documentElement, '::view-transition-new(root)').clipPath`，
 *     半径递增（500ms 实测 3.8% → 87%；把时长临时拉到 3000ms 得 2.7% → 51.7% → 113.3%）。
 *   修复前同一套测量拿到 `duration: 0.5`（= 0.5 毫秒），揭示肉眼不可见。
 *   注意：headless Chrome 的 `Page.captureScreenshot` 拿不到 view-transition 快照层，
 *   且对同页 DOM 变化会返回滞后帧 —— 取证只能靠上面的 WAAPI 选项与 clipPath 读数。
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parseCssTimeMs } from '../view-transition'

/** 兜底值取揭示的真实兜底（--durationUltraSlow = 500ms） */
const FALLBACK = 500

/** 本文件所在目录（Vitest 里 import.meta.url 是 file: URL） */
const TEST_DIR = dirname(fileURLToPath(import.meta.url))

/**
 * token 表原文：直接读 packages/designs 的事实源，避免测试里另抄一份取值。
 *
 * 用 `fs` 读而不是 `import ... ?raw`：`.css` 在 Vitest 里会被当成样式模块处理
 * （`?raw` 拿到的是空串）。
 */
const TOKENS_CSS = readFileSync(
  resolve(TEST_DIR, '../../../../packages/designs/generated/tokens.css'),
  'utf8',
)

/** 解析 token 表文本 → 自定义属性名（不含 `--`）到原始值的映射 */
function parseTokenTable(css: string): Map<string, string> {
  const table = new Map<string, string>()
  for (const match of css.matchAll(/--(?<name>[\w-]+)\s*:\s*(?<value>[^;]+);/g)) {
    const name = match.groups?.name
    const value = match.groups?.value?.trim()
    if (name && value) {
      table.set(name, value)
    }
  }
  return table
}

const TOKENS = parseTokenTable(TOKENS_CSS)

describe('parseCssTimeMs', () => {
  it('毫秒单位原样返回', () => {
    expect(parseCssTimeMs('500ms', FALLBACK)).toBe(500)
    expect(parseCssTimeMs('400MS', FALLBACK)).toBe(400)
    expect(parseCssTimeMs('  50ms  ', FALLBACK)).toBe(50)
  })

  it('秒单位换算成毫秒（含生产压缩形态 .5s）', () => {
    expect(parseCssTimeMs('.5s', FALLBACK)).toBe(500)
    expect(parseCssTimeMs('0.5s', FALLBACK)).toBe(500)
    expect(parseCssTimeMs('1s', FALLBACK)).toBe(1000)
    expect(parseCssTimeMs('0.15S', FALLBACK)).toBe(150)
  })

  it('无单位按毫秒（WAAPI 的惯用写法）', () => {
    expect(parseCssTimeMs('400', FALLBACK)).toBe(400)
    expect(parseCssTimeMs('.4', FALLBACK)).toBe(0.4)
  })

  it('两种单位写法等价 —— 这正是旧实现的缺陷点', () => {
    expect(parseCssTimeMs('500ms', FALLBACK)).toBe(parseCssTimeMs('.5s', FALLBACK))
  })

  it('非法 / 负值 / 复合值回落兜底', () => {
    const invalid = [
      '',
      '   ',
      'abc',
      'NaNms',
      '-500ms',
      '-0.5s',
      '1e3ms',
      'calc(500ms)',
      '50 0ms',
      '500ms, 1s',
      null,
      undefined,
    ]
    for (const value of invalid) {
      expect(parseCssTimeMs(value, FALLBACK)).toBe(FALLBACK)
    }
  })

  it('token 表里的 --durationUltraSlow 解析为 500ms（与揭示兜底一致）', () => {
    expect(parseCssTimeMs(TOKENS.get('durationUltraSlow'), 0)).toBe(FALLBACK)
  })

  it('token 表里的全部 --duration* 都能解析为有限毫秒数', () => {
    const durationTokens = [...TOKENS].filter(([name]) => name.startsWith('duration'))
    expect(durationTokens.length).toBeGreaterThan(0)
    for (const [name, raw] of durationTokens) {
      expect(Number.isFinite(parseCssTimeMs(raw, Number.NaN)), `--${name} = ${raw}`).toBe(true)
    }
  })
})
