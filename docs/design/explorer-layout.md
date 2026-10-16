# Explorer 外壳布局假设（0.5.0 锁定）

> 状态：**0.5.0 已锁定**（2026-10-14）。本文档是 `docs/todo.md`《0.5.0 · Explorer 骨架》明文要求「必须先在 0.5.0 定下来」的五项布局假设的**唯一事实源**。
>
> 依据：`docs/todo.md` 0.5.0 节（第 391–409 行）、[AGENTS.md](../../AGENTS.md)〈交互与弹层组件约定〉、[docs/style-spec.md](../style-spec.md)、[docs/ssr-guide.md](../ssr-guide.md)。规格源 = `microsoft-ui-xaml` tag **`winui3/release/2.5.1`**（commit `ba3a8d5`）。
>
> **变更流程**：五项假设一旦改动，必须**先回写本文档**（含新的证据出处）再改代码；实现对不上本文档时以本文档为准，除非同时给出 A 级源码反证。

## 0. 范围与归属

| 层                       | 落点                                               | 本期版本    | 说明                                                                       |
| ------------------------ | -------------------------------------------------- | ----------- | -------------------------------------------------------------------------- |
| 窗口层                   | `packages/ui/src/app-window/`（`FluereAppWindow`） | 0.5.1 ✅    | 只画外框与标题栏，位置 / 尺寸 / 层级由外壳给                               |
| 内容容器                 | `packages/ui/src/tab-view/`（`FluereTabView`）     | 0.5.3       | 窗口内的视图切换                                                           |
| 导航面板                 | `packages/ui/src/navigation-view/`                 | 0.5.4       | 左侧可折叠导航                                                             |
| 壁纸 / 任务栏 / 开始菜单 | `apps/docs/components/shell/` + `apps/docs/data`   | 0.5.5–0.5.7 | **应用级组合**，不进 `packages/ui`（见 `apps/docs/README.md`〈构件归属〉） |

> 「Explorer 窗口」= 壁纸层 → 窗口层（`FluereAppWindow` = 标题栏 + 内容区）→ 任务栏层。窗口内容本期挂三个视图：首页（与站点主页共用的营销内容）、组件（注册表卡片网格）、指南（两个起步入口），由 `explorer-window.vue` 按标签 id 分派；文档内页布局不动。

> **0.5.6 落点变更（2026-10-16）**：仿真从站点主页迁到**独立路由 `/os`**（`pages/os/index.vue` + `layouts/os.vue`），站点主页（`/`）回到常规营销页（`layouts/home.vue` + `components/home/home-content.vue`）。
>
> 变更理由与影响：
>
> 1. **仿真是独立章节，不是主页的装饰**。0.5.5 让主页整屏承担仿真的全部布局约束（视口锁定、无悬浮 header、窗口内滚动），此后每加一层仿真（0.5.6 任务栏图标组 / 0.5.7 开始菜单 / 0.6+ 地址栏）都要先说服「主页也适用」。独立路由后仿真可以在自己的布局里自由演进，主页按营销页的常规口径排版。
> 2. **营销内容不重复**：`components/home/home-content.vue` 同时服务主页与窗口「首页」视图，`variant="desktop"` 决定是否附上《WindowsOS 仿真边界》三段 —— 这段口径**跟随仿真本身**，因此只在 `/os` 出现（`apps/docs/README.md`〈WindowsOS 仿真边界〉仍是文案事实源）。
> 3. **本文件 §1–§5 的五项布局假设不变**：它们约束的是窗口层与桌面层本身，与「挂在哪条路由」无关。§6.3 的站点 chrome 两处落点也不变，只是控件清单（`shell-chrome.vue`）多了一个消费方（主页 header）。
> 4. **仿真边界仍是可见文案**（docs/todo.md《发布检查》）：落点从「首页窗口内」改为「`/os` 窗口内」，断言随之更新（`apps/docs/utils/__tests__/shell-style-contract.test.ts`）。
>
> ⚠️ 与 `docs/todo.md` 的关系：该文件把「文档站首页第一眼即 Explorer 仿真窗口」写成 0.9.7 的呈现目标。本次迁移**改变了这个呈现口径**（第一眼是常规营销主页，仿真在 `/os`，主页 header 与 CTA 区各有入口）—— 已同步回写该文件的对应表述，验收要点（不溢出 / 不重叠 / 移动端降级 / 边界可见）不变。

