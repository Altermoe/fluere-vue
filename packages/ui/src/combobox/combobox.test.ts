/* oxlint-disable prefer-named-capture-group, no-magic-numbers, import/no-duplicates --
   样式契约测试要读 SFC 源码做文本解析（正则与下标属测试细节）；
   组件本体与 ?raw 源码是同一路径的两种取法，导入检查器把它们视作同一模块属误报 */
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { h, nextTick, ref } from 'vue'
import FluereCombobox from './combobox.vue'
import comboboxSfc from './combobox.vue?raw'
import type { FluereComboboxItem, FluereComboboxSelectionChangedEventArgs } from './types'

/**
 * 对照来源：WinUI 3（Windows App SDK 2.0）
 *   src/controls/dev/ComboBox/ComboBox_themeresources.xaml
 *   src/dxaml/xcp/dxaml/lib/ComboBox_Partial.cpp
 *
 * jsdom 不解析 var() / light-dark()，拿不到可靠的计算样式，故样式层退一步断言
 * SFC 里的声明本身（与 radio.test.ts 同一套口径），守住 WinUI 还原规则。
 *
 * 组件有多个 <style> 块（scoped 的控件规则 + 非 scoped 的弹层 / @property 规则，
 * 弹层必须全局——reka 把 class 与 Vue 作用域 id 拆到了两个元素上），全部收集。
 */
const readStyleRules = (sfc: string): Map<string, string> => {
  const styleBlock = [...sfc.matchAll(/<style[^>]*>(?<css>[\s\S]*?)<\/style>/g)]
    .map((block) => block.groups?.css ?? '')
    .join('\n')
  const rules = new Map<string, string>()
  for (const block of styleBlock.replace(/\/\*[\s\S]*?\*\//g, '').split('}')) {
    const [selectorText, declarations] = block.split('{')
    if (selectorText !== undefined && declarations !== undefined) {
      for (const selector of selectorText.split(',')) {
        const key = selector.replace(/\s+/g, ' ').trim()
        const value = declarations.replace(/\s+/g, ' ').trim()
        // 同一选择器可能出现多次（例如末尾的 prefers-reduced-motion 块），合并声明
        const previous = rules.get(key)
        rules.set(key, previous === undefined ? value : `${previous} ${value}`)
      }
    }
  }
  return rules
}

const styleRules = readStyleRules(comboboxSfc)

const FRUITS: FluereComboboxItem[] = [
  { value: 'a', text: 'Apple' },
  { value: 'b', text: 'Banana' },
  { value: 'c', text: 'Cherry', disabled: true },
  { value: 'd', text: 'Durian' },
]

/** Jsdom 没有 PointerEvent：直接用普通 Event 触发 pointerdown（组件只读 target / preventDefault） */
const pointerDown = (element: Element): void => {
  element.dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true }))
}

const keydown = (element: Element, key: string, init: KeyboardEventInit = {}): void => {
  element.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }),
  )
}

/** 宿主：默认挂到 document.body，弹层（Teleport 到 body）才能被查询到 */
const host = (
  props: Record<string, unknown> = {},
  options: { slots?: Record<string, () => unknown> } = {},
) =>
  mount(FluereCombobox, {
    attachTo: document.body,
    props: { items: FRUITS, ...props },
    slots: options.slots,
  })

/** Reka 的 Presence（含 Teleport）挂载 / 卸载都要跨两次 nextTick 才反映到 DOM */
const settle = async (): Promise<void> => {
  await nextTick()
  await nextTick()
}

const surface = (wrapper: ReturnType<typeof host>) => wrapper.get('.fui-combobox__surface')
const input = (wrapper: ReturnType<typeof host>) =>
  wrapper.get<HTMLInputElement>('input[role="combobox"]')
const popup = () => document.querySelector<HTMLElement>('.fui-combobox__popup')
const options = () => [...document.querySelectorAll('.fui-combobox__item')]

// 每个用例结束自动卸载（弹层 Teleport 到 body，卸载后会一并清掉）
enableAutoUnmount(afterEach)

