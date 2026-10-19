# Fluere Vue 路线图与实施清单（TODO）

> **依据**：使用频率 × 需求度 × WinUI 还原成本 × `reka-ui` 底座可用性。
> **核心交付基准**：不用手写任何 HTML，即可搭出「设置页 + 数据录入表单 + 带加载 / 提示反馈的页面」的 WinUI 应用。
> **已落地约束**：SSR 安全（见 [ssr-guide.md](./ssr-guide.md)）、`@fluere-vue/designs` 令牌、`@fluere-vue/hooks` / `utils` 共享原语、`pnpm check`（lint + format + tsc）+ SSR smoke 测试。
>
> **索引化（2026-10-19）**：本文档是**收口索引**，只保留版本地图、当前/未来排期、开放事项与发布闸门；**已收口版本（0.1.0-rc.1 / 0.3.0-rc.1 / 0.4.0）的完整实施与验收记录**已移到 [docs/archived/](./archived/)，以降低上下文消耗，归档清单见下方《归档索引》。
> 本文档只记**进度、结论与验收口径**：规格源路径、资源 → 令牌映射、动效关键帧等技术细节写在对应组件的契约注释与 [style-spec.md](./style-spec.md)，此处不重复。
> 每个组件改动的合并闸门见《人工校验闸门（0.4.0 起生效）》。

## 版本地图

| 版本        | 状态   | 主题                                                                                                                                                   |
| ----------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0.1.0-rc.1  | 已收口 | 通用 WinUI 控件清单                                                                                                                                    |
| 0.3.0-rc.1  | 已收口 | 能被用起来：i18n / 文档站 WindowsOS 仿真化 / **自动发版流程**（首发 `0.3.0-alpha.2` 为人工 bootstrap，自 `0.4.0-alpha.1` 起由 `release.yml` 自动发布） |
| 0.4.0       | 已收口 | Explorer 基建 + 通用件收尾（`0.4.0-alpha.1` / `0.4.1-alpha.1` 均经 CI 自动发布）                                                                       |
| 0.5.0       | 进行中 | Explorer 骨架（首页 hook 首次上线）—— 组件与外壳已落地，正在收口 `0.5.0-alpha.1`                                                                       |
| 0.6.0       | 待开工 | 地址栏 + 命令层                                                                                                                                        |
| 0.7.0       | 待开工 | 数据层 ①：项基座 + 列表                                                                                                                                |
| 0.8.0       | 待开工 | 数据层 ② + 布局收尾                                                                                                                                    |
| 0.9.0-rc.1  | 待开工 | 质感分支（独立 minor）                                                                                                                                 |
| 0.9 → 1.0.0 | 待开工 | 收尾窗口（4–8 周）                                                                                                                                     |

---

## 归档索引（已收口版本的完整记录）

> 收口原则：《版本地图》标记「已收口」的版本，其实施与验收细节整体归档；**仍需推进的剩余项**统一收敛到下方《开放事项》，不埋在归档里。

| 已收口版本 | 归档文件                                           | 主要内容                                                                                                                                  |
| ---------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 0.1.0-rc.1 | [archived/0.1.0-rc.1.md](./archived/0.1.0-rc.1.md) | 组件 Wave 计划 + 通用 WinUI 控件清单（含 rc.1 明确不做）与发布检查                                                                        |
| 0.3.0-rc.1 | [archived/0.3.0-rc.1.md](./archived/0.3.0-rc.1.md) | 目标 1–3：i18n / 文档站 WindowsOS 仿真化 / 自动发版（含人工首发与自动发版记录）                                                           |
| 0.4.0      | [archived/0.4.0.md](./archived/0.4.0.md)           | 基建（`useFlyout` / z-index 刻度 / `useFocusVisual` / 材质令牌）+ 通用件收尾（Input / `ToggleButton`·`ToggleGroup` / `Select`）+ 开工前置 |

---

## 开放事项（仍需推进 / 收口）

> 以下是**版本「已收口」但仍需继续推进**的剩余项，按现状去向整理；每条验收要点以对应归档 / 排期表的原文为准。

- [ ] **0.6.0 承接 · 文档站 NavigationView 化（2.3）**：窗口内 `NavigationView` 重构布局、组件页右栏「本页目录」+ 面包屑 + 「复制链接」、`Ctrl+K` 命令面板式搜索
- [ ] **页面与内容呈现（2.4）**：组件文档页模板化、示例明暗对照、新增站点页（入门 / 安装 / 设计令牌 / 路线图·更新日志 / 404 空态）、全站新文案走 i18n key
- [ ] **动效 / 性能 / 无障碍（2.5）**：动效走令牌 + `prefers-reduced-motion`、SSR 安全分级、性能预算、无障碍语义与全键盘可达；对应「验收」见归档
- [ ] **目标 1 · Lighthouse / axe 实跑**：`<html lang>` 已与水合一致，Lighthouse / axe 尚未实跑
- [ ] **目标 3 · 发布前质量闸剩余**：publint / attw / `npm pack --dry-run` 已在 CI 落地；**仅 `icons` tarball 体积异类（~43 MB）已知、未处理**
- [ ] **目标 3 · 其它 0.3 收口项**：冻结发布范围；README 去「尚未发布」并收口版本展示；GitHub Release 改由 `publish` job 建立（含破坏性变更与已知问题清单）
- [ ] **已知非自动化**：`v<version>` 部署 tag 仍由 `pnpm release:manual` / 手工补推（见 [release.md](./release.md)）
- [ ] **推后项（记账）**：RTL、第三种语言、翻译平台工作流、组件文档逐页人工润色

---

## 0.4.0 – 0.9.0-rc.1 排期（Explorer 仿真为北极星）

> 本节是**当前生效的排期**；0.3 版本的「文档站 WindowsOS 仿真化」即本节的布局基建前置。
>
> **北极星与终点**：**Explorer 仿真是 0.9.0-rc.1 的最终目标，也是生产版发布前的最后一块拼图**。它承担两个职责：① 桌面仿真的呈现（0.5.6 起落在独立路由 `/os`，站点主页是常规营销页并各有入口指向它，见 [design/explorer-layout.md](./design/explorer-layout.md) §0）；② 跨组件组合的唯一验收场景——焦点管理、浮层层级、嵌套弹出、键盘可达、明暗与材质，这些只有把组件拼成一个真实窗口才能验证。
>
> **仿真边界（必须标注在文档站，与 README「不夸大承诺」一致）**：菜单 / 下拉只仿真到**能打开面板、能键盘走条目、能选中、能进子菜单**，不接内部 Windows 能力；不实现真实文件系统、真实拖放排序、真实窗口管理器；移动端不仿桌面，降级为简洁响应式全屏。

### 排期总览

