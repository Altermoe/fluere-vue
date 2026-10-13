---
name: fluent-adapter-flutter
description: Apply Fluent 2 design tokens in Flutter — generate ThemeData/ThemeExtension from the included fluent_tokens.dart, and map control patterns to Material-influenced Flutter widgets. Pair with fluent-tokens / fluent-components / fluent-patterns.
whenToUse: Building a Flutter app that should carry the Fluent/Windows design language (Microsoft-style), e.g. desktop Windows clients, and you need the token system mapped into Flutter's theming.
---

# Fluent 2 → Flutter Adapter

> **仓库从属声明（fluere-vue）**：本 skill 以 **Fluent 2 Web / `@fluentui/tokens`** 为事实源，仅用于**找线索与取 token 值（B 级）**；控件的几何 / 状态 / 动效等**行为**以 **WinUI 3 源码（A 级）** 为准，权威层级见仓库 `docs/style-spec.md` 与 `AGENTS.md`。在本仓库内**禁止**据本 skill 推断 WinUI 行为。

Flutter 没有官方 Fluent 组件库，所以本技能负责把 Fluent token **翻译成 Flutter 的表达**：语义颜色进 `ThemeData` / `ThemeExtension`，其它 token 绑定到 `ButtonStyle`、`TextStyle`、间距等。自带 **`fluent_tokens.dart`**（同目录），已把 `data/tokens/fluent-tokens.json` 编译成 Dart 常量。

## 使用 flens_tokens.dart

```dart
import 'fluent_tokens.dart';

Container(
  color: FluentLightColors.colorNeutralBackground1,
  child: Text('hi', style: TextStyle(color: FluentLightColors.colorNeutralForeground1)),
);
```

- 亮色语义：`FluentLightColors.*`；暗色：`FluentDarkColors.*`（同一 token 名，仅主题不同）。
- 全局量：`FluentTokens.spacingHorizontalM`、`FluentTokens.borderRadiusMedium`、`FluentTokens.durationFast` 等。

## 注入 ThemeData（亮/暗）

```dart
import 'package:flutter/material.dart';
import 'fluent_tokens.dart';

ThemeData fluentTheme(Brightness b) {
  final c = b == Brightness.light ? FluentLightColors.class : ...; // 用一个共用类
  return ThemeData(
    brightness: b,
    colorScheme: ColorScheme(
      brightness: b,
      primary: FluentLightColors.colorBrandBackground,
      onPrimary: FluentLightColors.colorNeutralForegroundOnBrand,
      surface: FluentLightColors.colorNeutralBackground1,
      onSurface: FluentLightColors.colorNeutralForeground1,
      error: const Color(0xFFD13438), // global red.primary from @fluentui/tokens palette
      // ... 其余必需槽补全
    ),
    cardTheme: CardThemeData(
      color: FluentLightColors.colorNeutralBackground1,
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(FluentTokens.borderRadiusLarge)),
    ),
    textTheme: const TextTheme(
      titleLarge: TextStyle(fontWeight: FontWeight.w600, fontSize: FluentTokens.fontSizeBase500),
      bodyMedium: TextStyle(fontSize: FluentTokens.fontSizeBase300, color: ...),
    ),
  );
}
```

> `fluent_tokens.dart` 生成自 `data/tokens/fluent-tokens.json`。想手动驱动一个完整 ThemeExtension 时，把语义常量映射成字段即可。

## 控件映射（Flutter widget → Fluent 规格）

| Fluent 概念 | Flutter widget / 方式 |
|---|---|
| primary button | `FilledButton` + `backgroundColor=colorBrandBackground`；hover `FilledButton.styleFrom(overlayColor:…)` |
| secondary/outline | `OutlinedButton` + `side=BorderSide(color:colorNeutralStroke1)` |
| text input | `TextField`/`InputDecorator` + `filled`、`OutlineInputBorder` |
| card | `Card` + 语义底 + `borderRadius` |
| dialog / overlay | `showDialog` + `backgroundColor=colorNeutralBackground1` + overlay color |
| menu / popover | `MenuAnchor` / `showMenu` |
| tabs / nav | `NavigationRail` / `TabBar` + active 指示色 `colorCompoundBrandStroke` |
| switch / checkbox | Material 自带，配合 `ColorScheme` 注入品牌色 |

