# @fluere-vue/ui

基于 Fluent Design 2 设计语言的 Vue 3 组件实现（组件层）。

## 设计原则

- **组件自包含**：内部用 `<style scoped>` + `var(--TokenName)` 实现样式，**不要求消费方配置 UnoCSS**；入口自动引入 `@fluere-vue/designs/tokens.css`（token CSS 变量）。
- **语义优先**：所有颜色/间距/圆角/动效都引用语义 token 名，杜绝硬编码 magic value。
- **明暗主题**：由 `tokens.css` 的 `light-dark()` + `color-scheme` 自动切换。

## 已实现

- `FluereButton` — 5 种外观（primary / secondary / outline / subtle / transparent）× 3 尺寸（24 / 32 / 40px）× 3 形状（rounded / circular / square）+ 禁用 / 选中（toggle）/ 图标 / 块级。
- `FluereInput` — WinUI TextBox / PasswordBox 的还原：3 尺寸（24 / 32 / 40px）× 2 外观（outline / underline）+ 禁用 / 错误态（invalid，`aria-invalid`）+ 标题 / 说明（`header` / `description`，承接 `aria-labelledby` / `aria-describedby`）+ 多行形态（`multiline` / `rows`）+ 密码形态（`passwordRevealMode` 的 peek / hidden / visible、`passwordChar` 掩码字符、按住 `Alt+F8` 显示；掩码状态下 `copy` / `cut` / `dragstart` 一律拦截）+ `v-model`。
- `FluereCombobox` — WinUI ComboBox 的还原：`items` 数据源 + 选中项指示条 + 文本搜索（前缀匹配 / 1000ms 窗口）+ 可编辑态（行内补全 / `TextSubmitted`）+ `SelectionChangedTrigger` + 完整键位与焦点表现（`Focused` / `PointerFocused`）；弹层用 reka Popper 定位，最大高 504px。

## 使用

```ts
import { FluereButton, FluereInput } from '@fluere-vue/ui' // 自动带上 token 变量
```

```vue
<FluereButton appearance="primary">Save</FluereButton>
<FluereInput v-model="text" placeholder="Name" />
```

> 页面级组合布局用 UnoCSS 工具类（精确 token 名）请搭配 `@fluere-vue/themes` 的 `presetFluere`。
