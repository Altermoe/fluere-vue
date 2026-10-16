<script lang="ts">
/**
 * FluereCaptionButtons 组件 Props 契约
 *
 * 设计规范来源：WinUI 3 / Windows App SDK
 *   - 语义面（窗口能力开关 → 按钮显隐 / 禁用）：`AppWindowTitleBar`。**该类型不在
 *     `microsoft-ui-xaml` 里**，属 Windows App SDK 的窗口层，故本组件只保留「逻辑代理」：
 *     按钮**不改变任何窗口状态**，只把意图抛给消费方。
 *   - 视觉面：**microsoft-ui-xaml 里没有 caption 按钮的 A 级实现**。证据（全部可复现）：
 *       * `src/controls/dev/TitleBar/TitleBar.xaml`（`winui3/release/2.5.1`，commit ba3a8d5）
 *         的模板 12 列里只有「第 11 列 RightPadding（`TitleBarRightPaddingWidth`）承载
 *         系统 caption 区宽度」，没有任何最小化 / 最大化 / 关闭元素；
 *         `TitleBar_themeresources.xaml` / `..._perf2026.xaml` grep `Caption|Close|Minimize`
 *         零命中。
 *       * `src/dxaml/xcp/components/WindowChrome/CWindowChrome.cpp` 只做两件事：
 *         把 caption 按钮底色设成全透明白、以及维护 `NonClientRegionKind_Caption` 的
 *         hit-test 矩形；**没有绘制代码**。`CWindowChrome.h` 里的
 *         `enum class CaptionButtonState { Normal, Hover, Pressed }` 全仓无使用点。
 *       * Microsoft 自己的 `specs/TitleBar/titlebar-functional-spec.md:47-48` 写明
 *         "WinUI TitleBar does not handle Caption Buttons ... handled by the AppWindow TitleBar"。
 *   - 唯一存在的 caption 视觉是**遗留系统 chrome**样式：
 *     `src/dxaml/xcp/dxaml/themes/generic.xaml:15697-15786` 的 `x:Key="WindowCaptionButton"`
 *     （40×28 按钮、9×9 描边 `Path`、`StrokeThickness` 0.5 / HC 3.0、
 *     `WindowStateNormal` / `WindowStateMaximized` 两段 `Path.Data`）。WinUI 3 的
 *     `TitleBar` / `CWindowChrome` 都不消费它 —— 本组件**只用它的字形几何**（见 constants.ts），
 *     尺寸与配色改用 Windows 11 实机口径（下述）。
 *
 * 几何与配色（Windows 11 系统度量；1:1 参考截图为交叉验证，非取值依据）：
 *   - 单键 46×32、三键 138 宽、字形外框 10×10、描边 1px：见 constants.ts 的逐条依据
 *     （`TitleBarRightPaddingWidth` ← `AppWindowTitleBar.RightInset()` 这一 A 级线索，
 *     加参考图实测「三键字形中心间距 46.0 / 46.0、字形外框 10×10」）。
 *   - 底 / 前景：WinUI 的 `TitleBarBackButton*` 一族即「标题栏按钮」的 A 级画刷，
 *     故 rest/hover/pressed/disabled 与之一致
 *     （`SubtleFillColor{Transparent,Secondary,Tertiary}Brush` / `ControlFillColorDisabledBrush`
 *     + `TextFillColor{Primary,Primary,Secondary,Disabled}Brush`）。
 *   - 关闭键红底：**无 A 级消费证据**。遗留样式里确有 `CloseButtonBackgroundPointerOver`
 *     = `#e81123`、`CloseButtonBackgroundPressed` = `#f1707a`，但这两个画刷**只有定义行、
 *     零引用行**（`CloseButtonPointerOver` / `CloseButtonPressed` 两个状态引用的仍是
 *     `WindowCaptionButton*` 一族），且是 Windows 10 口径。Windows 11 的关闭键 hover 红
 *     与 WinUI 系统色 `SystemFillColorCritical`（`Common_themeresources_any.xaml:282`
 *     = `#C42B1C`）逐字节一致，故 hover 取该值、落成组件局部变量
 *     `--fui-caption-buttons-close-hover`；pressed 无任何来源，取语义位最近的
 *     `colorStatusDangerBackground3Hover`（#B10E1C），ΔE 与覆盖方法写进样式注释。
 *
 * 浏览器实测（2026-10-13，Playwright + 系统 Chrome，1280×900 / DPR 1；脚本
 * temp/pw-app-window.mjs，页面 /components/app-window；以下结论可复现）：
 *   单键 46×32、caption 区 138 宽、键心间距 46 / 46、字形 10×10 且居中、线宽 1px；
 *   48 高标题栏里 caption 区 `offsetTop` = 0（顶端对齐），贴窗口右缘（只剩 1px 描边）；
 *   hover 底 `rgb(245, 245, 245)`（colorSubtleBackgroundHover）；关闭键 hover 底
 *   `rgb(196, 43, 28)` = #C42B1C、字形 `rgb(255, 255, 255)`（colorNeutralForegroundOnBrand）；
 *   焦点矩形 `inset 0 0 0 2px rgb(0,0,0), inset 0 0 0 3px rgb(255,255,255)`
 *   （= colorStrokeFocus2 外层 2px + colorStrokeFocus1 内层 1px）；失活字形转
 *   `colorNeutralForeground3`。
 *
 * 字形保真度校准（2026-10-16；Playwright 1:1 冻结帧 ↔ Windows 11 参考图逐像素比对，
 * 脚本 temp/glyph-lab.mjs / temp/glyph-lab-compare.py；Δ = 逐像素平均绝对差，越小越像）：
 *   最小化 `M0 5.5H10`（butt）→ **Δ0.00**：墨迹正好落在第 6 像素行（y 5..6，比外框
 *     几何中心低 0.5px —— 系统光栅化把 1px 横条取整到像素行的结果），与参考图逐像素一致；
 *   最大化 10×10 圆角方框（中线内缩 0.5、圆角 r0.25、butt）→ **Δ2.51**
 *     （直角 Δ3.38、遗留样式的 r≈1.67px 大圆角 Δ9.72）；
 *   关闭叉（端点 ±0.55 = 线宽÷2 使圆头外缘贴满外框、线宽 1.1、round）→ **Δ3.19**
 *     （线宽 1.0 时 Δ15.74、1.2 时 Δ11.08 —— 1.0 在 Chrome 里 45° 会退化成硬阶梯）；
 *   墨色改为纯黑：#000000 —— 依据是遗留样式的 `WindowCaptionForeground` →
 *     `SystemControlForegroundBaseHighBrush` → `SystemBaseHighColor` = #000000 / #FFFFFF
 *     （浅 / 深主题），与参考图墨色实测（最小化横条像素值 0）一致；原先用的 token
 *     colorNeutralForeground1 浅色是 #242424（偏灰，token 表无此同值档）。
 *
 * 与 WinUI / 系统的差异（有意为之，逐条记录）：
 *   - **能力开关的口径是假设**：`IsMinimizable` / `IsMaximizable` 为 false 时**隐藏**按钮，
 *     `IsClosable` 为 false 时**保留但禁用**。系统表现无 A 级源码，改一行即可切换
 *     （见模板里的 `v-if` / `:disabled`）。
 *   - **`IsTabStop=False` 不采纳**：遗留 `WindowCaptionButton` 样式把按钮设为不可 Tab。
 *     本库按 `docs/todo.md` 0.5.2 的验收（"全部键盘可达 + aria-label"）保留 Tab 序，
 *     并用 WinUI 双层焦点矩形（`FocusStrokeColorOuter` = `#E4000000` /
 *     `FocusStrokeColorInner` = `#B3FFFFFF`）表达焦点。
 *   - **不做原生 ToolTip**：系统确有 "Minimize" / "Close" 之类的悬浮提示，但文案不在仓库里
 *     （随系统语言），本组件只提供 `aria-label`，可访问名由 `labels` 覆盖 —— 与 InfoBar
 *     的关闭按钮同一口径（缺省不渲染原生 title）。
 *   - 高对比度主题不实现（WinUI HC 下 `WindowCaptionButton` 画刷走 `SystemColor*`），属已知缺口。
 */
