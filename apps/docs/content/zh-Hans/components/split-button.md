---
title: Split Button 拆分按钮
description: 主区执行默认动作、箭头区展开浮层的拆分按钮；视觉与键位对齐 WinUI SplitButton / ToggleSplitButton。
nav:
  title: Split Button 拆分按钮
---

# Split Button 拆分按钮

`FluereSplitButton` / `FluereToggleSplitButton` 对位 WinUI 3 的 **`Microsoft.UI.Xaml.Controls.SplitButton`** 与 **`ToggleSplitButton`**：一个控件内有两个各自可达的命中区——主区执行默认动作，箭头区展开浮层；勾选变体的主区点击会在执行动作前先切换勾选状态。两者共用同一份模板、状态表与动效（内部基座 `split-button-base.vue`）。

```vue
<FluereSplitButton label="新建" @click="createDocument">
  新建
  <template #flyout="{ close }">
    <button @click="pick('folder'); close()">文件夹</button>
  </template>
</FluereSplitButton>
```

## 基础用法

主区点击抛 `click`，箭头区点击开合浮层；`#flyout` 插槽拿到 `close()` 用于选中后收起（等价 XAML 里对 `Flyout.Hide()` 的访问）。

::demo-block{title="新建 ▾：默认动作 + 更多选项"}
#preview
:SplitButtonBasicDemo
#code

```vue
<FluereSplitButton label="新建" @click="createDocument">
  新建
  <template #flyout="{ close }">
    <ul class="m-0 flex w-56 list-none flex-col gap-fluent-xs p-0">
      <li v-for="action in actions" :key="action.id">
        <button @click="pick(action.label, close)">{{ action.label }}</button>
      </li>
    </ul>
  </template>
</FluereSplitButton>
```

::

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

| 操作                        | 行为                                                                          |
| --------------------------- | ----------------------------------------------------------------------------- |
| `Tab`                       | 主区 → 箭头区（两个独立按钮；本库按 WAI-ARIA APG 拆开，见「实现要点」的差异） |
| `Enter` / `Space`（主区）   | 执行默认动作（抛 `click`）                                                    |
| `Enter` / `Space`（箭头区） | 展开 / 收起浮层                                                               |
| `Alt+↓` / `F4`              | 展开浮层（对齐 WinUI `OnSplitButtonKeyUp`）                                   |
| `↓`（箭头区）               | 展开浮层（APG split button 的可发现性补充）                                   |
| `Esc`                       | 关闭浮层，焦点归还到打开它的元素                                              |
| 外部点击 / 焦点移出         | 关闭浮层                                                                      |
| `Space` / `Enter` 按住不放  | 整控件进入按下态（对齐 WinUI `m_isKeyDown` → `TouchPressed`）                 |

- 主区可访问名：`label`（纯图标主区必须传），否则取默认插槽文本；
- 箭头区可访问名：`secondaryLabel`，缺省取 locale 切片里的「更多选项 / More Options」（逐字取自上游 `SplitButtonSecondaryButtonName`）；
- 箭头区输出 `aria-haspopup` / `aria-expanded` / `aria-controls`；浮层是 reka `PopoverContent` 的对话框语义（`role="dialog"` + 箭头区可访问名作 label）。`hasPopup` 缺省 `'dialog'`，0.6.1 `MenuFlyout` 到位后放菜单内容时传 `'menu'`；
- 浮层打开时点击主区只关闭浮层（等价 Popup light-dismiss），不再抛 `click`。

## 规格来源

| 项         | 值                                                                                                                                                                                                                                                                                                        |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 控件       | WinUI 3 `SplitButton` / `ToggleSplitButton`（`ContentControl` 派生）                                                                                                                                                                                                                                      |
| tag/commit | `winui3/release/2.5.1` / `ba3a8d5`（本地快照 `temp/winui-src`）                                                                                                                                                                                                                                           |
| 关键文件   | `src/controls/dev/SplitButton/{SplitButton.xaml,SplitButton_themeresources.xaml,SplitButton.idl,SplitButton.cpp,ToggleSplitButton.cpp,SplitButtonAutomationPeer.cpp}` + `Strings/{en-us,zh-CN}/Resources.resw` + `src/controls/dev/AnimatedIcon/AnimatedVisuals/AnimatedChevronDownSmallVisualSource.cpp` |

