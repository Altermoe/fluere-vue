/* oxlint-disable import/no-nodejs-modules -- 契约测试需读 SFC 源码文本（jsdom 不解析 var()） */
/**
 * `FluereButton` 契约。
 *
 * 行为侧覆盖渲染与 aria；样式侧从 SFC 源码解析状态表 / 动效，守住
 * 「视觉值引用 token、动效对齐 A 级」这条硬约束（jsdom 不解析 `var()`，
 * 见 docs/style-spec.md §7.1）。
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import FluereButton from './button.vue'

const here = dirname(fileURLToPath(import.meta.url))
/** 去掉注释后的 SFC 源码：注释里写着 WinUI 原值，不能当作实现证据 */
const sfc = readFileSync(resolve(here, 'button.vue'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('FluereButton', () => {
  it('renders the default secondary / medium / rounded button', () => {
    const wrapper = mount(FluereButton, { slots: { default: '确定' } })
    const button = wrapper.get('button')
    expect(button.classes()).toContain('fui-button--secondary')
    expect(button.classes()).toContain('fui-button--medium')
    expect(button.classes()).toContain('fui-button--rounded')
    expect(button.text()).toBe('确定')
  })

  it('applies the primary appearance and block modifier', () => {
    const wrapper = mount(FluereButton, {
      props: { appearance: 'primary', block: true },
      slots: { default: '提交' },
    })
    const button = wrapper.get('button')
    expect(button.classes()).toContain('fui-button--primary')
    expect(button.classes()).toContain('fui-button--block')
  })

  it('maps disabled and selected state onto the native button', () => {
    const wrapper = mount(FluereButton, {
      props: { disabled: true, selected: true },
    })
    const button = wrapper.get('button')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.attributes('aria-pressed')).toBe('true')
  })

  it('hides the content slot in icon-only mode', () => {
    const wrapper = mount(FluereButton, {
      props: { iconOnly: true },
      slots: { default: '不可见' },
    })
    expect(wrapper.find('.fui-button__content').exists()).toBe(false)
  })

  it('动效只过渡背景：BrushTransition 83ms；前景 / 描边按 DiscreteObjectKeyFrame 瞬切', () => {
    expect(sfc).toContain('transition: background-color 83ms linear')
    expect(sfc).not.toContain('transition: background-color var(--durationFast)')
  })
})
