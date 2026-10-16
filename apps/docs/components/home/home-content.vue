<script setup lang="ts">
/**
 * 首页营销内容（hero / 功能 / 统计 / CTA / 页脚）—— **主页与 `/os` 桌面窗口共用同一份**。
 *
 * ## 为什么抽成组件
 *
 * 0.5.5 时这些区块直接写在 `pages/index.vue` 里，而首页同时承担两个职责：
 * ① 站点主页；② Explorer 窗口的「首页」视图内容。0.5.6 把「桌面仿真」移到独立路由
 * `/os`（`layouts/os.vue`）后，两处若各留一份，文案与样式必然漂移 —— 因此这里收成
 * 单一事实源：`pages/index.vue`（主页）与 `pages/os/index.vue`（窗口内）都渲染它。
 *
 * ## `variant` 决定两处唯一的差异
 *
 * | variant     | 消费方            | 多出来的内容                                  |
 * | ----------- | ----------------- | --------------------------------------------- |
 * | `'page'`    | `pages/index.vue` | 无（页脚仍在本组件内，主页正文到这里结束）    |
 * | `'desktop'` | `pages/os/index.vue` | 《WindowsOS 仿真边界》三段（页脚之后）     |
 *
 * 《仿真边界》**跟随仿真本身**：它是「这个桌面仿真到什么程度」的公开口径
 * （事实源 `apps/docs/README.md`〈WindowsOS 仿真边界〉，发布检查项要求可见），
 * 落在桌面窗口的滚动区末尾比落在营销主页更贴题（口径变更记录见
 * `docs/design/explorer-layout.md` §0）。因此默认 `'page'` **不渲染**这一段。
 *
 * ## 继承自 0.5.5 的排版约定
 *
 * 视觉层级复刻原首页（大标题 / 居中 hero / 三栏卡片 / 分隔线页脚），但值一律走
 * token 与间距刻度，**不用 UnoCSS 工具类** —— 原页面的 `font-base` /
 * `duration-fluent-faster` 在 presetWind4 下是不生成 CSS 的死类（丢了
 * theme.font / theme.duration 查表），实测构建产物零命中；改用显式
 * `var(--fontFamilyBase)` / `var(--durationFaster)` 后两者都生效。
 *
 * 容器宽度（`max-inline-size` / 左右留白）**由消费方给**：主页在布局的通栏内容区里，
 * 桌面窗口在 `ui-gallery-window.vue` 的 `__panel-inner` 里 —— 本组件不写外层宽度，
 * 避免两处都被套上一层 64rem 的收窄。
 */
import { FluereButton } from '@fluere-vue/ui'

withDefaults(
  defineProps<{
    /** 渲染场景：营销主页 / 桌面窗口内的「首页」视图（后者多出仿真边界三段） */
    variant?: 'page' | 'desktop'
  }>(),
  {
    variant: 'page',
  },
)

const { t, tm } = useDocsI18n()
const localePath = useLocalePath()

/**
 * 已实现组件数：取自组件注册表（data/components-nav.ts），与 `/components` 总览页同源，
 * 避免首页写死一个与当前覆盖情况不符的数字（此前硬编码为 `40+`）。
 */
const { implementedCards } = useComponentNav()

/**
 * Hero feature 卡片：文案全走 i18n key（home.features.*）。
 * `tm` 取自 useDocsI18n —— 它已把预编译 message AST 逐叶子解析为字符串
 * （裸用 vue-i18n 的 `tm` 会拿到 AST 并渲染成 JSON，见该 composable 注释）。
 */
const features = computed(() => [
  tm('home.features.accessibility'),
  tm('home.features.saveTime'),
  tm('home.features.developerExperience'),
])

/** 首页统计条：组件数按注册表实时计算，其余为固定事实项 */
const stats = computed(() => [
  { value: String(implementedCards.value.length), label: t('home.stats.components') },
  { value: '100%', label: t('home.stats.typescript') },
  { value: 'MIT', label: t('home.stats.license') },
])

