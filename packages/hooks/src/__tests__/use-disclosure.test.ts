/* oxlint-disable no-magic-numbers -- 断言里的调用次数属测试固定值 */
import { afterEach, describe, expect, it, vi } from 'vitest'
/**
 * 单元测试：useDisclosure 浮层开关状态机。
 *
 * 覆盖弹层组件的三条关键路径：
 *  1. 非受控：requestClose → closing → finishClose → onClosed；
 *  2. 受控：父组件不回写时视为撤销关闭（不进入 closing，不触发 onClosed）；
 *  3. reduced-motion：没有退出动画，关闭当场判为结束。
 * 另断言 requestClose 的幂等性（连点两次不会重复进入关闭流程）。
 */
import { effectScope, nextTick, ref } from 'vue'
import { useDisclosure } from '../use-disclosure'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/** 在独立 effectScope 内调用 composable（使内部 watch 可被清理） */
const runInScope = <TValue>(factory: () => TValue): { value: TValue; dispose: () => void } => {
  const scope = effectScope()
  const value = scope.run(factory) as TValue
  return { value, dispose: () => scope.stop() }
}

/** 环境降级为 prefers-reduced-motion: reduce */
const stubReducedMotion = (): void => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  )
}

describe('useDisclosure · 非受控', () => {
  it('初始为关闭且不处于关闭中', () => {
    const { value } = runInScope(() => useDisclosure())
    expect(value.isOpen.value).toBe(false)
    expect(value.isClosing.value).toBe(false)
  })

  it('open → requestClose → finishClose 走完关闭流程', async () => {
    const onClosed = vi.fn()
    const { value } = runInScope(() => useDisclosure({ onClosed }))

    value.open()
    expect(value.isOpen.value).toBe(true)
    expect(value.isClosing.value).toBe(false)

    expect(value.requestClose()).toBe(true)
    expect(value.isOpen.value).toBe(false)
    // 退出动画尚未结束：仍处于 closing
    expect(value.isClosing.value).toBe(true)
    expect(onClosed).not.toHaveBeenCalled()

    value.finishClose()
    await nextTick()
    expect(value.isClosing.value).toBe(false)
    expect(onClosed).toHaveBeenCalledTimes(1)
  })

  it('requestClose 幂等：已关闭 / 关闭中都不重复发起', () => {
    const { value } = runInScope(() => useDisclosure())
    expect(value.requestClose()).toBe(false)

    value.open()
    expect(value.requestClose()).toBe(true)
    expect(value.requestClose()).toBe(false)
  })

  it('cancelClose 撤销关闭且不触发 onClosed；重新打开会复位过渡态', () => {
    const onClosed = vi.fn()
    const { value } = runInScope(() => useDisclosure({ onClosed }))

    value.open()
    value.requestClose()
    value.cancelClose()
    expect(value.isClosing.value).toBe(false)
    expect(onClosed).not.toHaveBeenCalled()

    value.requestClose()
    expect(value.isClosing.value).toBe(true)
    value.open()
    expect(value.isOpen.value).toBe(true)
    expect(value.isClosing.value).toBe(false)
  })

  it('open() 回写 onUpdateOpen(true)', () => {
    const onUpdateOpen = vi.fn()
    const { value } = runInScope(() => useDisclosure({ onUpdateOpen }))
    value.open()
    expect(onUpdateOpen).toHaveBeenCalledWith(true)
    value.requestClose()
    expect(onUpdateOpen).toHaveBeenLastCalledWith(false)
  })
})

describe('useDisclosure · 受控', () => {
  it('父组件回写后进入关闭流程', async () => {
    const open = ref(true)
    const onClosed = vi.fn()
    const { value } = runInScope(() =>
      useDisclosure({
        open,
        onUpdateOpen: (next) => {
          open.value = next
        },
        onClosed,
      }),
    )

    expect(value.isOpen.value).toBe(true)
    expect(value.requestClose()).toBe(true)
    // 受控值已回写为 false，watch 同步进入 closing
    expect(open.value).toBe(false)
    expect(value.isClosing.value).toBe(true)

    value.finishClose()
    await nextTick()
    expect(onClosed).toHaveBeenCalledTimes(1)
  })

  it('父组件拒绝回写（值不变）时不进入 closing、不触发 onClosed', async () => {
    const open = ref(true)
    const onClosed = vi.fn()
    const onUpdateOpen = vi.fn()
    const { value } = runInScope(() => useDisclosure({ open, onUpdateOpen, onClosed }))

    value.requestClose()
    await nextTick()
    expect(onUpdateOpen).toHaveBeenCalledWith(false)
    expect(value.isOpen.value).toBe(true)
    expect(value.isClosing.value).toBe(false)
    expect(onClosed).not.toHaveBeenCalled()
  })

  it('父组件直接置为 false 也会进入关闭流程（覆盖外部程序化关闭）', async () => {
    const open = ref(true)
    const onClosed = vi.fn()
    const { value } = runInScope(() => useDisclosure({ open, onClosed }))

    open.value = false
    await nextTick()
    expect(value.isClosing.value).toBe(true)
    value.finishClose()
    expect(onClosed).toHaveBeenCalledTimes(1)
  })
})

describe('useDisclosure · prefers-reduced-motion', () => {
  it('无退出动画时关闭当场判为结束', async () => {
    stubReducedMotion()
    const onClosed = vi.fn()
    const { value } = runInScope(() => useDisclosure({ onClosed }))

    expect(value.reducedMotion.value).toBe(true)
    value.open()
    value.requestClose()
    await nextTick()
    expect(value.isOpen.value).toBe(false)
    expect(value.isClosing.value).toBe(false)
    expect(onClosed).toHaveBeenCalledTimes(1)
  })

  it('无 matchMedia 能力（SSR）时 reducedMotion 为 false，动画路径保持启用', () => {
    const { value } = runInScope(() => useDisclosure())
    expect(value.reducedMotion.value).toBe(false)
  })
})