> **0.5.7 落点变更（2026-10-16）**：任务栏从「最小可用占位」扩成完整三段式（开始 / 图标区 / 托盘），并把站点 chrome（版本 / 语言 / 主题）从窗口标题栏与应用栏**收进任务栏托盘**；GitHub 按语义拆到中间固定入口。两条口径随之改变：
>
> 1. **任务栏全宽度常驻**（0.5.5 曾在移动档 `display: none`）：窄视口改用压缩布局（开始按钮常驻、图标区箭头滚动且不出原生滚动条、托盘保时钟并把其余图标收进展开菜单）；窗口在移动档为它让出 `calc(100% - var(--shell-taskbar-h))`。§2 的降级段与 §4 已按此回写。
> 2. **站点 chrome 不再落窗口内**：`#right-header` 不再占位 ⇒ 按 A 级 `UpdateHeight()` 判据，标题栏随 Content / LeftHeader / RightHeader 全空收为 **32（compact）**（icon / title 不参与判据）。§6.3 的历史实测保留作为「为什么曾经拆两处」的证据，但两处落点已删除。
>
> 构图细节与交互口径见 `apps/docs/components/shell/{shell-taskbar,shell-start-menu,shell-chrome}.vue` 文件头。

## 1. 窗口圆角与阴影

**假设**：窗口层**只能用 `FluereAppWindow` 的既有口径**，外壳不得再写圆角 / 阴影 / 描边值。

| 量       | 取值（桌面）                       | 最大化时                       | 证据                                                                        |
| -------- | ---------------------------------- | ------------------------------ | --------------------------------------------------------------------------- |
| 圆角     | `var(--borderRadiusXLarge)`（8px） | `var(--borderRadiusNone)`（0） | DWM 窗口圆角；`app-window.vue` 头注释 + `constants.ts`（B 级近似，无 XAML） |
| 阴影     | `var(--shadow64)`                  | `none`                         | 同上（窗口阴影由 DWM 绘制，属 B 级近似）                                    |
| 描边     | `1px var(--colorNeutralStroke2)`   | 不变                           | `SurfaceStrokeColorDefault` 的既有映射（ΔE 见表）                           |
| 窗口底色 | `var(--colorNeutralBackground2)`   | 不变                           | `SolidBackgroundFillColorBase` 的既有映射                                   |

- **消费口径**：`DesktopShell` 给窗口一个**确定尺寸**（`width` / `height` 或 `inset`），窗口自身 `position: static`、不写 `z-index`；层级由外壳按 `--zIndexWindow`（0）摆放，落在壁纸层之上、任务栏层之下。
- **最大化**：`maximized` 时窗口铺满可视区（`inset: 0` + `border-radius: 0`），任务栏仍可见（Windows 11 默认任务栏不自动隐藏）——外壳负责几何，组件只负责圆角 / 阴影归零。
- **不允许**：给窗口叠第二层自绘阴影 / 渐变描边来「增强质感」（会与 DWM 语义冲突，且没有 A 级来源）。

## 2. 内容区滚动边界

**假设**：**滚动发生在窗口内容区内部**，桌面层（壁纸 / 任务栏 / 窗口框）不随滚动移动。

```
viewport
├─ 壁纸层        position: fixed（不滚动）
├─ 窗口层        position: absolute（不滚动）
│  ├─ 标题栏     固定
│  └─ 内容区     ← 滚动边界在这一层（FluereScrollView）
└─ 任务栏层      position: fixed（不滚动）
```

理由与证据：

1. `FluereAppWindow` 的内容区**只控制可视区域**（`overflow: clip` + `min-block-size: 0`），源码注释明确「滚动交给消费方」；窗口尺寸由消费方给 ⇒ 只有内容区有确定高度，才谈得上内部滚动。
2. 真实 Explorer 的滚动条属于窗口内容，不属于桌面；把整页做成滚动会让任务栏 / 壁纸跟着走，仿真边界立刻破。
3. 与文档站现状的关系：`apps/docs/layouts/components.vue`（文档内页）与 `apps/docs/layouts/home.vue`（站点主页）的 **`FluereScrollView` 整页滚动口径适用于站点页面**；`/os` 窗口「首页」视图的内容另起一个 `FluereScrollView`（窗口内滚动，见 `explorer-window.vue` 的 `__panel-scroll`）。

