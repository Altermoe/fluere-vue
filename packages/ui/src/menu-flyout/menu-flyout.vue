<script lang="ts">
/**
 * FluereMenuFlyout —— WinUI 3 `MenuFlyout` 的 Vue 实现（0.6.1）。
 *
 * ## 规格来源（A 级：microsoft-ui-xaml tag `winui3/release/2.5.1`）
 *
 * | 规格面 | 文件 |
 * | --- | --- |
 * | 模板结构 / 几何 / 状态画刷 | `src/controls/dev/CommonStyles/MenuFlyout_themeresources.xaml` |
 * | 默认 placement / 间距 | `src/dxaml/xcp/dxaml/lib/FlyoutBase_partial.cpp`（`g_defaultPlacementMode = Top`、`FlyoutMargin = 4`） |
 * | 展开 / 收起动画常量 | `src/dxaml/xcp/dxaml/lib/MenuPopupThemeTransition_Partial.h`（`s_OpacityChangeDuration = 83` / `s_OpenDuration = 250`） |
 * | 焦点与键盘 | `MenuFlyoutKeyPressProcess.h`、`MenuFlyoutPresenter_Partial.cpp`、`MenuFlyoutItem_Partial.cpp`、`MenuFlyoutSubItem_Partial.cpp`、`CascadingMenuHelper.cpp` |
 * | 子菜单开合延时 | `CascadingMenuHelper.cpp:87-99`（运行时读 `MenuShowDelay`，系统缺省 400ms；常量本体不在公开源码树） |
 * | 通用最小宽度 / 字号 | `src/dxaml/xcp/dxaml/themes/generic.xaml`（`FlyoutThemeMinWidth = 96`、`ControlContentThemeFontSize = 14`） |
 *
 * ## 结构（逐层对应 WinUI 模板）
 *
 * ```
 * MenuFlyout（本库：根组件；展开时 Teleport 到 body）
 *   └ MenuFlyoutPresenter（Border：Acrylic 背景 / 1px 描边 / 8 圆角 / 0,2,0,2 padding / MinWidth 96）
 *       └ ScrollViewer（VerticalScrollBarVisibility = Auto → 本库 `overflow-y: auto`）
 *           └ ItemsPresenter（本库：`#content` 插槽；条目组件在其内部）
 * ```
 *
 * 本库的 `#content` 是**命名插槽**（不是默认插槽）：默认插槽留给触发元素——
 * 这是 AGENTS.md〈插槽要分类〉的硬约定，也避免上游 `as-child` 克隆把菜单内容
 * 一起当成触发器。无触发器模式（SplitButton 等）改用 `anchor` Prop / `showAt()`，
 * 此时默认插槽不渲染、内容仍走 `#content`。

 * SplitButton / DropDownButton 的消费姿势（0.6.4 / 0.6.3）：
 *
 * ```vue
 * <FluereMenuFlyout
 *   ref="menu"
 *   :open="open"
 *   placement="bottom-edge-aligned-left"
 *   @update:open="open = $event"
 *   @select="onCommand"
 * >
 *   <template #content>…</template>
 * </FluereMenuFlyout>
 * ```
 *
 * 箭头区点击时调用 `menu.value?.showAt(arrowElement)`；`open` 受控时父组件
 * 负责回写（非受控可省略 `open`）。关闭后焦点会归还到 `showAt` 前聚焦的元素。
 *
 * ## 打开 / 关闭状态机
 *
 * - 受控：`v-model:open`；非受控：`default-open`。**两种都支持**（AGENTS 约定）。
 * - reka 的 `MenuRoot` 管焦点陷阱、roving focus、子菜单与 DismissableLayer；
 *   本组件只把 `open` 事实源接进来，并把 `update:open` 原样抛给消费方。
 * - 关闭原因（`closed` 事件载荷）：Esc / 外部点击 / 焦点移出 / 触发器 / 条目选中 /
 *   程序化。`useFlyout` 只用于**层级栈登记**（`--zIndexMenu` + 嵌套提升），
 *   关闭语义由 reka + 本组件的 reason 记录负责，避免双重监听。
 *
 * ## 键盘（A 级逐条对齐）
 *
 * | 按键 | 行为 | 来源 |
 * | --- | --- | --- |
 * | ↑ / ↓ | 在当前菜单内移动焦点；非手柄设备**循环** | `MenuFlyoutKeyPressProcess.h` + `MenuFlyoutPresenter_Partial.cpp#CycleFocus` |
 * | Home / End | 首 / 尾条目 | **WinUI keypress 处理里没有这两个键**（负面证据）；按 `docs/todo.md` 0.6.1 验收口径补齐（WAI-ARIA menu 要求） |
 * | Tab | 吞掉（不移动焦点） | `MenuFlyoutKeyPressProcess.h`（`VirtualKey_Tab` → `pbHandled = true`） |
 * | Enter / Space | 激活条目 | `MenuFlyoutItem_Partial.cpp#OnKeyDown/OnKeyUp`（按下只置 pressed，抬起才 Invoke） |
 * | → | 打开子菜单并把焦点交给子菜单 | `MenuFlyoutSubItem_Partial.cpp#OnKeyDown` + `CascadingMenuHelper.cpp` |
 * | ← / Esc（子菜单内） | 只关闭当前子菜单、焦点回到子项 | `MenuFlyoutSubItem_Partial.cpp` + `MenuFlyoutPresenter_Partial.cpp#HandleKeyDownLeftOrEscape` |
 * | Esc（根菜单） | 关闭整个 flyout | `MenuFlyoutKeyPressProcess.h`（交给 Popup 的 LightDismiss） |
 *
 * reka 底座自带「按字符 typeahead」：WinUI `MenuFlyout` 没有这个行为
 * （`MenuFlyoutItem` 只注册键盘加速键，不做前缀匹配）。这是底座附加能力，
 * 与 Select 的既有口径一致——不影响鼠标 / 方向键 / Esc 的验收，逐条记在文档页差异表。
 *
 * ## 指纹 / 层级
 *
 * - 根菜单登记 `--zIndexMenu`（1100），子菜单登记 `--zIndexSubmenu`（1200）；
 *   由于层级栈的嵌套提升，子菜单永远在父菜单之上（0.4.2 刻度的验收点）。
 * - 浮层样式全部写在**非 scoped** 的样式块里：`MenuContent` 与 Teleport 到 body
 *   的节点拿不到本组件的 `data-v-*`（AGENTS〈scoped 失效陷阱〉）。类名统一
 *   `.fui-menu-flyout__*` 私有前缀；条目的行样式同理放在条目组件的非 scoped 块。
 *
 * ## 动画（证据缺口，逐条记账）
 *
 * `MenuPopupThemeTransition` 的**关键帧实现不在公开源码树**（该 transition 的
 * `CreateStoryboardImpl` 在 snapshot 里找不到 `.cpp`），能取到的只有公开头文件里的
 * 两个常量：`s_OpacityChangeDuration = 83`、`s_OpenDuration = 250`，以及
 * `ClosedRatio`（根 0.5 / 子菜单 0.67）与 `Direction`（placement Top → Bottom，
 * 其余 → Top）两个字段。因此本实现：
 *   - 时长：展开 250ms（`--durationGentle` 同值）；透明度在关键帧 33% 处完成，
 *     等价 83ms；收起取 `--durationNormal`（200ms）——**收起时长没有 A 级常量**，
 *     按「比展开略快」的观感取最近档 token，属证据缺口；
 *   - 关键帧：`scaleY` 从 `--fui-menu-flyout-closed-scale`（根 0.5 / 子菜单 0.67）
 *     到 1，配合 opacity 0→1；`:root` 上可用 `--fui-menu-flyout-open-duration`
 *     / `--fui-menu-flyout-close-duration` / `--fui-menu-flyout-closed-scale`
 *     覆写。若后续拿到关键帧实现（例如更新的 tag 公开该 `.cpp`），以源为准回写。
 *
 * 材质同样是证据缺口：presenter 背景 = `DesktopAcrylicTransparentBrush`
 * （FallbackColor 近 `--acrylicBackgroundFillColorDefault`，亮 #F9F9F9 / 暗 #2C2C2C），
 * 真实 Acrylic 合成 + 噪点归 0.9.2；面板描边 `SurfaceStrokeColorFlyoutBrush`
 * → repo-token `--surfaceStrokeColorFlyout`（A 级 `Common_themeresources_any.xaml`）。
 */

