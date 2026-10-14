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

> 「Explorer 窗口」= 壁纸层 → 窗口层（`FluereAppWindow` = 标题栏 + 内容区）→ 任务栏层。窗口内容本期只挂首页 hero（`pages/index.vue`），文档内页布局不动。

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
3. 与文档站现状的关系：`apps/docs/layouts/components.vue` 的 **`FluereScrollView` 整页滚动口径只适用于文档内页**，本期不动；首页 hero 的窗口内容另起一个 `FluereScrollView`（窗口内滚动）。

**降级**：视口 < `lg`（1024px）时外壳降级为「全屏无边框窗口 + 页面滚动」（移动端不仿桌面，见 todo〈仿真边界〉）；此时窗口内容不再单独滚动，交给页面滚动。降级判据用 `useMediaQuery` / 能力探测，**不在 `setup()` 里直接读 `window`**（[docs/ssr-guide.md](../ssr-guide.md)）。

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

**假设**：任务栏高 **48px**（100% 缩放），层级引用 `--zIndexShell`（1500）；开始菜单是**比任务栏更高的一档**，0.5.7 落地时补 `--zIndexStartMenu`（见下）。

| 层                | 令牌                       | 值     | 说明                                                               |
| ----------------- | -------------------------- | ------ | ------------------------------------------------------------------ |
| 壁纸              | `--zIndexWindow`(0) 之上   | 0      | 壁纸不建层，直接作为 shell 根背景                                  |
| 桌面窗口          | `--zIndexWindow`           | 0      | 窗口自身不叠在别的东西之上                                         |
| 窗口内容浮起面    | `--zIndexContent`          | 100    | 窗口内容区内部的浮起表面（非浮层档位）                             |
| 任务栏            | `--zIndexShell`            | 1500   | 固定底边；`position: fixed` + `inset-block-end: 0`                 |
| 开始菜单（0.5.7） | **待补** `zIndexStartMenu` | > 1500 | 必须盖过任务栏与窗口；补进 `repo-tokens.json` 后再写组件，禁止裸值 |

- **高度令牌**：`--shellTaskbarHeight` = `48`（本节新增，`repo-tokens.json` 的 `sources.shellGeometry` 记录）。**证据缺口**：Windows 任务栏由系统外壳绘制，`microsoft-ui-xaml` 无任何对应资源，48 为 Windows 11 100% 缩放的实测值；DPI 缩放 / 小任务栏模式下需覆写。覆写方式：外壳在根节点写 `--shellTaskbarHeight: <px>`（任务栏与为它预留的 `padding-block-end` 都读同一个变量）。
- **与 ToolTip 档的关系（已知冲突，0.5.6 处理）**：`--zIndexTooltip` = 1400 **低于** `--zIndexShell` = 1500（顺序断言见 `packages/designs/src/repo-tokens.test.ts`）。因此**锚在任务栏 / 开始菜单里的 ToolTip 会被外壳盖住**。两种合法解法，0.5.6 二选一并回写本文档：① 该处的 ToolTip 覆写 `--fui-tooltip-z: calc(var(--zIndexShell) + var(--zIndexStep))`；② 把 `--zIndexTooltip` 抬到外壳之上（同时改 `repo-tokens.json`、AGENTS.md 的刻度描述与顺序断言）。**不得**在应用里写裸 z-index 绕过。
- 任务栏图标组居中、hover / active 指示条几何在 0.5.6 定，取值逻辑同 ToolTip：找不到 A 级来源的按「证据缺口」记账并给覆写口（组件局部变量或 `--shell*` 令牌）。

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

| 令牌                            | 值  | 来源 / 缺口                                                                            |
| ------------------------------- | --- | -------------------------------------------------------------------------------------- |
| `--navigationPaneExpandedWidth` | 320 | WinUI `OpenPaneLength` 缺省（`NavigationView.idl:159/198`，tag `2.5.1`）               |
| `--navigationPaneCompactWidth`  | 48  | WinUI `CompactPaneLength` 缺省（`NavigationView.idl:195`）                             |
| `--shellTaskbarHeight`          | 48  | **证据缺口**：Windows 外壳不在 `microsoft-ui-xaml` 里；48 = Windows 11 100% 缩放实测值 |

`--zIndexStartMenu` 不预先造（还不知道开始菜单与任务栏的确切叠放需求），0.5.7 需要时按 §4 补，并同时更新顺序断言。

## 7. 验证口径（每项交付时执行）

- 视觉值全部是 `var(--TokenName)` 或 `--fui-<component>-*` / `--shell-*` 局部变量；`pnpm test` 里的样式契约测试从 SFC 源码文本断言（jsdom 不解析 `var()`，见 style-spec §7.1）。
- 层级：新组件不得出现裸 `z-index`——由 `packages/ui/src/__tests__/z-index-tokens.test.ts` 与 `packages/designs/src/repo-tokens.test.ts` 守住；`apps/docs` 侧的外壳同样只引用 `--zIndex*`。
- 浮层 / 材质类改动必须在**真实浏览器**里量 `getComputedStyle`（防 scoped / Teleport 静默失效），明暗各留一张对照截图；脚本与截图留 `temp/`，结论写回代码注释 / 契约测试 / 文档页。
- SSR：视口相关一律 `useMediaQuery` / 能力探测 + 无害默认值，`pnpm lint:ssr` 必须全绿。
