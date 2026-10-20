<script lang="ts">
/**
 * FluereSplitButton 内部基座 —— **不对外导出**；公开组件是
 * `./split-button.vue`（FluereSplitButton）与 `./toggle-split-button.vue`
 * （FluereToggleSplitButton）。拆基座的原因：WinUI 的两个 runtimeclass
 * （`SplitButton` / `ToggleSplitButton`）共用同一份模板与主题资源，差异只有
 * 「主区点击是否切换 IsChecked」与 checked 状态色；如果写成两个完整 SFC，模板与
 * 状态表会复制两份并各自漂移。
 *
 * 规格来源：microsoft-ui-xaml tag `winui3/release/2.5.1`（commit `ba3a8d5`，本地快照
 * `temp/winui-src`）
 *   - `src/controls/dev/SplitButton/SplitButton.xaml`（模板结构 / 状态组 / 内层按钮）
 *   - `src/controls/dev/SplitButton/SplitButton_themeresources.xaml`（画刷 / 几何）
 *   - `src/controls/dev/SplitButton/SplitButton.cpp`（键盘 / 状态机 / 浮层开关）
 *   - `src/controls/dev/SplitButton/ToggleSplitButton.cpp`（勾选语义）
 *   - `src/controls/dev/SplitButton/SplitButtonAutomationPeer.cpp`（UIA 模式）
 *   - `src/controls/dev/AnimatedIcon/AnimatedVisuals/AnimatedChevronDownSmallVisualSource.cpp`
 *     （箭头动效关键帧；Duration() = 4833333 ticks = 483.3ms / 29 帧 @60fps）
 *
 * ── 模板结构（逐层对照 A 级 `SplitButton.xaml#SplitButtonStyle`）────────────────
 *   RootGrid（本实现 = `.fui-split-button`，inline-grid，CornerRadius 由两半各自裁）
 *     ColumnDefinitions：Primary `*` MinWidth=35 | Separator 1 | Secondary 35
 *     PrimaryBackgroundGrid（跨主区 + 分隔线，Background = SplitButtonBackground）
 *     DividerBackgroundGrid（1px，SplitButtonBorderBrushDivider）
 *     SecondaryBackgroundGrid（箭头区，Background = SplitButtonBackground）
 *     Button PrimaryButton（Padding = SplitButtonPadding 11,6,11,7）
 *     Button SecondaryButton（Padding 0,0,12,0，内容 = 12×12 AnimatedChevronDownSmall）
 *     Grid PrimaryButtonBorder（BorderThickness 1,1,0,1，CornerRadius 4,0,0,4）
 *     Grid SecondaryButtonBorder（BorderThickness 0,1,1,1，CornerRadius 0,4,4,0）
 *
 * 本实现把两个 BackgroundGrid 的底色直接画在各自 Button 上（同一像素结果，少两层
 * 无 DOM 语义的节点）；两个 Border 覆盖层照抄（保证 1px 描边不占内容盒、且两半各自
 * 有独立圆角）。**未复制的模板细节**（均无像素差异，注明原因）：
 *   - `SecondaryButtonSpan`：键盘按下时把箭头按钮临时改为跨 3 列。A 级里内层 Button
 *     的模板根是硬编码 `Background="Transparent"`，跨列不改变任何像素；本实现把
 *     键盘按下态映射为「两半都显示 pressed 底色」，不复制跨列几何。
 *   - `TouchPressed`：触屏按下时两半同时 pressed。浏览器指针模型下由各半的 `:active`
 *     提供单区反馈；跨半同时按下态未单独实现（有意差异，见组件文档「已知缺口」）。
 *
 * ── 状态机（A 级 `SplitButton.cpp#UpdateVisualStates` 的判定顺序）───────────────
 *   1. !IsEnabled                     → Disabled（背景 = ControlFillColorDisabled，
 *                                        前景 = TextFillColorDisabled，描边 =
 *                                        ControlStrokeColorDefault，分隔线不变）
 *   2. m_isFlyoutOpen                 → FlyoutOpen / CheckedFlyoutOpen
 *   3. InternalIsChecked              → Checked* / CheckedTouchPressed
 *   4. 否则按指针位置 / 键盘按下       → PrimaryPointerOver / SecondaryPressed / TouchPressed …
 *   本实现用根节点上的 `data-state="open"` + `data-checked` + `data-keyboard-pressed`
 *   三个状态位 + 各半的 `:hover` / `:active` 表达同一判定顺序（CSS 规则顺序即优先级：
 *   键盘按下 < 浮层打开，Disabled 最高）。
 *
 * ── WinUI 资源名 → Fluent token 映射（同值优先；无同值档落组件局部变量）──────────
 *   SplitButtonBackground               ← ControlFillColorDefaultBrush     → --colorNeutralBackground1
 *   SplitButtonBackgroundPointerOver    ← ControlFillColorSecondaryBrush   → --colorNeutralBackground1Hover
 *   SplitButtonBackgroundPressed        ← ControlFillColorTertiaryBrush    → --colorNeutralBackground1Pressed
 *   SplitButtonBackgroundDisabled       ← ControlFillColorDisabledBrush    → --colorNeutralBackgroundDisabled
 *   SplitButtonBackgroundChecked        ← AccentFillColorDefaultBrush      → --colorBrandBackground
 *   SplitButtonBackgroundCheckedPointerOver ← AccentFillColorSecondaryBrush → --colorBrandBackgroundHover
 *   SplitButtonBackgroundCheckedPressed ← AccentFillColorTertiaryBrush     → --colorBrandBackgroundPressed
 *   SplitButtonForeground               ← TextFillColorPrimaryBrush        → --colorNeutralForeground1
 *   SplitButtonForegroundPointerOver    ← TextFillColorPrimaryBrush        → --colorNeutralForeground1
 *   SplitButtonForegroundPressed        ← TextFillColorSecondaryBrush      → --colorNeutralForeground2
 *   SplitButtonForegroundDisabled       ← TextFillColorDisabledBrush       → --colorNeutralForegroundDisabled
 *   SplitButtonForegroundChecked        ← TextOnAccentFillColorPrimaryBrush → --colorNeutralForegroundOnBrand
 *   SplitButtonForegroundCheckedPointerOver ← TextOnAccentFillColorPrimaryBrush → --colorNeutralForegroundOnBrand
 *   SplitButtonForegroundCheckedPressed ← TextOnAccentFillColorSecondaryBrush
 *                                       → **无同值 token**，落
 *                                         `--fui-split-button-checked-pressed-foreground`
 *                                         （亮 #B3FFFFFF / 暗 #80000000）
 *   SplitButtonForegroundSecondary      ← TextFillColorSecondaryBrush      → --colorNeutralForeground2
 *   SplitButtonForegroundSecondaryPressed ← TextFillColorTertiaryBrush     → --colorNeutralForeground3
 *   SplitButtonBorderBrush              ← ControlElevationBorderBrush（渐变）→ --colorNeutralStroke1
 *   SplitButtonBorderBrushPointerOver   ← ControlElevationBorderBrush      → --colorNeutralStroke1
 *   SplitButtonBorderBrushPressed       ← ControlStrokeColorDefaultBrush   → --repotoken `--controlStrokeColorDefault`
 *   SplitButtonBorderBrushDisabled      ← ControlStrokeColorDefaultBrush   → --controlStrokeColorDefault
 *   SplitButtonBorderBrushDivider       ← ControlStrokeColorDefaultBrush   → --controlStrokeColorDefault
 *   SplitButtonBorderBrushChecked       ← AccentControlElevationBorderBrush
 *                                       → **token 表无同值档**；该画刷是强调底上的低对比
 *                                         明暗渐变（ControlStrokeColorOnAccent{Secondary,Default}），
 *                                         本库与 ToggleButton 同口径取 `transparent`，
 *                                         落 `--fui-split-button-checked-border` 供覆写
 *   SplitButtonBorderBrushCheckedPressed ← ControlFillColorTransparentBrush → transparent
 *   SplitButtonBorderBrushCheckedDivider ← ControlStrokeColorOnAccentTertiaryBrush
 *                                       → **无同值 token**（亮暗均为 #37000000），落
 *                                         `--fui-split-button-checked-divider`
 *   SplitButtonBorderThemeThickness = 1；SplitButtonPrimaryButtonSize = 35；
 *   SplitButtonSecondaryButtonSize = 35；SplitButtonPadding = 11,6,11,7；
 *   ControlCornerRadius = 4 → --borderRadiusMedium；ControlContentThemeFontSize = 14
 *   → --fontSizeBase300；FontWeight = Normal → --fontWeightRegular。
 *
 * 箭头动效（A 级 `AnimatedChevronDownSmallVisualSource.cpp`，按 LottieGen 关键帧折算）：
 *   - 状态标记：NormalToPointerOver_End = 0（悬停不动）；NormalToPressed 0 → 0.3121；
 *     PressedToNormal 0.3466 → 0.9672；整段 Duration = 4833333 ticks（483.3ms）。
 *   - 动画对象是 48×48 舞台里的雪佛龙 `Offset`，图标按 12×12 渲染 ⇒ 1 舞台单位 = 0.25px。
 *   - NormalToPressed：Offset y 24 → 31.5（下移 1.875px），帧 0–9 = 150.8ms，
 *     缓动 cubic-bezier(0.167, 0.167, 0.65, 1)。
 *   - PressedToNormal：y 31.5 → 21（上移 2.625px 到 −0.75px），再 → 24（回 0）；
 *     帧 10–15 用 cubic-bezier(0.55, 0, 0.75, 1)、帧 15–29 用 cubic-bezier(0.35, 0, 0, 1)，
 *     整段 316.7ms（483.3 × (1 − 0.3448)）。
 *   - 本实现用两段 CSS keyframes 复刻；两个时长与两条缓动都落组件局部变量，
 *     注明「无同值 token」的取值来源。`prefers-reduced-motion` 下关闭动画。
 *
 * 浮层（`#flyout` 插槽 + 临时面板）：
 *   - 定位：A 级 `SplitButton.cpp#OpenFlyout` 固定
 *     `FlyoutPlacementMode::BottomEdgeAlignedLeft`，对应 reka `PopoverContent`
 *     的 `side="bottom"` + `align="start"`（偏移 0，A 级没有 offset 资源）。
 *   - 面板：0.6.1 `MenuFlyout` 之前先按通用 `FlyoutPresenter` 资源给一层轻量面板，
 *     `FlyoutPresenter_themeresources.xaml`：Background = AcrylicInAppFillColorDefaultBrush
 *     → `--acrylicInAppFillColorDefault`（FallbackColor，真实 Acrylic 合成归 0.9.2）；
 *     Border = SurfaceStrokeColorFlyoutBrush → `--surfaceStrokeColorFlyout`；
 *     CornerRadius = OverlayCornerRadius(8) → --borderRadiusXLarge；
 *     Padding = FlyoutContentPadding 16,15,16,17；MinWidth 96 / MaxWidth 456 /
 *     MinHeight 40 / MaxHeight 758；阴影取 `--shadow16`（**证据缺口**：FlyoutBase 的
 *     `ApplyElevationEffect` baseElevation 不在本快照的公开源码内，工具提示用的是 16，
 *     这里暂取同档并允许消费方覆写 `--fui-split-button-flyout-shadow`）。
 *   - 关闭路径：Esc / 外部 pointerdown / 焦点移出由 reka `DismissableLayer` 负责，
 *     层级由 `useFlyout`（`--zIndexMenu` + 嵌套提升）负责；焦点归还由 reka
 *     `FocusScope` 负责 —— 与 Combobox / Select 在 0.4.1 定下的分工一致。
 *     落在触发区（主区 / 箭头区）内的 pointerdown / focusout 会被显式 `preventDefault`，
 *     否则「点击箭头区关闭」会先被 light dismiss 关掉、再被 click 重新打开。
 *   - 退出动效：临时面板暂无，关闭即卸载（菜单族动效归 0.6.1）。因此本组件不用
 *     `isClosing`，`closed` 事件在 `isOpen` 变 false 时立即抛。
 *
 * ── 真实浏览器实测（2026-10-20，Chromium / 1440×1000）─────────────────────────
 * 方法：`node temp/pw-split-button.mjs`（脚本读 computedStyle / getBoundingClientRect，
 * 明暗两套 + 浮层开合 + 键盘路径，50/50 断言通过；截图在 temp/split-button-verify/，
 * temp/ 不提交、也不作为唯一证据 —— 预期值与结论固化在本注释与契约测试里）。
 * 关键预期值（与上方 A 级资源一一对应，均实测命中）：
 *   · 控件高 33px（6 + 20 行高 + 7）、箭头区 35px、分隔线 1px、雪佛龙 12×12；
 *   · 主区 padding 11 / 6 / 7、圆角 4、字号 14 / 行高 20 / 字重 400；
 *   · rest 背景 #ffffff / 前景 #242424；hover #f5f5f5（箭头前景切到 #242424）；
 *     pressed #e0e0e0 / 前景 #424242；打开态箭头前景 #616161；
 *   · 浮层：左对齐控件左边、底边贴控件底边（offset 0），padding 15/16/17，
 *     圆角 8，背景 rgba 等价 #f9f9f9，描边 SurfaceStrokeColorFlyout，阴影非 none，
 *     层级 1100（--zIndexMenu），Teleport 到 body，role=dialog + 箭头区可访问名；
 *   · 键盘：Esc 关闭并把焦点还给箭头区、F4 / Alt+Down 打开、Tab 主区→箭头区、
 *     Space 按住出现 data-keyboard-pressed 且两半 pressed；
 *   · Space/Enter 按住期间只触发一次主区动作（与 WinUI m_isKeyDown 一致）。
 * 修复记录：首轮实测抓到「Esc 后焦点丢到 body」——reka FocusScope 在没有
 * `PopoverTrigger` 时把焦点还原到 body，遂改为 `useFlyout(returnFocus: true)` +
 * `close-auto-focus` preventDefault，由原语负责归还；该结论已写进下方差异 / 关闭路径注释。
 *
 * ── 与 WinUI 的有意差异 ──────────────────────────────────────────────────────
 *   1. **焦点 / Tab 序**（用户 2026-10-20 确认的口径）：WinUI 整个控件只有一个
 *      Tab stop（内层按钮 IsTabStop=False），箭头区只能指针或 Alt+Down / F4 到达；
 *      本库按 WAI-ARIA APG 的 split button 模式把主区与箭头区做成两个各自可 Tab 的
 *      `<button>`（todo 0.6.4 验收要求「各自可达」），同时保留 WinUI 的全部快捷键。
 *      每个按钮各自套共享原语 `useFocusVisual`；WinUI 的 `FocusVisualMargin=-1`
 *      在双按钮结构下不再适用，统一走原语的 −3 外扩（0.9.3 会统一焦点矩形）。
 *   2. **浮层面板**：临时 FlyoutPresenter 语义（0.6.1 换 MenuFlyout 内容，API 不变）。
 *   3. **受控 checked**：`ToggleSplitButton.IsChecked` 在 WinUI 是自管状态；本库沿用
 *      `FluereToggleButton` 的受控口径（点击只抛 `update:checked`，由消费方写回）。
 *   4. **AppBar / CommandBar 风格未实现**：`SplitButtonCommandBarStyle` 与
 *      `SplitButtonInAppBarUnfocusedPointerOver` 属命令栏场景，归 0.8.3 `CommandBar`
 *      （届时作为新变体接入，不改本组件默认外观）。
 */
