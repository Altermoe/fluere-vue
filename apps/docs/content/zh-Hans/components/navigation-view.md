---
title: Navigation View 导航视图
description: 左侧可折叠导航面板：分组标题、层级子项、选中指示条、内置设置项；DisplayMode 三档与键位逐条对齐 WinUI NavigationView。
nav:
  title: Navigation View 导航视图
---

# Navigation View 导航视图

`FluereNavigationView` + `FluereNavigationViewItem`（含 `...ItemHeader` / `...ItemSeparator`）对位 WinUI 3 / Windows App SDK 的 **`Microsoft.UI.Xaml.Controls.NavigationView`**：左侧可折叠面板 + 内容区，支持分组、多级子项、选中指示条与内置「设置」项，`DisplayMode` 状态机与键位逐条抄源码。

```vue
<FluereNavigationView v-model:selected-value="selected" label="导航" pane-title="Explorer">
  <FluereNavigationViewItemHeader content="快速访问" />
  <FluereNavigationViewItem value="home" content="主页">
    <template #icon><FluentIconStar24Regular :size="20" /></template>
  </FluereNavigationViewItem>
  <template #content>内容区</template>
</FluereNavigationView>
```

::demo-block{title="基础形态：分组 + 图标 + 选中指示条 + 设置项"}
#preview
:NavigationViewBasicDemo
#code

```vue
<FluereNavigationView v-model:selected-value="selected" label="导航" pane-title="Explorer">
  <template v-for="section in sections" :key="section.title">
    <FluereNavigationViewItemHeader :content="section.title" />
    <FluereNavigationViewItem
      v-for="item in section.items"
      :key="item.value"
      :value="item.value"
      :content="item.content"
    >
      <template #icon><component :is="item.icon" :size="20" /></template>
    </FluereNavigationViewItem>
  </template>
</FluereNavigationView>
```

::

## 版本与证据口径

| 项         | 值                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 规格源 tag | `winui3/release/2.5.1`（commit `ba3a8d5`）                                                                                                                                                                                                                                                                                                                                                                 |
| 关键文件   | `src/controls/dev/NavigationView/{NavigationView.idl,NavigationView.xaml,NavigationView_themeresources.xaml,NavigationView.cpp,NavigationViewItem.cpp,NavigationViewItemPresenter.cpp,NavigationViewItemHeader.cpp,NavigationViewItemSeparator.cpp}` + `Generated/{NavigationView,NavigationViewItem}.properties.cpp` + `SplitView/SplitView_themeresources.xaml` + `Strings/{en-us,zh-CN}/Resources.resw` |
| 内建文案   | 开关按钮 / 设置项共 4 条**逐字**取自上游 `Resources.resw`（见 `packages/ui/src/navigation-view/locale.ts` 的对照表）                                                                                                                                                                                                                                                                                       |

> **`perf2026` 不采纳**：上游存在 `NavigationBackButton_perf2026.xaml`（已挂进 `NavigationView.vcxitems`），本库沿用 0.5.1 `TitleBar` 的裁定 —— 不读、不参考、不产生对应分支。

## DisplayMode 状态机

`paneDisplayMode`（对齐 `NavigationViewPaneDisplayMode`）是**配置**，`displayMode` 是**运行时算出来的结果**，两者不要混。

| `paneDisplayMode` | 行为                                         |
| ----------------- | -------------------------------------------- |
| `auto`（缺省）    | 按容器宽度自适应（下表）                     |
| `left`            | 恒 Expanded（面板 320px）                    |
| `left-compact`    | 恒 Compact（面板 48px 图标轨道）             |
| `left-minimal`    | 同 Compact（见下「与 WinUI 的差异」第 2 条） |

`auto` 档的判据逐字照抄 `NavigationView.cpp:1452-1465`（阈值缺省来自 `NavigationView.idl:176-180`）：

