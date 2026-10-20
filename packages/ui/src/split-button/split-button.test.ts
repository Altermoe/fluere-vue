/* oxlint-disable import/no-nodejs-modules, no-magic-numbers, prefer-named-capture-group, unicorn/prefer-string-replace-all --
   契约测试要读 SFC 源码文本做正则解析（jsdom 不解析 var()，见 docs/style-spec.md §7.1）；
   样式里的像素 / 时长 / 百分比是 A 级关键帧原值，属测试断言细节 */
/**
 * `FluereSplitButton` 契约。
 *
 * 行为侧对齐 WinUI `SplitButton`（tag `winui3/release/2.5.1`）：
 *   - 主区 click 抛 `click`；箭头区 click 开 / 关浮层；
 *   - 浮层打开时点击主区只关闭浮层（等价 Popup light-dismiss），不再抛 `click`；
 *   - `Alt+Down` / `F4` 开浮层；Space / Enter 按下期间整控件进入按下态；
 *   - 受控 / 非受控 `open` 都支持。
 * 样式侧从内部基座 `split-button-base.vue` 的源码解析（jsdom 拿不到 `var()` 计算值），
 * 守住「几何 / 状态色 / 动效都走 token 或组件局部变量」这条硬约束，并把
 * Teleport 面板**必须**写在非 scoped 块这条踩坑固化下来。
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { h, nextTick } from 'vue'
import FluereSplitButton from './split-button.vue'
import type { FluereSplitButtonFlyoutSlotProps } from './types'

const here = dirname(fileURLToPath(import.meta.url))
/** 内部基座是模板 / 样式 / 行为的事实源，契约与样式都从它读 */
const baseSfc = readFileSync(resolve(here, 'split-button-base.vue'), 'utf8')

/** 取所有 `<style>` 块（本组件有 scoped + 非 scoped 两块） */
const styleBlocks = [...baseSfc.matchAll(/<style(?<attrs>[^>]*)>(?<css>[\s\S]*?)<\/style>/g)].map(
  (match) => ({
    attrs: match.groups?.attrs ?? '',
    css: match.groups?.css ?? '',
  }),
)
const scopedCss = styleBlocks.find((block) => block.attrs.includes('scoped'))?.css ?? ''
const globalCss = styleBlocks.find((block) => !block.attrs.includes('scoped'))?.css ?? ''

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
const globalRules = readStyleRules(globalCss)
const ruleOf = (rules: Map<string, string>, selector: string): string => rules.get(selector) ?? ''
const scopedRule = (selector: string): string => ruleOf(scopedRules, selector)
const globalRule = (selector: string): string => ruleOf(globalRules, selector)

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

const mountedWrappers: { unmount: () => void }[] = []
afterEach(() => {
  for (const wrapper of mountedWrappers.splice(0)) {
    wrapper.unmount()
  }
})

const mountSplit = (props: Record<string, unknown> = {}, slots = {}) => {
  const wrapper = mount(FluereSplitButton, {
    props,
    slots,
    attachTo: document.body,
  })
  mountedWrappers.push(wrapper)
  return wrapper
}

const panel = (): HTMLElement | null =>
  document.body.querySelector<HTMLElement>('.fui-split-button__flyout')

/** 底座的 document 监听在挂载后用一个 `setTimeout(0)` 注册（reka 防同帧误判），
 *  所以断言关闭路径前必须让宏任务跑完（AGENTS.md「分清微任务与宏任务」） */
