<script lang="ts">
/**
 * FluereMenuFlyoutSubItem —— 对应 WinUI `MenuFlyoutSubItem`（0.6.1）。
 *
 * ## 规格（A 级：`winui3/release/2.5.1`）
 *
 * | 规格面 | 文件 / 位置 |
 * | --- | --- |
 * | 行模板 / 状态 | `CommonStyles/MenuFlyout_themeresources.xaml`（`DefaultMenuFlyoutSubItemStyle`） |
 * | hover 展开 / 收起 | `CascadingMenuHelper.cpp`（`MenuShowDelay`，系统缺省 400ms；`OnPointerEntered` 起开、`DelayCloseSubMenu` 起关） |
 * | 键盘打开 | `CascadingMenuHelper.cpp#OnKeyDown`（Enter / Right / Space）、`MenuFlyoutSubItem_Partial.cpp` |
 * | 键盘关闭 | `MenuFlyoutPresenter_Partial.cpp#HandleKeyDownLeftOrEscape`（子 presenter 的 Left / Esc 只关自己） |
 * | 子菜单定位 | `MenuFlyoutSubItem_Partial.cpp#OpenSubMenuImpl`（右/左边缘、贴边） |
 * | 子菜单入场 | `MenuPopupThemeTransition`（根 0.5 / 子菜单 0.67 的 ClosedRatio） |
 *
 * ## 与根面板的关系
 *
 * - 每一个 SubItem 提供一层 `MENU_SUBMENU_SCOPE_KEY`，让**自己内容里的**条目只关
 *   自己的子菜单；同时注册到父作用域，父级 hover 到别的条目时收起自己。
 * - 子菜单层级登记 `--zIndexSubmenu`（1200）并进入层级栈：父菜单永远盖不住它
 *   （0.4.2 刻度验收）。
 * - Esc / ← 的捕获处理放在子菜单外层的 `@keydown.capture`：reka 的 `MenuSubContent`
 *   默认 Esc 会关整个根菜单，而 WinUI 只关当前子菜单；这里先截停、再按 A 级口径处理。
 */
export type { FluereMenuFlyoutSubItemProps } from './types'
</script>

<script setup lang="ts">
import { FluentIconChevronRight12Regular } from '@fluere-vue/icons'
import {
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  RovingFocusItem,
} from 'reka-ui'
import { computed, inject, nextTick, onScopeDispose, provide, ref, useSlots } from 'vue'
import { useFlyout } from '../flyout/use-flyout'
import { useFocusVisual } from '../focus-visual/use-focus-visual'
import {
  createSubmenuScope,
  EMPTY_SUBMENU_SCOPE,
  MENU_SUBMENU_SCOPE_KEY,
  SUBMENU_CLOSE_DELAY,
  SUBMENU_OPEN_DELAY,
} from './context'
import { provideMenuLayout, useMenuLayout } from './layout'
import FluereMenuFlyoutItem from './menu-flyout-item.vue'
import FluereMenuFlyoutToggleItem from './menu-flyout-toggle-item.vue'
import type { FluereMenuFlyoutSubItemProps } from './types'

defineOptions({
  name: 'FluereMenuFlyoutSubItem',
})

const props = withDefaults(defineProps<FluereMenuFlyoutSubItemProps>(), {
  text: undefined,
  icon: undefined,
  disabled: false,
  label: undefined,
})

const slots = useSlots()
const focusVisual = useFocusVisual()
const layout = useMenuLayout()

/* ------------------------------------------------------------------ */
/* 子菜单状态 / 作用域                                                  */
/* ------------------------------------------------------------------ */

const subOpen = ref(false)
const triggerEl = ref<HTMLElement | null>(null)
const submenuWrapper = ref<HTMLElement | null>(null)
const submenuId = Symbol('fluere-menu-flyout-submenu')

