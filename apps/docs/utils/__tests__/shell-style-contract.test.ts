/* oxlint-disable import/no-nodejs-modules -- 契约测试需遍历 apps/docs 的外壳源码 */
/**
 * 桌面外壳的**源码契约测试**（0.5.5）。
 *
 * 为什么读源码文本而不是挂载组件：jsdom 不解析 `var()`（见 docs/style-spec §7.1），
 * 而本外壳的约束几乎全是「值必须来自令牌 / 刻度」这类**声明式约束** ——
 * 挂载后拿 `getComputedStyle` 只会得到空串。因此这一组断言直接扫描 SFC / CSS 文本，
 * 与 `packages/ui/src/__tests__/z-index-tokens.test.ts` 同一手法。
 *
 * 这些约束为什么值得被测试守住（而不是靠 review）：
 *   ① **裸 z-index**：外壳是 `apps/docs` 里第一个需要跨层摆放的应用级组合，而
 *      `packages/ui` 的 `z-index-tokens.test.ts` **只扫 `packages/ui/src`**，
 *      对 `apps/docs` 零覆盖 —— 没有这支测试，裸 `z-40` 不会被任何闸门拦住
 *      （explorer-layout.md §7 要求「apps/docs 侧的外壳同样只引用 --zIndex*」）。
 *   ② **硬编码色值**：外壳手写了若干布局 CSS（不是全 UnoCSS），一旦有人图快写
 *      `#f3f3f3`，从截图看不出、单测也不会失败。
 *   ③ **必须用令牌才能生效的写法**：`h-[...]` 写在 NavigationView 根上**无效**
 *      （组件根自带 `block-size:100%`，特异性压过工具类）。这条第 3 方实测结论
 *      必须防回归 —— 否则后人「顺手补个高度」会让面板塌掉且测试全绿。
 */
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/** `apps/docs` 根（本测试文件位于 apps/docs/utils/__tests__/） */
const docsRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

/** 外壳组件的绝对路径 */
const shellDir = join(docsRoot, 'components', 'shell')

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

/** 去掉注释（契约断言不应被注释里的示例代码 / 说明文字误伤） */
const stripComments = (text: string): string =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\/[^\n]*/g, '')

/** 读文件并剥注释 */
const read = (file: string): string => stripComments(readFileSync(file, 'utf8'))

/** 读**原始**文件（注释不剥）：用于断言「缺口已留痕」这类注释文本 */
const readRaw = (file: string): string => readFileSync(file, 'utf8')

/** 相对 apps/docs 的短路径，报错时更易读 */
const short = (file: string): string => file.slice(docsRoot.length + 1)

const shellFiles = collectStyleFiles(shellDir)
const shellAndShellCss = [...shellFiles, join(docsRoot, 'assets', 'docs-shell.css')]

describe('桌面外壳：层级只引用刻度', () => {
  it('扫到了外壳文件（防止目录改名后测试空转）', () => {
    expect(shellFiles.length).toBeGreaterThanOrEqual(4)
  })

  it('外壳内所有 z-index 都是 var(--zIndex*) 或基于它的 calc，无裸数字', () => {
    const violations: string[] = []
    for (const file of shellAndShellCss) {
      for (const match of read(file).matchAll(/z-index\s*:\s*(?<value>[^;}\n]+)/g)) {
        const value = (match.groups?.value ?? '').trim()
        /*
         * 允许的形态只有两类：
         *   var(--zIndexShell)                        —— 直接引刻度
         *   calc(var(--zIndexShell) - var(--zIndexStep)) —— 用步进表达的相邻档
         * 其余（含 `z-40` 这类工具类）一律视为违规。
         */
        const ok =
          /^var\(--zIndex[A-Za-z]*\)$/.test(value) ||
          /^calc\(var\(--zIndex[A-Za-z]*\)\s*[-+]\s*var\(--zIndexStep\)\)$/.test(value)
        if (!ok) {
          violations.push(`${short(file)}: z-index: ${value}`)
        }
      }
    }
    expect(violations).toEqual([])
  })

  it('任务栏是外壳里唯一使用 --zIndexShell 的层（其余层用窗口档）', () => {
    const taskbar = read(join(shellDir, 'shell-taskbar.vue'))
    expect(taskbar).toContain('z-index: var(--zIndexShell)')

    const desktop = read(join(shellDir, 'desktop-shell.vue'))
    expect(desktop).toContain('z-index: var(--zIndexWindow)')
    // 桌面根 / 窗口层都不应把层级抬到外壳档
    expect(desktop).not.toContain('z-index: var(--zIndexShell)')
  })
})