**降级**：视口 < `lg`（1024px）时外壳降级为「全屏无边框窗口 + 页面滚动」（移动端不仿桌面，见 todo〈仿真边界〉）；此时窗口内容不再单独滚动，交给页面滚动。降级判据用 `useMediaQuery` / 能力探测，**不在 `setup()` 里直接读 `window`**（[docs/ssr-guide.md](../ssr-guide.md)）。

> **0.5.5 落地时的偏离记录（2026-10-16）**：降级为「移动档」时，实际实现**保留窗口内滚动**，未改为页面滚动；同时降级判据改用 **CSS 断点**（`@media (max-width: 63.999rem)`）而不是 `useMediaQuery` 参与渲染。
>
> 偏离原因是一条硬约束与一条水合约束：
>
> 1. `FluereScrollView` 的 presenter 是**绝对定位**，宿主必须有**确定高度**才滚得动（`packages/ui/src/scrollview` 与 `layouts/components.vue` 的同款注释）。若移动档改为页面滚动，就得把内容渲染器换成非 ScrollView 的实现 ⇒ 服务端与客户端会渲染出**不同的 DOM 结构**，除非再做一层同构的高度测量，收益不抵复杂度。
> 2. 视口判据在 SSR 下拿不到真实值（`useMediaQuery` 恒返回 `false`），若用它决定渲染什么，首帧必然与水合结果不一致 ⇒ 水合不匹配告警。用 CSS 断点则结构一致。
>
> 用户可见结果与本节原意一致（都能滚动看到全部内容），且 0.5.0 的验收要点「移动端不溢出不重叠 / 降级为全屏无边框」完全满足：实测 390px 视口下窗口铺满视口宽、无横向溢出。`useMediaQuery` 仍在使用，但**只做副作用**（退到移动档时复位窗口拖拽位移），不参与渲染。
>
> **0.5.7 修订**：移动档**任务栏不再隐藏**，改为压缩常驻（开始按钮常驻 / 图标区箭头滚动 / 托盘保时间，见 `shell-taskbar.vue` 文件头）。窗口形态仍是「全屏无边框」，但高度让出任务栏：`block-size: calc(100% - var(--shell-taskbar-h))`。上一段的降级判据（CSS 断点、不把视口判据接进渲染）不变；`desktop-shell.vue` 里「移动档隐藏任务栏」的 `@media` 已删除，契约测试改为**反向断言**（外壳里不许再出现针对任务栏的隐藏规则）。

## 3. 导航面板折叠宽度

**假设**：`FluereNavigationView` 采用 WinUI `NavigationView` 的 **Expanded（320）/ Compact（48）** 两档；本期外壳不进入 Minimal 档（见下）。

| 档位     | 面板宽 | 面板内条目形态                                   | 来源                                                                      |
| -------- | ------ | ------------------------------------------------ | ------------------------------------------------------------------------- |
| Expanded | `320`  | 图标 + 文字 + 展开箭头                           | `OpenPaneLength` 缺省 `320.0` —— `NavigationView.idl:159/198`             |
| Compact  | `48`   | 仅图标（图标盒 `NavigationViewIconBoxWidth` 40） | `CompactPaneLength` 缺省 `48.0` —— `NavigationView.idl:195`；主题资源同值 |
| Minimal  | `0`    | 面板浮层化（不在布局里占位）                     | 同上源码；DisplayMode 判据 `NavigationView.cpp:1457`                      |

DisplayMode 判据（`NavigationView.cpp:1445-1470`，`PaneDisplayMode = Auto` 时）：宽度 ≥ `ExpandedModeThresholdWidth`（1008）→ Expanded；`0 < 宽度 < CompactModeThresholdWidth`（641）→ Minimal；其余 → Compact。两个阈值缺省值来自 `NavigationView.idl:176/179`。

- **本期取舍**：窗口宽度在桌面档（≥ 1280）恒 ≥ 1008 ⇒ Expanded；窗口收窄到 Compact 仍可用；**Minimal 面板浮层不实现**（浮层焦点管理属 0.5.7 `useFocusTrap` 范围），窄窗口直接用 Compact。这条取舍写进 0.5.4 组件注释。
- **令牌**：两档宽度落 `--navigationPaneExpandedWidth` / `--navigationPaneCompactWidth`（本节新增，见 §6），组件内声明 `--fui-navigation-view-*` 局部变量并引用它们。
- **动效**：展开 / 收起按 `NavigationView.cpp` 的关键帧对齐（时长 / 缓动走 `--duration*` / `--curve*` 令牌），`prefers-reduced-motion` 下瞬时切换且保留合理静态形态。

