# @fluere-vue/utils

## 0.5.0-alpha.1

### Patch Changes

- 2b8a93a: 0.5.0「Explorer 骨架」：窗口外框 / 选项卡 / 导航视图三个通用控件进库，浮层焦点原语下沉。

  **新组件**

  - `FluereAppWindow`：圆角窗口外框 + 标题栏（`Microsoft.UI.Xaml.Controls.TitleBar` 口径），提供 `dragStart` / `dragMove` / `dragEnd` 让外壳实现拖拽；位置 / 尺寸 / 层级由消费方控制。标题栏 32 / 48 两档高度、`Compact` 折叠的「后声明组胜出」、失活态分支均照抄 `TitleBar.cpp`。
  - `FluereCaptionButtons`：最小化 / 最大化 / 还原 / 关闭，纯逻辑代理（不自行改窗口几何）。caption 按钮无 A 级 XAML 源码（系统 DWM 绘制），几何 46×32 / 字形 10 / 描边 1 与关闭键红 `#C42B1C` 记为系统度量 + 证据缺口，全部落成可覆盖的组件局部变量。
  - `FluereTabView` / `FluereTabViewItem`：标签条支持溢出滚动（`overflow-x: auto` 保留原生滚动、不画原生滚动条以恒保 32px 高度）、箭头按住连续滚动、`Ctrl+F4` / `Ctrl+Tab` / `Ctrl+Shift+Tab` 加速键与「tab → 关闭按钮 → 新建按钮 → 回绕」方向键焦点环；`TabWidthMode` 三档；关闭 / 新建只抛事件不删数据，被删选中项按 `OnItemsChanged` 的后向环形规则迁移。
  - `FluereNavigationView` 家族（`…Item` / `…ItemHeader` / `…ItemSeparator`）：DisplayMode 状态机（`width >= 1008` Expanded / `0 < width < 641` Minimal / 其余落 Compact）逐字照抄 `NavigationView.cpp`；收起时保留 48px 图标轨道；选中与展开同时发生、`selectsOnInvoked=false` 只展开不改选中、`isChildSelected` 沿祖先链回写；底部设置项用保留哨兵值 `FLUERE_NAVIGATION_SETTINGS_VALUE`（消费方不得用作菜单项 `value`）。

  **浮层与令牌**

  - `@fluere-vue/hooks` 新增 `useFocusTrap`（Tab 陷阱跳过不可聚焦项、Esc / `onEscape`、点击 / 触摸外部 + 触发器排除、焦点归还含外部点击抑制与键盘再武装）；SSR 无副作用，配套 `hasDocument()` 能力探测原语进 `@fluere-vue/utils`。文档站开始菜单与托盘弹层为首批消费方。
  - `@fluere-vue/designs` 补齐 Windows 外壳用令牌：强调色两枚（`windowsAccentPrimary` / `windowsAccentLight2`）、控件填充与描边三枚（`controlFillColorSecondary` / `controlFillColorTertiary` / `controlStrokeColorDefault`）、浮出描边 `surfaceStrokeColorFlyout` 与 `--zIndexStartMenu`（1600）；顺序断言同步。

  **修正**

  - `FluereTabView`：标签条水平溢出时不再被原生滚动条撑高，箭头支持按住连续滚动。
  - `FluereNavigationView`：修正折叠态开关按钮挤压、标题残留、行背景裁切与设置图标填充。
  - `FluereAppWindow`：caption 字形按参考图逐像素校准。

  **文档**：三个新组件均含中英文档页、示例与 API 表；文档站外壳（`/os`）落地壁纸 / 窗口 / 任务栏 / 系统托盘 / 开始菜单，仿真边界文案中英同构。规格源统一为 `microsoft-ui-xaml` tag `winui3/release/2.5.1`（commit `ba3a8d5`）。

## 0.4.1-alpha.1

### Patch Changes

- cf55377: 0.4.1 预发布（alpha）：ScrollView 手势拆分、ToggleSwitch 无障碍修正、Button 过渡口径统一。

  **ScrollView**：拆分触摸与笔输入，新增共用平移手势状态机（`pan` 手势与指针捕获解耦，笔输入走独立分支）。

  **ToggleSwitch**：隐藏的表单复选框移出 Tab 序与无障碍树，修掉键盘 Tab 被不可见控件截获的问题。

  **FluereButton**：背景过渡统一到 WinUI A 级口径（`background-color 83ms linear`，来源 `Button_themeresources.xaml`），与 `FluereToggleButton` 一致。

  **文档与构建**：文档站接入 `@nuxtjs/sitemap` / `@nuxtjs/robots`，生产构建改用 esbuild 压缩 CSS；`README` 当前版本指引更新为 `0.4.1-alpha.1`；`docs/release.md` 按 changesets 实际判定修正 dist-tag 口径，并记录 OneDev 部署结果与 tag 推送顺序的踩坑。