export type {
  FluereSplitButtonFlyoutSlotProps,
  FluereSplitButtonProps,
  FluereToggleSplitButtonProps,
} from './types'
</script>

<script setup lang="ts">
import { useScopeMessages } from '@fluere-vue/hooks'
import { FluentIconChevronDown12Regular } from '@fluere-vue/icons'
import { PopoverAnchor, PopoverContent, PopoverPortal, PopoverRoot } from 'reka-ui'
import type { FocusOutsideEvent, PointerDownOutsideEvent } from 'reka-ui'
import { computed, onMounted, ref, useId, watch } from 'vue'
import { useFlyout } from '../flyout/use-flyout'
import type { FlyoutCloseReason } from '../flyout/use-flyout'
import { useFocusVisual } from '../focus-visual/use-focus-visual'
import { splitButtonLocale } from './locale'
import type { FluereSplitButtonFlyoutSlotProps, SplitButtonBaseProps } from './types'

defineOptions({
  name: 'FluereSplitButtonBase',
  /**
   * 关闭属性继承：模板根是 `PopoverRoot`（不产出 DOM），`$attrs` 需要显式落到真正的
   * 控件根 `<div class="fui-split-button">` 上，否则 class / data-* 会落到浮层上下文中。
   */
  inheritAttrs: false,
})

