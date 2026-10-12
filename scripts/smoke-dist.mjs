#!/usr/bin/env node
/**
 * 发布产物（dist）消费方冒烟。
 *
 * 为什么需要：仓库内六个包的 `main` / `module` / `types` / `exports` 一律指向**源码**
 * （开发链路零构建依赖，发布才由 `publishConfig` 覆盖回 `dist`，见
 * docs/adr/0001-library-build-tooling.md §4.1）。于是 `pnpm dev` / `pnpm test` /
 * `pnpm docs:generate` 全程走源码，**dist 产物没有任何环节去解析**——一旦构建产出
 * 与 `publishConfig` 声明不一致（入口写错、子路径漏了、`style.css` 没产出），
 * 只在真发布后才暴露。本脚本把缺口补上：按发布形态 `pnpm pack` 出 tarball，
 * 装进一个临时 fixture 工程，以**消费方身份**解析并 SSR 渲染，再校验入口声明。
 *
 * 流程：pack 六个包 → publint / attw 校验 tarball 入口声明 → fixture 安装 →
 *      `node smoke.mjs`（按包名 / 子路径导入 + SSR 渲染）。
 *
 * 前提：**先 `pnpm build`**（本脚本不构建；CI 的 package-smoke job 会先跑）。
 * 产物与 fixture 落在 `temp/smoke-dist/`（已 gitignore），便于本地复现排查。
 *
 * 用法：`pnpm build && pnpm smoke:dist`（CI 见 .onedev-buildspec.yml 的 package-smoke job）。
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
/** 参与冒烟的六个可发布包（与 packages/ 目录同名，scope 固定 @fluere-vue）。 */
const PACKAGES = ['designs', 'hooks', 'icons', 'themes', 'ui', 'utils']
const SCOPE = '@fluere-vue/'

const WORK = join(ROOT, 'temp', 'smoke-dist')
const TARBALLS = join(WORK, 'tarballs')
const FIXTURE = join(WORK, 'fixture')

const rootPkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
const VERSION = rootPkg.version
const PACKAGE_MANAGER = rootPkg.packageManager

const log = (msg) => console.log(`[smoke:dist] ${msg}`)
const section = (msg) => console.log(`\n[smoke:dist] ==== ${msg} ====`)

/** 依次执行命令，实时透传输出；失败即抛出（CI step 随之失败）。 */
function run(cmd, args, cwd) {
  execFileSync(cmd, args, { cwd, stdio: 'inherit' })
}

/** tarball 路径：`@fluere-vue/ui` -> `fluere-vue-ui-<version>.tgz`（pnpm pack 命名规则）。 */
const tarballPath = (pkg) => join(TARBALLS, `fluere-vue-${pkg}-${VERSION}.tgz`)

function pack() {
  section(`pack 六个包（version=${VERSION}）`)
  rmSync(WORK, { recursive: true, force: true })
  mkdirSync(TARBALLS, { recursive: true })
  for (const pkg of PACKAGES) {
    execFileSync('pnpm', ['--filter', `${SCOPE}${pkg}`, 'pack', '--pack-destination', TARBALLS], {
      cwd: ROOT,
      stdio: 'pipe',
    })
    if (!existsSync(tarballPath(pkg))) {
      throw new Error(`pnpm pack 未产出 ${tarballPath(pkg)}`)
    }
    log(`packed ${SCOPE}${pkg} -> ${tarballPath(pkg)}`)
  }
}

/**
 * 用 publint / attw 校验 tarball 的入口声明。
 * attw 收敛到「纯 ESM 发布」这一档（ADR-0001 §2 的既定取舍）：`--profile esm-only`
 * 忽略 node10 / node16-cjs 的 `CJSResolvesToESM`，`--entrypoints .` 只看主入口
 * （CSS 子路径本就不在 attw 的 JS/类型解析范围），`--ignore-rules internal-resolution-error`
 * 跳过「.d.ts 内无扩展名相对导入」这条**已知可接受**的技术债（见 ADR「已知限制」）。
 * 剩下 node16(ESM) 与 bundler 两个 🟢 作为真实信号——这与 release.md 的口径一致。
 */
function lintTarballs() {
  section('publint + attw 校验 tarball 入口声明')
  for (const pkg of PACKAGES) {
    const tgz = tarballPath(pkg)
    log(`publint ${SCOPE}${pkg}`)
    run('pnpm', ['exec', 'publint', tgz], ROOT)
    log(`attw ${SCOPE}${pkg}`)
    run(
      'pnpm',
      [
        'exec',
        'attw',
        tgz,
        '--profile',
        'esm-only',
        '--entrypoints',
        '.',
        '--ignore-rules',
        'internal-resolution-error',
      ],
      ROOT,
    )
  }
}

