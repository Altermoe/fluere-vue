# FluereVue

一个以 Windows 11 / WinUI 3 原生控件为参考的 Vue 3 组件库，重点还原控件的视觉样式、交互状态和动画细节。

FluereVue 的实现基准是 Windows 实机表现，而不只是 Fluent Design 的 Web 规范。开发时会参考 WinUI 3 Gallery 和对应版本的 Windows App SDK 源码，核对控件在不同状态下的尺寸、圆角、描边、焦点样式与动效，再在浏览器中实现。

## 设计目标

FluereVue 主要关注网页组件与 Windows 原生控件之间的一些细节差异，例如按钮的 hover / pressed 状态、开关的过渡动画、弹层的层次，以及明暗主题切换时的表现。

项目不会把 Web 实现描述为原生控件的完全复刻。系统级动效、触觉反馈和原生窗口行为等能力仍受浏览器限制；无法复现的部分会明确标注，能够近似实现的部分则尽量保持一致。

## 特性

- **控件样式**：参考 WinUI 3 实机表现，核对尺寸、圆角、描边、填充、图标和排版。
- **交互与动画**：实现 hover、pressed、focus、开关切换和内容展开等状态，并参考 Windows 中对应动画的时长与缓动。
- **材质效果**：提供 Mica / Acrylic 风格的 Web 近似实现。
- **明暗主题**：支持 Light / Dark，并可跟随系统主题偏好。
- **无障碍**：关注焦点矩形、颜色对比度和 ARIA 语义。
- **图标**：提供基于 Segoe Fluent Icons 矢量源生成的 Vue 图标组件。
- **技术栈**：Vue 3 + TypeScript。组件包含自身样式，支持按需引入。

## 快速开始

```bash
pnpm add @fluere-vue/ui
```

```vue
<script setup lang="ts">
import { FluereButton } from '@fluere-vue/ui'
</script>

<template>
  <FluereButton appearance="primary">保存</FluereButton>
</template>
```

项目提供设计令牌，组件样式由组件包维护。开发时可运行：

- `pnpm install`：安装依赖。
- `pnpm dev`：启动文档站。
- `pnpm --filter @fluere-vue/playground dev`：启动实验场。

## 组件进度

| 组件                                     | 对应 WinUI 3 控件        | 状态   |
| ---------------------------------------- | ------------------------ | ------ |
| `FluereButton`                           | Button / ToggleButton    | 已完成 |
| `FluereCheckbox`                         | CheckBox                 | 已完成 |
| `FluereToggleSwitch`                     | ToggleSwitch             | 已完成 |
| `FluereRadioGroup` / `FluereRadioButton` | RadioButton              | 已完成 |
| `FluereSlider`                           | Slider                   | 已完成 |
| `FluereNumberBox`                        | NumberBox                | 已完成 |
| `FluereCombobox`                         | ComboBox                 | 已完成 |
| `FluereContentDialog`                    | ContentDialog             | 已完成 |
| `FluereInfoBadge`                        | InfoBadge                | 已完成 |
| `FluereInfoBar`                          | InfoBar                  | 已完成 |
| `FluereProgressBar`                      | ProgressBar              | 已完成 |
| `FluereProgressRing`                     | ProgressRing              | 已完成 |
| `FluereInput`                            | TextBox / PasswordBox    | 已完成 |
| `FluereTooltip`                          | ToolTip / ToolTipService | 已完成 |
| `FluereScrollView`                       | ScrollView               | 开发中 |

### 0.1.0-rc.1 计划范围

实施顺序和验收标准见 [docs/todo.md](./docs/todo.md)。