import type { CSSProperties } from 'vue'

/** 放置方式 → reka `side` / `align` 的映射结果（内部类型） */
interface FluereMenuFlyoutPlacementConfig {
  side: 'top' | 'bottom' | 'left' | 'right'
  align: 'start' | 'center' | 'end'
}

/** `FluereMenuFlyout` 的公开类型（实现与文档共用一份） */
export type {
  FluereMenuFlyoutCloseReason,
  FluereMenuFlyoutItemProps,
  FluereMenuFlyoutPlacement,
  FluereMenuFlyoutProps,
  FluereMenuFlyoutSelectEventArgs,
  FluereMenuFlyoutSubItemProps,
  FluereMenuFlyoutToggleItemProps,
} from './types'
</script>

<script setup lang="ts">
import { isClient } from '@fluere-vue/utils'
import {
  DropdownMenuContent,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger,
} from 'reka-ui'
import { computed, nextTick, provide, ref, useSlots, watch } from 'vue'
import { useFlyout } from '../flyout/use-flyout'
import { createSubmenuScope, MENU_FLYOUT_KEY, MENU_SUBMENU_SCOPE_KEY } from './context'
import { provideMenuLayout } from './layout'
import FluereMenuFlyoutItem from './menu-flyout-item.vue'
import FluereMenuFlyoutSubItem from './menu-flyout-sub-item.vue'
import FluereMenuFlyoutToggleItem from './menu-flyout-toggle-item.vue'
import type {
  FluereMenuFlyoutCloseReason,
  FluereMenuFlyoutPlacement,
  FluereMenuFlyoutProps,
  FluereMenuFlyoutSelectEventArgs,
} from './types'

