#!/bin/sh
# CD 部署脚本：把 build job 产出的文档站静态产物部署成本机的一个 nginx 容器。
#
# 运行位置：OneDev 的 deploy job 容器里（镜像 docker:29-cli）；也可以在本机直接跑做演练。
#
# 为什么全程用 docker CLI 而不是 OneDev 的 RunContainerStep / services：
#   - RunContainerStep 的 schema 没有 ports 字段，services 也没有端口与卷挂载，
#     两者都无法把端口发布到宿主，只有 `docker run` 能；
#   - OneDev 的 ServerDockerExecutor 配了 mountDockerSock=true，job 容器里能访问宿主
#     的 /var/run/docker.sock，于是 `docker run -v ...` 的路径全部按**宿主**解析。
#     注意：因此 job 容器内并不存在 /srv/fluere-vue，所有宿主侧写操作都必须通过
#     helper 容器（挂载宿主目录）完成，本脚本里统一走 root_do / stdin 管道。
#
# 幂等性：同一个 tag 重跑会先清空对应 release 目录再解包；nginx 容器每次重建。
# 失败即失败：健康检查不过会尽量把 current 切回上一个 release，并以非零码退出。
#
# 用法：
#   sh scripts/deploy.sh <tag>          # tag 形如 v0.0.1
#
# 环境变量（默认值即两个 OneDev 实例统一使用的值，改这里等于改部署目标）：
#   DEPLOY_ROOT     部署根目录（releases/<tag> + current）  默认 /srv/fluere-vue
#   DEPLOY_BIND     宿主监听地址:端口，只绑回环              默认 127.0.0.1:8080
#   SITE_DIR        站点产物来源目录                         默认 site
#   NGINX_IMAGE     nginx 镜像                               默认 nginx:1.29-alpine
#   DEPLOY_CONTAINER 容器名                                  默认 fluere-vue-web
#   KEEP_RELEASES   保留的历史 release 个数（不含 current）   默认 5
#   HELPER_IMAGE    宿主编排用的临时容器镜像                  默认 alpine:3.22

set -eu

TAG="${1:-${DEPLOY_TAG:-}}"
if [ -z "$TAG" ]; then
    echo "[deploy] 用法：sh scripts/deploy.sh <tag>（或设 DEPLOY_TAG）" >&2
    exit 2
fi
# tag 形如 v0.0.1，页面上渲染的是 v0.0.1；取去掉 v 的部分用于版本断言
VERSION="${TAG#v}"

DEPLOY_ROOT="${DEPLOY_ROOT:-/srv/fluere-vue}"
DEPLOY_BIND="${DEPLOY_BIND:-127.0.0.1:8080}"
SITE_DIR="${SITE_DIR:-site}"
NGINX_IMAGE="${NGINX_IMAGE:-nginx:1.29-alpine}"
DEPLOY_CONTAINER="${DEPLOY_CONTAINER:-fluere-vue-web}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"
HELPER_IMAGE="${HELPER_IMAGE:-alpine:3.22}"

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
CONF_DIR="$SCRIPT_DIR/../deploy/nginx"
RELEASE_REL="releases/$TAG"
RELEASE_DIR="$DEPLOY_ROOT/$RELEASE_REL"

# 在 helper 容器里、以宿主 $DEPLOY_ROOT 为工作目录执行命令（不经过 shell，免去转义）
root_do() {
    docker run --rm -v "$DEPLOY_ROOT:$DEPLOY_ROOT" -w "$DEPLOY_ROOT" "$HELPER_IMAGE" "$@"
}

echo "[deploy] tag=$TAG version=$VERSION root=$DEPLOY_ROOT bind=$DEPLOY_BIND"

# --- 0) 前置检查 -----------------------------------------------------------
docker version >/dev/null 2>&1 || {
    echo "[deploy] 访问不到 docker daemon：job 容器是否挂了 /var/run/docker.sock？" >&2
    exit 1
}
for f in "$CONF_DIR/fluere-vue.conf" "$CONF_DIR/security-headers.inc"; do
    [ -f "$f" ] || {
        echo "[deploy] 缺少 $f" >&2
        exit 1
    }
