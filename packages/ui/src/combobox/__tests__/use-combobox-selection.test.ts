/* oxlint-disable no-magic-numbers -- 断言里的字面量就是被测输入与期望值，抽成常量反而更难读 */
/**
 * 取值层：受控 / 非受控取值 + WinUI 的「SelectedValue ↔ Text」双通道。
 *
 * 该 hook 只依赖 computed / ref / watch，不依赖组件实例 —— 直接调用即可，无需挂载；
 * 组件侧的契约测试只负责验证这些回调真的绑到了模板上。
 */
import { describe, expect, it, vi } from 'vitest'
import { nextTick, reactive } from 'vue'
import type { FluereComboboxItem, FluereComboboxSelectionChangedEventArgs } from '../types'
import { useComboboxSelection } from '../use-combobox-selection'
import type { ComboboxSelectionEvents, ComboboxSelectionProps } from '../use-combobox-selection'

const FRUITS: FluereComboboxItem<string>[] = [
  { value: 'a', text: 'Apple' },
  { value: 'b', text: 'Banana' },
  { value: 'c', text: 'Cherry', disabled: true },
  { value: 'd', text: 'Durian' },
]

const createHarness = <T>(props: ComboboxSelectionProps<T> = {}) => {
  const state = reactive<ComboboxSelectionProps<T>>({ items: FRUITS as never, ...props })
  const valueChange = vi.fn()
  const selectionChanged = vi.fn()
  const textChange = vi.fn()
  const events: ComboboxSelectionEvents<T> = { valueChange, selectionChanged, textChange }
  const model = useComboboxSelection<T>(state as ComboboxSelectionProps<T>, events)
  return { state, model, valueChange, selectionChanged, textChange }
}

describe('useComboboxSelection 取值通道', () => {
  it('非受控：defaultValue 起手，setValue 写本地值并抛两个事件', () => {
    const { model, valueChange, selectionChanged } = createHarness<string>({ defaultValue: 'a' })
    expect(model.currentValue.value).toBe('a')
    expect(model.selectedIndex.value).toBe(0)

    model.setValue('b')
    expect(model.currentValue.value).toBe('b')
    expect(valueChange).toHaveBeenLastCalledWith('b')
    expect(selectionChanged).toHaveBeenLastCalledWith({
      addedItem: 'b',
      removedItem: 'a',
      addedIndex: 1,
      removedIndex: 0,
    })
  })

  it('受控：以 modelValue 为事实源，写入只抛事件不本地生效，父级回写后同步', async () => {
    const { state, model, valueChange } = createHarness<string>({ modelValue: 'a' })
    model.setValue('b')
    expect(model.currentValue.value).toBe('a')
    expect(valueChange).toHaveBeenLastCalledWith('b')

    state.modelValue = 'b'
    await nextTick()
    expect(model.currentValue.value).toBe('b')
  })

  it('值相同不抛事件（by 字段比较也算相同）', () => {
    const rows = [{ id: 1 }, { id: 2 }]
    const { model, valueChange, selectionChanged } = createHarness<{ id: number }>({
      items: rows.map((row) => ({ value: row })),
      by: 'id',
      modelValue: { id: 1 },
    })
    model.setValue({ id: 1 })
    expect(valueChange).not.toHaveBeenCalled()
    expect(selectionChanged).not.toHaveBeenCalled()
  })

  it('无选中是 null：selectionChanged 的 removedIndex 为 -1', () => {
    const { model, selectionChanged } = createHarness<string>()
    model.setValue('a')
    const args = selectionChanged.mock.calls[0]?.[0] as FluereComboboxSelectionChangedEventArgs
    expect(args.removedItem).toBeNull()
    expect(args.removedIndex).toBe(-1)
    expect(args.addedIndex).toBe(0)
  })
})

