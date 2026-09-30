<script setup lang="ts">
import { FluentIconArrowSync20Regular, FluentIconImportant16Filled } from '@fluere-vue/icons'
import { FluereButton, FluereInfoBadge } from '@fluere-vue/ui'
import { ref } from 'vue'

/**
 * 对齐 Gallery 示例 3「Placing an InfoBadge Inside Another Control」：
 * 200×60 的按钮中央是 `SymbolIcon Symbol=Sync`，右上角叠一个 InfoBadge。
 *
 * 该示例的徽章**没有用 Style 预设**，而是显式写了两个属性，与本库的对应关系：
 *   `Background="#C42B1C"`（= `SystemFillColorCritical`）→ `severity="critical"`
 *   `IconSource=<FontIconSource Glyph="&#xF13C;">`（Segoe `StatusCircleExclamation` 的裸字形 "!"）
 *     → `:icon="FluentIconImportant16Filled"`（Fluent System Icons 的裸感叹号）
 * 注意它与 `CriticalIconInfoBadgeStyle` 的预置字形（`Symbol=Cancel` 的叉号）**不同** ——
 * Gallery 这里是显式覆盖 `IconSource` 的用法。
 *
 * 徽章是纯装饰元素（缺省 `aria-hidden`），提示语由按钮自身承担
 * （Gallery 在按钮上挂了 `ToolTipService.ToolTip="Refresh required"`）。
 */
const refreshCount = ref(0)
</script>

<template>
  <div class="flex flex-col gap-fluent-l items-center">
    <!--
      对应 XAML：Button 里套一层 Grid，徽章用 HorizontalAlignment=Right /
      VerticalAlignment=Top 贴到右上角。按钮与徽章在同一个定位上下文里，因此徽章随按钮移动。
    -->
    <div class="ib-overlay-demo__host">
      <FluereButton
        class="ib-overlay-demo__button"
        icon-only
        aria-label="Refresh required"
        title="Refresh required"
        :icon="FluentIconArrowSync20Regular"
        @click="refreshCount += 1"
      />
      <FluereInfoBadge
        class="ib-overlay-demo__badge"
        severity="critical"
        :icon="FluentIconImportant16Filled"
      />
    </div>

    <p class="text-sm text-colorNeutralForeground3">已刷新 {{ refreshCount }} 次</p>
  </div>
</template>

<style scoped>
.ib-overlay-demo__host {
  position: relative;
  inline-size: 200px;
  block-size: 60px;
}

.ib-overlay-demo__button {
  inline-size: 100%;
  block-size: 100%;
}

.ib-overlay-demo__badge {
  position: absolute;
  inset-block-start: 0;
  inset-inline-end: 0;
}
</style>
