<script setup lang="ts">
/**
 * 开始按钮 + 开始菜单面板（0.5.7 `StartMenu`，任务栏左端常驻入口）。
 *
 * ## 归属与结构
 *
 * 应用级组合（apps/docs/README.md〈构件归属〉），**不进** `@fluere-vue/ui`。
 * 按钮与面板合成一个自包含组件：开合状态、触发元素、焦点陷阱全在组件内闭环 ——
 * 若面板拆到 `desktop-shell.vue` 层，「外部点击排除触发器」就需要跨组件传 DOM 引用，
 * 反而多一条链路（同 AGENTS.md〈交互与弹层组件约定〉「谁提供上下文、谁产出 DOM」）。
 *
 * ## 面板几何 / 材质的规格出处（A 级：microsoft-ui-xaml tag `winui3/release/2.5.1`）
 *
 * 面板是 WinUI 菜单浮层形态，规格逐条取自
 * `src/controls/dev/CommonStyles/MenuFlyout_themeresources.xaml`：
 *
 * | 量            | WinUI 资源                                | 本实现                                              |
 * | ------------- | ----------------------------------------- | --------------------------------------------------- |
 * | 圆角          | `OverlayCornerRadius` = 8                 | `--borderRadiusXLarge`（同值 8px）                   |
 * | 描边          | `SurfaceStrokeColorFlyoutBrush`，厚 1     | `--surfaceStrokeColorFlyout`（repo-token）+ `--strokeWidthThin` |
 * | 描边色源      | `Common_themeresources_any.xaml`：亮 `#0F000000` / 暗 `#33000000` | AARRGGBB→CSS 换算见 repo-tokens.json 的 note |
 * | 面板内边距    | `MenuFlyoutPresenterThemePadding` 0,2,0,2 | `--spacingVerticalXXS` 块向 2px，行向 0                |
 * | 条目内边距    | `MenuFlyoutItemThemePadding` 11,8,11,9    | 局部变量 `--fui-start-menu-item-px/pb`（11 / 9 无同值 token，8 = `--spacingVerticalS`） |
 * | 条目外边距    | `MenuFlyoutItemMargin` 4,2,4,2            | `--spacingHorizontalXS` / `--spacingVerticalXXS`（同值） |
 * | 条目圆角      | `ControlCornerRadius` = 4                 | `--borderRadiusMedium`（同值 4px）                    |
 * | 条目状态色    | `SubtleFillColorTransparent/Secondary/Tertiary` | `--colorSubtleBackground` / `…Hover` / `…Pressed` |
 * | 分隔线        | `MenuFlyoutSeparatorBackground` = `DividerStrokeColorDefault` | `--dividerStrokeColorDefault` + `--strokeWidthThin` |
 * | 垂直滚动      | presenter `VerticalScrollBarVisibility=Auto` | 面板 `max-block-size` + `overflow-y: auto`（矮视口护栏） |
 *
 * 材质：WinUI 的 presenter 背景 = `DesktopAcrylicTransparentBrush` /
 * `MenuFlyoutSystemBackdrop` = `AcrylicBackgroundFillColorDefaultBackdrop`
 * （同文件 `:266`）。**本期没有真实 Acrylic 合成**（BACKDROP 采样 / 噪点归 0.9.2，
 * PLAN.md 阶段 5 明文），面板取该画刷的 FallbackColor 纯色近似
 * `--acrylicBackgroundFillColorDefault`（亮 `#F9F9F9` / 暗 `#2C2C2C`，
 * 见 repo-tokens.json note）—— **这是一处已知证据缺口**：真实观感是半透明 + 噪点，
 * 本面板是不透明纯色；覆盖方式 = 面板根上覆写 `--fui-start-menu-background`。
 *
 * ## 位置与层级（应用层构图，无 WinUI 来源）
 *
 * 面板挂在任务栏子树内（按钮 = 触发器，`position: relative` 的根提供锚点），
 * `inset-block-end: 100%` 贴任务栏上缘、左缘与开始按钮对齐。任务栏以
 * `--zIndexShell`(1500) 建立叠放上下文，面板因此盖过窗口与任务栏内容；
 * 面板自身仍引用 `--zIndexStartMenu`(1600) 表达档位意图（explorer-layout.md §4），
 * 同时保证它若未来独立成层也无需改值。**禁止**在本组件写裸 z-index。
 * 宽度 `--shell-start-menu-w`（docs-shell.css 构图变量，`min(...100vw-8px)` 防窄视口溢出）。
 *
 * ## 开始按钮的徽标与状态（0.5.7 按参考图还原，2026-10-16）
 *
 * 三件事在 0.5.7 一并改掉，逐条留证据（参考图 = 用户在 Windows 11 上截的
 * 2560×48 任务栏与开始按钮 hover / pressed 特写，测量脚本与结论见
 * docs/design/explorer-layout.md §4）：
 *
 * 1. **徽标几何**按公开的官方 Windows 11 徽标资源，不再手画方块：
 *    Wikimedia Commons《Windows logo - 2021.svg》给出 `viewBox="0 0 4875 4875"` 与
 *    `path d="M0 0h2311v2310H0zm2564 0h2311v2310H2564zM0 2564h2311v2311H0zm2564 0h2311v2311H2564"`
 *    （方块 2311 / 间隙 253 / 总 4875）。**本组件没有直接搬这条 path**，而是按它在
 *    24px 图标位下**整像素对齐**成「方块 11 / 缝 1 / 总 23」：官方比例原样渲染时缝是
 *    1.25px，实测会被抗锯齿糊成两个半透明像素（`#94c1e4`），而参考图的缝像素是
 *    **纯背景色**（`#EEEEEE`）⇒ 实机也是整像素对齐渲染的（测量见 explorer-layout.md §4；
 *    把两种画法同屏渲染后逐像素比对缝隙，是得出该结论的对比实验）。0.5.7 之前是自画的 `7×7 + 2 缝`
 *    （比例 0.44 / 0.125），方块偏小、缝偏大 —— 这是本次「还原图标」的主因。
 * 2. **配色**按实机：任务栏把徽标按**强调色渐变**渲染，浅端 = 强调色 Light2
 *    `--windowsAccentLight2`（#4CC2FF），深端 = 强调色本体 `--windowsAccentPrimary`
 *    （#0078D4，也是官方徽标文件的填充色）。渐变方向取 `(14,21)`（dy/dx = **1.5**）：
 *    对参考图徽标做最小二乘拟合得 56°、dy/dx = 1.52，**45° 会让右上与左下同色**，
 *    而参考图右上（#25A3E9）明显浅于左下（#138FDE）—— 复算本式四角得
 *    `#4cc2ff / #269de9 / #128ede / #0078d4`，与实测逐角吻合。**不再用 `currentColor`**
 *    ——单色中性前景与实机的蓝色徽标不是一回事。
 * 3. **按下态**（参考图三）：徽标变**单色** `--windowsAccentPrimary` 并整体缩到 0.75。
 *    这两条都没有 A 级来源（Windows 外壳自绘、不在 microsoft-ui-xaml 里），
 *    按「证据缺口」口径记账：数值来自参考图实测（方块 11px → 8px、总宽 23px → 17.25px
 *    ⇒ 0.75），覆写口 = 下面两条 `:active` 选择器与 `--windowsAccentPrimary`；
 *    按下态**不做过渡**（关键帧同样取不到，不猜时长，动效归 0.9.x）。
 *
 * 按钮命中区与 hover 状态归**任务栏**口径（40×40 + Control 填充阶梯 + 1px 描边），
 * 与其余任务栏图标按钮共用 `docs-shell-taskbar-icon`（规则在 docs-shell.css，
 * 理由见那里的注释）。本组件只负责「把类名挂上去」，不再自写按钮状态。
 *
 * ## 提示用 FluereTooltip（0.5.7 起，取代原生 title）
 *
 * 0.5.6 曾裁决「外壳内不挂 ToolTip、只用原生 `title`」，因为 `--zIndexTooltip`(1400)
 * 低于 `--zIndexShell`(1500)，提示会被任务栏自己盖住（explorer-layout.md §4 方案①）。
 * 0.5.7 落地时按方案① 的正解解决：**外壳把自己登记进层级栈**（`acquireLayer('--zIndexShell')`，
 * 见 desktop-shell.vue），于是外壳内打开的 ToolTip 命中「嵌套提升」分支，z 变成
 * `calc(var(--zIndexShell) + var(--zIndexStep))` = 1510 > 1500 —— 全程引用刻度，
 * 没有裸 z-index。（只覆写 `--fui-tooltip-z` 是**无效的**：提示面拿到的 z 是
 * `useFlyout` 的内联样式，内联优先于 CSS 声明；这一点已回写文档。）
 *
 * 开始菜单打开时不弹提示（`:disabled="open"`）：面板就悬在按钮上方，提示会被
 * `--zIndexStartMenu`(1600) 的面板盖住，且实机在菜单打开时也不弹按钮提示。
 *
 * ## 焦点与键盘（0.5.7 的核心逻辑，动效延后）
 *
 * - `useFocusTrap`（`@fluere-vue/hooks` 新原语，本组件是首个消费方）：Tab 困在面板内、
 *   Esc 关闭、点击面板 / 触发器之外关闭、关闭后焦点归还开始按钮（外部点击场景抑制归还）；
 * - 方向键 / Home / End 在 `role="menuitem"` 之间移动焦点，Enter / Space 由原生按钮语义激活；
 * - 开合**没有过渡动画**：PLAN.md 阶段 5 评审口径「优先逻辑，缓动对齐与材质延后」，
 *   0.9.x 再按 WinUI 关键帧补齐；因此这里不写 transition，也不依赖动画事件收尾。
 *
 * ## 搜索不做（显式取舍）
 *
 * Win11 开始菜单顶部有搜索框，但站内搜索属 0.6 的 `Ctrl+K` 命令面板（docs/todo.md 2.3）。
 * 放一个点了没反应的搜索框就是「坏按钮」（AGENTS.md 红线），本期直接不放，
 * 待 0.6 随真实搜索一起落地。
 *
 * ## 条目口径
 *
 * 只放**真实可达**的条目（2026-10-16 评审确认）：首页 / 指南 / 组件 = 打开（或切换）
 * 窗口标签；GitHub = 外链。设计令牌页与路线图页尚不存在（docs/todo.md 2.4 未做），
 * 不放占位死链 —— 页面存在后再补（组件注释留痕，防"看起来少了一项"被当成回归）。
 *
 * ## 已知缺口：高对比度（HC）未适配
 *
 * 面板与条目沿用明暗两套令牌，HC 下不切换 `Canvas` / `CanvasText`；与外壳其余
 * 自绘部分同属一处缺口（说明见 desktop-shell.vue 文件头，排期 docs/todo.md 0.9.5）。
 */