| 容器宽度                 | 上游结果    | 本库结果                      |
| ------------------------ | ----------- | ----------------------------- |
| `width >= 1008`          | Expanded    | Expanded                      |
| `0 < width < 641`        | **Minimal** | **Compact**（降级，见差异表） |
| 其余（含 `width === 0`） | Compact     | Compact                       |
| `width === 641`          | Compact     | Compact（判据是严格小于）     |
| `NaN`                    | Compact     | Compact                       |

::demo-block{title="DisplayMode 三档与 Auto 自适应"}
#preview
:NavigationViewDisplayModeDemo
#code

```vue
<FluereNavigationView v-model:selected-value="selected" :pane-display-mode="mode" pane-title="Nav">
  …
</FluereNavigationView>
```

::

## 面板开合语义

`isPaneOpen` 受 DisplayMode 状态机支配（逐条对齐 `NavigationView.cpp:1494-1512`）：

- **进入 Expanded**：仅当 `isPaneVisible` 为真且**用户没有手动关过**才自动开；
- **`Expanded → Compact`**：无条件关；
- **进入 Minimal**：无条件关（本库 Minimal 降级为 Compact，因此「非 Expanded 一律关」）；
- **手动关过**是一个**全局**标志（上游 `m_wasForceClosed`，`NavigationView.h:466`）—— **不存在按模式分别记忆**；切换 `pane-display-mode` 会清掉它（`:4211`）。

开关按钮的点击逻辑所有模式共用一段（`:1662-1674`）：开 → 关并置标志；关 → 开并清标志。`isPaneToggleButtonVisible` **只控可见性**，不控可开合性（`:4403-4407`）。

面板收起时**不是归零**，而是 48px 的图标轨道（上游 `ListSizeCompact` 把 `PaneContentGrid.Width` 设为 `CompactPaneLength`，`NavigationView.xaml:83`），此时只显示图标、文本留在无障碍树里。

## 键盘（逐条对齐源码）

| 触发键         | 前置条件                 | 效果                                                                                         |
| -------------- | ------------------------ | -------------------------------------------------------------------------------------------- |
| `Enter`        | 焦点在项上               | invoke（选中 + 展开 + 抛 `itemInvoked`）                                                     |
| `Space`        | 焦点在项上且**未按 Alt** | 同上；`Alt+Space` 明确**不处理**（让出系统窗口菜单，`:2752-2761`）                           |
| `↑` / `↓`      | 焦点在项上               | 在**可见项**之间移动焦点；跨层（进 / 出展开的子项、回到父项）与源码的 XYFocus + 手动聚焦等价 |
| `Home` / `End` | 焦点在项上               | 焦点到列表首 / 末可聚焦项（`:2906-2950`）                                                    |
| `←` + `Alt`    | 面板开着且可轻触关闭     | 关面板（`:3136-3145`）                                                                       |
| `Tab`          | —                        | 移出面板（roving tabindex：一组里只有一个 Tab 停靠点）                                       |

**源码里没有的键**（负面证据，不要按直觉补）：`→`（`NavigationView` 对 `VirtualKey::Right` 零命中）、`Esc`（关 Minimal 面板是 core `SplitView.cpp:576-581` 的职责，不在 NavigationView 里）、`Ctrl+数字`。

> 按住不放不会连发 invoke：上游用 `args.KeyStatus().WasKeyDown` 挡（`:2724`），本库对应 `event.repeat`。

## 选择与展开语义

- **点击有子项的项「既选中也切换展开」**（`OnNavigationViewItemInvoked:1067` 两件事都做，不是二选一）。
- **`selects-on-invoked="false"`**：invoke 只展开、不改选中（`:1048`），适合当分组标题用；反过来用 `selectedValue` 强行选中它会被回滚（`:2281-2292`），本库对此回退为「无选中」并给开发期警告。
- **`isChildSelected`**：选中子项时，其**整条祖先链**都会拿到该状态（`UpdateIsChildSelected:2509-2547`）；本库由父组件在渲染期推导（只读），无需消费方传。
- **选中指示条下钻**：从选中项往下走，只要「自身未选中但后代被选中」且父项已展开，就画在**最低可见层**（`FindLowestLevelContainerToDisplaySelectionIndicator:5562-5593`）。
- **面板关闭时顶层项强制折叠但记住状态**（`HandleExpansionStateMemory`，`NavigationViewItem.cpp:269-285`）：重新展开面板会自动恢复。**只对顶层项生效**。