describe('桌面外壳：色值与几何只走令牌', () => {
  it('外壳内无 #RRGGBB / rgb() / hsl() 字面量（色值必须走 token）', () => {
    const violations: string[] = []
    for (const file of shellAndShellCss) {
      const text = read(file)
      for (const match of text.matchAll(/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/g)) {
        violations.push(`${short(file)}: ${match[0]}`)
      }
    }
    expect(violations).toEqual([])
  })

  it('壁纸层不用 backdrop-filter / filter（explorer-layout.md §5 禁项）', () => {
    const wallpaper = read(join(shellDir, 'desktop-wallpaper.vue'))
    expect(wallpaper).not.toContain('backdrop-filter')
    expect(wallpaper).not.toContain('filter:')
  })

  it('任务栏高度只经 --shell-taskbar-h（禁止再写裸 48）', () => {
    const taskbar = read(join(shellDir, 'shell-taskbar.vue'))
    expect(taskbar).toContain('block-size: var(--shell-taskbar-h)')
    // 负面断言：不出现 `48px` 这类直接量
    expect(taskbar).not.toMatch(/block-size:\s*48px/)
  })

  it('窗口圆角 / 阴影不由外壳写（归 FluereAppWindow 的 maximized 管）', () => {
    const window = read(join(shellDir, 'explorer-window.vue'))
    // 外壳可以有 `border-radius` 用于局部元素，但不得给窗口框体写阴影 / 圆角档位
    expect(window).not.toContain('--fui-app-window-radius')
    expect(window).not.toContain('--fui-app-window-shadow')
  })
})

