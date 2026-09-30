<script lang="ts">
/**
 * FluereSmokeLayer 遮罩层 Props 契约
 *
 * 设计规范来源：WinUI 3 / Windows App SDK
 *   microsoft-ui-xaml `winui3/release/2.5.1`（commit ba3a8d5，本地快照 temp/winui-src）
 *
 *  - `src/controls/dev/CommonStyles/ContentDialog_themeresources.xaml`：
 *    模板里 `SmokeLayerBackground` 是一个 `Rectangle`，`Fill = {ThemeResource ContentDialogSmokeFill}`；
 *    `ContentDialogSmokeFill` ← `SmokeFillColorDefaultBrush` ← `SmokeFillColorDefault`
 *    （Light / Dark 同为 `#4D000000`，30% 黑）。
 *  - `src/dxaml/xcp/dxaml/lib/ContentDialog_Partial.cpp#PrepareSmokeLayer`：遮罩层是
 *    **第二个 Popup**（整窗尺寸的 Rectangle），位于 dialog popup 之下；弹出时
 *    `IsHitTestVisible` 默认 true（关闭过渡期间才临时置 false），即**遮罩层自己吃掉指针输入**。
 *  - `src/dxaml/xcp/dxaml/lib/LayoutTransition_partial.cpp`
 *    `ContentDialogOpenCloseThemeTransition::CreateStoryboardImpl`（约 2251 行起）：
 *    遮罩层作为独立目标参与 popup 的 Load / Unload 过渡，**只动 Opacity、不缩放**：
 *      Load  ：0 → 1，begintime 0，duration `s_OpacityChangeDuration` = 83ms，linear
 *      Unload：1 → 0，begintime 0，duration 83ms，linear
 *    （同一条 Storyboard 的 dialog 目标才带 ScaleX/Y 1.05↔1.0 的 250ms / 167ms
 *      cubic-bezier(0,0,0,1)；83ms / 167ms / 250ms 与 `Common_themeresources_any.xaml` 的
 *      `ControlFasterAnimationDuration` / `ControlFastAnimationDuration` /
 *      `ControlNormalAnimationDuration` 一一对应。）
 *
 * WinUI 资源名 → Fluent token 映射：
 *   ContentDialogSmokeFill ← SmokeFillColorDefault（#4D000000，30% 黑）
 *     → `var(--colorBackgroundOverlay)`（Light rgba(0,0,0,0.4) / Dark rgba(0,0,0,0.5)）
 *   语义位唯一命中，但 alpha 比 WinUI 高 10% / 20%；需要严格对齐实机时覆盖组件局部变量：
 *     .fui-smoke { --fui-smoke-fill: rgba(0, 0, 0, 0.3); }
 *
 * 与 WinUI 的差异（逐条记录）：
 *  - WinUI 遮罩层是独立 Popup，本组件用 Vue `<Teleport>` + `<Presence>` 表达，语义等价；
 *  - WinUI 关闭过渡期间会把遮罩层置为不可命中（`IsHitTestVisible=false`），Web 侧改由
 *    ContentDialog 在 closing 期间对两层的根元素统一 `pointer-events: none`（同一效果）；
 *  - 高对比度主题（WinUI HC：`SystemColorWindowColor` @ 0.8）本轮不实现，属已知缺口。
 */
export interface FluereSmokeLayerProps {
  /**
   * 是否显示遮罩层（驱动进入 / 退出淡入淡出）
   * @default false
   */
  open?: boolean

  /**
   * Teleport 目标（CSS 选择器或元素）
   * @default 'body'
   */
  to?: string | HTMLElement

  /**
   * 显示期间是否锁定 body 滚动（避免滚轮穿透到背后的应用）
   * @default true
   */
  lockScroll?: boolean
}
</script>

<script setup lang="ts">
import { Presence, useBodyScrollLock } from 'reka-ui'
import { computed, watch } from 'vue'
import FluerePortal from './portal.vue'

defineOptions({ name: 'FluereSmokeLayer' })

const props = withDefaults(defineProps<FluereSmokeLayerProps>(), {
  open: false,
  to: 'body',
  lockScroll: true,
})

/**
 * body 滚动锁：直接复用 reka 的 `useBodyScrollLock`（内部按实例计数、
 * 已在客户端能力上做了守卫），与 reka `DialogOverlayImpl` 的用法一致。
 */
const scrollLocked = useBodyScrollLock(false)
const shouldLockScroll = computed(() => props.open && props.lockScroll)
watch(
  shouldLockScroll,
  (value) => {
    scrollLocked.value = value
  },
  { immediate: true },
)
</script>

<template>
  <FluerePortal :to="to">
    <Presence :present="open">
      <div
        class="fui-smoke"
        :data-state="open ? 'open' : 'closed'"
        aria-hidden="true"
      />
    </Presence>
  </FluerePortal>
</template>

<style scoped>
/* 明暗主题由 tokens.css 的 light-dark() + color-scheme 自动切换 */
.fui-smoke {
  /* WinUI 资源：ControlFasterAnimationDuration / s_OpacityChangeDuration = 83ms。
     Fluent 2 Web 的时长档位没有 83ms（UltraFast 50 / Faster 100），故按组件局部变量落地 */
  --fui-smoke-fade-duration: 83ms;
  /* 层级：与弹窗内容层同层（1000），靠 Teleport 的挂载顺序（遮罩先、弹窗后）
     决定绘制次序；留出同层空间是为了让弹窗内部再 Teleport 的浮层
     （如 Combobox 下拉，同为 z-index 1000）仍能盖在弹窗之上 */
  --fui-smoke-z: 1000;
  /* WinUI ContentDialogSmokeFill ← SmokeFillColorDefault → colorBackgroundOverlay */
  --fui-smoke-fill: var(--colorBackgroundOverlay);

  position: fixed;
  inset: 0;
  z-index: var(--fui-smoke-z);
  background: var(--fui-smoke-fill);
  /* 遮罩层自己承接指针输入（WinUI 的 SmokeLayerBackground 默认命中）：
     点击遮罩不关闭弹窗，但也不允许穿透到背后应用 */
  pointer-events: auto;
  overscroll-behavior: contain;
}

.fui-smoke[data-state='open'] {
  animation: fui-smoke-in var(--fui-smoke-fade-duration) linear both;
}

.fui-smoke[data-state='closed'] {
  animation: fui-smoke-out var(--fui-smoke-fade-duration) linear both;
}

@keyframes fui-smoke-in {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes fui-smoke-out {
  from {
    opacity: 1;
  }

  to {
    opacity: 0;
  }
}

/* 减少动效：去掉淡入淡出，静态形态就是「最终透明度」，不留中间态。
   关闭时 reka 的 Presence 检测不到 animation-name 会立即卸载，符合预期 */
@media (prefers-reduced-motion: reduce) {
  .fui-smoke[data-state] {
    animation: none;
  }
}
</style>
