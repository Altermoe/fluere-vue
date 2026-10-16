---
'@fluere-vue/ui': patch
'@fluere-vue/designs': patch
'@fluere-vue/hooks': patch
'@fluere-vue/icons': patch
'@fluere-vue/themes': patch
'@fluere-vue/utils': patch
---

0.5.0「Explorer 骨架」：窗口外框 / 选项卡 / 导航视图三个通用控件进库，浮层焦点原语下沉。

**新组件**

- `FluereAppWindow`：圆角窗口外框 + 标题栏（`Microsoft.UI.Xaml.Controls.TitleBar` 口径），提供 `dragStart` / `dragMove` / `dragEnd` 让外壳实现拖拽；位置 / 尺寸 / 层级由消费方控制。标题栏 32 / 48 两档高度、`Compact` 折叠的「后声明组胜出」、失活态分支均照抄 `TitleBar.cpp`。
- `FluereCaptionButtons`：最小化 / 最大化 / 还原 / 关闭，纯逻辑代理（不自行改窗口几何）。caption 按钮无 A 级 XAML 源码（系统 DWM 绘制），几何 46×32 / 字形 10 / 描边 1 与关闭键红 `#C42B1C` 记为系统度量 + 证据缺口，全部落成可覆盖的组件局部变量。
- `FluereTabView` / `FluereTabViewItem`：标签条支持溢出滚动（`overflow-x: auto` 保留原生滚动、不画原生滚动条以恒保 32px 高度）、箭头按住连续滚动、`Ctrl+F4` / `Ctrl+Tab` / `Ctrl+Shift+Tab` 加速键与「tab → 关闭按钮 → 新建按钮 → 回绕」方向键焦点环；`TabWidthMode` 三档；关闭 / 新建只抛事件不删数据，被删选中项按 `OnItemsChanged` 的后向环形规则迁移。
- `FluereNavigationView` 家族（`…Item` / `…ItemHeader` / `…ItemSeparator`）：DisplayMode 状态机（`width >= 1008` Expanded / `0 < width < 641` Minimal / 其余落 Compact）逐字照抄 `NavigationView.cpp`；收起时保留 48px 图标轨道；选中与展开同时发生、`selectsOnInvoked=false` 只展开不改选中、`isChildSelected` 沿祖先链回写；底部设置项用保留哨兵值 `FLUERE_NAVIGATION_SETTINGS_VALUE`（消费方不得用作菜单项 `value`）。

**浮层与令牌**

- `@fluere-vue/hooks` 新增 `useFocusTrap`（Tab 陷阱跳过不可聚焦项、Esc / `onEscape`、点击 / 触摸外部 + 触发器排除、焦点归还含外部点击抑制与键盘再武装）；SSR 无副作用，配套 `hasDocument()` 能力探测原语进 `@fluere-vue/utils`。文档站开始菜单与托盘弹层为首批消费方。
- `@fluere-vue/designs` 补齐 Windows 外壳用令牌：强调色两枚（`windowsAccentPrimary` / `windowsAccentLight2`）、控件填充与描边三枚（`controlFillColorSecondary` / `controlFillColorTertiary` / `controlStrokeColorDefault`）、浮出描边 `surfaceStrokeColorFlyout` 与 `--zIndexStartMenu`（1600）；顺序断言同步。

**修正**

- `FluereTabView`：标签条水平溢出时不再被原生滚动条撑高，箭头支持按住连续滚动。
- `FluereNavigationView`：修正折叠态开关按钮挤压、标题残留、行背景裁切与设置图标填充。
- `FluereAppWindow`：caption 字形按参考图逐像素校准。

**文档**：三个新组件均含中英文档页、示例与 API 表；文档站外壳（`/os`）落地壁纸 / 窗口 / 任务栏 / 系统托盘 / 开始菜单，仿真边界文案中英同构。规格源统一为 `microsoft-ui-xaml` tag `winui3/release/2.5.1`（commit `ba3a8d5`）。
