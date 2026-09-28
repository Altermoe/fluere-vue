/**
 * 滚动条展示逻辑：展开 / 收起时机（对齐 WinUI 时长与延迟）与拇指几何。
 *
 * 两个相互独立的可见性层级：
 *  - barsVisible：指针位于滚动容器内 / 发生滚动交互 → 显示「细滑块」，轨道保持透明；
 *  - trackExpanded：指针进入滚动条命中区（或正在拖拽滑块）→ 轨道连同两端步进
 *    按钮展开显示，离开后收起。两者都由 CSS 过渡驱动，JS 只切换状态标志。
 *
 * 嵌套 ScrollView 的 hover 归属（详见 resolveHoverOwner）：一次指针事件只在
 * 唯一一个 ScrollView 上生效，其余层级让位，因此任意时刻最多只有一条轨道展开。
 *
 * 拇指长度 / 位移是视图状态的纯派生值，这里用 watchEffect 响应式维护，
 * 任何 offset / zoom / 尺寸变化后自动刷新，core.applyView 不再关心拇指。
 */
/* oxlint-disable max-statements, no-ternary, no-magic-numbers --
 * 拇指几何的 0/1 结构字面量（滚动比例回退）属滚动条算法的领域常量，
 * 已由 constants.ts 命名常量覆盖主体，余下为结构边界值；工厂函数按职责
 * 组合计时 / 显示 / 拇指更新多段逻辑，属组件状态机的结构性豁免。
 */
import { computed, onScopeDispose, ref, watchEffect } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { BARS_HIDE_DELAY, MIN_OFFSET, MIN_THUMB_TRAVEL, THUMB_MIN_LENGTH } from './constants'
import type { ScrollViewCore } from './core'

/** 滚动条轴向 */
type ScrollBarAxis = 'vertical' | 'horizontal'

/** ScrollView 根元素类名（模板与几何判定共用，避免字符串散落） */
const ROOT_CLASS = 'fui-scrollview'
/** 滚动条命中区类名 */
const BAR_CLASS = 'fui-scrollview__scrollbar'

/**
 * 滑块行程两端需要让开的步进按钮 band（px）。
 *
 * 数值由 CSS 通过 thumb 的 top / left 内缩给出（--fui-scrollview-thumb-travel-inset）。
 * 几何派生（useScrollBars）与拖拽换算（useScrollbarInput）共用这一读取入口，
 * 保证「可用轨道长度」在两处一致——否则拖拽会与滑块位置对不上而跳变。
 */
const thumbTravelInset = (thumb: HTMLElement, axis: ScrollBarAxis): number =>
  axis === 'vertical' ? thumb.offsetTop : thumb.offsetLeft

/**
 * 指针命中最内层 ScrollView 的根元素：
 * - element 属于某个 ScrollView（含自身），返回该根元素；
 * - 否则返回 undefined。
 */
const innermostScrollView = (target: EventTarget | null): Element | undefined =>
  target instanceof Element ? (target.closest(`.${ROOT_CLASS}`) ?? undefined) : undefined

/** 从事件目标向上收集 ScrollView 根元素链：最内层在前、最外层在后 */
const scrollViewChain = (target: EventTarget | null): Element[] => {
  const chain: Element[] = []
  let node = innermostScrollView(target)
  while (node) {
    chain.push(node)
    node = node.parentElement ? innermostScrollView(node.parentElement) : undefined
  }
  return chain
}

/** 某个 ScrollView 自身的滚动条命中区（只取直接子元素，不含嵌套子级的） */
const ownScrollBars = (root: Element): Element[] =>
  [...root.children].filter((child) => child.classList.contains(BAR_CLASS))

/**
 * 指针坐标是否落在某个 ScrollView 自身的滚动条命中区内。
 *
 * 用几何判定而非「事件目标是不是命中区」：命中区在收起时 pointer-events:none，
 * 指针落在父级轨道上时命中的是下层的嵌套 ScrollView，单看 event.target 会把
 * 父级的轨道误判给子级。
 *
 * 未布局（矩形退化）时不参与判定——jsdom 与未挂载场景下所有矩形都是 0×0，
 * 此时一律走「最内层归属」，行为与纯 DOM 冒泡判定一致。
 */
const pointerInBarArea = (root: Element, event: PointerEvent): boolean => {
  if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) {
    return false
  }
  return ownScrollBars(root).some((bar) => {
    const rect = bar.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) {
      return false
    }
    return (
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom
    )
  })
}

