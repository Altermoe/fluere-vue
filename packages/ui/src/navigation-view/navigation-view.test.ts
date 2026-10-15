/* oxlint-disable import/no-nodejs-modules -- 契约测试要读 SFC / CSS 源码做文本断言（jsdom 不解析 var()） */
/**
 * `FluereNavigationView` 家族契约测试。
 *
 * 分两层：
 *  ① **行为**：DisplayMode 状态机（`width >= 1008` / `0 < width < 641` / 其余）、
 *     pane 开合与 `m_wasForceClosed` 记忆、键盘（Enter / Space / Home / End / 方向键）、
 *     选择（`selectsOnInvoked` / 设置项哨兵 / 指示条下钻）、展开折叠与「面板关闭时顶层强制折叠」、
 *     `isChildSelected` 祖先链 —— 逐条对齐 `NavigationView.cpp` / `NavigationViewItem.cpp`
 *     的 A 级实现（组件文件头有逐条出处）；
 *  ② **样式**：从 SFC / CSS 源码文本断言 token 引用、几何值、无裸色值、无裸 z-index
 *     （jsdom 不解析 `var()`，见 docs/style-spec §7.1）。
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { FLUERE_NAVIGATION_SETTINGS_VALUE } from './context'
import FluereNavigationViewItemHeader from './navigation-view-item-header.vue'
import FluereNavigationViewItemSeparator from './navigation-view-item-separator.vue'
import FluereNavigationViewItem from './navigation-view-item.vue'
import FluereNavigationView from './navigation-view.vue'

const here = dirname(fileURLToPath(import.meta.url))
const sfc = readFileSync(resolve(here, 'navigation-view.vue'), 'utf8')
const itemsSfc = readFileSync(resolve(here, 'navigation-view-items.vue'), 'utf8')
const css = readFileSync(resolve(here, 'navigation-view.css'), 'utf8')
const constantsTs = readFileSync(resolve(here, 'constants.ts'), 'utf8')
const localeTs = readFileSync(resolve(here, 'locale.ts'), 'utf8')

/** 去掉注释后的源码：注释里写着 WinUI 原值，不能当作实现证据 */
const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '')

/** 取出 `<style>` 块（去注释） */
const styleBlock = (source: string): string =>
  stripComments(/<style[^>]*>(?<css>[\s\S]*?)<\/style>/.exec(source)?.groups?.css ?? '')

const sfcStyle = styleBlock(sfc)
const itemsStyle = styleBlock(itemsSfc)
const cssStripped = stripComments(css)

let wrapper: VueWrapper | undefined = undefined
afterEach(() => {
  // attachTo 的用例不要在体内清空 document.body（Vue 卸载会找不到宿主）
  wrapper?.unmount()
  wrapper = undefined
})

/* ------------------------------------------------------------------ */
/* Fixture                                                             */
/* ------------------------------------------------------------------ */

interface HostOptions {
  /** 覆盖 `<FluereNavigationView>` 的 props */
  viewProps?: Record<string, unknown>
  /** 展开 / 折叠由宿主控制的项（受控 `is-expanded`） */
  controlledExpanded?: boolean
}

/**
 * 宿主 fixture：真实消费姿势 —— `v-for` + 分组标题 + 分隔线 + 递归子项 + 内置设置项。
 *
 * 暴露 `selected`（`v-model:selectedValue`）供用例驱动受控选中。
 */
const makeHost = (options: HostOptions = {}) =>
  mount(
    defineComponent({
      components: {
        FluereNavigationView,
        FluereNavigationViewItem,
        FluereNavigationViewItemHeader,
        FluereNavigationViewItemSeparator,
      },
      setup() {
        const selected = ref<string | number | undefined>(undefined)
        const expanded = ref(false)
        const items = [
          { value: 'home', content: 'Home' },
          { value: 'library', content: 'Library' },
        ]
        return { selected, expanded, items, options }
      },
      template: `
        <FluereNavigationView
          v-model:selected-value="selected"
          label="导航"
          v-bind="options.viewProps ?? {}"
        >
          <FluereNavigationViewItemHeader content="Group A" />
          <FluereNavigationViewItem
            v-for="item in items"
            :key="item.value"
            :value="item.value"
            :content="item.content"
          />
          <FluereNavigationViewItemSeparator />
          <FluereNavigationViewItem value="music" content="Music">
            <template #children>
              <FluereNavigationViewItem value="albums" content="Albums" />
              <FluereNavigationViewItem value="artists" content="Artists" />
            </template>
          </FluereNavigationViewItem>
          <template #content><p>body</p></template>
        </FluereNavigationView>
      `,
    }),
    { attachTo: document.body },
  )

/** 按 `data-value` 找项按钮 */
const itemByValue = (host: VueWrapper, value: string) =>
  host.findAll('.fui-navigation-view__item').find((node) => node.attributes('data-value') === value)

/**
 * `FluereNavigationView` 实例上的 emitted 记录。
 *
 * ⚠️ 不能直接 `wrapper.emitted(...)` —— `wrapper` 是**宿主**组件，而事件是子组件
 * `FluereNavigationView` 抛的；VTU 不会把子组件的事件冒泡到宿主包装器上。
 * 这是 Vue 组件测试的常见坑（`emitted()` 只记录**该包装器对应组件**抛的事件）。
 *
 * 返回类型放宽成 `Record<string, unknown[][]>`：`emitted()` 的推断是
 * `Record<string, unknown[]>`，直接 `.at(-1)?.[0]` 会因 `unknown` 不可索引而报 TS7053。
 */
const viewEmits = (host: VueWrapper): Record<string, unknown[][]> =>
  host.findComponent(FluereNavigationView).emitted() as unknown as Record<string, unknown[][]>

/** 键盘事件（jsdom 里 KeyboardEvent 需要显式给 key / 修饰键） */
const pressKey = (
  target: Element | null | undefined,
  key: string,
  modifiers: Partial<Pick<KeyboardEvent, 'ctrlKey' | 'shiftKey' | 'altKey' | 'metaKey'>> = {},
): void => {
  target?.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...modifiers }),
  )
}

/* ------------------------------------------------------------------ */
/* ① 渲染 / 结构契约                                                    */
/* ------------------------------------------------------------------ */

