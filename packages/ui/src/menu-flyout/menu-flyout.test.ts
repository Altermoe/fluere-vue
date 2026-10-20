/* oxlint-disable import/no-nodejs-modules -- 契约测试需读 SFC 源码文本（jsdom 不解析 var()） */
/**
 * `FluereMenuFlyout` 族契约测试（0.6.1）。
 *
 * 分三层：
 *  ① **行为**：开合（触发器 / 受控 / `showAt`）、条目选中、Toggle 勾选、键盘
 *     （↑↓ 循环 / Home / End / Tab 吞掉 / Esc）、子菜单（→ 开 / ← 与 Esc 只关自己）；
 *  ② **结构 / aria**：`role=menu` / `menuitem` / `menuitemcheckbox` / `separator`，
 *     图标与勾选列占位（面板级统计）；
 *  ③ **样式**：从 SFC 源码文本断言 token、几何、动画常量与非 scoped 块
 *     （jsdom 不解析 `var()`，见 docs/style-spec §7.1）。
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import FluereMenuFlyoutItem from './menu-flyout-item.vue'
import FluereMenuFlyoutSeparator from './menu-flyout-separator.vue'
import FluereMenuFlyoutSubItem from './menu-flyout-sub-item.vue'
import FluereMenuFlyoutToggleItem from './menu-flyout-toggle-item.vue'
import FluereMenuFlyout from './menu-flyout.vue'

const here = dirname(fileURLToPath(import.meta.url))
const rootSfc = readFileSync(resolve(here, 'menu-flyout.vue'), 'utf8')
const itemSfc = readFileSync(resolve(here, 'menu-flyout-item.vue'), 'utf8')
const subItemSfc = readFileSync(resolve(here, 'menu-flyout-sub-item.vue'), 'utf8')
const toggleSfc = readFileSync(resolve(here, 'menu-flyout-toggle-item.vue'), 'utf8')
const separatorSfc = readFileSync(resolve(here, 'menu-flyout-separator.vue'), 'utf8')

/** 去注释：注释里写着 WinUI 原值，不能当作实现证据 */
const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '')

const styleOf = (source: string): string =>
  stripComments(/<style[^>]*>(?<css>[\s\S]*?)<\/style>/.exec(source)?.groups?.css ?? '')

const rootCss = styleOf(rootSfc)
const itemCss = styleOf(itemSfc)
const subItemCss = styleOf(subItemSfc)
const toggleCss = styleOf(toggleSfc)
const separatorCss = styleOf(separatorSfc)

let wrapper: VueWrapper | undefined = undefined

beforeEach(() => {
  // reka 的 arrow navigation 会调用 scrollIntoView；jsdom 没有实现
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  // attachTo 的用例不要在体内清空 body（Vue 卸载会找不到宿主）
  wrapper?.unmount()
  wrapper = undefined
})

const menu = (): HTMLElement | null => document.body.querySelector('[role="menu"]')

const menuItems = (): HTMLElement[] => [
  ...(document.body.querySelectorAll<HTMLElement>('[role="menuitem"], [role="menuitemcheckbox"]') ??
    []),
]