/** CTA 卡片：前三张是文档 / 组件 / 令牌，第四张是桌面仿真入口（`/os`） */
const ctLinks = computed(() => [
  {
    title: t('home.ctaCards.install.title'),
    desc: t('home.ctaCards.install.desc'),
    to: localePath('/components'),
  },
  {
    title: t('home.ctaCards.browse.title'),
    desc: t('home.ctaCards.browse.desc'),
    to: localePath('/components/button'),
  },
  {
    title: t('home.ctaCards.themes.title'),
    desc: t('home.ctaCards.themes.desc'),
    to: localePath('/components'),
  },
  {
    title: t('home.ctaCards.os.title'),
    desc: t('home.ctaCards.os.desc'),
    to: localePath('/os'),
  },
])
</script>

<template>
  <div class="docs-home">
    <!-- Hero -->
    <section class="docs-home__hero">
      <NuxtLink
        :to="localePath('/components')"
        class="docs-home__badge"
      >
        <span class="docs-home__badge-dot" />
        {{ t('home.badge') }}
        <span class="docs-home__badge-arrow">→</span>
      </NuxtLink>
      <h1 class="docs-home__title">
        {{ t('home.heroTitle1') }}
        <br />
        <span class="docs-home__title-accent">{{ t('home.heroTitle2') }}</span>
      </h1>
      <p class="docs-home__intro">
        {{ t('home.heroIntroBefore') }}
        <NuxtLink
          :to="localePath('/components/app-window')"
          class="docs-home__link"
          >{{ t('home.heroIntroLinkWinui') }}</NuxtLink
        >
        {{ t('home.heroIntroAfter1') }}
        <NuxtLink
          :to="localePath('/components/navigation-view')"
          class="docs-home__link"
          >{{ t('home.heroIntroLinkMica') }}</NuxtLink
        >
        {{ t('home.heroIntroAfter2') }}
      </p>
      <div class="docs-home__actions">
        <FluereButton
          appearance="primary"
          @click="navigateTo(localePath('/components'))"
        >
          {{ t('home.getStarted') }}
        </FluereButton>
        <FluereButton
          appearance="secondary"
          @click="navigateTo(localePath('/components/button'))"
        >
          {{ t('home.exploreComponents') }}
        </FluereButton>
      </div>
    </section>

    <!-- Features -->
    <section class="docs-home__section">
      <div class="docs-home__grid docs-home__grid--three">
        <div
          v-for="feature in features"
          :key="feature.title"
          class="docs-home__feature"
        >
          <h3 class="docs-home__feature-title">{{ feature.title }}</h3>
          <p class="docs-home__feature-subtitle">{{ feature.subtitle }}</p>
          <ul class="docs-home__list">
            <li
              v-for="item in feature.items"
              :key="item"
              class="docs-home__list-item"
            >
              <span
                class="docs-home__check"
                aria-hidden="true"
                >✓</span
              >
              {{ item }}
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Stats -->
    <section class="docs-home__section">
      <div class="docs-home__grid docs-home__grid--three docs-home__stats">
        <div
          v-for="stat in stats"
          :key="stat.label"
          class="docs-home__stat"
        >
          <div class="docs-home__stat-value">{{ stat.value }}</div>
          <div class="docs-home__stat-label">{{ stat.label }}</div>
        </div>
      </div>
    </section>

    <!-- CTA cards -->
    <section class="docs-home__section">
      <h2 class="docs-home__section-title">{{ t('home.readyTitle') }}</h2>
      <p class="docs-home__section-lead">{{ t('home.ctaIntro') }}</p>
      <div class="docs-home__grid docs-home__grid--three">
        <NuxtLink
          v-for="card in ctLinks"
          :key="card.title"
          :to="card.to"
          class="docs-home__cta"
        >
          <h3 class="docs-home__cta-title">{{ card.title }} →</h3>
          <p class="docs-home__cta-desc">{{ card.desc }}</p>
        </NuxtLink>
      </div>
    </section>

    <!--
      《WindowsOS 仿真边界》：docs/todo.md《发布检查》要求它「在文档站可见」，
      文案事实源是 apps/docs/README.md〈WindowsOS 仿真边界〉。
      只在 `variant="desktop"`（`/os` 的窗口内）渲染 —— 它说明的是这个桌面仿真的
      边界，跟随仿真本身；放主页会让营销首屏挂上一段免责声明。
      放在滚动区末尾而不是折叠起来：这是站点「不夸大承诺」的公开口径，
      藏在折叠面板里等于没写。
    -->
    <section
      v-if="variant === 'desktop'"
      class="docs-home__section docs-home__boundary"
    >
      <h2 class="docs-home__section-title">{{ t('shell.boundary.title') }}</h2>
      <p class="docs-home__boundary-lead">{{ t('shell.boundary.lead') }}</p>
      <p class="docs-home__boundary-item">{{ t('shell.boundary.scope') }}</p>
      <p class="docs-home__boundary-item">{{ t('shell.boundary.excluded') }}</p>
    </section>

    <!-- Footer -->
    <footer class="docs-home__footer">
      <div class="docs-home__footer-brand">
        <BrandLogo :size="20" />
        FluereVue
      </div>
      <div>{{ t('home.footer') }}</div>
    </footer>
  </div>
