// 本测试需探测 dist 是否已构建（node:fs），属测试专用合理用途。
/* oxlint-disable import/no-nodejs-modules */
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'

/**
 * 「从 dist 引入并渲染」冒烟（对应 docs/todo.md 目标 3 / 3.2 的验收：
 * 至少一条「从 dist 引入并渲染」的用例，验证发布产物入口可导入、可 SSR 渲染）。
 *
 * 前提：先 `pnpm build`（CI 里 build 在 test 之前跑）。
 * 未构建时该用例自动跳过（本地只跑 pnpm test 时不至于误报失败）。
 *
 * 注意：dist 的 `@fluere-vue/*` / `reka-ui` / `vue` 均为外部依赖，vitest 的 alias
 * 会让 `@fluere-vue/*` 回落到源码；这里验证的是 **ui 构建产物**本身可加载、可渲染，
 * 而非整条声明树（类型正确性由各包 tsc / vue-tsc 覆盖）。
 */
const distIndex = resolve(dirname(fileURLToPath(import.meta.url)), '../../dist/index.js')
const distBuilt = existsSync(distIndex)

describe('dist 构建产物冒烟', () => {
  it.skipIf(!distBuilt)(
    '@fluere-vue/ui 的 dist 入口可导入并按序渲染多组件',
    async () => {
      const mod = await import('../../dist/index.js')
      const { FluereButton, FluereCheckbox, FluereProgressBar } = mod
      expect(typeof FluereButton).toBe('object')
      expect(typeof FluereCheckbox).toBe('object')
      expect(typeof FluereProgressBar).toBe('object')

      const app = createSSRApp({
        render: () =>
          // @ts-expect-error -- 简化冒烟：组件来自动态 dist 产物，Props 类型在运行期才成立。
          h('div', [
            h(FluereButton as unknown as never, { appearance: 'primary' }, () => 'Go'),
            h(FluereCheckbox as unknown as never, { label: 'Sync' }),
            h(FluereProgressBar as unknown as never, { value: 40 }),
          ]),
      })
      const html = await renderToString(app)
      expect(html).toContain('Go')
      expect(html).toContain('Sync')
      expect(html).toMatch(/role="progressbar"|<progress/)
    },
    30_000,
  )

  it.skipIf(!distBuilt)(
    '纯 TS 包 dist 入口可导入（hooks / designs / themes）',
    async () => {
      const hooks = await import('../../../hooks/dist/index.js')
      const designs = await import('../../../designs/dist/index.js')
      const themes = await import('../../../themes/dist/index.js')
      expect(typeof hooks.useDisclosure).toBe('function')
      expect(typeof designs.tokenNames).toBe('object')
      expect(typeof themes.presetFluere).toBe('function')
    },
    30_000,
  )
})
