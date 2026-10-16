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

  it('0.5.7：开始菜单与托盘弹层引用各自档位（StartMenu 1600 / Menu 1100），不写裸值', () => {
    const startMenu = read(join(shellDir, 'shell-start-menu.vue'))
    expect(startMenu).toContain('z-index: var(--zIndexStartMenu)')

    const taskbar = read(join(shellDir, 'shell-taskbar.vue'))
    expect(taskbar).toContain('z-index: var(--zIndexMenu)')
    // 弹出菜单不得借裸 z-index「自己抬一层」——上面的全目录扫描也会兜底，这里给明确报错信息
    expect(taskbar).not.toMatch(/z-index:\s*\d/)
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

describe('桌面外壳：站点 chrome 的落点（0.5.7 托盘化）', () => {
  /*
   * 背景（0.5.5 实测，历史）：`FluereAppWindow` 的标题栏右头格是 grid 的 `auto` 轨，
   * 窄视口下会缩到 min-content —— 390px 时只有 43px，四个 chrome 控件换行成 108px 高，
   * 越过 48px 的标题栏压到标签条上。0.5.5–0.5.6 因此拆「标题栏 + 应用栏」两处互斥落点。
   *
   * 0.5.7 收口：站点 chrome 整体迁入**任务栏系统托盘**，并按语义拆清单 ——
   * 版本 / 语言 / 主题（系统状控件）留在 ShellChrome，GitHub（入口类）归任务栏
   * 中间固定入口。这批断言守住「清单只有一份」「窗口里一份都不落」「GitHub 不重复」。
   */
  it('ShellChrome 清单只有三个系统状控件（版本 / 语言 / 主题，无 GitHub）', () => {
    const chrome = read(join(shellDir, 'shell-chrome.vue'))
    for (const name of ['DocsVersionTag', 'LocaleSwitch', 'ThemeToggle']) {
      expect(chrome).toContain(`<${name}`)
    }
    expect(chrome).not.toContain('<GithubLink')
  })

  it('窗口（标题栏 / 内容区）不再落任何站点 chrome', () => {
    const window = read(join(shellDir, 'explorer-window.vue'))
    expect(window).not.toContain('<ShellChrome')
    expect(window).not.toContain('<DocsVersionTag')
    expect(window).not.toContain('<LocaleSwitch')
    expect(window).not.toContain('<ThemeToggle')
    // `#right-header` 也不该再被占位（占位会按 UpdateHeight 把标题栏钉在 48）
    expect(window).not.toContain('<template #right-header>')
  })

  it('托盘里 ShellChrome 落两处（内联 + 弹出菜单），构成一份清单的两个互斥消费方', () => {
    const taskbar = read(join(shellDir, 'shell-taskbar.vue'))
    expect((taskbar.match(/<ShellChrome\b/g) ?? []).length).toBe(2)
    expect(taskbar).not.toContain('<GithubLink')
    // GitHub 归中间固定入口（入口类控件），仓库地址引用单一事实源
    expect(taskbar).toContain('REPOSITORY_URL')
    expect(taskbar).toContain('<GithubMark')
  })

  it('主页 header 同时消费 GithubLink 与 ShellChrome（GitHub 拆出清单后不丢入口）', () => {
    const home = read(join(docsRoot, 'layouts', 'home.vue'))
    expect(home).toContain('<GithubLink')
    expect(home).toContain('<ShellChrome')
    // 仓库地址只允许从 utils/docs-repo 引用，不许再写字面量
    expect(home).not.toContain('https://github.com/Altermoe/fluere-vue')
  })

  it('托盘两处落点按断点互斥：桌面隐藏展开按钮，窄档隐藏内联组（都渲染、只切 display）', () => {
    const taskbar = read(join(shellDir, 'shell-taskbar.vue'))
    // 默认（桌面档）：内联可见、展开按钮隐藏
    expect(taskbar).toMatch(/\.docs-shell-taskbar__tray-expand\s*\{[^}]*display:\s*none/)
    // 移动档内互斥翻转；且该媒体查询只切这两个控件，不得隐藏时钟
    const mobile = taskbar.slice(taskbar.indexOf('@media (max-width: 63.999rem)'))
    expect(mobile).toMatch(/\.docs-shell-taskbar__tray-inline\s*\{[^}]*display:\s*none/)
    expect(mobile).toMatch(/\.docs-shell-taskbar__tray-expand\s*\{[^}]*display:\s*flex/)
    expect(mobile).not.toContain('docs-shell-taskbar__clock')
  })

  it('chrome 不做 flex-wrap（换行 = 0.5.5 踩过的 108px 溢出）', () => {
    const chrome = read(join(shellDir, 'shell-chrome.vue'))
    expect(chrome).toContain('flex-wrap: nowrap')
  })
})

describe('0.5.7 任务栏 / 开始菜单 / 托盘：移动端适配与交互', () => {
  const taskbar = read(join(shellDir, 'shell-taskbar.vue'))
  const startMenu = read(join(shellDir, 'shell-start-menu.vue'))

  it('任务栏三段式：开始(auto) · 图标区(minmax(0,1fr)) · 托盘(auto) —— 窄档先压中间', () => {
    expect(taskbar).toContain('grid-template-columns: auto minmax(0, 1fr) auto')
    // 开始按钮与托盘所在段都 flex: none（不参与收缩），只有图标区可被压走
    expect(taskbar).toMatch(/\.docs-shell-taskbar__zone--start\s*\{[^}]*flex:\s*none/)
    expect(taskbar).toMatch(/\.docs-shell-taskbar__zone--tray\s*\{[^}]*flex:\s*none/)
  })

  it('图标区不出现原生滚动条（两套隐藏都写：标准属性 + webkit 伪元素）', () => {
    expect(taskbar).toMatch(/\.docs-shell-taskbar__viewport\s*\{[^}]*overflow-x:\s*auto/)
    expect(taskbar).toMatch(/\.docs-shell-taskbar__viewport\s*\{[^}]*scrollbar-width:\s*none/)
    expect(taskbar).toMatch(
      /\.docs-shell-taskbar__viewport::-webkit-scrollbar\s*\{[^}]*display:\s*none/,
    )
    // 纵向也禁（48px 定高里任何滚动条都会挤压图标区）
    expect(taskbar).toMatch(/\.docs-shell-taskbar__viewport\s*\{[^}]*overflow-y:\s*hidden/)
  })

  it('两个滚动箭头常驻 DOM、由实测 is-scrollable 控制显隐（display 切换，仍不死锁）', () => {
    expect(taskbar).toContain("t('shell.taskbarScrollPrev')")
    expect(taskbar).toContain("t('shell.taskbarScrollNext')")
    expect(taskbar).toContain('FluentIconChevronLeft24Regular')
    expect(taskbar).toContain('FluentIconChevronRight24Regular')
    /*
     * 0.5.7 由 `visibility: hidden`（永久占位）改成 `display: none`：占位会让开始按钮
     * 与第一个应用热区之间凭空多出 32px，与参考图的「紧贴」冲突。死锁风险由
     * 「箭头出现只让视口更窄 ⇒ 溢出单调」+ 翻转后 `nextTick` 补量一次化解，
     * 因此这里同时断言这两个前提都在源码里（改回去会立刻红）。
     */
    expect(taskbar).toMatch(/\.docs-shell-taskbar__scroll\s*\{[^}]*display:\s*none/)
    expect(taskbar).not.toMatch(/\.docs-shell-taskbar__scroll\s*\{[^}]*visibility:\s*hidden/)
    expect(taskbar).toContain('.is-scrollable .docs-shell-taskbar__scroll')
    expect(taskbar).toContain('scrollBy')
    // 翻转后补量一次（单调收敛，不需要 ResizeObserver 循环）
    expect(taskbar).toContain('wasScrollable')
    expect(taskbar).toContain('nextTick')
  })

  it('时钟经 utils/shell-clock 的 Intl 格式化（随 locale），挂载前为空（水合口径）', () => {
    expect(taskbar).toContain('formatTrayClock')
    expect(taskbar).toContain('ref<Date | null>(null)')
    expect(taskbar).toContain(':datetime="clockDateTime"')
    // 时间行与日期行都在 --shell-tray-clock-w 预留宽度内（挂载后不平移图标区）
    expect(taskbar).toContain('var(--shell-tray-clock-w)')
  })

  it('开始菜单：useFocusTrap 下沉消费 + role=menu + 方向键 / Home / End', () => {
    expect(startMenu).toContain("from '@fluere-vue/hooks'")
    expect(startMenu).toContain('useFocusTrap(')
    expect(startMenu).toContain('onEscape:')
    expect(startMenu).toContain('onOutsidePointer:')
    expect(startMenu).toContain('aria-haspopup="menu"')
    expect(startMenu).toContain('role="menu"')
    expect(startMenu).toContain('role="menuitem"')
    for (const key of ['ArrowDown', 'ArrowUp', 'Home', 'End']) {
      expect(startMenu).toContain(`'${key}'`)
    }
  })

  it('托盘弹出菜单同样走 useFocusTrap（Esc / 外部点击 / 焦点归还）', () => {
    expect(taskbar).toContain('useFocusTrap(')
    expect(taskbar).toContain('onEscape:')
    expect(taskbar).toContain('onOutsidePointer:')
    expect(taskbar).toContain(':aria-expanded="trayOpen"')
  })

  it('移动端窗口为常驻任务栏让出高度（0.5.7 任务栏不再被隐藏）', () => {
    const window = read(join(shellDir, 'explorer-window.vue'))
    expect(window).toContain('calc(100% - var(--shell-taskbar-h))')
  })

  it('不做搜索坏按钮（站内搜索属 0.6 的 Ctrl+K，任务栏 / 开始菜单无假入口）', () => {
    expect(taskbar).not.toContain('FluentIconSearch')
    expect(startMenu).not.toContain('FluentIconSearch')
  })

  it('开始菜单条目只来自 SHELL_VIEWS 数据源 + GitHub 单一地址，不引用不存在的页面', () => {
    expect(startMenu).toContain('SHELL_VIEWS')
    expect(startMenu).toContain('REPOSITORY_URL')
    // 设计令牌页 / 路线图页尚不存在（docs/todo.md 2.4）—— 禁止出现指向它们的占位死链
    expect(startMenu).not.toMatch(/['"]\/(?:en\/)?(?:tokens|roadmap|changelog)/)
  })
})

describe('0.5.7 任务栏图标按钮：几何、状态与提示（2026-10-16 参考图还原）', () => {
  const taskbar = read(join(shellDir, 'shell-taskbar.vue'))
  const startMenu = read(join(shellDir, 'shell-start-menu.vue'))
  const shellCss = read(join(docsRoot, 'assets', 'docs-shell.css'))

  it('命中区 40×40 + 图标 24px + 热区间距 4px（参考图实测值，见 explorer-layout.md §4）', () => {
    // 开始按钮与入口按钮都用 large（40 高）+ icon-only（aspect-ratio: 1 ⇒ 40 宽）
    expect(startMenu).toMatch(/size="large"/)
    expect(taskbar).toMatch(/size="large"/)
    // 图标 24px（0.5.7 前是 20）
    expect(taskbar).toContain(':size="24"')
    expect(startMenu).toMatch(/\.docs-start-menu__logo\s*\{[^}]*block-size:\s*24px/)
    // 热区间距 4px：根 grid 的 column-gap + 图标区 / 视口的 gap
    expect(taskbar).toMatch(/column-gap:\s*var\(--spacingHorizontalXS\)/)
    expect(taskbar).toMatch(
      /\.docs-shell-taskbar__viewport\s*\{[^}]*gap:\s*var\(--spacingHorizontalXS\)/,
    )
    // 任务栏两端内边距 12px（参考图首个热区距屏幕左缘 12px）
    expect(taskbar).toMatch(/padding-inline:\s*var\(--spacingHorizontalM\)/)
    // 应用区左对齐（紧贴开始按钮）
    expect(taskbar).toMatch(
      /\.docs-shell-taskbar__zone--icons\s*\{[^}]*justify-content:\s*flex-start/,
    )
  })

  it('hover / pressed 状态色与描边走 WinUI 控件阶梯，且只写一份（docs-shell.css）', () => {
    // 状态色不改库组件、也不打特异性官司：覆写库读取的自定义属性
    expect(shellCss).toContain('--colorSubtleBackgroundHover: var(--controlFillColorSecondary)')
    expect(shellCss).toContain('--colorSubtleBackgroundPressed: var(--controlFillColorTertiary)')
    // 1px 描边用 outline + 负偏移（焦点环用 box-shadow、border-color 被库规则压过）
    expect(shellCss).toMatch(/\.docs-shell-taskbar-icon:hover:not\(:focus-visible\)/)
    expect(shellCss).toContain('outline-offset: calc(-1 * var(--strokeWidthThin))')
    // 两个消费方都挂同一个类名（开始按钮在 start-menu，其余在 taskbar）
    expect(startMenu).toContain('docs-shell-taskbar-icon')
    expect((taskbar.match(/docs-shell-taskbar-icon/g) ?? []).length).toBeGreaterThanOrEqual(5)
  })

  it('开始徽标用官方几何 + 强调色渐变，按下态转单色并缩到 0.75', () => {
    // 官方 Windows 徽标几何（方块 11 / 缝 1 / 总 23，整像素对齐；比例出处见组件注释）
    expect(startMenu).toContain('M0 0h11v11H0zm12 0h11v11H12zM0 12h11v11H0zm12 0h11v11H12z')
    // 渐变两色来自仓库令牌（不是硬编码）：浅端强调色 Light2、深端强调色本体
    expect(startMenu).toContain('stop-color: var(--windowsAccentLight2)')
    expect(startMenu).toContain('stop-color: var(--windowsAccentPrimary)')
    // 渐变方向 = 实测的 dy/dx = 1.5（45° 会让右上 / 左下同色，与参考图不符）
    expect(startMenu).toMatch(/x2="14"[\s\S]{0,40}y2="21"/)
    // 按下态：单色 + 0.75 缩放（参考图三）
    expect(startMenu).toMatch(
      /\.docs-start-menu__trigger:active \.docs-start-menu__logo-pane\s*\{[^}]*fill:\s*var\(--windowsAccentPrimary\)/,
    )
    expect(startMenu).toMatch(
      /\.docs-start-menu__trigger:active \.docs-start-menu__logo\s*\{[^}]*transform:\s*scale\(0\.75\)/,
    )
  })

  it('外壳内不再使用原生 title，提示一律 FluereTooltip', () => {
    /*
     * 「原生 title」指 DOM 属性。`explorer-window.vue` 里的 `:title` 是
     * `FluereAppWindow` 的 **Prop**（组件契约，绘制标题栏文字），不是 DOM 属性，
     * 因此这里按文件区分：图标按钮所在的两个文件禁止出现任何 title（属性或绑定），
     * 窗口层只允许那一处组件 Prop。
     */
    for (const name of [
      'shell-taskbar.vue',
      'shell-start-menu.vue',
      'shell-chrome.vue',
      'desktop-shell.vue',
      'desktop-wallpaper.vue',
    ]) {
      const text = read(join(shellDir, name))
      expect(text, name).not.toMatch(/:title=/)
      expect(text, name).not.toMatch(/\stitle="/)
    }
    const window = read(join(shellDir, 'explorer-window.vue'))
    expect(window).not.toMatch(/\stitle="/)
    expect((window.match(/:title=/g) ?? []).length).toBe(1)
    expect(window).toContain(':title="t(\'shell.windowTitle\')"')

    // 任务栏的每个图标按钮 / 链接都在 Tooltip 里（窗口入口、固定入口、GitHub、两个箭头、托盘展开）
    expect((taskbar.match(/<FluereTooltip/g) ?? []).length).toBeGreaterThanOrEqual(6)
    expect(startMenu).toContain('<FluereTooltip')
    // 开始菜单打开时禁用按钮提示（面板就在按钮上方，且实机也不弹）
    expect(startMenu).toContain(':disabled="open"')
  })

  it('外壳登记进浮层层级栈，解决 ToolTip 档(1400) 低于任务栏档(1500) 的已知冲突', () => {
    const desktop = read(join(shellDir, 'desktop-shell.vue'))
    expect(desktop).toContain("acquireLayer('--zIndexShell')")
    expect(desktop).toContain('shellLayer?.release()')
    // 覆写 --fui-tooltip-z 是无效的（提示面的 z 由 useFlyout 内联下发），注释里必须留痕
    expect(readRaw(join(shellDir, 'shell-taskbar.vue'))).toContain('--fui-tooltip-z')
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
    /*
     * 0.5.7：任务栏在所有宽度常驻（0.5.5 曾在移动档用 @media 把它 `display: none`）。
     * 反向断言守住新口径 —— 桌面外壳里不许再出现针对任务栏的隐藏规则；
     * 任务栏自身的断点（托盘压缩 / 展开按钮互斥）归 shell-taskbar.vue，
     * 那里的 @media 只切控件、不碰时钟（见「站点 chrome 的落点」一节）。
     */
    expect(desktop).not.toContain('docs-shell-taskbar)')
    expect(desktop).not.toMatch(/\.docs-shell-taskbar[\s\S]{0,120}display:\s*none/)
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

describe('桌面外壳：窗口拖拽收敛（0.5.8）', () => {
  /*
   * 这组断言守的是**两条会被「顺手优化」掉的实现选择**（都是真实浏览器实测才暴露的）：
   *   ① 拖拽按**增量**位移收敛（`deltaX/deltaY`）而不是「起点 + 累计位移」：
   *      累计口径下撞到边界后反向拖拽要先抵消越界量，Web 里指针能跑很远 ⇒ 死区可达数百像素。
   *   ② 视口（宿主）变化后必须**重新收敛**：拖拽允许窗口本体挂出桌面，
   *      视口一变小就可能把标题栏顶出工作区（窗口彻底消失）—— 这是 Web 独有风险。
   * 收敛公式本身（边界算式）由 shell-window-state.test.ts 覆盖，这里只守调用方式。
   */
  it('拖拽按增量位移收敛（不用累计位移，避免回拖死区）', () => {
    const explorer = read(join(shellDir, 'explorer-window.vue'))
    expect(explorer).toContain('containWindowOffset')
    expect(explorer).toContain('args.deltaX')
    expect(explorer).not.toContain('totalDeltaX')
  })

  it('拖拽 / 视口变化共用同一个收敛函数，且视口变化确实接了两条 resize 信号', () => {
    const desktop = read(join(shellDir, 'desktop-shell.vue'))
    expect(desktop).toContain('containWindowOffset')
    expect(desktop).toContain('containOffset')
    expect(desktop).toContain('ResizeObserver')
    expect(desktop).toContain("addEventListener('resize', measure")
  })

  it('收敛用的几何量一律实测（尺寸 / 静止位置 / 标题栏下缘），不重算 CSS 公式', () => {
    const desktop = read(join(shellDir, 'desktop-shell.vue'))
    // 静止位置 = 实测矩形 − 当前位移
    expect(desktop).toMatch(/measuredWindowBase\.value = \{/)
    // 顶端条带量到标题栏下缘（含 1px 描边），不是标题栏自身的 height
    expect(desktop).toMatch(/getBoundingClientRect\(\)\.bottom - rect\.top/)
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