describe('桌面外壳：NavigationView 的尺寸写法', () => {
  it('不在 NavigationView 根上用 h-* / block-size（组件根自带 100%，工具类压不过）', () => {
    const window = read(join(shellDir, 'explorer-window.vue'))
    // 找到 NavigationView 那一处 class 声明，确认没有 h-[...] / h-full 之类
    const navTag = window.match(/<FluereNavigationView[\s\S]*?>/)
    expect(navTag, '应能在模板里找到 FluereNavigationView').toBeTruthy()
    const tag = navTag?.[0] ?? ''
    expect(tag).not.toMatch(/\bh-\[/)
    expect(tag).not.toMatch(/\bh-full\b/)
    expect(tag).not.toMatch(/\bblock-size/)
  })

  it('用确定高度的父容器 + flex-1 min-h-0 撑满（实测有效的写法）', () => {
    const window = read(join(shellDir, 'explorer-window.vue'))
    expect(window).toContain('docs-shell-window__body')
    // 父容器给确定高度链
    expect(window).toMatch(/\.docs-shell-window__body\s*\{[\s\S]*?flex:\s*1 1 auto/)
    expect(window).toMatch(/\.docs-shell-window__body\s*\{[\s\S]*?min-block-size:\s*0/)
    // 组件上用工具类吃余量
    expect(window).toMatch(/FluereNavigationView[\s\S]*?flex-1 min-h-0/)
  })
})

describe('桌面外壳：站点 chrome 的两处落点', () => {
  /*
   * 背景（0.5.5 实测）：`FluereAppWindow` 的标题栏右头格是 grid 的 `auto` 轨，
   * 窄视口下会缩到 min-content —— 390px 时只有 43px，四个 chrome 控件换行成 108px 高，
   * 越过 48px 的标题栏压到标签条上。修法是「标题栏一份（桌面档）+ 内容区应用栏一份
   * （移动档）」按断点互斥显示。这两条断言守住「互斥」与「控件清单只有一份」，
   * 防后人只改一处导致两档行为漂移或换行回归。
   */
  it('四个控件的清单只有一份定义（shell-chrome.vue），两处落点各引用一次', () => {
    const window = read(join(shellDir, 'explorer-window.vue'))
    const chrome = read(join(shellDir, 'shell-chrome.vue'))
    const controls = ['DocsVersionTag', 'GithubLink', 'LocaleSwitch', 'ThemeToggle']

    for (const name of controls) {
      expect(chrome).toContain(`<${name}`)
      // 落点自己不得再直接写控件（否则加第五个控件时两边会漂移）
      expect(window).not.toContain(`<${name}`)
    }
    expect((window.match(/<ShellChrome\b/g) ?? []).length).toBe(2)
  })

  it('两处落点按断点互斥：桌面隐藏应用栏，移动隐藏标题栏那一份', () => {
    const window = read(join(shellDir, 'explorer-window.vue'))
    // 桌面档（媒体查询之外）：应用栏 `display: none`
    expect(window).toMatch(/\.docs-shell-window__appbar\s*\{[^}]*display:\s*none/)
    // 移动档内互斥翻转
    const mobile = window.slice(window.indexOf('@media (max-width: 63.999rem)'))
    expect(mobile).toMatch(/\.docs-shell-window__titlebar-chrome\s*\{[^}]*display:\s*none/)
    expect(mobile).toMatch(/\.docs-shell-window__appbar\s*\{[^}]*display:\s*flex/)
  })

  it('chrome 不做 flex-wrap（换行 = 0.5.5 踩过的 108px 溢出）', () => {
    const chrome = read(join(shellDir, 'shell-chrome.vue'))
    expect(chrome).toContain('flex-wrap: nowrap')
  })
})

describe('桌面外壳：已知缺口已留痕', () => {
  it('注明高对比度（HC）未适配（Definition of Done 要求；注释不剥，断言原文）', () => {
    // 这两条断言查的是**注释文本**，因此不能用剥注释的 read()
    expect(readRaw(join(shellDir, 'desktop-shell.vue'))).toContain('高对比度（HC）未适配')
    expect(readRaw(join(shellDir, 'shell-taskbar.vue'))).toContain('高对比度（HC）未适配')
  })
})

describe('桌面外壳：SSR 与水合安全', () => {
  it('不带视口依赖的模板分支（不用 v-if 切桌面 / 移动端）', () => {
    const desktop = read(join(shellDir, 'desktop-shell.vue'))
    // 桌面 / 移动端差异必须由 CSS 断点驱动；模板里不该出现 isDesktop 的条件渲染
    expect(desktop).not.toMatch(/v-if="isDesktop/)
    expect(desktop).not.toMatch(/v-if="!isDesktop/)
    // 任务栏用 CSS 隐藏（移动档 @media），不是模板 v-if
    expect(desktop).toMatch(/@media \(max-width: 63\.999rem\)/)
  })

  it('setup() 期不直接访问 window / document / matchMedia（能力探测交给 hooks）', () => {
    const desktop = read(join(shellDir, 'desktop-shell.vue'))
    /*
     * 允许 `globalThis.addEventListener`（在 onMounted / onScopeDispose 内），
     * 但不允许裸 `window.xxx` / `document.xxx` 出现在模块顶层路径上。
     *
     * 前缀排除 `[.\w-]`：`explorer-window.vue` 这类**文件路径字面量**里也含
     * `-window.v`，不排除会误报（本断言一度因此失败）。
     */
    expect(desktop).not.toMatch(/(?:^|[^\w.-])window\.[a-zA-Z]/)
    expect(desktop).not.toMatch(/(?:^|[^\w.-])document\.[a-zA-Z]/)
  })

  it('组件 ref 一律经 $el 取元素（模板 ref 落在组件上拿到的是实例）', () => {
    const desktop = read(join(shellDir, 'desktop-shell.vue'))
    // 防回归：曾经把 taskbarRef 声明成 HTMLElement 并直接调 getBoundingClientRect，
    // SSR 正常但浏览器水合即抛 TypeError（整页错误页）。
    expect(desktop).toContain('elementOf')
    expect(desktop).not.toMatch(/taskbarRef\.value\.getBoundingClientRect/)
    expect(desktop).not.toMatch(/windowRef\.value\.getBoundingClientRect/)
  })
})

describe('桌面外壳：仿真边界文案可见', () => {
  /*
   * 落点口径（0.5.6 迁移后）：仿真整体在 `/os`，主页回到常规营销页。
   * 《WindowsOS 仿真边界》**跟随仿真本身** —— 它说明的是这个桌面仿真到什么程度，
   * 因此只在 `/os` 的窗口「首页」视图里渲染（`home-content.vue` 的 `variant="desktop"`），
   * 不再出现在站点主页上。docs/todo.md《发布检查》只要求「在文档站可见」，落点由
   * docs/design/explorer-layout.md §0 与 apps/docs/README.md 记录。
   */
  it('/os 的窗口「首页」视图渲染《WindowsOS 仿真边界》（docs/todo.md 发布检查项）', () => {
    const homeContent = read(join(docsRoot, 'components', 'home', 'home-content.vue'))
    expect(homeContent).toContain("t('shell.boundary.title')")
    expect(homeContent).toContain("t('shell.boundary.scope')")
    expect(homeContent).toContain("t('shell.boundary.excluded')")
  })

  it('边界三段只在 `variant="desktop"` 渲染，主页那份不带它', () => {
    const homeContent = read(join(docsRoot, 'components', 'home', 'home-content.vue'))
    // 条件必须挂在 v-if="variant === 'desktop'" 上（而不是无条件渲染）
    expect(homeContent).toMatch(/v-if="variant === 'desktop'"[\s\S]*?shell\.boundary\.title/)
    // 主页（pages/index.vue）不传 variant ⇒ 走缺省 'page'，因此不渲染边界段
    const index = read(join(docsRoot, 'pages', 'index.vue'))
    expect(index).not.toContain('variant="desktop"')
  })

  it('/os 用桌面外壳 + 与主页共用的营销内容（variant="desktop"）', () => {
    const osPage = read(join(docsRoot, 'pages', 'os', 'index.vue'))
    expect(osPage).toContain("layout: 'os'")
    expect(osPage).toContain('<DesktopShell')
    // 视图内容由窗口层渲染（0.5.6 起不再走页面插槽）
    expect(osPage).not.toContain('template #home')

    const window = read(join(shellDir, 'explorer-window.vue'))
    expect(window).toContain('<HomeContent')
    expect(window).toContain('variant="desktop"')
  })

  it('主页与 /os 复用同一份营销内容组件（两处渲染同一份，防漂移）', () => {
    const index = read(join(docsRoot, 'pages', 'index.vue'))
    expect(index).toContain('<HomeContent')
    expect(index).toContain("layout: 'home'")
  })

  it('页面层不消费 --docs-header-h（站点 header 的高度归布局）', () => {
    /*
     * 迁移前这条断言是「首页无悬浮 header，因此不得消费 --docs-header-h」。
     * 现在主页**有** header（layouts/home.vue 的 sticky header 读该变量），
     * 但页面自己仍然不该写它 —— 高度归布局。`/os` 则整页不消费它
     * （桌面外壳的 chrome 在窗口标题栏 / 应用栏上，见 assets/docs-shell.css 的注释）。
     */
    const index = read(join(docsRoot, 'pages', 'index.vue'))
    expect(index).not.toContain('--docs-header-h')

    const osPage = read(join(docsRoot, 'pages', 'os', 'index.vue'))
    expect(osPage).not.toContain('--docs-header-h')
  })
})
