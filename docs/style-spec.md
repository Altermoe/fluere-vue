# 样式与行为对齐源（Style Spec）

> 状态：已落地（首次成文于 ProgressRing 二次对齐；结论均可复现）
> 关联：[AGENTS.md](../AGENTS.md)（开发前必读）、[token-driven-style.md](./design/token-driven-style.md)（token 管线）、[ssr-guide.md](./ssr-guide.md)（SSR 约束）
>
> 本文只回答一个问题：**还原一个 WinUI 控件时，以什么为准、怎么核对、怎么证明对上了。**

## 0. 一句话原则

> **WinUI 3 / Windows App SDK 的源码是行为与几何的唯一裁决者；Fluent token 表只提供"值"；截图、第三方 Web 库、博客只能用来验证。**

FluereVue 的定位是"回到 Windows 实机逐项还原"（见 [README](../README.md)），因此凡是"手感/动效/尺寸"类争议，一律回到 `microsoft-ui-xaml` 的控件源码，而不是任何 Web 侧的 Fluent 实现。

## 1. 权威层级（冲突时按此顺序）

| 级别  | 来源                                                                                                                                                       | 用途                                       | 注意                                                              |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------- |
| **A** | `microsoft-ui-xaml` 控件源码：`*.xaml` / `*_themeresources.xaml` / `*.idl` / `*.h` / `*.cpp`，以及 `AnimatedVisuals/*.cpp`（LottieGen 生成的 Lottie 实现） | 几何、状态机、默认值、动效关键帧的最终裁决 | **tag 必须与目标 WindowsAppSDK 版本对应**（§2）                   |
| **B** | `packages/designs/data/fluent-tokens.json` → `packages/designs/generated/tokens.css`                                                                       | 颜色、间距、圆角、描边、时长、缓动的取值   | 组件只写 `var(--TokenName)`；取值本身不改，改的是"映射关系"（§6） |
| **C** | WinUI3 Gallery 截图 / 实机运行                                                                                                                             | 交叉验证、视觉回归基准                     | 受系统强调色、DPI、抗锯齿、图片重编码影响，**严禁照抄色值**（§8） |
| **✗** | Fluent UI React v9 文档与实现、Fluent 2 Web 规范页、WinUI 2 / UWP 文档、搜索引擎里的二手实现、本仓库历史注释                                               | 找线索时可以参考                           | 一律不得作为依据；必须回到 A/B 复核后才能写进代码与文档           |

> 这不是"学术洁癖"：ProgressRing 上一轮之所以跑偏，正是因为按"常见 Web 进度环（渐变彗星 + 固定弧长）"的先验去读一份**实为两组实色圆头弧**的 Lottie 素材（详见附录 A）。

## 2. 版本地图：先对版本，再读代码