beforeAll(() => {
  // Jsdom 没有实现 scrollIntoView；reka 的高亮会调用它（浏览器里是有的）
  Element.prototype.scrollIntoView = () => undefined
})

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('FluereCombobox 渲染契约', () => {
  it('渲染控件外壳：只读输入框 + role=combobox + 箭头 + 无面板内容', () => {
    const wrapper = host()
    expect(wrapper.find('.fui-combobox').exists()).toBe(true)

    const control = input(wrapper)
    expect(control.attributes('role')).toBe('combobox')
    expect(control.attributes('readonly')).toBeDefined()
    expect(control.attributes('aria-expanded')).toBe('false')
    expect(control.attributes('aria-autocomplete')).toBe('none')
    expect(wrapper.find('.fui-combobox__chevron').exists()).toBe(true)
    // 面板未展开时不渲染下拉项
    expect(popup()).toBeNull()
    wrapper.unmount()
  })

  it('选中值回填到输入框；无选中时显示 placeholder', async () => {
    const wrapper = host({ placeholder: '选一个水果' })
    expect(input(wrapper).element.value).toBe('')
    expect(input(wrapper).attributes('placeholder')).toBe('选一个水果')

    await wrapper.setProps({ modelValue: 'b' })
    expect(input(wrapper).element.value).toBe('Banana')
    wrapper.unmount()
  })

  it('header / label / description 串好可访问名与描述', () => {
    const wrapper = host({ header: '水果', description: '请选择' }, { slots: {} })
    expect(wrapper.get('.fui-combobox__header').text()).toBe('水果')
    expect(input(wrapper).attributes('aria-label')).toBe('水果')
    const describedBy = input(wrapper).attributes('aria-describedby')
    expect(describedBy).toBeDefined()
    expect(wrapper.get('.fui-combobox__description').attributes('id')).toBe(describedBy)
    wrapper.unmount()
  })

  it('label 优先于 header 作为可访问名', () => {
    const wrapper = host({ header: '水果', label: '水果选择器' })
    expect(input(wrapper).attributes('aria-label')).toBe('水果选择器')
    wrapper.unmount()
  })

  it('禁用：输入框 disabled，指针按下不展开', () => {
    const wrapper = host({ disabled: true })
    expect(input(wrapper).attributes('disabled')).toBeDefined()
    pointerDown(surface(wrapper).element)
    expect(popup()).toBeNull()
    expect(wrapper.get('.fui-combobox').attributes('data-disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('非可编辑态提交隐藏 input（表单 name=value）', () => {
    const wrapper = host({ name: 'fruit', modelValue: 'a' })
    const hidden = wrapper.get<HTMLInputElement>('input[type="hidden"]')
    expect(hidden.attributes('name')).toBe('fruit')
    expect(hidden.element.value).toBe('a')
    wrapper.unmount()
  })
})

describe('FluereCombobox 展开与选中', () => {
  it('指针按下展开面板：渲染全部项，选中项带 data-state=checked', async () => {
    const wrapper = host({ modelValue: 'a' })
    pointerDown(surface(wrapper).element)
    await nextTick()
    await nextTick()

    expect(surface(wrapper).attributes('data-open')).toBeDefined()
    expect(input(wrapper).attributes('aria-expanded')).toBe('true')

    const items = options()
    expect(items).toHaveLength(FRUITS.length)
    expect(items[0]?.textContent?.trim()).toBe('Apple')
    expect(items[0]?.getAttribute('data-state')).toBe('checked')
    expect(items[0]?.querySelector('.fui-combobox__item-pill')).not.toBeNull()
    // 禁用项透传到 reka 的 data-disabled
    expect(items[2]?.getAttribute('data-disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('再次按下收起面板', async () => {
    const wrapper = host()
    pointerDown(surface(wrapper).element)
    await settle()
    expect(popup()).not.toBeNull()

    pointerDown(surface(wrapper).element)
    await settle()
    expect(popup()).toBeNull()
    wrapper.unmount()
  })

  it('点选下拉项提交选中并收起', async () => {
    const wrapper = host()
    pointerDown(surface(wrapper).element)
    await nextTick()
    await nextTick()

    options()[1]?.dispatchEvent(new Event('click', { bubbles: true }))
    await settle()

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['b'])
    expect(popup()).toBeNull()
    wrapper.unmount()
  })

  it('selectionChanged 载荷与 WinUI SelectionChangedEventArgs 对齐', async () => {
    const wrapper = host({ modelValue: 'a' })
    pointerDown(surface(wrapper).element)
    await nextTick()
    await nextTick()

    options()[3]?.dispatchEvent(new Event('click', { bubbles: true }))
    await nextTick()

    const events = wrapper.emitted('selectionChanged') as
      | FluereComboboxSelectionChangedEventArgs<string>[][]
      | undefined
    expect(events?.at(-1)?.[0]).toEqual({
      addedItem: 'd',
      removedItem: 'a',
      addedIndex: 3,
      removedIndex: 0,
    })
    wrapper.unmount()
  })

  it('展开 / 收起抛 dropDownOpened / dropDownClosed', async () => {
    const wrapper = host()
    pointerDown(surface(wrapper).element)
    await nextTick()
    expect(wrapper.emitted('dropDownOpened')).toHaveLength(1)

    pointerDown(surface(wrapper).element)
    await nextTick()
    expect(wrapper.emitted('dropDownClosed')).toHaveLength(1)
    wrapper.unmount()
  })
})

describe('FluereCombobox 键盘（面板关闭）', () => {
  it('方向键直接改选中项（WinUI 关闭态语义），且跳过禁用项', async () => {
    const wrapper = host({ modelValue: 'a' })
    keydown(input(wrapper).element, 'ArrowDown')
    await nextTick()
    // Apple → Banana
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['b'])

    await wrapper.setProps({ modelValue: 'b' })
    keydown(input(wrapper).element, 'ArrowDown')
    await nextTick()
    // Banana → Durian（跳过禁用的 Cherry）
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['d'])
    wrapper.unmount()
  })

  it('无选中时 ↓ 选第一项、↑ 选最后一项；端点处不动', async () => {
    const wrapper = host()
    keydown(input(wrapper).element, 'ArrowDown')
    await nextTick()
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['a'])

    await wrapper.setProps({ modelValue: 'd' })
    keydown(input(wrapper).element, 'ArrowDown')
    await nextTick()
    expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
    wrapper.unmount()
  })

  it('Home / End 选中首尾可选项', async () => {
    const wrapper = host({ modelValue: 'b' })
    keydown(input(wrapper).element, 'End')
    await nextTick()
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['d'])

    keydown(input(wrapper).element, 'Home')
    await nextTick()
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['a'])
    wrapper.unmount()
  })

  it('Enter / F4 / Alt+↓ 展开面板，Escape 不处理', async () => {
    for (const [key, init] of [
      ['Enter', {}],
      ['F4', {}],
      ['ArrowDown', { altKey: true }],
    ] as [string, KeyboardEventInit][]) {
      const wrapper = host()
      keydown(input(wrapper).element, key, init)
      await nextTick()
      expect(surface(wrapper).attributes('data-open')).toBeDefined()
      wrapper.unmount()
      document.body.innerHTML = ''
    }

    const wrapper = host()
    keydown(input(wrapper).element, 'Escape')
    await nextTick()
    expect(surface(wrapper).attributes('data-open')).toBeUndefined()
    wrapper.unmount()
  })

  it('字符键做前缀搜索并直接选中命中项（忽略大小写）', async () => {
    for (const [char, value] of [
      ['d', 'd'],
      ['B', 'b'],
    ] as [string, string][]) {
      const wrapper = host()
      keydown(input(wrapper).element, char)
      await nextTick()
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([value])
      wrapper.unmount()
    }
  })

  it('同一搜索窗口内字符累积（WinUI AppendCharToSearchString）', async () => {
    const wrapper = host()
    keydown(input(wrapper).element, 'b')
    keydown(input(wrapper).element, 'a')
    await nextTick()
    // 'ba' → Banana
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['b'])
    wrapper.unmount()
  })

  it('文本搜索从「当前项 + 1」环状起搜（WinUI 口径）', async () => {
    const wrapper = host({ modelValue: 'a' })
    // 'a' 从 Apple 之后起搜：Banana / Cherry(禁用) / Durian 都不以 a 开头 → Apple（回绕）
    keydown(input(wrapper).element, 'a')
    await nextTick()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    wrapper.unmount()
  })

  it('textSearchEnabled=false 时字符键不触发搜索', async () => {
    const wrapper = host({ textSearchEnabled: false })
    keydown(input(wrapper).element, 'd')
    await nextTick()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    wrapper.unmount()
  })

  it('焦点在控件上、面板收起时滚轮改选中项', async () => {
    const wrapper = host({ modelValue: 'a' })
    input(wrapper).element.focus()
    surface(wrapper).element.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, bubbles: true }))
    await nextTick()
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['b'])
    wrapper.unmount()
  })
})