defineOptions({
  name: 'FluereMenuFlyout',
  /**
   * 关闭属性继承：无触发器模式没有根 DOM，透传 attrs 无处可落；触发器模式的
   * `class` / `style` 由 `DropdownMenuTrigger as-child` 合并到触发元素上。
   */
  inheritAttrs: false,
})

const props = withDefaults(defineProps<FluereMenuFlyoutProps>(), {
  open: undefined,
  defaultOpen: false,
  disabled: false,
  anchor: undefined,
  placement: 'top',
  sideOffset: 4,
  alignOffset: 0,
  label: undefined,
  labelledby: undefined,
  closeOnSelect: true,
  dir: undefined,
})

const emit = defineEmits<{
  /** 受控展开状态回写（`v-model:open`） */
  'update:open': [value: boolean]
  /** 已展开（对应 WinUI `MenuFlyout.Opened`） */
  'opened': []
  /** 已关闭（对应 WinUI `MenuFlyout.Closed`；载荷为关闭原因） */
  'closed': [reason: FluereMenuFlyoutCloseReason]
  /** 条目被选中（冒泡到根的统一入口，便于 `v-for` 动态条目） */
  'select': [args: FluereMenuFlyoutSelectEventArgs]
}>()

const slots = useSlots()

/* ------------------------------------------------------------------ */
/* 开合状态：受控 / 非受控                                              */
/* ------------------------------------------------------------------ */

const innerOpen = ref(props.defaultOpen)
const isOpen = computed<boolean>(() => (props.open === undefined ? innerOpen.value : props.open))

/** 最近一次关闭原因（`closed` 事件与测试断言用；打开后保持到下一次关闭） */
const lastCloseReason = ref<FluereMenuFlyoutCloseReason>('programmatic')

/**
 * 显式锚点（`showAt()` 用）。优先级：`showAt()` 传入的实时元素 > `anchor` Prop
 * > 触发元素。触发器模式与锚点模式共用同一套定位 / 关闭逻辑。
 */
const explicitAnchor = ref<HTMLElement | null>(null)
const triggerRef = ref<unknown>(null)
const triggerElement = computed<HTMLElement | null>(() => elementOf(triggerRef.value))
const anchorElement = computed<HTMLElement | null>(
  () => explicitAnchor.value ?? props.anchor ?? triggerElement.value,
)

