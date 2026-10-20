/* oxlint-disable import/no-nodejs-modules, no-magic-numbers, prefer-named-capture-group, unicorn/prefer-string-replace-all --
   契约测试要读 SFC 源码文本做正则解析（jsdom 不解析 var()，见 docs/style-spec.md §7.1）；
   样式里的像素 / 时长 / 百分比是 A 级关键帧原值，属测试断言细节 */
/**
 * `FluereSplitButton` 契约。
 *
 * 行为侧对齐 WinUI `SplitButton`（tag `winui3/release/2.5.1`）：
 *   - 主区 click 抛 `click`；箭头区 click 开 / 关菜单；
 *   - 面板是 0.6.1 `FluereMenuFlyout` 的锚点模式（`role=menu`），条目激活冒泡为 `select`；
 *   - 浮层打开时点击主区只关闭浮层（等价 Popup light-dismiss），不再抛 `click`；
 *   - `Alt+Down` / `F4` 开浮层并聚焦首项；菜单内 ↑↓ / Home / End / Tab / Esc 由菜单族负责；
 *   - 未传 `#flyout` 时箭头区 no-op（对齐 WinUI `GetFlyout() == null`）；
 *   - 受控 / 非受控 `open` 都支持。
 * 样式侧从内部基座 `split-button-base.vue` 的源码解析（jsdom 拿不到 `var()` 计算值），
 * 守住「几何 / 状态色 / 动效都走 token 或组件局部变量」这条硬约束；同时断言浮层样式
 * 已交给菜单族（不再有本组件的 Teleport 面板 CSS）。
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick } from 'vue'
import type { VNode } from 'vue'
import FluereMenuFlyoutItem from '../menu-flyout/menu-flyout-item.vue'
import FluereSplitButton from './split-button.vue'
import type { FluereSplitButtonFlyoutSlotProps } from './types'

const here = dirname(fileURLToPath(import.meta.url))
/** 内部基座是模板 / 样式 / 行为的事实源，契约与样式都从它读 */
const baseSfc = readFileSync(resolve(here, 'split-button-base.vue'), 'utf8')

/** 取所有 `<style>` 块（接入菜单族后应当只剩一个 scoped 块） */
const styleBlocks = [...baseSfc.matchAll(/<style(?<attrs>[^>]*)>(?<css>[\s\S]*?)<\/style>/g)].map(
  (match) => ({
    attrs: match.groups?.attrs ?? '',
    css: match.groups?.css ?? '',
  }),
)
const scopedCss = styleBlocks.find((block) => block.attrs.includes('scoped'))?.css ?? ''

/** 去掉注释后的样式，避免把注释里写的 WinUI 原值当成实现证据 */
const stripComments = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, '')

