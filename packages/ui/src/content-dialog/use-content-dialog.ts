/**
 * ContentDialog 的行为编排层（状态机 + 事件面 + 焦点策略）。
 *
 * 对照来源：WinUI 3（microsoft-ui-xaml winui3/release/2.5.1）
 *   src/dxaml/xcp/dxaml/lib/ContentDialog_Partial.cpp
 *     #ChangeVisualState        —— 按钮可见性 / 默认按钮强调态 / 滚动与全尺寸状态
 *     #OnLayoutRootKeyDown      —— Escape 与 Enter
 *     #ExecuteCloseAction       —— 有可点的关闭按钮就程序化点击它，否则直接以 None 关闭
 *     #OnCommandButtonClicked   —— 先抛 ButtonClick（可 Cancel），未被取消再执行 Command 并隐藏
 *     #HideInternal             —— 抛 Closing（可 Cancel）→ 播放退出过渡 → 抛 Closed(result)
 *     #SetInitialFocusElement   —— 记录「弹出前聚焦的元素」，并三级优先设置初始焦点
 *     #OnFinishedClosing        —— 抛 Closed 之后才把弹窗收干净
 *
 * 与 WinUI 的差异（逐条记录，均写进组件文档）：
 *  - ButtonClick / Closing 的取消是**同步标志**（`args.cancel`），不做 WinUI 的异步 Deferral；
 *  - Enter 只在焦点不落在会自行处理 Enter 的元素（button / a / input / textarea / select /
 *    contenteditable / role=button）上时激活默认按钮；
 *  - 焦点还原时机 = 退出动画结束（WinUI 在关闭流程开始时就还焦点）；
 *  - 不做「同一父节点只允许一个 Popup 弹窗」的强约束。
 */

import { useDisclosure } from '@fluere-vue/hooks'
import { isClient } from '@fluere-vue/utils'
import { computed, onMounted, ref, watch } from 'vue'
import type { ComponentPublicInstance, Ref } from 'vue'
import {
  BUTTON_RESULTS,
  hasVisibleCommandButtons,
  resolveAccentButton,
  resolveCommandLayout,
} from './button-layout'
import type { ContentDialogCommandLayout } from './button-layout'
import { resolveInitialFocusTarget } from './focus'
import type {
  FluereContentDialogButtonClickEventArgs,
  FluereContentDialogButtonKind,
  FluereContentDialogClosedEventArgs,
  FluereContentDialogClosingEventArgs,
  FluereContentDialogProps,
  FluereContentDialogResult,
} from './types'

/**
 * 会自行处理 Enter 的元素：WinUI 里按键先路由给聚焦元素，只有它没处理时
 * LayoutRoot 的 Enter → 默认按钮才会生效；Web 侧用这张名单做等价判定。
 */
const handlesEnterNatively = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  const tag = target.tagName.toLowerCase()
  if (['button', 'a', 'input', 'textarea', 'select', 'summary'].includes(tag)) {
    return true
  }
  if (target.isContentEditable) {
    return true
  }
  return target.closest('[role="button"], [role="link"], [role="menuitem"]') !== null
}

/** 把组件 Props 里的按钮文案折算成命令区布局 */
const commandLayoutOf = (props: FluereContentDialogProps): ContentDialogCommandLayout =>
  resolveCommandLayout({
    primary: props.primaryButtonText ?? '',
    secondary: props.secondaryButtonText ?? '',
    close: props.closeButtonText ?? '',
  })

/** 组件事件面的结构化包装：让编排层可脱离 SFC 单测 */
export interface ContentDialogEmits {
  /** `v-model:open` 回写 */
  updateOpen: (value: boolean) => void
  /** 对齐 `Opened` */
  opened: () => void
  /** 对齐 `Closing`（可取消） */
  closing: (args: FluereContentDialogClosingEventArgs) => void
  /** 对齐 `Closed` */
  closed: (args: FluereContentDialogClosedEventArgs) => void
  /** 对齐 `PrimaryButtonClick`（可取消） */
  primaryButtonClick: (args: FluereContentDialogButtonClickEventArgs) => void
  /** 对齐 `SecondaryButtonClick`（可取消） */
  secondaryButtonClick: (args: FluereContentDialogButtonClickEventArgs) => void
  /** 对齐 `CloseButtonClick`（可取消） */
  closeButtonClick: (args: FluereContentDialogButtonClickEventArgs) => void
}

/** 编排层需要引用的 DOM（内容区 / 命令区 / 三个按钮） */
export interface ContentDialogElementRefs {
  /** 内容区容器（不含标题），初始焦点的第一优先级搜索根 */
  content: Ref<HTMLElement | null>
  /** 命令区容器，负责跟踪焦点是否落在命令区内 */
  commandSpace: Ref<HTMLElement | null>
  /** 三个按钮的组件实例 ref（取 `$el` 作为真实按钮元素） */
  buttons: Record<FluereContentDialogButtonKind, Ref<ComponentPublicInstance | null>>
}

/** `useContentDialog` 的入参 */
export interface UseContentDialogOptions {
  /** 组件 Props（响应式） */
  props: FluereContentDialogProps
  /** 结构化事件面 */
  emit: ContentDialogEmits
  /** DOM refs */
  refs: ContentDialogElementRefs
}

/**
 * ContentDialog 的行为编排。
 * @param options Props / 事件面 / DOM refs
 */
