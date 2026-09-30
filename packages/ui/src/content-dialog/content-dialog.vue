<script lang="ts">
/**
 * FluereContentDialog 组件 Props 契约
 *
 * 设计规范来源：WinUI 3 / Windows App SDK
 *   microsoft-ui-xaml `winui3/release/2.5.1`（commit ba3a8d5，本地快照 temp/winui-src）
 *   已核对版本漂移：与最新 WinUI3 Gallery 发行版 v2.9.3 所用 WindowsAppSDK 2.0.1
 *   （tag `winui3/release/2.0.1`）的关系判定沿用 InfoBar 条目口径（对目标目录做两 tag 间
 *   diff，只允许构建工程文件差异）。
 *
 * 读到的规范（文件 → 结论）：
 *  - `src/controls/dev/CommonStyles/ContentDialog_themeresources.xaml`：
 *      · 尺寸：MinWidth 320 / MaxWidth 548 / MinHeight 184 / MaxHeight 756、
 *        CornerRadius = `OverlayCornerRadius`(8)、BorderThickness 1、
 *        Padding 24、TitleMargin 0,0,0,12、ButtonSpacing 8、内容区下边框 0,0,0,1
 *      · 解剖：Container → LayoutRoot(全屏) → SmokeLayerBackground(Rectangle) +
 *        BackgroundElement(Border, Center, RenderTransformOrigin 0.5,0.5, ScaleTransform) →
 *        DialogSpace(Grid 两行 * / auto) → ContentScrollViewer(内含
 *        Title/Content 的 Grid，背景 `ContentDialogTopOverlay`、内边距 24、下边框 1) +
 *        CommandSpace(5 列网格 + 三个 Button)
 *      · 命令区 5 列：Primary(*) / FirstSpacer(0) / SecondaryColumn(0) / SecondSpacer(8) /
 *        CloseColumn(*)；按钮默认落位 Primary→列 1、Secondary→列 3、Close→列 5
 *      · `DialogSizingStates.FullDialogSizing` 只把 BackgroundElement 的
 *        VerticalAlignment 置为 Stretch
 *      · `DefaultButtonStates` 用 `AccentButtonStyle` 表达强调按钮
 *      · InPlace 场景的 `DialogShowingStates` 过渡（本库对应 Popup 场景，见下）
 *  - `src/dxaml/xcp/dxaml/lib/ContentDialog_Partial.cpp`：
 *      · `ChangeVisualState`：按钮可见性 8 态由三个文案是否为空推导；
 *        `DefaultButton != None` 时，只有「焦点不在命令区」或「焦点正在该按钮上」才保留强调态，
 *        焦点落在命令区其它按钮上时回到 `NoDefaultButton`（强调态消失）；
 *        Popup 场景走 `DialogShowingWithoutSmokeLayer`（不播 VSM 过渡），动画交给 ThemeTransition
 *      · `SetInitialFocusElement`：记录弹出前聚焦元素；初始焦点三级优先
 *        ① 内容区第一个可聚焦元素 → ② 默认按钮 → ③ 命令区第一个可聚焦按钮
 *      · `ProcessLayoutRootKey`：Escape → `ExecuteCloseAction()`（有可点的关闭按钮就程序化
 *        点击它，否则直接以 None 关闭）；Enter → 激活默认按钮（若启用）
 *      · `OnCommandButtonClicked`：先抛 ButtonClick（可 Cancel），未被取消再执行 Command 并隐藏
 *      · `HideInternal`：抛 Closing（`Cancel` 可取消）→ 关闭弹窗（播放退出过渡）→ 抛 Closed(result)
 *      · `UpdateTitleSpaceVisibility`：Title 与 TitleTemplate 皆空 → 标题位 Collapsed
 *      · `PrepareContent`：`ApplyElevationEffect(depth 0, baseElevation 128)` 给表面投阴影
 *  - `src/dxaml/xcp/dxaml/lib/ContentDialogOpenCloseThemeTransition_Partial.h` +
 *    `src/dxaml/xcp/dxaml/lib/LayoutTransition_partial.cpp`（
 *    `ContentDialogOpenCloseThemeTransition::CreateStoryboardImpl`，约 2251 行）：
 *      · Load  ：dialog 目标 ScaleX/Y 1.05 → 1（`s_OpenScaleDuration` 250ms，
 *                cubic-bezier(0,0,0,1)）、Opacity 0 → 1（`s_OpacityChangeDuration` 83ms，linear）；
 *                smoke 目标 Opacity 0 → 1（83ms，linear）
 *      · Unload：dialog 目标 ScaleX/Y 1 → 1.05（`s_CloseScaleDuration` 167ms，
 *                cubic-bezier(0,0,0,1)）、Opacity 1 → 0（83ms，linear）；
 *                smoke 目标 Opacity 1 → 0（83ms，linear）
 *      · `ParticipatesInTransitionImpl` 只在 target 是 ContentDialog 且 trigger 为
 *        Load/Unload 时参与；smoke 层只做透明度、不缩放
 *      · 250 / 167 / 83ms 与 `Common_themeresources_any.xaml` 的
 *        `ControlNormalAnimationDuration` / `ControlFastAnimationDuration` /
 *        `ControlFasterAnimationDuration` 一一对应，缓动与 `ControlFastOutSlowInKeySpline`
 *        （0,0,0,1）同值
 *  - `src/controls/test/MUXControlsTestApp/verification/ContentDialog.xml`：几何复核
 *    （320 / 548 / 184 / 756 / 圆角 8 / 描边 1 / CommandSpace Padding 24）
 *
 * Web 侧动效实现的结构决策（**不要合并成一条 animation**）：
 *   reka 的 `Presence` 以「节点上 `animationend` 的第一次触发」决定卸载时机，而 WinUI 的
 *   缩放（250 / 167ms）与淡入淡出（83ms）是同一元素上时长不同的两条动画。因此这里把
 *   **缩放放在内容层根节点**（最长的一条，负责门控卸载），**透明度放在内层 surface**——
 *   83ms 结束即保持 0，剩余时间里的缩放不可见，观感与 WinUI 逐帧一致；
 *   遮罩层另在独立 Teleport 层上跑自己的 83ms（对应 WinUI 的第二个 Popup，不参与缩放）。
 *
 * WinUI 资源名 → Fluent token 映射（取值一律 `var(--TokenName)`）：
 *   ContentDialogForeground ← TextFillColorPrimary → colorNeutralForeground1（同值）
 *   ContentDialogBackground ← SolidBackgroundFillColorBase（#F3F3F3 / #202020）
 *     → colorNeutralBackground2（#fafafa / #1f1f1f，ΔE 2.3 / 0.6；Fluent 2 Web 无同值档）
 *   ContentDialogTopOverlay ← LayerFillColorAlt 叠在底色上的结果（#FFFFFF / #2C2C2C）
 *     → colorNeutralBackground1（#ffffff / #292929，ΔE 0 / 1.4）
 *   ContentDialogBorderBrush ← SurfaceStrokeColorDefault（40% #757575 合成后
 *     #C1C1C1 / #424242）→ colorNeutralStroke2（#e0e0e0 / #525252，ΔE 31 / 16，
 *     max(亮, 暗) 最小者；注意 InfoBar/Input 用的 colorNeutralStrokeAlpha 对应的是
 *     `CardStrokeColorDefault`，两者不可混用）
 *   ContentDialogSeparatorBorderBrush ← CardStrokeColorDefault（#0F000000 ≈ 5.9% 黑）
 *     → colorNeutralStrokeAlpha（rgba(0,0,0,.05)）
 *   圆角 OverlayCornerRadius(8) → borderRadiusXLarge；描边宽度 1 → strokeWidthThin
 *   内边距 / 标题下间距 / 按钮间距 24 / 12 / 8 → spacing*XXL / spacingVerticalM / spacingHorizontalS
 *   标题 20 / SemiBold → fontSizeBase500 + fontWeightSemibold；
 *   正文 14 / 行高 20 → fontSizeBase300 + lineHeightBase300
 *   ControlNormalAnimationDuration(250ms) → durationGentle（同值）
 *   ControlFastOutSlowInKeySpline(0,0,0,1) → curveDecelerateMid（同值）
 *   ControlFastAnimationDuration(167ms) / ControlFasterAnimationDuration(83ms) → 无同值 token，
 *     落成组件局部变量 --fui-content-dialog-close-scale-duration / --fui-content-dialog-fade-duration
 *   ApplyElevationEffect(128) → shadow64（源码只给 baseElevation，无 px 可取值，按浮层语义位取
 *     Fluent 2 最大档，属 B 级近似）
 *   MinWidth/MaxWidth/MinHeight/MaxHeight（320/548/184/756）→ token 表无该档位，落成局部变量
 *   需要严格对齐实机时可覆盖局部变量：
 *     .fui-content-dialog__surface { --fui-content-dialog-surface: #f3f3f3; }
 *
 * 与 WinUI 的差异（有意为之，逐条记录）：
 *  - 门户：WinUI 用 Popup + XamlRoot，本库用 reka `DialogPortal`（弹窗）与
 *    `FluereSmokeLayer`（遮罩，独立 Teleport）；遮罩层对应 WinUI 的第二个 Popup。
 *  - 取消语义：ButtonClick / Closing 的 `args.cancel` 是**同步标志**，不做异步 Deferral。
 *  - Enter：焦点落在 button / a / input / textarea / select / summary /
 *    contenteditable / role=button 上时不接管（WinUI 靠路由事件的 Handled 达到同一效果）。
 *  - 焦点还原时机：退出动画结束（WinUI 在关闭流程开始时就还焦点），避免与 reka 的
 *    `triggerElement.focus()` 抢焦点。
 *  - 遮罩点击不关闭：WinUI 无 light-dismiss 路径，这里同样把
 *    `pointer-down-outside` / `interact-outside` / `focus-outside` 一律 preventDefault。
 *  - 无 `PrimaryButtonCommand` 等 Command 属性（由点击事件承担同一时序）。
 *  - 窄视口适配：`MinWidth 320` 等绝对尺寸用 `min(..., 100%)` 与视口对齐（WinUI 假定
 *    桌面窗口足够宽），属 Web 侧响应式补充。
 *  - 内容滚动条：WinUI 的 `ContentScrollViewer` 设 `VerticalScrollBarVisibility=Disabled`，
 *    这里同样隐藏滚动条（`scrollbar-width: none` + `::-webkit-scrollbar`）。
 *  - `aria-describedby`：reka 会在 dev 下要求存在 `DialogDescription`，这里渲染一个空的隐藏
 *    描述元素（对齐 WinUI「弹窗没有 description」的语义，同时保持控制台干净）。
 *  - 高对比度主题（WinUI HC：描边 2px、`SystemColorWindow*`）本轮不实现，属已知缺口。
 *  - 不做「同一父节点下只允许一个 Popup 弹窗」的强约束（`ContentDialogMetadata` 的断言）。
 */