describe('FluereNavigationView 渲染与结构契约', () => {
  it('渲染导航区（role=navigation + aria-label）与内容区', () => {
    wrapper = makeHost()
    const nav = wrapper.find('nav.fui-navigation-view__nav')
    expect(nav.exists()).toBe(true)
    expect(nav.attributes('aria-label')).toBe('导航')
    expect(wrapper.find('.fui-navigation-view__content').text()).toContain('body')
  })

  it('根节点带 displayMode 与开合状态 class（对齐 SplitView.DisplayMode 映射）', () => {
    wrapper = makeHost()
    const root = wrapper.find('.fui-navigation-view')
    expect(root.classes()).toContain('fui-navigation-view--compact')
    expect(root.classes()).toContain('is-pane-open')

    // 根 class 只应出现一次：模板上的静态 class 与 rootClass 重复声明过一次，
    // 浏览器实测看到 `class="fui-navigation-view fui-navigation-view …"`（回归用例）
    expect(root.classes().filter((name) => name === 'fui-navigation-view')).toHaveLength(1)
  })

  it('单根组件必须透传消费方的 class / style（不得设 inheritAttrs: false）', () => {
    // 真实浏览器实测抓到的 bug：单根组件上写 `inheritAttrs: false` 会静默丢掉
    // 消费方传的 class / style —— 文档站 demo 里的 `class="h-[320px]"` 完全没生效，
    // 组件高度塌成 0（jsdom 不做布局，单测当时看不出来）。
    wrapper = mount(
      defineComponent({
        components: { FluereNavigationView },
        template: `
          <FluereNavigationView label="导航" class="nv-host-class" style="height: 320px">
            <template #content><p>body</p></template>
          </FluereNavigationView>
        `,
      }),
    )
    const root = wrapper.find('.fui-navigation-view')
    expect(root.classes()).toContain('nv-host-class')
    expect(root.attributes('style')).toContain('height: 320px')
    // 组件源码里不得再出现 inheritAttrs: false
    expect(stripComments(sfc)).not.toMatch(/inheritAttrs:\s*false/)
  })

  it('三个数据型子组件都不会把自己渲染成 DOM（父组件只读 vnode）', () => {
    wrapper = makeHost()
    // 它们若真的挂载了会各有一条开发期警告 + 空模板；这里断言 DOM 里没有它们的痕迹
    expect(wrapper.findAll('fluere-navigation-view-item')).toHaveLength(0)
    expect(wrapper.findAll('fluere-navigation-view-item-header')).toHaveLength(0)
    expect(wrapper.findAll('fluere-navigation-view-item-separator')).toHaveLength(0)
  })

  it('分组标题渲染成不可聚焦的文本行；分隔线渲染成 role=separator', () => {
    wrapper = makeHost()
    const header = wrapper.find('.fui-navigation-view__header')
    expect(header.exists()).toBe(true)
    expect(header.text()).toContain('Group A')
    expect(header.find('button').exists()).toBe(false)

    const separator = wrapper.find('[role="separator"]')
    expect(separator.exists()).toBe(true)
    expect(separator.attributes('aria-orientation')).toBe('horizontal')
  })

  it('每个导航项是一个 button，带 aria-current 表达选中', async () => {
    wrapper = makeHost()
    const home = itemByValue(wrapper, 'home')
    expect(home).toBeDefined()
    expect(home?.attributes('aria-current')).toBeUndefined()
    await home?.trigger('click')
    expect(itemByValue(wrapper, 'home')?.attributes('aria-current')).toBe('page')
  })

  it('折叠的子项不渲染（对应 ShowHideChildrenItemsRepeater 的可见性）', () => {
    wrapper = makeHost()
    expect(itemByValue(wrapper, 'albums')).toBeUndefined()
    expect(itemByValue(wrapper, 'artists')).toBeUndefined()
  })

  it('有子项的项带 aria-expanded，无子项的不带', () => {
    wrapper = makeHost()
    expect(itemByValue(wrapper, 'music')?.attributes('aria-expanded')).toBe('false')
    expect(itemByValue(wrapper, 'home')?.attributes('aria-expanded')).toBeUndefined()
  })

  it('没有 label 时导航区无 aria-label（与 WinUI「必须显式给名」一致，不编造默认名）', () => {
    wrapper = mount(
      defineComponent({
        components: { FluereNavigationView, FluereNavigationViewItem },
        template: `
          <FluereNavigationView>
            <FluereNavigationViewItem value="a" content="A" />
          </FluereNavigationView>
        `,
      }),
    )
    expect(wrapper.find('nav').attributes('aria-label')).toBeUndefined()
  })
})

/* ------------------------------------------------------------------ */
/* ② DisplayMode 状态机（逐条对齐 NavigationView.cpp:1434-1513）        */
/* ------------------------------------------------------------------ */

/**
 * 复刻组件的 DisplayMode 判据（`NavigationView.cpp:1452-1465`）。
 *
 * jsdom 不做布局（`getBoundingClientRect().width` 恒为 0），因此这里测**纯判据**：
 * 同一份逻辑在组件里是 `computed`，两边由「源码文本断言 + 常量断言」锁定一致性。
 */
const modeFor = (width: number, thresholds = { compact: 641, expanded: 1008 }): string => {
  if (width >= thresholds.expanded) {
    return 'expanded'
  }
  if (width > 0 && width < thresholds.compact) {
    return 'compact' // 上游是 Minimal，本库降级为 Compact（见组件差异表第 2 条）
  }
  return 'compact'
}

describe('DisplayMode 状态机', () => {
  /**
   * 直接测纯判据：把组件的 computed 逻辑以「源码文本 + 常量」双重锁定。
   * jsdom 没有真实布局，宽度只能靠 mock `getBoundingClientRect`。
   */
  it('阈值常量与 WinUI 依赖属性默认值一致（641 / 1008）', () => {
    expect(constantsTs).toMatch(/NAVIGATION_COMPACT_MODE_THRESHOLD_WIDTH = 641/)
    expect(constantsTs).toMatch(/NAVIGATION_EXPANDED_MODE_THRESHOLD_WIDTH = 1008/)
  })

  it('源码里判据是 >= 1008 与 (width > 0 && width < 641)，且默认落 Compact', () => {
    expect(sfc).toMatch(/width >= props\.expandedModeThresholdWidth/)
    expect(sfc).toMatch(/width > 0 && width < props\.compactModeThresholdWidth/)
  })

  it('边界：1008 ⇒ expanded；641 ⇒ compact；640 ⇒ compact；0 / NaN ⇒ compact', () => {
    expect(modeFor(1008)).toBe('expanded')
    expect(modeFor(1007)).toBe('compact')
    expect(modeFor(641)).toBe('compact')
    expect(modeFor(640)).toBe('compact')
    expect(modeFor(0)).toBe('compact')
    expect(modeFor(Number.NaN)).toBe('compact')
  })

  it('paneDisplayMode 三档显式配置恒为对应模式（left / left-compact / left-minimal）', () => {
    expect(sfc).toMatch(/mode === 'left'[\s\S]{0,80}return 'expanded'/)
    expect(sfc).toMatch(/mode === 'left-compact'[\s\S]{0,80}return 'compact'/)
    expect(sfc).toMatch(/mode === 'left-minimal'[\s\S]{0,120}return 'compact'/)
  })

  it('SSR / 未测量时宽度为 0 ⇒ 落 Compact（不会把内容挤没，也不会水合不一致）', () => {
    // 初值 0 且 setup() 不读 window
    expect(sfc).toMatch(/const measuredWidth = ref\(0\)/)
    expect(sfc).not.toMatch(/setup\(\)[\s\S]{0,200}window\./)
  })
})