export type {
  FluereCaptionButtonsLabels,
  FluereCaptionButtonsProps,
  FluereCaptionButtonsProps as CaptionButtonsProps,
} from './types'
</script>

<script setup lang="ts">
import { useScopeMessages } from '@fluere-vue/hooks'
import { computed, defineComponent, h } from 'vue'
import type { PropType } from 'vue'
import {
  CAPTION_BUTTON_GLYPH_STROKE_WIDTH,
  CAPTION_GLYPH_CLOSE,
  CAPTION_GLYPH_MAXIMIZE,
  CAPTION_GLYPH_MINIMIZE,
  CAPTION_GLYPH_RESTORE,
} from './constants'
import type { CaptionGlyph } from './constants'
import { captionButtonsLocale } from './locale'
import type { FluereCaptionButtonsProps } from './types'

defineOptions({ name: 'FluereCaptionButtons' })

/**
 * 内部字形渲染器：一个 `<svg>` + N 条 `path`。
 *
 * `vector-effect="non-scaling-stroke"` 复刻 XAML 的 `Stretch="Fill"` 行为 ——
 * 几何被拉伸填满外框，但**描边厚度不随之缩放**（遗留样式 9×9 外框 + 0.5 描边即此口径）。
 * `preserveAspectRatio="none"` 同理（两条 A 级路径的自然边界都近似正方，形变 <0.1%）。
 *
 * **线宽与端头落在字形数据上、由属性输出（不在 CSS 里）**：两条原因 ——
 *  1. 每个字形的线宽本来就不一样（最小化 / 最大化 = 1，关闭叉 = 1.1，见 constants.ts 的
 *     Chrome 45° 退化证据），一条 CSS 声明表达不了；
 *  2. SVG **呈现属性（presentation attribute）的优先级低于任何 CSS 规则**，若样式块里再写
 *     `stroke-width` / `stroke-linecap`，会把这里的逐字形值整个盖掉（静默失效）。
 * 端头同样逐字形：最大化为 `butt`（方框闭合路径不需要端头），关闭叉为 `round`（遗留样式的
 * `StrokeStartLineCap` / `StrokeEndLineCap` = Round，且与参考图那 4 个高覆盖角像素吻合）。
 *
 * **不加 `shape-rendering: crispEdges`**：它关掉抗锯齿后，45° 笔画会退化成硬边阶梯、
 * 圆角被量化成块（temp/glyph-lab.mjs 冻结帧实测；默认 `auto` 的逐像素平均绝对差
 * 关闭叉 3.2/255 vs crispEdges 15.7/255）。
 */
