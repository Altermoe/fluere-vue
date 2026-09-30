/* oxlint-disable prefer-named-capture-group, no-magic-numbers -- 样式契约测试要读 SFC 源码做文本解析，正则与下标属测试细节 */
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import FluereContentDialog from './content-dialog.vue'
import dialogSfc from './content-dialog.vue?raw'

/**
 * 契约测试：FluereContentDialog。
 *
 * 对照来源：WinUI 3（microsoft-ui-xaml winui3/release/2.5.1）
 *   src/controls/dev/CommonStyles/ContentDialog_themeresources.xaml
 *   src/dxaml/xcp/dxaml/lib/ContentDialog_Partial.cpp
 *   src/dxaml/xcp/dxaml/lib/LayoutTransition_partial.cpp#2251（弹层动画 Storyboard）
 *   src/controls/test/MUXControlsTestApp/verification/ContentDialog.xml
 *
 * jsdom 不解析 `<style scoped>`（也解析不了 `var()`），因此几何 / 配色 / 关键帧
 * 一律退回「断言 SFC 源码里的声明」；冻结帧像素测量由 temp/pw-content-dialog.mjs 负责。
 */
const readStyleText = (): string =>
  (/<style[^>]*>(?<css>[\s\S]*?)<\/style>/.exec(dialogSfc)?.groups?.css ?? '').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  )

