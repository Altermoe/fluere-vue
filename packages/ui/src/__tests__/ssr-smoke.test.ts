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
import FluereContentDialog from '../content-dialog/content-dialog.vue'
import FluereInfoBadge from '../info-badge/info-badge.vue'
import FluereInfoBar from '../infobar/infobar.vue'
import FluereInput from '../input/input.vue'
import FluereNumberBox from '../number-box/number-box.vue'
import FluereSmokeLayer from '../overlay/smoke-layer.vue'
import FluereProgressBar from '../progress-bar/progress-bar.vue'
import FluereProgressRing from '../progress-ring/progress-ring.vue'
import FluereRadioButton from '../radio/radio-button.vue'
import FluereRadioGroup from '../radio/radio-group.vue'
import FluereScrollView from '../scrollview/scroll-view.vue'
import FluereSlider from '../slider/slider.vue'
import FluereToggleSwitch from '../toggle-switch/toggle-switch.vue'
import FluereTooltipProvider from '../tooltip/tooltip-provider.vue'
import FluereTooltip from '../tooltip/tooltip.vue'

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

  it('FluereInput 的密码 / 标题 / 多行形态可服务端渲染', async () => {
    // 密码：服务端就该渲染掩码串（真值不进 HTML）；显示按钮要等挂载后量到宽度才出现
    const passwordApp = createSSRApp({
      render: () =>
        h(FluereInput, {
          type: 'password',
          passwordChar: '#',
          header: '密码',
          description: '至少 8 位',
          modelValue: 'secret',
        }),
    })
    const passwordHtml = await renderToString(passwordApp)
    expect(passwordHtml).toContain('fui-input__header')
    expect(passwordHtml).toContain('fui-input__description')
    expect(passwordHtml).toContain('value="######"')
    expect(passwordHtml).not.toContain('value="secret"')
    expect(passwordHtml).not.toContain('fui-input__reveal')

    // 多行：渲染 textarea
    const multilineApp = createSSRApp({
      render: () => h(FluereInput, { multiline: true, rows: 4, modelValue: '多行' }),
    })
    const multilineHtml = await renderToString(multilineApp)
    expect(multilineHtml).toContain('<textarea')
    expect(multilineHtml).toContain('rows="4"')
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

  it('FluereInfoBar 可服务端渲染（方向测量只在 onMounted 内建 ResizeObserver，SSR 落横排）', async () => {
    const closed = createSSRApp({
      render: () => h(FluereInfoBar, { title: '默认收起' }),
    })
    const closedHtml = await renderToString(closed)
    expect(closedHtml).toContain('fui-infobar')
    // 缺省 IsOpen=false ⇒ 内容不渲染（对齐 ContentRoot.Visibility=Collapsed）
    expect(closedHtml).toContain('data-orientation="horizontal"')
    expect(closedHtml).not.toContain('fui-infobar__content')

    const app = createSSRApp({
      render: () =>
        h(
          FluereInfoBar,
          { open: true, title: '标题', message: '正文', severity: 'warning', label: '系统提示' },
          { content: () => '补充内容' },
        ),
    })
    const html = await renderToString(app)
    expect(html).toContain('role="status"')
    expect(html).toContain('data-severity="warning"')
    expect(html).toContain('aria-label="系统提示"')
    expect(html).toContain('标题')
    expect(html).toContain('正文')
    expect(html).toContain('补充内容')
    expect(html).toContain('fui-infobar__close')
    // 隐藏测量层承担方向判定，SSR 阶段同样输出（不影响布局、不进无障碍树）
    expect(html).toContain('aria-hidden="true"')
  })

  it('FluereInfoBadge 可服务端渲染（形态推导是纯 computed，setup 无浏览器 API 依赖）', async () => {
    // 缺省：Value=-1 且无 IconSource ⇒ Dot 形态，且不进无障碍树（对齐没有 AutomationPeer）
    const dot = createSSRApp({ render: () => h(FluereInfoBadge) })
    const dotHtml = await renderToString(dot)
    expect(dotHtml).toContain('fui-info-badge')
    expect(dotHtml).toContain('data-display-kind="dot"')
    expect(dotHtml).toContain('data-severity="accent"')
    expect(dotHtml).toContain('aria-hidden="true"')

    // Value 形态 + 可访问名
    const value = createSSRApp({
      render: () =>
        h(FluereInfoBadge, { value: 5, severity: 'critical', label: '收件箱，5 条通知' }),
    })
    const valueHtml = await renderToString(value)
    expect(valueHtml).toContain('data-display-kind="value"')
    expect(valueHtml).toContain('data-severity="critical"')
    expect(valueHtml).toContain('role="img"')
    expect(valueHtml).toContain('aria-label="收件箱，5 条通知"')
    expect(valueHtml).toContain('fui-info-badge__value')
    expect(valueHtml).toContain('>5<')

    // Icon 形态：`icon: true` 取 severity 的内建字形（SSR 直出 svg）
    const icon = createSSRApp({
      render: () => h(FluereInfoBadge, { severity: 'attention', icon: true }),
    })
    const iconHtml = await renderToString(icon)
    expect(iconHtml).toContain('data-display-kind="icon"')
    expect(iconHtml).toContain('fui-info-badge__icon')
    expect(iconHtml).toContain('<svg')
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

  it('FluereContentDialog 可服务端渲染（门户 + Presence 都延迟到客户端，SSR 输出为空）', async () => {
    // 关闭态：什么都不输出
    const closed = createSSRApp({
      render: () => h(FluereContentDialog, { title: '标题', primaryButtonText: '确定' }),
    })
    const closedHtml = await renderToString(closed)
    expect(closedHtml).not.toContain('role="dialog"')
    expect(closedHtml).not.toContain('fui-content-dialog')
    expect(closedHtml).not.toContain('fui-smoke')

    // 打开态：reka 的 Teleport 与 FluerePortal 都在 mounted 之前不渲染，
    // 服务端因此不会出现 teleport 占位，也就没有水合不匹配
    const opened = createSSRApp({
      render: () =>
        h(FluereContentDialog, {
          open: true,
          title: '标题',
          primaryButtonText: '确定',
          secondaryButtonText: '取消',
        }),
    })
    const openedHtml = await renderToString(opened)
    expect(openedHtml).not.toContain('role="dialog"')
    expect(openedHtml).not.toContain('fui-content-dialog')
  })

  it('FluereTooltip 可服务端渲染（触发元素进首帧，提示面延迟到客户端 Teleport）', async () => {
    // reka 的 Tooltip 必须挂在 TooltipProvider 之下（与 WinUI 的 ToolTipService 对位）
    const app = createSSRApp({
      render: () =>
        h(
          FluereTooltipProvider,
          {},
          {
            default: () =>
              h(
                FluereTooltip,
                { content: 'Simple ToolTip', open: true },
                { default: () => h('button', { type: 'button' }, '按钮') },
              ),
          },
        ),
    })
    const html = await renderToString(app)
    expect(html).toContain('按钮')
    // 提示面走 Teleport，`onMounted` 之前不渲染 ⇒ 服务端无占位、无水合不匹配
    expect(html).not.toContain('fui-tooltip')
    expect(html).not.toContain('<!--teleport start-->')
  })

  it('FluereSmokeLayer 可服务端渲染（浮层属纯客户端，SSR 不输出）', async () => {
    const app = createSSRApp({ render: () => h(FluereSmokeLayer, { open: true }) })
    const html = await renderToString(app)
    expect(html).not.toContain('fui-smoke')
  })
})
