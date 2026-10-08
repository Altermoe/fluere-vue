---
title: Switch 开关
description: 开关组件，用于在「开 / 关」两个状态间切换。
nav:
  title: Switch 开关
---

# Switch 开关

开关用于在两个互斥状态（开 / 关）间切换，通常表示某项功能的启用与否。样式还原 WinUI 3 / Windows App SDK 的 ToggleSwitch：自研实现轨道 + 滑块，完整还原「点击切换 / 拖拽滑块到终点 / 键盘切换 / hover 滑块放大 / active 滑块原地增宽（药丸形）」的 WinUI 手感。位移只走 `transform`、缓动动画只在切换时启用；滑块只在 rail 内做尺寸变化、天然无法离开轨道区域，切换瞬间也不会出现反方向小跳动。

## 基础用法

`v-model` 绑定布尔值。点击开关任意处切换；拖拽滑块超过半程落到目标端、不足半程回弹；键盘 `Space` / `Enter` 切换、`◀` 关闭、`▶` 开启。

::demo-block{title="基础用法"}
#preview
:ToggleSwitchBasicDemo
#code

```vue
<FluereToggleSwitch v-model="wifi">Wi-Fi</FluereToggleSwitch>
<FluereToggleSwitch v-model="bluetooth">蓝牙</FluereToggleSwitch>
```

::

## 尺寸

标准 WinUI ToggleSwitch 轨道为 40×20（`medium`）。Web 侧另提供 `small`（32×16）与 `large`（48×24），保持 2:1 比例；`travel`（滑块行程 16 / 20 / 24）分别对齐 Fluent `spacing` L / XL / XXL。

::demo-block{title="三档尺寸"}
#preview
:ToggleSwitchSizeDemo
#code

```vue
<FluereToggleSwitch size="small">small（32×16）</FluereToggleSwitch>
<FluereToggleSwitch size="medium">medium（40×20）</FluereToggleSwitch>
<FluereToggleSwitch size="large">large（48×24）</FluereToggleSwitch>
```

::

## 标题 + 开关内容

还原 WinUI 三层结构：`#header` 顶部说明行、`#on-content` / `#off-content` 在轨道右侧同一格交叉淡入淡出、默认插槽作为行标签（同时是有语义的可见文本）。

::demo-block{title="标题 + On/Off 内容"}
#preview
:ToggleSwitchHeaderContentDemo
#code

```vue
<FluereToggleSwitch v-model="notify">
  <template #header>系统通知</template>
  <template #off-content>关</template>
  <template #on-content>开</template>
  接收桌面通知
</FluereToggleSwitch>
```

::

## 拖拽交互

按住滑块左右拖动，滑块会跟随指针移动；松手时若越过中点则落到另一端，否则回弹到原状态——与 WinUI 一致。拖动过程中仅启用 `will-change: transform`（不在空闲态常驻），松手后由缓动曲线把滑块平滑滑到终点。

::demo-block{title="拖拽切换"}
#preview
:ToggleSwitchBasicDemo
#code

```vue
<FluereToggleSwitch v-model="vpn">VPN</FluereToggleSwitch>
```

::

## 禁用

`disabled` 时不可交互，轨道、滑块、文字全部落到 …Disabled 档。

::demo-block{title="禁用状态"}
#preview
:ToggleSwitchDisabledDemo
#code

```vue
<FluereToggleSwitch disabled>未开启（禁用）</FluereToggleSwitch>
<FluereToggleSwitch disabled :model-value="true">已开启（禁用）</FluereToggleSwitch>
```

::

## 表单提交

位于 `<form>` 内并传 `name` 时补隐藏原生 `<input type="checkbox">`，开启结果随表单提交（`value` 作为提交值，默认 `"on"`）。

::demo-block{title="表单提交"}
#preview
:ToggleSwitchBasicDemo
#code

```vue
<form @submit.prevent>
  <FluereToggleSwitch name="dark-mode" value="yes">深色模式</FluereToggleSwitch>
</form>
```

::

## API

| 属性（Props） | 类型                             | 默认       | 说明                              |
| ------------- | -------------------------------- | ---------- | --------------------------------- |
| `modelValue`  | `boolean`                        | `false`    | 是否开启（`v-model`）             |
| `disabled`    | `boolean`                        | `false`    | 是否禁用                          |
| `size`        | `'small' \| 'medium' \| 'large'` | `'medium'` | 尺寸（medium 对齐 WinUI 40×20）   |
| `name`        | `string`                         | `—`        | 表单提交名，配合隐藏原生 input    |
| `value`       | `string`                         | `'on'`     | 开启时提交给后端的值              |
| `label`       | `string`                         | `—`        | 可访问名称（缺省取内容/标题文本） |

| 插槽（Slots） | 说明                             |
| ------------- | -------------------------------- |
| `default`     | 行标签（语义名）                 |
| `header`      | 顶部标题行（WinUI Header）       |
| `on-content`  | 开启时显示的文本（交叉淡入淡出） |
| `off-content` | 关闭时显示的文本（交叉淡入淡出） |

> 位移只使用 `transform: translateX`（`calc(var(--travel) * progress)`），不触碰 `left/right`；常态不带常驻 `will-change`，仅在拖拽中开启；动效时长来自 Fluent `duration*`、缓动来自 `curveEasyEase(Max)`，并遵循 `prefers-reduced-motion`。
