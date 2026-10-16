<script setup lang="ts">
/**
 * 任务栏（0.5.5 的**最小可用**版本）。
 *
 * ## 本期范围（评审确认的取舍）
 *
 * 完整 `Taskbar`（居中图标组：开始 / 搜索 / 已固定入口、hover / active 指示条）属
 * **0.5.6**。本期只做达成「窗口可还原」闭环所必需的两件事：
 *   ① 高度占位（`--shell-taskbar-h`，来源见 apps/docs/assets/docs-shell.css）；
 *   ② **窗口入口**：窗口最小化 / 关闭时提供还原入口，常规态呈激活指示。
 *
 * 之所以不能只留一条空占位条：0.5.5 的 caption「最小化」与「关闭」都要求「不做成坏按钮」
 * （docs/todo.md 0.5.2 验收要点），两者都需要一个能把它找回来的地方。
 *
 * ## 层级
 *
 * `--zIndexShell`(1500) 是本仓**最高的常规档**（只有 ToolTip 的 1400 低于它，
 * 见 explorer-layout.md §4 记录的已知冲突）。任务栏是全站唯一允许出现在该档的层。
 *
 * ## 为什么不用 `FluereTooltip`
 *
 * 任务栏里的按钮若挂 `FluereTooltip`，提示会被任务栏自己盖住
 * （`--zIndexTooltip` 1400 < `--zIndexShell` 1500）。explorer-layout.md §4 把这个冲突
 * 的两种解法都留给 0.5.6 裁决，并**明文禁止**在外壳里写裸 z-index 绕过。
 * 因此本期只用原生 `title` 属性提供悬停说明。
 *
 * ## 移动端
 *
 * 不回仿桌面（apps/docs/README.md〈WindowsOS 仿真边界〉）：整条任务栏由 CSS 在
 * < 64rem 时 `display: none`（**不是**模板 `v-if` —— 视口判据在 SSR 下拿不到真实值，
 * 用 `v-if` 会让服务端与客户端结构不一致）。见 desktop-shell.vue。
 *
 * ## 已知缺口：高对比度（HC）未适配
 *
 * 任务栏的 Mica 近似底色与上缘分隔线沿用明暗两套令牌，HC 下不切换为 `Canvas` /
 * `CanvasText`；激活指示条也保留品牌色。与外壳其余自绘部分同属一处缺口，
 * 说明见 desktop-shell.vue 文件头，补齐排期见 docs/todo.md 0.9.5。
 */

import { FluentIconWindow24Regular } from '@fluere-vue/icons'
import { FluereButton } from '@fluere-vue/ui'
import { computed } from 'vue'
import { useDocsI18n } from '~/composables/use-docs-i18n'
import type { ShellWindowStatus } from '~/utils/shell-window-state'

const props = defineProps<{
  /** 当前窗口状态档位（决定入口是"激活"还是"可还原"） */
  status: ShellWindowStatus
}>()

const emit = defineEmits<{
  /**
   * 点击窗口入口。
   *
   * 语义是**切换**（与实机任务栏一致：窗口在显示 → 最小化；已收起 → 还原）。
   */
  (event: 'toggleWindow'): void
}>()

const { t } = useDocsI18n()

/** 窗口是否处于「已收起」（最小化 / 关闭）—— 此时入口点击会还原 */
const isWindowHidden = computed(() => props.status !== 'normal')

/**
 * 入口的可访问名随状态变化：收起时说「还原」，显示时说「最小化」。
 *
 * 与实机任务栏的读屏口径一致 —— 说的是**点击会发生什么**，而不是「当前是什么状态」。
 * `title` 与 `aria-label` 同值，避免悬停提示与读屏说法打架。
 *
 * ⚠️ 这里**刻意不用 `FluereButton` 的 `selected`**（也就没有 `aria-pressed`）。
 * 原因：`selected` 取 false 时组件把 `aria-pressed` 整个丢掉
 * （`button.vue:140` 的 `:aria-pressed="selected || undefined"`），于是同一个按钮在
 * 「显示 / 收起」两种状态下会**时而带 `aria-pressed` 时而不带** —— 这是比"没有
 * toggle 语义"更糟的可访问性状态：AT 无法稳定判断它是不是切换按钮。
 *
 * 因此本期把它做成**动作按钮**：可访问名说明点击后果，窗口是否显示由
 * 激活指示条（`.docs-shell-taskbar__indicator`）用视觉表达。等 0.5.6 落地完整
 * 任务栏（图标组 + hover / active 指示条）时，再统一决定是否给整个图标组补
 * 一套真正的 `aria-pressed` 口径。
 */
const entryLabel = computed(() =>
  isWindowHidden.value ? t('shell.taskbarWindowRestore') : t('shell.taskbarWindowMinimize'),
)
</script>

