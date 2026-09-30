---
title: Content Dialog 对话框
description: 模态对话框：标题 + 正文 + 主/次/关闭三个按钮，遮罩层与弹窗的进入 / 退出缓动逐帧对齐 WinUI 3。
nav:
  title: Content Dialog 对话框
---

# Content Dialog 对话框

Content Dialog 用来在继续之前向用户索取确认或补充信息（WinUI 官方描述：_use a content dialog to prompt the user to confirm an action or provide additional information_）。它是**模态**弹层：遮罩层吃掉背后的指针输入，焦点被困在弹窗内，`Esc` 或按钮才能结束它。

几何、状态机与动效对齐 WinUI 3 / Windows App SDK 的 ContentDialog（`microsoft-ui-xaml` `winui3/release/2.5.1`，已核对与最新 WinUI3 Gallery 发行版 v2.9.3 所用的 WindowsAppSDK 2.0.1 在目标文件上一致）：

- **几何**：`MinWidth` 320 / `MaxWidth` 548 / `MinHeight` 184 / `MaxHeight` 756、圆角 8（`OverlayCornerRadius`）、描边 1、内边距 24、标题下间距 12、按钮间距 8。
- **解剖**：全屏内容层（`LayoutRoot`）→ 居中表面（`BackgroundElement`：底色 + 描边 + 阴影）→ 两行（内容 `*` / 命令区 `auto`）→ 内容层（`ContentDialogTopOverlay` 底色 + 下边框）与 5 列命令区网格。
- **动效**：进入 `scale 1.05 → 1`（250ms，`cubic-bezier(0,0,0,1)`）+ `opacity 0 → 1`（83ms，linear）；退出 `scale 1 → 1.05`（167ms）+ `opacity 1 → 0`（83ms）；遮罩层只做 83ms linear 的透明度、不缩放。

## 基础用法

`v-model:open` 控制开关（对齐 `ShowAsync()` / `Hide()`），`closed` 的 `args.result` 带回返回值（`primary` / `secondary` / `none`，对齐 `ContentDialogResult`）。

::demo-block{title="基础：标题 + 正文 + 主/次按钮（defaultButton = primary）"}
#preview
:ContentDialogBasicDemo
#code

```vue
<script setup lang="ts">
import { FluereButton, FluereContentDialog } from '@fluere-vue/ui'
import { ref } from 'vue'

const open = ref(false)
</script>

<template>
  <FluereButton @click="open = true">删除草稿</FluereButton>
  <FluereContentDialog
    v-model:open="open"
    title="要删除这份草稿吗？"
    primary-button-text="删除"
    secondary-button-text="取消"
    default-button="primary"
    @closed="(args) => console.log(args.result)"
  >
    删除后将从本机与云端一并移除，且无法恢复。
  </FluereContentDialog>
</template>
```

::

## 八种按钮组合

命令区状态只由「三个按钮文案是否为空」推导（对齐 `ChangeVisualState` 的 `ButtonsVisibilityStates` 八个分支）：

| 状态（`data-buttons`）              | 触发条件        | 按钮落位                                                                 |
| ----------------------------------- | --------------- | ------------------------------------------------------------------------ |
| `all`                               | 三个文案都有    | 三列各占 1/3，列间距 8 + 8（`FirstSpacer` = 8、`SecondaryColumn` = `*`） |
| `primary-secondary`                 | 主 + 次         | 主按钮第 1 列、次按钮第 5 列，各占半宽                                   |
| `primary-close` / `secondary-close` | 主+关 / 次+关   | 前一个按钮第 1 列、关闭按钮第 5 列                                       |
| `primary` / `secondary`             | 只有主 / 只有次 | 该按钮移到第 5 列（右半宽）                                              |
| `close`                             | 只有关闭按钮    | 关闭按钮第 5 列                                                          |
| `none`                              | 全空            | 命令区整体折叠（`CommandSpace.Visibility = Collapsed`）                  |

::demo-block{title="八种组合逐一切换"}
#preview
:ContentDialogButtonsDemo
#code

