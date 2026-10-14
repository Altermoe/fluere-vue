/* oxlint-disable prefer-named-capture-group, no-magic-numbers -- 样式契约测试要读 SFC 源码做文本解析，正则与下标属测试细节 */
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import FluereToggleSwitch from './toggle-switch.vue'
import toggleSfc from './toggle-switch.vue?raw'

/**
 * 从 SFC 的 `<style>` 块解析出「选择器 → 声明」，用于断言状态样式。
 *
 * jsdom 不解析 CSS 自定义属性（var()），拿不到可靠的计算样式，所以这里退一步
 * 断言声明本身——守住曾经跑偏的 WinUI 还原规则。
 *
 * 对照来源：WinUI 3（Windows App SDK 1.8）
 *   src/controls/dev/CommonStyles/ToggleSwitch_themeresources.xaml
 */
/**
 * 派发指针事件（jsdom 下 PointerEvent 的 clientX 在 MouseEvent 上不可写，
 * 直接用构造器走 `window.PointerEvent`；若环境无 PointerEvent 则回退到
 * MouseEvent + Object.defineProperty 补齐只读字段）。
 */
const pointer = (el: HTMLElement, opts: { type: string; pointerId: number; clientX: number }) => {
  const { type, pointerId, clientX } = opts
  const Ctor = (globalThis as unknown as { PointerEvent?: typeof PointerEvent }).PointerEvent
  if (Ctor) {
    el.dispatchEvent(new Ctor(type, { pointerId, clientX, bubbles: true, cancelable: true }))
    return
  }
  const ev = new MouseEvent(type, { bubbles: true, cancelable: true })
  Object.defineProperty(ev, 'pointerId', { value: pointerId })
  Object.defineProperty(ev, 'clientX', { value: clientX })
  el.dispatchEvent(ev)
}

