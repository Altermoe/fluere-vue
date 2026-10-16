# @fluere-vue/docs

Nuxt 4 文档站（应用层，演示"可感知开发"）。

- 页面级样式使用 UnoCSS 工具类，颜色一律用**精确 token 名**（`bg-colorBrandBackground`、`p-fluent-m`、`rounded-fluent-md`），由 `@fluere-vue/themes` 的 `presetFluere` 注入 token 变量。
- 组件示例页直接消费 `@fluere-vue/ui`（组件样式自包含）。

## 命令

```bash
pnpm dev          # 本地开发
pnpm build        # 生产构建
pnpm generate     # 静态生成
```

## i18n 约定（一期：zh-Hans 默认 + en）

- **界面串**一律进 `apps/docs/i18n/locales/{zh-Hans,en}.json`（主语言 zh-Hans，双语言 key 集合必须同构），组件内用 `useDocsI18n()` 的 `t()` / `tm()`（Nuxt 自动导入；不要裸写 `useI18n`——`tm` 必须逐叶子解析预编译 AST，否则水合失配，见 `composables/use-docs-i18n.ts`）。
- **正文**走 `apps/docs/content/{zh-Hans,en}/**`（@nuxt/content 双 collection）；组件页 frontmatter 的 `title` / `description` 直接进 `useSeoMeta`，每语言独立 `title` / `og:*`（见 `pages/components/[...slug].vue`），`<title>` 模板在 `app.vue`。
- **demo 预览文案**：key 结构 `demos.<目录>.<示例>.<角色>`（如 `demos.checkbox.basic.agreeLabel`，示例名 = 文件名去掉 `<目录>-` 前缀与 `-demo.vue` 后缀），跨组件通用短语收敛在 `demos.common.*`。script 里取值必须包 `computed(() => t(...))` / `computed(() => tm(...))`，语种切换才会重算。英文正文 `#code` 围栏里的界面文案要与 `en.json` 的译文**逐字一致**（`/en` 页的预览与代码样例才对得上）。
- **闸门**：`pnpm i18n:check`（已接入 `pnpm check` / CI）阻断两件事——① 双语言 key 集合不一致；② pages / layouts / components / composables / data / plugins / utils 里**剥掉注释后**残留的中文界面串。有意硬编码（当前仅语言切换控件的目标语种标签）写进 `scripts/i18n-check.mjs` 的 `HARDCODED_ALLOW` 并注明理由。

## WindowsOS 仿真边界（0.4.0 起，呈现在文档站可见处）

本站在 0.5.0 起往「Windows 11 + WinUI 3 Gallery 实机」方向做**外观与交互仿真**，用于展示组件组合后的真实观感。边界必须与根 README 的「不夸大承诺」一致，**不要把仿真说成还原系统能力**：

- **仿真到什么程度**：一个「桌面」承载**多个应用窗口**，窗口之间有**层级（z 序）与焦点切换** —— 点窗口内部把它带到最前；任务栏 / 开始菜单的应用入口负责打开 / 还原 / 最小化；每个应用保留自己的窗口状态（最小化 / 最大化 / 关闭 / 位置 / 窗口内标签）。窗口内有标题栏与内容区（UI Gallery 另有导航面板与标签条）；底部任务栏承载开始按钮、**应用入口**与系统托盘（版本 / 语言 / 主题 / 时钟）。菜单 / 下拉仿真到「能打开面板、能键盘走条目、能选中、能进子菜单」。
- **明确不做**：边缘吸附、贴边顶满、窗口吸附、任务视图（Win+Tab）、高级多窗口布局；以及真实文件系统、真实拖放排序、系统级动画复刻、动态壁纸；不接任何内部 Windows 能力。
- **移动端不仿桌面**：窗口按断点降级为全屏无边框（所有窗口几何相同 ⇒ 同一时刻只有最上层窗口可见，用任务栏入口切换）；任务栏**不整条隐藏**，而是压缩成常驻窄条（开始按钮常驻、图标区用两个箭头左右滚动且不出现原生滚动条、托盘保留时钟并把其余图标收进展开菜单）。
- **构件归属**：窗口外壳 / 标题栏 caption 按钮组合 / 任务栏 / 开始菜单 / 系统托盘属**应用级组合**，落在 `apps/docs`（必要时 `apps/playground`）；只有通用 WinUI 控件才进 `@fluere-vue/ui`（如 `FluereAppWindow` / `FluereCaptionButtons` 的**组件本体**在组件库，桌面与任务栏的**组装**留在站点）。
- **工作量口径**：文档站外壳的工作量与组件库**分开统计**（见 `docs/todo.md` 的 0.5.0 表：组件点 + 文档站点），避免 0.9.0 被双重低估。