## 0.4.0-alpha.1

### Patch Changes

- cebcd71: 补齐 npm 发布前的构建基建：Vite 8 lib mode（纯 ESM）产物 + 完整 `exports` / `files` / `sideEffects` / `peerDependencies` 等包元数据，`@fluere-vue/ui` 的 `.d.ts` 改由 `vue-tsc` 生成（保留 SFC 精确 Props）。接入 Changesets（fixed 统一版本）与发布检查（publint / attw）。配套文档见 `docs/adr/0001-library-build-tooling.md`、`docs/release.md`。**发布产物**入口为 `dist`，消费端需 `import '@fluere-vue/ui/style.css'`；仓库内（dev / tsc / 文档站）解析源码，见 ADR §4.1。
- 8a707fc: 0.4.0「基建 + 通用件收尾」。

  **浮层基建**：新增 `useFlyout` 统一浮层原语（开关状态复用 `useDisclosure`，关闭路径 Esc / 外部点击 / 焦点移出带 reason，焦点归还，`role` / `aria-expanded` / `aria-haspopup` / `aria-modal` 契约）与层级栈 `acquireLayer`（平面刻度表达不了的「模态里的下拉要盖过模态」按 `--zIndexStep` 抬升，值全程引用 token）；Tooltip / Combobox / ContentDialog 三套实现已接上层级栈。SSR 侧刻意不在 setup 期登记层级，避免模块级栈跨请求污染与首帧水合不匹配。

  **令牌**：`@fluere-vue/designs` 新增仓库自有令牌旁路事实源 `data/repo-tokens.json`（`extract-tokens.mjs` 不再会冲掉手写值，重名由生成脚本抛错拦截），落 `--zIndex*` 分层刻度九档 + Mica / Acrylic / Layer / Subtle / Smoke 共 20 个材质画刷 token（值取 WinUI `winui3/release/2.5.1` 的主题资源，AARRGGBB → CSS 的换算与原值记在 token 的 `note` 里）。组件里原有的四处浮层硬编码 z-index 全部改引刻度，并有契约测试禁止回退。

  **焦点**：新增 `useFocusVisual` 共享原语，逐条对齐 WinUI `FocusRectManager.cpp` 的双层焦点矩形（外 2px + 内 1px、紧贴无间隙、等价 `FocusVisualMargin = -3`）与 `Common_themeresources_any.xaml` 的明暗色（映射 `colorStrokeFocus2` / `colorStrokeFocus1`），含 `forced-colors` 分支。`FluereButton` 已从单层 brand outline 切换过去。

  **新组件**：`FluereToggleButton`（三态 `checked: boolean | null`，状态表对齐 `ToggleButton_themeresources.xaml`，选中铺 `--colorBrandBackground`，三态循环对齐 `ToggleButton_Partial.cpp#OnToggleImpl`）、`FluereToggleGroup` / `FluereToggleGroupItem`（分组单选 / 多选 + 方向键 roving focus；WinUI 无同名控件，取舍已写入文档）、`FluereSelect`（不可编辑下拉，reka `Select` 底座，视觉取 WinUI `ComboBox` 非编辑形态；与 `FluereCombobox` 的差异写进文档）。三者均含契约测试、中英文档页与示例。

  **收尾**：`packages/ui/README.md` 补齐组件索引与共享原语表；`apps/playground` 从占位包落地为可跑的 Vite 视觉回归页（Wave 1 表单 + 按钮族 + 反馈 + 浮层 + 明暗切换，含《视觉自检清单》）。

  **文档**：`apps/docs/README.md` 增补《WindowsOS 仿真边界》；`docs/todo.md` 记录 0.4.0 进展与未做项。

- 73e28b9: 修复仓库内开发链路对构建产物的强依赖：六个包的 `main` / `module` / `types` / `exports` 改为指向**源码**，发布时由 `publishConfig` 覆盖回 `dist`（pnpm/npm 官方支持的字段覆盖；`pnpm pack` 复核过 tarball 内清单与只读入口不变，消费方行为无变化）。

  此前入口直指 `dist`，而 `dist` 已 gitignore：全新检出（CI / 新克隆）下 `pnpm dev`、`pnpm tsc`、`pnpm docs:generate` 会直接报 `No "exports" main defined in @fluere-vue/themes/package.json`；文档站也因此取不到任何组件 scoped 样式——`.fui-scrollview__presenter` 的 `position: absolute` / `overflow: clip` / `touch-action: none` 静默失效，ScrollView 视口塌成内容高度而无法滚动。

  同时修正 `dist-smoke` 冒烟测试：`import('../../dist/index.js')` 是字面量说明符，Vite 在收集阶段即静态解析，未构建时直接报错、`skipIf` 形同虚设；改用 `pathToFileURL` + `@vite-ignore` 运行时求值，未构建时按注释契约真正跳过。

  详见 `docs/adr/0001-library-build-tooling.md` §4.1。
