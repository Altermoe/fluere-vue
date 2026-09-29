/* oxlint-disable prefer-named-capture-group, no-magic-numbers -- 样式契约测试要读 SFC 源码做文本解析，正则与下标属测试细节 */
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import FluereProgressRing from './progress-ring.vue'
import ringSfc from './progress-ring.vue?raw'

/**
 * 从 SFC 的 `<style>` 块解析出「选择器 → 声明」，用于断言状态样式。
 *
 * jsdom 不解析 CSS 自定义属性（var()），拿不到可靠的计算样式，所以这里退一步
 * 断言声明本身——守住曾经跑偏的 WinUI 还原规则。
 *
 * 对照来源：WinUI 3（microsoft-ui-xaml winui3/release/2.0-stable）
 *   src/controls/dev/ProgressRing/ProgressRing.xaml
 *   src/controls/dev/ProgressRing/ProgressRing_themeresources.xaml
 *   src/controls/dev/ProgressRing/AnimatedVisuals/ProgressRingIndeterminate.cpp
 *   src/controls/dev/ProgressRing/AnimatedVisuals/ProgressRingDeterminate.cpp
 */
const readStyleRules = (): Map<string, string> => {
  const styleBlock = /<style[^>]*>(?<css>[\s\S]*?)<\/style>/.exec(ringSfc)?.groups?.css ?? ''
  const rules = new Map<string, string>()
  const blocks = styleBlock
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // 展开 @media 包裹（去掉 `@media (...) {` 头，多余的 } 在 split 时自然落空），
    // 并对同一选择器的多次声明做合并（外层规则与 reduced-motion 规则共存）
    .replace(/@media[^{]*{/g, '')
    .split('}')
  for (const block of blocks) {
    const [selectorText, declarations] = block.split('{')
    if (selectorText !== undefined && declarations !== undefined) {
      const decl = declarations.replace(/\s+/g, ' ').trim()
      for (const selector of selectorText.split(',')) {
        const key = selector.replace(/\s+/g, ' ').trim()
        if (!key) {
          continue
        }
        const prev = rules.get(key)
        rules.set(key, prev ? `${prev} ${decl}` : decl)
      }
    }
  }
  return rules
}

describe('FluereProgressRing 渲染契约', () => {
  it('渲染为 role=progressbar 的装饰根节点，内含 SVG 圆环', () => {
    const wrapper = mount(FluereProgressRing)
    const root = wrapper.get('[role="progressbar"]')
    expect(root.classes()).toContain('fui-pr')
    expect(wrapper.find('.fui-pr__svg').exists()).toBe(true)
    expect(wrapper.find('.fui-pr__arc').exists()).toBe(true)
    // 纯装饰：SVG 对屏幕阅读器隐藏（对齐 IsTabStop=False）
    expect(wrapper.get('.fui-pr__svg').attributes('aria-hidden')).toBe('true')
  })

  it('默认 indeterminate：data-state=indeterminate，不暴露 aria-valuenow', () => {
    const wrapper = mount(FluereProgressRing)
    const root = wrapper.get('[role="progressbar"]')
    expect(root.attributes('data-state')).toBe('indeterminate')
    expect(root.attributes('aria-valuenow')).toBeUndefined()
    expect(root.attributes('aria-valuemin')).toBeUndefined()
  })

  it('determinate：data-state=determinate + aria-valuenow/min/max + 百分比 aria-valuetext', () => {
    const wrapper = mount(FluereProgressRing, {
      props: { indeterminate: false, modelValue: 25, max: 100 },
    })
    const root = wrapper.get('[role="progressbar"]')
    expect(root.attributes('data-state')).toBe('determinate')
    expect(root.attributes('aria-valuemin')).toBe('0')
    expect(root.attributes('aria-valuemax')).toBe('100')
    expect(root.attributes('aria-valuenow')).toBe('25')
    expect(root.attributes('aria-valuetext')).toBe('25%')
  })

  it('determinate：value 钳位到 [min, max]', () => {
    const wrapper = mount(FluereProgressRing, {
      props: { indeterminate: false, modelValue: 150, max: 100, min: 0 },
    })
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('100')
    const below = mount(FluereProgressRing, {
      props: { indeterminate: false, modelValue: -5, min: 10, max: 100 },
    })
    expect(below.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('10')
  })

  it('尺寸透传为 data-size（默认 medium=32）', () => {
    const wrapper = mount(FluereProgressRing, { props: { size: 'large' } })
    expect(wrapper.get('[role="progressbar"]').attributes('data-size')).toBe('large')
    expect(mount(FluereProgressRing).get('[role="progressbar"]').attributes('data-size')).toBe(
      'medium',
    )
  })

  it('active=false：data-active 缺省（WinUI IsActive=false → 透明）', () => {
    const wrapper = mount(FluereProgressRing, { props: { active: false } })
    expect(wrapper.get('[role="progressbar"]').attributes('data-active')).toBeUndefined()
    expect(mount(FluereProgressRing).get('[role="progressbar"]').attributes('data-active')).toBe('')
  })

  it('indeterminate 弧线使用每实例渐变 id（stroke=url(#grad)）', () => {
    const wrapper = mount(FluereProgressRing)
    const arc = wrapper.get('.fui-pr__arc')
    // Vue 会把 style 绑定序列化成带引号的 CSS：stroke: url("#fui-pr-grad-19");
    expect(arc.attributes('style')).toMatch(/stroke:\s*url\(["']?#fui-pr-grad-/)
    expect(wrapper.find('.fui-pr__grad-tail').exists()).toBe(true)
    expect(wrapper.find('.fui-pr__grad-head').exists()).toBe(true)
  })

  it('label 透传为 aria-label', () => {
    const wrapper = mount(FluereProgressRing, { props: { label: '正在加载' } })
    expect(wrapper.get('[role="progressbar"]').attributes('aria-label')).toBe('正在加载')
  })
})

describe('FluereProgressRing 状态样式（WinUI 3 ProgressRing 契约）', () => {
  const rules = readStyleRules()

  it('尺寸映射：medium 32（WinUI 默认）、small 16（MinWidth）、large 48', () => {
    expect(rules.get('.fui-pr') ?? '').toContain('--pr-size: 32px')
    expect(rules.get(".fui-pr[data-size='small']") ?? '').toContain('--pr-size: 16px')
    expect(rules.get(".fui-pr[data-size='large']") ?? '').toContain('--pr-size: 48px')
  })

  it('前景 = AccentFillColorDefaultBrush → colorCompoundBrandBackground（无轨道、无底色）', () => {
    expect(rules.get('.fui-pr') ?? '').toContain('color: var(--colorCompoundBrandBackground)')
    // 根背景透明：不绘制任何底环（ControlFillColorTransparentBrush）
    expect((rules.get('.fui-pr') ?? '').includes('background')).toBe(false)
  })

  it('纯装饰：pointer-events:none（对齐 IsHitTestVisible=False）', () => {
    expect(rules.get('.fui-pr') ?? '').toContain('pointer-events: none')
  })

  it('弧线：圆头（stroke-linecap: round），stroke=currentColor 级联 disabled', () => {
    const arc = rules.get('.fui-pr__arc') ?? ''
    expect(arc).toContain('stroke-linecap: round')
    expect(arc).toContain('stroke: currentColor')
  })

  it('dash 起点由 orbit 静态 rotate(-90deg) 落到 12 点；keyframes 在此基础上 −90°→270° 无缝循环', () => {
    const orbit = rules.get('.fui-pr__orbit') ?? ''
    expect(orbit).toContain('transform: rotate(-90deg)')
    expect(orbit).toContain('transform-box: view-box')
    const all = [...rules.values()].join('\n')
    expect(all).toContain('transform: rotate(-90deg)')
    expect(all).toContain('transform: rotate(270deg)')
  })

  it('indeterminate：orbit 0.8s 线性匀速旋转（≈450°/s，对齐 Lottie 可见转速）', () => {
    const orbit = rules.get(".fui-pr[data-state='indeterminate'] .fui-pr__orbit") ?? ''
    expect(orbit).toContain('animation: fui-pr-orbit 0.8s linear infinite')
  })

  it('determinate：value 变化走 stroke-dashoffset 过渡（弧长平滑增长）', () => {
    const arc = rules.get(".fui-pr[data-state='determinate'] .fui-pr__arc") ?? ''
    expect(arc).toContain(
      'transition: stroke-dashoffset var(--durationNormal) var(--curveEasyEase)',
    )
  })

  it('彗星渐变：弧尾 stop-opacity=0、弧头 stop-opacity=1', () => {
    expect(rules.get('.fui-pr__grad-tail') ?? '').toContain('stop-opacity: 0')
    expect(rules.get('.fui-pr__grad-head') ?? '').toContain('stop-opacity: 1')
    expect(rules.get('.fui-pr__grad-stop') ?? '').toContain(
      'stop-color: var(--colorCompoundBrandBackground)',
    )
  })

  it('disabled：前景与渐变色标降级 …Disabled 档', () => {
    expect(rules.get('.fui-pr[data-disabled]') ?? '').toContain(
      'color: var(--colorNeutralForegroundDisabled)',
    )
    expect(rules.get('.fui-pr[data-disabled] .fui-pr__grad-stop') ?? '').toContain(
      'stop-color: var(--colorNeutralForegroundDisabled)',
    )
  })

  it('inactive（IsActive=false）：opacity:0 + 动画暂停（对齐 WinUI Inactive 态）', () => {
    expect(rules.get('.fui-pr:not([data-active])') ?? '').toContain('opacity: 0')
    expect(rules.get('.fui-pr:not([data-active]) .fui-pr__orbit') ?? '').toContain(
      'animation-play-state: paused',
    )
  })

  it('动效尊重系统减弱：reduced-motion 下关闭旋转与过渡', () => {
    const orbit = rules.get(".fui-pr[data-state='indeterminate'] .fui-pr__orbit") ?? ''
    const arc = rules.get(".fui-pr[data-state='determinate'] .fui-pr__arc") ?? ''
    // 外层规则（旋转/过渡）与 reduced-motion 覆盖（animation:none / transition:none）共存
    expect(orbit).toContain('animation: fui-pr-orbit 0.8s linear infinite')
    expect(orbit).toContain('animation: none')
    expect(arc).toContain(
      'transition: stroke-dashoffset var(--durationNormal) var(--curveEasyEase)',
    )
    expect(arc).toContain('transition: none')
  })
})
