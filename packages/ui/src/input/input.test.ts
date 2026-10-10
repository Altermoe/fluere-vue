/* oxlint-disable prefer-named-capture-group, no-magic-numbers -- 样式契约测试要读 SFC 源码做文本解析，正则与下标属测试细节 */
import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { h, nextTick } from 'vue'
import FluereConfigProvider from '../config-provider/config-provider.vue'
import FluereInput from './input.vue'
import inputSfc from './input.vue?raw'

/**
 * 从 SFC 的 `<style>` 块解析出「选择器 → 声明」，用于断言状态样式。
 *
 * jsdom 不解析 CSS 自定义属性（var()），拿不到可靠的计算样式，所以这里退一步
 * 断言声明本身——守住「focus 只有底边高亮」这类曾经跑偏的 WinUI 还原规则。
 *
 * 对照来源：WinUI 3 / Windows App SDK 2.5.1（tag winui3/release/2.5.1）
 *   src/controls/dev/CommonStyles/TextBox_themeresources.xaml
 *   src/controls/dev/CommonStyles/PasswordBox_themeresources.xaml
 *   src/controls/dev/CommonStyles/Common_themeresources.xaml
 */
const readStyleRules = (): Map<string, string> => {
  const styleBlock = /<style[^>]*>(?<css>[\s\S]*?)<\/style>/.exec(inputSfc)?.groups?.css ?? ''
  const rules = new Map<string, string>()
  for (const block of styleBlock.replace(/\/\*[\s\S]*?\*\//g, '').split('}')) {
    const [selectorText, declarations] = block.split('{')
    if (selectorText !== undefined && declarations !== undefined) {
      for (const selector of selectorText.split(',')) {
        rules.set(selector.trim(), declarations.replace(/\s+/g, ' ').trim())
      }
    }
  }
  return rules
}

/**
 * jsdom 不做布局：`clientWidth` 恒为 0，显示按钮的 5em 判定会永远不通过。
 * 这里按测试需要把它钉成固定值（记得在 afterEach 里删掉自有属性，恢复原型上的实现）。
 */
const stubClientWidth = (width: number): void => {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get: () => width,
  })
}

const restoreClientWidth = (): void => {
  Reflect.deleteProperty(HTMLElement.prototype, 'clientWidth')
}

/** 派发可取消的事件并返回它，用于断言 preventDefault（复制 / 剪切 / 拖拽拦截） */
const dispatchCancelable = (element: Element, type: string): Event => {
  const event = new Event(type, { bubbles: true, cancelable: true })
  element.dispatchEvent(event)
  return event
}

/** 模拟浏览器把用户输入写进输入框后再派发 input（jsdom 没有真实编辑行为） */
const simulateTyping = async (
  wrapper: ReturnType<typeof mount>,
  nextValue: string,
): Promise<void> => {
  const element = wrapper.get('input').element as HTMLInputElement
  element.value = nextValue
  element.dispatchEvent(new Event('input', { bubbles: true }))
  await nextTick()
}

afterEach(() => {
  restoreClientWidth()
})

/**
 * 受控的掩码输入框：显式给 `modelValue` 并吞掉更新事件，用于断言「反推出的真值」
 * （非受控的回写行为由「输入」用例单独覆盖）。
 */
const mountMasked = (modelValue = ''): ReturnType<typeof mount> =>
  mount(FluereInput, {
    props: {
      'type': 'password',
      'passwordChar': '#',
      modelValue,
      'onUpdate:modelValue': () => {},
    },
  })