1. 目标基准 = **最新 WinUI3 Gallery 发行版**（仓库 `microsoft/WinUI-Gallery`，tag 形如 `v2.9.3`）。
2. 在 Gallery 仓库根目录的 [`standalone.props`](https://github.com/microsoft/WinUI-Gallery/blob/v2.9.3/standalone.props) 里读 `WindowsAppSdkPackageVersion`，其值 `N` 即目标 Windows App SDK 版本。
3. 该版本对应 `microsoft-ui-xaml` 的 tag **`winui3/release/<N>`**。控件行为以这个 tag 为准，**不是** `main`，也不是随手拿到的某个分支。

已核实（2026-09）：

| 项                         | 值                                                                               |
| -------------------------- | -------------------------------------------------------------------------------- |
| 最新 WinUI3 Gallery 发行版 | `v2.9.3`（commit `14a4a1a`，2026-05-22）                                         |
| 其依赖的 WindowsAppSDK     | `2.0.1` ⇒ tag `winui3/release/2.0.1`（commit `978ab63`）                         |
| 本地快照 `temp/winui-src`  | tag `winui3/release/2.5.1`（commit `ba3a8d5`，分支 `winui3/release/2.0-stable`） |

**怎么判断"是不是拿错版本了"：对目标控件目录做两 tag 间 diff（§3.3）。** 只有构建工程文件（`*.vcxitems`）差异 ⇒ 该控件无行为漂移，可放心用本地快照；一旦命中 `*.xaml` / `*.cpp` / `*.idl`，就要切到 Gallery 对应的 tag。

> 例外：**强调色不在仓库里**。`AccentFillColorDefaultBrush` / `AccentFillColorDefault` 由系统强调色在运行时注入，`microsoft-ui-xaml` 的控件子树里查不到定义。本库统一取 Fluent 默认强调色 token `--colorCompoundBrandBackground`（Light `#0F6CBD` / Dark `#479EF5`）；**实机与截图里的蓝可能是用户的自定义强调色，不能当规范值**。

## 3. 获取与核对源码

### 3.1 本地快照（推荐；`temp/` 已在 `.gitignore`）

```bash
# 首次：partial clone + sparse checkout（只取需要控件的目录，几秒级）
git clone --depth 1 --branch winui3/release/2.5.1 \
  --filter=blob:none --sparse \
  https://github.com/microsoft/microsoft-ui-xaml.git temp/winui-src

cd temp/winui-src
# 目标控件 + 公共主题资源（大多数控件的画刷/数值都在 CommonStyles 里）
git sparse-checkout set src/controls/dev/CommonStyles src/controls/dev/ProgressRing
```

### 3.2 单文件拉取（只想快速看某几个文件时）

```bash
REF=winui3/release/2.0.1
F=src/controls/dev/ProgressRing/AnimatedVisuals/ProgressRingIndeterminate.cpp
curl -sS -o /tmp/remote.cpp -w "%{http_code}\n" \
  "https://raw.githubusercontent.com/microsoft/microsoft-ui-xaml/$REF/$F"
```

⚠️ 该仓库文件带 **BOM / CRLF**，直接 `diff` 会把整个文件判为"全改"。比较前先归一化：

```bash
norm() { sed -e '1s/^\xEF\xBB\xBF//' -e 's/\r$//' "$1"; }
diff <(norm /tmp/remote.cpp) <(norm temp/winui-src/src/controls/dev/ProgressRing/AnimatedVisuals/ProgressRingIndeterminate.cpp)
```

### 3.3 tag 间 diff（判断版本漂移的标准动作）

```bash
cd temp/winui-src
git fetch --depth 1 origin tag winui3/release/2.0.1   # 需要哪个 tag 就取哪个
git diff --stat winui3/release/2.0.1 winui3/release/2.5.1 -- src/controls/dev/ProgressRing
git checkout winui3/release/2.5.1                     # 用完切回本地快照基线
```

实测结果（本轮）：ProgressRing 目录仅 `ProgressRing.vcxitems` 差 6 行（2.5.1 多一组 `Type=StylePerf2026` 的构建条目），**行为相关文件零差异**；换 tag 后 diff 为空即收工。progress-ring.vue 已据此在注释里写明"与 Gallery v2.9.3 所用 WASDK 2.0.1 同源"。

### 3.4 Gallery 侧的用法与示例

Gallery 页面代码说明**官方推荐的用法**（例如 ProgressRing 的 `Background color` 选项就用到了 `ProgressRing.Background`）：

```bash
# raw 路径规则：WinUIGallery/Samples/<Control>/<Control>Page.xaml (+ .txt 代码片段)
curl -sS "https://raw.githubusercontent.com/microsoft/WinUI-Gallery/v2.9.3/WinUIGallery/Samples/ProgressRing/ProgressRingPage.xaml"
```

## 4. 读一个控件的固定顺序

| 步骤 | 文件                            | 要抓的东西                                                                                      |
| ---- | ------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1    | `<Control>.xaml`                | 默认 `Style`：宽高、`MinWidth/MinHeight`、`IsTabStop`、`IsHitTestVisible`、`Template` 结构      |
| 2    | `<Control>_themeresources.xaml` | `Light` / `Default` / `HighContrast` 三套画刷，以及数值资源（如 `ProgressRingStrokeThickness`） |
| 3    | `<Control>.idl` / `<Control>.h` | 属性默认值（`MUX_DEFAULT_VALUE`）、变更回调开关（`MUX_PROPERTY_CHANGED_CALLBACK`）              |
| 4    | `<Control>.cpp`                 | 状态机（`VisualStateManager.GoToState`）、属性→视觉的联动、播放/停止时机                        |
| 5    | `AnimatedVisuals/*.cpp`（若有） | Lottie 几何与关键帧——**动效的真值**（§5）                                                       |
| 6    | 与 token 表对照                 | 把 A 级资源名映射成 B 级语义 token，并把映射写进组件注释（§6）                                  |

## 5. 读 Lottie 生成代码（LottieGen 产物）

`AnimatedVisuals/*.cpp` 是 `LottieGen` 从 `.json` 生成的 C++，**可读且就是规范**。可直接引用的量：

| 代码位置                                                                | 含义                                                  |
| ----------------------------------------------------------------------- | ----------------------------------------------------- |
| `c_durationTicks`                                                       | 一轮动画时长（`20000000` = 2s，1 tick = 100ns）       |
| `Size()` / `ShapeVisual` 的 `Size`                                      | Lottie 舞台尺寸（归一化到控件尺寸即可）               |
| `TransformMatrix({a,0,0,d,e,f})`                                        | scale / offset（注意**描边厚度同样被 scale 放大**）   |
| `Radius({r,r})`                                                         | 椭圆半径（换算后才是控件里的 r）                      |
| `TrimStart` / `TrimEnd` + `CreateScalarKeyFrameAnimation`               | 弧的起点/终点比例及其关键帧（= 进度条"弧长"的来源）   |
| `RotationAngleInDegrees`                                                | 容器旋转关键帧                                        |
| `StrokeThickness` / `StrokeStartCap` / `StrokeEndCap` / `StrokeDashCap` | 线宽与线帽（`Round` = 圆头）                          |
| `GetThemeProperties()` + `_theme.Foreground/Background`                 | 哪些颜色可被控件属性注入（= 我们该暴露哪些颜色 Prop） |

缓动与时间语义速查：

- `CreateCubicBezierEasingFunction({x1,y1},{x2,y2})`：**若 `x1 == y1` 且 `x2 == y2`，该缓动恒等 `y = x`，即线性**（ProgressRing 的 `.167,.167,.833,.833` 就是这种"看着像 ease-in-out 实为线性"的坑）。
- `StepEasingFunction` + `IsFinalStepSingleFrame(true)` = **hold-then-step（阶跃跳变）**；`IsInitialStepSingleFrame(true)` = step-then-hold。
- `ExpressionAnimation("_.Progress")` = 关键帧被绑定到播放进度（AnimatedVisualPlayer 的 `Progress`），不是自然时间。
- 画刷表达式里 `_theme.Foreground.W*0` 这类 `*0` 是 Lottie 的"隐藏图层"技巧，别当成透明度动画。

归一化规则：`控件值 = 舞台值 × (控件尺寸 / 舞台尺寸)`。例如 ProgressRing：舞台 80×80、`r=7`、`stroke=1.5` 且 scale 5 ⇒ 32px 控件下 `r=14`、`stroke=3`。

## 6. WinUI 资源名 → Fluent token 映射

方法（三步，缺一不可）：

1. 在 A 级 `*_themeresources.xaml` 里顺着 `ThemeResource` / `StaticResource` 追到**最终 Color 或数值**；
2. 在 `packages/designs/generated/tokens.css` 里找**语义位相同、取值相等**的 token（同一色值可能对应多个 token，按语义位选：强调色填充 → `colorCompoundBrandBackground`，而不是 `colorBrandBackground`）；
3. 把"WinUI 资源名 → token 名"的映射写进组件注释与 `docs/todo.md` 的组件条目，避免下次重新推断。

已核对的映射（示例，随组件增加而扩充）：

| WinUI 资源（Light/Default）                                                                                      | 本库 token                                            | 说明                                                                                                                                                           |
| ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ProgressRingForegroundThemeBrush` → `AccentFillColorDefaultBrush`                                               | `var(--colorCompoundBrandBackground)`                 | 强调色填充位；系统强调色 → Fluent 默认强调色                                                                                                                   |
| `ProgressRingBackgroundThemeBrush` → `ControlFillColorTransparentBrush`                                          | 无（`#00FFFFFF`，缺省不绘制）                         | 对应 ProgressRing 的 `backgroundColor` Prop 缺省值                                                                                                             |
| `ProgressRingForegroundThemeBrush`（HighContrast） → `SystemControlHighlightAccentBrush`                         | 待接入 HC 主题时统一处理                              | 目前仅记录，未实现 HC 分支                                                                                                                                     |
| 前景降级（本库约定，非 WinUI 资源）                                                                              | `var(--colorNeutralForegroundDisabled)`               | `disabled` 时的前景                                                                                                                                            |
| `ProgressBarForeground` → `AccentFillColorDefaultBrush`                                                          | `var(--colorCompoundBrandBackground)`                 | 强调色填充位；系统强调色 → Fluent 默认强调色                                                                                                                   |
| `ProgressBarBackground` → `ControlStrongStrokeColorDefault`（Light `#72000000` / Dark `#8BFFFFFF`，半透明）      | `var(--colorNeutralStrokeAccessible)`                 | 中性强描边位；Fluent 2 Web 无同值 token，取值差异记录在组件注释（可用 `backgroundColor` 传入 WinUI 原值）                                                      |
| `ProgressBarPausedForegroundColor` → `SystemFillColorCaution`（Light `#9D5D00` / Dark `#FCE100`）                | `var(--colorPaletteYellowForeground1)`                | 黄色警示家族中取值最接近者（Light `#817400` / Dark `#feee66`）；status warning 家族为橙色系，色相偏差更大                                                      |
| `ProgressBarErrorForegroundColor` → `SystemFillColorCritical`（Light `#C42B1C` / Dark `#FF99A4`）                | `var(--colorStatusDangerForeground3)`                 | Light `#c50f1f` ≈ `#C42B1C`、Dark `#eeacb2` ≈ `#FF99A4`，两个主题都最接近                                                                                      |
| `ProgressBarMinHeight`/`TrackHeight`/`CornerRadius`/`TrackCornerRadius` = 3 / 1 / 1.5 / 0.5                      | 无同值 token（组件内 `--pb-*` 局部变量）              | Fluent token 表无 1.5 / 0.5 档圆角与 3px 高度，按 WinUI 资源名落成组件局部变量                                                                                 |
| `InfoBadgeBackground` → `AccentFillColorDefaultBrush`                                                            | `var(--colorCompoundBrandBackground)`                 | 强调色填充位；系统强调色 → Fluent 默认强调色                                                                                                                   |
| `SystemFillColorSolidNeutralBrush`（Light `#8A8A8A` / Dark `#9D9D9D`）                                           | `var(--colorNeutralForeground4)`                      | 中性 4 级实色档（`#707070` / `#999999`），ΔE 10.2 / 1.5；Fluent 2 Web 无「实心中性填充」家族                                                                   |
| `InfoBadgeForeground` → `TextOnAccentFillColorPrimaryBrush`（Light `#FFFFFF` / Dark `#000000`）                  | `var(--colorNeutralForegroundInverted2)`              | 反白前景位（`#ffffff` / `#242424`），与 InfoBar 的 `TextFillColorInverse` 沿用同一映射                                                                         |
| `InfoBadgeMinWidth`/`MinHeight`/`MaxHeight`/`ValueFontSize` = 4 / 4 / 16 / 11                                    | 无同值 token（组件内 `--fui-info-badge-*`）           | Fluent token 表无 4 / 16 / 11 这几个档位，按 WinUI 资源名落成组件局部变量                                                                                      |
| `CornerRadius` = `ActualHeight / 2`（`InfoBadge.cpp#OnSizeChanged`）                                             | `var(--borderRadiusCircular)`                         | 全圆角 token 与「高的一半」在任意高度下几何等价；消费方显式设过 `CornerRadius` 时不接管                                                                        |
| `ContentDialogBackground` ← `SolidBackgroundFillColorBase`（Light `#F3F3F3` / Dark `#202020`）                   | `var(--colorNeutralBackground2)`                      | 弹窗底色（`#fafafa` / `#1f1f1f`），ΔE 2.3 / 0.6；Fluent 2 Web 无同值档                                                                                         |
| `ContentDialogTopOverlay` ← `LayerFillColorAlt` 叠在底色上的结果（Light `#FFFFFF` / Dark `#2C2C2C`）             | `var(--colorNeutralBackground1)`                      | 内容 / 标题层底色（`#ffffff` / `#292929`），ΔE 0 / 1.4                                                                                                         |
| `ContentDialogBorderBrush` ← `SurfaceStrokeColorDefault`（40% `#757575`，合成 Light `#C1C1C1` / Dark `#424242`） | `var(--colorNeutralStroke2)`                          | `#e0e0e0` / `#525252`，ΔE 31 / 16（max 最小者）；注意 InfoBar / Input 的 `colorNeutralStrokeAlpha` 对应的是 `CardStrokeColorDefault`，两者不可混用             |
| `ContentDialogSeparatorBorderBrush` ← `CardStrokeColorDefault`（`#0F000000` ≈ 5.9% 黑）                          | `var(--colorNeutralStrokeAlpha)`                      | 与 InfoBar 的同一资源映射保持一致（rgba(0,0,0,.05)）                                                                                                           |
| `ContentDialogSmokeFill` ← `SmokeFillColorDefault`（`#4D000000`，30% 黑，双主题）                                | `var(--colorBackgroundOverlay)`                       | 遮罩层（rgba(0,0,0,.4) / .5），语义位唯一命中；alpha 差 10% / 20%                                                                                              |
| `ControlNormalAnimationDuration`(250ms) / `ControlFastOutSlowInKeySpline`(0,0,0,1)                               | `var(--durationGentle)` / `var(--curveDecelerateMid)` | ContentDialogOpenClose 过渡的缩放时长与缓动（同值）；`ControlFastAnimationDuration`(167ms) / `ControlFasterAnimationDuration`(83ms) 无同值档，落成组件局部变量 |
| `ApplyElevationEffect(0, baseElevation=128)`（`ContentDialog_Partial.cpp#PrepareContent`）                       | `var(--shadow64)`                                     | 源码只给 baseElevation、无 px 可换算，按浮层语义位取 Fluent 2 最大档（B 级近似）                                                                               |

## 7. 验证证据链（结论必须有证据）

1. **契约单测**：jsdom 解析不了 `var()`，因此对 SFC 源码做文本断言（选择器 → 声明、关键帧内容、内联属性）。参见 `packages/ui/src/progress-ring/progress-ring.test.ts` 里的 `readStyleRules()` / `readKeyframes()`。
2. **动效还原**：`docs` dev server（60727）+ Playwright **冻结帧 + 像素测量**。
   - 冻结用 Web Animations API：`el.getAnimations().forEach(a => { a.pause(); a.currentTime = ms })`；**"负 `animation-delay` + `paused`"在 Chromium 下有约 50ms 漂移，不可用于逐帧比对**。
   - 用"按颜色分离像素 → 极坐标角度直方图"独立测量弧的张角与中线，与源码关键帧公式逐点比对。可复用脚本：[temp/pw-progress-ring.mjs](../temp/pw-progress-ring.mjs)（62 项断言含冻结帧数学表）；线性指示条用 [temp/pw-progress-bar.mjs](../temp/pw-progress-bar.mjs)（32 项断言：几何/配色/五状态 + 冻结帧位移与可见像素段，含"1:1 截图 + 探针"的像素测量法）；弹层类用 [temp/pw-content-dialog.mjs](../temp/pw-content-dialog.mjs)（55 项断言：几何/八种按钮落位/明暗主题 + 进入退出逐点冻结帧（scale 与 opacity 两条时间轴共存）+ 退出门控 + 遮罩合成像素与表面取色的 1×1 探针）。
   - 冻结帧测量的两个补充前提（ContentDialog 实测）：① 几何 / 像素探针必须**等动画收敛**再取样，否则根节点的 `scale` 会把 24px 内边距量成 26.25px（= 25px × 1.05）；② 同一元素上「时长不同的多条动画」不能只看最长的那条——reka 的 Presence 以第一次 `animationend` 决定卸载，故把缩放放根节点、透明度放内层，脚本要同时对两层分别比对。
   - **像素测量的两个前提**：① 探针元素要用整数像素定位（`padding` 而非 `center` + 半像素高度），否则 1px 细线会被亚像素摊成两行；② 参照色从 `getComputedStyle` 读，按颜色距离分类像素，不要用"与背景不同"这种模糊阈值。
   - 文档站内容区是自带 `ScrollView`（`transform` 偏移 + `overflow: clip`，**不是原生滚动容器**）：Playwright 的 `scrollIntoView` / `scrollIntoViewIfNeeded` 无效，要 `page.mouse.wheel()`；否则截到的是空白。
   - Vue 的 `<style scoped>` 会给 `@keyframes` 加 hash 后缀（`fui-pr-orbit-79c45151`），断言动画名用前缀匹配。
3. **参考图取样**：`ffmpeg -i ref.png -f rawvideo -pix_fmt rgb24 out.raw` → 用 Python 读字节做径向直方图/取色，用数据判断几何与颜色（本轮据此确认参考图轨道是 `#D3D3D3`、确定态自 12 点顺时针 72°）。
4. **门禁**：`pnpm check`（lint + format + tsc）、`pnpm vitest run`、`pnpm lint:ssr`。

## 8. 踩坑清单（本轮实测，按踩到的顺序）

1. **不要用先验替素材**：把 Lottie 读成"什么常见动画"是本轮返工的根因。先算关键帧，再下结论。
2. **两份素材可能互相不一致**：ProgressRing 不确定态 `r=14 / stroke=3`，确定态却是 `r≈14.16 / stroke≈2.655`（各自 Lottie 的舍入）。必须显式决策（统一取 14/3）并写进注释，而不是让两态外观飘。
3. **CSS 声明优先级 > SVG presentation attribute**：同一元素上若用属性驱动 dash（determinate），就不能在该元素上写同名的 CSS 声明；把动画声明限定在 `[data-state='...']` 选择器里。
4. **参考图的颜色可能不是规范值**：轨道 `#D3D3D3` 来自 Gallery 页面的 `Background color: LightGray` 选项（WinUI 默认是**透明**）；强调色则是截图机器的系统色（本轮实测 `#295DA8` ≠ Fluent 默认 `#0F6CBD`）。
5. **版本比对先归一化 BOM/CRLF**，否则整文件皆差异，容易得出"版本漂移了"的错误结论。
6. **历史注释会骗人**：上一轮 `progress-ring.vue` 的注释把渐变彗星写得头头是道。改动落地时**顺手更新注释与文档**，否则错误结论会自我延续。
7. **`prefers-reduced-motion` 要有兜底外观**：动画被 `animation: none` 关掉后，静态声明必须仍是一个合理的形态（ProgressRing 取半环），不能留一个 0 长度或空环。
8. **周期边界不能依赖两条动画"同时翻页"**：不确定态可见旋转 900°/轮（≡180°），而 dash 在周期首尾跳半圈（≡−180°），二者必须**同一帧**翻页才互相抵消。若拆成「`<g>` 旋转 + `<circle>` dash」两条动画，负载高时（实测 `Emulation.setCPUThrottlingRate=6`）会出现只有一条翻页的帧，整环瞬间翻转 180°——观感即"弧接近顶部时，底部突然闪一个小圆点"。修法：合并为**同一条** keyframes，并让每条属性在边界处**视觉等价**（旋转跳 2 整圈、`stroke-dashoffset` 跳 +1 圈而此刻弧长为 0）。注意**冻结帧验证查不出这类问题**（冻结会把两条动画设到同一 `currentTime`，恰好消除了这种不同步），必须另做实时播放采样：CDP `Page.startScreencast` 抓真实合成帧，用"张角→合法的两个中线角"做模型一致性判定（修前 123/400、44/400 帧不符；修后 0/801）。
9. **1px 细线不要用 `top: 50%` + `translateY(-50%)` 居中**（ProgressBar 实测）：条高 3、轨道高 1 时该组合把轨道放到 `1.5px − 0.5px` 的**半像素**上，Chromium 会把它摊成两行各 50% 覆盖——`#616161` 被画成 `#A9A9A9`，比 WinUI 的实机（XAML 布局取整后落在整数像素、参考图里只有一行灰线）淡一档。修法：直接写中心偏移 `top: calc((H − h) / 2)`（默认 3/1 ⇒ 整数 1px）。**只有像素测量能发现它**：`getBoundingClientRect()` 给出的位置是"变换后"的 21px，看起来完全正常。

## 附录 A：ProgressRing 对齐结论（范式样例）

来源：`microsoft-ui-xaml` `winui3/release/2.5.1`，`src/controls/dev/ProgressRing/`（与 Gallery v2.9.3 所用 `winui3/release/2.0.1` 行为文件一致）。

| 项             | 源码依据                                                        | 结论                                                                                                        |
| -------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 默认尺寸       | `ProgressRing.xaml`                                             | `Width/Height=32`、`MinWidth/MinHeight=16`、`IsTabStop=False`、`IsHitTestVisible=False`（纯装饰）           |
| 前景 / 轨道    | `ProgressRing_themeresources.xaml`                              | 前景 `AccentFillColorDefaultBrush`；轨道 `Background`，默认透明；`ProgressRingStrokeThickness=4` 未参与绘制 |
| 激活语义       | `ProgressRing.cpp`                                              | `IsActive=false` → `LayoutRoot.Opacity=0` + `player.Stop()`                                                 |
| 不确定态几何   | `AnimatedVisuals/ProgressRingIndeterminate.cpp`                 | 舞台 80×80、`r=7×5`、`stroke=1.5×5`、两端 `Round` ⇒ 32px 下 `r=14` / `stroke=3`                             |
| 不确定态时长   | 同上（`c_durationTicks=20000000`）                              | 2s / 轮                                                                                                     |
| 不确定态旋转   | 同上（`RotationAngleInDegrees`）                                | 0→450°(p=.5)→900°(p=1)，`cubic-bezier(.167,.167,.833,.833)` **恒等线性** ⇒ 450°/s                           |
| 不确定态弧长   | 同上（两组 `TrimStart/TrimEnd`，p=0.5 处几何重合后交替显隐）    | 单弧等价：**弧长 = min(p, 1−p) 圈（上限半周长，即 180°）**、**起点 = max(0, p−0.5)**；长为 0 时圆头收成圆点 |
| 静态轨道       | 同上（不参与旋转的整圆 `SpriteShape`，描边取主题 `Background`） | 等价于 WinUI `ProgressRing.Background` ⇒ 本库 `backgroundColor` Prop                                        |
| 确定态几何     | `AnimatedVisuals/ProgressRingDeterminate.cpp`                   | 32×32 舞台、`r=8×1.77`、`stroke=1.5×1.77`；自 12 点顺时针增长到 `(value−min)/(max−min)`                     |
| 确定态进度联动 | `ProgressRing.cpp#UpdateLottieProgress`                         | 递增时 `PlayAsync(旧进度, 新进度)`（时长 = 2s × Δ进度），回退时 `SetProgress`                               |

实现侧对应结论：`packages/ui/src/progress-ring/progress-ring.vue`（单弧 + **同一条** keyframes 同时驱动旋转与 dash：`transform −90°→180°→630°`、`stroke-dasharray 0→半圈→0`、`stroke-dashoffset 0→−C/2→−C`，可见几何仍等价于「900°/轮 旋转 + `min(p,1−p)` 弧长」；另有 `--pr-track-color` 轨道）；误差以冻结帧像素测量为准（张角误差 < 1°、中线误差 < 0.5°）。