done
if [ ! -f "$SITE_DIR/index.html" ]; then
    echo "[deploy] $SITE_DIR/index.html 不存在：artifact 没取到？" >&2
    ls -la "$SITE_DIR" 2>&1 | head -20 >&2 || true
    exit 1
fi

# --- 1) 准备 release 目录（同 tag 重跑先清空） ------------------------------
root_do rm -rf "$RELEASE_REL"
root_do mkdir -p "$RELEASE_REL"

# --- 2) 解包产物到宿主 -----------------------------------------------------
# job 容器的工作区不在宿主上，只能把 tar 流经 stdin 送进挂了宿主目录的 helper。
tar -cf - -C "$SITE_DIR" . \
    | docker run --rm -i -v "$RELEASE_DIR:/out" "$HELPER_IMAGE" tar -xf - -C /out

# 管道里 set -e 拦不住上游 tar 失败（POSIX sh 无 pipefail），所以解包后按关键文件复核。
# 用 ls 而不是 test：busybox 的 test 不一定作为独立命令存在。
for f in index.html 404.html; do
    root_do ls "$RELEASE_REL/$f" >/dev/null || {
        echo "[deploy] 解包后缺少 $f，产物可能不完整" >&2
        exit 1
    }
done

# --- 3) 同步 nginx 配置到宿主 ----------------------------------------------
# 配置里的 __DEPLOY_ROOT__ 用真实部署根目录替换，保证「脚本可改根目录」名副其实。
docker run --rm -v "$DEPLOY_ROOT:$DEPLOY_ROOT" "$HELPER_IMAGE" mkdir -p "$DEPLOY_ROOT/nginx"
sed "s|__DEPLOY_ROOT__|$DEPLOY_ROOT|g" "$CONF_DIR/fluere-vue.conf" \
    | docker run --rm -i -v "$DEPLOY_ROOT/nginx:/out" "$HELPER_IMAGE" sh -c 'cat > /out/fluere-vue.conf'
docker run --rm -i -v "$DEPLOY_ROOT/nginx:/out" "$HELPER_IMAGE" sh -c 'cat > /out/security-headers.inc' \
    < "$CONF_DIR/security-headers.inc"

# --- 4) 起 nginx 容器（每次重建，保证 conf / 端口 / 镜像都与仓库一致） ------
if ! docker image inspect "$NGINX_IMAGE" >/dev/null 2>&1; then
    echo "[deploy] 拉取 $NGINX_IMAGE"
    docker pull "$NGINX_IMAGE" >/dev/null
fi
docker rm -f "$DEPLOY_CONTAINER" >/dev/null 2>&1 || true
docker run -d --name "$DEPLOY_CONTAINER" \
    --restart unless-stopped \
    --label "fluere-vue.release=$TAG" \
    -p "$DEPLOY_BIND:80" \
    -v "$DEPLOY_ROOT:$DEPLOY_ROOT:ro" \
    -v "$DEPLOY_ROOT/nginx:/etc/nginx/conf.d:ro" \
    --health-cmd 'wget -q -O /dev/null http://127.0.0.1/ || exit 1' \
    --health-interval 30s \
    --health-timeout 5s \
    --health-retries 3 \
    --health-start-period 5s \
    --log-opt max-size=10m \
    --log-opt max-file=3 \
    "$NGINX_IMAGE" >/dev/null

# nginx 配置写错会在启动瞬间退出，这里先给一秒再判活，日志直接打到构建日志里。
sleep 1
if [ "$(docker inspect -f '{{.State.Running}}' "$DEPLOY_CONTAINER" 2>/dev/null || echo false)" != "true" ]; then
    echo "[deploy] nginx 容器没起来，日志：" >&2
    docker logs --tail 80 "$DEPLOY_CONTAINER" >&2 || true
    exit 1