/** 显式锚点模式：传了 `anchor` 就不再渲染默认插槽里的触发元素（API 契约如此） */
const anchorMode = computed<boolean>(() => props.anchor !== undefined && props.anchor !== null)

/**
 * 内容能否渲染：触发器模式（有默认插槽，reka 自己管锚点）或显式锚点模式。
 * `anchor` 尚未赋值时不要挂载 reka 的 content（没有 reference 的 Popper 无意义）。
 */
const hasAnchorSource = computed<boolean>(
  () => Boolean(slots.default) || anchorElement.value !== null,
)

/**
 * 根层子菜单作用域：根面板里的 SubItem 注册到这里；根关闭时一次性收起。
 * 每个子菜单自己再提供一层作用域（见 menu-flyout-sub-item.vue），
 * 条目只关「与自己同级」的子菜单，避免子菜单内部 hover 把父菜单关掉。
 */
const submenuScope = createSubmenuScope()

/** 打开（受控模式下只抛事件，真正状态由父组件回写） */
const open = (): void => {
  if (anchorElement.value === null || isOpen.value) {
    return
  }
  innerOpen.value = true
  emit('update:open', true)
}

/** 关闭（reason 写进 `closed` 事件载荷） */
const close = (reason: FluereMenuFlyoutCloseReason = 'programmatic'): void => {
  if (!isOpen.value) {
    return
  }
  lastCloseReason.value = reason
  innerOpen.value = false
  emit('update:open', false)
}

const toggle = (): void => {
  if (isOpen.value) {
    close('trigger')
  } else {
    open()
  }
}

/** reka `DropdownMenuRoot` 的受控状态回写（DismissableLayer / 子菜单关闭都走这里） */
const onRootOpenChange = (value: boolean): void => {
  if (value === isOpen.value) {
    return
  }
  innerOpen.value = value
  emit('update:open', value)
}

// 打开后把焦点交给第一个可聚焦条目（WinUI `MenuFlyoutPresenter::SetInitialFocus`：
// presenter 首次获得焦点时 `CycleFocus(true)` 聚焦首个可聚焦条目）。
/**
 * 打开前聚焦的元素（关闭后归还）。
 *
 * reka 的 FocusScope 在触发模式下会归还给 trigger；锚点模式没有 trigger，
 * DropdownMenuContent 内部的 close-auto-focus 会 preventDefault 后什么也不聚焦。
 * 因此这里统一记录 / 归还一次（外部点击关闭时抑制归还，避免抢用户的新落点）。
 */
let lastFocused: HTMLElement | null = null

watch(
  isOpen,
  async (value) => {
    if (value) {
      if (isClient && typeof document !== 'undefined') {
        lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
      }
      emit('opened')
      await focusFirstItem()
      return
    }
    // 根关闭时子菜单必须一起收（WinUI `MenuFlyoutItem::Invoke` 先 CloseSubMenu 再 Close）。
    submenuScope.closeChildSubmenus()
    const reason = lastCloseReason.value
    emit('closed', reason)
    lastCloseReason.value = 'programmatic'
    if (reason !== 'outside-pointer' && reason !== 'focus-leave') {
      const target = lastFocused
      lastFocused = null
      await nextTick()
      if (target?.isConnected === true) {
        target.focus({ preventScroll: true })
      }
    } else {
      lastFocused = null
    }
  },
  { flush: 'post' },
)

/* ------------------------------------------------------------------ */
/* 触发器 / 锚点元素归一                                                */
/* ------------------------------------------------------------------ */

/**
 * 把 `FluereButton` 之类的组件实例归一成真实元素（组件 ref 不是 DOM）。
 * DropdownMenuTrigger 的 ref 拿到的可能是组件实例，取其 `$el`。
 */
function elementOf(target: unknown): HTMLElement | null {
  // SSR：服务端没有 HTMLElement 全局（setup 期会求值 triggerElement computed）
  if (typeof HTMLElement === 'undefined') {
    return null
  }
  if (target instanceof HTMLElement) {
    return target
  }
  if (target !== null && typeof target === 'object' && '$el' in target) {
    const element = (target as { $el?: unknown }).$el
    return element instanceof HTMLElement ? element : null
  }
  return null
}

