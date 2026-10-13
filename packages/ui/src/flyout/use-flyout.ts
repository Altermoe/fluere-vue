/**
 * `useFlyout` —— 统一的浮层原语（docs/todo.md 0.4.1）。
 *
 * 背景：仓库里此前有三套各写一遍的浮层实现——Tooltip（reka `TooltipRoot` 管开关与关闭）、
 * Combobox（reka `ComboboxRoot` + 自研 `use-combobox-popup` 管开合时序）、ContentDialog
 * （完全自研：遮罩、焦点、Esc）。开关状态机（`useDisclosure`）已经收敛过一次，但
 * **层级、焦点归还、关闭语义、aria 契约**仍然各写各的，于是 MenuFlyout / DropDownButton /
 * Select / NavigationView 溢出会把同一批逻辑再写四遍。这里把它们收敛到一个原语：
 *
 *   1. **开关状态**：复用 `@fluere-vue/hooks` 的 `useDisclosure`（受控 / 非受控、
 *      退出过渡、reduced-motion）。底座自管状态时，把底座的状态作为 `open` getter 传进来，
 *      `onUpdateOpen` 写回底座即可——原语永远以传入的事实源为准。
 *   2. **层级**：打开时向层级栈登记（`layer-stack.ts`），拿到引用 token 的 z 表达式，
 *      嵌套浮层自动抬到宿主之上（模态里的下拉不再被模态盖住）。
 *   3. **关闭语义**：Esc / 外部 pointerdown / 焦点移出，三条路径都可开关，并带
 *      `FlyoutCloseReason` 交回调（0.6 起的菜单族要按 reason 分辨行为）。
 *   4. **焦点归还**：打开时记录 `document.activeElement`，关闭流程结束后还回去
 *      （时机 = `onClosed`，与 ContentDialog 的既有结论一致：等退出动画播完）。
 *   5. **aria 契约**：`triggerAttrs` / `contentAttrs` 给出 `data-state`、`aria-expanded`、
 *      `aria-haspopup`、`role`、`aria-modal`。`aria-haspopup` 只在调用方声明 `hasPopup`
 *      时输出——Tooltip 用的是 `aria-describedby`，不该被写成 `aria-expanded`。
 *
 * SSR 安全：`setup()` 期不访问任何浏览器 API；文档级监听器只在 `isClient` 为真且浮层
 * 打开时注册，随关闭 / 作用域销毁注销（见 docs/ssr-guide.md）。
 *
 * 与 WinUI 的对应：`Popup` 的 `IsOpen` + `XamlRoot` 层级 ≈ 本原语的「开关 + 层级栈」；
 * `Popup.Closed` 的 `LightDismiss` 路径（Esc / 点击外部 / 焦点离开）≈ 三条关闭路径 +
 * `FlyoutCloseReason`；`FocusManager` 的「关闭后还焦点给弹出前元素」≈ `returnFocus`。
 */
import { useDisclosure } from '@fluere-vue/hooks'
import { isClient } from '@fluere-vue/utils'
import { computed, onMounted, onScopeDispose, ref, watch } from 'vue'
import type { CSSProperties, ComputedRef, MaybeRefOrGetter, Ref } from 'vue'
import { acquireLayer } from './layer-stack'
import type { FlyoutLayerHandle, FlyoutTier } from './layer-stack'

export type { FlyoutTier } from './layer-stack'
export { FLYOUT_TIERS } from './layer-stack'

/** 关闭原因：菜单族按它区分「Esc 关闭」与「点了别处」，也便于测试断言 */
export type FlyoutCloseReason =
  | 'esc'
  | 'outside-pointer'
  | 'focus-leave'
  | 'trigger'
  | 'programmatic'

/** `aria-haspopup` 的合法取值（WAI-ARIA 1.2） */
export type FlyoutHasPopup = 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog' | boolean

