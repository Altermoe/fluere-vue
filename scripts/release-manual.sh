#!/usr/bin/env bash
# 本地手动发布脚本：把 @fluere-vue/* 六包发布到 npm（首发 bootstrap / 后续手动发版）。
#
# 为什么需要它：npm 的 trusted publisher 只能挂在**已存在**的包上，没有 pending publisher，
# 六个包从未发布过 ⇒ 第一个版本必须用粒度 token / 本机 `pnpm login` 人工 bootstrap；之后才轮到
# .github/workflows/release.yml 的 OIDC 自动发布（见 docs/release.md）。本脚本把 release.md 的
# 手工流程收敛成一条命令：带阶段横幅、逐步确认、并对「版本/tag 合法性」做前置校验。
#
# 用法（`--` 可加可不加：pnpm 会把它原样透传，脚本已当分隔符忽略）：
#   pnpm release:manual                      # 发布当前 package.json 版本（原样，不 bump）
#   pnpm release:manual 0.3.0-rc.1           # 目标高于当前：先把根 seed 到该版本再发布
#   pnpm release:manual --yes                # 全程免确认（CI / 熟练用户）
#   pnpm release:manual --dry-run            # 只跑到预览，不发布 / 不打 tag / 不推送
#   pnpm release:manual --check              # 只跑前置检查后退出（自测用，零副作用）
#   pnpm release:manual --move-tag           # 部署 tag v<version> 已存在时，把它移到本次发布提交
#
# 关键事实（改本脚本前先读，均为实测结论）：
#   - 本机 ~/.npmrc 的 registry 可能是镜像（如腾讯云）；发布必须强制 registry.npmjs.org，
#     且 changesets 在 pnpm workspace 下调的是 pnpm，故 `npm_config_registry` 与
#     `PNPM_CONFIG_REGISTRY` 要**同时**导出。
#   - `changeset publish` **没有 `--dry-run`**；预览用 `changeset publish-plan`（只读，产出发布计划）。
#   - pre 模式（.changeset/pre.json 存在且 mode=pre）下**不能传 `--tag`**，否则 changesets 报
#     "Releasing under custom tag is not allowed in pre mode!" 并退出 1；它自动用 pre 的 tag。
#   - **部署 tag 冲突必须在发布之前判定**：`v<version>` 是文档站部署标记，可能早于真正的 npm 发布
#     就被打上（先把版本 seed 到 X 并对齐文档站、之后又原样发布 X，就会撞车，2026-10-13 踩过）。
#     故第 1.5 步提前判定该 tag 是否存在/指向哪个提交：指向当前提交则复用，否则默认**早退**；
#     确需把 tag 移到本次发布提交时才加 `--move-tag`（用 `git tag -f` 重建，并只对该 tag force push）。
#   - **推送用显式 refspec，不用 `--follow-tags`**：`--follow-tags` 会顺带推所有从本次提交可达的
#     注解 tag，遇到远端已存在且已分叉的历史 tag（如本地与 onedev 的 v0.0.1 不同）整条 push 会失败。
#     改为只推「分支 + 部署 tag + 本次逐包 tag」，且逐包 tag 不存在时自动跳过。
#
# 幂等性：changeset publish 会跳过 registry 上已存在的版本，同一 commit 重跑安全。
set -euo pipefail

SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SELF_DIR/.." && pwd)"
REGISTRY="https://registry.npmjs.org"
VERSION_MJS="$ROOT_DIR/scripts/version.mjs"
PUBLISHABLE="designs hooks icons themes ui utils"
# 发布相关命令一律走 pnpm（根 package.json 的 devEngines/packageManager 要求它）：用 npm 在仓库根会被
# EBADDEVENGINES 拦下；即便从子包目录运行，npm 也会对根 .npmrc 的 pnpm 专属键（shamefully-hoist 等）
# 报 "Unknown project config" 警告。pnpm 从仓库根运行既无 engine 报错，也无这些警告。

STAGE="startup"

