<script lang="ts">
 /**
 * 内部递归列表 —— 渲染 `FluereNavigationView` 收集出来的导航节点树。
 *
 * **不是公开组件**（不导出、无 `Fluere` 前缀）。存在的理由：导航树深度不限
 * （`#children` 里可以继续嵌 `#children`），只有递归组件能把「同一套行渲染 + 同一套
 * 键盘语义」一次性表达出来；父组件若手写展开逻辑会随深度爆炸。
 *
 * ## 与 WinUI 的对应
 *
 * | WinUI | 本组件 |
 * | --- | --- |
 * | `MenuItemsHost`（`ItemsRepeater`，`NavigationView.xaml:365-368`） | 根 `<ul role="list">` |
 * | `NavigationViewItemMenuItemsHost`（子项 `ItemsRepeater`，`:463-467`） | 嵌套 `<ul role="list">` |
 * | `NavigationViewItem`（`AutomationControlType::ListItem`，`NavigationViewItemAutomationPeer.cpp:73-76`） | `<li>` 里的 `<button role>` + `aria-current` |
 * | `NavigationViewItemHeader`（`NavigationView.xaml:564`，高 40） | `<li>` + `<span>`（不可聚焦、对 AT 隐藏） |
 * | `NavigationViewItemSeparator`（`:600`，1px） | `<li role="separator">` |
 *
 * ## 键盘：为什么可以用「一条扁平 roving 列表」代替源码里的跨层 `FocusManager`
 *
 * 上游的 Up/Down 由 **XAML XYFocus 默认行为**承担，只在「跨层」时抢过来手动聚焦
 * （`NavigationView.cpp:2781-2859`）：Up 从子项回到父项、Down 从展开的父项进第一个子项、
 * Up 到上一项时若上一项展开则进它的最后一个子项。这四条在**渲染顺序**上与
 * 「扁平列表里往前/往后一格」完全一致（折叠的子项根本不渲染）：
 *
 * | 场景 | 源码行为 | 扁平 roving 列表 |
 * | --- | --- | --- |
 * | Down，父项已展开 | 聚焦第一个子项 | 下一个元素 = 第一个子项 ✓ |
 * | Down，父项已折叠 | 不处理 → XYFocus 给视觉下方元素 | 下一个元素 = 下一个兄弟 ✓ |
 * | Up，在某层首项 | 聚焦父项（`:2830-2836`） | 上一个元素 = 父项 ✓ |
 * | Up，上一项已展开 | 聚焦其子 repeater 的最后一个元素（`:2802-2819`） | 上一个元素 = 最后一个可见后代 ✓ |
 * | Home / End | 根 repeater 首 / 末可聚焦元素（`:2906-2950`） | reka 的 `first` / `last` ✓ |
 *
 * 因此这里用 reka `RovingFocusGroup` 的一条垂直列表（`loop` 关，与 WinUI 一致 ——
 * 源码里没有回绕）承担全部方向键，**不手写跨层焦点逻辑**。这条等价关系是本组件
 * 唯一一处「用底座换实现量」的地方，逐条列在上表里以便复核。
 *
 * `RovingFocusItem` 的 `focusable` 绑到 `!disabled`，与上游「禁用项不进焦点环」一致
 * （`SharedHelpers::IsFocusableElement`，`NavigationView.cpp:2876`）。
 */
</script>

<script setup lang="ts">
import { RovingFocusItem } from 'reka-ui'
import { computed, defineComponent, type PropType, type VNode } from 'vue'
import type { NavigationNode } from './collection'
import { useNavigationViewContext } from './context'

defineOptions({ name: 'NavigationViewItems' })

const props = withDefaults(
  defineProps<{
    /** 本层要渲染的节点（`item` / `header` / `separator`） */
    nodes: NavigationNode[]
    /** 层级深度：0 = 顶层项。用于缩进（`Depth() * 31`，见 `constants.ts`）与「顶层项强制折叠」判定 */
    depth?: number
  }>(),
  { depth: 0 },
)