describe('FluereInput 渲染契约', () => {
  it('默认渲染 outline / medium：宿主三行结构 + 控件拿到控件类', () => {
    const wrapper = mount(FluereInput)
    expect(wrapper.get('span.fui-input').classes()).toEqual([
      'fui-input',
      'fui-input--medium',
      'fui-input--outline',
    ])
    expect(wrapper.get('input').classes()).toEqual(['fui-input__control'])
    expect(wrapper.get('input').attributes('type')).toBe('text')
  })

  it('把 size / appearance / disabled / invalid 映射到宿主类名与 aria', () => {
    const wrapper = mount(FluereInput, {
      props: {
        size: 'large',
        appearance: 'underline',
        invalid: true,
        disabled: true,
        placeholder: '姓名',
      },
    })
    const root = wrapper.get('span.fui-input')
    expect(root.classes()).toContain('fui-input--large')
    expect(root.classes()).toContain('fui-input--underline')
    expect(root.classes()).toContain('fui-input--invalid')
    expect(root.attributes('data-size')).toBe('large')
    expect(root.attributes('data-disabled')).toBeDefined()

    const input = wrapper.get('input')
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(input.attributes('disabled')).toBeDefined()
    expect(input.attributes('placeholder')).toBe('姓名')
  })

  it('透传的 attrs / 监听器落在控件上（FluereNumberBox 依赖这一点）', async () => {
    const keys: string[] = []
    const wrapper = mount(FluereInput, {
      attrs: {
        'id': 'field-id',
        'autocomplete': 'off',
        'role': 'spinbutton',
        'aria-label': '数量',
        'onKeydown': (event: KeyboardEvent) => keys.push(event.key),
      },
    })
    const root = wrapper.get('span.fui-input')
    const input = wrapper.get('input')
    expect(input.attributes('id')).toBe('field-id')
    expect(input.attributes('autocomplete')).toBe('off')
    expect(input.attributes('role')).toBe('spinbutton')
    expect(input.attributes('aria-label')).toBe('数量')
    expect(root.attributes('id')).toBeUndefined()

    await input.trigger('keydown', { key: 'ArrowUp' })
    expect(keys).toEqual(['ArrowUp'])
  })

  it('v-model 双向绑定', async () => {
    const wrapper = mount(FluereInput, { props: { modelValue: '初值' } })
    const input = wrapper.get('input')
    expect((input.element as HTMLInputElement).value).toBe('初值')
    await input.setValue('新值')
    expect(wrapper.emitted('update:modelValue')?.pop()).toEqual(['新值'])
  })
})

describe('FluereInput 标题与说明（HeaderContentPresenter / DescriptionPresenter）', () => {
  it('header：渲染在控件上方，并成为输入框的可访问名来源', () => {
    const wrapper = mount(FluereInput, { props: { header: '密码' } })
    const header = wrapper.get('.fui-input__header')
    expect(header.text()).toBe('密码')
    expect(wrapper.get('input').attributes('aria-labelledby')).toBe(header.attributes('id'))
  })

  it('description：渲染在控件下方，并挂到 aria-describedby', () => {
    const wrapper = mount(FluereInput, { props: { description: '至少 8 位' } })
    const description = wrapper.get('.fui-input__description')
    expect(description.text()).toBe('至少 8 位')
    expect(wrapper.get('input').attributes('aria-describedby')).toBe(description.attributes('id'))
  })

  it('消费方显式给了 aria-label / aria-describedby 时不覆盖', () => {
    const wrapper = mount(FluereInput, {
      props: { header: '密码', description: '至少 8 位' },
      attrs: { 'aria-label': '口令', 'aria-describedby': 'hint' },
    })
    const input = wrapper.get('input')
    expect(input.attributes('aria-labelledby')).toBeUndefined()
    expect(input.attributes('aria-label')).toBe('口令')
    expect(input.attributes('aria-describedby')).toBe('hint')
  })

  it('具名插槽可替换默认文案', () => {
    const wrapper = mount(FluereInput, {
      props: { header: '默认标题' },
      slots: { header: '<em>插槽标题</em>', description: '插槽说明' },
    })
    expect(wrapper.get('.fui-input__header').html()).toContain('插槽标题')
    expect(wrapper.get('.fui-input__description').text()).toBe('插槽说明')
  })

  it('未提供时不渲染标题 / 说明元素', () => {
    const wrapper = mount(FluereInput)
    expect(wrapper.find('.fui-input__header').exists()).toBe(false)
    expect(wrapper.find('.fui-input__description').exists()).toBe(false)
    expect(wrapper.get('span.fui-input').attributes('data-multiline')).toBeUndefined()
  })
})

