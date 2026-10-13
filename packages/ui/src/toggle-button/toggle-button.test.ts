/* oxlint-disable import/no-nodejs-modules -- 契约测试需读 SFC 源码文本（jsdom 不解析 var()） */
/**
 * `FluereToggleButton` 契约。
 *
 * 行为侧对齐 WinUI `ToggleButton.IsChecked`（`bool?` + `IsThreeState`）；
 * 样式侧从 SFC 源码解析状态表，守住「每个视觉值都引用 token」这条硬约束
 * （jsdom 不解析 `var()`，见 docs/style-spec.md §7.1）。
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import FluereToggleButton from './toggle-button.vue'

const here = dirname(fileURLToPath(import.meta.url))
/** 去掉注释后的 SFC 源码：注释里写着 WinUI 原值，不能当作实现证据 */
const sfc = readFileSync(resolve(here, 'toggle-button.vue'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
)

const mountToggle = (props: Record<string, unknown> = {}) =>
  mount(FluereToggleButton, { props, slots: { default: '切换' } })

describe('FluereToggleButton · 渲染与 aria', () => {
  it('默认未选中：aria-pressed=false / data-state=unchecked', () => {
    const button = mountToggle().get('button')
    expect(button.attributes('aria-pressed')).toBe('false')
    expect(button.attributes('data-state')).toBe('unchecked')
  })

  it('选中：aria-pressed=true / data-state=checked', () => {
    const button = mountToggle({ checked: true }).get('button')
    expect(button.attributes('aria-pressed')).toBe('true')
    expect(button.attributes('data-state')).toBe('checked')
  })

  it('三态的不确定态用 aria-pressed="mixed"（不是 aria-checked）', () => {
    const button = mountToggle({ checked: null, threeState: true }).get('button')
    expect(button.attributes('aria-pressed')).toBe('mixed')
    expect(button.attributes('data-state')).toBe('indeterminate')
  })

  it('可访问名走 label，透传到原生 aria-label', () => {
    const button = mountToggle({ label: '加粗' }).get('button')
    expect(button.attributes('aria-label')).toBe('加粗')
  })

  it('尺寸档与图标位修饰类齐全', () => {
    const button = mountToggle({ size: 'small', iconOnly: true, block: true }).get('button')
    expect(button.classes()).toEqual(
      expect.arrayContaining([
        'fui-toggle-button',
        'fui-toggle-button--small',
        'fui-toggle-button--icon-only',
        'fui-toggle-button--block',
      ]),
    )
    expect(button.find('.fui-toggle-button__content').exists()).toBe(false)
  })
})

describe('FluereToggleButton · 三态切换', () => {
  it('false → true 抛 update:checked 与 checked 事件', async () => {
    const wrapper = mountToggle({ checked: false })
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('update:checked')).toEqual([[true]])
    expect(wrapper.emitted('checked')).toHaveLength(1)
  })

  it('true → false（threeState 关闭）', async () => {
    const wrapper = mountToggle({ checked: true })
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('update:checked')).toEqual([[false]])
    expect(wrapper.emitted('unchecked')).toHaveLength(1)
  })

  it('true → null（threeState 打开）', async () => {
    const wrapper = mountToggle({ checked: true, threeState: true })
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('update:checked')).toEqual([[null]])
    expect(wrapper.emitted('indeterminate')).toHaveLength(1)
  })

  it('不确定态点击回到 false（OnToggleImpl：Indeterminate → Unchecked）', async () => {
    const wrapper = mountToggle({ checked: null, threeState: true })
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('update:checked')).toEqual([[false]])
    expect(wrapper.emitted('unchecked')).toHaveLength(1)
  })

  it('三态完整循环：false → true → null → false', async () => {
    // 受控组件：手动把每次抛出的值写回，模拟消费方的 v-model
    let value: boolean | null = false
    const seen: (boolean | null)[] = []
    for (let step = 0; step < 3; step += 1) {
      const wrapper = mountToggle({ checked: value, threeState: true })
      await wrapper.get('button').trigger('click')
      value = (wrapper.emitted('update:checked')?.[0]?.[0] ?? null) as boolean | null
      seen.push(value)
      wrapper.unmount()
    }
    expect(seen).toEqual([true, null, false])
  })

  it('禁用时不抛事件，原生 disabled 生效', async () => {
    const wrapper = mountToggle({ disabled: true })
    const button = wrapper.get('button')
    expect(button.attributes('disabled')).toBeDefined()
    await button.trigger('click')
    expect(wrapper.emitted('update:checked')).toBeUndefined()
  })

  it('受控：父组件不回写时状态不自己变（aria-pressed 仍按 prop）', async () => {
    const wrapper = mountToggle({ checked: false })
    await wrapper.get('button').trigger('click')
    expect(wrapper.get('button').attributes('aria-pressed')).toBe('false')
  })
})

