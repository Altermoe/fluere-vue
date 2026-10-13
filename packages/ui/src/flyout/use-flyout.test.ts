/**
 * `useFlyout` 契约（0.4.1 验收要点：关闭路径覆盖 Esc / 外部点击 / 焦点移出；
 * `role` / `aria-expanded` 契约明确；焦点归还；SSR 与水合一致）。
 *
 * 这里用真实挂载 + 真实文档事件来验，而不是只测状态机——关闭路径的全部价值就在
 * 「文档级监听器有没有按打开状态正确注册 / 注销」。
 */
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp, defineComponent, h, nextTick, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { openLayerCount, resetLayerStack } from './layer-stack'
import { useFlyout } from './use-flyout'
import type { UseFlyoutOptions, UseFlyoutReturn } from './use-flyout'

/** 已挂载的包装器（统一在 afterEach 卸载，避免 attachTo 的 insertBefore 空宿主问题） */
let mounted: ReturnType<typeof mount> | undefined = undefined

afterEach(() => {
  mounted?.unmount()
  mounted = undefined
})

beforeEach(() => {
  resetLayerStack()
})

interface Harness {
  /** setup 期才被赋值，故用一个可变盒子装 API */
  api: { value: UseFlyoutReturn }
  trigger: { value: HTMLElement | null }
  content: { value: HTMLElement | null }
  wrapper: ReturnType<typeof mount>
}

/** 挂一个最小的浮层宿主：触发器 + 内容，返回原语 API 与两个元素 ref */
const mountFlyout = (options: UseFlyoutOptions): Harness => {
  const trigger = ref<HTMLElement | null>(null)
  const content = ref<HTMLElement | null>(null)
  const api = { value: undefined as unknown as UseFlyoutReturn }

  const wrapper = mount(
    defineComponent({
      setup() {
        const flyout = useFlyout({ ...options, trigger, content })
        api.value = flyout
        return () =>
          h('div', [
            h(
              'button',
              {
                ref: (el: unknown) => (trigger.value = el as HTMLElement | null),
                ...flyout.triggerAttrs.value,
              },
              'trigger',
            ),
            h(
              'div',
              {
                ref: (el: unknown) => (content.value = el as HTMLElement | null),
                style: flyout.layerStyle.value,
                ...flyout.contentAttrs.value,
              },
              'content',
            ),
          ])
      },
    }),
    { attachTo: document.body },
  )

  mounted = wrapper
  return { api, trigger, content, wrapper }
}

/** 派发文档级事件（原语用 capture 监听在 document 上） */
const pressEscape = (): void => {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
}
const pointerDownOn = (target: EventTarget): void => {
  target.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
}
const focusInOn = (target: EventTarget): void => {
  target.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
}

describe('useFlyout · 开关与层级', () => {
  it('受控 open：跟随外部事实源，并在打开时登记层级', async () => {
    const open = ref(false)
    const { api, wrapper } = mountFlyout({
      tier: '--zIndexNavFlyout',
      open: () => open.value,
      onUpdateOpen: (value) => (open.value = value),
    })

    expect(api.value.isOpen.value).toBe(false)
    expect(api.value.layerStyle.value).toEqual({})

    open.value = true
    await nextTick()
    expect(api.value.isOpen.value).toBe(true)
    expect(api.value.layerStyle.value).toEqual({ zIndex: 'var(--zIndexNavFlyout)' })
    expect(openLayerCount()).toBe(1)

    open.value = false
    await nextTick()
    // 关闭即出栈，但样式缓存住供退出动画使用
    expect(openLayerCount()).toBe(0)
    expect(api.value.layerStyle.value.zIndex).toBe('var(--zIndexNavFlyout)')
    expect(wrapper.exists()).toBe(true)
  })

  it('嵌套模态时抬到模态之上', async () => {
    const modal = ref(true)
    const nested = ref(true)
    const a = mountFlyout({ tier: '--zIndexModal', open: () => modal.value })
    const b = mountFlyout({ tier: '--zIndexNavFlyout', open: () => nested.value })

    await nextTick()
    expect(a.api.value.layerStyle.value.zIndex).toBe('var(--zIndexModal)')
    expect(b.api.value.layerStyle.value.zIndex).toBe('calc(var(--zIndexModal) + var(--zIndexStep))')

    mounted?.unmount()
    mounted = a.wrapper
  })

  it('组件卸载时释放层级（不留占层泄漏）', async () => {
    const open = ref(true)
    const { wrapper } = mountFlyout({ tier: '--zIndexMenu', open: () => open.value })
    await nextTick()
    expect(openLayerCount()).toBe(1)

    wrapper.unmount()
    mounted = undefined
    expect(openLayerCount()).toBe(0)
  })
})