## 实现要点

- **模板结构逐层照抄**：`RootGrid` 三列（主区 `*` MinWidth 35 / 分隔线 1 / 箭头区 35），主区 `Padding=11,6,11,7`、箭头区 `Padding=0,0,12,0` + 12×12 雪佛龙，两半各自的 1px 描边覆盖层（`1,1,0,1` + `4,0,0,4` / `0,1,1,1` + `0,4,4,0`）。控件高度由内容决定（6 + 20 行高 + 7 = 33px），与 A 级模板一致（模板没有 `MinHeight`）。
- **状态表按 `UpdateVisualStates` 的判定顺序**：`Disabled`（最高）> `FlyoutOpen` / `CheckedFlyoutOpen` > `Checked*` > 指针 / 键盘按下。`ControlFillColor*` / `TextFillColor*` / `ControlStrokeColorDefault` 等画刷映射见组件文件头的完整表；无同值 token 的 `TextOnAccentFillColorSecondary`、`ControlStrokeColorOnAccentTertiary` 落组件局部变量（`--fui-split-button-checked-pressed-foreground` / `-checked-divider`，可一行覆写）。
- **箭头动效逐帧复刻**：`AnimatedChevronDownSmallVisualSource` 的 483.3ms 时间线里，`NormalToPressed`（150.8ms，下移 1.875px）与 `PressedToNormal`（316.7ms，先到 −0.75px 再回 0，两段缓动）用两段 CSS keyframes 实现；`prefers-reduced-motion` 下关闭动画并保留静态雪佛龙。
- **浮层（0.6.1 前的临时面板）**：定位固定为 `BottomEdgeAlignedLeft`（`side="bottom"` + `align="start"`，无偏移）；面板按 `FlyoutPresenter_themeresources.xaml` 给背景 / 描边 / 8px 圆角 / `16,15,16,17` 内边距 / 96–456 宽高边界；Acrylic 用 FallbackColor 近似（真实合成归 0.9.2），阴影取 `--shadow16`（`FlyoutBase` 的 elevation 不在公开快照内，属**证据缺口**，可覆写 `--fui-split-button-flyout-shadow`）。表格 / 菜单项的键盘导航归 0.6.1 `MenuFlyout`。
- **受控语义**：`open`（`v-model:open`）与勾选变体的 `checked`（`v-model:checked`）都支持受控 / 非受控；`open === undefined` 时自管，传值时只认 Prop。

### 真实浏览器实测（2026-10-20）

方法：Chromium 1440×1000 打开本页，脚本读 `getComputedStyle` / `getBoundingClientRect`，覆盖 rest / hover / pressed / 打开态、浮层定位与层级、键盘路径、明暗两套；**50/50 断言通过**（脚本在 `temp/`，过程截图不入库；预期值同时固化在组件注释与契约测试里）。

| 项       | 实测值                                                                                       |
| -------- | -------------------------------------------------------------------------------------------- |
| 控件几何 | 高 33（6 + 20 行高 + 7）、箭头区 35、分隔线 1、雪佛龙 12×12、圆角 4、主区 padding 11/6/7     |
| rest     | 背景 `#ffffff`、前景 `#242424`、箭头前景 `#424242`、描边 `#d1d1d1`（1px，不占内容盒）        |
| hover    | 两半背景 `#f5f5f5`；箭头前景切到 `#242424`                                                   |
| pressed  | 两半背景 `#e0e0e0`、前景 `#424242`；打开态箭头前景 `#616161`                                 |
| 浮层     | 左对齐 + 贴控件底边（offset 0）；padding 15/16/17、圆角 8、背景 `#f9f9f9`、描边 `.059` 黑    |
| 浮层层级 | `--zIndexMenu`（1100），Teleport 到 `body`，`role=dialog` + 箭头区可访问名                   |
| 键盘     | `Esc` 关闭并把焦点还给箭头区；`F4` / `Alt+↓` 打开；`Tab` 主区 → 箭头区；`Space` 按住两半按下 |

> 首轮实测抓到一个单测抓不到的 bug：`Esc` 关闭后焦点落到 `body`——reka `FocusScope` 在没有 `PopoverTrigger` 时把焦点还原到 `body`。已改为 `useFlyout(returnFocus: true)` + `close-auto-focus` 阻止默认，由原语归还焦点。