```vue
<FluereContentDialog
  v-model:open="open"
  title="命令区按钮组合"
  :primary-button-text="active.primary"
  :secondary-button-text="active.secondary"
  :close-button-text="active.close"
/>
```

::

## 默认按钮与 Enter

`default-button` 决定哪个按钮拿到强调样式（对应 `DefaultButton` + `AccentButtonStyle`）。焦点规则与 WinUI 逐字一致：**焦点不在命令区**（或正好落在该按钮上）时保留强调态；焦点移到命令区里的**其它**按钮时，强调态消失（`NoDefaultButton` 分支）。按下 Enter 时激活的是 `default-button` 指向的按钮，而不是当前强调的那个。

::demo-block{title="DefaultButton 四档 + Enter 行为"}
#preview
:ContentDialogDefaultButtonDemo
#code

```vue
<FluereContentDialog
  v-model:open="open"
  title="默认按钮与 Enter"
  primary-button-text="确定"
  secondary-button-text="取消"
  close-button-text="关闭"
  default-button="primary"
/>
```

::

## 取消关闭（Closing 的 Cancel）

`closing` 的 `args.cancel = true` 会取消本次关闭，弹窗留在原地且不播放退出动画；三个按钮的点击事件（`primaryButtonClick` / `secondaryButtonClick` / `closeButtonClick`）同样可以 `args.cancel` 阻止后续关闭。

::demo-block{title="先确认再关闭（closing.cancel）"}
#preview
:ContentDialogCancelDemo
#code

```vue
<script setup lang="ts">
const onClosing = (args) => {
  if (needConfirm.value) {
    args.cancel = true // 第一次拦下
    needConfirm.value = false
  }
}
</script>

<template>
  <FluereContentDialog
    v-model:open="open"
    title="放弃未保存的更改？"
    @closing="onClosing"
  />
</template>
```

::

## 全尺寸与长内容

`full-size-desired` 对应 `FullSizeDesired` → `FullDialogSizing`（只把表面的纵向对齐改为 Stretch，横向仍居中）；内容超出高度时由内容区内部滚动，命令区固定在底部。WinUI 的 `ContentScrollViewer` 把 `VerticalScrollBarVisibility` 设为 Disabled，因此**滚动条不可见**但内容仍可滚动。

::demo-block{title="FullSizeDesired：纵向撑满（上限 756）"}
#preview
:ContentDialogFullSizeDemo
#code

```vue
<FluereContentDialog v-model:open="open" title="全尺寸弹窗" full-size-desired />
```

::

::demo-block{title="长内容 + 无按钮：内容区滚动，Esc 关闭"}
#preview
:ContentDialogLongContentDemo
#code

```vue
<!-- 三个按钮文案都不给 ⇒ data-buttons="none"，命令区折叠 -->
<FluereContentDialog v-model:open="open" title="服务条款摘要（无按钮）">
  <p v-for="index in paragraphs" :key="index">第 {{ index }} 段…</p>
</FluereContentDialog>
```

::

## API

| 属性（Props）              | 类型                                            | 默认     | 说明                                                      |
| -------------------------- | ----------------------------------------------- | -------- | --------------------------------------------------------- |
| `open`                     | `boolean`                                       | `false`  | 是否显示（`v-model:open`）；对齐 `ShowAsync()` / `Hide()` |
| `title`                    | `string`                                        | `''`     | 标题，20px / SemiBold，最多 2 行；对齐 `Title`            |
| `primaryButtonText`        | `string`                                        | `''`     | 主按钮文案；空则不渲染；对齐 `PrimaryButtonText`          |
| `secondaryButtonText`      | `string`                                        | `''`     | 次按钮文案；空则不渲染；对齐 `SecondaryButtonText`        |
| `closeButtonText`          | `string`                                        | `''`     | 关闭按钮文案；空则不渲染；对齐 `CloseButtonText`          |
| `isPrimaryButtonEnabled`   | `boolean`                                       | `true`   | 主按钮是否可用；对齐 `IsPrimaryButtonEnabled`             |
| `isSecondaryButtonEnabled` | `boolean`                                       | `true`   | 次按钮是否可用；对齐 `IsSecondaryButtonEnabled`           |
| `defaultButton`            | `'none' \| 'primary' \| 'secondary' \| 'close'` | `'none'` | 默认按钮（强调样式 + Enter 目标）；对齐 `DefaultButton`   |
| `fullSizeDesired`          | `boolean`                                       | `false`  | 纵向撑满（上限 756）；对齐 `FullSizeDesired`              |
| `ariaLabel`                | `string`                                        | `—`      | 无标题时的可访问名；对齐 `AutomationProperties.Name`      |
| `to`                       | `string \| HTMLElement`                         | `'body'` | 门户目标（Web 侧替代 `XamlRoot`）                         |

