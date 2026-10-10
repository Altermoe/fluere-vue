/**
 * FluereScrollView 公共类型契约
 *
 * 对齐目标：WinUI 3（Windows App SDK）ScrollView / ScrollPresenter 规格
 * 参考：https://github.com/microsoft/microsoft-ui-xaml/tree/main/specs/ScrollingControls
 *
 * 枚举值命名与 WinUI IDL 保持一一对应，Web 侧用字符串字面量表达。
 */
/* oxlint-disable id-length --
 * API 刻意使用 WinUI Vector2 风格的 { x, y } 分量名
 * （对齐 Windows.Foundation.Numerics.Vector2 的 X / Y），保证与原生 API 一一对应。
 */
import type { FluereLocale } from '@fluere-vue/utils'

/* ------------------------------------------------------------------ */
/* 枚举（对应 WinUI ScrollingControls 共享枚举）                         */
/* ------------------------------------------------------------------ */

/** 内容布局方向（对应 ScrollingContentOrientation） */
type ScrollingContentOrientation = 'vertical' | 'horizontal' | 'none' | 'both'

/** 交互状态（对应 ScrollingInteractionState） */
type ScrollingInteractionState = 'idle' | 'interaction' | 'inertia' | 'animation'

/** 用户能否通过输入滚动（对应 ScrollingScrollMode） */
type ScrollingScrollMode = 'enabled' | 'disabled'

/** 用户能否通过输入缩放（对应 ScrollingZoomMode） */
type ScrollingZoomMode = 'enabled' | 'disabled'

/** 滚动链式传递（对应 ScrollingChainMode） */
type ScrollingChainMode = 'auto' | 'always' | 'never'

/** 触控平移导轨（对应 ScrollingRailMode） */
type ScrollingRailMode = 'enabled' | 'disabled'

/** 滚动条展示策略（对应 ScrollingScrollBarVisibility） */
type ScrollingScrollBarVisibility = 'auto' | 'visible' | 'hidden'

/** 动画模式（对应 ScrollingAnimationMode） */
type ScrollingAnimationMode = 'disabled' | 'enabled' | 'auto'

/** 吸附点模式（对应 ScrollingSnapPointsMode，Web 端当前为占位） */
type ScrollingSnapPointsMode = 'default' | 'ignore'

/** 被忽略的输入种类（对应 ScrollingInputKinds 位标志） */
type ScrollingInputKinds = 'none' | 'touch' | 'pen' | 'mouseWheel' | 'keyboard' | 'gamepad' | 'all'

/* ------------------------------------------------------------------ */
/* 方法参数类（对应 ScrollingScrollOptions / ScrollingZoomOptions）     */
/* ------------------------------------------------------------------ */

interface ScrollingScrollOptions {
  /**
   * 偏移变化是否允许动画
   * @default 'auto'
   */
  animationMode?: ScrollingAnimationMode

  /**
   * 吸附点是否生效（WinUI 中吸附点为规划功能，Web 端当前仅保留 API 占位）
   * @default 'default'
   */
  snapPointsMode?: ScrollingSnapPointsMode
}

interface ScrollingZoomOptions {
  /**
   * 缩放变化是否允许动画
   * @default 'auto'
   */
  animationMode?: ScrollingAnimationMode

  /**
   * 吸附点是否生效（预留）
   * @default 'default'
   */
  snapPointsMode?: ScrollingSnapPointsMode
}

/* ------------------------------------------------------------------ */
/* 事件参数类（对应 WinUI Scrolling*EventArgs）                         */
/* ------------------------------------------------------------------ */

interface ScrollingScrollAnimationStartingEventArgs {
  /** 动画起始位置（内容坐标，未缩放） */
  startPosition: { x: number; y: number }
  /** 动画结束位置（内容坐标，未缩放） */
  endPosition: { x: number; y: number }
  /** 关联的 correlation ID */
  correlationId: number
}

interface ScrollingZoomAnimationStartingEventArgs {
  /** 缩放中心点（视口坐标） */
  centerPoint: { x: number; y: number }
  /** 起始缩放系数 */
  startZoomFactor: number
  /** 结束缩放系数 */
  endZoomFactor: number
  /** 关联的 correlation ID */
  correlationId: number
}

interface ScrollingScrollCompletedEventArgs {
  /** 关联的 correlation ID */
  correlationId: number
}

interface ScrollingZoomCompletedEventArgs {
  /** 关联的 correlation ID */
  correlationId: number
}

interface ScrollingBringingIntoViewEventArgs {
  /** 本次参与的目标水平偏移 */
  targetHorizontalOffset: number
  /** 本次参与的目标垂直偏移 */
  targetVerticalOffset: number
  /** 关联的 correlation ID（后续在 scroll-completed 中结束） */
  correlationId: number
  /**
   * 是否取消本次参与。在事件回调中置为 true 可跳过本次 bring-into-view。
   */
  cancel: boolean
}

