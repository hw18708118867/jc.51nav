---
title: Nginx 安全加固：隐藏版本、收紧配置、上 TLS 与防滥用
description: Nginx 是主流 Web 服务器与反向代理。这篇讲清隐藏版本号、关闭不必要模块、限制请求方法与大小、配置安全响应头、TLS 最佳实践、目录与权限控制，以及用 limit_req 防滥用。
category: security
subcategory: hardening
tags: ['Nginx加固', '安全响应头', 'TLS', 'limit_req', '隐藏版本']
pubDate: 2026-07-19
order: 5
---

Nginx 既当 Web 服务器又当反向代理，是互联网流量的"前门"。它的默认配置偏向"能跑就行"，在安全性上留了不少可优化空间：版本号直接暴露（方便攻击者按版本找漏洞）、缺安全响应头、允许危险 HTTP 方法、没有请求限速等。

这篇把 Nginx 加固的常用项讲清。改动都在 `nginx.conf` 或站点 `conf` 里，改完 `nginx -t` 测试、`nginx -s reload` 生效。

> 所有操作仅用于你**自有或已授权的服务器**。改配置前备份原文件，改完务必 `nginx -t` 验证语法。

## 第一关：隐藏版本号

默认 Nginx 会在响应头 `Server` 和错误页里暴露具体版本（如 `nginx/1.20.1`），等于告诉攻击者"我用什么、有什么已知漏洞可打"。

```nginx
# 在 http 块关闭版本显示
server_tokens off;
```

设了 `server_tokens off;` 后，`Server` 头只剩 `nginx`，错误页也不显示版本。这是零成本却很有效的第一步。

## 第二关：关闭不必要的模块与功能

编译时若带用不上的模块（如 `autoindex`、`ssi`、`dav`），就多一份攻击面。运行期可关的：

```nginx
# 关闭目录浏览（防止列目录泄露文件）
autoindex off;

# 若不用 WebDAV，确保没加载 dav_module；用不到的 server 块也删掉
```

如果 Nginx 是源码编译的，加固时建议只编译业务需要的模块（`--without-http_*` 去掉用不上的），从源头减少攻击面。

## 第三关：限制请求方法与大小

`PUT`、`DELETE`、`TRACE` 等方法和超大请求体，常被用于探测或攻击：

```nginx
# 只允许业务需要的动词
limit_except GET POST {
    deny all;
}

# 限制请求体大小，防大包 DoS 与上传滥用
client_max_body_size 10m;

# 关闭 TRACE（防跨站追踪）
# 在 http 块：more_set_headers "Trace-Enable: none"; （或确保不处理 TRACE）
```

`limit_except` 只放行 `GET/POST`，其余一律拒绝，对纯展示/接口站点很实用。

## 第四关：安全响应头

在 `server` 或 `location` 块加上标准安全头，能挡掉大量前端类攻击：

```nginx
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; img-src 'self' data:; script-src 'self'" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

这些头分别防 MIME 嗅探、点击劫持、XSS、referrer 泄露，以及强制 HTTPS。注意加 `always`，让错误响应也带这些头。

## 第五关：TLS 最佳实践

HTTPS 不是配了证书就安全，参数很关键：

```nginx
listen 443 ssl;
ssl_certificate     /path/fullchain.pem;
ssl_certificate_key /path/privkey.pem;

# 只启强协议，禁 SSLv3/TLS1.0/1.1
ssl_protocols TLSv1.2 TLSv1.3;
# 优先服务端算法套件，禁用弱加密
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers on;
# 开启会话复用，降握手开销
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
# HSTS 已在响应头配置
```

建议用 Mozilla 的 "Intermediate" 配置模板起步，避免自己乱配出弱套件。证书用 Let's Encrypt 免费签发并自动续期。

## 第六关：目录、权限与防滥用

```nginx
# 禁止访问隐藏文件（.env、.git 等）
location ~ /\. {
    deny all;
    access_log off;
    log_not_found off;
}

# 禁止解析 PHP 的目录（防上传目录被执行）
location /uploads/ {
    location ~ \.php$ { deny all; }
}