/**
 * 一次指针事件的 hover 归属（唯一权威，所有层级据此决定是否进入 hover 态）。
 *
 * 判定顺序「由外向内」检查各层自身的滚动条命中区：命中即该层独占。这与滚动条
 * 绘制在内容之上的稳态命中顺序一致，因此归属结果不会与浏览器的命中测试互相
 * 拉扯（否则父级一收起就让出指针、子级随即顶上，来回抖动）。都不命中时归最内层
 * ScrollView——指针位于它的内容上。
 */
const resolveHoverOwner = (event: PointerEvent): Element | undefined => {
  const chain = scrollViewChain(event.target)
  const innermost = chain[0]
  if (!innermost) {
    return undefined
  }
  for (let index = chain.length - 1; index >= 0; index -= 1) {
    const view = chain[index]
    if (view && pointerInBarArea(view, event)) {
      return view
    }
  }
  return innermost
}

/** 滚动条展示层暴露给其他模块 / 模板的对象 */
interface ScrollBars {
  barsVisible: Ref<boolean>
  barsImmediate: Ref<boolean>
  hovering: Ref<boolean>
  /** 触控平移进行中（由指针输入模块写入） */
  panningActive: Ref<boolean>
  /** 拇指拖拽进行中（由滚动条输入模块写入） */
  thumbDragging: Ref<boolean>
  /** 轨道展开态：指针位于滚动条命中区，或正在拖拽滑块 */
  trackExpanded: ComputedRef<boolean>
  /** 立即显示滚动条（interaction 触发，无展开延迟） */
  showBars: (immediate: boolean) => void
  /** 在 2s 无交互后收起滚动条 */
  scheduleHide: () => void
  /**
   * 指针划过本视图（由冒泡的 pointerover 驱动）。内部按 resolveHoverOwner
   * 判定归属：只有被判定的归属者进入 hover，其余层级自动让位，实现嵌套隔离。
   */
  onPointerOverViewport: (event: PointerEvent) => void
  onPointerOutViewport: (event: PointerEvent) => void
  /** 指针进入 / 离开滚动条命中区（决定轨道展开） */
  onBarPointerEnter: () => void
  onBarPointerLeave: () => void
}

/** 拇指长度：按可滚动比例缩放，保底 THUMB_MIN_LENGTH */
const thumbLength = (track: number, viewport: number, scrollable: number): number => {
  const total = viewport + scrollable
  const ratio = total > 0 ? viewport / total : 1
  return Math.max(THUMB_MIN_LENGTH, track * ratio)
}

