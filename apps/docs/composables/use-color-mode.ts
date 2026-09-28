/**
 * 站点手动明暗模式控制。
 *
 * 设计令牌通过 `light-dark()` 跟随系统（随 `color-scheme` 解析），Shiki 代码块
 * 在 content-code.css 中跟随系统。为让“手动切换”同时覆盖两者，这里统一向
 * `<html>` 写入：
 * - `el.style.colorScheme` → 让 `light-dark()` 按手动选择解析；
 * - `data-color-mode` 属性 → 让 content-code.css 的代码块跟随手动选择。
 *
 * 偏好持久化到 localStorage。首次访问无存储值时跟随系统（与既有行为一致）。
 *
 * 切换过程通过 View Transition API 以「圆形揭示」呈现（圆心为切换按钮/指针位置，
 * 见 utils/view-transition.ts）；API 不可用或用户偏好减少动效时自动退化为瞬时切换。
 */
import { runCircularReveal } from '../utils/view-transition'

type ColorMode = 'light' | 'dark'

const STORAGE_KEY = 'fluere-docs-color-mode'

/** 明暗互为反相，用查表避免条件分支。 */
const OPPOSITE: Record<ColorMode, ColorMode> = { light: 'dark', dark: 'light' }

const mode = ref<ColorMode>('light')
const isDark = computed(() => mode.value === 'dark')

let hydrated = false

/** 解析初始值：优先 localStorage，否则跟随系统。仅客户端调用。 */
const resolveInitial = (): ColorMode => {
  if (!import.meta.client) {
    return 'light'
  }
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'dark' || stored === 'light') {
    return stored
  }
  if (globalThis.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

const apply = (next: ColorMode) => {
  const el = document.documentElement
  el.style.colorScheme = next
  el.dataset.colorMode = next
}

const setMode = (next: ColorMode, persist: boolean) => {
  mode.value = next
  if (import.meta.client) {
    apply(mode.value)
    if (persist) {
      localStorage.setItem(STORAGE_KEY, mode.value)
    }
  }
}

const useColorMode = () => {
  if (!hydrated) {
    hydrated = true
    if (import.meta.client) {
      // 首帧样式由 nuxt.config 的内联头脚本按同一规则写入，避免闪烁；
      // 响应式状态（图标可见性已交给 data-color-mode + CSS，这里只剩 aria-label / title
      // 等属性文案）必须推迟到水合完成后再同步 —— 否则服务端恒为 light 分支，
      // 暗色访客会在水合时看到属性不匹配告警（ThemeToggle 图标 d / aria-label）。
      // 初始值跟随系统时不持久化，只有当用户显式点击切换后才记住偏好。
      onMounted(() => setMode(resolveInitial(), false))
    }
  }

  /**
   * 切换明暗模式。
   *
   * 传入点击事件时，以指针位置（键盘激活则取按钮中心）为圆心做圆形揭示；
   * 省略事件（程序化调用）则以视口中心为圆心。
   */
  const toggle = (event?: MouseEvent) => {
    const next = OPPOSITE[mode.value]
    const anchor = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null
    // 键盘合成的 click（Enter/Space）detail 为 0，且 clientX/Y 恒为 0，不能当圆心用。
    const point = event?.detail ? { x: event.clientX, y: event.clientY } : undefined

    void runCircularReveal({
      apply: () => setMode(next, true),
      point,
      anchor,
    })
  }

  return { mode, isDark, toggle }
}

export { useColorMode }
export type { ColorMode }
