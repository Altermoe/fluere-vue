/* oxlint-disable prefer-named-capture-group, no-magic-numbers -- 样式契约测试要读 SFC 源码做文本解析，正则与下标属测试细节 */
/* oxlint-disable import/no-duplicates -- 同时 import 组件与 `?raw` 源码是 Vite 下的常规写法（本仓 16 个契约测试同形），oxlint 会误判为重复导入 */
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import FluereConfigProvider from '../config-provider/config-provider.vue'
import FluereProgressRing from './progress-ring.vue'
import ringSfc from './progress-ring.vue?raw'

/**
 * 从 SFC 的 `<style>` 块解析出「选择器 → 声明」，用于断言状态样式。
 *
 * jsdom 不解析 CSS 自定义属性（var()），拿不到可靠的计算样式，所以这里退一步
 * 断言声明本身——守住曾经跑偏的 WinUI 还原规则。
 *
 * 解析规则：按 `}` 切块、再按 `{` 切出「选择器 → 声明」。因此
 *   - 普通规则：`.sel { a: b }` → key `.sel`
 *   - @keyframes 内部块：`0% { a: b }` → key `0%` / `50%` / `100%` / `from` / `to`
 *   - 同一选择器的多次声明（外层 + @media 覆盖）合并为一条
 *
 * 对照来源：WinUI 3（microsoft-ui-xaml winui3/release/2.5.1，与最新 WinUI3 Gallery
 * 发行版 v2.9.3 所用的 WindowsAppSDK 2.0.1 同源，ProgressRing 源码逐字节一致）
 *   src/controls/dev/ProgressRing/ProgressRing.xaml
 *   src/controls/dev/ProgressRing/ProgressRing_themeresources.xaml
 *   src/controls/dev/ProgressRing/AnimatedVisuals/ProgressRingIndeterminate.cpp
 *   src/controls/dev/ProgressRing/AnimatedVisuals/ProgressRingDeterminate.cpp
 */
const readStyleText = (): string =>
  (/<style[^>]*>(?<css>[\s\S]*?)<\/style>/.exec(ringSfc)?.groups?.css ?? '').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  )

/** 取出某个 @keyframes 的完整内容（规则解析器会吞掉第一个关键帧选择器，故单列） */
const readKeyframes = (name: string): string => {
  const matched =
    new RegExp(`@keyframes\\s+${name}\\s*\\{([\\s\\S]*?)^\\}`, 'm').exec(readStyleText())?.[1] ?? ''
  return matched.replace(/\s+/g, ' ').trim()
}