export type {
  FluereContentDialogButton,
  FluereContentDialogButtonClickEventArgs,
  FluereContentDialogButtonKind,
  FluereContentDialogButtonVisibility,
  FluereContentDialogClosedEventArgs,
  FluereContentDialogClosingEventArgs,
  FluereContentDialogProps,
  FluereContentDialogResult,
} from './types'
</script>

<script setup lang="ts">
import { DialogContent, DialogDescription, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { computed, ref, useSlots } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import FluereButton from '../button/button.vue'
import FluereSmokeLayer from '../overlay/smoke-layer.vue'
import type {
  FluereContentDialogButtonClickEventArgs,
  FluereContentDialogButtonKind,
  FluereContentDialogClosedEventArgs,
  FluereContentDialogClosingEventArgs,
  FluereContentDialogProps,
} from './types'
import { useContentDialog } from './use-content-dialog'
import type { ContentDialogEmits } from './use-content-dialog'

defineOptions({
  name: 'FluereContentDialog',
  // 弹窗由 Teleport 承载，没有可供 attrs 落地的单一根元素；
  // 消费方的 class / 原生事件请通过插槽内容或事件面表达
  inheritAttrs: false,
})

const props = withDefaults(defineProps<FluereContentDialogProps>(), {
  open: false,
  title: '',
  primaryButtonText: '',
  secondaryButtonText: '',
  closeButtonText: '',
  isPrimaryButtonEnabled: true,
  isSecondaryButtonEnabled: true,
  defaultButton: 'none',
  fullSizeDesired: false,
  to: 'body',
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  'opened': []
  'closing': [args: FluereContentDialogClosingEventArgs]
  'closed': [args: FluereContentDialogClosedEventArgs]
  'primaryButtonClick': [args: FluereContentDialogButtonClickEventArgs]
  'secondaryButtonClick': [args: FluereContentDialogButtonClickEventArgs]
  'closeButtonClick': [args: FluereContentDialogButtonClickEventArgs]
}>()

const slots = useSlots()

/** 标题位是否有内容（对齐 `UpdateTitleSpaceVisibility`：Title / TitleTemplate 皆空则折叠） */
const hasTitle = computed(() => Boolean(props.title) || Boolean(slots.title))

const contentRef = ref<HTMLElement | null>(null)
const commandRef = ref<HTMLElement | null>(null)
const primaryRef = ref<ComponentPublicInstance | null>(null)
const secondaryRef = ref<ComponentPublicInstance | null>(null)
const closeRef = ref<ComponentPublicInstance | null>(null)

/** 结构化事件面：让编排层可以脱离 SFC 单测 */
const dialogEmits: ContentDialogEmits = {
  updateOpen: (value) => emit('update:open', value),
  opened: () => emit('opened'),
  closing: (args) => emit('closing', args),
  closed: (args) => emit('closed', args),
  primaryButtonClick: (args) => emit('primaryButtonClick', args),
  secondaryButtonClick: (args) => emit('secondaryButtonClick', args),
  closeButtonClick: (args) => emit('closeButtonClick', args),
}

const {
  commandLayout,
  hasCommandSpace,
  accentButton,
  requestClose,
  onButtonClick,
  onEscape,
  onEnter,
  onAnimationEnd,
  onButtonFocus,
  onCommandFocusOut,
  applyInitialFocus,
} = useContentDialog({
  props,
  emit: dialogEmits,
  refs: {
    content: contentRef,
    commandSpace: commandRef,
    buttons: { primary: primaryRef, secondary: secondaryRef, close: closeRef },
  },
})

/**
 * reka 的 DismissableLayer 请求改开关值时，走本组件自己的关闭流程，
 * 而不是直接回写 `open` —— 否则会绕过 `closing`（可取消）与 `closed.result`。
 * 正常情况下 reka 的这一路已被 `preventOutsideDismiss` / `onEscape` 拦住，这里只是兜底。
 */
const onRootOpenChange = (value: boolean): void => {
  if (value) {
    emit('update:open', true)
    return
  }
  if (props.open) {
    requestClose('none')
  }
}

/** 弹窗不接受任何形式的「点外部 / 焦点移出」关闭（对齐 WinUI 无 light-dismiss） */
const preventOutsideDismiss = (event: Event): void => {
  event.preventDefault()
}

/** 初始焦点策略由组件接管（WinUI 的三级优先，与 reka 的「第一个可聚焦元素」不同） */
const onOpenAutoFocus = (event: Event): void => {
  event.preventDefault()
  applyInitialFocus()
}

/** 焦点还原也由组件接管（reka 记录的 triggerElement 不一定是弹出前的元素） */
const onCloseAutoFocus = (event: Event): void => {
  event.preventDefault()
}

const buttonClass = (kind: FluereContentDialogButtonKind): string[] => [
  'fui-content-dialog__button',
  `fui-content-dialog__button--${kind}`,
]
</script>

<template>
  <DialogRoot
    :open="open"
    :modal="true"
    @update:open="onRootOpenChange"
  >
    <!-- 遮罩层：WinUI 里的第二个 Popup（独立 Teleport，只做 83ms 透明度） -->
    <FluereSmokeLayer
      :open="open"
      :to="to"
    />

    <DialogPortal :to="to">
      <DialogContent
        class="fui-content-dialog"
        :data-state="open ? 'open' : 'closed'"
        :data-buttons="commandLayout.state"
        :data-sizing="fullSizeDesired ? 'full' : 'default'"
        aria-modal="true"
        @animationend="onAnimationEnd"
        @escape-key-down="onEscape"
        @pointer-down-outside="preventOutsideDismiss"
        @interact-outside="preventOutsideDismiss"
        @focus-outside="preventOutsideDismiss"
        @open-auto-focus="onOpenAutoFocus"
        @close-auto-focus="onCloseAutoFocus"
        @keydown.enter="onEnter"
      >
        <div
          class="fui-content-dialog__surface"
          :data-state="open ? 'open' : 'closed'"
        >
          <div class="fui-content-dialog__space">
            <!-- ContentScrollViewer：VerticalScrollBarVisibility=Disabled（隐藏滚动条） -->
            <div class="fui-content-dialog__scroll">
              <div class="fui-content-dialog__body">
                <!-- 标题位：Title / TitleTemplate 皆空时折叠，但保留元素以承载可访问名 -->
                <DialogTitle
                  as="div"
                  class="fui-content-dialog__title"
                  :hidden="!hasTitle"
                >
                  <slot name="title">{{ title || ariaLabel }}</slot>
                </DialogTitle>

                <div
                  ref="contentRef"
                  class="fui-content-dialog__content"
                >
                  <slot />
                </div>
              </div>
            </div>

            <!-- CommandSpace：5 列网格，按钮落位由 data-buttons 状态决定 -->
            <div
              v-if="hasCommandSpace"
              ref="commandRef"
              class="fui-content-dialog__command"
              @focusout="onCommandFocusOut"
            >
              <FluereButton
                v-if="commandLayout.visible.primary"
                ref="primaryRef"
                :class="buttonClass('primary')"
                :appearance="accentButton === 'primary' ? 'primary' : 'secondary'"
                :disabled="!isPrimaryButtonEnabled"
                block
                @focusin="onButtonFocus('primary')"
                @click="onButtonClick('primary')"
              >
                {{ primaryButtonText }}
              </FluereButton>

              <FluereButton
                v-if="commandLayout.visible.secondary"
                ref="secondaryRef"
                :class="buttonClass('secondary')"
                :appearance="accentButton === 'secondary' ? 'primary' : 'secondary'"
                :disabled="!isSecondaryButtonEnabled"
                block
                @focusin="onButtonFocus('secondary')"
                @click="onButtonClick('secondary')"
              >
                {{ secondaryButtonText }}
              </FluereButton>

              <FluereButton
                v-if="commandLayout.visible.close"
                ref="closeRef"
                :class="buttonClass('close')"
                :appearance="accentButton === 'close' ? 'primary' : 'secondary'"
                block
                @focusin="onButtonFocus('close')"
                @click="onButtonClick('close')"
              >
                {{ closeButtonText }}
              </FluereButton>
            </div>
          </div>
        </div>

        <!-- 空描述元素：对齐 WinUI「弹窗无 description」的语义，并满足 reka 的 dev 校验 -->
        <DialogDescription
          as="div"
          hidden
          class="fui-content-dialog__description"
        />
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
/* 明暗主题由 tokens.css 的 light-dark() + color-scheme 自动切换 */
.fui-content-dialog {
  /* WinUI：ControlFastAnimationDuration / s_CloseScaleDuration = 167ms，
     ControlFasterAnimationDuration / s_OpacityChangeDuration = 83ms。
     Fluent 2 Web 的时长档位没有这两个值，故按组件局部变量落地 */
  --fui-content-dialog-close-scale-duration: 167ms;
  --fui-content-dialog-fade-duration: 83ms;
  /* 层级：与遮罩层同层（1000），靠 Teleport 挂载顺序（遮罩先、弹窗后）决定绘制次序；
     同层是为了让弹窗内部再 Teleport 的浮层（如 Combobox 下拉，同为 1000）仍能盖住弹窗 */
  --fui-content-dialog-z: 1000;

  position: fixed;
  inset: 0;
  z-index: var(--fui-content-dialog-z);
  display: flex;
  align-items: center;
  justify-content: center;
  /* LayoutRoot 本身不可见：底色与描边都在 surface 上 */
  background: transparent;
}

/* 内容层根承载 Scale（1.05 ↔ 1）：它是时间轴上最长的一条动画，
   reka 的 Presence 以它的 animationend 决定卸载，退出动画不会被截断。
   cubic-bezier(0,0,0,1) = --curveDecelerateMid（与 ControlFastOutSlowInKeySpline 同值） */
.fui-content-dialog[data-state='open'] {
  animation: fui-content-dialog-scale-in var(--durationGentle) var(--curveDecelerateMid) both;
}

.fui-content-dialog[data-state='closed'] {
  animation: fui-content-dialog-scale-out var(--fui-content-dialog-close-scale-duration)
    var(--curveDecelerateMid) both;
}

@keyframes fui-content-dialog-scale-in {
  from {
    transform: scale(1.05);
  }

  to {
    transform: scale(1);
  }
}

@keyframes fui-content-dialog-scale-out {
  from {
    transform: scale(1);
  }

  to {
    transform: scale(1.05);
  }
}

/* BackgroundElement */
.fui-content-dialog__surface {
  /* WinUI 资源：ContentDialogMinWidth / MaxWidth / MinHeight / MaxHeight（320 / 548 / 184 / 756），
     Fluent 2 Web 无同值档位，按资源名落成局部变量 */
  --fui-content-dialog-min-width: 320px;
  --fui-content-dialog-max-width: 548px;
  --fui-content-dialog-min-height: 184px;
  --fui-content-dialog-max-height: 756px;
  /* WinUI 资源：ContentDialogBackground ← SolidBackgroundFillColorBase
     → colorNeutralBackground2（ΔE 2.3 / 0.6） */
  --fui-content-dialog-surface: var(--colorNeutralBackground2);
  /* WinUI 资源：ContentDialogTopOverlay ← LayerFillColorAlt（叠在底色上的结果）
     → colorNeutralBackground1（ΔE 0 / 1.4） */
  --fui-content-dialog-layer: var(--colorNeutralBackground1);
  /* WinUI 资源：ContentDialogBorderBrush ← SurfaceStrokeColorDefault → colorNeutralStroke2 */
  --fui-content-dialog-border: var(--colorNeutralStroke2);
  /* WinUI 资源：ContentDialogSeparatorBorderBrush ← CardStrokeColorDefault
     → colorNeutralStrokeAlpha */
  --fui-content-dialog-separator: var(--colorNeutralStrokeAlpha);

  display: flex;
  flex-direction: column;
  /* 窄视口兜底：WinUI 的绝对 MinWidth/MinHeight 在 Web 上按视口收窄（见组件注释的差异清单） */
  min-width: min(var(--fui-content-dialog-min-width), 100%);
  max-width: min(var(--fui-content-dialog-max-width), 100%);
  min-height: var(--fui-content-dialog-min-height);
  max-height: min(var(--fui-content-dialog-max-height), 100%);
  background: var(--fui-content-dialog-surface);
  border: var(--strokeWidthThin) solid var(--fui-content-dialog-border);
  border-radius: var(--borderRadiusXLarge);
  /* ApplyElevationEffect(0, baseElevation 128) 的 B 级近似：Fluent 2 最大档阴影 */
  box-shadow: var(--shadow64);
  color: var(--colorNeutralForeground1);
}

/* FullDialogSizing：BackgroundElement.VerticalAlignment = Stretch */
.fui-content-dialog[data-sizing='full'] .fui-content-dialog__surface {
  align-self: stretch;
}

/* 内层 surface 承载 Opacity（83ms linear）：与根上的缩放并行，
   83ms 结束即保持 0，剩余时间里的缩放不可见 */
.fui-content-dialog__surface[data-state='open'] {
  animation: fui-content-dialog-fade-in var(--fui-content-dialog-fade-duration) linear both;
}

.fui-content-dialog__surface[data-state='closed'] {
  animation: fui-content-dialog-fade-out var(--fui-content-dialog-fade-duration) linear both;
}

@keyframes fui-content-dialog-fade-in {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes fui-content-dialog-fade-out {
  from {
    opacity: 1;
  }

  to {
    opacity: 0;
  }
}

/* DialogSpace：两行（内容 * / 命令区 auto），圆角与 surface 一致 */
.fui-content-dialog__space {
  display: grid;
  grid-template-rows: 1fr auto;
  flex: 1;
  min-height: 0;
  border-radius: inherit;
  overflow: hidden;
}

/* ContentScrollViewer：VerticalScrollBarVisibility=Disabled（隐藏滚动条，仍可滚动） */
.fui-content-dialog__scroll {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
}

.fui-content-dialog__scroll::-webkit-scrollbar {
  display: none;
}

/* ContentDialogPadding 24 + 内容区下边框 0,0,0,1（ContentDialogSeparatorThickness） */
.fui-content-dialog__body {
  padding: var(--spacingVerticalXXL) var(--spacingHorizontalXXL);
  background: var(--fui-content-dialog-layer);
  border-bottom: var(--strokeWidthThin) solid var(--fui-content-dialog-separator);
}

/* 标题：FontSize 20 / SemiBold / Margin 0,0,0,12 / MaxLines 2 */
.fui-content-dialog__title {
  margin: 0 0 var(--spacingVerticalM);
  overflow: hidden;
  font-size: var(--fontSizeBase500);
  font-weight: var(--fontWeightSemibold);
  line-height: var(--lineHeightBase500);
  /* TemplateBinding Title 的 ContentPresenter MaxLines="2" */
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

/* hidden 优先于上面的 display（类选择器会盖掉 UA 的 [hidden] 规则） */
.fui-content-dialog__title[hidden] {
  display: none;
}

/* 正文：ControlContentThemeFontSize 14 / 行高 20 */
.fui-content-dialog__content {
  font-size: var(--fontSizeBase300);
  line-height: var(--lineHeightBase300);
}

/* CommandSpace：5 列网格（Primary * / FirstSpacer / SecondaryColumn / SecondSpacer 8 / Close *）
   + ContentDialogPadding 24；FirstSpacer / SecondaryColumn 默认 0，仅 AllVisible 展开 */
.fui-content-dialog__command {
  --fui-content-dialog-first-spacer: 0px;
  --fui-content-dialog-secondary-column: 0px;

  display: grid;
  grid-template-columns:
    1fr var(--fui-content-dialog-first-spacer) var(--fui-content-dialog-secondary-column)
    var(--spacingHorizontalS) 1fr;
  padding: var(--spacingVerticalXXL) var(--spacingHorizontalXXL);
}

/* AllVisible：FirstSpacer=8、SecondaryColumn=*（原设 Secondary 落列 3） */
.fui-content-dialog[data-buttons='all'] .fui-content-dialog__command {
  --fui-content-dialog-first-spacer: var(--spacingHorizontalS);
  --fui-content-dialog-secondary-column: 1fr;
}

.fui-content-dialog__button {
  min-width: 0;
}

.fui-content-dialog__button--primary {
  grid-column: 1;
}

.fui-content-dialog__button--secondary {
  grid-column: 3;
}

.fui-content-dialog__button--close {
  grid-column: 5;
}

/* PrimaryVisible：Primary 移到列 5（Secondary / Close 已折叠） */
.fui-content-dialog[data-buttons='primary'] .fui-content-dialog__button--primary {
  grid-column: 5;
}

/* SecondaryVisible / PrimaryAndSecondaryVisible：Secondary 移到列 5 */
.fui-content-dialog[data-buttons='secondary'] .fui-content-dialog__button--secondary,
.fui-content-dialog[data-buttons='primary-secondary'] .fui-content-dialog__button--secondary {
  grid-column: 5;
}

/* 减少动效：去掉缩放与淡入淡出，静态形态即最终态（scale 1 / opacity 1），
   关闭时 reka 的 Presence 检测不到 animation-name 会立即卸载 */
@media (prefers-reduced-motion: reduce) {
  .fui-content-dialog[data-state],
  .fui-content-dialog__surface[data-state] {
    animation: none;
  }
}
</style>