const useScrollBars = (core: ScrollViewCore): ScrollBars => {
  const {
    rootEl,
    vBarEl,
    vThumbEl,
    hBarEl,
    hThumbEl,
    viewportWidth,
    viewportHeight,
    scrollableWidth,
    scrollableHeight,
    offsetX,
    offsetY,
    computedVBarVisible,
    computedHBarVisible,
  } = core

  const barsVisible = ref(false)
  const barsImmediate = ref(false)
  const hovering = ref(false)
  const panningActive = ref(false)
  const thumbDragging = ref(false)
  /** 指针是否位于滚动条命中区（轨道展开的悬停条件） */
  const barHovered = ref(false)
  let hideTimer: ReturnType<typeof setTimeout> | undefined = undefined

  /** 拖拽滑块期间保持轨道展开，避免指针移出命中区时轨道闪烁 */
  const trackExpanded = computed(() => barHovered.value || thumbDragging.value)

  const clearHideTimer = (): void => {
    if (hideTimer !== undefined) {
      globalThis.clearTimeout(hideTimer)
      hideTimer = undefined
    }
  }

  const showBars = (immediate: boolean): void => {
    clearHideTimer()
    barsVisible.value = true
    barsImmediate.value = immediate
  }

  const scheduleHide = (): void => {
    clearHideTimer()
    hideTimer = globalThis.setTimeout(() => {
      if (!hovering.value && !panningActive.value && !thumbDragging.value) {
        barsVisible.value = false
        barsImmediate.value = false
        barHovered.value = false
      }
    }, BARS_HIDE_DELAY)
  }

  /**
   * 指针位于本视图自身区域（含自身滚动条）→ 立即显示滚动条
   */
  const hoverViewport = (): void => {
    hovering.value = true
    clearHideTimer()
    showBars(true)
  }

  /**
   * 指针离开本视图的自身区域：
   * - immediate = true：指针已被更深层嵌套 ScrollView 接管 → 立即让位隐藏，
   *   避免父级滚动条悬在子级之上；
   * - immediate = false：指针真正离开本视图 → 走收起延时（对齐 WinUI）。
   */
  const releaseHoverViewport = (immediate: boolean): void => {
    hovering.value = false
    barHovered.value = false
    if (immediate) {
      clearHideTimer()
      barsVisible.value = false
      barsImmediate.value = false
    } else {
      scheduleHide()
    }
  }

  const onPointerOverViewport = (event: PointerEvent): void => {
    const root = rootEl.value
    // 事件冒泡：本视图与所有祖先 / 嵌套子级都会收到同一次事件，因此统一按
    // 归属判定决定谁进入 hover，保证一次事件只有一个归属者。
    if (resolveHoverOwner(event) !== root) {
      // 归属其它 ScrollView（更深的嵌套子级，或绘制在本视图之上的祖先轨道）→ 让位
      releaseHoverViewport(true)
      return
    }
    hoverViewport()
    // 指针直接落在自身轨道区时展开轨道：命中区收起时不拦截指针事件，收不到
    // 进入通知，这里按几何判定展开；离开命中区后由同一次判定复位。
    barHovered.value = root !== null && pointerInBarArea(root, event)
  }

  const onPointerOutViewport = (event: PointerEvent): void => {
    const target = rootEl.value
    const inner = innermostScrollView(event.relatedTarget)
    if (inner === target) {
      // 指针仍在自身区域内（含自身滚动条）→ 保持悬停
      return
    }
    // 指针移进了另一个 ScrollView（自身的嵌套子级 / 祖先 / 同级）：立即让位，
    // 否则两条轨道会叠在一起显示；只有真正离开所有 ScrollView 才走收起延时。
    releaseHoverViewport(inner !== undefined)
  }

  const onBarPointerEnter = (): void => {
    barHovered.value = true
  }

  const onBarPointerLeave = (): void => {
    barHovered.value = false
  }

  /* ---- 拇指几何（响应式派生） ----
   * 可用轨道长度 = 轨道两端各让开一个步进按钮 band，滑块因此不会与按钮重叠。 */

  const updateVerticalThumb = (): void => {
    const bar = vBarEl.value
    const thumb = vThumbEl.value
    if (!bar || !thumb || !computedVBarVisible.value) {
      return
    }
    const trackLength = Math.max(
      MIN_OFFSET,
      bar.clientHeight - thumbTravelInset(thumb, 'vertical') * 2,
    )
    const length = thumbLength(trackLength, viewportHeight.value, scrollableHeight.value)
    const maxTravel = Math.max(MIN_THUMB_TRAVEL, trackLength - length)
    const ratio = scrollableHeight.value > 0 ? offsetY.value / scrollableHeight.value : 0
    thumb.style.height = `${length}px`
    thumb.style.transform = `translateY(${ratio * maxTravel}px)`
  }

  const updateHorizontalThumb = (): void => {
    const bar = hBarEl.value
    const thumb = hThumbEl.value
    if (!bar || !thumb || !computedHBarVisible.value) {
      return
    }
    const trackLength = Math.max(
      MIN_OFFSET,
      bar.clientWidth - thumbTravelInset(thumb, 'horizontal') * 2,
    )
    const length = thumbLength(trackLength, viewportWidth.value, scrollableWidth.value)
    const maxTravel = Math.max(MIN_THUMB_TRAVEL, trackLength - length)
    const ratio = scrollableWidth.value > 0 ? offsetX.value / scrollableWidth.value : 0
    thumb.style.width = `${length}px`
    thumb.style.transform = `translateX(${ratio * maxTravel}px)`
  }

  watchEffect(
    () => {
      updateVerticalThumb()
      updateHorizontalThumb()
    },
    { flush: 'post' },
  )

  onScopeDispose(() => {
    clearHideTimer()
  })

  return {
    barsVisible,
    barsImmediate,
    hovering,
    panningActive,
    thumbDragging,
    trackExpanded,
    showBars,
    scheduleHide,
    onPointerOverViewport,
    onPointerOutViewport,
    onBarPointerEnter,
    onBarPointerLeave,
  }
}

export { thumbTravelInset, useScrollBars, type ScrollBarAxis, type ScrollBars }
