/* oxlint-disable prefer-named-capture-group, no-magic-numbers -- 样式契约测试要读 SFC 源码做文本解析，正则与下标属测试细节 */
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import FluereConfigProvider from '../config-provider/config-provider.vue'
import FluereProgressBar from './progress-bar.vue'
import barSfc from './progress-bar.vue?raw'

/**
 * 从 SFC 的 `<style>` 块解析出「选择器 → 声明」，用于断言状态样式。
 *
 * jsdom 不解析 CSS 自定义属性（var()），拿不到可靠的计算样式，所以这里退一步
 * 断言声明本身——守住 WinUI 还原规则（几何、配色、关键帧）。
 * 解析规则与 `progress-ring.test.ts` 保持一致（按 `}`/`{` 切块，同一选择器合并）。
 *
 * 对照来源：WinUI 3（microsoft-ui-xaml winui3/release/2.5.1，与最新 WinUI3 Gallery
 * 发行版 v2.9.3 所用的 WindowsAppSDK 2.0.1 同源，ProgressBar 源码逐字节一致）
 *   src/controls/dev/ProgressBar/ProgressBar.xaml
 *   src/controls/dev/ProgressBar/ProgressBar_themeresources.xaml
 *   src/controls/dev/ProgressBar/ProgressBar.cpp
 *   src/controls/dev/ProgressBar/ProgressBarAutomationPeer.cpp
 */
