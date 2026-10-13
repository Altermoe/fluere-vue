/* oxlint-disable import/no-nodejs-modules, id-length, no-magic-numbers, prefer-named-capture-group, curly, no-null, no-continue, prefer-template, capitalized-comments, no-ternary -- 一次性 token 抽取/生成工具脚本，Node 内建模块为有意使用 */
/**
 * 从两支事实源生成适配产物：
 *   - data/fluent-tokens.json  Fluent 2 令牌（从 @fluentui/tokens 抽取）
 *   - data/repo-tokens.json    仓库自有令牌（Fluent token 表没有的档位：z-index 刻度、WinUI 材质桥接）
 * 产出：
 *   - generated/tokens.css         全部 CSS 变量（明暗差异用 light-dark() + color-scheme；
 *                                  多值 token（阴影）逐层合成，见 theme-value.mjs）
 *   - generated/preset-fluent.ts   UnoCSS preset（颜色用精确 token 名，标度用 fluent-* 别名）
 *   - generated/token-names.ts     token 名常量与类型
 *
 * 用法：node scripts/generate.mjs
 * 重建：node scripts/extract-tokens.mjs && node scripts/generate.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mergeThemedValue } from './theme-value.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const data = JSON.parse(readFileSync(join(here, '..', 'data', 'fluent-tokens.json'), 'utf8'))
const repo = JSON.parse(readFileSync(join(here, '..', 'data', 'repo-tokens.json'), 'utf8'))
const outDir = join(here, '..', 'generated')
mkdirSync(outDir, { recursive: true })

const { tokens, typographyStyles } = data
const repoTokens = repo.tokens ?? {}

// 两支事实源分开存放：extract-tokens.mjs 会整体重写 fluent-tokens.json，
// 手写档位必须落在 repo-tokens.json 才不会被上游抽取冲掉。
// 同一 token 名不允许两处定义（否则生成值取决于遍历顺序）。
for (const name of Object.keys(repoTokens)) {
  if (name in tokens) {
    throw new Error(`data/repo-tokens.json 的 "${name}" 与 Fluent token 重名，请改名或删除其中之一`)
  }
}
const entries = [...Object.entries(tokens), ...Object.entries(repoTokens)]

const kebabify = (str) =>
  str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Za-z])(\d)/g, '$1-$2')
    .toLowerCase()

/* ------------------------------------------------------------------ */
/* 1) tokens.css                                                       */
/* ------------------------------------------------------------------ */
const globalDecls = []
const themeDecls = []
for (const [name, { light, dark }] of entries) {
  const varName = `--${name}`
  if (String(light) === String(dark)) {
    globalDecls.push(`  ${varName}: ${light};`)
  } else {
    // 明暗不同的值统一走 mergeThemedValue：单值 → light-dark()；多值（阴影）→ 逐层合成。
    // 直接把多值塞进 light-dark() 会产出 4 个实参的非法调用，整条声明会被浏览器丢弃。
    themeDecls.push(`  ${varName}: ${mergeThemedValue(name, light, dark)};`)
  }
}
const css = [
  '/* Generated from data/fluent-tokens.json + data/repo-tokens.json — do not edit by hand. */',
  '/* Rebuild: node scripts/extract-tokens.mjs && node scripts/generate.mjs */',
  ':root {',
  ...globalDecls,
  '}',
  '',
  ':root {',
  '  color-scheme: light dark;',
  ...themeDecls,
  '}',
  '',
].join('\n')
writeFileSync(join(outDir, 'tokens.css'), css)

/* ------------------------------------------------------------------ */
/* 2) theme mappings                                                   */
/* ------------------------------------------------------------------ */
const get = (prefix) =>
  Object.fromEntries(
    entries.filter(([name]) => name.startsWith(prefix)).map(([name]) => [name, `var(--${name})`]),
  )

// 颜色：精确 token 名（bg-colorBrandBackground 等）。
// 仓库自有令牌里 kind: 'color' 的材质画刷刻意保留 WinUI 资源名（不以 color 开头），
// 这里显式并进颜色刻度，保证 bg-micaBackgroundFillColorBase 这类工具类同样可用。
const repoColorTokens = Object.entries(repoTokens)
  .filter(([, token]) => token.kind === 'color')
  .map(([name]) => [name, `var(--${name})`])
const colors = Object.fromEntries([...Object.entries(get('color')), ...repoColorTokens])