const readStyleRules = (): Map<string, string> => {
  const styleBlock = readStyleText()
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

/** 与组件脚本同源：r=14（WinUI Lottie 80×80 舞台里 r=35 归一化到 32px 控件） */
const R = 14
const CIRCUMFERENCE = 2 * Math.PI * R

describe('FluereProgressRing 渲染契约', () => {
  it('渲染为 role=progressbar 的装饰根节点，内含轨道 + 圆环 SVG', () => {
    const wrapper = mount(FluereProgressRing)
    const root = wrapper.get('[role="progressbar"]')
    expect(root.classes()).toContain('fui-pr')
    expect(wrapper.find('.fui-pr__svg').exists()).toBe(true)
    expect(wrapper.find('.fui-pr__track').exists()).toBe(true)
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

  it('indeterminate：弧长完全交给 CSS 动画，不写内联 dash 属性、也不用渐变', () => {
    const wrapper = mount(FluereProgressRing)
    const arc = wrapper.get('.fui-pr__arc')
    expect(arc.attributes('stroke-dasharray')).toBeUndefined()
    expect(arc.attributes('stroke-dashoffset')).toBeUndefined()
    // 实色圆头弧段（Lottie 里就是主题色实心描边，没有彗星渐变）
    expect(arc.attributes('style')).toBeUndefined()
    expect(wrapper.find('linearGradient').exists()).toBe(false)
    expect(wrapper.find('.fui-pr__grad-stop').exists()).toBe(false)
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

  it('determinate：dasharray=[C, C]、dashoffset=C·(1−fraction)（弧自 12 点顺时针增长）', () => {
    const wrapper = mount(FluereProgressRing, {
      props: { indeterminate: false, modelValue: 25, max: 100 },
    })
    const arc = wrapper.get('.fui-pr__arc')
    const [dash] = (arc.attributes('stroke-dasharray') ?? '').split(' ')
    expect(Number(dash)).toBeCloseTo(CIRCUMFERENCE, 5)
    expect(Number(arc.attributes('stroke-dashoffset'))).toBeCloseTo(CIRCUMFERENCE * 0.75, 5)
    // 满进度 → 弧覆盖整圈（offset=0）
    const full = mount(FluereProgressRing, {
      props: { indeterminate: false, modelValue: 100 },
    })
    expect(Number(full.get('.fui-pr__arc').attributes('stroke-dashoffset'))).toBeCloseTo(0, 5)
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

  it('轨道色：缺省不注入 --pr-track-color（WinUI 默认透明轨道）', () => {
    const style = mount(FluereProgressRing).get('[role="progressbar"]').attributes('style') ?? ''
    expect(style).toContain('--pr-c:')
    expect(style).not.toContain('--pr-track-color')
  })

  it('轨道色：backgroundColor 透传为 --pr-track-color（对齐 WinUI Background）', () => {
    const wrapper = mount(FluereProgressRing, {
      props: { backgroundColor: 'var(--colorNeutralStroke1)' },
    })
    const style = wrapper.get('[role="progressbar"]').attributes('style') ?? ''
    expect(style).toContain('--pr-track-color: var(--colorNeutralStroke1)')
    // 两种形态都绘制轨道（Lottie 的 Background SpriteShape 与状态无关）
    const det = mount(FluereProgressRing, {
      props: { indeterminate: false, backgroundColor: '#d3d3d3' },
    })
    expect(det.get('[role="progressbar"]').attributes('style')).toContain(
      '--pr-track-color: #d3d3d3',
    )
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

  it('前景 = AccentFillColorDefaultBrush → colorCompoundBrandBackground（根节点无底色）', () => {
    expect(rules.get('.fui-pr') ?? '').toContain('color: var(--colorCompoundBrandBackground)')
    expect((rules.get('.fui-pr') ?? '').includes('background')).toBe(false)
  })

  it('纯装饰：pointer-events:none（对齐 IsHitTestVisible=False）', () => {
    expect(rules.get('.fui-pr') ?? '').toContain('pointer-events: none')
  })

  it('弧线：圆头（stroke-linecap: round）、stroke=currentColor、stroke-width=3', () => {
    const arc = rules.get('.fui-pr__arc') ?? ''
    expect(arc).toContain('stroke-linecap: round')
    expect(arc).toContain('stroke: currentColor')
    expect(arc).toContain('stroke-width: 3')
  })

  it('轨道：静态整圆，描边走 --pr-track-color 且缺省透明（ControlFillColorTransparentBrush）', () => {
    const track = rules.get('.fui-pr__track') ?? ''
    expect(track).toContain('stroke: var(--pr-track-color, transparent)')
    expect(track).toContain('stroke-width: 3')
  })

  it('dash 起点由弧线静态 rotate(-90deg) 落到 12 点（不再有独立的 orbit 包裹层）', () => {
    const arc = rules.get('.fui-pr__arc') ?? ''
    expect(arc).toContain('transform: rotate(-90deg)')
    expect(arc).toContain('transform-box: view-box')
    expect(arc).toContain('transform-origin: 16px 16px')
    // 旋转已与 dash 合并到弧线自身，避免「父元素旋转 + 子元素 dash」两条动画在周期边界脱节
    expect(rules.get('.fui-pr__orbit')).toBeUndefined()
  })

  it('indeterminate：同一条 2s 线性动画驱动旋转 + 弧长 + 弧位置（Lottie 2s / c_durationTicks=20000000）', () => {
    const arc = rules.get(".fui-pr[data-state='indeterminate'] .fui-pr__arc") ?? ''
    expect(arc).toContain('animation: fui-pr-arc 2s linear infinite')
    // 静态兜底（reduced-motion 停动画后）= 半环
    expect(arc).toContain('stroke-dasharray: calc(var(--pr-c) / 2) var(--pr-c)')
    const frames = readKeyframes('fui-pr-arc')
    // 0%：弧长 0（RoundLineCap 收成圆点），12 点基准，dash 相位 0
    expect(frames).toContain(
      '0% { transform: rotate(-90deg); stroke-dasharray: 0 var(--pr-c); stroke-dashoffset: 0; }',
    )
    // 50%：可见旋转已推进 270°（180° 变换 + dash 相位半圈 = Lottie 的 450°），弧长上限 = 半周长
    expect(frames).toContain(
      '50% { transform: rotate(180deg); stroke-dasharray: calc(var(--pr-c) / 2) var(--pr-c); stroke-dashoffset: calc(var(--pr-c) * -0.5); }',
    )
    // 100%：弧长 0；边界跳变量各自「视觉等价」——transform 跳 720°（= 2 整圈）、
    // dashoffset 跳 +C（此刻弧长为 0、图案周期恰为 C）→ 不依赖两条动画同步
    expect(frames).toContain(
      '100% { transform: rotate(630deg); stroke-dasharray: 0 var(--pr-c); stroke-dashoffset: calc(var(--pr-c) * -1); }',
    )
    // 不再有彗星渐变的痕迹
    const all = [...rules.entries()].map(([k, v]) => `${k}: ${v}`).join('\n')
    expect(all).not.toContain('grad')
    expect(all).not.toContain('stop-opacity')
  })

  it('determinate：value 变化走 stroke-dashoffset 过渡（弧长平滑增长）', () => {
    const arc = rules.get(".fui-pr[data-state='determinate'] .fui-pr__arc") ?? ''
    expect(arc).toContain(
      'transition: stroke-dashoffset var(--durationNormal) var(--curveEasyEase)',
    )
  })

  it('disabled：前景降级 …Disabled 档', () => {
    expect(rules.get('.fui-pr[data-disabled]') ?? '').toContain(
      'color: var(--colorNeutralForegroundDisabled)',
    )
  })

  it('inactive（IsActive=false）：opacity:0 + 动画暂停', () => {
    expect(rules.get('.fui-pr:not([data-active])') ?? '').toContain('opacity: 0')
    expect(rules.get('.fui-pr:not([data-active]) .fui-pr__arc') ?? '').toContain(
      'animation-play-state: paused',
    )
  })

  it('动效尊重系统减弱：reduced-motion 下关闭动画与过渡', () => {
    const arc = rules.get(".fui-pr[data-state='indeterminate'] .fui-pr__arc") ?? ''
    const det = rules.get(".fui-pr[data-state='determinate'] .fui-pr__arc") ?? ''
    // 外层规则与 reduced-motion 覆盖共存
    expect(arc).toContain('animation: fui-pr-arc 2s linear infinite')
    expect(arc).toContain('animation: none')
    expect(det).toContain(
      'transition: stroke-dashoffset var(--durationNormal) var(--curveEasyEase)',
    )
    expect(det).toContain('transition: none')
  })
})

describe('FluereProgressRing i18n（不确定态可访问名）', () => {
  it('determinate 无 label 时不补缺省名', () => {
    const wrapper = mount(FluereProgressRing, { props: { indeterminate: false } })
    expect(wrapper.get('[role="progressbar"]').attributes('aria-label')).toBeUndefined()
    wrapper.unmount()
  })

  it('indeterminate 无 label 时取内置缺省 zh-Hans：加载中', () => {
    const wrapper = mount(FluereProgressRing)
    expect(wrapper.get('[role="progressbar"]').attributes('aria-label')).toBe('加载中')
    wrapper.unmount()
  })

  it('FluereConfigProvider locale=en 时不确定态取英文侧', () => {
    const wrapper = mount(FluereConfigProvider, {
      props: { locale: 'en' },
      slots: { default: () => h(FluereProgressRing) },
    })
    expect(wrapper.get('[role="progressbar"]').attributes('aria-label')).toBe('Loading')
    wrapper.unmount()
  })

  it('显式 label 压过 locale', () => {
    const wrapper = mount(FluereConfigProvider, {
      props: { locale: 'en' },
      slots: { default: () => h(FluereProgressRing, { label: '同步中' }) },
    })
    expect(wrapper.get('[role="progressbar"]').attributes('aria-label')).toBe('同步中')
    wrapper.unmount()
  })
})