## 4. 任务栏高度与层级

**假设**：任务栏高 **48px**（100% 缩放），层级引用 `--zIndexShell`（1500）；开始菜单是**比任务栏更高的一档**，`--zIndexStartMenu` = **1600**（0.5.7 已按本节补入 `repo-tokens.json`，顺序断言同步更新）。

| 层                | 令牌                  | 值   | 说明                                                                                                                          |
| ----------------- | --------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------- |
| 壁纸              | `--zIndexWindow` 之上 | 0    | 壁纸不建层，直接作为 shell 根背景                                                                                             |
| 桌面窗口          | `--zIndexWindow`      | 0    | 窗口自身不叠在别的东西之上                                                                                                    |
| 窗口内容浮起面    | `--zIndexContent`     | 100  | 窗口内容区内部的浮起表面（非浮层档位）                                                                                        |
| 任务栏            | `--zIndexShell`       | 1500 | 固定底边；`position: fixed` + `inset-block-end: 0`                                                                            |
| 开始菜单（0.5.7） | `--zIndexStartMenu`   | 1600 | 必须盖过任务栏与窗口；面板挂在任务栏子树内（由 `--zIndexShell` 的叠放上下文承载），令牌同时锁定档位、防未来独立成层时回退裸值 |

- **高度令牌**：`--shellTaskbarHeight` = `48`（本节新增，`repo-tokens.json` 的 `sources.shellGeometry` 记录）。**证据缺口**：Windows 任务栏由系统外壳绘制，`microsoft-ui-xaml` 无任何对应资源，48 为 Windows 11 100% 缩放的实测值；DPI 缩放 / 小任务栏模式下需覆写。覆写方式：外壳在根节点写 `--shellTaskbarHeight: <px>`（任务栏与为它预留的 `padding-block-end` 都读同一个变量）。
- **与 ToolTip 档的关系（已知冲突，0.5.6 裁决 = 方案①，2026-10-16 回写）**：`--zIndexTooltip` = 1400 **低于** `--zIndexShell` = 1500（顺序断言见 `packages/designs/src/repo-tokens.test.ts`）。**裁决**：保留刻度不动；**外壳（任务栏 / 开始菜单 / 托盘弹层）内一律不挂 `FluereTooltip`，只用原生 `title` 属性**（0.5.6–0.5.7 落地时已照此实现）。将来确需在外壳里挂 ToolTip，按方案① 由该处覆写 `--fui-tooltip-z: calc(var(--zIndexShell) + var(--zIndexStep))`；方案②（抬高 `--zIndexTooltip` 全局档位）仍属备选，动它必须同步改 `repo-tokens.json`、AGENTS.md 的刻度描述与顺序断言。**不得**在应用里写裸 z-index 绕过。
- **任务栏布局（0.5.6 定稿，三段式）**：`grid-template-columns: auto minmax(0, 1fr) auto` —— 最左开始按钮、中间图标区（可收缩、箭头滚动）、最右托盘；窄视口只压中间段。图标命中区 40×32（`FluereButton medium` + `min-inline-size: 40`）、激活指示条 16×3（`--borderRadiusCircular` + `--colorBrandBackground`）、滚动箭头 32×32。**证据缺口**：Windows 任务栏几何由系统外壳绘制，`microsoft-ui-xaml` 无对应资源 —— 以上均为应用层构图，覆写口 = 组件类名下的 token 引用（无硬编码数值进样式）。
- **移动端压缩布局（0.5.7）**：箭头仅在图标区**实测溢出**时可见（`visibility` 切换、占位不变，测量前提稳定）；图标区滚动条全部隐藏（`scrollbar-width: none` + `::-webkit-scrollbar { display: none }`，避免 48px 定高被挤压）；托盘 `< 64rem` 收起内联控件组、保留时钟与展开按钮。

## 5. 桌面壁纸层的令牌化方案

**假设**：壁纸层**只用 `@fluere-vue/designs` 的材质令牌做纯色 / 渐变近似**，禁止 `backdrop-filter` 魔法值；真实材质合成（Mica 采样、噪点）归 0.9.1 / 0.9.2。

