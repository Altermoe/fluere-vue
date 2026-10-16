/* oxlint-disable no-magic-numbers -- 断言里的键值 / 下标属测试固定值 */
import { afterEach, describe, expect, it, vi } from 'vitest'
/**
 * 单元测试：useFocusTrap 浮层焦点管理。
 *
 * 覆盖五条验收路径（PLAN.md 阶段 5 测试计划）：
 *  1. 陷阱：Tab / Shift+Tab 在容器内循环，`defaultPrevented`（不跑出容器）；
 *  2. Esc：回调触发且 preventDefault；
 *  3. 点击外部：回调触发，且**焦点归还被抑制**（焦点跟随点击落点，不抢回触发器）；
 *  4. 焦点归还：关闭后焦点回到激活前的元素（触发器），`returnFocus: false` 可关掉；
 *  5. SSR 无副作用：`document` 不可用时激活不抛错、不聚焦、`isTrapped` 恒 false。
 *
 * 另断言「禁用 / tabindex=-1 / hidden 的候选不进 Tab 序」与键盘交互解除外部点击抑制。
 */
import { effectScope, nextTick, ref } from 'vue'
import { useFocusTrap } from '../use-focus-trap'
import type { UseFocusTrapOptions } from '../use-focus-trap'

/** 等 watch（flush: 'post'）与焦点副作用落定：跨一次宏任务 */
const flush = async (): Promise<void> => {
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

interface TrapHarness {
  container: HTMLElement
  trigger: HTMLButtonElement
  items: HTMLButtonElement[]
  open: ReturnType<typeof ref<boolean>>
  dispose: () => void
}

const harnesses: TrapHarness[] = []

/** 造一个「触发器 + 容器 + 若干可聚焦条目」的 DOM，激活状态用 ref 驱动 */
const createHarness = (options: Partial<UseFocusTrapOptions> = {}): TrapHarness => {
  const trigger = document.createElement('button')
  trigger.type = 'button'
  trigger.textContent = 'trigger'
  document.body.append(trigger)

  const container = document.createElement('div')
  container.tabIndex = -1
  const items = ['a', 'b', 'c'].map((name) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = name
    container.append(button)
    return button
  })
  document.body.append(container)

  const open = ref(false)
  const scope = effectScope()
  scope.run(() => {
    useFocusTrap({
      container: () => container,
      trigger: () => trigger,
      active: () => open.value,
      ...options,
    })
  })

  const harness: TrapHarness = {
    container,
    trigger,
    items,
    open,
    dispose: () => {
      scope.stop()
      container.remove()
      trigger.remove()
    },
  }
  harnesses.push(harness)
  return harness
}

/** 在 document 上派发一次 keydown（capture 监听在目标节点同样收到） */
const pressKey = (key: string, init: KeyboardEventInit = {}): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
  document.dispatchEvent(event)
  return event
}

/** 在指定元素上派发一次 pointerdown（jsdom 无 PointerEvent 构造器，用 MouseEvent 代位） */
const pointerDown = (target: EventTarget): void => {
  target.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true }))
}

afterEach(() => {
  for (const harness of harnesses.splice(0)) {
    harness.dispose()
  }
  vi.unstubAllGlobals()
})

describe('useFocusTrap · 陷阱', () => {
  it('激活后焦点进入容器（第一个可 Tab 元素），停用后卸下监听', async () => {
    const harness = createHarness()
    expect(document.activeElement).toBe(document.body)

    harness.open.value = true
    await flush()

    expect(document.activeElement).toBe(harness.items[0])
    pressKey('Tab')
    expect(document.activeElement).toBe(harness.items[1])

    harness.open.value = false
    await flush()
    // 卸下后 Tab 恢复默认行为（监听已移除 ⇒ 不再 preventDefault）
    const event = pressKey('Tab')
    expect(event.defaultPrevented).toBe(false)
  })

  it('Tab 到尾部回绕到首个；Shift+Tab 从首回绕到尾', async () => {
    const harness = createHarness()
    harness.open.value = true
    await flush()

    harness.items[2]?.focus()
    pressKey('Tab')
    expect(document.activeElement).toBe(harness.items[0])

    pressKey('Tab', { shiftKey: true })
    expect(document.activeElement).toBe(harness.items[2])
  })

  it('Tab 被 preventDefault（默认的移出容器行为不执行）', async () => {
    const harness = createHarness()
    harness.open.value = true
    await flush()

    const event = pressKey('Tab')
    expect(event.defaultPrevented).toBe(true)
  })

  it('禁用 / hidden / tabindex=-1 的候选不进 Tab 序（跳过并回绕）', async () => {
    const harness = createHarness()
    const [first, second, third] = harness.items
    second?.setAttribute('disabled', '')
    third?.setAttribute('hidden', '')
    // 第四个条目：tabindex="-1"（程序可聚焦但不参与 Tab 序）
    const fourth = document.createElement('button')
    fourth.type = 'button'
    fourth.tabIndex = -1
    harness.container.append(fourth)

    harness.open.value = true
    await flush()

    expect(document.activeElement).toBe(first)
    pressKey('Tab')
    // 第二（disabled）/ 三（hidden）/ 四（tabindex=-1）全部跳过 ⇒ 首尾回绕
    expect(document.activeElement).toBe(first)
  })

  it('容器内没有可聚焦元素时聚焦容器本身（焦点不丢到 body 之外）', async () => {
    const harness = createHarness()
    harness.items.forEach((item) => item.remove())

    harness.open.value = true
    await flush()

    expect(document.activeElement).toBe(harness.container)
    const event = pressKey('Tab')
    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(harness.container)
  })
})

