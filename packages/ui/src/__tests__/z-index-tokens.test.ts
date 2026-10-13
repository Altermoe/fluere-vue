/* oxlint-disable import/no-nodejs-modules -- 契约测试需遍历 packages/ui/src 的 SFC / CSS 源码 */
/**
 * z-index 分层刻度契约（0.4.2 验收要点：禁止组件内硬编码浮层层级）。
 *
 * 背景：浮层层级过去散落在各组件里（Combobox 下拉 1000、ToolTip 1100、ContentDialog /
 * SmokeLayer 1000），只靠「同为 1000 + Teleport 顺序」的巧合维持绘制次序，新加一层就
 * 容易踩穿。0.4.2 把刻度收进 `@fluere-vue/designs`（data/repo-tokens.json → `--zIndex*`），
 * 本测试守两件事：
 *   ① 组件样式里不得再出现裸的浮层 z-index 数字——只能 `var(...)` 引用刻度；
 *      组件内部的**局部 stacking**（滚动条拇指盖轨道之类）允许 1 / 2 / -1，但它们
 *      不是浮层档位，不参与跨组件比较；
 *   ② 四个浮层组件必须显式引用对应档位，避免「改了刻度但组件没接上」。
 *
 * jsdom 不解析 `var()`，所以这类断言只能读 SFC / CSS 源码文本（见 docs/style-spec §7.1）。
 */
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/** packages/ui/src 的绝对路径（沿用 dist-smoke.test.ts 的取法） */
const srcDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * 允许的组件内部局部 stacking 值：只影响「同一组件内部谁盖谁」，
 * 不参与浮层跨组件分级（浮层必须走 `--zIndex*` 刻度）。
 */
const LOCAL_STACKING = new Set(['auto', '1', '2', '-1'])

/** 递归收集目录下的 .vue / .css 文件 */
const collectStyleFiles = (dir: string, acc: string[] = []): string[] => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      collectStyleFiles(full, acc)
    } else if (/\.(?:vue|css)$/.test(entry.name)) {
      acc.push(full)
    }
  }
  return acc
}

/** 去掉注释后取出文件里所有 `z-index:` 声明的值 */
const readZIndexValues = (file: string): string[] => {
  const text = readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')
  return [...text.matchAll(/z-index\s*:\s*(?<value>[^;}\n]+)/g)].map((match) =>
    (match.groups?.value ?? '').trim(),
  )
}

/** 相对于 packages/ui/src 的短路径，报错时更易读 */
const shortPath = (file: string): string => file.slice(srcDir.length)

const styleFiles = collectStyleFiles(srcDir)

describe('z-index 分层刻度契约', () => {
  it('能找到被扫描的样式文件（防止遍历逻辑失效后测试空转）', () => {
    expect(styleFiles.length).toBeGreaterThan(10)
  })

  it('浮层层级一律引用 var(...) 刻度，无裸数字', () => {
    const violations: string[] = []
    for (const file of styleFiles) {
      for (const value of readZIndexValues(file)) {
        if (value.includes('var(') || LOCAL_STACKING.has(value)) {
          continue
        }
        violations.push(`${shortPath(file)}: z-index: ${value}`)
      }
    }
    expect(violations).toEqual([])
  })

  it('四个浮层组件显式引用对应档位', () => {
    const expectations: [string, string[]][] = [
      ['/combobox/combobox.vue', ['--fui-combobox-popup-z: var(--zIndexNavFlyout)']],
      ['/overlay/smoke-layer.vue', ['--fui-smoke-z: var(--zIndexModal)']],
      ['/content-dialog/content-dialog.vue', ['--fui-content-dialog-z: var(--zIndexModal)']],
      ['/tooltip/tooltip-fixture.vue', ['--fui-tooltip-z: var(--zIndexTooltip)']],
    ]
    for (const [file, snippets] of expectations) {
      const css = readFileSync(join(srcDir, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
      for (const snippet of snippets) {
        expect(css, `${file} 应声明 ${snippet}`).toContain(snippet)
      }
    }
  })
})