/* ------------------------------------------------------------------ */
/* ③ pane 开合状态机                                                   */
/* ------------------------------------------------------------------ */

describe('pane 开合状态机', () => {
  it('开关按钮的可访问名随开合切换（上游 NavigationButton{Closed,Open}Name）', async () => {
    wrapper = makeHost({ viewProps: { defaultIsPaneOpen: true } })
    const toggle = wrapper.find('.fui-navigation-view__toggle')
    expect(toggle.attributes('aria-label')).toBe('关闭导航')
    await toggle.trigger('click')
    expect(wrapper.find('.fui-navigation-view__toggle').attributes('aria-label')).toBe('打开导航')
  })

  it('开关按钮宽按 UpdatePaneToggleSize 规则：无标题 = CompactPaneLength，有标题 = 面板宽', () => {
    // 真实浏览器实测发现的偏差：原实现恒 40，带 pane-title 时标题被挤扁。
    // 上游 NavigationView.cpp:4605-4645 的三条分支（见组件内 toggleButtonWidth 的注释）。
    const widthOf = (host: VueWrapper): string =>
      (host.find('.fui-navigation-view').element as HTMLElement).style.getPropertyValue(
        '--fui-navigation-view-toggle-button-width',
      )

    // ① 无 paneTitle ⇒ TemplateSettings.PaneToggleButtonWidth = CompactPaneLength(48)
    wrapper = makeHost({ viewProps: { paneDisplayMode: 'left', defaultIsPaneOpen: true } })
    expect(widthOf(wrapper)).toBe('48px')
    wrapper.unmount()

    // ② Expanded + paneTitle ⇒ OpenPaneLength(320)
    wrapper = makeHost({
      viewProps: { paneDisplayMode: 'left', defaultIsPaneOpen: true, paneTitle: 'Explorer' },
    })
    expect(widthOf(wrapper)).toBe('320px')
    wrapper.unmount()

    // ③ Compact(浮层) + 开着 + paneTitle ⇒ OpenPaneLength - 40（给返回 / 关闭按钮留位）
    wrapper = makeHost({
      viewProps: {
        paneDisplayMode: 'left-compact',
        defaultIsPaneOpen: true,
        paneTitle: 'Explorer',
      },
    })
    expect(widthOf(wrapper)).toBe('280px')
    wrapper.unmount()

    // ④ 紧凑且关闭 ⇒ 该分支被跳过，回到 48
    wrapper = makeHost({
      viewProps: {
        paneDisplayMode: 'left-compact',
        defaultIsPaneOpen: false,
        paneTitle: 'Explorer',
      },
    })
    expect(widthOf(wrapper)).toBe('48px')
  })

  it('点击开关抛 update:isPaneOpen，且 aria-expanded 跟随', async () => {
    wrapper = makeHost({ viewProps: { defaultIsPaneOpen: true } })
    const toggle = wrapper.find('.fui-navigation-view__toggle')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    await toggle.trigger('click')
    expect(wrapper.find('.fui-navigation-view__toggle').attributes('aria-expanded')).toBe('false')
    expect(viewEmits(wrapper)['update:isPaneOpen']?.at(-1)).toEqual([false])
  })

  it('受控模式下组件不自行改状态，只抛事件', async () => {
    wrapper = makeHost({ viewProps: { isPaneOpen: true } })
    await wrapper.find('.fui-navigation-view__toggle').trigger('click')
    // 受控：Prop 没变 ⇒ DOM 仍是展开
    expect(wrapper.find('.fui-navigation-view__toggle').attributes('aria-expanded')).toBe('true')
    expect(viewEmits(wrapper)['update:isPaneOpen']?.at(-1)).toEqual([false])
  })

  it('关闭时面板宽是 CompactPaneLength(48) 而不是 0（上游 ListSizeCompact，NavigationView.xaml:83）', async () => {
    wrapper = makeHost({ viewProps: { defaultIsPaneOpen: false } })
    const root = wrapper.find('.fui-navigation-view').element as HTMLElement
    expect(root.style.getPropertyValue('--fui-navigation-view-pane-width')).toBe('48px')
    await wrapper.find('.fui-navigation-view__toggle').trigger('click')
    expect(
      (wrapper.find('.fui-navigation-view').element as HTMLElement).style.getPropertyValue(
        '--fui-navigation-view-pane-width',
      ),
    ).toBe('320px')
  })

  it('is-pane-overlaying 只在非 Expanded 档打开面板时出现（上游 UpdatePaneOverlayGroup）', async () => {
    wrapper = makeHost({ viewProps: { defaultIsPaneOpen: true, paneDisplayMode: 'left' } })
    expect(wrapper.find('.fui-navigation-view__pane').classes()).not.toContain('is-overlaying')
    wrapper.unmount()

    wrapper = makeHost({ viewProps: { defaultIsPaneOpen: true, paneDisplayMode: 'left-compact' } })
    expect(wrapper.find('.fui-navigation-view__pane').classes()).toContain('is-overlaying')
  })

  it('切换 paneDisplayMode 会清掉「用户手动关过」的记忆（上游 :4211）', () => {
    expect(sfc).toMatch(
      /watch\(\s*\(\) => props\.paneDisplayMode[\s\S]{0,120}wasForceClosed\.value = false/,
    )
  })

  it('源码照抄了「进入 expanded 且未手动关过才自动开」与「非 expanded 一律关」', () => {
    expect(sfc).toMatch(
      /mode === 'expanded'[\s\S]{0,160}props\.isPaneVisible && !wasForceClosed\.value/,
    )
    expect(sfc).toMatch(/setPaneOpen\(false\)/)
  })

  it('isPaneVisible=false 时面板不渲染（上游 PaneVisibilityGroup 的 PaneCollapsed）', () => {
    wrapper = makeHost({ viewProps: { isPaneVisible: false } })
    expect(wrapper.find('.fui-navigation-view__pane').exists()).toBe(false)
  })
})

/* ------------------------------------------------------------------ */
/* ③b 折叠（ListSizeCompact）态的四个 UI 回归                           */
/* ------------------------------------------------------------------ */

/**
 * 这一组守的是**真实浏览器实测发现、单测当时看不出来**的四个偏差
 * （jsdom 不做布局，只断言源码文本与结构；几何证据留在组件注释与文档页）：
 *
 * | 症状 | 根因 | A 级依据 |
 * | --- | --- | --- |
 * | 折叠后汉堡图标被压成 7.41 × 20 | 开关行多了一份 4px 横向 padding，与按钮自身 padding 叠加 | `NavigationViewButtonHolderGridMargin = 0,4`（`:232`） |
 * | 折叠后 `paneTitle` 仍占位 | 条件写成 `displayMode === 'expanded'`，而 `left` 档是 expanded | `ListSizeCompact` 置 `Collapsed`（`NavigationView.xaml:85`） |
 * | 行背景右侧被裁 3px、左右间隙 4 / -3 | 面板 `border-inline-end` 吃掉定宽 1px + 项 `inline-size: 100%` 再叠 margin | 上游分居线在 `RootSplitView`，`PaneContentGrid.Margin = -1,3` 抵回（`:233`） |
 * | 设置项齿轮是一坨实心黑 | 内联 path 只有 576 字符（官方 regular 是 1022），丢了内圈描边 | `SymbolIconSource(Symbol::Setting)` 是**线性**齿轮（`NavigationView.cpp:1332-1337`） |
 */
describe('折叠态（ListSizeCompact）UI 回归', () => {
  it('开关行横向不加 padding（NavigationViewButtonHolderGridMargin = 0,4）', () => {
    // 原实现 `padding: var(--spacingVerticalXS) var(--spacingHorizontalXS)`：
    // 横向那 4px 与按钮自身的 4px padding 叠加，48px 按钮只剩 40px 可用宽，
    // 真实浏览器里汉堡图标被 flex 压成 7.41 × 20（见组件样式块注释）。
    const rule = /\.fui-navigation-view__toggle-row\s*\{(?<body>[^}]*)\}/.exec(sfcStyle)?.groups
      ?.body
    expect(rule).toBeDefined()
    expect(rule).toMatch(/padding:\s*var\(--spacingVerticalXS\)\s+0;/)
    // 不得再出现横向的 spacingHorizontal*
    expect(rule).not.toMatch(/spacingHorizontal/)
  })

  it('折叠且关闭时不渲染面板标题（上游 ListSizeCompact 把它 Collapsed）', () => {
    // 判据必须是 `!iconOnly`（= m_isClosedCompact），不能是 `displayMode === 'expanded'`：
    // `pane-display-mode="left"` 会算出 expanded，收起后仍占位（真实浏览器实测标题宽 24.59）
    expect(sfc).toMatch(/v-if="paneTitle && !iconOnly"/)
    expect(sfc).not.toMatch(/v-if="paneTitle && displayMode === 'expanded'"/)

    wrapper = makeHost({
      viewProps: { paneTitle: 'Explorer', paneDisplayMode: 'left', defaultIsPaneOpen: false },
    })
    expect(wrapper.find('.fui-navigation-view__pane-title').exists()).toBe(false)
    wrapper.unmount()

    wrapper = makeHost({
      viewProps: { paneTitle: 'Explorer', paneDisplayMode: 'left', defaultIsPaneOpen: true },
    })
    expect(wrapper.find('.fui-navigation-view__pane-title').exists()).toBe(true)
  })

  it('折叠且关闭时不渲染 #paneHeader（上游同一条 ListSizeCompact 规则）', () => {
    expect(sfc).toMatch(/v-if="\$slots\.paneHeader && !iconOnly"/)
    wrapper = mount(
      defineComponent({
        components: { FluereNavigationView },
        template: `
          <FluereNavigationView label="导航" pane-display-mode="left" :default-is-pane-open="false">
            <template #paneHeader><div class="custom-header">H</div></template>
          </FluereNavigationView>
        `,
      }),
    )
    expect(wrapper.find('.custom-header').exists()).toBe(false)
  })

  it('导航项宽度是 auto 而不是 100%（避免 margin 叠加后溢出被裁）', () => {
    // 原实现 `inline-size: 100%` + `margin: 0 4px` = 父宽 + 8px，右侧被面板
    // `overflow: hidden` 裁掉；真实浏览器实测左右间隙 4 / -3、pill 右缘被切 3px。
    const rule = /\.fui-navigation-view__item\s*\{(?<body>[^}]*)\}/.exec(cssStripped)?.groups?.body
    expect(rule).toBeDefined()
    expect(rule).toMatch(/inline-size:\s*auto;/)
    expect(rule).not.toMatch(/inline-size:\s*100%;/)
  })

  it('面板分居线用绝对定位伪元素而非 border（border 会吃掉定宽里的 1px）', () => {
    const rule = /\.fui-navigation-view__pane\s*\{(?<body>[^}]*)\}/.exec(sfcStyle)?.groups?.body
    expect(rule).toBeDefined()
    // 48px 面板若被 1px 边框吃掉，40px 图标列就放不进 47px 内容宽
    expect(rule).not.toMatch(/border-inline-end:\s*var\(--strokeWidthThin\)/)
    expect(rule).not.toMatch(/box-shadow:[^;]*inset/)
    // 伪元素不占布局，且必须用**逻辑**方向（dir="rtl" 时面板镜像到内容区右侧）
    const divider = /\.fui-navigation-view__pane::after\s*\{(?<body>[^}]*)\}/.exec(sfcStyle)?.groups
      ?.body
    expect(divider).toBeDefined()
    expect(divider).toMatch(/position:\s*absolute;/)
    expect(divider).toMatch(/inset-inline-end:\s*0;/)
    expect(divider).toMatch(/inline-size:\s*var\(--strokeWidthThin\)/)
    expect(divider).toMatch(/background-color:\s*var\(--dividerStrokeColorDefault\)/)
    // 物理方向属性会画错边 —— 负面断言守住这条
    expect(divider).not.toMatch(/(^|[^-])right:\s*0;/)
    // 浮层态仍要有 --shadow16
    expect(sfcStyle).toMatch(
      /\.fui-navigation-view__pane\.is-overlaying\s*\{[^}]*var\(--shadow16\)/,
    )
  })

  it('设置项齿轮复用 @fluere-vue/icons 的官方 regular 字形（不是截断的内联 path）', () => {
    // 原内联 path 只有 576 字符 —— 官方 settings_20_regular 是 1022，缺了内圈描边，
    // 渲染成实心黑块；官方 settings_20_filled 是 610（另一套字形，不是这个）
    expect(sfc).toMatch(/import \{ FluentIconNavigation20Regular, FluentIconSettings20Regular \}/)
    expect(sfc).toMatch(/<FluentIconSettings20Regular\s*\/>/)
    // 不得再内联那两条手抄路径
    expect(sfc).not.toMatch(/M1\.91 7\.38/)
    expect(sfc).not.toMatch(/d="M2 4\.5c0-\.28/)
  })

  it('开关按钮与导航项的图标列同宽同列（展开/折叠两态都对得齐）', () => {
    // 开关按钮的图标外套 `.fui-navigation-view__icon`，与导航项复用同一个 40px 图标列；
    // 模板里还保留上游 `ContentPresenter Padding="4,0,0,0"` 的 4px gap
    expect(sfc).toMatch(
      /class="fui-navigation-view__toggle"[\s\S]{0,900}fui-navigation-view__icon[\s\S]{0,200}FluentIconNavigation20Regular/,
    )
    const toggleGap = /\.fui-navigation-view__toggle\s*\{(?<body>[^}]*)\}/.exec(sfcStyle)?.groups
      ?.body
    expect(toggleGap).toMatch(/gap:\s*var\(--spacingHorizontalXS\)/)
    // 图标列 40 与项共用同一个局部变量（`SmallerIconWidth` = 48 - 8）；
    // 行视觉在非 scoped 的 navigation-view.css 里，因此断言打在 cssStripped 上
    expect(cssStripped).toMatch(
      /\.fui-navigation-view__icon\s*\{[^}]*inline-size:\s*var\(--fui-navigation-view-icon-column-width\)/,
    )
  })
})

