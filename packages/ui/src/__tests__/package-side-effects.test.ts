/* oxlint-disable import/no-nodejs-modules -- 契约测试需读取 package.json 与入口源码 */
/**
 * 包入口全局 CSS 的 `sideEffects` 契约（Vite 8 / Rolldown 生产构建「样式静默失效」防线）。
 *
 * ## 背景（2026-10-19 实测，bug 复现与修复证据）
 *
 * `packages/ui/index.ts` 顶部有三个**只为副作用**的 CSS 导入：
 *
 * ```ts
 * import '@fluere-vue/designs/tokens.css'
 * import './src/focus-visual/focus-visual.css'
 * import './src/navigation-view/navigation-view.css'
 * ```
 *
 * 文档站 dev（Vite 按需注入）正常，但 `pnpm docs:generate` 的静态产物里**这三个文件一个都没
 * 进 CSS**：`/os` 仿真桌面的侧边栏（`FluereNavigationView` 的行视觉）与全站焦点环退回浏览器
 * 默认样式，而同一组件的 scoped 样式（面板 320px 宽、内容区底色）仍在 —— 因为 scoped 样式由
 * SFC 自己导入，不经过包入口。所以症状是「只有侧边栏的行看起来丢了」。
 *
 * ## 根因（Rolldown 的 DCE 语义，见官方文档 docs/in-depth/dead-code-elimination.md）
 *
 * `package.json` 的 `sideEffects` 只声明「所有 CSS 文件有副作用」（glob 通配）时：
 *   ① CSS 文件本身被标记为「有副作用」没有问题；
 *   ② 但 `index.ts` 的导出**全部是 re-export**，Rolldown 判定「本模块自己的导出没有被使用」，
 *      把入口模块的语句（**包括那三个 bare CSS import**）当成无副作用代码消除；
 *   ③ CSS 自己的 sideEffects 标记救不回来 —— 入口那一层已经不被视为有副作用。
 * 于是 `import { FluereButton } from '@fluere-vue/ui'` 虽然把组件代码带进了产物，全局 CSS 却丢了。
 *
 * 修法：把**入口文件本身**写进 `sideEffects`（`"./index.ts"`）—— 它在语义上确实有副作用
 * （加载全局 CSS），声明后 Rolldown 保留入口语句，CSS 才能进产物。
 *
 * 复现 / 回归测量（`temp/` 过程产物，不进仓库）：
 *   - 最小复现：`import { FluereButton } from 'packages/ui/index.ts'` 做 `vite build`，
 *     只声明 CSS glob 时产出的 CSS 里没有 `.fui-navigation-view__item`；
 *     加上 `"./index.ts"` ⇒ 出现（本测试守的就是这件事）。
 *   - 真实预览（`pnpm docs:generate` + 静态 server + Playwright）：
 *     修复前 `hasGlobalItemRule=false`、行 `min-block-size: 0px` / `font-size: 16px`；
 *     修复后 `hasGlobalItemRule=true`、行 `min-block-size: 36px` / `font-size: 14px` /
 *     `line-height: 20px` / `border-radius: 8px`、选中项背景 `rgba(0, 0, 0, 0.035)`
 *     （= `--subtleFillColorSecondary`），与 `navigation-view.css` 的 A 级规格一致。
 *
 * ⚠️ 不要把它「简化」成 `sideEffects: true`：那会关掉整包的 JS tree-shaking；
 * 也不要去掉 CSS glob：发布产物 `dist/index.js` 虽已把 CSS 抽成 `style.css`，但显式
 * `import '@fluere-vue/ui/style.css'` 的消费方仍需要它被标记为有副作用。
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/** 本测试目录：packages/ui/src/__tests__ */
const testsDir = dirname(fileURLToPath(import.meta.url))

/** 包根：packages/ui */
const packageRoot = resolve(testsDir, '../..')

/** 包入口（仓库内 `main` / `exports` 均指向它，见 docs/adr/0001 §4.1） */
const entryFile = resolve(packageRoot, 'index.ts')

const packageJson = JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf8')) as {
  sideEffects?: boolean | string[]
}

/**
 * 把 `sideEffects` 的 glob 转成正则。
 *
 * 只覆盖本仓库实际用到的语法（`*` / `**` / `**\/`，以及 Rolldown 文档约定的
 * 「不含 `/` 的模式等价于 `**\/<pattern>`」）；`{}` / `[]` 等高级 glob 暂不支持 ——
 * 真用到了应该连同本函数一起补，而不是让模式静默不匹配。
 */
const globToRegExp = (glob: string): RegExp => {
  const normalized = glob.includes('/') ? glob : `**/${glob}`
  let source = ''
  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index] as string
    if (char === '*') {
      if (normalized[index + 1] === '*') {
        if (normalized[index + 2] === '/') {
          // `**/` 匹配任意层目录（含 0 层）
          source += '(?:.*/)?'
          index += 2
        } else {
          source += '.*'
          index += 1
        }
      } else {
        source += '[^/]*'
      }
      continue
    }
    source += char.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
  }
  return new RegExp(`^${source}$`)
}

const sideEffects = packageJson.sideEffects

/** 某模块（相对包根的路径，正斜杠）是否被 `sideEffects` 判定为「有副作用」 */
const isSideEffectful = (relativePath: string): boolean => {
  if (sideEffects === true) {
    return true
  }
  if (sideEffects === undefined || sideEffects === false) {
    return false
  }
  return sideEffects.some((pattern) =>
    globToRegExp(pattern.replace(/^\.\//, '')).test(relativePath),
  )
}

/** 入口里的 CSS 副作用导入（只认 `import '<path>.css'` 这种 bare 形式） */
const cssSpecifiers = [
  ...readFileSync(entryFile, 'utf8').matchAll(/^import\s+['"](?<specifier>[^'"]+\.css)['"]/gm),
].map((match) => match.groups?.specifier ?? '')

describe('包入口全局 CSS 的 sideEffects 契约', () => {
  it('入口确实带着全局 CSS 副作用导入（否则本契约失去意义）', () => {
    expect(cssSpecifiers.length).toBeGreaterThanOrEqual(3)
    expect(cssSpecifiers).toContain('@fluere-vue/designs/tokens.css')
    expect(cssSpecifiers).toContain('./src/focus-visual/focus-visual.css')
    expect(cssSpecifiers).toContain('./src/navigation-view/navigation-view.css')
  })

  it('sideEffects 必须是数组，不能用 true / false 一刀切', () => {
    // true ⇒ 整包 JS 不能 tree-shake；false ⇒ 全局 CSS 被消除。两种都会破坏既有契约。
    expect(Array.isArray(sideEffects)).toBe(true)
  })

  it('入口文件自身被 sideEffects 命中（Vite 8 / Rolldown 保留 bare CSS import 的前提）', () => {
    // 失败含义：Rolldown 会认定入口模块「自己的导出没被使用」，连同它的 CSS 副作用导入一起消除。
    // 症状是生产构建里全局 CSS 静默消失（dev 正常），侧边栏 / 焦点环退回浏览器默认样式。
    expect(isSideEffectful('index.ts')).toBe(true)
  })

  it('入口里每个相对 CSS 导入的源文件都被 sideEffects 命中', () => {
    const relativeCss = cssSpecifiers.filter((specifier) => !specifier.startsWith('@'))
    expect(relativeCss.length).toBeGreaterThan(0)
    for (const specifier of relativeCss) {
      // './src/a/b.css' → 'src/a/b.css'
      expect(isSideEffectful(specifier.replace(/^\.\//, '')), specifier).toBe(true)
    }
  })
})