// 字体族
const fontFamily = {
  base: 'var(--fontFamilyBase)',
  mono: 'var(--fontFamilyMonospace)',
  numeric: 'var(--fontFamilyNumeric)',
}

// 字号 / 行高 / 合并 text
const fontSize = Object.fromEntries(
  entries
    .filter(([name]) => name.startsWith('fontSize'))
    .map(([name]) => [kebabify(name.replace(/^fontSize/, '')), `var(--${name})`]),
)
const lineHeight = Object.fromEntries(
  entries
    .filter(([name]) => name.startsWith('lineHeight'))
    .map(([name]) => [kebabify(name.replace(/^lineHeight/, '')), `var(--${name})`]),
)
const text = Object.fromEntries(
  Object.keys(fontSize).map((key) => [
    key,
    { fontSize: fontSize[key], lineHeight: lineHeight[key] },
  ]),
)

// 字重
const fontWeight = Object.fromEntries(
  entries
    .filter(([name]) => name.startsWith('fontWeight'))
    .map(([name]) => [kebabify(name.replace(/^fontWeight/, '')), `var(--${name})`]),
)

// 间距（fluent-* 短别名）
const SPACING_ALIAS = {
  spacingHorizontalNone: 'fluent-none',
  spacingHorizontalXXS: 'fluent-xxs',
  spacingHorizontalXS: 'fluent-xs',
  spacingHorizontalSNudge: 'fluent-s-nudge',
  spacingHorizontalS: 'fluent-s',
  spacingHorizontalMNudge: 'fluent-m-nudge',
  spacingHorizontalM: 'fluent-m',
  spacingHorizontalL: 'fluent-l',
  spacingHorizontalXL: 'fluent-xl',
  spacingHorizontalXXL: 'fluent-xxl',
  spacingHorizontalXXXL: 'fluent-xxxl',
}
const spacing = Object.fromEntries(
  Object.entries(SPACING_ALIAS).map(([name, alias]) => [alias, `var(--${name})`]),
)

// 圆角（fluent-* 短别名）
const RADIUS_ALIAS = {
  borderRadiusNone: 'fluent-none',
  borderRadiusSmall: 'fluent-sm',
  borderRadiusMedium: 'fluent-md',
  borderRadiusLarge: 'fluent-lg',
  borderRadiusXLarge: 'fluent-xl',
  borderRadius2XLarge: 'fluent-2xl',
  borderRadius3XLarge: 'fluent-3xl',
  borderRadius4XLarge: 'fluent-4xl',
  borderRadius5XLarge: 'fluent-5xl',
  borderRadius6XLarge: 'fluent-6xl',
  borderRadiusCircular: 'fluent-circular',
}
const radius = Object.fromEntries(
  Object.entries(RADIUS_ALIAS).map(([name, alias]) => [alias, `var(--${name})`]),
)

// 描边宽度
const borderWidth = Object.fromEntries(
  entries
    .filter(([name]) => name.startsWith('strokeWidth'))
    .map(([name]) => [kebabify(name.replace(/^strokeWidth/, '')), `var(--${name})`]),
)

// 阴影（数字键：shadow8 -> 8 / shadow8Brand -> 8-brand）
const shadow = {}
for (const [name] of entries) {
  if (!name.startsWith('shadow')) continue
  const num = name.match(/^shadow(\d+)/)?.[1]
  if (!num) continue
  const key = name.endsWith('Brand') ? `${num}-brand` : num
  shadow[key] = `var(--${name})`
}

// 动画时长（fluent-* 短别名）
const DURATION_ALIAS = {
  durationUltraFast: 'fluent-ultra-fast',
  durationFaster: 'fluent-faster',
  durationFast: 'fluent-fast',
  durationNormal: 'fluent-normal',
  durationGentle: 'fluent-gentle',
  durationSlow: 'fluent-slow',
  durationSlower: 'fluent-slower',
  durationUltraSlow: 'fluent-ultra-slow',
}
const duration = Object.fromEntries(
  Object.entries(DURATION_ALIAS).map(([name, alias]) => [alias, `var(--${name})`]),
)

// 缓动曲线（kebab 键：curveEasyEase -> easy-ease）
const easing = Object.fromEntries(
  entries
    .filter(([name]) => name.startsWith('curve'))
    .map(([name]) => [kebabify(name.replace(/^curve/, '')), `var(--${name})`]),
)