/** 选择器 → 声明（同名选择器合并；`@media` 内层规则按内层选择器读） */
const readStyleRules = (css: string): Map<string, string> => {
  const rules = new Map<string, string>()
  const blocks = stripComments(css)
    .replace(/@media[^{]*{/g, '')
    .split('}')
  for (const block of blocks) {
    const [selectorText, declarations] = block.split('{')
    if (selectorText === undefined || declarations === undefined) {
      continue
    }
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
  return rules
}

const scopedRules = readStyleRules(scopedCss)
const scopedRule = (selector: string): string => scopedRules.get(selector) ?? ''

const readKeyframes = (name: string): string => {
  const match = new RegExp(`@keyframes ${name}\\s*\\{(?<body>[\\s\\S]*?)\\n\\}`).exec(
    stripComments(scopedCss),
  )
  return (match?.groups?.body ?? '').replace(/\s+/g, ' ').trim()
}

/** 组件局部变量（`--fui-split-button-*: …;`）的取值 */
const customProp = (name: string): string => {
  const match = new RegExp(`--${name}\\s*:\\s*(?<value>[^;]+);`).exec(stripComments(scopedCss))
  return (match?.groups?.value ?? '').trim()
}

beforeEach(() => {
  // reka 的方向键导航会调用 scrollIntoView；jsdom 没有实现
  Element.prototype.scrollIntoView = vi.fn()
})

const mountedWrappers: { unmount: () => void }[] = []
afterEach(() => {
  for (const wrapper of mountedWrappers.splice(0)) {
    wrapper.unmount()
  }
})

/** 默认菜单内容：三条 `FluereMenuFlyoutItem`（菜单族的条目语义 + 冒泡 select） */
const menuContent = () => [
  h(FluereMenuFlyoutItem, { text: '文件夹', value: 'folder' }),
  h(FluereMenuFlyoutItem, { text: '文本文档', value: 'document' }),
  h(FluereMenuFlyoutItem, { text: '压缩文件', value: 'archive' }),
]

/** VTU `slots` 的值类型（直接写 `Record<string, unknown>` 过不了 vue-tsc 的严格检查） */
type TestSlot = string | VNode | ((...args: never[]) => unknown) | { template: string }
type TestSlots = Record<string, TestSlot | TestSlot[] | undefined>

const mountSplit = (props: Record<string, unknown> = {}, slots: TestSlots = {}) => {
  // `flyout` 缺省给三条菜单项；显式传 `{ flyout: undefined }` 用于「没有菜单」的分支
  const flyoutSlot = 'flyout' in slots ? slots.flyout : () => menuContent()
  const finalSlots: TestSlots = { ...slots }
  delete finalSlots.flyout
  if (flyoutSlot !== undefined) {
    finalSlots.flyout = flyoutSlot
  }
  const wrapper = mount(FluereSplitButton, {
    props,
    slots: finalSlots,
    attachTo: document.body,
  })
  mountedWrappers.push(wrapper)
  return wrapper
}

/** 菜单面板（菜单族 presenter；Teleport 到 body） */
const panel = (): HTMLElement | null =>
  document.body.querySelector<HTMLElement>('.fui-menu-flyout__presenter')

const menuItems = (): HTMLElement[] => [
  ...document.body.querySelectorAll<HTMLElement>('[role="menuitem"], [role="menuitemcheckbox"]'),
]

/** 底座的 document 监听在挂载后用一个 `setTimeout(0)` 注册（reka 防同帧误判），
 *  所以断言关闭路径前必须让宏任务跑完（AGENTS.md「分清微任务与宏任务」） */
const flushTimer = (): Promise<void> => new Promise((done) => setTimeout(done, 20))

/**
 * jsdom 不会跑 CSS 动画：菜单族的 Presence 等不到 `animationend` 就不会卸载
 * （真实浏览器里由关闭动画驱动）。测试里手动补这一事件，模拟退出动画结束。
 */
const finishExitAnimations = async (): Promise<void> => {
  await nextTick()
  for (const element of document.body.querySelectorAll<HTMLElement>('[data-state="closed"]')) {
    const event = new Event('animationend', { bubbles: true })
    Object.defineProperty(event, 'animationName', { value: 'fui-menu-flyout-close' })
    element.dispatchEvent(event)
  }
  await nextTick()
  await nextTick()
}

const openBySecondary = async (wrapper: ReturnType<typeof mountSplit>): Promise<void> => {
  await wrapper.get('.fui-split-button__secondary').trigger('click')
  await nextTick()
  await flushPromises()
  await flushTimer()
}

describe('FluereSplitButton · 渲染与 aria', () => {
  it('根节点 + 主区 / 箭头区两个按钮，未展开时 data-state=closed', () => {
    const wrapper = mountSplit()
    const root = wrapper.get('.fui-split-button')
    expect(root.attributes('data-state')).toBe('closed')
    expect(root.attributes('data-checked')).toBeUndefined()
    expect(wrapper.find('.fui-split-button__primary').exists()).toBe(true)
    expect(wrapper.find('.fui-split-button__secondary').exists()).toBe(true)
    expect(wrapper.find('.fui-split-button__divider').exists()).toBe(true)
    expect(wrapper.find('.fui-split-button__primary-border').exists()).toBe(true)
    expect(wrapper.find('.fui-split-button__secondary-border').exists()).toBe(true)
  })

  it('箭头区缺省可访问名取 locale 切片（更多选项 / More Options）', () => {
    const zh = mountSplit()
    expect(zh.get('.fui-split-button__secondary').attributes('aria-label')).toBe('更多选项')

    const en = mountSplit({ locale: 'en' })
    expect(en.get('.fui-split-button__secondary').attributes('aria-label')).toBe('More Options')

    const overridden = mountSplit({ secondaryLabel: '新建选项' })
    expect(overridden.get('.fui-split-button__secondary').attributes('aria-label')).toBe('新建选项')
  })

  it('主区可访问名走 label；无 label 时由插槽文本提供', () => {
    const wrapper = mountSplit({ label: '新建' }, { default: () => '新建文档' })
    const primary = wrapper.get('.fui-split-button__primary')
    expect(primary.attributes('aria-label')).toBe('新建')
    expect(primary.text()).toContain('新建文档')
  })

  it('箭头区输出 aria-haspopup="menu" / aria-expanded；不再输出 aria-controls', () => {
    const wrapper = mountSplit()
    const secondary = wrapper.get('.fui-split-button__secondary')
    // 0.6.1 起内建内容就是菜单，缺省播报菜单而不是对话框
    expect(secondary.attributes('aria-haspopup')).toBe('menu')
    expect(secondary.attributes('aria-expanded')).toBe('false')
    // 菜单面板由 reka 渲染、没有稳定 id；APG 只要求 aria-haspopup + aria-expanded
    expect(secondary.attributes('aria-controls')).toBeUndefined()

    const dialog = mountSplit({ hasPopup: 'dialog' })
    expect(dialog.get('.fui-split-button__secondary').attributes('aria-haspopup')).toBe('dialog')
  })

  it('透传的 class / id 落在控件根节点而不是触发按钮上', () => {
    const wrapper = mountSplit({ class: 'my-split', id: 'split-1' })
    const root = wrapper.get('.fui-split-button')
    expect(root.classes()).toContain('my-split')
    expect(root.attributes('id')).toBe('split-1')
    expect(wrapper.get('.fui-split-button__primary').attributes('id')).toBeUndefined()
  })
})

describe('FluereSplitButton · 主区点击', () => {
  it('主区 click 抛 click 事件并带回原生事件', async () => {
    const wrapper = mountSplit()
    await wrapper.get('.fui-split-button__primary').trigger('click')
    const emitted = wrapper.emitted('click')
    expect(emitted).toHaveLength(1)
    const payload = emitted?.[0]?.[0]
    expect(payload).toBeInstanceOf(MouseEvent)
    expect((payload as MouseEvent).type).toBe('click')
  })

  it('箭头区 click 不触发主区 click', async () => {
    const wrapper = mountSplit()
    await wrapper.get('.fui-split-button__secondary').trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
  })
})

describe('FluereSplitButton · 菜单开合（内建 MenuFlyout）', () => {
  it('未传 #flyout 时箭头区不打开、菜单宿主也不渲染（对齐 WinUI GetFlyout() == null）', async () => {
    const wrapper = mountSplit({}, { flyout: undefined })
    await openBySecondary(wrapper)

    expect(wrapper.emitted('update:open')).toBeUndefined()
    expect(wrapper.emitted('opened')).toBeUndefined()
    expect(panel()).toBeNull()

    // 受控强行 open 也不该出现空菜单（菜单宿主由 hasFlyout 短路）
    const forced = mountSplit({ open: true }, { flyout: undefined })
    await nextTick()
    await flushPromises()
    expect(panel()).toBeNull()
    expect(forced.get('.fui-split-button').attributes('data-state')).toBe('open')
  })

  it('箭头区点击：非受控开 → 菜单 Teleport 到 body、aria 同步、抛 opened', async () => {
    const wrapper = mountSplit()
    await openBySecondary(wrapper)

    expect(wrapper.emitted('update:open')).toEqual([[true]])
    expect(wrapper.emitted('opened')).toHaveLength(1)
    expect(wrapper.get('.fui-split-button').attributes('data-state')).toBe('open')
    expect(wrapper.get('.fui-split-button__secondary').attributes('aria-expanded')).toBe('true')

    const menu = panel()
    expect(menu).not.toBeNull()
    expect(menu?.getAttribute('data-state')).toBe('open')
    // 菜单族的 role=menu 语义：不再是被替换掉的 role=dialog 占位面板
    expect(menu?.getAttribute('role')).toBe('menu')
    expect(menu?.getAttribute('aria-label')).toBe('更多选项')
    expect(menuItems().map((item) => item.textContent?.trim())).toEqual([
      '文件夹',
      '文本文档',
      '压缩文件',
    ])
    // 打开后焦点进入首个条目（WinUI MenuFlyoutPresenter::SetInitialFocus）
    expect(document.activeElement).toBe(menuItems()[0])
  })

  it('再次点击箭头区关闭菜单并抛 closed', async () => {
    const wrapper = mountSplit()
    await openBySecondary(wrapper)
    await wrapper.get('.fui-split-button__secondary').trigger('click')
    await nextTick()
    await flushPromises()

    expect(wrapper.emitted('update:open')).toEqual([[true], [false]])
    expect(wrapper.emitted('closed')).toHaveLength(1)
    expect(wrapper.get('.fui-split-button__secondary').attributes('aria-expanded')).toBe('false')
    // jsdom 不跑 CSS 动画：菜单族的 Presence 会直接卸载（真实浏览器的退出动效由
    // 菜单族样式里的 200ms close keyframes 驱动，见 menu-flyout.vue）
    await finishExitAnimations()
    expect(panel()).toBeNull()
  })

  it('浮层打开时点击主区只关闭浮层，不再抛主区 click', async () => {
    const wrapper = mountSplit()
    await openBySecondary(wrapper)
    await wrapper.get('.fui-split-button__primary').trigger('click')
    await nextTick()
    await flushPromises()

    expect(wrapper.emitted('click')).toBeUndefined()
    expect(wrapper.emitted('update:open')).toEqual([[true], [false]])
    await finishExitAnimations()
    expect(panel()).toBeNull()
  })

  it('外部 pointerdown 关闭菜单', async () => {
    const wrapper = mountSplit()
    await openBySecondary(wrapper)
    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
    await nextTick()
    await flushPromises()

    expect(wrapper.emitted('update:open')).toEqual([[true], [false]])
    await finishExitAnimations()
    expect(panel()).toBeNull()
  })

  it('Esc 关闭菜单并把焦点还给打开它的箭头区', async () => {
    const wrapper = mountSplit()
    const secondary = wrapper.get('.fui-split-button__secondary').element as HTMLElement
    secondary.focus()
    await openBySecondary(wrapper)
    expect(document.activeElement).toBe(menuItems()[0])

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()
    await flushPromises()
    await nextTick()

    expect(wrapper.emitted('update:open')).toEqual([[true], [false]])
    expect(document.activeElement).toBe(secondary)
    await finishExitAnimations()
    expect(panel()).toBeNull()
  })

  it('受控 open：只认 Prop，点击只抛 update:open 不动内部状态', async () => {
    const wrapper = mountSplit({ open: false })
    await openBySecondary(wrapper)

    expect(wrapper.emitted('update:open')).toEqual([[true]])
    expect(panel()).toBeNull()
    expect(wrapper.get('.fui-split-button').attributes('data-state')).toBe('closed')
  })

  it('受控 open=true 时首帧直接渲染菜单', async () => {
    mountSplit({ open: true })
    await nextTick()
    await flushPromises()
    expect(panel()).not.toBeNull()
    expect(panel()?.getAttribute('role')).toBe('menu')
  })

  it('#flyout 插槽拿到 close()，可编程关闭并抛 closed', async () => {
    const wrapper = mountSplit(
      {},
      {
        flyout: (props: FluereSplitButtonFlyoutSlotProps) =>
          h(
            'button',
            {
              class: 'flyout-close',
              onClick: () => props.close(),
            },
            '关闭',
          ),
      },
    )
    await openBySecondary(wrapper)
    const closeButton = document.body.querySelector<HTMLElement>('.flyout-close')
    expect(closeButton).not.toBeNull()
    closeButton?.click()
    await nextTick()
    await flushPromises()

    expect(wrapper.emitted('update:open')).toEqual([[true], [false]])
    expect(wrapper.emitted('closed')).toHaveLength(1)
    await finishExitAnimations()
    expect(panel()).toBeNull()
  })
})

describe('FluereSplitButton · 菜单选中（select 冒泡）', () => {
  it('点击条目抛 select 载荷并关闭菜单', async () => {
    const wrapper = mountSplit()
    await openBySecondary(wrapper)
    menuItems()[0]?.click()
    await nextTick()
    await nextTick()

    expect(wrapper.emitted('select')).toEqual([[{ value: 'folder', text: '文件夹' }]])
    // 选中后按菜单族缺省 closeOnSelect 关闭整个菜单
    expect(wrapper.emitted('update:open')).toEqual([[true], [false]])
    await finishExitAnimations()
    expect(panel()).toBeNull()
  })

  it('Enter 激活当前条目（菜单族键盘），并冒泡 select', async () => {
    const wrapper = mountSplit()
    await openBySecondary(wrapper)
    const first = menuItems()[0]
    expect(document.activeElement).toBe(first)
    first?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await nextTick()
    await nextTick()

    expect(wrapper.emitted('select')).toEqual([[{ value: 'folder', text: '文件夹' }]])
  })
})

describe('FluereSplitButton · 键盘', () => {
  it('F4 打开菜单并聚焦首个条目', async () => {
    const wrapper = mountSplit()
    await wrapper.get('.fui-split-button__primary').trigger('keydown', { key: 'F4' })
    await nextTick()
    await flushPromises()
    await flushTimer()

    expect(wrapper.emitted('update:open')).toEqual([[true]])
    expect(panel()).not.toBeNull()
    expect(document.activeElement).toBe(menuItems()[0])
  })

  it('Alt+ArrowDown 打开菜单', async () => {
    const wrapper = mountSplit()
    await wrapper
      .get('.fui-split-button__primary')
      .trigger('keydown', { key: 'ArrowDown', altKey: true })
    await nextTick()
    await flushPromises()

    expect(wrapper.emitted('update:open')).toEqual([[true]])
    expect(panel()).not.toBeNull()
  })

  it('箭头区 ArrowDown 打开菜单（APG split button 的可发现性补充）', async () => {
    const wrapper = mountSplit()
    await wrapper.get('.fui-split-button__secondary').trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    await flushPromises()

    expect(wrapper.emitted('update:open')).toEqual([[true]])
    expect(panel()).not.toBeNull()
  })

  it('菜单内 ↑ / ↓ 循环移动焦点（由菜单族接管，不在 SplitButton 重复实现）', async () => {
    const wrapper = mountSplit()
    await openBySecondary(wrapper)
    const items = menuItems()
    items[0]?.focus()

    items[0]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    await nextTick()
    expect(document.activeElement).toBe(items[1])

    items[1]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    await nextTick()
    expect(document.activeElement).toBe(items[2])

    items[2]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    await nextTick()
    expect(document.activeElement).toBe(items[0])
  })

  it('Space / Enter 按下期间根节点进入 keyboard-pressed 状态，抬起后清除', async () => {
    const wrapper = mountSplit()
    const root = wrapper.get('.fui-split-button')
    const primary = wrapper.get('.fui-split-button__primary')

    await primary.trigger('keydown', { key: ' ' })
    expect(root.attributes('data-keyboard-pressed')).toBeDefined()
    await primary.trigger('keyup', { key: ' ' })
    expect(root.attributes('data-keyboard-pressed')).toBeUndefined()

    await primary.trigger('keydown', { key: 'Enter' })
    expect(root.attributes('data-keyboard-pressed')).toBeDefined()
    await primary.trigger('keyup', { key: 'Enter' })
    expect(root.attributes('data-keyboard-pressed')).toBeUndefined()
  })
})

describe('FluereSplitButton · 禁用', () => {
  it('两个按钮都 disabled，根节点带 data-disabled；点击不抛任何事件', async () => {
    const wrapper = mountSplit({ disabled: true })
    const root = wrapper.get('.fui-split-button')
    const primary = wrapper.get('.fui-split-button__primary')
    const secondary = wrapper.get('.fui-split-button__secondary')

    expect(root.attributes('data-disabled')).toBeDefined()
    expect(primary.attributes('disabled')).toBeDefined()
    expect(secondary.attributes('disabled')).toBeDefined()

    await primary.trigger('click')
    await secondary.trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
    expect(wrapper.emitted('update:open')).toBeUndefined()
    expect(panel()).toBeNull()
  })
})

describe('FluereSplitButton · 样式与规格契约', () => {
  it('样式只剩一个 scoped 块：浮层面板样式交给菜单族，不再留非 scoped 的 Teleport 面板 CSS', () => {
    expect(styleBlocks).toHaveLength(1)
    expect(styleBlocks[0]?.attrs).toContain('scoped')
    // 旧的临时面板类名 / 局部变量必须全部清掉，避免「样式看起来还在」的错觉
    expect(baseSfc).not.toContain('.fui-split-button__flyout')
    expect(baseSfc).not.toContain('--fui-split-button-flyout')
    // 模板里也不再有 reka Popover 的占位
    expect(baseSfc).not.toContain('PopoverRoot')
    expect(baseSfc).not.toContain('PopoverContent')
  })

  it('浮层由 FluereMenuFlyout 锚点模式承载（anchor / placement / 受控 open / select 上提）', () => {
    expect(baseSfc).toContain("import FluereMenuFlyout from '../menu-flyout/menu-flyout.vue'")
    expect(baseSfc).toContain(':anchor="rootRef"')
    expect(baseSfc).toContain('placement="bottom-edge-aligned-left"')
    expect(baseSfc).toContain(':side-offset="FLYOUT_SIDE_OFFSET"')
    expect(baseSfc).toContain(':open="isOpen"')
    expect(baseSfc).toContain('@select="onMenuSelect"')
    // A 级 FlyoutMargin = 4（旧临时面板取 0 的口径已在本次接入修正）
    expect(baseSfc).toContain('const FLYOUT_SIDE_OFFSET = 4')
    // 不再自己注册 document 关闭监听 / 复用浮层原语：关闭与层级归菜单族
    expect(baseSfc).not.toContain('onFlyoutPointerDownOutside')
    expect(baseSfc).not.toContain("from '../flyout/use-flyout'")
  })

  it('普通声明里的颜色一律走 token / 组件局部变量，不写裸色值', () => {
    const code = stripComments(scopedCss)
    const declarations = [...code.matchAll(/(?<prop>[-a-zA-Z]+)\s*:\s*(?<value>[^;]+);/g)]
    for (const match of declarations) {
      const prop = match.groups?.prop ?? ''
      const value = match.groups?.value ?? ''
      // 局部变量定义允许写 A 级原值（无同值 token 的档位，见文件头）
      if (prop.startsWith('--')) {
        continue
      }
      // 只审「值里真的出现颜色字面量」的声明；`border: 0` 这类几何简写不在此列
      if (!/#[\da-f]{3,8}|rgba?\(|hsla?\(/i.test(value)) {
        continue
      }
      expect(value, `${prop}: ${value}`).toContain('var(--')
    }
  })

  it('几何逐条对齐 SplitButton_themeresources.xaml（35 / 1 / 11,6,11,7 / 12）', () => {
    expect(customProp('fui-split-button-primary-min-size')).toBe('35px')
    expect(customProp('fui-split-button-secondary-size')).toBe('35px')
    expect(customProp('fui-split-button-separator-size')).toBe('1px')
    expect(customProp('fui-split-button-padding-block-start')).toBe('6px')
    expect(customProp('fui-split-button-padding-inline')).toBe('11px')
    expect(customProp('fui-split-button-padding-block-end')).toBe('7px')
    expect(customProp('fui-split-button-secondary-padding-inline-end')).toBe('12px')
    expect(customProp('fui-split-button-chevron-size')).toBe('12px')
    expect(customProp('fui-split-button-corner-radius')).toBe('var(--borderRadiusMedium)')

    expect(scopedRule('.fui-split-button')).toContain('inline-grid')
    expect(scopedRule('.fui-split-button')).toContain(
      'minmax(var(--fui-split-button-primary-min-size), 1fr)',
    )
    expect(scopedRule('.fui-split-button__primary')).toContain(
      'padding: var(--fui-split-button-padding-block-start) var(--fui-split-button-padding-inline) var(--fui-split-button-padding-block-end)',
    )
  })

  it('主区 / 箭头区的描边各自独立成层（A 级 PrimaryButtonBorder / SecondaryButtonBorder）', () => {
    const primaryBorder = scopedRule('.fui-split-button__primary-border')
    expect(primaryBorder).toContain('border-block-start-width: var(--strokeWidthThin)')
    expect(primaryBorder).toContain('border-inline-start-width: var(--strokeWidthThin)')
    // 先 `border-width: 0` 再单独给 top / start / bottom，自然就没有 inline-end 边
    expect(primaryBorder).toContain('border-width: 0')
    expect(primaryBorder).toContain('border-start-start-radius')

    const secondaryBorder = scopedRule('.fui-split-button__secondary-border')
    expect(secondaryBorder).toContain('border-inline-end-width: var(--strokeWidthThin)')
    expect(secondaryBorder).toContain('border-width: 0')
  })

  it('状态位齐全：open / checked / keyboard-pressed / disabled 都有独立规则', () => {
    const selectors = [...scopedRules.keys()].join('\n')
    expect(selectors).toContain("[data-state='open']")
    expect(selectors).toContain("[data-checked='true']")
    expect(selectors).toContain('[data-keyboard-pressed]')
    expect(selectors).toContain('.fui-split-button--disabled')
  })

  it('画刷映射走 A 级命名对应的 token（含 0.5.7 落盘的 ControlStrokeColorDefault）', () => {
    expect(customProp('fui-split-button-background')).toBe('var(--colorNeutralBackground1)')
    expect(customProp('fui-split-button-background-hover')).toBe(
      'var(--colorNeutralBackground1Hover)',
    )
    expect(customProp('fui-split-button-background-pressed')).toBe(
      'var(--colorNeutralBackground1Pressed)',
    )
    expect(customProp('fui-split-button-border')).toBe('var(--colorNeutralStroke1)')
    expect(customProp('fui-split-button-border-pressed')).toBe('var(--controlStrokeColorDefault)')
    expect(customProp('fui-split-button-divider')).toBe('var(--controlStrokeColorDefault)')
    expect(customProp('fui-split-button-checked-background')).toBe('var(--colorBrandBackground)')
    expect(customProp('fui-split-button-checked-divider')).toBe('rgba(0, 0, 0, 0.216)')
  })

  it('无同值 token 的可见量落组件局部变量并注明取值（checked pressed / disabled 前景）', () => {
    expect(customProp('fui-split-button-checked-pressed-foreground')).toContain('light-dark(')
    // 注释里保留 A 级原值，便于覆写回 WinUI 值
    expect(baseSfc).toContain('#B3FFFFFF')
    expect(baseSfc).toContain('#80000000')
    expect(baseSfc).toContain('#37000000')
  })

  it('箭头动效逐帧对齐 AnimatedChevronDownSmallVisualSource（两段关键帧 + 局部时长变量）', () => {
    expect(customProp('fui-split-button-chevron-press-duration')).toBe('150.8ms')
    expect(customProp('fui-split-button-chevron-release-duration')).toBe('316.7ms')

    const press = readKeyframes('fui-split-button-chevron-press')
    expect(press).toContain('translateY(0)')
    expect(press).toContain('translateY(1.875px)')

    const release = readKeyframes('fui-split-button-chevron-release')
    expect(release).toContain('translateY(1.875px)')
    expect(release).toContain('translateY(-0.75px)')
    expect(release).toContain('translateY(0)')
    expect(release).toContain('27.5%')
    expect(release).toContain('cubic-bezier(0.55, 0, 0.75, 1)')
    expect(release).toContain('cubic-bezier(0.35, 0, 0, 1)')

    expect(scopedCss).toContain('prefers-reduced-motion: reduce')
  })
})
