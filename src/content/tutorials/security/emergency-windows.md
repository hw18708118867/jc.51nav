---
title: Windows 主机应急响应：账户、计划任务、服务与启动项
description: Windows 被入侵后，攻击者常用计划任务、服务、注册表启动项、WMI 事件订阅做持久化。这篇给出可照做的排查清单：异常账户、可疑进程、计划任务、服务、启动项、注册表 Run 键，以及事件日志怎么看。
category: security
subcategory: emergency
tags: ['Windows应急', '计划任务', 'WMI', '注册表', '事件日志']
pubDate: 2026-07-19
updatedDate: 2026-07-19
order: 3
---

Windows 在内网、办公、政企环境里无处不在，也是勒索软件、横向移动的重灾区。它的持久化手法比 Linux 更"花"：计划任务、服务、注册表 Run 键、WMI 事件订阅、组策略……这篇把 Windows 主机应急的实战排查讲清。

> 所有排查命令仅用于你**自有或已授权**的主机。排查前先对系统做快照/备份（如 VSS 卷影、磁盘镜像），保护现场再动手。

## 第一步：确认与保护现场

- 看当前登录会话：`query user` 或任务管理器"用户"标签。
- 云主机先打快照；物理机用 FTK Imager 等做磁盘镜像，或用 `wbadmin` 建备份。
- **先别重装**：重装会丢失"怎么进来的"所有线索，且可能掩盖数据已泄露。

## 第二步：查异常账户

```powershell
# 本地账户列表
Get-LocalUser
# 重点看：新账户、被启用的 Guest、加入管理员组的陌生账户
Get-LocalGroupMember Administrators
# 域环境看域账户异常（域控上）
net user /domain
```

攻击者常新建一个名字像系统账户的（如 `admin_`、`svc_upd`）并提权到管理员，或启用被禁用的 `Guest`。发现即高度可疑。

## 第三步：查进程与网络连接

```powershell
# 进程及命令行（看伪装）
Get-WmiObject Win32_Process | Select-Object Name,ProcessId,CommandLine,ExecutablePath
# 或 PowerShell 原生
Get-Process -IncludeUserName | Select-Object Name,Id,UserName,Path
# 网络连接（找 C2 外联）
netstat -ano | findstr ESTABLISHED
# 用 PID 反查进程
tasklist /svc | findstr <PID>
```

判断伪装同样看**路径**：系统进程一般在 `C:\Windows\System32`，落在 `C:\Users\Public`、`C:\Temp`、`AppData\Local\Temp` 的大概率恶意。命令行里出现 `powershell -enc`（编码命令）、`certutil -urlcache`（下载）、`bitsadmin` 下载，都是典型恶意特征。

## 第四步：查计划任务（最高频持久化）

```powershell
# 列出所有计划任务
Get-ScheduledTask | Where-Object {$_.State -ne "Disabled"} | 
  Select-Object TaskName,TaskPath,Actions,Triggers
# 看任务动作里执行的命令
schtasks /query /fo LIST /v
```

攻击者把恶意脚本挂到计划任务，每分钟/每次登录触发。重点看任务路径是否在 `C:\Windows\Tasks` 之外、动作是否调用 `powershell`/`cmd` 执行下载或反弹。临时目录、用户目录下的任务尤其要怀疑。

## 第五步：查服务与启动项

```powershell
# 已启用且非微软签名的服务
Get-WmiObject Win32_Service | Where-Object {$_.State -eq "Running"} | 
  Select-Object Name,PathName,StartMode,StartName
# 注册表 Run 键（开机自启）
reg query HKLM\Software\Microsoft\Windows\CurrentVersion\Run
reg query HKCU\Software\Microsoft\Windows\CurrentVersion\Run
# 更隐蔽的 RunOnce、Services 映像路径劫持
reg query HKLM\Software\Microsoft\Windows\CurrentVersion\RunOnce
```

服务后门常伪装成名字像 `WindowsUpdate`、`Sysmon` 的服务，但 `PathName` 指向临时目录的 exe。Run 键是最经典的自启位置，务必逐个确认来源可信。

## 第六步：查 WMI 事件订阅（更隐蔽）

高级攻击者用 **WMI 永久事件订阅**做持久化，不落地文件、不出现在计划任务里：

```powershell
# 用 PowerShell 查 WMI 订阅（需 administrator）
Get-WmiObject -Namespace root\subscription -Class __EventFilter
Get-WmiObject -Namespace root\subscription -Class CommandLineEventConsumer
Get-WmiObject -Namespace root\subscription -Class __FilterToConsumerBinding
```

如果发现非预期的 `CommandLineEventConsumer`（尤其执行 `powershell`/`cmd`），很可能是 WMI 后门。这类手法隐蔽，常规查杀容易漏，是应急进阶必查项。

## 第七步：看事件日志定位时间线

事件查看器（`eventvwr.msc`）重点看：

- **安全日志**：登录事件 `4624`（成功）、`4625`（失败，爆破）、`4672`（特殊权限分配）、`4720`（新建账户）、`4732`（加入特权组）。
- **系统日志**：服务安装、计划任务创建、系统时间被改。
- **PowerShell 日志**（若开启）：`4104` 记录执行的脚本块，能看到编码命令解码后的内容。

用 `wevtutil` 可导出日志做离线分析：

```powershell
wevtutil epl Security C:\evidence\security.evtx
```

## 常见误区

