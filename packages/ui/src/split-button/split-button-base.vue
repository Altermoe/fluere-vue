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
 * 浮层（`#flyout` 插槽 + 内建 `FluereMenuFlyout`；0.6.1 接入，替换 0.6.4 首版的
 * 「临时 FlyoutPresenter 面板」）：
 *   - 宿主：`#flyout` 插槽的内容交给 `../menu-flyout/menu-flyout.vue` 的**锚点模式**
 *     （`anchor` Prop = 控件根节点，等价 WinUI `FlyoutBase.ShowAt(*this)`）。菜单族自己
 *     负责 Teleport、定位、焦点陷阱 / 归还、层级与开合动效，本组件只决定何时开 / 关。
 *   - 定位：A 级 `SplitButton.cpp#OpenFlyout` 固定
 *     `FlyoutPlacementMode::BottomEdgeAlignedLeft` → `placement="bottom-edge-aligned-left"`
 *     （菜单族的 WinUI `FlyoutPlacementMode` 映射）。
 *   - 间距：菜单族 `sideOffset` 缺省 4，取自 A 级
 *     `src/dxaml/xcp/dxaml/lib/FlyoutBase_partial.cpp` 的 `FlyoutMargin = 4`
 *     （见 `menu-flyout/types.ts` 默认值表）。0.6.4 首版临时面板误按「快照无 offset 资源」
 *     取了 0，本次接入一并修正为 4。
 *   - 面板几何 / 画刷 / 动效：全部由 `FluereMenuFlyout` 的 presenter 负责
 *     （`MenuFlyout_themeresources.xaml`：Background ≈ Acrylic FallbackColor、
 *     Border = `SurfaceStrokeColorFlyout`、CornerRadius = OverlayCornerRadius 8、
 *     Padding = 0,2,0,2、MinWidth 96 / MinHeight 32；展开 250ms / 收起 200ms 的
 *     证据缺口见菜单族文件头）。本组件**不再**复制一份 FlyoutPresenter 样式：
 *     旧的非 scoped 样式块已删除 —— 面板节点由菜单族渲染，本来也拿不到本组件的
 *     `data-v-*`，把样式交给宿主比留一块「永远吃不到 scoped」的 CSS 更可维护。
 *   - 内容契约：`#flyout` 里应放 `FluereMenuFlyoutItem` / `…SubItem` / `…Separator` /
 *     `…ToggleItem`。菜单族提供 `role=menu` / `menuitem*` 语义、↑↓ 循环 / Home / End /
 *     Tab 吞掉 / Enter / Space / ←→ 子菜单 / Esc 的键盘，以及子菜单 `--zIndexSubmenu`
 *     的层级提升；条目激活冒泡为 SplitButton 的 `select` 事件，缺省选中后关闭整菜单。
 *   - 关闭路径：Esc / 外部 pointerdown / 条目选中 / 箭头区再次点击，全部由菜单族
 *     （reka DismissableLayer + 关闭原因记录）承担，本组件不再注册任何 document 监听。
 *     焦点归还在 `outside-pointer` 之外的路径由菜单族记录 / 归还（Esc / 选中 / 键盘
 *     触发都会回到打开前的元素）。**light dismiss 的真实落点（实测）**：菜单是 reka
 *     modal 菜单，打开时 `body { pointer-events: none }`，主区 / 箭头区 / 外部点击的
 *     命中目标都退化为 `<html>`，因此按钮收不到 pointerdown / click，统一由
 *     DismissableLayer 关闭、焦点落到 `body`；这既不是「主区动作被误触」，也不是
 *     0.6.4 首版那种「关闭后焦点被抢回箭头区」。`onPrimaryClick` 里保留的
 *     outside-pointer 关闭分支只作为非 modal 环境 / 直接派发 click 时的兜底。
 *   - 受控 / 非受控 `open` 仍由本组件持有：`:open="isOpen"` + `@update:open="applyOpen"`，
 *     菜单族只按受控值渲染；`opened` / `closed` 由菜单族事件上提（`closed` 不带载荷）。
 *   - `aria-haspopup` 缺省改为 `'menu'`（内建内容就是菜单）；`aria-controls` 不再输出：
 *     面板由 reka 内部渲染且拿不到稳定 id，WAI-ARIA APG 的 split button / menu button
 *     模式只要求 `aria-haspopup` + `aria-expanded`（两者仍由箭头区输出）。
 *   - 未传 `#flyout` 时箭头区点击 / 快捷键不打开浮层，连菜单宿主都不渲染（对齐
 *     `OpenFlyout` 的 `GetFlyout() == null` 早退分支）；0.6.4 首版的临时面板会弹出一个
 *     空面板。
 *
 * ── 真实浏览器实测（2026-10-20 接入后重测，Chromium / 1440×1000）───────────────
 * 方法：`node temp/pw-split-button-menu.mjs`（脚本读 computedStyle / getBoundingClientRect，
 * 明暗两套 + 菜单开合 + 键盘 / 指针全路径，94/94 断言通过；截图在
 * temp/split-button-verify/，temp/ 不提交、也不作为唯一证据 —— 预期值与结论固化在
 * 本注释与契约测试里）。
 * 关键预期值（与上方 A 级资源一一对应，均实测命中）：
 *   · 控件高 33px（6 + 20 行高 + 7）、箭头区 35px、分隔线 1px、雪佛龙 12×12；
 *   · 主区 padding 11 / 6 / 7、圆角 4、字号 14 / 行高 20 / 字重 400；
 *   · rest 背景 #ffffff / 前景 #242424；hover #f5f5f5（箭头前景切到 #242424）；
 *     pressed #e0e0e0 / 前景 #424242；打开态箭头前景 #616161；
 *   · 菜单：左对齐控件左边（Δ 0.00px）、与控件底边间距 4.00px；presenter padding
 *     2px 0、圆角 8、描边 1px；背景亮 #f9f9f9 / 暗 #2c2c2c，描边亮
 *     rgba(0, 0, 0, 0.06) / 暗 rgba(0, 0, 0, 0.2)，阴影非 none；层级 1100
 *     （--zIndexMenu，与 :root 的 --zIndexMenu 一致）、Teleport 到 body、
 *     `role=menu` + 箭头区可访问名；条目 padding 8,11,9,11、margin 2,4,2,4、
 *     圆角 4、hover 亮 #f5f5f5 / 暗 #383838；
 *   · 键盘：Esc 关闭并把焦点还给箭头区、F4 / Alt+Down 打开并聚焦首项、
 *     ↑↓ / Home / End 在条目间移动、Tab 不移动焦点、Enter 激活条目（状态行更新）
 *     并关闭菜单 + 焦点回箭头区；
 *   · 指针：打开态点击主区 / 箭头区 / 外部都是 light dismiss（按钮 click 不触发，
 *     关闭后 activeElement = body）；关闭态点主区正常触发默认动作；打开态再点箭头区
 *     1 次即关闭、不会「关了又开」；Space 按住出现 data-keyboard-pressed 且两半 pressed；
 *     Space/Enter 按住期间只触发一次主区动作（与 WinUI m_isKeyDown 一致）。
 * 修复记录（0.6.4 首版 → 本次接入）：① Esc 后焦点丢到 body，已由菜单族的焦点归还接管；
 * ② 面板几何 / 画刷 / 退出动效不再自绘，交给菜单族 presenter；③ 浮层间距 0 → 4。
 *
 * ── 与 WinUI 的有意差异 ──────────────────────────────────────────────────────
 *   1. **焦点 / Tab 序**（用户 2026-10-20 确认的口径）：WinUI 整个控件只有一个
 *      Tab stop（内层按钮 IsTabStop=False），箭头区只能指针或 Alt+Down / F4 到达；
 *      本库按 WAI-ARIA APG 的 split button 模式把主区与箭头区做成两个各自可 Tab 的
 *      `<button>`（todo 0.6.4 验收要求「各自可达」），同时保留 WinUI 的全部快捷键。
 *      每个按钮各自套共享原语 `useFocusVisual`；WinUI 的 `FocusVisualMargin=-1`
 *      在双按钮结构下不再适用，统一走原语的 −3 外扩（0.9.3 会统一焦点矩形）。
 *   2. **菜单内容范围**：WinUI 的 `Flyout` 可放任意 `FlyoutBase`（含自定义 Presenter）；
 *      本库 `#flyout` 固定走 `MenuFlyout`（`role=menu`），语义与键盘按菜单处理。
 *      需要对话框形态时应改用 `FluereContentDialog`，不要往 `#flyout` 里塞表单。
 *   3. **受控 checked**：`ToggleSplitButton.IsChecked` 在 WinUI 是自管状态；本库沿用
 *      `FluereToggleButton` 的受控口径（点击只抛 `update:checked`，由消费方写回）。
 *   4. **AppBar / CommandBar 风格未实现**：`SplitButtonCommandBarStyle` 与
 *      `SplitButtonInAppBarUnfocusedPointerOver` 属命令栏场景，归 0.8.3 `CommandBar`
 *      （届时作为新变体接入，不改本组件默认外观）。
 *   5. **菜单键盘能力沿用菜单族**：reka 底座自带按字符 typeahead（WinUI 无前缀匹配），
 *      Home / End 是 0.6.1 按 WAI-ARIA 补齐的（WinUI 公开 keypress 处理无此键）；
 *      逐条记在 `../menu-flyout/menu-flyout.vue` 文件头与文档页。
 *   6. **light dismiss 的焦点落点**：菜单族是 modal 菜单（打开时 body pointer-events
 *      none），指针点击主区 / 箭头区 / 外部只会关闭菜单，不会把焦点交给被点元素
 *      （实测 activeElement = body）。WinUI 的 Flyout light dismiss 同样不激活底层
 *      控件，但焦点落点没有 A 级证据；这里按「不抢焦点」记录为有意差异。
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
import { computed, ref, useSlots } from 'vue'
import { useFocusVisual } from '../focus-visual/use-focus-visual'
import FluereMenuFlyout from '../menu-flyout/menu-flyout.vue'
import type {
  FluereMenuFlyoutCloseReason,
  FluereMenuFlyoutSelectEventArgs,
} from '../menu-flyout/types'
import { splitButtonLocale } from './locale'
import type { FluereSplitButtonFlyoutSlotProps, SplitButtonBaseProps } from './types'

