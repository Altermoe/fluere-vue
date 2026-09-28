/* oxlint-disable capitalized-comments, consistent-function-scoping, import/no-nodejs-modules, max-statements, no-magic-numbers --
 * 测试代码：文件头注释为被测契约说明，挂载工具按用例就地定义更直观，
 * 断言步骤数与窗口部件数量属测试表达；读取外置样式文件需要用 node: 内置模块，均豁免。 */
/**
 * FluereScrollView 组件：滚动条「滑块 / 轨道 / 双轴角落」三层可见性的模板装配。
 *
 * 可见性本身由 CSS 过渡驱动，JS 只切换状态类，这里断言类名与窗口部件结构，
 * 把「指针进入容器显示滑块 → 进入命中区展开轨道 → 离开收起」的契约钉住。
 */
import { readFileSync } from 'node:fs'
// jsdom 替换了全局 URL，readFileSync 只认 node:url 的实现
import { URL } from 'node:url'
import { mount } from '@vue/test-utils'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import FluereScrollView from '../scroll-view.vue'

/**
 * 组件样式外置在 scroll-view.css（vitest 默认不处理 CSS，`?raw` 只会得到空串），
 * 因此直接读源码文本做样式契约断言。base 必须用变量承载：写成
 * `new URL('../scroll-view.css', import.meta.url)` 会被 Vite 当成资源导入改写。
 */
const TEST_MODULE_URL = import.meta.url
const SCROLL_VIEW_CSS = readFileSync(new URL('../scroll-view.css', TEST_MODULE_URL), 'utf8')

/** 取某条选择器的声明块（压缩空白，便于 contain 断言） */
const cssRule = (selector: string): string => {
  const selectorStart = SCROLL_VIEW_CSS.indexOf(selector)
  const open = selectorStart === -1 ? -1 : SCROLL_VIEW_CSS.indexOf('{', selectorStart)
  const close = open === -1 ? -1 : SCROLL_VIEW_CSS.indexOf('}', open)
  if (close === -1) {
    return ''
  }
  return SCROLL_VIEW_CSS.slice(open + 1, close)
    .replaceAll(/\s+/g, ' ')
    .trim()
}

/** jsdom 无 ResizeObserver：测量层只依赖其回调，空实现替身即可 */
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverStub)
})

describe('FluereScrollView · 滚动条装配', () => {
  it('渲染轨道与两端步进按钮，并带有可访问名称', () => {
    const wrapper = mount(FluereScrollView, {
      props: { verticalScrollBarVisibility: 'visible' },
    })

    const bar = wrapper.get('.fui-scrollview__scrollbar--vertical')
    expect(bar.find('.fui-scrollview__track').exists()).toBe(true)
    expect(bar.find('.fui-scrollview__thumb--vertical').exists()).toBe(true)

    const buttons = bar.findAll('.fui-scrollview__track-button')
    expect(buttons).toHaveLength(2)
    expect(buttons.map((button) => button.attributes('aria-label'))).toEqual([
      'Scroll up',
      'Scroll down',
    ])
    // 步进按钮不出现在 Tab 序列中（与 WinUI ScrollBar 一致）
    expect(buttons.every((button) => button.attributes('tabindex') === '-1')).toBe(true)
    wrapper.unmount()
  })

  it('指针进入容器只显示滑块，进入命中区才展开轨道', async () => {
    const wrapper = mount(FluereScrollView, {
      props: { verticalScrollBarVisibility: 'visible' },
    })
    const root = wrapper.get('.fui-scrollview')
    const bar = wrapper.get('.fui-scrollview__scrollbar--vertical')

    expect(root.classes()).not.toContain('fui-scrollview--bars-visible')
    expect(root.classes()).not.toContain('fui-scrollview--bars-expanded')

    await root.trigger('pointerover')
    expect(root.classes()).toContain('fui-scrollview--bars-visible')
    expect(root.classes()).not.toContain('fui-scrollview--bars-expanded')

    await bar.trigger('pointerenter')
    expect(root.classes()).toContain('fui-scrollview--bars-expanded')

    await bar.trigger('pointerleave')
    expect(root.classes()).not.toContain('fui-scrollview--bars-expanded')
    // 指针仍在容器内：滑块保持显示
    expect(root.classes()).toContain('fui-scrollview--bars-visible')
    wrapper.unmount()
  })

  it('双轴滚动条同时可见时标记角落让位', () => {
    const wrapper = mount(FluereScrollView, {
      props: {
        horizontalScrollBarVisibility: 'visible',
        verticalScrollBarVisibility: 'visible',
      },
    })
    expect(wrapper.get('.fui-scrollview').classes()).toContain('fui-scrollview--both-bars')
    expect(wrapper.find('.fui-scrollview__separator').exists()).toBe(true)
    wrapper.unmount()
  })
})