const props = withDefaults(defineProps<SplitButtonBaseProps>(), {
  disabled: false,
  label: undefined,
  secondaryLabel: undefined,
  open: undefined,
  hasPopup: 'dialog',
  type: 'button',
  locale: undefined,
  toggleable: false,
  checked: false,
})

const emit = defineEmits<{
  /** 主区点击（对应 WinUI `Click`）；浮层打开时点击主区只关闭浮层 */
  'click': [event: MouseEvent]
  /** 浮层开关回写（`v-model:open`） */
  'update:open': [value: boolean]
  /** 浮层已打开（对应 `Flyout.Opened`） */
  'opened': []
  /** 浮层已关闭（对应 `Flyout.Closed`） */
  'closed': []
  /** 勾选状态回写（`v-model:checked`，仅 ToggleSplitButton） */
  'update:checked': [value: boolean]
  /** 勾选状态变化（对应 `ToggleSplitButton.IsCheckedChanged`，载荷为新值） */
  'isCheckedChanged': [value: boolean]
}>()

/** 内建文案：scope=`split-button`，locale prop 优先、否则跟随 Provider */
const i18n = useScopeMessages('split-button', splitButtonLocale, () => props.locale)

/** 箭头区可访问名：显式 secondaryLabel 压过 locale 的「更多选项 / More Options」 */
const secondaryAriaLabel = computed(() => props.secondaryLabel ?? i18n.t('moreOptions'))

/** 焦点环：WinUI 双层焦点矩形（0.4.3 共享原语），几何与来源见 focus-visual.css */
const focusVisual = useFocusVisual()

const rootRef = ref<HTMLElement | null>(null)
const secondaryRef = ref<HTMLButtonElement | null>(null)

/**
 * 受控 / 非受控：`open === undefined` 时由本组件自管（`innerOpen`），否则只认 Prop。
 * reka `PopoverRoot` 负责定位与关闭路径（DismissableLayer），状态事实源仍在本组件，
 * 与 Select 的 `applyOpen` 模式一致。
 */