describe('FluereCombobox 键盘（面板展开）', () => {
  it('Enter 由底座提交高亮项并收起', async () => {
    const wrapper = host({ modelValue: 'a' })
    pointerDown(surface(wrapper).element)
    await nextTick()
    await nextTick()

    keydown(input(wrapper).element, 'ArrowDown')
    await settle()
    keydown(input(wrapper).element, 'Enter')
    await settle()

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['b'])
    expect(popup()).toBeNull()
    wrapper.unmount()
  })

  it('Space 等价于 Enter', async () => {
    const wrapper = host({ modelValue: 'a' })
    pointerDown(surface(wrapper).element)
    await nextTick()
    await nextTick()

    keydown(input(wrapper).element, 'ArrowDown')
    await nextTick()
    keydown(input(wrapper).element, ' ')
    await nextTick()

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['b'])
    wrapper.unmount()
  })

  it('展开态字符键照常做前缀搜索并滚动到命中项', async () => {
    // 非受控：选中项真的会变，才能验证 reka 把高亮跟到新选中项
    const wrapper = host({ defaultValue: 'a' })
    pointerDown(surface(wrapper).element)
    await settle()

    keydown(input(wrapper).element, 'd')
    await settle()
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['d'])
    // 底座（reka）在 modelValue 变化后要再等两拍才把高亮落到选中项
    await settle()
    expect(document.querySelector('[data-highlighted]')?.textContent?.trim()).toBe('Durian')
    wrapper.unmount()
  })

  it('Escape 收起面板但不改选中项', async () => {
    const wrapper = host({ modelValue: 'a' })
    pointerDown(surface(wrapper).element)
    await nextTick()
    await nextTick()

    keydown(input(wrapper).element, 'ArrowDown')
    await settle()
    keydown(input(wrapper).element, 'Escape')
    await settle()

    expect(popup()).toBeNull()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    wrapper.unmount()
  })

  it('Ctrl+Enter 取消已选中项的选中（WinUI SelectedIndex = -1）', async () => {
    const wrapper = host({ modelValue: 'a' })
    pointerDown(surface(wrapper).element)
    await nextTick()
    await nextTick()

    keydown(input(wrapper).element, 'Enter', { ctrlKey: true })
    await nextTick()

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([null])
    wrapper.unmount()
  })

  it('缺省 committed：展开时方向键只移动高亮，不提交选中', async () => {
    const wrapper = host({ modelValue: 'a' })
    pointerDown(surface(wrapper).element)
    await nextTick()
    await nextTick()

    keydown(input(wrapper).element, 'ArrowDown')
    await nextTick()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    wrapper.unmount()
  })

  it('selectionChangedTrigger=always：展开时方向键逐项提交', async () => {
    const wrapper = host({ modelValue: 'a', selectionChangedTrigger: 'always' })
    pointerDown(surface(wrapper).element)
    await settle()

    keydown(input(wrapper).element, 'ArrowDown')
    await settle()
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['b'])
    wrapper.unmount()
  })
})