| 方案         | 令牌                                                           | 用法                                                                  |
| ------------ | -------------------------------------------------------------- | --------------------------------------------------------------------- |
| 基线（浅）   | `--micaBackgroundFillColorBase`（`#f3f3f3`）                   | 壁纸底色 = Mica 的纯色基准（Mica 不可用时的 Fallback）                |
| 基线（深）   | 同上（暗 `#202020`）                                           | 由 `light-dark()` + `color-scheme` 自动切换，**不写两套规则**         |
| 层次感       | `--micaBackgroundFillColorBaseAlt`（`#dadada`/`#0a0a0a`）      | 与 Base 合成一层**线性渐变**（角度 / 停靠点写在外壳，且只能用令牌值） |
| 窗口在壁纸上 | `--layerFillColorDefault` / `--cardBackgroundFillColorDefault` | 需要额外浮起表面时使用（窗口本体走 §1）                               |

- **为什么不用 `backdrop-filter`**：① 仓库里没有 Mica 的采样 / 合成参数（A 级源码树只给 FallbackColor），凭 `blur()` 凑等于猜值；② `backdrop-filter` 在 SSR / 无合成层场景有性能与兼容性风险。0.9.1 会以真实参数重做，本期只做「有明暗、有层次、值全部来自令牌」的静态近似。
- **渐变表达式**：外壳里形如 `background-image: linear-gradient(160deg, var(--micaBackgroundFillColorBaseAlt), var(--micaBackgroundFillColorBase) 60%)`。角度与停靠点是**构图参数**（无 WinUI 来源），必须写注释并允许覆写 `--shell-wallpaper-*` 局部变量；**色值一律引用令牌**。
- **禁止**：从截图取色、写 `#RRGGBB` 字面量、给壁纸加 `filter: blur()` 造「景深」。

## 6. 本次新增的令牌

`packages/designs/data/repo-tokens.json`（生成物 `generated/tokens.css` / `preset-fluent.ts` / `token-names.ts` 同步重生成）：

| 令牌                            | 值                                            | 来源 / 缺口                                                                                                                                                                                                       |
| ------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--navigationPaneExpandedWidth` | 320                                           | WinUI `OpenPaneLength` 缺省（`NavigationView.idl:159/198`，tag `2.5.1`）                                                                                                                                          |
| `--navigationPaneCompactWidth`  | 48                                            | WinUI `CompactPaneLength` 缺省（`NavigationView.idl:195`）                                                                                                                                                        |
| `--shellTaskbarHeight`          | 48                                            | **证据缺口**：Windows 外壳不在 `microsoft-ui-xaml` 里；48 = Windows 11 100% 缩放实测值                                                                                                                            |
| `--zIndexStartMenu`             | 1600                                          | 0.5.7 按 §4 补入（盖过任务栏 1500 与窗口 0）；顺序断言已加该档                                                                                                                                                    |
| `--surfaceStrokeColorFlyout`    | 亮 `rgba(0,0,0,0.059)` / 暗 `rgba(0,0,0,0.2)` | WinUI `SurfaceStrokeColorFlyout`（亮 `#0F000000` / 暗 `#33000000`，`Common_themeresources_any.xaml` tag `2.5.1`；`MenuFlyoutPresenterBorderBrush` 引用它）—— Fluent 表无同值档，0.5.7 开始菜单 / 托盘弹层描边消费 |

### 6.1 应用层构图参数（0.5.5 落地，**不进 `packages/designs`**）

以下值**没有 A 级 WinUI 来源**（Windows 桌面外壳不在 `microsoft-ui-xaml` 里），属于「我们的演示桌面长什么样」的构图决定，不是控件规格。按 [apps/docs/README.md](../../apps/docs/README.md)〈构件归属〉，它们连同应用级组合一起留在站点，落在 `apps/docs/assets/docs-shell.css` 的 `:root`：