- **只查进程不查计划任务/WMI**：进程杀了，定时任务每分钟又拉起来，永远清不掉。
- **只装杀软全盘扫**：杀软可能已被攻击者禁用（停了 `WinDefend` 服务），且免杀样本扫不出来。
- **忽略事件日志时间线**：不建立"什么时候被入侵"的时间锚点，无法判断数据是否在被控期泄露。
- **在受害机直接双击可疑 exe**：可能触发自毁或进一步感染，应在沙箱分析。

## 进阶：用 Sysinternals 工具箱

微软的 **Sysinternals** 套件是 Windows 应急利器：

- **Autoruns**：一站式列出所有自启项（计划任务、服务、Run 键、驱动、WMI），比手工查全得多，还能在线查病毒库信誉。
- **Process Explorer**：看进程真实路径、加载的 DLL、数字签名，识别伪装。
- **TCPView**：图形化看每个进程的网络连接，找 C2。
- **Procmon**：实时监控文件/注册表/进程活动，定位恶意行为。

把 Autoruns 跑一遍，基本能覆盖 90% 的持久化位置。

## 自测题

1. Windows 上哪两类持久化最常被忽略却很隐蔽？
2. 为什么判断进程是否恶意要看 `ExecutablePath` 而非进程名？
3. 事件日志里哪些 ID 能帮你定位"账号被盗/被新建"？
4. WMI 永久事件订阅做后门，为什么常规查杀容易漏？

## 实战要点与深度解析

Windows 应急里最容易被忽略的，是**域环境下的"黄金票据/白银票据"类持久化**。如果域控本身被攻陷，攻击者可能伪造 Kerberos 票据实现长期控制，这类后门不落在某台工作站的计划任务里，而是藏在域控的票据签发逻辑中。所以一旦怀疑域环境被控，不能只查成员机，必须重点排查**域控**：检查krbtgt 账户是否重置过、是否有异常黄金票据、组策略是否被篡改下发后门。域是信任根，根被污染，枝叶怎么清都不干净。

再谈一个现实矛盾：**业务不能停 vs 要取证**。很多 Windows 服务器是生产核心，不能像测试机那样随便镜像、重启。这时要权衡：优先做"不中断的取证"——用 `wevtutil` 导出事件日志、用 Sysinternals 的 Autoruns 远程/本地导出自启项、用 `tasklist`/`netstat` 抓进程与连接快照。把"能否中断"作为处置策略的分水岭：能中断的做完整镜像，不能中断的做轻量快照 + 后续观察。

关于 **PowerShell 日志的价值**：现代攻击者大量用 PowerShell 做无文件攻击（`powershell -enc` 执行编码命令、从内存下载执行），传统进程检查看不到。但只要开了 **Script Block Logging（4104）** 和 **Module Logging**，PowerShell 执行的脚本内容会被记录到事件日志，连编码命令也能解码还原。所以应急前（更准确是平时）开启这些日志，是 Windows 溯源的"隐藏王牌"。没开的，事发后只能靠内存取证补。

还有一个常被问的问题：**中了勒索要不要交赎金**。结论很明确：不要交。交了不保证恢复（很多团伙收钱不解密），还助长犯罪，且你可能被标记为"愿意付钱的目标"遭二次勒索。唯一可靠的恢复手段是**离线、不可篡改的备份**——这再次印证了前面"加固与备份是双胞胎"的论断。应急团队该做的，是把"有没有可用备份"作为勒索处置的第一问。

最后提醒：**别在受害 Windows 上双击可疑样本**。很多样本有"反沙箱/反虚拟机"逻辑，或在特定环境才触发，双击可能直接运行并进一步感染。样本应复制到隔离的沙箱虚拟机分析，宿主保持干净。

## 进阶速记与误区辨析

Windows 应急里也有几组特别容易让人看走眼的情况，专门辨析。

第一组，进程名与执行路径。和 Linux 一样，判断进程是否恶意要看它实际跑在哪个路径，而不是名字像不像系统程序。落在用户目录或者临时目录里的同名进程，高度可疑，命令行里出现编码执行或者下载命令更是典型恶意特征。

第二组，单台处置与域环境。很多人只在失陷的工作站上查，却忘了域环境里真正的高价值目标是域控。如果域控本身被控，攻击者可能伪造票据实现长期控制，这类后门不落在某台机器的计划任务里，而藏在域的信任根里。所以一旦怀疑域被控，必须重点排查域控。

第三组，重启与证据保留。遇到勒索第一类冲动是重启，但内存里可能还残留着解密的线索，一重启就永远丢失了。正确顺序是先隔离断网、保护现场做镜像，再谈恢复。同样，在受害机上直接双击样本分析也可能触发二次感染，应该在隔离沙箱里做。

第四组，杀毒与凭据重置。远控木马可能已经记录了键盘输入，所以清完恶意程序之后，所有可能被泄露的密码和密钥都要重新设置，不能只杀进程就以为完事。

速记收尾：看路径别看名、域控要重点查、重启之前先留证、清完必须重置凭据。四句话对应 Windows 应急四个最容易遗漏的动作。

## 这一篇你该记住的

- 先快照/备份保护现场，不急着重装。
- 账户：查新建/提权账户、被启用的 Guest。
- 进程：看命令行（`powershell -enc`、`certutil` 下载）与真实路径。
- 持久化必查：计划任务、服务（PathName 指向临时目录）、Run 键、WMI 订阅。
- 事件日志：4625 爆破、4720 新建账户、4732 加特权组、4104 脚本块。
- 进阶用 Sysinternals（Autoruns/Process Explorer/TCPView）覆盖自启项。

下一篇我们聚焦 **Web 入侵与 Webshell 排查**——这是互联网业务最高频的事件类型。