import { useFocusTrap } from '@fluere-vue/hooks'
import { FluereButton, FluereTooltip, useFocusVisual } from '@fluere-vue/ui'
import { computed, ref, useId } from 'vue'
import { useDocsI18n } from '~/composables/use-docs-i18n'
import { REPOSITORY_URL } from '~/utils/docs-repo'
import { SHELL_VIEWS } from '~/utils/shell-views'
import type { ShellTabId } from '~/utils/shell-window-state'

const emit = defineEmits<{
  /** 请求打开（或切换到）窗口标签 —— 由外壳统一改状态并还原窗口 */
  (event: 'openTab', tab: ShellTabId): void
}>()

const { t } = useDocsI18n()

/** 面板 id（aria-controls 用；`useId()` 保证 SSR / 水合一致） */
const panelId = useId()

/**
 * 徽标渐变 id。用 `useId()` 而不是写死字符串：① SSR / 水合一致；
 * ② 万一页面上挂了第二个外壳，两个 `linearGradient` 也不会互相引用错
 * （`url(#id)` 只按文档内第一个同名 id 解析）。
 */
const logoGradientId = useId()

/** 菜单开合（组件内唯一状态；关闭路径见下方 useFocusTrap 回调） */
const open = ref(false)

/** 面板元素（焦点陷阱容器 + 键盘导航的作用域） */
const panelRef = ref<HTMLElement | null>(null)

