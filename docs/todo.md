# 0.1.0-rc.1 组件实施清单（TODO）

> 依据：使用频率 × 需求度 × WinUI 还原成本 × `reka-ui@2.10.1` 底座可用性。
> 核心交付基准：**不用手写任何 HTML，即可搭出「设置页 + 数据录入表单 + 带加载/提示反馈的页面」的 WinUI 应用。**
> 已落地约束：SSR 安全（见 [ssr-guide.md](./ssr-guide.md)）、`@fluere-vue/designs` 令牌、`@fluere-vue/hooks` / `utils` 共享原语、`pnpm check`（lint + format + tsc）+ SSR smoke 测试。
>
> 本文档分两部分：上半部分为 0.1.0-rc.1 组件实施清单；下半部分为 0.3.0-rc.1 的三条项目目标（i18n / 文档站 WindowsOS 仿真化 / npm 发布），见文末。

- [ ] 0. 收尾 Input：补齐 password / textarea 形态、大小与有效性状态，跑通测试与文档

## Wave 1 · 核心表单（最高频，先形成"数据录入"闭环）

按 ① 被依赖程度 ② 还原成本 从低到高排：

- [x] 1. `Checkbox`（对应 CheckBox）
- [x] 2. `ToggleSwitch`（ToggleSwitch，WinUI 标志性控件，自定义实现）
- [x] 3. `RadioButton` + `RadioGroup`（RadioButton，复用 reka RadioGroup）
- [x] 4. `Slider`（Slider，复用 reka Slider）
- [x] 5. `NumberBox`（NumberBox；底座改为自持实现：`format` / `parse` / `expression` / `step` 四个纯函数层 + `use-number-box` / `use-spin-repeat` 两个 hook，理由见组件文档）
- [x] 6. `Combobox`（ComboBox，复用 reka Listbox/Combobox；下拉箭头动画、popup 定位、选中态还原最费劲，放队尾）

## Wave 2 · 反馈与状态（满足"加载 / 提示"）

- [x] 7. `ProgressRing`（ProgressRing，不确定转圈；自定义实现，参考 ScrollView 动效基建）
- [ ] 8. `ProgressBar`（ProgressBar，复用 reka Progress）
- [ ] 9. `InfoBar`（InfoBar，信息横幅，自定义实现）
- [ ] 10. `Badge`（Badge，自定义实现）

## Wave 3 · 必要弹层与微交互

> 先补齐共享原语，再实现弹层，避免后续所有弹层组件返工。

- [ ] 11. 共享原语：`use-disclosure` / 门户 `Teleport` / 遮罩层（放入 `hooks` / `utils`）
- [ ] 12. `Tooltip`（ToolTip，复用 reka Tooltip + Popper）
- [ ] 13. `ContentDialog`（ContentDialog，复用 reka Dialog）

---

## 加分项（有余力并入 rc.1，低成本高收益）

- [ ] 14. `ToggleButton` / `ToggleGroup`（复用 reka ToggleGroup）
- [ ] 15. `Avatar` / `Persona`（复用 reka Avatar，成本很低）
- [ ] 16. `DropDownButton`（复用 reka Menu）

## rc.1 明确不做（推给 0.2）

- NavigationView、ListView/GridView/DataGrid、TreeView、CalendarDatePicker/TimePicker、MenuBar 完整版、RatingControl、CommandBar —— 工程量与还原风险高，硬塞会稀释核心质感。

## 发布检查（每波结束执行）

- [x] `pnpm check`（lint + format + tsc）
- [x] `pnpm test` / SSR smoke（`packages/ui/src/__tests__/ssr-smoke.test.ts`）
- [ ] 用 Wave 1 子集在 `apps/playground` 搭一个真实设置页做视觉回归（rest / hover / pressed / selected / focus / disabled）
- [x] 为每个新组件补文档页（`apps/docs/content/components/*.md` + `demos/*/`）+ 更新 README「组件进度」索引

---

# 0.3.0-rc.1 项目目标（i18n / 文档站 / 发布）

