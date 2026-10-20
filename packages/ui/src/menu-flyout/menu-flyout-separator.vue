<script lang="ts">
 /**
 * FluereMenuFlyoutSeparator —— 对应 WinUI `MenuFlyoutSeparator`（0.6.1）。
 *
 * 规格（A 级：`winui3/release/2.5.1` 的 `CommonStyles/MenuFlyout_themeresources.xaml`）：
 *   - `MenuFlyoutSeparatorHeight = 1`
 *   - `MenuFlyoutSeparatorThemePadding = -4,1,-4,1`（Rectangle 的 Margin；
 *     负的水平值让分隔线横跨 presenter 的条目外边距区）
 *   - `MenuFlyoutSeparatorBackground = DividerStrokeColorDefaultBrush`
 *
 * Web 语义：reka `MenuSeparator` 输出 `role="separator"`；本组件只换视觉。
 */
</script>

<script setup lang="ts">
import { DropdownMenuSeparator } from 'reka-ui'

defineOptions({
  name: 'FluereMenuFlyoutSeparator',
})
</script>

<template>
  <DropdownMenuSeparator
    as-child
    class="fui-menu-flyout__separator"
  >
    <div />
  </DropdownMenuSeparator>
</template>

<!-- 非 scoped 理由同 menu-flyout-item.vue（Teleport 到 body 的 presenter 子树） -->
<style>
.fui-menu-flyout__separator {
  flex: 0 0 auto;
  block-size: 1px; /* MenuFlyoutSeparatorHeight */
  margin-block: 1px; /* MenuFlyoutSeparatorThemePadding 的纵向 1 */
  margin-inline: -4px; /* 横向 -4：横跨 presenter 的条目外边距区 */
  background-color: var(--dividerStrokeColorDefault);
}
</style>
