/* oxlint-disable prefer-named-capture-group, no-magic-numbers -- 样式契约测试要读 SFC 源码做文本解析，正则与下标属测试细节 */
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { createSSRApp, h, nextTick } from 'vue'
import { renderToString } from 'vue/server-renderer'
import FluereSmokeLayer from '../smoke-layer.vue'
import smokeSfc from '../smoke-layer.vue?raw'

/**
 * 单元测试：FluereSmokeLayer 遮罩层原语。
 *
 * 对照来源：WinUI 3（microsoft-ui-xaml winui3/release/2.5.1）
 *   src/controls/dev/CommonStyles/ContentDialog_themeresources.xaml（SmokeLayerBackground）
 *   src/dxaml/xcp/dxaml/lib/ContentDialog_Partial.cpp#PrepareSmokeLayer（第二个 Popup）
 *   src/dxaml/xcp/dxaml/lib/LayoutTransition_partial.cpp#2251（遮罩只做 83ms linear 透明度）
 *
 * jsdom 不解析 `<style scoped>`（也解析不了 `var()`），因此几何 / 关键帧 / 时长
 * 一律退回「断言 SFC 源码里的声明」；真实冻结帧测量由 temp/pw-content-dialog.mjs 负责。
 */
const readStyleText = (): string =>
  (/<style[^>]*>(?<css>[\s\S]*?)<\/style>/.exec(smokeSfc)?.groups?.css ?? '').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  )

const readStyleRules = (): Map<string, string> => {
  const rules = new Map<string, string>()
  for (const block of readStyleText()
    .replace(/@media[^{]*{/g, '')
    .split('}')) {
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

const readKeyframes = (name: string): string =>
  (new RegExp(`@keyframes\\s+${name}\\s*\\{([\\s\\S]*?)^\\}`, 'm').exec(readStyleText())?.[1] ?? '')
    .replace(/\s+/g, ' ')
    .trim()

const rules = readStyleRules()

afterEach(() => {
  document.body.innerHTML = ''
})

describe('FluereSmokeLayer 渲染契约', () => {
  it('服务端不渲染（浮层属纯客户端）', async () => {
    const app = createSSRApp({ render: () => h(FluereSmokeLayer, { open: true }) })
    const html = await renderToString(app)
    expect(html).not.toContain('fui-smoke')
  })

  it('open=false 时不渲染遮罩；open=true 时 Teleport 到 body', async () => {
    const closed = mount(FluereSmokeLayer, { props: { open: false }, attachTo: document.body })
    await nextTick()
    expect(document.body.querySelector('.fui-smoke')).toBeNull()
    closed.unmount()

    const opened = mount(FluereSmokeLayer, { props: { open: true }, attachTo: document.body })
    await nextTick()
    const smoke = document.body.querySelector('.fui-smoke')
    expect(smoke).not.toBeNull()
    expect(smoke?.getAttribute('data-state')).toBe('open')
    // 纯装饰：对 AT 隐藏（WinUI 遮罩层没有 UIA 语义）
    expect(smoke?.getAttribute('aria-hidden')).toBe('true')
    opened.unmount()
  })

  it('open 翻转时 data-state 同步为 closed（退出动画的选择器依据）', async () => {
    const wrapper = mount(FluereSmokeLayer, { props: { open: true }, attachTo: document.body })
    await nextTick()
    expect(document.body.querySelector('.fui-smoke')?.getAttribute('data-state')).toBe('open')

    await wrapper.setProps({ open: false })
    // reka 的 Presence 在 watch 回调里先 await nextTick 才判定，这里多等一拍
    await nextTick()
    await nextTick()
    // jsdom 拿不到 scoped 样式里的 animation-name，reka Presence 判定「无动画」后立即卸载；
    // 真实的退出动画（83ms linear 后再卸载）由 Playwright 冻结帧验证
    expect(document.body.querySelector('.fui-smoke')).toBeNull()
    wrapper.unmount()
  })
})

describe('FluereSmokeLayer 样式契约（WinUI ContentDialog SmokeLayer）', () => {
  it('遮罩铺满视口、承接指针、不参与缩放', () => {
    const base = rules.get('.fui-smoke') ?? ''
    expect(base).toContain('position: fixed')
    expect(base).toContain('inset: 0')
    expect(base).toContain('pointer-events: auto')
    // 遮罩层只做透明度动画：基础规则里不得出现 transform
    expect(base).not.toContain('transform')
  })

  it('填充色走 colorBackgroundOverlay（SmokeFillColorDefault 的语义位）', () => {
    expect(rules.get('.fui-smoke')).toContain('--fui-smoke-fill: var(--colorBackgroundOverlay)')
  })

  it('进入 / 退出各一条 83ms linear 的透明度动画', () => {
    expect(rules.get(".fui-smoke[data-state='open']")).toContain(
      'animation: fui-smoke-in var(--fui-smoke-fade-duration) linear both',
    )
    expect(rules.get(".fui-smoke[data-state='closed']")).toContain(
      'animation: fui-smoke-out var(--fui-smoke-fade-duration) linear both',
    )
    expect(rules.get('.fui-smoke')).toContain('--fui-smoke-fade-duration: 83ms')
  })

  it('关键帧只有透明度：0→1 / 1→0', () => {
    expect(readKeyframes('fui-smoke-in')).toContain('from { opacity: 0; }')
    expect(readKeyframes('fui-smoke-in')).toContain('to { opacity: 1; }')
    expect(readKeyframes('fui-smoke-out')).toContain('from { opacity: 1; }')
    expect(readKeyframes('fui-smoke-out')).toContain('to { opacity: 0; }')
  })

  it('prefers-reduced-motion 下关闭动画且不留中间态', () => {
    expect(readStyleText()).toContain('@media (prefers-reduced-motion: reduce)')
    expect(rules.get('.fui-smoke[data-state]')).toContain('animation: none')
  })

  it('样式块内不出现硬编码色值', () => {
    expect(readStyleText()).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(readStyleText()).not.toMatch(/\brgba?\(/)
  })
})
