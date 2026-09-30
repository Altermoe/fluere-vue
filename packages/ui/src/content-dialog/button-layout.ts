/**
 * ContentDialog 命令区按钮布局的纯函数层。
 *
 * 对照来源：WinUI 3（microsoft-ui-xaml winui3/release/2.5.1）
 *   src/controls/dev/CommonStyles/ContentDialog_themeresources.xaml
 *     - 模板把命令区定义成 5 列网格：
 *       PrimaryColumn(*) / FirstSpacer(0) / SecondaryColumn(0) /
 *       SecondSpacer(ContentDialogButtonSpacing=8) / CloseColumn(*)
 *       三个按钮默认落位：Primary→列 0、Secondary→列 2、Close→列 4
 *     - `ButtonsVisibilityStates` 只改这几件事：
 *       AllVisible            : FirstSpacer=8、SecondaryColumn=*、Secondary 移到列 2
 *       NoneVisible           : CommandSpace 整体 Collapsed
 *       PrimaryVisible        : Primary 移到列 4、Secondary / Close Collapsed
 *       SecondaryVisible      : Secondary 移到列 4、Primary / Close Collapsed
 *       CloseVisible          : Primary / Secondary Collapsed（Close 本就在列 1 尾）
 *       PrimaryAndSecondaryVisible: Secondary 移到列 4、Close Collapsed
 *       PrimaryAndCloseVisible    : Secondary Collapsed
 *       SecondaryAndCloseVisible  : Primary Collapsed
 *   src/dxaml/xcp/dxaml/lib/ContentDialog_Partial.cpp#ChangeVisualState
 *     - 状态名由「三个按钮文案是否为空」七个分支 + 全空一个分支推导
 *     - 默认按钮强调态：`DefaultButton != None` 时，焦点不在命令区（或焦点正好在该按钮上）
 *       才保留强调态；焦点落在命令区其它按钮上时回到 `NoDefaultButton`（强调态消失）
 */

import type {
  FluereContentDialogButton,
  FluereContentDialogButtonKind,
  FluereContentDialogButtonVisibility,
} from './types'

/** 三个按钮位的文案（空串 = 不渲染该按钮） */
export interface ContentDialogButtonTexts {
  primary: string
  secondary: string
  close: string
}

/** 命令区可见性判定结果 */
export interface ContentDialogCommandLayout {
  /** 供 `data-buttons` 使用的状态名 */
  state: FluereContentDialogButtonVisibility
  /** 三个按钮各自是否渲染 */
  visible: Record<FluereContentDialogButtonKind, boolean>
}

/**
 * 由三个按钮文案推导命令区状态（对齐 `ChangeVisualState` 的分支顺序）。
 */
export const resolveCommandLayout = (
  texts: ContentDialogButtonTexts,
): ContentDialogCommandLayout => {
  const hasPrimary = texts.primary.length > 0
  const hasSecondary = texts.secondary.length > 0
  const hasClose = texts.close.length > 0

  let state: FluereContentDialogButtonVisibility = 'none'
  if (hasPrimary && hasSecondary && hasClose) {
    state = 'all'
  } else if (hasPrimary && hasSecondary) {
    state = 'primary-secondary'
  } else if (hasPrimary && hasClose) {
    state = 'primary-close'
  } else if (hasSecondary && hasClose) {
    state = 'secondary-close'
  } else if (hasPrimary) {
    state = 'primary'
  } else if (hasSecondary) {
    state = 'secondary'
  } else if (hasClose) {
    state = 'close'
  }

  return {
    state,
    visible: { primary: hasPrimary, secondary: hasSecondary, close: hasClose },
  }
}

/** 命令区是否整体折叠（`NoneVisible` → `CommandSpace.Visibility = Collapsed`） */
export const hasVisibleCommandButtons = (layout: ContentDialogCommandLayout): boolean =>
  layout.state !== 'none'

/** `resolveAccentButton` 的入参 */
export interface AccentButtonContext {
  /** 消费方设置的默认按钮（`DefaultButton`） */
  defaultButton: FluereContentDialogButton
  /** 当前命令区可见性 */
  layout: ContentDialogCommandLayout
  /** 焦点是否落在命令区内 */
  focusInCommandArea: boolean
  /** 命令区中被聚焦的按钮（焦点不在命令区内时为 null） */
  focusedButton: FluereContentDialogButtonKind | null
}

/**
 * 推导当前应该显示强调态的按钮（对齐 `ChangeVisualState` 的 `DefaultButtonStates`）。
 * @returns 需要强调的按钮；null 表示三个按钮都用普通样式
 */
export const resolveAccentButton = ({
  defaultButton,
  layout,
  focusInCommandArea,
  focusedButton,
}: AccentButtonContext): FluereContentDialogButtonKind | null => {
  if (defaultButton === 'none' || !layout.visible[defaultButton]) {
    return null
  }
  // 焦点在命令区内：只有焦点正好压在默认按钮上才保留强调态（WinUI 的 NoDefaultButton 分支）
  if (focusInCommandArea && focusedButton !== defaultButton) {
    return null
  }
  return defaultButton
}

/** 按钮点击对应的返回结果（对齐 `AttachButtonEvents` 传入的 ContentDialogResult） */
export const BUTTON_RESULTS: Record<
  FluereContentDialogButtonKind,
  'none' | 'primary' | 'secondary'
> = {
  primary: 'primary',
  secondary: 'secondary',
  close: 'none',
}
