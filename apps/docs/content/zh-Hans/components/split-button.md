---
title: Split Button 拆分按钮
description: 主区执行默认动作、箭头区展开菜单的拆分按钮；视觉与键位对齐 WinUI SplitButton / ToggleSplitButton。
nav:
  title: Split Button 拆分按钮
---

# Split Button 拆分按钮

`FluereSplitButton` / `FluereToggleSplitButton` 对位 WinUI 3 的 **`Microsoft.UI.Xaml.Controls.SplitButton`** 与 **`ToggleSplitButton`**：一个控件内有两个各自可达的命中区——主区执行默认动作，箭头区展开菜单；勾选变体的主区点击会在执行动作前先切换勾选状态。两者共用同一份模板、状态表与动效（内部基座 `split-button-base.vue`），箭头区的菜单由 0.6.1 的 `FluereMenuFlyout` 承载。

```vue
<FluereSplitButton label="新建" @click="createDocument" @select="onCommand">
  新建
  <template #flyout>
    <FluereMenuFlyoutItem text="文件夹" value="folder" />
    <FluereMenuFlyoutItem text="文本文档" value="document" />
  </template>
</FluereSplitButton>
```

## 基础用法

主区点击抛 `click`，箭头区点击开合菜单。`#flyout` 是**菜单内容**插槽：直接放 `FluereMenuFlyoutItem` / `FluereMenuFlyoutSubItem` / `FluereMenuFlyoutSeparator` / `FluereMenuFlyoutToggleItem`，菜单语义（`role=menu` / `menuitem*`）、方向键导航、子菜单、选中后关闭与层级都由菜单族负责；条目激活冒泡为 SplitButton 的 `select`（载荷 `{ value, text, checked? }`，与 `FluereMenuFlyout` 一致）。

::demo-block{title="新建 ▾：默认动作 + 更多选项"}
#preview
:SplitButtonBasicDemo
#code

```vue
<FluereSplitButton label="新建" @click="createDocument" @select="onCommand">
  新建
  <template #flyout>
    <FluereMenuFlyoutItem text="文件夹" value="folder" />
    <FluereMenuFlyoutItem text="文本文档" value="document" />
    <FluereMenuFlyoutItem text="压缩文件" value="archive" />
  </template>
</FluereSplitButton>
```

::

> 菜单面板自带「选中后关闭」（`FluereMenuFlyout` 的 `closeOnSelect` 缺省 `true`），因此 `#flyout` 里的条目**不需要**自己调用 `close()`。插槽仍提供 `close(reason?)`（等价 XAML 的 `Flyout.Hide()`），供自定义内容主动收起。

## 勾选变体与禁用

`FluereToggleSplitButton` 对应 WinUI `ToggleSplitButton`：主区点击依次抛 `update:checked` → `isCheckedChanged` → `click`（对齐 `ToggleSplitButton.cpp#OnClickPrimary` 的「先 Toggle 再 Click」）；箭头区点击**不**改勾选状态。`checked` 为受控 Prop（与 `FluereToggleButton` 同口径）。

::demo-block{title="禁用态与勾选变体"}
#preview
:SplitButtonStatesDemo
#code

```vue
<FluereSplitButton disabled label="新建">新建</FluereSplitButton>
<FluereToggleSplitButton v-model:checked="pinned">固定到快速访问</FluereToggleSplitButton>
```

::

## 键盘与无障碍

| 操作                        | 行为                                                                               |
| --------------------------- | ---------------------------------------------------------------------------------- |
| `Tab`                       | 主区 → 箭头区（两个独立按钮；本库按 WAI-ARIA APG 拆开，见「与 WinUI 的有意差异」） |
| `Enter` / `Space`（主区）   | 执行默认动作（抛 `click`）                                                         |
| `Enter` / `Space`（箭头区） | 展开 / 收起菜单                                                                    |
| `Alt+↓` / `F4`              | 展开菜单并把焦点交给首个条目（对齐 WinUI `OnSplitButtonKeyUp`）                    |
| `↓`（箭头区）               | 展开菜单（APG split button 的可发现性补充）                                        |
| `↑` / `↓`（菜单内）         | 在条目间移动焦点（循环，跳过 disabled；由 `FluereMenuFlyout` 负责）                |
| `Home` / `End`（菜单内）    | 跳到首 / 末个可聚焦条目                                                            |
| `Enter` / `Space`（菜单内） | 激活当前条目，抛出 `select` 后关闭菜单                                             |
| `→` / `←`（子菜单）         | 展开 / 只关闭当前一层子菜单                                                        |
| `Tab`（菜单内）             | 被吞掉，不移动焦点（对齐 WinUI `MenuFlyoutKeyPressProcess.h`）                     |
| `Esc`                       | 关闭当前层菜单；根菜单关闭后焦点归还到打开它的元素                                 |
| 外部点击                    | 关闭菜单（light dismiss）                                                          |
| `Space` / `Enter` 按住不放  | 整控件进入按下态（对齐 WinUI `m_isKeyDown` → `TouchPressed`）                      |

