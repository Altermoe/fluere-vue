---
title: Input 输入框
description: 输入框组件，用于获取用户文本输入，支持标题 / 说明、多行与密码形态。
nav:
  title: Input 输入框
---

# Input 输入框

输入框让用户输入单行或多行文本。样式与行为还原 WinUI 3（Windows App SDK）的 **TextBox** 与 **PasswordBox**：三行模板（标题 / 控件 / 说明）、抬升描边与底部高亮、密码显示按钮与 `Alt+F8` 快捷键、掩码字符与密码显示模式都按源码逐条对照。

密码形态有两条掩码路径，取舍见下文[密码框](#密码框)：**不传 `passwordChar`** 走浏览器原生 `type="password"`（保留密码管理器 / 输入法 / 读屏「密码框」语义，掩码字形由浏览器决定）；**传 `passwordChar`** 走「显示缓冲」掩码（字形精确，但输入框在掩码状态是 `type="text"`，读屏与密码管理器不再识别它是密码框）。

## 基础用法

`v-model` 绑定字符串值；事件与原生属性（`autocomplete`、`maxlength`、`aria-describedby`……）直接透传到内部的 `<input>` / `<textarea>`。

::demo-block{title="基础用法"}
#preview
:InputBasicDemo
#code

```vue
<FluereInput v-model="value" placeholder="请输入内容" />
<FluereInput placeholder="禁用状态" disabled />
```

::

## 尺寸

`size` 取 `small`（24px）/ `medium`（32px，默认）/ `large`（40px）。WinUI 的 TextBox 只有 32px 一档，尺寸档是本库扩展；标题与说明的字号随尺寸档一起走。

::demo-block{title="尺寸"}
#preview
:InputSizeDemo
#code

```vue
<FluereInput size="small" placeholder="Small (24px)" />
<FluereInput size="medium" placeholder="Medium (32px)" />
<FluereInput size="large" placeholder="Large (40px)" />
```

::

## 外观

`appearance` 取 `outline`（默认，WinUI 的「抬升描边」：顶 / 左 / 右浅、底边重）或 `underline`（只留底边，库扩展形态）。

::demo-block{title="外观"}
#preview
:InputAppearanceDemo
#code

```vue
<FluereInput appearance="outline" placeholder="Outline（默认）" />
<FluereInput appearance="underline" placeholder="Underline（下划线）" />
```

::

## 标题与说明

`header` 渲染在控件上方（WinUI `TextBox.Header`，下外边距 8px），`description` 渲染在控件下方（`TextBox.Description`，前景取 `TextFillColorSecondary`）。两者分别成为输入框的 `aria-labelledby` / `aria-describedby` 来源，也可用同名插槽替换内容；消费方显式传入 `aria-label` / `aria-describedby` 时不覆盖。

::demo-block{title="标题与说明"}
#preview
:InputHeaderDemo
#code

```vue
<FluereInput v-model="displayName" header="显示名称" description="将展示在个人资料页" />
<FluereInput v-model="email" type="email" description="用于接收通知，不会公开">
  <template #header>邮箱 <span class="text-colorStatusDangerForeground1">*</span></template>
</FluereInput>
```

::

## 多行文本

`multiline` 对应 WinUI `TextBox.AcceptsReturn = true` + `TextWrapping = Wrap`，渲染 `<textarea>`：高度按 `rows`（默认 3）展开，下限取尺寸高度（WinUI `MinHeight` 32），可拖动右下角调整高度。

::demo-block{title="多行文本"}
#preview
:InputMultilineDemo
#code

```vue
<FluereInput v-model="note" multiline header="备注" description="缺省 3 行" />
<FluereInput v-model="feedback" multiline :rows="6" header="反馈" />
```

::

## 错误状态

`invalid` 是本库扩展（WinUI TextBox 无内建错误态）：换成 status danger 描边并渲染 `aria-invalid`，聚焦时底部高亮同样走 danger。

::demo-block{title="错误状态"}
#preview
:InputInvalidDemo
#code

```vue
<FluereInput invalid placeholder="错误输入" aria-describedby="input-error-hint" />
<p id="input-error-hint">请输入有效的内容。</p>
```

::

## 密码框

`type="password"` 对应 WinUI **PasswordBox**：

- **不传 `passwordChar`**：原生 `<input type="password">`。掩码字形由浏览器决定（Chrome / Firefox 画 `•`，WinUI 是 `●`）—— 这是 Web 侧不可消除的差异，换来的是密码管理器、自动填充、输入法组合与读屏「密码框」角色全部照常工作。
- **传 `passwordChar`**（多字符取首个码位）：走「显示缓冲」掩码，与 WinUI 把明文交给 RichEdit 密码模式同构 —— 输入框里放的是掩码串，真值只留在组件状态里，每次编辑按显示差异反推真值。字形精确到指定字符，代价是该状态下输入框是 `type="text"`：**读屏不再把它当密码框**、浏览器也不再提供密码保存 / 填充。

::demo-block{title="密码框"}
#preview
:InputPasswordDemo
#code

```vue
<FluereInput v-model="simple" type="password" placeholder="请输入密码" />
<FluereInput
  v-model="custom"
  type="password"
  header="密码"
  placeholder="请输入密码"
  password-char="#"
/>
```

::

> **复制拦截（两条路径都生效）**：掩码状态下 `copy` / `cut` / `dragstart` 一律被拦下（右键菜单的「复制」、选中后 `Ctrl+C`、拖拽文本都取不到内容），对应 WinUI 密码模式不提供剪贴板出口、以及文本控件的 `TXTBIT_DISABLEDDRAG`。显示明文（`peek` 按住期间或 `visible`）时放行 —— 与「闭眼模式挡住复制」的口径一致。

> **两条路径的浏览器实测差异**：原生路径（未传 `passwordChar`）的控件是 `type="password"`，掩码字形是浏览器的 `•`；显示缓冲路径（传了 `passwordChar`）的控件是 `type="text"`，掩码字形就是指定字符（示例里的 `#`）。两条路径的编辑行为都已在真实浏览器里逐条核验：中间插入 / 中间退格 / 选中替换 / 粘贴 / `Ctrl+Z` 撤销 / `Ctrl+Shift+Z` 重做 / 全选删除后的真值都与输入一致（掩码字形相同，靠 `beforeinput` 的编辑区间 + `inputType` 反推，不靠字形比对）。

## 显示密码

`passwordRevealMode` 对应 WinUI `PasswordBox.PasswordRevealMode`：

| 取值        | 行为                                                                                                                                                                 |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `'peek'`    | **默认**。聚焦 + 本次聚焦期间「空 → 非空」+ 控件宽 > 5em 时，右侧出现「显示」按钮；**按住**期间显示明文、松开即遮蔽。键盘等价物是按住 `Alt` + `F8`（松开 `F8` 遮蔽） |
| `'hidden'`  | 恒遮蔽，不出现按钮                                                                                                                                                   |
| `'visible'` | 恒显示明文，不出现按钮（官方样例即用 CheckBox 在 `hidden` / `visible` 之间切换）                                                                                     |

几条来自 WinUI 源码的细节（都有契约测试守着）：按钮 `tabindex="-1"`（`IsTabStop=False`）不进 Tab 序列；获得焦点时按钮先隐藏，只有本次聚焦期间从空输入了内容才出现；控件宽度不足 5em 时按钮不出现（`ArrangeOverride` 的 `Minimum width … is 5em`）。

::demo-block{title="显示密码"}
#preview
:InputPasswordRevealDemo
#code

```vue
<FluereInput
  v-model="password"
  type="password"
  aria-label="示例密码框"
  :password-reveal-mode="showPassword ? 'visible' : 'hidden'"
/>
<FluereCheckbox v-model="showPassword">Show password</FluereCheckbox>
```

::

## API

| 属性（Props）        | 类型                                                                        | 默认              | 说明                                                                                                                  |
| -------------------- | --------------------------------------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------- |
| `modelValue`         | `string`                                                                    | `—`               | 输入值（`v-model`）                                                                                                   |
| `size`               | `'small' \| 'medium' \| 'large'`                                            | `'medium'`        | 尺寸，高度分别为 24 / 32 / 40 px（WinUI 默认 32）                                                                     |
| `appearance`         | `'outline' \| 'underline'`                                                  | `'outline'`       | 外观；`outline` 对齐 WinUI 的「抬升描边」，`underline` 为库扩展（只保留底边）                                         |
| `disabled`           | `boolean`                                                                   | `false`           | 是否禁用                                                                                                              |
| `invalid`            | `boolean`                                                                   | `false`           | 无效 / 错误态；库扩展（WinUI TextBox 无内建错误态），同时渲染 `aria-invalid`                                          |
| `type`               | `'text' \| 'password' \| 'email' \| 'number' \| 'search' \| 'tel' \| 'url'` | `'text'`          | 原生 `type`（`multiline` 为 true 时忽略）                                                                             |
| `placeholder`        | `string`                                                                    | `—`               | 占位符                                                                                                                |
| `header`             | `string`                                                                    | `—`               | 标题，渲染在控件上方（WinUI `TextBox.Header`）；同时作为可访问名来源                                                  |
| `description`        | `string`                                                                    | `—`               | 说明，渲染在控件下方（WinUI `TextBox.Description`），挂到 `aria-describedby`                                          |
| `multiline`          | `boolean`                                                                   | `false`           | 多行形态（WinUI `AcceptsReturn` + `TextWrapping=Wrap`），渲染 `<textarea>`                                            |
| `rows`               | `number`                                                                    | `3`               | 多行行数（仅 `multiline` 生效）                                                                                       |
| `passwordRevealMode` | `'peek' \| 'hidden' \| 'visible'`                                           | `'peek'`          | 密码显示模式（WinUI `PasswordBox.PasswordRevealMode`，仅 `type="password"` 生效）                                     |
| `passwordChar`       | `string`                                                                    | `—`               | 掩码字符（WinUI `PasswordBox.PasswordChar`）；不传走原生 `type="password"`，传值走显示缓冲掩码（见[密码框](#密码框)） |
| `revealButtonLabel`  | `string`                                                                    | `'Show password'` | 「显示」按钮的无障碍名（对应 WinUI 本地化串 `UIA_PASSWORDBOX_REVEAL`）                                                |

| 插槽（Slots） | 说明                                   |
| ------------- | -------------------------------------- |
| `header`      | 替换标题内容（WinUI `HeaderTemplate`） |
| `description` | 替换说明内容                           |

> **没有额外的 Events**：`modelValue` / `update:modelValue` 由 `v-model` 提供；`input` / `change` / `focus` / `blur` / `keydown` 等原生事件与 `autocomplete`、`maxlength`、`aria-*` 等属性直接透传到内部的 `<input>` / `<textarea>` 上，按原生用法传即可。

> **Web 侧的两处已知差异**（都写进了组件注释，不当作「已对齐实机」）：① 原生 `type="password"` 的掩码字形由浏览器决定，无法指定 WinUI 的 `●`；要指定字形就得用显示缓冲路径（`passwordChar`），代价是读屏 / 密码管理器不再识别密码框。② 显式 `passwordChar` 时 WinUI 会在密码模式下禁掉输入法（`InputScope = IS_PASSWORD`），Web 侧无法禁用输入法，只能在 IME 组合期间用 `-webkit-text-security` 兜住明文、组合结束后再收敛成掩码串。
