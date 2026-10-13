<script lang="ts">
import type { Direction } from 'reka-ui'

/**
 * FluereToggleGroup 组件 Props 契约
 *
 * ## WinUI 没有 ToggleGroup 控件（这是本组件最重要的取舍）
 *
 * 在 `microsoft-ui-xaml` tag `winui3/release/2.5.1`（commit `ba3a8d5`，与
 * docs/style-spec.md §2 的版本地图一致）里只有 `ToggleButton`：
 *   · `src/controls/dev/CommonStyles/ToggleButton_themeresources.xaml`
 *   · `src/dxaml/xcp/dxaml/lib/ToggleButton_Partial.cpp`
 * **没有** `ToggleGroup.xaml` / `ToggleGroup.idl` / `ToggleGroup.cpp`
 * （`git ls-tree -r winui3/release/2.5.1 | grep -i togglegroup` 为空）。
 * WinUI 侧「一组切换按钮」只是多个 `ToggleButton` 并排放在容器里，
 * 分组互斥 / 多选由应用自己实现（Gallery 里的 `ToolBar`、`SegmentedControl` 类
 * 交互都是应用层拼的）。
 *
 * 因此本组件的分工是：
 *   · **视觉**：每一项都严格以 WinUI `ToggleButton` 为准 —— 每个 item 直接复用
 *     `FluereToggleButton` 的 SFC（同一份状态表 / 几何 / 焦点原语，不复制样式）；
 *   · **分组语义**：以 WAI-ARIA 的 toggle button group 契约 + reka-ui 为准
 *     （`role="group"`、roving tabindex、方向键 / Home / End、`aria-pressed`）。
 *     这一层没有 A 级 WinUI 源码可对，注释里只为「为什么这么选」负责。
 *
 * 交互底座复用 reka-ui 2.10.1 的 `ToggleGroupRoot`：
 *   · 产出 `role="group"` 的容器；
 *   · `type="single"`（`modelValue: string`）与 `type="multiple"`（`string[]`）两套取值语义；
 *   · roving focus（方向键 / Home / End、`loop`、`dir`、跳过禁用项）。
 * 单选组沿用 reka 的「可取消选中」语义：**再次点击已选中项会把值清成 `undefined`**
 * （ARIA toggle button 允许全部未按下，与 RadioGroup 的「必须选中一项」不同）；
 * 若要「不可全部取消」，在 `update:modelValue` 里把 `undefined` 回退成旧值即可
 * （文档页给了示例）。
 *
 * 受控 / 非受控：`modelValue` 传了就是受控（只认 prop）；不传（`undefined`）时
 * 原样交给 reka 自管，并用它抛回的 `update:modelValue` 回写本地状态。
 *
 * 无障碍：容器 `role="group"`，组无可见标题时用 `label` 给 `aria-label`；
 * 每一项是原生 `<button>` + `aria-pressed`（三态项由按钮自身输出 `mixed`），
 * 方向键在组内移动焦点、Home / End 跳首尾（跳过禁用项）。
 */
export interface FluereToggleGroupProps {
  /**
   * 当前取值（`v-model`）：单选为 `string`，多选为 `string[]`；不传时非受控
   */
  modelValue?: string | string[]

  /**
   * 非受控初始值（单选 `string` / 多选 `string[]`）
   */
  defaultValue?: string | string[]

  /**
   * 单选 / 多选。缺省时按 `modelValue` / `defaultValue` 是否为数组推断（对齐 reka 口径）：
   * 数组 → `'multiple'`，否则 → `'single'`。
   */
  type?: 'single' | 'multiple'

  /**
   * 是否禁用整组
   * @default false
   */
  disabled?: boolean

  /**
   * 排布方向：决定方向键用左右还是上下，也决定容器 flex 方向
   * @default 'horizontal'
   */
  orientation?: 'horizontal' | 'vertical'

