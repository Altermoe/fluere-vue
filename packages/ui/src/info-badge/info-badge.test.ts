/* oxlint-disable prefer-named-capture-group, no-magic-numbers -- 样式契约测试要读 SFC 源码做文本解析，正则与下标属测试细节 */
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import {
  INFO_BADGE_ICON_MARGIN,
  INFO_BADGE_ICON_SIZE,
  INFO_BADGE_MAX_HEIGHT,
  INFO_BADGE_MIN_SIZE,
  INFO_BADGE_SEVERITY_BRUSH,
  INFO_BADGE_SEVERITY_ICONS,
  INFO_BADGE_VALUE_FONT_SIZE,
  INFO_BADGE_VALUE_MARGIN,
} from './constants'
import FluereInfoBadge from './info-badge.vue'
import infoBadgeSfc from './info-badge.vue?raw'

/**
 * 从 SFC 的 `<style>` 块解析出「选择器 → 声明」，用于断言状态样式。
 *
 * jsdom 不解析 CSS 自定义属性（var()），拿不到可靠的计算样式，所以这里退一步
 * 断言声明本身——守住 WinUI 还原规则（几何、配色、形态推导）。
 * 解析规则与 `infobar.test.ts` / `progress-bar.test.ts` 保持一致。
 *
 * 对照来源：WinUI 3（microsoft-ui-xaml，`InfoBadge` 目录在 winui3/release/2.0.1 与
 * winui3/release/2.5.1 之间逐字节一致）
 *   src/controls/dev/InfoBadge/InfoBadge.xaml
 *   src/controls/dev/InfoBadge/InfoBadge_themeresources.xaml
 *   src/controls/dev/InfoBadge/InfoBadge.cpp
 *   src/controls/dev/InfoBadge/InfoBadge.idl
 */
const readStyleText = (): string =>
  (/<style[^>]*>(?<css>[\s\S]*?)<\/style>/.exec(infoBadgeSfc)?.groups?.css ?? '').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  )