const innerOpen = ref(false)
const isOpen = computed(() => props.open ?? innerOpen.value)

const applyOpen = (value: boolean): void => {
  if (value === isOpen.value) {
    return
  }
  if (props.open === undefined) {
    innerOpen.value = value
  }
  emit('update:open', value)
}

/** 浮层层级：`--zIndexMenu` 档 + 嵌套提升（0.4.1）；关闭路径交给 reka，故全部关掉 */
const flyout = useFlyout({
  tier: '--zIndexMenu',
  open: () => isOpen.value,
  // 关闭路径由 reka DismissableLayer 触发，但**焦点归还**由本原语负责：
  // reka 的 FocusScope 在没有 PopoverTrigger 的场景会把焦点还到 body（实测），
  // 这里用原语记录打开前的 activeElement 并在关闭后还回去（见 onFlyoutCloseAutoFocus）。
  closeOnEscape: false,
  closeOnOutsidePointer: false,
  returnFocus: true,
  onClosed: () => emit('closed'),
})
/**
 * 层级样式必须**解构到顶层 ref** 再进模板：Vue 只对顶层绑定做 ref 自动解包，
 * `:style="flyout.layerStyle"` 拿到的是 ComputedRef 本体而不是样式对象，z-index 会静默失效
 * （0.4.1 真实浏览器实测踩过，见 `../combobox/combobox.vue` 同处注释）。
 */
const { layerStyle: flyoutLayerStyle } = flyout

/* ------------------------------------------------------------------ */
/* 打开 / 关闭                                                         */
/* ------------------------------------------------------------------ */

const openFlyout = (): void => {
  if (props.disabled) {
    return
  }
  applyOpen(true)
}

const closeFlyout = (_reason: FlyoutCloseReason = 'programmatic'): void => {
  applyOpen(false)
}

const toggleFlyout = (): void => {
  if (props.disabled) {
    return
  }
  applyOpen(!isOpen.value)
}

/** `#flyout` 插槽上下文（等价 XAML 里对 `Flyout.Hide()` 的访问） */
const flyoutSlotProps = computed<FluereSplitButtonFlyoutSlotProps>(() => ({
  close: closeFlyout,
}))

watch(isOpen, (value) => {
  if (value) {
    emit('opened')
    return
  }
  // 临时面板没有退出动画：关闭即已结束，立即收尾（归还焦点 + 抛 closed）。
  // 0.6.1 菜单族补退出动效后改成 animationend 再调 finishClose。
  flyout.finishClose()
})

/* ------------------------------------------------------------------ */
/* 关闭路径：触发区内的 pointerdown / focusout 不算 light dismiss        */
/* ------------------------------------------------------------------ */

const isInsideTrigger = (target: EventTarget | null): boolean =>
  target instanceof Node && rootRef.value?.contains(target) === true

/**
 * 点击主区 / 箭头区时，reka 的 DismissableLayer 会先判成 outside 并关闭浮层；
 * 这里把触发区排除掉，交给按钮自己的 click 判断（主区 = 只关浮层，箭头区 = 切换）。
 */
const onFlyoutPointerDownOutside = (event: PointerDownOutsideEvent): void => {
  if (isInsideTrigger(event.target)) {
    event.preventDefault()
  }
}

/** 同上：按下箭头区时焦点会移到按钮上，不能被判成「焦点移出浮层」而关闭 */
const onFlyoutFocusOutside = (event: FocusOutsideEvent): void => {
  if (isInsideTrigger(event.target)) {
    event.preventDefault()
  }
}

/**
 * 阻止 reka FocusScope 的 `closeAutoFocus` 默认归还：本组件没有 `PopoverTrigger`，
 * FocusScope 记录的「打开前元素」在真实浏览器里会退化成 `body`（实测 Esc 后焦点丢失）。
 * 焦点归还统一由 `useFlyout(returnFocus: true)` 在 `onClosed` 里完成。
 */
const onFlyoutCloseAutoFocus = (event: Event): void => {
  event.preventDefault()
}

/* ------------------------------------------------------------------ */
/* 主区 / 箭头区点击                                                    */
/* ------------------------------------------------------------------ */

const onPrimaryClick = (event: MouseEvent): void => {
  if (props.disabled) {
    return
  }
  // WinUI：浮层打开时点击控件本体走 light dismiss，主区 Click 不触发
  if (isOpen.value) {
    applyOpen(false)
    return
  }
  if (props.toggleable) {
    const next = !props.checked
    // 对齐 ToggleSplitButton.cpp#OnClickPrimary：先 Toggle()，再走父类 OnClickPrimary
    emit('update:checked', next)
    emit('isCheckedChanged', next)
  }
  emit('click', event)
}

const onSecondaryClick = (): void => {
  toggleFlyout()
}

/* ------------------------------------------------------------------ */
/* 键盘：Space/Enter 按下态、Alt+Down / F4 开浮层                        */
/* ------------------------------------------------------------------ */

/** 对齐 A 级 `m_isKeyDown`：Space / Enter / GamepadA 按下期间整控件显示按下态 */
const keyboardPressed = ref(false)

const onKeydown = (event: KeyboardEvent): void => {
  if (props.disabled) {
    return
  }
  // A 级：Alt+Down 与 F4 打开浮层（OnSplitButtonKeyUp 的判定，keydown 阶段落地）
  if (event.key === 'F4' || (event.key === 'ArrowDown' && event.altKey)) {
    event.preventDefault()
    openFlyout()
    return
  }
  // APG split button：箭头区上的 ArrowDown 打开浮层（WinUI 外的可发现性补充）
  if (event.key === 'ArrowDown' && event.target === secondaryRef.value) {
    event.preventDefault()
    openFlyout()
    return
  }
  if (event.key === ' ' || event.key === 'Enter') {
    keyboardPressed.value = true
  }
}

const onKeyup = (event: KeyboardEvent): void => {
  if (event.key === ' ' || event.key === 'Enter') {
    keyboardPressed.value = false
  }
}

/** 焦点离开整个控件时清掉按下态（`blur` 不冒泡，必须用 `focusout`） */
const onFocusOut = (event: FocusEvent): void => {
  const next = event.relatedTarget
  if (next instanceof Node && rootRef.value?.contains(next)) {
    return
  }
  keyboardPressed.value = false
}