/**
 * 触发器是 `FluereButton` **组件**，模板 ref 拿到的是实例不是元素 ——
 * 必须经 `$el` 取根节点（同 desktop-shell.vue 的 elementOf 踩坑记录：
 * 按 HTMLElement 声明 SSR 无感、水合即 TypeError）。
 */
const triggerRef = ref<{ $el?: unknown } | null>(null)

const elementOf = (target: { $el?: unknown } | null | undefined): HTMLElement | null =>
  target?.$el instanceof HTMLElement ? target.$el : null

const triggerElement = computed(() => elementOf(triggerRef.value))

/** 双层焦点矩形（0.4.3 useFocusVisual）—— 面板条目是自绘按钮，套用共享类名 */
const focusVisual = useFocusVisual()

/*
 * 焦点陷阱 + Esc + 点击外部 + 焦点归还，全部委托给 hooks 原语（0.5.7 下沉的目的）。
 * 关闭一律只是翻 `open`：焦点归还由 hook 处理，外部点击的归还抑制也由 hook 内部判定，
 * 组件不再手工记录"上一个焦点在哪"。
 */
useFocusTrap({
  container: () => panelRef.value,
  trigger: () => triggerElement.value,
  active: () => open.value,
  onEscape: () => {
    open.value = false
  },
  onOutsidePointer: () => {
    open.value = false
  },
})