/* ------------------------------------------------------------------ */
/* 定位：WinUI FlyoutPlacementMode → reka side / align                  */
/* ------------------------------------------------------------------ */

/** WinUI `FlyoutPlacementMode` → reka `side` / `align` 的静态映射（避免 switch 穷举噪音） */
const PLACEMENT_CONFIG: Record<FluereMenuFlyoutPlacement, FluereMenuFlyoutPlacementConfig> = {
  'top': { side: 'top', align: 'center' },
  'top-edge-aligned-left': { side: 'top', align: 'start' },
  'top-edge-aligned-right': { side: 'top', align: 'end' },
  'bottom': { side: 'bottom', align: 'center' },
  'bottom-edge-aligned-left': { side: 'bottom', align: 'start' },
  'bottom-edge-aligned-right': { side: 'bottom', align: 'end' },
  'left': { side: 'left', align: 'center' },
  'left-edge-aligned-top': { side: 'left', align: 'start' },
  'left-edge-aligned-bottom': { side: 'left', align: 'end' },
  'right': { side: 'right', align: 'center' },
  'right-edge-aligned-top': { side: 'right', align: 'start' },
  'right-edge-aligned-bottom': { side: 'right', align: 'end' },
}

const placementConfig = computed<FluereMenuFlyoutPlacementConfig>(
  () => PLACEMENT_CONFIG[props.placement] ?? PLACEMENT_CONFIG.top,
)

/**
 * 动画原点：WinUI `MenuFlyout::PreparePopupTheme` 的 `Direction` 只在 placement
 * 为 Top 时取 Bottom，其余取 Top（`MenuFlyout_Partial.cpp:259`）。
 */
const animationOrigin = computed(() => (placementConfig.value.side === 'top' ? 'bottom' : 'top'))

const presenterStyle = computed(
  () =>
    ({
      '--fui-menu-flyout-origin': animationOrigin.value,
    }) as CSSProperties,
)

/* ------------------------------------------------------------------ */
/* 层级（0.4.1）：根菜单登记 --zIndexMenu；子菜单在各自组件里登记        */
/* ------------------------------------------------------------------ */

const flyout = useFlyout({
  tier: '--zIndexMenu',
  open: () => isOpen.value,
  closeOnEscape: false,
  closeOnOutsidePointer: false,
  returnFocus: false,
})
const { layerStyle: flyoutLayerStyle } = flyout

/* ------------------------------------------------------------------ */
/* 根上下文：选中回传 / 关闭 / 子菜单互斥                               */
/* ------------------------------------------------------------------ */

provide(MENU_FLYOUT_KEY, {
  notifySelect: (payload: FluereMenuFlyoutSelectEventArgs) => {
    lastCloseReason.value = 'item-click'
    emit('select', payload)
  },
  closeOnSelect: () => props.closeOnSelect,
})

provide(MENU_SUBMENU_SCOPE_KEY, submenuScope)

provideMenuLayout(slots.content, {
  item: FluereMenuFlyoutItem,
  subItem: FluereMenuFlyoutSubItem,
  toggle: FluereMenuFlyoutToggleItem,
})

/* ------------------------------------------------------------------ */
/* 关闭原因：reka 的 DismissableLayer 事件只带「发生了什么」             */
/* ------------------------------------------------------------------ */

const onEscapeKeyDown = (): void => {
  lastCloseReason.value = 'escape'
}

/**
 * 外部 pointerdown：
 *   - 点在触发器 / 锚点上时**阻止 DismissableLayer 关闭**——同一次指针交互应该
 *     由触发器的 click 处理（打开 ↔ 关闭），否则会出现「pointerdown 关了、
 *     click 又开」的竞态（SplitButton 的 secondary 按钮同样受益）。
 *   - 其余位置记 `outside-pointer`，交给 reka 关闭。
 */
const onPointerDownOutside = (event: Event): void => {
  const target = event.target
  if (target instanceof Node) {
    if (triggerElement.value?.contains(target) === true) {
      event.preventDefault()
      return
    }
    if (props.anchor?.contains(target) === true) {
      event.preventDefault()
      return
    }
  }
  lastCloseReason.value = 'outside-pointer'
}

