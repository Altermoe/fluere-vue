/* oxlint-disable capitalized-comments, consistent-function-scoping, max-statements, no-magic-numbers --
 * 测试代码：文件头注释为被测契约说明，挂载工具按用例就地定义更直观，
 * 断言步骤数与窗口部件数量属测试表达，豁免结构风格规则。 */
/**
 * FluereScrollView 组件：滚动条「滑块 / 轨道 / 双轴角落」三层可见性的模板装配。
 *
 * 可见性本身由 CSS 过渡驱动，JS 只切换状态类，这里断言类名与窗口部件结构，
 * 把「指针进入容器显示滑块 → 进入命中区展开轨道 → 离开收起」的契约钉住。
 */
import { mount } from '@vue/test-utils'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import FluereScrollView from '../scroll-view.vue'

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

/* ---- 几何夹具：jsdom 不做布局，命中区矩形需要显式给定 ---- */

/** 固定下来的布局矩形（jsdom 的 getBoundingClientRect 恒为 0×0） */
interface StubRect {
  x: number
  y: number
  width: number
  height: number
}

const stubRect = (element: Element, rect: StubRect): void => {
  const { x, y, width, height } = rect
  element.getBoundingClientRect = (): DOMRect =>
    ({
      x,
      y,
      width,
      height,
      left: x,
      top: y,
      right: x + width,
      bottom: y + height,
      toJSON: () => rect,
    }) as DOMRect
}

/** 取某个 ScrollView 自身的滚动条命中区（只认直接子元素，避免取到嵌套子级的） */
const ownBar = (root: { element: Element }, axis: 'vertical' | 'horizontal'): Element => {
  const bar = [...root.element.children].find((child) =>
    child.classList.contains(`fui-scrollview__scrollbar--${axis}`),
  )
  if (!bar) {
    throw new Error(`滚动条命中区未渲染：${axis}`)
  }
  return bar
}

/** 派发指针事件所需的坐标（可选 relatedTarget，仅 pointerout 需要） */
interface PointerInit {
  clientX: number
  clientY: number
  relatedTarget?: Element
}

/**
 * 派发带坐标的 pointerover / pointerout。
 * jsdom 不做命中测试，因此「指针落在父级轨道上、事件目标却是下层的嵌套子级」
 * 这种真实浏览器行为只能靠显式指定目标 + 坐标来还原。
 */
const dispatchPointer = async (
  target: Element,
  type: 'pointerover' | 'pointerout',
  init: PointerInit,
): Promise<void> => {
  const { clientX, clientY, relatedTarget } = init
  target.dispatchEvent(
    new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY,
      ...(relatedTarget ? { relatedTarget } : {}),
    }),
  )
  await nextTick()
}

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

/** 布局常量：父级视口 400×400，轨道 12px；子级轨道比父级内缩 20px（对齐 demo 的留白） */
const PARENT_BAR_X = 388
const CHILD_BAR_X = 368

describe('FluereScrollView · 嵌套轨道区归属', () => {
  /** 挂载嵌套基座并钉住父级 / 子级 A 的纵向轨道矩形 */
  const mountWithRects = () => {
    const wrapper = mount(NESTED_HARNESS)
    const parent = wrapper.get('.fui-scrollview')
    const childA = wrapper.get('[data-test="child-a"]')
    stubRect(ownBar(parent, 'vertical'), { x: PARENT_BAR_X, y: 0, width: 12, height: 400 })
    stubRect(ownBar(childA, 'vertical'), { x: CHILD_BAR_X, y: 100, width: 12, height: 120 })
    return { wrapper, parent, childA }
  }

  it('hover 父级轨道区：父级展开轨道，纵向重叠的子级不进入 hover 态', async () => {
    const { wrapper, parent, childA } = mountWithRects()

    // 指针落在父级轨道区（x 在 388..400），纵向位置与子级 A 重叠：
    // 父级轨道收起时不拦截命中，真实浏览器里事件目标是下层的子级 A
    await dispatchPointer(childA.element, 'pointerover', {
      clientX: PARENT_BAR_X + 6,
      clientY: 150,
    })

    expect(parent.classes()).toContain('fui-scrollview--bars-visible')
    expect(parent.classes()).toContain('fui-scrollview--bars-expanded')
    expect(childA.classes()).not.toContain('fui-scrollview--bars-visible')
    expect(childA.classes()).not.toContain('fui-scrollview--bars-expanded')
    wrapper.unmount()
  })

  it('hover 子级自身轨道区：子级展开轨道，父级让位', async () => {
    const { wrapper, parent, childA } = mountWithRects()

    await dispatchPointer(childA.element, 'pointerover', { clientX: CHILD_BAR_X + 6, clientY: 150 })

    expect(childA.classes()).toContain('fui-scrollview--bars-visible')
    expect(childA.classes()).toContain('fui-scrollview--bars-expanded')
    expect(parent.classes()).not.toContain('fui-scrollview--bars-visible')
    expect(parent.classes()).not.toContain('fui-scrollview--bars-expanded')
    wrapper.unmount()
  })

  it('从子级移入父级轨道区：子级立即让位，父级接管并展开轨道', async () => {
    const { wrapper, parent, childA } = mountWithRects()

    await dispatchPointer(childA.element, 'pointerover', { clientX: 100, clientY: 150 })
    expect(childA.classes()).toContain('fui-scrollview--bars-visible')

    const parentBar = ownBar(parent, 'vertical')
    await dispatchPointer(childA.element, 'pointerout', {
      clientX: PARENT_BAR_X + 6,
      clientY: 150,
      relatedTarget: parentBar,
    })
    await dispatchPointer(parentBar, 'pointerover', {
      clientX: PARENT_BAR_X + 6,
      clientY: 150,
    })

    expect(parent.classes()).toContain('fui-scrollview--bars-expanded')
    expect(childA.classes()).not.toContain('fui-scrollview--bars-visible')
    wrapper.unmount()
  })
})
