/* oxlint-disable import/no-nodejs-modules -- 契约测试要读 SFC 源码做文本断言（jsdom 不解析 var()） */
/**
 * `FluereTabView` + `FluereTabViewItem` 契约测试。
 *
 * 分两层：
 *  ① **行为**：键盘（Ctrl+F4 / Ctrl+Tab / Ctrl+Shift+Tab / 方向键焦点环）、选择与焦点状态机、
 *     关闭请求（只抛事件不删数据）、选中项迁移 —— 逐条对齐 `TabView.cpp` / `TabViewItem.cpp`
 *     的 A 级实现（组件文件头有逐条出处）；
 *  ② **样式**：从 SFC 源码文本断言 token 引用、几何值、无过渡、局部 z-index
 *     （jsdom 不解析 `var()`，见 docs/style-spec §7.1）。
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick, ref } from 'vue'
import FluereTabViewItem from './tab-view-item.vue'
import FluereTabView from './tab-view.vue'

const here = dirname(fileURLToPath(import.meta.url))
const sfc = readFileSync(resolve(here, 'tab-view.vue'), 'utf8')
const itemSfc = readFileSync(resolve(here, 'tab-view-item.vue'), 'utf8')

/** 去掉注释后的源码：注释里写着 WinUI 原值，不能当作实现证据 */
const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '')

/** 取出 `<style>` 块（去注释） */
const styleBlock = (source: string): string =>
  stripComments(/<style[^>]*>(?<css>[\s\S]*?)<\/style>/.exec(source)?.groups?.css ?? '')

const css = styleBlock(sfc)

let wrapper: VueWrapper | undefined = undefined
afterEach(() => {
  // attachTo 的用例不要在体内清空 document.body（Vue 卸载会找不到宿主）
  wrapper?.unmount()
  wrapper = undefined
})

interface HostOptions {
  titles?: string[]
  selectedIndex?: number
  extraProps?: Record<string, unknown>
  /** 给子项的额外 props（按标题索引） */
  itemProps?: (title: string) => Record<string, unknown>
}

/**
 * 宿主 fixture：真实消费姿势 —— `v-for` + `:key`（稳定身份）+ 默认插槽当面板内容。
 * 暴露 `list` / `selected` / `removed` 供用例驱动。
 */
const makeHost = (options: HostOptions = {}) =>
  mount(
    defineComponent({
      components: { FluereTabView, FluereTabViewItem },
      setup() {
        const list = ref(options.titles ?? ['One', 'Two', 'Three'])
        const selected = ref<number | undefined>(options.selectedIndex)
        const itemProps = options.itemProps ?? (() => ({}))
        const removeTitle = (title: string): void => {
          list.value = list.value.filter((entry) => entry !== title)
        }
        return { list, selected, itemProps, removeTitle, extraProps: options.extraProps ?? {} }
      },
      template: `
        <FluereTabView v-model:selected-index="selected" label="选项卡" v-bind="extraProps">
          <FluereTabViewItem
            v-for="title in list"
            :key="title"
            :header="title"
            v-bind="itemProps(title)"
          >
            <p>panel-{{ title }}</p>
          </FluereTabViewItem>
        </FluereTabView>
      `,
    }),
    { attachTo: document.body },
  )

const tabs = (host: VueWrapper) => host.findAll('[role="tab"]')
const panels = (host: VueWrapper) => host.findAll('[role="tabpanel"]')
const selectedTab = (host: VueWrapper) =>
  host.findAll('[role="tab"]').find((tab) => tab.attributes('aria-selected') === 'true')

/** 键盘事件（jsdom 里 KeyboardEvent 需要显式给 key / 修饰键） */
const pressKey = (
  target: Element | null | undefined,
  key: string,
  modifiers: Partial<Pick<KeyboardEvent, 'ctrlKey' | 'shiftKey' | 'altKey' | 'metaKey'>> = {},
): void => {
  target?.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...modifiers }),
  )
}