/** 「已固定」分组标题 id（分组用 aria-labelledby 指向可见标题，见模板） */
const sectionId = useId()

/**
 * 「已固定」条目 = 窗口视图清单（数据源与窗口导航 / 任务栏固定入口共用，
 * 见 `~/utils/shell-views` —— 改清单只改一处）。
 */
const pinnedTabs = computed(() =>
  SHELL_VIEWS.map((view) => ({ tab: view.id, label: t(view.titleKey), icon: view.icon })),
)

const toggle = (): void => {
  open.value = !open.value
}

/** 选中标签条目：先关面板（焦点归还触发器），再把意图抛给外壳 */
const onSelectTab = (tab: ShellTabId): void => {
  open.value = false
  emit('openTab', tab)
}

/** GitHub 外链：当前页不导航（新标签打开），只需收起面板 */
const onGithubClick = (): void => {
  open.value = false
}

/**
 * 面板内方向键 / Home / End 导航（Enter / Space 交给原生按钮语义）。
 *
 * 只移动焦点、不改选中 —— 与 WinUI MenuFlyout 的键盘口径一致：激活（Enter）才执行。
 * Tab 不在这里处理：`useFocusTrap` 已把 Tab 困在面板内循环，两者职责不重叠。
 */
const onMenuKeydown = (event: KeyboardEvent): void => {
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
    return
  }
  const items = [...(panelRef.value?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])]
  if (items.length === 0) {
    return
  }
  event.preventDefault()
  const current = items.indexOf(document.activeElement as HTMLElement)
  let next = 0
  if (event.key === 'ArrowDown') {
    next = current === -1 ? 0 : (current + 1) % items.length
  } else if (event.key === 'ArrowUp') {
    next = current === -1 ? items.length - 1 : (current - 1 + items.length) % items.length
  } else if (event.key === 'End') {
    next = items.length - 1
  }
  items[next]?.focus()
}
</script>

