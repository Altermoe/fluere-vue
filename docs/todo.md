# Fluere Vue 路线图与实施清单（TODO）

> **依据**：使用频率 × 需求度 × WinUI 还原成本 × `reka-ui` 底座可用性。
> **核心交付基准**：不用手写任何 HTML，即可搭出「设置页 + 数据录入表单 + 带加载 / 提示反馈的页面」的 WinUI 应用。
> **已落地约束**：SSR 安全（见 [ssr-guide.md](./ssr-guide.md)）、`@fluere-vue/designs` 令牌、`@fluere-vue/hooks` / `utils` 共享原语、`pnpm check`（lint + format + tsc）+ SSR smoke 测试。
>
> 本文档只记**进度、结论与验收口径**：规格源路径、资源 → 令牌映射、动效关键帧等技术细节写在对应组件的契约注释与 [style-spec.md](./style-spec.md)，此处不重复。
> 每个组件改动的合并闸门见《人工校验闸门（0.4.0 起生效）》。

## 版本地图

| 版本        | 状态   | 主题                                                                                                               |
| ----------- | ------ | ------------------------------------------------------------------------------------------------------------------ |
| 0.1.0-rc.1  | 已收口 | 通用 WinUI 控件清单                                                                                                |
| 0.3.0-rc.1  | 进行中 | 能被用起来：i18n / 文档站 WindowsOS 仿真化 / **自动发版流程**（npm 首发 `0.3.0-alpha.2` 已于 2026-10-13 手动发布） |
| 0.4.0       | 待开工 | Explorer 基建 + 通用件收尾                                                                                         |
| 0.5.0       | 待开工 | Explorer 骨架（首页 hook 首次上线）                                                                                |
| 0.6.0       | 待开工 | 地址栏 + 命令层                                                                                                    |
| 0.7.0       | 待开工 | 数据层 ①：项基座 + 列表                                                                                            |
| 0.8.0       | 待开工 | 数据层 ② + 布局收尾                                                                                                |
| 0.9.0-rc.1  | 待开工 | 质感分支（独立 minor）                                                                                             |
| 0.9 → 1.0.0 | 待开工 | 收尾窗口（4–8 周）                                                                                                 |

---

## 0.1.0-rc.1 计划范围（组件 Wave 计划，已收口）

> 本节从 README 迁入（2026-10-13），回答「rc.1 按什么顺序做、哪些控件明确不做」。逐项勾选状态与规格源见下一节《0.1.0-rc.1 · 通用 WinUI 控件（已收口）》。

实施顺序按「使用频率 × 需求度 × WinUI 还原成本 × `reka-ui` 底座可用性」排列：

- **Wave 1 · 核心表单**：Checkbox、ToggleSwitch、RadioButton / RadioGroup、Slider、NumberBox、Combobox
- **Wave 2 · 反馈与状态**：ProgressRing、ProgressBar、InfoBar、InfoBadge
- **Wave 3 · 弹层与微交互**：ContentDialog（含共享弹层原语 `FluereSmokeLayer` / `useDisclosure`）、Tooltip / TooltipProvider
- **Wave 4 · 加分项（原计划）**：ToggleButton / ToggleGroup、Avatar / Persona、DropDownButton
- **首次发布未包含、后续版本排期**：NavigationView、ListView / GridView、CommandBar（rc.1 明确不做的清单与去向见下文《rc.1 明确不做》）

### 早期路线图（已被后续排期取代）

以下是项目启动期的四阶段高层规划，**内容已被本文件下半部分的《版本地图》与《0.4.0 – 0.9.0-rc.1 排期》取代**，仅保留作为历史记录，不再维护：

- **阶段一 · 核心表单**：Button 族、CheckBox、RadioButton、TextBox、Slider、ToggleSwitch 等
- **阶段二 · 导航与容器**：NavigationView、TabView、TreeView、ListView 等
- **阶段三 · 动效与材质**：整理统一的动画实现，继续完善 Mica / Acrylic 效果
- **阶段四 · 无障碍与发布**：补充单元测试和视觉回归，发布 npm 包并上线文档站

---

## 0.1.0-rc.1 · 通用 WinUI 控件（已收口）

范围：通用 WinUI 控件。本版回答「组件够不够用」。

- [x] 0. 收尾 Input（password / textarea / 大小与有效性状态）—— **已由 0.4.5 落地**（含 header / description），在此保留仅为编号连续

### Wave 1 · 核心表单（最高频，先形成「数据录入」闭环）

排序依据：① 被依赖程度 ② 还原成本 从低到高。

- [x] 1. `Checkbox`
- [x] 2. `ToggleSwitch`（WinUI 标志性控件，自定义实现）
- [x] 3. `RadioButton` / `RadioGroup`
- [x] 4. `Slider`
- [x] 5. `NumberBox`
- [x] 6. `Combobox`（下拉箭头动画、popup 定位、选中态最费劲，故放队尾）

### Wave 2 · 反馈与状态

- [x] 7. `ProgressRing`
- [x] 8. `ProgressBar`
- [x] 9. `InfoBar`（信息横幅，自定义实现）
- [x] 10. `InfoBadge`（三态 Value / Icon / Dot 按显示属性实时推导）

### Wave 3 · 必要弹层与微交互

> 先补齐共享原语，再实现弹层，避免后续所有弹层组件返工。

- [x] 11. 共享原语：`useDisclosure` / 门户 / 遮罩层
- [x] 12. `Tooltip`
- [x] 13. `ContentDialog`

> 9–13 的规格源统一为 `microsoft-ui-xaml` tag `winui3/release/2.5.1`（与 WinUI3 Gallery v2.9.3 所用 WASDK 逐字节核对）；资源 → 令牌映射、动效关键帧与几何判据逐条写在对应组件的契约注释里。

### 加分项（原 Wave 4）

- [ ] 14. `ToggleButton` / `ToggleGroup` → **0.4.0**
- [ ] 15. `Avatar` / `Persona` → 未进 0.4–0.9 范围，待重排
- [ ] 16. `DropDownButton` → **0.6.0**

### rc.1 明确不做

> 以下控件工程量大、还原风险高，硬塞进 0.1.0-rc.1 会稀释核心质感，该判断保持不变。

- **已排入后续版本**：`NavigationView`（0.5.0）、`ListView` / `GridView`（0.7.0）、`CommandBar`（0.8.0）
- **继续推后**：`TreeView`、`DataGrid`、`CalendarDatePicker` / `TimePicker`、`MenuBar` 完整版、`RatingControl`

注：本节判断针对 **0.1.0-rc.1 的范围**；这些控件是否交付、排在哪个版本，一律以《0.4.0 – 0.9.0-rc.1 排期》为准。

### 发布检查

- [x] `pnpm check`（lint + format + tsc）
- [x] `pnpm test` / SSR smoke（`packages/ui/src/__tests__/ssr-smoke.test.ts`）
- [x] 用 Wave 1 子集在 `apps/playground` 搭一个真实设置页做视觉回归（rest / hover / pressed / selected / focus / disabled）—— **已由 0.4.8 落地**：`apps/playground` 从占位包变为可跑的 Vite 视觉回归页（`pnpm --filter @fluere-vue/playground dev`，默认 60728），一屏陈列 Wave 1 表单 + 按钮族（含 ToggleButton 三态 / ToggleGroup 单选多选）+ 反馈 + 浮层 + 明暗切换，《视觉自检清单》见该包 README
- [x] 为每个新组件补文档页 + 更新 README「组件进度」索引

> 自 0.4.0 起，发布检查按**每个 minor 版本**执行，清单见《发布检查（0.4.0 起）》。

---

## 0.3.0-rc.1 · i18n / 文档站仿真化 / 自动发版流程（进行中）

> **分工**：0.1.0-rc.1 回答「组件够不够用」，本版回答「能不能被用起来」——多语言可读、文档站能体现 WinUI 质感，并且真正发到 npm 线上。
> **发版口径（2026-10-13 收敛）**：**人工首发已完成**（六个包 `0.3.0-alpha.2` 已上 npm），0.3 余下的发版目标改为**把自动发版流程跑通**（Trusted Publisher + `release.yml` 的 `pack` / `publish`），不再重复人工发版。
> 三条主线可并行，但发布前必须一次性收口：版本号、README / 文档站版本展示、CHANGELOG、本文件勾选状态。
> **交付基准**：`pnpm add @fluere-vue/ui@0.3.0-alpha.2` 在 npm 上可用（**已达成**）；文档站中英双语可读且呈现 WinUI 质感；自动发版流程由 `release.yml` 在线发布一次（OIDC + provenance）；三个消费场景（Vite SPA / Nuxt SSR / 纯类型引用）全部验证通过。

### 目标 1 · 集成 i18n（一期：简体中文 + 英语）

> 范围（已确认）：**文档站全站 + 组件库内建文案通道与语言包导出**。
> 一期语言：`zh-Hans`（默认，兼容 `zh-CN`）与 `en`。

**进度速览（2026-10-10）**：文档站一期基本收口——1.1 的 per-page title / description / og 已接入 head（sitemap / robots 见 1.1，已接入）、1.2 的 demo 预览文案（93 个文件里 81 个含中文）与英文正文代码样例全部抽 key 双语对齐、硬编码中文扫描升级为**阻断项**（另新增「key 引用存在性」检查）；`pnpm docs:generate` 双语言产物已复核，浏览器实测 `/` 与 `/en` 全 18 页通过（300 项断言 0 失败，见 1.5 验收）。**组件库 i18n 通道（1.4）已落地**（见下方 1.4：`@fluere-vue/hooks` 增 `provide-locale`/`use-locale`/`useScopeMessages`，`@fluere-vue/ui` 增 `FluereConfigProvider`，首批 6 组件 locale 切片，回退链 `zh-Hans→zh→en` 与并发 SSR 隔离已单测覆盖）。仍未收口：1.5 的 Lighthouse / axe 实跑、目标 3 的 `@fluere-vue/ui/locales/*` 子路径导出（1.4 已在组件目录内布好 `locale.ts` 切片，聚合入口随 0.3 构建落地）。