describe('FluereInput 多行形态（TextBox AcceptsReturn + TextWrapping=Wrap）', () => {
  it('multiline 渲染 textarea 并带上 rows', () => {
    const wrapper = mount(FluereInput, { props: { multiline: true, rows: 5 } })
    const textarea = wrapper.get('textarea')
    expect(textarea.classes()).toEqual(['fui-input__control'])
    expect(textarea.attributes('rows')).toBe('5')
    expect(wrapper.get('span.fui-input').attributes('data-multiline')).toBeDefined()
    expect(wrapper.find('input').exists()).toBe(false)
  })

  it('multiline 缺省 rows 为 3，且 v-model 照常工作', async () => {
    const wrapper = mount(FluereInput, { props: { multiline: true } })
    const textarea = wrapper.get('textarea')
    expect(textarea.attributes('rows')).toBe('3')
    await textarea.setValue('多行\n内容')
    expect(wrapper.emitted('update:modelValue')?.pop()).toEqual(['多行\n内容'])
  })

  it('multiline 下 type="password" 不进入密码分支（textarea 没有掩码语义）', () => {
    const wrapper = mount(FluereInput, { props: { multiline: true, type: 'password' } })
    expect(wrapper.get('textarea').attributes('type')).toBeUndefined()
    expect(wrapper.find('.fui-input__reveal').exists()).toBe(false)
  })
})