/* ------------------------------------------------------------------ */
/* 箭头动效：NormalToPressed / PressedToNormal 两段关键帧               */
/* ------------------------------------------------------------------ */

type ChevronPhase = 'idle' | 'pressed' | 'releasing'

const chevronPhase = ref<ChevronPhase>('idle')

const chevronClass = computed(() =>
  chevronPhase.value === 'idle'
    ? undefined
    : `fui-split-button__chevron-box--${chevronPhase.value}`,
)

const onChevronPointerDown = (event: PointerEvent): void => {
  if (props.disabled || event.button !== 0) {
    return
  }
  chevronPhase.value = 'pressed'
}

/** 松开 / 离开 / 取消都进入 PressedToNormal（A 级由 AnimatedIcon 状态机驱动） */
const onChevronRelease = (): void => {
  if (chevronPhase.value !== 'pressed') {
    return
  }
  chevronPhase.value = 'releasing'
}

/** 按下动画结束要保持终态（继续按住），只有释放动画结束才回到 idle */
const onChevronAnimationEnd = (): void => {
  if (chevronPhase.value === 'releasing') {
    chevronPhase.value = 'idle'
  }
}

/* ------------------------------------------------------------------ */
/* 模板状态位                                                          */
/* ------------------------------------------------------------------ */

const triggerAttrs = computed<Record<string, string>>(() => ({
  'aria-expanded': String(isOpen.value),
  'aria-haspopup': props.hasPopup,
}))

/** Teleport 延后到 mounted：SSR 与首帧都不产生门户占位（见 docs/ssr-guide.md） */
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})

/** `aria-pressed` 的合法取值（`aria-pressed` 只接受 Booleanish / mixed，不接受任意 string） */
const ariaPressed = computed<boolean | 'true' | 'false' | undefined>(() =>
  props.toggleable ? (props.checked ? 'true' : 'false') : undefined,
)

/** 浮层容器的可访问名（reka `PopoverContent` 默认 role=dialog） */
const flyoutAriaLabel = computed(() => secondaryAriaLabel.value)

/** 预留：浮层 id 供后续 aria-controls 使用（0.6.1 菜单族接管 aria 契约时启用） */
const flyoutId = useId()
</script>

<template>
  <PopoverRoot
    :open="isOpen"
    @update:open="applyOpen"
  >
    <PopoverAnchor as-child>
      <div
        ref="rootRef"
        v-bind="$attrs"
        class="fui-split-button"
        :class="{ 'fui-split-button--disabled': disabled }"
        :data-state="isOpen ? 'open' : 'closed'"
        :data-checked="toggleable ? String(checked) : undefined"
        :data-disabled="disabled ? '' : undefined"
        :data-keyboard-pressed="keyboardPressed ? '' : undefined"
        @keydown="onKeydown"
        @keyup="onKeyup"
        @focusout="onFocusOut"
      >
        <button
          class="fui-split-button__primary"
          :class="focusVisual.class"
          :style="focusVisual.style"
          :type="type"
          :disabled="disabled"
          :aria-label="label"
          :aria-pressed="ariaPressed"
          @click="onPrimaryClick"
        >
          <span class="fui-split-button__content">
            <slot />
          </span>
        </button>

        <span
          class="fui-split-button__divider"
          aria-hidden="true"
        />

        <button
          ref="secondaryRef"
          class="fui-split-button__secondary"
          :class="focusVisual.class"
          :style="focusVisual.style"
          type="button"
          :disabled="disabled"
          :aria-label="secondaryAriaLabel"
          :aria-controls="isOpen ? flyoutId : undefined"
          v-bind="triggerAttrs"
          @click="onSecondaryClick"
          @pointerdown="onChevronPointerDown"
          @pointerup="onChevronRelease"
          @pointercancel="onChevronRelease"
          @pointerleave="onChevronRelease"
        >
          <span
            class="fui-split-button__chevron-box"
            :class="chevronClass"
            aria-hidden="true"
            @animationend="onChevronAnimationEnd"
          >
            <FluentIconChevronDown12Regular class="fui-split-button__chevron" />
          </span>
        </button>

        <span
          class="fui-split-button__primary-border"
          aria-hidden="true"
        />
        <span
          class="fui-split-button__secondary-border"
          aria-hidden="true"
        />
      </div>
    </PopoverAnchor>

    <PopoverPortal :disabled="!mounted">
      <PopoverContent
        :id="flyoutId"
        class="fui-split-button__flyout"
        :style="flyoutLayerStyle"
        :aria-label="flyoutAriaLabel"
        side="bottom"
        align="start"
        :side-offset="0"
        :avoid-collisions="true"
        :collision-padding="8"
        :sticky="'partial'"
        position-strategy="fixed"
        @pointer-down-outside="onFlyoutPointerDownOutside"
        @focus-outside="onFlyoutFocusOutside"
        @close-auto-focus="onFlyoutCloseAutoFocus"
      >
        <slot
          name="flyout"
          v-bind="flyoutSlotProps"
        />
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>

<style scoped>
/* ------------------------------------------------------------------ */
/* 明暗主题由 tokens.css 的 light-dark() + color-scheme 自动切换        */
/* 状态表与 WinUI 资源 → token 映射见文件头注释 + 样式块内逐条标注        */
/* ------------------------------------------------------------------ */