- 主区可访问名：`label`（纯图标主区必须传），否则取默认插槽文本；
- 箭头区可访问名：`secondaryLabel`，缺省取 locale 切片里的「更多选项 / More Options」（逐字取自上游 `SplitButtonSecondaryButtonName`），同时用作菜单面板的 `aria-label`；
- 箭头区输出 `aria-haspopup="menu"`（缺省；`hasPopup` 可覆盖）与 `aria-expanded`。**不输出 `aria-controls`**：菜单面板由 `FluereMenuFlyout`（reka）内部渲染、没有稳定 id，WAI-ARIA APG 的 split button / menu button 模式也只要求 `aria-haspopup` + `aria-expanded`；
- 未传 `#flyout` 时箭头区点击与 `Alt+↓` / `F4` 都是 **no-op**（对齐 WinUI `SplitButton.cpp#OpenFlyout` 的 `GetFlyout() == null` 早退分支）；
- 菜单打开时点击主区只走 light dismiss 关闭菜单，**不**抛 `click`（等价 Popup light dismiss）；
- 高对比度（HC）主题未实现（A 级走 `SystemColor*`）。

## 规格来源

| 项         | 值                                                                                                                                                                                                                                                                                                        |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 控件       | WinUI 3 `SplitButton` / `ToggleSplitButton`（`ContentControl` 派生）                                                                                                                                                                                                                                      |
| tag/commit | `winui3/release/2.5.1` / `ba3a8d5`（本地快照 `temp/winui-src`）                                                                                                                                                                                                                                           |
| 关键文件   | `src/controls/dev/SplitButton/{SplitButton.xaml,SplitButton_themeresources.xaml,SplitButton.idl,SplitButton.cpp,ToggleSplitButton.cpp,SplitButtonAutomationPeer.cpp}` + `Strings/{en-us,zh-CN}/Resources.resw` + `src/controls/dev/AnimatedIcon/AnimatedVisuals/AnimatedChevronDownSmallVisualSource.cpp` |
| 菜单规格   | 本库 `FluereMenuFlyout`（0.6.1）：`CommonStyles/MenuFlyout_themeresources.xaml`、`dxaml/lib/MenuFlyout*_Partial.cpp`、`FlyoutBase_partial.cpp`（`FlyoutMargin = 4`），详见 [Menu Flyout 菜单浮层](./menu-flyout)                                                                                          |

## 实现要点

- **模板结构逐层照抄**：`RootGrid` 三列（主区 `*` MinWidth 35 / 分隔线 1 / 箭头区 35），主区 `Padding=11,6,11,7`、箭头区 `Padding=0,0,12,0` + 12×12 雪佛龙，两半各自的 1px 描边覆盖层（`1,1,0,1` + `4,0,0,4` / `0,1,1,1` + `0,4,4,0`）。控件高度由内容决定（6 + 20 行高 + 7 = 33px），与 A 级模板一致（模板没有 `MinHeight`）。
- **状态表按 `UpdateVisualStates` 的判定顺序**：`Disabled`（最高）> `FlyoutOpen` / `CheckedFlyoutOpen` > `Checked*` > 指针 / 键盘按下。`ControlFillColor*` / `TextFillColor*` / `ControlStrokeColorDefault` 等画刷映射见组件文件头的完整表；无同值 token 的 `TextOnAccentFillColorSecondary`、`ControlStrokeColorOnAccentTertiary` 落组件局部变量（`--fui-split-button-checked-pressed-foreground` / `-checked-divider`，可一行覆写）。
- **箭头动效逐帧复刻**：`AnimatedChevronDownSmallVisualSource` 的 483.3ms 时间线里，`NormalToPressed`（150.8ms，下移 1.875px）与 `PressedToNormal`（316.7ms，先到 −0.75px 再回 0，两段缓动）用两段 CSS keyframes 实现；`prefers-reduced-motion` 下关闭动画并保留静态雪佛龙。
- **菜单宿主 = 内建 `FluereMenuFlyout`（锚点模式）**：以控件根节点为锚点（等价 WinUI `FlyoutBase.ShowAt(*this)`）；`placement` 固定 `bottom-edge-aligned-left`（`SplitButton.cpp#OpenFlyout` 的 `FlyoutPlacementMode::BottomEdgeAlignedLeft`）；与锚点的间距取 A 级 `FlyoutBase::FlyoutMargin = 4`。面板几何 / 画刷 / 开合动效（250ms / 200ms）/ 层级（`--zIndexMenu`）全部由菜单族 presenter 负责，本组件**不再**复制一份 `FlyoutPresenter` 样式（0.6.4 首版的临时非 scoped 面板样式已删除）。
- **关闭路径与焦点**：Esc / 外部 pointerdown / 条目选中 / 箭头区再次点击由菜单族处理。键盘关闭路径（Esc、Enter 选中条目）关闭后焦点回到打开它的元素（通常就是箭头区）；**指针 light dismiss** 是 reka modal 菜单的语义——打开时 `body { pointer-events: none }`，主区 / 箭头区 / 外部点击的命中目标退化为 `<html>`，按钮收不到 pointerdown / click，因此只关闭菜单、焦点落到 `body`（见下方实测与「与 WinUI 的有意差异」第 6 条）。
- **受控语义**：`open`（`v-model:open`，透传给菜单族的受控状态）与勾选变体的 `checked`（`v-model:checked`）都支持受控 / 非受控；`open === undefined` 时自管，传值时只认 Prop。

