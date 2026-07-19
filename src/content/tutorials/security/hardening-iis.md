---
title: IIS 安全加固：版本隐藏、请求过滤与应用池隔离
description: 面向 Windows 上的 IIS，讲清隐藏版本 banner、关闭目录浏览与不必要功能、请求过滤（URL/动词/长度）、应用程序池隔离、写权限控制、日志与 TLS，以及常见高危点。
category: security
subcategory: hardening
tags: ['IIS加固', '请求过滤', '应用池', '写权限', 'Windows']
pubDate: 2026-07-19
order: 7
---

IIS 是 Windows 平台上的主流 Web 服务器，常承载 ASP/ASP.NET 业务。它的加固思路和 Nginx/Apache 相通（隐藏信息、限制方法、禁执行），但工具有所不同——主要靠** IIS 管理器、web.config、以及 `appcmd`/`PowerShell` 命令**。

这篇把 IIS 加固最该做的几项讲清，适合 Windows Server 上跑 Web 的场景。

> 所有操作仅用于你**自有或已授权的服务器**。改 `web.config`、应用池前先备份，改完做业务验证。

## 第一关：隐藏版本与 banner

默认 IIS 会在 `Server` 头返回 `Microsoft-IIS/10.0`，并可能在错误页暴露版本。

```powershell
# 移除 Server 头中的版本信息（IIS 10 可通过移除响应头实现）
# 在 web.config 的 <system.webServer> 中：
# <security>
#   <requestFiltering removeServerHeader="true" />
# </security>
```

更彻底的做法是在 `web.config` 或 `applicationHost.config` 里设置 `removeServerHeader="true"`，让响应头不再带 `Microsoft-IIS`。错误页也可自定义，避免泄露技术栈细节。

## 第二关：关闭目录浏览与无用功能

```xml
<configuration>
  <system.webServer>
    <directoryBrowse enabled="false" />
  </system.webServer>
</configuration>
```

同时，按业务关掉不必要功能：如果不用 WebDAV、CGI、目录浏览、HTTP 错误详情，就在"添加角色服务"里移除，或在 `web.config` 禁用。WebDAV 近年是多个 RCE 的入口，非必要务必关闭。

## 第三关：请求过滤（Request Filtering）

IIS 自带请求过滤，能挡掉很多恶意请求：

```xml
<system.webServer>
  <security>
    <requestFiltering>
      <!-- 只允许的业务动词 -->
      <verbs allowUnlisted="false">
        <add verb="GET" allowed="true" />
        <add verb="POST" allowed="true" />
      </verbs>
      <!-- 限制 URL/查询串/内容长度，防超长攻击 -->
      <requestLimits maxUrl="2048" maxQueryString="1024" maxAllowedContentLength="10485760" />
      <!-- 隐藏特定文件扩展，防泄露 -->
      <fileExtensions allowUnlisted="true">
        <add fileExtension=".config" allowed="false" />
        <add fileExtension=".cs" allowed="false" />
      </fileExtensions>
      <!-- 过滤危险 URL 序列 -->
      <denyUrlSequences>
        <add sequence=".." />
        <add sequence=":" />
      </denyUrlSequences>
    </requestFiltering>
  </security>
</system.webServer>
```

`requestFiltering` 在请求到达应用前就拦掉危险动词、超长 URL、双写 `..` 等，是性价比很高的前置防线。

## 第四关：写权限与脚本执行控制

IIS 的"写权限"和"脚本执行"是两个独立开关，必须分开管：

- **写权限**：在"处理程序映射/授权规则"里，对上传目录**关闭写入**，否则攻击者可传文件。
- **脚本执行**：上传目录（如 `upload`）应**禁止脚本执行**（不映射 `.aspx`/`.php` 等处理器），防上传的 Webshell 被执行。
- 网站主目录给 IIS 进程账户（`IIS AppPool\xxx` 或 `IUSR`）最小权限：只读 + 必要写目录。

```powershell
# 用 appcmd 查看站点与处理程序映射
C:\Windows\system32\inetsrv\appcmd list config /section:handlers
```

核心原则：上传目录"可写不可执行"，主程序目录"可执行不可随意写"。

