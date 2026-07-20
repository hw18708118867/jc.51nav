---
title: Apache 安全加固：模块裁剪、版本隐藏与权限控制
description: Apache httpd 老牌且配置灵活，但默认加载模块多、暴露信息多。这篇讲清隐藏版本与 banner、按需禁用模块、限制目录与符号链接、配置安全头、TLS、禁止目录遍历与执行，以及日志与权限。
category: security
subcategory: hardening
tags: ['Apache加固', 'httpd', '模块裁剪', 'htaccess', '安全头']
pubDate: 2026-07-19
updatedDate: 2026-07-19
order: 6
---

Apache httpd 是资历最老的 Web 服务器之一，配置极其灵活（`.htaccess`、`<Directory>`、一大堆模块）。但"灵活"也意味着默认装了一堆用不上的模块、暴露了一堆信息，给攻击者留了空间。这篇把 Apache 加固讲清。

改动主要在 `httpd.conf` 或 `apache2.conf` 及各虚拟主机配置，改完用 `apachectl configtest`（或 `httpd -t`）验证语法，再 `systemctl reload apache2`。

> 所有操作仅用于你**自有或已授权的服务器**。改配置前备份，改完务必做语法测试与业务验证。

## 第一关：隐藏版本与 banner

默认 Apache 在 `Server` 响应头和错误页暴露 `Apache/2.4.41 (Ubuntu)` 这类信息。

```apache
# 隐藏版本号
ServerTokens Prod
# 错误页不显示服务器信息
ServerSignature Off
```

`ServerTokens Prod` 只输出 `Apache`，不附带版本与系统；`ServerSignature Off` 让错误页不显示服务器标识。和 Nginx 一样，这是低成本高收益的第一步。

## 第二关：按需裁剪模块

Apache 的攻击面很大程度来自"加载了但用不上的模块"。常见可禁用的：

```apache
# 用不上的模块注释掉（具体指令随版本，示例为 a2dismod 思路）
# a2dismod autoindex   # 目录浏览，非文件服务站点应关
# a2dismod status      # 状态页，可能泄露信息
# a2dismod userdir     # 用户目录，一般用不到
# a2dismod cgi         # 若不用 CGI
```

原则：只保留业务真正需要的模块（如 `rewrite`、`ssl`、`proxy` 等）。模块越少，可被利用的代码路径越少。容器/编译部署时，更应该只编译所需模块。

## 第三关：目录与符号链接控制

```apache
<Directory /var/www/html>
    Options -Indexes -FollowSymLinks +SymLinksIfOwnerMatch
    AllowOverride None
    Require all granted
</Directory>
```

要点：
- `-Indexes`：禁止目录浏览，防止列目录泄露文件。
- `-FollowSymLinks`：禁止跟随符号链接，防利用 symlink 跳出 Web 根访问 `/etc/passwd` 等。
- `AllowOverride None`：禁止 `.htaccess` 覆盖，既安全又提升性能（除非你确实需要目录级配置）。

## 第四关：防止目录遍历与脚本执行

上传目录绝不能执行脚本：

```apache
<Directory /var/www/html/uploads>
    php_flag engine off
    Options -ExecCGI -Includes
    AddHandler cgi-script .php .pl .py
    Require all granted
</Directory>
```

同时设置正确的 `DocumentRoot` 权限：Web 用户（如 `www-data`）对网站目录只给读/执行，上传子目录不给执行权限。配合系统层权限，形成"即使传了马也跑不起来"的防线。

## 第五关：安全响应头与 TLS

```apache
# 启用 headers 模块后
Header always set X-Content-Type-Options "nosniff"
Header always set X-Frame-Options "SAMEORIGIN"
Header always set X-XSS-Protection "1; mode=block"
Header always set Content-Security-Policy "default-src 'self'"
Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"

# TLS 配置
<VirtualHost *:443>
    SSLEngine on
    SSLProtocol -SSLv3 -TLSv1 -TLSv1.1 +TLSv1.2 +TLSv1.3
    SSLCipherSuite ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256
    SSLHonorCipherOrder on
</VirtualHost>
```