const CaptionGlyphView = defineComponent({
  name: 'FluereCaptionGlyph',
  props: {
    glyph: { type: Object as PropType<CaptionGlyph>, required: true },
  },
  setup: (glyphProps) => () =>
    h(
      'svg',
      {
        'class': 'fui-caption-buttons__glyph',
        'viewBox': glyphProps.glyph.viewBox,
        'preserveAspectRatio': 'none',
        'aria-hidden': 'true',
        'focusable': 'false',
      },
      glyphProps.glyph.paths.map((d) =>
        h('path', {
          d,
          'vector-effect': 'non-scaling-stroke',
          'stroke-width': glyphProps.glyph.strokeWidth ?? CAPTION_BUTTON_GLYPH_STROKE_WIDTH,
          'stroke-linecap': glyphProps.glyph.linecap ?? 'butt',
        }),
      ),
    ),
})

const props = withDefaults(defineProps<FluereCaptionButtonsProps>(), {
  maximized: false,
  isMinimizable: true,
  isMaximizable: true,
  isClosable: true,
  active: true,
  labels: undefined,
  locale: undefined,
})

const emit = defineEmits<{
  /** `v-model:maximized`：最大值 / 还原的切换意图（组件不改窗口几何） */
  'update:maximized': [value: boolean]
  /** 用户请求最小化（对应系统最小化） */
  'minimize': []
  /** 用户请求最大化（仅在 `maximized === false` 时抛出） */
  'maximize': []
  /** 用户请求还原（仅在 `maximized === true` 时抛出） */
  'restore': []
  /** 用户请求关闭（对应系统关闭） */
  'close': []
}>()

/** 内建文案：scope=`caption-buttons`，`labels` prop 优先、其次 `locale` prop、再 Provider */
const i18n = useScopeMessages('caption-buttons', captionButtonsLocale, () => props.locale)

const minimizeLabel = computed(() => props.labels?.minimize ?? i18n.t('minimize'))
const maximizeLabel = computed(() => props.labels?.maximize ?? i18n.t('maximize'))
const restoreLabel = computed(() => props.labels?.restore ?? i18n.t('restore'))
const closeLabel = computed(() => props.labels?.close ?? i18n.t('close'))

/** 最大化 / 还原二选一（对应 `WindowStateNormal` / `WindowStateMaximized` 两段 `Path.Data`） */
const maximizeRestoreLabel = computed(() =>
  props.maximized ? restoreLabel.value : maximizeLabel.value,
)
const maximizeRestoreGlyph = computed(() =>
  props.maximized ? CAPTION_GLYPH_RESTORE : CAPTION_GLYPH_MAXIMIZE,
)

