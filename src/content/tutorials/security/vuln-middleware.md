---
title: 中间件漏洞：服务器自己也会漏
description: 讲清常见中间件（Apache/Tomcat/Nginx/IIS/WebLogic/Jboss）的信息收集与典型漏洞——解析漏洞、文件截断、配置缺陷、远程溢出、CGI 漏洞，并给出防御与靶场思路。
category: security
subcategory: pentest
tags: ['中间件漏洞', '解析漏洞', 'WebLogic', 'Tomcat', 'Web安全']
pubDate: 2026-07-18
order: 16
---

前面讲的漏洞多在"网站代码"里，但**中间件/Web 容器**本身（Apache、Nginx、Tomcat、IIS、WebLogic、Jboss）也会有漏洞。它们一旦出问题，影响的是跑在上面的所有应用。这一篇把常见中间件漏洞与防御过一遍。

> 以下仅在授权靶场/授权资产练习；对他人服务器利用中间件漏洞属违法。

## 什么是中间件

中间件（这里主要指 Web 服务器/容器）是"站在网站代码前面、负责接收请求、解析、转发给后端"的软件：

- **Apache / Nginx / IIS**：Web 服务器，处理静态文件、转发动态请求；
- **Tomcat / WebLogic / Jboss / Jetty**：Java 应用服务器（Servlet 容器）；
- **PHP-FPM**：PHP 的 FastCGI 进程管理器。

它们有自己的版本、配置、解析规则，这些都可能成为漏洞来源。

## 解析漏洞：文件名被"误读"

**Apache 解析漏洞（老版本）**

Apache 从右往左识别后缀，遇到不认识的就往左试。上传 `shell.php.xxx`（`xxx` 不在 mime 类型表），Apache 不认 `xxx`，往左试到 `.php`，于是当 PHP 执行。防御：升级 Apache、限制可执行后缀。

**IIS 解析漏洞**

- `shell.asp;.jpg`：IIS 6.0 分号前为主后缀，把 `.asp;.jpg` 当 `.asp` 执行；
- `xxx.asp/目录/`：IIS 6.0 把 `asp` 目录下的文件都当 asp 执行；
- `*.asa`/`*.cer` 等也被当脚本。

**Nginx 解析漏洞（老/错误配置）**

`/uploads/shell.jpg/x.php`：若配置把 `.php` 交给 FastCGI 且 `cgi.fix_pathinfo=1`，Nginx 会把 `shell.jpg/x.php` 里的 `shell.jpg` 当 PHP 执行（路径信息被误用）。现代默认已修，但错误配置仍可能触发。

**防御共性**：明确"哪些后缀可执行"，禁止把图片/未知后缀当脚本；上传目录关执行；升级版本。

## 文件截断与目录穿越

- **IIS 短文件名**：Windows 老特性可枚举 8.3 短文件名，泄露真实文件；
- **目录穿越**：中间件配置不当允许 `../` 访问 Web 根外文件（如 Nginx 的 `alias` 配错导致 `../` 穿越）；
- **Tomcat 管理后台弱口令**：`/manager/html` 用弱口令登录，可部署 WAR 包拿 shell。

## 配置缺陷

- **目录列出（目录遍历）**：Web 服务器开了 `Options +Indexes`，访问无默认页的目录会列出所有文件，泄露源码/备份；
- **默认页/示例页未删**：Tomcat 的 `/examples`、IIS 的默认欢迎页泄露版本和路径；
- **错误页泄露**：详细错误页泄露绝对路径、中间件版本；
- **HTTP 方法滥用**：PUT/DELETE 未禁用，可上传/删除文件。

## 远程溢出与反序列化（Java 系重灾区）

Java 中间件历史上多个 RCE：

- **WebLogic**：多处反序列化 RCE（如 CVE-2017-10271 XMLDecoder、CVE-2020-2555、CVE-2023-21839），以及弱口令后台部署；
- **Tomcat**：`CVE-2017-12615`（PUT 上传）、`Ghostcat`（AJP 文件读取，CVE-2020-1938）；
- **Jboss / Jenkins**：反序列化、未授权访问。