/**
 * 写 fixture 工程：把 tarball 当作真实依赖装上。
 * - `overrides`（pnpm 11 起位于 pnpm-workspace.yaml）强制 ui/themes 对
 *   `@fluere-vue/*` 的传递依赖也指向本地 tarball，否则 pnpm 会去 npm registry 找
 *   尚未发布的 `@fluere-vue/*@<version>` 而 404。
 * - `strictDepBuilds: false` + `ignoredBuiltDependencies`：reka-ui 的传递依赖
 *   vue-demi 带构建脚本，fixture 里不需要执行，避免 pnpm 以非零码退出。
 * - 显式依赖 `vue`：它是 ui 的 peer，pnpm 隔离布局不会把它提到 fixture 顶层，
 *   而 `smoke.mjs` 自己 `import 'vue'` 需要顶层可见。
 */
function writeFixture() {
  section('生成 fixture 工程')
  mkdirSync(FIXTURE, { recursive: true })

  const dependencies = { vue: '^3.5.0' }
  const overrides = {}
  for (const pkg of PACKAGES) {
    const spec = `file:${tarballPath(pkg)}`
    dependencies[`${SCOPE}${pkg}`] = spec
    overrides[`${SCOPE}${pkg}`] = spec
  }

  writeFileSync(
    join(FIXTURE, 'package.json'),
    `${JSON.stringify(
      {
        name: 'fluere-dist-smoke-fixture',
        private: true,
        type: 'module',
        packageManager: PACKAGE_MANAGER,
        dependencies,
      },
      null,
      2,
    )}\n`,
  )

  const overridesYaml = Object.entries(overrides)
    .map(([name, spec]) => `  '${name}': '${spec}'`)
    .join('\n')
  writeFileSync(
    join(FIXTURE, 'pnpm-workspace.yaml'),
    `strictDepBuilds: false\nignoredBuiltDependencies:\n  - vue-demi\noverrides:\n${overridesYaml}\n`,
  )

  writeFileSync(join(FIXTURE, 'smoke.mjs'), consumerSmoke())
}

function installAndRender() {
  section('安装 tarball 并以消费方身份 SSR 渲染')
  // 复用 CI 的 pnpm store（root 跑过 `pnpm install --store-dir .pnpm-store`）避免重复下载。
  const storeDir = join(ROOT, '.pnpm-store')
  const installArgs = ['install', '--no-frozen-lockfile']
  if (existsSync(storeDir)) {
    installArgs.push('--store-dir', storeDir)
  }
  run('pnpm', installArgs, FIXTURE)
  run(process.execPath, ['smoke.mjs'], FIXTURE)
}

/**
 * 写进 fixture 的消费方冒烟脚本：只通过**包名 / 子路径**导入（走 tarball 里
 * publishConfig 覆盖后的 dist 入口），断言入口导出齐全、子路径可解析、UI 可 SSR 渲染。
 */
function consumerSmoke() {
  return `import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import * as ui from '@fluere-vue/ui'
import * as designs from '@fluere-vue/designs'
import * as hooks from '@fluere-vue/hooks'
import * as themes from '@fluere-vue/themes'
import * as utils from '@fluere-vue/utils'
import { presetFluere } from '@fluere-vue/designs/preset-fluent'
import { tokenNames } from '@fluere-vue/designs/token-names'
import iconsData from '@fluere-vue/icons/data' with { type: 'json' }
import zhHans from '@fluere-vue/ui/locales/zh-Hans'

// 各包主入口（dist）可导入且导出齐全
assert.equal(typeof ui.FluereButton, 'object', 'ui dist 入口导出 FluereButton')
assert.equal(typeof hooks.useDisclosure, 'function', 'hooks dist 入口导出 useDisclosure')
assert.equal(typeof designs.tokenNames, 'object', 'designs dist 入口导出 tokenNames')
assert.equal(typeof themes.presetFluere, 'function', 'themes dist 入口导出 presetFluere')
assert.ok(utils, 'utils dist 入口可导入')

// publishConfig 子路径映射逐条可解析
assert.equal(typeof presetFluere, 'function', 'designs 子路径 preset-fluent 可解析')
assert.ok(tokenNames && Object.keys(tokenNames).length > 0, 'designs 子路径 token-names 可解析')
assert.ok(iconsData && iconsData.totalNames > 0, 'icons 子路径 /data 可解析')
assert.ok(zhHans && typeof zhHans === 'object', 'ui 子路径 /locales/zh-Hans 可解析')

// 只存在于构建产物的 CSS 子路径必须解析到非空文件
for (const spec of ['@fluere-vue/ui/style.css', '@fluere-vue/designs/tokens.css']) {
  const css = readFileSync(new URL(import.meta.resolve(spec)), 'utf8')
  assert.ok(css.length > 0, \`\${spec} 非空\`)
}

// 真实 SSR 渲染：把 ui 的 dist 产物挂起来
const app = createSSRApp({
  render: () =>
    h('div', [
      h(ui.FluereButton, { appearance: 'primary' }, () => 'Go'),
      h(ui.FluereCheckbox, { label: 'Sync' }),
      h(ui.FluereProgressBar, { value: 40 }),
    ]),
})
const html = await renderToString(app)
assert.match(html, /Go/)
assert.match(html, /Sync/)
assert.match(html, /role="progressbar"|<progress/)
console.log('[smoke] dist consumer render OK')
`
}

pack()
lintTarballs()
writeFixture()
installAndRender()
section('完成：dist 产物可被消费方解析并渲染')
