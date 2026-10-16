/**
 * 仿真应用注册表的契约测试（`apps/docs/utils/shell-apps.ts`）。
 *
 * 注册表是**元数据单一事实源**（任务栏顺序 / 开始菜单顺序 / 窗口标题 / 图标都读它），
 * 因此这里守三类约束：
 *  ① 身份唯一且默认应用在册；
 *  ② 消息 key 遵循 `shell.apps.<id>.{title,subtitle}` 命名约定 —— 这条把注册表与
 *     `i18n/locales/*.json` 绑在一起（`pnpm i18n:check` 只校验 key 集合与引用存在性，
 *     不会发现「注册表写了个拼错的 key」这类问题，因为这个 key 在两侧都不存在时
 *     引用检查同样会放过它 —— 它校验的是源码字面量能被消息树解析，而 `t(variable)`
 *     不是字面量。因此约定本身必须由测试兜住）；
 *  ③ 图标存在（窗口 / 任务栏 / 开始菜单三处共用同一枚，缺了会渲染出空图标位）。
 */
import { describe, expect, it } from 'vitest'
import { SHELL_APP_IDS, SHELL_APPS, SHELL_DEFAULT_APP_ID, findShellApp } from '../shell-apps'
import type { ShellAppId } from '../shell-apps'

describe('仿真应用注册表', () => {
  it('至少两个应用（多窗口的层级 / 焦点切换需要第二扇窗口才谈得上验收）', () => {
    expect(SHELL_APPS.length).toBeGreaterThanOrEqual(2)
  })

  it('应用 id 唯一', () => {
    const ids = SHELL_APPS.map((app) => app.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(SHELL_APP_IDS).toEqual(ids)
  })

  it('默认应用在册', () => {
    expect(SHELL_APP_IDS).toContain(SHELL_DEFAULT_APP_ID)
  })

  it('消息 key 遵循 shell.apps.<camelCase(id)>.{title,subtitle} 约定', () => {
    /*
     * id 用 kebab（同时是 CSS 类名后缀 `docs-shell-window--<id>`），消息 key 用 camelCase
     * （与 `shell.apps.*` 现有命名风格一致）。这条映射必须显式断言：key 是**字符串字面量**，
     * `pnpm i18n:check` 只校验「源码里出现的字面量 key 能在消息树里解析到」，
     * 拼错的 key 两边都不存在时，检查同样不会发现（它不会把变量 join 出来的 key 当引用）。
     */
    const expected = [
      ['ui-gallery', 'shell.apps.uiGallery'],
      ['render-lab', 'shell.apps.renderLab'],
    ] as const
    expect(SHELL_APPS.map((app) => app.id)).toEqual(expected.map(([id]) => id))
    for (const [index, [, prefix]] of expected.entries()) {
      const app = SHELL_APPS[index]
      expect(app?.titleKey).toBe(`${prefix}.title`)
      expect(app?.subtitleKey).toBe(`${prefix}.subtitle`)
    }
  })

  it('每个应用都有图标组件（窗口 / 任务栏 / 开始菜单共用同一枚）', () => {
    for (const app of SHELL_APPS) {
      expect(app.icon, app.id).toBeTruthy()
    }
  })

  it('findShellApp 命中在册应用，未知 id 兜底返回默认应用（不返回 undefined）', () => {
    for (const app of SHELL_APPS) {
      expect(findShellApp(app.id)).toBe(app)
    }
    // 运行期脏值（类型上不可能，数据被外部改写时才走到）不应让整桌面崩掉
    const unknownId = '__missing__' as unknown as ShellAppId
    expect(findShellApp(unknownId)).toBe(SHELL_APPS[0])
  })
})