这类漏洞常"一个 payload 直接拿服务器"，是红队最爱，也是企业必须及时打补丁的原因。

## 信息收集：先认出对方用什么

打中间件漏洞前，先指纹识别：

- 响应头 `Server: Apache/2.4.6`、`X-Powered-By: PHP/7.4`；
- 报错页特征（Tomcat 的 404 页、IIS 的黄页）；
- 默认路径探测：`/manager/html`（Tomcat）、`/console`（WebLogic）、`/jmx-console`（Jboss）；
- 工具：`whatweb`、`wappalyzer`、`nmap -sV`、`fingerprint`。

确认版本后，查该版本的已知 CVE（用 `searchsploit`、`CVE 数据库`、`NVD`），对症下药。

## 防御：中间件也要"安全配置"

1. **及时打补丁**：订阅安全公告，升级有 CVE 的版本；
2. **删默认内容**：删 `/examples`、`/manager`（不用就关）、默认页、文档；
3. **最小权限**：中间件用低权限用户运行，禁用危险模块；
4. **关目录浏览**：`Options -Indexes`；
5. **限制方法**：只开 GET/POST，禁 PUT/DELETE/TRACE；
6. **正确配置解析**：明确可执行后缀白名单，上传目录不解析脚本；
7. **错误页自定义**：不泄露版本和路径；
8. **管理后台加锁**：强口令+IP 白名单+访问限制；
9. **WAF/边界防护**：在前面挡常见利用流量。

## 靶场思路

- **解析漏洞**：用 upload-labs 配合不同中间件环境复现；
- **Tomcat 弱口令**：Vulhub 起 `tomcat` 环境，爆破 `/manager` 后部署 WAR 拿 shell；
- **WebLogic 反序列化**：Vulhub 起对应 CVE 环境，用公开 payload 验证（仅授权环境）。


## 更多实战案例：反向代理与网关的信任错位

很多站点前面挂 Nginx、Apache 或 API 网关做反向代理，后端应用信任代理转发过来的 `X-Forwarded-For`、`X-Real-IP`、`X-Forwarded-Host` 等头，用来取"客户端真实 IP"做限流、审计或权限判断。攻击者直接在请求里伪造 `X-Forwarded-For: 127.0.0.1`，后端若盲目信任，就可能绕过基于 IP 的黑名单、把攻击流量记成内网流量，甚至在某些"内网 IP 免鉴权"的逻辑里直接提权。修复是代理层必须**覆盖**（而非追加）这些头，且后端只信自己配置的受信代理。

## 更多实战案例：中间件自身配置漏洞

Nginx 的 `alias` 遍历：配置 `location /files { alias /data/; }` 时，请求 `/files../` 可能穿越读到 `/data/../etc/passwd`。Apache 的 `.htaccess` 与 `AddHandler` 把 `.php` 后缀映射导致 `evil.php.jpg` 被当 PHP 执行。Tomcat 的 `PUT` 方法若开启（`readonly=false`）可上传 webshell。网关（如 Kong、Spring Cloud Gateway）的 Actuator、未授权管理接口暴露，也是常见入口。这些都不是业务代码 bug，而是中间件"默认不安全"或"配置不当"。

## 更多实战案例：请求走私与中间件链

当请求经过多层中间件（CDN→WAF→Nginx→应用），每层对请求边界、编码、头部的处理略有差异，就可能产生请求走私、头注入、缓存投毒等连锁问题。比如 WAF 放行但后端按不同规则解析，攻击载荷在 WAF 看来"无害"、到后端却"致命"。测试时要把整条链路当成整体，不能只测应用层。

## 常见坑

1. **后端信任所有 X-Forwarded-* 头**：攻击者任意伪造，必须代理层覆盖且白名单受信代理。
2. **中间件用默认配置上线**：很多默认开启危险方法或暴露管理口。
3. **alias 与 root 混淆**：alias 路径拼接方式不同，易出遍历。
4. **只测应用不测链路**：中间件链的差异才是漏洞温床。