// z-index 分层刻度（名称键：zIndexNavFlyout → nav-flyout；见 data/repo-tokens.json）
const zIndex = Object.fromEntries(
  entries
    .filter(([name]) => name.startsWith('zIndex'))
    .map(([name]) => [kebabify(name.replace(/^zIndex/, '')), `var(--${name})`]),
)

// 排版样式（body1 / caption1 / ...；@fluentui/tokens 的值已是 var(--...) 字符串，直接引用）
const typography = {}
for (const [name, spec] of Object.entries(typographyStyles ?? {})) {
  const entry = {}
  for (const k of ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight']) {
    if (spec[k]) entry[k] = spec[k]
  }
  typography[name] = entry
}

const fmtObj = (obj, indent = '    ') => {
  const lines = Object.entries(obj).map(([k, v]) => {
    if (v && typeof v === 'object') {
      return `${indent}'${k}': { ${Object.entries(v)
        .map(([kk, vv]) => `${kk}: '${vv}'`)
        .join(', ')} },`
    }
    return `${indent}'${k}': '${v}',`
  })
  return lines.join('\n')
}

/* ------------------------------------------------------------------ */
/* 3) preset-fluent.ts                                                 */
/* ------------------------------------------------------------------ */
const themeConsts = [
  ['themeColors', colors],
  ['themeFontFamily', fontFamily],
  ['themeFontSize', fontSize],
  ['themeLineHeight', lineHeight],
  ['themeText', text],
  ['themeFontWeight', fontWeight],
  ['themeSpacing', spacing],
  ['themeRadius', radius],
  ['themeBorderWidth', borderWidth],
  ['themeShadow', shadow],
  ['themeDuration', duration],
  ['themeEasing', easing],
  ['themeZIndex', zIndex],
  ['themeTypography', typography],
]
  .map(([name, obj]) => `const ${name} = {\n${fmtObj(obj)}\n}\n`)
  .join('\n')

const presetTs = `// Generated from data/fluent-tokens.json + data/repo-tokens.json — do not edit by hand.
// Rebuild: node scripts/extract-tokens.mjs && node scripts/generate.mjs
import type { Preset } from 'unocss'

/** tokens.css 文本，可由 preset preflight 注入或单独引入。 */
export const tokensCssText = \`${css.replace(/`/g, '\\`')}\`

${themeConsts}
/**
 * Fluent 2 UnoCSS preset。
 * - preflight 注入全部 token CSS 变量（light-dark() + color-scheme）
 * - theme.colors 用**精确 token 名**（bg-colorBrandBackground）
 * - theme.spacing / borderRadius / duration 用 fluent-* 短别名（p-fluent-m 等）
 */
export function presetFluere(): Preset {
  return {
    name: 'fluent2',
    preflights: [
      {
        getCSS: () => tokensCssText,
        layer: 'base',
      },
    ],
    theme: {
      colors: themeColors,
      fontFamily: themeFontFamily,
      fontSize: themeFontSize,
      lineHeight: themeLineHeight,
      text: themeText,
      fontWeight: themeFontWeight,
      spacing: themeSpacing,
      spacingHorizontal: themeSpacing,
      spacingVertical: themeSpacing,
      radius: themeRadius,
      borderRadius: themeRadius,
      borderWidth: themeBorderWidth,
      shadow: themeShadow,
      duration: themeDuration,
      easing: themeEasing,
      ease: themeEasing,
      zIndex: themeZIndex,
      typography: themeTypography,
    },
  }
}

export default presetFluere
`

writeFileSync(join(outDir, 'preset-fluent.ts'), presetTs)

/* ------------------------------------------------------------------ */
/* 4) token-names.ts                                                   */
/* ------------------------------------------------------------------ */
const names = Object.fromEntries(entries.map(([name]) => [name, true]))
const namesTs = `// Generated from data/fluent-tokens.json + data/repo-tokens.json — do not edit by hand.
// Token 名常量与类型：TS 侧引用 token 名用，杜绝拼写漂移。
export const tokenNames = ${JSON.stringify(names, null, 2)} as const

export type FluereTokenName = keyof typeof tokenNames
`
writeFileSync(join(outDir, 'token-names.ts'), namesTs)

console.log(
  `Generated:\n  ${join(outDir, 'tokens.css')}\n  ${join(outDir, 'preset-fluent.ts')}\n  ${join(outDir, 'token-names.ts')}`,
)
