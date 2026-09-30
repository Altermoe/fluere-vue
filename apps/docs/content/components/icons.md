---
title: Icons 图标库
description: WinUI 3 / Fluent System Icons 的 Vue3 图标组件。
nav:
  title: Icons 图标库
---

# Icons 图标库

WinUI 3 / Fluent System Icons 的 Vue3 图标组件，生成自官方开源包 `@fluentui/svg-icons`
（MIT，即 Segoe Fluent Icons 字体的矢量源）。共 2953 个图标名 × 10 / 12 / 16 / 20 / 24 / 28 / 32 / 48 尺寸 × regular / filled 风格。

## 用法

::demo-block{title="用法"}
#preview
:IconsUsageDemo
#code

```vue
import { FluentIconAdd20Filled } from '@fluere-vue/icons'

<FluentIconAdd20Filled />
<FluentIconAdd20Filled size="24" title="添加" />
```

::

## 图标浏览器

支持按图标名搜索、按尺寸与风格筛选，点击任意图标复制组件名。

:IconsBrowserDemo

## API

每个图标都是一个独立组件，导出名规则为 `FluentIcon{Name}{Size}{Style}`：

- `{Name}`：图标名转 PascalCase，如 `accessibility_checkmark` → `AccessibilityCheckmark`；
- `{Size}`：`10` / `12` / `16` / `20` / `24` / `28` / `32` / `48`；
- `{Style}`：`Regular` / `Filled`。

例：`FluentIconAdd20Filled`、`FluentIconAccessibilityCheckmark24Regular`。

| 属性（Props） | 类型               | 默认             | 说明                                                                                                    |
| ------------- | ------------------ | ---------------- | ------------------------------------------------------------------------------------------------------- |
| `size`        | `number \| string` | 图标原生设计尺寸 | 渲染尺寸（px）。默认取该图标的原生尺寸（如 `FluentIconAdd20Filled` 为 20）；放大建议按 2 的倍数避免模糊 |
| `title`       | `string`           | `—`              | 无障碍标题；提供后渲染 `<title>` 并把 `role` 置为 `img`，否则图标按装饰元素处理（`aria-hidden="true"`） |

> **attrs 透传**：所有未声明的属性与事件都会落到根 `<svg>` 上，因此 `class` / `style` / `aria-label` / `@click` 可直接按原生 SVG 用法传入。`aria-label` 与 `title` 具有同等效果——任一个存在即视为「有可访问名」，此时不再设置 `aria-hidden`。
>
> **配色随文本**：`fill="currentColor"`，图标颜色始终等于当前文本色，因此明暗主题与 `colorNeutralForeground*` 等语义色都自动生效，无需为图标单独指定颜色。根节点另带 `focusable="false"`（避免 IE/旧 Edge 的 Tab 焦点）与 `data-icon-name`（原始图标名，便于测试与调试）。
