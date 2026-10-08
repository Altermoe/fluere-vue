<script setup lang="ts">
/**
 * 渲染 @nuxt/content 目录下、位于 /components/* 的内容（.md/.ipynb 等），
 * 沿用「Components」布局。已实现组件的文档均已迁移为 content 驱动
 * （button/input/scroll-view/icons …），此 catch-all 统一渲染它们。
 *
 * 双语说明：正文 collection 按语种拆分（见 content.config.ts）——
 * zh-Hans 是默认语种（path=/components/<slug>），en 走 /en/components/<slug>。
 * 这里按当前 locale 选择 collection，再以 route.path 精确匹配；
 * 若英文版缺失（尚未翻译），回退到默认语种中文并展示「该页暂无英文版」提示，
 * 不做静默混杂。
 */
definePageMeta({
  layout: 'components',
})

const route = useRoute()
const { locale, t } = useI18n()

// 一期只做 zh-Hans（默认）+ en；未来第三语种时再扩展回退链。
const isEnglish = computed(() => locale.value === 'en')

// 当前语种 collection：en → 'content_en'，否则默认 'content'（zh-Hans）
const localeCollection = computed(() => (isEnglish.value ? 'content_en' : 'content'))

// 命中：当前语种文档（en 命中英文版，zh 命中中文版）
const { data: doc } = await useAsyncData(
  () => `content-${route.path}`,
  () => queryCollection(localeCollection.value).where('path', '=', route.path).first(),
)

// 英文回退文档：仅英文路由才需要；未命中英文版时取中文默认语种的同一篇。
const { data: fallbackDoc } = await useAsyncData(
  () => `content-en-fallback-${route.path}`,
  () =>
    isEnglish.value
      ? queryCollection('content').where('path', '=', route.path.replace(/^\/en/, '')).first()
      : Promise.resolve(null),
)

// 实际渲染的文档与「是否处于回退态」：en 未命中 → 显示中文 + 提示条
const displayDoc = computed(() => doc.value ?? fallbackDoc.value)
const isFallback = computed(() => isEnglish.value && !doc.value)
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
    <template v-if="displayDoc">
      <ContentRenderer
        :value="displayDoc"
        class="docs-prose"
      />
      <!-- 英文版缺失（该组件文档尚未翻译）时：仍在英文路径下回退展示中文，
           但显式提示「暂无英文版」，让读者知道当前是回退内容而非静默混杂。 -->
      <div
        v-if="isFallback"
        class="mt-6 rounded-fluent-md border border-colorNeutralStroke1 bg-colorNeutralBackground1 px-fluent-lg py-3 text-sm text-colorNeutralForeground2"
      >
        {{ t('components.missingEnglishNotice') }}
      </div>
    </template>
    <p
      v-else
      class="text-colorNeutralForeground2"
    >
      {{ t('components.notFound', { path: route.path }) }}
    </p>
  </div>
</template>
