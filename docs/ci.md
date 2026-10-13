# 持续集成（CI）

## 概览

本仓库有两条互相独立的验证链路，都不负责 npm 发布：

| 链路           | 配置                                                    | 触发                                      | 职责                     |
| -------------- | ------------------------------------------------------- | ----------------------------------------- | ------------------------ |
| OneDev（自建） | [.onedev-buildspec.yml](../.onedev-buildspec.yml)       | 推送 `main`、推送 `v*` tag                | 验证 + 文档站构建与部署  |
| GitHub Actions | [.github/workflows/ci.yml](../.github/workflows/ci.yml) | PR、推送 `main`、手动 `workflow_dispatch` | 只做验证，不发布、不部署 |

- OneDev 是生产链路：`check` / `test` / `build` / `package-smoke` 四个 job 并行，`deploy` 只在推 tag 时跑（见 [deployment.md](./deployment.md)）。
- GitHub Actions 与 OneDev 保持同名同语义的 job，差别只在平台能力，方便 PR 阶段就能发现问题。
- npm 发布链路由 [.github/workflows/release.yml](../.github/workflows/release.yml) 负责；npm Trusted Publishing、Changesets、`pnpm release:manual` 与首次发布初始化见 [release.md](./release.md#发布流水线github-actions)。
- 文中 `${VAR}` 均为环境变量别名。真实值保存在根目录 `.env.local`（已 gitignore，禁止提交、禁止粘回文档），CI 侧同名值放 OneDev 构建密钥；格式示例见 [.env.example](../.env.example)。

## OneDev

配置见 [.onedev-buildspec.yml](../.onedev-buildspec.yml)。推送到 `main` 或推送 `v*` tag 都会触发验证；推 tag 会额外触发 `deploy`，但它必须等前面的 job 全部通过才会开始。

### job 分工与触发

| job             | 触发              | 内容                                                                                                                                                                                                                  |
| --------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `check`         | `main` / `v*` tag | 先 `scripts/lint-buildspec.py` 自校验 buildspec（`python:3-alpine`），再 `pnpm install --frozen-lockfile` → `version:check-tag`（tag）/ `version:check`（分支）→ `pnpm check`（lint / format / tsc / i18n / version） |
| `test`          | `main` / `v*` tag | `pnpm test`（完整 Vitest）                                                                                                                                                                                            |
| `build`         | `main` / `v*` tag | `NUXT_PUBLIC_DOCS_VERSION="$CI_TAG" pnpm docs:generate`，预渲染并检查文档站；tag 构建额外断言产物里的版本徽标；把 `apps/docs/.output/public` 发布为 artifact                                                          |
| `package-smoke` | `main` / `v*` tag | `pnpm build` → `pnpm smoke:dist`（pack + publint / attw + fixture 消费）→ `REQUIRE_DIST=1 pnpm exec vitest run packages/ui/src/__tests__/dist-smoke.test.ts`                                                          |
| `deploy`        | 仅 `v*` tag       | 等前四个 job 全部成功，取 `build` 的 artifact，执行 `sh scripts/deploy.sh "$DEPLOY_TAG"`（细节见 [deployment.md](./deployment.md)）                                                                                   |

### 并行、依赖与 artifact

- `check` / `test` / `build` / `package-smoke` 四个 job **并行**，任一步失败都能单独定位；`deploy` 通过 `jobDependencies` 要求这四个全部 `requireSuccessful`。
- 只有 `build` 需要传产物：`PublishArtifactStep` 的 `sourcePath` 是 `apps/docs/.output/public`，`artifacts: '**'`；`deploy` 用 `destinationPath: site` 取下来，所以站点根就是 `site/index.html`、`site/_nuxt/...`。
- **每个 step 都跑在全新容器里**：上一步装的 pnpm 与环境变量不会带到下一步，所以「装依赖 + 跑命令」必须放在同一个 `CommandStep`。`package-smoke` 的 build / smoke / 单测因此写在一个 step 内，dist 不会跨 step 传递。
- 容器镜像：buildspec 自校验用 `python:3-alpine`，其余验证 job 用 `node:26-alpine`，`deploy` 用 `docker:29-cli`。

### 缓存

- 四个 job 共用一份 pnpm store 缓存（`SetupCacheStep`，`key: pnpm-store-v2`，条目 `.pnpm-store`，`uploadStrategy: UPLOAD_IF_NOT_EXACT_MATCH`），安装时对应 `pnpm install --frozen-lockfile --store-dir .pnpm-store`。
- 是否精确命中由 `checksumFiles` 决定：`pnpm-lock.yaml`、`pnpm-workspace.yaml`、`.npmrc`，三者任一变化都会走重新上传。
- **只缓存 pnpm store，不缓存 `node_modules`**：pnpm 的 workspace 链接指向缓存目录之外，OneDev 解包时会以 `Tar entry symbol link escape detected` 判缓存恢复失败并让整个 job 挂掉。同类逃逸还有第二个来源——pnpm v11 会把用过该 store 的工程记成 `<store>/v11/projects/<hash> -> <工程目录>`，`smoke-dist` 的 fixture 位于仓库内，会把带逃逸链接的 store 传成共用缓存；现在 fixture 改用独立 store（[scripts/smoke-dist.mjs](../scripts/smoke-dist.mjs)），缓存 key 升到 `pnpm-store-v2` 以丢弃被污染的 v1 条目。

### 版本与 tag 校验

- 根目录 `package.json` 是版本号的唯一来源。`pnpm version:sync` 把版本同步到六个可发布包（`packages/*`）并回写根目录，`pnpm version:check` 检查一致性。
- 推 tag 时 `check` job 先跑 `pnpm version:check-tag "$CI_TAG"`：去掉 `v` 前缀后的 tag 必须等于根目录版本，不一致直接失败。
- `apps/*` 不参与版本同步：这些包是 private，且已在 changesets 中配置为 `ignore`；一旦纳入同步，changesets action 会把它们当成变更包并尝试读取不存在的 `apps/docs/CHANGELOG.md`，导致 release job 失败。
- 文档站页面版本号读 `runtimeConfig.public.docsVersion`。CI 通过 `NUXT_PUBLIC_DOCS_VERSION` 注入 tag 版本，本地开发回退到根目录版本，不要在页面里硬编码版本号。`build` job 在 tag 构建时还会 `grep` 断言 `index.html` 里出现 `v<版本>`，并且不出现重复前缀（`vv<版本>`）。

### 出网代理与远端约定

- 出网代理通过 OneDev 构建密钥 `CI_HTTP_PROXY` 配置，逻辑见 [scripts/ci-env.sh](../scripts/ci-env.sh)：设为空或 `none` 时直连，否则导出为 `HTTP_PROXY` / `HTTPS_PROXY`（`NO_PROXY` 默认 `127.0.0.1,localhost,::1`）。
- job 容器里的 `localhost` 指向容器自身，够不到宿主上的代理，所以代理必须填容器可达的宿主地址。`deploy` job 不需要代理：它只通过挂进来的宿主 Docker socket 干活。
- 远端名称约定：`github` 是公开仓库；`onedev` 对应 `${ONEDEV_REMOTE}`（生产 CI）；`onedev-local` 对应 `http://localhost:6610/fluere-vue.git`（本地 OneDev 演练）。推 tag 时先推分支、保证 tag 落在 `main` 可达提交上，再推 tag。

### 构建密钥与 tag 可达性

- `deploy` job 通过 `@secret:` 注入 `DEPLOY_ROOT` / `DEPLOY_BIND`；不写进仓库，每个 OneDev 实例各配一份，授权写 `on branch "**"`。缺密钥时构建直接失败。
- OneDev 的密钥授权是**按提交可达性**判定的：只有构建提交能从匹配分支到达时密钥才可用。因此部署 tag 必须指向 `main` 已包含的提交；tag 独享的提交会在调度前失败（`No authorized job secret found`），所有 job 一步都跑不了。完整部署约定见 [deployment.md](./deployment.md#环境变量与构建密钥)。

## GitHub Actions

配置见 [.github/workflows/ci.yml](../.github/workflows/ci.yml)。触发条件是 PR、推送到 `main` 和手动 `workflow_dispatch`；同一 ref 上的旧运行会被新提交取代（`concurrency.cancel-in-progress`），权限只读（`permissions: contents: read`），不发布也不部署——部署仍由 OneDev 的 tag 流程执行。

| job             | 内容                                                                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `check`         | `pnpm install --frozen-lockfile` → `pnpm check`（lint / format / tsc / i18n / version，含 changesets 配置校验）                                              |
| `test`          | `pnpm test`（完整 Vitest）                                                                                                                                   |
| `docs`          | `pnpm docs:generate`，检查文档内容和双语路由能否预渲染；产物不上传，部署使用 OneDev 的构建产物                                                               |
| `package-smoke` | `pnpm build` → `pnpm smoke:dist`（pack + publint / attw + fixture 消费）→ `REQUIRE_DIST=1 pnpm exec vitest run packages/ui/src/__tests__/dist-smoke.test.ts` |

- 工作流不写死 pnpm 版本，由 `pnpm/action-setup` 读根目录 `package.json` 的 `packageManager` 字段，与 OneDev 的 [scripts/ci-bootstrap.sh](../scripts/ci-bootstrap.sh) 同一口径。
- step 顺序不能反：`setup-node` 的 `cache: pnpm` 需要先有 pnpm 可执行文件，所以 `setup pnpm` 必须在 `setup node` 之前。
- `NODE_VERSION: '26'`，与 OneDev 的 `node:26-alpine` 对齐；版本只在 `setup-node` 处出现一次，避免多处漂移。
- `package-smoke` 独立成 job 的原因：仓库内各包的 `exports` 指向源码（ADR-0001 §4.1），`check` / `test` / `docs` 全程只走源码，`dist` 无人解析，需要一条专门兜住「发布形态」的链路。

## pnpm 版本与锁文件

- 根目录 `package.json` 的 `packageManager: pnpm@11.27.0` 是唯一版本源（`devEngines.packageManager` 同值）；CI 不写死版本号。
- OneDev 侧由 [scripts/ci-bootstrap.sh](../scripts/ci-bootstrap.sh) 读取该字段并 `npm install -g pnpm@<版本>`；GitHub Actions 侧由 `pnpm/action-setup` 读取同字段。Node 25 起发行版不再内置 Corepack，不能靠 Corepack 兑现这个字段。
- pnpm 11 会把包管理器自身的版本写进 `pnpm-lock.yaml` 的 `packageManagerDependencies`。运行期 pnpm 版本与 lockfile 记录不一致时，`pnpm install --frozen-lockfile` 会直接报 `lockfile is not up to date` 失败——这是 CI 必须装「精确版本」而不是浮动范围的原因。
- `pnpm-lock.yaml` 需要提交到仓库。CI 一律使用 `--frozen-lockfile` 安装。
- Node 版本要求 `>= 22.13`（`@nuxt/content` 的原生 sqlite 连接器），CI 统一固定为 Node 26。
- 版本号的 bump、tag 与发布口径不在本文范围，见 [release.md](./release.md)。

## 本地复现

本地复现主要检查（与 OneDev / GitHub Actions 的 job 一一对应）：

```bash
pnpm install --frozen-lockfile
pnpm check        # lint / format / tsc / i18n / version
pnpm test         # 全量 Vitest
pnpm docs:generate
```

- 本地 pnpm 版本必须与 `packageManager` 一致（`pnpm -v` 核对；启用 Corepack 后会自动切换）。
- 复现 `check` job 的 buildspec 自校验（需要 Python 3 + PyYAML）：

  ```bash
  pip install --no-cache-dir --quiet pyyaml
  pnpm lint:buildspec
  ```

- 复现 `package-smoke` 的发布产物链路：

  ```bash
  pnpm build
  pnpm smoke:dist
  REQUIRE_DIST=1 pnpm exec vitest run packages/ui/src/__tests__/dist-smoke.test.ts
  ```

- `pnpm docs:generate` 的产物在 `apps/docs/.output/public`，也就是 `build` job 上传、`deploy` job 下载的同一份目录。
- 本地部署演练（生成产物 → 起 nginx 容器）见 [deployment.md](./deployment.md#本地演练)。