# --- 输出助手（前缀对齐 deploy.sh 的 [deploy] 风格） -------------------------
log() { printf '[release] %s\n' "$*"; }
warn() { printf '[release] ⚠️  %s\n' "$*" >&2; }
die() {
    printf '[release] ✖ %s\n' "$*" >&2
    exit 1
}
# 用法/参数类错误退出码 2（与成功 0、运行失败 1 区分）
die2() {
    printf '[release] ✖ %s\n' "$*" >&2
    exit 2
}
stage() { printf '\n[release] ===== %s =====\n' "$*"; }

# 中断时说清停在哪，并给出回退/补救方向。
trap 'printf "\n[release] ✖ 中断于阶段：%s\n[release] 发布前的改动可用 git checkout -- <文件> 回退；发布后见 docs/release.md#回滚与补救\n" "$STAGE" >&2' ERR

usage() {
    cat <<'EOF'
用法：pnpm release:manual [-- <version>] [选项]

  <version>            目标版本（可带 v 前缀）。省略 = 发布根 package.json 当前版本。
                       高于当前 → 先 seed 根再 version:sync 到该版本；低于当前 → 直接报错。

选项：
  -y, --yes           全程免确认（非交互环境必须加）
  --dry-run           只跑到发布预览，不发布 / 不打 tag / 不推送
  --check             只跑前置检查后退出（自测用，零副作用）
  --move-tag          部署 tag v<version> 已存在且指向别的提交时，允许把它移到本次发布提交
                      （会用 git tag -f 重建、并只对该 tag force push；默认遇冲突直接早退）
  --allow-dirty       允许工作树不干净（版本写入会混入现有改动）
  --skip-gate         跳过 check / build / test / smoke 质量闸（重试时省时）
  --pre-exit          发布后执行 changeset pre exit（默认不做）
  --dist-tag <name>   覆盖推断出的 npm dist-tag（预发布默认用其标识，如 rc / alpha）
  -h, --help          显示本帮助

提示：`--` 分隔符可加可不加（pnpm 会原样透传，脚本已当分隔符忽略）。
EOF
}

# 通用确认：--yes 直接放行；非 TTY 且未 --yes 直接失败；只接受 y/yes。
confirm() {
    local prompt="$1"
    if [ "$ASSUME_YES" -eq 1 ]; then
        log "(--yes) 自动确认：$prompt"
        return 0
    fi
    [ -t 0 ] || die "非交互环境必须加 --yes：$prompt"
    local reply=""
    if ! read -r -p "[release] $prompt [y/N] " reply; then
        return 1
    fi
    case "$reply" in
        y | Y | yes | YES | Yes) return 0 ;;
        *) return 1 ;;
    esac
}

# 二次确认（最不可逆的两步：真发布与 push）：要求把版本号原样敲一遍。
confirm_type() {
    local expected="$1" prompt="$2"
    if [ "$ASSUME_YES" -eq 1 ]; then
        log "(--yes) 自动确认：$prompt"
        return 0
    fi
    [ -t 0 ] || die "非交互环境必须加 --yes：$prompt"
    local reply=""
    if ! read -r -p "[release] $prompt（请输入 $expected 以继续）： " reply; then
        return 1
    fi
    [ "$reply" = "$expected" ]
}

# --- 参数解析 ---------------------------------------------------------------
TARGET_ARG=""
ASSUME_YES=0
DRY_RUN=0
CHECK_ONLY=0
ALLOW_DIRTY=0
SKIP_GATE=0
PRE_EXIT=0
MOVE_TAG=0
DIST_TAG_OVERRIDE=""

