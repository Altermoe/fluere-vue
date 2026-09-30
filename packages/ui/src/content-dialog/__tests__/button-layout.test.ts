import { describe, expect, it } from 'vitest'
/**
 * 单元测试：ContentDialog 命令区布局与默认按钮强调态（纯函数）。
 *
 * 对照来源：WinUI 3（microsoft-ui-xaml winui3/release/2.5.1）
 *   src/controls/dev/CommonStyles/ContentDialog_themeresources.xaml（ButtonsVisibilityStates /
 *   DefaultButtonStates）
 *   src/dxaml/xcp/dxaml/lib/ContentDialog_Partial.cpp#ChangeVisualState（状态推导与焦点规则）
 */
import {
  BUTTON_RESULTS,
  hasVisibleCommandButtons,
  resolveAccentButton,
  resolveCommandLayout,
} from '../button-layout'

/** 便捷构造：只给需要非空的按钮文案 */
const texts = (primary = '', secondary = '', close = '') => ({ primary, secondary, close })

describe('resolveCommandLayout（ButtonsVisibilityStates 8 态）', () => {
  it('三个按钮都在 → all，且三者可见', () => {
    const layout = resolveCommandLayout(texts('确定', '取消', '关闭'))
    expect(layout.state).toBe('all')
    expect(layout.visible).toStrictEqual({ primary: true, secondary: true, close: true })
  })

  it('全空 → none（CommandSpace 整体折叠）', () => {
    const layout = resolveCommandLayout(texts())
    expect(layout.state).toBe('none')
    expect(hasVisibleCommandButtons(layout)).toBe(false)
  })

  it('两两组合与单按钮组合逐一对应 WinUI 状态名', () => {
    expect(resolveCommandLayout(texts('确定', '取消')).state).toBe('primary-secondary')
    expect(resolveCommandLayout(texts('确定', '', '关闭')).state).toBe('primary-close')
    expect(resolveCommandLayout(texts('', '取消', '关闭')).state).toBe('secondary-close')
    expect(resolveCommandLayout(texts('确定')).state).toBe('primary')
    expect(resolveCommandLayout(texts('', '取消')).state).toBe('secondary')
    expect(resolveCommandLayout(texts('', '', '关闭')).state).toBe('close')
  })

  it('空串与未设置等价（文案为空即不渲染该按钮）', () => {
    expect(resolveCommandLayout(texts('', '', '')).state).toBe('none')
    const onlyClose = resolveCommandLayout(texts('', '', '关闭'))
    expect(hasVisibleCommandButtons(onlyClose)).toBe(true)
  })
})

describe('resolveAccentButton（DefaultButtonStates）', () => {
  const all = resolveCommandLayout(texts('确定', '取消', '关闭'))

  it('未设置默认按钮 → 无强调态', () => {
    expect(
      resolveAccentButton({
        defaultButton: 'none',
        layout: all,
        focusInCommandArea: false,
        focusedButton: null,
      }),
    ).toBeNull()
  })

  it('焦点不在命令区 → 强调默认按钮', () => {
    expect(
      resolveAccentButton({
        defaultButton: 'primary',
        layout: all,
        focusInCommandArea: false,
        focusedButton: null,
      }),
    ).toBe('primary')
    expect(
      resolveAccentButton({
        defaultButton: 'secondary',
        layout: all,
        focusInCommandArea: false,
        focusedButton: null,
      }),
    ).toBe('secondary')
    expect(
      resolveAccentButton({
        defaultButton: 'close',
        layout: all,
        focusInCommandArea: false,
        focusedButton: null,
      }),
    ).toBe('close')
  })

  it('焦点在命令区且正压在默认按钮上 → 保持强调态', () => {
    expect(
      resolveAccentButton({
        defaultButton: 'primary',
        layout: all,
        focusInCommandArea: true,
        focusedButton: 'primary',
      }),
    ).toBe('primary')
  })

  it('焦点在命令区但落在其它按钮上 → 强调态消失（WinUI 的 NoDefaultButton 分支）', () => {
    expect(
      resolveAccentButton({
        defaultButton: 'primary',
        layout: all,
        focusInCommandArea: true,
        focusedButton: 'secondary',
      }),
    ).toBeNull()
    expect(
      resolveAccentButton({
        defaultButton: 'primary',
        layout: all,
        focusInCommandArea: true,
        focusedButton: 'close',
      }),
    ).toBeNull()
  })

  it('默认按钮不可见时不显示强调态', () => {
    const onlyClose = resolveCommandLayout(texts('', '', '关闭'))
    expect(
      resolveAccentButton({
        defaultButton: 'primary',
        layout: onlyClose,
        focusInCommandArea: false,
        focusedButton: null,
      }),
    ).toBeNull()
    expect(
      resolveAccentButton({
        defaultButton: 'close',
        layout: onlyClose,
        focusInCommandArea: false,
        focusedButton: null,
      }),
    ).toBe('close')
  })
})

describe('BUTTON_RESULTS（ContentDialogResult 映射）', () => {
  it('主按钮 → primary、次按钮 → secondary、关闭按钮 → none', () => {
    expect(BUTTON_RESULTS).toStrictEqual({
      primary: 'primary',
      secondary: 'secondary',
      close: 'none',
    })
  })
})