interface ScrollingAnchorRequestedEventArgs {
  /**
   * 锚点候选集合。回调中可增删来调整候选列表；
   * 若未显式设置 anchorElement，则按 anchorRatio 从该集合中选择。
   */
  anchorCandidates: HTMLElement[]
  /**
   * 显式指定的锚点元素。初始为 undefined；
   * 回调中设置为某个元素后将跳过选择过程。
   */
  anchorElement: HTMLElement | undefined
}

/* ------------------------------------------------------------------ */
/* Agent 交互面（Web 侧扩展，不对应 WinUI 依赖属性）                     */
/* ------------------------------------------------------------------ */

/**
 * DOM 命令 `fluere:scroll-to` / `fluere:scroll-by` 的载荷。
 *
 * 缺省分量按「保持不变」（scroll-to）/「不移动」（scroll-by）处理，
 * 非有限数与错误类型一律忽略（不抛错、不改动视图）。
 */
interface ScrollingAgentScrollDetail {
  /** 目标绝对偏移（scroll-to）/ 偏移增量（scroll-by） */
  x?: number
  y?: number
  /**
   * 是否允许动画，默认 `'auto'`（与程序化 API 一致，尊重 prefers-reduced-motion）
   */
  animationMode?: ScrollingAnimationMode
}

/**
 * DOM 命令 `fluere:bring-into-view` 的载荷。
 * `element` 优先；未给时用 `selector` 在组件根内查询。
 * 目标必须位于内容区内，否则本次命令为空操作。
 */
interface ScrollingAgentBringIntoViewDetail {
  element?: HTMLElement
  selector?: string
  /** 目标进入视口时保留的边距（像素），默认 0 */
  margin?: number
}

/** DOM 回执 `fluere:scroll-settled` 的载荷（像素值取整，与反射属性一致） */
interface ScrollingAgentSettledDetail {
  x: number
  y: number
  zoomFactor: number
}

/* ------------------------------------------------------------------ */
/* 组件 Props（对应 ScrollView 依赖属性）                               */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* 内部共享类型（供拆分的 composable / core 使用，不对外暴露）            */
/* ------------------------------------------------------------------ */

/**
 * 组件 emits 事件映射（供 defineEmits 与 core 的 EmitFn 复用）。
 * 与 WinUI Scrolling*EventArgs 一一对应。
 */
interface ScrollViewEmits {
  /** 视图（offset / zoom）发生变化时触发 */
  'view-changed': []
  /** Extent（内容尺寸）发生变化时触发 */
  'extent-changed': []
  /** 交互状态切换时触发 */
  'state-changed': [state: ScrollingInteractionState]
  /** 一次带动画的滚动开始前触发，可定制 */
  'scroll-animation-starting': [args: ScrollingScrollAnimationStartingEventArgs]
  /** 滚动操作（ScrollTo / ScrollBy / AddScrollVelocity）结束时触发 */
  'scroll-completed': [args: ScrollingScrollCompletedEventArgs]
  /** 一次带动画的缩放开始前触发，可定制 */
  'zoom-animation-starting': [args: ScrollingZoomAnimationStartingEventArgs]
  /** 缩放操作（ZoomTo / ZoomBy / AddZoomVelocity）结束时触发 */
  'zoom-completed': [args: ScrollingZoomCompletedEventArgs]
  /** 选择锚点元素前触发，可定制候选或显式指定锚点 */
  'anchor-requested': [args: ScrollingAnchorRequestedEventArgs]
  /** 参与 bring-into-view 前触发，可取消或调整目标偏移 */
  'bring-into-view': [args: ScrollingBringingIntoViewEventArgs]
}

/**
 * 应用 withDefaults 默认值后的 Props 类型。
 * 内部 composable 统一使用该类型，避免对可选字段做空值判断。
 */
interface ResolvedScrollViewProps {
  contentOrientation: ScrollingContentOrientation
  horizontalScrollMode: ScrollingScrollMode
  verticalScrollMode: ScrollingScrollMode
  horizontalScrollBarVisibility: ScrollingScrollBarVisibility
  verticalScrollBarVisibility: ScrollingScrollBarVisibility
  horizontalScrollChainMode: ScrollingChainMode
  verticalScrollChainMode: ScrollingChainMode
  horizontalScrollRailMode: ScrollingRailMode
  verticalScrollRailMode: ScrollingRailMode
  zoomMode: ScrollingZoomMode
  zoomChainMode: ScrollingChainMode
  ignoredInputKinds: ScrollingInputKinds | ScrollingInputKinds[]
  minZoomFactor: number
  maxZoomFactor: number
  horizontalAnchorRatio: number
  verticalAnchorRatio: number
  background: string | undefined
  tabIndex: number
  label: string | undefined
  agentCommands: boolean
}

interface FluereScrollViewProps {
  /**
   * 内容布局方向，决定内容如何受视口约束
   * @default 'vertical'
   */
  contentOrientation?: ScrollingContentOrientation