while [ $# -gt 0 ]; do
    case "$1" in
        -y | --yes) ASSUME_YES=1; shift ;;
        --dry-run) DRY_RUN=1; shift ;;
        --check) CHECK_ONLY=1; shift ;;
        --allow-dirty) ALLOW_DIRTY=1; shift ;;
        --skip-gate) SKIP_GATE=1; shift ;;
        --move-tag) MOVE_TAG=1; shift ;;
        --pre-exit) PRE_EXIT=1; shift ;;
        --dist-tag)
            [ $# -ge 2 ] || die2 "--dist-tag 缺少值"
            DIST_TAG_OVERRIDE="$2"
            shift 2
            ;;
        -h | --help) usage; exit 0 ;;
        # pnpm 会把 `--` 原样透传给脚本（`pnpm release:manual -- --yes` 见实测），
        # 当作分隔符忽略即可；版本号不会以 `-` 开头，无需用它保护位置参数。
        --) shift ;;
        -*) die2 "未知参数：$1（--help 查看用法）" ;;
        *)
            [ -z "$TARGET_ARG" ] || die2 "多余参数：$1"
            TARGET_ARG="$1"
            shift
            ;;
    esac
done

# --- 0) 前置检查（只读；--check 到此为止） ----------------------------------
STAGE="0) 前置检查"
stage "0) 前置检查"

[ "$(git -C "$ROOT_DIR" rev-parse --show-toplevel 2>/dev/null || true)" = "$ROOT_DIR" ] ||
    die "请在仓库根运行（脚本定位到 $ROOT_DIR）"
for f in package.json pnpm-workspace.yaml .changeset/config.json; do
    [ -f "$ROOT_DIR/$f" ] || die "缺少 $ROOT_DIR/$f：这里不是 fluere-vue 仓库？"
done
for tool in node pnpm npm git; do
    command -v "$tool" >/dev/null 2>&1 || die "缺少命令：$tool"
done

PKG_MGR="$(node -p "require('$ROOT_DIR/package.json').packageManager || ''")"
PNPM_EXPECT="${PKG_MGR#pnpm@}"
PNPM_ACTUAL="$(pnpm -v 2>/dev/null || echo '')"
if [ -n "$PNPM_EXPECT" ] && [ "$PNPM_ACTUAL" != "$PNPM_EXPECT" ]; then
    warn "pnpm 版本不一致：当前 $PNPM_ACTUAL，packageManager 要求 $PNPM_EXPECT（建议 corepack enable）"
fi

# 工作树干净（版本写入/提交不应与无关改动混在一起）
DIRTY="$(git -C "$ROOT_DIR" status --porcelain || true)"
if [ -n "$DIRTY" ]; then
    warn "工作树不干净："
    printf '%s\n' "$DIRTY" | sed 's/^/    /' >&2
    if [ "$ALLOW_DIRTY" -eq 1 ] || [ "$DRY_RUN" -eq 1 ] || [ "$CHECK_ONLY" -eq 1 ]; then
        warn "已继续（--allow-dirty / --dry-run / --check 不落地改动）"
    else
        die "请先提交/暂存，或加 --allow-dirty 继续"
    fi
fi

BRANCH="$(git -C "$ROOT_DIR" rev-parse --abbrev-ref HEAD)"
HEAD_SHA="$(git -C "$ROOT_DIR" rev-parse HEAD)"
REMOTE="$(git -C "$ROOT_DIR" config --get "branch.$BRANCH.remote" 2>/dev/null || true)"
[ -n "$REMOTE" ] || REMOTE="origin"
[ "$BRANCH" = "main" ] || warn "当前分支是 $BRANCH，不是 main"
if git -C "$ROOT_DIR" remote get-url "$REMOTE" >/dev/null 2>&1; then
    if ! git -C "$ROOT_DIR" branch -r --contains HEAD 2>/dev/null | grep -q .; then
        warn "HEAD 未包含在任何远端分支上：OneDev deploy 只认 main 可达提交上的 v* tag"
    fi
else
    warn "远端 '$REMOTE' 不存在，push 步骤会失败（可用 --dry-run 走到预览为止）"
fi