- **Wave 1 · 核心表单**：Checkbox、ToggleSwitch、RadioButton / RadioGroup、Slider、NumberBox、Combobox
- **Wave 2 · 反馈与状态**：ProgressRing、ProgressBar、InfoBar、Badge
- **Wave 3 · 弹层与微交互**：ContentDialog（包含共享弹层原语 `FluereSmokeLayer` / `useDisclosure`）、Tooltip / TooltipProvider
- **Wave 4 · 其他交互组件**：ToggleButton / ToggleGroup、Avatar / Persona、DropDownButton
- **不纳入 rc.1，计划放到 0.2**：NavigationView、ListView / GridView / DataGrid、TreeView、CalendarDatePicker / TimePicker、完整的 MenuBar、RatingControl、CommandBar

## 对齐基准与限制

组件的主要参考是 WinUI 3 Gallery 和 Windows 11 实机。实现时会检查 `rest`、`hover`、`pressed`、`selected`、`focus`、`disabled` 等状态，并对照对应版本的 Windows App SDK 源码确认规格和行为。

浏览器无法提供所有原生能力。系统级动画、触觉反馈和原生窗口行为等内容不在完全复刻的范围内；相关实现会区分实际还原、近似实现和暂不支持的部分。

## 项目结构

| 包                         | 职责                                                   |
| -------------------------- | ------------------------------------------------------ |
| `packages/designs`         | 设计令牌的唯一来源，生成 `tokens.css` 与 UnoCSS preset |
| `packages/themes`          | 主题适配层，对外提供 `presetFluere`                    |
| `packages/ui`              | 组件实现，包含组件自身样式                             |
| `packages/icons`           | 根据 Segoe Fluent Icons 生成 Vue 图标组件              |
| `packages/hooks` / `utils` | 共享 Hooks 与工具函数                                  |
| `apps/docs` / `playground` | 文档站与实验场                                         |

## 路线图

- **阶段一 · 核心表单**：Button 族、CheckBox、RadioButton、TextBox、Slider、ToggleSwitch 等
- **阶段二 · 导航与容器**：NavigationView、TabView、TreeView、ListView 等
- **阶段三 · 动效与材质**：整理统一的动画实现，继续完善 Mica / Acrylic 效果
- **阶段四 · 无障碍与发布**：补充单元测试和视觉回归，发布 npm 包并上线文档站

## 开发与贡献

欢迎提交问题和改进。开发环境需要 Node（>= 22.13，推荐 26）和 pnpm 11.27.0。pnpm 版本由根目录 `package.json` 的 `packageManager` 字段指定；启用 Corepack 后会自动使用对应版本，CI 也读取这个字段安装依赖。

新增组件前，请先阅读 [AGENTS.md](./AGENTS.md) 和 [docs/style-spec.md](./docs/style-spec.md)。前者说明组件开发流程和验收清单，后者记录样式与行为的对齐依据。一般流程是：先在 WinUI 3 Gallery 和对应版本的 Windows App SDK 源码 tag 中确认规格及各状态细节，再补充设计令牌、实现组件、添加文档示例，最后按 Definition of Done 检查。

常用命令：`pnpm dev`（文档站）、`pnpm build`、`pnpm lint`、`pnpm tsc`、`pnpm check`。

## 持续集成与发布

本节中的 `${VAR}` 均为环境变量别名。实际值保存在根目录的 `.env.local`（已加入 gitignore，不应提交）；示例配置见 `.env.example`。

### OneDev CI

CI 配置见 [.onedev-buildspec.yml](./.onedev-buildspec.yml)。推送到 `main` 或推送 `v*` tag 时，以下三个 job 会并行运行，并共用 pnpm 缓存。推送 tag 后还会触发 `deploy`，但它只有在前三个 job 全部通过后才会开始。

| job      | 触发              | 内容                                                                                                             |
| -------- | ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| `check`  | `main` / `v*` tag | 检查构建规范（`scripts/lint-buildspec.py`）、版本一致性，并运行 `pnpm check`（lint / format / tsc / i18n / version） |
| `test`   | `main` / `v*` tag | 运行完整 Vitest 测试：`pnpm test`                                                                                |
| `build`  | `main` / `v*` tag | 运行 `pnpm docs:generate`，预渲染并检查文档站，将 `apps/docs/.output/public` 发布为 artifact                   |
| `deploy` | 仅 `v*` tag       | 等 `check`、`test`、`build` 全部通过后，使用 `build` 产出的 artifact 部署到本机 nginx 容器（见下文）             |

