/**
 * FluereNumberBox 命名常量。
 *
 * 集中收拢有领域含义的字面量（对齐 oxlint no-magic-numbers），
 * 让拆分出的纯函数层共享同一份数值契约。
 *
 * 对照来源：WinUI 3 / Windows App SDK
 *   src/controls/dev/NumberBox/NumberBox.idl（属性缺省值）
 *   src/controls/dev/NumberBox/NumberBox.cpp（显示舍入 / 步进口径）
 *   src/controls/dev/CommonStyles/NumberBox_themeresources.xaml（几何）
 *   src/dxaml/xcp/dxaml/lib/RepeatButton_Partial.cpp + WinRT 文档（长按重复）
 */

/** WinUI `Minimum` 缺省值：-DBL_MAX（IDL MUX_DEFAULT_VALUE，等价「无下界」） */
const DEFAULT_MINIMUM = -Number.MAX_VALUE

/** WinUI `Maximum` 缺省值：+DBL_MAX（等价「无上界」） */
const DEFAULT_MAXIMUM = Number.MAX_VALUE

/** WinUI `SmallChange` 缺省值：方向键 / 滚轮 / 增减按钮的步长 */
const DEFAULT_SMALL_CHANGE = 1

/** WinUI `LargeChange` 缺省值：PageUp / PageDown 的步长 */
const DEFAULT_LARGE_CHANGE = 10

/**
 * WinUI `m_displayRounder.SignificantDigits(10)`：显示前把值舍入到 10 位有效数字，
 * 抹掉 0.1 + 0.2 = 0.30000000000000004 这类浮点噪声。
 */
const DISPLAY_SIGNIFICANT_DIGITS = 10

/** 缺省小数位上限：Web 侧不跟随 WinUI 的 `FractionDigits(0)`（见 format.ts 说明） */
const MAX_FRACTION_DIGITS = 20

/** 缺省整数位下限：WinUI `DecimalFormatter.IntegerDigits(1)` */
const MIN_INTEGER_DIGITS = 1

/** 小数位数的空值：0 位小数即「只接受整数」 */
const NO_FRACTION_DIGITS = 0

/**
 * WinUI RepeatButton 的 `Delay` / `Interval` 缺省值（WinRT 文档：both default 250ms）：
 * 按下立即步进一次，250ms 后开始按 250ms 重复。
 */
const SPIN_REPEAT_DELAY_MS = 250
const SPIN_REPEAT_INTERVAL_MS = 250

/** 十进制运算的精度上限：超过 15 位有效数字的字符串还原会失真，回退普通加法 */
const MAX_DECIMAL_DIGITS = 15

/** 撤销设置位时的 `Array.indexOf` 未命中值 */
const INDEX_NOT_FOUND = -1

/** 长按重复时，键盘触发的 click 与指针触发的 click 用 `detail` 区分（键盘固定为 0） */
const KEYBOARD_CLICK_DETAIL = 0

/** 缺省校验模式（对应 WinUI `NumberBoxValidationMode.InvalidInputOverwritten`） */
const DEFAULT_VALIDATION_MODE = 'invalidInputOverwritten' as const

export {
  DEFAULT_LARGE_CHANGE,
  DEFAULT_MAXIMUM,
  DEFAULT_MINIMUM,
  DEFAULT_SMALL_CHANGE,
  DEFAULT_VALIDATION_MODE,
  DISPLAY_SIGNIFICANT_DIGITS,
  INDEX_NOT_FOUND,
  KEYBOARD_CLICK_DETAIL,
  MAX_DECIMAL_DIGITS,
  MAX_FRACTION_DIGITS,
  MIN_INTEGER_DIGITS,
  NO_FRACTION_DIGITS,
  SPIN_REPEAT_DELAY_MS,
  SPIN_REPEAT_INTERVAL_MS,
}