::demo-block{title="分组、层级与祖先链选中"}
#preview
:NavigationViewHierarchyDemo
#code

```vue
<FluereNavigationViewItem value="music" content="音乐">
  <template #children>
    <FluereNavigationViewItem value="albums" content="专辑" />
    <FluereNavigationViewItem value="artists" content="艺术家" />
  </template>
</FluereNavigationViewItem>
```

::

## 设置项与插槽

| 插槽          | 对应 WinUI                          | 说明                                       |
| ------------- | ----------------------------------- | ------------------------------------------ |
| 默认插槽      | `MenuItems`                         | 放 `Item` / `ItemHeader` / `ItemSeparator` |
| `#content`    | `ContentPresenter`                  | 窗口内容区                                 |
| `#paneHeader` | `PaneHeader`                        | 开关按钮下方（仅展开档显示）               |
| `#paneFooter` | `PaneFooter`                        | 面板底部、设置项**上方**                   |
| `#settings`   | `SettingsItem`（`FooterMenuItems`） | 整块替换内置设置项                         |

内置设置项选中时，`selectedValue` 取**保留哨兵值**（导出常量 `FLUERE_NAVIGATION_SETTINGS_VALUE`），`itemInvoked` 的 `isSettingsInvoked` 为 `true`。**消费方不得把菜单项的 `value` 设成这个字符串**（契约测试有断言守这条）。

::demo-block{title="设置项、PaneFooter 与事件"}
#preview
:NavigationViewSettingsDemo
#code

```vue
<FluereNavigationView v-model:selected-value="selected" @item-invoked="onInvoked">
  <FluereNavigationViewItem value="docs" content="文档" />
  <template #paneFooter>…</template>
  <template #settings>…</template>
</FluereNavigationView>
```

::

## 与 WinUI 的差异（有意为之，逐条记录）

1. **只做左侧面板**：`PaneDisplayMode` 的 `Top` 不实现 —— 顶部导航是另一套模板（`TopNavArea` / `TopNavGrid` / 溢出 `Flyout` / 手柄导航 `BumperNavigation`）。连带不实现 `ShoulderNavigationEnabled`（源码里对非 Top **恒返回 false**，`:3165-3170`，即左侧面板本来就没有手柄导航）、`OverflowLabelMode`、`AutoSuggestBox`、返回 / 关闭按钮。
2. **`Minimal` 档降级为 `Compact`**：上游 Minimal 是「面板浮层化 + 焦点陷阱」（`:4588-4596` 把 `KeyboardNavigationMode` 设成 `Cycle`），浮层焦点管理属 0.5.7 `useFocusTrap` 的范围。本库在宽度落在 Minimal 区间时渲染为 Compact 形态（面板常驻 48px），不弹浮层。
3. **子项是「数据型子组件」**：三个子组件**不会挂载**（父组件在渲染期读 vnode props / slots，理由见 `collection.ts`），因此它们不能 emit，子项插槽**不支持作用域参数**。
4. **`SelectedItem` 换成「值标识」**：WinUI 用对象引用，Vue 侧用 `selectedValue`（与 `FluereTabView` 的选中口径一致）。
5. **不做子项 flyout**：上游「紧凑且关闭时把子项搬进 `ChildrenFlyout`」（`NavigationViewItem.cpp:908-911`）。本库紧凑时**隐藏 chevron 且不渲染子项**，避免出现点了没反应的箭头；展开面板后子项照常内联显示。
6. **不做「指示条在项之间滑动」的位置动画**：上游 `PlayIndicatorAnimations`（`NavigationView.cpp:2185-2235`）用 Composition 算前后项位移，`600ms` / 三段缓动 + 200ms 中心点动画。本库只做当前项指示条淡入淡出（上游 `ShowSelectionIndicator` 就是直接改 `Opacity`，`NavigationViewItem.cpp:402-408`，无过渡），静态形态一致。
7. **chevron 用 CSS 旋转表达两端**：上游默认模板里 `RotateExpandCollapseChevron` 只是 `Begin()` 两个**不存在**的 Storyboard（`NavigationView.xaml` 里 `Storyboard` 计数 0、无 `Rotate`/`Angle`）⇒ 对默认模板是 no-op，真正的旋转由 `AnimatedIcon`（`AnimatedChevronUpDownSmallVisualSource`）承担。本库不引入 Lottie，只表达「展开 180° / 收起 0°」的静态两端。

