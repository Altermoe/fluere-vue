// 引入全局 Fluent token CSS 变量（组件 scoped style 依赖 var(--TokenName)）
// oxlint-disable-next-line import/no-unassigned-import
import '@fluere-vue/designs/tokens.css'
// 共享原语样式：WinUI 双层焦点矩形（非 scoped，理由见该文件头注释；0.4.3）
// oxlint-disable-next-line import/no-unassigned-import
import './src/focus-visual/focus-visual.css'
import FluereAppWindow from './src/app-window/app-window.vue'
import FluereCaptionButtons from './src/app-window/caption-buttons.vue'
import FluereButton from './src/button/button.vue'
import FluereCheckbox from './src/checkbox/checkbox.vue'
import FluereCombobox from './src/combobox/combobox.vue'
import FluereConfigProvider from './src/config-provider/config-provider.vue'
import FluereContentDialog from './src/content-dialog/content-dialog.vue'
// 共享原语（0.4.0 基建）：先 import 再本地 export —— 与下面组件一致。
// 不要写成 `export { A, B } from '...'`：当前 Vite 变换会把其中的常量再导出
// 提成一个引用本地绑定的 `export { A }`，而对应的 import 不生成，产物在运行期报
// 「Export 'A' is not defined in module」，文档站整页 500（2026-10-13 踩过）。
import { FOCUS_VISUAL_CLASS, useFocusVisual } from './src/focus-visual/use-focus-visual'
import FluereInfoBadge from './src/info-badge/info-badge.vue'
import FluereInfoBar from './src/infobar/infobar.vue'
import FluereInput from './src/input/input.vue'
import FluereNumberBox from './src/number-box/number-box.vue'
import FluereSmokeLayer from './src/overlay/smoke-layer.vue'
import FluereProgressBar from './src/progress-bar/progress-bar.vue'
import FluereProgressRing from './src/progress-ring/progress-ring.vue'
import FluereRadioButton from './src/radio/radio-button.vue'
import FluereRadioGroup from './src/radio/radio-group.vue'
import FluereScrollView from './src/scrollview/scroll-view.vue'
import { SCROLL_VIEW_AGENT_EVENTS } from './src/scrollview/use-agent-surface'
import FluereSlider from './src/slider/slider.vue'
import FluereToggleSwitch from './src/toggle-switch/toggle-switch.vue'
import FluereTooltipProvider from './src/tooltip/tooltip-provider.vue'
import FluereTooltip from './src/tooltip/tooltip.vue'

export {
  FluereAppWindow,
  FluereButton,
  FluereCaptionButtons,
  FluereCheckbox,
  FluereCombobox,
  FluereConfigProvider,
  FluereContentDialog,
  FluereInfoBadge,
  FluereInfoBar,
  FluereInput,
  FluereNumberBox,
  FluereProgressBar,
  FluereProgressRing,
  FluereRadioButton,
  FluereRadioGroup,
  FluereScrollView,
  FluereSlider,
  FluereSmokeLayer,
  FluereToggleSwitch,
  FluereTooltip,
  FluereTooltipProvider,
  SCROLL_VIEW_AGENT_EVENTS,
  // 共享原语（0.4.0 基建）
  FOCUS_VISUAL_CLASS,
  useFocusVisual,
}
export type {
  UseFocusVisualOptions,
  UseFocusVisualReturn,
} from './src/focus-visual/use-focus-visual'
export type { FluereButtonProps } from './src/button/button.vue'
export type {
  FluereAppWindowDisplayMode,
  FluereAppWindowDragEndEventArgs,
  FluereAppWindowDragMoveEventArgs,
  FluereAppWindowDragStartEventArgs,
  FluereAppWindowLeftHeaderSpacing,
  FluereAppWindowProps,
  FluereAppWindowTitleBarDoubleClickEventArgs,
  FluereAppWindowTitleBarSize,
  FluereCaptionButtonsLabels,
  FluereCaptionButtonsProps,
} from './src/app-window/types'
export type { FluereCheckboxProps } from './src/checkbox/checkbox.vue'
export type { FluereConfigProviderProps } from './src/config-provider/config-provider.vue'
export type {
  FluereComboboxItem,
  FluereComboboxProps,
  FluereComboboxSelectionChangedEventArgs,
  FluereComboboxSelectionChangedTrigger,
  FluereComboboxTextSubmittedEventArgs,
} from './src/combobox/types'
export type {
  FluereContentDialogButton,
  FluereContentDialogButtonClickEventArgs,
  FluereContentDialogButtonKind,
  FluereContentDialogButtonVisibility,
  FluereContentDialogClosedEventArgs,
  FluereContentDialogClosingEventArgs,
  FluereContentDialogProps,
  FluereContentDialogResult,
} from './src/content-dialog/types'
export type {
  FluereInfoBadgeDisplayKind,
  FluereInfoBadgeIconSeverity,
  FluereInfoBadgeProps,
  FluereInfoBadgeSeverity,
} from './src/info-badge/types'
export type {
  FluereInfoBarClosedEventArgs,
  FluereInfoBarClosingEventArgs,
  FluereInfoBarCloseReason,
  FluereInfoBarProps,
  FluereInfoBarSeverity,
} from './src/infobar/types'
export type { FluereInputProps } from './src/input/input.vue'
export type { FluerePasswordRevealMode } from './src/input/types'
export type {
  FluereNumberBoxProps,
  FluereNumberBoxSpinButtonPlacementMode,
  FluereNumberBoxValidationMode,
  FluereNumberBoxValueChangedEventArgs,
} from './src/number-box/types'
export type { FluereProgressBarProps } from './src/progress-bar/progress-bar.vue'
export type { FluereSmokeLayerProps } from './src/overlay/smoke-layer.vue'
export type {
  FluereProgressRingProps,
  FluereProgressRingSize,
} from './src/progress-ring/progress-ring.vue'
export type { FluereRadioButtonProps } from './src/radio/radio-button.vue'
export type { FluereRadioGroupProps } from './src/radio/radio-group.vue'
export type {
  FluereTooltipAlign,
  FluereTooltipPlacement,
  FluereTooltipProps,
  FluereTooltipProviderProps,
} from './src/tooltip/types'
export type {
  FluereToggleSwitchProps,
  FluereToggleSwitchSize,
} from './src/toggle-switch/toggle-switch.vue'
export type {
  FluereSliderOrientation,
  FluereSliderProps,
  FluereSliderTickPlacement,
} from './src/slider/types'
export type {
  FluereScrollViewProps,
  ScrollingAgentBringIntoViewDetail,
  ScrollingAgentScrollDetail,
  ScrollingAgentSettledDetail,
  ScrollingAnchorRequestedEventArgs,
  ScrollingAnimationMode,
  ScrollingBringingIntoViewEventArgs,
  ScrollingChainMode,
  ScrollingContentOrientation,
  ScrollingInputKinds,
  ScrollingInteractionState,
  ScrollingRailMode,
  ScrollingScrollAnimationStartingEventArgs,
  ScrollingScrollBarVisibility,
  ScrollingScrollCompletedEventArgs,
  ScrollingScrollMode,
  ScrollingScrollOptions,
  ScrollingSnapPointsMode,
  ScrollingZoomAnimationStartingEventArgs,
  ScrollingZoomCompletedEventArgs,
  ScrollingZoomMode,
  ScrollingZoomOptions,
} from './src/scrollview/types'
