import { hasDocument } from '@fluere-vue/utils'
import { onScopeDispose, ref, toValue, watch } from 'vue'
import type { MaybeRefOrGetter, Ref } from 'vue'
/**
 * 浮层焦点管理原语（useFocusTrap）—— 焦点陷阱 + Esc + 点击外部 + 焦点归还。
 *
 * 弹层类组件（文档站 StartMenu / 托盘弹出菜单，以及 0.6 的 MenuFlyout 等）
 * 都要回答同一组问题：打开后焦点去哪、Tab 能不能跑出去、Esc 关不关、点外面关不关、
 * 关了以后焦点还给谁。这里把这套约定收敛成一个零 DOM 结构假设的 composable，
 * 组件只负责「面板元素、触发元素、开合状态」三件事。
 *
 * ## 行为约定
 *
 * | 场景         | 行为                                                                     |
 * | ------------ | ------------------------------------------------------------------------ |
 * | 激活         | 记录当前焦点 → 聚焦 `initialFocus`（缺省容器内第一个可 Tab 元素）          |
 * | Tab / Shift+Tab | 始终在容器内循环（`preventDefault` 后自行移动焦点），跑不出去            |
 * | Esc          | 调用 `onEscape`（并 `preventDefault`，交给调用方决定是否关闭）            |
 * | 点击 / 触摸容器外（且不是触发元素） | 调用 `onOutsidePointer`；随后本次激活的焦点归还被**抑制**（焦点跟随用户点击落点，不抢回触发元素） |
 * | 键盘输入     | 任意 keydown 重新武装焦点归还（上一条的抑制只对「到下一次指针外部点击」有效） |
 * | 停用         | 卸下监听；`returnFocus !== false` 时把焦点还给激活时的元素（失联则退给触发元素） |
 *
 * ## 可见性：不静态过滤 `display:none`，改用「聚焦尝试」循环
 *
 * 选出来的候选元素可能被 CSS 隐藏（`display: none`），它在浏览器里**不可聚焦** ——
 * 逐个 `focus()` 并检查 `document.activeElement` 是否落上去，跳过聚焦失败的项。
 * 这样既不会把焦点丢出容器，也不依赖 `offsetParent` / `getClientRects`
 * （两者在 jsdom 里恒为空，静态过滤会让单测把全部候选误杀）。
 *
 * ## SSR 安全
 *
 * 只通过 `hasDocument()`（能力探测，调用时求值）访问 `document`；服务端 / 无 DOM
 * 环境下激活也保持无副作用（`isTrapped` 恒 false），不会抛错。
 * 监听器一律在 `flush: 'post'` 的 watch 里挂载 —— 服务端渲染不会执行到。
 *
 * @see use-disclosure 配套的开合状态机（本 hook 只管焦点与关闭时机，不管动画）
 */

/** 可聚焦元素选择器（语义层；CSS 不可见由 focusFrom 的聚焦尝试兜底） */
const FOCUSABLE_SELECTOR = 'a[href], button, input, select, textarea, [tabindex]'

/** `useFocusTrap` 的可选配置 */
export interface UseFocusTrapOptions {
  /** 陷阱作用域（浮层容器）。`null` / 未挂载时激活不生效，等它出现后再补挂 */
  container: MaybeRefOrGetter<HTMLElement | null | undefined>
  /** 是否激活（省略即非受控常关；组件一般传 `open`） */
  active?: MaybeRefOrGetter<boolean | undefined>
  /**
   * 触发元素（开 / 关按钮）。两个用途：① 外部点击判定的排除项 —— 点触发器
   * 不算「点外面」，交给开关逻辑处理，避免「关了又被同一次点击打开」；
   * ② 激活时焦点已不在文档时的归还兜底。
   */
  trigger?: MaybeRefOrGetter<HTMLElement | null | undefined>
  /** 激活时的初始焦点；省略取容器内第一个可 Tab 元素，全都不可用时聚焦容器本身 */
  initialFocus?: MaybeRefOrGetter<HTMLElement | null | undefined>
  /** 停用时是否归还焦点（缺省 true；外部点击场景由本 hook 自动抑制，见行为表） */
  returnFocus?: MaybeRefOrGetter<boolean | undefined>
  /** Esc 按下（已 preventDefault）。关闭与否由调用方决定 */
  onEscape?: (event: KeyboardEvent) => void
  /** 浮层外的指针按下（mouse / touch / pen 统一走 pointerdown） */
  onOutsidePointer?: (event: PointerEvent) => void
}