describe('FluereInput 密码形态（PasswordBox）', () => {
  /** 聚焦 + 从空输入内容（WinUI：按钮只在「本次聚焦期间 空 → 非空」后出现） */
  const focusAndType = async (wrapper: ReturnType<typeof mount>, text: string): Promise<void> => {
    await wrapper.get('input').trigger('focusin')
    await simulateTyping(wrapper, text)
  }

  it('缺省走原生 type="password"，未聚焦时不渲染显示按钮', () => {
    const wrapper = mount(FluereInput, { props: { type: 'password', modelValue: 'secret' } })
    expect(wrapper.get('input').attributes('type')).toBe('password')
    expect(wrapper.find('.fui-input__reveal').exists()).toBe(false)
  })

  it('聚焦 + 有输入 + 宽度够（> 5em）时出现显示按钮，按住显示明文、松开遮蔽', async () => {
    stubClientWidth(300)
    const wrapper = mount(FluereInput, { props: { type: 'password' } })
    await focusAndType(wrapper, 'secret')

    const reveal = wrapper.get('.fui-input__reveal')
    expect(reveal.attributes('type')).toBe('button')
    expect(reveal.attributes('tabindex')).toBe('-1')
    expect(reveal.attributes('aria-label')).toBe('显示密码')
    expect(wrapper.get('span.fui-input').attributes('data-reveal')).toBeDefined()
    expect(wrapper.get('input').attributes('type')).toBe('password')

    await reveal.trigger('pointerdown')
    expect(wrapper.get('input').attributes('type')).toBe('text')
    expect(wrapper.get('span.fui-input').attributes('data-reveal-pressed')).toBeDefined()

    await reveal.trigger('pointerup')
    expect(wrapper.get('input').attributes('type')).toBe('password')
    expect(wrapper.get('span.fui-input').attributes('data-reveal-pressed')).toBeUndefined()
  })

  it('宽度不足 5em 时不出现显示按钮（WinUI ArrangeOverride）', async () => {
    stubClientWidth(60)
    const wrapper = mount(FluereInput, { props: { type: 'password' } })
    await focusAndType(wrapper, 'secret')
    expect(wrapper.find('.fui-input__reveal').exists()).toBe(false)
  })

  it('聚焦时按钮先隐藏：带着已有内容重新聚焦不算「空 → 非空」', async () => {
    stubClientWidth(300)
    const wrapper = mount(FluereInput, { props: { type: 'password', modelValue: 'secret' } })
    await wrapper.get('input').trigger('focusin')
    await simulateTyping(wrapper, 'secret2')
    expect(wrapper.find('.fui-input__reveal').exists()).toBe(false)

    // 清空后再输入才重新允许（本次聚焦期间的「空 → 非空」）
    await simulateTyping(wrapper, '')
    await simulateTyping(wrapper, 'x')
    expect(wrapper.find('.fui-input__reveal').exists()).toBe(true)
  })

  it('Alt+F8 按住显示明文、松开 F8 遮蔽（WinUI 键盘等价物）', async () => {
    const wrapper = mount(FluereInput, { props: { type: 'password', modelValue: 'secret' } })
    const input = wrapper.get('input')
    await input.trigger('keydown', { key: 'F8', altKey: true })
    expect(input.attributes('type')).toBe('text')
    await input.trigger('keyup', { key: 'F8' })
    expect(input.attributes('type')).toBe('password')
  })

  it('passwordRevealMode="visible" 恒显示明文且不出按钮；"hidden" 恒遮蔽', async () => {
    stubClientWidth(300)
    const visible = mount(FluereInput, {
      props: { type: 'password', modelValue: 'secret', passwordRevealMode: 'visible' },
    })
    await visible.get('input').trigger('focusin')
    expect(visible.get('input').attributes('type')).toBe('text')
    expect(visible.find('.fui-input__reveal').exists()).toBe(false)

    const hidden = mount(FluereInput, {
      props: { type: 'password', modelValue: 'secret', passwordRevealMode: 'hidden' },
    })
    await hidden.get('input').trigger('focusin')
    expect(hidden.get('input').attributes('type')).toBe('password')
    await hidden.get('input').trigger('keydown', { key: 'F8', altKey: true })
    expect(hidden.get('input').attributes('type')).toBe('password')
    expect(hidden.find('.fui-input__reveal').exists()).toBe(false)
  })

  it('掩码状态下拦截 copy / cut / dragstart，显示明文后放行', async () => {
    const wrapper = mount(FluereInput, { props: { type: 'password', modelValue: 'secret' } })
    const input = wrapper.get('input')
    expect(dispatchCancelable(input.element, 'copy').defaultPrevented).toBe(true)
    expect(dispatchCancelable(input.element, 'cut').defaultPrevented).toBe(true)
    expect(dispatchCancelable(input.element, 'dragstart').defaultPrevented).toBe(true)

    await wrapper.setProps({ passwordRevealMode: 'visible' })
    expect(dispatchCancelable(input.element, 'copy').defaultPrevented).toBe(false)
    expect(dispatchCancelable(input.element, 'cut').defaultPrevented).toBe(false)
    expect(dispatchCancelable(input.element, 'dragstart').defaultPrevented).toBe(false)
  })

  it('非密码输入完全不参与密码分支（copy 不拦截）', () => {
    const wrapper = mount(FluereInput, {
      props: { type: 'text', modelValue: 'plain', passwordChar: '#' },
    })
    expect(dispatchCancelable(wrapper.get('input').element, 'copy').defaultPrevented).toBe(false)
    expect(wrapper.get('input').attributes('type')).toBe('text')
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('plain')
  })

  it('revealButtonLabel 可覆盖缺省无障碍名', async () => {
    stubClientWidth(300)
    const wrapper = mount(FluereInput, {
      props: { type: 'password', revealButtonLabel: '显示密码' },
    })
    await focusAndType(wrapper, 'secret')
    expect(wrapper.get('.fui-input__reveal').attributes('aria-label')).toBe('显示密码')
  })
})