</template>

<style scoped>
/* ------------------------------------------------------------------ */
/* 营销内容排版                                                        */
/*                                                                     */
/* 复刻原首页的视觉层级（大标题 / 居中 hero / 三栏卡片 / 分隔线页脚），   */
/* 但值**一律走 token 与间距刻度**，不再用 UnoCSS 工具类 —— 原页面的      */
/* `font-base` / `duration-fluent-faster` 在 presetWind4 下是不生成 CSS  */
/* 的死类（丢了 theme.font / theme.duration 查表），实测构建产物零命中。 */
/* 改用显式 `var(--fontFamilyBase)` / `var(--durationFaster)` 后两者都生效。*/
/* ------------------------------------------------------------------ */

/*
 * 只约束「行宽」不约束「外边距」：宿主（布局 / 桌面窗口）负责给左右留白，
 * 本组件在留白之内把内容收窄到 64rem 并居中。
 */
.docs-home {
  max-inline-size: 64rem;
  margin-inline: auto;
}

.docs-home__hero {
  padding-block: var(--spacingVerticalXXXL) var(--spacingVerticalXXL);
  text-align: center;
}

.docs-home__badge {
  display: inline-flex;
  align-items: center;
  gap: var(--spacingHorizontalS);
  margin-block-end: var(--spacingVerticalXXL);
  padding: var(--spacingVerticalXS) var(--spacingHorizontalM);
  border: var(--strokeWidthThin) solid var(--colorNeutralStroke1);
  border-radius: var(--borderRadiusCircular);
  background-color: var(--colorNeutralBackground2);
  color: var(--colorNeutralForeground2);
  font-size: var(--fontSizeBase200);
  line-height: var(--lineHeightBase200);
  text-decoration-line: none;
}

.docs-home__badge-dot {
  inline-size: 6px;
  block-size: 6px;
  border-radius: var(--borderRadiusCircular);
  background-color: var(--colorBrandBackground);
}

.docs-home__badge-arrow {
  color: var(--colorNeutralForeground3);
}

.docs-home__title {
  margin: 0 0 var(--spacingVerticalXXL);
  color: var(--colorNeutralForeground1);
  font-size: var(--fontSizeHero800);
  font-weight: var(--fontWeightBold);
  line-height: var(--lineHeightHero800);
}

.docs-home__title-accent {
  color: var(--colorBrandForeground1);
}

.docs-home__intro {
  max-inline-size: 42rem;
  margin: 0 auto var(--spacingVerticalXXL);
  color: var(--colorNeutralForeground2);
  font-size: var(--fontSizeBase400);
  line-height: var(--lineHeightBase400);
}

.docs-home__link {
  color: var(--colorBrandForegroundLink);
  text-decoration-line: none;
}

.docs-home__link:hover {
  text-decoration-line: underline;
}

.docs-home__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: var(--spacingHorizontalL);
}

.docs-home__section {
  padding-block: var(--spacingVerticalXXXL);
  border-block-start: var(--strokeWidthThin) solid var(--colorNeutralStroke1);
}

.docs-home__section-title {
  margin: 0 0 var(--spacingVerticalS);
  color: var(--colorNeutralForeground1);
  font-size: var(--fontSizeBase600);
  font-weight: var(--fontWeightSemibold);
  line-height: var(--lineHeightBase600);
  text-align: center;
}