/** 收集容器内可 Tab 聚焦的候选（语义过滤，不做布局过滤） */
const collect = (root: HTMLElement): HTMLElement[] =>
  [...root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter((element) => {
    if (element.hasAttribute('disabled') || element.hasAttribute('hidden')) {
      return false
    }
    return element.getAttribute('tabindex') !== '-1'
  })

/**
 * 从 `startIndex` 起沿 `forward` 方向聚焦第一个**真正聚焦成功**的候选。
 * CSS 隐藏的候选 `focus()` 无效（activeElement 不动），此时跳过继续找。
 * @returns 是否有元素聚焦成功
 */
const focusFrom = (candidates: HTMLElement[], startIndex: number, forward: boolean): boolean => {
  if (candidates.length === 0) {
    return false
  }
  const total = candidates.length
  for (let step = 0; step < total; step += 1) {
    const index = (((startIndex + (forward ? step : -step)) % total) + total) % total
    const candidate = candidates[index]
    if (!candidate) {
      continue
    }
    candidate.focus()
    if (document.activeElement === candidate) {
      return true
    }
  }
  return false
}

/** `useFocusTrap` 的返回值 */
export interface UseFocusTrapReturn {
  /** 陷阱是否已生效（激活且容器已挂载、监听已挂上） */
  isTrapped: Readonly<Ref<boolean>>
}

/**
 * 创建浮层焦点管理。
 * @param options 容器 / 触发元素 / 开关与关闭回调
 */
// oxlint-disable-next-line import/prefer-default-export -- 库统一具名导出
export const useFocusTrap = (options: UseFocusTrapOptions): UseFocusTrapReturn => {
  const { container, active, trigger, initialFocus, returnFocus, onEscape, onOutsidePointer } =
    options

  const trapped = ref(false)

  /** 激活时的焦点快照（停用时归还给它） */
  let restoreTarget: Element | null = null
  /** 已挂的容器（卸监听用） */
  let attachedContainer: HTMLElement | null = null
  /**
   * 焦点归还抑制旗标：外部点击关闭浮层后，焦点应当跟随用户的点击落点，
   * 不要抢回触发元素。任意 keydown / 容器内按下会重新武装归还。
   */
  let suppressRestore = false

  const focusInitial = (root: HTMLElement): void => {
    const explicit = toValue(initialFocus)
    if (explicit) {
      explicit.focus()
      if (document.activeElement === explicit) {
        return
      }
    }
    const candidates = collect(root)
    if (focusFrom(candidates, 0, true)) {
      return
    }
    // 全都不可聚焦：聚焦容器本身，保证「焦点仍在浮层里」这一不变量
    root.focus()
  }

  const onKeyDown = (event: KeyboardEvent): void => {
    // 键盘操作说明用户在与浮层交互：重新武装焦点归还（解除外部点击的抑制）
    suppressRestore = false

    if (event.key === 'Escape') {
      if (onEscape) {
        event.preventDefault()
        onEscape(event)
      }
      return
    }

    if (event.key !== 'Tab') {
      return
    }
    const root = attachedContainer
    if (!root) {
      return
    }
    // 陷阱核心：Tab 的默认行为（移出容器 / 进浏览器 UI）一律不执行，焦点自己循环
    event.preventDefault()
    const candidates = collect(root)
    if (candidates.length === 0) {
      root.focus()
      return
    }
    const focused = document.activeElement
    const index = focused instanceof HTMLElement ? candidates.indexOf(focused) : -1
    if (index === -1) {
      // 焦点不在任何候选上（刚激活、或落在容器本身）：落到首 / 尾
      focusFrom(candidates, event.shiftKey ? candidates.length - 1 : 0, !event.shiftKey)
      return
    }
    const next = (index + (event.shiftKey ? -1 : 1) + candidates.length) % candidates.length
    focusFrom(candidates, next, !event.shiftKey)
  }

  const onPointerDown = (event: PointerEvent): void => {
    const target = event.target
    const root = attachedContainer
    if (root && target instanceof Node && root.contains(target)) {
      // 容器内的指针交互：解除外部点击的抑制
      suppressRestore = false
      return
    }
    const triggerElement = toValue(trigger)
    if (triggerElement && target instanceof Node && triggerElement.contains(target)) {
      // 触发器上的点击交给开关自己处理（抑制解除，保持 Toggle 语义）
      suppressRestore = false
      return
    }
    suppressRestore = true
    onOutsidePointer?.(event)
  }

  const detach = (): void => {
    const root = attachedContainer
    if (!root) {
      return
    }
    document.removeEventListener('keydown', onKeyDown, true)
    document.removeEventListener('pointerdown', onPointerDown, true)
    attachedContainer = null
    trapped.value = false

    if (toValue(returnFocus) === false || suppressRestore) {
      suppressRestore = false
      restoreTarget = null
      return
    }
    const target =
      restoreTarget instanceof HTMLElement && restoreTarget.isConnected
        ? restoreTarget
        : (toValue(trigger) ?? null)
    restoreTarget = null
    if (target) {
      target.focus()
    }
  }

  const attach = (root: HTMLElement): void => {
    if (attachedContainer === root) {
      return
    }
    if (attachedContainer) {
      detach()
    }
    restoreTarget = document.activeElement
    suppressRestore = false
    attachedContainer = root
    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('pointerdown', onPointerDown, true)
    trapped.value = true
    focusInitial(root)
  }

  /*
   * 激活状态与容器一起是监听的开关：容器未挂载（v-if 未渲染 / SSR）时激活只等不挂。
   * `flush: 'post'` —— DOM 更新后再挂（初始焦点要能落到刚渲染出来的面板），
   * 且服务端渲染不会执行回调（SSR 无副作用的第一道保险，`hasDocument()` 是第二道）。
   */
  watch(
    () => [toValue(active) === true, toValue(container) ?? null] as const,
    ([activeNow, containerNow]) => {
      if (!hasDocument()) {
        return
      }
      if (activeNow && containerNow) {
        attach(containerNow)
      } else {
        detach()
      }
    },
    { flush: 'post' },
  )

  onScopeDispose(() => {
    if (hasDocument() && attachedContainer) {
      // 作用域销毁（组件卸载）：只拆监听，不做焦点归还 —— 目标多半已不在文档里
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('pointerdown', onPointerDown, true)
      attachedContainer = null
      trapped.value = false
      restoreTarget = null
    }
  })

  return { isTrapped: trapped }
}
