// 引入全局 Fluent token CSS 变量（组件 scoped style 依赖 var(--TokenName)）
// oxlint-disable-next-line import/no-unassigned-import
import '@fluere-vue/designs/tokens.css'
import FluereButton from './src/button/button.vue'
import FluereCheckbox from './src/checkbox/checkbox.vue'
import FluereCombobox from './src/combobox/combobox.vue'
import FluereInput from './src/input/input.vue'
import FluereNumberBox from './src/number-box/number-box.vue'
import FluereProgressBar from './src/progress-bar/progress-bar.vue'
import FluereProgressRing from './src/progress-ring/progress-ring.vue'
import FluereRadioButton from './src/radio/radio-button.vue'
import FluereRadioGroup from './src/radio/radio-group.vue'
import FluereScrollView from './src/scrollview/scroll-view.vue'
import FluereSlider from './src/slider/slider.vue'
import FluereToggleSwitch from './src/toggle-switch/toggle-switch.vue'

export {
  FluereButton,
  FluereCheckbox,
  FluereCombobox,
  FluereInput,
  FluereNumberBox,
  FluereProgressBar,
  FluereProgressRing,
  FluereRadioButton,
  FluereRadioGroup,
  FluereScrollView,
  FluereSlider,
  FluereToggleSwitch,
}
export type { FluereButtonProps } from './src/button/button.vue'
export type { FluereCheckboxProps } from './src/checkbox/checkbox.vue'
export type {
  FluereComboboxItem,
  FluereComboboxProps,
  FluereComboboxSelectionChangedEventArgs,
  FluereComboboxSelectionChangedTrigger,
  FluereComboboxTextSubmittedEventArgs,
} from './src/combobox/types'
export type { FluereInputProps } from './src/input/input.vue'
export type {
  FluereNumberBoxProps,
  FluereNumberBoxSpinButtonPlacementMode,
  FluereNumberBoxValidationMode,
  FluereNumberBoxValueChangedEventArgs,
} from './src/number-box/types'
export type { FluereProgressBarProps } from './src/progress-bar/progress-bar.vue'
export type {
  FluereProgressRingProps,
  FluereProgressRingSize,
} from './src/progress-ring/progress-ring.vue'
export type { FluereRadioButtonProps } from './src/radio/radio-button.vue'
export type { FluereRadioGroupProps } from './src/radio/radio-group.vue'
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