.fui-split-button {
  /* ---- 几何（A 级 SplitButton_themeresources.xaml / SplitButton.xaml） ---- */
  /* SplitButtonPrimaryButtonSize / SplitButtonSecondaryButtonSize = 35 */
  --fui-split-button-primary-min-size: 35px;
  --fui-split-button-secondary-size: 35px;
  /* ColumnDefinition Separator Width = 1 */
  --fui-split-button-separator-size: 1px;
  /* SplitButtonPadding = 11,6,11,7 */
  --fui-split-button-padding-block-start: 6px;
  --fui-split-button-padding-inline: 11px;
  --fui-split-button-padding-block-end: 7px;
  /* SecondaryButton Padding = 0,0,12,0；箭头 12×12 */
  --fui-split-button-secondary-padding-inline-end: 12px;
  --fui-split-button-chevron-size: 12px;
  /* ControlCornerRadius = 4（Border 覆盖层里模板硬编码的 4 同值） */
  --fui-split-button-corner-radius: var(--borderRadiusMedium);

  /* ---- 画刷（映射依据见文件头；逐条对齐主题资源键名） ---- */
  --fui-split-button-background: var(--colorNeutralBackground1);
  --fui-split-button-background-hover: var(--colorNeutralBackground1Hover);
  --fui-split-button-background-pressed: var(--colorNeutralBackground1Pressed);
  --fui-split-button-background-disabled: var(--colorNeutralBackgroundDisabled);
  --fui-split-button-foreground: var(--colorNeutralForeground1);
  --fui-split-button-foreground-pressed: var(--colorNeutralForeground2);
  --fui-split-button-foreground-disabled: var(--colorNeutralForegroundDisabled);
  --fui-split-button-foreground-secondary: var(--colorNeutralForeground2);
  --fui-split-button-foreground-secondary-pressed: var(--colorNeutralForeground3);
  --fui-split-button-border: var(--colorNeutralStroke1);
  /* ControlStrokeColorDefaultBrush（pressed / disabled / divider 共用的 A 级画刷；
     亮 #0F000000 / 暗 #12FFFFFF，0.5.7 已作为 repo-token 落盘） */
  --fui-split-button-border-pressed: var(--controlStrokeColorDefault);
  --fui-split-button-border-disabled: var(--controlStrokeColorDefault);
  --fui-split-button-divider: var(--controlStrokeColorDefault);

  /* ---- 选中态（ToggleSplitButton）---- */
  --fui-split-button-checked-background: var(--colorBrandBackground);
  --fui-split-button-checked-background-hover: var(--colorBrandBackgroundHover);
  --fui-split-button-checked-background-pressed: var(--colorBrandBackgroundPressed);
  --fui-split-button-checked-foreground: var(--colorNeutralForegroundOnBrand);
  /* TextOnAccentFillColorSecondaryBrush：亮 #B3FFFFFF / 暗 #80000000，无同值 token */
  --fui-split-button-checked-pressed-foreground: light-dark(
    rgba(255, 255, 255, 0.702),
    rgba(0, 0, 0, 0.502)
  );
  /* AccentControlElevationBorderBrush 的近似裁定（见文件头；可一行覆写） */
  --fui-split-button-checked-border: transparent;
  /* ControlStrokeColorOnAccentTertiaryBrush：亮暗均为 #37000000，无同值 token */
  --fui-split-button-checked-divider: rgba(0, 0, 0, 0.216);

  /* ---- 箭头动效（A 级 AnimatedChevronDownSmallVisualSource 关键帧）---- */
  /* NormalToPressed：帧 0–9 = 150.8ms（最近的 --durationFast 是 150ms，差 0.8ms） */
  --fui-split-button-chevron-press-duration: 150.8ms;
  --fui-split-button-chevron-press-easing: cubic-bezier(0.167, 0.167, 0.65, 1);
  /* PressedToNormal：帧 10–29 = 316.7ms（最近的 --durationSlow 是 300ms，差 16.7ms） */
  --fui-split-button-chevron-release-duration: 316.7ms;

  position: relative;
  display: inline-grid;
  box-sizing: border-box;
  grid-template-columns:
    minmax(var(--fui-split-button-primary-min-size), 1fr)
    var(--fui-split-button-separator-size)
    var(--fui-split-button-secondary-size);
  grid-template-rows: auto;
  vertical-align: middle;
  font-family: var(--fontFamilyBase);
  font-size: var(--fontSizeBase300);
  font-weight: var(--fontWeightRegular);
  /* ControlContentThemeFontSize(14) 在 WinUI 按 Body 行高 20 排版：
     6 + 20 + 7 = 33px 控件高（模板没有 MinHeight，高度由内层 Button 内容决定） */
  line-height: var(--lineHeightBase300);
  color: var(--fui-split-button-foreground);
  cursor: default;
}

/* ---- 两半按钮（内层 Button：BorderThickness=0、背景透明，颜色由外层状态驱动） ---- */
.fui-split-button__primary,
.fui-split-button__secondary {
  display: flex;
  align-items: center;
  box-sizing: border-box;
  margin: 0;
  border: 0;
  font: inherit;
  color: inherit;
  background-color: transparent;
  /* UA 默认焦点环由 .fui-focus-visual 原语接管 */
  outline: none;
  cursor: pointer;
  user-select: none;
  appearance: none;
}

.fui-split-button__primary {
  grid-column: 1;
  grid-row: 1;
  z-index: 1;
  justify-content: center;
  /* SplitButtonPadding = 11,6,11,7（1px 描边由覆盖层画，不占内容盒） */
  padding: var(--fui-split-button-padding-block-start) var(--fui-split-button-padding-inline)
    var(--fui-split-button-padding-block-end);
  border-start-start-radius: var(--fui-split-button-corner-radius);
  border-end-start-radius: var(--fui-split-button-corner-radius);
  background-color: var(--fui-split-button-background);
  color: var(--fui-split-button-foreground);
}

