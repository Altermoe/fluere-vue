/* oxlint-disable import/no-nodejs-modules, prefer-named-capture-group -- 契约测试要读 SFC 源码做文本 / 正则解析（jsdom 不解析 var()） */
/**
 * `FluereToggleGroup` + `FluereToggleGroupItem` 契约。
 *
 * 行为侧（分组单选 / 多选、受控 / 非受控、roving focus 方向键）对齐 reka-ui 的
 * `ToggleGroupRoot` 契约 —— WinUI 没有 ToggleGroup 控件（见组件文件头），这一层
 * 没有 A 级源码可对，只能锁住「声明的语义」。
 * 样式侧只锁两件事：组容器只用 token、**每一项的视觉完全复用 `FluereToggleButton`**
 * （item 里不许出现第二份颜色声明 / 第二个 `<style>` 块）。
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import FluereToggleGroupItem from './toggle-group-item.vue'
import FluereToggleGroup from './toggle-group.vue'

const here = dirname(fileURLToPath(import.meta.url))
const groupSfc = readFileSync(resolve(here, 'toggle-group.vue'), 'utf8')
const itemSfc = readFileSync(resolve(here, 'toggle-group-item.vue'), 'utf8')

/** 去掉注释后的源码：注释里写着 WinUI / reka 的原值，不能当作实现证据 */
const stripComments = (sfc: string) => sfc.replace(/\/\*[\s\S]*?\*\//g, '')

/** 从 `<style>` 块解析「选择器 → 声明」 */
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

let wrapper: VueWrapper | undefined = undefined
afterEach(() => {
  // attachTo 的用例不要在体内清空 document.body（Vue 卸载会找不到宿主）
  wrapper?.unmount()
  wrapper = undefined
})

/** 单选组宿主：v-model 是 string，回写走真实的父级 */
const singleHost = (initial?: string, extraProps: Record<string, unknown> = {}) =>
  mount(
    defineComponent({
      components: { FluereToggleGroup, FluereToggleGroupItem },
      setup() {
        const value = ref<string | undefined>(initial)
        return { value, extraProps }
      },
      template: `
        <FluereToggleGroup v-model="value" v-bind="extraProps">
          <FluereToggleGroupItem value="left">左</FluereToggleGroupItem>
          <FluereToggleGroupItem value="center">中</FluereToggleGroupItem>
          <FluereToggleGroupItem value="right">右</FluereToggleGroupItem>
        </FluereToggleGroup>
      `,
    }),
    { attachTo: document.body },
  )

const items = () => wrapper!.findAll('button[aria-pressed]')

/**
 * `emitted()` 必须问**抛事件的那个组件**：宿主用 `v-model` 时事件被宿主的
 * 生成式监听器接住，宿主自身什么也不抛（radio.test.ts 用 `wrapper.vm.value` 断言
 * 同一件事）。这里直接取组件的 wrapper，保留载荷断言。
 */
const lastGroupEmit = (name: string) =>
  wrapper!.findComponent(FluereToggleGroup).emitted(name)?.at(-1)

/**
 * 把焦点交给第 index 个项：`findAll` 给出的是 `DOMWrapper<Element>`，
 * 直接 `.element.focus()` 在 vue-tsc 下报 TS2339，故显式收窄到 HTMLElement。
 */
const focusItem = async (index: number) => {
  ;(items()[index]!.element as HTMLElement).focus()
  await nextTick()
}

describe('FluereToggleGroup · 渲染与 aria', () => {
  it('容器是 role=group，含三个原生 button 项，每项复用 FluereToggleButton 的外观', () => {
    wrapper = singleHost()
    const group = wrapper.get('[role="group"]')
    expect(group.classes()).toContain('fui-toggle-group')
    expect(group.attributes('data-orientation')).toBe('horizontal')

    const buttons = items()
    expect(buttons).toHaveLength(3)
    for (const button of buttons) {
      expect(button.classes()).toContain('fui-toggle-button')
      expect(button.classes()).toContain('fui-focus-visual')
      expect(button.attributes('type')).toBe('button')
    }
  })

  it('默认全部未选中：aria-pressed=false', () => {
    wrapper = singleHost()
    for (const button of items()) {
      expect(button.attributes('aria-pressed')).toBe('false')
    }
  })

  it('受控单选：只有命中 modelValue 的那项 aria-pressed=true', () => {
    wrapper = singleHost('center')
    expect(items().map((button) => button.attributes('aria-pressed'))).toEqual([
      'false',
      'true',
      'false',
    ])
  })

  it('组 label → 容器 aria-label；项 label → 原生 aria-label（纯图标项的可访问名）', () => {
    wrapper = mount(
      defineComponent({
        components: { FluereToggleGroup, FluereToggleGroupItem },
        template: `
          <FluereToggleGroup label="文本对齐">
            <FluereToggleGroupItem value="bold" label="加粗" icon-only />
          </FluereToggleGroup>
        `,
      }),
    )
    expect(wrapper.get('[role="group"]').attributes('aria-label')).toBe('文本对齐')
    expect(wrapper.get('button').attributes('aria-label')).toBe('加粗')
  })

  it('组 disabled：所有项原生 disabled + data-disabled；单项 disabled 只影响该项', () => {
    wrapper = mount(
      defineComponent({
        components: { FluereToggleGroup, FluereToggleGroupItem },
        template: `
          <FluereToggleGroup disabled>
            <FluereToggleGroupItem value="a">A</FluereToggleGroupItem>
            <FluereToggleGroupItem value="b">B</FluereToggleGroupItem>
          </FluereToggleGroup>
        `,
      }),
    )
    for (const button of items()) {
      expect(button.attributes('disabled')).toBeDefined()
      expect(button.attributes('data-disabled')).toBeDefined()
    }
    wrapper.unmount()

    wrapper = mount(
      defineComponent({
        components: { FluereToggleGroup, FluereToggleGroupItem },
        template: `
          <FluereToggleGroup>
            <FluereToggleGroupItem value="a">A</FluereToggleGroupItem>
            <FluereToggleGroupItem value="b" disabled>B</FluereToggleGroupItem>
          </FluereToggleGroup>
        `,
      }),
    )
    expect(items()[0]!.attributes('disabled')).toBeUndefined()
    expect(items()[1]!.attributes('disabled')).toBeDefined()
  })
})

describe('FluereToggleGroup · 单选与多选', () => {
  it('单选受控：点击另一项抛 update:modelValue（string）并切换选中', async () => {
    wrapper = singleHost('left')
    await items()[1]!.trigger('click')
    expect(lastGroupEmit('update:modelValue')).toEqual(['center'])

    await nextTick()
    expect(items().map((button) => button.attributes('aria-pressed'))).toEqual([
      'false',
      'true',
      'false',
    ])
  })

  it('单选：再次点击已选中项把值清成 undefined（reka / ARIA toggle button 语义）', async () => {
    wrapper = singleHost('left')
    await items()[0]!.trigger('click')
    expect(lastGroupEmit('update:modelValue')).toEqual([undefined])
  })

  it('多选：type=multiple 时点击是增删数组元素', async () => {
    wrapper = mount(
      defineComponent({
        components: { FluereToggleGroup, FluereToggleGroupItem },
        setup() {
          const value = ref<string[]>(['bold'])
          return { value }
        },
        template: `
          <FluereToggleGroup v-model="value" type="multiple">
            <FluereToggleGroupItem value="bold">B</FluereToggleGroupItem>
            <FluereToggleGroupItem value="italic">I</FluereToggleGroupItem>
          </FluereToggleGroup>
        `,
      }),
    )
    expect(items()[0]!.attributes('aria-pressed')).toBe('true')

    await items()[1]!.trigger('click')
    expect(lastGroupEmit('update:modelValue')).toEqual([['bold', 'italic']])
  })

  it('多选：type 缺省时按数组推断（无需显式写 type）；再点已选中项则移除', async () => {
    wrapper = mount(
      defineComponent({
        components: { FluereToggleGroup, FluereToggleGroupItem },
        setup() {
          const value = ref<string[]>(['bold', 'italic'])
          return { value }
        },
        template: `
          <FluereToggleGroup v-model="value">
            <FluereToggleGroupItem value="bold">B</FluereToggleGroupItem>
            <FluereToggleGroupItem value="italic">I</FluereToggleGroupItem>
          </FluereToggleGroup>
        `,
      }),
    )
    await items()[0]!.trigger('click')
    expect(lastGroupEmit('update:modelValue')).toEqual([['italic']])
  })

  it('非受控：不传 modelValue 时底座自管状态，点击仍抛 update:modelValue', async () => {
    wrapper = mount(
      defineComponent({
        components: { FluereToggleGroup, FluereToggleGroupItem },
        template: `
          <FluereToggleGroup default-value="a">
            <FluereToggleGroupItem value="a">A</FluereToggleGroupItem>
            <FluereToggleGroupItem value="b">B</FluereToggleGroupItem>
          </FluereToggleGroup>
        `,
      }),
    )
    expect(items()[0]!.attributes('aria-pressed')).toBe('true')

    await items()[1]!.trigger('click')
    await nextTick()
    expect(lastGroupEmit('update:modelValue')).toEqual(['b'])
    expect(items().map((button) => button.attributes('aria-pressed'))).toEqual(['false', 'true'])
  })
})

describe('FluereToggleGroup · roving focus 键盘契约', () => {
  it('容器是 Tab 停靠点（tabindex=0），项在获得焦点后才成为停靠点', async () => {
    wrapper = singleHost()
    // 项的 onMounted 会把 focusableItemsCount 从 0 加到 3，容器 tabindex 需要等一次刷新
    await nextTick()
    expect(wrapper.get('[role="group"]').attributes('tabindex')).toBe('0')
    expect(items()[0]!.attributes('tabindex')).toBe('-1')

    await focusItem(1)
    expect(items().map((button) => button.attributes('tabindex'))).toEqual(['-1', '0', '-1'])
  })

  it('ArrowRight / ArrowLeft 在组内移动焦点', async () => {
    wrapper = singleHost()
    await focusItem(0)

    await items()[0]!.trigger('keydown', { key: 'ArrowRight' })
    await nextTick()
    expect(document.activeElement).toBe(items()[1]!.element)

    await items()[1]!.trigger('keydown', { key: 'ArrowLeft' })
    await nextTick()
    expect(document.activeElement).toBe(items()[0]!.element)
  })

  it('Home / End 跳到首尾；loop 打开时末尾再按 ArrowRight 回到首个', async () => {
    wrapper = singleHost()
    await focusItem(0)

    await items()[0]!.trigger('keydown', { key: 'End' })
    await nextTick()
    expect(document.activeElement).toBe(items()[2]!.element)

    await items()[2]!.trigger('keydown', { key: 'ArrowRight' })
    await nextTick()
    expect(document.activeElement).toBe(items()[0]!.element)

    await items()[0]!.trigger('keydown', { key: 'Home' })
    await nextTick()
    expect(document.activeElement).toBe(items()[0]!.element)
  })

  it('方向键跳过禁用项', async () => {
    wrapper = mount(
      defineComponent({
        components: { FluereToggleGroup, FluereToggleGroupItem },
        template: `
          <FluereToggleGroup>
            <FluereToggleGroupItem value="a">A</FluereToggleGroupItem>
            <FluereToggleGroupItem value="b" disabled>B</FluereToggleGroupItem>
            <FluereToggleGroupItem value="c">C</FluereToggleGroupItem>
          </FluereToggleGroup>
        `,
      }),
      { attachTo: document.body },
    )
    await focusItem(0)

    await items()[0]!.trigger('keydown', { key: 'ArrowRight' })
    await nextTick()
    expect(document.activeElement).toBe(items()[2]!.element)
  })

  it('纵向组用上下方向键；左右方向键不再移动焦点', async () => {
    wrapper = singleHost(undefined, { orientation: 'vertical' })
    expect(wrapper.get('[role="group"]').attributes('data-orientation')).toBe('vertical')

    await focusItem(0)
    await items()[0]!.trigger('keydown', { key: 'ArrowRight' })
    await nextTick()
    expect(document.activeElement).toBe(items()[0]!.element)

    await items()[0]!.trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    expect(document.activeElement).toBe(items()[1]!.element)
  })

  it('原生 button 保证 Space / Enter 触发切换（click 由浏览器合成）', async () => {
    wrapper = singleHost()
    const button = items()[0]!
    expect(button.element.tagName).toBe('BUTTON')
    await button.trigger('click')
    expect(lastGroupEmit('update:modelValue')).toEqual(['left'])
  })
})

describe('FluereToggleGroup · 样式与实现契约', () => {
  it('组容器只用 token 排布，纵向组单独一条规则', () => {
    const rules = readStyleRules(stripComments(groupSfc))
    expect(rules.get('.fui-toggle-group')).toContain('display: inline-flex')
    expect(rules.get('.fui-toggle-group')).toContain('gap: var(--spacingHorizontalXS)')
    expect(rules.get(".fui-toggle-group[data-orientation='vertical']")).toContain(
      'flex-direction: column',
    )
  })

  it('组容器不写任何颜色（配色只属于 FluereToggleButton）', () => {
    const declarations = [
      ...stripComments(groupSfc).matchAll(/(?:background-color|color|border-color):\s*([^;]+);/g),
    ]
    expect(declarations).toHaveLength(0)
  })

  it('项：复用 FluereToggleButton、接 reka 组上下文与 RovingFocusItem', () => {
    const source = stripComments(itemSfc)
    expect(source).toContain("import FluereToggleButton from '../toggle-button/toggle-button.vue'")
    expect(source).toContain('RovingFocusItem')
    expect(source).toContain('injectToggleGroupRootContext()')
    expect(source).toContain('changeModelValue(props.value)')
    expect(source).toContain(':focusable="!isDisabled"')
    expect(source).toContain(':active="isPressed"')
  })

  it('项：没有第二份样式块 / 颜色声明，也不自写 :focus-visible', () => {
    expect(stripComments(itemSfc)).not.toContain('<style')
    expect(itemSfc).not.toContain(':focus-visible')
    const declarations = [
      ...stripComments(itemSfc).matchAll(/(?:background-color|color|border-color|outline):/g),
    ]
    expect(declarations).toHaveLength(0)
  })

  it('尺寸继承：组上的 size 传到项（项自己不写 size 时）', () => {
    wrapper = mount(
      defineComponent({
        components: { FluereToggleGroup, FluereToggleGroupItem },
        template: `
          <FluereToggleGroup size="small">
            <FluereToggleGroupItem value="a" label="A" icon-only />
          </FluereToggleGroup>
        `,
      }),
    )
    expect(wrapper.get('button').classes()).toContain('fui-toggle-button--small')
  })
})

describe('FluereToggleGroup · 图标透传', () => {
  /** 装饰性替身图标：只断言「渲染进按钮里」，不引入真图标包 */
  const DummyIcon = defineComponent({
    name: 'DummyIcon',
    setup: () => () => h('svg', { 'data-test': 'dummy-icon' }),
  })

  it('icon Prop 与 #icon 插槽两条路径都通（插槽存在时不吞掉 Prop 形态的另一项）', () => {
    wrapper = mount(
      defineComponent({
        components: { FluereToggleGroup, FluereToggleGroupItem },
        // `components:` 注册表不会暴露成渲染上下文属性，而 `:icon="DummyIcon"` 是
        // 绑定表达式（编译成 _ctx.DummyIcon），所以必须由 setup 返回
        setup: () => ({ DummyIcon }),
        template: `
          <FluereToggleGroup>
            <FluereToggleGroupItem value="a" label="属性图标" :icon="DummyIcon" icon-only />
            <FluereToggleGroupItem value="b" label="插槽图标" icon-only>
              <template #icon><svg data-test="slot-icon" /></template>
            </FluereToggleGroupItem>
          </FluereToggleGroup>
        `,
      }),
    )
    const buttons = items()
    expect(buttons[0]!.find('[data-test="dummy-icon"]').exists()).toBe(true)
    expect(buttons[1]!.find('[data-test="slot-icon"]').exists()).toBe(true)
  })
})
