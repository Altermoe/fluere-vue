/**
 * FluereInput 对外类型（与 SFC 内 `FluereInputProps` 契约配套）。
 *
 * 放进独立模块是为了让拆出来的 hook（`use-password-reveal`）与 SFC 共享同一份
 * 联合类型，避免同一个字面量联合在两处各写一遍。
 */

/**
 * 密码显示模式（WinUI `PasswordBox.PasswordRevealMode`）。
 *
 * - `peek`    缺省：聚焦 + 已有输入 + 宽度够时，输入框右侧出现「显示」按钮，
 *             按住期间显示明文、松开即遮蔽（键盘等价物 Alt+F8）
 * - `hidden`  恒遮蔽、不显示按钮
 * - `visible` 恒显示明文、不显示按钮
 */
export type FluerePasswordRevealMode = 'peek' | 'hidden' | 'visible'