## 站点主页与桌面外壳的落点（0.5.6 起）

**主页（`/`）是常规营销页**：走 `layouts/home.vue`（固定 header + 滚动视口 + 路由遮罩），
正文是与桌面窗口共用的 `components/home/home-content.vue`（`variant` 缺省即 `page`）。

**桌面仿真在独立路由 `/os`**：`pages/os/index.vue`（`layout: 'os'`）+ `layouts/os.vue`。
0.5.5 时它整屏接管主页，0.5.6 迁出 —— 这样仿真可以作为独立章节继续演进
（0.5.6 的任务栏图标组 / 0.5.7 的开始菜单 / 0.6+ 的地址栏），而不必让整站主页
承担仿真的全部布局约束。主页 header 与 CTA 区各有一个入口指向它
（i18n key `nav.desktopSimulation` / `home.ctaCards.os`）。

外壳是应用级组合，实现只在 `components/shell/`、`components/home/` 与下表列出的文件里，
**不进组件库**：

| 文件                                     | 职责                                                                                                                                                           |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pages/os/index.vue`                     | `/os` 页面：挂载桌面外壳 + 路由遮罩（`layout: 'os'`）                                                                                                          |
| `layouts/os.vue`                         | `/os` 专用布局：只转发 slot（桌面自己接管视口，不能再包一层定位上下文）                                                                                        |
| `layouts/home.vue`                       | 主页专用布局：固定 header（导航含 `/os` 入口）+ 滚动视口 + 遮罩；header 在滚动视口**之外**（ScrollView 用内容节点的 transform 平移，会把 sticky 祖先一起拖走） |
| `components/home/home-content.vue`       | 营销内容（主页与桌面窗口共用；`variant="desktop"` 多渲染《仿真边界》）                                                                                         |
| `components/home/home-route-overlay.vue` | 路由切换骨架遮罩（主页布局与 `/os` 共用）                                                                                                                      |
| `components/shell/desktop-shell.vue`     | 外壳根：三层编排、**窗口管理器持有者**（多窗口 z 序 / 焦点 / 逐窗测量）、桌面档断点                                                                            |
| `components/shell/desktop-wallpaper.vue` | 壁纸层（Mica 纯色基准的令牌化渐变近似）                                                                                                                        |
| `components/shell/shell-window-host.vue` | 窗口宿主（每扇应用窗口一个）：框体 + 几何类名 + 层级内联值 + 拖拽收敛 + 焦点，内容用字面量分支分派                                                             |
| `components/shell/ui-gallery-window.vue` | UI Gallery 应用的内容：`FluereNavigationView` + `FluereTabView`，按标签渲染三个视图（0.5.7 起不落任何站点 chrome，标题栏按 `UpdateHeight` 收为 32）            |
| `components/shell/render-lab-window.vue` | Render Lab 应用的内容：`<canvas>` + WebGL2 持续旋转的彩色三角（令牌取色、reduced-motion 静止帧、上下文丢失降级）                                               |
| `components/shell/shell-chrome.vue`      | 站点 chrome 控件组（版本 / 语言 / 主题三个系统状控件）；任务栏托盘内联、托盘弹出菜单与主页 header 共用同一份清单（0.5.7 起不落窗口内）                         |
| `components/shell/shell-taskbar.vue`     | 任务栏（0.5.6/0.5.7 完整三段式：开始按钮 / 图标区（箭头滚动、无原生滚动条）/ 托盘（时钟 + 窄档压缩弹出菜单））                                                 |
| `components/shell/shell-start-menu.vue`  | 开始按钮 + 开始菜单面板（MenuFlyout 形态 + `useFocusTrap` 键盘焦点管理；0.5.7）                                                                                |
| `components/github-mark.vue`             | GitHub Invertocat 字形（单份 path；`github-link` / 任务栏固定入口 / 开始菜单条目共用）                                                                         |
| `utils/shell-apps.ts`                    | **仿真应用注册表**（id / 标题 key / 副标题 key / 图标）单一事实源：任务栏入口、开始菜单条目、窗口标题共用                                                      |
| `utils/shell-window-state.ts`            | 窗口 / 标签 / **窗口管理器**（按应用分桶 + z 序 + 焦点）**纯状态机**（在 vitest 里单测）                                                                       |
| `utils/shell-views.ts`                   | **UI Gallery 应用内**的窗口视图（id / 图标 / 标题 key）数据源：导航面板与标签条共用                                                                            |
| `utils/render-lab.ts`                    | Render Lab 的纯计算（backing store 尺寸 / 旋转角 / 旋转矩阵 / 交错顶点数据；在 vitest 里单测）                                                                 |
| `utils/shell-clock.ts`                   | 托盘时钟的 `Intl.DateTimeFormat` 格式化（纯函数，随 locale；在 vitest 里单测）                                                                                 |
| `utils/docs-repo.ts`                     | 仓库地址单一事实源（`GithubLink` 与任务栏 / 开始菜单的 GitHub 入口共用）                                                                                       |
| `assets/docs-shell.css`                  | `--docs-header-h` 与 `--shell-*` 构图变量（全站唯一 `:root` 事实源）                                                                                           |

## 仿真应用系统（0.5.9 起）

「仿真应用」= 桌面上的一个应用身份 = **一扇窗口 + 一份窗口内容**。0.5.5–0.5.8 只有一扇
「Explorer 窗口」，0.5.9 起它成为独立应用 **UI Gallery**，并新增最小第二应用
**Render Lab**（WebGL2 绘制持续旋转的彩色三角）—— 多窗口的层级 / 焦点切换必须有第二扇窗口
才谈得上验收。

| 概念               | 落点                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| 应用身份（元数据） | `utils/shell-apps.ts`：id / 标题 key / 副标题 key / 图标（任务栏、开始菜单、窗口标题共用）       |
| 窗口状态与层级     | `utils/shell-window-state.ts#ShellWindowManagerState`：按应用分桶的窗口状态 + z 序 + 焦点        |
| 窗口框体与几何     | `components/shell/shell-window-host.vue` + `assets/docs-shell.css` 的 `.docs-shell-window--<id>` |
| 窗口内容           | `components/shell/ui-gallery-window.vue` / `render-lab-window.vue`（宿主用**字面量分支**分派）   |
| 应用入口           | `shell-taskbar.vue` 中间图标区 + `shell-start-menu.vue`「已固定」（都消费 `SHELL_APPS`）         |

