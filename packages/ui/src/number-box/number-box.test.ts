/* oxlint-disable prefer-named-capture-group, no-magic-numbers -- 样式契约测试要读 SFC 源码做文本解析，正则与下标属测试细节 */
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { h, nextTick, ref } from 'vue'
import FluereConfigProvider from '../config-provider/config-provider.vue'
import FluereNumberBox from './number-box.vue'
import numberBoxSfc from './number-box.vue?raw'

/** 读某次渲染下增减按钮的 aria-label 列表（提到模块作用域，避免每次用例重建）。 */
const labelsUnder = (render: () => unknown) => {
  const wrapper = render() as ReturnType<typeof mount>
  return wrapper.findAll('.fui-number-box__spin-button').map((b) => b?.attributes('aria-label'))
}

/**
 * 从 SFC 的 `<style>` 块解析出「选择器 → 声明」，用于断言状态样式。
 *
 * jsdom 不解析 CSS 自定义属性（var()），拿不到可靠的计算样式，所以这里退一步
 * 断言声明本身 —— 守住 WinUI（NumberBox.xaml / NumberBox_themeresources.xaml）的几何与配色。
 */
const readStyleRules = (sfc: string): Map<string, string> => {
  const styleBlock = /<style[^>]*>(?<css>[\s\S]*?)<\/style>/.exec(sfc)?.groups?.css ?? ''
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

const rules = readStyleRules(numberBoxSfc)

/** 受控宿主：v-model 绑到 ref，便于断言回写 */
const controlled = (initial: number | null, attrs = '', slots = '') =>
  mount({
    components: { FluereNumberBox },
    setup() {
      const model = ref<number | null>(initial)
      return { model }
    },
    template: `<FluereNumberBox v-model="model" ${attrs}>${slots}</FluereNumberBox>`,
  })

const inputOf = (wrapper: ReturnType<typeof controlled>) =>
  wrapper.get<HTMLInputElement>('.fui-number-box__input')

const step = async (wrapper: ReturnType<typeof controlled>, key: string, init = {}) => {
  await inputOf(wrapper).trigger('keydown', { key, ...init })
  await nextTick()
}

describe('FluereNumberBox 渲染契约', () => {
  it('输入框带 role=spinbutton 与 aria 值语义，未给 min / max 时不渲染上下界', () => {
    const wrapper = controlled(12)
    const input = inputOf(wrapper)
    expect(input.attributes('role')).toBe('spinbutton')
    expect(input.attributes('aria-valuenow')).toBe('12')
    expect(input.attributes('aria-valuemin')).toBeUndefined()
    expect(input.attributes('aria-valuemax')).toBeUndefined()
    expect(input.attributes('type')).toBe('text')
    expect(input.attributes('inputmode')).toBe('decimal')
    expect(input.attributes('autocomplete')).toBe('off')
  })

  it('显式给出 min / max 时同时渲染 aria 上下界与约束', () => {
    const wrapper = controlled(50, ':min="0" :max="100" :step="5"')
    const input = inputOf(wrapper)
    expect(input.attributes('aria-valuemin')).toBe('0')
    expect(input.attributes('aria-valuemax')).toBe('100')
  })

  it('无值时 aria-valuenow 缺省，输入框显示占位符', () => {
    const wrapper = controlled(null, 'placeholder="请输入"')
    expect(inputOf(wrapper).attributes('aria-valuenow')).toBeUndefined()
    expect(inputOf(wrapper).attributes('placeholder')).toBe('请输入')
  })

  it('可访问名优先级：label > header（WinUI 用 Header 当 AutomationName）', () => {
    expect(inputOf(controlled(0, 'header="数量"')).attributes('aria-label')).toBe('数量')
    expect(inputOf(controlled(0, 'header="数量" label="采购数量"')).attributes('aria-label')).toBe(
      '采购数量',
    )
  })

  it('#header 插槽无文本可读时，改用 aria-labelledby 关联标题节点', () => {
    const wrapper = controlled(0, '', '<template #header>单价</template>')
    const header = wrapper.get('.fui-number-box__header')
    const input = inputOf(wrapper)
    expect(input.attributes('aria-label')).toBeUndefined()
    expect(input.attributes('aria-labelledby')).toBe(header.attributes('id'))
    expect(header.text()).toBe('单价')
  })

  it('description 渲染在控件下方并作为 aria-describedby', () => {
    const wrapper = controlled(0, 'description="含税单价"')
    const description = wrapper.get('.fui-number-box__description')
    expect(inputOf(wrapper).attributes('aria-describedby')).toBe(description.attributes('id'))
    expect(description.text()).toBe('含税单价')
    // WinUI 模板里 DescriptionPresenter 位于 Grid.Row=2（宿主最后一个子节点）
    expect(wrapper.get('.fui-number-box').element.lastElementChild?.classList).toContain(
      'fui-number-box__description',
    )
  })

  it('header 渲染在控件上方（WinUI HeaderContentPresenter 位于 Grid.Row=0）', () => {
    const wrapper = controlled(0, 'header="数量"')
    expect(wrapper.get('.fui-number-box__header').text()).toBe('数量')
    expect(wrapper.get('.fui-number-box').element.firstElementChild?.classList).toContain(
      'fui-number-box__header',
    )
  })

  it('disabled 落到宿主与输入框上', () => {
    const wrapper = controlled(5, 'disabled')
    expect(wrapper.get('.fui-number-box').attributes('data-disabled')).toBeDefined()
    expect(inputOf(wrapper).attributes('disabled')).toBeDefined()
  })

  it('默认 hidden：不渲染任何增减按钮与指示器', () => {
    const wrapper = controlled(5)
    expect(wrapper.find('.fui-number-box__spin-buttons').exists()).toBe(false)
    expect(wrapper.find('.fui-number-box__popup').exists()).toBe(false)
    expect(wrapper.find('.fui-number-box__indicator').exists()).toBe(false)
  })
})

describe('FluereNumberBox 取值与文本（Value ↔ Text 双通道）', () => {
  it('回车结算输入并回写格式化文本', async () => {
    const wrapper = controlled(0)
    await inputOf(wrapper).setValue('1234')
    await step(wrapper, 'Enter')
    expect(wrapper.vm.model).toBe(1234)
    expect(inputOf(wrapper).element.value).toBe('1,234')
  })

  it('失焦结算输入（WinUI OnNumberBoxLostFocus → ValidateInput）', async () => {
    const wrapper = controlled(0)
    await inputOf(wrapper).setValue('42')
    await inputOf(wrapper).trigger('blur')
    await nextTick()
    expect(wrapper.vm.model).toBe(42)
  })

  it('清空输入 → 值置空（WinUI 的 NaN，本库用 null）', async () => {
    const wrapper = controlled(7)
    await inputOf(wrapper).setValue('')
    await step(wrapper, 'Enter')
    expect(wrapper.vm.model).toBeNull()
  })

  it('Escape 丢弃输入、回到当前值', async () => {
    const wrapper = controlled(12)
    await inputOf(wrapper).setValue('999')
    await step(wrapper, 'Escape')
    expect(wrapper.vm.model).toBe(12)
    expect(inputOf(wrapper).element.value).toBe('12')
  })

  it('非法输入 + 默认校验模式：失焦时用当前值的文本覆盖输入', async () => {
    const wrapper = controlled(12)
    await inputOf(wrapper).setValue('abc')
    await inputOf(wrapper).trigger('blur')
    await nextTick()
    expect(wrapper.vm.model).toBe(12)
    expect(inputOf(wrapper).element.value).toBe('12')
  })

  it('非法输入 + ValidationMode=Disabled：保留用户输入', async () => {
    const wrapper = controlled(12, 'validation-mode="disabled"')
    await inputOf(wrapper).setValue('abc')
    await inputOf(wrapper).trigger('blur')
    await nextTick()
    expect(wrapper.vm.model).toBe(12)
    expect(inputOf(wrapper).element.value).toBe('abc')
  })

  it('越界输入按 ValidationMode 钳制或保留', async () => {
    const clamped = controlled(50, ':min="0" :max="100"')
    await inputOf(clamped).setValue('150')
    await step(clamped, 'Enter')
    expect(clamped.vm.model).toBe(100)

    const kept = controlled(50, ':min="0" :max="100" validation-mode="disabled"')
    await inputOf(kept).setValue('150')
    await step(kept, 'Enter')
    expect(kept.vm.model).toBe(150)
  })

  it('AcceptsExpression：回车求值内联表达式', async () => {
    const wrapper = controlled(0, 'accepts-expression')
    await inputOf(wrapper).setValue('2*(3+4)')
    await step(wrapper, 'Enter')
    expect(wrapper.vm.model).toBe(14)
    expect(inputOf(wrapper).element.value).toBe('14')
  })

  it('表达式除以 0：值被清空（与 WinUI 返回 NaN 引用一致）', async () => {
    const wrapper = controlled(9, 'accepts-expression')
    await inputOf(wrapper).setValue('1/0')
    await step(wrapper, 'Enter')
    expect(wrapper.vm.model).toBeNull()
  })

  it('valueChanged 事件带新旧值（对应 WinUI NumberBoxValueChangedEventArgs）', async () => {
    const wrapper = controlled(5)
    await step(wrapper, 'ArrowUp')
    expect(wrapper.findComponent(FluereNumberBox).emitted('valueChanged')?.at(-1)).toEqual([
      { oldValue: 5, newValue: 6 },
    ])
  })

  it('聚焦即全选文本（WinUI OnNumberBoxGotFocus → SelectAll）', async () => {
    const wrapper = controlled(12)
    const input = inputOf(wrapper)
    await input.trigger('focus')
    const element = input.element as HTMLInputElement
    expect(element.selectionStart).toBe(0)
    expect(element.selectionEnd).toBe(element.value.length)
  })
})

describe('FluereNumberBox 键盘与滚轮步进（SmallChange / LargeChange）', () => {
  it('方向键按 step 走，PageUp / PageDown 按 largeStep 走', async () => {
    const wrapper = controlled(50, ':step="1" :large-step="10"')
    await step(wrapper, 'ArrowUp')
    expect(wrapper.vm.model).toBe(51)
    await step(wrapper, 'ArrowDown')
    expect(wrapper.vm.model).toBe(50)
    await step(wrapper, 'PageUp')
    expect(wrapper.vm.model).toBe(60)
    await step(wrapper, 'PageDown')
    expect(wrapper.vm.model).toBe(50)
  })

  it('Home / End 不参与步进（WinUI 交给 TextBox 移动光标）', async () => {
    const wrapper = controlled(50)
    await step(wrapper, 'Home')
    expect(wrapper.vm.model).toBe(50)
    await step(wrapper, 'End')
    expect(wrapper.vm.model).toBe(50)
  })

  it('不做步长吸附（WinUI 直接相加，不按 step 对齐）', async () => {
    const wrapper = controlled(0.5, ':step="1" :min="0" :max="10"')
    await step(wrapper, 'ArrowUp')
    expect(wrapper.vm.model).toBe(1.5)
  })

  it('越界被钳制在 [min, max] 内', async () => {
    const wrapper = controlled(100, ':min="0" :max="100"')
    await step(wrapper, 'ArrowUp')
    expect(wrapper.vm.model).toBe(100)
  })

  it('IsWrapEnabled：到端点后回绕到另一端', async () => {
    const wrapper = controlled(100, ':min="0" :max="100" wrap-enabled')
    await step(wrapper, 'ArrowUp')
    expect(wrapper.vm.model).toBe(0)
    await step(wrapper, 'ArrowDown')
    expect(wrapper.vm.model).toBe(100)
  })

  it('滚轮只在输入框有焦点时步进，向上滚为增（WinUI MouseWheelDelta > 0）', async () => {
    const wrapper = controlled(50)
    const input = inputOf(wrapper)
    await input.trigger('wheel', { deltaY: -100 })
    expect(wrapper.vm.model).toBe(50)

    await input.trigger('focus')
    await input.trigger('wheel', { deltaY: -100 })
    expect(wrapper.vm.model).toBe(51)
    await input.trigger('wheel', { deltaY: 100 })
    expect(wrapper.vm.model).toBe(50)
  })

  it('disabled 时键盘与滚轮都不生效', async () => {
    const wrapper = controlled(50, 'disabled')
    await step(wrapper, 'ArrowUp')
    await step(wrapper, 'PageUp')
    expect(wrapper.vm.model).toBe(50)
  })
})

describe('FluereNumberBox 增减按钮（SpinButtonPlacementMode）', () => {
  it('inline：先加后减两个按钮，MinWidth 32 / Margin 4 / 无 Tab 焦点', () => {
    const wrapper = controlled(5, 'spin-button-placement-mode="inline"')
    const buttons = wrapper.findAll('.fui-number-box__spin-button')
    expect(buttons).toHaveLength(2)
    expect(buttons[0]?.classes()).toContain('fui-number-box__spin-button--increase')
    expect(buttons[1]?.classes()).toContain('fui-number-box__spin-button--decrease')
    expect(buttons[0]?.attributes('aria-label')).toBe('增加')
    expect(buttons[1]?.attributes('aria-label')).toBe('减少')
    expect(buttons[0]?.attributes('tabindex')).toBe('-1')
    // WinUI 的 SymbolThemeFontFamily 字形 E70E / E70D → Fluent 图标
    expect(buttons[0]?.find('[data-icon-name="chevron_up"]').exists()).toBe(true)
    expect(buttons[1]?.find('[data-icon-name="chevron_down"]').exists()).toBe(true)
  })

  it('指针按下即步进一次（RepeatButton 的按下触发）', async () => {
    const wrapper = controlled(5, 'spin-button-placement-mode="inline"')
    await wrapper.get('.fui-number-box__spin-button--increase').trigger('pointerdown')
    expect(wrapper.vm.model).toBe(6)
    await wrapper.get('.fui-number-box__spin-button--decrease').trigger('pointerdown')
    expect(wrapper.vm.model).toBe(5)
    await wrapper.get('.fui-number-box__spin-buttons').trigger('pointerup')
  })

  it('键盘激活（detail=0 的 click）也能步进，且指针 click 不会重复步进', async () => {
    const wrapper = controlled(5, 'spin-button-placement-mode="inline"')
    await wrapper.get('.fui-number-box__spin-button--increase').trigger('click')
    expect(wrapper.vm.model).toBe(6)

    const increase = wrapper.get('.fui-number-box__spin-button--increase')
    await increase.trigger('pointerdown')
    // 指针点击：pointerdown 已经步进过，随后的 click（detail=1）必须被忽略
    increase.element.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
    await nextTick()
    expect(wrapper.vm.model).toBe(7)
    await wrapper.get('.fui-number-box__spin-buttons').trigger('pointerup')
  })

  it('到端点后禁用「加」/「减」；IsWrapEnabled 时两者始终可用', () => {
    const atMax = controlled(100, ':min="0" :max="100" spin-button-placement-mode="inline"')
    const buttons = atMax.findAll('.fui-number-box__spin-button')
    expect(buttons[0]?.attributes('disabled')).toBeDefined()
    expect(buttons[1]?.attributes('disabled')).toBeUndefined()

    const wrapped = controlled(
      100,
      ':min="0" :max="100" wrap-enabled spin-button-placement-mode="inline"',
    )
    expect(
      wrapped.findAll('.fui-number-box__spin-button')[0]?.attributes('disabled'),
    ).toBeUndefined()
  })

  it('无值时两个按钮都禁用', () => {
    const wrapper = controlled(null, ':min="0" :max="100" spin-button-placement-mode="inline"')
    for (const button of wrapper.findAll('.fui-number-box__spin-button')) {
      expect(button.attributes('disabled')).toBeDefined()
    }
  })

  it('自定义按钮可访问名', () => {
    const wrapper = controlled(
      5,
      'spin-button-placement-mode="inline" increase-label="增加" decrease-label="减少"',
    )
    const buttons = wrapper.findAll('.fui-number-box__spin-button')
    expect(buttons[0]?.attributes('aria-label')).toBe('增加')
    expect(buttons[1]?.attributes('aria-label')).toBe('减少')
  })

  it('compact：输入框右侧始终有指示器，聚焦时浮出上 / 下按钮，失焦收起', async () => {
    const wrapper = controlled(5, 'spin-button-placement-mode="compact"')
    expect(wrapper.find('.fui-number-box__indicator').exists()).toBe(true)
    expect(
      wrapper.find('.fui-number-box__indicator [data-icon-name="chevron_up_down"]').exists(),
    ).toBe(true)
    expect(wrapper.find('.fui-number-box__popup').exists()).toBe(false)

    await inputOf(wrapper).trigger('focus')
    await nextTick()
    const popup = wrapper.find('.fui-number-box__popup')
    expect(popup.exists()).toBe(true)
    expect(popup.findAll('.fui-number-box__popup-button')).toHaveLength(2)

    await popup.get('.fui-number-box__popup-button').trigger('pointerdown')
    expect(wrapper.vm.model).toBe(6)
    await popup.trigger('pointerup')

    await inputOf(wrapper).trigger('blur')
    await nextTick()
    expect(wrapper.find('.fui-number-box__popup').exists()).toBe(false)
  })

  it('compact + disabled：不聚焦则无浮层（浮层只由焦点驱动）', async () => {
    const wrapper = controlled(5, 'spin-button-placement-mode="compact" disabled')
    await inputOf(wrapper).trigger('focus')
    await nextTick()
    expect(wrapper.find('.fui-number-box__popup').exists()).toBe(false)
  })
})

describe('FluereNumberBox 表单与国际化', () => {
  it('位于 <form> 内并传 name 时补隐藏原生 input（提交 name=value）', async () => {
    const wrapper = mount({
      components: { FluereNumberBox },
      setup() {
        const amount = ref<number | null>(40)
        return { amount }
      },
      template: `
        <form>
          <FluereNumberBox v-model="amount" name="amount" />
        </form>
      `,
    })
    await nextTick()
    const hidden = wrapper.find('form input[name="amount"]')
    expect(hidden.exists()).toBe(true)
    expect(hidden.attributes('type')).toBe('hidden')
    expect(hidden.attributes('value')).toBe('40')
  })

  it('locale 决定格式化与解析符号', async () => {
    const wrapper = controlled(1234.5, 'locale="de-DE"')
    expect(inputOf(wrapper).element.value).toBe('1.234,5')
    await inputOf(wrapper).setValue('1.000,25')
    await step(wrapper, 'Enter')
    expect(wrapper.vm.model).toBe(1000.25)
  })

  it('formatOptions 可复现 WinUI 的整数观感（maximumFractionDigits: 0）', () => {
    const wrapper = controlled(25.8, ':format-options="{ maximumFractionDigits: 0 }"')
    expect(inputOf(wrapper).element.value).toBe('26')
    expect(inputOf(wrapper).attributes('inputmode')).toBe('numeric')
  })
})

describe('FluereNumberBox 状态样式（WinUI NumberBox 契约）', () => {
  it('宿主：Header / 控件 / Description 三行栅格', () => {
    expect(rules.get('.fui-number-box')).toContain('display: inline-flex')
    expect(rules.get('.fui-number-box')).toContain('flex-direction: column')
    expect(rules.get('.fui-number-box')).toContain('align-items: stretch')
  })

  it('标题：TextBoxTopHeaderMargin 0,0,0,8 + Normal 字重 + 禁用文字色', () => {
    const header = rules.get('.fui-number-box__header') ?? ''
    expect(header).toContain('margin-block-end: var(--spacingVerticalS)')
    expect(header).toContain('font-weight: var(--fontWeightRegular)')
    expect(rules.get('.fui-number-box[data-disabled] .fui-number-box__header') ?? '').toContain(
      'color: var(--colorNeutralForegroundDisabled)',
    )
  })

  it('控件：相对定位（按钮浮在输入框之上，与 TextBox 边框共面）', () => {
    const control = rules.get('.fui-number-box__control') ?? ''
    expect(control).toContain('position: relative')
    expect(control).toContain('display: flex')
    expect(control).toContain('align-items: stretch')
  })

  it('内联模式：NumberBoxMinWidth 120 + 让出 76px 按钮位（再留 8px 间隔）', () => {
    expect(
      rules.get(".fui-number-box[data-spin-buttons='inline'] .fui-number-box__control") ?? '',
    ).toContain('min-width: 120px')
    expect(
      rules.get(
        ".fui-number-box[data-spin-buttons='inline'] .fui-number-box__control .fui-number-box__input",
      ) ?? '',
    ).toContain('padding-inline-end: 84px')
  })

  it('内联按钮：MinWidth 32 / Margin 4（减号左侧无外边距）/ ControlCornerRadius 4', () => {
    const button = rules.get('.fui-number-box__spin-button') ?? ''
    expect(button).toContain('width: 32px')
    expect(button).toContain('margin-block: 4px')
    expect(button).toContain('margin-inline: 4px')
    expect(button).toContain('border-radius: var(--borderRadiusMedium)')
    expect(button).toContain('background-color: var(--colorSubtleBackground)')
    expect(button).toContain('color: var(--colorNeutralForeground3)')
    expect(rules.get('.fui-number-box__spin-button--decrease') ?? '').toContain(
      'margin-inline-start: 0',
    )
  })

  it('按钮状态：SubtleFillColor 两档 hover / pressed + 禁用前景', () => {
    expect(rules.get('.fui-number-box__spin-button:not(:disabled):hover') ?? '').toContain(
      'background-color: var(--colorSubtleBackgroundHover)',
    )
    const pressed = rules.get('.fui-number-box__spin-button:not(:disabled):active') ?? ''
    expect(pressed).toContain('background-color: var(--colorSubtleBackgroundPressed)')
    expect(pressed).toContain('color: var(--colorNeutralForeground4)')
    expect(rules.get('.fui-number-box__spin-button:disabled') ?? '').toContain(
      'color: var(--colorNeutralForegroundDisabled)',
    )
  })

  it('紧凑指示器：NumberBoxPopupIndicatorMargin 0,0,8,0 + TextFillColorSecondary', () => {
    const indicator = rules.get('.fui-number-box__indicator') ?? ''
    expect(indicator).toContain('inset-inline-end: 8px')
    expect(indicator).toContain('color: var(--colorNeutralForeground3)')
    expect(indicator).toContain('pointer-events: none')
  })

  it('紧凑浮层：Offset(-21,-27) / Padding 6 / OverlayCornerRadius 8 / shadow16', () => {
    const popup = rules.get('.fui-number-box__popup') ?? ''
    expect(popup).toContain('top: -27px')
    expect(popup).toContain('right: -7px')
    expect(popup).toContain('padding: 6px')
    expect(popup).toContain('gap: 4px')
    expect(popup).toContain('border: var(--strokeWidthThin) solid var(--colorNeutralStroke1)')
    expect(popup).toContain('border-radius: var(--borderRadiusXLarge)')
    expect(popup).toContain('background-color: var(--colorNeutralBackground1)')
    expect(popup).toContain('box-shadow: var(--shadow16)')
  })

  it('浮层按钮：36×36（NumberBoxPopupSpinButtonStyle）', () => {
    const button = rules.get('.fui-number-box__popup-button') ?? ''
    expect(button).toContain('width: 36px')
    expect(button).toContain('height: 36px')
    expect(button).toContain('border-radius: var(--borderRadiusMedium)')
    expect(button).toContain('color: var(--colorNeutralForeground3)')
  })

  it('说明文本：SystemControlDescriptionTextForegroundBrush', () => {
    expect(rules.get('.fui-number-box__description') ?? '').toContain(
      'color: var(--colorNeutralForeground3)',
    )
  })

  it('动效走令牌且尊重 prefers-reduced-motion', () => {
    expect(rules.get('.fui-number-box__spin-button') ?? '').toContain(
      'transition: background-color var(--durationFast) var(--curveEasyEase)',
    )
    expect(numberBoxSfc).toContain('@media (prefers-reduced-motion: reduce)')
  })
})

describe('FluereNumberBox i18n（增减按钮可访问名）', () => {
  it('无 Provider 时内置缺省 zh-Hans：增加 / 减少', () => {
    const labels = labelsUnder(() =>
      mount(FluereNumberBox, { props: { spinButtonPlacementMode: 'inline' } }),
    )
    expect(labels).toEqual(['增加', '减少'])
  })

  it('FluereConfigProvider locale=en 时取英文侧', () => {
    const labels = labelsUnder(() =>
      mount(FluereConfigProvider, {
        props: { locale: 'en' },
        slots: {
          default: () => h(FluereNumberBox, { spinButtonPlacementMode: 'inline' }),
        },
      }),
    )
    expect(labels).toEqual(['Increase', 'Decrease'])
  })

  it('组件 locale prop 压过 Provider', () => {
    const labels = labelsUnder(() =>
      mount(FluereConfigProvider, {
        props: { locale: 'en' },
        slots: {
          default: () =>
            h(FluereNumberBox, { spinButtonPlacementMode: 'inline', locale: 'zh-Hans' }),
        },
      }),
    )
    expect(labels).toEqual(['增加', '减少'])
  })

  it('显式 increase-label / decrease-label 压过 locale', () => {
    const labels = labelsUnder(() =>
      mount(FluereConfigProvider, {
        props: { locale: 'en' },
        slots: {
          default: () =>
            h(FluereNumberBox, {
              spinButtonPlacementMode: 'inline',
              increaseLabel: '增益',
              decreaseLabel: '减损',
            }),
        },
      }),
    )
    expect(labels).toEqual(['增益', '减损'])
  })
})
