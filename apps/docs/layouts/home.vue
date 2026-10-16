<script setup lang="ts">
import { useMediaQuery } from '@fluere-vue/hooks'
/**
 * 主页专用布局（`layout: 'home'`）。
 *
 * ## 为什么单独一个布局，而不是复用 `components`
 *
 * 主页是**营销页**：正文是通栏的 hero / 功能 / 统计 / CTA（`components/home/home-content.vue`），
 * 不需要 `layouts/components.vue` 那条常驻的组件侧边栏（它是给「逐个组件翻文档」用的，
 * 在营销首屏上只会把正文挤窄）。因此这里只保留：
 *
 *   - 固定 header：logo + 站点导航（Docs / 组件 / 桌面仿真）+ chrome 控件组；
 *   - 滚动视口（`FluereScrollView`，与文档内页同一口径）；
 *   - 路由切换骨架遮罩（`HomeRouteOverlay`，与 `/os` 共用）。
 *
 * 之所以不做成「页面里自绘 header」：站点外壳（滚动视口 + header + 遮罩）是布局级职责，
 * 写进页面会让下一个页面再抄一份 —— 0.5.5 的 `pages/index.vue` 就是这样长到 578 行的。
 *
 * ## header 为什么不在滚动视口里（实测踩过）
 *
 * `FluereScrollView` 的平移实现是在**内容节点**上写 `transform: translateY(...)`，
 * 而带 transform 的祖先会成为 `fixed` / `sticky` 的包含块：把 header 放进去并写
 * `position: sticky` 后，1440×900 下滚 600px 实测 header 的
 * `getBoundingClientRect().top` 变成 **-353**（跟着内容滚出视口）。
 * 因此这里是「上 header、下滚动视口」的纵向两段（`flex-direction: column`），
 * header 是滚动视口的**兄弟**而非子孙，自然贴顶且不参与滚动。
 * `layouts/components.vue` 的 header 同样不在 ScrollView 内（那边是 absolute 叠加层）。
 * 内容首屏也不需要 `pt-[var(--docs-header-h)]` —— header 在 flex 流里本来就占了高度。
 * header 高度读同一个 `--docs-header-h`（事实源 `assets/docs-shell.css`）。
 *
 * ## 移动端导航
 *
 * < 64rem 时内联导航隐藏，改用 header 里的折叠按钮 + 一条**紧跟 header 的下拉面板**
 * （`useDocsSidebar` 与 `components/docs-sidebar.vue` 共享同一开合状态：同一次渲染里
 * 只有一个布局在跑，不存在两处同时消费的问题）。
 * 只有三个链接，因此刻意不做整屏抽屉 —— 也就不需要模态遮罩、`aria-modal` 与焦点陷阱
 * （面板是非模态的 `nav`，Tab 序自然接在折叠按钮之后）。Escape / 路由变化 / 升到桌面档
 * 都会收起。
 */
import { FluentIconNavigation24Regular } from '@fluere-vue/icons'
import { FluereButton, FluereScrollView } from '@fluere-vue/ui'

const { open, toggle, close } = useDocsSidebar()
const { t } = useDocsI18n()
const localePath = useLocalePath()
const route = useRoute()

/**
 * 站点导航条目。
 *
 * 前两条沿用 `nav.*` key（与 `layouts/components.vue` 的导航同源，避免同一句话出现
 * 两种译法）；「桌面仿真」（`/os`）是本版新增的去处。
 * 链接一律经 `localePath()` 前缀化（默认语种无前缀、其余语种带前缀）。
 */
const navLinks = computed(() => [
  { label: t('nav.docs'), to: localePath('/components') },
  { label: t('nav.components'), to: localePath('/components') },
  { label: t('nav.desktopSimulation'), to: localePath('/os') },
])

/** lg 断点（与 CSS `lg:` 同值 1024px）；只用于副作用，不参与渲染 */
const isDesktop = useMediaQuery('(min-width: 64rem)')

/** 断点升到桌面时收起下拉，避免状态滞留到下次缩窄 */
watch(isDesktop, (desktop) => {
  if (desktop) {
    close()
  }
})

/** 路由变化后收起下拉 */
watch(() => route.fullPath, close)

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    close()
  }
}

watch(open, (isOpen) => {
  if (!import.meta.client) {
    return
  }
  if (isOpen) {
    globalThis.addEventListener('keydown', onKeydown)
  } else {
    globalThis.removeEventListener('keydown', onKeydown)
  }
})

onScopeDispose(() => {
  if (import.meta.client) {
    globalThis.removeEventListener('keydown', onKeydown)
  }
})
</script>

