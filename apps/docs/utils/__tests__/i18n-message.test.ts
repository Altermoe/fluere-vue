/**
 * `isMessageAST` / `resolveMessageTree` 契约测试。
 *
 * 夹具的出处（真实产物，非手写想象）：
 * docs dev server 的客户端语言文件被 `@intlify/unplugin-vue-i18n` 预编译，形如
 *   GET /_nuxt/i18n/locales/zh-Hans.json?import
 *   → const resource = { "nav": { "docs": { "type":0, …, "body":{ … "static":"Docs" } }, … } }
 * `VERBATIM_NAV_DOCS` 即从该响应里原样抠出的 `nav.docs` 节点。
 *
 * 测试里的「叶子解析器」用 `body.static` 取文本，等价生产代码用的 `rt()`：实测
 * （浏览器内）`rt(<该 AST 节点>)` 返回的就是这段文本，而 SSR 侧消息本来就是字符串。
 */
import { describe, expect, it } from 'vitest'
import { isMessageAST, resolveMessageTree } from '../i18n-message'

/** 真实产物：`nav.docs` 的预编译消息（取自 dev server 的 `?import` 响应）。 */
const VERBATIM_NAV_DOCS = {
  type: 0,
  start: 0,
  end: 4,
  loc: {
    start: { line: 1, column: 1, offset: 0 },
    end: { line: 1, column: 5, offset: 4 },
    source: 'Docs',
  },
  body: {
    type: 2,
    start: 0,
    end: 4,
    loc: {
      start: { line: 1, column: 1, offset: 0 },
      end: { line: 1, column: 5, offset: 4 },
    },
    items: [
      {
        type: 3,
        start: 0,
        end: 4,
        loc: { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 5, offset: 4 } },
      },
    ],
    static: 'Docs',
  },
}

/** 按实测形状构造单行文本的 AST 节点（与 `VERBATIM_NAV_DOCS` 同构）。 */
function astOf(text: string) {
  const loc = {
    start: { line: 1, column: 1, offset: 0 },
    end: { line: 1, column: text.length + 1, offset: text.length },
  }
  return {
    type: 0,
    start: 0,
    end: text.length,
    loc: { ...loc, source: text },
    body: {
      type: 2,
      start: 0,
      end: text.length,
      loc,
      items: [{ type: 3, start: 0, end: text.length, loc }],
      static: text,
    },
  }
}

/** 叶子解析器：语义等价 `rt()`（把消息节点解析成最终文案）。 */
const resolveLeaf = (message: unknown) => {
  const body = (message as { body?: { static?: string } }).body
  if (typeof body?.static !== 'string') {
    throw new Error('叶子不是文本消息节点')
  }
  return body.static
}

describe('isMessageAST', () => {
  it('识别真实预编译消息节点', () => {
    expect(isMessageAST(VERBATIM_NAV_DOCS)).toBe(true)
  })

  it('不把普通消息对象 / 字符串 / 数组误判为 AST', () => {
    expect(isMessageAST({ title: 'a', items: ['b'] })).toBe(false)
    expect(isMessageAST({ type: 0 })).toBe(false) // 只有 type 不足以判定
    expect(isMessageAST('Docs')).toBe(false)
    expect(isMessageAST(['Docs'])).toBe(false)
    expect(isMessageAST(null)).toBe(false)
  })

  it('构造的夹具与真实产物同形', () => {
    expect(astOf('Docs')).toEqual(VERBATIM_NAV_DOCS)
  })
})

describe('resolveMessageTree', () => {
  it('SSR 形态（纯 JSON 字符串）：原样返回，形状与键序不变', () => {
    const messages = {
      title: 'Accessibility out of the box.',
      subtitle: '遵循 WAI-ARIA 设计规范',
      items: ['WAI-ARIA compliant', '键盘导航'],
    }
    const resolved = resolveMessageTree(messages, () => {
      throw new Error('SSR 形态不该走解析器')
    })
    expect(resolved).toEqual(messages)
    expect(Object.keys(resolved)).toEqual(['title', 'subtitle', 'items'])
  })

  it('客户端形态（预编译 AST）：逐叶子解析为字符串，容器形状不变', () => {
    const resolved = resolveMessageTree(
      {
        title: astOf('Accessibility out of the box.'),
        subtitle: astOf('遵循 WAI-ARIA 设计规范'),
        items: [astOf('WAI-ARIA compliant'), astOf('键盘导航')],
      },
      resolveLeaf,
    )

    expect(resolved).toEqual({
      title: 'Accessibility out of the box.',
      subtitle: '遵循 WAI-ARIA 设计规范',
      items: ['WAI-ARIA compliant', '键盘导航'],
    })
    // 水合失配的根因就是这里：未解析时叶子是对象，插值会渲染成 JSON
    expect(typeof resolved.items[0]).toBe('string')
  })

  it('混合形态（部分资源走预编译、部分保持原始 JSON）同样可用', () => {
    const resolved = resolveMessageTree({ a: astOf('A'), b: 'B' }, resolveLeaf)
    expect(resolved).toEqual({ a: 'A', b: 'B' })
  })
})