/* ------------------------------------------------------------------ */
/* ④ 选择语义                                                          */
/* ------------------------------------------------------------------ */

describe('选择语义', () => {
  it('点击项抛 update:selectedValue 与 selectionChanged（含 previousValue）', async () => {
    wrapper = makeHost()
    await itemByValue(wrapper, 'home')?.trigger('click')
    expect(viewEmits(wrapper)['update:selectedValue']?.at(-1)).toEqual(['home'])
    expect(viewEmits(wrapper)['selectionChanged']?.at(-1)).toEqual([
      { value: 'home', previousValue: undefined, isSettingsSelected: false },
    ])

    await itemByValue(wrapper, 'library')?.trigger('click')
    expect(viewEmits(wrapper)['selectionChanged']?.at(-1)).toEqual([
      { value: 'library', previousValue: 'home', isSettingsSelected: false },
    ])
  })

  it('每次 invoke 都抛 itemInvoked（已选中时补抛，对应 :1062-1065）', async () => {
    wrapper = makeHost()
    await itemByValue(wrapper, 'home')?.trigger('click')
    await itemByValue(wrapper, 'home')?.trigger('click')
    expect(viewEmits(wrapper)['itemInvoked']).toHaveLength(2)
    expect(viewEmits(wrapper)['itemInvoked']?.at(-1)?.[0]).toMatchObject({
      value: 'home',
      source: 'pointer',
      isSettingsInvoked: false,
    })
  })

  it('selectsOnInvoked=false 的项：invoke 不改选中但仍抛 itemInvoked（上游 :1048）', async () => {
    wrapper = mount(
      defineComponent({
        components: { FluereNavigationView, FluereNavigationViewItem },
        template: `
          <FluereNavigationView label="导航">
            <FluereNavigationViewItem value="header" content="Header" :selects-on-invoked="false" />
          </FluereNavigationView>
        `,
      }),
      { attachTo: document.body },
    )
    const button = wrapper.find('.fui-navigation-view__item')
    await button.trigger('click')
    expect(viewEmits(wrapper)['update:selectedValue']).toBeUndefined()
    expect(viewEmits(wrapper)['itemInvoked']).toHaveLength(1)
  })

  it('kebab-case 的 :selects-on-invoked="false" 也能被读到（vnode 原始 props 键名）', async () => {
    wrapper = mount(
      defineComponent({
        components: { FluereNavigationView, FluereNavigationViewItem },
        template: `
          <FluereNavigationView label="导航">
            <FluereNavigationViewItem value="x" content="X" :selects-on-invoked="false" />
          </FluereNavigationView>
        `,
      }),
      { attachTo: document.body },
    )
    await wrapper.find('.fui-navigation-view__item').trigger('click')
    expect(viewEmits(wrapper)['update:selectedValue']).toBeUndefined()
  })

  it('内置设置项用保留哨兵值，并抛 isSettingsInvoked=true', async () => {
    wrapper = makeHost()
    const settings = wrapper.find('.fui-navigation-view__settings-button')
    expect(settings.exists()).toBe(true)
    expect(settings.attributes('aria-label')).toBe('设置')
    await settings.trigger('click')
    expect(viewEmits(wrapper)['update:selectedValue']?.at(-1)).toEqual([
      FLUERE_NAVIGATION_SETTINGS_VALUE,
    ])
    expect(viewEmits(wrapper)['selectionChanged']?.at(-1)?.[0]).toMatchObject({
      isSettingsSelected: true,
    })
    expect(viewEmits(wrapper)['itemInvoked']?.at(-1)?.[0]).toMatchObject({
      isSettingsInvoked: true,
    })
  })

  it('isSettingsVisible=false 时不渲染设置项（对齐 IsSettingsVisible 缺省 true）', () => {
    wrapper = makeHost({ viewProps: { isSettingsVisible: false } })
    expect(wrapper.find('.fui-navigation-view__settings-button').exists()).toBe(false)
  })

  it('#settings 插槽可替换内置设置项内容', () => {
    wrapper = mount(
      defineComponent({
        components: { FluereNavigationView },
        template: `
          <FluereNavigationView label="导航">
            <template #settings><button class="custom-settings">自定义设置</button></template>
          </FluereNavigationView>
        `,
      }),
    )
    expect(wrapper.find('.custom-settings').exists()).toBe(true)
    expect(wrapper.find('.fui-navigation-view__settings-button').exists()).toBe(false)
  })

  it('选中项拿 is-selected，且只有一项被选中（单选）', async () => {
    wrapper = makeHost()
    await itemByValue(wrapper, 'home')?.trigger('click')
    const selected = wrapper.findAll('.fui-navigation-view__item.is-selected')
    expect(selected).toHaveLength(1)
    expect(selected[0]?.attributes('data-value')).toBe('home')
  })

  it('受控 selectedValue 由 Prop 决定，组件不自行改', async () => {
    wrapper = makeHost({ viewProps: { selectedValue: 'library' } })
    expect(itemByValue(wrapper, 'library')?.classes()).toContain('is-selected')
    await itemByValue(wrapper, 'home')?.trigger('click')
    // Prop 没变 ⇒ DOM 仍选中 library
    expect(itemByValue(wrapper, 'library')?.classes()).toContain('is-selected')
    expect(viewEmits(wrapper)['update:selectedValue']?.at(-1)).toEqual(['home'])
  })

  it('selectedValue 指向不存在的项时不选中任何项（开发期警告，对应上游回滚 :2281-2292）', () => {
    wrapper = makeHost({ viewProps: { selectedValue: 'nope' } })
    expect(wrapper.findAll('.fui-navigation-view__item.is-selected')).toHaveLength(0)
  })
})