## 证据缺口（显式标注）

- **chevron 逐帧关键帧**：LottieGen 产物给了总时长 433.33ms 与 18 段区间 marker（`AnimatedChevronUpDownSmallVisualSource.cpp:104,782,789-825`），但完整路径插值在 JSON 源里（不在本快照）。本库只做静态两端 + 单段 50ms 过渡（覆写 `--fui-navigation-view-chevron-duration`）。
- **`ExpandCollapseRotate{Expanded,Collapsed}Storyboard` 的时长取不到**：`NavigationViewItemPresenter.cpp:73-74` 查找这两个名字，但默认模板里不存在，因此没有可引用的数值。
- **系统强调色**：`AccentFillColorDefaultBrush` 的最终值由系统运行时决定，源码树只给别名；本库沿用仓库既有映射 `--colorBrandBackground`。
- **高对比度**：HC 色板来自系统运行时（`themeresources:136-201` 全是 `SystemColor*` 引用），本库不实现 HC 专项，只保留 `forced-colors` 下的焦点环（0.4.3 原语已处理）。

## 令牌映射

| WinUI 资源                                                                               | 最终色（亮 / 暗）         | 本库 token                                                                                     |
| ---------------------------------------------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------- |
| `NavigationViewDefaultPaneBackground` ← `AcrylicInAppFillColorDefaultBrush`              | `#F9F9F9` / `#2C2C2C`     | `--acrylicInAppFillColorDefault`                                                               |
| `NavigationViewExpandedPaneBackground` ← `SolidBackgroundFillColorTransparent`           | 全透明                    | `--colorTransparentBackground`（同观感、非同字面量，见组件注释第 5 条）                        |
| `NavigationViewContentBackground` ← `LayerFillColorDefaultBrush`                         | `#80FFFFFF` / `#4C3A3A3A` | `--layerFillColorDefault`                                                                      |
| `NavigationViewItemBackground*` ← `SubtleFillColor{Transparent,Secondary,Tertiary}Brush` | —                         | `--subtleFillColorTransparent` / `--subtleFillColorSecondary` / `--subtleFillColorTertiary`    |
| `NavigationViewItemForeground*` ← `TextFillColor{Primary,Secondary,Disabled}Brush`       | —                         | `--colorNeutralForeground1` / `--colorNeutralForeground2` / `--colorNeutralForegroundDisabled` |
| `NavigationViewSelectionIndicatorForeground` ← `AccentFillColorDefaultBrush`             | 系统强调色                | `--colorBrandBackground`                                                                       |
| `NavigationViewItemSeparatorForeground` ← `DividerStrokeColorDefaultBrush`               | `#0F000000` / `#15FFFFFF` | `--dividerStrokeColorDefault`                                                                  |
| `NavigationViewContentGridBorderBrush` ← `CardStrokeColorDefaultBrush`                   | `#0F000000` / `#19000000` | `--colorNeutralStrokeAlpha`（沿用 InfoBar / ContentDialog / TabView 的既有映射）               |
| 禁用不透明度 ← `ListViewItemDisabledThemeOpacity`                                        | `0.3`                     | `--fui-navigation-view-disabled-opacity`                                                       |