const flushTimer = (): Promise<void> => new Promise((done) => setTimeout(done, 20))

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

  it('箭头区有 aria-haspopup / aria-expanded；缺省按对话框型浮层播报', () => {
    const wrapper = mountSplit()
    const secondary = wrapper.get('.fui-split-button__secondary')
    expect(secondary.attributes('aria-haspopup')).toBe('dialog')
    expect(secondary.attributes('aria-expanded')).toBe('false')
    expect(secondary.attributes('aria-controls')).toBeUndefined()

    const menu = mountSplit({ hasPopup: 'menu' })
    expect(menu.get('.fui-split-button__secondary').attributes('aria-haspopup')).toBe('menu')
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

describe('FluereSplitButton · 浮层开合', () => {
  it('箭头区点击：非受控开 → 面板 Teleport 到 body、aria 同步、抛 opened', async () => {
    const wrapper = mountSplit()
    await openBySecondary(wrapper)

    expect(wrapper.emitted('update:open')).toEqual([[true]])
    expect(wrapper.emitted('opened')).toHaveLength(1)
    expect(wrapper.get('.fui-split-button').attributes('data-state')).toBe('open')
    expect(wrapper.get('.fui-split-button__secondary').attributes('aria-expanded')).toBe('true')
    expect(wrapper.get('.fui-split-button__secondary').attributes('aria-controls')).toBeTruthy()
    expect(panel()).not.toBeNull()
    expect(panel()?.getAttribute('data-state')).toBe('open')
    expect(panel()?.getAttribute('role')).toBe('dialog')
    expect(panel()?.getAttribute('aria-label')).toBe('更多选项')
  })

  it('再次点击箭头区关闭浮层并抛 closed', async () => {
    const wrapper = mountSplit()
    await openBySecondary(wrapper)
    await openBySecondary(wrapper)

    expect(wrapper.emitted('update:open')).toEqual([[true], [false]])
    expect(wrapper.emitted('closed')).toHaveLength(1)
    expect(panel()).toBeNull()
    expect(wrapper.get('.fui-split-button__secondary').attributes('aria-expanded')).toBe('false')
  })

  it('浮层打开时点击主区只关闭浮层，不再抛主区 click', async () => {
    const wrapper = mountSplit()
    await openBySecondary(wrapper)
    await wrapper.get('.fui-split-button__primary').trigger('click')
    await nextTick()

    expect(wrapper.emitted('click')).toBeUndefined()
    expect(wrapper.emitted('update:open')).toEqual([[true], [false]])
    expect(panel()).toBeNull()
  })

  it('外部 pointerdown 关闭浮层', async () => {
    const wrapper = mountSplit()
    await openBySecondary(wrapper)
    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
    await nextTick()
    await flushPromises()

    expect(wrapper.emitted('update:open')).toEqual([[true], [false]])
    expect(panel()).toBeNull()
  })

  it('Esc 关闭浮层', async () => {
    const wrapper = mountSplit()
    await openBySecondary(wrapper)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()
    await flushPromises()

    expect(wrapper.emitted('update:open')).toEqual([[true], [false]])
    expect(panel()).toBeNull()
  })

  it('受控 open：只认 Prop，点击只抛 update:open 不动内部状态', async () => {
    const wrapper = mountSplit({ open: false })
    await openBySecondary(wrapper)

    expect(wrapper.emitted('update:open')).toEqual([[true]])
    expect(panel()).toBeNull()
    expect(wrapper.get('.fui-split-button').attributes('data-state')).toBe('closed')
  })

  it('受控 open=true 时首帧直接渲染面板', async () => {
    mountSplit({ open: true })
    await nextTick()
    await flushPromises()
    expect(panel()).not.toBeNull()
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
    const closeButton = panel()?.querySelector<HTMLElement>('.flyout-close')
    expect(closeButton).not.toBeNull()
    closeButton?.click()
    await nextTick()
    await flushPromises()

    expect(panel()).toBeNull()
    expect(wrapper.emitted('update:open')).toEqual([[true], [false]])
    expect(wrapper.emitted('closed')).toHaveLength(1)
  })
})

describe('FluereSplitButton · 键盘', () => {
  it('F4 打开浮层', async () => {
    const wrapper = mountSplit()
    await wrapper.get('.fui-split-button__primary').trigger('keydown', { key: 'F4' })
    await nextTick()
    await flushPromises()

    expect(wrapper.emitted('update:open')).toEqual([[true]])
    expect(panel()).not.toBeNull()
  })

  it('Alt+ArrowDown 打开浮层', async () => {
    const wrapper = mountSplit()
    await wrapper
      .get('.fui-split-button__primary')
      .trigger('keydown', { key: 'ArrowDown', altKey: true })
    await nextTick()
    await flushPromises()

    expect(wrapper.emitted('update:open')).toEqual([[true]])
    expect(panel()).not.toBeNull()
  })

  it('箭头区 ArrowDown 打开浮层（APG split button 的可发现性补充）', async () => {
    const wrapper = mountSplit()
    await wrapper.get('.fui-split-button__secondary').trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    await flushPromises()

    expect(wrapper.emitted('update:open')).toEqual([[true]])
    expect(panel()).not.toBeNull()
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
  it('样式分两块：几何用 scoped，Teleport 面板用非 scoped（私有 BEM 前缀）', () => {
    expect(styleBlocks).toHaveLength(2)
    expect(styleBlocks.some((block) => block.attrs.includes('scoped'))).toBe(true)
    expect(styleBlocks.some((block) => !block.attrs.includes('scoped'))).toBe(true)
    // 非 scoped 块的注释必须写清原因（踩坑固化，AGENTS.md 要求）
    expect(globalCss).toContain('Teleport')
    expect(globalCss).toContain('.fui-split-button__flyout')
  })

  it('普通声明里的颜色一律走 token / 组件局部变量，不写裸色值', () => {
    for (const css of [scopedCss, globalCss]) {
      const code = stripComments(css)
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

  it('浮层几何对齐 FlyoutPresenter 资源（Acrylic fallback / 描边 / 8 圆角 / 96–456 / 16,15,16,17）', () => {
    const flyout = globalRule('.fui-split-button__flyout')
    expect(globalCss).toContain(
      '--fui-split-button-flyout-background: var(--acrylicInAppFillColorDefault)',
    )
    expect(globalCss).toContain('--fui-split-button-flyout-border: var(--surfaceStrokeColorFlyout)')
    expect(flyout).toContain('padding: 15px 16px 17px')
    expect(flyout).toContain('border-radius: var(--borderRadiusXLarge)')
    expect(flyout).toContain('min-inline-size: 96px')
    expect(flyout).toContain('max-inline-size: min(456px')
    expect(flyout).toContain('min-block-size: 40px')
    expect(flyout).toContain('max-block-size: min(758px')
    expect(flyout).toContain('z-index: var(--zIndexMenu)')
  })
})
