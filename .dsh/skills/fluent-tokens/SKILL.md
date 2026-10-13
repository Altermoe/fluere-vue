---
name: fluent-tokens
description: The Fluent 2 design-token reference — real semantic values for color, typography, spacing, radius, stroke, duration, and motion extracted from @fluentui/tokens. Framework-agnostic source of truth; pair with a fluent-adapter-* to emit concrete code.
whenToUse: Any time you must pick a concrete color/spacing/typography/radius/duration value that conforms to Fluent 2, or emit framework code (CSS/Tailwind/React/Flutter) using Fluent semantic tokens.
---

# Fluent 2 Design Tokens

> **仓库从属声明（fluere-vue）**：本 skill 以 **Fluent 2 Web / `@fluentui/tokens`** 为事实源，仅用于**找线索与取 token 值（B 级）**；控件的几何 / 状态 / 动效等**行为**以 **WinUI 3 源码（A 级）** 为准，权威层级见仓库 `docs/style-spec.md` 与 `AGENTS.md`。在本仓库内**禁止**据本 skill 推断 WinUI 行为。

本 skill 提供 Fluent 2 语义 token 的**真实值引用**（来自官方 `@fluentui/tokens` 包）。token 是框架无关的设计语言事实来源：**任何 adapater/框架代码都应引用 token 名称，再翻译成目标表达**。

## 数据文件

完整数据在本技能目录 `data/fluent-tokens.json`。结构：

- `color.globalPalette` — 全局色板（grey 标度、whiteAlpha/blackAlpha、全部命名色）
- `color.brandWeb` / `brandTeams` / `brandOffice` / `brandTeamsV21` — 品牌色 10..160 档
- `typography.fontSizes / lineHeights / fontWeights / fontFamilies / styles` — 排版
- `spacing.horizontal / vertical` — 间距标度
- `radius` — 圆角 · `strokeWidths` — 描边 · `durations` — 动画时长 · `curves` — 缓动曲线
- `shadows` — **12 个高度（elevation）组合值**：`shadow2..64` 与 `shadow2Brand..64Brand`，
  形如 `0 0 2px var(--colorNeutralShadowAmbient), 0 8px 16px var(--colorNeutralShadowKey)`
- `alias.lightWeb` / `alias.darkWeb` — **184 个语义 token** 的解析后取值（默认 web 品牌）

### 这份数据怎么来 / 如何重建

`data/fluent-tokens.json` 是从官方 `@fluentui/tokens` **抽取生成**的，不是手写值。若文件缺失或需跟随上游更新，按下面重建（需要真实网络 + 可写的临时目录）：

```bash
# 1. 在临时目录安装官方 token 包
mkdir -p /tmp/fluent && cd /tmp/fluent
npm i @fluentui/tokens --cache "$PWD/.npmcache"

# 2. 抽取 global/alias 语义值（把下面的路径换成你实际 handle 到的包位置）
#    参考仓库最初生成脚本 extract.mjs 的做法：
#    - global/*.js 读全局 token
#    - alias/{lightColor,darkColor}.js 的 generateColorTokens(brandWeb) 得到解析后的语义值
#    输出合并为 { color, typography, spacing, radius, strokeWidths, durations, curves, alias:{lightWeb,darkWeb} }
# 3. 把它写到本技能 data/fluent-tokens.json
```

重建要点：
- **路径不写死**：抽取脚本里的包位置、临时目录、输出路径都应来自实际环境——AI 先 `pwd` 定位、用 glob 确认 `node_modules/@fluentui/tokens/lib/*.js` 真实存在，再填路径；拿不准就**询问人类**要路径或授权安装。
- 语义值来自 `generateColorTokens(brand)`（正是其它 adapter 消费的 `alias.lightWeb/darkWeb`）。
- `shadows` 段来自 `lib/utils/shadows.js` 的 `createShadowTokens(ambient, key[, 'Brand'])`（产出 `shadow2..64` 的几何），颜色部分引用 `alias` 里的 `colorNeutralShadowAmbient/Key` 与 `colorBrandShadowAmbient/Key` —— 所以**取值本身与主题无关**，换主题只需换那些颜色变量。
- 生成的 adapter 产物（`fluent.css`、`preset-fluent.ts`、`fluent_tokens.dart`）都只依赖这份 JSON；改 JSON 后重跑各自的 `gen-*` 脚本即可。

## 语义 token 命名规律

- 前缀 `color-`、`font-`、`spacing-`、`borderRadius-`、`strokeWidth-`、`duration-`、`curve-`、`shadow`。
- `Neutral`=中性，`Brand`=品牌，`CompoundBrand`=品牌高亮混合（hover/selected 用）。
- `Background`/`Foreground` + 数字（1 最靠前/重要，越大越靠后/次要）；后缀 `Hover/Pressed/Selected/Focused` 表状态。
- `Disabled`/`Static`/`Inverted` 表特殊状态。

## 关键语义 token（light 默认值示例，请以数据文件为准）

### 前景色（Foreground）
```
colorNeutralForeground1   #242424  (主文字/最高层)
colorNeutralForeground2   #424242  (次级文字)
colorNeutralForeground3   #616161  (三级/说明)
colorNeutralForeground4   #707070
colorNeutralForegroundDisabled  (禁用态)
colorBrandForegroundLink  (链接色)
colorCompoundBrandForeground1  (品牌高亮主前景)
colorNeutralForegroundInverted / Static (反白场景写白字用)
```