/** 嵌套悬挂测试基座：父 ScrollView 内放两个子 ScrollView + 空白区 */
const NESTED_HARNESS = defineComponent({
  render() {
    return h(
      FluereScrollView,
      { verticalScrollBarVisibility: 'visible' },
      {
        default: () => [
          h('div', { class: 'filler' }),
          h(FluereScrollView, {
            'verticalScrollBarVisibility': 'visible',
            'data-test': 'child-a',
          }),
          h(FluereScrollView, {
            'verticalScrollBarVisibility': 'visible',
            'data-test': 'child-b',
          }),
        ],
      },
    )
  },
})

describe('FluereScrollView · 嵌套悬停隔离', () => {
  it('hover 父级自身区域时，子级不会进入 hover 态', async () => {
    const wrapper = mount(NESTED_HARNESS)
    const parent = wrapper.get('.fui-scrollview')
    const childA = wrapper.get('[data-test="child-a"]')
    const childB = wrapper.get('[data-test="child-b"]')

    expect(parent.classes()).not.toContain('fui-scrollview--bars-visible')
    expect(childA.classes()).not.toContain('fui-scrollview--bars-visible')
    expect(childB.classes()).not.toContain('fui-scrollview--bars-visible')

    // 指针落在父级自身空白区（非任意子级上）
    await wrapper.get('.filler').trigger('pointerover')

    expect(parent.classes()).toContain('fui-scrollview--bars-visible')
    expect(childA.classes()).not.toContain('fui-scrollview--bars-visible')
    expect(childB.classes()).not.toContain('fui-scrollview--bars-visible')
    wrapper.unmount()
  })

  it('hover 子级时，父级与同级都不会进入 hover 态', async () => {
    const wrapper = mount(NESTED_HARNESS)
    const parent = wrapper.get('.fui-scrollview')
    const childA = wrapper.get('[data-test="child-a"]')
    const childB = wrapper.get('[data-test="child-b"]')

    // 指针落在子级 A 上：事件冒泡至父级根，父级应让位、同级 B 不受影响
    await childA.trigger('pointerover')

    expect(childA.classes()).toContain('fui-scrollview--bars-visible')
    expect(parent.classes()).not.toContain('fui-scrollview--bars-visible')
    expect(childB.classes()).not.toContain('fui-scrollview--bars-visible')
    wrapper.unmount()
  })
})

describe('FluereScrollView · 焦点与 presenter 裁切契约', () => {
  it('焦点进入内容内元素时触发 bring-into-view（对齐 WinUI BringIntoViewOnFocusChange）', async () => {
    const wrapper = mount(FluereScrollView, {
      slots: { default: '<button type="button">内容内的按钮</button>' },
    })

    expect(wrapper.emitted('bring-into-view')).toBeUndefined()
    await wrapper.get('button').trigger('focusin')
    expect(wrapper.emitted('bring-into-view')).toHaveLength(1)
    wrapper.unmount()
  })

  it('焦点落在滚动条步进按钮上时不触发 bring-into-view（视口之外）', async () => {
    const wrapper = mount(FluereScrollView, {
      props: { verticalScrollBarVisibility: 'visible' },
    })

    await wrapper.get('.fui-scrollview__track-button').trigger('focusin')
    expect(wrapper.emitted('bring-into-view')).toBeUndefined()
    wrapper.unmount()
  })

  it('presenter 用 clip 裁切（非滚动容器），避免原生滚动与 transform 偏移脱节', () => {
    const presenter = cssRule('.fui-scrollview__presenter')
    expect(presenter).toContain('position: absolute')
    expect(presenter).toContain('touch-action: none')
    expect(presenter).toContain('overflow: clip')
    // 旧引擎回退：clip 之前必须先声明 hidden，否则退化为 visible、内容溢出裁切框
    expect(presenter.indexOf('overflow: hidden')).toBeLessThan(presenter.indexOf('overflow: clip'))
  })
})