const press = (target: Element | null | undefined, key: string): void => {
  target?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

/**
 * jsdom 不会跑 CSS 动画，reka 的 Presence 等不到 `animationend` 就不会卸载
 * （真实浏览器里由动画结束驱动）。测试里手动补这一事件，模拟退出动画结束。
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

/** 基础 fixture：触发器 + 三个普通条目 + 分隔线 */
const mountBasic = (options: { closeOnSelect?: boolean } = {}) => {
  const selected: unknown[] = []
  const closed: string[] = []
  const Host = defineComponent({
    components: {
      FluereMenuFlyout,
      FluereMenuFlyoutItem,
      FluereMenuFlyoutSeparator,
      FluereMenuFlyoutToggleItem,
    },
    setup() {
      return {
        selected,
        closed,
        onSelect: (args: unknown) => selected.push(args),
        onClosed: (reason: string) => closed.push(reason),
        closeOnSelect: options.closeOnSelect ?? true,
      }
    },
    template: `
      <FluereMenuFlyout
        :close-on-select="closeOnSelect"
        label="测试菜单"
        @select="onSelect"
        @closed="onClosed"
      >
        <button class="trigger" type="button">打开</button>
        <template #content>
          <FluereMenuFlyoutItem text="新建" value="new" keyboard-accelerator-text="Ctrl+N" />
          <FluereMenuFlyoutItem text="打开" value="open" />
          <FluereMenuFlyoutSeparator />
          <FluereMenuFlyoutItem text="退出" value="exit" disabled />
        </template>
      </FluereMenuFlyout>
    `,
  })
  wrapper = mount(Host, { attachTo: document.body })
  return { selected, closed }
}

const subTrigger = (): HTMLElement | null =>
  document.body.querySelector<HTMLElement>('[aria-haspopup="menu"][role="menuitem"]')

const openMenu = async (): Promise<void> => {
  await wrapper?.get('.trigger').trigger('click')
  await nextTick()
}

describe('FluereMenuFlyout · 开合与结构', () => {
  it('默认渲染触发器，aria 由 reka 输出；菜单初始不存在', async () => {
    mountBasic()
    const trigger = wrapper?.get('.trigger')
    expect(trigger?.attributes('aria-haspopup')).toBe('menu')
    expect(trigger?.attributes('aria-expanded')).toBe('false')
    expect(menu()).toBeNull()
  })

  it('点击触发器展开 role=menu 面板，data-state=open', async () => {
    mountBasic()
    await openMenu()
    const panel = menu()
    expect(panel).not.toBeNull()
    expect(panel?.getAttribute('data-state')).toBe('open')
    expect(panel?.classList.contains('fui-menu-flyout__presenter')).toBe(true)
    expect(panel?.getAttribute('aria-label')).toBe('测试菜单')
    expect(panel?.textContent).toContain('新建')
    expect(wrapper?.get('.trigger').attributes('aria-expanded')).toBe('true')
  })

  it('普通条目 / 分隔线的 role 与禁用状态', async () => {
    mountBasic()
    await openMenu()
    const items = menuItems()
    expect(
      items.map((item) => item.querySelector('.fui-menu-flyout__item-text')?.textContent?.trim()),
    ).toEqual(['新建', '打开', '退出'])
    expect(items[2]?.getAttribute('aria-disabled')).toBe('true')
    expect(document.body.querySelector('[role="separator"]')).not.toBeNull()
  })

  it('点击条目抛 select 并关闭菜单', async () => {
    const { selected, closed } = mountBasic()
    await openMenu()
    menuItems()[0]?.click()
    await nextTick()
    await nextTick()
    expect(selected).toEqual([{ value: 'new', text: '新建' }])
    expect(closed).toEqual(['item-click'])
    await finishExitAnimations()
    expect(menu()).toBeNull()
  })

  it('close-on-select=false 时选中后保持展开', async () => {
    const { selected } = mountBasic({ closeOnSelect: false })
    await openMenu()
    menuItems()[0]?.click()
    await nextTick()
    await nextTick()
    expect(selected).toHaveLength(1)
    expect(menu()).not.toBeNull()
  })
})

describe('FluereMenuFlyout · 键盘', () => {
  it('↑ / ↓ 在条目间循环移动焦点', async () => {
    mountBasic()
    await openMenu()
    const items = menuItems()
    items[0]?.focus()
    press(items[0], 'ArrowDown')
    await nextTick()
    expect(document.activeElement).toBe(items[1])
    // 第 3 项 disabled：CycleFocus 跳过不可聚焦项，从「打开」直接回到首项
    press(items[1], 'ArrowDown')
    await nextTick()
    expect(document.activeElement).toBe(items[0])
    press(items[0], 'ArrowUp')
    await nextTick()
    expect(document.activeElement).toBe(items[1])
  })

  it('Home / End 跳到首尾条目（0.6.1 验收口径；WinUI 源码无此键，见组件注释）', async () => {
    mountBasic()
    await openMenu()
    const items = menuItems()
    items[1]?.focus()
    press(items[1], 'Home')
    await nextTick()
    expect(document.activeElement).toBe(items[0])
    press(document.activeElement, 'End')
    await nextTick()
    // End = 末个**可聚焦**条目（跳过 disabled 的「退出」）
    expect(document.activeElement).toBe(items[1])
  })

  it('Tab 被吞掉（焦点不移动）', async () => {
    mountBasic()
    await openMenu()
    const items = menuItems()
    items[0]?.focus()
    press(items[0], 'Tab')
    await nextTick()
    expect(document.activeElement).toBe(items[0])
  })

  it('Esc 关闭菜单，closed 载荷为 escape', async () => {
    const { closed } = mountBasic()
    await openMenu()
    press(menu(), 'Escape')
    await nextTick()
    await nextTick()
    expect(closed).toEqual(['escape'])
    await finishExitAnimations()
    expect(menu()).toBeNull()
  })
})

describe('FluereMenuFlyout · Toggle 项', () => {
  it('输出 menuitemcheckbox + aria-checked，点击切换并抛 select.checked', async () => {
    const selected: unknown[] = []
    const Host = defineComponent({
      components: { FluereMenuFlyout, FluereMenuFlyoutToggleItem },
      setup() {
        return { selected, onSelect: (args: unknown) => selected.push(args) }
      },
      template: `
        <FluereMenuFlyout label="切换菜单" @select="onSelect">
          <button class="trigger" type="button">打开</button>
          <template #content>
            <FluereMenuFlyoutToggleItem text="显示隐藏文件" value="hidden" />
          </template>
        </FluereMenuFlyout>
      `,
    })
    wrapper = mount(Host, { attachTo: document.body })
    await openMenu()
    const item = document.body.querySelector<HTMLElement>('[role="menuitemcheckbox"]')
    expect(item).not.toBeNull()
    expect(item?.getAttribute('aria-checked')).toBe('false')
    item?.click()
    await nextTick()
    await nextTick()
    expect(selected).toEqual([{ value: 'hidden', text: '显示隐藏文件', checked: true }])
  })

  it('非受控勾选：点击后 aria-checked 变为 true（Boolean Prop 未传时不能被强转成受控 false）', async () => {
    const Host = defineComponent({
      components: { FluereMenuFlyout, FluereMenuFlyoutToggleItem },
      template: `
        <FluereMenuFlyout label="切换菜单" :close-on-select="false">
          <button class="trigger" type="button">打开</button>
          <template #content>
            <FluereMenuFlyoutToggleItem text="显示隐藏文件" />
          </template>
        </FluereMenuFlyout>
      `,
    })
    wrapper = mount(Host, { attachTo: document.body })
    await openMenu()
    const item = document.body.querySelector<HTMLElement>('[role="menuitemcheckbox"]')
    expect(item?.getAttribute('aria-checked')).toBe('false')
    item?.click()
    await nextTick()
    await nextTick()
    expect(
      document.body.querySelector('[role="menuitemcheckbox"]')?.getAttribute('aria-checked'),
    ).toBe('true')
  })
})

describe('FluereMenuFlyout · 子菜单', () => {
  const mountSubmenu = () => {
    const Host = defineComponent({
      components: {
        FluereMenuFlyout,
        FluereMenuFlyoutItem,
        FluereMenuFlyoutSubItem,
        FluereMenuFlyoutToggleItem,
      },
      template: `
        <FluereMenuFlyout label="根菜单">
          <button class="trigger" type="button">打开</button>
          <template #content>
            <FluereMenuFlyoutItem text="新建" />
            <FluereMenuFlyoutSubItem text="排序方式">
              <FluereMenuFlyoutItem text="按名称" />
              <FluereMenuFlyoutItem text="按日期" />
              <FluereMenuFlyoutSubItem text="更多">
                <FluereMenuFlyoutItem text="按大小" />
              </FluereMenuFlyoutSubItem>
            </FluereMenuFlyoutSubItem>
            <FluereMenuFlyoutToggleItem text="显示扩展名" />
          </template>
        </FluereMenuFlyout>
      `,
    })
    wrapper = mount(Host, { attachTo: document.body })
  }

  it('→ 打开子菜单并把焦点交给首项；层级 z-index 来自 --zIndexSubmenu', async () => {
    mountSubmenu()
    await openMenu()
    const trigger = subTrigger()
    expect(trigger).not.toBeNull()
    trigger?.focus()
    press(trigger, 'ArrowRight')
    await nextTick()
    await nextTick()
    const panels = [...document.body.querySelectorAll<HTMLElement>('[role="menu"]')]
    expect(panels).toHaveLength(2)
    const submenu = panels.find((panel) => panel.textContent?.includes('按名称'))
    expect(submenu?.getAttribute('data-state')).toBe('open')
    // useFlyout 的内联 z-index 引用刻度 token（嵌套提升由层级栈给出 calc 表达式）
    expect(submenu?.style.zIndex).toContain('zIndexSubmenu')
    expect(document.activeElement?.textContent).toContain('按名称')
  })

  it('子菜单内 Esc 只关子菜单，根菜单仍在；焦点回到子项', async () => {
    mountSubmenu()
    await openMenu()
    const trigger = subTrigger()
    trigger?.focus()
    press(trigger, 'ArrowRight')
    await nextTick()
    await nextTick()
    const panels = [...document.body.querySelectorAll<HTMLElement>('[role="menu"]')]
    const submenu = panels.find((panel) => panel.textContent?.includes('按名称'))
    press(submenu, 'Escape')
    await nextTick()
    await finishExitAnimations()
    const remaining = [...document.body.querySelectorAll<HTMLElement>('[role="menu"]')]
    expect(remaining).toHaveLength(1)
    expect(remaining[0]?.textContent).toContain('新建')
    expect(document.activeElement).toBe(trigger)
  })
})

describe('FluereMenuFlyout · 锚点模式', () => {
  it('无触发器时用 anchor + showAt 打开（SplitButton 消费姿势）', async () => {
    const anchor = document.createElement('button')
    anchor.textContent = '锚点'
    document.body.append(anchor)
    const Host = defineComponent({
      components: { FluereMenuFlyout, FluereMenuFlyoutItem },
      template: `
        <div>
          <button class="anchor" type="button">锚点按钮</button>
          <FluereMenuFlyout ref="menu" label="锚点菜单" @update:open="() => {}">
            <template #content>
              <FluereMenuFlyoutItem text="命令" />
            </template>
          </FluereMenuFlyout>
        </div>
      `,
    })
    const host = mount(Host, { attachTo: document.body })
    wrapper = host
    const menuComponent = host.findComponent(FluereMenuFlyout)
    const anchorEl = document.body.querySelector<HTMLElement>('.anchor')
    menuComponent.vm.showAt(anchorEl as HTMLElement)
    await nextTick()
    await nextTick()
    expect(menu()).not.toBeNull()
    host.unmount()
    anchor.remove()
  })
})

describe('FluereMenuFlyout · 面板级占位（图标 / 勾选列）', () => {
  it('存在 Toggle 项时，普通条目补 28px 勾选列占位；Toggle 行含 28px 勾选列', async () => {
    const Host = defineComponent({
      components: {
        FluereMenuFlyout,
        FluereMenuFlyoutItem,
        FluereMenuFlyoutToggleItem,
      },
      template: `
        <FluereMenuFlyout label="占位菜单">
          <button class="trigger" type="button">打开</button>
          <template #content>
            <FluereMenuFlyoutItem text="普通" />
            <FluereMenuFlyoutToggleItem text="开关" />
          </template>
        </FluereMenuFlyout>
      `,
    })
    wrapper = mount(Host, { attachTo: document.body })
    await openMenu()
    const items = menuItems()
    expect(items[0]?.querySelector('.fui-menu-flyout__item-check-placeholder')).not.toBeNull()
    expect(items[1]?.querySelector('.fui-menu-flyout__item-check')).not.toBeNull()
  })
})

describe('FluereMenuFlyout · 样式源码契约', () => {
  it('根面板几何 / 画刷 / 层级全部走 token 或带出处的局部变量', () => {
    expect(rootCss).toContain('min-inline-size: 96px') // FlyoutThemeMinWidth
    expect(rootCss).toContain('min-block-size: 32px') // MenuFlyoutThemeMinHeight
    expect(rootCss).toContain('border-radius: var(--borderRadiusXLarge)') // OverlayCornerRadius 8
    expect(rootCss).toContain(
      'border: var(--strokeWidthThin) solid var(--surfaceStrokeColorFlyout)',
    )
    expect(rootCss).toContain('--acrylicBackgroundFillColorDefault')
    expect(rootCss).toContain('z-index: var(--zIndexMenu)')
    expect(rootCss).toContain('z-index: var(--zIndexSubmenu)')
    expect(rootCss).not.toMatch(/z-index:\s*\d/)
  })

  it('条目几何 / 状态画刷逐条对齐主题资源', () => {
    expect(itemCss).toContain('--spacingVerticalXXS) var(--spacingHorizontalXS)') // Margin 4,2
    expect(itemCss).toContain('--fui-menu-flyout-item-padding-inline, 11px')
    expect(itemCss).toContain('--fui-menu-flyout-item-padding-block-end, 9px')
    expect(itemCss).toContain('--colorSubtleBackgroundHover')
    expect(itemCss).toContain('--colorSubtleBackgroundPressed')
    expect(itemCss).toContain('--colorNeutralForegroundDisabled')
    expect(itemCss).toContain('inline-size: 28px')
  })

  it('Toggle / SubItem / Separator 的关键几何', () => {
    expect(toggleCss).toContain('inline-size: 28px')
    expect(subItemCss).toContain('var(--spacingHorizontalXXL)')
    expect(separatorCss).toContain('block-size: 1px')
    expect(separatorCss).toContain('var(--dividerStrokeColorDefault)')
  })

  it('动画时长引用 token / 局部变量，关闭动画由 Presence 的 animationName 驱动', () => {
    expect(rootCss).toContain(
      'animation: fui-menu-flyout-open var(--fui-menu-flyout-open-duration, var(--durationGentle))',
    )
    expect(rootCss).toContain('--fui-menu-flyout-close-duration')
    expect(rootCss).toContain('@keyframes fui-menu-flyout-open')
    expect(rootCss).toContain('prefers-reduced-motion: reduce')
  })

  it('样式块非 scoped（Teleport 拿不到 data-v-*）', () => {
    for (const source of [rootSfc, itemSfc, subItemSfc, toggleSfc, separatorSfc]) {
      expect(source).not.toContain('<style scoped>')
    }
  })
})
