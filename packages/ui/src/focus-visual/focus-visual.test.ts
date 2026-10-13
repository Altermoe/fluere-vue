/* oxlint-disable import/no-nodejs-modules -- 契约测试需读源码文本（jsdom 不解析 var()） */
/**
 * `useFocusVisual` 双层焦点矩形原语契约（0.4.3 验收要点：内层 / 外层双层矩形、
 * 明暗两态、NavigationView / ListView 接入时无需各写一套）。
 *
 * 规格与几何在 `focus-visual.css` 的文件头（A 级来源 microsoft-ui-xaml
 * `winui3/release/2.5.1`）。这里把它守成可回归的断言：两层厚度 / 配色映射 /
 * 无间隙几何 / 高对比度分支 / 特异性，以及 Button 试点确实换成了原语。
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { FOCUS_VISUAL_CLASS, useFocusVisual } from './use-focus-visual'

const here = dirname(fileURLToPath(import.meta.url))

/** 读源码并剥掉注释（注释里写着 WinUI 原值，不能当实现证据） */
const readStripped = (relativePath: string): string =>
  readFileSync(resolve(here, relativePath), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

const css = readStripped('./focus-visual.css')

describe('focus-visual.css 双层焦点矩形', () => {
  it('两层厚度对齐 WinUI 缺省：外 2px / 内 1px', () => {
    expect(css).toContain('--fui-focus-visual-outer-thickness: 2px')
    expect(css).toContain('--fui-focus-visual-inner-thickness: 1px')
  })

  it('配色映射到 Fluent 焦点描边 token（外 Focus2 / 内 Focus1）', () => {
    expect(css).toContain('--fui-focus-visual-outer-color: var(--colorStrokeFocus2)')
    expect(css).toContain('--fui-focus-visual-inner-color: var(--colorStrokeFocus1)')
  })

  it('两级描边紧贴无间隙：outline-offset 与 box-shadow 扩散都取内层厚度', () => {
    expect(css).toContain('outline-offset: var(--fui-focus-visual-inner-thickness)')
    expect(css).toContain('box-shadow: 0 0 0 var(--fui-focus-visual-inner-thickness)')
  })

  it('选择器重复类名以提高特异性（压过组件 scoped 的 outline: none）', () => {
    expect(css).toContain('.fui-focus-visual.fui-focus-visual:focus-visible')
    expect(css).toContain('.fui-focus-visual.fui-focus-visual[data-focus-visible]')
  })

  it('高对比度走 CanvasText / Canvas（对齐 WinUI 的 WindowText / Window）', () => {
    expect(css).toContain('@media (forced-colors: active)')
    expect(css).toContain('outline-color: CanvasText')
    expect(css).toContain('0 0 0 var(--fui-focus-visual-inner-thickness) Canvas')
  })

  it('不出现硬编码色值（颜色只来自 token）', () => {
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i)
    expect(css).not.toMatch(/\brgba?\(/)
  })
})

describe('useFocusVisual', () => {
  it('返回原语类名', () => {
    expect(useFocusVisual().class).toBe(FOCUS_VISUAL_CLASS)
    expect(FOCUS_VISUAL_CLASS).toBe('fui-focus-visual')
  })

  it('不传选项时不注入内联变量（完全走样式表缺省）', () => {
    expect(useFocusVisual().style).toEqual({})
  })

  it('传选项时只覆写对应变量', () => {
    const { style } = useFocusVisual({ outerThickness: '1px', innerColor: 'Canvas' })
    expect(style).toEqual({
      '--fui-focus-visual-outer-thickness': '1px',
      '--fui-focus-visual-inner-color': 'Canvas',
    })
  })

  it('SSR 安全：不访问浏览器 API', () => {
    const source = readStripped('./use-focus-visual.ts')
    expect(source).not.toMatch(/\bwindow\b|\bdocument\b|matchMedia|ResizeObserver/)
  })
})

describe('Button 试点', () => {
  const button = readStripped('../button/button.vue')

  it('挂上共享原语类名', () => {
    expect(button).toContain('focusVisual.class')
  })

  it('不再自写 :focus-visible 规则（否则同特异性会按源码顺序吃掉焦点环）', () => {
    expect(button).not.toContain(':focus-visible')
  })
})
