---
'@fluere-vue/ui': minor
'@fluere-vue/designs': minor
'@fluere-vue/hooks': patch
'@fluere-vue/icons': patch
'@fluere-vue/themes': patch
'@fluere-vue/utils': patch
---

0.4.0「基建 + 通用件收尾」。

**浮层基建**：新增 `useFlyout` 统一浮层原语（开关状态复用 `useDisclosure`，关闭路径 Esc / 外部点击 / 焦点移出带 reason，焦点归还，`role` / `aria-expanded` / `aria-haspopup` / `aria-modal` 契约）与层级栈 `acquireLayer`（平面刻度表达不了的「模态里的下拉要盖过模态」按 `--zIndexStep` 抬升，值全程引用 token）；Tooltip / Combobox / ContentDialog 三套实现已接上层级栈。SSR 侧刻意不在 setup 期登记层级，避免模块级栈跨请求污染与首帧水合不匹配。

**令牌**：`@fluere-vue/designs` 新增仓库自有令牌旁路事实源 `data/repo-tokens.json`（`extract-tokens.mjs` 不再会冲掉手写值，重名由生成脚本抛错拦截），落 `--zIndex*` 分层刻度九档 + Mica / Acrylic / Layer / Subtle / Smoke 共 20 个材质画刷 token（值取 WinUI `winui3/release/2.5.1` 的主题资源，AARRGGBB → CSS 的换算与原值记在 token 的 `note` 里）。组件里原有的四处浮层硬编码 z-index 全部改引刻度，并有契约测试禁止回退。

**焦点**：新增 `useFocusVisual` 共享原语，逐条对齐 WinUI `FocusRectManager.cpp` 的双层焦点矩形（外 2px + 内 1px、紧贴无间隙、等价 `FocusVisualMargin = -3`）与 `Common_themeresources_any.xaml` 的明暗色（映射 `colorStrokeFocus2` / `colorStrokeFocus1`），含 `forced-colors` 分支。`FluereButton` 已从单层 brand outline 切换过去。

**新组件**：`FluereToggleButton`（三态 `checked: boolean | null`，状态表对齐 `ToggleButton_themeresources.xaml`，选中铺 `--colorBrandBackground`，三态循环对齐 `ToggleButton_Partial.cpp#OnToggleImpl`）、`FluereToggleGroup` / `FluereToggleGroupItem`（分组单选 / 多选 + 方向键 roving focus；WinUI 无同名控件，取舍已写入文档）、`FluereSelect`（不可编辑下拉，reka `Select` 底座，视觉取 WinUI `ComboBox` 非编辑形态；与 `FluereCombobox` 的差异写进文档）。三者均含契约测试、中英文档页与示例。

**收尾**：`packages/ui/README.md` 补齐组件索引与共享原语表；根 `README.md` 组件进度表补齐 `FluereToggleButton` / `FluereToggleGroup` / `FluereSelect` 三行并收敛 `FluereButton` 的 WinUI 映射；`FluereButton` 背景过渡统一到 A 级口径（`background-color 83ms linear`，来源 `Button_themeresources.xaml`，与 `FluereToggleButton` 一致）；`apps/playground` 从占位包落地为可跑的 Vite 视觉回归页（Wave 1 表单 + 按钮族 + 反馈 + 浮层 + 明暗切换，含《视觉自检清单》）。

**文档**：`apps/docs/README.md` 增补《WindowsOS 仿真边界》；`docs/todo.md` 记录 0.4.0 进展与未做项。