const readStyleRules = (): Map<string, string> => {
  const styleBlock = /<style[^>]*>(?<css>[\s\S]*?)<\/style>/.exec(toggleSfc)?.groups?.css ?? ''
  const rules = new Map<string, string>()
  for (const block of styleBlock.replace(/\/\*[\s\S]*?\*\//g, '').split('}')) {
    const [selectorText, declarations] = block.split('{')
    if (selectorText !== undefined && declarations !== undefined) {
      for (const selector of selectorText.split(',')) {
        rules.set(selector.replace(/\s+/g, ' ').trim(), declarations.replace(/\s+/g, ' ').trim())
      }
    }
  }
  return rules
}

describe('FluereToggleSwitch 渲染契约', () => {
  it('渲染为 role=switch 的可交互根节点，含轨道/滑块/标签', () => {
    const wrapper = mount(FluereToggleSwitch, { slots: { default: '夜间模式' } })
    const root = wrapper.get('[role="switch"]')
    expect(root.classes()).toContain('fui-switch')
    expect(wrapper.find('.fui-switch__track').exists()).toBe(true)
    expect(wrapper.find('.fui-switch__rail').exists()).toBe(true)
    expect(wrapper.find('.fui-switch__thumb').exists()).toBe(true)
    expect(wrapper.get('.fui-switch__label').text()).toBe('夜间模式')
  })

  it('默认 unchecked：data-state=unchecked + aria-checked=false，滑块位移 0', () => {
    const wrapper = mount(FluereToggleSwitch)
    const root = wrapper.get('[role="switch"]')
    expect(root.attributes('data-state')).toBe('unchecked')
    expect(root.attributes('aria-checked')).toBe('false')
    expect(wrapper.get('.fui-switch__rail').attributes('style')).toContain(
      'translateX(calc(var(--travel) * 0))',
    )
  })

  it('checked：data-state=checked + aria-checked=true，滑块位移 1', () => {
    const wrapper = mount(FluereToggleSwitch, { props: { modelValue: true } })
    const root = wrapper.get('[role="switch"]')
    expect(root.attributes('data-state')).toBe('checked')
    expect(root.attributes('aria-checked')).toBe('true')
    expect(wrapper.get('.fui-switch__rail').attributes('style')).toContain(
      'translateX(calc(var(--travel) * 1))',
    )
  })

  it('size 透传为 data-size（默认 medium）', () => {
    const wrapper = mount(FluereToggleSwitch, { props: { size: 'large' } })
    expect(wrapper.get('[role="switch"]').attributes('data-size')).toBe('large')
    expect(mount(FluereToggleSwitch).get('[role="switch"]').attributes('data-size')).toBe('medium')
  })

  it('on/off 内容插槽随状态交叉淡入（data-state 切换）', async () => {
    const wrapper = mount(FluereToggleSwitch, {
      props: { modelValue: false },
      slots: { 'on-content': '开', 'off-content': '关' },
    })
    const root = wrapper.get('[role="switch"]')
    expect(wrapper.get('.fui-switch__off-content').text()).toBe('关')
    expect(wrapper.get('.fui-switch__on-content').text()).toBe('开')
    await wrapper.setProps({ modelValue: true })
    expect(root.attributes('data-state')).toBe('checked')
  })

  it('点击切换：emit update:modelValue true', async () => {
    const wrapper = mount(FluereToggleSwitch, { props: { modelValue: false } })
    await wrapper.get('[role="switch"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.pop()).toEqual([true])
  })

  it('键盘 Space/Enter 切换、◀ 关 ▶ 开', async () => {
    const wrapper = mount(FluereToggleSwitch, { props: { modelValue: false } })
    const root = wrapper.get('[role="switch"]')
    await root.trigger('keydown', { key: ' ' })
    expect(wrapper.emitted('update:modelValue')?.pop()).toEqual([true])
    await root.trigger('keydown', { key: 'ArrowLeft' })
    expect(wrapper.emitted('update:modelValue')?.pop()).toEqual([false])
    await root.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.emitted('update:modelValue')?.pop()).toEqual([true])
  })

  it('按下即 active（data-pressed 出现，滑块原地增宽），松开+点击后切换并清除', async () => {
    const wrapper = mount(FluereToggleSwitch, { props: { modelValue: false } })
    const el = wrapper.get('[role="switch"]').element as HTMLElement
    pointer(el, { type: 'pointerdown', pointerId: 1, clientX: 0 })
    await nextTick()
    expect(wrapper.get('[role="switch"]').attributes('data-pressed')).toBeDefined()
    pointer(el, { type: 'pointerup', pointerId: 1, clientX: 0 })
    await wrapper.get('[role="switch"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.pop()).toEqual([true])
    expect(wrapper.get('[role="switch"]').attributes('data-pressed')).toBeUndefined()
  })

  it('拖拽：按下即 data-pressed；位移过阈值进入 data-dragging', async () => {
    const wrapper = mount(FluereToggleSwitch, { props: { modelValue: false } })
    const el = wrapper.get('[role="switch"]').element as HTMLElement
    pointer(el, { type: 'pointerdown', pointerId: 1, clientX: 0 })
    pointer(el, { type: 'pointermove', pointerId: 1, clientX: 20 }) // 过阈值 → 拖拽
    await nextTick()
    const root = wrapper.get('[role="switch"]')
    expect(root.attributes('data-dragging')).toBeDefined()
    expect(root.attributes('data-pressed')).toBeDefined()
  })

  it('disabled：data-disabled + 交互不切换', async () => {
    const wrapper = mount(FluereToggleSwitch, { props: { disabled: true, modelValue: false } })
    const root = wrapper.get('[role="switch"]')
    expect(root.attributes('disabled')).toBeDefined()
    expect(root.attributes('data-disabled')).toBeDefined()
    await root.trigger('click')
    await root.trigger('keydown', { key: ' ' })
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('拖拽：位移超阈值→跟随→释放落到最近终点，且随后的 click 不二次切换', async () => {
    const wrapper = mount(FluereToggleSwitch, { props: { modelValue: false } })
    const root = wrapper.get('[role="switch"]')
    const el = root.element as HTMLElement
    pointer(el, { type: 'pointerdown', pointerId: 1, clientX: 0 })
    pointer(el, { type: 'pointermove', pointerId: 1, clientX: 30 }) // 越过 4px 阈值 → 进入拖拽
    await nextTick()
    expect(wrapper.get('[role="switch"]').attributes('data-dragging')).toBeDefined()
    pointer(el, { type: 'pointermove', pointerId: 1, clientX: 40 }) // 拉到最右
    pointer(el, { type: 'pointerup', pointerId: 1, clientX: 40 })
    await nextTick()
    await wrapper.get('[role="switch"]').trigger('click')
    // 拖拽后落到 On，随后的 click 被抑制 → 只 emit 一次 true
    expect(wrapper.emitted('update:modelValue')?.filter((val) => val[0] === true)).toHaveLength(1)
  })

  it('拖拽不足半程：释放回到 Off，不触发 On', async () => {
    const wrapper = mount(FluereToggleSwitch, { props: { modelValue: false } })
    const el = wrapper.get('[role="switch"]').element as HTMLElement
    pointer(el, { type: 'pointerdown', pointerId: 1, clientX: 0 })
    pointer(el, { type: 'pointermove', pointerId: 1, clientX: 8 }) // 刚过阈值但不足一半路程(10px)
    pointer(el, { type: 'pointerup', pointerId: 1, clientX: 8 })
    await wrapper.get('[role="switch"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('表单内 + name：补隐藏原生 checkbox input', () => {
    const wrapper = mount({
      components: { FluereToggleSwitch },
      template: '<form><FluereToggleSwitch name="dark" :model-value="true" /></form>',
    })
    const input = wrapper.get('input[type="checkbox"]')
    expect(input.attributes('name')).toBe('dark')
    expect(input.attributes('value')).toBe('on')
    expect((input.element as HTMLInputElement).checked).toBe(true)
    // 隐藏复选框仅随表单序列化，不抢 Tab / 不进无障碍树（真正的控件是 role=switch）
    expect(input.attributes('tabindex')).toBe('-1')
    expect(input.attributes('aria-hidden')).toBe('true')
  })
})

describe('FluereToggleSwitch 状态样式（WinUI 3 ToggleSwitch 契约）', () => {
  const rules = readStyleRules()

  it('轨道：medium 40×20、圆形圆角（RadiusX/Y=10）、1px 描边', () => {
    const track = rules.get('.fui-switch__track') ?? ''
    expect(track).toContain('width: var(--track-w)')
    expect(track).toContain('height: var(--track-h)')
    expect(track).toContain('border-radius: var(--borderRadiusCircular)')
    expect(track).toContain(
      'border: var(--strokeWidthThin) solid var(--colorNeutralStrokeAccessible)',
    )
  })

  it('尺寸映射：travel 16/20/24 对齐 spacing L/XL/XXL，轨道宽=2×travel', () => {
    const medium = rules.get('.fui-switch') ?? ''
    expect(medium).toContain('--travel: 20px')
    expect(medium).toContain('--track-w: 40px')
    const small = rules.get(".fui-switch[data-size='small']") ?? ''
    expect(small).toContain('--travel: 16px')
    const large = rules.get(".fui-switch[data-size='large']") ?? ''
    expect(large).toContain('--travel: 24px')
  })

  it('滑块位移走 translateX + translateX calc(var(--travel)*progress)（避免 left/right），垂直居中', () => {
    const rail = rules.get('.fui-switch__rail') ?? ''
    // 宽 = 行程 travel - 两侧描边（滑块端点不压轨道描边），translateX 走合成层。
    // 格式化（oxfmt）会把这条 calc 折成多行，故按「去掉空白后」比对，避免断言依赖排版。
    expect(rail.replace(/\s+/g, '')).toContain('width:calc(var(--travel)-2*var(--strokeWidthThin))')
    expect(rail).toContain('display: flex')
    expect(rail).toContain('align-items: center')
    expect(rail).toContain('justify-content: center')
    // 位移来源：模板内联 transform（单元测试的渲染契约已断言 calc(var(--travel) * 0|1)）
    expect(rail).toContain('transition: transform var(--durationNormal) var(--curveEasyEaseMax)')
  })

  it('拖拽中关闭过渡（跟随指针）→ data-dragging 规则 transition:none', () => {
    const dragging = rules.get('.fui-switch[data-dragging] .fui-switch__rail') ?? ''
    expect(dragging).toContain('transition: none')
  })

  it('未选中固有配色：轨道 = ControlAltFillColorSecondary、滑块 = TextFillColorSecondary', () => {
    expect(rules.get('.fui-switch__track') ?? '').toContain(
      'background-color: var(--colorNeutralBackground3)',
    )
    expect(rules.get('.fui-switch__thumb') ?? '').toContain(
      'background-color: var(--colorNeutralForeground2)',
    )
  })

  it('选中：轨道品牌色（AccentFillColorDefault）、滑块反白（TextOnAccentFillColor）', () => {
    const track = rules.get(".fui-switch[data-state='checked'] .fui-switch__track") ?? ''
    expect(track).toContain('background-color: var(--colorCompoundBrandBackground)')
    const thumb = rules.get(".fui-switch[data-state='checked'] .fui-switch__thumb") ?? ''
    expect(thumb).toContain('background-color: var(--colorNeutralForegroundOnBrand)')
  })

  it('hover：轨道暗一档 + 滑块圆点放大（clip-path 裁切，不动布局）', () => {
    const trackHover = rules.get(
      ".fui-switch:hover:not(:disabled):not([data-disabled])[data-state='unchecked'] .fui-switch__track",
    )
    expect(trackHover ?? '').toContain('background-color: var(--colorNeutralBackground4)')
    const thumbHover = rules.get(
      '.fui-switch:hover:not(:disabled):not([data-disabled]) .fui-switch__thumb',
    )
    // Hover 只改 clip-path 的裁切范围（收到 hover 圆直径），不触发布局
    expect(thumbHover ?? '').toContain('clip-path: inset(')
    expect(thumbHover ?? '').toContain('var(--thumb-scale-hover)')
    expect(thumbHover ?? '').not.toContain('transform:')
  })

  it('active：滑块仅原地变丸（固定外框 + clip-path inset(0)，零布局回流）', () => {
    // 外框恒为 pressed 尺寸、药丸圆角、常态由 clip-path 露出居中圆点
    const thumb = rules.get('.fui-switch__thumb') ?? ''
    expect(thumb).toContain('width: var(--thumb-w-pressed)')
    expect(thumb).toContain('height: var(--thumb-h-pressed)')
    expect(thumb).toContain('border-radius: calc(var(--thumb-h-pressed) / 2)')
    expect(thumb).toContain('clip-path: inset(')
    // Active 只把 clip-path 切到全露外框 → 不再改 width/height/border-radius，也无位移缩放
    const thumbPressed = rules.get(
      '.fui-switch[data-pressed]:not(:disabled):not([data-disabled]) .fui-switch__thumb',
    )
    expect(thumbPressed ?? '').toContain(
      'clip-path: inset(0 round calc(var(--thumb-h-pressed) / 2))',
    )
    expect(thumbPressed ?? '').not.toContain('width:')
    expect(thumbPressed ?? '').not.toContain('height:')
    expect(thumbPressed ?? '').not.toContain('border-radius:')
    expect(thumbPressed ?? '').not.toContain('translateX')
    expect(thumbPressed ?? '').not.toContain('scaleX')
    // 药丸延长边直线段：standard 下 pressWidth - pressHeight = 19 - 14 = 5px，且不出轨道
    const medium = rules.get('.fui-switch') ?? ''
    expect(medium).toContain('--thumb-w-pressed: 19px')
    expect(medium).toContain('--thumb-h-pressed: 14px')
    expect(medium).toContain('--travel: 20px') // Active 宽 19 < travel 20 → 不出 rail/轨道
    // 三档 active 宽度都小于各自 travel（15/19/23 < 16/20/24），天然无法离开轨道区域
    expect(rules.get(".fui-switch[data-size='small']") ?? '').toContain('--thumb-w-pressed: 15px')
    expect(rules.get(".fui-switch[data-size='large']") ?? '').toContain('--thumb-w-pressed: 23px')
  })

  it('disabled：全套 …Disabled 档', () => {
    const trackDisabled = rules.get('.fui-switch:disabled .fui-switch__track') ?? ''
    expect(trackDisabled).toContain('background-color: var(--colorNeutralBackgroundDisabled)')
    expect(trackDisabled).toContain('border-color: var(--colorNeutralStrokeDisabled)')
    expect(rules.get('.fui-switch:disabled') ?? '').toContain(
      'color: var(--colorNeutralForegroundDisabled)',
    )
    expect(rules.get('.fui-switch:disabled .fui-switch__thumb') ?? '').toContain(
      'background-color: var(--colorNeutralForegroundDisabled)',
    )
  })

  it('focus：a11y focus ring（strokeWidthThick + colorCompoundBrandStroke）', () => {
    const focus = rules.get('.fui-switch:focus-visible') ?? ''
    expect(focus).toContain(
      'outline: var(--strokeWidthThick) solid var(--colorCompoundBrandStroke)',
    )
  })

  it('布局优化：will-change 仅拖拽时启用、常态关闭；transition 留中间态', () => {
    // 常态 rail/thumb 不带常驻 will-change（拖拽时由内联 style 注入）
    expect(rules.get('.fui-switch__thumb') ?? '').toContain('will-change: auto')
    expect((rules.get('.fui-switch__rail') ?? '').includes('will-change')).toBe(false)
    expect((rules.get('.fui-switch__thumb') ?? '').includes('position')).toBe(false)
  })
})