defineOptions({
  name: 'FluereSplitButtonBase',
  /**
   * 关闭属性继承：模板根是不产出 DOM 的 `FluereMenuFlyout` + 控件根 `<div>`，
   * `$attrs` 需要显式落到真正的控件根上，否则 class / data-* 会丢在浮层上下文里。
   */
  inheritAttrs: false,
})

const props = withDefaults(defineProps<SplitButtonBaseProps>(), {
  disabled: false,
  label: undefined,
  secondaryLabel: undefined,
  open: undefined,
  hasPopup: 'menu',
  type: 'button',
  locale: undefined,
  toggleable: false,
  checked: false,
})

const slots = useSlots()

const emit = defineEmits<{
  /** 主区点击（对应 WinUI `Click`）；浮层打开时点击主区只关闭浮层 */
  'click': [event: MouseEvent]
  /** 浮层开关回写（`v-model:open`） */
  'update:open': [value: boolean]
  /** 浮层已打开（对应 `Flyout.Opened`） */
  'opened': []
  /** 浮层已关闭（对应 `Flyout.Closed`） */
  'closed': []
  /** 菜单条目被激活（由内建 `FluereMenuFlyout` 的 `select` 冒泡；载荷见类型） */
  'select': [args: FluereMenuFlyoutSelectEventArgs]
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
 * 面板交给 `FluereMenuFlyout`（锚点模式）按受控值渲染，开关状态的事实源仍在本组件，
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

/**
 * 菜单族实例：只在「需要带关闭原因」的路径上用它调用 `close(reason)`
 * （reason 决定菜单族是否归还焦点，见文件头「关闭路径」）。挂载前为 null，
 * 回退到纯受控写回 `applyOpen(false)`。
 */
const menuRef = ref<InstanceType<typeof FluereMenuFlyout> | null>(null)

/**
 * 菜单内容是否存在。对齐 A 级 `SplitButton.cpp#OpenFlyout`：`GetFlyout() == null`
 * 时箭头区点击 / `Alt+↓` / `F4` 都不打开任何面板（旧临时面板会弹出空面板）。
 */
const hasFlyout = computed(() => slots.flyout !== undefined)

/* ------------------------------------------------------------------ */
/* 打开 / 关闭                                                         */
/* ------------------------------------------------------------------ */

/**
 * 打开浮层。菜单族在 `open` 变为 true 后会聚焦首个可聚焦条目
 * （WinUI `MenuFlyoutPresenter::SetInitialFocus`）。
 */
const openFlyout = (): void => {
  if (props.disabled || !hasFlyout.value) {
    return
  }
  applyOpen(true)
}

/**
 * 关闭浮层并带上关闭原因：
 *   - `outside-pointer`：不归还焦点（light dismiss / 兜底关闭路径，不把焦点抢回箭头区）；
 *   - `trigger`：箭头区再次点击（焦点本来就在箭头区，归还无副作用）；
 *   - `programmatic` / `item-click` / `escape`：由菜单族在关闭后把焦点还给打开前的元素。
 * 菜单族实例尚未挂载时回退到 `applyOpen(false)`。
 */
const closeFlyout = (reason: FluereMenuFlyoutCloseReason = 'programmatic'): void => {
  if (menuRef.value !== null) {
    menuRef.value.close(reason)
    return
  }
  applyOpen(false)
}

const toggleFlyout = (): void => {
  if (props.disabled || !hasFlyout.value) {
    return
  }
  if (isOpen.value) {
    closeFlyout('trigger')
    return
  }
  openFlyout()
}

/** `#flyout` 插槽上下文（等价 XAML 里对 `Flyout.Hide()` 的访问） */
const flyoutSlotProps = computed<FluereSplitButtonFlyoutSlotProps>(() => ({
  close: (reason) => closeFlyout(reason),
}))

/* ------------------------------------------------------------------ */
/* 主区 / 箭头区点击                                                    */
/* ------------------------------------------------------------------ */

const onPrimaryClick = (event: MouseEvent): void => {
  if (props.disabled) {
    return
  }
  // WinUI：浮层打开时点击控件本体走 light dismiss，主区 Click 不触发。
  // 真实浏览器里 reka modal 菜单打开时 body pointer-events: none，主区收不到
  // pointerdown / click，这一分支实际由 DismissableLayer 的 light dismiss 顶替；
  // 保留它是为了非 modal 环境 / 测试里直接派发 click 时也不误触主区动作。
  if (isOpen.value) {
    closeFlyout('outside-pointer')
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

/** `aria-pressed` 的合法取值（`aria-pressed` 只接受 Booleanish / mixed，不接受任意 string） */
const ariaPressed = computed<boolean | 'true' | 'false' | undefined>(() =>
  props.toggleable ? (props.checked ? 'true' : 'false') : undefined,
)

/** 菜单面板的可访问名：与箭头区一致（缺省「更多选项 / More Options」） */
const menuLabel = computed(() => secondaryAriaLabel.value)

/**
 * 与锚点的间距（px）：A 级 `FlyoutBase::FlyoutMargin = 4`。`SplitButton.cpp#OpenFlyout`
 * 只覆盖 placement，不改间距；菜单族缺省值同为 4，这里显式传一次，避免菜单族默认值
 * 变化时静默漂移。
 */
const FLYOUT_SIDE_OFFSET = 4

/** 菜单族关闭事件不带载荷（reason 只用于决定是否归还焦点，已由菜单族内部消费） */
const onMenuClosed = (): void => {
  emit('closed')
}

/** 菜单条目选中：原样上提，便于 `v-for` 动态条目在 SplitButton 层统一处理 */
const onMenuSelect = (args: FluereMenuFlyoutSelectEventArgs): void => {
  emit('select', args)
}
</script>

<template>
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

  <!--
    浮层宿主：菜单族锚点模式（`anchor` = 控件根节点，等价 WinUI `FlyoutBase.ShowAt(*this)`）。
    菜单族不产出根 DOM，面板 Teleport 到 body 并由它自己负责 role=menu / 键盘 / 焦点 /
    层级 / 开合动效；本组件只持有开关状态并把 `#flyout` 内容转进菜单族的 `#content`。
  -->
  <FluereMenuFlyout
    v-if="hasFlyout"
    ref="menuRef"
    :open="isOpen"
    :anchor="rootRef"
    :side-offset="FLYOUT_SIDE_OFFSET"
    placement="bottom-edge-aligned-left"
    :label="menuLabel"
    @update:open="applyOpen"
    @opened="emit('opened')"
    @closed="onMenuClosed"
    @select="onMenuSelect"
  >
    <template #content>
      <slot
        name="flyout"
        v-bind="flyoutSlotProps"
      />
    </template>
  </FluereMenuFlyout>
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