const onFocusOutside = (): void => {
  lastCloseReason.value = 'focus-leave'
}

/* ------------------------------------------------------------------ */
/* 键盘：Home / End / Tab（根面板）                                     */
/* ------------------------------------------------------------------ */

const contentBodyRef = ref<HTMLElement | null>(null)

const menuItems = (): HTMLElement[] => {
  const root = contentBodyRef.value
  if (root === null) {
    return []
  }
  return [...root.querySelectorAll<HTMLElement>('[data-reka-collection-item]:not([data-disabled])')]
}

const focusFirstItem = async (): Promise<void> => {
  await nextTick()
  const items = menuItems()
  if (items.length > 0) {
    items[0]?.focus({ preventScroll: true })
  }
}

/**
 * 根面板的捕获阶段键盘处理（子菜单被 Teleport 到 body，不受这里影响）：
 *   - Tab：WinUI 明确 `pbHandled = true` 且不移动焦点；
 *   - Home / End：WinUI 缺这两个键（负面证据），按 0.6.1 验收补 WAI-ARIA 行为。
 */
const onContentKeydownCapture = (event: KeyboardEvent): void => {
  if (event.key === 'Tab') {
    event.preventDefault()
    event.stopPropagation()
    return
  }
  const isVertical = event.key === 'ArrowDown' || event.key === 'ArrowUp'
  const isJump = event.key === 'Home' || event.key === 'End'
  if (!isVertical && !isJump) {
    return
  }
  const items = menuItems()
  if (items.length === 0) {
    return
  }
  event.preventDefault()
  // 自己处理 ↑↓ / Home / End：reka 的 RovingFocus 与 MenuContent 各有一层导航，
  // 两层同时响应时会出现「焦点先到下一项、又被另一层拨回上一项」的双跳。
  // 这里在捕获阶段截停，保证唯一事实源（并且循环规则与 WinUI CycleFocus 一致）。
  event.stopPropagation()
  let target: HTMLElement | undefined = undefined
  if (isJump) {
    target = event.key === 'Home' ? items[0] : items[items.length - 1]
  } else {
    const current = items.indexOf(document.activeElement as HTMLElement)
    const delta = event.key === 'ArrowDown' ? 1 : -1
    const next =
      current === -1
        ? delta === 1
          ? 0
          : items.length - 1
        : (current + delta + items.length) % items.length
    target = items[next]
  }
  target?.focus({ preventScroll: true })
}

/* ------------------------------------------------------------------ */
/* 暴露：命令式开合（SplitButton / DropDownButton 消费）                */
/* ------------------------------------------------------------------ */

/**
 * 在指定元素处打开（对应 `FlyoutBase.ShowAt(target)`）。
 * 会覆盖 `anchor` Prop / 触发器作为定位参考，直到组件销毁或再次调用。
 */
const showAt = (target: HTMLElement): void => {
  explicitAnchor.value = target
  if (!props.disabled) {
    open()
  }
}

const hide = (): void => {
  close('programmatic')
}

defineExpose({
  /** 当前是否打开 */
  isOpen,
  /** 在锚点处打开 */
  showAt,
  /** 关闭（reason 默认 programmatic） */
  hide,
  /** 命令式打开（使用当前锚点） */
  open,
  /** 命令式关闭 */
  close,
  /** 打开 ↔ 关闭 */
  toggle,
})
</script>

