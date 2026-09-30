/**
 * ContentDialog 焦点策略的纯函数层。
 *
 * 对照来源：WinUI 3（microsoft-ui-xaml winui3/release/2.5.1）
 *   src/dxaml/xcp/dxaml/lib/ContentDialog_Partial.cpp#SetInitialFocusElement
 *     初始焦点按三级优先：① 内容区里第一个可聚焦元素（`FocusManager_GetFirstFocusableElement`
 *     会跳过 Collapsed 元素）→ ② 默认按钮 → ③ 命令区里第一个可聚焦元素；
 *   src/dxaml/xcp/dxaml/lib/ContentDialog_Partial.cpp#HideInternal
 *     关闭前把焦点还给「弹出前聚焦的元素」（本库把记录/还原放在 use-content-dialog 里）。
 *
 * Web 侧只能靠选择器 + 计算样式近似「可聚焦且可见」；与 XAML 的差别记录在组件注释里。
 */

/** 可聚焦元素的候选选择器（与 FocusScope / tabbable 的常用集合一致） */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'summary',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]',
].join(',')

/**
 * 元素是否可见（对齐 XAML 跳过 Collapsed 元素的行为）。
 *
 * XAML 的 `FocusManager_GetFirstFocusableElement` 会跳过 Collapsed 的**子树**，
 * 因此这里必须连同祖先一起检查（`hidden` 属性 / `display:none` / `visibility:hidden`）。
 */
const isVisible = (element: HTMLElement): boolean => {
  const { body } = element.ownerDocument
  let node: HTMLElement | null = element
  while (node) {
    if (node.hasAttribute('hidden')) {
      return false
    }
    if (typeof globalThis.getComputedStyle === 'function') {
      const style = globalThis.getComputedStyle(node)
      if (style.display === 'none' || style.visibility === 'hidden') {
        return false
      }
    }
    node = node === body ? null : node.parentElement
  }
  return true
}

/** 显式可编辑元素（浏览器里 tabIndex 为 0，但 jsdom 不实现，故按属性判定） */
const isEditableElement = (element: HTMLElement): boolean => {
  const value = element.getAttribute('contenteditable')
  return value !== null && value !== 'false'
}

/** 单个元素是否可作为焦点目标 */
export const isFocusable = (element: HTMLElement | null | undefined): element is HTMLElement => {
  if (!element || !element.isConnected) {
    return false
  }
  if (element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true') {
    return false
  }
  // tabindex 负数（含 [tabindex="-1"] 与原生不可聚焦元素）排除；
  // contenteditable 元素在 XAML 语义上与可编辑文本等价，单独放行
  if (element.tabIndex < 0 && !isEditableElement(element)) {
    return false
  }
  return isVisible(element)
}

/**
 * 取容器内所有可聚焦元素（文档顺序）。
 * @param root 搜索根节点；为空时返回空数组
 */
export const getFocusableElements = (root: HTMLElement | null | undefined): HTMLElement[] => {
  if (!root) {
    return []
  }
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter((element) =>
    isFocusable(element),
  )
}

/** `resolveInitialFocusTarget` 的三个候选来源 */
export interface InitialFocusCandidates {
  /** 内容区（不含标题） */
  content: HTMLElement | null
  /** 默认按钮（未设置 DefaultButton 或按钮不可用时传 null） */
  defaultButton: HTMLElement | null
  /** 命令区 */
  commandSpace: HTMLElement | null
}

/**
 * 按 WinUI 的三级优先推导初始焦点目标。
 * @returns 应获得初始焦点的元素；三者都不可用时返回 null（焦点留在原位）
 */
export const resolveInitialFocusTarget = (
  candidates: InitialFocusCandidates,
): HTMLElement | null => {
  const inContent = getFocusableElements(candidates.content)[0]
  if (inContent) {
    return inContent
  }
  if (isFocusable(candidates.defaultButton)) {
    return candidates.defaultButton
  }
  const inCommandSpace = getFocusableElements(candidates.commandSpace)[0]
  return inCommandSpace ?? null
}
