/**
 * 单元测试：托盘时钟（`formatTrayClock`，0.5.6 SystemTray）。
 *
 * 断言两件事：
 *  1. 随 locale 切换格式 —— zh 走 24 小时制 / `YYYY/M/D`，en 走 12 小时制（含 AM/PM）
 *     与 `M/D/YYYY`，与「时钟随 locale」的验收口径一致；
 *  2. 时间与日期分行返回（竖排堆叠是托盘宽度在窄档还能保住时间的构图前提）。
 *
 * 断言前把窄不换行空格（U+202F，ICU 在 12 小时制里分隔时间与 AM/PM）与普通
 * 空格一并剥掉 —— 该字符是 ICU 数据而非文案，跨版本不稳定，不该进断言字面量。
 */
import { describe, expect, it } from 'vitest'
import { formatTrayClock } from '../shell-clock'

/** 2026-10-16 13:20（本地时区；本测试不涉及时区换算，只验证格式组装） */
const NOW = new Date(2026, 9, 16, 13, 20, 0)

/** 剥掉所有空白与窄不换行空格，规避 ICU 版本间的空格差异 */
const normalize = (value: string): string => value.replace(/[\s\u202f\u00a0]/gu, '')

describe('formatTrayClock', () => {
  it('zh-Hans：24 小时制时间 + 2026/10/16 日期', () => {
    const lines = formatTrayClock(NOW, 'zh-Hans')
    expect(normalize(lines.time)).toBe('13:20')
    expect(normalize(lines.date)).toBe('2026/10/16')
  })

  it('en：12 小时制时间（含 AM/PM）+ 10/16/2026 日期', () => {
    const lines = formatTrayClock(NOW, 'en')
    expect(normalize(lines.time)).toBe('1:20PM')
    expect(normalize(lines.date)).toBe('10/16/2026')
  })

  it('时间与日期分行返回（竖排堆叠的构图前提）', () => {
    const lines = formatTrayClock(NOW, 'zh-Hans')
    expect(lines.time).not.toContain('/')
    expect(lines.date).toContain('/')
    // 两行都是非空文本（不是「一行空串」的退化形态）
    expect(lines.time.length).toBeGreaterThan(0)
    expect(lines.date.length).toBeGreaterThan(0)
  })

  it('同一 locale 下格式随时刻变化（午夜翻日 / 分钟进位）', () => {
    const before = formatTrayClock(new Date(2026, 9, 16, 23, 59), 'zh-Hans')
    const after = formatTrayClock(new Date(2026, 9, 17, 0, 0), 'zh-Hans')
    expect(normalize(before.time)).toBe('23:59')
    expect(normalize(after.time)).toBe('0:00')
    expect(normalize(after.date)).toBe('2026/10/17')
  })
})