describe('FluereToggleButton · 样式契约', () => {
  it('选中态取强调色（WinUI AccentFillColorDefaultBrush → --colorBrandBackground）', () => {
    expect(sfc).toContain(".fui-toggle-button[data-state='checked'] {")
    expect(sfc).toContain('background-color: var(--colorBrandBackground)')
    expect(sfc).toContain('color: var(--colorNeutralForegroundOnBrand)')
  })

  it('选中 hover / pressed 走强调色两档', () => {
    expect(sfc).toContain(".fui-toggle-button[data-state='checked']:hover:not(:disabled)")
    expect(sfc).toContain('background-color: var(--colorBrandBackgroundHover)')
    expect(sfc).toContain('background-color: var(--colorBrandBackgroundPressed)')
  })

  it('动效只过渡背景：BrushTransition 83ms；前景 / 描边按 DiscreteObjectKeyFrame 瞬切', () => {
    expect(sfc).toContain('transition: background-color 83ms linear')
    expect(sfc).not.toContain('transition: background-color var(--durationFast)')
  })

  it('选中按下前景走 TextOnAccentFillColorSecondary（局部变量 + WinUI 原值）', () => {
    expect(sfc).toContain('--fui-toggle-button-checked-pressed-foreground: light-dark(')
    expect(sfc).toContain('rgba(255, 255, 255, 0.702)')
    expect(sfc).toContain('rgba(0, 0, 0, 0.502)')
    expect(sfc).toContain('color: var(--fui-toggle-button-checked-pressed-foreground)')
  })

  it('未选中态 hover / pressed 走 ControlFill 两档', () => {
    expect(sfc).toContain('background-color: var(--colorNeutralBackground1Hover)')
    expect(sfc).toContain('background-color: var(--colorNeutralBackground1Pressed)')
    expect(sfc).toContain('color: var(--colorNeutralForeground2)')
  })

  it('不确定态与未选中同源（WinUI 的 *Indeterminate 资源组）', () => {
    expect(sfc).toContain(".fui-toggle-button[data-state='indeterminate'] {")
  })

  it('禁用：普通档走中性禁用色，选中档走带 alpha 的强调禁用色（局部变量 + WinUI 原值）', () => {
    expect(sfc).toContain('background-color: var(--colorNeutralBackgroundDisabled)')
    expect(sfc).toContain(".fui-toggle-button[data-state='checked']:disabled")
    expect(sfc).toContain('--fui-toggle-button-checked-disabled-background: light-dark(')
    expect(sfc).toContain('rgba(0, 0, 0, 0.216)')
    expect(sfc).toContain('rgba(255, 255, 255, 0.157)')
    expect(sfc).toContain('rgba(255, 255, 255, 0.529)')
  })

  it('焦点交给共享原语：挂 useFocusVisual，且不自写 :focus-visible', () => {
    expect(sfc).toContain('useFocusVisual(')
    expect(sfc).toContain('focusVisual.class')
    expect(sfc).not.toContain(':focus-visible')
  })

  it('所有背景 / 前景 / 描边都引用 token，无裸色值', () => {
    const declarations = [
      ...sfc.matchAll(/(?:background-color|color|border-color):\s*(?<value>[^;]+);/g),
    ].map((match) => (match.groups?.value ?? '').trim())
    expect(declarations.length).toBeGreaterThan(10)
    for (const value of declarations) {
      // 允许 transparent：选中态是实色强调底，WinUI 的 AccentControlElevationBorderBrush
      // 在上面不可见，与 Button--primary 同口径
      expect(value === 'transparent' || value.includes('var('), value).toBe(true)
    }
  })
})