<template>
  <DropdownMenuRoot
    :open="isOpen"
    :modal="true"
    :dir="dir"
    @update:open="onRootOpenChange"
  >
    <!--
      触发器模式：默认插槽 = 触发元素（AGENTS〈插槽要分类〉）。`as-child` 把
      reka 的点击 / `aria-haspopup` / `aria-expanded` / `aria-controls` 合并到
      用户元素上，不额外包宿主，SplitButton 这类「主区 + 箭头区」布局不受影响。
    -->
    <DropdownMenuTrigger
      v-if="slots.default && !anchorMode"
      ref="triggerRef"
      as-child
      :disabled="disabled"
    >
      <slot />
    </DropdownMenuTrigger>

    <!--
      根面板：触发器模式由 reka 的 Trigger 提供锚点；无触发器模式（SplitButton /
      `showAt()`）由 `reference` 直接给，不再造隐藏触发元素。
    -->
    <DropdownMenuPortal v-if="hasAnchorSource">
      <DropdownMenuContent
        class="fui-menu-flyout__presenter"
        :style="[flyoutLayerStyle, presenterStyle]"
        :reference="anchorElement ?? undefined"
        :side="placementConfig.side"
        :align="placementConfig.align"
        :side-offset="sideOffset"
        :align-offset="alignOffset"
        :avoid-collisions="true"
        :collision-padding="4"
        :loop="true"
        :aria-label="label"
        :aria-labelledby="labelledby"
        @escape-key-down="onEscapeKeyDown"
        @pointer-down-outside="onPointerDownOutside"
        @focus-outside="onFocusOutside"
      >
        <div
          ref="contentBodyRef"
          class="fui-menu-flyout__body"
          @keydown.capture="onContentKeydownCapture"
        >
          <slot name="content" />
        </div>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>

<!--
  非 scoped 的理由：根面板由 reka 的 `DropdownMenuContent` 渲染并 Teleport 到 body，
  `DropdownMenuContent` 的根节点拿不到本组件的 `data-v-*`；scoped 选择器会静默失效
  （AGENTS〈scoped 样式只对本模板元素生效〉）。类名统一 `.fui-menu-flyout__` 私有前缀。
  条目 / 子菜单的行样式在各自组件里（同样是非 scoped 块，理由相同）。
-->
<style>
/* ------------------------------------------------------------------ */
/* 几何 / 画刷：逐条对应 MenuFlyout_themeresources.xaml                 */
/* ------------------------------------------------------------------ */

.fui-menu-flyout__presenter {
  /*
   * 条目局部变量：MenuFlyoutItemThemePadding 的 11 / 9 在 token 表没有同值档。
   * 放在 presenter 上，让条目组件（含子菜单条目）用 fallback 读取，一处覆写全菜单生效。
   */
  --fui-menu-flyout-item-padding-inline: 11px;
  --fui-menu-flyout-item-padding-block-end: 9px;
  /*
   * 声明本层档位（--zIndexMenu，1100）。`useFlyout` 会在打开时用内联样式覆写
   * 成层级栈的表达式（嵌套提升），这里只是 SSR / 首帧的缺省值。禁止裸 z-index。
   */
  z-index: var(--zIndexMenu);
  box-sizing: border-box;
  min-inline-size: 96px; /* FlyoutThemeMinWidth */
  min-block-size: 32px; /* MenuFlyoutThemeMinHeight */
  /*
   * 背景 = DesktopAcrylicTransparentBrush 的 FallbackColor 近似（证据缺口：
   * 真实 Acrylic 合成 + 噪点归 0.9.2）；描边 = SurfaceStrokeColorFlyoutBrush。
   */
  border: var(--strokeWidthThin) solid var(--surfaceStrokeColorFlyout);
  border-radius: var(--borderRadiusXLarge); /* OverlayCornerRadius = 8 */
  background-color: var(--fui-menu-flyout-background, var(--acrylicBackgroundFillColorDefault));
  box-shadow: var(--shadow16); /* 菜单浮层 elevation 16 */
  color: var(--colorNeutralForeground1);

  /* MenuFlyoutPresenterThemePadding = 0,2,0,2 */
  padding-block: var(--spacingVerticalXXS);
  padding-inline: 0;

  /*
   * FlyoutBase 在 Arrange 时按可用窗口收缩 presenter；reka 暴露
   * --reka-popper-available-height（PopperContent 的 collision 结果），
   * 用它做 max-height 让菜单在矮视口内滚动而不是溢出。
   */
  max-block-size: min(
    var(--fui-menu-flyout-max-height, 758px),
    var(--reka-popper-available-height, 100dvh)
  );
  overflow: hidden;
  font-family: var(--fontFamilyBase);
  font-size: var(--fontSizeBase300); /* ControlContentThemeFontSize = 14 */
  line-height: var(--lineHeightBase300);
  transform-origin: var(--fui-menu-flyout-origin, top);
  /* 动画几何的证据缺口见文件头；三个量都可在消费方覆写 */
  animation: fui-menu-flyout-open var(--fui-menu-flyout-open-duration, var(--durationGentle))
    var(--curveEasyEase) both;
}