  /**
   * 方向键在首尾项之间循环
   * @default true
   */
  loop?: boolean

  /**
   * 阅读方向（一般无需设置，由 ConfigProvider / LTR 推断）
   */
  dir?: Direction

  /**
   * 组内各项的统一尺寸档；项自己的 `size` 优先（本库扩展，WinUI 无对应资源）
   */
  size?: 'small' | 'medium' | 'large'

  /**
   * 组的可访问名称（等价 `aria-label`）。组内没有可见标题时建议提供。
   */
  label?: string
}
</script>

<script setup lang="ts">
import { ToggleGroupRoot as RekaToggleGroupRoot } from 'reka-ui'
import { computed, provide } from 'vue'
import { TOGGLE_GROUP_CONTEXT_KEY } from './context'

const props = withDefaults(defineProps<FluereToggleGroupProps>(), {
  modelValue: undefined,
  defaultValue: undefined,
  type: undefined,
  disabled: false,
  orientation: 'horizontal',
  loop: true,
  dir: undefined,
  size: undefined,
  label: undefined,
})

const emit = defineEmits<{
  /** 取值变化；单选组取消选中时载荷为 `undefined` */
  'update:modelValue': [value: string | string[] | undefined]
}>()

defineOptions({ name: 'FluereToggleGroup' })

/**
 * 单选 / 多选判定：显式 `type` 优先，否则按取值形状推断（`string[]` → multiple）。
 * 与 reka `useSingleOrMultipleValue#validateProps` 的口径一致，但把推断放在本组件，
 * 免得 `type` 缺省时既给了 `type: 'single'` 又收到数组而出现「值类型与语义不符」。
 */
const resolvedType = computed<'single' | 'multiple'>(() => {
  if (props.type !== undefined) {
    return props.type
  }
  const value = props.modelValue ?? props.defaultValue
  return Array.isArray(value) ? 'multiple' : 'single'
})

const rootClass = computed(() => ['fui-toggle-group'])

/** `data-orientation` 供样式与测试用；`aria-label` 只在给了 label 时输出 */
const rootAttrs = computed(() => ({
  'data-orientation': props.orientation,
  ...(props.label ? { 'aria-label': props.label } : {}),
}))

/** 转发 reka 的取值变化为组自身的 v-model 事件（受控 / 非受控同一条链） */
const onUpdateModelValue = (value: unknown) => {
  emit('update:modelValue', value as string | string[] | undefined)
}

/** 组级表现属性（尺寸档）下发；取值为 computed，保持响应性 */
provide(TOGGLE_GROUP_CONTEXT_KEY, { size: computed(() => props.size) })
</script>

<template>
  <RekaToggleGroupRoot
    :type="resolvedType"
    :model-value="props.modelValue"
    :default-value="defaultValue"
    :disabled="disabled"
    :orientation="orientation"
    :loop="loop"
    :dir="dir"
    :class="rootClass"
    v-bind="rootAttrs"
    @update:model-value="onUpdateModelValue"
  >
    <slot />
  </RekaToggleGroupRoot>
</template>

<style scoped>
/* ------------------------------------------------------------------ */
/* 组容器：WinUI 没有 ToggleGroup 控件（见文件头），排布与间距是本库       */
/* 自定项，取库内 spacing token；每项的视觉仍由 FluereToggleButton 负责。  */
/* 方向键 / roving focus 由 reka ToggleGroupRoot（RovingFocusGroup）承担。 */
/* ------------------------------------------------------------------ */

.fui-toggle-group {
  display: inline-flex;
  align-items: center;
  /* 相邻切换按钮的间距：取水平 spacing 最小档 4px（组内按钮本就紧邻排列） */
  gap: var(--spacingHorizontalXS);
}

/* 纵向组：竖排 + 垂直间距最小档，项目左对齐而非被拉伸 */
.fui-toggle-group[data-orientation='vertical'] {
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacingVerticalXS);
}
</style>