describe('FluereCombobox 可编辑态（WinUI IsEditable）', () => {
  it('渲染可写文本框，aria-autocomplete=list', () => {
    const wrapper = host({ editable: true })
    expect(input(wrapper).attributes('readonly')).toBeUndefined()
    expect(input(wrapper).attributes('aria-autocomplete')).toBe('list')
    wrapper.unmount()
  })

  it('输入前缀做过行内补全（WinUI type-to-complete）', async () => {
    const wrapper = host({ editable: true })
    const control = input(wrapper)
    control.element.value = 'Du'
    control.element.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()

    expect(control.element.value).toBe('Durian')
    expect(wrapper.emitted('update:text')?.at(-1)).toEqual(['Durian'])
    wrapper.unmount()
  })

  it('输入即开面板不成立（WinUI 可编辑态不会因为输入展开）', async () => {
    const wrapper = host({ editable: true })
    const control = input(wrapper)
    control.element.value = 'Durian'
    control.element.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()

    expect(popup()).toBeNull()
    wrapper.unmount()
  })

  it('Enter 提交匹配项：选中该项', async () => {
    const wrapper = host({ editable: true })
    const control = input(wrapper)
    control.element.value = 'Banana'
    control.element.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()

    keydown(control.element, 'Enter')
    await nextTick()
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['b'])
    wrapper.unmount()
  })

  it('Enter 提交自定义文本：抛 textSubmitted 并清空选中、保留文本', async () => {
    const wrapper = host({ editable: true, modelValue: 'a' })
    const control = input(wrapper)
    control.element.value = 'Elderberry'
    control.element.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()

    keydown(control.element, 'Enter')
    await nextTick()

    const submitted = wrapper.emitted('textSubmitted') as
      | [{ text: string; handled: boolean }][]
      | undefined
    expect(submitted?.at(-1)?.[0].text).toBe('Elderberry')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([null])
    expect(input(wrapper).element.value).toBe('Elderberry')
    wrapper.unmount()
  })

  it('textSubmitted 里把 handled 置 true 则不改动选中项', async () => {
    const wrapper = mount(FluereCombobox, {
      attachTo: document.body,
      props: {
        items: FRUITS,
        editable: true,
        modelValue: 'a',
        onTextSubmitted: (args: { handled: boolean }) => {
          args.handled = true
        },
      },
    })
    const control = input(wrapper)
    control.element.value = 'Elderberry'
    control.element.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()

    keydown(control.element, 'Enter')
    await nextTick()

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    wrapper.unmount()
  })

  it('挂载时用选中项文本填充文本框（WinUI Text ← SelectedItem）', async () => {
    const wrapper = host({ editable: true, modelValue: 'a' })
    await nextTick()
    expect(input(wrapper).element.value).toBe('Apple')
    wrapper.unmount()
  })

  it('点箭头热区展开；文本区点击只放光标不开面板', async () => {
    const wrapper = host({ editable: true, modelValue: 'a' })
    pointerDown(surface(wrapper).element)
    await settle()
    expect(popup()).toBeNull()

    pointerDown(wrapper.get('.fui-combobox__chevron').element)
    await settle()
    expect(popup()).not.toBeNull()
    wrapper.unmount()
  })

  it('展开时方向键高亮即时回填文本框，但不提交选中项（WinUI UpdateEditableTextBox）', async () => {
    const wrapper = host({ editable: true, modelValue: 'a' })
    pointerDown(wrapper.get('.fui-combobox__chevron').element)
    await settle()

    keydown(input(wrapper).element, 'ArrowDown')
    await settle()

    expect(input(wrapper).element.value).toBe('Banana')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    wrapper.unmount()
  })

  it('Escape 回滚文本到当前选中项', async () => {
    const wrapper = host({ editable: true, modelValue: 'b' })
    const control = input(wrapper)
    control.element.value = 'zzz'
    control.element.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()

    keydown(control.element, 'Escape')
    await nextTick()
    expect(input(wrapper).element.value).toBe('Banana')
    wrapper.unmount()
  })

  it('失焦提交文本（WinUI：焦点离开即 CommitRevertEditableSearch）', async () => {
    const wrapper = host({ editable: true })
    const control = input(wrapper)
    control.element.value = 'Cherry'
    control.element.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()

    surface(wrapper).element.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    await nextTick()
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['c'])
    wrapper.unmount()
  })
})