| 变量                      | 值                                      | 说明                                                                              |
| ------------------------- | --------------------------------------- | --------------------------------------------------------------------------------- |
| `--shell-taskbar-h`       | `calc(var(--shellTaskbarHeight) * 1px)` | **单位换算的唯一入口**：令牌是无单位裸数字 `48`，直接写进 `block-size` 是无效 CSS |
| `--shell-window-w` / `-h` | `1120px` / `720px`                      | 窗口基准尺寸；只作**上限**用，实际取 `min(基准值, 视口可用区)`                    |
| `--shell-desktop-margin`  | `24px`                                  | 窗口与桌面边缘留白（最大化时归零）                                                |
| `--shell-wallpaper-angle` | `160deg`                                | 壁纸渐变角度（§5 提到的构图参数）                                                 |
| `--shell-wallpaper-stop`  | `60%`                                   | 壁纸渐变停靠点                                                                    |
| `--shell-start-menu-w`    | `480px`                                 | 开始菜单面板宽度上限（0.5.7；组件内 `min(..., 100vw - 8px)` 收窄，窄视口不溢出）  |
| `--shell-tray-clock-w`    | `64px`                                  | 托盘时钟预留宽度（0.5.7）：挂载前时钟是空文本，不预留则文本出现时图标区平移一帧   |

覆写方式：消费方在任意祖先节点写同名变量即可（任务栏高度也可改 `--shellTaskbarHeight`，只写裸数字）。**不允许**把这些值散落到组件的样式里当魔法数字 —— `apps/docs/utils/__tests__/shell-style-contract.test.ts` 会扫描外壳源码，禁止裸 `z-index` 与 `#RRGGBB` 字面量。

### 6.2 任务栏的取舍与落地结论（0.5.5 最小版 → 0.5.6/0.5.7 完整版）

0.5.5 只落地**最小可用**任务栏（高度占位 + 窗口还原入口 + 激活指示条）；0.5.6–0.5.7 扩成完整三段式（开始按钮 + 固定入口图标区 + 系统托盘），布局与几何见 §4 的「任务栏布局」条目，移动端压缩口径见 §4「移动端压缩布局」。

四条落地结论（实测 / 源码得出，记在这里防回归）：

1. **任务栏里的 ToolTip 会自遮挡**：`--zIndexTooltip`(1400) < `--zIndexShell`(1500)，挂 `FluereTooltip` 的提示会被任务栏自己盖住。**0.5.6 裁决 = 方案①**（外壳内不挂 ToolTip、只用原生 `title`；需要时由该处覆写 `--fui-tooltip-z`），已回写 §4 并照此实现，**不写裸 z-index 绕过**。
2. **任务栏入口用「动作按钮」而不是 toggle**：`FluereButton` 的 `:aria-pressed="selected || undefined"` 在 `selected=false` 时会把属性整个丢掉，做成 toggle 会导致同一按钮**时而带 `aria-pressed` 时而不带**（比"没有 toggle 语义"更糟）。因此窗口入口的可访问名说明点击后果（「最小化窗口」/「还原窗口」），窗口显示状态由激活指示条用视觉表达；固定入口与开始按钮同口径（开始按钮的开合状态由 `aria-expanded` 承载，那是另一套合法语义）。
3. **不放搜索按钮**（0.5.7）：判定基准里的「搜索」依赖站内搜索（docs/todo.md 2.3 的 `Ctrl+K`，0.6+）。没有可搜的东西时放搜索入口 = 坏按钮（AGENTS.md 红线），故任务栏 / 开始菜单都不放，边界文案已同步去掉「搜索」（i18n `shell.boundary.scope`）。
4. **箭头代替原生滚动条**（0.5.7）：图标区若露出原生滚动条，会在 48px 定高里把图标挤扁（移动端验收「不能出现原生滚动条挤压高度」）。做法：两套滚动条隐藏（标准 + webkit 伪元素）+ 两个箭头按钮编程 `scrollBy`；箭头只在实测溢出时可见，且**始终占位**（`visibility` 切换）—— 否则会出现「隐藏箭头 → 变宽 → 放得下 → 仍隐藏」的测量死锁。

### 6.3 站点 chrome 的落点（0.5.5 两处互斥 → 0.5.7 收进任务栏托盘，**不改 §1–§5 的假设**）