describe('FluereTabView 渲染与 a11y 契约', () => {
  it('渲染 tablist / tab / tabpanel，且只挂载选中面板的内容', () => {
    wrapper = makeHost()
    const root = wrapper.find('.fui-tab-view')
    expect(root.exists()).toBe(true)
    expect(wrapper.find('[role="tablist"]').attributes('aria-label')).toBe('选项卡')
    expect(tabs(wrapper).length).toBe(3)
    expect(tabs(wrapper).map((tab) => tab.text())).toEqual(['One', 'Two', 'Three'])
    // 默认选中第 0 个（WinUI SelectedIndex 默认 0）
    expect(tabs(wrapper)[0]!.attributes('aria-selected')).toBe('true')
    // reka 的 TabsContent 会保留非选中面板的容器（`hidden`）但**不渲染其内容**
    // —— 等价 WinUI 只有一个 ContentPresenter：没被选中的内容不在视觉树上
    expect(panels(wrapper).length).toBe(3)
    expect(
      panels(wrapper).filter((panel) => !(panel.element as HTMLElement).hasAttribute('hidden')),
    ).toHaveLength(1)
    expect(wrapper.text()).toContain('panel-One')
    expect(wrapper.text()).not.toContain('panel-Two')
  })

  it('每个 tab 是 button 语义之外的可聚焦 `role="tab"`，关闭按钮不进 Tab 序', () => {
    wrapper = makeHost()
    const first = tabs(wrapper)[0]!
    expect(first.attributes('role')).toBe('tab')
    expect(first.attributes('type')).toBeUndefined()
    const close = first.find('[data-fui-tab-view-close]')
    expect(close.attributes('tabindex')).toBe('-1')
    expect(close.attributes('aria-label')).toBe('关闭标签页')
  })

  it('`ariaLabel` 覆盖 tab 的可访问名（对齐 peer 的 GetNameCore 回退顺序）', () => {
    wrapper = makeHost({ itemProps: (title) => (title === 'Two' ? { ariaLabel: '第二个' } : {}) })
    expect(tabs(wrapper)[1]!.attributes('aria-label')).toBe('第二个')
    expect(tabs(wrapper)[0]!.attributes('aria-label')).toBeUndefined()
  })

  it('禁用项带 data-disabled / aria-disabled，且不能被点击选中', async () => {
    wrapper = makeHost({ itemProps: (title) => (title === 'Two' ? { disabled: true } : {}) })
    const second = tabs(wrapper)[1]!
    expect(second.attributes('data-disabled')).toBeDefined()
    expect(second.attributes('aria-disabled')).toBe('true')
    await second.trigger('mousedown')
    await nextTick()
    expect(selectedTab(wrapper)?.text()).toBe('One')
  })

  it('`#header` 插槽优先于 header 文本、`#icon` 渲染图标盒', () => {
    wrapper = mount(
      defineComponent({
        components: { FluereTabView, FluereTabViewItem },
        template: `
          <FluereTabView label="选项卡">
            <FluereTabViewItem header="文本被插槽覆盖">
              <template #icon><span data-icon>icon</span></template>
              <template #header><em data-rich>富文本标题</em></template>
              <p>body</p>
            </FluereTabViewItem>
          </FluereTabView>
        `,
      }),
    )
    const tab = wrapper.find('[role="tab"]')
    expect(tab.find('[data-rich]').exists()).toBe(true)
    expect(tab.find('[data-icon]').exists()).toBe(true)
    expect(tab.text()).not.toContain('文本被插槽覆盖')
  })

  it('默认打开新建按钮（IsAddTabButtonVisible 默认 true），点击只抛事件不建 tab', async () => {
    wrapper = makeHost()
    const add = wrapper.find('.fui-tab-view__add-button')
    expect(add.exists()).toBe(true)
    expect(add.attributes('aria-label')).toBe('添加新标签页')
    expect(tabs(wrapper).length).toBe(3)
    await add.trigger('click')
    const events = wrapper.findComponent(FluereTabView).emitted('addTabButtonClick')
    expect(events).toHaveLength(1)
    expect(tabs(wrapper).length).toBe(3)
  })

  it('`isAddTabButtonVisible=false` 时不渲染新建按钮', () => {
    wrapper = makeHost({ extraProps: { isAddTabButtonVisible: false } })
    expect(wrapper.find('.fui-tab-view__add-button').exists()).toBe(false)
  })

  it('滚动按钮默认隐藏（不溢出），并带 a11y 隐藏属性', () => {
    wrapper = makeHost()
    const buttons = wrapper.findAll('.fui-tab-view__scroll-button')
    expect(buttons).toHaveLength(2)
    for (const button of buttons) {
      expect(button.attributes('aria-hidden')).toBe('true')
      expect(button.attributes('tabindex')).toBe('-1')
    }
    expect(wrapper.find('.fui-tab-view__scroll-area').isVisible()).toBe(false)
  })

  it('内建文案跟随 locale（en）', () => {
    wrapper = makeHost({ extraProps: { locale: 'en' } })
    expect(wrapper.find('.fui-tab-view__add-button').attributes('aria-label')).toBe('Add New Tab')
    expect(wrapper.find('[data-fui-tab-view-close]').attributes('aria-label')).toBe('Close Tab')
  })
})

