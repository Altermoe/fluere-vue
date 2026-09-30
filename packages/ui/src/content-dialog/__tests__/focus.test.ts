/* oxlint-disable no-magic-numbers -- 断言次数与固定尺寸属测试细节 */
import { describe, expect, it } from 'vitest'
/**
 * 单元测试：ContentDialog 焦点策略的纯函数层。
 *
 * 对照来源：WinUI 3（microsoft-ui-xaml winui3/release/2.5.1）
 *   src/dxaml/xcp/dxaml/lib/ContentDialog_Partial.cpp#SetInitialFocusElement
 *   三级优先：① 内容区第一个可聚焦元素 → ② 默认按钮 → ③ 命令区第一个可聚焦按钮
 */
import { getFocusableElements, isFocusable, resolveInitialFocusTarget } from '../focus'

/** 造一个带子节点的容器 */
const makeContainer = (html: string): HTMLElement => {
  const root = document.createElement('div')
  root.innerHTML = html
  document.body.append(root)
  return root
}

describe('getFocusableElements', () => {
  it('收集原生可聚焦元素，跳过 disabled / tabindex=-1 / display:none / hidden', () => {
    const root = makeContainer(`
      <a href="#a">链接</a>
      <button>按钮</button>
      <button disabled>禁用</button>
      <button tabindex="-1">不可 Tab</button>
      <input />
      <input type="hidden" />
      <textarea></textarea>
      <select><option>a</option></select>
      <div tabindex="0">可聚焦 div</div>
      <div contenteditable="true">可编辑</div>
      <div hidden><button>隐藏里的按钮</button></div>
      <div style="display: none"><button>display:none 里的按钮</button></div>
      <span>普通文本</span>
    `)

    const tags = getFocusableElements(root).map((element) => element.tagName.toLowerCase())
    expect(tags).toStrictEqual(['a', 'button', 'input', 'textarea', 'select', 'div', 'div'])
    root.remove()
  })

  it('空容器 / null 返回空数组（SSR 安全）', () => {
    expect(getFocusableElements(null)).toStrictEqual([])
    expect(getFocusableElements(makeContainer(''))).toStrictEqual([])
  })

  it('aria-disabled 与未连接节点不算可聚焦', () => {
    const root = makeContainer('<button aria-disabled="true">伪禁用</button>')
    expect(getFocusableElements(root)).toStrictEqual([])
    const orphan = document.createElement('button')
    expect(isFocusable(orphan)).toBe(false)
    root.remove()
  })
})

describe('resolveInitialFocusTarget', () => {
  it('① 内容区第一个可聚焦元素优先于默认按钮', () => {
    const content = makeContainer('<input id="first-in-content" /><button id="second">x</button>')
    const command = makeContainer('<button id="cmd">命令</button>')
    const defaultButton = command.querySelector<HTMLElement>('#cmd')

    const target = resolveInitialFocusTarget({ content, defaultButton, commandSpace: command })
    expect(target?.id).toBe('first-in-content')
    content.remove()
    command.remove()
  })

  it('② 内容区没有可聚焦元素时落到默认按钮', () => {
    const content = makeContainer('<p>纯文本</p>')
    const command = makeContainer('<button id="cmd">命令</button>')
    const defaultButton = command.querySelector<HTMLElement>('#cmd')

    const target = resolveInitialFocusTarget({ content, defaultButton, commandSpace: command })
    expect(target?.id).toBe('cmd')
    content.remove()
    command.remove()
  })

  it('③ 没有默认按钮时落到命令区第一个可聚焦元素', () => {
    const content = makeContainer('<p>纯文本</p>')
    const command = makeContainer('<button id="first">一</button><button id="second">二</button>')

    const target = resolveInitialFocusTarget({
      content,
      defaultButton: null,
      commandSpace: command,
    })
    expect(target?.id).toBe('first')
    content.remove()
    command.remove()
  })

  it('三者都不可用时返回 null（焦点留在原位）', () => {
    const content = makeContainer('<p>纯文本</p>')
    expect(
      resolveInitialFocusTarget({ content, defaultButton: null, commandSpace: null }),
    ).toBeNull()
    content.remove()
  })

  it('默认按钮不可见时不会被选中', () => {
    const content = makeContainer('<p>纯文本</p>')
    const command = makeContainer('<button id="hidden-default" hidden>隐藏</button>')
    const defaultButton = command.querySelector<HTMLElement>('#hidden-default')

    const target = resolveInitialFocusTarget({ content, defaultButton, commandSpace: command })
    expect(target).toBeNull()
    content.remove()
    command.remove()
  })
})