## 第五关：应用程序池隔离

IIS 的**应用程序池（Application Pool）**是隔离不同站点/应用的关键：

- 每个站点用**独立应用池**，一个被攻破不会直接拖垮其他站点。
- 应用池身份用**专属低权限账户**，不要用 `LocalSystem`（最高权限，一旦被利用后果严重）。
- 设"回收"策略（定时回收、内存上限触发），降低内存泄漏与驻留风险。

```powershell
# 新建独立应用池并设为低权限身份
New-WebAppPool -Name "SiteA_Pool"
Set-ItemProperty IIS:\AppPools\SiteA_Pool -Name processModel.identityType -Value ApplicationPoolIdentity
```

## 第六关：日志与 TLS

```xml
<system.webServer>
  <httpLogging directory="C:\inetpub\logs\LogFiles" enabled="true" />
</system.webServer>
```

- 开启 IIS 日志，记录客户端 IP、URL、状态码，便于溯源。
- TLS 在"站点绑定"里启用 HTTPS，选 TLS1.2/1.3，禁用老旧协议（在注册表 `SCHANNEL` 关 SSL3/TLS1.0/1.1）。
- 日志同样建议外发到独立日志服务器，防被入侵者清除。

## 常见误区

- **只关目录浏览不关写权限**：列不出来，但攻击者仍能 `PUT` 文件进去。
- **应用池用 LocalSystem**：等于给 Web 进程系统最高权限，一旦 RCE 全盘失守。
- **上传目录没禁脚本执行**：传 `shell.aspx` 直接命令执行。
- **WebDAV 开着不用**：多个高危 CVE 与之相关，应直接移除。

## 进阶：用 PowerShell 批量核查

```powershell
# 检查目录浏览是否关闭
Get-WebConfigurationProperty -Filter /system.webServer/directoryBrowse -Name enabled
# 检查请求过滤是否启用动词限制
Get-WebConfigurationProperty -Filter /system.webServer/security/requestFiltering/verbs -Name allowUnlisted
# 检查应用池身份类型
Get-ItemProperty IIS:\AppPools\* -Name processModel.identityType
```

把这些检查写成脚本定期跑，输出偏离基线的项，就是 IIS 基线核查。

## 自测题

1. IIS 的"写权限"和"脚本执行"为什么要分开控制？
2. 为什么应用池绝不要用 `LocalSystem` 身份？
3. `requestFiltering` 在攻击链里挡在哪个环节？有什么好处？
4. 上传目录"可写不可执行"具体怎么实现？

## 实战要点与深度解析

IIS 加固里最容易被低估的是**应用程序池的隔离价值**。很多单位把几十个站点塞进同一个默认应用池（DefaultAppPool），图省事。一旦其中一个站点被上传了 Webshell，攻击者在该池进程里就能读到同池其他站点的配置文件、甚至内存里的连接字符串——等于"一破全破"。正确的做法是：**每个站点用独立应用池，且应用池身份用专属的低权限账户**（ApplicationPoolIdentity 会按池名生成唯一虚拟账户）。这样即使一个站点失陷，攻击者也只能在该池的权限边界内活动，无法直接横向到同机其他站点。这是用"架构隔离"补"单点失陷"的经典思路。

再讲一个 Windows 特有的坑：**IIS 的 `web.config` 可被站点目录下的文件覆盖**。如果攻击者能往站点根目录写文件，他不仅能传 Webshell，还能写一个 `web.config` 把 `requestFiltering` 关掉、把脚本映射重新打开，从而让前面的所有请求过滤形同虚设。所以"上传目录禁脚本执行"和"限制对 web.config 的写权限"必须同时做，缺一不可。换句话说，IIS 的安全是"配置 + 文件系统权限"双重约束的结果，只改一边都会被另一边绕过。

关于 **SSL/TLS 在 IIS 上的落地**：图形界面里勾选绑定 HTTPS 只是第一步，真正决定安全性的是 Schannel 注册表里的协议与套件。很多老 Windows Server 默认还开着 TLS 1.0/1.1，需要用 IISCrypto 这类工具或手动改注册表把老旧协议关掉、把强套件排前面。另外，IIS 的"要求 SSL"和"需要客户端证书"是两个不同层次——前者只加密通道，后者还能做双向认证，对高安全要求的后台很有用。