与 Nginx 同理：协议只留 TLS1.2/1.3，禁用弱套件，安全头加齐。Apache 的 `mod_security`（WAF 模块）也可在此层做请求过滤，属于进阶加固。

## 第六关：日志与访问控制

```apache
# 记录足够信息便于溯源
LogLevel warn
CustomLog ${APACHE_LOG_DIR}/access.log combined
ErrorLog ${APACHE_LOG_DIR}/error.log

# 限制敏感路径访问（如管理后台只允许内网）
<Location /admin>
    Require ip 10.0.0.0/8
</Location>

# 限制请求方法
<LimitExcept GET POST>
    Require all denied
</LimitExcept>
```

把日志外发到 SIEM，并对 `/admin`、`.git` 等敏感路径做 IP 限制，能显著提升横向与拖库难度。

## 常见误区

- **只关 `ServerSignature` 不关 `ServerTokens`**：错误页不显示了，但 `Server` 头仍带版本，信息照样泄露。
- **上传目录没禁脚本执行**：传 `shell.php` 直接 RCE，Apache 比 Nginx 更常被这类利用打中。
- **`.htaccess` 可覆盖却不限制**：攻击者若写入 `.htaccess` 就能改服务器行为，应 `AllowOverride None`。
- **模块全开图省事**：`status`、`autoindex`、`cgi` 等模块都是潜在信息泄露或执行入口。

## 进阶：用脚本核查关键项

```bash
# 检查暴露的 Server 头
curl -sI http://localhost | grep -i server
# 检查已启用模块
apachectl -M 2>/dev/null | grep -iE "autoindex|status|cgi"
# 语法测试
apachectl configtest
```

把这几条纳入定期核查，缺失项告警，就是轻量的 Apache 基线监控。

## 自测题

1. `ServerTokens Prod` 和 `ServerSignature Off` 分别关掉什么信息？
2. 为什么上传目录要 `php_flag engine off` 且禁执行？
3. `AllowOverride None` 在安全与性能上各有什么好处？
4. Apache 上如何限制 `/admin` 只允许内网访问？

## 实战要点与深度解析

实际加固 Apache 时，最容易卡住的不是"知不知道某项配置"，而是"改了之后业务会不会挂"。举一个真实常见的场景：某站点用 `.htaccess` 做伪静态（URL Rewrite），你为了安全把 `AllowOverride None` 一设，结果伪静态规则全部失效，全站 404。这就是典型的"安全配置影响了业务功能"。正确做法是：把 `.htaccess` 里的规则**迁移到虚拟主机的 `<Directory>` 或主配置里**，再设 `AllowOverride None`。这样既收掉了目录级覆盖的安全风险，又保住了 Rewrite 功能。记住，加固的本质是"在安全和可用之间找平衡点"，不是盲目收紧。

再谈一个被忽视的点：**Apache 的多路处理模块（MPM）选择**。prefork、worker、event 三种 MPM 在并发模型、内存占用、线程安全上差异很大。如果用 `prefork`（进程模型）配合 `mod_php` 跑 PHP，一旦某个脚本有内存泄漏，单进程越吃越大，整机可能被拖垮；而 `event` MPM 配合 `php-fpm`（独立进程池）隔离性更好，单站异常不易拖垮全局。从安全视角看，**把应用运行时和 Web 服务进程解耦**（如用 php-fpm、或用反向代理把动态请求交给独立应用服务），能显著降低"一个应用被控拖垮整台 Web 服务"的风险。

关于 `mod_security`：它是 Apache 上的 WAF 模块，能基于规则拦截 SQL 注入、XSS、扫描器等。但新手常犯两个错：一是 OWASP CRS 规则库直接全开，导致大量误报把正常用户拦在门外；二是只装不调，遇到误报就干脆关掉。正确姿势是：先跑"检测模式（DetectionOnly）"观察一段时间，把业务正常请求特征加白，再切到"阻断模式"。另外 mod_security 的审计日志非常详细，是 Web 入侵溯源的宝贵素材，建议保留并外发。