describe('FluereTabView 选择状态机', () => {
  it('点击选中并抛 update:selectedIndex', async () => {
    wrapper = makeHost({ selectedIndex: 0 })
    await tabs(wrapper)[2]!.trigger('mousedown')
    await nextTick()
    const emitted = wrapper.findComponent(FluereTabView).emitted('update:selectedIndex')
    expect(emitted?.at(-1)).toEqual([2])
    // v-model 会回写 ⇒ 视觉跟着走
    expect(selectedTab(wrapper)?.text()).toBe('Three')
  })

  it('受控但消费方不回写时，视觉只认 Prop', async () => {
    wrapper = mount(
      defineComponent({
        components: { FluereTabView, FluereTabViewItem },
        template: `
          <FluereTabView :selected-index="0" label="选项卡">
            <FluereTabViewItem header="One"><p>panel-One</p></FluereTabViewItem>
            <FluereTabViewItem header="Two"><p>panel-Two</p></FluereTabViewItem>
          </FluereTabView>
        `,
      }),
      { attachTo: document.body },
    )
    await tabs(wrapper)[1]!.trigger('mousedown')
    await nextTick()
    expect(wrapper.findComponent(FluereTabView).emitted('update:selectedIndex')?.at(-1)).toEqual([
      1,
    ])
    expect(selectedTab(wrapper)?.text()).toBe('One')
  })

  it('非受控（不传 selectedIndex）时内部跟随；defaultSelectedIndex 决定初始项', async () => {
    wrapper = makeHost({ extraProps: { defaultSelectedIndex: 1 } })
    expect(selectedTab(wrapper)?.text()).toBe('Two')
    await tabs(wrapper)[2]!.trigger('mousedown')
    await nextTick()
    expect(selectedTab(wrapper)?.text()).toBe('Three')
  })

  it('Ctrl+Click 选中（对齐 TabViewItem::OnPointerPressed）', async () => {
    wrapper = makeHost({ extraProps: { defaultSelectedIndex: 0 } })
    await tabs(wrapper)[2]!.trigger('mousedown', { ctrlKey: true })
    await nextTick()
    expect(selectedTab(wrapper)?.text()).toBe('Three')
  })

  it('选中项按身份跟随：在选中项之前插入时选中项不变（等价 SelectedItem）', async () => {
    wrapper = makeHost({ titles: ['A', 'B', 'C'], extraProps: { defaultSelectedIndex: 2 } })
    expect(selectedTab(wrapper)?.text()).toBe('C')
    const host = wrapper.vm as unknown as { list: string[] }
    host.list = ['X', 'A', 'B', 'C']
    await nextTick()
    expect(selectedTab(wrapper)?.text()).toBe('C')
  })

  it('删除当前选中项 ⇒ 向后环形找第一个可用项（OnItemsChanged 规则）', async () => {
    wrapper = makeHost({ titles: ['A', 'B', 'C'], extraProps: { defaultSelectedIndex: 1 } })
    const host = wrapper.vm as unknown as { removeTitle: (title: string) => void }
    host.removeTitle('B')
    await nextTick()
    // 移除 B（下标 1）⇒ start = min(1, 2-1) = 1 ⇒ 取新的 [A, C] 里的 C
    expect(selectedTab(wrapper)?.text()).toBe('C')
  })

  it('删除当前选中项后一圈内全是禁用项 ⇒ 不选中任何 tab', async () => {
    wrapper = makeHost({
      titles: ['A', 'B'],
      extraProps: { defaultSelectedIndex: 1 },
      itemProps: (title) => (title === 'A' ? { disabled: true } : {}),
    })
    const host = wrapper.vm as unknown as { removeTitle: (title: string) => void }
    host.removeTitle('B')
    await nextTick()
    expect(selectedTab(wrapper)).toBeUndefined()
  })

  it('删除当前选中项后把迁移结果回抛给受控消费方', async () => {
    // 末项被移除 ⇒ start = min(2, 1) = 1 ⇒ 迁移到新的下标 1，与 Prop 上的 2 不同 ⇒ 必须回抛
    wrapper = mount(
      defineComponent({
        components: { FluereTabView, FluereTabViewItem },
        setup() {
          const list = ref(['A', 'B', 'C'])
          const selected = ref<number | undefined>(2)
          const remove = (): void => {
            list.value = ['A', 'B']
          }
          return { list, selected, remove }
        },
        template: `
          <FluereTabView :selected-index="selected" label="选项卡" @update:selected-index="(v) => (selected = v)">
            <FluereTabViewItem v-for="title in list" :key="title" :header="title">
              <p>panel-{{ title }}</p>
            </FluereTabViewItem>
          </FluereTabView>
        `,
      }),
      { attachTo: document.body },
    )
    ;(wrapper.vm as unknown as { remove: () => void }).remove()
    await nextTick()
    const emitted = wrapper.findComponent(FluereTabView).emitted('update:selectedIndex')
    expect(emitted?.at(-1)).toEqual([1])
  })
})