const readStyleRules = (): Map<string, string> => {
  const rules = new Map<string, string>()
  const blocks = readStyleText()
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

const rules = readStyleRules()

describe('FluereInfoBadge 几何常量（对齐 InfoBadge_themeresources.xaml）', () => {
  it('Min / Max / 字号 / 外边距逐项对齐 WinUI 资源值', () => {
    expect(INFO_BADGE_MIN_SIZE).toBe(4) // InfoBadgeMinWidth / InfoBadgeMinHeight
    expect(INFO_BADGE_MAX_HEIGHT).toBe(16) // InfoBadgeMaxHeight
    expect(INFO_BADGE_VALUE_FONT_SIZE).toBe(11) // InfoBadgeValueFontSize
    expect(INFO_BADGE_ICON_MARGIN).toBe(4) // IconInfoBadgeIconMargin = 4,4,4,4
    expect(INFO_BADGE_VALUE_MARGIN).toEqual({ left: 4, top: 0, right: 4, bottom: 2 }) // ValueInfoBadgeTextMargin
  })

  it('图标框 = MaxHeight − 4×2 = 8（Viewbox 撑满「最大高 − 内外边距」）', () => {
    expect(INFO_BADGE_ICON_SIZE).toBe(INFO_BADGE_MAX_HEIGHT - INFO_BADGE_ICON_MARGIN * 2)
    expect(INFO_BADGE_ICON_SIZE).toBe(8)
  })

  it('Style 块里的局部变量与常量层逐一对应', () => {
    const root = rules.get('.fui-info-badge') ?? ''
    expect(root).toContain(`--fui-info-badge-min-size: ${INFO_BADGE_MIN_SIZE}px`)
    expect(root).toContain(`--fui-info-badge-max-height: ${INFO_BADGE_MAX_HEIGHT}px`)
    expect(root).toContain(`--fui-info-badge-value-font-size: ${INFO_BADGE_VALUE_FONT_SIZE}px`)
    expect(root).toContain(`--fui-info-badge-icon-margin: ${INFO_BADGE_ICON_MARGIN}px`)
    expect(root).toContain(`--fui-info-badge-icon-size: ${INFO_BADGE_ICON_SIZE}px`)
  })
})

describe('FluereInfoBadge 形态推导（对齐 InfoBadge.cpp#OnDisplayKindPropertiesChanged）', () => {
  it('缺省 Value=-1 且无图标 ⇒ Dot', () => {
    const wrapper = mount(FluereInfoBadge)
    expect(wrapper.get('.fui-info-badge').attributes('data-display-kind')).toBe('dot')
    expect(wrapper.get('.fui-info-badge').attributes('data-severity')).toBe('accent')
    expect(wrapper.find('.fui-info-badge__value').exists()).toBe(false)
    expect(wrapper.find('.fui-info-badge__icon').exists()).toBe(false)
  })

  it('Value >= 0 ⇒ Value 形态，渲染数字', () => {
    const wrapper = mount(FluereInfoBadge, { props: { value: 0 } })
    expect(wrapper.get('.fui-info-badge').attributes('data-display-kind')).toBe('value')
    expect(wrapper.get('.fui-info-badge__value').text()).toBe('0')
  })

  it('Value 优先于图标（对齐 if / else if 顺序）', () => {
    const wrapper = mount(FluereInfoBadge, {
      props: { value: 10, icon: true, severity: 'success' },
    })
    expect(wrapper.get('.fui-info-badge').attributes('data-display-kind')).toBe('value')
    expect(wrapper.find('.fui-info-badge__icon').exists()).toBe(false)
  })

  it('icon=true ⇒ 取 severity 的内建字形（Icon 形态）', () => {
    const wrapper = mount(FluereInfoBadge, { props: { severity: 'critical', icon: true } })
    expect(wrapper.get('.fui-info-badge').attributes('data-display-kind')).toBe('icon')
    expect(wrapper.find('.fui-info-badge__icon svg').exists()).toBe(true)
  })

  it('icon=true 但 severity=accent ⇒ 没有内建字形（WinUI 无 AccentIconInfoBadgeStyle）', () => {
    const wrapper = mount(FluereInfoBadge, { props: { icon: true } })
    expect(wrapper.get('.fui-info-badge').attributes('data-display-kind')).toBe('dot')
  })

  it('icon 传组件 ⇒ 直接作为图标（对齐显式设置 IconSource）', () => {
    const Custom = () => h('svg', { 'data-test': 'custom' })
    const wrapper = mount(FluereInfoBadge, { props: { icon: Custom } })
    expect(wrapper.get('.fui-info-badge').attributes('data-display-kind')).toBe('icon')
    expect(wrapper.find('[data-test="custom"]').exists()).toBe(true)
  })

  it('icon=null / false ⇒ 无图标（Dot）', () => {
    expect(
      mount(FluereInfoBadge, { props: { icon: null } })
        .get('.fui-info-badge')
        .attributes('data-display-kind'),
    ).toBe('dot')
    expect(
      mount(FluereInfoBadge, { props: { icon: false } })
        .get('.fui-info-badge')
        .attributes('data-display-kind'),
    ).toBe('dot')
  })

  it('#icon 插槽优先于 icon Prop，且提供插槽即进入 Icon 形态', () => {
    const wrapper = mount(FluereInfoBadge, {
      props: { severity: 'accent', icon: true },
      slots: { icon: '<i data-test="slot-icon"></i>' },
    })
    expect(wrapper.get('.fui-info-badge').attributes('data-display-kind')).toBe('icon')
    expect(wrapper.find('[data-test="slot-icon"]').exists()).toBe(true)
    expect(wrapper.find('.fui-info-badge__icon svg').exists()).toBe(false)
  })

  it('Value < -1 按 < 0 处理（WinUI 抛 hresult_out_of_bounds，本库回落到 Dot）', () => {
    const wrapper = mount(FluereInfoBadge, { props: { value: -5 } })
    expect(wrapper.get('.fui-info-badge').attributes('data-display-kind')).toBe('dot')
  })
})

describe('FluereInfoBadge 可访问性（对齐「InfoBadge 不进 UIA 树」）', () => {
  it('缺省是装饰元素：aria-hidden、不进 Tab 序、无 role', () => {
    const wrapper = mount(FluereInfoBadge)
    const root = wrapper.get('.fui-info-badge')
    expect(root.attributes('aria-hidden')).toBe('true')
    expect(root.attributes('role')).toBeUndefined()
    expect(root.attributes('tabindex')).toBeUndefined()
  })

  it('传 label 时渲染 role=img + aria-label，并撤掉 aria-hidden', () => {
    const wrapper = mount(FluereInfoBadge, { props: { label: '收件箱，5 条通知' } })
    const root = wrapper.get('.fui-info-badge')
    expect(root.attributes('role')).toBe('img')
    expect(root.attributes('aria-label')).toBe('收件箱，5 条通知')
    expect(root.attributes('aria-hidden')).toBeUndefined()
  })

  it('label 为空串时不渲染 role / aria-label（视同未提供）', () => {
    const wrapper = mount(FluereInfoBadge, { props: { label: '' } })
    expect(wrapper.get('.fui-info-badge').attributes('role')).toBeUndefined()
    expect(wrapper.get('.fui-info-badge').attributes('aria-hidden')).toBe('true')
  })

  it('组件不硬编码任何自然语言文案（i18n 通道属 0.3.0 目标 1.4）', () => {
    // 只允许注释里出现中文，模板 / 脚本里不得出现面向用户的文案
    const template = /<template>([\s\S]*?)<\/template>/.exec(infoBadgeSfc)?.[1] ?? ''
    expect(/[\u4E00-\u9FFF]/.test(template.replace(/<!--[\s\S]*?-->/g, ''))).toBe(false)
  })
})

describe('FluereInfoBadge 圆角（对齐 InfoBadge.cpp#OnSizeChanged）', () => {
  it('缺省走 borderRadiusCircular（= ActualHeight / 2 的等价几何）', () => {
    expect(rules.get('.fui-info-badge')).toContain(
      'border-radius: var(--fui-info-badge-radius, var(--borderRadiusCircular))',
    )
  })

  it('传 borderRadius 时写进局部变量，覆盖掉全圆角默认值', () => {
    const wrapper = mount(FluereInfoBadge, { props: { borderRadius: 'var(--borderRadiusSmall)' } })
    expect(wrapper.get('.fui-info-badge').attributes('style')).toContain(
      '--fui-info-badge-radius: var(--borderRadiusSmall)',
    )

    const plain = mount(FluereInfoBadge)
    expect(plain.get('.fui-info-badge').attributes('style')).toBeUndefined()
  })
})

describe('FluereInfoBadge 样式契约（对齐 InfoBadge.xaml 模板与资源）', () => {
  it('根节点几何：inline-flex 居中 + Min/Max + box-sizing', () => {
    const root = rules.get('.fui-info-badge') ?? ''
    expect(root).toContain('display: inline-flex')
    expect(root).toContain('align-items: center')
    expect(root).toContain('justify-content: center')
    expect(root).toContain('box-sizing: border-box')
    expect(root).toContain('min-inline-size: var(--fui-info-badge-min-size)')
    expect(root).toContain('min-block-size: var(--fui-info-badge-min-size)')
    expect(root).toContain('max-block-size: var(--fui-info-badge-max-height)')
    // 没有 MaxWidth：宽度由内容决定（InfoBadge 只设了 MaxHeight）
    expect(root).not.toContain('max-inline-size')
  })

  it('MeasureOverride 的「窄于高则取正方形」落在 Value / Icon 两态', () => {
    // 解析器把逗号分隔的选择器拆成多键，这里逐个断言
    for (const kind of ['value', 'icon']) {
      expect(
        rules.get(`.fui-info-badge[data-display-kind='${kind}']`),
        `${kind} 态缺少正方形规则`,
      ).toContain('min-inline-size: var(--fui-info-badge-max-height)')
    }
    // Dot 态不做处理：它的高就是 MinHeight，与 MinWidth 相等
    expect(rules.get(".fui-info-badge[data-display-kind='dot']")).toBeUndefined()
  })

  it('六套 Severity 底色逐档映射到语义 token（含覆盖口子）', () => {
    const compound =
      'background-color: var(--fui-info-badge-bg, var(--colorCompoundBrandBackground))'
    expect(rules.get(".fui-info-badge[data-severity='accent']")).toContain(compound)
    expect(rules.get(".fui-info-badge[data-severity='attention']")).toContain(compound)
    expect(rules.get(".fui-info-badge[data-severity='informational']")).toContain(
      'background-color: var(--fui-info-badge-bg, var(--colorNeutralForeground4))',
    )
    expect(rules.get(".fui-info-badge[data-severity='success']")).toContain(
      'background-color: var(--fui-info-badge-bg, var(--colorStatusSuccessForeground3))',
    )
    expect(rules.get(".fui-info-badge[data-severity='caution']")).toContain(
      'background-color: var(--fui-info-badge-bg, var(--colorPaletteYellowForeground1))',
    )
    expect(rules.get(".fui-info-badge[data-severity='critical']")).toContain(
      'background-color: var(--fui-info-badge-bg, var(--colorStatusDangerForeground3))',
    )
  })

  it('前景映射 TextOnAccentFillColorPrimaryBrush → colorNeutralForegroundInverted2', () => {
    expect(rules.get('.fui-info-badge')).toContain(
      'color: var(--fui-info-badge-fg, var(--colorNeutralForegroundInverted2))',
    )
  })

  it('Value 文本：字号 11 + 行高 token + ValueInfoBadgeTextMargin', () => {
    const value = rules.get('.fui-info-badge__value') ?? ''
    expect(value).toContain('font-size: var(--fui-info-badge-value-font-size)')
    expect(value).toContain('line-height: var(--lineHeightBase100)')
    expect(value).toContain('margin-inline: var(--fui-info-badge-value-margin-inline)')
    expect(value).toContain('margin-block-end: var(--fui-info-badge-value-margin-block-end)')
    expect(value).toContain('white-space: nowrap')
  })

  it('图标容器：8×8 的 Viewbox 等价物 + 4px 外边距 + 子 svg 等比填满', () => {
    const icon = rules.get('.fui-info-badge__icon') ?? ''
    expect(icon).toContain('display: flex')
    expect(icon).toContain('inline-size: var(--fui-info-badge-icon-size)')
    expect(icon).toContain('block-size: var(--fui-info-badge-icon-size)')
    expect(icon).toContain('margin: var(--fui-info-badge-icon-margin)')

    const svg = rules.get('.fui-info-badge__icon :deep(svg)') ?? ''
    expect(svg).toContain('inline-size: 100%')
    expect(svg).toContain('block-size: 100%')
  })

  it('没有硬编码色值 / 无过渡动画（WinUI 六个 Style 都是瞬时状态跳转）', () => {
    const css = readStyleText()
    expect(/#[0-9a-f]{3,8}\b/i.test(css)).toBe(false)
    expect(/rgba?\(/i.test(css)).toBe(false)
    expect(/transition/.test(css)).toBe(false)
    expect(/animation/.test(css)).toBe(false)
  })

  it('所有视觉值要么是 token 变量，要么是带 WinUI 资源名的局部变量', () => {
    // 采集所有 px 字面量，逐个确认来自 --fui-info-badge-* 局部变量定义
    const literals = [...readStyleText().matchAll(/:\s*([^;{}]*\d+px[^;{}]*)/g)].map((m) =>
      m[1].trim(),
    )
    for (const literal of literals) {
      const allowed = literal.includes('var(--') || /^[0-9.]+px$/.test(literal)
      expect(allowed, `未变量化的 px 字面量：${literal}`).toBe(true)
    }
  })
})

describe('FluereInfoBadge Severity 字形映射（对齐 *IconInfoBadgeStyle 的预置 IconSource）', () => {
  it('五档都有内建字形，值都是组件', () => {
    expect(Object.keys(INFO_BADGE_SEVERITY_ICONS).sort()).toEqual([
      'attention',
      'caution',
      'critical',
      'informational',
      'success',
    ])
    for (const icon of Object.values(INFO_BADGE_SEVERITY_ICONS)) {
      expect(icon).toBeTruthy()
    }
  })

  it('accent 没有内建字形（WinUI 无 AccentIconInfoBadgeStyle）', () => {
    expect(Object.keys(INFO_BADGE_SEVERITY_BRUSH)).toContain('accent')
    expect(Object.keys(INFO_BADGE_SEVERITY_ICONS)).not.toContain('accent')
  })

  it('底色资源名与 InfoBadge_themeresources.xaml 的六套 Style 一一对应', () => {
    expect(INFO_BADGE_SEVERITY_BRUSH).toEqual({
      accent: 'AccentFillColorDefaultBrush',
      attention: 'SystemFillColorAttentionBrush',
      informational: 'SystemFillColorSolidNeutralBrush',
      success: 'SystemFillColorSuccessBrush',
      caution: 'SystemFillColorCautionBrush',
      critical: 'SystemFillColorCriticalBrush',
    })
  })

  it('informational 用 regular（WinUI 的 F13F 是裸字形，Fluent 无裸 i 可选）', () => {
    const rendered = mount(FluereInfoBadge, { props: { severity: 'informational', icon: true } })
    const svg = rendered.get('.fui-info-badge__icon svg')
    // data-icon-name 由 @fluere-vue/icons 的工厂写入，可反向确认选中的是哪个图标
    expect(svg.attributes('data-icon-name')).toBe('info')
    // filled 版本是「实心圆 + 镂空 i」（路径以整圆起手），用它会让前景/底色关系反过来；
    // regular 版本是「细圆环 + i」，i 仍是白色前景 —— 只有「多一圈 1 单位细环」这一处偏差
    const path = svg.get('path').attributes('d') ?? ''
    expect(path.startsWith('M8 1a7 7 0 1 1 0 14')).toBe(false)
    expect(path).toContain('M8.5 7.5a.5.5 0 1 0-1 0v3') // i 的竖笔
  })
})