## 进阶：修复与加固

统一在边界代理处重写/覆盖客户端相关头；关闭中间件不必要的模块与方法（如 Tomcat 的 PUT、Nginx 的 autoindex）；把管理接口放到内网并加鉴权；定期对照中间件安全基线（如 CIS Benchmark）做配置核查；在网关层做规范的请求归一化再转发。

## 小测验

- 问题1：X-Forwarded-For 能被伪造吗？答案：能，攻击者直接加请求头，后端须只信受信代理覆盖后的值。
- 问题2：Nginx alias 配置不当会怎样？答案：可能路径遍历读到非预期文件。
- 问题3：为什么只测应用层不够？答案：中间件链解析差异会产生走私、投毒等连锁漏洞。



## 更多实战案例：网关与 WAF 的绕过

很多站点在应用前加 WAF（Web 应用防火墙）拦 SQL 注入、XSS 等。但 WAF 是基于规则的，攻击者可用各种手法绕过：把 `union select` 写成 `union/*/select`、`UNION ALL SELECT`、`uNiOn SeLeCt`；把 `<script>` 用编码、换行、注释拆开；用分块传输编码（Chunked）把 payload 拆成多块让 WAF 拼不起来；用参数污染（`?id=1&id=2`）让 WAF 看一个、应用看另一个。所以 WAF 是缓解不是根治，绕过姿势永远在演进。

## 更多实战案例：反向代理的路由与重写陷阱

Nginx 反向代理用 `proxy_pass` 转发时，若 location 匹配和 rewrite 规则写错，可能把内部接口暴露出去（如 `/api/internal` 被代理到内网管理接口）；`add_header` 在出错时可能被覆盖导致安全头丢失；`client_max_body_size` 等限制不当也可能被利用。代理层配置是"隐形"的漏洞源，往往不在代码审计范围内，却影响巨大。

## 常见坑（再补充）

1. **后端信任所有 X-Forwarded-* 头**：攻击者任意伪造，必须代理层覆盖且白名单受信代理。
2. **中间件用默认配置上线**：很多默认开启危险方法或暴露管理口。
3. **alias 与 root 混淆**：alias 路径拼接不同，易出遍历。
4. **只测应用不测链路**：中间件链差异才是漏洞温床。

## 进阶（再补充）：修复与加固

统一在边界代理处重写/覆盖客户端相关头；关闭中间件不必要模块与方法；管理接口放内网加鉴权；对照 CIS Benchmark 做配置核查；网关层做规范请求归一化再转发；WAF 规则定期更新，但根因修复仍在应用代码。中间件安全是"木桶短板"，一处默认配置就能拖垮整体。

## 小测验（再补充）

- 问题1：WAF 能被绕过说明什么？答案：WAF 是缓解不是根治，绕过多，根因要修代码。
- 问题2：X-Forwarded-For 能被伪造吗？答案：能，后端须只信受信代理覆盖后的值。
- 问题3：为什么只测应用层不够？答案：中间件链解析差异会产生走私、投毒等连锁漏洞。


## 这一篇你该记住的

中间件（Apache/Nginx/IIS/Tomcat/WebLogic/Jboss）自身也会漏。典型：解析漏洞（Apache 从右往左试后缀、IIS `;.jpg`、Nginx `x.php` 误执行）、目录列出、默认后台弱口令、Java 系反序列化 RCE（WebLogic/Tomcat/Jboss 多个 CVE）。先指纹识别+版本对应 CVE，再打。防御：打补丁、删默认内容、最小权限、禁目录浏览、限方法、正确配解析、后台加锁。

中间件是"服务器层面的漏"。下一篇 **各层协议漏洞攻防** 再往下看网络层/传输层：ARP 欺骗、SYN 泛洪、FTP/SSL 攻击，补全协议视角的攻击面。