> 与上半部分的分工：上半部分回答「组件够不够用」，本节回答「能不能被用起来」——多语言可读、文档站能体现 WinUI 质感、并且真正发到 npm 线上。
> 三条主线可并行，但在发布前必须一次性收口：版本号、README / 文档站版本展示、CHANGELOG、本文件勾选状态。
> 交付基准：**在 `npm` 上 `pnpm add @fluere-vue/ui@0.3.0-rc.1` 可用，文档站中英双语可读且呈现 WinUI 质感，三个消费场景（Vite SPA / Nuxt SSR / 纯类型引用）全部验证通过。**

## 目标 1 · 集成 i18n（一期：简体中文 + 英语）

> 范围（已确认）：**文档站全站 + 组件库内建文案通道与语言包导出**。
> 一期语言：`zh-Hans`（默认，兼容 `zh-CN`）与 `en`。

### 现状（动手前先对齐的事实）

- 仓库内无任何 i18n 依赖（无 `@nuxtjs/i18n` / `vue-i18n`）。
- 文档站文案硬编码中文：`apps/docs/pages/index.vue`（features / ctLinks / Hero）、`apps/docs/data/components-nav.ts`（`title` 英文 + `label` 中文两套字段）、`apps/docs/layouts/components.vue`、`apps/docs/pages/components/index.vue`。
- `apps/docs/nuxt.config.ts` 的 `app.head.htmlAttrs.lang` 硬编码 `zh-CN`；首帧脚本只处理明暗偏好（`fluere-docs-color-mode`），不涉及语言。
- `packages/ui` 组件当前没有面向用户的硬编码文案（仅注释），但 a11y 可访问名由消费方传入——一期要为「库内建文案」预留通道，避免后续 ProgressRing / ContentDialog / InfoBar 等组件返工。

### 1.1 选型与基建

- [ ] 落地 `@nuxtjs/i18n`（v10.x，需与 `nuxt@4.5.1` 对齐），**先做 spike** 验证 `strategy: 'prefix_except_default'` + `@nuxt/content` + `nuxt generate` 三者组合，锁定版本进 `pnpm-workspace.yaml` 的 catalog
- [ ] locale 约定写死并记录：`defaultLocale: 'zh-Hans'`、`locales: ['zh-Hans', 'en']`，`zh-CN` 作为 `zh-Hans` 的别名处理
- [ ] 目录约定：界面串 `apps/docs/i18n/locales/{zh-Hans,en}.json`；正文 `apps/docs/content/{zh-Hans,en}/**`（`content.config.ts` 的 collection source 同步调整）
- [ ] 首帧语言恢复：与 `use-color-mode.ts` 同规则，SSR 端由路由前缀决定 `<html lang>`，客户端入口前写入，禁止「先 zh 后切 en」的闪烁与 `<html lang>` 水合不匹配
- [ ] SEO：每语言独立 `title` / `description` / `og:*`、`hreflang` alternate、sitemap 按语言拆分

### 1.2 界面串与导航

- [ ] 抽取全部可见文案为 key：首页三个 feature 卡片、stats、ctLinks、`navLinks`、`ThemeToggle`、布局 header / 移动端 nav / 页脚
- [ ] `components-nav.ts` 改为「`slug` + i18n key」结构，运行期按 locale 解析显示名，消除 `title`/`label` 双字段中英混写
- [ ] 语言切换控件（最终落在目标 2 的托盘 / 任务栏），记住上次选择（key 命名与 `fluere-docs-color-mode` 保持一致风格）
- [ ] 组件文档页内的示例标题、说明、提示框文案双语；demo 中的 API 名与代码保持英文
- [ ] 站点内所有新增文案一律走 key（作为目标 2 的硬约束，禁止新增硬编码中文）

### 1.3 内容双语

- [ ] 现有 8 篇组件文档（`button` / `checkbox` / `icons` / `input` / `radio-group` / `scroll-view` / `slider` / `switch`）+ 首页 + SSR 指南正文译为英文
- [ ] 英文缺失时的回退策略：`fallbackLocale: 'zh-Hans'`，并在页面上明确提示「该页暂无英文版」，不做静默混杂
- [ ] 划定双语边界：进文档站的内容双语；`docs/ssr-guide.md`、`docs/design/*`、本文件等仓库内部文档保持中文