.fui-split-button__content {
  min-inline-size: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fui-split-button__secondary {
  grid-column: 3;
  grid-row: 1;
  z-index: 1;
  justify-content: flex-end;
  padding-inline-end: var(--fui-split-button-secondary-padding-inline-end);
  border-start-end-radius: var(--fui-split-button-corner-radius);
  border-end-end-radius: var(--fui-split-button-corner-radius);
  background-color: var(--fui-split-button-background);
  /* SplitButtonForegroundSecondary ← TextFillColorSecondaryBrush */
  color: var(--fui-split-button-foreground-secondary);
}

/* ---- 分隔线（独立列，1px；A 级 DividerBackgroundGrid） ----
   分隔线在独立网格列里，与两半按钮不重叠，不需要局部层叠。 */
.fui-split-button__divider {
  grid-column: 2;
  grid-row: 1;
  inline-size: var(--fui-split-button-separator-size);
  background-color: var(--fui-split-button-divider);
}

/* ---- 两个 Border 覆盖层（照抄 A 级：主区 1,1,0,1 + 4,0,0,4；箭头区 0,1,1,1 + 0,4,4,0） ----
   这里的 `z-index: 1 / 2` 是**局部层、非浮层档位**（让描边盖在按钮内容之上），
   不引用 --zIndex* 刻度；浮层档位只出现在 Teleport 面板的层级样式里。 */
.fui-split-button__primary-border,
.fui-split-button__secondary-border {
  grid-row: 1;
  z-index: 2;
  box-sizing: border-box;
  border-style: solid;
  border-width: 0;
  border-color: var(--fui-split-button-border);
  pointer-events: none;
}

.fui-split-button__primary-border {
  grid-column: 1;
  border-block-start-width: var(--strokeWidthThin);
  border-inline-start-width: var(--strokeWidthThin);
  border-block-end-width: var(--strokeWidthThin);
  border-start-start-radius: var(--fui-split-button-corner-radius);
  border-end-start-radius: var(--fui-split-button-corner-radius);
}

.fui-split-button__secondary-border {
  grid-column: 3;
  border-block-start-width: var(--strokeWidthThin);
  border-inline-end-width: var(--strokeWidthThin);
  border-block-end-width: var(--strokeWidthThin);
  border-start-end-radius: var(--fui-split-button-corner-radius);
  border-end-end-radius: var(--fui-split-button-corner-radius);
}

/* ---- 箭头（12×12；AnimatedIcon Fallback 是 8px FontIcon，这里按 12 舞台盒） ---- */
.fui-split-button__chevron-box {
  display: flex;
  align-items: center;
  justify-content: center;
  inline-size: var(--fui-split-button-chevron-size);
  block-size: var(--fui-split-button-chevron-size);
  flex: none;
}

.fui-split-button__chevron {
  display: block;
  inline-size: 100%;
  block-size: 100%;
}

/* ---- 悬停 / 按下：`:where()` 把伪类特异性压到 0，交给“状态优先级”由源码顺序决定 ---- */
/* SplitButtonBackgroundPointerOver ← ControlFillColorSecondaryBrush */
.fui-split-button__primary:where(:hover):not(:disabled) {
  background-color: var(--fui-split-button-background-hover);
}

/* SplitButtonBackgroundPressed ← ControlFillColorTertiaryBrush；
   SplitButtonForegroundPressed ← TextFillColorSecondaryBrush */
.fui-split-button__primary:where(:active):not(:disabled) {
  background-color: var(--fui-split-button-background-pressed);
  color: var(--fui-split-button-foreground-pressed);
}

/* SecondaryPointerOver：SplitButtonBackgroundPointerOver + SplitButtonForegroundPointerOver
   （后者 = TextFillColorPrimaryBrush，箭头由 Secondary 色切到 Primary 色） */
.fui-split-button__secondary:where(:hover):not(:disabled) {
  background-color: var(--fui-split-button-background-hover);
  color: var(--fui-split-button-foreground);
}

/* SecondaryPressed：SplitButtonForegroundSecondaryPressed ← TextFillColorTertiaryBrush */
.fui-split-button__secondary:where(:active):not(:disabled) {
  background-color: var(--fui-split-button-background-pressed);
  color: var(--fui-split-button-foreground-secondary-pressed);
}

/* ---- 键盘按下（A 级 TouchPressed 在键盘路径下的等价形态：两半同时 pressed） ---- */
.fui-split-button[data-keyboard-pressed] .fui-split-button__primary,
.fui-split-button[data-keyboard-pressed] .fui-split-button__secondary {
  background-color: var(--fui-split-button-background-pressed);
  color: var(--fui-split-button-foreground-pressed);
}

.fui-split-button[data-keyboard-pressed] .fui-split-button__secondary {
  color: var(--fui-split-button-foreground-secondary-pressed);
}

/* ---- 浮层打开（FlyoutOpen：两半都是 pressed 底色 + pressed 前景） ---- */
.fui-split-button[data-state='open'] .fui-split-button__primary {
  background-color: var(--fui-split-button-background-pressed);
  color: var(--fui-split-button-foreground-pressed);
}

.fui-split-button[data-state='open'] .fui-split-button__secondary {
  background-color: var(--fui-split-button-background-pressed);
  color: var(--fui-split-button-foreground-secondary-pressed);
}

/* ---- 选中态（ToggleSplitButton.Checked）---- */
.fui-split-button[data-checked='true'] .fui-split-button__primary,
.fui-split-button[data-checked='true'] .fui-split-button__secondary {
  background-color: var(--fui-split-button-checked-background);
  color: var(--fui-split-button-checked-foreground);
}

.fui-split-button[data-checked='true'] .fui-split-button__divider {
  background-color: var(--fui-split-button-checked-divider);
}

.fui-split-button[data-checked='true'] .fui-split-button__primary-border,
.fui-split-button[data-checked='true'] .fui-split-button__secondary-border {
  border-color: var(--fui-split-button-checked-border);
}

/* CheckedPrimaryPointerOver ← AccentFillColorSecondaryBrush */
.fui-split-button[data-checked='true'] .fui-split-button__primary:where(:hover):not(:disabled) {
  background-color: var(--fui-split-button-checked-background-hover);
}

/* CheckedPrimaryPressed ← AccentFillColorTertiaryBrush +
   TextOnAccentFillColorSecondaryBrush（选中态按下前景比常态暗一档） */
.fui-split-button[data-checked='true'] .fui-split-button__primary:where(:active):not(:disabled) {
  background-color: var(--fui-split-button-checked-background-pressed);
  color: var(--fui-split-button-checked-pressed-foreground);
}

/* CheckedSecondaryPointerOver：箭头区 hover 只换底色，前景仍是 OnAccent Primary */
.fui-split-button[data-checked='true'] .fui-split-button__secondary:where(:hover):not(:disabled) {
  background-color: var(--fui-split-button-checked-background-hover);
  color: var(--fui-split-button-checked-foreground);
}

.fui-split-button[data-checked='true'] .fui-split-button__secondary:where(:active):not(:disabled) {
  background-color: var(--fui-split-button-checked-background-pressed);
  color: var(--fui-split-button-checked-pressed-foreground);
}

/* ---- 键盘按下 + 选中态：CheckedTouchPressed ---- */
.fui-split-button[data-checked='true'][data-keyboard-pressed] .fui-split-button__primary,
.fui-split-button[data-checked='true'][data-keyboard-pressed] .fui-split-button__secondary {
  background-color: var(--fui-split-button-checked-background-pressed);
  color: var(--fui-split-button-checked-pressed-foreground);
}

/* ---- 浮层打开 + 选中态：CheckedFlyoutOpen ---- */
.fui-split-button[data-checked='true'][data-state='open'] .fui-split-button__primary,
.fui-split-button[data-checked='true'][data-state='open'] .fui-split-button__secondary {
  background-color: var(--fui-split-button-checked-background-pressed);
  color: var(--fui-split-button-checked-pressed-foreground);
}

/* ---- 按下 / 打开态描边：SplitButtonBorderBrushPressed ← ControlStrokeColorDefaultBrush ---- */
.fui-split-button[data-keyboard-pressed] .fui-split-button__primary-border,
.fui-split-button[data-keyboard-pressed] .fui-split-button__secondary-border,
.fui-split-button[data-state='open'] .fui-split-button__primary-border,
.fui-split-button[data-state='open'] .fui-split-button__secondary-border {
  border-color: var(--fui-split-button-border-pressed);
}

/* ---- 禁用：Disabled 状态（A 级判定顺序里优先级最高） ---- */
.fui-split-button--disabled .fui-split-button__primary,
.fui-split-button--disabled .fui-split-button__secondary {
  background-color: var(--fui-split-button-background-disabled);
  color: var(--fui-split-button-foreground-disabled);
  cursor: default;
}

.fui-split-button--disabled .fui-split-button__primary-border,
.fui-split-button--disabled .fui-split-button__secondary-border {
  border-color: var(--fui-split-button-border-disabled);
}

/* ---- 箭头动效：两段关键帧（数值与缓动来源见文件头与变量注释） ---- */
.fui-split-button__chevron-box--pressed {
  animation: fui-split-button-chevron-press var(--fui-split-button-chevron-press-duration)
    var(--fui-split-button-chevron-press-easing) both;
}

.fui-split-button__chevron-box--releasing {
  animation: fui-split-button-chevron-release var(--fui-split-button-chevron-release-duration) both;
}

/* NormalToPressed：Offset y 24 → 31.5 ⇒ 下移 (31.5 − 24) × 0.25 = 1.875px */
@keyframes fui-split-button-chevron-press {
  from {
    transform: translateY(0);
  }

  to {
    transform: translateY(1.875px);
  }
}

/* PressedToNormal：31.5 → 21（−0.75px）→ 24（0）；
   分段缓动：0–27.5% cubic-bezier(0.55, 0, 0.75, 1)，27.5–100% cubic-bezier(0.35, 0, 0, 1)。
   27.5% = (帧 15 − 帧 10) / (帧 29 − 帧 10) = 5 / 19。 */
@keyframes fui-split-button-chevron-release {
  0% {
    transform: translateY(1.875px);
    animation-timing-function: cubic-bezier(0.55, 0, 0.75, 1);
  }

  27.5% {
    transform: translateY(-0.75px);
    animation-timing-function: cubic-bezier(0.35, 0, 0, 1);
  }

  100% {
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .fui-split-button__chevron-box--pressed,
  .fui-split-button__chevron-box--releasing {
    animation: none;
  }
}
</style>

<style>
/* ==================================================================== */
/* 浮层面板（Teleport 到 body，因此**必须**是非 scoped 的样式块）          */
/*                                                                      */
/* 为什么非 scoped：面板由 reka `PopoverContent`（DismissableLayer →      */
/* PopperContent → Primitive）内部渲染，组件拿不到本 SFC 的 `data-v-*`；   */
/* 写成 scoped 时 `.fui-split-button__flyout[data-v-x]` 永远匹配不上，     */
/* 整套样式静默失效（与 Tooltip 同一踩坑，见其 fixture 文件头）。          */
/* `.fui-split-button__flyout` 是本库私有 BEM 前缀，不会与消费方冲突。     */
/*                                                                      */
/* 规格：A 级 `CommonStyles/FlyoutPresenter_themeresources.xaml` ——        */
/*   Background = AcrylicInAppFillColorDefaultBrush（FallbackColor 近似，   */
/*   真实 Acrylic 合成 + 噪点归 0.9.2）；Border = SurfaceStrokeColorFlyout */
/*   （亮 #0F000000 / 暗 #33000000）；CornerRadius = OverlayCornerRadius 8；*/
/*   Padding = FlyoutContentPadding 16,15,16,17；MinWidth 96 / MaxWidth    */
/*   456 / MinHeight 40 / MaxHeight 758（+ ScrollViewer Auto）。           */
/* 0.6.1 `MenuFlyout` 到位后由菜单自己的 presenter 接管，本面板退化为内容容器。 */
/* ==================================================================== */
.fui-split-button__flyout {
  /* FlyoutBase 的 ApplyElevationEffect baseElevation 不在快照公开源码内（证据缺口）；
     Tooltip 用的 16 是同仓先例，消费方可一行覆写回实测值 */
  --fui-split-button-flyout-shadow: var(--shadow16);
  /* FlyoutPresenterBackground ← AcrylicInAppFillColorDefaultBrush 的 FallbackColor */
  --fui-split-button-flyout-background: var(--acrylicInAppFillColorDefault);
  /* FlyoutBorderThemeBrush ← SurfaceStrokeColorFlyoutBrush（0.5.7 已落 repo-token） */
  --fui-split-button-flyout-border: var(--surfaceStrokeColorFlyout);

  z-index: var(--zIndexMenu);
  box-sizing: border-box;
  min-inline-size: 96px;
  max-inline-size: min(456px, var(--reka-popper-available-width, 100vw));
  min-block-size: 40px;
  max-block-size: min(758px, var(--reka-popper-available-height, 100vh));
  /* FlyoutContentPadding = 16,15,16,17 */
  padding: 15px 16px 17px;
  overflow: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  background-color: var(--fui-split-button-flyout-background);
  border: var(--strokeWidthThin) solid var(--fui-split-button-flyout-border);
  /* OverlayCornerRadius = 8 → --borderRadiusXLarge */
  border-radius: var(--borderRadiusXLarge);
  box-shadow: var(--fui-split-button-flyout-shadow);
  color: var(--colorNeutralForeground1);
  font-family: var(--fontFamilyBase);
  font-size: var(--fontSizeBase300);
  line-height: var(--lineHeightBase300);
}
</style>
