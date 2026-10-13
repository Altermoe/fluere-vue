# @fluere-vue/playground

视觉回归页（应用层，`private`）。把「设置页 + 数据录入表单 + 加载 / 提示反馈 + 0.4.x 通用件」的真实组合跑在一个页面里——这些状态在单测里只覆盖契约，看不出**组合起来**是否走形。

## 命令

```bash
pnpm --filter @fluere-vue/playground dev      # 本地开发（默认 60728；被占用时 Vite 自动顺延，看终端输出）
pnpm --filter @fluere-vue/playground build    # 构建
pnpm --filter @fluere-vue/playground tsc      # vue-tsc 类型检查
```

与文档站（`apps/docs`，60727）的区别：文档站负责「讲解 + 可读的示例」，本页负责「密排全状态的一屏陈列」，只服务人工自检；不做内容站与 i18n（页面文案为中文，属应用层，不在文档站 i18n 闸门范围内）。

## 覆盖范围

- **表单（Wave 1）**：Input（含密码形态）/ NumberBox / Select / Combobox / Checkbox / ToggleSwitch / RadioGroup / Slider——含禁用项与禁用整体。
- **按钮族**：Button 五档外观 × 三档尺寸 × 禁用；ToggleButton（未选中 / 选中 / 三态不确定 / 禁用）；ToggleGroup（单选 + 多选，含禁用项）。
- **反馈**：InfoBar（可关闭）、InfoBadge、ProgressBar / ProgressRing（确定 + 不确定）。
- **浮层**：Tooltip（悬停）、ContentDialog（打开 / Esc / 关闭后焦点归还）。
- **主题**：右上角切换明暗（只改 `color-scheme`，token 走 `light-dark()`）。

## 视觉自检清单（每次改组件后过一遍）

1. **六态齐**：rest / hover / pressed / selected / focus / disabled——Tab 走一遍，逐个 hover 与按下。
2. **明暗两态**：无「白闪」、无对比度不足（右上角切换）。
3. **浮层**：Tooltip 悬停出现且在最上层；ContentDialog 打开后 Esc 关闭、焦点回到触发按钮。
4. **焦点环**：按钮族与 Select 是 WinUI 双层矩形（外 2px + 内 1px，紧贴无间隙）。
5. **键盘**：Tab 顺序自上而下；RadioGroup 方向键切换；ToggleGroup 方向键在组内移动焦点。

> 这份清单与 `docs/todo.md`《发布检查（0.4.0 起）》里的「里程碑可验证」互为表里：结论只写在这里与组件注释 / 契约测试里；截图与脚本属过程产物，放 `temp/`，不进仓库。