<template>
  <!--
    任务栏根：`position: fixed` + 贴底（explorer-layout.md §4）。
    层级只引用刻度，不写裸值 —— 外壳侧同样受该约定约束。
    `role="toolbar"`：它承载一组命令按钮，且是窗口收起的唯一还原入口，
    给 AT 一个明确的容器语义（不是装饰条）。
  -->
  <div
    class="docs-shell-taskbar"
    role="toolbar"
    :aria-label="t('shell.taskbarLabel')"
  >
    <!--
      窗口入口。用 `FluereButton` 而不是自绘：外观 / 悬停 / 按下 / 焦点环都交给
      组件实现，站点不再手写一套按钮样式（与 theme-toggle.vue 的既有口径一致）。
      `appearance="subtle"`：任务栏上的图标按钮不该有常驻底色。
    -->
    <span class="docs-shell-taskbar__slot">
      <FluereButton
        class="docs-shell-taskbar__entry"
        appearance="subtle"
        size="medium"
        :aria-label="entryLabel"
        :title="entryLabel"
        @click="emit('toggleWindow')"
      >
        <template #icon>
          <FluentIconWindow24Regular :size="20" />
        </template>
      </FluereButton>

      <!--
        激活指示条：窗口在桌面显示时出现（对齐实机任务栏「运行中的窗口」下划线）。
        装饰性 —— 对 AT 隐藏，状态由入口的 `aria-label` 文字承载（见上方注释）。

        几何为应用层构图（无 WinUI 来源，Windows 任务栏由系统绘制）：宽 16 / 高 3 /
        圆角取 `--borderRadiusCircular` / 前景取 `--colorBrandBackground`（与
        NavigationView 选中指示条同源，站内「选中」统一走强调色）。
      -->
      <span
        class="docs-shell-taskbar__indicator"
        :class="{ 'is-active': !isWindowHidden }"
        aria-hidden="true"
      />
    </span>
  </div>
</template>

<style scoped>
/* ------------------------------------------------------------------ */
/* 色值全部引用材质令牌；高度只读 --shell-taskbar-h（单位换算的唯一入口）。 */
/*                                                                     */
/* 映射说明（WinUI 资源名 → token）：                                    */
/*   任务栏底色：Windows 任务栏由系统外壳绘制，microsoft-ui-xaml 里没有   */
/*   对应资源（证据缺口，见 repo-tokens.json 的 shellTaskbarHeight）。    */
/*   这里取「浮在桌面壁纸之上的表面」这一语义位：                          */
/*     --layerOnMicaBaseAltFillColorDefault（亮 rgba(255,255,255,.702) / */
/*     暗 rgba(58,58,58,.451)）—— 与 NavigationView 面板浮层同源，        */
/*     保证「贴在壁纸上的表面」在站内是同一档。                           */
/*   上缘分隔线：--dividerStrokeColorDefault（与 TabView 的项分隔线同源）。*/
/* ------------------------------------------------------------------ */

.docs-shell-taskbar {
  position: fixed;
  inset-block-end: 0;
  inset-inline: 0;
  block-size: var(--shell-taskbar-h);

  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacingHorizontalS);

  /* 浮层档位：全站唯一允许出现在 --zIndexShell 的层（不写裸值） */
  z-index: var(--zIndexShell);

  border-block-start: var(--strokeWidthThin) solid var(--dividerStrokeColorDefault);
  background-color: var(--layerOnMicaBaseAltFillColorDefault);
  color: var(--colorNeutralForeground1);

  /*
   * 任务栏在滚动容器之外（`position: fixed`），不会随窗口内容滚动 —— 这与
   * explorer-layout.md §2「滚动发生在窗口内容区内部」是同一件事的两面。
   */
}

/* 图标槽：按钮 + 其下方的激活指示条合成一列，指示条贴着任务栏内缘 */
.docs-shell-taskbar__slot {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.docs-shell-taskbar__entry {
  /* 入口按钮尺寸对齐任务栏高度内可用的方形区（48 高 - 上下留白） */
  min-inline-size: 40px;
}

/*
 * 激活指示条：窗口显示时出现。用 `opacity` 过渡而不是 `display` / 尺寸变化 ——
 * 只动一个合成属性，且 reduced-motion 下停用后仍留下正确的静态形态（有 / 无）。
 */
.docs-shell-taskbar__indicator {
  position: absolute;
  inset-block-end: calc(-1 * var(--spacingVerticalXS));
  inline-size: 16px;
  block-size: 3px;
  border-radius: var(--borderRadiusCircular);
  background-color: var(--colorBrandBackground);
  opacity: 0;
  transition-property: opacity;
  transition-duration: var(--durationFaster);
  transition-timing-function: var(--curveEasyEase);
}

.docs-shell-taskbar__indicator.is-active {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .docs-shell-taskbar__indicator {
    transition: none;
  }
}
</style>
