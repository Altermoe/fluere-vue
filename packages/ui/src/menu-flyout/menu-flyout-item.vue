<script lang="ts">
/**
 * FluereMenuFlyoutItem —— 对应 WinUI `MenuFlyoutItem`（0.6.1）。
 *
 * ## 规格（A 级：`winui3/release/2.5.1` 的 `CommonStyles/MenuFlyout_themeresources.xaml`）
 *
 * 模板 `DefaultMenuFlyoutItemStyle` 的结构：`Grid LayoutRoot`（Padding 11,8,11,9；
 * Margin 4,2,4,2；CornerRadius 4；Background 透明）→ 可选 `IconRoot`（16×16）+ 文本
 * + 可选 `KeyboardAcceleratorTextBlock`（12px CaptionTextBlockStyle，Margin 24,4,0,0）。
 *
 * 图标 / 勾选列的**面板级占位**：`MenuFlyoutPresenter` 统计 `ContainsIconItems` /
 * `ContainsToggleItems`，普通条目的文本通过 `TextBlock.Margin` 让出 28px（单列）或
 * 56px（两列）。本组件从 `MENU_LAYOUT_KEY` 取最近面板的统计结果，用占位 span 复现。
 *
 * 状态（VisualState，全部是 Setter、不是 Storyboard）：
 *   Normal / PointerOver（`SubtleFillColorSecondaryBrush`）/ Pressed
 *   （`SubtleFillColorTertiaryBrush`）/ Disabled（前景 `TextFillColorDisabledBrush`）。
 * 因此本组件**不做背景过渡**（WinUI 在这里就是瞬切，切到 Fluent token 时也保持瞬切）。
 *
 * 焦点：`UseSystemFocusVisuals = True` → 复用 `useFocusVisual` 双层焦点矩形。
 */
export type { FluereMenuFlyoutItemProps } from './types'
</script>

<script setup lang="ts">
import { DropdownMenuItem } from 'reka-ui'
import { computed, inject, useSlots } from 'vue'
import { useFocusVisual } from '../focus-visual/use-focus-visual'
import { EMPTY_SUBMENU_SCOPE, MENU_FLYOUT_KEY, MENU_SUBMENU_SCOPE_KEY } from './context'
import { useMenuLayout } from './layout'
import type { FluereMenuFlyoutItemProps, FluereMenuFlyoutSelectEventArgs } from './types'

defineOptions({
  name: 'FluereMenuFlyoutItem',
})

const props = withDefaults(defineProps<FluereMenuFlyoutItemProps>(), {
  text: undefined,
  icon: undefined,
  keyboardAcceleratorText: undefined,
  disabled: false,
  value: undefined,
})

const emit = defineEmits<{
  /** 条目被激活（鼠标 / Enter / Space）；载荷与根组件 `select` 相同 */
  select: [args: FluereMenuFlyoutSelectEventArgs]
}>()

const slots = useSlots()
const focusVisual = useFocusVisual()
const layout = useMenuLayout()
const root = inject(MENU_FLYOUT_KEY, null)
const submenuScope = inject(MENU_SUBMENU_SCOPE_KEY, EMPTY_SUBMENU_SCOPE)
const hasIconSlot = computed(() => props.icon !== undefined || slots.icon !== undefined)

/** 是否渲染图标列（自身有图标，或同面板其它条目有图标 → 需要占位对齐） */
const showIconColumn = (): boolean => hasIconSlot.value || layout.hasIcon()

/** 菜单项被激活：先抛载荷，再按 `closeOnSelect` 决定是否让 reka 关闭菜单 */
const onSelect = (event: Event): void => {
  if (props.disabled) {
    event.preventDefault()
    return
  }
  const payload: FluereMenuFlyoutSelectEventArgs = {
    value: props.value,
    text: props.text,
  }
  root?.notifySelect(payload)
  emit('select', payload)
  if (root !== null && !root.closeOnSelect()) {
    // reka 的 MenuItem 在 select 事件后默认关闭；preventDefault 可保持菜单打开
    event.preventDefault()
  }
}

/** hover / 键盘焦点进入普通条目时，关闭同级已展开的子菜单 */
const closeSiblingSubmenus = (): void => {
  submenuScope.closeChildSubmenus()
}
</script>