/** 父层作用域：本子菜单注册进去，父层切换条目时可关闭它 */
const parentScope = inject(MENU_SUBMENU_SCOPE_KEY, EMPTY_SUBMENU_SCOPE)
/** 本层作用域：本子菜单内容里的嵌套 SubItem 注册到这里 */
const childScope = createSubmenuScope()
provide(MENU_SUBMENU_SCOPE_KEY, childScope)

provideMenuLayout(slots.default, {
  item: FluereMenuFlyoutItem,
  // 不 import 自身（会触发 no-self-import）；嵌套 SubItem 由组件 `__name` 识别
  toggle: FluereMenuFlyoutToggleItem,
})

/** 子菜单层级（--zIndexSubmenu；嵌套时由层级栈继续提升） */
const flyout = useFlyout({
  tier: '--zIndexSubmenu',
  open: () => subOpen.value,
  closeOnEscape: false,
  closeOnOutsidePointer: false,
  returnFocus: false,
})
const { layerStyle: submenuLayerStyle } = flyout

/* ------------------------------------------------------------------ */
/* 开合：hover 延时 / 键盘 / 点击                                       */
/* ------------------------------------------------------------------ */

let openTimer: ReturnType<typeof setTimeout> | null = null
let closeTimer: ReturnType<typeof setTimeout> | null = null

const clearTimers = (): void => {
  if (openTimer !== null) {
    clearTimeout(openTimer)
    openTimer = null
  }
  if (closeTimer !== null) {
    clearTimeout(closeTimer)
    closeTimer = null
  }
}

const focusFirstChild = async (): Promise<void> => {
  await nextTick()
  const root = submenuWrapper.value
  if (root === null) {
    return
  }
  const items = [
    ...root.querySelectorAll<HTMLElement>('[data-reka-collection-item]:not([data-disabled])'),
  ]
  items[0]?.focus({ preventScroll: true })
}

/**
 * 切换子菜单展开状态。
 * @param value 目标状态
 * @param focusMode `'first'` = 打开后聚焦首项；`'trigger'` = 关闭后回焦子项
 */
const setOpen = (value: boolean, focusMode: 'first' | 'trigger' | null = null): void => {
  clearTimers()
  if (value === subOpen.value) {
    if (value && focusMode === 'first') {
      void focusFirstChild()
    }
    return
  }
  if (value) {
    // 同一层只允许一个子菜单展开（WinUI `EnsureCloseExistingSubItems`）
    parentScope.closeChildSubmenus(submenuId)
  }
  subOpen.value = value
  if (value) {
    if (focusMode === 'first') {
      void focusFirstChild()
    }
    return
  }
  // 收回子菜单树
  childScope.closeChildSubmenus()
  if (focusMode === 'trigger') {
    void nextTick().then(() => triggerEl.value?.focus({ preventScroll: true }))
  }
}

const onSubmenuOpenChange = (value: boolean): void => {
  // reka 内部（焦点移出等）请求关闭时同步状态，不抢焦点
  setOpen(value, null)
}

const unregister = parentScope.registerSubmenu(submenuId, () => {
  setOpen(false, null)
})

const scheduleOpen = (): void => {
  if (props.disabled || subOpen.value) {
    return
  }
  clearTimers()
  openTimer = setTimeout(() => {
    openTimer = null
    setOpen(true, null)
  }, SUBMENU_OPEN_DELAY)
}

const scheduleClose = (): void => {
  clearTimers()
  closeTimer = setTimeout(() => {
    closeTimer = null
    setOpen(false, null)
  }, SUBMENU_CLOSE_DELAY)
}

const onRowPointerEnter = (): void => {
  if (props.disabled) {
    return
  }
  // 悬停到本项：同层其它子菜单立即收（WinUI EnsureCloseExistingSubItems）；
  // 从子菜单回到本行时取消「离开即关」计时。
  clearTimers()
  parentScope.closeChildSubmenus(submenuId)
  if (!subOpen.value) {
    scheduleOpen()
  }
}

