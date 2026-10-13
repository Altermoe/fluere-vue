/* oxlint-disable import/no-nodejs-modules -- 契约测试需读 SFC 源码文本（jsdom 不解析 var()） */
/**
 * `FluereSelect` 契约。
 *
 * 行为：不可编辑下拉 —— 点击触发面展开、点选 / 键盘选中、受控与非受控、
 * 禁用项不可选；aria 由 reka `SelectTrigger` 输出（`role=combobox` /
 * `aria-expanded` / `aria-controls`）。
 * 样式：从 SFC 源码解析（jsdom 不解析 `var()`，见 docs/style-spec.md §7.1），
 * 并守住「下拉面板必须写在非 scoped 块」（Teleport 拿不到 data-v-*）。
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import FluereSelect from './select.vue'

const here = dirname(fileURLToPath(import.meta.url))
const sfc = readFileSync(resolve(here, 'select.vue'), 'utf8')
/** 剥掉注释后的源码：注释里写着 WinUI 资源名，不能当作实现证据 */
const code = sfc.replace(/\/\*[\s\S]*?\*\//g, '')

const ITEMS = [
  { value: 'day', text: '按天' },
  { value: 'week', text: '按周' },
  { value: 'month', text: '按月', disabled: true },
]

let mounted: ReturnType<typeof mount> | undefined = undefined

afterEach(() => {
  mounted?.unmount()
  mounted = undefined
})

/**
 * jsdom 没有 PointerEvent，而 reka 的 SelectTrigger 只在**鼠标左键 pointerdown**
 * 上展开（`isPlainLeftClick` 读 `button === 0`）。另外 reka 在打开时会挂一个
 * **document 捕获期 pointerup（once）**：若指针几乎没移动（位移 ≤ 10px）就
 * `preventDefault()`，把「点开菜单那一下」的 pointerup 吃掉、不让它顺手选中项。
 * 所以选中项必须真的先移动指针，再 pointerup —— 与真实鼠标行为一致。
 */
const pointerDown = (element: Element, x = 10, y = 10): void => {
  const target = element as HTMLElement & { hasPointerCapture?: (id: number) => boolean }
  target.hasPointerCapture ??= () => false
  target.dispatchEvent(
    new MouseEvent('pointerdown', {
      button: 0,
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
    }),
  )
}

/** 真实鼠标点选：先移动（越过 reka 的 10px 阈值），再 pointerup 提交 */
const pointerUp = (element: Element, x = 100, y = 100): void => {
  // jsdom 不认 MouseEventInit 的 pageX/pageY，但 pageX = clientX + scrollX(0)，用 clientX 即可
  document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: x, clientY: y }))
  element.dispatchEvent(
    new MouseEvent('pointerup', {
      button: 0,
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
    }),
  )
}

const options = (): HTMLElement[] => [
  ...document.body.querySelectorAll<HTMLElement>('[role="option"]'),
]

const openSelect = async (props: Record<string, unknown> = {}, slots = {}) => {
  const wrapper = mount(FluereSelect, {
    props: { items: ITEMS, ...props },
    slots,
    attachTo: document.body,
  })
  mounted = wrapper
  pointerDown(wrapper.get('[role="combobox"]').element)
  await nextTick()
  return wrapper
}

describe('FluereSelect · 渲染与 aria', () => {
  it('触发面输出 role=combobox，未选中时显示占位符', () => {
    const wrapper = mount(FluereSelect, {
      props: { items: ITEMS, placeholder: '选择粒度' },
    })
    mounted = wrapper
    const trigger = wrapper.get('[role="combobox"]')
    expect(trigger.text()).toContain('选择粒度')
    expect(trigger.attributes('aria-expanded')).toBe('false')
  })

  it('选中项显示其 text；没有 text 时回退到 String(value)', () => {
    const first = mount(FluereSelect, { props: { items: ITEMS, modelValue: 'week' } })
    expect(first.get('[role="combobox"]').text()).toContain('按周')
    first.unmount()

    const second = mount(FluereSelect, { props: { items: [{ value: 42 }], modelValue: 42 } })
    expect(second.get('[role="combobox"]').text()).toContain('42')
    second.unmount()
  })

  it('header / description 与触发面用 id 关联，label 优先作为可访问名', () => {
    const wrapper = mount(FluereSelect, {
      props: { items: ITEMS, header: '粒度', description: '决定列表密度' },
    })
    mounted = wrapper
    const trigger = wrapper.get('[role="combobox"]')
    const headerId = trigger.attributes('aria-labelledby')
    const descriptionId = trigger.attributes('aria-describedby')
    expect(wrapper.find(`#${headerId}`).text()).toBe('粒度')
    expect(wrapper.find(`#${descriptionId}`).text()).toBe('决定列表密度')
  })
})

