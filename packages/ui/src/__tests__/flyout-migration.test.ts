/* oxlint-disable import/no-nodejs-modules -- 契约测试需读 SFC 源码文本 */
/**
 * 0.4.1 迁移契约：现有三套浮层实现必须真的接上 `useFlyout` 的层级栈
 * （《人工校验闸门》把「迁移是否彻底」列为跨组件基建的专项复核点）。
 *
 * 这里不重复 `use-flyout.test.ts` 的行为测试，只守「接线」这件事：
 * 每个组件都要声明自己的档位、把 `layerStyle` 绑到浮层元素上，并且**明确**关掉
 * 由底座/自研逻辑负责的关闭路径，避免两套监听器互相打架。
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const srcDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const readRaw = (relativePath: string): string =>
  readFileSync(resolve(srcDir, relativePath), 'utf8')

const readSrc = (relativePath: string): string =>
  readRaw(relativePath).replace(/\/\*[\s\S]*?\*\//g, '')

interface Migration {
  file: string
  tier: string
  /** 层级样式必须绑在这个选择器对应的元素上（按源码里的绑定写法断言） */
  binding: string
}

const MIGRATIONS: Migration[] = [
  {
    file: 'combobox/combobox.vue',
    tier: '--zIndexNavFlyout',
    binding: ':style="[popupStyle, flyoutLayerStyle]"',
  },
  {
    file: 'content-dialog/content-dialog.vue',
    tier: '--zIndexModal',
    binding: ':style="dialogLayerStyle"',
  },
]

describe('现有浮层实现 → useFlyout 迁移', () => {
  for (const { file, tier, binding } of MIGRATIONS) {
    it(`${file} 声明档位 ${tier} 并绑定 layerStyle`, () => {
      const source = readSrc(file)
      expect(source).toContain('useFlyout(')
      expect(source).toContain(`tier: '${tier}'`)
      expect(source).toContain(binding)
      // 关闭路径归底座 / 自研逻辑，原语不重复接管
      expect(source).toContain('closeOnEscape: false')
      expect(source).toContain('closeOnOutsidePointer: false')
    })
  }

  it('层级样式必须先解构到顶层 ref —— 模板不自动解包嵌套 ref', () => {
    // 真实事故（2026-10-13）：`:style="flyout.layerStyle"` 拿到的是 ComputedRef 本体，
    // 浏览器里弹层根本没有 inline z-index，只有 CSS 回退值在兜底（单测全绿、肉眼也像对）。
    for (const { file } of MIGRATIONS) {
      expect(readSrc(file), file).not.toContain('flyout.layerStyle')
    }
  })

  it('tooltip 走 Tooltip 档，并由 fixture 绑到提示面', () => {
    const host = readSrc('tooltip/tooltip.vue')
    expect(host).toContain('useFlyout(')
    expect(host).toContain("tier: '--zIndexTooltip'")
    expect(host).toContain('layerStyle: flyout.layerStyle.value')

    const fixture = readSrc('tooltip/tooltip-fixture.vue')
    expect(fixture).toContain(':style="layerStyle"')
  })

  it('三个组件都保留了各自的关闭语义归属说明（复核时能看到理由，而不是被悄悄删掉）', () => {
    for (const file of [
      'combobox/combobox.vue',
      'content-dialog/content-dialog.vue',
      'tooltip/tooltip.vue',
    ]) {
      expect(readRaw(file), file).toContain('0.4.1 迁移步骤')
    }
  })
})
