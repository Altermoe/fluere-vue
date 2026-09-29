import { describe, expect, it } from 'vitest'
/**
 * SSR 兼容性冒烟测试（回归防线）。
 *
 * 组件库代码在服务端渲染时也会执行一遍 `setup()`——若某组件在 setup 阶段
 * 直接访问浏览器专属 API（matchMedia / window / document / ResizeObserver …），
 * 服务端会抛错导致整页 500（历史事故：FluereScrollView 的
 * `globalThis.matchMedia` 崩溃）。这里对每个组件做一次真正的 `renderToString`，
 * 断言「服务端渲染不抛错且产出标记」，把这类回归挡在测试层。
 *
 * 运行在 jsdom 环境，但 `renderToString` 是纯服务端渲染路径：jsdom 默认
 * 不提供 matchMedia 等 API，恰好真实覆盖「无能力」的 SSR 分支。
 */
import { createSSRApp, h } from 'vue'
import type { Component } from 'vue'
import { renderToString } from 'vue/server-renderer'
import FluereButton from '../button/button.vue'
import FluereCheckbox from '../checkbox/checkbox.vue'
import FluereCombobox from '../combobox/combobox.vue'
import FluereInput from '../input/input.vue'
import FluereNumberBox from '../number-box/number-box.vue'
import FluereProgressBar from '../progress-bar/progress-bar.vue'
import FluereProgressRing from '../progress-ring/progress-ring.vue'
import FluereRadioButton from '../radio/radio-button.vue'
import FluereRadioGroup from '../radio/radio-group.vue'
import FluereScrollView from '../scrollview/scroll-view.vue'
import FluereSlider from '../slider/slider.vue'
import FluereToggleSwitch from '../toggle-switch/toggle-switch.vue'

/** 把单个组件以 SSR 模式渲染为 HTML 字符串 */
const renderServer = async (component: Component, slotText = ''): Promise<string> => {
  const app = createSSRApp({
    render: () => h(component, {}, { default: () => slotText }),
  })
  return renderToString(app)
}

