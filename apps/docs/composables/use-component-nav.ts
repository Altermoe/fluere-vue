/**
 * 组件注册表 → 本地化视图的桥接。
 *
 * `componentNavGroups`（data/components-nav.ts）只存结构化事实（slug / name / icon /
 * palette / summaryKey / group id），不含任何随语种变化的可见文案；显示名与摘要
 * 由本 composable 用 `useDocsI18n()` 在运行期按当前 locale 解析。这样：
 *  - 语种切换时导航 / 卡片文案即时更新；
 *  - key 拼写由 `MessageSchema` 兜底（写错分组 id / summaryKey 会在 vue-tsc 下报错）。
 *
 * 返回的都是 `computed`（保持响应式，locale 变化自动重算），并沿用原有切片的
 * 字段名（title/label 双字段 → 单一 `groupTitle`，与 TODO 1.2 一致）。
 */
import type { ComputedRef, Component } from 'vue'
import { useDocsI18n } from '~/composables/use-docs-i18n'
import type { ComponentPalette } from '~/data/components-nav'
import { componentNavGroups } from '~/data/components-nav'
import type { MessageSchema } from '~/i18n/schema'

/** 已本地化的分组：原始分组 + 按 locale 解析出的标题。 */
export interface LocalizedComponentNavGroup {
  id: keyof MessageSchema['nav']['groups']
  /** 分组标题（随当前语种解析，如 基础 / Basic） */
  groupTitle: string
  palette: ComponentPalette
  items: LocalizedComponentNavItem[]
}

/** 已本地化的条目，按 implemented 分支展开。 */
export type LocalizedComponentNavItem =
  | {
      slug: string
      name: string
      implemented: true
      /** 卡片一句话摘要（随当前语种解析） */
      summary: string
      icon: Component
    }
  | {
      slug: string
      name: string
      implemented: false
    }

export const useComponentNav = () => {
  const { t } = useDocsI18n()

  const groups: ComputedRef<LocalizedComponentNavGroup[]> = computed(() =>
    componentNavGroups.map((group) => ({
      id: group.id,
      groupTitle: t(`nav.groups.${group.id}` as never),
      palette: group.palette,
      items: group.items.map((item) =>
        item.implemented
          ? {
              slug: item.slug,
              name: item.name,
              implemented: true,
              summary: t(`nav.summary.${item.summaryKey}` as never),
              icon: item.icon,
            }
          : {
              slug: item.slug,
              name: item.name,
              implemented: false,
            },
      ),
    })),
  )

  /**
   * Overview 卡片列表 = 已实现项 + 分组配色，顺序与侧边栏一致。
   * 卡片需要 palette，故在此把分组配色合入每条卡片。
   */
  const implementedCards: ComputedRef<
    (Extract<LocalizedComponentNavItem, { implemented: true }> & { palette: ComponentPalette })[]
  > = computed(() =>
    groups.value.flatMap((group) =>
      group.items.flatMap((item) =>
        item.implemented ? [{ ...item, palette: group.palette }] : [],
      ),
    ),
  )

  return { groups, implementedCards }
}
