/**
 * `FluereText` 的类型契约。
 *
 * 规格来源 / 证据链写在 `text.vue` 的 `<script lang="ts">` 头注释里（WinUI 3
 * `TextBlock_themeresources.xaml` + WinUI3 Gallery `TypographyPage.xaml`），
 * 这里只保留可被消费方 import 的类型，避免在 `.vue` 与测试之间出现循环 / 重复导入。
 *
 * 类型与 props 的对应关系：
 *   - `FluereTextVariant` → WinUI 九档 `*TextBlockStyle`；
 *   - `FluereTextAlignment` → `TextBlock.TextAlignment`（Left / Right 用逻辑值 start / end）；
 *   - `FluereTextProps` → 组件 Props（`as` / `truncate` 是 Web 侧的显式映射）。
 */
import type { Component } from 'vue'

/** WinUI 3 type ramp 的九档文本样式（对应 `*TextBlockStyle` 静态资源） */
export type FluereTextVariant =
  | 'caption'
  | 'body'
  | 'bodyStrong'
  | 'bodyLarge'
  | 'bodyLargeStrong'
  | 'subtitle'
  | 'title'
  | 'titleLarge'
  | 'display'

/** 对应 `TextBlock.TextAlignment`（Left / Right 用 Web 逻辑值 start / end 表达） */
export type FluereTextAlignment = 'start' | 'center' | 'end' | 'justify'

/** `FluereText` 的 Props */
export interface FluereTextProps {
  /**
   * 文本样式档位，逐项对应 WinUI `*TextBlockStyle`
   * @default 'body'
   */
  variant?: FluereTextVariant

  /**
   * 渲染的标签或组件（默认 `span`；`truncate` 会自动改为块级盒）
   * @default 'span'
   */
  as?: string | Component

  /**
   * 单行截断（`TextTrimming=CharacterEllipsis` 的 Web 映射）
   * @default false
   */
  truncate?: boolean

  /**
   * 文本对齐（对应 `TextBlock.TextAlignment`）
   *
   * 不传时不输出对齐类、跟随父级 `text-align`（Web 可继承）；WinUI 的
   * `TextAlignment` 默认 Left 且不继承，需要与实机一致时显式传 `start`。
   */
  align?: FluereTextAlignment
}