## 几何（逐条来自 `NavigationView_themeresources.xaml`）

| 量                  | 值                                                         | 出处                                    |
| ------------------- | ---------------------------------------------------------- | --------------------------------------- |
| 项最小高度          | `36`                                                       | `:217`                                  |
| 图标盒高 / 图标列宽 | `16` / `max(0, CompactPaneLength - 8)` = 40                | `:219`、`:611-613`                      |
| 选中指示条          | `3 × 16`、圆角 `2`                                         | `:220-222`                              |
| 分组标题行高 / 字号 | `40` / `14` SemiBold                                       | `NavigationView.xaml:564`、`:1081-1086` |
| 分隔线              | `1px`、`Margin 0,3,0,4`                                    | `:223`、`:247`                          |
| 层级缩进            | `Depth() × 31`                                             | `NavigationViewItemBase.h:63`           |
| 开关按钮            | `40 × 36`                                                  | `:205-206`                              |
| 圆角                | 项 `OverlayCornerRadius`(8)、按钮 `ControlCornerRadius`(4) | `:447`、`:283`                          |
| 面板宽              | Expanded `320` / Compact `48`                              | `NavigationView.idl:195,198`            |

## 面板开合动效

面板宽度的开合动画来自 SplitView 模板（NavigationView 的 pane 由内部 `SplitView` 承载）：

| 方向 | 资源                                  | 值      | 关键帧缓动                       |
| ---- | ------------------------------------- | ------- | -------------------------------- |
| 展开 | `SplitViewPaneAnimationOpenDuration`  | `200ms` | `cubic-bezier(0, 0.35, 0.15, 1)` |
| 收起 | `SplitViewPaneAnimationCloseDuration` | `100ms` | 同上                             |

本库把两个时长映射到 `--durationNormal` / `--durationFaster`，并在 `prefers-reduced-motion` 或 `motion="none"` 下置 `0ms` —— 关闭动效后**静态形态保留**（面板仍可开合、指示条仍可见、箭头仍指向正确方向）。

## API

### `FluereNavigationView`

| Prop                         | 类型                                                   | 缺省         | 对应 WinUI                                 |
| ---------------------------- | ------------------------------------------------------ | ------------ | ------------------------------------------ |
| `paneDisplayMode`            | `'auto' \| 'left' \| 'left-compact' \| 'left-minimal'` | `'auto'`     | `PaneDisplayMode`                          |
| `isPaneOpen`                 | `boolean`                                              | —            | `IsPaneOpen`（`v-model:is-pane-open`）     |
| `defaultIsPaneOpen`          | `boolean`                                              | `true`       | `IsPaneOpen` 的依赖属性默认值              |
| `openPaneLength`             | `number`                                               | 令牌 `320`   | `OpenPaneLength`                           |
| `compactPaneLength`          | `number`                                               | 令牌 `48`    | `CompactPaneLength`                        |
| `compactModeThresholdWidth`  | `number`                                               | `641`        | `CompactModeThresholdWidth`                |
| `expandedModeThresholdWidth` | `number`                                               | `1008`       | `ExpandedModeThresholdWidth`               |
| `isPaneToggleButtonVisible`  | `boolean`                                              | `true`       | `IsPaneToggleButtonVisible`                |
| `isPaneVisible`              | `boolean`                                              | `true`       | `IsPaneVisible`                            |
| `isSettingsVisible`          | `boolean`                                              | `true`       | `IsSettingsVisible`                        |
| `selectedValue`              | `string \| number`                                     | —            | `SelectedItem`（`v-model:selected-value`） |
| `defaultSelectedValue`       | `string \| number`                                     | —            | —                                          |
| `selectionFollowsFocus`      | `'disabled' \| 'enabled'`                              | `'disabled'` | `SelectionFollowsFocus`                    |
| `paneTitle`                  | `string`                                               | `''`         | `PaneTitle`                                |
| `label`                      | `string`                                               | —            | `AutomationProperties.Name`                |
| `dir`                        | `'ltr' \| 'rtl'`                                       | `'ltr'`      | `FlowDirection`                            |
| `motion`                     | `'auto' \| 'none'`                                     | `'auto'`     | —                                          |
| `locale`                     | `string`                                               | —            | —                                          |