### 1.4 组件库 i18n 通道（一期只建通道 + 首批文案）

- [ ] `packages/hooks` 增 `provide-locale` / `use-locale`，`packages/ui` 增 `FluereConfigProvider`：基于 provide/inject 的**实例级** locale，禁止全局可变单例（否则 SSR 多请求间会串语言）
- [ ] 语言包形态：`@fluere-vue/ui/locales/zh-Hans`、`@fluere-vue/ui/locales/en`，按组件分组、可 tree-shaking；解析优先级：组件 `locale` prop → provider → 内置默认（`en` 兜底）
- [ ] 首批纳入的文案：内置 a11y 可访问名（loading / close / expand / collapse 等）、后续 ContentDialog / ProgressRing / InfoBar 的默认文案；日期与数字一律走 `Intl`，不硬编码格式
- [ ] **组件库不引入 `vue-i18n` 运行时依赖**（保持框架无关与零额外依赖），由 provider 注入 message resolver；在 `packages/ui/README` 与文档站说明用法
- [ ] 回退链明确：`zh-Hans → zh → en`，缺 key 时打到 `en` 并只在开发环境告警

### 1.5 质量与验收标准

- [ ] 单测：locale 解析与回退链、provider 隔离（同进程两个 app 实例不同 locale 互不污染）
- [ ] SSR 冒烟：`packages/ui/src/__tests__/ssr-smoke.test.ts` 在 `zh-Hans` / `en` 两种 locale 下均通过
- [ ] 文案完整性检查脚本（key 集合对比，缺失即失败），接入 `pnpm check` 或独立 `pnpm i18n:check`，并进 CI
- [ ] **验收**：
  - 文档站任意页面在 `/`（中文）与 `/en` 下无遗漏串（专有名词、代码、API 名除外），控制台无 i18n 警告；
  - `pnpm docs:generate` 产出两种语言的静态页面；切换语言的行为（是否整页重载）有明确结论并记录；
  - provider 切换 locale 时组件内建文案即时更新，两个并发 SSR 请求不串 locale；
  - Lighthouse / axe 不出现 `lang` 相关告警，`<html lang>` 与水合结果一致。
- **非目标（推后）**：RTL、第三种语言、翻译平台（Crowdin / Locize）工作流、组件文档逐页人工润色（一期允许机翻 + 术语表人工过一遍）。

## 目标 2 · 优化文档站（往 WindowsOS 仿真方向完善）

> 判定基准：以 **WinUI 3 Gallery + Windows 11 实机**为参照——一个「桌面」承载一个「应用窗口」，窗口内有标题栏、NavigationView、内容区；底部任务栏承载开始 / 搜索 / 语言 / 主题 / 时钟。
> 边界（必须标注，与 README「不夸大承诺」一致）：**不做真实窗口管理器**——不实现拖拽吸附、多窗口、系统级动画复刻；移动端不仿桌面，走简洁响应式。

### 现状

- 只有 3 个页面（`/`、`/components`、`/components/[...slug]`）与 1 个 layout（顶部 header + 侧栏 + 移动端 nav），全部 UnoCSS 工具类直写，无组件化抽象。
- 无窗口外壳、无任务栏 / 开始菜单 / 标题栏 / 命令栏，无搜索，无版本选择，无「本页目录」。
- 版本号硬编码 `v0.0.1`（`apps/docs/layouts/components.vue` 与 `apps/docs/pages/index.vue`）。
- 可用素材：`@fluere-vue/ui` 组件、`@fluere-vue/themes` 的 `presetFluere`、`@fluere-vue/designs` 已抽取的 Fluent 令牌（Mica / Acrylic 相关令牌需先核对是否齐备，缺的先补进 `packages/designs`）。

### 2.1 桌面外壳（Shell）