describe('FluereInput 自定义掩码字符（显示缓冲，对应 RichEdit 密码模式的双缓冲）', () => {
  it('掩码状态：控件是 type="text"，里面放的是掩码串（真值不外露）', () => {
    const wrapper = mountMasked('abc')
    const input = wrapper.get('input')
    expect(input.attributes('type')).toBe('text')
    expect(input.attributes('spellcheck')).toBe('false')
    expect((input.element as HTMLInputElement).value).toBe('###')
  })

  it('输入：把浏览器写进来的原始字符反推回真值（非受控时回写掩码显示）', async () => {
    const wrapper = mount(FluereInput, { props: { type: 'password', passwordChar: '#' } })
    // 空值上按下 'a'：浏览器直接把原始字符写进输入框
    await simulateTyping(wrapper, 'a')
    expect(wrapper.emitted('update:modelValue')?.pop()).toEqual(['a'])
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('#')

    // 掩码串已是 '#'，再按下 'b' → DOM 是 '#b'
    await simulateTyping(wrapper, '#b')
    expect(wrapper.emitted('update:modelValue')?.pop()).toEqual(['ab'])
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('##')
  })

  it('输入的字形与掩码字符相同时（尾部）也能反推', async () => {
    const wrapper = mountMasked('ab')
    await simulateTyping(wrapper, '###')
    expect(wrapper.emitted('update:modelValue')?.pop()).toEqual(['ab#'])
  })

  it('删除与中间粘贴：按显示差异反推真值', async () => {
    const deleted = mountMasked('abc')
    await simulateTyping(deleted, '##')
    expect(deleted.emitted('update:modelValue')?.pop()).toEqual(['ab'])

    const pasted = mountMasked('ab')
    await simulateTyping(pasted, '#XY#')
    expect(pasted.emitted('update:modelValue')?.pop()).toEqual(['aXYb'])
  })

  it('显示明文时回到真值字符串', async () => {
    const wrapper = mountMasked('abc')
    await wrapper.setProps({ passwordRevealMode: 'visible' })
    const input = wrapper.get('input')
    expect(input.attributes('type')).toBe('text')
    expect((input.element as HTMLInputElement).value).toBe('abc')
  })

  it('掩码路径的 Ctrl+Z / Ctrl+Y 由组件自己接管（浏览器撤销栈里只有掩码串）', async () => {
    const wrapper = mount(FluereInput, { props: { type: 'password', passwordChar: '#' } })
    await simulateTyping(wrapper, 'a')
    await simulateTyping(wrapper, '#b')
    expect(wrapper.emitted('update:modelValue')?.pop()).toEqual(['ab'])

    await wrapper.get('input').trigger('keydown', { key: 'z', ctrlKey: true })
    expect(wrapper.emitted('update:modelValue')?.pop()).toEqual(['a'])

    await wrapper.get('input').trigger('keydown', { key: 'y', ctrlKey: true })
    expect(wrapper.emitted('update:modelValue')?.pop()).toEqual(['ab'])
  })

  it('掩码字符多字符时取首个码位，空串回落到 WinUI 缺省「●」', async () => {
    const multi = mount(FluereInput, {
      props: { type: 'password', passwordChar: '#*', modelValue: 'a' },
    })
    expect((multi.get('input').element as HTMLInputElement).value).toBe('#')

    const fallback = mount(FluereInput, {
      props: { type: 'password', passwordChar: '', modelValue: 'a' },
    })
    expect((fallback.get('input').element as HTMLInputElement).value).toBe('a')
    expect(fallback.get('input').attributes('type')).toBe('password')
  })
})

