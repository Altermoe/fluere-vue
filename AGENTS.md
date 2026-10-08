# AGENTS.md — AI / 协作者开发约定

> 本文件是本仓库的入口约定。**动手改任何代码之前，先读完下面的【开发前必读】。**
>
> 配套文档：[docs/style-spec.md](./docs/style-spec.md)（对齐源与核对方法）、[docs/design/token-driven-style.md](./docs/design/token-driven-style.md)（token 管线）、[docs/ssr-guide.md](./docs/ssr-guide.md)（SSR 约束）、[docs/todo.md](./docs/todo.md)（实施清单与验收口径）。

## 【开发前必读】

1. **先读 [docs/style-spec.md](./docs/style-spec.md)，并遵守它的权威层级**：
   **WinUI 3 / Windows App SDK 源码（`microsoft-ui-xaml`）> Fluent token 表 > 截图验证**。
   禁止把 Fluent UI React v9、Fluent 2 Web 规范页、WinUI 2 / UWP 文档、博客或二手 Web 实现、本仓库历史注释当作依据——它们最多用来找线索，结论必须回到源码或 token 方可落地。

2. **先对版本，再读代码**：目标 WinUI3 Gallery 发行版 → 其 `standalone.props` 的 `WindowsAppSdkPackageVersion=N` → `microsoft-ui-xaml` tag **`winui3/release/<N>`**（不是 `main`）。本地快照在 `temp/winui-src`（当前 `winui3/release/2.5.1` / `ba3a8d5`）；判断是否漂移用"控件目录 tag 间 diff"，命令与判读规则见 [style-spec §3](./docs/style-spec.md#3-获取与核对源码)。

3. **视觉值只写 token**：颜色 / 间距 / 圆角 / 描边 / 时长 / 缓动一律 `var(--TokenName)`（事实源 `packages/designs/data/fluent-tokens.json` → `generated/tokens.css`）。不许硬编码色值，不许凭截图取色。WinUI 资源名 → token 的映射写进组件注释（方法见 [style-spec §6](./docs/style-spec.md#6-winui-资源名--fluent-token-映射)）。

4. **动效必须读关键帧，不许靠截图猜**：有 `AnimatedVisuals/*.cpp` 就读 LottieGen 产物（时长 tick、舞台尺寸、`Trim`/`Rotation` 关键帧、线帽、主题属性）。小心"看着像 ease-in-out 实为线性"（`cubic-bezier(x1,y1,x2,y2)` 在 `x1==y1 && x2==y2` 时恒等 `y=x`）与 `StepEasingFunction` 阶跃。

5. **结论必须带证据**，不能"看起来对"就收工：动效/几何类改动要给出可复现的测量（冻结帧 + 像素角度/取色），方法见 [style-spec §7](./docs/style-spec.md#7-验证证据链结论必须有证据)。现成脚本：[temp/pw-progress-ring.mjs](./temp/pw-progress-ring.mjs)。

6. **改组件 = 改 SFC + 契约测试 + 文档示例 + API 表**，四件套一起改，并把过时的注释/文案顺手删掉（错误结论会自我延续）。

7. **`temp/` 已 gitignore**：WinUI 源码快照、Playwright 脚本、截图都放这里，**不要提交**，也不要把它们当作源码真相（真相在 upstream tag + 组件注释里）。

8. **提交信息遵循仓库既有规范**（`.trae/rules/git-commit-message.md`，本地规则）：Conventional Commits + emoji（`feat: ✨` / `fix: 🐛` / `docs: 📝` / `refactor: ♻️` / `test: ✅` …），描述用中文，中英/中数之间留一个半角空格。

## 项目速览

| 包                         | 职责                                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------------------- |
| `packages/designs`         | 设计令牌唯一事实源，产出 `tokens.css` 与 UnoCSS preset                                                  |
| `packages/themes`          | 主题适配层，对外提供 `presetFluere`                                                                     |
| `packages/ui`              | 组件实现（SFC + 自包含 `<style scoped>`）                                                               |
| `packages/icons`           | 生成自 Segoe Fluent Icons 的 Vue 图标组件                                                               |
| `packages/hooks` / `utils` | 共享 Hooks（`useMediaQuery` / `useReducedMotion`）与工具函数；`utils` 提供 SSR 环境与浏览器能力探测原语 |
| `apps/docs` / `playground` | 文档站（Nuxt，端口 60727）与实验场（`playground` 目前是占位包，尚无 dev 脚本）                          |

常用命令：

```bash
pnpm install
pnpm dev            # 文档站 http://localhost:60727
pnpm test           # vitest run（全仓）
pnpm check          # lint + format + tsc（交付前必跑）
pnpm lint:ssr       # SSR 兼容性扫描
```

## 标准开发流程（新增 / 修改组件）

1. **定规格**：按 [style-spec §2/§3](./docs/style-spec.md#2-版本地图先对版本再读代码) 对齐版本，再按 §4 顺序读 `*.xaml` / `*_themeresources.xaml` / `*.idl` / `*.cpp` / `AnimatedVisuals/*.cpp`，把状态表、尺寸、动效关键帧抄成注释里的"对照清单"。**模板结构也是规格**：源模板里有几层、有没有箭头/Pointer、内容是否换行，都要照抄（ToolTip 就是"模板只有一个 `ContentPresenter`，所以不画箭头"）。
2. **落 token**：① 在 `*_themeresources.xaml` 里把资源名追到最终 Color / 数值；② 在 `tokens.css` 找**同值** token；③ 找不到同值时取**语义位最近**者，并在组件注释里记录 ΔE 与合成依据（ToolTip 的 `AcrylicInAppFillColorDefaultBrush` → `colorNeutralCardBackground` 即此类）。资源定义可能不在控件目录里（如 Acrylic Brush 在 `src/controls/dev/Materials/Acrylic/AcrylicBrush_themeresources.xaml`），要顺着 `StaticResource` 跨目录追。
3. **实现组件**：`packages/ui/src/<component>/<component>.vue`，`<script lang="ts">` 里写 Props 契约与来源注释，`<script setup>` 写逻辑，`<style scoped>` 只用 token。
4. **写测试**：`<component>.test.ts` —— 渲染/aria 契约 + 从 SFC 源码解析样式与关键帧的契约断言（jsdom 解析不了 `var()`，见 style-spec §7.1）。
5. **补文档**：`apps/docs/content/components/<component>.md` + `apps/docs/components/content/demos/<component>/*.vue`，API 表与实现要点同步更新。
6. **验证与自检**：跑下面的 Definition of Done；有"值本身"取不到 A 级源码的项、或涉及浮层样式作用域的项，**必须先在真实浏览器里量一遍**再收工（见下文《验证与环境操作》）。

## 代码约定

- **注释与文档用中文**，专有名词保留英文；中英文/数字之间留空格。
- **SFC 三段式**：`<script lang="ts">`（类型与契约、来源出处）→ `<script setup lang="ts">`（逻辑）→ `<style scoped>`（样式，逐条注明对应的 WinUI 资源）。
- **scoped 样式只对"本组件模板里写出来的元素"生效**：Teleport 出去的浮层、或经第三方底座（reka / 任意 UI 库）内部渲染出来的元素，**拿不到本组件的 `data-v-*`**（Vue 只在渲染该 VNode 的组件"自己的模板元素 / 子树根"上写 scopeId）。此时 `.x-foo[data-v-x]` 永远匹配不上，整套样式**静默失效**——单元测试照样全绿（jsdom 不解析 `var()`，见 style-spec §7.1），只有真实浏览器里的 `getComputedStyle` 才暴露。排查手法与修法见下文《验证与环境操作》。修好后必须把"为什么非 scoped / 前缀如何避免冲突"写进样式块注释。
- **插槽要分类，别全塞进默认插槽**：默认插槽留给"触发元素"这类单个元素（第三方底座常按 `as-child` 克隆它），内容另用具名插槽（本库用 `#content`）。一条模板里两种 slot 混用，会让克隆把内容也当成触发元素的一部分。
- **多根组件记得 `inheritAttrs: false`**：否则透传的 `class` / `data-*` 会落到**触发元素**（用户的按钮）上而不是提示面；顺带明确：多根 + 关闭继承后，`data-*` 测试钩子是不可靠的，E2E 请按可见文本 / 语义选择器定位。
- **不引入全局样式**：组件必须自包含；页面级工具类只出现在 `apps/*`。唯一的例外是上面那条"Teleport 浮层"：允许写非 scoped 的 `<style>`，但**类名必须是本库私有 BEM 前缀**（`.fui-<component>`）并在注释里说明理由。
- **无同值 token 的视觉量 → 组件局部变量**：以 `--fui-<component>-<slot>` 形式在组件内声明，注释里写清"WinUI 资源名 + token 表找不到同值档"以及消费方如何覆盖。
- **取不到 A 级源码的"值"要显式标注证据缺口**：例如淡入淡出时长落在非公开头文件里时，写清"取值来源 + 为什么只能取这个 + 一行覆盖方法（覆写 `--fui-<component>-*`）"，**禁止**写成"时长就是 xx ms"。
- **SSR 安全**（详见 [docs/ssr-guide.md](./docs/ssr-guide.md)）：`setup()` 期不得直接访问 `window` / `document` / `matchMedia` / `ResizeObserver`；必须访问时用能力探测 + 无害默认值。生成唯一 id 用 Vue 的 `useId()`（SSR/水合一致），不要用 `getCurrentInstance().uid`。
- **无障碍**：装饰性元素对 AT 隐藏、不抢 Tab 序、不拦指针；可访问名由消费方传入或提供 `label` 类 Prop。
- **动效**：默认尊重 `prefers-reduced-motion`，且关闭动画后必须留下**合理静态形态**（不能出现空环或 0 长度弧）。
- **测试位置**：组件同名 `.test.ts` 放组件目录；跨组件纯函数测试放 `__tests__/`。

## 交互与弹层组件约定

- **多层底座要分清"谁提供上下文、谁产出 DOM"**：以 reka 为例，`TooltipProvider`（全局延时设置）与 `TooltipRoot`（open 状态 + 上下文）都**不产出 DOM**，直接放进 Grid 当"某个格子"用不会打乱布局（InfoBar 的关闭按钮即如此）。写之前先确认这一点，再决定要不要包一层宿主元素。
- **`<component :is="A" v-if="x" /><B v-else />` 是个坑**：动态组件分支上的 `@update:open` 一类事件**不会被可靠转发**（实测父组件的处理函数一次都没触发，产物无报错，只是内部状态改了、外部不知道）。要切换宿主组件时，老老实实写两条字面量分支，并用 `computed` 的 props 对象 + 一个内部 Fixture 组件消重。
- **底座"强制必须套 Provider"时，用注入旗标做缺省**：第三方 `createContext` 在缺 Provider 时会直接抛错。正确做法是包内自建一个 `Symbol` 旗标（`provide/inject`），`FluereTooltip` 据此判断祖先有没有 `FluereTooltipProvider`：没有就自带一层缺省配置（数值对齐 WinUI 的进程级缺省值），有就沿用祖先的——**既保证单用不炸，又不破坏"多个实例共享同一份全局手感"**。不要无条件再套一层，那会把祖先的配置挡掉。
- **浮层层级要成体系**：文档站里 ContentDialog / Combobox 下拉是 `1000`，ToolTip 取 `1100`（永远最上层）。新加浮层时先看现有档位，别随手写 `9999`。
- **受控 / 非受控都要支持**：`open === undefined` 时把 `open` 透传为 `undefined` 交回底座自管，并用底座抛回的 update 事件同步本地状态；受控时只认 Prop。别只做一种。

## 验证与环境操作

- **先探活，再跑脚本**：启动 Playwright 之前先 `curl -sS -o /dev/null -w "%{http_code}" http://localhost:60727/<page>`，需要看端口用 `ss -ltn | grep 60727`。**会话之间 dev server 会消失**，直接跑脚本只会得到 `waitForSelector` 超时，白等 30s。
- **要用 dev server 就自己起**：`cd apps/docs && nohup pnpm dev > temp/docs-dev.log 2>&1 &`（后台作业 + `disown`），日志落 `temp/`。**不要占用/杀掉用户前台终端里的进程**；确实需要重启先确认那个进程不是你起的。
- **页面异常先怀疑构建缓存，再怀疑代码**：改了 SFC 但"计算样式还是旧的 / 出现离奇 hydration 错误"时，按顺序排查 ① `curl` 取 dev server 编译产物（`http://localhost:60727/_nuxt/@fs/<abs path>`）看里面的模板是不是旧版本；② 清 `apps/docs/node_modules/.cache/vite` 与 `apps/docs/.nuxt/cache`；③ 重启 dev server。
- **样式静默失效的排查手法**（配合上文"scoped 只对本模板元素生效"）：先在浏览器里 `getComputedStyle` 量关键值（`padding` / `backgroundColor` / `fontSize`）。若出现 `0px` / 透明 / 默认字号，且元素上**没有** `data-v-*`，就是作用域问题而不是 CSS 写错。修法：把该样式块改为非 scoped（类名保持 `.fui-<component>` 私有前缀）并把理由写进注释。注意 `ContentDialog` 这类经底座 `as-child` 透传 attributes 的浮层是**能**拿到 scopeId 的，所以不要无脑全改。
- **像素采样只做交叉验证，不做取值依据**：可以用参考图量**结构量**（元素间隙、提示面底色是不是 `#F9F9F9`、字号 x-height 量级）来反证源码读数，但 token 值仍以源码 / token 表为准。采样前先在图里找**已知的纯色块**校准（页面底、卡片面），别把抗锯齿边缘当实测值。
- **组件测试三条卫生规则**（都踩过）：
  1. **分清微任务与宏任务**：底座的延时用 `setTimeout` 实现，`await nextTick()` 等不到它，要 `await new Promise((r) => setTimeout(r, 20))`（封装成 `flushTimer()`）。
  2. **`attachTo: document.body` 的用例不要在体内 `document.body.innerHTML = ''`**：Vue 卸载时会找不到宿主而抛 `insertBefore` of null。统一在 `afterEach` 里 `wrapper.unmount()`。
  3. **`textContent` 会把隐藏文案算两遍**：无障碍底座常把同一句话塞进 `VisuallyHidden` 元素，断言文本请只取直接文本节点。
- **`pnpm docs:generate` 也是交付前的检查项**：`apps/docs/content/**` 里的**相对链接**必须能在 content 树内解析；跨出 content 根的链接（如 `./../../../docs/xxx.md`）在 `pnpm dev` 下无感，但 `pnpm docs:generate` 预渲染会 404 并让整条命令失败。判读时先确认是不是**既有**失败（`git stash` 后在干净树上复现），只对"本次新增页面能预渲染且不引入新 404"负责。

## Definition of Done

- [ ] 规格来源已注明（控件名 + tag/commit + 关键文件路径）
- [ ] 所有视觉值走语义 token，无硬编码色值/magic number 当样式值
- [ ] 状态齐全：rest / hover / pressed / focus / disabled / inactive、明暗主题（HC 若暂不实现需注明）
- [ ] 动效逐帧核对：时长、缓动、关键帧、方向、循环衔接
- [ ] 契约测试 + （动效类）冻结帧像素测量通过
- [ ] 浮层类组件额外在**真实浏览器**里量过计算样式（确认 scoped / Teleport 没有把样式静默吃掉），并留一张明暗对照截图
- [ ] `pnpm check`、`pnpm test`、`pnpm lint:ssr` 全绿
- [ ] `pnpm docs:generate` 中新增页面能预渲染，且不引入新的 404（既有失败需注明）
- [ ] 文档站示例 + API 表已更新，旧结论/旧注释已清理
- [ ] **可复现的验证结论留在仓库里**：测量方法、预期值、结论写进组件注释 / 契约测试 / 文档页（`temp/` 下的脚本与截图只是过程产物，不进仓库、也不能当作唯一证据留存）；`temp/` 快照、脚本、截图未提交

## 红线（不要做）

- ❌ 用 Fluent UI React v9 / Fluent 2 Web 规范 / WinUI 2 文档"推断" WinUI 3 的行为。
- ❌ 用 `main` 分支或来源不明的 tag 当规范，跳过 [style-spec §2](./docs/style-spec.md#2-版本地图先对版本再读代码) 的版本核对。
- ❌ 从截图取色当 token 值（截图受系统强调色、DPI、重编码影响）。
- ❌ 在没有测量证据的情况下宣称"已对齐实机"。
- ❌ 提交 `temp/` 下的任何内容，或改动 `docs/todo.md` 的验收口径来"让结果看起来达标"。