口径（改动前先读）：

- **本期只做层级管理与焦点切换**：点窗口内部置顶 + 聚焦；任务栏 / 开始菜单入口打开 / 还原 /
  最小化；每扇窗口保留自己的最小化 / 最大化 / 关闭 / 位置 / 窗口内标签。**不做**边缘吸附、
  贴边顶满、窗口吸附、任务视图（Win+Tab）、Alt+Tab、高级多窗口布局（口径与证据写进
  `docs/design/explorer-layout.md` §8）。
- **层级只引用刻度**：某窗口的 z 值 = `calc(var(--zIndexWindow) + rank * var(--zIndexStep))`，
  由 `windowZIndex()` 生成内联值（rank = 它在 z 序里的下标，上限 `SHELL_MAX_WINDOWS` = 8，
  保证不会抬到 `--zIndexContent`(100) 之上）。窗口**DOM 顺序固定为注册表顺序**，层级只由
  z 值表达 —— 不按焦点重排 DOM，因为 Render Lab 的 canvas 被搬动有丢上下文的风险。
- **入口按应用组织**：任务栏图标区与开始菜单「已固定」都是「每个应用一个图标」，
  视图（首页 / 组件 / 指南）的切换只在窗口内的导航面板与标签条（`utils/shell-views.ts`
  已收窄为 UI Gallery 内部视图，不要再接回任务栏 / 开始菜单）。