describe('FluereTabView 关闭行为', () => {
  it('关闭按钮点击抛 tabCloseRequested（含 index / header / identity / source），不删除 tab', async () => {
    wrapper = makeHost()
    await tabs(wrapper)[1]!.find('[data-fui-tab-view-close]').trigger('click')
    const emitted = wrapper.findComponent(FluereTabView).emitted('tabCloseRequested') as
      | unknown[][]
      | undefined
    expect(emitted?.at(-1)?.[0]).toEqual({
      index: 1,
      header: 'Two',
      identity: 'k:Two',
      source: 'close-button',
    })
    // 组件不自行删除：三个 tab 都还在
    expect(tabs(wrapper).length).toBe(3)
  })

  it('`isClosable=false` ⇒ 不渲染关闭按钮，且该 tab 不占关闭按钮位', () => {
    wrapper = makeHost({ itemProps: (title) => (title === 'Two' ? { isClosable: false } : {}) })
    expect(tabs(wrapper)[1]!.find('[data-fui-tab-view-close]').exists()).toBe(false)
    expect(tabs(wrapper)[1]!.attributes('data-close-visible')).toBeUndefined()
    expect(tabs(wrapper)[0]!.attributes('data-close-visible')).toBeDefined()
  })

  it('`on-pointer-over`：未选中且未悬停时不渲染关闭按钮；悬停后出现', async () => {
    wrapper = makeHost({ extraProps: { closeButtonOverlayMode: 'on-pointer-over' } })
    expect(tabs(wrapper)[1]!.find('[data-fui-tab-view-close]').exists()).toBe(false)
    // 选中的第一个仍然显示
    expect(tabs(wrapper)[0]!.find('[data-fui-tab-view-close]').exists()).toBe(true)
    await tabs(wrapper)[1]!.trigger('pointerenter')
    await nextTick()
    expect(tabs(wrapper)[1]!.find('[data-fui-tab-view-close]').exists()).toBe(true)
    await tabs(wrapper)[1]!.trigger('pointerleave')
    await nextTick()
    expect(tabs(wrapper)[1]!.find('[data-fui-tab-view-close]').exists()).toBe(false)
  })

  it('`always` 与 `auto` 同行为（源码里走同一个 default 分支）', () => {
    wrapper = makeHost({ extraProps: { closeButtonOverlayMode: 'always' } })
    expect(tabs(wrapper)[1]!.find('[data-fui-tab-view-close]').exists()).toBe(true)
  })

  it('Ctrl+F4 抛关闭请求（选中项可关闭）', () => {
    wrapper = makeHost()
    pressKey(wrapper.find('.fui-tab-view').element, 'F4', { ctrlKey: true })
    const emitted = wrapper.findComponent(FluereTabView).emitted('tabCloseRequested') as
      | unknown[][]
      | undefined
    expect(emitted?.at(-1)?.[0]).toMatchObject({ source: 'keyboard', header: 'One' })
  })

  it('Ctrl+F4 在选中项不可关闭时不抛事件', () => {
    wrapper = makeHost({ itemProps: (title) => (title === 'One' ? { isClosable: false } : {}) })
    pressKey(wrapper.find('.fui-tab-view').element, 'F4', { ctrlKey: true })
    expect(wrapper.findComponent(FluereTabView).emitted('tabCloseRequested')).toBeUndefined()
  })
})