describe('FluereCombobox 焦点表现（Focused / PointerFocused）', () => {
  it('键盘聚焦画焦点矩形与指示条；指针聚焦两者都不画', async () => {
    const wrapper = host()
    const control = input(wrapper)

    // 键盘聚焦：文档级 keydown 先归位「非指针聚焦」，再 focusin
    keydown(document.body, 'Tab')
    control.element.focus()
    surface(wrapper).element.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    await nextTick()
    expect(surface(wrapper).attributes('data-focus-visible')).toBeDefined()
    expect(surface(wrapper).attributes('data-focused')).toBeDefined()

    // 指针聚焦：先 pointerdown 再 focusin
    pointerDown(surface(wrapper).element)
    await nextTick()
    expect(surface(wrapper).attributes('data-focus-visible')).toBeUndefined()
    expect(surface(wrapper).attributes('data-focused')).toBeDefined()
    wrapper.unmount()
  })
})

describe('FluereCombobox 自定义插槽', () => {
  it('#item 覆盖行内容，#empty 在无项时渲染', async () => {
    const wrapper = mount(FluereCombobox, {
      attachTo: document.body,
      props: { items: [{ value: 'a', text: 'Apple' }] },
      slots: {
        item: (slotProps: { item: FluereComboboxItem }) =>
          h('b', { class: 'custom' }, String(slotProps.item.value)),
      },
    })
    pointerDown(surface(wrapper).element)
    await nextTick()
    await nextTick()
    expect(document.querySelector('.custom')?.textContent).toBe('a')
    wrapper.unmount()
    document.body.innerHTML = ''

    const empty = host(
      { items: [] },
      { slots: { empty: () => h('i', { class: 'no-item' }, '没有可选项') } },
    )
    pointerDown(surface(empty).element)
    await nextTick()
    await nextTick()
    expect(document.querySelector('.no-item')?.textContent).toBe('没有可选项')
    empty.unmount()
  })
})

