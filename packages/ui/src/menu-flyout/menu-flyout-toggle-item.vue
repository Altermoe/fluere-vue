<script lang="ts">
/**
 * FluereMenuFlyoutToggleItem —— 对应 WinUI `ToggleMenuFlyoutItem`（0.6.1）。
 *
 * ## 规格（A 级：`winui3/release/2.5.1` 的 `CommonStyles/MenuFlyout_themeresources.xaml`）
 *
 * 模板 `DefaultToggleMenuFlyoutItemStyle`：三列 Grid（CheckGlyph 列 / IconRoot + 文本列 /
 * 加速键列）。`CheckGlyph` 是 `FontIcon Glyph="E73E"`（12px，勾选字形），
 * `Margin="0,0,16,0"` → 勾选列固定占 28px；未选中时 `Opacity = 0`
 * （`Checked` 状态才置 1），所以行宽不随勾选状态跳动。
 *
 * 勾选状态机：`Checked` / `Unchecked` / `CheckedWithIcon` / `UncheckedWithIcon` 四个状态
 * 只差「勾选可见性」与「图标列 / 文本占位」，几何与画刷和普通条目同源。
 *
 * Web 语义：reka 的 `MenuCheckboxItem` 输出 `role="menuitemcheckbox"` +
 * `aria-checked`，与 WinUI TogglePattern 的 AT 语义等价。
 */
export type { FluereMenuFlyoutToggleItemProps } from './types'
</script>

<script setup lang="ts">
import { FluentIconCheckmark12Regular } from '@fluere-vue/icons'
import { DropdownMenuCheckboxItem } from 'reka-ui'
import { computed, inject, ref, useSlots } from 'vue'
import { useFocusVisual } from '../focus-visual/use-focus-visual'
import { EMPTY_SUBMENU_SCOPE, MENU_FLYOUT_KEY, MENU_SUBMENU_SCOPE_KEY } from './context'
import { useMenuLayout } from './layout'
import type { FluereMenuFlyoutSelectEventArgs, FluereMenuFlyoutToggleItemProps } from './types'

defineOptions({
  name: 'FluereMenuFlyoutToggleItem',
})

const props = withDefaults(defineProps<FluereMenuFlyoutToggleItemProps>(), {
  text: undefined,
  icon: undefined,
  keyboardAcceleratorText: undefined,
  disabled: false,
  checked: undefined,
  value: undefined,
})

const emit = defineEmits<{
  /** 勾选状态回写（`v-model:checked`） */
  'update:checked': [value: boolean]
  /** 勾选结果变化（与 `update:checked` 同时抛，便于非 v-model 场景） */
  'change': [value: boolean]
  /** 条目被激活；`checked` 是**切换后**的勾选状态 */
  'select': [args: FluereMenuFlyoutSelectEventArgs]
}>()

const slots = useSlots()
const focusVisual = useFocusVisual()
const layout = useMenuLayout()
const root = inject(MENU_FLYOUT_KEY, null)
const submenuScope = inject(MENU_SUBMENU_SCOPE_KEY, EMPTY_SUBMENU_SCOPE)

const innerChecked = ref(props.checked ?? false)
/** 受控（`checked` Prop 存在）以 Prop 为准；非受控跟随内部状态 */
const isChecked = computed<boolean>(() =>
  props.checked === undefined ? innerChecked.value : props.checked,
)
const hasIconSlot = computed(() => props.icon !== undefined || slots.icon !== undefined)
const showIconColumn = (): boolean => hasIconSlot.value || layout.hasIcon()

const onUpdateChecked = (value: boolean): void => {
  innerChecked.value = value
  emit('update:checked', value)
  emit('change', value)
}

const onSelect = (event: Event): void => {
  if (props.disabled) {
    event.preventDefault()
    return
  }
  // reka 的 select 先于内置切换触发，因此这里的新状态是取反后的值
  const nextChecked = !isChecked.value
  const payload: FluereMenuFlyoutSelectEventArgs = {
    value: props.value,
    text: props.text,
    checked: nextChecked,
  }
  root?.notifySelect(payload)
  emit('select', payload)
  if (root !== null && !root.closeOnSelect()) {
    event.preventDefault()
  }
}

const closeSiblingSubmenus = (): void => {
  submenuScope.closeChildSubmenus()
}
</script>

<template>
  <DropdownMenuCheckboxItem
    as-child
    :model-value="isChecked"
    :disabled="disabled"
    :text-value="text"
    @update:model-value="onUpdateChecked"
    @select="onSelect"
  >
    <div
      :class="[focusVisual.class, 'fui-menu-flyout__item', 'fui-menu-flyout__item--toggle']"
      :style="focusVisual.style"
      @pointerenter="closeSiblingSubmenus"
      @focus="closeSiblingSubmenus"
    >
      <!-- CheckGlyph 列：无论勾选与否都占 28（Margin 0,0,16,0；未选中 Opacity 0） -->
      <span
        class="fui-menu-flyout__item-check"
        aria-hidden="true"
      >
        <FluentIconCheckmark12Regular
          :size="12"
          class="fui-menu-flyout__item-check-glyph"
        />
      </span>
      <!-- 图标列：自身有图标或同面板其它条目有图标时占位 28 -->
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
  </DropdownMenuCheckboxItem>
</template>

<!-- 非 scoped 理由同 menu-flyout-item.vue（Teleport + reka 的 MenuCheckboxItem 根节点） -->
<style>
/* 勾选列 = 12 字形 + 16 右间距 = 28（MenuFlyoutItemPlaceholderThemeThickness 同宽） */
.fui-menu-flyout__item-check {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  inline-size: 28px;
  min-inline-size: 28px;
}

.fui-menu-flyout__item-check-glyph {
  /* CheckGlyph：FontSize 12 / Foreground = MenuFlyoutSubItemChevron（TextFillColorSecondary） */
  color: var(--colorNeutralForeground2);
  opacity: 0;
}

.fui-menu-flyout__item--toggle[data-state='checked'] .fui-menu-flyout__item-check-glyph {
  opacity: 1;
}

/* 禁用态：勾选字形跟文字一起走 TextFillColorDisabledBrush */
.fui-menu-flyout__item--toggle[data-disabled] .fui-menu-flyout__item-check-glyph {
  color: var(--colorNeutralForegroundDisabled);
}
</style>
