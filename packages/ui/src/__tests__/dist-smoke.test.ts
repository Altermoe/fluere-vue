// 本测试需探测 dist 是否已构建（node:fs），属测试专用合理用途。
/* oxlint-disable import/no-nodejs-modules */
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'

/**
 * 「从 dist 引入并渲染」冒烟（对应 docs/todo.md 目标 3 / 3.2 的验收：
 * 至少一条「从 dist 引入并渲染」的用例，验证发布产物入口可导入、可 SSR 渲染）。
 *
 * 前提：先 `pnpm build`。
 * - 本地直接 `pnpm test`（未构建）时该用例自动跳过，不至于误报失败；
 * - CI 的 package-smoke job 先 `pnpm build` 再以 `REQUIRE_DIST=1` 运行本文件——此时
 *   dist 必须存在，缺失即**硬失败**（发布产物缺失必须拦住流水线，而不是静默跳过）。
 *
 * 注意：dist 的 `@fluere-vue/*` / `reka-ui` / `vue` 均为外部依赖，vitest 的 alias
 * 会让 `@fluere-vue/*` 回落到源码；这里验证的是 **ui 构建产物**本身可加载、可渲染，
 * 而非整条声明树（类型正确性由各包 tsc / vue-tsc 覆盖）。
 *
 * 为什么走 `pathToFileURL` + `@vite-ignore` 而不写 `import('../../dist/index.js')`：
 * 后者是**字面量**说明符，Vite 在收集阶段就会静态解析，dist 未构建时直接抛
 * 「Failed to resolve import」，`skipIf` 根本没机会生效——与上面「未构建时自动跳过」
 * 的契约相矛盾（全新检出 / 未先 build 时 pnpm test 必挂）。改成运行时才求值的文件
 * URL 后，跳过与执行都能按预期发生。
 */
const testDir = dirname(fileURLToPath(import.meta.url))

/** 按绝对路径动态导入构建产物：绕过 Vite 的静态解析，保留「未构建则跳过」语义 */
const importDist = (relativePath: string): Promise<Record<string, unknown>> =>
  // oxlint-disable-next-line no-unsafe-type-assertion -- dist 产物无静态类型，冒烟只做运行时校验
  import(/* @vite-ignore */ pathToFileURL(resolve(testDir, relativePath)).href) as Promise<
    Record<string, unknown>
  >

const uiDistBuilt = existsSync(resolve(testDir, '../../dist/index.js'))
const tsDistsBuilt = [
  '../../../hooks/dist/index.js',
  '../../../designs/dist/index.js',
  '../../../themes/dist/index.js',
].every((relativePath) => existsSync(resolve(testDir, relativePath)))

/**
 * CI 的 package-smoke job 先 `pnpm build` 再以该变量运行本文件：dist 缺失必须硬失败，
 * 而不是被 `skipIf` 悄悄放过——否则「CI 全绿但 dist 从未被验证」的缺口会一直存在。
 * 本地不设该变量，保留「未构建则跳过」的便利。
 */
const requireDist = process.env.REQUIRE_DIST === '1'

describe('dist 构建产物冒烟', () => {
  it.skipIf(!uiDistBuilt && !requireDist)(
    '@fluere-vue/ui 的 dist 入口可导入并按序渲染多组件',
    async () => {
      expect(uiDistBuilt, 'REQUIRE_DIST=1 但未找到 ui 的 dist/index.js（先 pnpm build）').toBe(true)
      const mod = await importDist('../../dist/index.js')
      const {
        FluereButton,
        FluereCheckbox,
        FluereNavigationView,
        FluereNavigationViewItem,
        FluereProgressBar,
        FluereTabView,
        FluereTabViewItem,
      } = mod
      expect(typeof FluereButton).toBe('object')
      expect(typeof FluereCheckbox).toBe('object')
      expect(typeof FluereProgressBar).toBe('object')
      expect(typeof FluereTabView).toBe('object')
      expect(typeof FluereTabViewItem).toBe('object')
      expect(typeof FluereNavigationView).toBe('object')
      expect(typeof FluereNavigationViewItem).toBe('object')

      const app = createSSRApp({
        render: () =>
          // 简化冒烟：组件来自动态 dist 产物（`unknown`），用 `as never` 绕过 Props 静态校验；
          // 运行期正确性由下面的 SSR 渲染断言覆盖。
          h('div', [
            h(FluereButton as unknown as never, { appearance: 'primary' }, () => 'Go'),
            h(FluereCheckbox as unknown as never, { label: 'Sync' }),
            h(FluereProgressBar as unknown as never, { value: 40 }),
            h(
              FluereTabView as unknown as never,
              { label: 'Tabs' },
              {
                default: () => [
                  h(FluereTabViewItem as unknown as never, { header: 'One' }, () => 'panel-one'),
                ],
              },
            ),
            h(
              FluereNavigationView as unknown as never,
              { label: 'Nav' },
              {
                default: () => [
                  h(FluereNavigationViewItem as unknown as never, {
                    value: 'home',
                    content: 'Home',
                  }),
                ],
              },
            ),
          ]),
      })
      const html = await renderToString(app)
      expect(html).toContain('Go')
      expect(html).toContain('Sync')
      expect(html).toMatch(/role="progressbar"|<progress/)
      expect(html).toContain('role="tablist"')
      expect(html).toContain('panel-one')
      expect(html).toContain('fui-navigation-view__nav')
      expect(html).toContain('data-value="home"')
    },
    30_000,
  )

  it.skipIf(!tsDistsBuilt && !requireDist)(
    '纯 TS 包 dist 入口可导入（hooks / designs / themes）',
    async () => {
      expect(
        tsDistsBuilt,
        'REQUIRE_DIST=1 但未找到 hooks/designs/themes 的 dist（先 pnpm build）',
      ).toBe(true)
      const hooks = await importDist('../../../hooks/dist/index.js')
      const designs = await importDist('../../../designs/dist/index.js')
      const themes = await importDist('../../../themes/dist/index.js')
      expect(typeof hooks.useDisclosure).toBe('function')
      expect(typeof designs.tokenNames).toBe('object')
      expect(typeof themes.presetFluere).toBe('function')
    },
    30_000,
  )
})