# npm registry 认证（首发必须本机登录 / token）
# --check / --dry-run 是只读流程，未登录不算失败；真正发布才强制。
# 注意：一律用 pnpm 从仓库根运行（见文件头：npm 会被 devEngines 拦下并对根 .npmrc 报警告）。
# pnpm 的报错信息走 stdout（npm 走 stderr），失败时必须丢弃 stdout，否则错误文本会被当成用户名/版本。
pnpm_whoami() {
    local user
    user="$(cd "$ROOT_DIR" && pnpm whoami --registry="$REGISTRY" 2>/dev/null)" || return 1
    printf '%s' "$user"
}
pnpm_view() {
    local out
    out="$(cd "$ROOT_DIR" && pnpm view "$@" --registry="$REGISTRY" 2>/dev/null)" || return 1
    printf '%s' "$out"
}
AUTH_REQUIRED=1
if [ "$CHECK_ONLY" -eq 1 ] || [ "$DRY_RUN" -eq 1 ]; then
    AUTH_REQUIRED=0
fi
if ! NPM_USER="$(pnpm_whoami)"; then
    warn "未登录 npm registry（registry=$REGISTRY）"
    log "请先执行：pnpm login --registry=$REGISTRY"
    if [ "$AUTH_REQUIRED" -eq 0 ]; then
        warn "只读流程（--check / --dry-run）继续；真正发布前必须登录"
    elif [ ! -t 0 ] || [ "$ASSUME_YES" -eq 1 ]; then
        die "未登录 npm registry，且当前无法交互登录：请先执行 pnpm login --registry=$REGISTRY"
    elif confirm "现在执行 pnpm login？"; then
        ( cd "$ROOT_DIR" && pnpm login --registry="$REGISTRY" ) || die "pnpm login 失败"
        NPM_USER="$(pnpm_whoami)" || die "登录后仍无法 whoami"
    else
        die "未登录 npm registry，无法发布"
    fi
fi
if [ -n "$NPM_USER" ]; then
    log "npm registry 用户：$NPM_USER"
fi

# 强制官方 registry（本机默认可能是镜像）
log "本机默认 registry：$(cd "$ROOT_DIR" && pnpm config get registry 2>/dev/null || echo unknown)"
export npm_config_registry="$REGISTRY"
export PNPM_CONFIG_REGISTRY="$REGISTRY"
log "本次发布强制 registry：$REGISTRY（npm_config_registry + PNPM_CONFIG_REGISTRY）"

# pre 模式与待发布 changeset
PRE_FILE="$ROOT_DIR/.changeset/pre.json"
PRE_MODE=0
PRE_TAG=""
if [ -f "$PRE_FILE" ]; then
    PRE_MODE=1
    PRE_TAG="$(node -p "require('$PRE_FILE').tag || ''")"
    log "changeset pre 模式：开（tag=$PRE_TAG，mode=$(node -p "require('$PRE_FILE').mode || ''")）"
else
    log "changeset pre 模式：关"
fi

PENDING="$(cd "$ROOT_DIR/.changeset" && ls -1 *.md 2>/dev/null | grep -v '^README' || true)"
if [ -n "$PENDING" ]; then
    log "待发布 changeset："
    printf '%s\n' "$PENDING" | sed 's/^/    /'
else
    log "待发布 changeset：无"
fi

CURRENT_VERSION="$(node -p "require('$ROOT_DIR/package.json').version")"
( cd "$ROOT_DIR" && pnpm version:check ) || die "版本一致性检查失败（pnpm version:check）"

# --- 1) 目标版本解析 --------------------------------------------------------
STAGE="1) 目标版本解析"
stage "1) 目标版本解析"

SEMVER_RE='^v?[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$'
if [ -n "$TARGET_ARG" ]; then
    [[ "$TARGET_ARG" =~ $SEMVER_RE ]] ||
        die2 "版本格式非法：$TARGET_ARG（应形如 0.3.0 或 0.3.0-rc.1，可带 v 前缀）"
    TARGET="${TARGET_ARG#v}"
else
    TARGET="$CURRENT_VERSION"
fi