- [ ] `DesktopShell` 布局：壁纸层（令牌化的渐变 / Mica 近似）→ 窗口层 → 任务栏层；层级、圆角、阴影一律用 designs 令牌，禁止魔法值
- [ ] `FluereAppWindow`：圆角窗口、标题栏（应用图标 + 标题 + 可拖拽区）、caption 按钮（最小化 / 最大化 / 关闭，含关闭键红底 hover）、窗口内独立滚动区
- [ ] caption 按钮**真实可用**：最小化 / 最大化 / 还原窗口视口；「关闭」不伪装成坏按钮（跳回首页或收起到任务栏），全部键盘可达（Tab + Enter）且 `aria-label` 双语
- [ ] 窗口尺寸与位置在桌面尺寸变化时的响应式策略；移动端断点降级为全屏无边框

### 2.2 任务栏 / 开始菜单 / 系统托盘

- [ ] `Taskbar`：居中图标组（开始、搜索、已固定入口）、hover / active 指示条、点击弹出或还原窗口
- [ ] `StartMenu`：Acrylic 面板承载站点信息架构（首页、指南、组件、设计令牌、路线图、GitHub），支持键盘导航与 Esc 关闭
- [ ] `SystemTray`：时钟（`Intl.DateTimeFormat` 按 locale）、主题切换、语言切换（与目标 1 共用同一控件）、版本号（读 `package.json`，去掉硬编码）
- [ ] 浮层焦点管理：聚焦陷阱、Esc / 点击外部关闭；通用逻辑优先下沉到 `packages/hooks`（如 `use-disclosure`），避免后续弹层组件重复实现

### 2.3 应用内导航（NavigationView 化）

- [ ] 把 `apps/docs/layouts/components.vue` 重构为窗口内 `NavigationView`：可折叠面板、分组（basic / form / color / dates / general，数据源仍是 `components-nav.ts`）、顶部搜索框、底部设置项
- [ ] 组件页新增右栏「本页目录」，页头带面包屑与「复制链接」
- [ ] `Ctrl+K` 命令面板式搜索：跨组件与正文（`@nuxt/content` 查询），全键盘可完成「打开 → 输入 → 选中 → 跳转」

### 2.4 页面与内容呈现

- [ ] 组件文档页模板化：标题区 + 示例卡片（Light / Dark 并排对照）+ 代码块（复制按钮、语言标签、行高亮）+ Props / Events / Slots 表格
- [ ] 示例的明暗对照与 `use-color-mode` 打通（示例级切换或跟随站点，二选一并记录理由）
- [ ] 新增站点页：入门 / 安装（真实可用的 `pnpm add` 指引，配合目标 3）、设计令牌浏览页、路线图 / 更新日志、404 空态（可读、可操作，不做成死胡同）
- [ ] 所有新增页面文案走 i18n key（与目标 1 同步，不新增硬编码中文）

### 2.5 动效、性能与无障碍

- [ ] 动效全部走 designs 的时长 / 缓动令牌，并遵循 `@fluere-vue/hooks` 的 `use-reduced-motion`（`prefers-reduced-motion` 下关闭窗口与菜单过渡）
- [ ] SSR 安全：`window` / `matchMedia` / `localStorage` 一律按 `docs/ssr-guide.md` 分级处理，外壳不得引入水合不匹配
- [ ] 性能预算：限制首屏 JS / CSS 体积与 `backdrop-filter` 覆盖面积（避免「为了像 Windows 而卡」）；`pnpm docs:generate` 产物在低端设备上滚动流畅
- [ ] 无障碍：窗口 / 任务栏 / 开始菜单的语义角色与 `aria-modal`；还原 WinUI 焦点矩形；对比度达标；装饰元素 `aria-hidden`；全部仿真控件可键盘操作
- [ ] **验收**：
  - 1280 / 1440 / 1920 与移动端均不溢出、不重叠，窗口内容可滚动到底；
  - Light / Dark 下所有新表面（窗口、任务栏、Acrylic 面板）对比度达标且无「白闪」；
  - 全站键盘可达：Tab 顺序合理、Esc 关闭浮层、`Ctrl+K` 打开搜索，焦点不被外壳吞掉；
  - `pnpm check` / `pnpm test` / `pnpm docs:generate` 全绿，SSR 冒烟覆盖新布局；
  - 视觉自检清单（rest / hover / pressed / focus / disabled × 明暗）写入站点 README 或 `docs/`，作为回归依据。
