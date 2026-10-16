<script setup lang="ts">
 /**
 * 站点 chrome 控件组 —— 版本 tag / 语言 / 主题三个「系统状」入口（0.5.6 起清单）。
 *
 * ## 控件清单为什么只有这三个（0.5.7 收口）
 *
 * 早期清单是四个（版本 / GitHub / 语言 / 主题）。0.5.7 把站点 chrome 收进任务栏
 * 托盘时按**语义**拆分：
 *  - 版本 / 语言 / 主题 = 「系统状控件」（改的是站点本身的环境）→ 托盘（本组件）；
 *  - GitHub = 「入口类控件」（去往一个页面 / 资源）→ 任务栏中间的固定入口
 *    （`shell-taskbar.vue`，主页 header 则直接用 `<GithubLink />`）。
 *
 * 这样托盘与固定入口不重复出现同一个 GitHub 图标（桌面与窄档都不重复）。
 *
 * ## 为什么抽成一个组件（而不是写两遍）
 *
 * 这三个控件需要在**多个位置**各出现一次，加第五个控件时漏改一处就会漂移。
 * 当前落点（0.5.7 起）：
 *
 * | 位置                          | 可见条件              |
 * | ----------------------------- | --------------------- |
 * | `/os` 任务栏托盘**内联**      | ≥ 64rem（1024px）     |
 * | `/os` 任务栏托盘**弹出菜单**  | < 64rem（展开后可见） |
 * | 站点主页 header               | 始终                  |
 *
 * 任务栏的两处落点由 CSS 断点互斥（桌面隐藏展开按钮那一份、窄档隐藏内联那一份），
 * **不涉及任何视口判据** ⇒ 服务端与客户端渲染出的 DOM 完全一致（无水合不匹配）。
 *
 * ## 历史注记：曾落窗口标题栏 / 应用栏（0.5.5–0.5.6 的临时落位）
 *
 * 0.5.5 时这四个控件放不进 48px 标题栏，被迫拆成「标题栏 + 窗口内应用栏」两处
 * （实测数据与推理见 explorer-layout.md §6.3）。0.5.6 起仿真拥有独立路由与任务栏，
 * 按原计划（`explorer-window.vue` 旧注释「0.5.6 会收进系统托盘」）整体迁入托盘，
 * 窗口内的两处落点已删除 —— 顺带修复了「窗口关闭后站点能力（主题 / 语言）不可达」
 * 的问题：托盘永远在任务栏上。
 *
 * ## 归属
 *
 * 站点 chrome 属应用级组合（apps/docs/README.md〈构件归属〉），不进 `@fluere-vue/ui`。
 * 三个子控件都是 `apps/docs/components/` 下的站点组件，走 Nuxt 自动导入
 * （主页布局 `layouts/home.vue` 也直接消费本组件，同一口径）。
 */
</script>

<template>
  <!--
    一行控件：右对齐 + 统一的间距。各消费方只需放进来，不必各写一套布局。
  -->
  <div class="docs-shell-chrome">
    <DocsVersionTag />
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
   * 托盘窄档由父级把内联这份整体 `display: none`，改由弹出菜单承载，
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