/* ------------------------------------------------------------------ */
/* ⑤ 展开 / 折叠 + isChildSelected                                     */
/* ------------------------------------------------------------------ */

describe('展开折叠与祖先链选中', () => {
  it('点击有子项的项「既选中也展开」（上游 :1067，不是二选一）', async () => {
    wrapper = makeHost()
    await itemByValue(wrapper, 'music')?.trigger('click')
    expect(itemByValue(wrapper, 'music')?.classes()).toContain('is-selected')
    expect(itemByValue(wrapper, 'music')?.attributes('aria-expanded')).toBe('true')
    expect(itemByValue(wrapper, 'albums')).toBeDefined()
  })

  it('再点一次折叠（ToggleIsExpandedNavigationViewItem，上游 :5549-5552）', async () => {
    wrapper = makeHost()
    await itemByValue(wrapper, 'music')?.trigger('click')
    await itemByValue(wrapper, 'music')?.trigger('click')
    expect(itemByValue(wrapper, 'music')?.attributes('aria-expanded')).toBe('false')
    expect(itemByValue(wrapper, 'albums')).toBeUndefined()
  })

  it('选中子项时父项拿 is-child-selected（祖先链回写，上游 :2509-2547）', async () => {
    wrapper = makeHost()
    await itemByValue(wrapper, 'music')?.trigger('click')
    await itemByValue(wrapper, 'albums')?.trigger('click')
    const music = itemByValue(wrapper, 'music')
    expect(music?.classes()).toContain('is-child-selected')
    expect(music?.classes()).not.toContain('is-selected')
  })

  it('指示条画在「自身未选中但后代被选中」的最低可见层（上游 :5562-5593）', async () => {
    // 面板固定展开：Compact 档点击叶子项会关面板（上游 ClosePaneIfNecessaryAfterItemIsClicked），
    // 那样顶层项被强制折叠，量不到「下钻」
    wrapper = makeHost({ viewProps: { isPaneOpen: true, paneDisplayMode: 'left' } })
    await itemByValue(wrapper, 'music')?.trigger('click')
    await itemByValue(wrapper, 'albums')?.trigger('click')
    // 父项展开 ⇒ 指示条下钻到 albums（子项）而不是停在 music
    const musicIndicator = itemByValue(wrapper, 'music')?.find('.fui-navigation-view__indicator')
    const albumsIndicator = itemByValue(wrapper, 'albums')?.find('.fui-navigation-view__indicator')
    expect(albumsIndicator?.classes()).toContain('is-visible')
    expect(musicIndicator?.classes()).not.toContain('is-visible')
  })

  it('父项折叠时指示条停在父项（下钻被「已展开」阻断）', async () => {
    wrapper = makeHost({ viewProps: { isPaneOpen: true, paneDisplayMode: 'left' } })
    await itemByValue(wrapper, 'music')?.trigger('click')
    await itemByValue(wrapper, 'albums')?.trigger('click')
    // 折叠父项：子项不再渲染，指示条回到 music
    await itemByValue(wrapper, 'music')?.trigger('click')
    expect(itemByValue(wrapper, 'albums')).toBeUndefined()
    expect(
      itemByValue(wrapper, 'music')?.find('.fui-navigation-view__indicator').classes(),
    ).toContain('is-visible')
  })

  it('Compact 档点击叶子项会关面板（上游 ClosePaneIfNecessaryAfterItemIsClicked:4847-4853）', async () => {
    wrapper = makeHost({ viewProps: { defaultIsPaneOpen: true, paneDisplayMode: 'left-compact' } })
    await itemByValue(wrapper, 'home')?.trigger('click')
    expect(viewEmits(wrapper)['update:isPaneOpen']?.at(-1)).toEqual([false])
  })

  it('有子项的项点击后不关面板（上游 !DoesNavigationViewItemHaveChildren 前置条件）', async () => {
    wrapper = makeHost({ viewProps: { defaultIsPaneOpen: true, paneDisplayMode: 'left-compact' } })
    await itemByValue(wrapper, 'music')?.trigger('click')
    expect(viewEmits(wrapper)['update:isPaneOpen']).toBeUndefined()
  })

  it('受控 is-expanded 由 Prop 决定，点击只抛事件不改本地状态', async () => {
    wrapper = mount(
      defineComponent({
        components: { FluereNavigationView, FluereNavigationViewItem },
        setup() {
          const expanded = ref(false)
          return { expanded }
        },
        template: `
          <FluereNavigationView label="导航">
            <FluereNavigationViewItem value="p" content="Parent" :is-expanded="expanded">
              <template #children>
                <FluereNavigationViewItem value="c" content="Child" />
              </template>
            </FluereNavigationViewItem>
          </FluereNavigationView>
        `,
      }),
      { attachTo: document.body },
    )
    const parent = wrapper.findAll('.fui-navigation-view__item')[0]
    expect(parent?.attributes('aria-expanded')).toBe('false')
    await parent?.trigger('click')
    // Prop 未变 ⇒ 仍折叠
    expect(wrapper.findAll('.fui-navigation-view__item')[0]?.attributes('aria-expanded')).toBe(
      'false',
    )
  })

  it('hasUnrealizedChildren 也算「有子项」（上游 :5538-5547），并显示 chevron', () => {
    wrapper = mount(
      defineComponent({
        components: { FluereNavigationView, FluereNavigationViewItem },
        template: `
          <FluereNavigationView label="导航">
            <FluereNavigationViewItem value="lazy" content="Lazy" has-unrealized-children />
          </FluereNavigationView>
        `,
      }),
    )
    const button = wrapper.find('.fui-navigation-view__item')
    expect(button.attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('.fui-navigation-view__chevron').exists()).toBe(true)
  })

  it('无子项的项不显示 chevron（上游 HasChildren() 判据）', () => {
    wrapper = makeHost()
    expect(itemByValue(wrapper, 'home')?.find('.fui-navigation-view__chevron').exists()).toBe(false)
    expect(itemByValue(wrapper, 'music')?.find('.fui-navigation-view__chevron').exists()).toBe(true)
  })

  it('紧凑且关闭时隐藏 chevron 且顶层项强制折叠（上游 :645 与 HandleExpansionStateMemory）', async () => {
    wrapper = makeHost({ viewProps: { defaultIsPaneOpen: false } })
    expect(itemByValue(wrapper, 'music')?.find('.fui-navigation-view__chevron').exists()).toBe(
      false,
    )
    expect(itemByValue(wrapper, 'music')?.attributes('aria-expanded')).toBeUndefined()
    expect(itemByValue(wrapper, 'albums')).toBeUndefined()
  })

  it('重新展开面板后恢复被强制折叠的顶层项状态（上游 RestoreExpandedState）', async () => {
    wrapper = makeHost({ viewProps: { defaultIsPaneOpen: true } })
    await itemByValue(wrapper, 'music')?.trigger('click')
    expect(itemByValue(wrapper, 'albums')).toBeDefined()

    // 收起面板 → 顶层项强制折叠
    await wrapper.find('.fui-navigation-view__toggle').trigger('click')
    await nextTick()
    expect(itemByValue(wrapper, 'albums')).toBeUndefined()

    // 重新展开 → 恢复
    await wrapper.find('.fui-navigation-view__toggle').trigger('click')
    await nextTick()
    expect(itemByValue(wrapper, 'albums')).toBeDefined()
  })
})