describe('FluereCombobox 样式契约（WinUI 资源键 → Fluent 令牌）', () => {
  it('控件几何：最小 64×32、圆角 4、内容内边距 12,5,0,7 + 38px 字形列', () => {
    expect(styleRules.get('.fui-combobox') ?? '').toContain('min-width: 64px')
    const surfaceRules = styleRules.get('.fui-combobox__surface') ?? ''
    expect(surfaceRules).toContain('min-height: 32px')
    expect(surfaceRules).toContain('border-radius: var(--borderRadiusMedium)')
    const textRules = styleRules.get('.fui-combobox__text') ?? ''
    expect(textRules).toContain('padding: 5px 38px 7px 12px')
    expect(styleRules.get('.fui-combobox[data-editable] .fui-combobox__text') ?? '').toContain(
      'padding: 5px 38px 6px 11px',
    )
  })

  it('文本区留在文档流里（flex 拉伸），控件才有内在宽度', () => {
    const surfaceRules = styleRules.get('.fui-combobox__surface') ?? ''
    expect(surfaceRules).toContain('display: flex')
    expect(surfaceRules).toContain('min-width: 64px')
    const textRules = styleRules.get('.fui-combobox__text') ?? ''
    // 绝对定位会让 surface 失去内在宽度（只剩 64px 下限），这里明确不允许
    expect(textRules).not.toContain('position: absolute')
    expect(textRules).toContain('flex: 1 1 auto')
    expect(textRules).toContain('min-width: 0')
  })

  it('DropDownGlyph：12×12、右内边距 14；按下轻微下沉而不是翻转', () => {
    const chevronRules = styleRules.get('.fui-combobox__chevron') ?? ''
    expect(chevronRules).toContain('inset-inline-end: 14px')
    expect(chevronRules).toContain('width: 12px')
    expect(chevronRules).toContain('height: 12px')
    expect(
      styleRules.get(
        '.fui-combobox:not([data-disabled]) .fui-combobox__surface:active .fui-combobox__chevron',
      ) ?? '',
    ).toContain('translateY(1px)')
    // 源码里不允许出现箭头翻转（WinUI 3 Gallery 按下只下沉）
    expect(comboboxSfc).not.toContain('rotate(180deg)')
  })

  it('选中指示条：3×16 + 品牌色 + 仅 Focused 显示', () => {
    const pillRules = styleRules.get('.fui-combobox__pill') ?? ''
    expect(pillRules).toContain('width: 3px')
    expect(pillRules).toContain('height: 16px')
    expect(pillRules).toContain('background-color: var(--colorCompoundBrandBackground)')
    expect(pillRules).toContain('opacity: 0')
    expect(
      styleRules.get('.fui-combobox__surface[data-focus-visible] .fui-combobox__pill') ?? '',
    ).toContain('opacity: 1')
  })

  it('焦点矩形：2px colorStrokeFocus2 + 外扩 2px（FocusStrokeColorOuter）', () => {
    const focusRules = styleRules.get('.fui-combobox__surface[data-focus-visible]') ?? ''
    expect(focusRules).toContain('outline: var(--strokeWidthThick) solid var(--colorStrokeFocus2)')
    expect(focusRules).toContain('outline-offset: 2px')
  })

  it('下拉项：Margin 5,2 + Padding 11,5,11,7 + 圆角 4 + 各状态取色', () => {
    const itemRules = styleRules.get('.fui-combobox__item') ?? ''
    expect(itemRules).toContain('margin: 2px 5px')
    expect(itemRules).toContain('padding: 5px 11px 7px')
    expect(itemRules).toContain('border-radius: var(--borderRadiusMedium)')
    // 项字号与控件一致（14px/Body1），不靠面板继承
    expect(itemRules).toContain('font-size: var(--fontSizeBase300)')
    expect(styleRules.get('.fui-combobox__item[data-highlighted]') ?? '').toContain(
      'var(--colorSubtleBackgroundHover)',
    )
    expect(styleRules.get(".fui-combobox__item[data-state='checked']") ?? '').toContain(
      'var(--colorSubtleBackgroundSelected)',
    )
    expect(styleRules.get('.fui-combobox__item:active') ?? '').toContain(
      'var(--colorSubtleBackgroundPressed)',
    )
    expect(styleRules.get('.fui-combobox__item[data-disabled]') ?? '').toContain(
      'var(--colorNeutralForegroundDisabled)',
    )
  })

  it('下拉项指示条按下时 ScaleY → 0.625（WinUI ComboBoxItemPillMinScale）', () => {
    expect(
      styleRules.get(".fui-combobox__item[data-state='checked']:active .fui-combobox__item-pill") ??
        '',
    ).toContain('scaleY(0.625)')
  })

  it('浮层：圆角 8 + shadow16 + 最大高 504 + 宽度对齐触发元素 + 从选中项 split 展开', () => {
    const popupRules = styleRules.get('.fui-combobox__popup') ?? ''
    expect(popupRules).toContain('border-radius: var(--borderRadiusXLarge)')
    expect(popupRules).toContain('box-shadow: var(--shadow16)')
    expect(popupRules).toContain('background-color: var(--colorNeutralBackground1)')
    expect(popupRules).toContain('max-height: min(')
    expect(popupRules).toContain('var(--fui-combobox-max-height, 504px)')
    // WinUI：Popup 宽 = ComboBox.ActuallyWidth——宽度与触发元素严格对齐（不是"不窄于"）
    expect(popupRules).toContain('width: var(--reka-combobox-trigger-width, 64px)')
    expect(popupRules).toContain('font-size: var(--fontSizeBase300)')
    // Split 展开：pending/playing 先收拢成选中项处的缝，playing 播关键帧
    expect(styleRules.get(".fui-combobox__popup[data-split='pending']") ?? '').toContain(
      'clip-path: inset(var(--fui-combobox-split-top, 0px)',
    )
    expect(styleRules.get(".fui-combobox__popup[data-split='playing']") ?? '').toContain(
      'animation: fui-combobox-split-open var(--durationGentle) var(--curveDecelerateMid) both',
    )
    expect(comboboxSfc).toContain('@keyframes fui-combobox-split-open')
    expect(styleRules.get('.fui-combobox__list') ?? '').toContain('padding-block: 4px')
  })

  it('弹层规则必须在非 scoped 块（reka 把 class 与作用域 id 拆到了两个元素上）', () => {
    const globalBlock = [...comboboxSfc.matchAll(/<style[^>]*>(?<css>[\s\S]*?)<\/style>/g)]
      .map((block) => block.groups?.css ?? '')
      .find((css) => css.includes('.fui-combobox__popup'))
    expect(globalBlock).toBeDefined()
    expect(globalBlock).not.toContain('.fui-combobox__surface')
  })

  it('开面板：弹层带 data-split 时序状态（原点实测后起播展开动画）', async () => {
    const wrapper = host({ defaultValue: 'b' })
    pointerDown(surface(wrapper).element)
    await settle()
    const element = popup()
    expect(element).not.toBeNull()
    expect(element?.hasAttribute('data-split')).toBe(true)
    // 组件的 afterOpen 里有两层 nextTick（本组件一层 + reka highlightSelected 一层），
    // 轮询等它把 pending 推进到量完原点的 playing（jsdom 无动画，不会到 done）
    for (let i = 0; i < 10 && element?.getAttribute('data-split') === 'pending'; i += 1) {
      await nextTick()
    }
    expect(element?.getAttribute('data-split')).toBe('playing')
    expect(element?.style.getPropertyValue('--fui-combobox-split-top')).not.toBe('')
    wrapper.unmount()
  })

  it('禁用态：填充 / 前景 / 箭头全走禁用档', () => {
    const disabledRules =
      styleRules.get('.fui-combobox[data-disabled] .fui-combobox__surface') ?? ''
    expect(disabledRules).toContain(
      '--fui-combobox-background: var(--colorNeutralBackgroundDisabled)',
    )
    expect(disabledRules).toContain(
      '--fui-combobox-foreground: var(--colorNeutralForegroundDisabled)',
    )
    expect(disabledRules).toContain('--fui-combobox-chevron: var(--colorNeutralForegroundDisabled)')
  })

  it('动效尊重 prefers-reduced-motion', () => {
    expect(comboboxSfc).toContain('@media (prefers-reduced-motion: reduce)')
  })
})