<template>
  <div class="docs-start-menu">
    <!--
      开始按钮：任务栏**最左侧常驻**（移动端压缩布局下也保留，见 shell-taskbar.vue）。
      提示走 `FluereTooltip`（取代原生 `title`）—— 层级已由外壳登记层级栈解决，
      菜单打开时禁用（面板就悬在按钮上方，见文件头「提示用 FluereTooltip」）。
      `aria-haspopup="menu"` + `aria-expanded` 把"会弹出菜单"这件事交给 AT，
      可访问名固定为「开始」（点击后果由 expanded 状态表达）。

      图标 = Windows 11 官方徽标（几何与配色出处见文件头「开始按钮的徽标与状态」）：
      路径取自 Wikimedia Commons《Windows logo - 2021.svg》，填充用强调色对角线渐变；
      按下态由样式改成单色 + 0.75 缩放（:active 选择器）。
    -->
    <FluereTooltip
      :content="t('shell.startButton')"
      :disabled="open"
      placement="top"
    >
      <FluereButton
        ref="triggerRef"
        class="docs-start-menu__trigger docs-shell-taskbar-icon"
        appearance="subtle"
        size="large"
        icon-only
        aria-haspopup="menu"
        :aria-expanded="open"
        :aria-controls="open ? panelId : undefined"
        :aria-label="t('shell.startButton')"
        @click="toggle"
      >
        <template #icon>
          <!--
            渐变 id 经 CSS 变量注入：`fill` 走 CSS 规则（`--fui-start-menu-logo-fill`），
            按下态才能用一条普通规则把它替换成单色 —— 若写成行内 `style="fill: ..."`，
            行内样式会压过按下态规则。
          -->
          <svg
            class="docs-start-menu__logo"
            :style="{ '--fui-start-menu-logo-fill': `url(#${logoGradientId})` }"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <defs>
              <!--
                渐变：方向 (14,21) ≈ 实测的 dy/dx = 1.5（56°），而非 45° —— 两者残差
                相近（4.4 vs 5.0/255），但**四角颜色**可分辨：45° 会让右上与左下同色，
                而参考图右上 #25a3e9 明显浅于左下 #138fde。本式复算四角得
                #4cc2ff / #269de9 / #128ede / #0078d4，与实测逐角吻合。
              -->
              <linearGradient
                :id="logoGradientId"
                gradientUnits="userSpaceOnUse"
                x1="0"
                y1="0"
                x2="14"
                y2="21"
              >
                <stop
                  class="docs-start-menu__logo-stop--start"
                  offset="0"
                />
                <stop
                  class="docs-start-menu__logo-stop--end"
                  offset="1"
                />
              </linearGradient>
            </defs>
            <!--
              几何：方块 11 / 缝 1 / 总 23，**整像素对齐**。
              官方路径（2311 / 253 / 4875）在 24px 下是 11.38 / 1.25 —— 同屏对比实测
              它的缝隙被抗锯齿糊成两个半透明像素（#94c1e4），
              而参考图的缝隙像素是**纯背景色**（#EEEEEE，见 explorer-layout.md §4 测量表），
              说明实机是整像素对齐渲染的。故按 11/1/23 书写（比例与官方一致到 1% 以内），
              代价是图标在 24px 图标位里左上偏 0.5px —— 不可见，换来方块与缝隙都不发虚。
            -->
            <path
              class="docs-start-menu__logo-pane"
              d="M0 0h11v11H0zm12 0h11v11H12zM0 12h11v11H0zm12 0h11v11H12z"
            />
          </svg>
        </template>
      </FluereButton>
    </FluereTooltip>

    <!--
      面板：`v-if` 让关闭态不占 DOM（SSR 首屏为关闭，两端结构一致）。
      `role="menu"` + `role="menuitem"` 承载方向键导航的语义；
      点击 / Esc / Tab 的行为全部来自 useFocusTrap（见 script 注释）。
    -->
    <div
      v-if="open"
      :id="panelId"
      ref="panelRef"
      class="docs-start-menu__panel"
      role="menu"
      :aria-label="t('shell.startMenuLabel')"
      @keydown="onMenuKeydown"
    >
      <div
        class="docs-start-menu__section"
        role="group"
        :aria-labelledby="sectionId"
      >
        <p
          :id="sectionId"
          class="docs-start-menu__section-title"
        >
          {{ t('shell.startMenuPinned') }}
        </p>
        <ul class="docs-start-menu__list">
          <li
            v-for="item in pinnedTabs"
            :key="item.tab"
            class="docs-start-menu__item"
          >
            <button
              type="button"
              class="docs-start-menu__entry"
              role="menuitem"
              :class="focusVisual.class"
              @click="onSelectTab(item.tab)"
            >
              <component
                :is="item.icon"
                :size="20"
                class="docs-start-menu__entry-icon"
              />
              <span class="docs-start-menu__entry-label">{{ item.label }}</span>
            </button>
          </li>
        </ul>

        <hr class="docs-start-menu__separator" />

        <ul class="docs-start-menu__list">
          <li class="docs-start-menu__item">
            <a
              class="docs-start-menu__entry"
              role="menuitem"
              :class="focusVisual.class"
              :href="REPOSITORY_URL"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="t('github.openInNewTab')"
              @click="onGithubClick"
            >
              <!-- 字形收敛在 GithubMark（与 github-link / 任务栏固定入口共用一份 path） -->
              <GithubMark class="docs-start-menu__entry-icon" />
              <span class="docs-start-menu__entry-label">GitHub</span>
            </a>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ------------------------------------------------------------------ */
