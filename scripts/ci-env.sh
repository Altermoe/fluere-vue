#!/bin/sh
# CI 出网代理准备（由 .onedev-buildspec.yml 的各 CommandStep 在容器内 `. ./scripts/ci-env.sh` 引入）。
#
# 为什么需要：OneDev 的 docker 执行器把每个 step 跑在临时容器里，容器里的 `localhost`
# 指向容器自身，够不到宿主上的代理；只有宿主地址（网桥网关 / host.docker.internal）才可达。
# 因此代理地址属于「随基础设施变化」的值，放进 OneDev 构建密钥 CI_HTTP_PROXY，而不是写死在
# buildspec 里：
#   - 空值 或 `none` → 直连（本地演练环境实测容器可直连外网）
#   - 其他           → 作为 HTTP/HTTPS 代理导出给 pnpm / npm / corepack
#
# CI_NO_PROXY 只是常见取值的默认，不属于易变配置，故不单独做密钥。
set -eu

if [ -n "${CI_HTTP_PROXY:-}" ] && [ "${CI_HTTP_PROXY}" != "none" ]; then
  HTTP_PROXY="$CI_HTTP_PROXY"
  HTTPS_PROXY="$CI_HTTP_PROXY"
  http_proxy="$CI_HTTP_PROXY"
  https_proxy="$CI_HTTP_PROXY"
  NO_PROXY="${CI_NO_PROXY:-127.0.0.1,localhost,::1}"
  no_proxy="$NO_PROXY"
  export HTTP_PROXY HTTPS_PROXY http_proxy https_proxy NO_PROXY no_proxy
  echo "[ci] outbound proxy: $CI_HTTP_PROXY (no_proxy=$NO_PROXY)"
else
  echo "[ci] outbound proxy: disabled (direct connection)"
fi