<template>
  <!--
    `as-child`：让行元素由本组件渲染（拿到 scoped 的 data-v-*），reka 只负责
    把 role / tabindex / 选中事件 / 高亮状态合并到它上面。
  -->
  <DropdownMenuItem
    as-child
    :disabled="disabled"
    :text-value="text"
    @select="onSelect"
  >
    <div
      :class="[focusVisual.class, 'fui-menu-flyout__item']"
      :style="focusVisual.style"
      @pointerenter="closeSiblingSubmenus"
      @focus="closeSiblingSubmenus"
    >
      <!-- MenuFlyoutPresenter.ContainsToggleItems → 普通条目的勾选列占位 28 -->
      <span
        v-if="layout.hasToggle()"
        class="fui-menu-flyout__item-check-placeholder"
        aria-hidden="true"
      />
      <!-- MenuFlyoutPresenter.ContainsIconItems → 图标列占位 28（自身无图标时留空） -->
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
        <slot>{{ text }}</slot>
      </span>
      <span
        v-if="keyboardAcceleratorText"
        class="fui-menu-flyout__item-accelerator"
      >
        {{ keyboardAcceleratorText }}
      </span>
    </div>
  </DropdownMenuItem>
</template>

<!--
  非 scoped 的理由：行元素虽然由本组件模板渲染，但它是 Teleport 到 body 的
  `MenuFlyoutPresenter` 子树的一部分，宿主是 reka 的 `MenuContent`；行内样式用
  `.fui-menu-flyout__` 私有前缀避免全局污染（AGENTS〈scoped 失效陷阱〉）。
-->
<style>
.fui-menu-flyout__item {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  /* MenuFlyoutItemMargin = 4,2,4,2（同值 token） */
  margin: var(--spacingVerticalXXS) var(--spacingHorizontalXS);
  /*
   * MenuFlyoutItemThemePadding = 11,8,11,9。行向 11 / 下 9 在 token 表没有同值档，
   * 落组件局部变量（在 presenter 上声明，见 menu-flyout.vue）；块向上 8 = --spacingVerticalS。
   */
  padding: var(--spacingVerticalS) var(--fui-menu-flyout-item-padding-inline, 11px)
    var(--fui-menu-flyout-item-padding-block-end, 9px);
  border-radius: var(--borderRadiusMedium); /* ControlCornerRadius = 4 */
  background-color: transparent;
  color: var(--colorNeutralForeground1);
  line-height: var(--lineHeightBase300);
  text-align: start;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  cursor: default;
}

/* PointerOver = MenuFlyoutItemBackgroundPointerOver ← SubtleFillColorSecondaryBrush */
.fui-menu-flyout__item:hover {
  background-color: var(--colorSubtleBackgroundHover);
}

/* Pressed = MenuFlyoutItemBackgroundPressed ← SubtleFillColorTertiaryBrush */
.fui-menu-flyout__item:active {
  background-color: var(--colorSubtleBackgroundPressed);
}

/*
 * Disabled：背景透明、前景 TextFillColorDisabledBrush。
 * `[data-disabled]` 由 reka 的 MenuItem 输出；hover / active 规则要显式排除它。
 */
.fui-menu-flyout__item[data-disabled] {
  background-color: transparent;
  color: var(--colorNeutralForegroundDisabled);
  cursor: not-allowed;
}

.fui-menu-flyout__item[data-disabled]:hover,
.fui-menu-flyout__item[data-disabled]:active {
  background-color: transparent;
}

.fui-menu-flyout__item-check-placeholder,
.fui-menu-flyout__item-icon {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  /* MenuFlyoutItemPlaceholderThemeThickness = 28,0,0,0（图标 16 + 间隙 12） */
  inline-size: 28px;
  min-inline-size: 28px;
}

.fui-menu-flyout__item-text {
  flex: 1 1 auto;
  min-inline-size: 0;
  /* TextTrimming = Clip（不是 Ellipsis） */
  overflow: hidden;
  white-space: nowrap;
  text-overflow: clip;
}

/* CaptionTextBlockStyle = 12/16；Margin 24,4,0,0 */
.fui-menu-flyout__item-accelerator {
  flex: 0 0 auto;
  margin-inline-start: var(--spacingHorizontalXXL);
  color: var(--colorNeutralForeground2);
  font-size: var(--fontSizeBase200);
  line-height: var(--lineHeightBase200);
  text-align: end;
}

.fui-menu-flyout__item[data-disabled] .fui-menu-flyout__item-accelerator {
  color: var(--colorNeutralForegroundDisabled);
}
</style>