| 事件 / 插槽                                              | 载荷 / 说明                                                                         |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `update:isPaneOpen`                                      | `boolean`                                                                           |
| `update:selectedValue`                                   | `string \| number \| undefined`                                                     |
| `itemInvoked`                                            | `{ value, content, isSettingsInvoked, source: 'pointer' \| 'keyboard' \| 'focus' }` |
| `selectionChanged`                                       | `{ value, previousValue, isSettingsSelected }`                                      |
| `displayModeChanged`                                     | `{ displayMode: 'minimal' \| 'compact' \| 'expanded' }`                             |
| `#content` / `#paneHeader` / `#paneFooter` / `#settings` | 见上文《设置项与插槽》                                                              |

### `FluereNavigationViewItem`

| Prop                    | 类型               | 缺省     | 对应 WinUI                            |
| ----------------------- | ------------------ | -------- | ------------------------------------- |
| `value`                 | `string \| number` | **必填** | （Vue 侧的项身份）                    |
| `content`               | `string`           | `''`     | `Content`                             |
| `selectsOnInvoked`      | `boolean`          | `true`   | `SelectsOnInvoked`                    |
| `isExpanded`            | `boolean`          | —        | `IsExpanded`（`v-model:is-expanded`） |
| `defaultIsExpanded`     | `boolean`          | `false`  | `IsExpanded` 的默认值                 |
| `hasUnrealizedChildren` | `boolean`          | `false`  | `HasUnrealizedChildren`               |
| `isChildSelected`       | `boolean`          | 推导     | `IsChildSelected`（本库只读）         |
| `ariaLabel`             | `string`           | —        | `AutomationProperties.Name`           |
| `disabled`              | `boolean`          | `false`  | `Control.IsEnabled`                   |

| 插槽        | 说明                                 |
| ----------- | ------------------------------------ |
| 默认插槽    | 项文本 / 富内容（优先于 `content`）  |
| `#icon`     | 图标（建议 20px）                    |
| `#children` | 下级项（递归，可继续嵌 `#children`） |

### `FluereNavigationViewItemHeader` / `FluereNavigationViewItemSeparator`

| 组件                                | Props     | 对应 WinUI                    |
| ----------------------------------- | --------- | ----------------------------- |
| `FluereNavigationViewItemHeader`    | `content` | `NavigationViewItemHeader`    |
| `FluereNavigationViewItemSeparator` | —         | `NavigationViewItemSeparator` |

两者都**不可聚焦、对 AT 隐藏**（上游 `IsTabStop=False` + `AccessibilityView=Raw`，`NavigationView.xaml:505-509`、`:574-576`）。

## 浏览器实测

<!-- content/ 之外的相对路径（./../../../../docs/…）在 `pnpm docs:generate` 预渲染时会被 crawlLinks
     当成站内路由抓取并 404，从而让整条命令失败（详见 AGENTS.md 的 docs:generate 检查项）。
     因此仓库内文档一律用绝对地址外链，见 scroll-view.md 的同一处理。 -->

样式契约测试读的是 **SFC / CSS 源码文本**（jsdom 不解析 `var()`，见
[style-spec §7.1](https://github.com/Altermoe/fluere-vue/blob/main/docs/style-spec.md)），
因此「面板样式有没有真的生效」必须在真实浏览器里量计算样式 —— 尤其是本组件的行视觉写在
**非 scoped** 的 `navigation-view.css` 里（同一套行由父组件与递归列表组件分别渲染，
两个 `data-v-*` 不同，各写一份 scoped 块必然漂移）。实测结论见组件注释与
[docs/todo.md](https://github.com/Altermoe/fluere-vue/blob/main/docs/todo.md) 的 0.5.4 记录。
