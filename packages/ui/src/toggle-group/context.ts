/**
 * `FluereToggleGroup` 的组内上下文（本库自有，**不是** reka 的上下文）。
 *
 * reka-ui 的 `ToggleGroupRoot` 已经通过自己的 provide/inject 提供了「取值 / 选中态 /
 * roving focus」这一套上下文（`FluereToggleGroupItem` 直接消费它，见该文件注释）。
 * 这里额外开一个只有本库组件用的注入点，只承载**表现属性**：组级 `size`。
 *
 * 为什么需要它：WinUI 里没有 ToggleGroup 控件，一组 ToggleButton 只是「多个
 * ToggleButton 并排」，尺寸天然一致；Web 侧如果要求消费方在每个
 * `FluereToggleGroupItem` 上重复写 `size`，很容易出现同组内 24/32/40 混排。
 * 组上给一次、项缺省继承即可；项自己的 `size` 优先级更高。
 *
 * 独立成文件的原因：`<script setup>` 的 SFC 里不能写 ES 具名导出（编译器限制），
 * 而该 `InjectionKey` 要被组与项两个 SFC 共享。
 */
import type { ComputedRef, InjectionKey } from 'vue'

/** `FluereToggleGroupItem` 从组上继承的表现属性（目前只有尺寸档） */
export interface ToggleGroupSharedContext {
  /** 组级尺寸档；组上没传时为 `undefined`（由项自身的 `size` 或按钮缺省档决定） */
  size: ComputedRef<'small' | 'medium' | 'large' | undefined>
}

/** 组级上下文的注入键（Symbol，不与 reka 的上下文冲突） */
export const TOGGLE_GROUP_CONTEXT_KEY: InjectionKey<ToggleGroupSharedContext> =
  Symbol('FluereToggleGroup')