### 真实浏览器实测（2026-10-20，接入 MenuFlyout 后重测）

方法：Chromium 1440×1000 打开本页，脚本 `temp/pw-split-button-menu.mjs` 读 `getComputedStyle` / `getBoundingClientRect`，覆盖控件状态、菜单几何 / 计算样式 / 层级、键盘全路径、三种指针关闭路径与明暗两套，**94/94 断言通过**（过程截图在 `temp/split-button-verify/`，temp/ 不提交）。预期值同时固化在组件注释与契约测试里。

| 项       | 实测值                                                                                                                                                   |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 控件几何 | 高 33（6 + 20 行高 + 7）、箭头区 35、分隔线 1、雪佛龙 12×12、圆角 4                                                                                      |
| rest     | 背景 `#ffffff`、前景 `#242424`、箭头前景 `#424242`、描边 `#d1d1d1`（1px，不占内容盒）                                                                    |
| hover    | 两半背景 `#f5f5f5`；箭头前景切到 `#242424`                                                                                                               |
| pressed  | 两半背景 `#e0e0e0`、前景 `#424242`；打开态箭头前景 `#616161`                                                                                             |
| 菜单几何 | 左对齐控件左边（Δ 0.00px）；与控件底边间距 4.00px；presenter padding 2px 0、圆角 8、描边 1px                                                             |
| 菜单外观 | presenter 背景明 `#f9f9f9` / 暗 `#2c2c2c`（Acrylic FallbackColor 近似）；描边明 `rgba(0,0,0,0.06)` / 暗 `rgba(0,0,0,0.2)`；阴影非 none                   |
| 菜单层级 | computed `z-index` = 1100（与 `:root --zIndexMenu` 一致），Teleport 到 `body`，`role=menu` + 箭头区可访问名                                              |
| 条目     | padding 8 / 11 / 9 / 11、margin 2 / 4、圆角 4、字号 14 / 行高 20；hover 背景明 `#f5f5f5` / 暗 `#383838`                                                  |
| 键盘     | `Esc` 关闭并把焦点还给箭头区；`F4` / `Alt+↓` 打开并聚焦首项；`↑↓` / `Home` / `End` 正常；`Tab` 不动；`Enter` 选中并关闭                                  |
| 指针     | 打开态点击主区 / 箭头区 / 外部均为 light dismiss（按钮 click 不触发，`activeElement = body`）；打开态再点箭头区 1 次即关闭；关闭态点主区正常触发默认动作 |

### 与 WinUI 的有意差异

1. **焦点 / Tab 序**：WinUI 整个控件只有一个 Tab stop（内层按钮 `IsTabStop=False`），箭头区只能指针或 `Alt+↓` / `F4` 到达；本库按 APG 把主区与箭头区做成两个各自可 Tab 的 `<button>`（todo 0.6.4 验收要求「各自可达」），并保留 WinUI 的全部快捷键。每个按钮各套 0.4.3 的共享双层焦点矩形（`FocusVisualMargin = -3` 口径；WinUI 的 `-1` 在双按钮结构下不再适用，0.9.3 统一）。
2. **菜单内容范围**：WinUI 的 `Flyout` 可放任意 `FlyoutBase`；本库 `#flyout` 固定走 `FluereMenuFlyout`（`role=menu`），语义与键盘按菜单处理。需要对话框形态请改用 `FluereContentDialog`。
3. **触屏按下态**：A 级 `TouchPressed` 在触屏按下时让两半同时 pressed；浏览器指针模型下由各半 `:active` 提供单区反馈，跨半同时按下态未单独实现。
4. **勾选 + 禁用**：A 级 `Disabled` 分支优先于 `Checked*`，因此「已勾选且禁用」呈现中性禁用填充（而非强调禁用色）；本库照此实现。
5. **菜单键盘能力的来源**：`↑↓` 循环 / `Tab` 吞掉 / `Enter`·`Space` 激活 / 子菜单 `→`·`←`·`Esc` 逐条对齐 A 级；`Home` / `End` 是 0.6.1 按 WAI-ARIA 补齐的（WinUI 公开 keypress 处理无此键，负面证据）；reka 底座另带按字符 typeahead，WinUI 无此前缀匹配（记录在 `FluereMenuFlyout` 文档页差异表）。
6. **light dismiss 的焦点落点**：菜单是 reka modal 菜单（打开时 `body { pointer-events: none }`），指针点击主区 / 箭头区 / 外部只关闭菜单，不把焦点交给被点元素（实测 `activeElement = body`）。WinUI 的 Flyout light dismiss 同样不激活底层控件，但焦点落点没有 A 级证据；这里按「不抢焦点」记录为有意差异。

