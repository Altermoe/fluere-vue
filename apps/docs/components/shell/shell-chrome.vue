<script setup lang="ts">
 /**
 * 站点 chrome 控件组（0.5.5）—— 版本 tag / GitHub / 语言 / 主题四个入口。
 *
 * ## 为什么单独抽成一个组件（而不是写两遍）
 *
 * 这四个控件需要在**两个互斥的位置**各出现一次，因为标题栏放不下它们：
 *
 * | 视口            | 落点                                    | 可见性            |
 * | --------------- | --------------------------------------- | ----------------- |
 * | ≥ 64rem（1024） | `FluereAppWindow` 的 `#right-header`    | 显示（标题栏 48） |
 * | < 64rem         | 窗口内容区顶部的应用栏（app-bar）        | 显示              |
 *
 * 抽出来是为了让「站点有哪些 chrome 控件」只有**一份**定义 —— 否则加第五个控件时
 * 漏改一处，两边就会漂移。两处落点由 `explorer-window.vue` 的 CSS 按断点互斥显示
 * （桌面档隐藏应用栏、移动档隐藏标题栏里这一份），**不涉及任何视口判据**，
 * 因此服务端与客户端渲染出的 DOM 完全一致（无水合不匹配）。
 *
 * ## 为什么必须分两处（实测，不是猜的）
 *
 * `FluereAppWindow` 的标题栏是 12 列 grid，右头格（`grid-column: 10 / 11`）是
 * `auto` 轨：整行放不下时，**所有 auto 轨一起收缩到 min-content**。390px 视口下实测
 * 该格只拿到 **43px**、四控件换行成 **108px 高**，越过 48px 的标题栏压到标签条上
 * （窗口内容区被覆盖）。把 chrome 改成 `nowrap` 也不行：四控件 min-content 合计
 * 约 123px，加上 caption 区 138px、最小拖拽区 48px、图标与间距后仍超出 390px，
 * 只会把 grid 挤到横向溢出。**根因是「48px 定高标题栏装不下四个站点控件」**，
 * 属外壳构图问题，不该靠改组件几何解决（`explorer-layout.md` §1：外壳不得越过
 * 组件改它的几何）。因此移动档改用「窗口内容区顶部的应用栏」承载这四个入口，
 * 与「移动端不仿桌面、按断点降级」的既有口径一致（apps/docs/README.md〈仿真边界〉）。
 *
 * ## 归属
 *
 * 站点 chrome 属应用级组合（apps/docs/README.md〈构件归属〉），不进 `@fluere-vue/ui`。
 * 四个子控件都是 `apps/docs/components/` 下的站点组件，走 Nuxt 自动导入（主页布局
 * `layouts/home.vue` 也直接消费本组件，同一口径）。
 */
</script>

<template>
  <!--
    一行控件：右对齐 + 统一的 12px 间距。
    两个消费方（标题栏右头 / 移动应用栏）都只需要放进来，不必各写一套布局。
  -->
  <div class="docs-shell-chrome">
    <DocsVersionTag />
    <GithubLink />
    <LocaleSwitch />
    <ThemeToggle />
  </div>
</template>

<style scoped>
.docs-shell-chrome {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--spacingHorizontalM);

  /*
   * 不做 `flex-wrap`：换行是 0.5.5 实测踩过的坑（换行后高度 108px 越过 48px 标题栏）。
   * 移动档由父级把这一份整体 `display: none`，改用应用栏那一份承载，
   * 因此这里永远不需要换行。
   */
  flex-wrap: nowrap;

  /*
   * 允许被压缩（父容器是 grid 的 auto 轨 / flex 行）。
   * 桌面档有足够宽度，`min-inline-size: 0` 只在极端窄视口下才起作用 ——
   * 而那一档本组件已被隐藏，这里只是防御性写法。
   */
  min-inline-size: 0;
}
</style>