  /** 是否允许用户水平滚动 @default 'enabled' */
  horizontalScrollMode?: ScrollingScrollMode

  /** 是否允许用户垂直滚动 @default 'enabled' */
  verticalScrollMode?: ScrollingScrollMode

  /** 水平滚动条展示策略 @default 'auto' */
  horizontalScrollBarVisibility?: ScrollingScrollBarVisibility

  /** 垂直滚动条展示策略 @default 'auto' */
  verticalScrollBarVisibility?: ScrollingScrollBarVisibility

  /**
   * 水平滚动链式传递 @default 'auto'
   *
   * 鼠标滚轮采用与 WinUI 3 对齐的归属模型：指针位于本组件内、且该方向确实可
   * 滚动时，本次滚轮由本组件独占 —— 无论是否到达滚动极限，都不会滚到外层
   * ScrollView；只有指针落在不属于任何子滚动容器的元素上时，外层才接管。
   *  - `auto` / `never`：到滚动极限时吞掉滚轮（等价 overscroll-behavior:
   *    contain，页面等原生祖先同样不滚动）；
   *  - `always`：保留旧的链式行为，把本方向未消化的剩余增量显式交给外层。
   * 本方向没有可滚动内容（或该方向被禁用）时不占有滚轮，冒泡交给外层。
   */
  horizontalScrollChainMode?: ScrollingChainMode

  /** 垂直滚动链式传递 @default 'auto'，语义同 horizontalScrollChainMode */
  verticalScrollChainMode?: ScrollingChainMode

  /** 水平触控平移导轨 @default 'enabled' */
  horizontalScrollRailMode?: ScrollingRailMode

  /** 垂直触控平移导轨 @default 'enabled' */
  verticalScrollRailMode?: ScrollingRailMode

  /** 是否允许用户缩放 @default 'disabled' */
  zoomMode?: ScrollingZoomMode

  /** 缩放链式传递 @default 'auto' */
  zoomChainMode?: ScrollingChainMode

  /**
   * 需要忽略的输入种类。可传单个值或数组；命中则对该输入不响应。
   * @default []
   */
  ignoredInputKinds?: ScrollingInputKinds | ScrollingInputKinds[]

  /** 最小缩放系数 @default 0.1 */
  minZoomFactor?: number

  /** 最大缩放系数 @default 10 */
  maxZoomFactor?: number

  /**
   * 水平锚点比例（0~1）。NaN 表示不启用水平锚定。
   * 0 让内容左缘贴住视口左缘；1 让内容右缘贴住视口右缘。
   * @default NaN
   */
  horizontalAnchorRatio?: number

  /**
   * 垂直锚点比例（0~1）。NaN 表示不启用垂直锚定。
   * @default NaN
   */
  verticalAnchorRatio?: number

  /** 背景色（透传至内容区） */
  background?: string

  /** 键盘可聚焦（Arrow / PageUp / Home 等方向键滚动） */
  tabIndex?: number

  /**
   * 可访问名。设置后根元素带上 `role="region"`，屏幕阅读器与「无障碍树型」
   * Agent 才能把该滚动区域识别为一个具名区域。
   *
   * 只在提供名称时才加 role：未命名的 region 会污染地标列表，不如不加。
   */
  label?: string

  /**
   * 本组件内建文案（滚动条两端步进按钮、滚动条拇指的可访问名）的 locale，
   * 优先于 `FluereConfigProvider`，缺省内置 zh-Hans。归一由 `@fluere-vue/utils`
   * 完成（`zh-CN` / `zh` 落到 `zh-Hans`），见 `./locale.ts`。
   */
  locale?: FluereLocale | string

  /**
   * 是否响应 DOM 命令事件（`fluere:scroll-to` / `fluere:scroll-by` /
   * `fluere:bring-into-view`），供页面自动化与 Agent 驱动滚动。
   * 关闭后只读状态反射（`data-scroll-*`）仍然保留，因为它是纯观测面。
   * @default true
   */
  agentCommands?: boolean
}

export type {
  FluereScrollViewProps,
  ResolvedScrollViewProps,
  ScrollViewEmits,
  ScrollingAgentBringIntoViewDetail,
  ScrollingAgentScrollDetail,
  ScrollingAgentSettledDetail,
  ScrollingAnchorRequestedEventArgs,
  ScrollingAnimationMode,
  ScrollingBringingIntoViewEventArgs,
  ScrollingChainMode,
  ScrollingContentOrientation,
  ScrollingInputKinds,
  ScrollingInteractionState,
  ScrollingRailMode,
  ScrollingScrollAnimationStartingEventArgs,
  ScrollingScrollBarVisibility,
  ScrollingScrollCompletedEventArgs,
  ScrollingScrollMode,
  ScrollingScrollOptions,
  ScrollingSnapPointsMode,
  ScrollingZoomAnimationStartingEventArgs,
  ScrollingZoomCompletedEventArgs,
  ScrollingZoomMode,
  ScrollingZoomOptions,
}
