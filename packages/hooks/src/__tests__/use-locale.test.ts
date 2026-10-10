import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref, type Component, createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import type { ComponentLocaleSlice, ProviderMessages } from '../use-locale'
import { provideLocale, useScopeMessages } from '../use-locale'

/** 一个只渲染自身 scope key 的探针组件，setup 里取 `t` 再渲染出结果。 */
function makeProbe(
  slice: ComponentLocaleSlice,
  key: string,
): {
  component: Component
  props: (lo: { locale?: string }) => Record<string, unknown>
} {
  const component = defineComponent({
    name: 'LocaleProbe',
    inheritAttrs: false,
    props: { locale: { type: String, default: '' } },
    setup(props) {
      const { t } = useScopeMessages('probe', slice, props.locale)
      return () => h('span', t(key))
    },
  })
  return { component, props: () => ({}) }
}

/** SSR 渲染出一个自带 provider 的探针（无 provider 时走内置缺省分支）。 */
const renderProbe = (
  slice: ComponentLocaleSlice,
  key: string,
  opts: {
    providerLocale?: string
    messages?: ProviderMessages
    overrideLocale?: string
  } = {},
): Promise<string> => {
  const probe = makeProbe(slice, key)
  const component = defineComponent({
    setup() {
      if (opts.providerLocale !== undefined || opts.messages !== undefined) {
        provideLocale({
          locale: opts.providerLocale,
          messages: opts.messages,
        })
      }
      return () =>
        h(probe.component, {
          ...probe.props({ locale: opts.providerLocale }),
          locale: opts.overrideLocale,
        })
    },
  })
  const app = createSSRApp(component)
  return renderToString(app)
}

/** 默认测试切片：zh 缺一个 key（测回退链），其余两侧齐全。 */
const slice: ComponentLocaleSlice = {
  zhHans: { greeting: '首列' },
  en: { greeting: 'First' },
}

describe('useScopeMessages（无 Provider / 内置缺省）', () => {
  it('无 Provider 时回落到内置缺省 zh-Hans', async () => {
    const html = await renderProbe(slice, 'greeting')
    expect(html).toContain('首列')
  })

  it('zh-Hans 缺 key 时按链回退到 en 兜底（zh-Hans→zh→en）', async () => {
    const partial: ComponentLocaleSlice = { zhHans: {}, en: { greeting: 'Fallback en' } }
    const html = await renderProbe(partial, 'greeting', { providerLocale: 'zh-Hans' })
    expect(html).toContain('Fallback en')
  })
})

describe('useScopeMessages（Provider locale）', () => {
  it('Provider locale=en 取英文侧', async () => {
    const html = await renderProbe(slice, 'greeting', { providerLocale: 'en' })
    expect(html).toContain('First')
  })

  it('Provider locale 别名（zh-CN）归一为 zh-Hans', async () => {
    const html = await renderProbe(slice, 'greeting', { providerLocale: 'zh-CN' })
    expect(html).toContain('首列')
  })
})

describe('useScopeMessages（组件 locale prop 优先级）', () => {
  it('组件 locale prop 压过 Provider locale', async () => {
    const html = await renderProbe(slice, 'greeting', {
      providerLocale: 'en',
      overrideLocale: 'zh-Hans',
    })
    expect(html).toContain('首列')
  })

  it('组件 locale prop 为空时跟随 Provider（不强加内置缺省）', async () => {
    const html = await renderProbe(slice, 'greeting', {
      providerLocale: 'en',
      overrideLocale: undefined,
    })
    expect(html).toContain('First')
  })
})

describe('useScopeMessages（Provider messages 覆盖）', () => {
  it('Provider messages 按 locale×scope 覆盖组件内置文案', async () => {
    const html = await renderProbe(slice, 'greeting', {
      providerLocale: 'zh-Hans',
      messages: { 'zh-Hans': { probe: { greeting: '覆盖串' } } },
    })
    expect(html).toContain('覆盖串')
  })

  it('覆盖只作用于目标 scope，不污染其他 key', async () => {
    const twoKey: ComponentLocaleSlice = {
      zhHans: { a: '甲', b: '乙' },
      en: { a: 'A', b: 'B' },
    }
    const probe = makeProbe(twoKey, 'b')
    const component = defineComponent({
      setup() {
        provideLocale({
          locale: 'zh-Hans',
          messages: { 'zh-Hans': { probe: { a: '覆盖甲' } } },
        })
        return () => h(probe.component)
      },
    })
    const html = await renderToString(createSSRApp(component))
    expect(html).toContain('乙')
    expect(html).not.toContain('覆盖甲')
  })
})

describe('useScopeMessages（并发 SSR 不串 locale）', () => {
  it('两个并发 SSR 请求各自持独立 context，互不污染', async () => {
    const render = (providerLocale: string): Promise<string> =>
      renderProbe(slice, 'greeting', { providerLocale })
    const [zh, en] = await Promise.all([render('zh-Hans'), render('en')])
    expect(zh).toContain('首列')
    expect(en).toContain('First')
    expect(zh).not.toContain('First')
    expect(en).not.toContain('首列')
  })

  it('缺 key 时只在开发环境告警', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const partial: ComponentLocaleSlice = { zhHans: { greeting: '有' }, en: {} }
      await renderProbe(partial, 'missingKey', { providerLocale: 'zh-Hans' })
      expect(warnSpy).toHaveBeenCalled()
    } finally {
      warnSpy.mockRestore()
    }
  })
})

describe('useScopeMessages（Provider 切 locale 即时更新）', () => {
  it('Provider locale 是响应式的：切换后文案即时更新（客户端挂载验证）', async () => {
    const probe = makeProbe(slice, 'greeting')
    const localeRef = ref('zh-Hans')
    const component = defineComponent({
      setup() {
        provideLocale({ locale: localeRef })
        return () => h(probe.component)
      },
    })
    const wrapper = mount(component)
    expect(wrapper.text()).toBe('首列')

    localeRef.value = 'en'
    await nextTick()
    expect(wrapper.text()).toBe('First')

    wrapper.unmount()
  })
})