### 与 WinUI 的有意差异

1. **焦点 / Tab 序**：WinUI 整个控件只有一个 Tab stop（内层按钮 `IsTabStop=False`），箭头区只能指针或 `Alt+↓` / `F4` 到达；本库按 APG 把主区与箭头区做成两个各自可 Tab 的 `<button>`（todo 0.6.4 验收要求「各自可达」），并保留 WinUI 的全部快捷键。每个按钮各套 0.4.3 的共享双层焦点矩形（`FocusVisualMargin = -3` 口径；WinUI 的 `-1` 在双按钮结构下不再适用，0.9.3 统一）。
2. **触屏按下态**：A 级 `TouchPressed` 在触屏按下时让两半同时 pressed；浏览器指针模型下由各半 `:active` 提供单区反馈，跨半同时按下态未单独实现。
3. **勾选 + 禁用**：A 级 `Disabled` 分支优先于 `Checked*`，因此「已勾选且禁用」呈现中性禁用填充（而非强调禁用色）；本库照此实现。

### 已知缺口

- 高对比度（HC）主题未实现（A 级走 `SystemColor*`）；
- 浮层内容为通用面板，菜单项语义（`role=menuitem`）与方向键 / Home / End 导航归 0.6.1 `MenuFlyout`；
- 真实 Acrylic 合成与噪点归 0.9.2；浮层阴影档位属证据缺口（见上）；
- AppBar / CommandBar 风格（`SplitButtonCommandBarStyle` 与命令栏指针态资源）归 0.8.3 `CommandBar`，本组件只实现默认外观。

## API

### `FluereSplitButton`

| 属性（Props）    | 类型                                                  | 默认       | 对应 / 说明                                              |
| ---------------- | ----------------------------------------------------- | ---------- | -------------------------------------------------------- |
| `disabled`       | `boolean`                                             | `false`    | `IsEnabled`                                              |
| `label`          | `string`                                              | —          | 主区可访问名（`AutomationProperties.Name`）              |
| `secondaryLabel` | `string`                                              | —          | 箭头区可访问名；缺省取 locale「更多选项 / More Options」 |
| `open`           | `boolean`                                             | —          | 浮层展开（受控，`v-model:open`）；不传时自管             |
| `hasPopup`       | `'menu' \| 'listbox' \| 'tree' \| 'grid' \| 'dialog'` | `'dialog'` | 箭头区 `aria-haspopup`；菜单内容传 `'menu'`              |
| `type`           | `'button' \| 'submit' \| 'reset'`                     | `'button'` | 主区原生 button 类型（箭头区恒为 `button`）              |
| `locale`         | `string`                                              | —          | 内建文案 locale，优先于 `FluereConfigProvider`           |

| 事件（Emits） | 载荷         | 对应 / 说明                                   |
| ------------- | ------------ | --------------------------------------------- |
| `click`       | `MouseEvent` | 主区点击（WinUI `Click`）；浮层打开时只关浮层 |
| `update:open` | `boolean`    | 浮层开关回写（`v-model:open`）                |
| `opened`      | —            | 浮层已打开（`Flyout.Opened`）                 |
| `closed`      | —            | 浮层已关闭（`Flyout.Closed`）                 |

| 插槽（Slots） | 说明                                                          |
| ------------- | ------------------------------------------------------------- |
| `default`     | 主区内容                                                      |
| `flyout`      | 浮层内容；插槽 prop：`close(reason?)`（等价 `Flyout.Hide()`） |

### `FluereToggleSplitButton`

在 `FluereSplitButton` 的全部 Props / Slots 之上：

| 属性（Props） | 类型      | 默认    | 对应 / 说明                            |
| ------------- | --------- | ------- | -------------------------------------- |
| `checked`     | `boolean` | `false` | `IsChecked`（受控，`v-model:checked`） |

事件额外包含：

| 事件（Emits）      | 载荷      | 对应 / 说明                       |
| ------------------ | --------- | --------------------------------- |
| `update:checked`   | `boolean` | 勾选状态回写（`v-model:checked`） |
| `isCheckedChanged` | `boolean` | `IsCheckedChanged`，载荷为新值    |

`ToggleSplitButton` 的主区点击事件顺序：`update:checked` → `isCheckedChanged` → `click`。
