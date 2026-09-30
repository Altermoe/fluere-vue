/* oxlint-disable no-magic-numbers -- 样式契约测试的下标/时长属测试细节 */
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createSSRApp, h, nextTick } from 'vue'
import { renderToString } from 'vue/server-renderer'
import FluerePortal from '../portal.vue'

/**
 * 单元测试：FluerePortal 门户原语。
 *
 * 两条防线（对应 docs/ssr-guide.md）：
 *  1. 服务端与首次水合渲染为空 —— 不产生 `<teleport>` 占位，不引发水合不匹配；
 *  2. 挂载后才真正把内容 Teleport 到目标节点（默认 body）。
 */
describe('FluerePortal', () => {
  it('服务端不输出任何内容（挂载前不 Teleport）', async () => {
    const app = createSSRApp({
      render: () =>
        h(FluerePortal, {}, { default: () => h('span', { class: 'portal-child' }, '内容') }),
    })
    const html = await renderToString(app)
    expect(html).not.toContain('portal-child')
    expect(html).not.toContain('内容')
  })

  it('客户端挂载后 Teleport 到 body（不在组件原位渲染）', async () => {
    const wrapper = mount(FluerePortal, {
      slots: { default: () => h('span', { class: 'portal-child' }, '内容') },
      attachTo: document.body,
    })

    await nextTick()
    expect(wrapper.find('.portal-child').exists()).toBe(false)
    const teleported = document.body.querySelector('.portal-child')
    expect(teleported).not.toBeNull()
    expect(teleported?.textContent).toBe('内容')

    wrapper.unmount()
    // Teleport 的内容随组件卸载一并移除
    expect(document.body.querySelector('.portal-child')).toBeNull()
  })

  it('支持指定目标元素，disabled=true 时在原位渲染', async () => {
    const host = document.createElement('div')
    document.body.append(host)

    const wrapper = mount(FluerePortal, {
      props: { to: host, disabled: false },
      slots: { default: () => h('span', { class: 'portal-in-host' }, '宿主') },
      attachTo: document.body,
    })
    await nextTick()
    expect(host.querySelector('.portal-in-host')).not.toBeNull()
    wrapper.unmount()

    const inline = mount(FluerePortal, {
      props: { disabled: true },
      slots: { default: () => h('span', { class: 'portal-inline' }, '原位') },
      attachTo: document.body,
    })
    await nextTick()
    expect(inline.find('.portal-inline').exists()).toBe(true)
    inline.unmount()
    host.remove()
  })
})