.docs-home__section-lead {
  max-inline-size: 36rem;
  margin: 0 auto var(--spacingVerticalXXL);
  color: var(--colorNeutralForeground2);
  font-size: var(--fontSizeBase300);
  line-height: var(--lineHeightBase300);
  text-align: center;
}

.docs-home__grid {
  display: grid;
  gap: var(--spacingHorizontalXXL);
}

/* auto-fit：窄容器下自然收成一栏，不必再写断点（窗口宽度本身就是变量） */
.docs-home__grid--two {
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
}

.docs-home__grid--three {
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
}

.docs-home__feature-title {
  margin: 0 0 var(--spacingVerticalS);
  color: var(--colorNeutralForeground1);
  font-size: var(--fontSizeBase500);
  font-weight: var(--fontWeightSemibold);
  line-height: var(--lineHeightBase500);
}

.docs-home__feature-subtitle {
  margin: 0 0 var(--spacingVerticalL);
  color: var(--colorNeutralForeground2);
  font-size: var(--fontSizeBase300);
  line-height: var(--lineHeightBase300);
}

.docs-home__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.docs-home__list-item {
  display: flex;
  align-items: center;
  gap: var(--spacingHorizontalS);
  margin-block-end: var(--spacingVerticalS);
  color: var(--colorNeutralForeground2);
  font-size: var(--fontSizeBase300);
  line-height: var(--lineHeightBase300);
}

.docs-home__check {
  color: var(--colorBrandForeground1);
}

.docs-home__stats {
  text-align: center;
}

.docs-home__stat-value {
  color: var(--colorBrandForeground1);
  font-size: var(--fontSizeHero700);
  font-weight: var(--fontWeightBold);
  line-height: var(--lineHeightHero700);
}

.docs-home__stat-label {
  color: var(--colorNeutralForeground3);
  font-size: var(--fontSizeBase300);
  line-height: var(--lineHeightBase300);
}

.docs-home__cta {
  display: block;
  padding: var(--spacingVerticalXXL) var(--spacingHorizontalXXL);
  border: var(--strokeWidthThin) solid var(--colorNeutralStroke1);
  border-radius: var(--borderRadiusXLarge);
  background-color: var(--colorNeutralBackground1);
  text-decoration-line: none;
  transition-property: background-color, border-color;
  transition-duration: var(--durationFaster);
  transition-timing-function: var(--curveEasyEase);
}

.docs-home__cta:hover {
  border-color: var(--colorBrandStroke1);
  background-color: var(--colorNeutralBackground1Hover);
}

.docs-home__cta-title {
  margin: 0 0 var(--spacingVerticalS);
  color: var(--colorNeutralForeground1);
  font-size: var(--fontSizeBase400);
  font-weight: var(--fontWeightSemibold);
  line-height: var(--lineHeightBase400);
}

.docs-home__cta-desc {
  margin: 0;
  color: var(--colorNeutralForeground2);
  font-size: var(--fontSizeBase300);
  line-height: var(--lineHeightBase300);
}

/* ---- 仿真边界 ---- */

.docs-home__boundary {
  text-align: start;
}

.docs-home__boundary-lead {
  margin: 0 0 var(--spacingVerticalM);
  color: var(--colorNeutralForeground2);
  font-size: var(--fontSizeBase300);
  line-height: var(--lineHeightBase300);
}

.docs-home__boundary-item {
  margin: 0 0 var(--spacingVerticalS);
  color: var(--colorNeutralForeground3);
  font-size: var(--fontSizeBase200);
  line-height: var(--lineHeightBase200);
}

.docs-home__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacingVerticalL);
  padding-block: var(--spacingVerticalXXL);
  border-block-start: var(--strokeWidthThin) solid var(--colorNeutralStroke1);
  color: var(--colorNeutralForeground3);
  font-size: var(--fontSizeBase300);
  line-height: var(--lineHeightBase300);
}

.docs-home__footer-brand {
  display: flex;
  align-items: center;
  gap: var(--spacingHorizontalS);
  font-family: var(--fontFamilyBase);
}
</style>
