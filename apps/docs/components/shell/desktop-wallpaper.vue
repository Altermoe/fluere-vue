<script setup lang="ts">
 /**
 * 桌面壁纸层（0.5.5 `DesktopShell` 的最底层）。
 *
 * 规范依据：docs/design/explorer-layout.md §5《桌面壁纸层的令牌化方案》（0.5.0 已锁定）。
 *
 * 这一层只做一件事：给「桌面」一个**有明暗、有层次、值全部来自令牌**的静态背景。
 * 明确不做（explorer-layout §5 的禁项，逐条记在这里防止后人「顺手加质感」）：
 *  - ❌ `backdrop-filter` / `filter: blur()` 造「更真实的 Mica」——真实 Mica 由系统 DWM
 *    采样桌面 + 合成，公开源码树只给 FallbackColor，凭 blur 凑等于猜值；且在 SSR /
 *    无合成层场景有性能与兼容性风险。真实材质归 0.9.1 / 0.9.2。
 *  - ❌ 从截图取色、写 `#RRGGBB` 字面量（截图受强调色 / DPI / 重编码影响）。
 *  - ❌ 给壁纸加 `filter` 造景深。
 *
 * 取值（全部引用 designs 令牌，明暗由 tokens.css 的 light-dark() + color-scheme 自动切换，
 * 因此**不写两套规则**）：
 *   --micaBackgroundFillColorBase     ← WinUI SolidBackgroundFillColorBase（亮 #F3F3F3 / 暗 #202020）
 *   --micaBackgroundFillColorBaseAlt  ← WinUI SolidBackgroundFillColorBaseAlt（亮 #DADADA / 暗 #0A0A0A）
 *   两者都是「Mica 不可用时的纯色基准」，见 packages/designs/data/repo-tokens.json 的 sources.materials。
 *
 * 构图参数（角度 / 停靠点）没有 A 级来源，落 --shell-wallpaper-* 供覆写，
 * 定义与理由见 apps/docs/assets/docs-shell.css。
 */
</script>

<template>
  <!--
    纯装饰层：对 AT 隐藏、不抢 Tab 序、不拦指针（pointer-events: none 见样式块）。
    壁纸**不建层**（explorer-layout §4「壁纸不建层，直接作为 shell 根背景」），
    因此这里不写 z-index —— 它靠绘制次序待在窗口层与任务栏层之下。
  -->
  <div
    class="docs-shell-wallpaper"
    aria-hidden="true"
  />
</template>

<style scoped>
.docs-shell-wallpaper {
  position: fixed;
  inset: 0;
  /* 不拦指针：壁纸不是交互面，桌面上的点击要能穿透到它下面的层（将来放桌面图标时同理） */
  pointer-events: none;

  /*
   * 壁纸 = 两层 Mica 纯色基准的线性渐变。
   * 角度与停靠点是构图参数（无 WinUI 来源），色值一律走令牌 —— 见文件头与 docs-shell.css。
   */
  background-image: linear-gradient(
    var(--shell-wallpaper-angle),
    var(--micaBackgroundFillColorBaseAlt),
    var(--micaBackgroundFillColorBase) var(--shell-wallpaper-stop)
  );
}

/*
 * 桌面档之外的降级（< 1024px，与 --shell-desktop-breakpoint / UnoCSS `lg:` 同阈值）：
 * 移动端不仿桌面（apps/docs/README.md〈WindowsOS 仿真边界〉），仍保留壁纸底色，
 * 让降级后的全屏无边框窗口有一个柔和的底 —— 但不参与任何窗口构图。
 */
</style>