describe('FluereInput 状态样式（WinUI 3 TextBox 契约）', () => {
  const rules = readStyleRules()

  it('rest：顶/左/右浅描边，底边控件描边（TextControlElevationBorderBrush）', () => {
    const base = rules.get('.fui-input__control') ?? ''
    expect(base).toContain('border: var(--strokeWidthThin) solid var(--colorNeutralStrokeAlpha)')
    expect(base).toContain('border-bottom-color: var(--colorNeutralStroke1)')
  })

  it('背景色拆成两个语义变量：真实背景 / 高亮背景', () => {
    const base = rules.get('.fui-input__control') ?? ''
    expect(base).toContain('--fui-input-background: var(--colorNeutralBackground1)')
    expect(base).toContain('--fui-input-highlight-background: transparent')
    // 合成背景 = 背景色 + 底部 1px 高亮带（同一层里色值在前、渐变在后）
    expect(base).toContain('var(--fui-input-background) linear-gradient(')
    // 渐变高亮带替代了 inset 阴影，背景简写把 clip 重置回默认值，不再出现 padding-box
    expect(base).not.toContain('background-clip: padding-box')
  })

  it('高亮带「刀形」：渐变沿水平方向，只有最底 1px 是强调色', () => {
    const base = rules.get('.fui-input__control') ?? ''
    expect(base).toContain('transparent calc(100% - var(--strokeWidthThin))')
    expect(base).toContain(
      'var(--fui-input-highlight-background) calc(100% - var(--strokeWidthThin))',
    )
    // 不允许再用 inset 阴影：它会沿圆角在两端上翘成月牙形
    expect(base).not.toContain('box-shadow')
  })

  it('高亮色注册为 <color> 并参与缓动（渐变停靠点本身不可过渡）', () => {
    const property = rules.get('@property --fui-input-highlight-background') ?? ''
    expect(property).toContain("syntax: '<color>'")
    expect(property).toContain('inherits: false')
    expect(property).toContain('initial-value: transparent')

    const base = rules.get('.fui-input__control') ?? ''
    expect(base).toContain(
      '--fui-input-highlight-background var(--durationNormal) var(--curveDecelerateMid)',
    )
  })

  it('hover：只换背景变量，描边不动；Focused 优先于 PointerOver', () => {
    const hover = rules.get('.fui-input__control:hover:not(:disabled):not(:focus-visible)') ?? ''
    expect(hover).toContain('--fui-input-background: var(--colorNeutralBackground1Hover)')
    expect(hover).not.toContain('border')
  })

  it('focus：只换高亮色与底描边色，四边宽度不变（无重排）', () => {
    const focus = rules.get('.fui-input__control:focus-visible') ?? ''
    expect(focus).toContain('--fui-input-highlight-background: var(--colorCompoundBrandStroke)')
    expect(focus).toContain('border-color: var(--colorNeutralStrokeAlpha)')
    expect(focus).toContain('border-bottom-color: var(--colorCompoundBrandStroke)')
    // 不许靠改 border-width 加粗：那会重排并挤压输入内容
    expect(focus).not.toContain('border-bottom-width')
    expect(focus).not.toContain('border-bottom:')
  })

  it('disabled：四边同色描边 + 禁用填充（ControlStrokeColorDefaultBrush）', () => {
    const disabled = rules.get('.fui-input__control:disabled') ?? ''
    expect(disabled).toContain('--fui-input-background: var(--colorNeutralBackgroundDisabled)')
    expect(disabled).toContain('border-color: var(--colorNeutralStrokeDisabled)')
    expect(disabled).toContain('color: var(--colorNeutralForegroundDisabled)')
  })

  it('invalid：danger 描边，聚焦时高亮同样走 danger（库扩展状态）', () => {
    expect(rules.get('.fui-input--invalid .fui-input__control') ?? '').toContain(
      'border-color: var(--colorStatusDangerBorder2)',
    )
    expect(rules.get('.fui-input--invalid .fui-input__control:focus-visible') ?? '').toContain(
      '--fui-input-highlight-background: var(--colorStatusDangerBorder2)',
    )
  })

  it('标题 / 说明：几何与前景色逐条对照模板资源', () => {
    expect(rules.get('.fui-input__header') ?? '').toContain(
      'margin-block-end: var(--spacingVerticalS)',
    )
    expect(rules.get('.fui-input__header') ?? '').toContain('font-weight: var(--fontWeightRegular)')
    expect(rules.get('.fui-input[data-disabled] .fui-input__header') ?? '').toContain(
      'color: var(--colorNeutralForegroundDisabled)',
    )
    expect(rules.get('.fui-input__description') ?? '').toContain(
      'color: var(--colorNeutralForeground3)',
    )
  })

  it('显示按钮：正方形、内缩 4px、透明底 + 三档配色（RevealButton）', () => {
    const button = rules.get('.fui-input__reveal') ?? ''
    expect(button).toContain('inset-block-start: var(--fui-input-reveal-inset)')
    expect(button).toContain('inset-inline-end: var(--fui-input-reveal-inset)')
    expect(button).toContain(
      'width: calc(var(--fui-input-height) - (var(--fui-input-reveal-inset) * 2))',
    )
    expect(button).toContain(
      'height: calc(var(--fui-input-height) - (var(--fui-input-reveal-inset) * 2))',
    )
    expect(button).toContain('background-color: var(--colorSubtleBackground)')
    expect(button).toContain('color: var(--colorNeutralForeground3)')
    expect(rules.get('.fui-input__reveal:hover') ?? '').toContain(
      'background-color: var(--colorSubtleBackgroundHover)',
    )
    const pressed = rules.get('.fui-input[data-reveal-pressed] .fui-input__reveal') ?? ''
    expect(pressed).toContain('background-color: var(--colorSubtleBackgroundPressed)')
    expect(pressed).toContain('color: var(--colorNeutralForeground4)')
  })

  it('显示按钮在场时文本让位：让位宽 = 按钮左缘 + 本尺寸文本内边距', () => {
    expect(rules.get('.fui-input[data-reveal] .fui-input__control') ?? '').toContain(
      'padding-inline-end: calc( var(--fui-input-height) - var(--fui-input-reveal-inset) + var(--fui-input-padding-inline) )',
    )
  })

  it('多行形态：高度按 rows 展开、下限取尺寸高度（MinHeight 32）', () => {
    const multiline = rules.get('.fui-input[data-multiline] .fui-input__control') ?? ''
    expect(multiline).toContain('height: auto')
    expect(multiline).toContain('min-height: var(--fui-input-height)')
    expect(multiline).toContain('resize: vertical')
  })

  it('IME 组合期间的兜底：用 -webkit-text-security 遮住明文', () => {
    expect(rules.get('.fui-input__control[data-composing]') ?? '').toContain(
      '-webkit-text-security: disc',
    )
  })
})