<template>
  <div class="docs-home-shell">
    <!--
      Header：**滚动视口之外**的固定层（不是 sticky，也不是 ScrollView 的子孙）。

      为什么不能放进 `FluereScrollView` 里：该组件的平移实现是在内容节点上写
      `transform: translateY(...)`，而**带 transform 的祖先会成为 fixed / sticky 的
      包含块** —— 实测（1440×900，滚轮下滚 600px）sticky header 的
      `getBoundingClientRect().top` 变成 **-353**，即跟着内容一起滚出视口。
      同理，`layouts/components.vue` 的 header 也刻意是 `absolute` 的**兄弟层**而非
      ScrollView 的子孙（那边是叠加层，这边是占位层）。

      因此结构是「上 header、下滚动视口」的纵向两段：内容从 header 下方滚过、
      header 始终贴顶。高度读 `--docs-header-h`（窄视口下该变量整体抬高，见
      assets/docs-shell.css），与内层 `flex-wrap` 换行后的实际高度一致。
    -->
    <header
      class="docs-home-shell__header"
      role="banner"
    >
      <div class="docs-home-shell__header-inner">
        <div class="docs-home-shell__brand-group">
          <!-- 移动端折叠按钮：仅 <lg；外层 div 承担 lg:hidden（FluereButton 根自带
               scoped display，工具类同特异性且注入更晚，直接写在按钮上会被覆盖） -->
          <div class="docs-home-shell__nav-toggle">
            <FluereButton
              appearance="outline"
              size="medium"
              icon-only
              :aria-label="open ? t('nav.toggleNavClose') : t('nav.toggleNavOpen')"
              :title="open ? t('nav.toggleNavClose') : t('nav.toggleNavOpen')"
              :aria-expanded="open"
              aria-controls="docs-home-nav-panel"
              @click="toggle"
            >
              <template #icon>
                <FluentIconNavigation24Regular :size="20" />
              </template>
            </FluereButton>
          </div>
          <NuxtLink
            :to="localePath('/')"
            class="docs-home-shell__brand"
          >
            <BrandLogo :size="24" />
            FluereVue
          </NuxtLink>
          <nav class="docs-home-shell__nav">
            <NuxtLink
              v-for="link in navLinks"
              :key="link.to"
              :to="link.to"
              class="docs-home-shell__nav-link"
            >
              {{ link.label }}
            </NuxtLink>
          </nav>
        </div>
        <!-- ml-auto：换行到第二行后仍贴右对齐（同一行时与 justify-between 等效） -->
        <ShellChrome class="docs-home-shell__chrome" />
      </div>
    </header>

    <!--
      移动端导航下拉：header 的**绝对定位子层**（紧跟 header、位于滚动视口之上）。
      挂在 header 内是为了「贴着 header 下缘」这件事不依赖任何魔法偏移 —— 若放在
      header 之后、ScrollView 之内，它会随内容一起滚动（见上）。
      只有三个链接，因此刻意不做整屏抽屉 —— 也就不需要模态遮罩、`aria-modal` 与焦点陷阱
      （面板是非模态的 `nav`）。Escape / 路由变化 / 升到桌面档都会收起。
    -->
    <Transition name="docs-home-nav">
      <nav
        v-if="open"
        id="docs-home-nav-panel"
        class="docs-home-shell__mobile-nav"
        :aria-label="t('nav.componentNavDialog')"
      >
        <NuxtLink
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="docs-home-shell__mobile-link"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>
    </Transition>

    <!-- 滚动视口：占满 header 之下的剩余高度（内容首屏不需要额外偏移） -->
    <div class="docs-home-shell__viewport">
      <FluereScrollView class="h-full">
        <!-- 内容区：通栏留白由布局给，营销区块自己收窄到 64rem 并居中 -->
        <main class="docs-home-shell__main">
          <slot />
        </main>
      </FluereScrollView>
    </div>

    <!-- 路由切换骨架遮罩：覆盖整页（主页与 /os 共用同一控件） -->
    <HomeRouteOverlay />
  </div>
</template>

<style scoped>
/*
 * 根锁视口 + 关闭页面级滚动（与 layouts/components.vue 同一口径）：
 * 纵向两段 —— header 固定高、滚动视口吃掉剩余高度。
 * `FluereScrollView` 的 presenter 是绝对定位，宿主必须有确定高度。
 */
.docs-home-shell {
  position: relative;
  block-size: 100vh;
  block-size: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--colorNeutralBackground1);
  color: var(--colorNeutralForeground1);
  font-family: var(--fontFamilyBase);
}

/*
 * 滚动视口：吃掉 header 之下的剩余高度（`min-block-size: 0` 让 flex 子项可收缩，
 * 否则内部滚动区会撑破视口 —— 与 explorer-window.vue 的 `__body` 同款约束）。
 */
.docs-home-shell__viewport {
  flex: 1 1 auto;
  min-block-size: 0;
}

/*
 * Header：`flex: none` 的固定高条带（**不在滚动视口内**，见模板注释：
 * 放进 ScrollView 会被内容节点的 transform 拖走）。
 * 毛玻璃与半透明底色沿用文档内页 header 的同一档写法。
 */