const readStyleText = (): string =>
  (/<style[^>]*>(?<css>[\s\S]*?)<\/style>/.exec(barSfc)?.groups?.css ?? '').replace(
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

/** 确定态填充宽的内联声明（jsdom 只给出行内 style 文本） */
const readFillWidth = (wrapper: ReturnType<typeof mount>): string => {
  const style = wrapper.get('.fui-pb__fill').attributes('style') ?? ''
  return /width:\s*([^;]+)/.exec(style)?.[1]?.trim() ?? ''
}

describe('FluereProgressBar 渲染契约', () => {
  it('渲染为 role=progressbar 的根节点，含轨道 + 确定态填充 + 两条不确定态滑块', () => {
    const wrapper = mount(FluereProgressBar)
    const root = wrapper.get('[role="progressbar"]')
    expect(root.classes()).toContain('fui-pb')
    expect(wrapper.find('.fui-pb__track').exists()).toBe(true)
    expect(wrapper.find('.fui-pb__fill').exists()).toBe(true)
    expect(wrapper.find('.fui-pb__slide--one').exists()).toBe(true)
    expect(wrapper.find('.fui-pb__slide--two').exists()).toBe(true)
  })

  it('默认确定态（IsIndeterminate 缺省 false）：data-state=determinate、data-status=normal', () => {
    const root = mount(FluereProgressBar).get('[role="progressbar"]')
    expect(root.attributes('data-state')).toBe('determinate')
    expect(root.attributes('data-status')).toBe('normal')
  })

  it('确定态 aria：valuemin/max/now 取 WinUI 原始值域，valuetext 为百分比', () => {
    const root = mount(FluereProgressBar, { props: { modelValue: 30 } }).get('[role="progressbar"]')
    expect(root.attributes('aria-valuemin')).toBe('0')
    expect(root.attributes('aria-valuemax')).toBe('100')
    expect(root.attributes('aria-valuenow')).toBe('30')
    expect(root.attributes('aria-valuetext')).toBe('30%')
  })

  it('确定态填充宽 = (value − min) / (max − min)（对齐 SetProgressBarIndicatorWidth）', () => {
    expect(readFillWidth(mount(FluereProgressBar, { props: { modelValue: 30 } }))).toBe('30%')
    expect(
      readFillWidth(mount(FluereProgressBar, { props: { modelValue: 70, min: 20, max: 120 } })),
    ).toBe('50%')
    expect(readFillWidth(mount(FluereProgressBar, { props: { modelValue: 0 } }))).toBe('0%')
    expect(readFillWidth(mount(FluereProgressBar, { props: { modelValue: 100 } }))).toBe('100%')
  })

  it('非零 min 时 aria 仍报 WinUI 原始值域（不暴露 reka 的归一值域）', () => {
    const root = mount(FluereProgressBar, {
      props: { modelValue: 70, min: 20, max: 120 },
    }).get('[role="progressbar"]')
    expect(root.attributes('aria-valuemin')).toBe('20')
    expect(root.attributes('aria-valuemax')).toBe('120')
    expect(root.attributes('aria-valuenow')).toBe('70')
    expect(root.attributes('aria-valuetext')).toBe('50%')
  })

  it('value 钳位到 [min, max]；max==min 时填充宽为 0（WinUI 的 abs(max−min)>ε 分支）', () => {
    expect(readFillWidth(mount(FluereProgressBar, { props: { modelValue: 150, max: 100 } }))).toBe(
      '100%',
    )
    expect(
      readFillWidth(mount(FluereProgressBar, { props: { modelValue: -5, min: 10, max: 100 } })),
    ).toBe('0%')
    expect(
      readFillWidth(mount(FluereProgressBar, { props: { modelValue: 5, min: 5, max: 5 } })),
    ).toBe('0%')
  })

  it('不确定态：data-state=indeterminate、填充宽 0、不暴露 RangeValue 语义', () => {
    const wrapper = mount(FluereProgressBar, { props: { indeterminate: true, modelValue: 42 } })
    const root = wrapper.get('[role="progressbar"]')
    expect(root.attributes('data-state')).toBe('indeterminate')
    // ProgressBarAutomationPeer：IsIndeterminate 时 GetPattern(RangeValue) 返回 nullptr
    expect(root.attributes('aria-valuenow')).toBeUndefined()
    expect(root.attributes('aria-valuemin')).toBeUndefined()
    expect(root.attributes('aria-valuemax')).toBeUndefined()
    expect(root.attributes('aria-valuetext')).toBeUndefined()
    // 代码里把确定态指示条宽度置 0
    expect(readFillWidth(wrapper)).toBe('0px')
  })

  it('showError / showPaused 透传为 data-status，且 error 优先（UpdateStates 顺序）', () => {
    expect(
      mount(FluereProgressBar, { props: { showPaused: true } })
        .get('.fui-pb')
        .attributes('data-status'),
    ).toBe('paused')
    expect(
      mount(FluereProgressBar, { props: { showError: true } })
        .get('.fui-pb')
        .attributes('data-status'),
    ).toBe('error')
    expect(
      mount(FluereProgressBar, { props: { showError: true, showPaused: true } })
        .get('.fui-pb')
        .attributes('data-status'),
    ).toBe('error')
  })

  it('label 透传为 aria-label；未传时不留下 reka 的百分比默认名', () => {
    expect(
      mount(FluereProgressBar, { props: { label: '下载进度' } })
        .get('[role="progressbar"]')
        .attributes('aria-label'),
    ).toBe('下载进度')
    expect(
      mount(FluereProgressBar).get('[role="progressbar"]').attributes('aria-label'),
    ).toBeUndefined()
  })

  it('backgroundColor 透传为 --pb-track-color（对齐 WinUI ProgressBar.Background）', () => {
    const style =
      mount(FluereProgressBar, { props: { backgroundColor: '#d3d3d3' } })
        .get('[role="progressbar"]')
        .attributes('style') ?? ''
    expect(style).toContain('--pb-track-color: #d3d3d3')
    // 缺省不注入变量 → 轨道走语义 token 默认值
    const fallback = mount(FluereProgressBar).get('[role="progressbar"]').attributes('style') ?? ''
    expect(fallback).not.toContain('--pb-track-color')
  })

  it('disabled 透传为 data-disabled', () => {
    expect(
      mount(FluereProgressBar, { props: { disabled: true } })
        .get('.fui-pb')
        .attributes('data-disabled'),
    ).toBe('')
    expect(mount(FluereProgressBar).get('.fui-pb').attributes('data-disabled')).toBeUndefined()
  })
})

describe('FluereProgressBar 状态样式（WinUI 3 ProgressBar 契约）', () => {
  const rules = readStyleRules()

  it('几何：MinHeight=3 / TrackHeight=1 / CornerRadius=1.5 / TrackCornerRadius=0.5', () => {
    const root = rules.get('.fui-pb') ?? ''
    expect(root).toContain('--pb-min-height: 3px')
    expect(root).toContain('--pb-track-height: 1px')
    expect(root).toContain('--pb-radius: 1.5px')
    expect(root).toContain('--pb-track-radius: 0.5px')
    expect(root).toContain('height: var(--pb-min-height)')
    expect(root).toContain('position: relative')
    // 模板 Border.Clip = RectangleGeometry ⇒ 超出裁掉
    expect(root).toContain('overflow: clip')
    // AGENTS：纯指示元素不拦指针
    expect(root).toContain('pointer-events: none')
    // BorderThickness=0（Light/Default）→ 不绘制边框
    expect(root).not.toContain('border:')
  })

  it('前景 = AccentFillColorDefaultBrush → colorCompoundBrandBackground；填充走 currentColor', () => {
    expect(rules.get('.fui-pb') ?? '').toContain('color: var(--colorCompoundBrandBackground)')
    expect(rules.get('.fui-pb__fill') ?? '').toContain('background-color: currentColor')
    expect(rules.get('.fui-pb__fill') ?? '').toContain('border-radius: var(--pb-radius)')
    expect(rules.get('.fui-pb__fill') ?? '').toContain('height: 100%')
  })

  it('轨道 = ControlStrongStrokeColorDefault → colorNeutralStrokeAccessible，1px 居中、圆角 0.5', () => {
    const track = rules.get('.fui-pb__track') ?? ''
    expect(track).toContain(
      'background-color: var(--pb-track-color, var(--colorNeutralStrokeAccessible))',
    )
    expect(track).toContain('height: var(--pb-track-height)')
    expect(track).toContain('border-radius: var(--pb-track-radius)')
    // 居中用「中心偏移量」而非 top:50% + translateY(-50%)：后者会让 1px 轨道
    // 落在半像素上、被摊成两行各 50%（视觉回归实测：#616161 被摊成 #A9A9A9）
    expect(track).toContain('top: calc((var(--pb-min-height) - var(--pb-track-height)) / 2)')
    expect(track).not.toContain('translateY(-50%)')
    expect(track).toContain('width: 100%')
  })

  it('不确定态滑块宽 = 40% / 60%（SetProgressBarIndicatorWidth），初值不可见', () => {
    expect(rules.get('.fui-pb__slide') ?? '').toContain('opacity: 0')
    expect(rules.get('.fui-pb__slide--one') ?? '').toContain('width: 40%')
    expect(rules.get('.fui-pb__slide--two') ?? '').toContain('width: 60%')
  })

  it('Indeterminate：轨道与确定态填充隐藏，滑块可见并按 2s 循环播放', () => {
    expect(rules.get(".fui-pb[data-state='indeterminate'] .fui-pb__track") ?? '').toContain(
      'opacity: 0',
    )
    expect(rules.get(".fui-pb[data-state='indeterminate'] .fui-pb__fill") ?? '').toContain(
      'opacity: 0',
    )
    expect(
      rules.get(".fui-pb[data-state='indeterminate'][data-status='normal'] .fui-pb__slide") ?? '',
    ).toContain('opacity: 1')
    expect(
      rules.get(".fui-pb[data-state='indeterminate'][data-status='normal'] .fui-pb__slide--one") ??
        '',
    ).toContain('animation: fui-pb-slide-one 2s var(--curveEasyEase) infinite')
    expect(
      rules.get(".fui-pb[data-state='indeterminate'][data-status='normal'] .fui-pb__slide--two") ??
        '',
    ).toContain('animation: fui-pb-slide-two 2s var(--curveEasyEase) infinite')
  })

  it('Indeterminate 关键帧：滑块 1 在 1.5s（75%）走到 300% 后保持，滑块 2 在 0.75s（37.5%）起步', () => {
    expect(readKeyframes('fui-pb-slide-one')).toBe(
      '0% { transform: translateX(-100%); } 75% { transform: translateX(300%); } 100% { transform: translateX(300%); }',
    )
    expect(readKeyframes('fui-pb-slide-two')).toBe(
      '0% { transform: translateX(-150%); } 37.5% { transform: translateX(-150%); } 100% { transform: translateX(166%); }',
    )
  })

  it('IndeterminatePaused / IndeterminateError：100% 宽指示条滑入并停在满格（750ms）', () => {
    for (const status of ['paused', 'error']) {
      const slide =
        rules.get(
          `.fui-pb[data-state='indeterminate'][data-status='${status}'] .fui-pb__slide--two`,
        ) ?? ''
      expect(slide).toContain('width: 100%')
      expect(slide).toContain('opacity: 1')
      expect(slide).toContain('animation: fui-pb-park 750ms var(--curveDecelerateMid) both')
      expect(slide).toContain('transform: translateX(0)')
    }
    expect(readKeyframes('fui-pb-park')).toBe(
      '0% { transform: translateX(-90%); } 100% { transform: translateX(0); }',
    )
  })

  it('paused / error 配色：SystemFillColorCaution / SystemFillColorCritical 各取语义位最近 token', () => {
    expect(
      rules.get(".fui-pb[data-state='determinate'][data-status='paused'] .fui-pb__fill") ?? '',
    ).toContain('background-color: var(--colorPaletteYellowForeground1)')
    expect(
      rules.get(".fui-pb[data-state='determinate'][data-status='error'] .fui-pb__fill") ?? '',
    ).toContain('background-color: var(--colorStatusDangerForeground3)')
    // 不确定态的 paused / error 落在滑块 2 上
    expect(
      rules.get(".fui-pb[data-state='indeterminate'][data-status='paused'] .fui-pb__slide--two") ??
        '',
    ).toContain('background-color: var(--colorPaletteYellowForeground1)')
    expect(
      rules.get(".fui-pb[data-state='indeterminate'][data-status='error'] .fui-pb__slide--two") ??
        '',
    ).toContain('background-color: var(--colorStatusDangerForeground3)')
  })

  it('确定态 value 变化：宽度过渡；paused / error 变色：ColorAnimation 167ms → durationFast', () => {
    const fill = rules.get('.fui-pb__fill') ?? ''
    expect(fill).toContain('width var(--durationNormal) var(--curveEasyEase)')
    expect(fill).toContain('background-color var(--durationFast) var(--curveEasyEase)')
  })

  it('disabled：前景降级 …Disabled 档（本库约定）', () => {
    expect(rules.get('.fui-pb[data-disabled]') ?? '').toContain(
      'color: var(--colorNeutralForegroundDisabled)',
    )
  })

  it('动效尊重系统减弱：关闭过渡与动画，且留下可见静态形态（不留空白条）', () => {
    expect(rules.get('.fui-pb__fill') ?? '').toContain('transition: none')
    const slideOne =
      rules.get(".fui-pb[data-state='indeterminate'][data-status='normal'] .fui-pb__slide--one") ??
      ''
    expect(slideOne).toContain('animation: none')
    expect(slideOne).toContain('transform: translateX(0)')
    for (const status of ['paused', 'error']) {
      expect(
        rules.get(
          `.fui-pb[data-state='indeterminate'][data-status='${status}'] .fui-pb__slide--two`,
        ) ?? '',
      ).toContain('animation: none')
    }
  })

  it('样式块不含硬编码色值（只允许 currentColor / var(--Token)）', () => {
    const styleText = readStyleText()
    const colors = styleText.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g) ?? []
    expect(colors).toEqual([])
  })
})