还有一个运维细节：Apache 的 `mod_status` 能展示当前连接数、各进程状态，对排查"连接数暴涨"很有用，但它默认可能暴露内部信息，若没限制访问来源会成为信息泄露点。正确做法是：要么禁用，要么用 `Require ip` 严格限制只能从内网监控机访问，并关闭 `ExtendedStatus` 减少信息量。

最后强调**版本与补丁**。Apache 自身也曾曝出解析漏洞、缓冲区溢出等高危 CVE。加固不能只盯配置，还要保证版本及时更新、不再使用已停止维护的旧版（如 2.2 系列）。把"版本是否在支持期内、是否有未修复高危 CVE"纳入基线核查，是很多团队忽略的基础动作。

## 速查清单与排错口诀

把 Apache 加固最容易忘的点，浓缩成一份可贴墙的口诀：**版本藏、模块裁、目录锁、脚本隔、头要齐、链要密、日志外、策略测**。每句对应前面一节：藏版本（ServerTokens Prod）、裁模块、锁目录（-Indexes -FollowSymLinks）、隔脚本（上传目录禁执行）、齐安全头、密 TLS、日志外发、改完必测。

排错时有个高频场景：**改完配置网站打不开**。第一反应不是回滚了事，而是先看 `error.log` 的报错行——八成是 `DocumentRoot` 路径写错、证书文件路径不对、或 `Require` 规则把所有人都拒了。用 `apachectl configtest` 先排语法，再用 `curl -I 127.0.0.1` 在本机验证响应头和状态码，能快速定位是"配置错"还是"网络/防火墙错"。养成"改前备份 `apache2.conf`、改后双验证"的习惯，能避免绝大多数"加固变宕机"的事故。

## 进阶速记与误区辨析

把 Apache 加固里最容易混淆的几组概念，专门拎出来辨析，帮你真正吃透而不是死记配置。

第一组，模块开关与功能需求的矛盾。很多管理员一听说某个模块有漏洞，就立刻禁用，结果网站依赖该模块的功能直接挂掉。正确思路是先搞清楚这个模块在你的业务里到底有没有被用到，用不到再禁，用得到就保留但加强监控和版本更新。禁用模块不是目的，减少不必要的攻击面才是目的，不能为了减面而牺牲业务。

第二组，目录浏览与文件下载的差别。关闭目录浏览只是不让别人看到目录里的文件列表，并不等于别人不能通过知道的文件名直接下载。所以敏感文件即使关了目录浏览也要做好权限控制和路径保护，不能以为关了浏览就万事大吉。

第三组，隐藏版本与真实安全的差别。把版本号藏起来确实能挡住大部分自动化的针对性扫描，但拦不住真正有目标的攻击者，因为他可以靠行为特征判断你用的是什么。所以隐藏版本是低成本好习惯，但不能替代及时打补丁这个根本动作。

第四组，配置文件权限与运行账户权限的差别。很多人只改了配置文件的访问权限，却忘了运行账户本身如果权限过大，依然能读取它不该读的东西。加固要同时看"文件给谁看"和"进程以谁的身份跑"这两个维度，缺一不可。

最后送一句速记口诀给日常巡检：版本要藏、模块要裁、目录要锁、脚本要隔、头部要齐、链路要密、日志要外、改完要测。八句话对应八类动作，每次上线前过一遍，能挡掉绝大多数低级失误。

## 这一篇你该记住的

- `ServerTokens Prod` + `ServerSignature Off` 隐藏版本与 banner。
- 按需禁用 `autoindex`、`status`、`cgi` 等用不上的模块。
- 目录 `-Indexes -FollowSymLinks`，`AllowOverride None` 防 `.htaccess` 覆盖。
- 上传目录禁脚本执行，系统层配合收紧权限。
- 安全头加齐，TLS 只留 TLS1.2/1.3 与强套件。
- 日志外发、敏感路径限 IP、限制请求方法。

下一篇我们看 **IIS** 的加固要点。