| 版本        | 主题                                    | 关键交付                                                                                                                                            | 依赖                                                    |
| ----------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 0.4.0       | 基建 + 通用件收尾                       | `useFlyout` 浮层原语、z-index 刻度、`useFocusVisual` 焦点矩形原语、Mica/Acrylic/SubtleFill 令牌、Input 收尾、`ToggleButton`/`ToggleGroup`、`Select` | 无（**最先做，后续所有版本的减债项**）                  |
| 0.5.0       | **Explorer 骨架（首页 hook 首次上线）** | `TabView`、`NavigationView`、`AppWindow`/`CaptionButtons`、文档站 `DesktopShell` / `Taskbar` / `SystemTray` / `StartMenu`                           | 0.4.0 的 `useFlyout` 与 `useFocusVisual`                |
| 0.6.0       | 地址栏 + 命令层                         | `MenuFlyout` 族、`ContextMenu`、`DropDownButton`、`SplitButton`、`BreadcrumbBar`、`SearchBox`                                                       | 0.4.0 的 `useFlyout`                                    |
| 0.7.0       | 数据层 ①：项基座 + 列表                 | `ItemContainer`、`useSelection`、`useMarqueeSelection`、`ListView`、`GridView`                                                                      | 0.5.0 的导航容器与 0.6.0 的菜单（右键菜单落在列表项上） |
| 0.8.0       | 数据层 ② + 布局收尾                     | `DetailsPane`、`StatusBar`、`CommandBar`、`Splitter`、`Expander`、图标/详情双视图切换                                                               | 0.7.0                                                   |
| 0.9.0-rc.1  | **质感分支（独立 minor）**              | Explorer 完成版 + 材质（Mica / Acrylic）、焦点矩形统一铺开、动效逐帧核对、对比度复核、性能预算                                                      | 0.8.0 全部功能就位                                      |
| 0.9 → 1.0.0 | 收尾窗口（4–8 周）                      | 跨组件复查 + 人工校验审计 + 外部消费者验证                                                                                                          | 0.9.0-rc.1                                              |

**两项前置硬约束**：