还有一个运维细节：**失败请求跟踪（Failed Request Tracing）** 平时应关闭（它会产生大量日志、且可能泄露请求细节），只在排错时临时开启；排完立刻关。同理，详细错误信息（`httpErrors` 的 `errorMode=Detailed`）在公网必须设成 `Custom`，否则会把源码路径、内部异常暴露给攻击者，成为信息搜集的捷径。

最后提醒：**IIS 版本与 Windows 补丁强绑定**。IIS 的解析漏洞、提权漏洞往往通过 Windows Update 修复。很多单位"服务器从不重启打补丁"，结果一个已知多年的 IIS 漏洞一直开着。把"补丁及时性"纳入基线核查，和配置加固同等重要。

## 速查清单与排错口诀

IIS 加固口诀可记为：**头要隐、浏览关、过滤严、写执分、池隔离、志要留、链要新**。分别对应隐藏 banner、关目录浏览、requestFiltering 严限、写权限与脚本执行分开、应用池独立低权限、开日志、TLS 用新协议。

一个常见排错：运维按教程设了 `removeServerHeader` 却用旧版 IIS（如 8.5 及更早），发现该属性不被支持、banner 仍在。这时得改用 `urlrewrite` 规则或 `customErrors` 把 Server 头重写掉，而不是死磕一个不支持的属性。另一个坑：设了 `requestFiltering` 的 `allowUnlisted=false` 只允许 GET/POST，结果某个业务接口用了 `PUT`（如 RESTful 更新）直接 404，这时要在规则里把业务真正需要的动词显式放行，而不是退回"全允许"。加固永远要"对照业务验证"，这是贯穿全章的纪律。

## 进阶速记与误区辨析

IIS 加固里同样有几组容易混的概念，专门辨析一下。

第一组，写权限与脚本执行权限。很多人以为"我不让网站目录可写就安全了"，却忘了攻击者如果已经能通过别的方式传了文件，只要目录还允许执行脚本，那个文件照样能跑起来。所以关键不是单看写不写，而是"可写"和"可执行"要分开管，上传区域必须做到可写不可执行，主程序区域做到可执行但严格控制可写范围。

第二组，应用池身份与系统账户。把站点应用池设成系统最高权限账户，确实不会遇到任何权限报错，但也意味着一旦这个站点被攻破，攻击者直接拿到整台机器的控制权。正确做法是给每个池子一个独立且权限受限的身份，让单个站点的失陷尽量被框在它自己的边界里。

第三组，请求过滤开启与规则覆盖。开了请求过滤不等于万事大吉，还要看规则是不是真的覆盖了业务暴露的入口。比如你只限制了常见脚本扩展名，却放过了其他能被解析执行的扩展，攻击者换了个后缀照样能运行。规则要跟着实际的处理器映射走，不能想当然。

第四组，日志开启与日志可信。开了日志只是有了记录的可能，如果日志存在本机且本机能被攻击者控制，那日志随时可能被清掉。所以重要系统的日志一定要外发到独立的、攻击者不容易碰到的地方，这样即便主机被控，事后的溯源依然有凭有据。

速记口诀收尾：头部要隐、浏览要关、过滤要严、写执要分、池子要隔、日志要留、链路要新、改完要验。八句话对应八类动作，巡检时照着过，能少踩很多坑。

## 这一篇你该记住的

- 隐藏 `Server` banner（`removeServerHeader`），自定义错误页防泄露。
- 关目录浏览、按需移除 WebDAV/CGI 等无用功能。
- `requestFiltering` 限动词、限长度、过滤 `..` 与危险扩展，前置拦截。
- 上传目录可写不可执行；主目录给 IIS 低权限账户。
- 每站点独立应用池 + 低权限身份 + 回收策略，实现隔离。
- 开日志、上 TLS1.2/1.3，日志外发防篡改。

下一篇我们把前面所有加固项汇总成**可执行的基线核查清单与自动化脚本**。