/* 逐条映射见文件头表格（WinUI 资源 → token / 局部变量）。                */
/* 面板不 Teleport：留在任务栏子树内，因此 scoped 样式可达（AGENTS.md      */
/* 〈交互与弹层组件约定〉的 scoped 失效陷阱只针对 Teleport / 底座内部渲染）。*/
/* ------------------------------------------------------------------ */

.docs-start-menu {
  /*
   * 锚点：开始按钮 + 面板共用的定位上下文（任务栏格子内）。
   * `position: relative` 属局部 stacking（非浮层档位），面板层级走 --zIndexStartMenu。
   * `block-size: 100%`：父段（zone--start）被 `align-self: stretch` 拉满任务栏高，
   * 本根随之拉满 ⇒ 面板 `inset-block-end: 100%` 正好落在**任务栏上缘**（贴边向上展开）。
   */
  position: relative;
  display: flex;
  align-items: center;
  block-size: 100%;
}

.docs-start-menu__trigger {
  /*
   * 命中区 40×40：`size="large"`（40 高）+ `icon-only`（`aspect-ratio: 1`）已给出正方形，
   * `min-inline-size` 兜住「图标列宽被内容撑大」的情况 —— 数值与 `.docs-shell-taskbar-icon`
   * 同源（参考图实测热区 40×40，见 explorer-layout.md §4）。
   * hover / pressed 的状态色与 1px 描边由 docs-shell.css 的 `.docs-shell-taskbar-icon` 提供。
   */
  min-inline-size: 40px;
}

/*
 * 徽标：24×24（参考图实测 23px + 边缘半像素抗锯齿 ⇒ 24px 图标位）。
 * 填充色走局部变量是为了让按下态能用普通规则替换它（见模板注释）。
 */
.docs-start-menu__logo {
  inline-size: 24px;
  block-size: 24px;
  transform-origin: center;
}

.docs-start-menu__logo-pane {
  fill: var(--fui-start-menu-logo-fill);
}

/* 渐变的两个停靠点：浅端 = 强调色 Light2，深端 = 强调色本体（出处见文件头） */
.docs-start-menu__logo-stop--start {
  stop-color: var(--windowsAccentLight2);
}

.docs-start-menu__logo-stop--end {
  stop-color: var(--windowsAccentPrimary);
}

/*
 * 按下态（参考图三）：徽标整体转单色强调色，并缩到 0.75。
 * **证据缺口**：Windows 外壳自绘、无 A 级来源；0.75 由参考图实测得出
 * （方块 11px → 8px、总宽 23px → 17.25px），无过渡 —— 关键帧同样取不到，不猜时长。
 * 覆写口：这两条选择器（或改 `--windowsAccentPrimary` 换强调色）。
 * `:active` 在键盘空格按下时同样命中（与鼠标一致）。
 */
.docs-start-menu__trigger:active .docs-start-menu__logo-pane {
  fill: var(--windowsAccentPrimary);
}

.docs-start-menu__trigger:active .docs-start-menu__logo {
  transform: scale(0.75);
}

/*
 * 面板：锚在按钮上方、贴任务栏上缘（构图，无 WinUI 来源）。
 * 宽度走构图变量 --shell-start-menu-w（docs-shell.css），并用 min(...100vw-8px)
 * 防窄视口横向溢出（移动端验收「不溢出不重叠」）。
 */