> **0.5.7 现状（2026-10-16）**：下面 0.5.5 的「两处互斥落点」**已整体撤销** —— 站点 chrome 迁入**任务栏系统托盘**（≥ 64rem 内联一组 / < 64rem 收进展开菜单的弹出面板，两处仍按断点互斥、共用同一份 `shell-chrome.vue` 清单），主页 header 保留一份（`GithubLink` 拆出清单后由布局直接并列渲染）。窗口内的 `#right-header` 与应用栏均已删除，标题栏按 `UpdateHeight()` 收为 32。理由：任务栏常驻 ⇒ 窗口关闭 / 最小化时主题、语言、版本入口也不会消失；而 0.5.5 拆两处的根因（48px 标题栏装不下四个控件）在「托盘 + 按语义拆清单（GitHub 归固定入口，托盘只剩三个）」之后不再构成约束。下表与实测数据**保留作为该裁决的历史证据**，断言已改写为「窗口内零 chrome 落点」（`shell-style-contract.test.ts`）。

0.5.5 起初把站点 chrome 控件（版本 tag / GitHub / 语言 / 主题）全部放进 `FluereAppWindow` 的 `#right-header`（标题栏右头格），并在窄视口给控件组加 `flex-wrap: wrap`。**真实浏览器实测证明这条路走不通**：

| 视口 | 标题栏右头格宽 | 控件组高  | 结果                                    |
| ---- | -------------- | --------- | --------------------------------------- |
| 1440 | 足够           | 32        | 正常（一行，标题栏 48）                 |
| 390  | **43px**       | **108px** | 换行成 4 行，越过 48px 标题栏压住标签条 |

根因：标题栏是 12 列 grid，右头格是 `auto` 轨；整行放不下时所有 `auto` 轨收缩到 min-content，而四个控件在 `wrap` 下的 min-content 只有最宽一项的宽度 ⇒ 高度换行膨胀。改成 `nowrap` 也不成立：四控件 min-content 合计约 123px，加 caption 区 138px、最小拖拽区 48px（`TitleBarMinDragRegionWidth`）、图标与左右内间距后超出 390px 视口，只会把 grid 挤成横向溢出。**48px 定高标题栏装不下四个站点控件**，属外壳构图问题，按 §1「外壳负责几何、组件只管圆角 / 阴影归零」不应靠改组件几何解决。

**落地决定**：站点 chrome 改为**两处互斥落点**，共用同一份控件清单（`apps/docs/components/shell/shell-chrome.vue`）：

| 视口              | 落点                                      | 可见性                |
| ----------------- | ----------------------------------------- | --------------------- |
| ≥ 64rem（1024px） | 标题栏 `#right-header`（标题栏保持 48px） | 显示 / 应用栏隐藏     |
| < 64rem           | 窗口内容区顶部的应用栏（app-bar）         | 显示 / 标题栏那份隐藏 |

两处**都渲染**、由 CSS 断点互斥 `display`，因此服务端与客户端 DOM 结构一致（无 `v-if`、无水合不匹配）。实测复核（`temp/pw-desktop-shell.mjs`）：移动档标题栏子格越界数 = 0、右头格宽 = 0、应用栏 4 个控件同一行；桌面档标题栏控件组高 ≤ 48 且应用栏 `display: none`；1440 桌面截图与改动前**逐字节一致**（同一 SHA-256）。

> 证据等级说明：本条**没有 A 级 WinUI 来源**（站点 chrome 不属于 `microsoft-ui-xaml` 的控件规格），属实测驱动的构图决定；写成 A 级口径会夸大。数值（43px / 108px / 123px / 138px / 48px）均为 Chromium `getBoundingClientRect` 实测，断言固化在 `apps/docs/utils/__tests__/shell-style-contract.test.ts` 与 `temp/pw-desktop-shell.mjs`。

## 7. 验证口径（每项交付时执行）

- 视觉值全部是 `var(--TokenName)` 或 `--fui-<component>-*` / `--shell-*` 局部变量；`pnpm test` 里的样式契约测试从 SFC 源码文本断言（jsdom 不解析 `var()`，见 style-spec §7.1）。
- 层级：新组件不得出现裸 `z-index`——由 `packages/ui/src/__tests__/z-index-tokens.test.ts` 与 `packages/designs/src/repo-tokens.test.ts` 守住；`apps/docs` 侧的外壳同样只引用 `--zIndex*`。
- 浮层 / 材质类改动必须在**真实浏览器**里量 `getComputedStyle`（防 scoped / Teleport 静默失效），明暗各留一张对照截图；脚本与截图留 `temp/`，结论写回代码注释 / 契约测试 / 文档页。
- SSR：视口相关一律 `useMediaQuery` / 能力探测 + 无害默认值，`pnpm lint:ssr` 必须全绿。