describe('FluereSelect · 开合与选择', () => {
  it('点击触发面展开下拉，aria-expanded 变 true，项为 role=option', async () => {
    const wrapper = await openSelect()
    expect(wrapper.get('[role="combobox"]').attributes('aria-expanded')).toBe('true')
    expect(options()).toHaveLength(3)
  })

  it('点选一项抛 update:modelValue 与 change', async () => {
    const wrapper = await openSelect()
    pointerUp(options()[1] as HTMLElement)
    await nextTick()
    await nextTick()
    expect(wrapper.emitted('update:modelValue')).toEqual([['week']])
    expect(wrapper.emitted('change')).toEqual([[{ value: 'week' }]])
  })

  it('禁用项不可选', async () => {
    const wrapper = await openSelect()
    const disabled = document.body.querySelector<HTMLElement>('[role="option"][data-disabled]')
    expect(disabled).not.toBeNull()
    pointerUp(disabled as HTMLElement)
    await nextTick()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('受控：open 由 prop 决定，抛 update:open', async () => {
    const wrapper = mount(FluereSelect, {
      props: { items: ITEMS, open: false },
      attachTo: document.body,
    })
    mounted = wrapper
    pointerDown(wrapper.get('[role="combobox"]').element)
    await nextTick()
    expect(wrapper.emitted('update:open')).toEqual([[true]])
    expect(wrapper.get('[role="combobox"]').attributes('aria-expanded')).toBe('false')
  })

  it('非受控：点选后触发面文本更新', async () => {
    const wrapper = await openSelect({ defaultValue: null })
    pointerUp(options()[0] as HTMLElement)
    await nextTick()
    await nextTick()
    expect(wrapper.get('[role="combobox"]').text()).toContain('按天')
  })

  it('禁用整组：触发面带 data-disabled，且不展开', async () => {
    const wrapper = mount(FluereSelect, {
      props: { items: ITEMS, disabled: true },
      attachTo: document.body,
    })
    mounted = wrapper
    const trigger = wrapper.get('[role="combobox"]')
    expect(trigger.attributes('data-disabled')).toBeDefined()
    pointerDown(trigger.element)
    await nextTick()
    expect(document.body.querySelector('[role="option"]')).toBeNull()
  })
})

describe('FluereSelect · 样式与规格来源契约', () => {
  it('下拉面板样式写在非 scoped 块（Teleport 后 scoped 会静默失效）', () => {
    // 最后一个 <style> 块必须没有 scoped 属性，且包含面板类名
    const blocks = [...sfc.matchAll(/<style(?<attrs>[^>]*)>(?<css>[\s\S]*?)<\/style>/g)]
    expect(blocks).toHaveLength(2)
    const popupBlock = blocks[1]
    expect(popupBlock?.groups?.attrs ?? '').not.toContain('scoped')
    expect(popupBlock?.groups?.css ?? '').toContain('.fui-select__popup')
  })

  it('触发面 / 下拉项 / 面板全部引用 token，无裸色值', () => {
    const declarations = [
      ...code.matchAll(
        /(?:background-color|color|border-color|--fui-select-[a-z-]+):\s*(?<value>[^;]+);/g,
      ),
    ].map((match) => (match.groups?.value ?? '').trim())
    expect(declarations.length).toBeGreaterThan(8)
    for (const value of declarations) {
      expect(value.includes('var(') || value === 'transparent', value).toBe(true)
    }
  })

  it('焦点走共享原语，且组件内不自写 :focus-visible', () => {
    expect(code).toContain('useFocusVisual(')
    expect(code).toContain('focusVisual.class')
    expect(code).not.toContain(':focus-visible')
  })

  it('层级走 useFlyout 并把 layerStyle 解构到顶层（模板不自动解包嵌套 ref）', () => {
    expect(code).toContain('useFlyout(')
    expect(code).toContain("tier: '--zIndexNavFlyout'")
    expect(code).toContain('const { layerStyle: flyoutLayerStyle } = flyout')
    expect(code).toContain(':style="[contentStyle, flyoutLayerStyle]"')
    expect(code).not.toContain('flyout.layerStyle')
  })

  it('规格来源写在文件头（WinUI ComboBox 非编辑态 + tag）', () => {
    expect(sfc).toContain('ComboBox_themeresources.xaml')
    expect(sfc).toContain('winui3/release/2.5.1')
  })
})