1. **版本号必须连续**：0.4.0 → 0.9.0-rc.1 之间不得跳号，每个 minor 都要有真实内容与可验收的里程碑，否则发布手册与 CHANGELOG 会失去可解释性。
2. **0.4.0 开工前重新拉起 WinUI 源码快照**：`temp/` 当前为空，需按 [style-spec §2/§3](./style-spec.md#2-版本地图先对版本再读代码) 重新获取并固定 commit。本节 40 余个组件条目每一项都要回到源码点名资源与关键帧，快照缺失则「逐像素还原」的立论基础不成立。

### 工作量刻度（估点）

估点为**相对复杂度单位**，1 点 ≈ 一个中等复杂度组件的「实现 + 契约测试 + 文档示例 + API 表」四件套（约 1 人日量级）。刻度用本仓库既有组件做锚点：

| 档位                           | 特征                   | 锚点（仓库现有组件）                      | 估点      |
| ------------------------------ | ---------------------- | ----------------------------------------- | --------- |
| **S** 有 reka 底座、状态少     | 状态少、直接映射       | Button / ProgressBar                      | 0.5 – 1.5 |
| **M** 逐状态对齐、需共享 hook  | 状态表完整             | Checkbox / Radio / ToggleSwitch / InfoBar | 2 – 3     |
| **L** 自定义绘制 / 动效 / 键盘 | 自定义绘制或完整键盘   | Slider / NumberBox / InfoBadge            | 3 – 5     |
| **XL** 自持核心 + 多 hook 拆分 | 自持核心逻辑、多 hook  | Combobox / ContentDialog / ScrollView     | 5 – 8     |
| **基建** 跨组件复用、无视觉    | 跨组件复用、无视觉产出 | `useDisclosure` / Portal / SmokeLayer     | 1 – 2     |

### 0.5.0 · Explorer 骨架（≈ 17 点组件 + 11 点文档站）

> **本版的战略意义**：Explorer 拆分交付的第一段。首页自 0.5.0 起即可挂上可交互的窗口，hook 提前四个版本生效；同时让 0.6–0.8 的组件开发始终有一个可运行的目标物可对照。
>
> **必须先在 0.5.0 定下来的布局假设**（它们最易在最后阶段被推翻）：窗口圆角与阴影、内容区滚动边界、导航面板折叠宽度、任务栏高度与层级、桌面壁纸层的令牌化方案。

| #     | 内容                                                               | 档位 | 验收要点                                                                                    |
| ----- | ------------------------------------------------------------------ | ---- | ------------------------------------------------------------------------------------------- |
| 0.5.1 | `FluereAppWindow`（圆角窗口 + 标题栏 + 可拖拽区）                  | L 4  | 圆角 / 阴影 / 描边全部走令牌                                                                |
| 0.5.2 | `CaptionButtons`（最小化 / 最大化 / 关闭，含关闭键红底 hover）     | M 2  | **真实可用**（最小化 / 最大化 / 还原视口）；全部键盘可达 + `aria-label`                     |
| 0.5.3 | `TabView`（复用 reka Tabs；含溢出滚动）                            | L 4  | 键位与焦点表现对齐 WinUI TabView                                                            |
| 0.5.4 | `NavigationView` + `NavigationViewItem`                            | XL 6 | 可折叠面板、分组、选中指示条、设置项；接入 0.4.3 的焦点矩形                                 |
| 0.5.5 | 文档站 `DesktopShell`（壁纸层 → 窗口层 → 任务栏层）                | L 4  | 层级 / 圆角 / 阴影一律 token，禁止魔法值                                                    |
| 0.5.6 | 文档站 `Taskbar` + `SystemTray`（`Intl` 时钟 + 主题 / 语言切换）   | L 4  | hover / active 指示条；点击弹出或还原窗口；版本号改为读 `package.json`（去掉硬编码 v0.0.1） |
| 0.5.7 | 文档站 `StartMenu`（Acrylic 面板 + 键盘导航 + Esc 关闭）           | M 3  | 承载站点信息架构；浮层焦点管理下沉到 `packages/hooks`                                       |
| 0.5.8 | 窗口拖拽收敛改为「标题栏始终可见」+ 视口变化后重收敛               | M 2  | 拖到底标题栏仍可抓、无回拖死区；压矮视口后窗口不会消失（追加条目，记录见下方进展）          |
| 0.5.9 | 仿真应用系统：多窗口层级 / 焦点 + UI Gallery / Render Lab 两个应用 | L 4  | 点下层窗口即置顶并获得焦点；每应用独立最小化 / 最大化 / 关闭；WebGL2 不可用时显示降级文案   |

> **0.5.8 / 0.5.9 两行是 2026-10-16 按人类授权（「修补文档记录」）补记的**：两条交付原本只在下方进展条目里，未进表格；本轮只补记录、**不新增验收口径**（验收要点一栏写的是已交付事实）。

> **0.5.1 / 0.5.2 已落地（组件侧，2026-10-13）**：`FluereAppWindow`（窗口外框：圆角 / 描边 / 阴影 / 标题栏 / 内容可视区）与 `FluereCaptionButtons`（最小化 / 最大化 / 还原 / 关闭，纯逻辑代理）已进 `packages/ui`，四件套齐（SFC + 契约测试 + 中英文档页 + 5 个示例）。规格逐条对齐 `Microsoft.UI.Xaml.Controls.TitleBar`：**行为 / API 读 `winui3/release/2.0.1`**（Gallery v2.9.3 所用 WASDK），模板与画刷读本地快照 `2.5.1`（该控件目录两 tag 有漂移，已记入组件注释）；标题栏 32/48 高度判据、`Compact` 折叠的「后声明组胜出」、失活态的两个分支、拖拽打洞清单均照抄 `TitleBar.cpp`。caption 按钮**无 A 级 XAML 源码**（系统 DWM 绘制），几何 46×32 / 字形 10 / 描边 1 与关闭键红 `#C42B1C` 记为系统度量 + 证据缺口，全部落成可覆盖的组件局部变量；窗口**位置 / 尺寸 / 层级由外部控制**，拖拽只抛 `dragStart` / `dragMove` / `dragEnd`。文档站 `DesktopShell` / `Taskbar` / `SystemTray` / `StartMenu`（0.5.5–0.5.7）与 0.5.4 `NavigationView` 当时仍待做——**现均已落地**，逐条记录见下方 0.5.3–0.5.7 的进展条目。

> - **0.5.3 `TabView`（已落地，2026-10-14）**：`packages/ui/src/tab-view/`（`tab-view.vue` + `tab-view-item.vue` + `types/constants/locale/collection`）—— 38 条契约测试 + 中英文档页 + 5 个示例 + 组件索引/导航条目（`components-nav.ts` 用 `tab-view` 替换了原先的 `Tabs` 占位）。规格逐条对齐 `Microsoft.UI.Xaml.Controls.TabView`（tag `winui3/release/2.5.1`：模板 `TabView.xaml`、几何 `TabView_themeresources.xaml:239-269`、行为 `TabView.cpp` / `TabViewItem.cpp`、默认值 `Generated/*.properties.cpp`、文案 `Strings/{en-us,zh-CN}/Resources.resw`）：TabView 无 `OnKeyDown`，键盘 = `Ctrl+F4` / `Ctrl+Tab` / `Ctrl+Shift+Tab` 三个加速键 + 方向键焦点环（`tab → 关闭按钮 → … → 新建按钮 → 回绕`，只移焦点不改选中）；`CloseButtonOverlayMode` 的 `Auto` 与 `Always` 同分支（只有 `on-pointer-over` 悬停显示）；`TabWidthMode` 三档（Equal 按可用宽 `clamp(…,100,240)`、Compact 只折叠未选中项）；关闭 / 新建**只抛事件不删数据**，被删选中项按 `OnItemsChanged` 的向后环形规则迁移；`perf2026` 变体不实现（沿用 TitleBar 裁定，写进组件注释）。**子项是数据型子组件**（`FluereTabViewItem` 不挂载，父组件渲染期读 vnode props/slots，等价 React `cloneElement`）—— 因此 SSR 直出即有完整 tab 条，水合一致；`useFocusVisual` 接焦点环、`layout` 相关令牌补 4 个（`layerOnMicaBaseAltFillColorSecondary` / `...Transparent` / `solidBackgroundFillColorTertiary` / `dividerStrokeColorDefault`，均按 WinUI 原值落 `repo-tokens.json`）。**真实浏览器实测 52 条断言全绿**（`temp/pw-tab-view.mjs`），并抓到两个单测抓不到的真 bug：① 模板里的 kebab-case 属性在**原始 vnode props** 里键名是 `is-closable`，只认 camelCase 会把 `:is-closable="false"` 当「没传」⇒ 关闭按钮照常渲染（已加 kebab/camel 双向读取 + 裸属性 Boolean 转换，并有回归用例）；② 选中背景是定位伪元素，按绘制次序盖住常规流里的图标与文本 ⇒ 选中项整片纯色（已把内容提升到同层，`elementFromPoint` 断言守住）。证据缺口：选中背景路径由运行时 `StringCchPrintf` 生成、`ThemeTransition` 时长不在控件目录、HC 色板来自系统运行时、`TabViewBorderBrush` 的 `Color→Brush` 隐式转换未证实（详见组件注释与文档页）。

> - **0.5.4 `NavigationView`（已落地，2026-10-15）**：`packages/ui/src/navigation-view/`（`navigation-view.vue` + `navigation-view-items.vue` + `navigation-view-item/-item-header/-item-separator.vue` + `types/constants/locale/collection/context` + 非 scoped 的 `navigation-view.css`）—— **70 条契约测试** + 中英文档页 + 4 个示例 + 组件索引/导航条目（`components-nav.ts` 新增 `navigation-view`）。规格逐条对齐 `Microsoft.UI.Xaml.Controls.NavigationView`（tag `winui3/release/2.5.1`：模板与几何 `NavigationView.xaml` / `NavigationView_themeresources.xaml`、行为 `NavigationView.cpp` / `NavigationViewItem.cpp` / `NavigationViewItemPresenter.cpp`、默认值 `Generated/*.properties.cpp`、面板开合关键帧 `SplitView_themeresources.xaml`、chevron `AnimatedChevronUpDownSmallVisualSource.cpp`、文案 `Strings/{en-us,zh-CN}/Resources.resw`）：DisplayMode 状态机逐字照抄（`width >= 1008` Expanded / `0 < width < 641` Minimal / 其余含 0 与 NaN 落 Compact，`NavigationView.cpp:1452-1465`）；pane 开合语义照抄（进入 Expanded 需 `!m_wasForceClosed`、`Expanded → Compact` 与进入 Minimal 无条件关、**不存在 per-mode 开合记忆**、切换 `paneDisplayMode` 清标志）；收起时保留 **48px 图标轨道**而非归零（`ListSizeCompact`）；键盘照源码（`Enter` / `Space`（**Alt+Space 不处理**）/ `Home` / `End` / `Alt+←`；`→` 与 `Esc` 在 NV 里**零命中**，属负面证据）；选中与展开**同时发生**（`:1067`）、`selectsOnInvoked=false` 只展开不改选中、`isChildSelected` 沿祖先链回写、指示条下钻到最低可见层；面板关闭时**顶层项强制折叠但记忆状态**。**底部设置项用保留哨兵值** `FLUERE_NAVIGATION_SETTINGS_VALUE`（消费方不得用作菜单项 `value`）。**真实浏览器实测 55 条断言全绿**（`temp/pw-navigation-view.mjs`，明暗对照截图在 `temp/visual-navigation-view/`），并抓到四个单测抓不到的真 bug：① **哨兵常量没从 `packages/ui/index.ts` 导出**，文档示例 import 到 `undefined` ⇒ SSR / 水合整页 500（已导出并加「包入口导出契约」断言）；② 单根组件上写了 `inheritAttrs: false`，**静默丢掉消费方的 `class` / `style`**（demo 的 `h-[320px]` 完全没生效，组件高度塌成 0）—— 已移除并加回归用例；③ 根节点 class 声明两遍（`class="fui-navigation-view fui-navigation-view …"`）；④ 开关按钮宽原先恒 40，未实现上游 `UpdatePaneToggleSize` 的「有 `PaneTitle` 时撑到 `OpenPaneLength`」分支，标题被挤扁（已按三分支实现 + 4 条契约断言）。**Minimal 档降级为 Compact**（浮层焦点陷阱属 0.5.7 `useFocusTrap`，与 `docs/design/explorer-layout.md` 假设 3 一致）；`Top` 顶部导航形态、子项 flyout、指示条滑动位置动画、`perf2026` 均为非目标（逐条写进组件差异表）。证据缺口：chevron 完整路径插值在 LottieGen 的 JSON 源里（只做静态两端 + 50ms 过渡）、`ExpandCollapseRotate{Expanded,Collapsed}Storyboard` 默认模板不存在故无时长可引、系统强调色与 HC 色板来自运行时。

> - **0.5.5 文档站 `DesktopShell`（已落地，2026-10-16）**：首页首屏整屏接管为桌面仿真（壁纸层 → 窗口层 → 任务栏层），窗口内用 `FluereAppWindow` + `FluereNavigationView` + `FluereTabView` 组装 Explorer。**全部落 `apps/docs`，不动 `packages/ui` / `packages/designs`**（构件归属见 [apps/docs/README.md](../apps/docs/README.md#站点主页与桌面外壳的落点056-起)）：`components/shell/{desktop-shell,desktop-wallpaper,explorer-window,shell-chrome,shell-taskbar}.vue` + `utils/shell-window-state.ts`（纯状态机，**23 条单测**）+ `utils/__tests__/shell-style-contract.test.ts`（**18 条源码契约**：禁裸 `z-index` / 禁 `#RRGGBB` / 禁 `backdrop-filter` / 任务栏高度只经 `--shell-taskbar-h` / NV 根不得写 `h-*` / chrome 两处落点互斥且清单只有一份）+ `assets/docs-shell.css` 的 `--shell-*` 构图变量。**真实浏览器实测 72 条断言全绿**（`temp/pw-desktop-shell.mjs`，1280 / 1440 / 1920 + 390 移动档，明暗对照截图在 `temp/visual-desktop-shell/`）：任务栏 z=1500 / 窗口层 z=0、窗口 1120×720 居中、最大化铺满且底部留 48px、圆角 8→0、拖拽被收敛在桌面内、页面 `scrollY` 恒 0（滚动在窗口内）、最小化 / 关闭 / 重开三条路径可用、水合告警 0、移动档标题栏子格越界 0。四条**实测得出、单测抓不到**的结论已写进组件注释与 README：① `FluereNavigationView` 根自带 `block-size: 100%`（特异性 0,2,0）⇒ 根上 `h-[...]` 静默失效，必须「确定高度父容器 + `flex-1 min-h-0`」；② 组件 ref 不取 `$el` 直接当 `HTMLElement` 用，SSR 直出正常但浏览器一水合即 `TypeError` 整页被错误页替换；③ 任务栏入口若用 `FluereButton` 的 `selected` 做 toggle，会在 `selected=false` 时丢掉 `aria-pressed`（时而带时而不带），故本期做成「动作按钮 + 视觉指示条」；④ **48px 定高标题栏装不下四个站点 chrome 控件**——390px 实测右头格只剩 43px、控件换行成 108px 高压住标签条，故 chrome 改为「≥64rem 在标题栏 / <64rem 在窗口内容区应用栏」两处互斥落点（同一份清单，`explorer-layout.md` §6.3 记录了数据与推理）。**0.5.5 的最小任务栏只含高度占位 + 还原入口 + 激活指示条**，图标组 / hover 指示条 / 开始按钮 / 系统托盘归 0.5.6；任务栏 ToolTip 因 `--zIndexTooltip`(1400) < `--zIndexShell`(1500) 自遮挡，本期只用原生 `title`，冲突裁决留给 0.5.6（`explorer-layout.md` §4；**该裁决已作出 = 方案①**：外壳内不挂 `FluereTooltip`、只用 `title`，0.5.7 回写 §4）。《WindowsOS 仿真边界》已作为**可见文案**落进首页窗口的滚动区（i18n key `shell.boundary.*`，中英同构）。另跑了两语种 SSR / 水合实测（`temp/pw-shell-i18n-hydration.mjs`，17 条断言）：`/` 与 `/en` 各 200、水合告警 0、控制台错误 0、`shell.*` 消息按语种取到、边界文案可见。
>
> - **0.5.6 主页与仿真落点拆分（已落地，2026-10-16）**：站点主页（`/`）回到常规营销页（`layouts/home.vue`：sticky header + 整页滚动视口 + `components/home/home-route-overlay.vue`），桌面仿真迁到独立路由 **`/os`**（`pages/os/index.vue` + `layouts/os.vue`：布局只转发 slot，桌面自己接管视口）。营销内容抽成 `components/home/home-content.vue`，主页与窗口「首页」视图**共用同一份**，`variant="desktop"` 决定是否附上《WindowsOS 仿真边界》三段（该段跟随仿真本身，因此只在 `/os` 出现）。窗口内的三个视图改由 `explorer-window.vue` 按标签 id 直接渲染，删掉了 0.5.5 从页面经 `DesktopShell` 透传 `#home` / `#guide` 插槽的那条链路（知道「有哪些标签、当前激活哪个」的是窗口层）。主页 header 与 CTA 区各有入口指向 `/os`（i18n key `nav.desktopSimulation` / `home.ctaCards.os`，中英同构）。落点口径与理由见 [design/explorer-layout.md](./design/explorer-layout.md) §0 的「0.5.6 落点变更」。

> - **0.5.6 `Taskbar` + `SystemTray` 与 0.5.7 `StartMenu`（已落地，2026-10-16，两档合并交付）**：全部落 `apps/docs`（应用级组合）+ 一个下沉原语 `@fluere-vue/hooks/useFocusTrap`。**任务栏**（`shell-taskbar.vue`）扩成三段式 grid `auto / minmax(0,1fr) / auto`——最左开始按钮常驻、中间图标区（窗口入口 + 首页·组件·指南固定入口 + GitHub，数据源 `utils/shell-views.ts` 三处共用）、最右系统托盘；hover = `FluereButton subtle`、active 指示条 16×3 随窗口 / 视图状态点亮，固定入口点击走「还原窗口 + 打开标签」统一路径。**SystemTray**：时钟 = `utils/shell-clock.ts` 纯函数（`Intl.DateTimeFormat` 随 locale，zh 24h / en 12h + 日期两行，**4 条单测**），挂载后 15s 刷新、SSR 渲染空文本防水合不匹配、`--shell-tray-clock-w` 预留宽度防挂载平移；版本 / 语言 / 主题复用既有控件经 `shell-chrome.vue` 清单（**清单收窄为三个系统状控件**，GitHub 按语义拆到固定入口与主页 header 的 `GithubLink`，字形收敛 `components/github-mark.vue` 单份 path、地址收敛 `utils/docs-repo.ts`）。**站点 chrome 整体迁出窗口**：`#right-header` 与应用栏两处落点删除 ⇒ 按 A 级 `UpdateHeight()` 判据标题栏收为 **32（compact）**，窗口关闭 / 最小化也不再丢站点入口（历史实测数据保留在 `explorer-layout.md` §6.3）。**StartMenu**（`shell-start-menu.vue`，开始按钮 + 面板自包含）：面板几何逐条对齐 A 级 `MenuFlyout_themeresources.xaml`（tag `winui3/release/2.5.1`：`OverlayCornerRadius`=8 → `--borderRadiusXLarge`、`MenuFlyoutItemThemePadding` 11,8,11,9（11/9 无同值 token → 组件局部变量留痕）、`MenuFlyoutItemMargin` 4,2,4,2、条目状态色 Subtle* 三档、分隔线 DividerStrokeColorDefault）；背景 = Acrylic FallbackColor 纯色近似（**证据缺口**：真实合成 + 噪点归 0.9.2）；描边 `SurfaceStrokeColorFlyout`（亮 `#0F000000` / 暗 `#33000000`，取自 A 级 `Common_themeresources_any.xaml`）**补成 repo-token**，另补 `--zIndexStartMenu`=1600（§4 表与顺序断言同步）。**浮层焦点管理下沉**：`packages/hooks/src/use-focus-trap.ts`（Tab 陷阱用「聚焦尝试循环」跳过不可聚焦项、Esc + `onEscape`、点击 / 触摸外部 + 触发器排除、焦点归还含**外部点击抑制**与键盘再武装、`hasDocument()` 能力探测保 SSR 无副作用——该原语一并进 `@fluere-vue/utils`），**13 条单测**；开始菜单与托盘弹层是首批消费方，0.6 `MenuFlyout` 复用。**移动端（< 64rem）压缩布局按 2026-10-16 评审口径**：任务栏**全宽度常驻**（撤销 0.5.5 的整条隐藏）、开始按钮最左常驻、图标区两箭头编程滚动且**两套滚动条全隐藏**（`scrollbar-width:none` + webkit 伪元素，不挤压 48px 高度）、箭头仅在实测溢出时可见且**始终占位**（防「隐藏→放得下→仍隐藏」的测量死锁）、托盘只保时钟 + 展开按钮（其余控件进 `--zIndexMenu` 档弹层），窗口让出 `calc(100% - var(--shell-taskbar-h))`。三处口径已回写：`explorer-layout.md` §0 / §2 / §4 / §6、[apps/docs/README.md](../apps/docs/README.md)〈仿真边界〉与 i18n `shell.boundary.{scope,excluded}`（中英同构，**搜索一并去掉**：站内搜索属 0.6 `Ctrl+K`，不放坏按钮）。**评审确认的取舍**：布局为三段式而非「整排图标居中」；开始菜单条目只放真实可达四项（首页 / 指南 / 组件 = 打开窗口标签，GitHub = 外链），设计令牌与路线图页等 2.4 落地再补（不放占位死链，契约断言守住）；开合**零过渡动画**（缓动对齐 / 真实 Acrylic 按阶段 5 评审延后）。**闸门**：全仓 **1292 条单测 / 86 文件全绿**（其中外壳源码契约 **34 条**、时钟 4 条、`useFocusTrap` 13 条），`pnpm check` / `pnpm lint:ssr` / `pnpm i18n:check` 通过，`pnpm docs:generate` **116 条路由预渲染**（消息两语种真编译）。**真实浏览器实测 `temp/pw-shell-057.mjs`：72/72 全绿**（亮色起点、1440 桌面 + 390 移动，截图 `temp/visual-shell-057/` 四张明暗对照），抓到两个单测抓不到的真 bug 并已修：① **`FluereButton` 根自带 `display` 且注入更晚**，直接把断点显隐写在按钮上会在桌面档被覆盖（桌面档托盘展开按钮可见）——改为**外层 span 承担显隐**（与 `layouts/home.vue` 移动折叠按钮同一解法，已写进组件注释）；② **面板锚点差半高**：开始段高 = 按钮 32（居中在 48 内），`inset-block-end:100%` 会把面板向下嵌进任务栏 8px——段 `align-self: stretch` 拉满 + 根 `block-size:100%` 后面板正好贴任务栏上缘。**环境注记**：本机既有 dev server（用户 IDE 终端 13:05 启动）的**客户端模块缓存对 `packages/**` 失效**（`utils/src/ssr.ts` 的 `?t=` 变换停在旧版本、watcher 未再触发，`/os` 客户端 500 缺 `hasDocument` 导出；SSR 管线正常），实测改用 `pnpm docs:generate` 的静态产物 `python3 -m http.server` 承载（刷新其终端里的 dev server 即恢复）。

> - **0.5.7 任务栏图标按钮 + 开始徽标按参考图还原（已落地，2026-10-16 追加）**：用户提供三张 Windows 11 实机参考图（2560×48 任务栏 + 开始按钮 hover / pressed 特写），逐像素测量后改了六处，**不改验收口径、只改实现取值**（§4 的假设不变）。① **开始徽标**改用公开官方几何（Wikimedia Commons《Windows logo - 2021.svg》，方块 2311 / 缝 253 / 总 4875，在 24px 图标位下**整像素对齐**为 11 / 1 / 23 —— 官方比例原样渲染时缝隙被抗锯齿糊成两个半透明像素，而参考图缝隙像素是**纯背景色**）+ 强调色渐变（浅端 `--windowsAccentLight2` #4CC2FF / 深端 `--windowsAccentPrimary` #0078D4，方向 `(14,21)`：最小二乘拟合 56°、复算四角与实测逐角吻合），按下态转单色 + `scale(0.75)`（实测 23px → 17.25px）；② **热区 40×40 / 图标 24px / 槽距 4px / 任务栏左右内边距 12px、托盘右端 20px**（0.5.7 前是 40×32 / 20px 图标 / 2px 槽距 / 4px 内边距）；③ **hover / pressed 改用 WinUI 控件填充阶梯**（`--controlFillColorSecondary` / `--controlFillColorTertiary` + `--controlStrokeColorDefault` 1px 内描边，取自 A 级 `Common_themeresources_any.xaml`，三个 token 补进 `repo-tokens.json`；参考图合成值差 3.5 / 2 个灰阶、暗色下区分度显著优于 `Layer*` 家族），规则只在 `docs-shell.css` 写一份（覆写库读取的自定义属性 + `outline-offset:-1px`，**不 `!important`、不打特异性官司**）；④ **应用区向左紧贴开始按钮**（图标区 `justify-content: flex-start`；滚动箭头由「`visibility` 永久占位」改为「`display` 实测溢出才占位」——占位会让首应用热区凭空右移 32px）；⑤ **托盘右端留白对齐参考图**（时钟文本距屏幕右缘 20px = 内边距 12 + 「显示桌面」条固有占位 8，后者不实现按钮但保留间距）；⑥ **外壳内不再用原生 `title`**，一律 `FluereTooltip` —— 与 `--zIndexShell`(1500) 的旧冲突按 §4 方案① 的**正解**解决：外壳把自己登记进层级栈（`acquireLayer('--zIndexShell')`），外壳内浮层命中嵌套提升 ⇒ 实测 `.fui-tooltip` z-index = **1510**（未登记时 1400）；同时更正原文：**覆写 `--fui-tooltip-z` 无效**（提示面的 z 是 `useFlyout` 的内联样式）。**闸门**：全仓 **1297 条单测 / 86 文件全绿**（外壳源码契约 **39 条**，新增「命中区 / 状态色 / 徽标几何 / 无 title / 层级栈登记」五条小组契约）、`pnpm check`（含 `tsc` / `i18n:check`）通过；真实浏览器实测（`temp/shell-ref/pw-verify.mjs` + `pw-narrow.mjs`）：1600 宽下开始热区 12..52、首应用热区 56..96、槽 pitch 44、时钟右缘 1580（距右 20px）、箭头在 380 / 320 / 300 宽才出现且点一次滚动恰好一屏（`scrollLeft` = clientWidth）、页面无横向溢出；暗色实测 hover `rgba(255,255,255,.082)` / pressed `rgba(255,255,255,.031)`、提示面深底白字且 z=1510；与参考图同尺复算：徽标 23×23、方块 11 / 缝 1、渐变 dy/dx = **1.52 vs 参考 1.52**、四角 `#48befd / #269de9 / #148bdf / #0069cb` vs 参考 `#48cdfc / #25a3e9 / #138fde / #0065cb`。新增令牌 5 枚（`windowsAccentPrimary` / `windowsAccentLight2` / `controlFillColorSecondary` / `controlFillColorTertiary` / `controlStrokeColorDefault`，均带取值出处 note），`generated/*` 已重生成。

> - **0.5.8 窗口拖拽收敛改为「标题栏始终可见」（已落地，2026-10-16，UX 修复）**：0.5.5 的 `clampWindowOffset` 按「窗口整块不跑出桌面」**对称**收敛（`y ∈ ±(可用区高 − 窗口高)/2`），且没把静止位置（`--shell-desktop-margin` = 24）算进去 ⇒ 真实浏览器实测（1600×1000 视口、1120×720 窗口）暴露两个用户可见 bug：① 抓住标题栏**向下**拖到底时窗口下缘停在任务栏**上方 92px**（`win.bottom` 860 / 任务栏上缘 952），再也拖不动；② 抓住标题栏**向上**拖到底时标题栏整条跑到桌面之上（`title.top` = **−91**，窗口彻底抓不到，只能靠任务栏还原入口救回）。修复 = 换成语义正确的**单条不变量「标题栏必须完整可见」**（`containWindowOffset`，纯函数）：**纵向放开**（顶端条带 = 描边 + 标题栏 = 33px 落在桌面工作区内 ⇒ 下拖到标题栏被任务栏挡住为止、窗口本体挂在任务栏之下；上拖到窗口上缘贴桌面顶端）；**横向不放开**（标题栏横跨窗口整宽 ⇒「横向完整可见」等价于「窗口整块在桌面内」—— 实测放开后 1120px 窗口拖到左边界只留 48px 时，那 48px **恰好整条是 nodrag 的 caption 按钮区**，窗口会「拖得出去、拖不回来」，故取更强的那条）。另外两处必须一起做的：ⓐ **拖拽改按增量位移收敛**（`deltaX/deltaY` + 收敛后回写锚点）—— 累计口径下撞边界后反向拖拽要先抵消越界量，Web 里指针能跑到视口任意位置，实测死区可达数百像素；ⓑ **视口（宿主）变化后重新收敛**（`ResizeObserver` + `window.resize` 双信号 ⇒ 桌面上原先合法的位移在视口压矮后会把标题栏顶出工作区，窗口彻底消失；这是 Web 独有风险，实机由窗口管理器兜底）。几何量（窗口尺寸 / 静止位置 = `rect − offset` / 标题栏下缘）一律**实测**，不在 TS 里重算 CSS 公式。**来源与证据缺口**：Windows 窗口移动由系统窗口管理器实现，`microsoft-ui-xaml` 无对应源码；口径来自用户 Windows 11 实机观察 + Win32 move loop 的逆向实现交叉验证（Wine `dlls/win32u/defwnd.c#sys_command_size_move`：光标钳在工作区内、下边界再内缩一个 `caption_height`），两条差异（锚点 vs 标题栏矩形、横向为何不放开）**逐条明写**在 `containWindowOffset` 注释与 [design/explorer-layout.md](./design/explorer-layout.md) §1.1。**闸门**：`shell-window-state.test.ts` 29 条（含边界算式逐条推导、幂等、resize 收敛、区间反转、NaN 防护）+ 外壳源码契约 3 条（增量位移 / 双 resize 信号 / 几何量实测）；真实浏览器实测 `temp/pw-shell-drag.mjs` **17/17 全绿**（截图 `temp/visual-shell-drag/`，含「撞边界后反向 60px ⇒ 立刻上移 60px」「压矮视口后标题栏紧贴任务栏上缘 560..592」两条行为断言）。

**里程碑**：能打开一个空 Explorer 窗口，导航可折叠、视图可切换，`/os` 可挂载桌面外壳。

> **0.5.0 发布记录（2026-10-16，`0.5.0-alpha.1`，全程实测）**：代码侧完成后按 [fluere-release 技能](../../.dsh/skills/fluere-release/SKILL.md) 收口，版本算术先用一次性副本演练（seed `0.5.0-alpha.0` + `patch` changeset → 根与六包同为 `0.5.0-alpha.1`）。
>
> | 环节              | 实测结果                                                                                                                                                                                                                                                                                                                         |
> | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
> | 前置记录修补      | 3.5〈自动发版流程〉回写为已完成（含 0.4.0 / 0.4.1 两次 CI 自动发布与 OIDC provenance 证据）；版本地图与本章 0.5.8 / 0.5.9 两行补齐                                                                                                                                                                                               |
> | changeset         | `.changeset/bright-walls-cheer.md`（六包 `patch`，正文 = 0.5.0 对外变更），已随 release 分支消费进 `.changeset/pre/`                                                                                                                                                                                                             |
> | GitHub release PR | [PR #6](https://github.com/Altermoe/fluere-vue/pull/6)（`changeset-release/main`）；`version` run [38892736249](https://github.com/Altermoe/fluere-vue/actions/runs/38892736249) bump 六包到 `0.5.0-alpha.1`，分支上根 + 六包版本逐条核对一致 ⇒ 快进合并为发布提交 **`d08d55c`**                                                 |
> | npm 自动发布      | `Release` run [38893392741](https://github.com/Altermoe/fluere-vue/actions/runs/38893392741)：`select-mode` 判 `publish` → `pack` + `publish` 全绿（OIDC，无 `NPM_TOKEN`）；六包 `0.5.0-alpha.1` 版本端点全 **200**，`alpha` dist-tag 指向它，`latest` 仍停在 `0.3.0-alpha.2`（预期）；每包 `/-/npm/v1/attestations` 各 2 份证明 |
> | git tag           | 六个逐包 tag `@fluere-vue/<pkg>@0.5.0-alpha.1` 由 `changeset publish` 建于 `d08d55c`；部署注解 tag `v0.5.0-alpha.1` 手工打于同一提交                                                                                                                                                                                             |
> | OneDev CI/CD      | 分支 4 job（build #104 / test #105 / package-smoke #106 / check #107）与 tag 5 job（build #108 / check #109 / test #110 / package-smoke #111 / deploy #112）**全绿**；`deploy` 日志含 `[deploy] 健康检查通过：v0.5.0-alpha.1 已上线`                                                                                             |
> | 文档站            | `https://fluere-vue.nahida.space/` 与 `/en` 均 200，`docsVersion:"v0.5.0-alpha.1"`                                                                                                                                                                                                                                               |
> | git refs          | GitHub 与 OneDev 的 `main`、`v0.5.0-alpha.1`、六个逐包 tag 全部指向 `d08d55c`                                                                                                                                                                                                                                                    |
>
> 本次新踩到的两个 OneDev push 陷阱（403 的两种成因：`GIT_ASKPASS` 用户名非真实用户、反代拒绝带 `Content-Length` 的 POST 体）已记进 [docs/release.md](./release.md) 与技能踩坑清单。

### 0.6.0 · 地址栏 + 命令层（≈ 17 点）

| #     | 内容                                                                    | 档位  | 验收要点                                                                                             |
| ----- | ----------------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------- |
| 0.6.1 | `MenuFlyout` 族（Item / SubItem / Separator / ToggleItem + 子菜单浮层） | XL 6  | 子菜单不被父菜单遮挡（依赖 0.4.2 的刻度）；键盘完整（方向键 / Esc / Home / End）；展开收起动效走令牌 |
| 0.6.2 | `ContextMenu`（右键定位 + 键盘）                                        | M 2.5 | 复用 0.6.1，不重复实现定位                                                                           |
| 0.6.3 | `DropDownButton`                                                        | S 1.5 | 勾掉本文档第 16 项                                                                                   |
| 0.6.4 | `SplitButton`（含「新建 ▾」的双击区分离）                               | M 2.5 | 主区与箭头区命中区分离且各自可达                                                                     |
| 0.6.5 | `BreadcrumbBar`（`> _ >` 折叠规则 + 下拉可展开）                        | L 3.5 | 折叠判据按实际测量而不是固定断点                                                                     |
| 0.6.6 | `SearchBox`（Input + 内嵌图标位）                                       | S 1   | 可访问名与清除按钮行为明确                                                                           |

**里程碑**：地址栏面包屑可点、命令栏下拉可打开、右键能出菜单。

### 0.7.0 · 数据层 ①：项基座 + 列表（≈ 20.5 点）

> 本版是整条线上**唯一没有底座可借**的部分（reka 无框选、无 WinUI 列表项语义），也是最容易被低估的一版。`ItemContainer` 必须先抽：它被 ListView / GridView / NavigationView / Combobox 四处共享，不抽就会出现四套互相漂移的列表状态。

| #     | 内容                                                                      | 档位  | 验收要点                                                          |
| ----- | ------------------------------------------------------------------------- | ----- | ----------------------------------------------------------------- |
| 0.7.1 | `ItemContainer`（rest / hover / pressed / selected / 焦点矩形，四处共享） | L 4   | 状态表与 WinUI `ListViewItem` 模板逐条对照；焦点矩形复用 0.4.3    |
| 0.7.2 | `useSelection`（单选 / 多选 / Ctrl / Shift 区间）                         | L 3   | 与 `SelectionModel` 语义对齐；纯函数层可独立测试                  |
| 0.7.3 | `useMarqueeSelection`（橡皮筋框选）                                       | L 4   | **reka 无底座，必须自研**；与自动滚动、Shift 区间叠加的行为需明确 |
| 0.7.4 | `ListView`（详情模式 + 键盘 + 拖拽骨架）                                  | XL 6  | 键盘（方向 / 空格 / Ctrl+A / Shift 区间）完整                     |
| 0.7.5 | `GridView`（图标模式 + 磁贴布局）                                         | L 3.5 | 与 ListView 共享 0.7.1 与 0.7.2                                   |

### 0.8.0 · 数据层 ② + 布局收尾（≈ 16.5 点）

| #     | 内容                                                           | 档位  | 验收要点                                     |
| ----- | -------------------------------------------------------------- | ----- | -------------------------------------------- |
| 0.8.1 | `DetailsPane`（预览空态 + 元数据表）                           | L 3.5 | 无预览时的空态可读、可操作                   |
| 0.8.2 | `StatusBar`（「N 个项目，已选 M 个」）                         | S 1   | 文案走 i18n key（与 0.3 目标 1 对齐）        |
| 0.8.3 | `CommandBar`（命令栏 + 溢出「▾」+ compact 模式 + 键盘）        | XL 6  | 溢出判据按实际测量；compact 断点行为记录理由 |
| 0.8.4 | `Splitter` / `GridSplitter`（复用 reka Splitter）              | M 2   | 键盘可调整；最小尺寸约束明确                 |
| 0.8.5 | `Expander`（复用 reka Collapsible）                            | S 1   | 展开收起动效走令牌                           |
| 0.8.6 | Explorer 组装：图标 / 详情双视图切换（走 `ToggleGroup`）+ 空态 | L 3   | 视图切换状态可保持                           |

### 0.9.0-rc.1 · 质感分支（≈ 24 点，独立 minor）

> **边界（硬约束）**：本版**只做「已定型组件的材质与动效深化」，不引入任何新组件**。否则质感版会变成第二个功能版，永远做不完。
>
> **顺序（硬约束）**：本版必须排在 Explorer 功能完成之后、RC 发布之前。若把质感排到 RC 之后，RC 展示的将是一个尚未打磨的窗口，与「首页第一眼」的目标自相矛盾。

| #     | 内容                                                                                                       | 档位 | 验收要点                                                      |
| ----- | ---------------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------- |
| 0.9.1 | Mica：窗口背景的 Web 近似（令牌化渐变 + 半透明层）                                                         | L 4  | 禁止 `backdrop-filter` 魔法值；明暗两态无「白闪」             |
| 0.9.2 | Acrylic：菜单 / 导航面板 / 开始菜单 / 任务栏的材质合成 + 噪点层                                            | XL 5 | 质感与 WinUI 实机对照；对比度达标                             |
| 0.9.3 | 焦点矩形统一铺开：MenuFlyout / NavigationView / TabView / ListView 四族对齐 `FocusVisualPrimary/Secondary` | L 3  | 四族表现一致，无各写一套                                      |
| 0.9.4 | 动效逐帧核对：菜单展开收起、窗口打开关闭、导航折叠、视图切换                                               | L 4  | 全部走 `curve*` / `duration*` 令牌；关键帧对照 LottieGen 产物 |
| 0.9.5 | 明暗 + 高对比度对比度复核                                                                                  | M 2  | HC 若暂不实现必须明确标注                                     |
| 0.9.6 | 性能预算复核：`backdrop-filter` 覆盖面积、首屏 JS / CSS                                                    | M 2  | 低端设备滚动流畅                                              |
| 0.9.7 | Explorer 完成版组装 + `/os` 呈现（含移动端降级为全屏无边框）                                               | L 4  | 1280 / 1440 / 1920 与移动端均不溢出、不重叠                   |

**里程碑**：`/os` 即是可交互的 Explorer 仿真窗口（仿真边界已标注）；站点主页（`/`）是常规营销页，header 与 CTA 区各有入口指向 `/os`。

### 人工校验闸门（0.4.0 起生效）

自 0.4.0 起，**校验是每个组件 PR 的合并闸，不是某个版本阶段的活**。任一组件 PR 必须同时满足以下四条才允许合并：

- [ ] **四件套完整**：SFC + 契约测试 + 文档页（`apps/docs/content/components/*.md`）+ 示例（`apps/docs/components/content/demos/*/`）
- [ ] **规格出处**：控制名 + `microsoft-ui-xaml` tag / commit + 关键文件路径，写入组件注释
- [ ] **测量证据**：动效 / 几何类改动给出可复现的测量（冻结帧 + 像素角度或取色），方法见 `docs/style-spec.md` §7
- [ ] **闸门全绿**：`pnpm check` / `pnpm test` / `pnpm lint:ssr`

**跨组件基建额外要求一次专项复核**（它们出错会污染下游全部组件，不接受「跟着某个组件顺手合并」）：

| 基建项                                 | 专项复核要点                                                         | 所属版本 |
| -------------------------------------- | -------------------------------------------------------------------- | -------- |
| `useFlyout`                            | 关闭路径全覆盖；焦点归还；SSR 与水合一致；现有三套实现的迁移是否彻底 | 0.4.0    |
| z-index 刻度                           | 是否存在组件内硬编码残留（现 Combobox 仍有 `z-index: 1000`）         | 0.4.0    |
| `useFocusVisual`                       | 双层矩形的明暗 / 高对比度表现                                        | 0.4.0    |
| `ItemContainer`                        | 状态表与 WinUI `ListViewItem` 模板逐条对照                           | 0.7.0    |
| `useSelection` / `useMarqueeSelection` | 与自动滚动、Shift 区间、键盘选择的叠加行为                           | 0.7.0    |

### 发布检查（0.4.0 起，每个 minor 版本执行）

- [ ] 里程碑可验证：该版本的「里程碑」一句能被外部人复现（不是「看起来完成」）
- [ ] 人工校验闸门：本版所有组件 PR 的四条闸门已逐条执行（含跨组件基建的专项复核）
- [ ] `pnpm check`（lint + format + tsc）
- [ ] `pnpm test` / SSR smoke（`packages/ui/src/__tests__/ssr-smoke.test.ts`）
- [ ] `pnpm lint:ssr`
- [ ] 文档站示例 + API 表已更新；过时注释与旧结论已清理
- [ ] 组件进度表（README）与 `packages/ui/README.md` 与该版本实际实现一致
- [x] 仿真边界文案在文档站可见（不把「仿真」写成「还原系统能力」）—— **2026-10-16 随 0.5.5 达成**，**0.5.6 落点随仿真迁移**：`/os` 桌面窗口的「首页」视图末尾可见《WindowsOS 仿真边界》三段（仿真到什么程度 / 明确不做 / 移动端降级），文案事实源是 [apps/docs/README.md](../apps/docs/README.md)〈WindowsOS 仿真边界〉，i18n key `shell.boundary.{title,lead,scope,excluded}` 中英同构；渲染条件为 `components/home/home-content.vue` 的 `variant="desktop"`（主页那份不带该段），断言见 `apps/docs/utils/__tests__/shell-style-contract.test.ts`
- [ ] 未把 `temp/` 下的快照、脚本、截图提交进仓库

---

## 0.9 → 1.0.0 · 收尾窗口（4–8 周，不排新功能）

> **定位**：不是「首次通读全部代码」，而是**跨组件复查 + 审计 + 外部验证**。0.4–0.9 将新增 40 余个组件条目，`packages/ui/src` 与契约测试体量都将翻倍以上；逐行对照 WinUI 源码式的校验速度远低于写代码的速度，一次性窗口吞不下这个体量，且若统一推迟到这里才做首次校验，0.4–0.8 的组件等于**未经人眼确认就已定型**，一旦查出结构性偏差，返工范围会是整批而不是单个 PR。因此人工校验**逐 PR 执行**（见《人工校验闸门》），本窗口只承担跨组件与全局性的工作。

- [ ] 跨组件复查：`useFlyout` 的生命周期、焦点归还、SSR 一致性各审计一遍
- [ ] 跨组件复查：`ItemContainer` 的状态表与 WinUI `ListViewItem` 模板逐条对照
- [ ] 重复代码抽离：盘点并合并各组件内的重复实现（浮层定位、焦点管理、状态变量别名、测试辅助）
- [ ] 外部消费者验证：Vite SPA / Nuxt SSR / 纯类型引用（`vue-tsc` 无错）三个场景走通（与 0.3 目标 3 的验收条件一致）
- [ ] 全仓 `pnpm check` / `pnpm test` / `pnpm lint:ssr` 全绿；`docs:generate` 产物双语言验证
- [ ] 收口文档：README 组件进度表、`packages/ui/README.md`、文档站版本展示与实际实现逐条对齐
- [ ] 冻结 1.0.0 范围：未完成项明确移出并记录（禁止用「看起来达标」的口径收尾）
