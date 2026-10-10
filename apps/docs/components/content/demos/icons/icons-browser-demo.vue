<script setup lang="ts">
import type { FluentIconStyle } from '@fluere-vue/icons'
// oxlint-disable-next-line import/no-namespace -- 按 exportName 动态查组件，命名导入无法枚举 1.9w+ 图标
import * as icons from '@fluere-vue/icons'
import iconsData from '@fluere-vue/icons/data'
import { FluereButton, FluereInput } from '@fluere-vue/ui'
import { computed, ref, watch } from 'vue'
import type { Component } from 'vue'

const { t } = useDocsI18n()

const PAGE_SIZE = 40
/** 页码从 1 开始 */
const FIRST_PAGE = 1
const COPY_RESET_MS = 1200
/** 图标瓦片统一渲染尺寸（保持正方形，令网格整齐） */
const ICON_TILE_SIZE = 24
const FILTER_STYLES: FluentIconStyle[] = ['regular', 'filled']

interface IconCombo {
  name: string
  size: number
  style: FluentIconStyle
  exportName: string
}

const registry = iconsData.icons
const allSizes = iconsData.sizes

const keyword = ref('')
const sizeFilter = ref<number | 'all'>('all')
const styleFilter = ref<FluentIconStyle | 'all'>('all')
const currentPage = ref(FIRST_PAGE)
const copiedName = ref<string | undefined>(undefined)

const pascalCase = (name: string): string =>
  name
    .split('_')
    .map((part) => part.replace(/^./, (char) => char.toUpperCase()))
    .join('')

const toExportName = (name: string, size: number, style: FluentIconStyle): string => {
  const styleSuffix = style.replace(/^./, (char) => char.toUpperCase())
  return `FluentIcon${pascalCase(name)}${size}${styleSuffix}`
}

const appendCombos = (list: IconCombo[], entry: (typeof registry)[number]): void => {
  for (const [sizeKey, styles] of Object.entries(entry.sizes)) {
    const size = Number(sizeKey)
    const sizeMatches = sizeFilter.value === 'all' || sizeFilter.value === size
    if (sizeMatches) {
      for (const style of styles as FluentIconStyle[]) {
        const styleMatches = styleFilter.value === 'all' || styleFilter.value === style
        if (styleMatches) {
          list.push({
            name: entry.name,
            size,
            style,
            exportName: toExportName(entry.name, size, style),
          })
        }
      }
    }
  }
}

const combos = computed<IconCombo[]>(() => {
  const query = keyword.value.trim().toLowerCase()
  const list: IconCombo[] = []
  for (const entry of registry) {
    if (!query || entry.name.includes(query)) {
      appendCombos(list, entry)
    }
  }
  return list
})

const visibleCombos = computed<IconCombo[]>(() => {
  const start = (currentPage.value - FIRST_PAGE) * PAGE_SIZE
  return combos.value.slice(start, start + PAGE_SIZE)
})

const totalPages = computed<number>(() =>
  Math.max(FIRST_PAGE, Math.ceil(combos.value.length / PAGE_SIZE)),
)

const goToPage = (page: number): void => {
  currentPage.value = Math.min(Math.max(FIRST_PAGE, page), totalPages.value)
}

// 关键词/筛选变化后回到第一页，避免停留在空页
watch([keyword, sizeFilter, styleFilter, combos], () => {
  currentPage.value = FIRST_PAGE
})

const iconComponents = icons as unknown as Record<string, Component | undefined>

const getIconComponent = (exportName: string): Component | undefined => iconComponents[exportName]

const toggleSizeFilter = (size: number): void => {
  if (sizeFilter.value === size) {
    sizeFilter.value = 'all'
    return
  }
  sizeFilter.value = size
}

const toggleStyleFilter = (style: FluentIconStyle): void => {
  if (styleFilter.value === style) {
    styleFilter.value = 'all'
    return
  }
  styleFilter.value = style
}

const copyName = async (exportName: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(exportName)
  } catch {
    return
  }
  copiedName.value = exportName
  globalThis.setTimeout(() => {
    if (copiedName.value === exportName) {
      copiedName.value = undefined
    }
  }, COPY_RESET_MS)
}
</script>

<template>
  <div>
    <div class="flex gap-fluent-m items-center flex-wrap mb-fluent-l">
      <FluereInput
        v-model="keyword"
        type="search"
        :placeholder="t('demos.icons.browser.placeholder')"
        class="max-w-sm"
      />
      <div class="flex gap-fluent-xs flex-wrap items-center">
        <FluereButton
          v-for="size in allSizes"
          :key="size"
          appearance="outline"
          :selected="sizeFilter === size"
          @click="toggleSizeFilter(size)"
        >
          {{ size }}
        </FluereButton>
        <FluereButton
          appearance="outline"
          :selected="sizeFilter === 'all'"
          @click="sizeFilter = 'all'"
        >
          {{ t('demos.icons.browser.buttonAllSizes') }}
        </FluereButton>
      </div>
      <div class="flex gap-fluent-xs flex-wrap items-center">
        <FluereButton
          v-for="style in FILTER_STYLES"
          :key="style"
          appearance="outline"
          :selected="styleFilter === style"
          @click="toggleStyleFilter(style)"
        >
          {{ style }}
        </FluereButton>
        <FluereButton
          appearance="outline"
          :selected="styleFilter === 'all'"
          @click="styleFilter = 'all'"
        >
          {{ t('demos.icons.browser.buttonAllStyles') }}
        </FluereButton>
      </div>
    </div>

    <p class="text-colorNeutralForeground2 text-sm mb-fluent-l">
      {{
        t('demos.icons.browser.note', {
          total: combos.length,
          pageSize: PAGE_SIZE,
          visible: visibleCombos.length,
        })
      }}
    </p>

    <div class="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-fluent-s">
      <button
        v-for="combo in visibleCombos"
        :key="combo.exportName"
        type="button"
        class="flex flex-col items-center justify-center gap-fluent-xs p-fluent-m rounded-fluent-md border border-colorNeutralStroke2 bg-colorNeutralBackground1 hover:bg-colorNeutralBackground1Hover transition-colors"
        :title="combo.exportName"
        @click="copyName(combo.exportName)"
      >
        <component
          :is="getIconComponent(combo.exportName)"
          :size="ICON_TILE_SIZE"
          class="text-colorNeutralForeground1"
        />
        <span class="w-full text-center text-xs text-colorNeutralForeground2 truncate">{{
          combo.exportName
        }}</span>
      </button>
    </div>

    <div class="mt-fluent-l flex items-center gap-fluent-m flex-wrap">
      <nav
        class="flex items-center gap-fluent-xs"
        :aria-label="t('demos.icons.browser.labelPager')"
      >
        <FluereButton
          appearance="outline"
          :disabled="currentPage <= 1"
          @click="goToPage(currentPage - 1)"
        >
          {{ t('demos.icons.browser.buttonPrev') }}
        </FluereButton>
        <span class="text-sm text-colorNeutralForeground2">
          {{ currentPage }} / {{ totalPages }}
        </span>
        <FluereButton
          appearance="outline"
          :disabled="currentPage >= totalPages"
          @click="goToPage(currentPage + 1)"
        >
          {{ t('demos.icons.browser.buttonNext') }}
        </FluereButton>
      </nav>
      <span
        v-if="copiedName"
        class="text-sm text-colorBrandForeground1"
      >
        {{ t('demos.icons.browser.status', { name: copiedName }) }}
      </span>
    </div>
  </div>
</template>