/** 点击最大化 / 还原：先抛意图（`update:maximized`），再抛语义事件（`maximize` / `restore`） */
const onMaximizeRestore = (): void => {
  const next = !props.maximized
  emit('update:maximized', next)
  // 两条字面量分支：`defineEmits` 的重载按字面量键解析，三元表达式会被判为联合类型而报错
  if (next) {
    emit('maximize')
  } else {
    emit('restore')
  }
}
</script>

<template>
  <div
    class="fui-caption-buttons"
    :data-active="active"
    :data-maximized="maximized"
  >
    <button
      v-if="isMinimizable"
      type="button"
      class="fui-caption-buttons__button fui-caption-buttons__button--minimize"
      :aria-label="minimizeLabel"
      @click="emit('minimize')"
    >
      <slot name="minimize-icon">
        <CaptionGlyphView :glyph="CAPTION_GLYPH_MINIMIZE" />
      </slot>
    </button>

    <button
      v-if="isMaximizable"
      type="button"
      class="fui-caption-buttons__button fui-caption-buttons__button--maximize"
      :data-glyph="maximized ? 'restore' : 'maximize'"
      :aria-label="maximizeRestoreLabel"
      @click="onMaximizeRestore"
    >
      <slot :name="maximized ? 'restore-icon' : 'maximize-icon'">
        <CaptionGlyphView :glyph="maximizeRestoreGlyph" />
      </slot>
    </button>

    <!-- 不可关闭时按钮保留但禁用（与最小化 / 最大化的「隐藏」不同，见文件头假设） -->
    <button
      type="button"
      class="fui-caption-buttons__button fui-caption-buttons__button--close"
      :disabled="!isClosable"
      :aria-label="closeLabel"
      @click="emit('close')"
    >
      <slot name="close-icon">
        <CaptionGlyphView :glyph="CAPTION_GLYPH_CLOSE" />
      </slot>
    </button>
  </div>
</template>

<style scoped>
/* ------------------------------------------------------------------ */
/* 取值全部走 Fluent 语义 token；无同值 token 的落成组件局部变量，        */
/* 注释里逐条写清来源与覆盖方法。                                       */
/*                                                                     */
/* WinUI 系统度量（无 A 级 XAML 模板，依据见 constants.ts 与文件头）：   */
/*   单键宽 46 / 高 32（= TitleBarCompactHeight）                       */
/*   字形外框 10、描边 1（参考图 1:1 实测；遗留样式为 9×9 / 0.5）        */
/*   字形线宽 / 端头逐字形定义（关闭叉 1.1 + round，其余 1 + butt），     */
/*   由 SVG 属性输出，理由见 <script setup> 里 CaptionGlyphView 的注释   */
/* 画刷映射（对齐 TitleBar_themeresources.xaml 的 TitleBarBackButton*）： */
/*   rest      底色 透明                     → colorSubtleBackground      */
/*   hover     底色 SubtleFillColorSecondary → colorSubtleBackgroundHover */
/*   pressed   底色 SubtleFillColorTertiary  → colorSubtleBackgroundPressed */
/*   disabled  底色 ControlFillColorDisabled → colorNeutralBackgroundDisabled */
/*   rest      前景 = 遗留样式的 `WindowCaptionForeground` →                 */
/*              SystemControlForegroundBaseHighBrush → SystemBaseHighColor   */
/*              = #000000 / #FFFFFF（浅 / 深主题，generic.xaml:263 + 4132）  */
/*              —— token 表无同值档（token 的 colorNeutralForeground1 浅色   */
/*              是 #242424），故落成局部变量                                 */
/*              --fui-caption-buttons-glyph-color: light-dark(#000000,#ffffff) */
/*              （参考图墨色实测亦为纯黑 #000000，作交叉验证）              */
/*   pressed   前景 TextFillColorSecondary   → colorNeutralForeground2    */
/*   disabled  前景 TextFillColorDisabled    → colorNeutralForegroundDisabled */
/*   失活      前景 TitleBarDeactivatedForegroundBrush → colorNeutralForeground3 */
/*              （语义位映射；系统 caption 失活色无源码，属证据缺口）      */
/*   关闭 hover  → --fui-caption-buttons-close-hover = #C42B1C（系统色     */
/*              SystemFillColorCritical，与 Windows 11 实机一致）+         */
/*              字形 TextFillColorInverse → colorNeutralForegroundOnBrand  */
/*   关闭 pressed → colorStatusDangerBackground3Hover（#B10E1C；语义位最近，
/*              Fluent 2 Web 无 Win11 关闭键按下色的同值 token，ΔE 记在文档页） */
/*                                                                     */
/* 状态切换无过渡：XAML 的 `DiscreteObjectKeyFrame KeyTime="0"` 即零时长    */
/* 离散跳变（遗留 WindowCaptionButton 样式的 5 个 CommonStates 全如此）。   */
/* ------------------------------------------------------------------ */

