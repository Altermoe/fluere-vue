/**
 * `useFocusVisual` —— WinUI 双层焦点矩形的消费入口（docs/todo.md 0.4.3）。
 *
 * 规格与几何全部写在 `./focus-visual.css` 的文件头（A 级来源：microsoft-ui-xaml
 * `winui3/release/2.5.1` 的 `FocusRectManager.cpp` + 主题资源），这里只负责
 * 「把类名与可覆写的度量交给调用方」，不含任何 DOM / 浏览器 API（SSR 安全）。
 *
 * 用法：
 * ```vue
 * <script setup lang="ts">
 * import { useFocusVisual } from '@fluere-vue/ui'
 * const focusVisual = useFocusVisual()
 * </script>
 * <template>
 *   <button :class="[focusVisual.class]" :style="focusVisual.style">…</button>
 * </template>
 * ```
 *
 * 需要微调某一处时传选项（不传就完全走样式表缺省）：
 * `useFocusVisual({ outerThickness: '1px' })`。
 */
import type { CSSProperties } from 'vue'

/** 共享原语类名（样式在 `focus-visual.css`；非 scoped，见该文件头注释） */
export const FOCUS_VISUAL_CLASS = 'fui-focus-visual'

/** 覆写双层焦点矩形度量的选项（全部可选，缺省见 `focus-visual.css`） */
export interface UseFocusVisualOptions {
  /** 外环厚度，缺省 2px（WinUI `FocusVisualPrimaryThickness` 缺省 2） */
  outerThickness?: string
  /** 内环厚度，缺省 1px（WinUI `FocusVisualSecondaryThickness` 缺省 1） */
  innerThickness?: string
  /** 外环颜色，缺省 `--colorStrokeFocus2`（`FocusStrokeColorOuterBrush`） */
  outerColor?: string
  /** 内环颜色，缺省 `--colorStrokeFocus1`（`FocusStrokeColorInnerBrush`） */
  innerColor?: string
}

/** `useFocusVisual` 的返回值 */
export interface UseFocusVisualReturn {
  /** 挂到可聚焦元素上的类名 */
  class: string
  /** 就地覆写刻度用的内联 CSS 变量；未传任何选项时为 `{}`。
   *  刻意是**普通对象**而不是 `ComputedRef`：选项都是静态字符串，
   *  模板里 `:style="focusVisual.style"` 直接可用，也不会踩「嵌套 ref 不自动解包」。 */
  style: CSSProperties
}

/**
 * 创建双层焦点矩形的类名与覆写变量。
 * @param options 需要覆写的度量 / 颜色（不传则完全走样式表缺省）
 */
export const useFocusVisual = (options: UseFocusVisualOptions = {}): UseFocusVisualReturn => {
  const style: Record<string, string> = {}
  if (options.outerThickness !== undefined) {
    style['--fui-focus-visual-outer-thickness'] = options.outerThickness
  }
  if (options.innerThickness !== undefined) {
    style['--fui-focus-visual-inner-thickness'] = options.innerThickness
  }
  if (options.outerColor !== undefined) {
    style['--fui-focus-visual-outer-color'] = options.outerColor
  }
  if (options.innerColor !== undefined) {
    style['--fui-focus-visual-inner-color'] = options.innerColor
  }

  return { class: FOCUS_VISUAL_CLASS, style }
}