#### 1.1 选型与基建

- [x] 落地 `@nuxtjs/i18n`（锁定 `10.6.0`）：`strategy: 'prefix_except_default'` + `@nuxt/content` 双 collection + `nuxt generate` 三者组合可用，产物同时含 `/` 与 `/en`
- [x] locale 约定：`defaultLocale: 'zh-Hans'`，`zh-Hans` 以 `language: 'zh-CN'` 呈现；产物 `<html lang>` 实测为 `zh-CN` / `en`
- [x] 目录约定：界面串 `apps/docs/i18n/locales/{zh-Hans,en}.json`；正文 `apps/docs/content/{zh-Hans,en}/**`
- [x] 首帧语言恢复：**未采用内联脚本方案**，改为「语言由路由前缀决定」——`<html lang>` 与路由一致，故无「先 zh 后切 en」闪烁，也不存在水合不匹配；浏览器偏好仅在根路径做服务端重定向
- [x] `hreflang` alternate 与 `og:locale` / `og:url` 由 `useLocaleHead({ seo: true })` 输出，实测四组 alternate 齐备
- [x] 每语言独立的 `title` / `description` / `og:title` / `og:description`：**已落地**——组件页取 content frontmatter（`pages/components/[...slug].vue` 的 `useSeoMeta`，回退态随正文为中文）、Overview 与首页取 i18n key；`<title>` 模板在 `app.vue`（`<页面标题> · FluereVue`，首页回落品牌名）。实测：`/components/checkbox` → `Checkbox 复选框 · FluereVue`，`/en/components/checkbox` → `Checkbox · FluereVue`，og 与 description 随语种
- [x] sitemap 按语言拆分 + robots.txt：**已落地**（接入 `@nuxtjs/sitemap` `9.1.0` + `@nuxtjs/robots` `7.0.2`，随 nuxt 升级到 `4.6.1` 一并引入；`nuxt generate` 产出 `/sitemap.xml` 索引 → `/__sitemap__/zh-CN.xml` / `/__sitemap__/en.xml` 两份按语言拆分、各带 `hreflang`（zh-CN / en / x-default）alternate 的子 sitemap，以及 `/robots.txt`（全站 Allow + `Sitemap: /sitemap_index.xml`）。配置见 `apps/docs/nuxt.config.ts` 的 `site` 段与 `robots` 配置（sitemap 走模块缺省））

#### 1.2 界面串与导航

- [x] 全部可见文案抽为 key（71 个）：首页 feature 卡片 / stats / ctLinks / `navLinks` / 主题切换 / 布局 header / 移动端 nav / 页脚；`pages/` 与 `layouts/` 下已无硬编码可见中文
- [x] `components-nav.ts` 改为「结构化事实 + i18n key」，显示名与摘要按当前 locale 运行期解析，消除中英混写的双字段
- [x] 语言切换控件 + 记住上次选择（cookie）。**当前落位在文档页 header**，迁到目标 2 的托盘 / 任务栏属目标 2 范围
- [x] 组件文档页内示例标题、说明、提示框文案双语：正文与示例标题已双语；**demo 预览内的可见文案已全部抽 key**（结构 `demos.<目录>.<示例>.<角色>`，跨组件通用短语收敛 `demos.common.*`，script 侧取值一律包 `computed`），`en` 正文 `#code` 围栏译文与 `en.json` 逐字一致。证据：zh 值与 HEAD 逐字比对 434/434 且逐文件归属正确；浏览器实测 `/en` 全 18 页正文与代码样例无汉字
- [x] 站点内新增文案一律走 key：`pnpm i18n:check`（接入 `pnpm check` / CI）现**阻断三件事**——key 集合一致、剥注释后残留硬编码中文、`t()` / `tm()` 字面量引用不存在的 key；语言切换按钮的目标语种可访问名与缩写为有意硬编码，已入 `scripts/i18n-check.mjs` 的 `HARDCODED_ALLOW` 白名单（带理由）

#### 1.3 内容双语

- [x] 组件文档 + 首页正文译为英文：16 个组件在 `content/zh-Hans/components/` 与 `content/en/components/` 各一份，中英行数基本等量
- [x] 英文缺失回退：`fallbackLocale: 'zh-Hans'`，英文版缺失时展示中文并提示「该页暂无英文版」，不做静默混杂
- [x] 双语边界：进文档站的内容双语；`docs/ssr-guide.md`、`docs/design/*`、本文件等仓库内部文档保持中文

#### 1.4 组件库 i18n 通道（一期只建通道 + 首批文案）

> **状态：已落地**（2026-10-10）。`@fluere-vue/hooks` 增 `provide-locale` / `use-locale` / `useScopeMessages`（实例级 provide/inject，复用 `@intlify/core-base`，无 `vue-i18n` 运行时）；`@fluere-vue/ui` 增 `FluereConfigProvider`。首批 6 组件接入 locale 切片；回退链与并发 SSR 隔离已单测覆盖（见 1.5）。

- [x] `packages/hooks` 增 `provide-locale` / `use-locale`，`packages/ui` 增 `FluereConfigProvider`：基于 provide/inject 的**实例级** locale，禁止全局可变单例（否则 SSR 多请求间会串语言）——`provideLocale` / `useLocale` / `useScopeMessages` 在 `packages/hooks/src/use-locale.ts`，`FluereConfigProvider` 在 `packages/ui/src/config-provider/config-provider.vue`
- [x] 语言包形态：`@fluere-vue/ui/locales/zh-Hans`、`@fluere-vue/ui/locales/en`，按组件分组、可 tree-shaking；解析优先级：组件 `locale` prop → provider → 内置默认——采用「每组件一个 `locale.ts` 切片、组件自 import」（如 `packages/ui/src/input/locale.ts`）；包级子路径导出 `@fluere-vue/ui/locales/*` 的聚合入口随 0.3 目标 3 构建落地（已记录）
- [x] 首批纳入的文案：内置 a11y 可访问名（loading / close / 显示密码 / 增减 / 滚动条 方向/拇指）、后续 ProgressRing / InfoBar 的默认文案——`input` / `number-box` / `scroll-view` / `infobar` / `progress-ring` / `progress-bar` 六组；日期与数字一律走 `Intl`（NumberBox 的 `locale` / `formatOptions` prop，不并入文案通道）
- [x] 组件库不引入 `vue-i18n` 运行时依赖，由 provider 注入 message resolver，并在 `packages/ui/README` 与文档站说明用法——复用 `@intlify/core-base`（`createCoreContext` / `translate` / `resolveValue` / `fallbackLocale`）；`packages/ui/README.md` 增 i18n 节；文档站新增 `config-provider` 双语页
- [x] 回退链明确：`zh-Hans → zh → en`，缺 key 时落到 `en` 并只在开发环境告警——`packages/utils/src/locale.ts` 的 `normalizeLocale` / `resolveFallbackChain`；hooks 层 `onMissing` 在开发环境告警

#### 1.5 质量与验收标准

- [x] 单测：locale 解析与回退链、provider 隔离（同进程两个 app 实例互不污染）——`packages/utils/src/__tests__/locale.test.ts`（`normalizeLocale` / `resolveFallbackChain`）、`packages/hooks/src/__tests__/use-locale.test.ts`（回退链、Provider 覆盖、组件 `locale` prop 优先级、并发 SSR 隔离、客户端切 locale 即时更新）
- [x] SSR 冒烟：`packages/ui/src/__tests__/ssr-smoke.test.ts` 在 `zh-Hans` / `en` 两种 locale 下均通过——新增「locale 内建文案 + 并发不串语言」describe：NumberBox / InfoBar / ProgressRing / ProgressBar 在两种 locale 下 SSR 直出对应文案，并覆盖同进程两请求并发隔离
- [x] 文案完整性检查脚本：已从「key 集合对比」扩展为**三项**——key 集合一致、剥注释后的硬编码中文扫描、`t()` / `tm()` 引用存在性，任一缺失即失败；已接入根 `pnpm check` / CI
- **验收（2026-10-10 复核）**：
  - 文档站任意页面在 `/`（中文）与 `/en` 下无遗漏串（专有名词、代码、API 名除外）：**已达成**（Playwright 实测 `/` 与 `/en` × 18 页共 300 项断言 0 失败：`/en` 正文与代码样例无汉字、无 `demos.*` key 泄漏、title / description / og 随语种；中文站抽查串逐条保留）；控制台无 i18n 警告：**已实机核对**（开发环境 `missingWarn` / `fallbackWarn` 打开，全部页面 0 条 intlify 告警、0 条 hydration 告警）
  - `pnpm docs:generate` 产出两种语言的静态页面：**已达成**（2026-10-10 复核：78 条路由，`dist/` 与 `dist/en/` 各含 16 个组件页，`<html lang>` 分别为 `zh-CN` / `en`，alternate 四组齐备；`/en` 产物剥除 script / style 后无汉字，`<title>` / `og:*` / description 按页与语种独立，中文页 demo 抽查串保留）；切换语言为**客户端路由跳转**（`setLocale()` + `navigateTo(switchLocalePath())`），非整页重载。**注**：本机 Node 默认 2 GB 堆上限下 nitro prerenderer 初始化即 OOM，已在干净树（`git stash` 后）复现——属**既有环境问题**、非本次改动引入；`NODE_OPTIONS=--max-old-space-size=4096` 后通过
  - provider 切换 locale 时组件内建文案即时更新、两个并发 SSR 请求不串 locale：**已达成**（hooks 单测覆盖同进程两 app 互不污染 + 客户端切 locale 即时更新；ssr-smoke 覆盖两种 locale 的并发 SSR 隔离）
  - Lighthouse / axe 不出现 `lang` 相关告警，`<html lang>` 与水合结果一致：`<html lang>` 已与产物一致，Lighthouse / axe **尚未实跑**
- **非目标（推后）**：RTL、第三种语言、翻译平台（Crowdin / Locize）工作流、组件文档逐页人工润色（一期允许机翻 + 术语表人工过一遍）。

