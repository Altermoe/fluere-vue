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

1. **定规格**：按 [style-spec §2/§3](./docs/style-spec.md#2-版本地图先对版本再读代码) 对齐版本，再按 §4 顺序读 `*.xaml` / `*_themeresources.xaml` / `*.idl` / `*.cpp` / `AnimatedVisuals/*.cpp`，把状态表、尺寸、动效关键帧抄成注释里的"对照清单"。
2. **落 token**：找到 WinUI 资源名对应的语义 token；缺 token 时先在 `packages/designs` 补（不要就地写死值）。
3. **实现组件**：`packages/ui/src/<component>/<component>.vue`，`<script lang="ts">` 里写 Props 契约与来源注释，`<script setup>` 写逻辑，`<style scoped>` 只用 token。
4. **写测试**：`<component>.test.ts` —— 渲染/aria 契约 + 从 SFC 源码解析样式与关键帧的契约断言（jsdom 解析不了 `var()`，见 style-spec §7.1）。
5. **补文档**：`apps/docs/content/components/<component>.md` + `apps/docs/components/content/demos/<component>/*.vue`，API 表与实现要点同步更新。
6. **验证与自检**：跑下面的 Definition of Done，动效类组件另跑冻结帧像素验证。

## 代码约定

- **注释与文档用中文**，专有名词保留英文；中英文/数字之间留空格。
- **SFC 三段式**：`<script lang="ts">`（类型与契约、来源出处）→ `<script setup lang="ts">`（逻辑）→ `<style scoped>`（样式，逐条注明对应的 WinUI 资源）。
- **不引入全局样式**：组件必须自包含；页面级工具类只出现在 `apps/*`。
- **SSR 安全**（详见 [docs/ssr-guide.md](./docs/ssr-guide.md)）：`setup()` 期不得直接访问 `window` / `document` / `matchMedia` / `ResizeObserver`；必须访问时用能力探测 + 无害默认值。生成唯一 id 用 Vue 的 `useId()`（SSR/水合一致），不要用 `getCurrentInstance().uid`。
- **无障碍**：装饰性元素对 AT 隐藏、不抢 Tab 序、不拦指针；可访问名由消费方传入或提供 `label` 类 Prop。
- **动效**：默认尊重 `prefers-reduced-motion`，且关闭动画后必须留下**合理静态形态**（不能出现空环或 0 长度弧）。
- **测试位置**：组件同名 `.test.ts` 放组件目录；跨组件纯函数测试放 `__tests__/`。

## Definition of Done

- [ ] 规格来源已注明（控件名 + tag/commit + 关键文件路径）
- [ ] 所有视觉值走语义 token，无硬编码色值/magic number 当样式值
- [ ] 状态齐全：rest / hover / pressed / focus / disabled / inactive、明暗主题（HC 若暂不实现需注明）
- [ ] 动效逐帧核对：时长、缓动、关键帧、方向、循环衔接
- [ ] 契约测试 + （动效类）冻结帧像素测量通过
- [ ] `pnpm check`、`pnpm test`、`pnpm lint:ssr` 全绿
- [ ] 文档站示例 + API 表已更新，旧结论/旧注释已清理
- [ ] 未把 `temp/` 下的快照、脚本、截图提交进仓库

## 红线（不要做）

- ❌ 用 Fluent UI React v9 / Fluent 2 Web 规范 / WinUI 2 文档"推断" WinUI 3 的行为。
- ❌ 用 `main` 分支或来源不明的 tag 当规范，跳过 [style-spec §2](./docs/style-spec.md#2-版本地图先对版本再读代码) 的版本核对。
- ❌ 从截图取色当 token 值（截图受系统强调色、DPI、重编码影响）。
- ❌ 在没有测量证据的情况下宣称"已对齐实机"。
- ❌ 提交 `temp/` 下的任何内容，或改动 `docs/todo.md` 的验收口径来"让结果看起来达标"。