.docs-start-menu__panel {
  position: absolute;
  inset-block-end: 100%;
  inset-inline-start: 0;
  /*
   * 档位引用刻度（--zIndexStartMenu，1600）：面板在任务栏叠放上下文内生效，
   * 同时表达「高于任务栏与窗口」的档位意图（explorer-layout.md §4）。禁裸值。
   */
  z-index: var(--zIndexStartMenu);

  inline-size: min(var(--shell-start-menu-w), calc(100vw - 2 * var(--spacingHorizontalXS)));
  /*
   * 矮视口护栏：presenter 在 WinUI 里是 VerticalScrollBarVisibility=Auto
   * （MenuFlyout_themeresources.xaml:277），这里等价为 max-block-size + 纵向滚动。
   * max 计算把任务栏高与 8px 呼吸留出去，避免面板顶出视口。
   */
  max-block-size: calc(100dvh - var(--shell-taskbar-h) - 2 * var(--spacingHorizontalXS));
  overflow-y: auto;

  /*
   * 色值映射（见文件头表）：
   *  背景 = DesktopAcrylicTransparentBrush 的 FallbackColor 近似（证据缺口，0.9.2 补真材质）
   *  描边 = SurfaceStrokeColorFlyoutBrush（repo-token surfaceStrokeColorFlyout）
   */
  background-color: var(--fui-start-menu-background, var(--acrylicBackgroundFillColorDefault));
  border: var(--strokeWidthThin) solid var(--surfaceStrokeColorFlyout);
  border-radius: var(--borderRadiusXLarge);

  /* WinUI 菜单浮层阴影为系统合成；这里取站内浮层同档 shadow16（构图选择，token 化） */
  box-shadow: var(--shadow16);

  /* presenter Padding 0,2,0,2 */
  padding-block: var(--spacingVerticalXXS);
}

.docs-start-menu__section-title {
  margin: 0;
  padding: var(--spacingVerticalXXS) var(--spacingHorizontalXS);
  color: var(--colorNeutralForeground2);
  font-size: var(--fontSizeBase200);
  line-height: var(--lineHeightBase200);
}

.docs-start-menu__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

/* 条目外边距 = MenuFlyoutItemMargin 4,2,4,2（同值 token） */
.docs-start-menu__item {
  margin: var(--spacingVerticalXXS) var(--spacingHorizontalXS);
}

/*
 * 条目 = MenuFlyoutItem 形态：
 *  padding 11,8,11,9 → 行向 11 无同值 token（局部变量），块向上 8 = --spacingVerticalS、
 *  下 9 无同值 token（局部变量）；圆角 ControlCornerRadius 4 = --borderRadiusMedium。
 *  图标列 = 20 图标 + 8 间距 = 28，对齐 MenuFlyoutItemPlaceholderThemeThickness 28。
 */
.docs-start-menu__entry {
  display: flex;
  align-items: center;
  gap: var(--spacingHorizontalS);

  inline-size: 100%;
  padding: var(--spacingVerticalS) var(--fui-start-menu-item-px) var(--fui-start-menu-item-pb);
  border: 0;
  border-radius: var(--borderRadiusMedium);
  background-color: transparent;
  color: var(--colorNeutralForeground1);
  font-family: inherit;
  /*
   * ControlContentThemeFontSize：该资源定义在 WinUI 框架程序集里，
   * microsoft-ui-xaml 源树 git grep 零命中（2026-10-16，负面证据）—— 按**证据缺口**
   * 取 WinUI 正文档 14（同文件旁证：加速键用 CaptionTextBlockStyle=12，正文高一档），
   * 落 --fontSizeBase300；覆盖方式 = 覆写本类的 font-size 或组件变量。
   */
  font-size: var(--fontSizeBase300);
  line-height: var(--lineHeightBase300);
  text-align: start;
  text-decoration: none;
  cursor: pointer;
}

/* 条目局部变量：WinUI 资源 MenuFlyoutItemThemePadding 的 11 / 9 两档在 token 表无同值档 */
.docs-start-menu__entry {
  --fui-start-menu-item-px: 11px;
  --fui-start-menu-item-pb: 9px;
}

/* 状态色：SubtleFillColorTransparent / Secondary(hover) / Tertiary(pressed) */
.docs-start-menu__entry:hover {
  background-color: var(--colorSubtleBackgroundHover);
}

.docs-start-menu__entry:active {
  background-color: var(--colorSubtleBackgroundPressed);
}

.docs-start-menu__entry-icon {
  flex: none;
  /* 高 20、宽等比（GithubMark 的 viewBox 98×96 用 auto 宽避免 1px 级拉伸） */
  block-size: 20px;
  inline-size: auto;
}

.docs-start-menu__entry-label {
  min-inline-size: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 分隔线：MenuFlyoutSeparatorBackground = DividerStrokeColorDefault，高 1 */
.docs-start-menu__separator {
  margin: var(--spacingVerticalXXS) var(--spacingHorizontalXS);
  border: 0;
  border-block-start: var(--strokeWidthThin) solid var(--dividerStrokeColorDefault);
  block-size: 0;
}
</style>