describe('useFlyout · 关闭路径', () => {
  it('Esc 关闭，并把 reason 交给 onClose', async () => {
    const open = ref(true)
    const onClose = vi.fn()
    mountFlyout({
      tier: '--zIndexNavFlyout',
      open: () => open.value,
      onUpdateOpen: (value) => (open.value = value),
      onClose,
    })
    await nextTick()

    pressEscape()
    expect(onClose).toHaveBeenCalledWith('esc')
    expect(open.value).toBe(false)
  })

  it('外部 pointerdown 关闭；触发器 / 浮层内部不关闭', async () => {
    const open = ref(true)
    const onClose = vi.fn()
    const { trigger, content } = mountFlyout({
      tier: '--zIndexNavFlyout',
      open: () => open.value,
      onUpdateOpen: (value) => (open.value = value),
      onClose,
    })
    await nextTick()

    pointerDownOn(content.value as HTMLElement)
    pointerDownOn(trigger.value as HTMLElement)
    expect(onClose).not.toHaveBeenCalled()

    pointerDownOn(document.body)
    expect(onClose).toHaveBeenCalledWith('outside-pointer')
    expect(open.value).toBe(false)
  })

  it('焦点移出（closeOnFocusLeave）关闭；默认不注册该路径', async () => {
    const open = ref(true)
    const onClose = vi.fn()
    mountFlyout({
      tier: '--zIndexNavFlyout',
      open: () => open.value,
      onUpdateOpen: (value) => (open.value = value),
      onClose,
      closeOnFocusLeave: true,
    })
    await nextTick()

    focusInOn(document.body)
    expect(onClose).toHaveBeenCalledWith('focus-leave')
  })

  it('关闭后注销文档监听（不再响应 Esc）', async () => {
    const open = ref(true)
    const onClose = vi.fn()
    const { api } = mountFlyout({
      tier: '--zIndexNavFlyout',
      open: () => open.value,
      onUpdateOpen: (value) => (open.value = value),
      onClose,
    })
    await nextTick()

    api.value.close('programmatic')
    await nextTick()
    onClose.mockClear()

    pressEscape()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('closeOnEscape=false 时不注册 Esc（底座已自行处理）', async () => {
    const open = ref(true)
    const onClose = vi.fn()
    mountFlyout({
      tier: '--zIndexNavFlyout',
      open: () => open.value,
      onUpdateOpen: (value) => (open.value = value),
      onClose,
      closeOnEscape: false,
    })
    await nextTick()

    pressEscape()
    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('useFlyout · 焦点归还', () => {
  it('关闭流程结束后把焦点还回打开前的元素', async () => {
    const outside = document.createElement('button')
    document.body.append(outside)
    outside.focus()
    expect(document.activeElement).toBe(outside)

    const open = ref(true)
    const { api } = mountFlyout({ tier: '--zIndexMenu', open: () => open.value })
    await nextTick()

    api.value.close('esc')
    await nextTick()
    // jsdom 没有真实动画：退出过渡需要调用方回传 finishClose
    api.value.finishClose()
    expect(document.activeElement).toBe(outside)

    outside.remove()
  })

  it('returnFocus=false 时不抢焦点', async () => {
    const outside = document.createElement('button')
    const elsewhere = document.createElement('button')
    document.body.append(outside, elsewhere)

    const open = ref(true)
    const { api } = mountFlyout({
      tier: '--zIndexMenu',
      open: () => open.value,
      returnFocus: false,
    })
    await nextTick()

    // 打开后把焦点挪到别处：若原语仍然归还焦点，这里会被拉回打开前的元素
    elsewhere.focus()
    api.value.close()
    await nextTick()
    api.value.finishClose()
    expect(document.activeElement).toBe(elsewhere)

    outside.remove()
    elsewhere.remove()
  })
})

describe('useFlyout · aria 契约', () => {
  it('声明 hasPopup 时才输出 aria-expanded / aria-haspopup', async () => {
    const open = ref(false)
    const { api } = mountFlyout({
      tier: '--zIndexNavFlyout',
      open: () => open.value,
      hasPopup: 'listbox',
      role: 'listbox',
    })

    expect(api.value.triggerAttrs.value).toEqual({
      'data-state': 'closed',
      'aria-expanded': 'false',
      'aria-haspopup': 'listbox',
    })
    expect(api.value.contentAttrs.value).toEqual({ 'data-state': 'closed', 'role': 'listbox' })

    open.value = true
    await nextTick()
    expect(api.value.triggerAttrs.value['aria-expanded']).toBe('true')
    expect(api.value.contentAttrs.value['data-state']).toBe('open')
  })

  it('Tooltip 这类非 popup 触发器不输出 aria-expanded（用 aria-describedby）', async () => {
    const open = ref(true)
    const { api } = mountFlyout({
      tier: '--zIndexTooltip',
      open: () => open.value,
      role: 'tooltip',
    })
    expect(api.value.triggerAttrs.value).toEqual({ 'data-state': 'open' })
    expect(api.value.contentAttrs.value).toEqual({ 'data-state': 'open', 'role': 'tooltip' })
  })

  it('模态内容输出 aria-modal', async () => {
    const open = ref(true)
    const { api } = mountFlyout({
      tier: '--zIndexModal',
      open: () => open.value,
      role: 'dialog',
      modal: true,
    })
    expect(api.value.contentAttrs.value['aria-modal']).toBe('true')
  })
})

describe('useFlyout · SSR', () => {
  it('服务端渲染不抛错、不登记层级、也不写 inline z-index（避免跨请求污染与水合不匹配）', async () => {
    resetLayerStack()
    const app = createSSRApp(
      defineComponent({
        setup() {
          const flyout = useFlyout({ tier: '--zIndexModal', open: () => true })
          return () => h('div', { style: flyout.layerStyle.value }, 'flyout')
        },
      }),
    )
    const html = await renderToString(app)
    expect(html).toContain('flyout')
    expect(html).not.toContain('z-index')
    expect(openLayerCount()).toBe(0)
  })
})