/** 焦点落到本行（键盘 ↑↓ / 点击）：收起同层其它子菜单，但保留自己 */
const onRowFocus = (): void => {
  parentScope.closeChildSubmenus(submenuId)
}

/** 指针是否仍在菜单表面内（行 / 父面板 / 子菜单面板）——悬停走廊判定 */
const isInsideMenuSurface = (target: EventTarget | null): boolean =>
  target instanceof Element &&
  target.closest(
    '.fui-menu-flyout__presenter, .fui-menu-flyout__submenu-presenter, .fui-menu-flyout__item',
  ) !== null

const onRowPointerLeave = (event: PointerEvent): void => {
  if (props.disabled) {
    return
  }
  // 指针移向子菜单 / 父面板的其他条目：不关（交给对应的 enter 逻辑）
  if (isInsideMenuSurface(event.relatedTarget)) {
    return
  }
  clearTimers()
  if (subOpen.value) {
    scheduleClose()
  }
}

const onSubmenuPointerEnter = (): void => {
  if (closeTimer !== null) {
    clearTimeout(closeTimer)
    closeTimer = null
  }
}

const onSubmenuPointerLeave = (event: PointerEvent): void => {
  // 移入嵌套子菜单 / 父面板条目时保持展开，否则 400ms 后收起（MenushowDelay）
  if (isInsideMenuSurface(event.relatedTarget)) {
    return
  }
  scheduleClose()
}

const onRowClick = (): void => {
  if (props.disabled) {
    return
  }
  setOpen(true, null)
}

/**
 * 行内键盘：Enter / Space / → 打开子菜单（A 级 `CascadingMenuHelper.cpp#OnKeyDown`）；
 * 子菜单已开时 ← / Esc 先只收子菜单并回焦（指针 hover 打开、焦点仍在行上的场景）。
 * ↑ / ↓ 不在这里处理：交给 reka 的 roving focus（父面板统一循环）。
 */
const onRowKeydown = (event: KeyboardEvent): void => {
  if (props.disabled) {
    return
  }
  if (event.key === 'ArrowRight' || event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    setOpen(true, 'first')
    return
  }
  if ((event.key === 'ArrowLeft' || event.key === 'Escape') && subOpen.value) {
    event.preventDefault()
    event.stopPropagation()
    setOpen(false, 'trigger')
  }
}

/* ------------------------------------------------------------------ */
/* 子菜单面板键盘（捕获阶段截停 reka 的「Esc 关根菜单」行为）            */
/* ------------------------------------------------------------------ */

const submenuItems = (): HTMLElement[] => {
  const root = submenuWrapper.value
  if (root === null) {
    return []
  }
  return [...root.querySelectorAll<HTMLElement>('[data-reka-collection-item]:not([data-disabled])')]
}