/* ------------------------------------------------------------------ */
/* ⑥ 键盘                                                             */
/* ------------------------------------------------------------------ */

describe('键盘', () => {
  it('Enter 触发 invoke（HandleKeyEventForNavigationViewItem:2746-2749）', async () => {
    wrapper = makeHost()
    const home = itemByValue(wrapper, 'home')?.element
    pressKey(home, 'Enter')
    await nextTick()
    expect(viewEmits(wrapper)['update:selectedValue']?.at(-1)).toEqual(['home'])
    expect(viewEmits(wrapper)['itemInvoked']?.at(-1)?.[0]).toMatchObject({ source: 'keyboard' })
  })

  it('Space 触发 invoke', async () => {
    wrapper = makeHost()
    pressKey(itemByValue(wrapper, 'library')?.element, ' ')
    await nextTick()
    expect(viewEmits(wrapper)['update:selectedValue']?.at(-1)).toEqual(['library'])
  })

  it('方向键走 roving focus（同层一条扁平列表，等价源码的 XYFocus + 跨层手动聚焦）', () => {
    // 等价性论证写在 navigation-view-items.vue 的文件头表里；这里锁定「用 reka 而非手写」这一实现事实
    expect(itemsSfc).toMatch(/RovingFocusItem/)
    expect(itemsSfc).toMatch(/as-child/)
    expect(itemsSfc).toMatch(/:focusable="!node\.disabled"/)
  })

  it('禁用项 focusable=false（不进焦点环，对齐 SharedHelpers::IsFocusableElement）', () => {
    wrapper = mount(
      defineComponent({
        components: { FluereNavigationView, FluereNavigationViewItem },
        template: `
          <FluereNavigationView label="导航">
            <FluereNavigationViewItem value="a" content="A" />
            <FluereNavigationViewItem value="b" content="B" disabled />
          </FluereNavigationView>
        `,
      }),
    )
    const buttons = wrapper.findAll('.fui-navigation-view__item')
    expect(buttons[1]?.attributes('disabled')).toBeDefined()
    // reka 给不可聚焦项打 data-disabled
    expect(buttons[1]?.attributes('data-disabled')).toBeDefined()
    expect(buttons[0]?.attributes('data-disabled')).toBeUndefined()
  })

  it('源码里没有 Right / Esc 的按键分支（负面证据：上游 NV 对二者零命中）', () => {
    const script = stripComments(sfc)
    expect(script).not.toMatch(/key === 'ArrowRight'/)
    expect(script).not.toMatch(/key === 'Escape'/)
  })

  it('Alt+Space 不处理（上游 :2750-2763 让出系统菜单）', async () => {
    wrapper = makeHost()
    const home = itemByValue(wrapper, 'home')?.element
    let defaultPrevented = true
    home?.addEventListener('keydown', (event) => {
      defaultPrevented = event.defaultPrevented
    })
    pressKey(home, ' ', { altKey: true })
    await nextTick()
    // 既没 invoke，也没 preventDefault（把组合键完整让给宿主 / 系统菜单）
    expect(viewEmits(wrapper)['itemInvoked']).toBeUndefined()
    expect(defaultPrevented).toBe(false)
  })

  it('按住不放（event.repeat）不重复 invoke（上游 KeyStatus().WasKeyDown 判据 :2724）', async () => {
    wrapper = makeHost()
    const home = itemByValue(wrapper, 'home')?.element
    home?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, repeat: true }),
    )
    await nextTick()
    expect(viewEmits(wrapper)['itemInvoked']).toBeUndefined()
  })
})