describe('FluereTabView 键盘', () => {
  it('Ctrl+Tab / Ctrl+Shift+Tab 环形换选中（跳过禁用项）', async () => {
    wrapper = makeHost({ itemProps: (title) => (title === 'Two' ? { disabled: true } : {}) })
    const root = wrapper.find('.fui-tab-view').element
    pressKey(root, 'Tab', { ctrlKey: true })
    await nextTick()
    expect(selectedTab(wrapper)?.text()).toBe('Three')
    pressKey(root, 'Tab', { ctrlKey: true })
    await nextTick()
    expect(selectedTab(wrapper)?.text()).toBe('One')
    pressKey(root, 'Tab', { ctrlKey: true, shiftKey: true })
    await nextTick()
    expect(selectedTab(wrapper)?.text()).toBe('Three')
  })

  it('方向键在焦点环上移动：tab → 它的关闭按钮 → 下一个 tab → … → 新建按钮 → 回绕', async () => {
    wrapper = makeHost({ titles: ['A', 'B'] })
    const firstTab = tabs(wrapper)[0]!.element as HTMLElement
    firstTab.focus()
    expect(document.activeElement).toBe(firstTab)

    pressKey(firstTab, 'ArrowRight')
    await nextTick()
    expect((document.activeElement as HTMLElement).dataset.fuiTabViewClose).toBeDefined()

    pressKey(document.activeElement, 'ArrowRight')
    await nextTick()
    expect(document.activeElement).toBe(tabs(wrapper)[1]!.element)

    pressKey(document.activeElement, 'ArrowRight')
    await nextTick()
    expect((document.activeElement as HTMLElement).dataset.fuiTabViewClose).toBeDefined()

    pressKey(document.activeElement, 'ArrowRight')
    await nextTick()
    expect(document.activeElement).toBe(wrapper.find('.fui-tab-view__add-button').element)

    pressKey(document.activeElement, 'ArrowRight')
    await nextTick()
    expect(document.activeElement).toBe(firstTab)

    pressKey(document.activeElement, 'ArrowLeft')
    await nextTick()
    expect(document.activeElement).toBe(wrapper.find('.fui-tab-view__add-button').element)
  })

  it('方向键只移动焦点，不改选中（SingleSelectionFollowsFocus=False）', async () => {
    wrapper = makeHost({ titles: ['A', 'B'] })
    const firstTab = tabs(wrapper)[0]!.element as HTMLElement
    firstTab.focus()
    pressKey(firstTab, 'ArrowRight')
    await nextTick()
    expect(selectedTab(wrapper)?.text()).toBe('A')
  })

  it('方向键在面板内容里不拦截（焦点不在 tab 条内 ⇒ 不处理）', async () => {
    wrapper = makeHost({ titles: ['A', 'B'] })
    const panel = panels(wrapper)[0]!.element as HTMLElement
    const paragraph = panel.querySelector('p') as HTMLElement
    paragraph.focus()
    const event = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
      cancelable: true,
    })
    paragraph.dispatchEvent(event)
    await nextTick()
    expect(event.defaultPrevented).toBe(false)
  })

  it('RTL 下「左」才是前进', async () => {
    wrapper = makeHost({ titles: ['A', 'B'], extraProps: { dir: 'rtl' } })
    const firstTab = tabs(wrapper)[0]!.element as HTMLElement
    firstTab.focus()
    pressKey(firstTab, 'ArrowLeft')
    await nextTick()
    expect((document.activeElement as HTMLElement).dataset.fuiTabViewClose).toBeDefined()
  })
})