const readStyleRules = (): Map<string, string> => {
  const rules = new Map<string, string>()
  for (const block of readStyleText()
    .replace(/@media[^{]*{/g, '')
    .split('}')) {
    const [selectorText, declarations] = block.split('{')
    if (selectorText === undefined || declarations === undefined) {
      continue
    }
    const decl = declarations.replace(/\s+/g, ' ').trim()
    for (const selector of selectorText.split(',')) {
      const key = selector.replace(/\s+/g, ' ').trim()
      if (!key) {
        continue
      }
      const prev = rules.get(key)
      rules.set(key, prev ? `${prev} ${decl}` : decl)
    }
  }
  return rules
}

const readKeyframes = (name: string): string =>
  (new RegExp(`@keyframes\\s+${name}\\s*\\{([\\s\\S]*?)^\\}`, 'm').exec(readStyleText())?.[1] ?? '')
    .replace(/\s+/g, ' ')
    .trim()

const rules = readStyleRules()

/** 弹窗内容与遮罩都 Teleport 到 body，统一从 document.body 取 */
const query = <TElement extends HTMLElement = HTMLElement>(selector: string): TElement | null =>
  document.body.querySelector<TElement>(selector)

interface MountOptions {
  open?: boolean
  props?: Record<string, unknown>
  slotHtml?: string
}

const mountDialog = ({ open = true, props = {}, slotHtml }: MountOptions = {}) => {
  const wrapper = mount(FluereContentDialog, {
    props: { open, ...props },
    slots: slotHtml === undefined ? undefined : { default: slotHtml },
    attachTo: document.body,
  })
  return wrapper
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('FluereContentDialog 渲染契约', () => {
  it('默认不打开时不渲染任何弹层标记', () => {
    mountDialog({ open: false })
    expect(query('[role="dialog"]')).toBeNull()
    expect(query('.fui-smoke')).toBeNull()
  })

  it('open=true 时渲染 role=dialog / aria-modal，并同时渲染遮罩层', async () => {
    mountDialog()
    await nextTick()

    const dialog = query('[role="dialog"]')
    expect(dialog).not.toBeNull()
    expect(dialog?.classList.contains('fui-content-dialog')).toBe(true)
    expect(dialog?.getAttribute('aria-modal')).toBe('true')
    expect(dialog?.getAttribute('data-state')).toBe('open')

    // 遮罩层独立 Teleport，且在弹窗之前（DOM 顺序决定绘制次序）
    const smoke = query('.fui-smoke')
    expect(smoke).not.toBeNull()
    expect(smoke?.getAttribute('aria-hidden')).toBe('true')
    expect(smoke!.compareDocumentPosition(dialog!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('标题、正文与可访问名（有标题走 aria-labelledby，无标题时 title 元素承载 ariaLabel）', async () => {
    const wrapper = mountDialog({
      props: { title: '删除草稿？' },
      slotHtml: '<p>此操作不可撤销</p>',
    })
    await nextTick()

    const dialog = query('[role="dialog"]')
    const titleId = dialog?.getAttribute('aria-labelledby')
    expect(titleId).toBeTruthy()
    const title = document.getElementById(titleId as string)
    expect(title?.textContent).toContain('删除草稿？')
    expect(query('.fui-content-dialog__content')?.textContent).toContain('此操作不可撤销')
    expect(query('.fui-content-dialog__title')?.hasAttribute('hidden')).toBe(false)

    wrapper.unmount()
    document.body.innerHTML = ''

    mountDialog({ props: { ariaLabel: '确认对话框' } })
    await nextTick()
    const noTitleDialog = query('[role="dialog"]')
    const hiddenTitle = document.getElementById(
      noTitleDialog?.getAttribute('aria-labelledby') as string,
    )
    expect(hiddenTitle?.hasAttribute('hidden')).toBe(true)
    // 折叠但仍承载可访问名（对齐 WinUI：Title 为空只折叠标题位，不取消可访问名通道）
    expect(hiddenTitle?.textContent).toContain('确认对话框')
  })
})

describe('FluereContentDialog 命令区契约（ButtonsVisibilityStates）', () => {
  it('三个文案齐备 → data-buttons=all，三个按钮都在且可见', async () => {
    mountDialog({
      props: { primaryButtonText: '保存', secondaryButtonText: '不保存', closeButtonText: '取消' },
    })
    await nextTick()

    expect(query('.fui-content-dialog')?.getAttribute('data-buttons')).toBe('all')
    expect(query('.fui-content-dialog__button--primary')?.textContent).toContain('保存')
    expect(query('.fui-content-dialog__button--secondary')?.textContent).toContain('不保存')
    expect(query('.fui-content-dialog__button--close')?.textContent).toContain('取消')
  })

  it('无任何按钮文案 → CommandSpace 不渲染（NoneVisible）', async () => {
    mountDialog()
    await nextTick()
    expect(query('.fui-content-dialog')?.getAttribute('data-buttons')).toBe('none')
    expect(query('.fui-content-dialog__command')).toBeNull()
  })

  it('只给主按钮 → data-buttons=primary，且只有主按钮', async () => {
    mountDialog({ props: { primaryButtonText: '确定' } })
    await nextTick()
    expect(query('.fui-content-dialog')?.getAttribute('data-buttons')).toBe('primary')
    expect(query('.fui-content-dialog__button--primary')).not.toBeNull()
    expect(query('.fui-content-dialog__button--secondary')).toBeNull()
    expect(query('.fui-content-dialog__button--close')).toBeNull()
  })

  it('isPrimaryButtonEnabled=false 时主按钮禁用（对应 IsPrimaryButtonEnabled）', async () => {
    mountDialog({ props: { primaryButtonText: '确定', isPrimaryButtonEnabled: false } })
    await nextTick()
    expect(query<HTMLButtonElement>('.fui-content-dialog__button--primary')?.disabled).toBe(true)
  })

  it('fullSizeDesired → data-sizing=full（对应 FullDialogSizing）', async () => {
    mountDialog({ props: { fullSizeDesired: true } })
    await nextTick()
    expect(query('.fui-content-dialog')?.getAttribute('data-sizing')).toBe('full')
  })
})

describe('FluereContentDialog 默认按钮强调态（DefaultButtonStates）', () => {
  it('焦点不在命令区时，默认按钮获得强调样式', async () => {
    mountDialog({
      props: { primaryButtonText: '确定', secondaryButtonText: '取消', defaultButton: 'primary' },
    })
    await nextTick()
    expect(
      query('.fui-content-dialog__button--primary')?.classList.contains('fui-button--primary'),
    ).toBe(true)
    expect(
      query('.fui-content-dialog__button--secondary')?.classList.contains('fui-button--primary'),
    ).toBe(false)
  })

  it('焦点落在命令区其它按钮上时强调态消失（WinUI 的 NoDefaultButton 分支）', async () => {
    mountDialog({
      props: { primaryButtonText: '确定', secondaryButtonText: '取消', defaultButton: 'primary' },
    })
    await nextTick()

    query('.fui-content-dialog__button--secondary')?.dispatchEvent(
      new FocusEvent('focusin', { bubbles: true }),
    )
    await nextTick()
    expect(
      query('.fui-content-dialog__button--primary')?.classList.contains('fui-button--primary'),
    ).toBe(false)
  })
})

describe('FluereContentDialog 事件契约（Closing / Closed / ButtonClick）', () => {
  it('点击主按钮：PrimaryButtonClick → Closing(primary) → update:open(false) → Closed(primary)', async () => {
    const wrapper = mountDialog({
      props: { primaryButtonText: '确定', secondaryButtonText: '取消' },
    })
    await nextTick()

    query('.fui-content-dialog__button--primary')?.click()
    await nextTick()

    expect(wrapper.emitted('primaryButtonClick')).toHaveLength(1)
    expect(wrapper.emitted('closing')?.[0]?.[0]).toStrictEqual({ result: 'primary', cancel: false })
    expect(wrapper.emitted('update:open')?.[0]).toStrictEqual([false])
    // 退出动画未结束前不抛 Closed
    expect(wrapper.emitted('closed')).toBeUndefined()

    // 父组件回写 + 退出动画结束（jsdom 不跑动画，手动派发 animationend）
    await wrapper.setProps({ open: false })
    query('.fui-content-dialog')?.dispatchEvent(new Event('animationend', { bubbles: true }))
    await nextTick()
    expect(wrapper.emitted('closed')?.[0]?.[0]).toStrictEqual({ result: 'primary' })
  })

  it('点击次按钮 → Closed(secondary)；点击关闭按钮 → Closed(none)', async () => {
    const secondary = mountDialog({
      props: { primaryButtonText: '确定', secondaryButtonText: '取消' },
    })
    await nextTick()
    query('.fui-content-dialog__button--secondary')?.click()
    await nextTick()
    expect(secondary.emitted('closing')?.[0]?.[0]).toStrictEqual({
      result: 'secondary',
      cancel: false,
    })
    secondary.unmount()
    document.body.innerHTML = ''

    const close = mountDialog({ props: { closeButtonText: '关闭' } })
    await nextTick()
    query('.fui-content-dialog__button--close')?.click()
    await nextTick()
    expect(close.emitted('closeButtonClick')).toHaveLength(1)
    expect(close.emitted('closing')?.[0]?.[0]).toStrictEqual({ result: 'none', cancel: false })
  })

  it('closing 被取消时不关闭、不进入退出流程', async () => {
    const wrapper = mount(FluereContentDialog, {
      props: {
        open: true,
        primaryButtonText: '确定',
        onClosing: (args: { cancel: boolean }) => {
          args.cancel = true
        },
      },
      attachTo: document.body,
    })
    await nextTick()

    query('.fui-content-dialog__button--primary')?.click()
    await nextTick()

    expect(wrapper.emitted('closing')).toHaveLength(1)
    expect(wrapper.emitted('update:open')).toBeUndefined()
    expect(wrapper.emitted('closed')).toBeUndefined()
    wrapper.unmount()
  })

  it('按钮点击被取消时不产生 Closing（args.cancel）', async () => {
    const wrapper = mount(FluereContentDialog, {
      props: {
        open: true,
        primaryButtonText: '确定',
        onPrimaryButtonClick: (args: { cancel: boolean }) => {
          args.cancel = true
        },
      },
      attachTo: document.body,
    })
    await nextTick()
    query('.fui-content-dialog__button--primary')?.click()
    await nextTick()

    expect(wrapper.emitted('primaryButtonClick')).toHaveLength(1)
    expect(wrapper.emitted('closing')).toBeUndefined()
    expect(wrapper.emitted('update:open')).toBeUndefined()
  })

  it('Escape：有可点的关闭按钮时先走 CloseButtonClick（对齐 ExecuteCloseAction）', async () => {
    const wrapper = mountDialog({ props: { closeButtonText: '关闭' } })
    await nextTick()

    const dialog = query('.fui-content-dialog')
    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    dialog?.dispatchEvent(escape)
    await nextTick()

    // 原生 Escape 事件由 reka 的 DismissableLayer 转发为 escapeKeyDown
    expect(wrapper.emitted('closeButtonClick')).toHaveLength(1)
    expect(wrapper.emitted('closing')?.[0]?.[0]).toStrictEqual({ result: 'none', cancel: false })
  })

  it('Escape：没有关闭按钮时直接以 none 关闭', async () => {
    const wrapper = mountDialog({ props: { primaryButtonText: '确定' } })
    await nextTick()

    query('.fui-content-dialog')?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    )
    await nextTick()

    expect(wrapper.emitted('closeButtonClick')).toBeUndefined()
    expect(wrapper.emitted('closing')?.[0]?.[0]).toStrictEqual({ result: 'none', cancel: false })
  })

  it('Opened：打开状态翻转时抛一次（含首次挂载即打开）', async () => {
    const initial = mountDialog({ props: { primaryButtonText: '确定' } })
    await nextTick()
    expect(initial.emitted('opened')).toHaveLength(1)
    initial.unmount()
    document.body.innerHTML = ''

    const toggled = mountDialog({ open: false, props: { primaryButtonText: '确定' } })
    await nextTick()
    expect(toggled.emitted('opened')).toBeUndefined()
    await toggled.setProps({ open: true })
    await nextTick()
    expect(toggled.emitted('opened')).toHaveLength(1)
  })
})

describe('FluereContentDialog 焦点策略（SetInitialFocusElement）', () => {
  it('初始焦点落在内容区第一个可聚焦元素上', async () => {
    mountDialog({
      props: { primaryButtonText: '确定', defaultButton: 'primary' },
      slotHtml: '<input class="first-field" /><input class="second-field" />',
    })
    await nextTick()
    await nextTick()

    expect(document.activeElement?.classList.contains('first-field')).toBe(true)
  })

  it('内容区没有可聚焦元素时落到默认按钮', async () => {
    mountDialog({
      props: { primaryButtonText: '确定', secondaryButtonText: '取消', defaultButton: 'secondary' },
      slotHtml: '<p>纯文本</p>',
    })
    await nextTick()
    await nextTick()

    expect(
      document.activeElement?.classList.contains('fui-content-dialog__button--secondary'),
    ).toBe(true)
  })

  it('关闭后焦点回到弹出前聚焦的元素', async () => {
    const trigger = document.createElement('button')
    trigger.className = 'outside-trigger'
    document.body.append(trigger)
    trigger.focus()
    expect(document.activeElement).toBe(trigger)

    const wrapper = mountDialog({ props: { primaryButtonText: '确定' } })
    await nextTick()
    await nextTick()

    await wrapper.setProps({ open: false })
    query('.fui-content-dialog')?.dispatchEvent(new Event('animationend', { bubbles: true }))
    await nextTick()
    expect(document.activeElement).toBe(trigger)
  })

  it('Enter：焦点不在会自行处理 Enter 的元素上时激活默认按钮', async () => {
    const wrapper = mountDialog({
      props: { primaryButtonText: '确定', secondaryButtonText: '取消', defaultButton: 'primary' },
      slotHtml: '<div class="plain">纯文本</div>',
    })
    await nextTick()

    const plain = query('.plain')
    plain?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    )
    await nextTick()
    expect(wrapper.emitted('primaryButtonClick')).toHaveLength(1)

    wrapper.unmount()
    document.body.innerHTML = ''

    // 焦点在文本框里时不接管 Enter（Web 侧差异，见组件注释）
    const withInput = mountDialog({
      props: { primaryButtonText: '确定', defaultButton: 'primary' },
      slotHtml: '<input class="field" />',
    })
    await nextTick()
    query('.field')?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    )
    await nextTick()
    expect(withInput.emitted('primaryButtonClick')).toBeUndefined()
  })
})

describe('FluereContentDialog 样式契约（WinUI 几何 / 配色 / 关键帧）', () => {
  it('几何：MinWidth 320 / MaxWidth 548 / MinHeight 184 / MaxHeight 756 / 圆角 8 / 描边 1', () => {
    const surface = rules.get('.fui-content-dialog__surface') ?? ''
    expect(surface).toContain('--fui-content-dialog-min-width: 320px')
    expect(surface).toContain('--fui-content-dialog-max-width: 548px')
    expect(surface).toContain('--fui-content-dialog-min-height: 184px')
    expect(surface).toContain('--fui-content-dialog-max-height: 756px')
    expect(surface).toContain('border-radius: var(--borderRadiusXLarge)')
    expect(surface).toContain(
      'border: var(--strokeWidthThin) solid var(--fui-content-dialog-border)',
    )
  })

  it('内边距 / 标题间距 / 按钮间距：24 / 12 / 8，标题 20 SemiBold、正文 14', () => {
    expect(rules.get('.fui-content-dialog__body')).toContain(
      'padding: var(--spacingVerticalXXL) var(--spacingHorizontalXXL)',
    )
    expect(rules.get('.fui-content-dialog__title')).toContain('margin: 0 0 var(--spacingVerticalM)')
    expect(rules.get('.fui-content-dialog__title')).toContain('font-size: var(--fontSizeBase500)')
    expect(rules.get('.fui-content-dialog__title')).toContain(
      'font-weight: var(--fontWeightSemibold)',
    )
    expect(rules.get('.fui-content-dialog__content')).toContain('font-size: var(--fontSizeBase300)')
    expect(rules.get('.fui-content-dialog__command')).toContain('--spacingHorizontalS) 1fr')
  })

  it('命令区 5 列网格与八态落位与 WinUI 模板一致', () => {
    const command = rules.get('.fui-content-dialog__command') ?? ''
    expect(command).toContain('grid-template-columns:')
    expect(command).toContain('--fui-content-dialog-first-spacer: 0px')
    expect(command).toContain('--fui-content-dialog-secondary-column: 0px')

    const allCommand = rules.get(
      ".fui-content-dialog[data-buttons='all'] .fui-content-dialog__command",
    )
    expect(allCommand).toContain('--fui-content-dialog-first-spacer: var(--spacingHorizontalS)')
    expect(allCommand).toContain('--fui-content-dialog-secondary-column: 1fr')

    expect(rules.get('.fui-content-dialog__button--primary')).toContain('grid-column: 1')
    expect(rules.get('.fui-content-dialog__button--secondary')).toContain('grid-column: 3')
    expect(rules.get('.fui-content-dialog__button--close')).toContain('grid-column: 5')
    expect(
      rules.get(".fui-content-dialog[data-buttons='primary'] .fui-content-dialog__button--primary"),
    ).toContain('grid-column: 5')
    expect(
      rules.get(
        ".fui-content-dialog[data-buttons='primary-secondary'] .fui-content-dialog__button--secondary",
      ),
    ).toContain('grid-column: 5')
  })

  it('动效：缩放 250ms / 167ms + 淡入淡出 83ms linear（与 ThemeTransition 关键帧同源）', () => {
    expect(rules.get(".fui-content-dialog[data-state='open']")).toContain(
      'animation: fui-content-dialog-scale-in var(--durationGentle) var(--curveDecelerateMid) both',
    )
    expect(rules.get(".fui-content-dialog[data-state='closed']")).toContain(
      'animation: fui-content-dialog-scale-out var(--fui-content-dialog-close-scale-duration) var(--curveDecelerateMid) both',
    )
    expect(rules.get('.fui-content-dialog')).toContain(
      '--fui-content-dialog-close-scale-duration: 167ms',
    )
    expect(rules.get('.fui-content-dialog')).toContain('--fui-content-dialog-fade-duration: 83ms')
    expect(rules.get(".fui-content-dialog__surface[data-state='open']")).toContain(
      'animation: fui-content-dialog-fade-in var(--fui-content-dialog-fade-duration) linear both',
    )
    expect(rules.get(".fui-content-dialog__surface[data-state='closed']")).toContain(
      'animation: fui-content-dialog-fade-out var(--fui-content-dialog-fade-duration) linear both',
    )
  })

  it('关键帧起止值：scale 1.05↔1、opacity 0↔1', () => {
    expect(readKeyframes('fui-content-dialog-scale-in')).toContain(
      'from { transform: scale(1.05); }',
    )
    expect(readKeyframes('fui-content-dialog-scale-in')).toContain('to { transform: scale(1); }')
    expect(readKeyframes('fui-content-dialog-scale-out')).toContain('from { transform: scale(1); }')
    expect(readKeyframes('fui-content-dialog-scale-out')).toContain(
      'to { transform: scale(1.05); }',
    )
    expect(readKeyframes('fui-content-dialog-fade-in')).toContain('from { opacity: 0; }')
    expect(readKeyframes('fui-content-dialog-fade-in')).toContain('to { opacity: 1; }')
    expect(readKeyframes('fui-content-dialog-fade-out')).toContain('from { opacity: 1; }')
    expect(readKeyframes('fui-content-dialog-fade-out')).toContain('to { opacity: 0; }')
  })

  it('prefers-reduced-motion 下关闭动画且保留最终静态形态', () => {
    expect(readStyleText()).toContain('@media (prefers-reduced-motion: reduce)')
    expect(rules.get('.fui-content-dialog[data-state]')).toContain('animation: none')
    expect(rules.get('.fui-content-dialog__surface[data-state]')).toContain('animation: none')
  })

  it('配色全部走 token / 局部变量，样式块内无硬编码色值', () => {
    const surface = rules.get('.fui-content-dialog__surface') ?? ''
    expect(surface).toContain('--fui-content-dialog-surface: var(--colorNeutralBackground2)')
    expect(surface).toContain('--fui-content-dialog-layer: var(--colorNeutralBackground1)')
    expect(surface).toContain('--fui-content-dialog-border: var(--colorNeutralStroke2)')
    expect(surface).toContain('--fui-content-dialog-separator: var(--colorNeutralStrokeAlpha)')
    expect(readStyleText()).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(readStyleText()).not.toMatch(/\brgba?\(/)
  })
})
