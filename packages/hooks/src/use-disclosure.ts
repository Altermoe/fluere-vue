import { computed, ref, toValue, watch } from 'vue'
/**
 * 浮层开关状态机（useDisclosure）。
 *
 * 弹层类组件（ContentDialog / 未来的 Tooltip / 文档站 StartMenu）都要回答同一组问题：
 * 谁是唯一事实源、什么时候算「正在关闭」、退出动画播完了没有、用户能不能撤销关闭。
 * 这里把这套状态收敛到一个零 DOM 依赖的状态机里，组件只负责把动画事件喂回来：
 *
 *   open: false --requestClose()--> open: true→false（进入 closing）
 *                                       ├─ finishClose()  → onClosed()，退出动画结束
 *                                       └─ cancelClose()  → 回到稳定态（撤销关闭）
 *
 * SSR 安全：本模块不访问任何浏览器 API（`prefers-reduced-motion` 由
 * `useReducedMotion()` 的能力探测负责，服务端恒为 `false`），服务端与客户端
 * 首次渲染的状态一致。
 *
 * 与 WinUI 的对应：`IsOpen` / `ShowAsync` / `Hide()` 的等价物是受控 `open`
 * （`v-model:open`）+ 本 hook 的 `requestClose()`；`ContentDialogClosingEventArgs.Cancel`
 * 由调用方在 `requestClose()` **之前**决定是否取消，因此撤销不需要回滚 open。
 */
import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue'
import { useReducedMotion } from './use-reduced-motion'

/** `useDisclosure` 的可选配置 */
export interface UseDisclosureOptions {
  /**
   * 受控开关值（对应 `v-model:open`）。传 `undefined` 时退化为内部状态，
   * 适用于只需要「开 / 关 / 关闭中」三态、不需要外部同步的场景。
   */
  open?: MaybeRefOrGetter<boolean | undefined>
  /** 请求改变开关值时的回写（受控用法下对应 `emit('update:open', value)`） */
  onUpdateOpen?: (value: boolean) => void
  /** 关闭流程结束（退出动画播完，或 reduced-motion 下无需动画）时回调 */
  onClosed?: () => void
}

/** `useDisclosure` 的返回值 */
export interface UseDisclosureReturn {
  /** 当前是否打开（受控值优先，其次内部状态） */
  isOpen: ComputedRef<boolean>
  /** 是否处于「已请求关闭、退出动画尚未结束」的过渡态 */
  isClosing: ComputedRef<boolean>
  /** 是否偏好减少动效（SSR 恒 false）；为 true 时关闭不等待动画 */
  reducedMotion: Readonly<Ref<boolean>>
  /** 打开 */
  open: () => void
  /**
   * 请求关闭：把 `open` 置为 false，随后进入 closing（`isClosing === true`）。
   * 受控用法下由父组件决定是否接受；父组件不接受（值没变）时不会进入 closing。
   * @returns 是否真的发起了关闭请求（已关闭或已在关闭中时为 false，天然幂等）
   */
  requestClose: () => boolean
  /** 退出动画结束：结束 closing 并触发 onClosed（可安全重复调用） */
  finishClose: () => void
  /** 撤销关闭：退出动画期间把状态复位（调用方需自行把 open 回滚为 true） */
  cancelClose: () => void
}

/**
 * 创建一个浮层开关状态机。
 * @param options 受控开关、回写与关闭完成回调
 */
export const useDisclosure = (options: UseDisclosureOptions = {}): UseDisclosureReturn => {
  const { open: controlledOpen, onUpdateOpen, onClosed } = options

  const internalOpen = ref(false)
  const closing = ref(false)
  const reducedMotion = useReducedMotion()

  const isOpen = computed(() => toValue(controlledOpen) ?? internalOpen.value)
  const isClosing = computed(() => closing.value)

  const setOpen = (value: boolean): void => {
    // 无论受控与否都写内部状态：受控用法下它只是「父组件未回写前」的乐观视图，
    // 下一次 isOpen 求值仍以受控值为准（与 Vue 的 v-model 语义一致）。
    internalOpen.value = value
    onUpdateOpen?.(value)
  }

  const finishClose = (): void => {
    if (!closing.value) {
      return
    }
    closing.value = false
    onClosed?.()
  }

  const cancelClose = (): void => {
    if (!closing.value) {
      return
    }
    closing.value = false
    // 内控场景下 requestClose 会乐观翻转 open，这里一并回滚；
    // 受控场景下 open 的事实源在父组件，由父组件自行回滚
    if (toValue(controlledOpen) === undefined) {
      internalOpen.value = true
    }
  }

  const open = (): void => {
    closing.value = false
    setOpen(true)
  }

  const requestClose = (): boolean => {
    if (!isOpen.value || closing.value) {
      return false
    }
    setOpen(false)
    return true
  }

  watch(
    isOpen,
    (value, previous) => {
      if (value) {
        // 打开（或重新打开）时退出过渡态
        closing.value = false
        return
      }
      if (!previous) {
        return
      }
      // 关闭：先进入过渡态；reduced-motion 下没有退出动画，直接判为已结束，
      // 其余情况等调用方在 animationend 上调用 finishClose()
      closing.value = true
      if (reducedMotion.value) {
        finishClose()
      }
    },
    { flush: 'sync' },
  )

  return {
    isOpen,
    isClosing,
    reducedMotion,
    open,
    requestClose,
    finishClose,
    cancelClose,
  }
}