### 已知缺口

- 高对比度（HC）主题未实现（A 级走 `SystemColor*`）；
- 菜单材质为 Acrylic FallbackColor 纯色近似，真实 Acrylic 合成与噪点归 0.9.2（见 `FluereMenuFlyout`）；
- `SplitMenuFlyoutItem` / `RadioMenuFlyoutItem` 不在 0.6.1 菜单族范围（WinUI 里 `SplitButton` 的菜单形态可用普通 `MenuFlyoutItem` 组合）；
- AppBar / CommandBar 风格（`SplitButtonCommandBarStyle` 与命令栏指针态资源）归 0.8.3 `CommandBar`，本组件只实现默认外观。

## API

### `FluereSplitButton`

| 属性（Props）    | 类型                                                  | 默认       | 对应 / 说明                                                         |
| ---------------- | ----------------------------------------------------- | ---------- | ------------------------------------------------------------------- |
| `disabled`       | `boolean`                                             | `false`    | `IsEnabled`                                                         |
| `label`          | `string`                                              | —          | 主区可访问名（`AutomationProperties.Name`）                         |
| `secondaryLabel` | `string`                                              | —          | 箭头区 / 菜单面板可访问名；缺省取 locale「更多选项 / More Options」 |
| `open`           | `boolean`                                             | —          | 菜单展开（受控，`v-model:open`）；不传时自管                        |
| `hasPopup`       | `'menu' \| 'listbox' \| 'tree' \| 'grid' \| 'dialog'` | `'menu'`   | 箭头区 `aria-haspopup`；`#flyout` 放非菜单内容时才需覆盖            |
| `type`           | `'button' \| 'submit' \| 'reset'`                     | `'button'` | 主区原生 button 类型（箭头区恒为 `button`）                         |
| `locale`         | `string`                                              | —          | 内建文案 locale，优先于 `FluereConfigProvider`                      |

| 事件（Emits） | 载荷                               | 对应 / 说明                                                               |
| ------------- | ---------------------------------- | ------------------------------------------------------------------------- |
| `click`       | `MouseEvent`                       | 主区点击（WinUI `Click`）；菜单打开时只关菜单                             |
| `update:open` | `boolean`                          | 菜单开关回写（`v-model:open`）                                            |
| `opened`      | —                                  | 菜单已打开（`Flyout.Opened`）                                             |
| `closed`      | —                                  | 菜单已关闭（`Flyout.Closed`）                                             |
| `select`      | `FluereSplitButtonSelectEventArgs` | 菜单条目激活（`{ value?, text?, checked? }`，与 `FluereMenuFlyout` 同构） |

| 插槽（Slots） | 说明                                                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `default`     | 主区内容                                                                                                                             |
| `flyout`      | 菜单内容：放 `FluereMenuFlyoutItem` / `…SubItem` / `…Separator` / `…ToggleItem`；插槽 prop：`close(reason?)`（等价 `Flyout.Hide()`） |

### `FluereToggleSplitButton`

在 `FluereSplitButton` 的全部 Props / Slots / 事件之上：

| 属性（Props） | 类型      | 默认    | 对应 / 说明                            |
| ------------- | --------- | ------- | -------------------------------------- |
| `checked`     | `boolean` | `false` | `IsChecked`（受控，`v-model:checked`） |

事件额外包含：

| 事件（Emits）      | 载荷      | 对应 / 说明                       |
| ------------------ | --------- | --------------------------------- |
| `update:checked`   | `boolean` | 勾选状态回写（`v-model:checked`） |
| `isCheckedChanged` | `boolean` | `IsCheckedChanged`，载荷为新值    |

`ToggleSplitButton` 的主区点击事件顺序：`update:checked` → `isCheckedChanged` → `click`。