fi

# --- 5) 切 current 符号链接 ------------------------------------------------
# ln -sfn 是 unlink+link（不是原子 rename），存在极短的空窗；静态站可接受，
# 且必须在健康检查之前切、失败再切回来，才能保证「线上要么新版本、要么旧版本」。
PREV="$(docker run --rm -v "$DEPLOY_ROOT:$DEPLOY_ROOT" -w "$DEPLOY_ROOT" \
    "$HELPER_IMAGE" readlink current 2>/dev/null || true)"
root_do ln -sfn "$RELEASE_REL" current

# --- 6) 健康检查 -----------------------------------------------------------
# ① 首页字节与 release 里的 index.html 完全一致（证明真的在服务新版本，而不是旧缓存/旧挂载）
# ② 页面上出现本次 tag 的版本号
# ③ 不存在的路径返回 404（error_page 生效，没有 SPA 回退把 404 变成 200）
# 显式声明 identity 编码：否则一旦 nginx 对 wget 回了 gzip，字节比对与 grep 都会假失败
# （表现为「首页内容与 release 不一致」，是最难查的一类误报）。
IDENTITY="Accept-Encoding: identity"

health_check() {
    expected="$(docker run --rm -v "$DEPLOY_ROOT:$DEPLOY_ROOT" "$HELPER_IMAGE" \
        sha256sum "$RELEASE_DIR/index.html" | cut -d' ' -f1)"
    actual="$(docker exec "$DEPLOY_CONTAINER" \
        wget -q --header "$IDENTITY" -O - http://127.0.0.1/ | sha256sum | cut -d' ' -f1)"
    if [ "$expected" != "$actual" ]; then
        echo "[deploy] 首页内容与 $RELEASE_REL/index.html 不一致（hash 不符）" >&2
        return 1
    fi
    if ! docker exec "$DEPLOY_CONTAINER" \
        wget -q --header "$IDENTITY" -O - http://127.0.0.1/ | grep -q "v$VERSION"; then
        echo "[deploy] 首页没有出现版本号 v$VERSION" >&2
        return 1
    fi
    # -S 把响应头打到 stderr，这样能确认是「404」而不是连不上/超时
    missing="$(docker exec "$DEPLOY_CONTAINER" \
        wget -q -S -O /dev/null http://127.0.0.1/__deploy_probe__ 2>&1 || true)"
    case "$missing" in
        *404*) ;;
        *)
            echo "[deploy] 未知路径没有返回 404：$missing" >&2
            return 1
            ;;
    esac
    return 0
}

if health_check; then
    echo "[deploy] 健康检查通过：$TAG 已上线（http://$DEPLOY_BIND）"
else
    echo "[deploy] 健康检查失败，容器日志末尾 20 行（排查用）：" >&2
    docker logs --tail 20 "$DEPLOY_CONTAINER" >&2 || true
    if [ -n "$PREV" ]; then
        echo "[deploy] 回滚 current → $PREV（失败的 release 目录保留在 $RELEASE_REL 供排查）" >&2
        root_do ln -sfn "$PREV" current
    fi
    exit 1
fi

# --- 7) 清理历史 release ---------------------------------------------------
# 只按修改时间保留最近 N 个，且永不删 current 指向的那个（回滚要能切回去）。
docker run --rm -v "$DEPLOY_ROOT:$DEPLOY_ROOT" -w "$DEPLOY_ROOT/releases" \
    -e KEEP_RELEASES="$KEEP_RELEASES" "$HELPER_IMAGE" sh -c '
    cur="$(readlink ../current 2>/dev/null | sed "s|^releases/||")"
    ls -1dt ./*/ 2>/dev/null | sed "s|^\./||; s|/\$||" \
        | tail -n +$((KEEP_RELEASES + 1)) | while IFS= read -r d; do
        [ "$d" = "$cur" ] && continue
        echo "[deploy] 清理旧 release：$d"
        rm -rf -- "$d"
    done
'

echo "[deploy] 完成"