- **非目标（一期）**：真实多窗口与拖拽吸附、动态壁纸、系统级动画复刻、移动端仿桌面。

## 目标 3 · 集成 npm 发布基建并正式发布线上 0.3.0-rc.1

### 现状（阻塞发布的硬事实，逐条对照）

- 6 个包版本均为 `0.0.1`；`apps/*` 为 `private`，库包均未 `private`，但从未发布过。
- **包入口指向源码**：`@fluere-vue/ui` 的 `main` / `exports` 是 `./index.ts`，`@fluere-vue/designs`、`@fluere-vue/themes` 指向 `src/index.ts`——直接发布会发现消费方无法使用（无 `dist`、无 `.d.ts`）。
- 无 `files` 字段（会连带发布 `scripts/`、`generated/` 等非必要内容）、无 `publishConfig`（scoped 包默认 restricted）、无 `peerDependencies: vue`、无 `engines`；`packages/themes` 连 `exports` 字段都没有。
- 无库构建脚本（`pnpm build` 对纯库包目前不产出任何 dist）、无 CI（仓库无 `.github/`）、无 Changesets / CHANGELOG、根目录无 `LICENSE` 文件。
- README「快速开始」仍标注「尚未发布」，文档站页脚硬编码 `v0.0.1`。

### 3.1 包元数据与发布体检

- [ ] 逐包补齐：`files`、完整 `exports`（`import` / `require` / `types`，外加 `./style.css`、按需子路径如 `@fluere-vue/ui/button`、`@fluere-vue/designs/tokens.css`）、`types`、`sideEffects`（CSS 例外）、`publishConfig.access: "public"`、`repository.directory`、`engines.node`、`peerDependencies: { vue: "^3.5" }`
- [ ] 根目录补 `LICENSE`（MIT © 夕云葛城）；为 `ui` / `designs` / `themes` / `icons` 补包级 README（用法与相互依赖关系）
- [ ] 版本矩阵决策：所有 `@fluere-vue/*` 是否统一版本号（建议统一，便于用户理解与文档站展示），结论写入发布手册

### 3.2 构建管线

- [ ] 选定构建器（Vite 8 lib mode / tsdown / unbuild 三选一），**先做 spike 对比**：`.d.ts` 质量、Vue SFC 处理、CSS 产出、SSR 友好性、构建耗时；结论以 ADR 形式记录
- [ ] 构建顺序按拓扑：`designs`（先跑令牌生成）→ `themes` / `icons` / `hooks` / `utils` → `ui`；`pnpm -r build` 保证依赖顺序
- [ ] 产物形态：ESM 为主、CJS 兼容策略明确、`.d.ts` 完整、`tokens.css` 与图标按需导入可用；`vue` / `reka-ui` / `unocss` **外部化**，不打包进 dist
- [ ] tree-shaking 验证：`sideEffects` 正确，按需引入单组件后的体积符合预期并记录基线
- [ ] 扩展 `pnpm check` / `pnpm test`：至少新增一条「从 `dist` 引入并渲染」的冒烟用例，避免测试只覆盖源码入口

### 3.3 版本与变更日志

- [ ] 接入 Changesets：包间依赖联动 + `rc` 预发布模式（`changeset pre enter rc` / `pre exit`）
- [ ] CHANGELOG 自动生成 + 逐包 `CHANGELOG.md`；沿用现有 emoji conventional commit 规范并固化到 `CONTRIBUTING`
- [ ] 版本单一事实源：文档站页脚、README、`docs/todo.md` 标题一律从 `package.json` 读取或由发布流程注入，禁止硬编码

### 3.4 发布流水线（CI/CD）

- [ ] `.github/workflows/ci.yml`：PR 上跑 install（frozen lockfile）+ `pnpm check` + `pnpm test` + `pnpm build` + `pnpm docs:generate`
- [ ] `.github/workflows/release.yml`：Changesets action 开 release PR；合并后按 `rc` / `next` tag 发布（**预发布不占 `latest`**），启用 npm provenance（OIDC trusted publishing 或 `NPM_TOKEN` secret，二选一并记录）
- [ ] 发布前质量闸：`publint` + `@arethetypeswrong/cli` 全绿；`npm pack --dry-run` 复核 tarball 内容与体积（不含源码、测试、未生成物）
- [ ] 发布彩排：本地 verdaccio 或 `--dry-run` 走通全流程（含 dist 安装、SSR 渲染、CSS 引入）
- [ ] 回滚与补救预案：`npm deprecate`、撤销 tag、`latest` 回指上一版的具体步骤写入 `docs/release.md`

