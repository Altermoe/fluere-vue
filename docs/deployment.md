# 持续部署（CD）

## 概览

只有推送 `v*` tag 才会部署；推送到 `main` 只执行验证。部署入口是 OneDev 的 `deploy` job（[.onedev-buildspec.yml](../.onedev-buildspec.yml)），实际动作全部在 [scripts/deploy.sh](../scripts/deploy.sh) 里；GitHub Actions 不负责部署（见 [ci.md](./ci.md)）。

`deploy` job 依赖 `check` / `test` / `build` / `package-smoke` 全部成功，并取 `build` 的 artifact，然后执行：

```bash
sh scripts/deploy.sh "$DEPLOY_TAG"
```

脚本本身是幂等的，按以下顺序执行；同一个 tag 重跑会先清空对应 release 目录再解包，nginx 容器每次重建：

| 步骤 | 动作                                                                      |
| ---- | ------------------------------------------------------------------------- |
| 0    | 前置检查：Docker daemon 可达、nginx 配置存在、`$SITE_DIR/index.html` 存在 |
| 1    | 清空并重建宿主上的 `releases/<tag>` 目录                                  |
| 2    | 把站点产物打包成 tar 流经 stdin 解包到宿主（job 容器里没有部署目录）      |
| 3    | 同步 nginx 配置到宿主，并把 `__DEPLOY_ROOT__` 替换成真实部署根目录        |
| 4    | 重建 nginx 容器（镜像、端口、配置都与仓库一致）                           |
| 5    | 把 `current` 符号链接切到新 release                                       |
| 6    | 健康检查；失败则把 `current` 切回旧版本并非零退出                         |
| 7    | 清理历史 release（保留 `KEEP_RELEASES` 个，且永不删 `current` 指向的）    |

## 部署目录

```text
${DEPLOY_ROOT}/
├── nginx/                    # fluere-vue.conf（含 security-headers.inc），每次部署时从仓库同步
├── releases/<tag>/           # 站点静态产物，保留最近 5 个（KEEP_RELEASES）
└── current -> releases/<tag> # 指向当前版本的符号链接，可切换到旧版本回滚
```

- `current` 是 `ln -sfn` 建立/改写的（unlink + link，不是原子 rename），存在极短的空窗；静态站可接受，且它必须在健康检查之前切换、失败再切回来，才能保证「线上要么新版本、要么旧版本」。
- 清理只按修改时间保留最近 `KEEP_RELEASES` 个 release（`current` 指向的目录通常就在这 N 个之内），若 `current` 恰好排在这 N 个之外则额外保留——回滚要能切回去。
- 配置里的 `__DEPLOY_ROOT__` 由脚本用真实部署根目录替换，修改部署根目录时不用维护两份 nginx 配置。
- 部署根目录由 Docker 以 root 身份创建，查看或清理时需要 `sudo`，也可以走 helper 容器（见下文「回滚」）。

## 环境变量与构建密钥

[scripts/deploy.sh](../scripts/deploy.sh) 支持的环境变量：

| 变量               | 必填 | 默认                | 作用                                            |
| ------------------ | ---- | ------------------- | ----------------------------------------------- |
| `DEPLOY_ROOT`      | 是   | 无（缺值即失败）    | 部署根目录（`releases/<tag>` + `current`）      |
| `DEPLOY_BIND`      | 是   | 无（缺值即失败）    | 宿主监听地址:端口，只绑回环                     |
| `SITE_DIR`         | 否   | `site`              | 站点产物来源目录（CI 里 artifact 下载到的位置） |
| `DEPLOY_TAG`       | 否   | 无                  | tag，也可用第一个位置参数传入                   |
| `NGINX_IMAGE`      | 否   | `nginx:1.29-alpine` | nginx 镜像                                      |
| `DEPLOY_CONTAINER` | 否   | `fluere-vue-web`    | 容器名                                          |
| `KEEP_RELEASES`    | 否   | `5`                 | 保留的最近 release 个数（`current` 通常在其中） |
| `HELPER_IMAGE`     | 否   | `alpine:3.22`       | 宿主机侧临时容器镜像                            |