CMP="$(node "$VERSION_MJS" compare "$TARGET" "$CURRENT_VERSION")" || die "版本比较失败"
case "$CMP" in
    -1) die "不能使用低于当前版本的 tag：目标 $TARGET < 当前 $CURRENT_VERSION" ;;
    0) log "目标版本 = 当前版本 $TARGET，将原样发布（不 bump、不新增 CHANGELOG 条目）" ;;
    1) log "目标版本 $TARGET > 当前版本 $CURRENT_VERSION，将先 seed 再发布" ;;
    *) die "版本比较返回异常：$CMP" ;;
esac

# --- 1.5) 部署 tag 冲突前置检查（必须在任何写盘 / 发布之前） -----------------
# 背景（2026-10-13 踩坑）：v<version> 是文档站部署标记，可能早于真正的 npm 发布就被打上——
# 先把全仓版本 seed 到 X 并对齐部署 tag vX，之后又用本脚本原样发布 X，便会「已经发出去了」
# 才在第 7 步发现 tag 已存在：白发布一次、且分支没推送。所以把判定提到发布之前，撞车即早退。
DEPLOY_TAG="v$TARGET"
DEPLOY_TAG_STATE="create" # create / reuse / move
if EXISTING_TAG_COMMIT="$(git -C "$ROOT_DIR" rev-list -n1 "$DEPLOY_TAG" 2>/dev/null)"; then
    if [ "$EXISTING_TAG_COMMIT" = "$HEAD_SHA" ]; then
        DEPLOY_TAG_STATE="reuse"
        log "部署 tag $DEPLOY_TAG 已存在且指向当前提交，将复用（不重建）"
    elif [ "$MOVE_TAG" -eq 1 ]; then
        DEPLOY_TAG_STATE="move"
        warn "部署 tag $DEPLOY_TAG 已存在，指向 ${EXISTING_TAG_COMMIT:0:7}（非当前提交）；--move-tag 已指定，将移到 ${HEAD_SHA:0:7}"
    else
        die2 "部署 tag $DEPLOY_TAG 已存在，指向 ${EXISTING_TAG_COMMIT:0:7}，不是当前提交 ${HEAD_SHA:0:7}。
  这通常说明该版本号已被 seed / 打过部署 tag，但还不是真正的发布版本。
  推荐：不要复用这个版本号——把版本往上 bump（例如 $TARGET -> 新版本）后再发布；
  确需把部署 tag 移到本次发布提交，则显式加 --move-tag 重跑。"
    fi
else
    log "部署 tag $DEPLOY_TAG 不存在，将新建"
fi

if [ "$CHECK_ONLY" -eq 1 ]; then
    log "--check：前置检查通过，未做任何改动。当前版本 $CURRENT_VERSION，部署 tag $DEPLOY_TAG 状态=$DEPLOY_TAG_STATE"
    exit 0
fi

# --- 2) 版本落定（写盘，需确认） --------------------------------------------
STAGE="2) 版本落定"
stage "2) 版本落定"

if [ "$CMP" = "1" ]; then
    log "将把根 package.json 的 version 写为 $TARGET，并用 version:sync 写入六个可发布包"
    log "提示：changeset 的 bump 只能往上走；要发 0.3.0-rc.1 需先把基版本 seed 到 0.3.0-rc.0（稳定版会得到 0.3.1-rc.0）"
    if [ "$DRY_RUN" -eq 1 ]; then
        log "[dry-run] 跳过写盘：node -e 写根版本 + pnpm version:sync + version:check"
    else
        confirm "确认写入版本 $TARGET？" || die "已取消"
        node -e "const fs=require('fs');const f='$ROOT_DIR/package.json';const p=JSON.parse(fs.readFileSync(f,'utf8'));p.version='$TARGET';fs.writeFileSync(f,JSON.stringify(p,null,2)+'\n')"
        ( cd "$ROOT_DIR" && pnpm version:sync )
        ( cd "$ROOT_DIR" && pnpm version:check ) || die "version:sync 后版本仍不一致"
        log "版本已写入：根与六包 = $TARGET"
    fi
else
    log "原样发布当前版本 $TARGET"
fi

