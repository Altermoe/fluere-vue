<script setup lang="ts">
// 渲染 @nuxt/content 目录下、位于 /components/* 的内容（.md/.ipynb 等），
// 沿用「Components」布局。已实现组件的文档均已迁移为 content 驱动
// （button/input/scroll-view/icons …），此 catch-all 统一渲染它们。
definePageMeta({
  layout: 'components',
})

const route = useRoute()

const { data: doc } = await useAsyncData(
  () => `content-${route.path}`,
  () => queryCollection('content').where('path', '=', route.path).first(),
)
</script>

<template>
  <div>
    <!--
      `docs-prose` 是正文排版的唯一锚点（规则见 assets/docs-prose.css）。
      原先这里挂的是 `space-y-fluent-xxl`：它只给「一级子元素」补 32px 上边距，
      管不到 li / td 内部，还会把标题的「上间距 > 下间距」压成等距，
      并与 demo-block 自带的 `my-fluent-xxl` 叠加成双倍留白。
      正文节奏改由 prose 规则按元素分别给出，这里只留类名。
    -->
    <ContentRenderer
      v-if="doc"
      :value="doc"
      class="docs-prose"
    />
    <p
      v-else
      class="text-colorNeutralForeground2"
    >
      未找到内容：{{ route.path }}
    </p>
  </div>
</template>