| 事件（Emits）          | 载荷                 | 说明                                                                   |
| ---------------------- | -------------------- | ---------------------------------------------------------------------- |
| `update:open`          | `boolean`            | `v-model:open` 的更新                                                  |
| `opened`               | —                    | 弹窗已打开；对齐 `Opened`                                              |
| `primaryButtonClick`   | `{ cancel }`         | 主按钮被点击；`cancel = true` 阻止后续关闭                             |
| `secondaryButtonClick` | `{ cancel }`         | 次按钮被点击；同上                                                     |
| `closeButtonClick`     | `{ cancel }`         | 关闭按钮被点击；同上                                                   |
| `closing`              | `{ result, cancel }` | 请求关闭；`cancel = true` 取消关闭；对齐 `Closing`                     |
| `closed`               | `{ result }`         | 已关闭，`result` ∈ `'primary' \| 'secondary' \| 'none'`；对齐 `Closed` |

| 插槽（Slots） | 说明                                               |
| ------------- | -------------------------------------------------- |
| `title`       | 对应 `Title` / `TitleTemplate`；提供后取代 `title` |
| `default`     | 对应 `Content` / `ContentTemplate`                 |

> **无障碍**：内容层渲染 `role="dialog"` + `aria-modal="true"`（对齐 WinUI 弹窗的 `IsDialog` + 模态语义），可访问名取标题（无标题时可用 `ariaLabel`）；初始焦点按 WinUI 的三级优先设置（内容区第一个可聚焦元素 → 默认按钮 → 命令区第一个可聚焦按钮）；`Tab` 在弹窗内循环，关闭后焦点回到弹出前聚焦的元素；遮罩层对 AT 隐藏。
>
> **共享弹层原语**：遮罩层由 `FluereSmokeLayer` 提供（独立 Teleport + reka `Presence`，83ms linear 淡入淡出、锁定 body 滚动、`aria-hidden`），状态机由 `@fluere-vue/hooks` 的 `useDisclosure` 提供（`isOpen` / `isClosing` / `requestClose` / `finishClose` / `cancelClose`，SSR 安全且尊重 `prefers-reduced-motion`）。后续 Tooltip / Flyout 类组件复用同一组原语。
>
> **实现要点**
>
> - **动效不是一条动画**：reka 的 `Presence` 以节点上第一次 `animationend` 决定卸载时机，而 WinUI 的缩放（250 / 167ms）与淡入淡出（83ms）时长不同。因此本组件把**缩放放在内容层根节点**（最长的一条，负责门控卸载，退出动画不会被截断），**透明度放在内层表面**（83ms 结束即保持 0，剩余时间里的缩放不可见），遮罩层另在独立 Teleport 层上跑自己的 83ms —— 与 WinUI「两个 Popup、同一 Storyboard 多目标」的结构同构。
> - **动效逐帧对齐源码**：`ContentDialogOpenCloseThemeTransition::CreateStoryboardImpl`（`LayoutTransition_partial.cpp`）里 Load 分支注册 `ScaleX/Y` 1.05 → 1.0（250ms，`TimingFunctionDescription{cp3.X=0}` = cubic-bezier(0,0,0,1)）与 `Opacity` 0 → 1（83ms，linear），Unload 分支对称（167ms / 83ms）；`s_OpenScaleDuration=250` / `s_CloseScaleDuration=167` / `s_OpacityChangeDuration=83` 与 `Common_themeresources_any.xaml` 的 `ControlNormalAnimationDuration` / `ControlFastAnimationDuration` / `ControlFasterAnimationDuration` 一一对应。250ms 与缓动都命中 token（`--durationGentle` / `--curveDecelerateMid`），167ms / 83ms 无同值 token，落成组件局部变量并注明来源。
> - **遮罩层与弹窗同层**：两者 `z-index` 都是 1000，靠 Teleport 挂载顺序（遮罩先、弹窗后）决定绘制次序 —— 这是为了让弹窗内部再 Teleport 的浮层（如 Combobox 下拉，同为 1000）仍能盖在弹窗之上。
> - **点击遮罩不关闭**：WinUI 的 ContentDialog 没有任何 light-dismiss 路径，本组件同样把 `pointer-down-outside` / `interact-outside` / `focus-outside` 一律 `preventDefault()`，只有 `Esc` 与三个按钮能关闭。
> - **`Esc` 与关闭按钮**：对齐 `ExecuteCloseAction()` —— 存在可点的关闭按钮时，「程序化点击」它（先走 `closeButtonClick`），否则直接以 `none` 关闭。
> - **配色映射**（WinUI 资源 → token）：`ContentDialogBackground` ← `SolidBackgroundFillColorBase` → `colorNeutralBackground2`（ΔE 2.3 / 0.6）；`ContentDialogTopOverlay` ← `LayerFillColorAlt` 叠底后的结果 → `colorNeutralBackground1`（ΔE 0 / 1.4）；`ContentDialogBorderBrush` ← `SurfaceStrokeColorDefault`（合成后 `#C1C1C1` / `#424242`）→ `colorNeutralStroke2`（ΔE 31 / 16）；`ContentDialogSeparatorBorderBrush` ← `CardStrokeColorDefault` → `colorNeutralStrokeAlpha`；`ContentDialogSmokeFill` ← `SmokeFillColorDefault`（30% 黑）→ `colorBackgroundOverlay`（40% / 50%）。Fluent 2 Web 的 token 表没有同值档，需要严格对齐实机时覆盖局部变量：
>
>   ```css
>   .my-dialog .fui-content-dialog__surface {
>     --fui-content-dialog-surface: #f3f3f3; /* SolidBackgroundFillColorBase */
>     --fui-content-dialog-border: #c1c1c1; /* SurfaceStrokeColorDefault 合成值 */
>   }
>   ```
>
> - **阴影是 B 级近似**：`PrepareContent` 用 `ApplyElevationEffect(depth 0, baseElevation 128)` 投阴影，源码只给 elevation 值、没有 px 可换算，这里按浮层语义位取 Fluent 2 最大档 `--shadow64`。
> - **`prefers-reduced-motion`**：关闭缩放与淡入淡出（`animation: none`），静态形态就是最终态（`scale 1` / `opacity 1`），关闭变为立即卸载。
> - **窄视口**：WinUI 的 `MinWidth 320` 等绝对尺寸在 Web 上用 `min(..., 100%)` 与视口对齐（WinUI 假定桌面窗口足够宽），属响应式补充。
> - **与 WinUI 的差异**：`ButtonClick` / `Closing` 的取消是**同步标志**（不做异步 Deferral）；`Enter` 在 button / a / input / textarea / select / summary / contenteditable / `role=button` 上不接管（WinUI 靠路由事件的 `Handled` 达到同一效果）；焦点还原发生在退出动画结束（WinUI 在关闭流程开始时就还焦点）；不暴露 `PrimaryButtonCommand` 等 Command 属性与三个 `*ButtonStyle`（由点击事件 / 固定样式承担）；不做「同一父节点只允许一个 Popup 弹窗」的强约束；高对比度主题未实现（属已知缺口）。
