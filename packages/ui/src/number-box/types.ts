/**
 * FluereNumberBox 公共类型契约
 *
 * 设计规范来源：WinUI 3 / Windows App SDK — NumberBox
 * （src/controls/dev/NumberBox/NumberBox.idl 提供 API 面，
 *   NumberBox.cpp 提供取值 / 校验 / 步进口径，
 *   NumberBox.xaml + NumberBox_themeresources.xaml 提供模板几何与配色）
 *
 * 与 WinUI 的对应关系（逐项对齐）：
 *   Value           → `modelValue`（`v-model`，缺省值用 `null` 表达 WinUI 的 `NaN`）
 *   Minimum/Maximum → `min` / `max`
 *   SmallChange     → `step`
 *   LargeChange     → `largeStep`
 *   Header          → `header` / `#header`
 *   PlaceholderText → `placeholder`
 *   Description     → `description` / `#description`
 *   AcceptsExpression / IsWrapEnabled / ValidationMode / SpinButtonPlacementMode
 *                   → `acceptsExpression` / `wrapEnabled` / `validationMode` / `spinButtonPlacementMode`
 *   NumberFormatter → `formatOptions`（`Intl.NumberFormatOptions`，`locale` 单独给）
 *   ValueChanged    → `valueChanged`（`{ oldValue, newValue }`）
 *
 * 类型与 Props 说明集中在这一层：number-box.vue 只做组合，
 * 逻辑层（constants / format / parse / expression / step / use-*）反向依赖本文件，
 * 避免逻辑模块从 .vue 反向导入类型。
 */

/**
 * 增减按钮呈现方式（对应 WinUI `NumberBoxSpinButtonPlacementMode`）
 * - hidden   不显示（WinUI 默认）
 * - compact  输入框右侧显示指示器，聚焦时浮出上 / 下两个按钮
 * - inline   输入框右侧内联上 / 下两个按钮
 */
export type FluereNumberBoxSpinButtonPlacementMode = 'hidden' | 'compact' | 'inline'

/**
 * 校验模式（对应 WinUI `NumberBoxValidationMode`）
 * - invalidInputOverwritten 失焦 / 回车时用当前值的格式化文本覆盖非法输入，并把越界值钳制回区间
 * - disabled                保留用户输入与越界值，交给消费方自行校验
 */
export type FluereNumberBoxValidationMode = 'invalidInputOverwritten' | 'disabled'

/** `valueChanged` 事件载荷（对应 WinUI `NumberBoxValueChangedEventArgs`） */
export interface FluereNumberBoxValueChangedEventArgs {
  /** 变更前的值（无值时为 `null`，对应 WinUI 的 `NaN`） */
  oldValue: number | null
  /** 变更后的值（无值时为 `null`） */
  newValue: number | null
}

export interface FluereNumberBoxProps {
  /**
   * 当前值（`v-model`）。`null` / `NaN` 表示「无值」（对应 WinUI 的 `NaN`，输入框显示占位符）；
   * 缺省（`undefined`）时走非受控模式（见 defaultValue）。
   */
  modelValue?: number | null

  /**
   * 非受控初始值（缺省为无值）
   */
  defaultValue?: number | null

  /**
   * 最小值（对应 WinUI `Minimum`）。缺省不下界，也不渲染 `aria-valuemin`
   */
  min?: number

  /**
   * 最大值（对应 WinUI `Maximum`）。缺省不上界，也不渲染 `aria-valuemax`
   */
  max?: number

  /**
   * 步长（对应 WinUI `SmallChange`）：方向键 / 滚轮 / 增减按钮每次的增量
   * @default 1
   */
  step?: number

  /**
   * 大步长（对应 WinUI `LargeChange`）：PageUp / PageDown 的增量
   * @default 10
   */
  largeStep?: number

  /**
   * 是否禁用
   * @default false
   */
  disabled?: boolean

  /**
   * 顶部标题（对应 WinUI `Header`）。同时作为缺省的可访问名
   */
  header?: string

  /**
   * 可访问名称（优先于 header；对应 `AutomationProperties.Name`）
   */
  label?: string

  /**
   * 控件下方的说明文本（对应 WinUI `Description`），同时作为 `aria-describedby`
   */
  description?: string

  /**
   * 占位符（对应 WinUI `PlaceholderText`）：仅在无值时显示
   */
  placeholder?: string

  /**
   * 表单提交名：位于 `<form>` 内时补隐藏原生 input，提交 `name=value`
   */
  name?: string

  /**
   * 区域设置语言标记（BCP 47），对应 WinUI 的区域设置感知 DecimalFormatter。
   *
   * 同时驱动本组件内建文案（increase / decrease 按钮可访问名）的 locale：
   * 取值归一为 `zh-Hans` / `en`（其余语言落到内置缺省 zh-Hans），
   * 见 `packages/ui/src/number-box/locale.ts`。
   *
   * SSR 应用建议显式传入：缺省时使用运行环境的默认区域设置，而服务端（Node）与浏览器
   * 的默认区域设置可能不同（如 de-DE 的小数点），首帧会出现水合不一致。
   */
  locale?: string

  /**
   * 数值格式化选项（对应 WinUI `NumberFormatter`）。同时决定解析时接受的分组分隔符与小数点
   */
  formatOptions?: Intl.NumberFormatOptions

  /**
   * 增减按钮呈现方式（对应 WinUI `SpinButtonPlacementMode`）
   * @default 'hidden'
   */
  spinButtonPlacementMode?: FluereNumberBoxSpinButtonPlacementMode

  /**
   * 校验模式（对应 WinUI `ValidationMode`）
   * @default 'invalidInputOverwritten'
   */
  validationMode?: FluereNumberBoxValidationMode

  /**
   * 到达上 / 下界后是否回绕（对应 WinUI `IsWrapEnabled`）
   * @default false
   */
  wrapEnabled?: boolean

  /**
   * 是否解析 `+ - * / ^` 与括号组成的内联表达式（对应 WinUI `AcceptsExpression`），
   * 失焦或回车时求值
   * @default false
   */
  acceptsExpression?: boolean

  /**
   * 加号按钮的可访问名（WinUI 由资源 `SR_NumberBoxUpSpinButtonName` 本地化）。
   * 显式传入压过 locale；缺省取当前 locale 的内建文案（见 ./locale.ts）。
   */
  increaseLabel?: string

  /**
   * 减号按钮的可访问名（对应 `SR_NumberBoxDownSpinButtonName`）。
   * 显式传入压过 locale；缺省取当前 locale 的内建文案（见 ./locale.ts）。
   */
  decreaseLabel?: string
}
