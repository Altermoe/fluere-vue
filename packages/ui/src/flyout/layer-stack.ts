/**
 * 浮层层级栈（docs/todo.md 0.4.1 / 0.4.2）。
 *
 * 为什么需要它：`--zIndex*` 是一组**平面**刻度（下拉 1000 < 菜单 1100 < … < 模态 1300），
 * 而真实场景里浮层会**嵌套**——模态弹窗里的下拉必须盖过弹窗本身（旧实现靠「遮罩、
 * 弹窗、下拉同为 1000 + Teleport 顺序」的巧合维持，任何一处改档位就会踩穿）。平面
 * 刻度表达不了「相对宿主再高一层」，所以这里在刻度之上加一层「打开即登记」的栈：
 *
 *   - 新浮层的档位**不高于**当前最上层宿主时 ⇒ z = 宿主 z + `--zIndexStep`（嵌套提升）
 *   - 档位**高于**宿主时（如 ToolTip 开在模态之上）⇒ 直接用自己的档位
 *
 * 值以 CSS 表达式返回，全程引用 token，不在 TS 里重复刻度数值：
 *   `var(--zIndexNavFlyout)` / `calc(var(--zIndexModal) + var(--zIndexStep))`
 *
 * SSR / 测试安全：模块只维护一个数组，不接触任何浏览器 API；`release()` 幂等。
 */
import type { CSSProperties } from 'vue'

/**
 * 浮层档位（顺序即层级高低，与 `data/repo-tokens.json` 的刻度一一对应）。
 * 新增档位时两处一起改，`layer-stack.test.ts` 会校验顺序。
 */
export const FLYOUT_TIERS = [
  '--zIndexWindow',
  '--zIndexContent',
  '--zIndexNavFlyout',
  '--zIndexMenu',
  '--zIndexSubmenu',
  '--zIndexModal',
  '--zIndexTooltip',
  '--zIndexShell',
] as const

/** 档位 token 名 */
export type FlyoutTier = (typeof FLYOUT_TIERS)[number]

interface OpenLayer {
  tier: FlyoutTier
  zIndex: string
  /**
   * 本层在**嵌套链**里的最高档位序号：自己未嵌套时等于自身档位，嵌套在更高档位的
   * 宿主里时继承宿主的序号。判断「新层要不要嵌套」必须比这个值——只比自己那一层的
   * 档位会漏掉多级嵌套（模态 > 下拉 > 菜单 时，菜单若按自身档位 1100 取值就会掉到
   * 模态 1300 下面）。
   */
  effectiveRank: number
}

/** 当前打开的浮层（后进先出；数组顺序 = 打开顺序） */
const openLayers: OpenLayer[] = []

/** 已登记的浮层句柄 */
export interface FlyoutLayerHandle {
  /** 本层在栈里的深度（1 = 栈底），仅用于调试与断言 */
  depth: number
  /** 直接绑到浮层元素上的层级样式；未登记时为 `{}` */
  style: CSSProperties
  /** 注销本层（幂等；组件卸载或关闭时调用） */
  release: () => void
}

/**
 * 登记一个打开的浮层，返回它的层级样式与注销函数。
 * @param tier 该浮层声明的档位（来自刻度，不允许传裸数字）
 */
export const acquireLayer = (tier: FlyoutTier): FlyoutLayerHandle => {
  const rank = FLYOUT_TIERS.indexOf(tier)
  const host = openLayers[openLayers.length - 1]
  const hostRank = host === undefined ? -1 : host.effectiveRank

  // 档位不高于宿主（含宿主所在的整条嵌套链）⇒ 视为宿主内部再开的浮层，抬到宿主之上；
  // 否则用自己的档位（例如 ToolTip 开在模态之上）。
  const nested = host !== undefined && hostRank >= rank
  const zIndex = nested ? `calc(${host.zIndex} + var(--zIndexStep))` : `var(${tier})`

  const entry: OpenLayer = {
    tier,
    zIndex,
    effectiveRank: nested ? hostRank : rank,
  }
  openLayers.push(entry)

  let released = false
  const style: CSSProperties = { zIndex }
  return {
    depth: openLayers.length,
    style,
    release: () => {
      if (released) {
        return
      }
      released = true
      const index = openLayers.indexOf(entry)
      if (index !== -1) {
        openLayers.splice(index, 1)
      }
    },
  }
}

/** 当前打开层数（测试与调试用） */
export const openLayerCount = (): number => openLayers.length

/** 清空层级栈（**仅供测试**：单测之间互不影响） */
export const resetLayerStack = (): void => {
  openLayers.length = 0
}
