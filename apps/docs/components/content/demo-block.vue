<script setup lang="ts">
import { ref } from 'vue'

const { t } = useDocsI18n()

const props = withDefaults(
  defineProps<{
    /** 区块标题；缺省时回退到 i18n key demo.title（「示例 / Example」） */
    title?: string
    /** 初始是否展开代码，默认收起 */
    defaultOpen?: boolean
  }>(),
  {
    title: '',
    defaultOpen: false,
  },
)

const showCode = ref(false)
const codeEl = ref<HTMLElement>()
const copied = ref(false)
/** 复制成功提示的展示时长（毫秒） */
const COPY_RESET_MS = 1600
let copyTimer: ReturnType<typeof setTimeout> | undefined = undefined

const toggleCode = () => {
  showCode.value = !showCode.value
}

const copyCode = async () => {
  const text = codeEl.value?.textContent?.replace(/^\s*\n|\s*$/g, '') ?? ''
  if (!text) {
    return
  }
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    clearTimeout(copyTimer)
    copyTimer = setTimeout(() => (copied.value = false), COPY_RESET_MS)
  } catch {
    // Clipboard 不可用时静默失败
  }
}
</script>

<template>
  <section
    class="demo-block my-fluent-xxl overflow-hidden rounded-fluent-xl border border-colorNeutralStroke1 shadow-2 bg-colorNeutralBackground1"
  >
    <!-- 实时预览 -->
    <div class="demo-block__preview p-fluent-xxl">
      <slot name="preview" />
    </div>

    <!-- 工具栏 -->
    <div
      class="flex items-center justify-between gap-4 px-fluent-xxl py-3 border-t border-colorNeutralStroke1"
    >
      <span class="text-sm font-medium text-colorNeutralForeground2">{{
        props.title || t('demo.title')
      }}</span>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="px-3 py-1.5 rounded-fluent-md text-sm text-colorNeutralForeground2 border border-colorNeutralStroke1 hover:bg-colorSubtleBackgroundHover hover:text-colorNeutralForeground1 transition-colors"
          @click="copyCode"
        >
          {{ copied ? t('demo.copied') : t('demo.copy') }}
        </button>
        <button
          type="button"
          class="px-3 py-1.5 rounded-fluent-md text-sm text-colorNeutralForeground2 border border-colorNeutralStroke1 hover:bg-colorSubtleBackgroundHover hover:text-colorNeutralForeground1 transition-colors"
          :aria-expanded="showCode"
          @click="toggleCode"
        >
          {{ showCode ? t('demo.hideCode') : t('demo.viewCode') }}
        </button>
      </div>
    </div>

    <!-- 代码（@nuxt/content 已用 Shiki 高亮） -->
    <div
      v-show="showCode"
      ref="codeEl"
      class="demo-block__code overflow-x-auto border-t border-colorNeutralStroke1"
    >
      <slot name="code" />
    </div>
  </section>
</template>

<style scoped>
.demo-block__code :deep(pre.shiki) {
  margin: 0;
  padding: 0.75rem 1rem;
  font-size: 13px;
  line-height: 1.6;
}
.demo-block__code :deep(pre.shiki code) {
  display: block;
  min-width: max-content;
}
</style>