- **关闭不再有全局占位卡片**：关掉的窗口留在任务栏入口上（指示条熄灭，点入口重开）——
  与实机一致，也是「关闭不伪装成坏按钮」的天然满足（0.5.5–0.5.8 的桌面中央
  「窗口已关闭 / 重新打开」占位卡片与 `shell.closed.*` 文案已删除）。

### ClientOnly 边界（0.5.9 起，仅文档站实现侧）

`/os` 用 `<ClientOnly>` 包住 `DesktopShell`（落点唯一：`pages/os/index.vue`，带等高的
`#fallback` 占位）。**原则**：`apps/docs` 的桌面仿真组件一律实现为 ClientOnly 组件，
**其内部可以不做任何 SSR 检查** —— 不需要 `import.meta.client` 判空、能力探测兜底、
"服务端渲染空文本"的水合口径。

- 完整原则与理由见 [docs/ssr-guide.md](../../docs/ssr-guide.md)〈Level 2B — 文档站桌面仿真的 ClientOnly 边界〉；
- **只适用于 `apps/docs` 实现侧**：`packages/ui` / `packages/hooks` / `packages/utils` 仍必须
  SSR 安全（`ssr-smoke.test.ts` 的 `renderToString` 防线不动）；
- 用 `<ClientOnly>` 而**不是** `definePageMeta({ ssr: false })`：后者会把 `/os` 从静态产物里
  摘掉（`nuxt generate` 静态部署 ⇒ 线上 404）；
- 代价：`/os` 的预渲染 HTML 没有桌面结构（首屏是占位），SEO head 仍由 `useSeoMeta` 直出。

几条约束（改动前先读，均已被 `utils/__tests__/shell-style-contract.test.ts` 守住）：

