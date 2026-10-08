<script setup lang="ts">
/**
 * 文档站路由骨架屏（Docs-only，不进 packages/ui）。
 *
 * 用途：router-view 子路由加载期间覆盖 router-view 视口体，给出「正在切换」的
 * 连续反馈。此前点击导航后，直到目标页组件（chunk）与页面内异步数据都就绪为止，
 * 内容区没有任何变化，观感上像「点了没反应」。
 *
 * 形态：整块渐变波浪背景——两条比视口更宽的柔和斜向渐变带横向掠过（相位相差半周期，
 * 因此任意时刻都有一条在视口内），底色是页面基准面。刻意不做「逐块骨架」
 * （标题条 / 卡片块）：目标页的结构由 MDC 内容决定，首帧拿不到；等结构可用时
 * 内容本身也就绪了。整块波浪只表达「正在加载」，不假装知道内容布局。
 *
 * 定位契约：组件自身 `position: absolute; inset: 0`，只铺满**调用方给出的定位盒**
 * （见 layouts/components.vue 的包裹层：header 之下、桌面端侧边栏之右），
 * 组件不决定自己盖住哪一块——router-view 视口由布局定义。
 *
 * 视觉量来源：
 *   - 底色 colorNeutralBackground1（Light #FFFFFF / Dark #292929，页面基准面）；
 *   - 波峰 colorNeutralStencil1Alpha（Light rgba(0,0,0,.1) / Dark rgba(255,255,255,.1)，
 *     Fluent 的骨架填充档）、两侧 colorBrandBackground2（Light #EBF3FC / Dark #082338）——
 *     均为 Fluent token 表同值档，明暗主题各自成对（见 packages/designs/generated/tokens.css）。
 *   - 循环周期在 token 表里没有同值档：Fluent 的时长刻度最长 `--durationUltraSlow` 500ms，
 *     是控件状态切换的量级，不描述「不定长循环」；故声明为组件局部变量
 *     `--docs-route-skeleton-period`，消费方可直接覆盖。
 *   - Fluent 没有 skeleton 控件规格（拿不到 A 级源码），本条属文档站自定表现，
 *     不对外承诺为库级视觉规格。
 *
 * 动效：只动 `transform`（合成层属性），不触发回流；周期内匀速（linear），
 * 波浪本身是静态渐变，运动是唯一的动感来源。
 * `prefers-reduced-motion: reduce` 下停止循环，改为整块静态斜向渐变
 * （既不留空白，也不停在半条波上）。
 * 无障碍：纯装饰面，`aria-hidden`；加载期间的交互由调用方的遮罩层负责。
 */
defineOptions({ name: 'DocsRouteSkeleton' })
</script>

<template>
  <div
    class="docs-route-skeleton"
    aria-hidden="true"
  >
    <!-- 主波与副波：同一条渐变，副波相位落后半周期，衔接主波的空窗 -->
    <div class="docs-route-skeleton__wave" />
    <div class="docs-route-skeleton__wave docs-route-skeleton__wave--trailing" />
  </div>
</template>

<style scoped>
.docs-route-skeleton {
  --docs-route-skeleton-period: 1600ms;

  position: absolute;
  inset: 0;
  overflow: hidden;
  background-color: var(--colorNeutralBackground1);
  /* 进入时淡入：遮罩可能挂在「当前还挂着的旧页面」上（见 pages/index.vue），
     没有 Vue Transition 包着，所以淡入由组件自己的动画负责；
     离场仍由调用方的 Transition 处理（有则淡出，无则随页面一起卸载）。 */
  animation: docs-route-skeleton-fade-in var(--durationNormal) var(--curveDecelerateMid) both;
}

@keyframes docs-route-skeleton-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/*
 * 波浪：比定位盒更宽（120%），起点整体位于盒左侧之外（left: -120%），
 * 动画把它平移到盒右侧之外（translateX(200%) 相对自身宽度 = 盒宽的两倍）。
 * 渐变两端透明，因此进 / 出视口时不会出现硬边；波峰用
 * `colorNeutralStencil1Alpha`（Fluent 的骨架填充档，Light rgba(0,0,0,.1) /
 * Dark rgba(255,255,255,.1)），在「页面底色」上给出可辨认的波峰，
 * 两侧用品牌浅色面收边。
 */
.docs-route-skeleton__wave {
  position: absolute;
  top: 0;
  bottom: 0;
  left: -120%;
  width: 120%;
  background-image: linear-gradient(
    100deg,
    transparent 10%,
    var(--colorBrandBackground2) 32%,
    var(--colorNeutralStencil1Alpha) 50%,
    var(--colorBrandBackground2) 68%,
    transparent 90%
  );
  animation: docs-route-skeleton-sweep var(--docs-route-skeleton-period) linear infinite;
}

/* 副波相位落后半周期：主波扫到右半时它已从左侧进场，任意时刻都有波在视口内 */
.docs-route-skeleton__wave--trailing {
  animation-delay: calc(var(--docs-route-skeleton-period) / -2);
}

@keyframes docs-route-skeleton-sweep {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(200%);
  }
}

/* 减少动效：停掉循环，留下整块静态斜向渐变（副波隐藏，避免两条带叠加出深色块） */
@media (prefers-reduced-motion: reduce) {
  .docs-route-skeleton {
    animation: none;
  }

  .docs-route-skeleton__wave {
    left: 0;
    width: 100%;
    transform: none;
    background-image: linear-gradient(
      115deg,
      transparent 20%,
      var(--colorBrandBackground2) 42%,
      var(--colorNeutralStencil1Alpha) 50%,
      var(--colorBrandBackground2) 58%,
      transparent 80%
    );
    animation: none;
  }

  .docs-route-skeleton__wave--trailing {
    display: none;
  }
}
</style>
