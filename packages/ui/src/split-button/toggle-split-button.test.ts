/* oxlint-disable no-magic-numbers -- 测试里的事件载荷是字面量，属断言细节 */
/**
 * `FluereToggleSplitButton` 契约。
 *
 * 对齐 WinUI `ToggleSplitButton`（tag `winui3/release/2.5.1`）：
 *   - 主区点击先 `Toggle()` 再抛 `Click`（`ToggleSplitButton.cpp#OnClickPrimary`），
 *     本库事件顺序为 `update:checked` → `isCheckedChanged` → `click`；
 *   - 箭头区点击只开关浮层，**不**改勾选状态；
 *   - `checked` 是受控 Prop（沿用 `FluereToggleButton` 口径），点击只回写。
 * 模板 / 状态色由内部 `split-button-base.vue` 的 checked 状态组承接，其样式契约
 * 已在 `split-button.test.ts` 覆盖（同一份源码）。
 */
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import FluereToggleSplitButton from './toggle-split-button.vue'

const mountedWrappers: { unmount: () => void }[] = []
afterEach(() => {
  for (const wrapper of mountedWrappers.splice(0)) {
    wrapper.unmount()
  }
})

const mountToggleSplit = (props: Record<string, unknown> = {}, slots = {}) => {
  const wrapper = mount(FluereToggleSplitButton, {
    props,
    slots,
    attachTo: document.body,
  })
  mountedWrappers.push(wrapper)
  return wrapper
}

describe('FluereToggleSplitButton · 勾选状态', () => {
  it('未勾选：aria-pressed=false / data-checked=false', () => {
    const wrapper = mountToggleSplit()
    expect(wrapper.get('.fui-split-button__primary').attributes('aria-pressed')).toBe('false')
    expect(wrapper.get('.fui-split-button').attributes('data-checked')).toBe('false')
  })

  it('勾选：aria-pressed=true / data-checked=true', () => {
    const wrapper = mountToggleSplit({ checked: true })
    expect(wrapper.get('.fui-split-button__primary').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('.fui-split-button').attributes('data-checked')).toBe('true')
  })

  it('主区点击：抛 update:checked / isCheckedChanged / click，顺序为 WinUI 的 Toggle → Click', async () => {
    const wrapper = mountToggleSplit({ checked: false })
    await wrapper.get('.fui-split-button__primary').trigger('click')

    expect(wrapper.emitted('update:checked')).toEqual([[true]])
    expect(wrapper.emitted('isCheckedChanged')).toEqual([[true]])
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('受控：父组件不回写时勾选状态不自己变', async () => {
    const wrapper = mountToggleSplit({ checked: false })
    await wrapper.get('.fui-split-button__primary').trigger('click')
    expect(wrapper.get('.fui-split-button__primary').attributes('aria-pressed')).toBe('false')
  })

  it('箭头区点击不改变勾选状态（只开关浮层）', async () => {
    const wrapper = mountToggleSplit({ checked: false })
    await wrapper.get('.fui-split-button__secondary').trigger('click')
    expect(wrapper.emitted('update:checked')).toBeUndefined()
    expect(wrapper.emitted('isCheckedChanged')).toBeUndefined()
    expect(wrapper.emitted('update:open')).toEqual([[true]])
  })

  it('禁用时主区点击不抛任何事件', async () => {
    const wrapper = mountToggleSplit({ checked: false, disabled: true })
    await wrapper.get('.fui-split-button__primary').trigger('click')
    expect(wrapper.emitted('update:checked')).toBeUndefined()
    expect(wrapper.emitted('click')).toBeUndefined()
  })

  it('浮层与主区 / 箭头区命中区分离：箭头区 aria 契约与 SplitButton 一致', () => {
    const wrapper = mountToggleSplit({ checked: true, hasPopup: 'menu', locale: 'en' })
    const secondary = wrapper.get('.fui-split-button__secondary')
    expect(secondary.attributes('aria-label')).toBe('More Options')
    expect(secondary.attributes('aria-haspopup')).toBe('menu')
    expect(secondary.attributes('aria-expanded')).toBe('false')
  })
})
