/**
 * 密码显示按钮的显隐与「按住显示」状态机。
 *
 * 逐条对齐 WinUI 3 / Windows App SDK（tag `winui3/release/2.5.1`）
 * `src/dxaml/xcp/core/native/text/Controls/PasswordBox.cpp`：
 *
 *   1. `CanInvokeRevealButton()`（第 618 行）
 *        = `m_fRevealButtonEnabled && ((m_fCanShowRevealButton &&
 *           m_fHasSpaceForRevealButton && IsFocused()) || m_fAlwaysShowRevealButton)`
 *      → 按钮可见需同时满足：Peek 模式 + 有输入 + 有空间 + **获得焦点**。
 *      （`m_fAlwaysShowRevealButton` 只针对把 RevealButton 换成 CheckBox 的手机模板，
 *      Web 侧不做，见 PasswordBox_Partial.cpp#OnApplyTemplateHandler 的 `IsRevealButtonCheckbox` 分支）
 *   2. `OnGotFocus`（第 566 行）把 `m_fCanShowRevealButton` 清成 FALSE —— 注释原文
 *      「Password reveal button should not appear if focus got moved to the PasswordBox
 *      control.」；`OnContentChanged`（第 365 行）只在「空 → 非空」时重新置 TRUE。
 *      所以：**聚焦时按钮先隐藏，只有本次聚焦期间真的从空输入了内容才出现**。
 *   3. 值为空时重新置 FALSE（第 431 行）并在 `UpdateVisualState` 里强制遮蔽。
 *   4. `ArrangeOverride`（第 233 行）：`finalSize.width > FontSize * 5` 才允许出现按钮
 *      （注释原文「Minimum width for PasswordBox with RevealButton visible is 5em.」）。
 *   5. `UpdateVisualState`（第 533 行）按模式收敛：
 *        Peek    → 可见则 ButtonVisible，否则隐藏密码 + ButtonCollapsed
 *        Hidden  → 恒隐藏密码 + ButtonCollapsed
 *        Visible → 恒显示密码 + ButtonCollapsed
 *   6. 键盘等价物（`PasswordBox_Partial.cpp#OnKeyDown/OnKeyUp`）：按住 Alt+F8 显示、
 *      松开 F8 遮蔽；按钮本身 `IsTabStop=False`（不进 Tab 序列）。
 *
 * SSR 约束：`ResizeObserver` 只在 `onMounted` 内创建、`onScopeDispose` 断开；
 * 服务端与首帧都取「无空间」——与 WinUI 首次 layout（宽度为 0，尚未 Arrange）
 * 的落点一致，因此水合不产生不一致（与 infobar/use-infobar-layout.ts 同一写法）。
 */

import { computed, onMounted, onScopeDispose, ref, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { PASSWORD_REVEAL_MIN_WIDTH_EM } from './constants'
import type { FluerePasswordRevealMode } from './types'

/** `usePasswordReveal` 的入参 */
export interface UsePasswordRevealOptions {
  /** 组件宿主元素（用于量宽度） */
  rootRef: Ref<HTMLElement | null>
  /** 显示模式 */
  mode: () => FluerePasswordRevealMode
  /** 当前值（用于「空 → 非空」判定） */
  value: () => string
  /** 是否为密码输入（非密码输入不参与这套状态机） */
  enabled: () => boolean
  /** 是否禁用（禁用时不出现按钮） */
  disabled: () => boolean
}

/** `usePasswordReveal` 的返回值 */
export interface PasswordRevealController {
  /** 当前是否显示明文（Peek 按住期间 / Visible 模式） */
  revealed: ComputedRef<boolean>
  /** 显示按钮是否可见 */
  showButton: ComputedRef<boolean>
  /** 输入框获得焦点 */
  onControlFocus: () => void
  /** 输入框失去焦点（WinUI：失焦即收起按钮并遮蔽） */
  onControlBlur: () => void
  /** 按住显示按钮 */
  startPeek: () => void
  /** 松开 / 移出 / 取消显示按钮 */
  stopPeek: () => void
}

export const usePasswordReveal = (options: UsePasswordRevealOptions): PasswordRevealController => {
  const { rootRef, mode, value, enabled, disabled } = options

  const focused = ref(false)
  const peekActive = ref(false)
  /** 对应 WinUI `m_fCanShowRevealButton`：聚焦清零，本次聚焦期间「空 → 非空」才置位 */
  const valueEntered = ref(false)
  /** 对应 WinUI `m_fHasSpaceForRevealButton`：首帧/SSR 视为无空间 */
  const hasSpace = ref(false)

  const isPeek = computed(() => mode() === 'peek')
  const revealed = computed(() => mode() === 'visible' || (isPeek.value && peekActive.value))

  const showButton = computed(
    () =>
      enabled() &&
      !disabled() &&
      isPeek.value &&
      focused.value &&
      valueEntered.value &&
      hasSpace.value,
  )

  // 值变化：空 → 非空 才允许按钮出现；变空则收回按钮并强制遮蔽
  watch(value, (next, previous) => {
    if (next === '') {
      valueEntered.value = false
      peekActive.value = false
      return
    }
    if (previous === '') {
      valueEntered.value = true
    }
  })

  const onControlFocus = (): void => {
    // WinUI OnGotFocus：聚焦先清零，避免「一聚焦就把已存密码亮出来」
    focused.value = true
    valueEntered.value = false
  }

  const onControlBlur = (): void => {
    focused.value = false
    peekActive.value = false
  }

  const startPeek = (): void => {
    if (!isPeek.value || disabled()) {
      return
    }
    peekActive.value = true
  }

  const stopPeek = (): void => {
    peekActive.value = false
  }

  /* ---- 5em 宽度判定（WinUI ArrangeOverride） ---- */
  const measureSpace = (): void => {
    const root = rootRef.value
    if (root === null) {
      hasSpace.value = false
      return
    }
    const fontSize = Number.parseFloat(globalThis.getComputedStyle(root).fontSize)
    const threshold = Number.isFinite(fontSize) ? fontSize * PASSWORD_REVEAL_MIN_WIDTH_EM : 0
    hasSpace.value = root.clientWidth > threshold
  }

  let observer: ResizeObserver | undefined = undefined

  onMounted(() => {
    if (typeof ResizeObserver === 'function') {
      observer = new ResizeObserver(measureSpace)
      if (rootRef.value !== null) {
        observer.observe(rootRef.value)
      }
    }
    measureSpace()
  })

  onScopeDispose(() => {
    observer?.disconnect()
    observer = undefined
  })

  return { revealed, showButton, onControlFocus, onControlBlur, startPeek, stopPeek }
}
