/**
 * FluereInput 命名常量。
 *
 * 集中收拢有领域含义的字面量（对齐 oxlint no-magic-numbers），供 SFC 与
 * 掩码纯函数层共享同一份契约。
 *
 * 对照来源：`microsoft-ui-xaml` tag `winui3/release/2.5.1`
 *   src/dxaml/xcp/core/native/text/Controls/PasswordBox.cpp#Initialize
 *     → 缺省 `PasswordChar` = `0x25CF`（BlackCircle「●」）
 *   src/dxaml/xcp/core/native/text/Controls/PasswordBox.cpp#ArrangeOverride
 *     → 显示按钮的显隐宽度阈值：`finalSize.width > FontSize * 5`（即 5em）
 *   src/dxaml/xcp/dxaml/lib/PasswordBox_Partial.cpp#OnApplyTemplateHandler
 *     → 显示按钮的缺省无障碍名取本地化串 `UIA_PASSWORDBOX_REVEAL`
 */

/**
 * WinUI `PasswordBox.PasswordChar` 缺省值：U+25CF「●」。
 *
 * 注意与浏览器的差异：原生 `<input type="password">` 由浏览器决定掩码字形
 * （Chrome / Firefox 画 U+2022「•」），Web 侧无法指定字形。因此：
 *   未显式传 `passwordChar` → 走原生 `type="password"`（保留密码管理器、
 *     输入法、读屏「密码框」语义），字形交给浏览器；
 *   显式传 `passwordChar` → 走显示缓冲掩码（与 WinUI 同构的双缓冲），
 *     字形精确到该字符，代价见 input.vue 顶部契约说明。
 */
const DEFAULT_PASSWORD_CHAR = '\u25CF'

/** WinUI `ArrangeOverride`：控件宽 > FontSize × 5 时才给显示按钮让位（5em） */
const PASSWORD_REVEAL_MIN_WIDTH_EM = 5

/**
 * 多行形态的缺省行数。
 *
 * WinUI 的 TextBox 没有「尺寸」概念，`AcceptsReturn=true` 时高度仍由 MinHeight
 * （32）决定、内部滚动；Web 侧 `rows` 缺省取 3，让多行框开箱即可用
 * （消费方用 `rows` 覆盖；WinUI Gallery 的示例直接写死 Height=200）。
 */
const DEFAULT_MULTILINE_ROWS = 3

/** 掩码字符解析：只取首个码位（WinUI 只接受长度 1 的串，见 PasswordBox.cpp#ValidateSetValueArguments） */
const MASK_CHAR_INDEX = 0

/** `beforeinput.getTargetRanges()` 里第一个（也是唯一）的编辑区间 */
const MASK_RANGE_INDEX = 0

/**
 * 显示缓冲掩码的撤销快照上限。
 *
 * WinUI 的撤销栈由 RichEdit 管理（深度未公开）；这里取一个够用又不占内存的上限，
 * 只用于「自定义掩码字符」这条路径 —— 浏览器自带的撤销栈里只有掩码串，字符不可还原。
 */
const MASK_HISTORY_LIMIT = 100

export {
  DEFAULT_MULTILINE_ROWS,
  DEFAULT_PASSWORD_CHAR,
  MASK_CHAR_INDEX,
  MASK_HISTORY_LIMIT,
  MASK_RANGE_INDEX,
  PASSWORD_REVEAL_MIN_WIDTH_EM,
}