# 目标为预发布但当前未在 pre 模式：提议进入 pre 模式（dist-tag 的载体）
PRERELEASE_ID="$(printf '%s' "$TARGET" | sed -nE 's/^[0-9]+\.[0-9]+\.[0-9]+-([0-9A-Za-z]+).*/\1/p')"
if [ "$PRE_MODE" -eq 0 ] && [ -n "$PRERELEASE_ID" ]; then
    log "目标是预发布版本，建议用 changeset pre 模式（dist-tag = $PRERELEASE_ID）"
    if [ "$DRY_RUN" -eq 1 ]; then
        log "[dry-run] 跳过：pnpm exec changeset pre enter $PRERELEASE_ID"
        PRE_MODE=1
        PRE_TAG="$PRERELEASE_ID"
    elif confirm "执行 changeset pre enter $PRERELEASE_ID？（写入 .changeset/pre.json，需提交）"; then
        ( cd "$ROOT_DIR" && pnpm exec changeset pre enter "$PRERELEASE_ID" )
        PRE_MODE=1
        PRE_TAG="$PRERELEASE_ID"
    fi
fi

# --- 3) 质量闸 --------------------------------------------------------------
STAGE="3) 质量闸"
stage "3) 质量闸"
if [ "$DRY_RUN" -eq 1 ]; then
    log "[dry-run] 跳过质量闸（pnpm check && pnpm build && pnpm test && pnpm smoke:dist）"
elif [ "$SKIP_GATE" -eq 1 ]; then
    warn "--skip-gate：跳过 check / build / test / smoke"
else
    confirm "运行质量闸（pnpm check && pnpm build && pnpm test && pnpm smoke:dist）？" || die "已取消"
    ( cd "$ROOT_DIR" && pnpm check )
    ( cd "$ROOT_DIR" && pnpm build )
    ( cd "$ROOT_DIR" && pnpm test )
    ( cd "$ROOT_DIR" && pnpm smoke:dist )
    log "质量闸通过"
fi

# --- 4) 提交版本产物（只 add 版本相关文件，绝不 git add -A） -----------------
STAGE="4) 提交版本产物"
stage "4) 提交版本产物"
if [ "$DRY_RUN" -eq 1 ]; then
    log "[dry-run] 跳过提交：git add 根/各包 package.json et al. + git commit"