describe('FluereInput i18n（显示按钮可访问名）', () => {
  /** 聚焦 + 输入，钉住宽度让显示按钮出现 */
  const revealUnder = async (render: () => VueWrapper): Promise<DOMWrapper<HTMLButtonElement>> => {
    stubClientWidth(300)
    const wrapper = render()
    await wrapper.get('input').trigger('focusin')
    await simulateTyping(wrapper, 'secret')
    return wrapper.get('.fui-input__reveal') as DOMWrapper<HTMLButtonElement>
  }

  it('无 Provider 时内置缺省 zh-Hans：显示密码', async () => {
    const reveal = await revealUnder(() => mount(FluereInput, { props: { type: 'password' } }))
    expect(reveal.attributes('aria-label')).toBe('显示密码')
  })

  it('FluereConfigProvider locale=en 时取英文侧', async () => {
    const reveal = await revealUnder(() =>
      mount(FluereConfigProvider, {
        props: { locale: 'en' },
        slots: { default: () => h(FluereInput, { type: 'password' }) },
      }),
    )
    expect(reveal.attributes('aria-label')).toBe('Show password')
  })

  it('组件 locale prop 压过 Provider locale', async () => {
    const reveal = await revealUnder(() =>
      mount(FluereConfigProvider, {
        props: { locale: 'en' },
        slots: { default: () => h(FluereInput, { type: 'password', locale: 'zh-Hans' }) },
      }),
    )
    expect(reveal.attributes('aria-label')).toBe('显示密码')
  })

  it('显式 revealButtonLabel 压过 locale', async () => {
    const reveal = await revealUnder(() =>
      mount(FluereConfigProvider, {
        props: { locale: 'en' },
        slots: {
          default: () => h(FluereInput, { type: 'password', revealButtonLabel: '自定义' }),
        },
      }),
    )
    expect(reveal.attributes('aria-label')).toBe('自定义')
  })

  it('Provider messages 按 locale×scope 覆盖内置文案', async () => {
    const reveal = await revealUnder(() =>
      mount(FluereConfigProvider, {
        props: { messages: { 'zh-Hans': { input: { showPassword: '覆盖' } } } },
        slots: { default: () => h(FluereInput, { type: 'password' }) },
      }),
    )
    expect(reveal.attributes('aria-label')).toBe('覆盖')
  })
})