const ctx = useNavigationViewContext()

/**
 * 把「返回 vnode 数组的插槽函数」渲染出来。
 *
 * 为什么需要它：父组件在渲染期读子项 vnode，拿到的是 `slots.icon` / `slots.default`
 * 这类**函数**（不是渲染结果）。要在本组件里渲染它们，最直接的写法就是一个
 * 函数式组件（Vue 3 允许 render 返回数组 ⇒ 渲染成 Fragment）。
 *
 * 注意 `render` 是必传的普通 prop，不是插槽：模板里用 `<RenderVNodes :render="…" />`。
 */
const RenderVNodes = defineComponent({
  name: 'NavigationViewRenderVNodes',
  props: {
    render: {
      type: Function as PropType<() => VNode[]>,
      default: undefined,
    },
  },
  setup: (renderProps) => () => (renderProps.render ? renderProps.render() : []),
})

const isSelected = (node: NavigationNode): boolean =>
  node.value !== undefined && node.value === ctx.selectedValue.value

/** 选中指示条画在哪个节点上（可能是选中项的某个可见祖先，见 `context.ts` 的说明） */
const showIndicator = (node: NavigationNode): boolean =>
  node.value !== undefined && node.value === ctx.indicatorValue.value

/**
 * 祖先链上是否有选中项。
 *
 * 优先用显式传入的 `isChildSelected`（逃生口），否则由父组件在渲染期推导
 * （`collection.ts` 的 `hasSelectedDescendant`）后写进节点描述 —— 见 `types.ts` 里
 * `FluereNavigationViewItemProps.isChildSelected` 的「与 WinUI 的差异」。
 */
const isChildSelected = (node: NavigationNode): boolean => node.isChildSelected ?? false

const hasChildren = (node: NavigationNode): boolean =>
  node.children.length > 0 || node.hasUnrealizedChildren

const isExpanded = (node: NavigationNode): boolean => ctx.resolveExpanded(node, props.depth)

/** 缩进：`Depth() * c_itemIndentation`（`NavigationViewItemHeader.cpp:76-84`） */
const indentStyle = computed(() => ({
  '--fui-navigation-view-depth': String(props.depth),
}))

/**
 * Enter 键：`HandleKeyEventForNavigationViewItem:2746-2749`。
 *
 * 上游只在 `!args.KeyStatus().WasKeyDown`（即**非长按重复**）时处理 Enter / Space
 * （`NavigationView.cpp:2719-2731`）。Web 侧对应 `event.repeat`，照抄这条以免按住键连发。
 */
const onEnter = (event: KeyboardEvent, node: NavigationNode): void => {
  if (event.repeat) {
    return
  }
  event.preventDefault()
  ctx.invoke(node, 'keyboard')
}

/**
 * Space 键：`HandleKeyEventForNavigationViewItem:2750-2763`。
 *
 * ⚠️ 上游**先查 Alt**：`Alt+Space` 是系统窗口菜单的保留快捷键，NavigationView 明确
 * **不处理**它（`:2752-2761`）。Web 侧同样跳过，避免吞掉宿主的组合键。
 */
const onSpace = (event: KeyboardEvent, node: NavigationNode): void => {
  if (event.altKey || event.repeat) {
    return
  }
  event.preventDefault()
  ctx.invoke(node, 'keyboard')
}
</script>

