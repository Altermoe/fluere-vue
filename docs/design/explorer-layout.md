# Explorer 外壳布局假设（0.5.0 锁定）

> 状态：**0.5.0 已锁定**（2026-10-14）。本文档是 `docs/todo.md`《0.5.0 · Explorer 骨架》明文要求「必须先在 0.5.0 定下来」的五项布局假设的**唯一事实源**。
>
> 依据：[docs/todo.md《0.5.0 · Explorer 骨架》](../todo.md#050--explorer-骨架-17-点组件--11-点文档站)、[AGENTS.md](../../AGENTS.md)〈交互与弹层组件约定〉、[docs/style-spec.md](../style-spec.md)、[docs/ssr-guide.md](../ssr-guide.md)。规格源 = `microsoft-ui-xaml` tag **`winui3/release/2.5.1`**（commit `ba3a8d5`）。
>
> **变更流程**：五项假设一旦改动，必须**先回写本文档**（含新的证据出处）再改代码；实现对不上本文档时以本文档为准，除非同时给出 A 级源码反证。

## 0. 范围与归属

| 层                              | 落点                                                                               | 本期版本    | 说明                                                                       |
| ------------------------------- | ---------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------- |
| 窗口层                          | `packages/ui/src/app-window/`（`FluereAppWindow`）                                 | 0.5.1 ✅    | 只画外框与标题栏，位置 / 尺寸 / 层级由外壳给                               |
| 内容容器                        | `packages/ui/src/tab-view/`（`FluereTabView`）                                     | 0.5.3       | 窗口内的视图切换                                                           |
| 导航面板                        | `packages/ui/src/navigation-view/`                                                 | 0.5.4       | 左侧可折叠导航                                                             |
| 壁纸 / 任务栏 / 开始菜单        | `apps/docs/components/shell/` + `apps/docs/data`                                   | 0.5.5–0.5.7 | **应用级组合**，不进 `packages/ui`（见 `apps/docs/README.md`〈构件归属〉） |
| 窗口管理器（多窗口层级 / 焦点） | `apps/docs/utils/shell-window-state.ts` + `components/shell/shell-window-host.vue` | 0.5.9       | 同上；口径见本文 §8                                                        |

> 「Explorer 窗口」= 壁纸层 → 窗口层（`FluereAppWindow` = 标题栏 + 内容区）→ 任务栏层。窗口内容本期挂三个视图：首页（与站点主页共用的营销内容）、组件（注册表卡片网格）、指南（两个起步入口），由 `ui-gallery-window.vue`（0.5.9 前叫 `explorer-window.vue`）按标签 id 分派；文档内页布局不动。
>
> **0.5.9 落点变更（2026-10-16，经人类明确授权）**：仿真从「一个窗口」升级为**仿真应用系统** ——「应用 = 一扇窗口」，现有窗口成为 **UI Gallery** 应用，新增最小第二应用 **Render Lab**（WebGL2 彩色三角）；桌面同时承载多扇窗口并做**层级 + 焦点**管理（本文 §8）。**范围扩大是明确授权的**，随之改写了 `docs/todo.md` 的两处「不做多窗口」描述与可见文案 `shell.boundary.*`（README〈WindowsOS 仿真边界〉为文案事实源）。

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

## 1.1 窗口拖拽与位置收敛（窗口管理器语义）

**假设**：拖拽位移的收敛**只保证「标题栏完整可见」**，不保证窗口整块留在桌面内。

| 轴向 | 约束                                             | 用户可见结果                                                                             |
| ---- | ------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| 纵向 | 顶端条带（描边 + 标题栏 = 33px）落在桌面工作区内 | 向下拖到标题栏被任务栏挡住为止（**窗口本体挂在任务栏之下**）；向上拖到标题栏贴住桌面顶端 |
| 横向 | 窗口整块留在桌面内                               | 左右拖到贴边为止（**不挂出左右边缘**，理由见下）                                         |

坐标与公式（`apps/docs/utils/shell-window-state.ts#containWindowOffset`）：`offset` 是相对**静止位置** `base` 的平移量，窗口左上角 = `base + offset`；工作区 = `[0, desktopWidth] × [0, desktopHeight − taskbarHeight]`。收敛在两个路径上**共用同一个纯函数**：

1. **拖拽中**（`shell-window-host.vue`，0.5.9 前在 `explorer-window.vue`）：按**增量**位移推进（`deltaX/deltaY`），锚点 = 上一次收敛后的位移。撞到边界后反向拖拽第一帧就有响应 ⇒ 没有「回拖死区」（按累计位移收敛时，越界量会被累计下来，Web 里指针能跑到视口任意位置，实测死区可达数百像素）。
2. **视口（宿主）变化后**（`desktop-shell.vue#containAllOffsets`，逐窗口）：`ResizeObserver`（宿主 resize 的通用信号）+ `window.resize`（能力探测失败时的退路）都会重新收敛一次。**这是 Web 独有的风险**：拖拽允许窗口本体挂出桌面，视口一变就可能把标题栏顶出工作区、窗口在屏幕上彻底消失（实机的位置由窗口管理器持有，显示器变化时系统会把窗口收回工作区）。

几何量（窗口尺寸 / 静止位置 / 标题栏下缘）一律**实测**（`measure()` 里 `rect − offset`），不在 TS 里重算 CSS 的 `min(...)` / 居中公式 / 标题栏高度：两处一旦漂移，边界就跟实际窗口对不上。

**来源与证据缺口**：Windows 的窗口移动由系统窗口管理器实现，`microsoft-ui-xaml` 里没有任何对应源码（与 §4 任务栏高度同一条缺口）。口径来自 ① 用户在 Windows 11 实机的观察；② Win32 move loop 的逆向实现交叉验证（Wine `dlls/win32u/defwnd.c#sys_command_size_move`：光标被钳在工作区内，且下边界再内缩一个 `caption_height`，见 `containWindowOffset` 注释的逐行引用）。两条差异已明写在该函数注释里：

- **锚点 vs 矩形**：Win32 约束的是**光标**（被抓住的那一点永远可见），本仿真约束的是**标题栏矩形**（更强：整条标题栏可见），且它在拖拽与 resize 两条路径上是同一个不变量（锚点模型在 resize 时没有锚点可用）。
- **横向不放开**：Win32 之所以允许窗口挂出左右边缘，是因为锚点模型保证「抓到的那一点」始终在屏内，而 Web 里指针不受桌面矩形限制、没有等价物。本次开发中试过放开横向（「至少留 48px 可见」）：1120px 窗口拖到只剩 48px 时，那 48px **恰好整条落在标题栏的 caption 按钮区**（`data-fui-app-window-nodrag`）⇒ 窗口「拖得出去、拖不回来」，只剩最小化 / 关闭可点。故横向取更强的那条（窗口不越界）。

**0.5.8 修复记录（2026-10-16）**：0.5.5 的实现按「窗口整块不跑出桌面」**对称**收敛（`y ∈ ±(可用区高 − 窗口高)/2`），且没把静止位置（距顶 `--shell-desktop-margin` = 24）算进去。真实浏览器实测（1600×1000 视口、1120×720 窗口）暴露两个用户可见 bug：

| 场景                     | 修复前                                                                                    | 修复后                                                            |
| ------------------------ | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 抓住标题栏向下拖到底     | 窗口下缘停在任务栏**上方 92px**（`win.bottom` 860 / 任务栏 952），再也拖不动              | 标题栏下缘停在任务栏上缘（952 = 952），窗口本体挂到 `bottom` 1639 |
| 抓住标题栏向上拖到底     | 标题栏整条跑到桌面之上（`title.top` = **−91**，窗口彻底抓不到，只能靠任务栏还原入口救回） | 窗口上缘停在桌面顶端（`win.top` = 0），标题栏完整可见             |
| 拖动中途撞到边界后反向拖 | ——                                                                                        | 反向 60px ⇒ 立刻上移 60px（无死区）                               |
| 拖到底后把视口压矮       | ——                                                                                        | 位移被重新收敛：标题栏紧贴任务栏上缘（640 高视口下 560..592）     |

**测量方法**：`temp/pw-shell-drag.mjs`（Playwright + 真实指针事件，17 条断言全绿，截图 `temp/visual-shell-drag/`）。过程产物不进仓库；可复现判据落在 `apps/docs/utils/__tests__/shell-window-state.test.ts`（29 条，含边界算式的逐条推导）与 `shell-style-contract.test.ts` 的源码契约里。

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
3. 与文档站现状的关系：`apps/docs/layouts/components.vue`（文档内页）与 `apps/docs/layouts/home.vue`（站点主页）的 **`FluereScrollView` 整页滚动口径适用于站点页面**；`/os` 窗口「首页」视图的内容另起一个 `FluereScrollView`（窗口内滚动，见 `ui-gallery-window.vue` 的 `__panel-scroll`）。

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

| 层                | 令牌                  | 值   | 说明                                                                                                                            |
| ----------------- | --------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------- |
| 壁纸              | `--zIndexWindow` 之上 | 0    | 壁纸不建层，直接作为 shell 根背景                                                                                               |
| 桌面窗口          | `--zIndexWindow`      | 0    | 窗口层容器；**层内**多窗口按 `--zIndexStep` 逐档递增（`calc(var(--zIndexWindow) + rank * var(--zIndexStep))`，rank ≤ 7，见 §8） |
| 窗口内容浮起面    | `--zIndexContent`     | 100  | 窗口内容区内部的浮起表面（非浮层档位）                                                                                          |
| 任务栏            | `--zIndexShell`       | 1500 | 固定底边；`position: fixed` + `inset-block-end: 0`                                                                              |
| 开始菜单（0.5.7） | `--zIndexStartMenu`   | 1600 | 必须盖过任务栏与窗口；面板挂在任务栏子树内（由 `--zIndexShell` 的叠放上下文承载），令牌同时锁定档位、防未来独立成层时回退裸值   |

- **高度令牌**：`--shellTaskbarHeight` = `48`（本节新增，`repo-tokens.json` 的 `sources.shellGeometry` 记录）。**证据缺口**：Windows 任务栏由系统外壳绘制，`microsoft-ui-xaml` 无任何对应资源，48 为 Windows 11 100% 缩放的实测值；DPI 缩放 / 小任务栏模式下需覆写。覆写方式：外壳在根节点写 `--shellTaskbarHeight: <px>`（任务栏与为它预留的 `padding-block-end` 都读同一个变量）。
- **与 ToolTip 档的关系（0.5.6 曾裁决「不挂 ToolTip」，0.5.7 改为方案① 的正解）**：`--zIndexTooltip` = 1400 **低于** `--zIndexShell` = 1500（顺序断言见 `packages/designs/src/repo-tokens.test.ts`）。0.5.6 的临时裁决是「外壳内只用原生 `title`」；**0.5.7 起改为**：外壳把自己作为**宿主层**登记进层级栈（`acquireLayer('--zIndexShell')`，客户端 `onMounted` 登记 / 卸载出栈，见 `desktop-shell.vue`），于是外壳内打开的浮层命中层级栈的**嵌套提升**分支，z = `calc(var(--zIndexShell) + var(--zIndexStep))` = **1510** > 1500，全程引用刻度。外壳内的图标按钮 / 链接一律用 `FluereTooltip`，不再有原生 `title`（契约测试反向断言）。
  - ⚠️ **实测更正**：本节原文写的「覆写 `--fui-tooltip-z`」**不可行** —— 提示面的 z 由 `useFlyout` 以**内联样式**下发（`tooltip-fixture.vue` 的 `:style="layerStyle"`），内联优先于组件样式表里的 `z-index: var(--fui-tooltip-z)`。浏览器实测：外壳登记后 `.fui-tooltip` 的计算 `z-index` = 1510，而未登记时恒为 1400。方案②（抬高 `--zIndexTooltip` 全局档位）仍是备选，动它必须同步改 `repo-tokens.json`、AGENTS.md 的刻度描述与顺序断言。**不得**在应用里写裸 z-index 绕过。
- **任务栏布局（0.5.7 按参考图重定，三段式不变）**：`grid-template-columns: auto minmax(0, 1fr) auto` —— 最左开始按钮、中间图标区（**左对齐**、可收缩、箭头滚动）、最右托盘；窄视口只压中间段。

  **参考图**：用户在 Windows 11（2560×48 任务栏，100% 缩放）截的整条任务栏 + 开始按钮 hover / pressed 特写（三张 PNG）。**测量方法**：`temp/shell-ref/` 下的 `png.mjs`（自写 PNG 解码）+ `measure-start.mjs` / `measure-taskbar.mjs` / `fit-gradient.mjs`（最小二乘拟合徽标渐变）+ `pw-verify.mjs`（改动后实测同一批量），逐像素取值；**证据缺口**：Windows 任务栏由系统外壳绘制，`microsoft-ui-xaml` 里没有任何任务栏 XAML，故以下均为「参考图实测 + 站内令牌映射」，不是 A 级控件规格。

  | 量                 | 参考图实测                                          | 本实现                                                  |
  | ------------------ | --------------------------------------------------- | ------------------------------------------------------- |
  | 图标命中区         | 40×40（首个热区 x 12..52 / y 4..43）                | `size="large"` + `icon-only`（`aspect-ratio: 1`）       |
  | 图标               | 24×24（应用图标 bbox 24 宽）                        | `:size="24"` + 徽标 `24×24`                             |
  | 热区间距           | 4px（槽 pitch 44 = 40 + 4）                         | 根 grid `column-gap` + 图标区 / 视口 `gap` = 4px        |
  | 任务栏内边距       | 左 12（首个热区）/ 右 20（时钟文本右缘）            | `padding-inline: 12` + 托盘 `padding-inline-end: 8`     |
  | 圆角               | ≈4（首行内缩 3px、次行 1px，r=4 的圆角轮廓）        | `--borderRadiusMedium`                                  |
  | hover 填充         | 合成 #F7F7F7（底 #EEEEEE）                          | `--controlFillColorSecondary`（合成 #F3F3F3，Δ3.5/255） |
  | pressed 填充       | 合成 #F3F3F3                                        | `--controlFillColorTertiary`（合成 #F1F1F1，Δ2/255）    |
  | hover/pressed 描边 | 1px，叠在填充之上得 #E9E9E9（= 0.059 黑叠 #F3F3F3） | `--controlStrokeColorDefault` + `outline-offset: -1px`  |
  | 时钟               | 两行，行距 16px，12px 字号；时钟块右缘距屏幕 20px   | `--fontSizeBase200` / `--lineHeightBase200` + 右缘 20px |
  - 填充阶梯取 **A 级 WinUI 控件填充**（`Common_themeresources_any.xaml`，tag `winui3/release/2.5.1`；`Button_themeresources.xaml#L31-32` 正是拿它们做 PointerOver / Pressed 填充），而不是「照截图取色」：参考图合成值与 Control 阶梯相差 3.5 / 2 个灰阶（截图重编码噪声量级），而**暗色**下 Control 阶梯的两个状态有明显区分、`Layer*` 家族的暗值几乎重合（#252525 vs #242424）—— 后者不可用。合成依据与 ΔE 记在 `repo-tokens.json` 的 note 里。
  - 开始徽标：**几何**取官方 Windows 11 徽标（Wikimedia Commons《Windows logo - 2021.svg》`viewBox 0 0 4875 4875`，方块 2311 / 缝 253），在 24px 图标位下**整像素对齐**为「方块 11 / 缝 1 / 总 23」（官方比例原样渲染时缝隙被抗锯齿糊成两个半透明像素，而参考图的缝隙像素是**纯背景色**）；**配色**取强调色渐变 —— 浅端 `--windowsAccentLight2`（#4CC2FF，强调色 Light2）、深端 `--windowsAccentPrimary`（#0078D4，强调色本体，也是官方徽标文件的填充色），方向 `(14,21)`（dy/dx = 1.5，最小二乘拟合 56°）；**按下态**转单色 + `scale(0.75)`（实测方块 11px → 8px、总宽 23px → 17.25px），无过渡（关键帧取不到，不猜时长 ⇒ 证据缺口，归 0.9.x）。
  - 启动图标的两色来自公开资料而非截图：`#4CC2FF` = Windows 强调色调色板 Light2（Microsoft Learn〈Color - Accent color palette〉/ winaccent 的 Win11 实测表），`#0078D4` = 官方徽标填充色。参考图交叉验证：浅端最小二乘外推 ≈ #48CCFC、深端 ≈ #027BD4；把本站渲染与参考图的徽标**逐像素对齐后求差**：23×23 区域内平均绝对差 **R 5.6 / G 6.2 / B 2.8**（≤2.5%），差值集中在四角 —— 参考图的角像素被抗锯齿混入背景（半像素偏移），本站按整像素对齐故四角更「实」，属预期差异。
  - 激活指示条 16×3（`--borderRadiusCircular` + `--colorBrandBackground`）、滚动箭头 32×32（应用自有 affordance，参考图里没有对应物）。覆写口 = 组件类名下的 token 引用，样式里无硬编码数值。

- **移动端压缩布局（0.5.7）**：箭头仅在图标区**实测溢出**时出现 —— 0.5.7 起由 `visibility`（永久占位）改为 `display` 切换：永久占位会让开始按钮与第一个应用热区之间凭空多出 32px，与参考图的「紧贴」冲突；死锁风险由「箭头出现只让视口更窄 ⇒ 溢出单调」+ 翻转后 `nextTick` 补量一次化解（实现与断言见 `shell-taskbar.vue`）。图标区滚动条全部隐藏（`scrollbar-width: none` + `::-webkit-scrollbar { display: none }`，避免 48px 定高被挤压）；托盘 `< 64rem` 收起内联控件组、保留时钟与展开按钮。

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

1. **任务栏里的 ToolTip 会自遮挡**：`--zIndexTooltip`(1400) < `--zIndexShell`(1500)，挂 `FluereTooltip` 的提示会被任务栏自己盖住。**0.5.6 临时裁决**是外壳内只用原生 `title`；**0.5.7 改为方案① 的正解** —— 外壳登记进层级栈（`acquireLayer('--zIndexShell')`），外壳内的浮层按 `--zIndexStep` 抬到 1510；实测 `.fui-tooltip` 计算 z-index = 1510（未登记时 1400）。同时更正：**覆写 `--fui-tooltip-z` 无效**（提示面的 z 是 `useFlyout` 的内联样式）。详见 §4，**不写裸 z-index 绕过**。
2. **任务栏入口用「动作按钮」而不是 toggle**：`FluereButton` 的 `:aria-pressed="selected || undefined"` 在 `selected=false` 时会把属性整个丢掉，做成 toggle 会导致同一按钮**时而带 `aria-pressed` 时而不带**（比"没有 toggle 语义"更糟）。因此窗口入口的可访问名说明点击后果（「最小化窗口」/「还原窗口」），窗口显示状态由激活指示条用视觉表达；固定入口与开始按钮同口径（开始按钮的开合状态由 `aria-expanded` 承载，那是另一套合法语义）。
3. **不放搜索按钮**（0.5.7）：判定基准里的「搜索」依赖站内搜索（docs/todo.md 2.3 的 `Ctrl+K`，0.6+）。没有可搜的东西时放搜索入口 = 坏按钮（AGENTS.md 红线），故任务栏 / 开始菜单都不放，边界文案已同步去掉「搜索」（i18n `shell.boundary.scope`）。
4. **箭头代替原生滚动条**（0.5.7）：图标区若露出原生滚动条，会在 48px 定高里把图标挤扁（移动端验收「不能出现原生滚动条挤压高度」）。做法：两套滚动条隐藏（标准 + webkit 伪元素）+ 两个箭头按钮编程 `scrollBy`。箭头只在实测溢出时出现：0.5.7 起用 `display` 切换而不是 `visibility` 占位 —— 永久占位会让开始按钮与第一个应用热区之间多出 32px，与参考图的「紧贴」冲突；「隐藏箭头 → 变宽 → 放得下 → 仍隐藏」的抖动由「箭头出现只让视口更窄 ⇒ 溢出单调 + 翻转后补量一次」化解（断言见 `shell-style-contract.test.ts`）。

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
- SSR：**桌面仿真组件在 `ClientOnly` 边界之内**（原则见 `docs/ssr-guide.md`〈Level 2B〉），
  外壳内部不做 SSR 检查；组件库（`packages/ui` 等）不受豁免，`pnpm lint:ssr` 与
  `ssr-smoke.test.ts` 仍必须全绿。`/os` 的预渲染产物只有 `#fallback` 占位（路由本身仍在静态产物里）。
- 多窗口：层级（z 值形态 / 不抬到 `--zIndexContent` 之上）、焦点切换与回退、逐窗口最小化 /
  关闭 / 重开、每扇窗口位移与标签互不串扰 —— 纯函数部分由
  `apps/docs/utils/__tests__/shell-window-state.test.ts` 覆盖，交互部分必须在**真实浏览器**里实测
  （点击下层窗口置顶、任务栏四态入口文案、WebGL 画面像素与降级文案）。

## 8. 仿真应用系统与窗口管理器（0.5.9，经人类明确授权）

> 状态：**0.5.9 落地**（2026-10-16）。本节是「应用 = 窗口」这一层语义与多窗口层级 / 焦点口径的
> 事实源；实现落点是 `apps/docs/utils/shell-apps.ts`（注册表）、
> `apps/docs/utils/shell-window-state.ts`（窗口管理器纯函数）、
> `apps/docs/components/shell/shell-window-host.vue`（窗口宿主）与
> `apps/docs/components/shell/{ui-gallery-window,render-lab-window}.vue`（两个应用的内容）。

### 8.1 模型

一个**仿真应用** = 一个应用身份 = **一扇窗口 + 一份窗口内容**：

| 字段 / 概念 | 内容                                                                                |
| ----------- | ----------------------------------------------------------------------------------- |
| 应用 id     | `ShellAppId`（字面量联合，同时是 CSS 类名后缀 `docs-shell-window--<id>`）           |
| 应用元数据  | 标题 key / 副标题 key / 图标（`SHELL_APPS`，顺序 = 任务栏与开始菜单的固定顺序）     |
| 窗口状态    | 每应用一份 `ShellWindowState`（status / maximized / offset / openTabs / activeTab） |
| z 序        | 从底到顶的 `zOrder`（最小化 / 关闭的应用**留在序里**，还原时先回原位再置顶）        |
| 焦点        | `activeAppId`（= 最上层可见窗口；全部收起为 `null`）                                |

**内容分派用字面量分支**（宿主里 `v-if="app.id === 'ui-gallery'"` / `v-else-if="…'render-lab'"`），
不用 `<component :is>`：AGENTS.md〈交互与弹层组件约定〉记着实测结论「动态组件分支上的事件不会被
可靠转发」，而窗口的 `update:offset` / `openTab` 正是不能被吞的那类事件。加应用 = 加一条注册表
条目 + 一条字面量分支。

### 8.2 层级（z 序）

- 窗口层容器整体在 `--zIndexWindow`(0) 档；**层内**每扇窗口的 z 值是
  `calc(var(--zIndexWindow) + rank * var(--zIndexStep))`（rank = 它在 `zOrder` 里的下标），
  由 `windowZIndex()` 生成**内联样式** —— 全程引用刻度，没有裸 `z-index`。
- 上限 `SHELL_MAX_WINDOWS = 8`（rank 0..7 ⇒ z 0..70）：超过 9 扇窗口就会把窗口抬到
  `--zIndexContent`(100) 这个「窗口内容区浮起面」档之上，层级语义随即崩掉 ⇒ 夹取（不拒绝打开）。
- **窗口 DOM 顺序固定为注册表顺序**，层级只由 z 值表达：不按焦点重排 `v-for`，因为
  Render Lab 的 `<canvas>` 被搬动有丢 WebGL 上下文的风险（标准行为是「从文档移除」才丢，
  但没必要冒这个险）。
- 任务栏 / 开始菜单 / 窗口内容里打开的浮层仍走 `--zIndexShell` 的层级栈嵌套提升（§4）。

### 8.3 焦点与开关语义

| 交互                                              | 结果                                                                   | 实现                 |
| ------------------------------------------------- | ---------------------------------------------------------------------- | -------------------- |
| 窗口内任意 `pointerdown`（capture）               | 置顶 + 聚焦                                                            | `focusApp`           |
| 任务栏 / 开始菜单入口：**焦点应用**且窗口可见     | 最小化                                                                 | `toggleAppFromShell` |
| 任务栏 / 开始菜单入口：已最小化 / 已关闭 / 非焦点 | 还原（或重新打开）+ 置顶 + 聚焦                                        | `activateApp`        |
| 最小化 / 关闭**焦点**窗口                         | 焦点交给**下一个最上层可见窗口**；全部收起则为 `null`                  | `topMostVisibleApp`  |
| 关闭                                              | 复位 `maximized` / `offset`（重新打开 = 居中常规窗口），保留已打开标签 | `closeApp`           |
| 最小化                                            | **保留**形态（最大化 / 位移 / 标签），从任务栏还原回到最小化前的样子   | `minimizeApp`        |

入口的可访问名 / 提示随状态变化（最小化 / 还原 / 打开 / 切换四态，i18n `shell.taskbarApp*`）——
说的是「点击会发生什么」，与实机读屏口径一致；激活指示条只表达「该应用窗口在桌面显示」，
**焦点窗口不改变指示条几何**（Win11 焦点窗口的指示条更长，但那没有 A 级来源，见 §8.5）。

**关闭不再有全局占位卡片**（0.5.5–0.5.8 曾在桌面中央放「窗口已关闭 / 重新打开」卡片）：
多窗口下「关一个窗口弹全局恢复卡」语义不成立，恢复路径改为任务栏 / 开始菜单入口
（指示条熄灭 ⇒ 点入口重开），与实机一致，也满足 todo 的「关闭不伪装成坏按钮」。

### 8.4 几何与移动档

- 逐窗口实测（`desktop-shell.vue#measure` 遍历窗口层内 `[data-shell-window]`，按
  `data-app-id` 记录尺寸 / 静止位置 `rect - offset` / 标题栏下缘），收敛逐窗口进行
  （`containAllOffsets`）。理由与 §1.1 相同：CSS 是几何的权威实现，TS 里重算必然漂移。
- 每应用的落位 / 尺寸走 `docs-shell.css` 的 `.docs-shell-window--<id>` 档位
  （UI Gallery 1120×720 居中；Render Lab 880×600 右下错开 48px —— 错开量受 1024px 桌面档
  最窄视口约束，再大就会顶出桌面右缘）。
- **移动档**（< 64rem）：所有窗口几何相同（铺满可视区减去任务栏）⇒ **最上层覆盖其余**，
  同一时刻只看得到一扇窗口，用任务栏入口切换；不需要额外的「隐藏非焦点窗口」规则。
  位移清零由 `desktop-shell.vue` 的 `useMediaQuery` 副作用完成（内联 `transform` 永远压过
  样式表里的 `transform: none`，0.5.5–0.5.8 的那条 CSS 规则是死代码，已删除）。

### 8.5 来源与证据缺口

- Windows 的窗口层级 / 焦点 / 开关语义由系统窗口管理器持有，`microsoft-ui-xaml` 里**没有**任何
  对应源码（与 §1.1、§4 任务栏高度同一条缺口）。口径来自 ① 用户 Windows 11 实机观察；
  ② 通行语义：点击窗口内部把它带到最前，最小化 / 关闭后系统把焦点交给下一个可见顶层窗口。
- **明确不做**（本期非目标）：边缘吸附（Aero Snap）、贴边顶满、窗口吸附（Snap Layouts /
  Snap Assist）、任务视图（Win+Tab）、Alt+Tab、窗口缩放手柄、每应用位置持久化、
  焦点窗口指示条的差异化几何、系统级动画复刻。
- 可见文案（i18n `shell.boundary.{scope,excluded}`）与 [apps/docs/README.md](../../apps/docs/README.md)
  〈WindowsOS 仿真边界〉已按本节改写 —— **仿真的能力边界必须与实现同步**，不要把
  「层级 / 焦点」写好而实现没做，也不要把已经做到的写成「不做」。

### 8.6 实测记录（2026-10-16，多窗口 + 两个应用）

**方法与产物**：`temp/pw-shell-apps.mjs`（Playwright + Chromium，**dev server 与
`pnpm docs:generate` 静态产物各跑一遍**，34 条断言全绿 / 两遍一致），
`temp/visual-shell-apps/` 四张截图（桌面 / 移动 / reduced-motion / WebGL2 降级）；
既有拖拽回归 `temp/pw-shell-drag.mjs` 17/17（选择器已限定到 UI Gallery 窗口 ——
多窗口后它一度因为 `.fui-app-window__titlebar` 命中两扇窗口而报 strict mode 冲突）。
过程产物不进仓库，可复现判据落在 `apps/docs/utils/__tests__/shell-{apps,window-state}.test.ts`
与 `shell-style-contract.test.ts`（含下面两个 bug 的防回归断言）。

关键实测值（1600×1000 桌面档 / 390×844 移动档，DPR 1）：

| 量                              | 实测                                                             |
| ------------------------------- | ---------------------------------------------------------------- |
| UI Gallery 常规窗口             | 1120×720 @ (240, 24)                                             |
| Render Lab 常规窗口             | 880×600 @ (408, 72)（右下错开 48）                               |
| 两窗口 z 值                     | `0` / `10`（点击下层窗口后互换，焦点同步切换）                   |
| 最大化                          | 1600×952（底部为 48px 任务栏让位）                               |
| 移动档窗口                      | 390×796（844 − 48），最上层覆盖其余                              |
| Render Lab canvas backing store | 878×566（= 内容区 CSS 尺寸 × DPR 1）                             |
| 三角像素占比                    | 0.184（形状完整、未贴边被裁）                                    |
| 三角顶点色                      | 令牌色的顶点插值（最常见 `rgb(39,158,234)` / `rgb(37,156,233)`） |
| 图标区箭头                      | ≥ 320px 视口不出现；300px 出现且不产生文档横向溢出               |

**两个只在真实浏览器 + 生产产物里暴露的 bug（已修，均有防回归断言）**：

1. **箭头的 `display` 写在 `FluereButton` 上被库规则压过**：库按钮根自带
   `display: inline-flex`，与本站 `.docs-shell-taskbar__scroll { display: none }`
   **同特异性**（0,2,0）⇒ 由 CSS 注入顺序决定胜负。dev 下本站规则后到（正常隐藏），
   而 `nuxt generate` 的产物里库规则后到 ⇒ **两个箭头在宽视口永久可见**。
   修法：显隐移到外层 `<span class="docs-shell-taskbar__scroll">`（与托盘展开按钮同一解法）。
2. **布局未落地时的测量竞态**：水合首帧 `clientWidth = 0` 会被 `scrollWidth > clientWidth`
   误判成「放不下」，而箭头显隐自身不再产生新的测量信号 ⇒ `isScrollable` **卡死为 true**。
   修法：`clientWidth <= 0` 时按「不溢出」处理，并补一个 `ResizeObserver` 观察图标区视口，
   保证样式落地后有第二次测量机会（箭头显隐会改变视口宽 ⇒ 该观察器再触发一次，
   由零宽守卫 + 单调性收敛）。

降级路径同样实测通过：`prefers-reduced-motion: reduce` 下三角静止（两次采样像素集完全一致），
`getContext('webgl2')` 被 stub 成 `null` 时窗口内显示 `shell.apps.renderLab.unsupported` 文案。