describe('useFocusTrap · Esc', () => {
  it('Esc 触发 onEscape 并 preventDefault', async () => {
    const onEscape = vi.fn()
    const harness = createHarness({ onEscape })
    harness.open.value = true
    await flush()

    const event = pressKey('Escape')
    expect(onEscape).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)
  })

  it('未提供 onEscape 时不吞默认行为', async () => {
    const harness = createHarness()
    harness.open.value = true
    await flush()

    const event = pressKey('Escape')
    expect(event.defaultPrevented).toBe(false)
  })
})

describe('useFocusTrap · 点击外部', () => {
  it('容器外的 pointerdown 触发 onOutsidePointer；容器内与触发器上不算外部', async () => {
    const onOutsidePointer = vi.fn()
    const harness = createHarness({ onOutsidePointer })
    harness.open.value = true
    await flush()

    pointerDown(harness.items[0] as HTMLElement)
    pointerDown(harness.trigger)
    expect(onOutsidePointer).not.toHaveBeenCalled()

    const outsider = document.createElement('div')
    document.body.append(outsider)
    pointerDown(outsider)
    expect(onOutsidePointer).toHaveBeenCalledTimes(1)
    outsider.remove()
  })

  it('外部点击关闭时焦点归还被抑制（焦点不抢回触发器）', async () => {
    const onOutsidePointer = vi.fn()
    const harness = createHarness({ onOutsidePointer })
    harness.trigger.focus()
    harness.open.value = true
    await flush()
    expect(document.activeElement).toBe(harness.items[0])

    const outsider = document.createElement('div')
    document.body.append(outsider)
    pointerDown(outsider)
    expect(onOutsidePointer).toHaveBeenCalledTimes(1)

    harness.open.value = false
    await flush()
    expect(document.activeElement).not.toBe(harness.trigger)
    outsider.remove()
  })

  it('键盘交互解除外部点击抑制：先点外面、再按 Esc 关闭时仍归还焦点', async () => {
    const harness = createHarness({ onEscape: () => undefined })
    harness.trigger.focus()
    harness.open.value = true
    await flush()

    const outsider = document.createElement('div')
    document.body.append(outsider)
    pointerDown(outsider)

    pressKey('Escape')
    harness.open.value = false
    await flush()
    expect(document.activeElement).toBe(harness.trigger)
    outsider.remove()
  })
})

describe('useFocusTrap · 焦点归还', () => {
  it('关闭后焦点回到激活前的元素', async () => {
    const harness = createHarness()
    harness.trigger.focus()
    harness.open.value = true
    await flush()
    expect(document.activeElement).toBe(harness.items[0])

    harness.open.value = false
    await flush()
    expect(document.activeElement).toBe(harness.trigger)
  })

  it('returnFocus: false 时不归还', async () => {
    const harness = createHarness({ returnFocus: false })
    harness.trigger.focus()
    harness.open.value = true
    await flush()

    harness.open.value = false
    await flush()
    expect(document.activeElement).not.toBe(harness.trigger)
  })
})

describe('useFocusTrap · SSR 无副作用', () => {
  it('document 不可用时激活不抛错、不聚焦、isTrapped 恒 false', async () => {
    const focus = vi.fn()
    const fakeContainer = {
      focus,
      contains: () => false,
      querySelectorAll: () => [],
    } as unknown as HTMLElement

    const active = ref(false)
    const scope = effectScope()
    const trap = scope.run(() =>
      useFocusTrap({
        container: () => fakeContainer,
        active: () => active.value,
      }),
    )

    vi.stubGlobal('document', undefined)
    active.value = true
    await flush()

    expect(focus).not.toHaveBeenCalled()
    expect(trap?.isTrapped.value).toBe(false)
    scope.stop()
    vi.unstubAllGlobals()
  })
})