### 背景色（Background）
```
colorNeutralBackground1   #ffffff  (图层基底1)
colorNeutralBackground2 / 3 / 4 / 5   (逐层加深，用于容器层级)
colorBrandBackground / colorBrandBackgroundHover  (品牌底)
colorNeutralBackgroundDisabled
colorTransparentBackground
```

### 边框 / 分割
```
colorNeutralStroke1 / 2 / 3 ...  colorNeutralStrokeDisabled  colorNeutralStrokeSubtle
colorBrandStroke1 / 2  colorCompoundBrandStroke(1..)
colorTransparentStroke
```

### 尺寸 / 动效
```
borderRadiusMedium       4px · borderRadiusLarge 6px
strokeWidthThin 1px · strokeWidthThick 2px
spacingHorizontalS 8px · M 12px · L 16px · XL 20px
durationNormal 200ms · durationFast 150ms
curveEasyEase  cubic-bezier(0.33,0,0.67,1)  · curveDecelerateMax/AccelerateMin 等
```

### 高度 / 阴影（Elevation）

`shadows` 段给 6 档高度（每档都是「key 阴影 + ambient 阴影」两层），档位数字 = 模糊半径量级：

| token                      | 典型用途（对照 Fluent 2 Elevation）                              |
| -------------------------- | ---------------------------------------------------------------- |
| `shadow2`                  | 无明显描边的卡片、按下态浮动按钮（最低抬升）                     |
| `shadow4`                  | 卡片 / 网格项 / 列表项                                           |
| `shadow8`                  | 命令栏、命令下拉、Tooltip、抬升 App Bar                          |
| `shadow16`                 | Callout / Flyout / Popover / HoverCard（Web 上最常用的浮层高度） |
| `shadow28`                 | 底部面板、侧边导航、抬升 Tab 栏                                  |
| `shadow64`                 | 弹出式对话框、面板（最高层）                                     |
| `shadowNBrand`             | 品牌色表面上的同档投影（按 luminosity 修正后的品牌阴影）         |

> 平台差异：**Windows 用描边（stroke）替代 key 阴影**来勾勒对象边缘，Web 侧直接用两层阴影。

⚠️ **多值 token 不能整体塞进 `light-dark()`**：`light-dark()` 只接受两个 `<color>` 参数，
而阴影是逗号分隔的多层值。`light-dark(明, 暗)` 拼多值会变成 4 个实参的**非法调用**，
浏览器会把整条 `box-shadow` 声明丢掉（`--shadow2..64` 曾因此全部失效）：

```css
/* ✅ A. 主题块：值放 :root，颜色变量随主题切换（本仓库 adapter 的做法） */
:root {
  --shadow16: 0 0 2px var(--colorNeutralShadowAmbient), 0 8px 16px var(--colorNeutralShadowKey);
}
:root[data-theme="dark"] { --colorNeutralShadowAmbient: rgba(0,0,0,0.24); /* … */ }

/* ✅ B. 逐层包色：light-dark() 只包每一层的颜色，几何保持字面量 */
--shadow16: 0 0 2px light-dark(rgba(0,0,0,0.12), rgba(0,0,0,0.24)),
            0 8px 16px light-dark(rgba(0,0,0,0.14), rgba(0,0,0,0.28));

/* ❌ 整串塞进去 → 4 个实参 → 非法 CSS → 整条声明被丢弃 */
--shadow16: light-dark(0 0 2px #0000001f, 0 8px 16px #00000024, 0 0 2px #0000003d, 0 8px 16px #00000047);
```

> 以上为**示例**——生成代码时**务必查阅 `data/fluent-tokens.json` 取准确值**，不要凭记忆硬编码。深色主题用 `alias.darkWeb`。

## 使用规则

1. **语义优先**：输出代码引用 token 名（如 `colorNeutralBackground2`），不直接写 `#fafafa` 这类 magic value（除非该框架只能输出静态值，此时先从语义 token 查值再输出，并保留注释）。
2. **跨框架一致性**：一份设计，多套表达式——React 用 CSS-in-JS token、CSS 用 `var(--...)`、Tailwind 用主题扩展、Flutter 用 ThemeData。都在 `alias` / global 层对齐同一数值。
3. **换主题**：切换 `alias.lightWeb` ↔ `alias.darkWeb` 即可获得同一套语义的反向主题；品牌换用 `brandTeams` 等重建 alias。值来自同一个 token 系统。
4. **不要自创 token**：用户需要的值不在 token 集里时，先选最接近的语义 token + 说明偏差；不要随手发明 `colorNeutralForegroundXxx`。
5. **投影用 `shadows` 段的组合值**：CSS 写 `box-shadow: var(--shadow8)`、UnoCSS 写 `shadow-8`、Tailwind 映射 `boxShadow`；不要手写 `0 4px 8px rgba(0,0,0,.14)` 这类 magic value（它就是 `shadow8` 的一半）。

## 相关 skill

- 想生成代码 → 选对应 `fluent-adapter-*`。
- 想查组件该用哪些 token → `fluent-components`。
- 想查设计原则 → `fluent-foundations`。