这些只是把 Fluent 的**语义颜色/尺寸**接到 Flutter 控件上；结构与状态映射见 `fluent-components`。

## 高度 / 投影（Elevation）

Flutter 的 `Material.elevation` 用的是 Material 自己的阴影公式，和 Fluent 的两层阴影（key + ambient）不同观感 —— 需要 Fluent 观感时显式给 `BoxShadow`。
几何来自 `data/tokens/fluent-tokens.json` 的 `shadows` 段（两层：`0 0 2px` 这类 ambient + `0 8px 16px` 这类 key），颜色取当前主题的
`FluentLightColors/FluentDarkColors.colorNeutralShadowAmbient · colorNeutralShadowKey`（品牌色表面改用 `colorBrandShadow*`）：

```dart
BoxShadow _layer(Color color, double dx, double dy, double blur) =>
    BoxShadow(color: color, offset: Offset(dx, dy), blurRadius: blur);

/// 档位数字 = 模糊半径量级（与 shadows 段的 shadow2/4/8/16/28/64 一一对应）。
List<BoxShadow> fluentShadow(int level, {required Color ambient, required Color key}) {
  switch (level) {
    case 2:  return [_layer(ambient, 0, 0, 2),  _layer(key, 0, 1, 2)];
    case 4:  return [_layer(ambient, 0, 0, 2),  _layer(key, 0, 2, 4)];
    case 8:  return [_layer(ambient, 0, 0, 2),  _layer(key, 0, 4, 8)];
    case 16: return [_layer(ambient, 0, 0, 2),  _layer(key, 0, 8, 16)];
    case 28: return [_layer(ambient, 0, 0, 8),  _layer(key, 0, 14, 28)];
    case 64: return [_layer(ambient, 0, 0, 8),  _layer(key, 0, 32, 64)];
    default: throw ArgumentError('Fluent elevation 只有 2/4/8/16/28/64 六档');
  }
}

// 用法：Flyout / Popover / Callout → 16；Dialog / 面板 → 64；卡片 → 4；Tooltip / 下拉 → 8
Container(
  decoration: BoxDecoration(
    color: FluentLightColors.colorNeutralBackground1,
    borderRadius: BorderRadius.circular(FluentTokens.borderRadiusXLarge),
    boxShadow: fluentShadow(16,
      ambient: FluentLightColors.colorNeutralShadowAmbient,
      key: FluentLightColors.colorNeutralShadowKey),
  ),
  child: …,
)
```

> Windows 上 Fluent 用**描边**替代 key 阴影勾勒边缘：`Border.all(color: …, width: FluentTokens.strokeWidthThin)` + 只留 ambient 层。
> 各档的用途对照见 `fluent-tokens` 的「高度 / 阴影」。

## 主题切换

切换亮/暗 = 传不同 `ThemeData` 到 `MaterialApp(theme:, darkTheme:)`。语义 token 名不变，值随主题——这正是跨框架同一设计语言的关键。

## 无障碍

- 触控目标 ≥ 40 逻辑像素。
- 不单靠颜色传状态（配 icon/文本）。
- 动效尊重 `MediaQuery.disableAnimations`.

## 更新数据

`fluent_tokens.dart` 由 Node 脚本生成：`node gen-dart.js`（依赖 `data/tokens/fluent-tokens.json`）。建议把脚本纳入你的 dart 构建前置步骤。

### 路径怎么来（给后来 AI 的说明）

脚本里没有写死绝对路径，默认相对脚本自身位置解析（输入 `data/tokens/fluent-tokens.json`、输出与脚本同目录），可跨目录运行：

```bash
node gen-dart.js --tokens <path/to/fluent-tokens.json> --out <path/to/fluent_tokens.dart>
```

跑之前先确认 token JSON 的真实地址：仓库自带的 `fluent-tokens` skill 里有 `data/fluent-tokens.json`；若在别处则用 `--tokens` 指定；若环境里没有该文件，先按 `fluent-tokens` / `@fluentui/tokens` 抽取生成它，或**停下来询问人类**获取真实路径。找不到输入文件时脚本会打印清晰提示并退出，不会用占位数据生成产物。

> 设计原则见 `fluent-foundations`；取 token 真值见 `fluent-tokens`。