### 目标 2 · 优化文档站（往 WindowsOS 仿真方向完善）

> **判定基准**：以 **WinUI 3 Gallery + Windows 11 实机**为参照——一个「桌面」承载一个「应用窗口」，窗口内有标题栏、NavigationView、内容区；底部任务栏承载开始 / 搜索 / 语言 / 主题 / 时钟。
> **边界（必须标注，与 README「不夸大承诺」一致）**：不做真实窗口管理器——不实现拖拽吸附、多窗口、系统级动画复刻；移动端不仿桌面，走简洁响应式。

**现状**：只有 3 个页面与 1 个 layout（顶部 header + 侧栏 + 移动端 nav），全部 UnoCSS 工具类直写，无组件化抽象；无窗口外壳 / 任务栏 / 开始菜单 / 标题栏 / 命令栏，无搜索、无版本选择、无「本页目录」；版本号硬编码 `v0.0.1`。可用素材：`@fluere-vue/ui` 组件、`presetFluere`、已抽取的 Fluent 令牌（Mica / Acrylic 相关令牌需先核对是否齐备，缺的先补进 `packages/designs`）。

#### 2.1 桌面外壳（Shell）

- [x] `DesktopShell` 布局：壁纸层（令牌化的渐变 / Mica 近似）→ 窗口层 → 任务栏层；层级、圆角、阴影一律用 designs 令牌，禁止魔法值 —— **2026-10-16 随 0.5.5 落地**，实现与约束见 [apps/docs/README.md](../apps/docs/README.md#站点主页与桌面外壳的落点056-起) 与 [docs/design/explorer-layout.md](./design/explorer-layout.md)；裸 `z-index` / `#RRGGBB` / 魔法尺寸由 `apps/docs/utils/__tests__/shell-style-contract.test.ts` 守住
- [x] `FluereAppWindow`：圆角窗口、标题栏（应用图标 + 标题 + 可拖拽区）、caption 按钮（最小化 / 最大化 / 关闭，含关闭键红底 hover）、窗口内独立滚动区 —— **组件本体 2026-10-13 随 0.5.1 / 0.5.2 进 `packages/ui`**（规格 `Microsoft.UI.Xaml.Controls.TitleBar`，tag `winui3/release/2.5.1`）；窗口内独立滚动由外壳的 `FluereScrollView` 提供（`explorer-layout.md` §2）
- [x] caption 按钮**真实可用**：最小化 / 最大化 / 还原窗口视口；「关闭」不伪装成坏按钮（跳回首页或收起到任务栏），全部键盘可达（Tab + Enter）且 `aria-label` 双语 —— **0.5.5 接通状态机**：最小化 / 关闭后由任务栏入口或桌面中央占位卡片还原（`utils/shell-window-state.ts`），文案走 `shell.taskbarWindow{Minimize,Restore}` / `shell.closed.*` 双语 key
- [x] 窗口尺寸与位置在桌面尺寸变化时的响应式策略；移动端断点降级为全屏无边框 —— 常规档 1120×720 按视口 `min()` 收缩后居中 + 拖拽经 `clampWindowOffset` 收敛在桌面内；< 1024px（`lg`）降级为全屏无边框、任务栏不渲染。**降级时保留窗口内滚动**（不改为页面滚动），偏离与理由记录在 `explorer-layout.md` §2

#### 2.2 任务栏 / 开始菜单 / 系统托盘

- [ ] `Taskbar`：居中图标组（开始、搜索、已固定入口）、hover / active 指示条、点击弹出或还原窗口
- [ ] `StartMenu`：Acrylic 面板承载站点信息架构（首页、指南、组件、设计令牌、路线图、GitHub），支持键盘导航与 Esc 关闭
- [ ] `SystemTray`：时钟（`Intl.DateTimeFormat` 按 locale）、主题切换、语言切换（与目标 1 共用同一控件）、版本号（读 `package.json`，去掉硬编码）
- [ ] 浮层焦点管理：聚焦陷阱、Esc / 点击外部关闭；通用逻辑优先下沉到 `packages/hooks`（如 `use-disclosure`），避免后续弹层组件重复实现

#### 2.3 应用内导航（NavigationView 化）

- [ ] 把文档站 layout 重构为窗口内 `NavigationView`：可折叠面板、分组（数据源仍是 `components-nav.ts`）、顶部搜索框、底部设置项
- [ ] 组件页新增右栏「本页目录」，页头带面包屑与「复制链接」
- [ ] `Ctrl+K` 命令面板式搜索：跨组件与正文（`@nuxt/content` 查询），全键盘可完成「打开 → 输入 → 选中 → 跳转」

#### 2.4 页面与内容呈现

- [ ] 组件文档页模板化：标题区 + 示例卡片（Light / Dark 并排对照）+ 代码块（复制按钮、语言标签、行高亮）+ Props / Events / Slots 表格
- [ ] 示例的明暗对照与 `use-color-mode` 打通（示例级切换或跟随站点，二选一并记录理由）
- [ ] 新增站点页：入门 / 安装（真实可用的 `pnpm add` 指引，配合目标 3）、设计令牌浏览页、路线图 / 更新日志、404 空态（可读、可操作，不做成死胡同）
- [ ] 所有新增页面文案走 i18n key（与目标 1 同步，不新增硬编码中文）

#### 2.5 动效、性能与无障碍

- [ ] 动效全部走 designs 的时长 / 缓动令牌，并遵循 `use-reduced-motion`（`prefers-reduced-motion` 下关闭窗口与菜单过渡）
- [ ] SSR 安全：`window` / `matchMedia` / `localStorage` 一律按 `docs/ssr-guide.md` 分级处理，外壳不得引入水合不匹配
- [ ] 性能预算：限制首屏 JS / CSS 体积与 `backdrop-filter` 覆盖面积（避免「为了像 Windows 而卡」）
- [ ] 无障碍：窗口 / 任务栏 / 开始菜单的语义角色与 `aria-modal`；还原 WinUI 焦点矩形；对比度达标；装饰元素 `aria-hidden`；全部仿真控件可键盘操作
- **验收**：
  - 1280 / 1440 / 1920 与移动端均不溢出、不重叠，窗口内容可滚动到底
  - Light / Dark 下所有新表面（窗口、任务栏、Acrylic 面板）对比度达标且无「白闪」
  - 全站键盘可达：Tab 顺序合理、Esc 关闭浮层、`Ctrl+K` 打开搜索，焦点不被外壳吞掉
  - `pnpm check` / `pnpm test` / `pnpm docs:generate` 全绿，SSR 冒烟覆盖新布局
  - 视觉自检清单（rest / hover / pressed / focus / disabled × 明暗）写入站点 README 或 `docs/`，作为回归依据
- **非目标（一期）**：真实多窗口与拖拽吸附、动态壁纸、系统级动画复刻、移动端仿桌面。

### 目标 3 · 集成 npm 发布基建并完成自动发版流程

**首发前的阻塞项（2026-10-10 记录，现已全部解除；保留以说明后续版本不再受制于这些前提）**：

- 6 个包版本均为 `0.0.1`、从未发布过 → **2026-10-13 六包首发 `0.3.0-alpha.2` 上 npm**
- 包入口指向源码（无 `dist` / `.d.ts`）、`packages/themes` 连 `exports` 都没有 → 3.1 / 3.2 落地 `dist` 产物 + `publishConfig` 覆盖
- 无 `files` / `publishConfig` / `peerDependencies` / `engines`、无库构建脚本 / CI / Changesets / 根 `LICENSE` → 3.1 – 3.4 逐条补齐
- README「快速开始」标注「尚未发布」、文档站页脚硬编码 `v0.0.1` → 页脚已改为读根 `package.json`（版本单一事实源）；**README 文案尚未收口**（属 3.5）

> **进度速览（2026-10-10）**：**3.1 / 3.2 / 3.3 已全部落地**——六包补齐 `files` / `exports` / `types` / `sideEffects` / `publishConfig` / `repository` / `engines` / `peerDependencies`；构建改为 Vite 8 lib mode（纯 ESM，`pnpm -r --filter "./packages/*" build` 按拓扑产出 `dist`），`ui` 的 `.d.ts` 用 `vue-tsc` 生成；接入 Changesets（fixed 统一版本）+ 版本单一事实源（文档站读根 `package.json`）；新增“从 dist 引入并渲染”冒烟。验收脚本全绿：`pnpm check` / `pnpm test`（920） / `pnpm lint:ssr` / 全包 build / `publint`、attw（bundler 入口）。未做（截至该日）：3.4（CI/CD）与 3.5（首发），README「尚未发布」按 3.5 收口时移除。**补正（2026-10-12）**：3.3 的「CHANGELOG 自动生成」当时只有配置、从未真正跑通——`.changeset/config.json` 的 `changelog` 指向不存在的子路径（`@changesets/cli/changelog-git`）且 `fixed` 混入了 workspace 根包名，`changeset version` 直接退出 1，逐包 `CHANGELOG.md` 一个都没生成；现已修复并在一次性副本里演练通过，记录见 [docs/release.md](./release.md#版本流程演练记录2026-10-12)。

> **首发记录（2026-10-13，全程实测）**：六个 `@fluere-vue/*` 首次上 npm，版本 **`0.3.0-alpha.2`**（发布提交 `8dfa64f`）。
> 首发走**人工 bootstrap**：先用 `0.0.0-stage` 占位包预定六个包名（registry 上无入口、解包仅数百字节，description 为 “Temporary package placeholder for staged publishing”），再用粒度 token / 本机登录发布真实版本。
>
> - `dist-tags`：`alpha` 与 `latest` **同时指向 `0.3.0-alpha.2`**（当时的实测值）。**注意**：这与 2026-10-13 发 `0.4.0-alpha.1` 时的行为不同——那次 `latest` 没有移动。两次差异的成因没有证据留存，本仓库不再沿用"预发布会占 `latest`"的说法，见下方 3.5 前置约束 2。
> - 公网消费验证（本机干净目录实测）：`npm add @fluere-vue/ui@0.3.0-alpha.2 vue` 成功；`renderToString` 渲染 `FluereButton` / `FluereProgressRing` 通过；`dist/style.css` 存在（194 kB）；无 peer 警告。
> - tarball 体积（registry 元数据实测）：`ui` 104 文件 / 1.90 MB、`designs` 0.49 MB、`themes` 0.14 MB、`hooks` 0.04 MB、`utils` 0.02 MB、**`icons` 42.96 MB**（体积异类未处理）；`ui` tarball 顶层只有 `dist` + `package.json` + README / LICENSE，源码未随包发布。
> - `dist.attestations` **不存在**：首发是 token 人工发布、无 provenance，与「首次不能走 OIDC」的判断一致。
> - 版本产物**不是 changeset 消费出来的**：本次是 `pnpm release:manual` 不带参数、对已 seed 的 `0.3.0-alpha.2` **原样发布**（`.changeset/` 里 3 条 changeset 当时未消费，故 `0.3.0-alpha.2` 没有 CHANGELOG 条目）。踩坑与纠正——部署 tag `v0.3.0-alpha.2` 先指 seed 提交 `6345d74`、后移到发布提交 `8dfa64f`——见 [docs/release.md](./release.md) 的「踩坑记录：seed 版本被原样发布」。

#### 3.1 包元数据与发布体检

- [x] 逐包补齐：`files`、完整 `exports`（`import` / `require` / `types`，外加 `./style.css`、按需子路径）、`types`、`sideEffects`（CSS 例外）、`publishConfig.access: "public"`、`repository.directory`、`engines.node`、`peerDependencies: { vue: "^3.5" }`（**已落地**，含 `@fluere-vue/ui` 的 `./locales/zh-Hans` / `./locales/en` 子路径）
- [x] 根目录补 `LICENSE`（MIT © 夕云葛城）；为 `ui` / `designs` / `themes` / `icons` 补包级 README（用法与相互依赖关系）——**LICENSE 已存在**；四个包 README 已有，本轮补齐了 `utils` / `hooks` 占位 README，并为 `ui` README 增加「安装与按需引入」节（`style.css` / locales 子路径）
- [x] 版本矩阵决策：所有 `@fluere-vue/*` 统一版本号（建议统一，便于用户理解与文档站展示）——**统一**：Changesets `fixed` 分组 + `scripts/version.mjs` 双重约束，结论与操作写入 `docs/release.md`

#### 3.2 构建管线

- [x] 选定构建器（Vite 8 lib mode / tsdown / unbuild 三选一），**先做 spike 对比**：`.d.ts` 质量、Vue SFC 处理、CSS 产出、SSR 友好性、构建耗时；结论以 ADR 形式记录——**Vite 8 lib mode（纯 ESM）**，spike 与理由见 `docs/adr/0001-library-build-tooling.md`
- [x] 构建顺序按拓扑：`designs`（先跑令牌生成）→ `themes` / `icons` / `hooks` / `utils` → `ui`；`pnpm -r build` 保证依赖顺序——**已落地**（`pnpm -r --filter "./packages/*" build`）
- [x] 产物形态：ESM 为主、CJS 兼容策略明确、`.d.ts` 完整、`tokens.css` 与图标按需导入可用；`vue` / `reka-ui` / `unocss` **外部化**——**纯 ESM**（用户已确认），`.d.ts` 完整（`ui` 用 `vue-tsc` 保精确 SFC Props），`tokens.css` / 图标按需可用，`vue`/`reka-ui`/`@fluere-vue/*` 外部化
- [x] tree-shaking 验证：`sideEffects` 正确，按需引入单组件后的体积符合预期并记录基线——`// temp/treeshake` 实测：仅引 `FluereButton + useDisclosure + 1 图标` 消费产物体积 **62.13 kB（gzip 19.13 kB）**（对比全量 ui 297 kB / icons 12 MB）
- [x] 扩展 `pnpm check` / `pnpm test`：至少新增一条「从 `dist` 引入并渲染」的冒烟用例——**`packages/ui/src/__tests__/dist-smoke.test.ts`**（从 dist 按 SSR 渲染多组件 + 纯 TS 包 dist 导入；未构建时自动跳过；已纳入 `vue-tsc` 类型检查——该文件用 `node:fs` / `node:path` / `node:url` 与 `process.env`，故 `packages/ui/tsconfig.json` 显式引入 Node 环境类型）

#### 3.3 版本与变更日志

- [x] 接入 Changesets：包间依赖联动 + `rc` 预发布模式（`changeset pre enter rc` / `pre exit`）——**已接入**（`.changeset/config.json`：`fixed` 六包统一版本 + `privatePackages.version`；根脚本 `changeset` / `version:packages` / `release`；首个 changeset `.changeset/dry-pumas-build.md`）
- [x] CHANGELOG 自动生成 + 逐包 `CHANGELOG.md`；沿用现有 emoji conventional commit 规范并固化到 `CONTRIBUTING`——**已跑通**（changelog 提供方 `@changesets/cli/changelog`，`changeset version` 生成逐包 CHANGELOG）；起初误写成不存在的 `@changesets/cli/changelog-git` 子路径，导致 `changeset version` 退出 1、CHANGELOG 从未生成，2026-10-12 修复并实测通过；操作流程写进 `docs/release.md`
- [x] 版本单一事实源：文档站页脚、README、`docs/todo.md` 标题一律从 `package.json` 读取或由发布流程注入，禁止硬编码——**已达成**：文档站经 `nuxt.config.ts` 读根 `package.json` 注入版本（`use-docs-version` 归一）；`scripts/version.mjs` 改为「统一到最大版本」以配合 Changesets

#### 3.4 发布流水线（CI/CD）

- [x] `.github/workflows/ci.yml`：PR 上跑 install（frozen lockfile）+ `pnpm check` + `pnpm test` + `pnpm build` + `pnpm docs:generate`——**已线上验证**（`.github/workflows/ci.yml`：check / test / docs / package-smoke 四个 job；pnpm 版本由 `pnpm/action-setup` 读 `packageManager`）。2026-10-12 推 `main` 后两次运行 [38214181292](https://github.com/Altermoe/fluere-vue/actions/runs/38214181292) / [38214601263](https://github.com/Altermoe/fluere-vue/actions/runs/38214601263) **四个 job 全绿**。
- [ ] `.github/workflows/release.yml`：Changesets action 开 release PR；合并后按预发布 tag（`.changeset/pre.json`，现为 `alpha`）发布（`latest` 的归属与 pre 模式无关，见 3.5 前置约束 2），启用 npm provenance（OIDC trusted publishing 或 `NPM_TOKEN` secret，二选一并记录）——**方案已定为 OIDC trusted publishing，`version` 路径已线上验证，`pack` / `publish` 路径尚未跑过**（`.github/workflows/release.yml`：`select-mode` / `version` / `pack` / `publish` 四个 job，顶层 `permissions: {}`，`id-token: write` 只给 publish job；`pack` 内有 `pnpm check && pnpm test` 自证 + `pnpm build` + `pnpm smoke:dist`，publish 只上传 pack 出来的 tarball）。2026-10-12 实测：`select-mode` 判定 `version`、`version` job 成功开出 [release PR #2](https://github.com/Altermoe/fluere-vue/pull/2)（15 个文件、无 `apps/*`），`pack` / `publish` 按预期 skipped；首轮 [38214181271](https://github.com/Altermoe/fluere-vue/actions/runs/38214181271) 曾因 `version.mjs sync` 改动 `apps/*` 而让 action 去找不存在的 `apps/docs/CHANGELOG.md`（ENOENT），已修复。另发现 release PR 分支由 `github-actions[bot]` 推送，其 `pull_request` 触发的 CI run 会被挂成 `action_required`（需维护者手动批准，实测 run [38215064332](https://github.com/Altermoe/fluere-vue/actions/runs/38215064332)），因此 PR 上默认没有跑完的检查，已在 `pack` 里加自证步骤兜底，详见 [docs/release.md](./release.md#发布流水线github-actions)。落地过程中确认的两条硬约束：① **首次发布无法走 OIDC**——npm 的 trusted publisher 只能挂在已存在的包上，没有 pending publisher，六个包从未发布过，第一个版本必须先用 token / 本机 `pnpm login` 人工 bootstrap；② pnpm v11 下 publish job 的 `setup-node` 必须显式给 `registry-url`，否则 OIDC 换取失败且报错具有误导性。**更新（2026-10-13）**：`version` 路径随首发再次线上验证——run [38335726761](https://github.com/Altermoe/fluere-vue/actions/runs/38335726761) 的 `select-mode` / `version` 成功、`pack` / `publish` 仍 skipped，release PR #2 被更新为 `0.3.0-alpha.3` + 逐包 CHANGELOG；首发已由 `pnpm release:manual` 人工完成、六包在 registry 上存在 ⇒ **硬约束 ① 已解除**，给六包配好 Trusted Publisher 后 `pack` / `publish` 即可自动发布下一版（这是 3.5 的剩余目标）。
- [ ] 发布前质量闸：`publint` + `@arethetypeswrong/cli` 全绿；`npm pack --dry-run` 复核 tarball 内容与体积（不含源码、测试、未生成物）——**前两项已在 CI 落地**：`ci.yml` 的 `package-smoke` job 与 `release.yml` 的 `pack` job 都跑 `pnpm smoke:dist`（`pnpm pack` 出六个 tarball → publint / attw → fixture 消费方安装与 SSR 渲染）。**彩排实测暴露两处 tarball 卫生问题（见 [docs/release.md](./release.md#发布彩排记录2026-10-12本地-verdaccio)）**：① `ui` / `designs` / `icons` / `themes` 的 `files` 曾带顶层 `src/`（`ui` 安装后 1.5 MB，约 `dist` 的 70%），与「不含源码」不符——**已修复**：从这四包 `files` 移除顶层 `src`，消费方入口全部由 `publishConfig` 指向 `dist`；`dist/src/**`（`.d.ts`）是 `dist/index.d.ts` 的类型图依赖，随 `dist` 保留（`ui` tarball 250→102 文件、790→471 kB，`pnpm smoke:dist` 复验通过）；② `icons` 解包后 ~43 MB（主要是 `generated/` 图标数据），是唯一体积异类——**上线版本实测确认**（registry 元数据：`icons` 解包 **42.96 MB**，`ui` 1.90 MB、`designs` 0.49 MB、`themes` 0.14 MB、`hooks` 0.04 MB、`utils` 0.02 MB；`ui` tarball 104 项、顶层仅 `dist` + `package.json` + README / LICENSE，无源码）。体积异类已复核但**未做处理**，作为已知项跟踪。
- [x] 发布彩排：本地 verdaccio 或 `--dry-run` 走通全流程（含 dist 安装、SSR 渲染、CSS 引入）——**已完成**：本地 verdaccio 上完整发布 `0.3.0-rc.1` 六个包，逐项验收「干净目录安装 / SSR `renderToString` / Vite 构建带 CSS / `vue-tsc` 类型引用」全通过，并实测记录空 registry 首发时 `dist-tags` 的 `rc` 与 `latest` 同时指向首个版本（该现象与 2026-10-13 线上结果不一致，成因未留存证据，见 3.5 前置约束 2）；抓出并修正了「pre 模式下不许显式 `--tag`」的文档错误，tarball 卫生与 `icons` 体积问题记入上一条。全过程与数据见 [docs/release.md](./release.md#发布彩排记录2026-10-12本地-verdaccio)。
- [x] 回滚与补救预案：`npm deprecate`、撤销 tag、`latest` 回指上一版的具体步骤写入 `docs/release.md`——**已写入**（[回滚与补救](./release.md#回滚与补救)：deprecate / `dist-tag rm|add` / `gh release delete --cleanup-tag` 撤销 tag 与 Release / 同 commit 重跑的幂等说明）。

#### 3.5 首发（已完成）与自动发版流程（进行中）

> **目标已收敛（2026-10-13）**：原目标「正式发布线上 `0.3.0-rc.1`」中的**人工首发已完成**——六个 `@fluere-vue/*` 已于 2026-10-13 以 `0.3.0-alpha.2` 上 npm（见上方「首发记录」）。0.3 余下的发版目标改为**把自动发版流程跑通**：配好 npm Trusted Publisher，让 `release.yml` 的 `pack` / `publish` 在线真实发布一次（OIDC + provenance），此后不再人工发版。版本号推进的操作手册见 [docs/release.md](./release.md)。

**已完成 · 人工首发（bootstrap）**

- [x] 用 `0.0.0-stage` 占位包预定六个包名——trusted publisher 只能挂在已存在的包上，这是绕开「首次不能走 OIDC」的前置动作
- [x] 人工发布首发版本：`pnpm release:manual`（不带版本参数，对已 seed 的 `0.3.0-alpha.2` 原样发布）→ 六包全部成功，发布提交 `8dfa64f`
- [x] 发布后验证（干净目录、走公网 npm 安装，2026-10-13 实测）：安装成功、组件正常渲染、样式已随包发布（`dist/style.css`）、`renderToString` 不抛错、无 peer 警告
- [x] 部署 tag 与逐包 tag：`v0.3.0-alpha.2`（由 seed 提交 `6345d74` 移到发布提交 `8dfa64f`）+ 六个 `@fluere-vue/<pkg>@0.3.0-alpha.2`，GitHub 与 onedev 均已推送

**未完成 · 自动发版流程（0.3 的剩余发版目标）**

- [ ] 在 npmjs.com 给六个包各配一次 Trusted Publisher（Repository `Altermoe/fluere-vue`、Workflow `release.yml`、Environment 留空）——包已存在，原「硬约束 ①」已解除
- [ ] 合并 release PR（分支 `changeset-release/main`，内容为 `0.3.0-alpha.3` + 逐包 CHANGELOG），触发 `release.yml` 的 `pack` / `publish`
- [ ] 线上确认自动发布产物：tarball 与首发一致（不含源码 / 测试）、`dist.attestations` 出现 provenance、全程无 `NPM_TOKEN`
- [ ] 自动发布后核对 `dist-tags`：本版仍属预发布，`alpha` 应指向新版本；`latest` 仍停在 `0.3.0-alpha.2`（占位版 `0.0.0-stage` 使 `only-pre` 判定恒为假，预发布不会移动它）。**`0.4.0` 稳定版发布后要再核一次 `latest` 是否更新**，未更新就用 `npm dist-tag add` 手工改指

**未完成 · 其它 0.3 收口项**

- [ ] 冻结范围：确认本次发版包含的组件与文档（与 0.1.0-rc.1 组件清单对齐），未完成项明确移出并记录
- [ ] 收口文档：README 去掉「尚未发布」、补安装与按需引入示例、更新组件进度表与版本号；文档站展示线上版本与更新日志
- [ ] GitHub Release：首发只推了 tag、**未建 Release**（API 实测 releases 为空）；改由自动发版链路的 `publish` job 建，附破坏性变更与已知问题清单
- **验收（按「自动发版流程」口径）**：
  - `release.yml` 的 `pack` / `publish` 在线上真实跑通一次，发布产物带 provenance，无需人工 token
  - 自动发布的版本号由 changeset 从当前版本 bump 得出（不再原样发布 seed 版本，避免 `v*` 部署 tag 与发布版本同号）
  - 三个独立消费场景验证通过：Vite SPA、Nuxt SSR、纯类型引用（`vue-tsc` 无错）
  - 同一 commit 重跑发布不产生脏状态；发布手册与回滚步骤齐备
- **前置约束的当前状态（2026-10-12 提出 → 2026-10-13 更新）**：
  1. ~~**首次发布不能用 OIDC**~~ —— **已解除**：六个包已由人工 bootstrap 上 npm（连同 `0.0.0-stage` 占位版本），现在可以给每个包配 Trusted Publisher，「从第二个版本起自动发布」的条件已具备。配好后 pnpm v11 下 publish job 的 `setup-node` 仍必须显式给 `registry-url`。
  2. **`latest` 与预发布的关系（2026-10-13 更正）**：changesets 只在 `only-pre` 判定成立时才把版本发到 `latest`，而该判定要求**所有**已发布版本的 `prerelease[0]` 都等于当前 pre tag。本仓库六包带着占位版 `0.0.0-stage`（`prerelease[0] === "stage"`），判定恒为 `false` ⇒ 预发布一律落在 pre tag、`latest` 原地不动。实测：`0.4.0-alpha.1` 发布后 `latest` **仍停在** `0.3.0-alpha.2`、`alpha` 指向新版，**用户不带版本号安装会拿到旧版，这不是事故**，但也**不会自动回指**——`latest` 要改指须显式 `npm dist-tag add`（六个包各一次），或等非 pre 的稳定版发布（**发布后要实测 `latest` 是否确实更新**，未更新就手工改指）。判定代码与实测数据见 [docs/release.md](./release.md#dist-tag-判定规则实测2026-10-13对真实-registry)。
- **非目标（一期）**：自动化视觉回归发布门、GitHub Packages 等多 registry 同步、CDN / unpkg 体积门、0.3.0 稳定正式版（0.3 收口后再定）

### 依赖关系与建议顺序

1. **先做两个 spike**：i18n 选型（影响文档站结构）与构建器选型（影响所有包入口），各控制在 1 天内出结论。**两个 spike 均已完成并落地**：i18n 见 1.1，构建器见 3.2（结论写入 [ADR-0001](./adr/0001-library-build-tooling.md)）。
2. **目标 2 依赖目标 1 的 key 约定**：顺序为 i18n 基建 → 外壳（2.1 / 2.2）→ 页面（2.3 / 2.4）→ 打磨（2.5）。
3. **目标 3 的 3.1 / 3.2 可与目标 2 并行**（只改包元数据与构建，不碰文档站页面）；3.4 流水线已随 CI 跑通接入，剩余的是 3.5 的自动发版流程。
4. **发布前统一冻结**：版本号、README / 文档站版本展示、CHANGELOG、本文件勾选状态一次性收口。

### 与 0.4.0+ 排期的衔接

- **目标 1 的 key 约定是 0.5.0 起的硬约束**：文档站侧已落地；**组件库侧（1.4）尚未建立**，0.5.0 前需先补齐，否则新增文案要返工两遍。
- **目标 2 是 Explorer 骨架的布局基建**：0.5.0 的 `DesktopShell` / `Taskbar` / `StartMenu` 直接复用 2.1 / 2.2 的产出。
- **目标 3 是 0.9.0-rc.1 对外可用的前提**：包已首次上线（`0.3.0-alpha.2`），消费方入口指向 `dist`；把自动发版流程跑通后，0.4–0.8 的每个 minor 才能稳定对外发版。

### 风险与对策

| 风险                                   | 影响                     | 对策                                                                                                                                                                                                                         |
| -------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 文档站「仿真」过度                     | 首屏慢、移动端卡顿       | 令牌化动效 + 性能预算 + 移动端降级全屏，仿真范围写入 README                                                                                                                                                                  |
| i18n 与 `@nuxt/content` + SSG 组合踩坑 | 双语路由与内容查询返工   | **文档站侧已消除**（spike 收口并落地，demo 抽 key 亦已收口）；残余风险仅剩 1.4 组件库通道                                                                                                                                    |
| 纯 TS 源码入口被发布                   | 消费方无法使用、口碑受损 | **已消除**：3.2 强制 `dist` + `types`，发布闸用 `publint` / `attw` 拦截；首发 tarball 实测顶层仅 `dist` + 包元数据                                                                                                           |
| 预发布占用 `latest`                    | 用户误装预发布版         | 预发布走 changeset pre tag（现为 `alpha`）而非 `latest`，发布后核对 `dist-tags`；`only-pre` 判定因占位版 `0.0.0-stage` 恒为假 ⇒ 预发布不会移动 `latest`，要改指需显式 `npm dist-tag add` 或等稳定版发布（见 3.5 前置约束 2） |
| 双语文案长期不同步                     | 英文页无人维护           | 缺失回退 + CI key 完整性校验 + 页面标注英文状态                                                                                                                                                                              |
| 组件清单与发布范围脱节                 | 发布内容与 README 不一致 | 发布前冻结范围，同步 README 与 `docs/todo.md`                                                                                                                                                                                |

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

### 0.4.0 · 基建 + 通用件收尾（≈ 12 点）

> 本版是整条链路上**唯一一处「现在做能省掉后面所有返工」**的地方：仓库现有三套各写一遍的浮层实现（Tooltip、Combobox popup、ContentDialog），若不先统一，后续 MenuFlyout / DropDownButton / Select / NavigationView 溢出会把定位与关闭语义再写四遍。

| #     | 内容                                                                                                              | 档位     | 验收要点                                                                                                                        |
| ----- | ----------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 0.4.1 | `useFlyout` 统一浮层原语（触发器 + Portal + 定位 + 关闭语义 + 焦点归还）                                          | 基建 2   | 关闭路径覆盖 Esc / 外部点击 / 焦点移出；`role=menu` / `menuitem` / `aria-expanded` 契约明确；同时给出**现有三套实现的迁移步骤** |
| 0.4.2 | z-index 分层刻度（落到 designs 或 themes，禁止组件内硬编码）                                                      | 基建 1   | 刻度显式覆盖：窗口 < 内容区 < 导航浮层 < 菜单 < 子菜单 < 模态遮罩 < 开始菜单 / 任务栏                                           |
| 0.4.3 | `useFocusVisual` 双层焦点矩形原语（WinUI `FocusVisualPrimary/Secondary`）                                         | 基建 1.5 | 内层 / 外层双层矩形；明暗两态；`NavigationView` / `ListView` 接入时无需各写一套                                                 |
| 0.4.4 | designs 补令牌：Mica / Acrylic / `SubtleFillColor*` / `LayerFillColorDefault`                                     | 基建 1.5 | 进 `packages/designs` 事实源并写映射注释；禁止组件内就地 `backdrop-filter` 魔法值                                               |
| 0.4.5 | Input 收尾（password / textarea / header / description）                                                          | M 2      | 勾掉本文档第 0 项；补齐 password 显示按钮与 textarea 形态                                                                       |
| 0.4.6 | `ToggleButton` / `ToggleGroup`（Button 的 `selected` / `aria-pressed` 可直接迁移）                                | S 1      | 键盘可达；分组单选 / 多选语义                                                                                                   |
| 0.4.7 | `Select`（复用 reka Select / Listbox）                                                                            | M 2.5    | 与 Combobox 的差异（不可编辑、无文本搜索）写入文档                                                                              |
| 0.4.8 | 收尾：刷新 `packages/ui/README.md`（现仅列 Button / Input / Combobox，已严重过期）；处理 `apps/playground` 占位包 | 0.5      | —                                                                                                                               |

> **0.4.5 已落地**：Input 收尾（password / textarea / header / description，含「显示」按钮、按住 `Alt+F8` 显示与掩码状态下的复制拦截）。规格源与 Web 取舍见组件契约注释，示例与 API 表见 `apps/docs/content/components/input.md`；本文档第 0 项已勾掉。

> **0.4.0 进展（2026-10-13）**：四件基建 + 一个通用件已落地，逐条要点与证据如下；未做项明确列在末尾。
>
> - **0.4.2 z-index 刻度（已落地）**：新增 `packages/designs/data/repo-tokens.json`——**仓库自有令牌的旁路事实源**（`extract-tokens.mjs` 只重写 `fluent-tokens.json`，手写值不会再被上游抽取冲掉；重名由 `generate.mjs` 直接抛错拦截）。落 `--zIndexWindow/Content/NavFlyout/Menu/Submenu/Modal/Tooltip/Shell` + `--zIndexStep` 九档，刻度顺序由 `packages/designs/src/repo-tokens.test.ts` 守住。原先四处硬编码（Combobox 下拉 1000、SmokeLayer 1000、ContentDialog 1000、ToolTip 1100）全部改引刻度；`packages/ui/src/__tests__/z-index-tokens.test.ts` 扫描组件样式，禁止再出现裸的浮层 z-index（组件内部局部 stacking 的 `1/2/-1` 白名单放行）。档位口径同步进 AGENTS.md。
> - **0.4.3 `useFocusVisual`（已落地）**：`packages/ui/src/focus-visual/`（CSS 原语 + composable）。几何与配色逐条对齐 A 级源码：`FocusRectManager.cpp`（primary=外描边、secondary=内描边、连续双环、内层 bounds 收进 firstThickness ⇒ **紧贴无间隙**、`FocusVisualMargin = -3`）+ `Common_themeresources_any.xaml`（亮 外 `#E4000000`/内 `#B3FFFFFF`，暗 外 `#FFFFFF`/内 `#B3000000`），映射到 `--colorStrokeFocus2`（外）/ `--colorStrokeFocus1`（内），alpha 差异记录在文件头；含 `forced-colors` 分支（→ `CanvasText`/`Canvas`）。Button 已试点：原单层 brand outline 换成双层矩形。
> - **0.4.1 `useFlyout`（已落地）**：`packages/ui/src/flyout/`（`use-flyout.ts` + `layer-stack.ts`）。关闭路径 Esc / 外部 pointerdown / 焦点移出全覆盖并带 `FlyoutCloseReason`；焦点归还、`aria-expanded` / `aria-haspopup` / `role` / `aria-modal` 契约齐备；**层级栈**解决平面刻度表达不了的「模态里的下拉必须盖过模态」——z 表达式全程引用 token（`var(--zIndexNavFlyout)` / `calc(var(--zIndexModal) + var(--zIndexStep))`）。Tooltip / Combobox / ContentDialog 三套实现已接上层级栈，接线与「关闭语义仍由 reka / 自研逻辑负责」的分工由 `packages/ui/src/__tests__/flyout-migration.test.ts` 与组件注释固定。SSR 侧刻意**不在 setup 期登记层级**（避免模块级栈跨请求污染与首帧水合不匹配），服务端与首帧由组件样式表缺省值兜底，`use-flyout.test.ts` 有断言。
> - **0.4.4 材质令牌（已落地）**：Mica / Acrylic / Layer / Subtle / Smoke 共 20 个 token 进 `repo-tokens.json`，值取 `Common_themeresources_any.xaml` 与 `Materials/Acrylic/AcrylicBrush_themeresources.xaml`（tag `winui3/release/2.5.1`），AARRGGBB → CSS 的换算与原值逐条写在 token 的 `note` 里；`kind: 'color'` 的令牌同时进 UnoCSS 颜色刻度（`bg-micaBackgroundFillColorBase` 可用）。Mica 本体由系统 DWM 绘制、公开源码树没有对应 Color 资源这一事实已记录（纯色基准取 `SolidBackgroundFillColor*`），真正的材质合成属 0.9.1 / 0.9.2。
> - **0.4.6 `ToggleButton`（已落地）**：SFC + 契约测试（19）+ 中英文档页 + 3 个示例 + i18n key + 组件索引/导航条目。状态表逐条对齐 `CommonStyles/ToggleButton_themeresources.xaml`（未选中 `ControlFillColor*`、选中 `AccentFillColor*` → `--colorBrandBackground` 三档、选中前景 `TextOnAccentFillColorPrimaryBrush` → `--colorNeutralForegroundOnBrand`、不确定态与未选中同源）；三态循环对齐 `ToggleButton_Partial.cpp#OnToggleImpl`（`Indeterminate → Unchecked`、`Checked + IsThreeState → Indeterminate`）；过渡只走背景 83ms（模板 `BrushTransition Duration=0:0:0.083`，前景 / 描边是 `DiscreteObjectKeyFrame` 瞬切）；Fluent 无同值档的 `AccentFillColorDisabledBrush` / `TextOnAccentFillColorDisabledBrush` / `TextOnAccentFillColorSecondaryBrush` 落三个组件局部变量并记 WinUI 原值；焦点复用 0.4.3 原语。
> - **0.4.6 `ToggleGroup`（已落地）**：`FluereToggleGroup` / `FluereToggleGroupItem`（reka `ToggleGroup` + `RovingFocusItem` 底座）、22 个契约测试、中英文档页、4 个示例。WinUI **没有** ToggleGroup 控件（`git ls-tree` 实测 34 个 ToggleButton、0 个 ToggleGroup），所以视觉以 WinUI `ToggleButton` 为准、分组语义按 WAI-ARIA + reka 契约，容器间距 4px 为库内自定——取舍逐条写进组件注释与文档；单选「再点取消」沿用 reka/ARIA 语义，文档给了「必须选中一项」的一行回退配方。
> - **真实浏览器实测（0.4.0 的新增证据，脚本与截图为过程产物，留在 `temp/`）**：① 焦点矩形 Button 上 `:focus-visible` 命中，亮色 = 外 2px `rgb(0,0,0)` + 内 1px `rgb(255,255,255)`、暗色相反，`outline-offset: 1px`（紧贴无间隙）；② 三处浮层 inline 层级生效——Combobox 下拉 `z-index: var(--zIndexNavFlyout)` → 计算值 1000、Tooltip `var(--zIndexTooltip)` → 1400、ContentDialog 根 `var(--zIndexModal)` → 1300（遮罩 1300）；③ ToggleButton 选中态底色实测 `rgb(15, 108, 189)` = `--colorBrandBackground`。**这次实测抓到一个单测抓不到的真 bug**：`useFlyout` 返回的是 ref 对象，模板里写 `:style="flyout.layerStyle"` 不会自动解包嵌套 ref，Combobox / ContentDialog 的层级其实一直没生效（只有 CSS 回退值在兜底，肉眼与测试都像对的）；已改为解构到顶层 ref，并在 `flyout-migration.test.ts` 加了「模板不得直接引用 `flyout.layerStyle`」的守卫。
> - **0.4.7 `Select`（已落地）**：`packages/ui/src/select/`——不可编辑下拉，底座 reka `Select`，视觉规格取 WinUI `ComboBox` **非编辑形态**（`src/controls/dev/ComboBox/ComboBox_themeresources.xaml`，该文件不在稀疏检出里，用 `git -C temp/winui-src show <tag>:<path>` 取）；14 个契约测试 + 中英文档页 + 3 个示例 + 组件索引/导航条目。触发面 / 下拉项 / 面板全部复用 `FluereCombobox` 非编辑形态的 token 口径，层级走 0.4.1 的 `useFlyout`、焦点走 0.4.3 的 `useFocusVisual`；面板样式写在**非 scoped** 块（Teleport 拿不到 `data-v-*`）。与 Combobox 的差异（不可编辑 / 无文本搜索 / 事件载荷）写进文档表格。
> - **0.4.8 收尾（已落地）**：① `packages/ui/README.md` 组件索引补齐 `FluereToggleButton` / `FluereToggleGroup` / `FluereSelect`，并新增《共享原语（0.4.0 基建）》表；② `apps/playground` 从占位包落地为可跑的 Vite 视觉回归页（`pnpm --filter @fluere-vue/playground dev`，默认 60728）——一屏陈列 Wave 1 表单 + 按钮族（含 ToggleButton 三态 / ToggleGroup 单选多选）+ 反馈 + 浮层 + 明暗切换，并把《视觉自检清单》写进该包 README；③ 新增 changeset `.changeset/forty-jars-float.md` 记录 0.4.0 全部变更。实测：playground 页面无控制台错误、ContentDialog 打开时 `z-index` 计算值 1300、Esc 可关闭、主题切换生效。
> - **0.4.8 → 0.5.0 遗留项收尾（2026-10-14）**：① 组件进度表**逐条复核已完成**——根 [README.md](../README.md) 补上此前缺失的 `FluereToggleButton` / `FluereToggleGroup` / `FluereSelect` 三行（并把 `FluereButton` 的 WinUI 映射由「Button / ToggleButton」收敛为「Button」，ToggleButton 归其独立组件），`packages/ui/README.md` 索引与 `index.ts` 导出逐条核对一致；② `FluereButton` 过渡**已统一到 A 级口径**——由 `--durationFast`(150ms) 三项改为 `background-color 83ms linear`（A 级来源 `src/controls/dev/CommonStyles/Button_themeresources.xaml`，与 `FluereToggleButton` 同款，契约测试守住），并删掉 `FluereToggleButton` 里「FluereButton 与 A 级有偏差（待统一）」的过时注释；③ 发布动作（changeset 消费 / 版本号推进 / 打 tag）**仍未执行**——本轮范围只到代码与文档收尾，发布按《发布检查（0.4.0 起）》单独走。

### 0.5.0 · Explorer 骨架（≈ 17 点组件 + 11 点文档站）

> **本版的战略意义**：Explorer 拆分交付的第一段。首页自 0.5.0 起即可挂上可交互的窗口，hook 提前四个版本生效；同时让 0.6–0.8 的组件开发始终有一个可运行的目标物可对照。
>
> **必须先在 0.5.0 定下来的布局假设**（它们最易在最后阶段被推翻）：窗口圆角与阴影、内容区滚动边界、导航面板折叠宽度、任务栏高度与层级、桌面壁纸层的令牌化方案。

| #     | 内容                                                             | 档位 | 验收要点                                                                                    |
| ----- | ---------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------- |
| 0.5.1 | `FluereAppWindow`（圆角窗口 + 标题栏 + 可拖拽区）                | L 4  | 圆角 / 阴影 / 描边全部走令牌                                                                |
| 0.5.2 | `CaptionButtons`（最小化 / 最大化 / 关闭，含关闭键红底 hover）   | M 2  | **真实可用**（最小化 / 最大化 / 还原视口）；全部键盘可达 + `aria-label`                     |
| 0.5.3 | `TabView`（复用 reka Tabs；含溢出滚动）                          | L 4  | 键位与焦点表现对齐 WinUI TabView                                                            |
| 0.5.4 | `NavigationView` + `NavigationViewItem`                          | XL 6 | 可折叠面板、分组、选中指示条、设置项；接入 0.4.3 的焦点矩形                                 |
| 0.5.5 | 文档站 `DesktopShell`（壁纸层 → 窗口层 → 任务栏层）              | L 4  | 层级 / 圆角 / 阴影一律 token，禁止魔法值                                                    |
| 0.5.6 | 文档站 `Taskbar` + `SystemTray`（`Intl` 时钟 + 主题 / 语言切换） | L 4  | hover / active 指示条；点击弹出或还原窗口；版本号改为读 `package.json`（去掉硬编码 v0.0.1） |
| 0.5.7 | 文档站 `StartMenu`（Acrylic 面板 + 键盘导航 + Esc 关闭）         | M 3  | 承载站点信息架构；浮层焦点管理下沉到 `packages/hooks`                                       |

> **0.5.1 / 0.5.2 已落地（组件侧，2026-10-13）**：`FluereAppWindow`（窗口外框：圆角 / 描边 / 阴影 / 标题栏 / 内容可视区）与 `FluereCaptionButtons`（最小化 / 最大化 / 还原 / 关闭，纯逻辑代理）已进 `packages/ui`，四件套齐（SFC + 契约测试 + 中英文档页 + 5 个示例）。规格逐条对齐 `Microsoft.UI.Xaml.Controls.TitleBar`：**行为 / API 读 `winui3/release/2.0.1`**（Gallery v2.9.3 所用 WASDK），模板与画刷读本地快照 `2.5.1`（该控件目录两 tag 有漂移，已记入组件注释）；标题栏 32/48 高度判据、`Compact` 折叠的「后声明组胜出」、失活态的两个分支、拖拽打洞清单均照抄 `TitleBar.cpp`。caption 按钮**无 A 级 XAML 源码**（系统 DWM 绘制），几何 46×32 / 字形 10 / 描边 1 与关闭键红 `#C42B1C` 记为系统度量 + 证据缺口，全部落成可覆盖的组件局部变量；窗口**位置 / 尺寸 / 层级由外部控制**，拖拽只抛 `dragStart` / `dragMove` / `dragEnd`。文档站 `DesktopShell` / `Taskbar` / `SystemTray` / `StartMenu`（0.5.5–0.5.7）与 0.5.4 `NavigationView` 仍待做。

> - **0.5.3 `TabView`（已落地，2026-10-14）**：`packages/ui/src/tab-view/`（`tab-view.vue` + `tab-view-item.vue` + `types/constants/locale/collection`）—— 38 条契约测试 + 中英文档页 + 5 个示例 + 组件索引/导航条目（`components-nav.ts` 用 `tab-view` 替换了原先的 `Tabs` 占位）。规格逐条对齐 `Microsoft.UI.Xaml.Controls.TabView`（tag `winui3/release/2.5.1`：模板 `TabView.xaml`、几何 `TabView_themeresources.xaml:239-269`、行为 `TabView.cpp` / `TabViewItem.cpp`、默认值 `Generated/*.properties.cpp`、文案 `Strings/{en-us,zh-CN}/Resources.resw`）：TabView 无 `OnKeyDown`，键盘 = `Ctrl+F4` / `Ctrl+Tab` / `Ctrl+Shift+Tab` 三个加速键 + 方向键焦点环（`tab → 关闭按钮 → … → 新建按钮 → 回绕`，只移焦点不改选中）；`CloseButtonOverlayMode` 的 `Auto` 与 `Always` 同分支（只有 `on-pointer-over` 悬停显示）；`TabWidthMode` 三档（Equal 按可用宽 `clamp(…,100,240)`、Compact 只折叠未选中项）；关闭 / 新建**只抛事件不删数据**，被删选中项按 `OnItemsChanged` 的向后环形规则迁移；`perf2026` 变体不实现（沿用 TitleBar 裁定，写进组件注释）。**子项是数据型子组件**（`FluereTabViewItem` 不挂载，父组件渲染期读 vnode props/slots，等价 React `cloneElement`）—— 因此 SSR 直出即有完整 tab 条，水合一致；`useFocusVisual` 接焦点环、`layout` 相关令牌补 4 个（`layerOnMicaBaseAltFillColorSecondary` / `...Transparent` / `solidBackgroundFillColorTertiary` / `dividerStrokeColorDefault`，均按 WinUI 原值落 `repo-tokens.json`）。**真实浏览器实测 52 条断言全绿**（`temp/pw-tab-view.mjs`），并抓到两个单测抓不到的真 bug：① 模板里的 kebab-case 属性在**原始 vnode props** 里键名是 `is-closable`，只认 camelCase 会把 `:is-closable="false"` 当「没传」⇒ 关闭按钮照常渲染（已加 kebab/camel 双向读取 + 裸属性 Boolean 转换，并有回归用例）；② 选中背景是定位伪元素，按绘制次序盖住常规流里的图标与文本 ⇒ 选中项整片纯色（已把内容提升到同层，`elementFromPoint` 断言守住）。证据缺口：选中背景路径由运行时 `StringCchPrintf` 生成、`ThemeTransition` 时长不在控件目录、HC 色板来自系统运行时、`TabViewBorderBrush` 的 `Color→Brush` 隐式转换未证实（详见组件注释与文档页）。

> - **0.5.4 `NavigationView`（已落地，2026-10-15）**：`packages/ui/src/navigation-view/`（`navigation-view.vue` + `navigation-view-items.vue` + `navigation-view-item/-item-header/-item-separator.vue` + `types/constants/locale/collection/context` + 非 scoped 的 `navigation-view.css`）—— **70 条契约测试** + 中英文档页 + 4 个示例 + 组件索引/导航条目（`components-nav.ts` 新增 `navigation-view`）。规格逐条对齐 `Microsoft.UI.Xaml.Controls.NavigationView`（tag `winui3/release/2.5.1`：模板与几何 `NavigationView.xaml` / `NavigationView_themeresources.xaml`、行为 `NavigationView.cpp` / `NavigationViewItem.cpp` / `NavigationViewItemPresenter.cpp`、默认值 `Generated/*.properties.cpp`、面板开合关键帧 `SplitView_themeresources.xaml`、chevron `AnimatedChevronUpDownSmallVisualSource.cpp`、文案 `Strings/{en-us,zh-CN}/Resources.resw`）：DisplayMode 状态机逐字照抄（`width >= 1008` Expanded / `0 < width < 641` Minimal / 其余含 0 与 NaN 落 Compact，`NavigationView.cpp:1452-1465`）；pane 开合语义照抄（进入 Expanded 需 `!m_wasForceClosed`、`Expanded → Compact` 与进入 Minimal 无条件关、**不存在 per-mode 开合记忆**、切换 `paneDisplayMode` 清标志）；收起时保留 **48px 图标轨道**而非归零（`ListSizeCompact`）；键盘照源码（`Enter` / `Space`（**Alt+Space 不处理**）/ `Home` / `End` / `Alt+←`；`→` 与 `Esc` 在 NV 里**零命中**，属负面证据）；选中与展开**同时发生**（`:1067`）、`selectsOnInvoked=false` 只展开不改选中、`isChildSelected` 沿祖先链回写、指示条下钻到最低可见层；面板关闭时**顶层项强制折叠但记忆状态**。**底部设置项用保留哨兵值** `FLUERE_NAVIGATION_SETTINGS_VALUE`（消费方不得用作菜单项 `value`）。**真实浏览器实测 55 条断言全绿**（`temp/pw-navigation-view.mjs`，明暗对照截图在 `temp/visual-navigation-view/`），并抓到四个单测抓不到的真 bug：① **哨兵常量没从 `packages/ui/index.ts` 导出**，文档示例 import 到 `undefined` ⇒ SSR / 水合整页 500（已导出并加「包入口导出契约」断言）；② 单根组件上写了 `inheritAttrs: false`，**静默丢掉消费方的 `class` / `style`**（demo 的 `h-[320px]` 完全没生效，组件高度塌成 0）—— 已移除并加回归用例；③ 根节点 class 声明两遍（`class="fui-navigation-view fui-navigation-view …"`）；④ 开关按钮宽原先恒 40，未实现上游 `UpdatePaneToggleSize` 的「有 `PaneTitle` 时撑到 `OpenPaneLength`」分支，标题被挤扁（已按三分支实现 + 4 条契约断言）。**Minimal 档降级为 Compact**（浮层焦点陷阱属 0.5.7 `useFocusTrap`，与 `docs/design/explorer-layout.md` 假设 3 一致）；`Top` 顶部导航形态、子项 flyout、指示条滑动位置动画、`perf2026` 均为非目标（逐条写进组件差异表）。证据缺口：chevron 完整路径插值在 LottieGen 的 JSON 源里（只做静态两端 + 50ms 过渡）、`ExpandCollapseRotate{Expanded,Collapsed}Storyboard` 默认模板不存在故无时长可引、系统强调色与 HC 色板来自运行时。

> - **0.5.5 文档站 `DesktopShell`（已落地，2026-10-16）**：首页首屏整屏接管为桌面仿真（壁纸层 → 窗口层 → 任务栏层），窗口内用 `FluereAppWindow` + `FluereNavigationView` + `FluereTabView` 组装 Explorer。**全部落 `apps/docs`，不动 `packages/ui` / `packages/designs`**（构件归属见 [apps/docs/README.md](../apps/docs/README.md#站点主页与桌面外壳的落点056-起)）：`components/shell/{desktop-shell,desktop-wallpaper,explorer-window,shell-chrome,shell-taskbar}.vue` + `utils/shell-window-state.ts`（纯状态机，**23 条单测**）+ `utils/__tests__/shell-style-contract.test.ts`（**18 条源码契约**：禁裸 `z-index` / 禁 `#RRGGBB` / 禁 `backdrop-filter` / 任务栏高度只经 `--shell-taskbar-h` / NV 根不得写 `h-*` / chrome 两处落点互斥且清单只有一份）+ `assets/docs-shell.css` 的 `--shell-*` 构图变量。**真实浏览器实测 72 条断言全绿**（`temp/pw-desktop-shell.mjs`，1280 / 1440 / 1920 + 390 移动档，明暗对照截图在 `temp/visual-desktop-shell/`）：任务栏 z=1500 / 窗口层 z=0、窗口 1120×720 居中、最大化铺满且底部留 48px、圆角 8→0、拖拽被收敛在桌面内、页面 `scrollY` 恒 0（滚动在窗口内）、最小化 / 关闭 / 重开三条路径可用、水合告警 0、移动档标题栏子格越界 0。四条**实测得出、单测抓不到**的结论已写进组件注释与 README：① `FluereNavigationView` 根自带 `block-size: 100%`（特异性 0,2,0）⇒ 根上 `h-[...]` 静默失效，必须「确定高度父容器 + `flex-1 min-h-0`」；② 组件 ref 不取 `$el` 直接当 `HTMLElement` 用，SSR 直出正常但浏览器一水合即 `TypeError` 整页被错误页替换；③ 任务栏入口若用 `FluereButton` 的 `selected` 做 toggle，会在 `selected=false` 时丢掉 `aria-pressed`（时而带时而不带），故本期做成「动作按钮 + 视觉指示条」；④ **48px 定高标题栏装不下四个站点 chrome 控件**——390px 实测右头格只剩 43px、控件换行成 108px 高压住标签条，故 chrome 改为「≥64rem 在标题栏 / <64rem 在窗口内容区应用栏」两处互斥落点（同一份清单，`explorer-layout.md` §6.3 记录了数据与推理）。**0.5.5 的最小任务栏只含高度占位 + 还原入口 + 激活指示条**，图标组 / hover 指示条 / 开始按钮 / 系统托盘归 0.5.6；任务栏 ToolTip 因 `--zIndexTooltip`(1400) < `--zIndexShell`(1500) 自遮挡，本期只用原生 `title`，冲突裁决留给 0.5.6（`explorer-layout.md` §4）。《WindowsOS 仿真边界》已作为**可见文案**落进首页窗口的滚动区（i18n key `shell.boundary.*`，中英同构）。另跑了两语种 SSR / 水合实测（`temp/pw-shell-i18n-hydration.mjs`，17 条断言）：`/` 与 `/en` 各 200、水合告警 0、控制台错误 0、`shell.*` 消息按语种取到、边界文案可见。
>
> - **0.5.6 主页与仿真落点拆分（已落地，2026-10-16）**：站点主页（`/`）回到常规营销页（`layouts/home.vue`：sticky header + 整页滚动视口 + `components/home/home-route-overlay.vue`），桌面仿真迁到独立路由 **`/os`**（`pages/os/index.vue` + `layouts/os.vue`：布局只转发 slot，桌面自己接管视口）。营销内容抽成 `components/home/home-content.vue`，主页与窗口「首页」视图**共用同一份**，`variant="desktop"` 决定是否附上《WindowsOS 仿真边界》三段（该段跟随仿真本身，因此只在 `/os` 出现）。窗口内的三个视图改由 `explorer-window.vue` 按标签 id 直接渲染，删掉了 0.5.5 从页面经 `DesktopShell` 透传 `#home` / `#guide` 插槽的那条链路（知道「有哪些标签、当前激活哪个」的是窗口层）。主页 header 与 CTA 区各有入口指向 `/os`（i18n key `nav.desktopSimulation` / `home.ctaCards.os`，中英同构）。落点口径与理由见 [design/explorer-layout.md](./design/explorer-layout.md) §0 的「0.5.6 落点变更」。

**里程碑**：能打开一个空 Explorer 窗口，导航可折叠、视图可切换，`/os` 可挂载桌面外壳。

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

### 0.4.0 开工前置（必做，否则整条排期不成立）

- [x] **核对 WinUI 源码快照**：本地 `temp/winui-src` 已固定 tag `winui3/release/2.5.1`（commit `ba3a8d5`），与 [style-spec §2](./style-spec.md#2-版本地图先对版本再读代码) 的版本地图一致；本仓库是**稀疏检出**（`CommonStyles/` + `ProgressBar/` + `ProgressRing/`），0.4.4 需要的 `src/controls/dev/Materials/Acrylic/AcrylicBrush_themeresources.xaml` 已按需 `git show <tag>:<path>` 取到并落成 token（见 `packages/designs/data/repo-tokens.json` 的 `sources.materials`）。**风险记录**：本机到 github.com 的连通性不稳定（partial clone 补 blob 曾报 GnuTLS 失败），遇到取不到的 blob 时按「证据缺口」流程标注，不猜值。
- [x] **确认 0.3 版本的三条主线状态**（结论，2026-10-13）：① i18n **基本收口**，仅剩 sitemap 按语言拆分与 Lighthouse / axe 实跑，均不阻塞 0.4.0；② 文档站 WindowsOS 仿真化**未开工**，按排期它就是 0.5.0 的布局基建（`DesktopShell` / `Taskbar` / `StartMenu`），不属于 0.4.0；③ 自动发版流程差**人工动作**（npmjs.com 给六个包配 Trusted Publisher + 合并 release PR），与 0.4.0 编码并行，不作为组件 PR 的合并前置。构件归属与 i18n key 约定不受影响。
- [x] **确定文档站仿真的范围边界文案**：已写入 [apps/docs/README.md](../apps/docs/README.md) 的《WindowsOS 仿真边界（0.4.0 起，呈现在文档站可见处）》——仿真到什么程度 / 明确不做 / 移动端降级 / 构件归属 / 工作量口径五条，与根 README「不夸大承诺」一致
- [x] **明确构件归属**：窗口外壳 / caption 按钮组合 / 任务栏 / 开始菜单 / 系统托盘属**应用级组合**，落在 `apps/*`；只有通用 WinUI 控件才进 `@fluere-vue/ui`（`FluereAppWindow` / `FluereCaptionButtons` 的组件本体在库内，桌面与任务栏的组装留在站点）——已记入 `apps/docs/README.md`
- [x] **文档站工作量单独统计**：0.5.0 表已分列「≈ 17 点组件 + 11 点文档站」，口径继续沿用（本次未新增站点外壳工作）

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
