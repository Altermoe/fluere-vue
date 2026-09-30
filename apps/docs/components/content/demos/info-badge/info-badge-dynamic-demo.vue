<script setup lang="ts">
import { FluereInfoBadge, FluereNumberBox } from '@fluere-vue/ui'
import { ref } from 'vue'

/**
 * 对齐 Gallery 示例 4「InfoBadge with Dynamic Value」：
 * `NumberBox`（`Minimum=-1`、`SpinButtonPlacementMode=Inline`）驱动 `InfoBadge.Value`。
 *
 * Gallery 的 `ValueNumberBox_ValueChanged` 里有一道判断：
 * `if ((int)args.NewValue >= -1) DynamicInfoBadge.Value = (int)args.NewValue;`
 * —— 小于 -1 的值直接丢弃。本库的 `value` 对 `< 0` 一律回落到 Dot 形态，
 * 语义一致（-1 就是「不显示数字」的缺省值）。
 */
const INITIAL_VALUE = 1
const badgeValue = ref<number | null>(INITIAL_VALUE)

/** NumberBox 会给出 null（NaN，对应 WinUI 的 NaN）；映射到缺省值 -1 */
const value = () => badgeValue.value ?? -1
</script>

<template>
  <div class="flex flex-wrap gap-fluent-xl items-center justify-center">
    <FluereInfoBadge :value="value()" />

    <div class="ib-dynamic-demo__options">
      <FluereNumberBox
        v-model="badgeValue"
        header="InfoBadge Value"
        :min="-1"
        spin-button-placement-mode="inline"
      />
      <p class="text-sm text-colorNeutralForeground3">
        当前 Value：{{ value() }}（≥ 0 显示数字，&lt; 0 显示圆点）
      </p>
    </div>
  </div>
</template>

<style scoped>
.ib-dynamic-demo__options {
  inline-size: 260px;
}
</style>