else
    (
        cd "$ROOT_DIR"
        git add package.json
        for d in packages/*/; do
            [ -f "${d}package.json" ] && git add "${d}package.json"
            [ -f "${d}CHANGELOG.md" ] && git add "${d}CHANGELOG.md"
        done
        [ -f .changeset/pre.json ] && git add .changeset/pre.json
        true
    )
    if git -C "$ROOT_DIR" diff --cached --quiet; then
        log "没有需要提交的版本产物变更，跳过提交"
    else
        git -C "$ROOT_DIR" diff --cached --stat | sed 's/^/    /'
        if confirm "提交上述版本产物？（chore(release): 🔥 发布版本 $TARGET）"; then
            ( cd "$ROOT_DIR" && git commit -m "chore(release): 🔥 发布版本 $TARGET" ) || die "提交失败"
        else
            die "已取消（版本改动仍在工作区，可用 git checkout -- <文件> 回退）"
        fi
    fi
fi

# --- 5) 发布预览 ------------------------------------------------------------
STAGE="5) 发布预览"
stage "5) 发布预览"

DIST_TAG=""
if [ "$PRE_MODE" -eq 1 ]; then
    DIST_TAG="$PRE_TAG"
    log "pre 模式：changesets 自动用 dist-tag=$DIST_TAG，禁止传 --tag"
elif [ -n "$DIST_TAG_OVERRIDE" ]; then
    DIST_TAG="$DIST_TAG_OVERRIDE"
    log "dist-tag 由 --dist-tag 指定：$DIST_TAG"
elif [ -n "$PRERELEASE_ID" ]; then
    DIST_TAG="$PRERELEASE_ID"
    log "预发布版本：dist-tag=$DIST_TAG（不使用 latest，避免污染）"
else
    log "稳定版：不传 --tag，语义为 latest"
fi
if [ "$PRE_MODE" -eq 0 ]; then
    warn "首次发布会把 latest 一并占到 $TARGET 上（已接受，见 docs/todo.md 3.5）"
fi

( cd "$ROOT_DIR" && pnpm exec changeset status --verbose ) || true
( cd "$ROOT_DIR" && pnpm exec changeset publish-plan ) || true

PUBLISH_CMD=(pnpm exec changeset publish)
if [ "$PRE_MODE" -eq 0 ] && [ -n "$DIST_TAG" ]; then
    PUBLISH_CMD+=(--tag "$DIST_TAG")
fi
log "changeset publish 将创建逐包注解 tag：@fluere-vue/<pkg>@$TARGET"
case "$DEPLOY_TAG_STATE" in
    create) log "之后脚本会创建部署 tag：$DEPLOY_TAG" ;;
    reuse) log "部署 tag $DEPLOY_TAG 已存在且指向当前提交，将复用" ;;
    move) log "之后脚本会把部署 tag $DEPLOY_TAG 移到当前提交" ;;
esac
log "将执行：npm_config_registry=$REGISTRY PNPM_CONFIG_REGISTRY=$REGISTRY ${PUBLISH_CMD[*]}（cwd=$ROOT_DIR）"

if [ "$DRY_RUN" -eq 1 ]; then
    log "--dry-run：预览结束，未发布、未打 tag、未推送"
    exit 0
fi

# --- 6) 正式发布 ------------------------------------------------------------
STAGE="6) 正式发布"
stage "6) 正式发布"

already=0
for p in $PUBLISHABLE; do
    if pnpm_view "@fluere-vue/$p@$TARGET" version >/dev/null 2>&1; then
        already=$((already + 1))
    fi
done
if [ "$already" -eq 6 ]; then
    warn "六包在 registry 上均已有 $TARGET，changeset publish 将无事可做（幂等）"
fi

confirm_type "$TARGET" "确认发布 @fluere-vue/* $TARGET 到 $REGISTRY？" || die "已取消发布"
if ! ( cd "$ROOT_DIR" && "${PUBLISH_CMD[@]}" ); then
    warn "发布命令失败或部分失败。"
    warn "若为 OTP/2FA：设置 npm_config_otp=<code> 后直接重跑（幂等，已发布的会跳过、缺失的补发）"
    warn "已发布版本不可撤销；更正只能发新版本或 npm deprecate（见 docs/release.md#回滚与补救）"
    exit 1
fi

log "发布后校验："
for p in $PUBLISHABLE; do
    v="$(pnpm_view "@fluere-vue/$p@$TARGET" version 2>/dev/null || echo MISSING)"
    log "  @fluere-vue/$p@$TARGET -> $v"
done
log "dist-tags（@fluere-vue/ui）："
pnpm_view @fluere-vue/ui dist-tags 2>/dev/null | sed 's/^/    /' || true

# --- 7) 打 tag 并推送 -------------------------------------------------------
STAGE="7) 打 tag 并推送"
stage "7) 打 tag 并推送"
# 部署 tag 状态已在第 1.5 步判定（create / reuse / move）：消息沿用既有约定 "docs site deploy: <version>"。
case "$DEPLOY_TAG_STATE" in
    create)
        git -C "$ROOT_DIR" tag -a "$DEPLOY_TAG" -m "docs site deploy: $TARGET"
        log "已创建注解 tag $DEPLOY_TAG"
        ;;
    reuse)
        log "部署 tag $DEPLOY_TAG 已存在且指向当前提交，跳过创建"
        ;;
    move)
        git -C "$ROOT_DIR" tag -f -a "$DEPLOY_TAG" -m "docs site deploy: $TARGET"
        log "已把部署 tag $DEPLOY_TAG 移到当前提交（${HEAD_SHA:0:7}）"
        ;;
esac

DIRTY2="$(git -C "$ROOT_DIR" status --porcelain || true)"
if [ -n "$DIRTY2" ]; then
    warn "工作树仍不干净（构建残留？），tag 已指向当前提交："
    printf '%s\n' "$DIRTY2" | sed 's/^/    /' >&2
fi

# 只推「分支 + 部署 tag + 本次逐包 tag」的显式 refspec，不用 --follow-tags：
# 后者会顺带推所有从本次提交可达的注解 tag，一旦远端有已分叉的历史 tag（如本地与 onedev 的
# v0.0.1 不同）整条 push 会失败。部署 tag 被移动过时，只对它用 `+` 强制更新。
TAG_REFS=()
if [ "$DEPLOY_TAG_STATE" = "move" ]; then
    TAG_REFS+=("+refs/tags/$DEPLOY_TAG:refs/tags/$DEPLOY_TAG")
else
    TAG_REFS+=("refs/tags/$DEPLOY_TAG:refs/tags/$DEPLOY_TAG")
fi
for p in $PUBLISHABLE; do
    ref="refs/tags/@fluere-vue/$p@$TARGET"
    if git -C "$ROOT_DIR" rev-parse -q --verify "$ref" >/dev/null; then
        TAG_REFS+=("$ref:$ref")
    else
        warn "逐包 tag $ref 不存在（changeset publish 未创建？），推送时跳过"
    fi
done

if confirm_type "$TARGET" "推送分支 $BRANCH 与 tag（$DEPLOY_TAG + 逐包 tag）到 $REMOTE？"; then
    ( cd "$ROOT_DIR" && git push "$REMOTE" "$BRANCH" "${TAG_REFS[@]}" ) ||
        die "push 失败（tag 已在本地，可稍后单独补推）"
    log "已推送到 $REMOTE"
else
    warn "已跳过 push：tag 仅在本地，可稍后补推（分支 + $DEPLOY_TAG + 逐包 tag）"
fi

# --- 8) CHANGELOG 校验 / pre 收尾 -------------------------------------------
STAGE="8) CHANGELOG 校验 / pre 收尾"
stage "8) CHANGELOG 校验 / pre 收尾"
missing=0
for d in "$ROOT_DIR"/packages/*/; do
    name="$(basename "$d")"
    if [ ! -f "$d/CHANGELOG.md" ]; then
        warn "$name：无 CHANGELOG.md"
        missing=1
    elif ! grep -q "^## $TARGET" "$d/CHANGELOG.md"; then
        warn "$name：CHANGELOG.md 无「## $TARGET」小节"
        missing=1
    fi
done
if [ "$missing" -eq 1 ]; then
    warn "存在缺失的 CHANGELOG 条目。原因：本次为「原样 / 直接 seed」发布，未经 changeset version 消费 changeset。"
    warn "如需 CHANGELOG，请改用 changeset 流程（pnpm version:packages 生成）后发新版本。"
fi

if [ "$PRE_MODE" -eq 1 ]; then
    if [ "$PRE_EXIT" -eq 1 ]; then
        if confirm "执行 changeset pre exit？（把 pre.json 标记为 exit 模式）"; then
            ( cd "$ROOT_DIR" && pnpm exec changeset pre exit )
            ( cd "$ROOT_DIR" && git add .changeset/pre.json &&
                git commit -m "chore(release): 🔥 退出预发布模式" ) ||
                warn "pre exit 提交失败，请手工处理"
        else
            warn "已跳过 pre exit"
        fi
    else
        log "处于 pre 模式；如需收尾用 --pre-exit（默认不做）"
    fi
fi

# --- 9) 完成 ----------------------------------------------------------------
stage "9) 完成"
log "版本：$TARGET"
log "registry：$REGISTRY，dist-tag：${DIST_TAG:-latest}"
log "tag：$DEPLOY_TAG（部署用，状态=$DEPLOY_TAG_STATE）+ changeset 的逐包 tag（@fluere-vue/<pkg>@$TARGET）"
log "回滚/补救见 docs/release.md#回滚与补救（npm deprecate / dist-tag rm|add / 删 tag / 移 tag）"
log "同一 commit 重跑幂等：changeset publish 会跳过已发布的版本"