export const useContentDialog = (options: UseContentDialogOptions) => {
  const { props, emit, refs } = options

  const commandLayout = computed(() => commandLayoutOf(props))
  const hasCommandSpace = computed(() => hasVisibleCommandButtons(commandLayout.value))

  /** 焦点是否落在命令区内（影响默认按钮的强调态） */
  const focusInCommandArea = ref(false)
  /** 命令区内被聚焦的按钮 */
  const focusedButton = ref<FluereContentDialogButtonKind | null>(null)
  const accentButton = computed(() =>
    resolveAccentButton({
      defaultButton: props.defaultButton ?? 'none',
      layout: commandLayout.value,
      focusInCommandArea: focusInCommandArea.value,
      focusedButton: focusedButton.value,
    }),
  )

  /** 关闭结果（Closing 之后、Closed 之前暂存） */
  const pendingResult = ref<FluereContentDialogResult>('none')
  /** 弹出前聚焦的元素（关闭后还原焦点） */
  let previousActiveElement: HTMLElement | null = null

  const captureFocus = (): void => {
    if (!isClient) {
      return
    }
    const active = document.activeElement
    previousActiveElement =
      active instanceof HTMLElement && active !== document.body ? active : null
  }

  const restoreFocus = (): void => {
    const target = previousActiveElement
    previousActiveElement = null
    if (target?.isConnected) {
      target.focus()
    }
  }

  const disclosure = useDisclosure({
    open: () => props.open === true,
    onUpdateOpen: (value) => emit.updateOpen(value),
    onClosed: () => {
      restoreFocus()
      emit.closed({ result: pendingResult.value })
      pendingResult.value = 'none'
    },
  })

  const buttonElement = (kind: FluereContentDialogButtonKind): HTMLButtonElement | null => {
    const instance = refs.buttons[kind].value
    const element = instance?.$el
    // FluereButton 的根节点就是原生 button（isPrimaryButtonEnabled → disabled 需要该类型）
    return element instanceof HTMLButtonElement ? element : null
  }

  /** 当前生效的默认按钮（未设置 / 不可见时为 null） */
  const defaultButtonElement = (): HTMLButtonElement | null => {
    const kind = props.defaultButton ?? 'none'
    if (kind === 'none' || !commandLayout.value.visible[kind]) {
      return null
    }
    return buttonElement(kind)
  }

  const applyInitialFocus = (): void => {
    const target = resolveInitialFocusTarget({
      content: refs.content.value,
      defaultButton: defaultButtonElement(),
      commandSpace: refs.commandSpace.value,
    })
    target?.focus()
  }

  /**
   * 请求关闭：先抛 Closing（可取消），未被取消再改 `open` 并进入退出过渡。
   * @param result 本次关闭的返回值
   * @returns 是否真的发起了关闭
   */
  const requestClose = (result: FluereContentDialogResult): boolean => {
    if (props.open !== true || disclosure.isClosing.value) {
      return false
    }
    const args: FluereContentDialogClosingEventArgs = { result, cancel: false }
    emit.closing(args)
    if (args.cancel) {
      return false
    }
    pendingResult.value = result
    return disclosure.requestClose()
  }

  /**
   * 按钮点击：先抛对应 ButtonClick（可取消），未被取消再按结果关闭。
   * @param kind 被点击的按钮位
   */
  const onButtonClick = (kind: FluereContentDialogButtonKind): void => {
    const args: FluereContentDialogButtonClickEventArgs = { cancel: false }
    if (kind === 'primary') {
      emit.primaryButtonClick(args)
    } else if (kind === 'secondary') {
      emit.secondaryButtonClick(args)
    } else {
      emit.closeButtonClick(args)
    }
    if (args.cancel) {
      return
    }
    requestClose(BUTTON_RESULTS[kind])
  }

  /** Escape：对齐 `ExecuteCloseAction`（能点关闭按钮就点，否则直接 None 关闭） */
  const onEscape = (event: KeyboardEvent): void => {
    // 一并拦住 reka DismissableLayer 的 onDismiss：弹窗只走本组件自己的关闭流程
    event.preventDefault()
    if (props.open !== true) {
      return
    }
    if (commandLayout.value.visible.close) {
      onButtonClick('close')
      return
    }
    requestClose('none')
  }

  /** Enter：焦点不在自行处理 Enter 的元素上时，激活默认按钮 */
  const onEnter = (event: KeyboardEvent): void => {
    if (handlesEnterNatively(event.target)) {
      return
    }
    const target = defaultButtonElement()
    if (!target || target.disabled) {
      return
    }
    event.preventDefault()
    target.click()
  }

  /** 退出动画结束：只认内容层根节点自身的动画（内层 surface 的淡出会冒泡上来） */
  const onAnimationEnd = (event: AnimationEvent): void => {
    if (event.target !== event.currentTarget || !disclosure.isClosing.value) {
      return
    }
    disclosure.finishClose()
  }

  const onButtonFocus = (kind: FluereContentDialogButtonKind): void => {
    focusInCommandArea.value = true
    focusedButton.value = kind
  }

  const onCommandFocusOut = (event: FocusEvent): void => {
    const next = event.relatedTarget
    if (next instanceof Node && refs.commandSpace.value?.contains(next)) {
      return
    }
    focusInCommandArea.value = false
    focusedButton.value = null
  }

  watch(
    () => props.open === true,
    (value, previous) => {
      if (value && !previous) {
        captureFocus()
        emit.opened()
      }
    },
  )

  onMounted(() => {
    // 首次挂载即打开：补一次「记录焦点 + Opened」（此时父组件的监听已就绪）
    if (props.open === true) {
      captureFocus()
      emit.opened()
    }
  })

  return {
    commandLayout,
    hasCommandSpace,
    accentButton,
    isClosing: disclosure.isClosing,
    focusInCommandArea,
    requestClose,
    onButtonClick,
    onEscape,
    onEnter,
    onAnimationEnd,
    onButtonFocus,
    onCommandFocusOut,
    applyInitialFocus,
  }
}