- `DEPLOY_ROOT` 与 `DEPLOY_BIND` 是「部署位置」类私有值，不写入仓库。CI 由两个实例的 OneDev 构建密钥同名注入，授权写 `on branch "**"`；缺密钥时构建直接失败。故意不设默认值，避免默默部署到示例路径。
- OneDev 的密钥授权会检查构建提交是否能从匹配分支到达。因此，**部署 tag 必须指向 `main` 已包含的提交**；如果 tag 指向的提交只能通过该 tag 访问，任务会在调度前因 `No authorized job secret found` 失败，所有 job 一步都跑不了，部署步骤根本不会开始。
- 本地演练从被 gitignore 的 `.env.local` 读私有值，格式见 [.env.example](../.env.example)。仓库代码不会自动加载它，只是格式对照。
- `CI_HTTP_PROXY` 与部署无关：`deploy` job 只通过挂进来的宿主 Docker socket 干活，拉镜像由宿主 daemon 完成，所以不需要出网代理（CI 代理口径见 [ci.md](./ci.md#onedev)）。
- `${DOCS_PUBLIC_URL}` 是部署后的对外地址，TLS 在宿主反向代理处终止。链路探活、视觉回归等 AI / 自动化检查通过这个地址访问部署产物；它不是构建期依赖，构建过程只读取 `current` 中的静态文件。真实值保存在 `.env.local`，示例见 [.env.example](../.env.example)。

### Docker socket 与 job executor

- `deploy` job 的 executor 是 `ServerDockerExecutor`，并启用了 `mountDockerSock`，所以 job 容器里能访问宿主的 `/var/run/docker.sock`。
- 由此 `docker run -v ...` 中的路径全部按**宿主机路径**解析。反过来，job 容器内并不存在部署目录，所有宿主侧写操作都必须通过挂载了宿主目录的 helper 容器完成（脚本里统一走 `root_do` 与 stdin 管道）。
- 这也是不用 OneDev `RunContainerStep` / `services` 的原因：前者的 schema 没有 `ports` 字段，后者也没有端口与卷挂载，两者都无法把端口发布到宿主，只有 `docker run` 能。
- `deploy` job 容器镜像固定 `docker:29-cli`，CLI 会向下协商 API 版本，daemon 更旧的实例同样可用。

## Nginx 与缓存

- 容器用 `${NGINX_IMAGE}` 镜像，名称为 `${DEPLOY_CONTAINER}`，端口映射 `-p ${DEPLOY_BIND}:80`，只绑定宿主回环地址。容器内 nginx 只监听 80 端口，提供 `current` 目录中的文件；TLS 证书、域名和 HSTS 由上层反向代理处理，仓库中不配置证书。
- 挂载：`${DEPLOY_ROOT}` 以 ro 挂进容器，`${DEPLOY_ROOT}/nginx` 以 ro 挂到 `/etc/nginx/conf.d`。改配置 = 改仓库 + 重新部署，不需要重建镜像。
- 容器以 `--restart unless-stopped` 运行，带 `fluere-vue.release=<tag>` 标签，日志限制为 `max-size=10m` / `max-file=3`；Docker healthcheck 为 `wget -q -O /dev/null http://127.0.0.1/ || exit 1`，`interval=30s` / `timeout=5s` / `retries=3` / `start-period=5s`。
- nginx 配置位于 [deploy/nginx/fluere-vue.conf](../deploy/nginx/fluere-vue.conf)，安全响应头配置位于 [deploy/nginx/security-headers.inc](../deploy/nginx/security-headers.inc)；`server_tokens off` 不暴露 nginx 版本号。

### 缓存规则

| 路径                                                                     | 缓存策略                              |
| ------------------------------------------------------------------------ | ------------------------------------- |
| 默认（`location /`，预渲染 HTML 目录式路由）                             | `Cache-Control: no-cache`             |
| `^~ /_nuxt/`                                                             | `public, max-age=31536000, immutable` |
| `^~ /__nuxt_content/`                                                    | `Cache-Control: no-cache`             |
| `^~ /_i18n/`                                                             | `public, max-age=86400`               |
| `~* (?:\.html\|_payload\.json)$`                                         | `Cache-Control: no-cache`             |
| 其余静态资源（css / js / map / svg / 图片 / 字体 / wasm / txt / xml 等） | `public, max-age=3600`                |

- `/_nuxt/` 文件名含内容哈希，可以长缓存；`__nuxt_content/<collection>/sql_dump.txt` 文件名固定、内容随发布变化，绝不能长缓存；`/_i18n/` 目录名带构建哈希，但哈希是否随内容变化不由本仓库保证，因此保守只给一天。
- nginx 的 `add_header` 是「覆盖」而非「叠加」：某个层级只要自己写了 `add_header`，上层全部失效。所以每个写了缓存头的 location 都必须重新 `include /etc/nginx/conf.d/security-headers.inc`，否则安全头会静默消失。
- 压缩：官方 nginx 镜像带 `gzip_static` 但没有 brotli 模块（写 `brotli_static` 会让容器起不来）。仓库当前不生成 `.gz` 产物，所以实际生效的是动态 gzip（`gzip on` + `gzip_comp_level 5` + `gzip_min_length 1024` + `gzip_types ...`）；`gzip_static on` 只是给将来预压缩产物留的开关。
- 路由：`try_files $uri $uri/index.html =404`，**故意不写 `$uri/`**——那会让 nginx 对无尾斜杠的目录发 301，而文档站用 Nuxt Content 的 `path` 精确匹配，多一个尾斜杠就查不到正文。未知路径走 `error_page 404 /404.html`，没有 SPA 回退把 404 变成 200。

## 健康检查

`scripts/deploy.sh` 的健康检查包含三项，全部通过才算部署成功：

1. 首页响应字节与 release 中的 `index.html` 完全一致（sha256 比对），证明真的在服务新版本，而不是旧缓存 / 旧挂载。
2. 首页包含本次 tag 的版本号 `v<去掉 v 前缀的版本>`。
3. 不存在的路径 `/__deploy_probe__` 返回 404（确认 `error_page` 生效）。

相关细节：

- 请求显式带 `Accept-Encoding: identity`：否则一旦 nginx 对 wget 回了 gzip，字节比对与 `grep` 都会假失败（表现为「首页内容与 release 不一致」，是最难查的一类误报）。
- 404 判定用 `wget -S` 把响应头打到 stderr，从而区分「真的 404」与连不上 / 超时。
- nginx 容器启动后先 `sleep 1` 再检查 `State.Running`（配置写错会在启动瞬间退出），没起来就打印末尾日志并非零退出。
- 健康检查失败时：打印容器日志末尾 20 行 → 把 `current` 切回上一个 release（若存在）→ 以非零状态退出；失败的 release 目录保留在原处供排查。

## 回滚

- 自动回滚：部署时健康检查未通过，脚本会把 `current` 切回旧版本；清理历史 release 时也永不删除 `current` 指向的那个。
- 手动回滚（把链接指回某个旧 tag，立即生效，不需要重启容器）：

  ```bash
  docker run --rm -v "${DEPLOY_ROOT}:/d" -w /d alpine:3.22 ln -sfn releases/<旧 tag> current
  ```

- 查看当前指向与已有 release：

  ```bash
  docker run --rm -v "${DEPLOY_ROOT}:/d" -w /d alpine:3.22 sh -c 'readlink current; ls -1 releases'
  ```

- 部署根目录由 Docker 以 root 身份创建，直接在宿主上查看或清理需要 `sudo`，也可以用上面的 helper 容器绕开权限问题。
- npm 版本回滚、撤 tag、`dist-tag` 回指属于另一条链路，见 [release.md](./release.md#回滚与补救)。

## 本地演练

本地演练不需要 CI，先本地生成产物，再执行部署脚本：

```bash
pnpm docs:generate
. ./.env.local && SITE_DIR=apps/docs/.output/public sh scripts/deploy.sh v0.0.1
```

- `.env.local` 被 gitignore；从 [.env.example](../.env.example) 复制格式并填入真实的 `DEPLOY_ROOT` / `DEPLOY_BIND`（地址与端口只绑回环）。
- tag 形如 `v0.0.1`（页面上渲染的是 `v0.0.1`）。也可以不传位置参数、改用 `DEPLOY_TAG=<tag> sh scripts/deploy.sh`。
- `SITE_DIR` 不设置时默认使用 CI 中 artifact 下载到的 `site/` 目录；本地演练指向 `apps/docs/.output/public`。
- 前置条件：Docker daemon 可达、`deploy/nginx/fluere-vue.conf` 与 `security-headers.inc` 存在、`$SITE_DIR/index.html` 存在；任一项不满足脚本会立即失败。
- 部署完成后从 `http://${DEPLOY_BIND}` 访问（只绑回环）。对外的 `${DOCS_PUBLIC_URL}` 需要宿主反向代理接上并在 HTTPS 终止处生效。