/* ------------------------------------------------------------------ */
/* ⑦ 样式契约（源码文本断言；jsdom 不解析 var()）                        */
/* ------------------------------------------------------------------ */

describe('样式契约', () => {
  it('所有视觉值走 token 或 --fui-navigation-view-* 局部变量，无裸色值', () => {
    const all = `${sfcStyle}\n${itemsStyle}\n${cssStripped}`
    // 不允许 #RRGGBB / rgb() / hsl() 字面量（transparent 与 currentColor 例外）
    const colorLiterals = [
      ...all.matchAll(/(?<literal>#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\()/g),
    ].map((match) => match[0])
    expect(colorLiterals).toEqual([])
  })

  it('行视觉在非 scoped 的 navigation-view.css 里（两个组件共享同一套行，scopeId 不同）', () => {
    // 主组件的 scoped 块里不再声明行视觉（避免与递归列表组件漂移）
    expect(sfcStyle).not.toMatch(/\.fui-navigation-view__item\s*\{/)
    expect(sfcStyle).not.toMatch(/\.fui-navigation-view__indicator\s*\{/)
    expect(cssStripped).toMatch(/\.fui-navigation-view__item\s*\{/)
    expect(cssStripped).toMatch(/\.fui-navigation-view__indicator\s*\{/)
  })

  it('非 scoped 样式块在 index.ts 里被显式引入（否则整套行视觉静默失效）', () => {
    const indexTs = readFileSync(resolve(here, '../../index.ts'), 'utf8')
    expect(indexTs).toMatch(/import '\.\/src\/navigation-view\/navigation-view\.css'/)
  })

  it('几何逐条对齐 A 级资源：项高 36 / 图标盒 16 / 指示条 3×16 / 分隔线 1', () => {
    expect(constantsTs).toMatch(/NAVIGATION_ITEM_MIN_HEIGHT = 36/)
    expect(constantsTs).toMatch(/NAVIGATION_ITEM_ICON_BOX_HEIGHT = 16/)
    expect(constantsTs).toMatch(/NAVIGATION_SELECTION_INDICATOR_WIDTH = 3/)
    expect(constantsTs).toMatch(/NAVIGATION_SELECTION_INDICATOR_HEIGHT = 16/)
    expect(constantsTs).toMatch(/NAVIGATION_SELECTION_INDICATOR_RADIUS = 2/)
    expect(constantsTs).toMatch(/NAVIGATION_HEADER_ROW_HEIGHT = 40/)
    expect(constantsTs).toMatch(/NAVIGATION_ITEM_INDENTATION = 31/)
    expect(constantsTs).toMatch(/NAVIGATION_DISABLED_OPACITY = 0\.3/)
  })

  it('pane 开合时长来自 SplitView 模板（展开 200ms / 收起 100ms）', () => {
    expect(constantsTs).toMatch(/NAVIGATION_PANE_OPEN_DURATION_MS = 200/)
    expect(constantsTs).toMatch(/NAVIGATION_PANE_CLOSE_DURATION_MS = 100/)
    expect(sfc).toMatch(/--fui-navigation-view-pane-open-duration/)
    expect(sfc).toMatch(/--fui-navigation-view-pane-close-duration/)
  })

  it('chevron 时长取 --durationUltraFast（50ms，单段 ≈48ms 的取整档）', () => {
    expect(constantsTs).toMatch(/NAVIGATION_CHEVRON_DURATION_MS = 50/)
    // 时长在组件里以 token 名登记（AGENTS.md：时长一律走 --duration* 令牌）
    expect(constantsTs).toMatch(
      /NAVIGATION_DURATION_TOKEN_ULTRA_FAST = 'var\(--durationUltraFast\)'/,
    )
    expect(sfc).toMatch(/NAVIGATION_DURATION_TOKEN_ULTRA_FAST/)
  })

  it('不使用裸 z-index（浮层层级只准引用刻度；本组件无浮层，故一处都没有）', () => {
    const all = `${sfcStyle}\n${itemsStyle}\n${cssStripped}`
    expect(all).not.toMatch(/z-index\s*:/)
  })

  it('面板底色与内容区底色走令牌（Acrylic / 透明 / LayerFill）', () => {
    expect(sfcStyle).toMatch(/--acrylicInAppFillColorDefault/)
    expect(sfcStyle).toMatch(/--colorTransparentBackground/)
    expect(sfcStyle).toMatch(/--layerFillColorDefault/)
  })

  it('禁用态不透明度与指示条色走 token / 局部变量', () => {
    expect(cssStripped).toMatch(/--fui-navigation-view-disabled-opacity/)
    expect(cssStripped).toMatch(/--colorBrandBackground/)
    expect(cssStripped).toMatch(/--dividerStrokeColorDefault/)
  })

  it('prefers-reduced-motion 下关掉过渡且保留静态形态', () => {
    expect(cssStripped).toMatch(/@media \(prefers-reduced-motion: reduce\)/)
    expect(sfcStyle).toMatch(/@media \(prefers-reduced-motion: reduce\)/)
    // 静态形态：箭头方向仍由 is-expanded 决定，不依赖动画
    expect(cssStripped).toMatch(
      /\.fui-navigation-view__chevron\.is-expanded[\s\S]{0,60}rotate: 180deg/,
    )
  })

  it('紧凑且关闭时文本保留在无障碍树里（用 clip-path 而不是 display:none）', () => {
    expect(cssStripped).toMatch(/is-icon-only[\s\S]{0,400}clip-path: inset\(50%\)/)
    expect(cssStripped).not.toMatch(/is-icon-only[\s\S]{0,200}display:\s*none/)
  })

  it('无硬编码浮层 / 魔法尺寸：pane 宽度走 --fui-navigation-view-pane-width', () => {
    expect(sfcStyle).toMatch(/inline-size: var\(--fui-navigation-view-pane-width\)/)
  })
})

/* ------------------------------------------------------------------ */
/* ⑧ 包入口导出契约                                                     */
/* ------------------------------------------------------------------ */

describe('包入口导出契约', () => {
  it('四个组件与哨兵常量都从 packages/ui/index.ts 导出', () => {
    const indexTs = readFileSync(resolve(here, '../../index.ts'), 'utf8')
    for (const name of [
      'FluereNavigationView',
      'FluereNavigationViewItem',
      'FluereNavigationViewItemHeader',
      'FluereNavigationViewItemSeparator',
    ]) {
      expect(indexTs, `${name} 必须从包入口导出`).toMatch(new RegExp(`\\b${name}\\b`))
    }
    // 真实事故（2026-10-15）：types / 文档 / 示例都引用了这个常量，但它没被从入口导出，
    // 于是文档站示例 import 到 undefined，SSR/水合整页 500（`Cannot read properties of
    // undefined`），pnpm check 与单测都拦不住（当时还没这个断言）。这条断言守住它。
    expect(indexTs).toMatch(/FLUERE_NAVIGATION_SETTINGS_VALUE/)
    expect(indexTs).toMatch(/from '\.\/src\/navigation-view\/context'/)
  })

  it('三个数据型子组件的值与类型在入口可见（消费方需要在模板里用它们）', () => {
    const indexTs = readFileSync(resolve(here, '../../index.ts'), 'utf8')
    expect(indexTs).toMatch(/FluereNavigationViewProps/)
    expect(indexTs).toMatch(/FluereNavigationViewItemProps/)
    expect(indexTs).toMatch(/FluereNavigationDisplayMode/)
    expect(indexTs).toMatch(/FluereNavigationPaneDisplayMode/)
  })
})

/* ------------------------------------------------------------------ */
/* ⑨ locale 切片                                                       */
/* ------------------------------------------------------------------ */

describe('locale 切片', () => {
  it('4 条文案逐字取自上游 resw（zh-Hans / en 双侧）', () => {
    expect(localeTs).toMatch(/paneToggleButtonClosedName: '打开导航'/)
    expect(localeTs).toMatch(/paneToggleButtonClosedName: 'Open Navigation'/)
    expect(localeTs).toMatch(/paneToggleButtonOpenName: '关闭导航'/)
    expect(localeTs).toMatch(/paneToggleButtonOpenName: 'Close Navigation'/)
    expect(localeTs).toMatch(/settingsButtonName: '设置'/)
    expect(localeTs).toMatch(/settingsButtonName: 'Settings'/)
    expect(localeTs).toMatch(/defaultItemName: 'NavigationViewItem'/)
  })

  it('内置缺省语种是 zh-Hans（无 Provider 时开关按钮读中文）', () => {
    wrapper = makeHost()
    expect(wrapper.find('.fui-navigation-view__toggle').attributes('aria-label')).toBe('关闭导航')
  })

  it('locale Prop 可切到英文', () => {
    wrapper = makeHost({ viewProps: { locale: 'en' } })
    expect(wrapper.find('.fui-navigation-view__toggle').attributes('aria-label')).toBe(
      'Close Navigation',
    )
  })
})

/* ------------------------------------------------------------------ */
/* ⑩ 服务端渲染（SSR）一致性                                            */
/* ------------------------------------------------------------------ */

describe('SSR 直出', () => {
  it('renderToString 不抛错且产出导航结构（setup 期不碰 window）', async () => {
    const { createSSRApp } = await import('vue')
    const { renderToString } = await import('vue/server-renderer')
    const app = createSSRApp({
      render: () =>
        h(
          FluereNavigationView,
          { label: '导航' },
          {
            default: () => [
              h(FluereNavigationViewItem, { value: 'a', content: 'A' }),
              h(FluereNavigationViewItem, { value: 'b', content: 'B' }),
            ],
          },
        ),
    })
    const html = await renderToString(app)
    expect(html).toContain('fui-navigation-view__nav')
    expect(html).toContain('data-value="a"')
    expect(html).toContain('data-value="b"')
  })
})