### 3.5 正式发布 0.3.0-rc.1（按序执行）

- [ ] 冻结范围：确认 0.3.0-rc.1 包含的组件与文档（与上半部分组件清单对齐），未完成项明确移出并记录
- [ ] `changeset pre enter rc` → 全包 bump 到 `0.3.0-rc.1` → 构建 → 校验 → 发布 `--tag rc`（`npm i @fluere-vue/ui@rc` 可用，`latest` 不受影响）
- [ ] 发布后验证（干净目录、走公网 npm 安装）：`pnpm add @fluere-vue/ui@0.3.0-rc.1` 后 Button / Checkbox / Slider 等可正常渲染、样式生效、`renderToString` 不抛错、peer 警告符合预期
- [ ] 收口文档：README 去掉「尚未发布」、补安装与按需引入示例、更新组件进度表与版本号；文档站展示线上版本与更新日志
- [ ] 打 git tag `v0.3.0-rc.1` + GitHub Release（附破坏性变更与已知问题清单）
- [ ] **验收**：
  - `@fluere-vue/*@0.3.0-rc.1` 在 npm 全部可见，`dist-tags` 中 `latest` 未被预发布污染；
  - 三个独立消费场景验证通过：Vite SPA、Nuxt SSR、纯类型引用（`vue-tsc` 无错）；
  - CI 在 PR 与 release 两条链路上全绿，同一 commit 重跑发布不产生脏状态；
  - 发布手册与回滚步骤齐备，且经过一次彩排验证。
- **非目标（一期）**：自动化视觉回归发布门、GitHub Packages 等多 registry 同步、CDN / unpkg 体积门、0.3.0 稳定正式版（rc 验证后再定）。

## 依赖关系与建议顺序

1. **先做两个 spike**：目标 1.1 的 i18n 选型（影响文档站结构）与目标 3.2 的构建器选型（影响所有包入口）。两者互不阻塞，各控制在 1 天内出结论。
2. **目标 2 依赖目标 1 的 key 约定**：先定 i18n 基建与命名，再固化外壳与页面模板，否则文案要返工两遍。顺序：i18n 基建 → 2.1 / 2.2 外壳 → 2.3 / 2.4 页面 → 2.5 打磨。
3. **目标 3 的 3.1 / 3.2 可与目标 2 并行**（只改包元数据与构建，不碰文档站页面）；3.4 流水线等 CI 能跑通 `docs:generate` 之后再接入。
4. **发布前统一冻结**：版本号、README / 文档站版本展示、CHANGELOG、本文件勾选状态一次性收口，避免「代码已发、文档没跟上」。

## 风险与对策

| 风险                                   | 影响                     | 对策                                                             |
| -------------------------------------- | ------------------------ | ---------------------------------------------------------------- |
| 文档站「仿真」过度                     | 首屏慢、移动端卡顿       | 令牌化动效 + 性能预算 + 移动端降级全屏，仿真范围写入 README      |
| i18n 与 `@nuxt/content` + SSG 组合踩坑 | 双语路由与内容查询返工   | 先 spike 验证 `prefix_except_default` + 内容目录方案，再批量翻译 |
| 纯 TS 源码入口被发布                   | 消费方无法使用、口碑受损 | 3.2 强制 `dist` + `types`，发布闸用 `publint` / `attw` 拦截      |
| 预发布污染 `latest`                    | 用户误装 rc 版           | `changeset pre enter rc` + `--tag rc`，发布后核对 `dist-tags`    |
| 双语文案长期不同步                     | 英文页无人维护           | 缺失回退 + CI key 完整性校验 + 页面标注英文状态                  |
| 组件清单与发布范围脱节                 | 发布内容与 README 不一致 | 发布前冻结范围，同步 README 与 `docs/todo.md`                    |