describe('FluereTabView 样式契约（源码文本）', () => {
  it('视觉值全部走 token，禁用/选中/悬停各态都有明确 token', () => {
    for (const token of [
      '--solidBackgroundFillColorTertiary',
      '--layerOnMicaBaseAltFillColorSecondary',
      '--layerOnMicaBaseAltFillColorDefault',
      '--layerOnMicaBaseAltFillColorTransparent',
      '--dividerStrokeColorDefault',
      '--colorNeutralStrokeAlpha',
      '--subtleFillColorSecondary',
      '--subtleFillColorTertiary',
      '--colorSubtleBackground',
      '--colorNeutralForeground1',
      '--colorNeutralForeground2',
      '--colorNeutralForeground3',
      '--colorNeutralForegroundDisabled',
      '--borderRadiusXLarge',
      '--borderRadiusMedium',
    ]) {
      expect(css, `样式里应引用 ${token}`).toContain(`var(${token})`)
    }
  })

  it('几何逐条对齐 themeresources：32 / 100 / 240 / 12 / 16 / 10 / 8 / 3 / 4 / 1', () => {
    for (const snippet of [
      '--fui-tab-view-tab-min-height: 32px',
      '--fui-tab-view-tab-min-width: 100px',
      '--fui-tab-view-tab-max-width: 240px',
      '--fui-tab-view-strip-padding-top: 8px',
      '--fui-tab-view-icon-size: 16px',
      '--fui-tab-view-icon-margin: 10px',
      '--fui-tab-view-close-width: 32px',
      '--fui-tab-view-close-height: 24px',
      '--fui-tab-view-close-margin: 4px',
      '--fui-tab-view-button-width: 32px',
      '--fui-tab-view-button-height: 24px',
      '--fui-tab-view-tab-padding-block: 3px',
      '--fui-tab-view-tab-padding-inline-start: 8px',
      '--fui-tab-view-tab-padding-inline-end: 4px',
      '--fui-tab-view-tab-padding-inline-end-no-close: 8px',
      '--fui-tab-view-fillet: 4px',
      '--fui-tab-view-tab-border: var(--strokeWidthThin)',
      '--fui-tab-view-add-area-padding: 0 0 3px 3px',
      '--fui-tab-view-scroll-area-padding-start: 0 3px 3px 8px',
      '--fui-tab-view-scroll-area-padding-end: 0 8px 3px 3px',
    ]) {
      expect(css, `缺少几何声明 ${snippet}`).toContain(snippet)
    }
  })

  it('选中态：只取上半圆角 + 无底边 + 4px 外扩内凹圆角 + SemiBold', () => {
    expect(css).toContain('border-start-start-radius: var(--fui-tab-view-tab-radius)')
    expect(css).toContain('border-start-end-radius: var(--fui-tab-view-tab-radius)')
    expect(css).toMatch(/data-state='active'[^}]*border-width: var\(--fui-tab-view-tab-border\)/)
    expect(css).toMatch(/font-weight: var\(--fontWeightSemibold\)/)
    expect(css).toMatch(/inset-inline: calc\(-1 \* var\(--fui-tab-view-fillet\)\)/)
    expect(css).toContain('mask-image:')
  })

  it('没有任何 transition（上游所有 GoToState 都是 false）', () => {
    expect(css).not.toMatch(/transition\s*:/)
  })

  it('不写裸 z-index：局部叠层走组件变量', () => {
    expect(css).toContain('--fui-tab-view-selected-z: 1')
    expect(css).toMatch(/z-index: var\(--fui-tab-view-selected-z\)/)
    expect(css).not.toMatch(/z-index:\s*\d/)
  })

  it('焦点矩形复用 0.4.3 原语（useFocusVisual）', () => {
    expect(sfc).toContain("import { useFocusVisual } from '../focus-visual/use-focus-visual'")
    expect(sfc).toContain(':class="focusVisual.class"')
    expect(sfc).toContain(':style="focusVisual.style"')
  })

  it('子项组件不渲染任何 DOM（数据型子组件）', () => {
    expect(stripComments(itemSfc)).toMatch(/<template>\s*<\/template>/)
  })
})

describe('子项属性的读取口径（原始 vnode props）', () => {
  it('模板里的 kebab-case 属性同样生效（`:is-closable` / `:aria-label`）', () => {
    wrapper = mount(
      defineComponent({
        components: { FluereTabView, FluereTabViewItem },
        template: `
          <FluereTabView label="选项卡">
            <FluereTabViewItem header="One">a</FluereTabViewItem>
            <FluereTabViewItem header="Two" :is-closable="false" :aria-label="'第二个'">b</FluereTabViewItem>
          </FluereTabView>
        `,
      }),
    )
    expect(tabs(wrapper)[1]!.find('[data-fui-tab-view-close]').exists()).toBe(false)
    expect(tabs(wrapper)[1]!.attributes('aria-label')).toBe('第二个')
  })

  it('裸属性（`disabled`）按 Vue 的 Boolean 转换视为 true', () => {
    wrapper = mount(
      defineComponent({
        components: { FluereTabView, FluereTabViewItem },
        template: `
          <FluereTabView label="选项卡">
            <FluereTabViewItem header="One">a</FluereTabViewItem>
            <FluereTabViewItem header="Two" disabled>b</FluereTabViewItem>
          </FluereTabView>
        `,
      }),
    )
    expect(tabs(wrapper)[1]!.attributes('data-disabled')).toBeDefined()
    expect(tabs(wrapper)[1]!.attributes('aria-disabled')).toBe('true')
  })
})

describe('FluereTabViewItem 独立使用', () => {
  it('脱离 TabView 挂载时给出开发期警告且不渲染内容', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      wrapper = mount(FluereTabViewItem, { props: { header: 'X' } })
      expect(wrapper.text()).toBe('')
      expect(warn).toHaveBeenCalled()
    } finally {
      warn.mockRestore()
    }
  })
})
