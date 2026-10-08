/* oxlint-disable no-magic-numbers -- 断言里的字面量就是被测输入与期望值，抽成常量反而更难读 */
import { describe, expect, it } from 'vitest'
import { DEFAULT_PASSWORD_CHAR } from '../constants'
import { maskPassword, resolveMaskChar, resolveMaskEdit } from '../password-mask'

/**
 * 掩码显示缓冲纯函数契约。
 *
 * 对照口径见 password-mask.ts 顶部：WinUI 的 PasswordBox 把明文交给 RichEdit 的
 * 密码模式（TXTBIT_USEPASSWORD + TxGetPasswordChar），本库在显式指定
 * `passwordChar` 时用同构的「显示缓冲」实现。
 */
describe('resolveMaskChar（掩码字符解析）', () => {
  it('未提供 / 空串取 WinUI 缺省 U+25CF「●」', () => {
    expect(resolveMaskChar(undefined)).toBe(DEFAULT_PASSWORD_CHAR)
    expect(resolveMaskChar('')).toBe(DEFAULT_PASSWORD_CHAR)
    expect(DEFAULT_PASSWORD_CHAR.codePointAt(0)).toBe(9679) // 0x25CF BlackCircle
  })

  it('多字符取首个码位（WinUI 只接受长度 1 的串）', () => {
    expect(resolveMaskChar('#*')).toBe('#')
  })

  it('代理对按首个码位整体取（不劈开 emoji）', () => {
    expect(resolveMaskChar('🙂x')).toBe('🙂')
  })
})

describe('maskPassword（真值 → 掩码串）', () => {
  it('长度按 UTF-16 码元计，与 selectionStart 同坐标系', () => {
    expect(maskPassword('abc', '#')).toBe('###')
    expect(maskPassword('', '#')).toBe('')
    expect(maskPassword('👍', '#')).toHaveLength('👍'.length)
  })
})

describe('resolveMaskEdit（反推真值与光标）', () => {
  it('无区间时按公共前后缀求差（程序化赋值 / 自动填充 / 老浏览器）', () => {
    expect(resolveMaskEdit({ previousMask: '##', nextMask: '##c', previousValue: 'ab' })).toEqual({
      value: 'abc',
      caret: 3,
    })

    expect(resolveMaskEdit({ previousMask: '###', nextMask: '##', previousValue: 'abc' })).toEqual({
      value: 'ab',
      caret: 2,
    })

    expect(resolveMaskEdit({ previousMask: '##', nextMask: '', previousValue: 'ab' })).toEqual({
      value: '',
      caret: 0,
    })
  })

  it('有区间时用区间：输入 / 删除 / 选区替换', () => {
    // 在中间插入
    expect(
      resolveMaskEdit({
        previousMask: '##',
        nextMask: '#X#',
        previousValue: 'ab',
        range: { start: 1, end: 1 },
      }),
    ).toEqual({ value: 'aXb', caret: 2 })

    // 向后删除一个（区间由 getTargetRanges 给出）
    expect(
      resolveMaskEdit({
        previousMask: '###',
        nextMask: '##',
        previousValue: 'abc',
        range: { start: 0, end: 1 },
      }),
    ).toEqual({ value: 'bc', caret: 0 })

    // 选中两个字符后替换
    expect(
      resolveMaskEdit({
        previousMask: '####',
        nextMask: '#Z#',
        previousValue: 'abcd',
        range: { start: 1, end: 3 },
      }),
    ).toEqual({ value: 'aZd', caret: 2 })
  })

  it('区间消歧：插入的字形恰好等于掩码字符时，位置以区间为准', () => {
    // 光标在开头输入与掩码同形的字符：差异法会把插入点算到串尾（见 password-mask.ts 注释），
    // 有 beforeinput 区间时结果正确
    const ambiguous = { previousMask: '##', nextMask: '###', previousValue: 'ab' }
    expect(resolveMaskEdit({ ...ambiguous, range: { start: 0, end: 0 } })).toEqual({
      value: '#ab',
      caret: 1,
    })
    expect(resolveMaskEdit(ambiguous)).toEqual({ value: 'ab#', caret: 3 })
  })

  it('区间与结果不自洽时退回差异法（浏览器行为超出预期）', () => {
    expect(
      resolveMaskEdit({
        previousMask: '##',
        nextMask: 'ZZZ',
        previousValue: 'ab',
        range: { start: 1, end: 1 },
      }),
    ).toEqual({ value: 'ZZZ', caret: 3 })
  })

  it('区间越界时夹回合法范围', () => {
    expect(
      resolveMaskEdit({
        previousMask: '##',
        nextMask: '###',
        previousValue: 'ab',
        range: { start: 9, end: 9 },
      }),
    ).toEqual({ value: 'ab#', caret: 3 })
  })
})