相关约定：

- 根目录 `package.json` 是版本号的唯一来源。`pnpm version:sync` 会把版本同步到六个可发布包（`packages/*`）并回写根目录；`pnpm version:check` 用于检查版本是否一致。推送 tag 时，CI 还会检查去掉 `v` 前缀后的 tag 是否与根目录版本相同。
- `apps/*` 不参与版本同步。这些包是 private，且已在 changesets 中配置为 `ignore`；如果纳入同步，changesets action 会把它们识别为变更包，并尝试读取不存在的 `apps/docs/CHANGELOG.md`，导致 release job 失败。
- 文档站页面的版本号读取 `runtimeConfig.public.docsVersion`。CI 通过 `NUXT_PUBLIC_DOCS_VERSION` 注入 tag 版本，本地开发时回退到根目录版本，不要在页面中硬编码版本号。
- `pnpm-lock.yaml` 需要提交到仓库。CI 使用 `--frozen-lockfile` 安装依赖，缓存键也依赖该文件、`pnpm-workspace.yaml` 和 `.npmrc`。
- 出网代理通过 OneDev 构建密钥 `CI_HTTP_PROXY` 配置，相关逻辑见 [scripts/ci-env.sh](./scripts/ci-env.sh)。任务容器中的 `localhost` 指向容器自身，因此宿主代理需要配置为容器可访问的地址；生产环境使用 `${CI_HTTP_PROXY}`。设为空或 `none` 时直连。
- 远端名称：`github` 是公开仓库，`onedev` 对应 `${ONEDEV_REMOTE}`（生产 CI），`onedev-local` 对应 `http://localhost:6610/fluere-vue.git`（本地 OneDev 演练）。
- 本地可运行以下命令复现主要检查：`pnpm check`、`pnpm test`、`pnpm docs:generate`、`pnpm lint:buildspec`。

### GitHub Actions 验证

GitHub Actions 配置见 [.github/workflows/ci.yml](./.github/workflows/ci.yml)。该工作流在 PR 和推送到 `main` 时运行，只做验证，不负责发布或部署；部署仍由 OneDev 的 tag 流程执行。

| job             | 内容                                                                                            |
| --------------- | ----------------------------------------------------------------------------------------------- |
| `check`         | `pnpm install --frozen-lockfile` → `pnpm check`（lint / format / tsc / i18n / version）         |
| `test`          | `pnpm test`（完整 Vitest 测试）                                                                 |
| `docs`          | `pnpm docs:generate`，检查文档内容和双语路由能否预渲染；产物不上传，部署使用 OneDev 的构建产物   |
| `package-smoke` | `pnpm build` → `pnpm smoke:dist`（pack + publint / attw + fixture 消费）→ `REQUIRE_DIST=1` 单测 |

工作流不会单独固定 pnpm 版本。Node 25 起，发行版不再内置 Corepack；`pnpm/action-setup` 会读取根目录 `package.json` 的 `packageManager` 字段。该设置与 OneDev 的 [scripts/ci-bootstrap.sh](./scripts/ci-bootstrap.sh) 保持一致。版本不一致时，`--frozen-lockfile` 会导致安装失败。

### npm 发布

发布流程见 [.github/workflows/release.yml](./.github/workflows/release.yml)。`select-mode` 用于判断应创建 release PR 还是直接发布；`version`、`pack`、`publish` 分别负责版本处理、打包和发布。`id-token: write` 只配置给 `publish` job，用于 npm Trusted Publishing / OIDC，不需要长期保存 npm token。