.fui-caption-buttons {
  --fui-caption-buttons-button-width: 46px;
  --fui-caption-buttons-button-height: 32px;
  --fui-caption-buttons-glyph-size: 10px;
  /* 字形墨色：`WindowCaptionForeground` → `SystemBaseHighColor`（浅 #000000 / 深 #FFFFFF）；
     token 表无同值档，故落成本地变量（依据与覆盖方法见上方注释块） */
  --fui-caption-buttons-glyph-color: light-dark(#000000, #ffffff);
  --fui-caption-buttons-close-hover: #c42b1c;
  --fui-caption-buttons-close-pressed: var(--colorStatusDangerBackground3Hover);

  display: flex;
  flex: none;
  /* 顶端对齐：48 高的标题栏里 caption 按钮只占顶部 32（参考图实测，见 constants.ts） */
  align-items: flex-start;
  block-size: var(--fui-caption-buttons-button-height);
}

.fui-caption-buttons__button {
  display: flex;
  align-items: center;
  justify-content: center;
  inline-size: var(--fui-caption-buttons-button-width);
  block-size: var(--fui-caption-buttons-button-height);
  padding: 0;
  /* 遗留 WindowCaptionButton 样式：BorderThickness=0、无圆角 */
  border: none;
  border-radius: 0;
  background-color: var(--colorSubtleBackground);
  color: var(--fui-caption-buttons-glyph-color);
  cursor: default;
  /* 字形是描边路径，颜色随 currentColor */
  font: inherit;
  appearance: none;
}

.fui-caption-buttons__button:hover {
  background-color: var(--colorSubtleBackgroundHover);
}

.fui-caption-buttons__button:active {
  background-color: var(--colorSubtleBackgroundPressed);
  color: var(--colorNeutralForeground2);
}

.fui-caption-buttons__button:disabled {
  background-color: var(--colorNeutralBackgroundDisabled);
  color: var(--colorNeutralForegroundDisabled);
  cursor: default;
}

/* 关闭键的红底只在 hover / pressed 生效（Win11 口径；pressed 取语义位最近的 token） */
.fui-caption-buttons__button--close:hover {
  background-color: var(--fui-caption-buttons-close-hover);
  color: var(--colorNeutralForegroundOnBrand);
}

.fui-caption-buttons__button--close:active {
  background-color: var(--fui-caption-buttons-close-pressed);
  color: var(--colorNeutralForegroundOnBrand);
}

/* 失活（非前台）窗口：字形转弱（对应 TitleBarDeactivatedForegroundBrush 的语义位） */
.fui-caption-buttons[data-active='false'] .fui-caption-buttons__button {
  color: var(--colorNeutralForeground3);
}

/*
 * 焦点矩形：WinUI 双层（FocusStrokeColorOuter #E4000000 = colorStrokeFocus2、
 * FocusStrokeColorInner #B3FFFFFF = colorStrokeFocus1），外 2px + 内 1px，画在元素内侧。
 * 0.4.3 的 `useFocusVisual` 落地后收敛到该原语；本轮先在组件内本地实现（不抢定义）。
 */
.fui-caption-buttons__button:focus-visible {
  outline: none;
  box-shadow:
    inset 0 0 0 var(--strokeWidthThick) var(--colorStrokeFocus2),
    inset 0 0 0 calc(var(--strokeWidthThick) + var(--strokeWidthThin)) var(--colorStrokeFocus1);
}

.fui-caption-buttons__glyph {
  inline-size: var(--fui-caption-buttons-glyph-size);
  block-size: var(--fui-caption-buttons-glyph-size);
  /* 字形 = 描边路径（FillBrush 不存在于遗留样式；`Path` 只有 Stroke） */
  fill: none;
  stroke: currentColor;
  /* stroke-width / stroke-linecap 逐字形写在 path 属性上（见 CaptionGlyphView 注释），
     这里**不能**再声明，否则呈现属性会被 CSS 规则盖掉；
     shape-rendering 保持默认 auto —— crispEdges 会关掉抗锯齿，把 45° 笔画退化成阶梯。 */
  stroke-linejoin: miter;
  pointer-events: none;
}
</style>