const onSubmenuKeydownCapture = (event: KeyboardEvent): void => {
  if (event.key === 'Tab') {
    // WinUI：Tab 被吞掉，不移动焦点（根面板同理）
    event.preventDefault()
    event.stopPropagation()
    return
  }
  if (event.key === 'Escape' || event.key === 'ArrowLeft') {
    // WinUI `MenuFlyoutPresenter::HandleKeyDownLeftOrEscape`：只关当前子菜单
    event.preventDefault()
    event.stopPropagation()
    setOpen(false, 'trigger')
    return
  }
  const isVertical = event.key === 'ArrowDown' || event.key === 'ArrowUp'
  const isJump = event.key === 'Home' || event.key === 'End'
  if (!isVertical && !isJump) {
    return
  }
  const items = submenuItems()
  if (items.length === 0) {
    return
  }
  // 与根面板同一口径：捕获阶段自己处理，避免 reka 的两层导航互相拨回焦点。
  event.preventDefault()
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
/* 布局 / 展示                                                          */
/* ------------------------------------------------------------------ */

const hasIconSlot = computed(() => props.icon !== undefined || slots.icon !== undefined)
const showIconColumn = (): boolean => hasIconSlot.value || layout.hasIcon()

onScopeDispose(() => {
  clearTimers()
  unregister()
})
</script>

<template>
  <DropdownMenuSub
    :open="subOpen"
    @update:open="onSubmenuOpenChange"
  >
    <RovingFocusItem
      as-child
      :focusable="!disabled"
    >
      <div
        ref="triggerEl"
        :class="[
          focusVisual.class,
          'fui-menu-flyout__item',
          'fui-menu-flyout__item--sub',
          { 'fui-menu-flyout__item--submenu-open': subOpen },
        ]"
        :style="focusVisual.style"
        role="menuitem"
        aria-haspopup="menu"
        :aria-expanded="subOpen ? 'true' : 'false'"
        :aria-disabled="disabled ? 'true' : undefined"
        @pointerenter="onRowPointerEnter"
        @pointerleave="onRowPointerLeave"
        @keydown="onRowKeydown"
        @focus="onRowFocus"
        @click="onRowClick"
      >
        <!-- CheckPlaceholder：同面板存在 Toggle 项时让出勾选列 -->
        <span
          v-if="layout.hasToggle()"
          class="fui-menu-flyout__item-check-placeholder"
          aria-hidden="true"
        />
        <!-- 图标列 -->
        <span
          v-if="showIconColumn()"
          class="fui-menu-flyout__item-icon"
          aria-hidden="true"
        >
          <component
            :is="icon"
            v-if="icon"
            :size="16"
          />
          <slot
            v-else
            name="icon"
          />
        </span>
        <span class="fui-menu-flyout__item-text">
          <slot name="label">{{ text }}</slot>
        </span>
        <!-- SubItemChevron：12px，Margin 24,0,0,-1，RTL 时镜像 -->
        <FluentIconChevronRight12Regular
          :size="12"
          class="fui-menu-flyout__item-chevron"
          aria-hidden="true"
        />
      </div>
    </RovingFocusItem>

    <DropdownMenuPortal>
      <!-- 外层只承担「捕获键盘 + hover 进入子菜单时取消关闭计时」，不参与定位 -->
      <div
        ref="submenuWrapper"
        @keydown.capture="onSubmenuKeydownCapture"
        @pointerenter="onSubmenuPointerEnter"
        @pointerleave="onSubmenuPointerLeave"
      >
        <DropdownMenuSubContent
          class="fui-menu-flyout__submenu-presenter"
          :style="[submenuLayerStyle]"
          :reference="triggerEl ?? undefined"
          :loop="true"
          :side-offset="0"
          :collision-padding="4"
          :aria-label="label ?? text"
        >
          <div class="fui-menu-flyout__submenu-body">
            <slot />
          </div>
        </DropdownMenuSubContent>
      </div>
    </DropdownMenuPortal>
  </DropdownMenuSub>
</template>

<!-- 非 scoped 理由同 menu-flyout-item.vue（行元素在 Teleport 的 presenter 子树内） -->
<style>
.fui-menu-flyout__item--submenu-open {
  /* MenuFlyoutSubItemBackgroundSubMenuOpened ← SubtleFillColorSecondaryBrush */
  background-color: var(--colorSubtleBackgroundHover);
}

.fui-menu-flyout__item--sub[data-disabled] {
  color: var(--colorNeutralForegroundDisabled);
}

/* MenuFlyoutItemChevronMargin = 24,0,0,-1 */
.fui-menu-flyout__item-chevron {
  flex: 0 0 auto;
  margin-inline-start: var(--spacingHorizontalXXL);
  margin-block-end: -1px;
  color: var(--colorNeutralForeground2);
}

/* SubMenuOpened / PointerOver 时 chevron 仍为 secondary；Pressed 降到 tertiary */
.fui-menu-flyout__item--sub:active .fui-menu-flyout__item-chevron {
  color: var(--colorNeutralForeground3);
}

.fui-menu-flyout__item--sub[data-disabled] .fui-menu-flyout__item-chevron {
  color: var(--colorNeutralForegroundDisabled);
}
</style>
