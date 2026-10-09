#!/bin/sh
# CI 依赖引导（由 .onedev-buildspec.yml 的 install 步骤在容器内 `. ./scripts/ci-bootstrap.sh` 引入）。
#
# 为什么不用 corepack：Node 25 起不再随发行版内置 corepack，node:26-alpine 里没有它。
# 为什么必须装「精确版本」：pnpm 11 把包管理器自身的版本写进 pnpm-lock.yaml 的
# packageManagerDependencies；运行期 pnpm 版本与 lockfile 记录不一致时，
# `pnpm install --frozen-lockfile` 会直接报 “lockfile is not up to date” 失败。
# 因此这里读取根 package.json 的 packageManager 字段（唯一版本源，需与 lockfile 同步），
# 装同一个版本，而不是依赖 `pnpm@11` 这类浮动范围。
set -eu

PNPM_VERSION=$(node -p "require('./package.json').packageManager.replace(/^pnpm@/, '')")
case "$PNPM_VERSION" in
  '' | *[!0-9.]*)
    echo "[ci] package.json 的 packageManager 字段缺失或格式异常：$PNPM_VERSION" >&2
    exit 1
    ;;
esac

if [ "$(pnpm -v 2>/dev/null || true)" = "$PNPM_VERSION" ]; then
  echo "[ci] pnpm $PNPM_VERSION already available"
else
  echo "[ci] installing pnpm $PNPM_VERSION ..."
  npm install -g "pnpm@$PNPM_VERSION" --silent
  pnpm -v
fi