目前六个包都还没有发布过。npm Trusted Publisher 只能绑定已经存在的包，因此首次发布需要先通过 token 或本机 `pnpm login` 完成初始化。准备清单、pnpm v11 的 `registry-url` 注意事项，以及首次预发布会占用 `latest` 标签的问题，记录在 [docs/release.md](./docs/release.md#发布流水线github-actions)。

### 持续部署（CD）

只有推送 `v*` tag 才会部署；推送到 `main` 只执行验证。部署脚本是 [scripts/deploy.sh](./scripts/deploy.sh)。它通过 job 容器挂载的宿主 Docker socket 操作宿主 Docker（job executor 为 `ServerDockerExecutor`，并启用 `mountDockerSock`），所以 `docker run -v` 中的路径按宿主机路径解析。

部署目录结构如下：

```text
${DEPLOY_ROOT}/
├── nginx/                    # fluere-vue.conf（含 security-headers.inc），每次部署时从仓库同步
├── releases/<tag>/           # 站点静态产物，保留最近 5 个（KEEP_RELEASES）
└── current -> releases/<tag> # 指向当前版本的符号链接，可切换到旧版本回滚
```

部署注意事项：

- `DEPLOY_ROOT` 和 `DEPLOY_BIND` 是部署位置配置，不写入仓库。每个 OneDev 实例都需要配置同名构建密钥，并授权给 `on branch "**"`；deploy job 通过 `@secret:` 注入，缺少密钥时构建会失败。
- OneDev 的密钥授权会检查构建提交是否能从匹配分支到达。因此，部署 tag 必须指向 `main` 已包含的提交。如果 tag 指向的提交只能通过该 tag 访问，任务会在调度前因 `No authorized job secret found` 失败，部署步骤不会开始。本地演练时从被 gitignore 的 `.env.local` 读取配置，格式见 [.env.example](./.env.example)。
- 容器使用 `${NGINX_IMAGE}` 镜像，名称为 `${DEPLOY_CONTAINER}`，只绑定到宿主回环地址 `${DEPLOY_BIND}`。容器内 nginx 只监听 80 端口并提供 `current` 目录中的文件。TLS 证书、域名和 HSTS 由上层反向代理处理，仓库中不配置证书。
- 部署后的站点地址为 `${DOCS_PUBLIC_URL}`，TLS 在宿主反向代理处终止。链路探活、视觉回归等 AI / 自动化检查也通过这个地址访问部署产物；它不是构建期依赖，构建过程只读取 `current` 中的静态文件。实际值保存在 `.env.local`，示例见 [.env.example](./.env.example)。
- nginx 配置位于 [deploy/nginx/fluere-vue.conf](./deploy/nginx/fluere-vue.conf)，安全响应头配置位于 [security-headers.inc](./deploy/nginx/security-headers.inc)。缓存策略为：`/_nuxt/` 缓存一年并设置 `immutable`；HTML、`_payload.json` 和 `__nuxt_content/*/sql_dump.txt` 不缓存。配置中的 `__DEPLOY_ROOT__` 会由脚本替换，修改部署根目录时不用维护两份配置。
- 健康检查会比较首页响应内容与 release 中的 `index.html`，确认首页包含本次 tag 的版本号，并检查未知路径是否返回 404。任一项未通过，脚本会将 `current` 切回旧版本并以非零状态退出。
- 本地演练不需要 CI。先运行 `pnpm docs:generate`，再执行 `. ./.env.local && SITE_DIR=apps/docs/.output/public sh scripts/deploy.sh v0.0.1`。脚本读取 `SITE_DIR`；不设置时默认使用 CI 中 artifact 下载到的 `site/` 目录。
- 部署根目录由 Docker 以 root 身份创建，查看或清理时需要使用 `sudo`，也可以通过 `docker run --rm -v "${DEPLOY_ROOT}:/d" alpine ...` 操作。手动回滚命令为 `docker run --rm -v "${DEPLOY_ROOT}:/d" -w /d alpine:3.22 ln -sfn releases/<旧 tag> current`。

## 许可证

MIT © 夕云葛城