describe('useComboboxSelection 方向 / 端点选区', () => {
  it('selectRelative 跳过禁用项，端点即停', () => {
    const { model, valueChange } = createHarness<string>({ defaultValue: 'b' })
    model.selectRelative(1)
    expect(valueChange).toHaveBeenLastCalledWith('d')

    model.setValue('d')
    valueChange.mockClear()
    model.selectRelative(1)
    expect(valueChange).not.toHaveBeenCalled()
  })

  it('无选中时 ↓ 取第一项、↑ 取最后一项', () => {
    const down = createHarness<string>()
    down.model.selectRelative(1)
    expect(down.valueChange).toHaveBeenLastCalledWith('a')

    const up = createHarness<string>()
    up.model.selectRelative(-1)
    expect(up.valueChange).toHaveBeenLastCalledWith('d')
  })

  it('selectBoundary 取首 / 尾可选项', () => {
    const { model, valueChange } = createHarness<string>({ defaultValue: 'd' })
    model.selectBoundary('first')
    expect(valueChange).toHaveBeenLastCalledWith('a')
    model.selectBoundary('last')
    expect(valueChange).toHaveBeenLastCalledWith('d')
  })
})

describe('useComboboxSelection 文本双通道（WinUI Text ↔ SelectedItem）', () => {
  it('displayText / inputText / formValue 的三种口径', () => {
    const readonly = createHarness<string>({ defaultValue: 'a' })
    expect(readonly.model.displayText.value).toBe('Apple')
    expect(readonly.model.inputText.value).toBe('Apple')
    expect(readonly.model.formValue.value).toBe('a')

    const editable = createHarness<string>({ defaultValue: 'a', editable: true })
    expect(editable.model.inputText.value).toBe('') // 可编辑态跟用户文本，不跟选中项

    const none = createHarness<string>()
    expect(none.model.displayText.value).toBe('')
    expect(none.model.formValue.value).toBe('')
  })

  it('可编辑态非受控：选中变化用项文本回填 Text', () => {
    const { model, textChange } = createHarness<string>({
      defaultValue: 'a',
      editable: true,
      defaultText: 'Apple',
    })
    model.setValue('b')
    expect(model.currentText.value).toBe('Banana')
    expect(textChange).toHaveBeenLastCalledWith('Banana')
  })

  it('可编辑态 keepText：提交自定义文本后父级回写也不覆盖用户输入', async () => {
    const { state, model, textChange } = createHarness<string>({
      modelValue: 'a',
      editable: true,
      text: 'Apple',
    })
    model.setValue(null, { keepText: true })
    state.modelValue = null // 父级回写「无选中」
    await nextTick()

    expect(model.currentText.value).toBe('Apple')
    expect(textChange).not.toHaveBeenCalled()
  })

  it('可编辑态受控：父级改写 modelValue 即回抛项文本（v-model:text 写回后生效）', async () => {
    const { state, model, textChange } = createHarness<string>({
      modelValue: 'a',
      editable: true,
      text: 'Apple',
    })
    textChange.mockImplementation((value: string) => {
      state.text = value // 模拟父级对 v-model:text 的写回
    })
    state.modelValue = 'd'
    await nextTick()

    expect(textChange).toHaveBeenLastCalledWith('Durian')
    expect(model.currentText.value).toBe('Durian')
  })

  it('不可编辑态：父级改写 modelValue 不碰文本', async () => {
    const { state, model, textChange } = createHarness<string>({ modelValue: 'a' })
    state.modelValue = 'd'
    await nextTick()
    expect(textChange).not.toHaveBeenCalled()
    expect(model.displayText.value).toBe('Durian')
  })

  it('initEditableText：挂载时用选中项文本填充，消费方给了文本则不覆盖', () => {
    const filled = createHarness<string>({ modelValue: 'a', editable: true })
    filled.model.initEditableText()
    expect(filled.model.currentText.value).toBe('Apple')

    const kept = createHarness<string>({
      modelValue: 'a',
      editable: true,
      defaultText: 'custom',
    })
    kept.model.initEditableText()
    expect(kept.model.currentText.value).toBe('custom')
  })
})

describe('useComboboxSelection reka 底座的类型放宽', () => {
  it('rootModelValue：null 只做类型放宽（运行时值不变）；rootDefaultValue 缺省为 undefined', () => {
    const none = createHarness<string>()
    expect(none.model.rootModelValue.value).toBeNull()
    expect(none.model.rootDefaultValue.value).toBeUndefined()

    const some = createHarness<string>({ modelValue: 'a' })
    expect(some.model.rootModelValue.value).toBe('a')

    const init = createHarness<string>({ defaultValue: 'b' })
    expect(init.model.rootDefaultValue.value).toBe('b')
  })
})