/** `useFlyout` 的配置 */
export interface UseFlyoutOptions {
  /** 浮层档位（刻度 token 名）。层级栈据此判断嵌套提升 */
  tier: FlyoutTier
  /**
   * 受控开关。传 `undefined` 用内部状态；底座（reka 等）自管状态时传
   * **getter**（如 `() => popup.isOpen.value`），原语即以外部的值为准。
   */
  open?: MaybeRefOrGetter<boolean | undefined>
  /** 开关回写（受控用法下对应 `emit('update:open', value)`） */
  onUpdateOpen?: (value: boolean) => void
  /** 关闭请求（**尚未**真正关闭前触发，可用于取消 / 记录） */
  onClose?: (reason: FlyoutCloseReason) => void
  /** 关闭流程结束（退出动画播完）时触发；焦点归还也在此刻发生 */
  onClosed?: () => void
  /** Esc 关闭（默认开）。底座已自行处理 Esc 时置 false，避免双重关闭 */
  closeOnEscape?: boolean
  /** 外部 pointerdown 关闭（默认开）。底座已有 DismissableLayer 时置 false */
  closeOnOutsidePointer?: boolean
  /** 焦点移出触发器与浮层后关闭（默认关；悬停类浮层可开） */
  closeOnFocusLeave?: boolean
  /** 关闭后把焦点还回打开前的元素（默认开） */
  returnFocus?: boolean
  /** 触发器元素（判定「外部点击 / 焦点移出」用） */
  trigger?: Ref<HTMLElement | null | undefined>
  /** 浮层内容元素（同上） */
  content?: Ref<HTMLElement | null | undefined>
  /** 浮层内容的 `role`（如 `listbox` / `menu` / `dialog` / `tooltip`） */
  role?: string
  /** 输出 `aria-haspopup`；不传则**不输出**（Tooltip 这类非 popup 触发器不要它） */
  hasPopup?: FlyoutHasPopup
  /** 模态：内容上输出 `aria-modal="true"`（焦点陷阱由底座负责，本原语不实现） */
  modal?: boolean
}

/** `useFlyout` 的返回值 */
export interface UseFlyoutReturn {
  /** 当前是否打开（跟随传入的事实源） */
  isOpen: ComputedRef<boolean>
  /** 是否处于「已请求关闭、退出动画未结束」的过渡态 */
  isClosing: ComputedRef<boolean>
  /** 打开 */
  open: () => void
  /** 按原因关闭（默认 `programmatic`） */
  close: (reason?: FlyoutCloseReason) => void
  /** 开 / 关切换（触发器点击用，原因记为 `trigger`） */
  toggle: () => void
  /** 退出动画结束（组件在 `animationend` 上调用；reduced-motion 下原语自动收尾） */
  finishClose: () => void
  /** 触发器上的 aria / data 契约 */
  triggerAttrs: ComputedRef<Record<string, string | undefined>>
  /** 浮层内容上的 aria / data 契约 */
  contentAttrs: ComputedRef<Record<string, string | undefined>>
  /** 浮层层级样式，直接绑到浮层元素：`:style="flyout.layerStyle"` */
  layerStyle: ComputedRef<CSSProperties>
}

/**
 * 创建浮层原语。
 * @param options 档位、受控开关、关闭路径与 aria 契约
 */
