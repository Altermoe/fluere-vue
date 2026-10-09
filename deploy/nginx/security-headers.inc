# 安全响应头（被 fluere-vue.conf 的 server 级与每个写了缓存头的 location include）。
#
# 扩展名故意不是 .conf：nginx 主配置里的 `include /etc/nginx/conf.d/*.conf`
# 会把 .conf 文件自动收进 http 上下文，那样这些头就变成全局头，并且会和 location 级的
# add_header 互相覆盖，排查起来很隐蔽。用 .inc 只能被显式 include。
#
# HSTS 由外层反代在 HTTPS 终止处负责：容器这一层只有 HTTP，在这里写 HSTS 没有意义
# （且一旦外层换成 HTTP 调试会把自己锁死）。
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=(), payment=()" always;
add_header X-Frame-Options "SAMEORIGIN" always;