<template>
  <ul
    class="fui-navigation-view__list"
    role="list"
    :style="indentStyle"
  >
    <template
      v-for="node in nodes"
      :key="node.key"
    >
      <!-- 分组标题：WinUI `NavigationViewItemHeader`（高 40；紧凑且顶层时折叠成 0 高） -->
      <li
        v-if="node.kind === 'header'"
        class="fui-navigation-view__header"
        :class="{ 'is-collapsed': ctx.iconOnly.value && depth === 0 }"
      >
        <span class="fui-navigation-view__header-text">
          <RenderVNodes :render="node.renderContent" />
          <template v-if="!node.renderContent">{{ node.content }}</template>
        </span>
      </li>

      <!-- 分隔线：WinUI `NavigationViewItemSeparator`（1px，`DividerStrokeColorDefaultBrush`） -->
      <li
        v-else-if="node.kind === 'separator'"
        class="fui-navigation-view__separator"
        role="separator"
        aria-orientation="horizontal"
      />

      <!-- 导航项 -->
      <li
        v-else
        class="fui-navigation-view__row"
      >
        <RovingFocusItem
          as-child
          :focusable="!node.disabled"
          :active="isSelected(node)"
        >
          <button
            type="button"
            class="fui-navigation-view__item"
            :class="[
              ctx.focusVisualClass,
              {
                'is-selected': isSelected(node),
                'is-child-selected': !isSelected(node) && isChildSelected(node),
                'is-icon-only': ctx.iconOnly.value,
              },
            ]"
            :style="ctx.focusVisualStyle"
            :disabled="node.disabled"
            :aria-current="isSelected(node) ? 'page' : undefined"
            :aria-expanded="
              hasChildren(node) && !ctx.hideChevron.value ? isExpanded(node) : undefined
            "
            :aria-label="node.ariaLabel"
            :title="ctx.iconOnly.value ? node.content || node.ariaLabel : undefined"
            :data-value="String(node.value)"
            @click="ctx.invoke(node, 'pointer')"
            @keydown.enter="onEnter($event, node)"
            @keydown.space="onSpace($event, node)"
          >
            <!-- 选中指示条：WinUI `SelectionIndicator`（3×16、圆角 2，`themeresources:220-222`） -->
            <span
              class="fui-navigation-view__indicator"
              :class="{ 'is-visible': showIndicator(node) }"
              aria-hidden="true"
            />

            <!-- 图标盒：`IconColumn.Width = SmallerIconWidth`（48-8=40），盒高 16（`:611-613`） -->
            <span
              v-if="node.renderIcon || $slots.icon"
              class="fui-navigation-view__icon"
              aria-hidden="true"
            >
              <RenderVNodes :render="node.renderIcon" />
            </span>

            <!-- 文本：紧凑且关闭时视觉隐藏但仍留在无障碍树里（可访问名不丢） -->
            <span class="fui-navigation-view__label">
              <RenderVNodes :render="node.renderContent" />
              <template v-if="!node.renderContent">{{ node.content }}</template>
            </span>

            <!-- 展开箭头：WinUI `AnimatedIcon` + fallback 字形 E70D（`:617-626`） -->
            <span
              v-if="hasChildren(node) && !ctx.hideChevron.value"
              class="fui-navigation-view__chevron"
              :class="{ 'is-expanded': isExpanded(node) }"
              aria-hidden="true"
            >
              <svg
                viewBox="0 0 12 12"
                width="12"
                height="12"
                focusable="false"
              >
                <path
                  d="M2 4.5 6 8.5 10 4.5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </span>
          </button>
        </RovingFocusItem>

        <!-- 子项：仅展开时渲染（对应 `ShowHideChildrenItemsRepeater`，`NavigationView.cpp:5595-5620`） -->
        <NavigationViewItems
          v-if="node.children.length > 0 && isExpanded(node)"
          :nodes="node.children"
          :depth="depth + 1"
        />
      </li>
    </template>
  </ul>
</template>

<style scoped>
/* 行视觉（列表 / 项 / 指示条 / 图标盒 / 文本 / chevron / 分组标题 / 分隔线）在
   **非 scoped** 的 `navigation-view.css` 里 —— 理由见该文件头（同一套行由本组件与
   父组件分别渲染，两个 scopeId 不同，各写一份 scoped 块必然漂移）。
   本组件不额外声明行样式。 */
</style>