.docs-home-shell__header {
  position: relative;
  z-index: var(--zIndexContent);
  flex: none;
  block-size: var(--docs-header-h);
  border-block-end: var(--strokeWidthThin) solid var(--colorNeutralStroke1);
  background-color: color-mix(in srgb, var(--colorNeutralBackground1) 80%, transparent);
  backdrop-filter: blur(12px);
}

/*
 * 内层允许换行：窄视口下 chrome 控件组整体落到第二行（`--docs-header-h` 在
 * 40rem 以下已整体抬到 5rem，见 assets/docs-shell.css）。
 */
.docs-home-shell__header-inner {
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacingVerticalXS) var(--spacingHorizontalL);
  block-size: 100%;
  max-inline-size: 80rem;
  margin-inline: auto;
  padding-inline: var(--spacingHorizontalXXL);
}

.docs-home-shell__brand-group {
  display: flex;
  align-items: center;
  gap: var(--spacingHorizontalXXL);
}

.docs-home-shell__nav-toggle {
  display: block;
}

.docs-home-shell__brand {
  display: flex;
  align-items: center;
  gap: var(--spacingHorizontalS);
  color: var(--colorNeutralForeground1);
  font-size: var(--fontSizeBase400);
  font-weight: var(--fontWeightSemibold);
  line-height: var(--lineHeightBase400);
  text-decoration-line: none;
}

.docs-home-shell__nav {
  display: none;
  align-items: center;
  gap: var(--spacingHorizontalXXL);
  font-size: var(--fontSizeBase300);
  line-height: var(--lineHeightBase300);
}

.docs-home-shell__nav-link {
  color: var(--colorNeutralForeground2);
  text-decoration-line: none;
  transition-property: color;
  transition-duration: var(--durationFaster);
  transition-timing-function: var(--curveEasyEase);
}

.docs-home-shell__nav-link:hover {
  color: var(--colorNeutralForeground1);
}

/* ---- 移动端下拉（非模态，header 的绝对定位子层） ---- */

/*
 * 定位锚点是 `.docs-home-shell`（它带 `position: relative`）：
 * header 本身不写 `position` 之外的定位值，面板靠 `inset-block-start: var(--docs-header-h)`
 * 贴在 header 下缘 —— 与 header 高度同源，不引入「header 高 56 而面板从 48 开始」这类魔法偏移。
 */
.docs-home-shell__mobile-nav {
  position: absolute;
  inset-block-start: var(--docs-header-h);
  inset-inline: 0;
  z-index: var(--zIndexContent);
  display: flex;
  flex-direction: column;
  padding-inline: var(--spacingHorizontalXXL);
  padding-block: var(--spacingVerticalS) var(--spacingVerticalM);
  border-block-end: var(--strokeWidthThin) solid var(--colorNeutralStroke1);
  background-color: var(--colorNeutralBackground1);
}

.docs-home-shell__mobile-link {
  padding-block: var(--spacingVerticalM);
  color: var(--colorNeutralForeground1);
  font-size: var(--fontSizeBase400);
  line-height: var(--lineHeightBase400);
  text-decoration-line: none;
}

/* 内容区：通栏左右留白（营销区块内部再收窄到 64rem） */
.docs-home-shell__main {
  padding: var(--spacingVerticalXXXL) var(--spacingHorizontalXXL) 0;
}

/*
 * 下拉动效：面板自上而下展开（高度由内容决定，只做透明度 + 轻微位移，不写死高度）。
 * 进入用 decelerate（内容「落定」）、退出用 accelerate（内容「离场」），
 * 与 ScrollView 滚动条同一套 Fluent 动效约定（--durationFast + curve 令牌）。
 */
.docs-home-nav-enter-active,
.docs-home-nav-leave-active {
  transition-property: opacity, transform;
  transition-duration: var(--durationFast);
}
.docs-home-nav-enter-active {
  transition-timing-function: var(--curveDecelerateMid);
}
.docs-home-nav-leave-active {
  transition-timing-function: var(--curveAccelerateMin);
}
.docs-home-nav-enter-from,
.docs-home-nav-leave-to {
  opacity: 0;
  transform: translateY(calc(-1 * var(--spacingVerticalS)));
}

@media (min-width: 64rem) {
  .docs-home-shell__nav-toggle {
    display: none;
  }

  .docs-home-shell__nav {
    display: flex;
  }

  /* 桌面档兜底隐藏下拉（即便 open 状态滞留） */
  .docs-home-shell__mobile-nav {
    display: none;
  }
}

/* 减少动效偏好：瞬时切换；hover 的颜色过渡也停用（静态形态差异保留） */
@media (prefers-reduced-motion: reduce) {
  .docs-home-shell__nav-link,
  .docs-home-nav-enter-active,
  .docs-home-nav-leave-active {
    transition: none;
  }
}
</style>