export const useFlyout = (options: UseFlyoutOptions): UseFlyoutReturn => {
  const {
    tier,
    open: controlledOpen,
    onUpdateOpen,
    onClose,
    onClosed,
    closeOnEscape = true,
    closeOnOutsidePointer = true,
    closeOnFocusLeave = false,
    returnFocus = true,
    trigger,
    content,
    role,
    hasPopup,
    modal = false,
  } = options

  /** 打开前聚焦的元素（关闭后还焦点） */
  const lastFocused = ref<HTMLElement | null>(null)
  /** 当前已登记的层级句柄 */
  const layer = ref<FlyoutLayerHandle | null>(null)
  /**
   * 最近一次的层级样式。关闭时层级立刻出栈（避免任何「没人调 finishClose 就永久占层」
   * 的泄漏），但退出动画期间元素还在，所以样式要缓存住，否则关闭瞬间 z 会跳一下。
   */
  const lastLayerStyle = ref<CSSProperties>({})

  const releaseLayer = (): void => {
    layer.value?.release()
    layer.value = null
  }

  const restoreFocus = (): void => {
    if (!returnFocus) {
      return
    }
    const target = lastFocused.value
    lastFocused.value = null
    if (target !== null && target.isConnected) {
      target.focus({ preventScroll: true })
    }
  }

  const disclosure = useDisclosure({
    open: controlledOpen,
    onUpdateOpen: (value) => {
      onUpdateOpen?.(value)
    },
    onClosed: () => {
      restoreFocus()
      onClosed?.()
    },
  })

  const { isOpen, isClosing, requestClose, finishClose } = disclosure

  const close = (reason: FlyoutCloseReason = 'programmatic'): void => {
    if (!isOpen.value || isClosing.value) {
      return
    }
    onClose?.(reason)
    requestClose()
  }

  const open = (): void => {
    disclosure.open()
  }

  const toggle = (): void => {
    if (isOpen.value) {
      close('trigger')
      return
    }
    open()
  }

  /* ---------------------------------------------------------------- */
  /* 层级：登记 / 出栈                                                  */
  /* ---------------------------------------------------------------- */

  /**
   * 登记本层并刷新样式。
   *
   * SSR 安全有两层含义，这里都要满足：
   *   ① 层级栈是**模块级**状态，服务端渲染绝不能往里写（并发请求会互相污染）；
   *   ② 首帧水合要与服务端 HTML 一致 —— 若在 setup 期就写上 inline `z-index`，
   *      服务端产物没有、客户端首帧有，就会报水合不匹配。
   * 所以登记只发生在客户端、且只在 `onMounted` 之后（见下方 onMounted 与 watch）。
   * 服务端与首帧的层级由组件样式表里的 `--fui-*-z` 缺省值兜底。
   */
  const acquire = (): void => {
    if (!isClient) {
      return
    }
    releaseLayer()
    const handle = acquireLayer(tier)
    layer.value = handle
    lastLayerStyle.value = handle.style
  }

  /** 记录打开前聚焦的元素（此时 `document.activeElement` 还是触发元素） */
  const captureFocus = (): void => {
    if (!returnFocus || !isClient || typeof document === 'undefined') {
      return
    }
    const active = document.activeElement
    lastFocused.value = active instanceof HTMLElement ? active : null
  }

  const watchOpen = (value: boolean): void => {
    if (value) {
      captureFocus()
      acquire()
      return
    }
    // 关闭即出栈：不依赖调用方是否回传 finishClose，杜绝占层泄漏；
    // 退出动画期间用缓存样式维持层级。
    releaseLayer()
  }

  // 刻意**不用** immediate：setup 期登记会让 SSR 产物带上 inline z-index，
  // 与客户端首帧不一致（水合不匹配）且会污染模块级层级栈。
  // 「挂载时就已经是打开态」由上面的 onMounted 补登记。
  watch(isOpen, watchOpen, { flush: 'post' })

  /* ---------------------------------------------------------------- */
  /* 关闭语义：Esc / 外部 pointerdown / 焦点移出（仅客户端、仅打开时）    */
  /* ---------------------------------------------------------------- */

  const isInside = (target: EventTarget | null): boolean => {
    if (!(target instanceof Node)) {
      return false
    }
    return (
      Boolean(trigger?.value?.contains(target) ?? false) ||
      Boolean(content?.value?.contains(target) ?? false)
    )
  }

  const onDocumentKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      close('esc')
    }
  }

  const onDocumentPointerDown = (event: PointerEvent): void => {
    if (isInside(event.target)) {
      return
    }
    close('outside-pointer')
  }

  const onDocumentFocusIn = (event: FocusEvent): void => {
    if (isInside(event.target)) {
      return
    }
    close('focus-leave')
  }

  const addListeners = (): void => {
    if (!isClient) {
      return
    }
    if (closeOnEscape) {
      document.addEventListener('keydown', onDocumentKeydown, true)
    }
    if (closeOnOutsidePointer) {
      document.addEventListener('pointerdown', onDocumentPointerDown, true)
    }
    if (closeOnFocusLeave) {
      document.addEventListener('focusin', onDocumentFocusIn, true)
    }
  }

  const removeListeners = (): void => {
    if (!isClient) {
      return
    }
    document.removeEventListener('keydown', onDocumentKeydown, true)
    document.removeEventListener('pointerdown', onDocumentPointerDown, true)
    document.removeEventListener('focusin', onDocumentFocusIn, true)
  }

  if (isClient) {
    // 水合完成后再补层级：服务端与客户端首帧都不带 inline `z-index`，两边一致
    // （首帧的层级由组件样式表缺省值兜底），随后再挂文档级关闭监听。
    onMounted(() => {
      if (isOpen.value) {
        acquire()
        addListeners()
      }
    })

    watch(
      isOpen,
      (value) => {
        if (value) {
          addListeners()
          return
        }
        removeListeners()
      },
      { flush: 'post' },
    )

    onScopeDispose(() => {
      removeListeners()
      releaseLayer()
    })
  }

  /* ---------------------------------------------------------------- */
  /* aria 契约                                                        */
  /* ---------------------------------------------------------------- */

  const state = computed(() => (isOpen.value ? 'open' : 'closed'))

  const triggerAttrs = computed<Record<string, string | undefined>>(() => {
    const attrs: Record<string, string | undefined> = { 'data-state': state.value }
    if (hasPopup !== undefined) {
      attrs['aria-expanded'] = String(isOpen.value)
      attrs['aria-haspopup'] = typeof hasPopup === 'boolean' ? String(hasPopup) : hasPopup
    }
    return attrs
  })

  const contentAttrs = computed<Record<string, string | undefined>>(() => {
    const attrs: Record<string, string | undefined> = { 'data-state': state.value }
    if (role !== undefined) {
      attrs['role'] = role
    }
    if (modal) {
      attrs['aria-modal'] = 'true'
    }
    return attrs
  })

  const layerStyle = computed<CSSProperties>(() => layer.value?.style ?? lastLayerStyle.value)

  return {
    isOpen,
    isClosing,
    open,
    close,
    toggle,
    finishClose,
    triggerAttrs,
    contentAttrs,
    layerStyle,
  }
}