describe('FluereCombobox 受控 / 非受控', () => {
  it('非受控：defaultValue 起手，选中后内部状态生效', async () => {
    const wrapper = host({ defaultValue: 'b' })
    expect(input(wrapper).element.value).toBe('Banana')
    keydown(input(wrapper).element, 'ArrowDown')
    await nextTick()
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['d'])
    wrapper.unmount()
  })

  it('v-model:open 受控：父级不改写时面板不展开', async () => {
    const wrapper = host({ open: false })
    pointerDown(surface(wrapper).element)
    await nextTick()
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([true])
    expect(popup()).toBeNull()
    wrapper.unmount()
  })

  it('v-model:text 受控：可编辑文本走 update:text', async () => {
    const text = ref('Apple')
    const wrapper = mount(FluereCombobox, {
      attachTo: document.body,
      props: {
        'items': FRUITS,
        'editable': true,
        'text': text.value,
        'onUpdate:text': (value: string) => {
          text.value = value
        },
      },
    })
    const control = input(wrapper)
    expect(control.element.value).toBe('Apple')

    control.element.value = 'Ban'
    control.element.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()
    expect(text.value).toBe('Banana')
    wrapper.unmount()
  })

  it('对象项 + by：按字段比较选中态', async () => {
    const rows = [
      { id: 1, name: '一' },
      { id: 2, name: '二' },
    ]
    const wrapper = mount(FluereCombobox, {
      attachTo: document.body,
      props: {
        items: rows.map((r) => ({ value: r, text: r.name })),
        by: 'id',
        modelValue: { id: 2, name: '二' },
      },
    })
    expect(input(wrapper).element.value).toBe('二')
    keydown(input(wrapper).element, 'Home')
    await nextTick()
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([{ id: 1, name: '一' }])
    wrapper.unmount()
  })
})

describe('FluereCombobox 插槽渲染细节', () => {
  it('header 插槽覆盖 header 文案', () => {
    const wrapper = mount(FluereCombobox, {
      attachTo: document.body,
      props: { items: FRUITS },
      slots: { header: () => h('em', { class: 'header-slot' }, '自定义标题') },
    })
    expect(wrapper.get('.header-slot').text()).toBe('自定义标题')
    wrapper.unmount()
  })
})
