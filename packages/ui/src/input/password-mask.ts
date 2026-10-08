/**
 * FluereInput 密码掩码「显示缓冲」纯函数层。
 *
 * 为什么需要它：WinUI 的 PasswordBox 把明文交给 RichEdit 的**密码模式**渲染
 * （`CTextBoxBase::TxGetPropertyBits` 置 `TXTBIT_USEPASSWORD` + `TxGetPasswordChar`
 * 返回掩码字符，见 `src/dxaml/xcp/core/native/text/Controls/PasswordBox.cpp`），
 * 即「真值一份、显示另一份」的双缓冲。浏览器做不到这一点：
 *   - 原生 `type="password"` 的掩码字形由浏览器决定，给不了 `#` 这类自定义字符；
 *   - `-webkit-text-security` 只接受 disc / circle / square / none，同样给不了。
 * 因此显式指定 `passwordChar` 时，本库改用同构做法：输入框里放的是**掩码串**，
 * 真值留在组件状态里；每次编辑按「显示差异 + 编辑区间」反推真值。
 *
 * 本模块只做纯计算，不做任何 DOM / 响应式处理，便于单独测试。
 */

import { DEFAULT_PASSWORD_CHAR, MASK_CHAR_INDEX } from './constants'

/** 掩码编辑区间（对应 `beforeinput` 的 `getTargetRanges()` / 选区，单位是 UTF-16 码元，与 `selectionStart` 同坐标系） */
interface MaskEditRange {
  start: number
  end: number
}

/** 反推结果：新真值 + 光标应落的位置 */
interface MaskEditResolution {
  value: string
  caret: number
}

/** 把下标夹到 `[0, max]` */
const clampIndex = (index: number, max: number): number => Math.min(Math.max(index, 0), max)

/**
 * 回退解：只凭「上一帧掩码串 / 这一帧掩码串」求公共前后缀，反推编辑区间。
 *
 * 用于拿不到 `beforeinput` 区间的场景（程序化赋值、自动填充、测试里的
 * `element.value = x` + `input` 事件），也是老浏览器（无 `beforeinput`）的唯一路径。
 *
 * 已知歧义：用户插入的字符恰好等于掩码字符时（例如 `passwordChar="#"` 时输入 `#`），
 * 公共前缀会把插入点算到串尾。真实浏览器里 `beforeinput` 的 `getTargetRanges()`
 * 会给出精确区间，因此该歧义只在回退路径上出现。
 */
const resolveByDiff = (
  previousMask: string,
  nextMask: string,
  previousValue: string,
): MaskEditResolution => {
  const maxPrefix = Math.min(previousMask.length, nextMask.length)
  let prefix = 0
  while (prefix < maxPrefix && previousMask[prefix] === nextMask[prefix]) {
    prefix += 1
  }

  const maxSuffix = Math.min(previousMask.length - prefix, nextMask.length - prefix)
  let suffix = 0
  while (
    suffix < maxSuffix &&
    previousMask[previousMask.length - 1 - suffix] === nextMask[nextMask.length - 1 - suffix]
  ) {
    suffix += 1
  }

  const inserted = nextMask.slice(prefix, nextMask.length - suffix)
  const removed = previousMask.length - prefix - suffix
  const value = previousValue.slice(0, prefix) + inserted + previousValue.slice(prefix + removed)
  return { value, caret: prefix + inserted.length }
}

/**
 * 解析掩码字符：空串 / 未提供取 WinUI 缺省「●」；多字符取首个码位
 * （WinUI `CPasswordBox::ValidateSetValueArguments` 只接受长度为 1 的串）。
 */
const resolveMaskChar = (passwordChar: string | undefined): string => {
  if (passwordChar === undefined || passwordChar === '') {
    return DEFAULT_PASSWORD_CHAR
  }
  return [...passwordChar][MASK_CHAR_INDEX] ?? DEFAULT_PASSWORD_CHAR
}

/**
 * 真值 → 掩码串。
 *
 * 长度按 UTF-16 码元计（`String.prototype.length`），与 `selectionStart` /
 * `selectionEnd` / `beforeinput` 的区间坐标系一致——这正是「光标位置能一一
 * 映射到真值下标」的前提。
 */
const maskPassword = (value: string, maskChar: string): string => maskChar.repeat(value.length)

/**
 * 反推一次编辑：给定编辑前的掩码串 / 真值、编辑后的掩码串，以及（可选的）
 * 本次编辑的精确区间，返回新的真值与光标位置。
 *
 * 有区间时优先用区间：`nextMask` 必然形如 `head + inserted + tail`
 * （`head = previousMask[0, start)`、`tail = previousMask[end, …)`），
 * 于是「插入的真值 = nextMask 里被替换掉的那一段」，与删除个数无关，
 * 也不受「插入字符恰为掩码字符」的歧义影响。
 */
const resolveMaskEdit = (params: {
  previousMask: string
  nextMask: string
  previousValue: string
  range?: MaskEditRange | undefined
}): MaskEditResolution => {
  const { previousMask, nextMask, previousValue, range } = params
  const fallback = (): MaskEditResolution => resolveByDiff(previousMask, nextMask, previousValue)

  if (range === undefined) {
    return fallback()
  }

  const start = clampIndex(range.start, previousMask.length)
  const end = clampIndex(Math.max(range.end, start), previousMask.length)
  const head = previousMask.slice(0, start)
  const tail = previousMask.slice(end)
  // 区间必须与「编辑后的串」自洽，否则说明浏览器行为超出预期，退回差异法
  if (!nextMask.startsWith(head) || !nextMask.endsWith(tail)) {
    return fallback()
  }

  const insertedLength = nextMask.length - start - tail.length
  if (insertedLength < 0) {
    return fallback()
  }

  const inserted = nextMask.slice(start, start + insertedLength)
  return {
    value: previousValue.slice(0, start) + inserted + previousValue.slice(end),
    caret: start + insertedLength,
  }
}

export { maskPassword, resolveMaskChar, resolveMaskEdit }
export type { MaskEditRange, MaskEditResolution }