describe('SSR 兼容性冒烟测试', () => {
  it('FluereButton 可服务端渲染', async () => {
    const html = await renderServer(FluereButton, '确定')
    expect(html).toContain('fui-button')
    expect(html).toContain('确定')
  })

  it('FluereInput 可服务端渲染', async () => {
    const html = await renderServer(FluereInput)
    expect(html).toContain('fui-input')
  })

  it('FluereCheckbox 可服务端渲染（复用 reka CheckboxRoot + VueUse，回归无浏览器 API 依赖）', async () => {
    const html = await renderServer(FluereCheckbox, '接收通知')
    expect(html).toContain('fui-checkbox')
    expect(html).toContain('接收通知')
  })

  it('FluereScrollView 可服务端渲染（回归：matchMedia SSR 崩溃）', async () => {
    const html = await renderServer(FluereScrollView, '滚动内容')
    expect(html).toContain('fui-scrollview')
    expect(html).toContain('滚动内容')
  })

  it('FluereToggleSwitch 可服务端渲染（纯客户端指针交互，setup 无浏览器 API 依赖）', async () => {
    const html = await renderServer(FluereToggleSwitch, '夜间模式')
    expect(html).toContain('fui-switch')
    expect(html).toContain('role="switch"')
    expect(html).toContain('夜间模式')
  })

  it('FluereSlider 可服务端渲染（复用 reka Slider，ResizeObserver / pointer capture 均在挂载后）', async () => {
    const app = createSSRApp({
      render: () => h(FluereSlider, { modelValue: 30, header: '音量' }),
    })
    const html = await renderToString(app)
    expect(html).toContain('fui-slider')
    expect(html).toContain('role="slider"')
    // SSR 阶段不含 aria-valuenow：它由 reka 的 collection 下标推导，首帧下标尚未回填，
    // 挂载后才会补上；SSR 阶段断言不依赖下标的那些语义
    expect(html).toContain('aria-valuemin="0"')
    expect(html).toContain('aria-valuemax="100"')
    expect(html).toContain('aria-orientation="horizontal"')
    expect(html).toContain('音量')
  })

  it('FluereRadioGroup + FluereRadioButton 可服务端渲染（复用 reka RadioGroup，回归 roving focus 无浏览器 API 依赖）', async () => {
    const app = createSSRApp({
      render: () =>
        h(FluereRadioGroup, { modelValue: 'a' }, () => [
          h(FluereRadioButton, { value: 'a' }, () => '苹果'),
          h(FluereRadioButton, { value: 'b' }, () => '香蕉'),
        ]),
    })
    const html = await renderToString(app)
    expect(html).toContain('role="radiogroup"')
    expect(html).toContain('role="radio"')
    expect(html).toContain('苹果')
    expect(html).toContain('data-state="checked"')
  })

  it('FluereNumberBox 可服务端渲染（取值 / 格式化均为纯函数，启动阶段不碰定时器与浏览器 API）', async () => {
    const app = createSSRApp({
      render: () =>
        h(FluereNumberBox, {
          modelValue: 12,
          header: '数量',
          spinButtonPlacementMode: 'inline',
        }),
    })
    const html = await renderToString(app)
    expect(html).toContain('fui-number-box')
    expect(html).toContain('role="spinbutton"')
    expect(html).toContain('aria-valuenow="12"')
    expect(html).toContain('value="12"')
    expect(html).toContain('数量')
    // 未显式给出 min / max 时不渲染 aria-valuemin / aria-valuemax（对应 WinUI 只在
    // Minimum/Maximum 被改写时才拼进 UIA name 的口径）
    expect(html).not.toContain('aria-valuemin')
    expect(html).not.toContain('aria-valuemax')
  })

  it('FluereProgressRing 可服务端渲染（纯 SVG + CSS 动画，setup 无浏览器 API 依赖）', async () => {
    const html = await renderServer(FluereProgressRing)
    expect(html).toContain('fui-pr')
    expect(html).toContain('role="progressbar"')
    expect(html).toContain('fui-pr__arc')
    // determinate 语义同步进 SSR 标记
    const app = createSSRApp({
      render: () => h(FluereProgressRing, { indeterminate: false, modelValue: 40 }),
    })
    const determinateHtml = await renderToString(app)
    expect(determinateHtml).toContain('aria-valuenow="40"')
    expect(determinateHtml).toContain('aria-valuetext="40%"')
  })

  it('FluereProgressBar 可服务端渲染（纯 div + CSS 动画，复用 reka ProgressRoot）', async () => {
    const app = createSSRApp({
      render: () => h(FluereProgressBar, { modelValue: 30, label: '下载进度' }),
    })
    const html = await renderToString(app)
    expect(html).toContain('fui-pb')
    expect(html).toContain('role="progressbar"')
    expect(html).toContain('data-state="determinate"')
    expect(html).toContain('aria-valuenow="30"')
    expect(html).toContain('aria-valuetext="30%"')
    expect(html).toContain('aria-label="下载进度"')
    expect(html).toContain('fui-pb__track')
    // 不确定态：不渲染 RangeValue 语义（对齐 ProgressBarAutomationPeer）
    const indeterminate = createSSRApp({
      render: () => h(FluereProgressBar, { indeterminate: true }),
    })
    const indeterminateHtml = await renderToString(indeterminate)
    expect(indeterminateHtml).toContain('data-state="indeterminate"')
    expect(indeterminateHtml).not.toContain('aria-valuenow')
    expect(indeterminateHtml).not.toContain('aria-valuemin')
  })

  it('FluereCombobox 可服务端渲染（弹层走 Teleport + Presence，收起时不进首帧）', async () => {
    const app = createSSRApp({
      render: () =>
        h(FluereCombobox, {
          modelValue: 'b',
          header: '水果',
          placeholder: '选一个',
          items: [
            { value: 'a', text: 'Apple' },
            { value: 'b', text: 'Banana' },
          ],
        }),
    })
    const html = await renderToString(app)
    expect(html).toContain('fui-combobox')
    expect(html).toContain('role="combobox"')
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('readonly')
    expect(html).toContain('value="Banana"')
    expect(html).toContain('水果')
    // 收起态不渲染下拉内容
    expect(html).not.toContain('fui-combobox__popup')
  })
})