# 限制并发与速率，防 CC/暴力
limit_req_zone $binary_remote_addr zone=perip:10m rate=10r/s;
limit_req zone=perip burst=20 nodelay;
```

配合系统层：Nginx 工作进程用户（`www-data`/`nginx`）对 Web 根目录应只有读/执行权限，上传目录不可执行，源码目录不可写。

## 常见误区

- **只配证书不配协议/套件**：用了 TLS1.0 + RC4 等于没加密，仍可被降级攻击。
- **`server_tokens` 改了不验证**：浏览器开发者工具一看 `Server` 头还在，说明没生效（可能配错块）。
- **上传目录可执行 PHP**：攻击者传个 `shell.php` 直接 RCE，必须禁止上传目录解析脚本。
- **`client_max_body_size` 不设**：大请求体可被用来打满内存/磁盘。

## 进阶：用配置核查脚本

```bash
# 检查是否暴露版本
curl -sI http://localhost | grep -i server
# 检查安全头是否齐全
curl -sI https://你的域名 | grep -iE "x-frame|x-content|x-xss|content-security|strict-transport"
# 语法测试
nginx -t
```

把这几条做成定时检查，缺失安全头就告警，是轻量的"配置漂移"监控。

## 自测题

1. `server_tokens off;` 防的是什么？为什么有用？
2. 为什么上传目录（如 `/uploads/`）不能解析 PHP？
3. HSTS 响应头的作用是什么，为什么对 HTTPS 站点重要？
4. `limit_req` 在防护中解决什么问题？

## 实战要点与深度解析

Nginx 加固里最实用的进阶动作，是**用 `map` 和 `geo` 做精细的访问控制与限速分层**。比如你可以定义"内网 IP 段走宽松策略、公网走严格策略"，或对不同 URI 设不同速率：`/api/` 限严、`/static/` 限松。这比"全站一个 rate"更贴合业务，也减少误伤。再比如用 `geo` 把已知恶意 IP 段直接 `deny`，把管理后台 `/admin` 只放行办公网段，都是生产环境高频用法。

再谈一个和"上传目录禁执行"配套的坑：**Nginx 的 `try_files` 与 `alias` 路径遍历**。配置不当的 `alias` 配合 `location` 可能让攻击者用 `../` 跳出 Web 根读到 `/etc/passwd` 等系统文件（经典 CVE 类问题）。正确写法是 `alias` 路径末尾带 `/`、且对用户输入做严格归一化。这说明：Nginx 的安全不仅靠"关功能"，也靠"路由配置本身的正确性"，配置错误本身就是漏洞。

关于 **TLS 证书与 `ssl_stapling`（OCSP 装订）**：开启 OCSP 装订能让客户端不必再单独去证书颁发机构验证，既提速又避免泄露访问行为；但它依赖 Nginx 能访问外部 OCSP 服务，且证书链要配全。很多站点配了 HTTPS 却没开 stapling，用户首次握手偏慢，体验和安全感都打折扣。另外，**证书到期监控**必须做——证书过期导致全站不可信，是运维高频事故，应纳入基线核查的"到期提醒"项。

还有一个反向代理场景的特殊加固：当 Nginx 作为**反向代理**把请求转发给后端应用时，要小心 `X-Forwarded-For` 头被客户端伪造，导致后端拿到的"真实 IP"是假的，进而绕过基于 IP 的限流/封禁。正确做法是在最外层代理**重置**该头（`proxy_set_header X-Forwarded-For $remote_addr;`），让后端只信代理填的值。这类"信任边界"问题在多层代理架构里极易出错。

最后强调：**Nginx 的配置测试习惯**。`nginx -t` 只检查语法，不检查"逻辑是否正确"。很多安全事故源于"语法对但语义错"的配置（如把 `deny` 写成了对错误 location 生效）。所以改完不仅要 `-t`，还要用 `curl` 实测：带恶意头看是否被拦、访问隐藏文件看是否 403、外联看版本是否隐藏。把"改后实测"变成肌肉记忆，能挡掉大量"以为生效其实没生效"的尴尬。

## 速查清单与排错口诀

Nginx 加固口诀：**版要隐、模要裁、法要限、头要齐、链要新、目录护、速要控**。即隐藏版本、裁模块、限请求方法、齐安全头、新 TLS、护隐藏文件与上传目录、控速率。

排错场景：**加了 `limit_req` 后正常用户频繁 503**。这是 `rate` 设太低或 `burst` 太小，把正常突发流量也拦了。调法是先放宽观察、结合业务峰值设合理速率，再用 `nodelay` 让小突发不被排队。另一个坑：配了 `add_header` 安全头却在某个 `location` 里被"覆盖丢失"——Nginx 的 `add_header` 有继承规则，子块若重新 `add_header` 会清空父块的头，需用 `always` 参数或确保每层都带。这类"配置语义"的坑，比语法错更隐蔽，必须 `curl -I` 实测每个关键路径的响应头。

## 进阶速记与误区辨析

Nginx 加固里同样有几组容易混淆的点，专门辨析。

第一组，隐藏版本与打补丁。把版本号藏起来能减少被自动化针对的概率，但拦不住有目标的攻击者，他可以靠行为判断你的版本。所以隐藏版本是好习惯，却替代不了及时更新版本和打补丁这个根本动作，两者要同时做。

第二组，限制请求方法与业务接口。只允许常见的两种请求方法能挡掉很多危险操作，但如果你的业务接口本身就用了其他方法，一刀切禁止会让正常功能失效。正确做法是先摸清业务到底用了哪些方法，再把不必要的显式拒绝，不能脱离业务谈限制。

第三组，安全响应头与业务兼容。加上各类安全响应头能挡住不少前端类攻击，但某些老旧的页面或者特殊的交互可能因为严格的头而表现异常。上线前要用真实流量验证这些头没有误伤业务，发现问题再针对具体接口微调，不能加了头就不管兼容性。

第四组，上传目录禁执行与存储分离。不让上传目录执行脚本是底线，但更稳妥的做法是把上传的文件存到独立的对象存储或者专门的服务里，而不是和 Web 可执行目录混在一起。存储与执行分离之后，即便有人传了危险文件，也没有执行的环境，安全余量更大。

速记口诀收尾：版本要隐、模块要裁、方法要限、头部要齐、链路要新、目录要护、速率要控。七句话对应 Nginx 加固的主线，每次变更后照着实测一遍，能避免大量"以为生效其实没生效"的尴尬。

## 这一篇你该记住的

- `server_tokens off;` 隐藏版本，零成本有效。
- 关目录浏览、按需裁剪模块，减少攻击面。
- `limit_except` 限方法、`client_max_body_size` 限大小。
- 加齐安全响应头（nosniff、X-Frame、CSP、HSTS 等）。
- TLS 只留 TLS1.2/1.3 + 强套件，用可信模板。
- 禁访问 `.` 隐藏文件、上传目录禁执行、用 `limit_req` 防滥用。

下一篇我们看 **Apache** 的加固要点。