describe('FluereProgressBar i18n（不确定态可访问名）', () => {
  it('determinate 无 label 时不补缺省名', () => {
    const wrapper = mount(FluereProgressBar)
    expect(wrapper.get('[role="progressbar"]').attributes('aria-label')).toBeUndefined()
    wrapper.unmount()
  })

  it('indeterminate 无 label 时取内置缺省 zh-Hans：加载中', () => {
    const wrapper = mount(FluereProgressBar, { props: { indeterminate: true } })
    expect(wrapper.get('[role="progressbar"]').attributes('aria-label')).toBe('加载中')
    wrapper.unmount()
  })

  it('FluereConfigProvider locale=en 时不确定态取英文侧', () => {
    const wrapper = mount(FluereConfigProvider, {
      props: { locale: 'en' },
      slots: { default: () => h(FluereProgressBar, { indeterminate: true }) },
    })
    expect(wrapper.get('[role="progressbar"]').attributes('aria-label')).toBe('Loading')
    wrapper.unmount()
  })

  it('显式 label 压过 locale', () => {
    const wrapper = mount(FluereConfigProvider, {
      props: { locale: 'en' },
      slots: {
        default: () => h(FluereProgressBar, { indeterminate: true, label: '同步中' }),
      },
    })
    expect(wrapper.get('[role="progressbar"]').attributes('aria-label')).toBe('同步中')
    wrapper.unmount()
  })
})
