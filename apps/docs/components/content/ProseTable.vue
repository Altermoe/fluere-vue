<template>
  <!--
    文档站表格（覆写 @nuxtjs/mdc 的内建 `ProseTable`）。

    为什么要覆写：MDC 的 `runtime/components/prose/ProseTable.vue` 是纯语义壳
    （全文只有 `<template><table><slot /></table></template>`，零样式），
    而 UnoCSS `presetWind4` 的 preflight 只给 `table` 一条 `border-collapse: collapse`，
    既没有单元格内边距也没有线框 —— 于是 API 表在页面上挤成一片、四列挤在一起。

    本组件补三件事：
      1. **横向滚动容器**：组件文档里的类型列可能很宽（如 NumberBox 的
         `'invalidInputOverwritten' | 'disabled'`），窄屏必然溢出；表格外面包一层
         可横向滚动的 div，而不是把表格压扁、或让整页横向滚动。
         注意不能靠 `table { display: block }` 实现 —— 那会让 `<thead>` / `<tbody>`
         失去表格布局语义，列宽不再对齐。
      2. **线框与内边距**：表头 / 单元格 padding、行分隔线、表头底色，
         值全部取 Fluent 语义 token（见下方 `<style scoped>`）。
      3. **表头区分**：`<thead>` / `<tbody>` 由 markdown 管道表自动产出，表头用
         `colorNeutralForeground1` + Semibold，与正文（`colorNeutralForeground2`）拉开层级。

    不设 `position: sticky` 表头：表格的滚动容器只有横向，纵向滚动由外层
    `FluereScrollView` 承担，而 ScrollView 的滚动发生在它自己的 presenter 内部
    （相对定位宿主）。sticky 的包含块仍是这个横向滚动容器，拿不到整页纵向滚动，
    粘住反而会出现悬空错位。

    列语义：markdown 管道表统一把表头行渲染进 `<thead>`，屏幕阅读器据此即可把首行
    按列头播报，无需再逐格补 `scope`（`<th>` 不在本组件模板里，也无法用 attrs 回退注入）。
  -->
  <div class="docs-table">
    <div class="docs-table__scroll">
      <table>
        <slot />
      </table>
    </div>
  </div>
</template>

<style scoped>
/* 横向滚动容器：表格保持真正的 table 布局，容器只负责在放不下时提供滚动 */
.docs-table__scroll {
  overflow-x: auto;
  /* 滚动条贴住表格下缘，避免与外层间距叠加出双倍留白 */
  margin-block-end: var(--spacingVerticalXXS);
}

/* 以下表格 / 单元格选择器一律用 `:deep()`：`<table>` / `<th>` / `<td>` / `<tr>`
   由 markdown 管道表经 MDC 渲染后作为**插槽内容**落在本组件里，
   不属于本组件的编译作用域（只有模板里写字面量的 `<div>` / `<table>` 才带 scoped 属性）。
   不加 `:deep()` 会被编译成 `.docs-table th[data-v-x]`，永远匹配不上。 */

.docs-table :deep(table) {
  width: 100%;
  /* 单元格默认按内容换行，长类型串在窄屏才不会被强行撑出容器 */
  table-layout: auto;
  font-size: var(--fontSizeBase300);
  line-height: var(--lineHeightBase300);
  color: var(--colorNeutralForeground2);
  /* 表格外框只保留上缘一条，下缘由末行 td 的 border-block-end 收口 */
  border-block-start: var(--strokeWidthThin) solid var(--colorNeutralStroke2);
}

/* 表头：底色 + 主前景色 + Semibold，与正文拉开层级 */
.docs-table :deep(th) {
  padding: var(--spacingVerticalS) var(--spacingHorizontalM);
  background-color: var(--colorNeutralBackground3);
  color: var(--colorNeutralForeground1);
  font-weight: var(--fontWeightSemibold);
  text-align: start;
  white-space: nowrap;
  border-block-end: var(--strokeWidthThin) solid var(--colorNeutralStroke1);
}

/* 单元格：纵向 8 / 横向 12，与 Fluent 表格的紧凑档一致 */
.docs-table :deep(td) {
  padding: var(--spacingVerticalS) var(--spacingHorizontalM);
  vertical-align: top;
  border-block-end: var(--strokeWidthThin) solid var(--colorNeutralStroke2);
}

/* 第一列（属性名）通常是行内 code，不换行避免列宽抖动 */
.docs-table :deep(th:first-child),
.docs-table :deep(td:first-child) {
  white-space: nowrap;
}

/* 单元格里的行内 code 跟着 14px 正文缩放；content-code.css 的全局规则
   已给出底色与圆角，这里只压住纵向内边距，避免把行高顶起来 */
.docs-table :deep(td code),
.docs-table :deep(th code) {
  padding-block: var(--spacingVerticalNone);
  font-size: 0.875em;
}
</style>