/* Presenter 的 ScrollViewer：VerticalScrollBarVisibility = Auto */
.fui-menu-flyout__body {
  display: flex;
  flex-direction: column;
  min-block-size: 0;
  max-block-size: inherit;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
}

/* 关闭动画：Presence 监听 animationName / animationend 决定卸载时机 */
.fui-menu-flyout__presenter[data-state='closed'] {
  animation-name: fui-menu-flyout-close;
  animation-duration: var(--fui-menu-flyout-close-duration, var(--durationNormal));
}

/* 子菜单面板：与根面板同视觉，档位由子项组件登记为 --zIndexSubmenu */
.fui-menu-flyout__submenu-presenter {
  /*
   * 条目局部变量：与根面板同一套（子菜单条目也读这两个 fallback）。
   * ClosedRatio：根 0.5 / 子菜单 0.67（MenuFlyoutSubItem_Partial.cpp:729 传入 0.67）。
   */
  --fui-menu-flyout-item-padding-inline: 11px;
  --fui-menu-flyout-item-padding-block-end: 9px;
  --fui-menu-flyout-closed-scale: 0.67;
  z-index: var(--zIndexSubmenu);
  box-sizing: border-box;
  min-inline-size: 96px;
  min-block-size: 32px;
  border: var(--strokeWidthThin) solid var(--surfaceStrokeColorFlyout);
  border-radius: var(--borderRadiusXLarge);
  background-color: var(--fui-menu-flyout-background, var(--acrylicBackgroundFillColorDefault));
  box-shadow: var(--shadow16);
  color: var(--colorNeutralForeground1);
  padding-block: var(--spacingVerticalXXS);
  padding-inline: 0;
  max-block-size: min(
    var(--fui-menu-flyout-max-height, 758px),
    var(--reka-popper-available-height, 100dvh)
  );
  overflow: hidden;
  font-family: var(--fontFamilyBase);
  font-size: var(--fontSizeBase300);
  line-height: var(--lineHeightBase300);
  transform-origin: var(--fui-menu-flyout-origin, top);
  animation: fui-menu-flyout-open var(--fui-menu-flyout-open-duration, var(--durationGentle))
    var(--curveEasyEase) both;
}

.fui-menu-flyout__submenu-presenter[data-state='closed'] {
  animation-name: fui-menu-flyout-close;
  animation-duration: var(--fui-menu-flyout-close-duration, var(--durationNormal));
}

.fui-menu-flyout__submenu-body {
  display: flex;
  flex-direction: column;
  min-block-size: 0;
  max-block-size: inherit;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
}

/* ------------------------------------------------------------------ */
/* 动效：常量见文件头「动画」；透明度在 33%（≈83/250）处完成            */
/* ------------------------------------------------------------------ */

@keyframes fui-menu-flyout-open {
  0% {
    opacity: 0;
    transform: scaleY(var(--fui-menu-flyout-closed-scale, 0.5));
  }

  33.2% {
    opacity: 1;
  }

  100% {
    opacity: 1;
    transform: scaleY(1);
  }
}

@keyframes fui-menu-flyout-close {
  0% {
    opacity: 1;
    transform: scaleY(1);
  }

  33.2% {
    opacity: 0;
  }

  100% {
    opacity: 0;
    transform: scaleY(var(--fui-menu-flyout-closed-scale, 0.5));
  }
}

/* 关闭动画的时长走局部变量（无 A 级同值 token，见文件头） */
.fui-menu-flyout__presenter,
.fui-menu-flyout__submenu-presenter {
  --fui-menu-flyout-close-duration: var(--durationNormal);
}

@media (prefers-reduced-motion: reduce) {
  .fui-menu-flyout__presenter,
  .fui-menu-flyout__submenu-presenter {
    animation: none;
  }
}
</style>