- **外壳在页面里显式 `import`**，不依赖 Nuxt 自动导入 —— `components/shell/**` 走默认扫描会得到 `ShellDesktopShell` 这类前缀名，读起来像组件库的 `Fluere*`。
- **UI Gallery 的视图内容由窗口内容层渲染**（`ui-gallery-window.vue` 按标签 id 分派：首页 = `home-content.vue`、组件 = 注册表卡片网格、指南 = 两个起步入口）。0.5.5 曾由页面经 `DesktopShell` 的 `#home` / `#guide` 插槽注入，迁移到 `/os` 时删掉了这条链路：知道「有哪些标签、当前激活哪个」的是窗口内容层，页面层只负责挂外壳。
- **视口相关一律用 CSS 断点**（`@media (max-width: 63.999rem)`），不用 `useMediaQuery` 参与渲染 —— 理由**不再是 SSR**（外壳在 `ClientOnly` 之内）：CSS 断点随 resize 天然生效，没必要再引一条 JS 分支。`useMediaQuery` 只做副作用（退到移动档时复位**所有**窗口的拖拽位移、升到桌面档时收起托盘弹出菜单）。
- **窗口拖拽位移的收敛只保证「标题栏完整可见」**：规则是 `utils/shell-window-state.ts#containWindowOffset`（纵向放开、窗口本体可挂在任务栏之下；横向不放开），拖拽中（`shell-window-host.vue`，按**增量**位移，撞边界后反向无死区）与视口变化后（`desktop-shell.vue#containAllOffsets`，`ResizeObserver` + `window.resize`，**逐窗口**收敛）**共用同一条**。几何量（窗口尺寸 / 静止位置 / 标题栏下缘）一律**实测**，不要在 TS 里重算 CSS 的 `min(...)` / 居中公式 / 标题栏高度。规则、来源与实测数据见 `docs/design/explorer-layout.md` §1.1。
- **层级只引用 `--zIndex*` 刻度**，不写裸 `z-index`；`--zIndexShell`(1500) 是任务栏专用档，`--zIndexStartMenu`(1600) 是开始菜单档，`--zIndexContent`(100) 用于主页 header 与移动下拉这一档应用层 chrome。
- **色值 / 圆角 / 阴影一律走令牌**：窗口的圆角与阴影归 `FluereAppWindow`（`maximized` 时自行归零），外壳不得再写一份。
- **不把 `h-[...]` 写在 `FluereNavigationView` 根上**：该组件根自带 `block-size: 100%`，特异性压过工具类 ⇒ 高度静默失效。给它一个确定高度的父容器 + `flex-1 min-h-0`。
- **组件 ref 一律经 `$el` 取元素**：模板 ref 落在组件上拿到的是实例。已踩过一次：按 `HTMLElement` 声明并直接调 `getBoundingClientRect()`，运行时一调 DOM 方法就 `TypeError`、整页被错误页替换（单测发现不了）。
- **站点 chrome 只有一份控件清单**（`shell-chrome.vue` = 版本 / 语言 / 主题）：0.5.7 起它的落点是「任务栏托盘内联（≥ 64rem）/ 托盘弹出菜单（< 64rem）/ 主页 header」，三处共用；GitHub 按语义拆出清单（入口类控件 → 任务栏中间图标区 + 主页 header 的 `GithubLink`），**不要**把清单抄成两份，也不要恢复 `flex-wrap`。历史证据（48px 标题栏装不下四个控件的实测）见 `docs/design/explorer-layout.md` §6.3。
- **外壳里的浮层一律走 `useFocusTrap`**（`@fluere-vue/hooks`，0.5.7 下沉）：开始菜单与托盘弹出菜单的 Tab 陷阱 / Esc / 点击外部 / 焦点归还都在这个原语里，组件只翻开关 —— 不要在外壳里手写第二份焦点管理。
- **任务栏图标按钮的几何与状态只有一份**：命中区 40×40 / 图标 24px / 槽距 4px / 任务栏左右内边距 12px（托盘右端再留 8px = 「显示桌面」条占位），hover / pressed 用 WinUI 控件填充阶梯 + 1px 内描边。规则在 `assets/docs-shell.css` 的 `.docs-shell-taskbar-icon`（开始按钮与**应用入口**共用），**不要**在某个 SFC 里再写一套：库的 `FluereButton` scoped 规则特异性更高，站点直接覆盖同名属性会被静默吃掉，故那里改的是库读取的自定义属性（`--colorSubtleBackgroundHover/Pressed`）+ `outline-offset: -1px` 描边。逐项实测值与来源见 `docs/design/explorer-layout.md` §4。
- **外壳内不用原生 `title`，提示一律 `FluereTooltip`**：`--zIndexTooltip`(1400) 低于任务栏的 `--zIndexShell`(1500)，所以外壳在挂载时把自己登记进浮层层级栈（`acquireLayer('--zIndexShell')`，见 `desktop-shell.vue`），外壳内打开的浮层按 `--zIndexStep` 抬到 1510。**不要**试图覆写 `--fui-tooltip-z`（提示面的 z 由 `useFlyout` 内联下发，覆写无效，实测记录在 §4）。

仿真边界（上一节的五条）已作为**可见文案**落在 `/os` 窗口「首页」视图的滚动区末尾
（i18n key `shell.boundary.*`，只在 `home-content.vue` 的 `variant="desktop"` 渲染），
不再是只写在文档里的承诺 —— 它跟随仿真本身，因此不在主页上。
