---
title: 权限提升：从普通用户到 SYSTEM / root
description: 讲清内网渗透里的提权——为什么拿到的常是低权用户，Windows 提权（系统漏洞/服务/令牌/AlwaysInstallElevated/UAC）与 Linux 提权（内核/SUID/sudo/cron）的常见面，以及 winPEAS/LinPEAS/Windows-Exploit-Suggester 等辅助工具怎么用。
category: security
subcategory: internal
tags: ['提权', 'Privilege Escalation', 'Windows提权', 'Linux提权', 'winPEAS']
pubDate: 2026-07-19
order: 2
---

拿下机器的第一刻，你大概率是个**普通用户**——可能是个普通域用户，或本地低权账号。但抓哈希、装驱动、读域控、留持久化，这些"值钱"的操作往往要 SYSTEM 或 root。所以**提权（Privilege Escalation）**是内网渗透的必经一步。这一篇把 Windows 和 Linux 各自的提权面讲清，并给你一套"自动找提权线索"的工具。

> 本文所有提权操作仅用于你对**自有或已授权**的目标。对他人系统提权属违法。

## 为什么需要提权

低权用户能干的事很有限：读不到别人的文件、改不了系统配置、抓不了密码哈希。而 SYSTEM（Windows）/root（Linux）是机器的最高权限，几乎为所欲为。提权就是"从低权爬到高权"的过程，常见动机：

- 抓本机密码哈希（需高权）；
- 安装持久化后门/驱动；
- 利用高权服务做横向；
- 为后续域渗透准备令牌/票据。

## Windows 提权的几个常见面

**1. 系统漏洞（内核/服务提权）**
老系统没打补丁，存在本地提权漏洞，对应 MSF 的 `exploit/windows/local/*` 或独立 exp（如 MS16-032、烂土豆 RottenPotato 系、PrintNightmare 等）。前提是你 `systeminfo` 里缺对应补丁。

**2. 服务提权**
某些服务以 SYSTEM 运行，若其二进制路径可写、或配置可被低权用户改，就能替换成你的程序，重启服务即提权。

**3. 令牌冒充（Token Impersonation）**
Windows 用"令牌"表示身份。某些服务（如 IIS、SQL Server）运行在较高权限且允许"冒充"，攻击者可窃取/冒充其令牌升到 SYSTEM。MSF 的 `incognito`、CS 的 `getsystem` 都基于此。

**4. AlwaysInstallElevated**
若组策略开了 `AlwaysInstallElevated`，普通用户能用 `.msi` 以 SYSTEM 安装程序——直接打个提权 msi 即可。可用 `reg query` 检查该键是否开启。

**5. UAC 绕过**
即使你是管理员组的用户，默认还受 UAC 限制。某些技巧（如 fodhelper、eventvwr 的注册表劫持）可绕过 UAC 拿到高权。

## Linux 提权的几个常见面

**1. 内核漏洞**
老内核存在本地提权漏洞（如 Dirty COW CVE-2016-5195），有现成 exp 编译运行即可提 root。看 `uname -a` 比对漏洞影响版本。

**2. SUID 文件**
带 `s` 位的程序以**文件所有者**身份运行。若某个 SUID 程序是 root 所有且能被你利用（如 `find`、`vim`、`nmap` 带交互模式），就能借它提权：

```bash
find / -perm -4000 -type f 2>/dev/null   # 找所有 SUID 文件
# 若找到可利用的，如 /usr/bin/find：
find . -exec /bin/sh -p \; -quit         # 借 find 的 root 身份起 shell
```

**3. sudo 滥用**
` sudo -l` 看当前用户能以 root 跑哪些命令。若允许 `NOPASSWD: /usr/bin/vi` 之类，就能 `sudo vi` 然后 `:!sh` 提权；甚至 `sudo su` 直接变 root。

**4. cron 任务**
系统定时任务以 root 跑，若其脚本/目录可被你写，植入命令即 root 执行。

**5. 弱权限文件/环境变量**
可写的服务配置、PATH 劫持、可写提权脚本等，都是经典面。

## 自动找线索：PEAS 系列

手工看太慢，实战用自动化脚本一把梭。最出名的是 **PEAS 系列**：

- **winPEAS**：Windows 提权枚举脚本，跑完列出缺失补丁、弱服务、可写路径、AlwaysInstallElevated、有趣文件等。
- **LinPEAS**：Linux 版，列出 SUID、sudo、cron、弱文件权限、内核版本等。
- **Linux Smart Enumeration (lse)**、**unix-privesc-check**：类似辅助。

```bash
# 把脚本弄到目标上执行（练习环境）
# Windows：
winPEASx64.exe
# Linux：
./linpeas.sh
```

它们输出一大堆，你重点看标红/高亮的"可能可利用"项，再针对性验证。配合 **Windows-Exploit-Suggester**（拿 systeminfo 比对微软补丁库，给出缺哪些提权补丁）效果更佳。

## 提权的一般步骤（入门版）

1. **看当前权限**：`getuid`/`whoami`/`id`，确认是低权。
2. **跑枚举脚本**：winPEAS/LinPEAS 找线索。
3. **对线索逐个验**：缺补丁→找对应 exp；SUID 异常→试利用；服务可写→试替换。
4. **拿到 SYSTEM/root 后确认**：再 `getuid`/`id` 验证。
5. **继续下一步**：提权成功后抓哈希、做横向。

## 常见新手坑

- **不看补丁就乱试 exp**：`systeminfo` 显示已打补丁，对应 exp 必失败，先枚举再动手。
- **Linux SUID 找了不验证**：找到 SUID 文件不代表能提权，要确认它是否真能执行你给的命令。
- **sudo -l 输出没细看**：`(ALL) NOPASSWD: ALL` 是最爽的，但很多人漏看 `sudo -l`。
- **提权后忘了确认**：以为提成了，其实还是低权，后续操作全失败，务必再 `getuid` 验证。

## 进阶：提权失败后的排查清单

提权不是"跑个 exp 就成"，常要排查。一份实战排查清单：

1. **确认当前权限**：`getuid`/`id` 真在低权吗？有时候你已经是 SYSTEM 还以为没提。
2. **补丁对照**：`systeminfo` 输出喂给 Windows-Exploit-Suggester，看缺哪些提权补丁；Linux 用 `uname -a` 对照内核漏洞。
3. **服务/计划任务**：`services.msc` 或 `tasklist` 看有无以高权运行且可写的程序；`schtasks` 看计划任务。
4. **SUID/sudo**：Linux 跑 `find / -perm -4000`、`sudo -l`，找可利用点。
5. **令牌**：Windows 看当前进程令牌能否 impersonate（incognito 的 `list_tokens`）。
6. **换思路**：本地提权不行，可能要从**横向**找别的机器（那里也许更易提权），再杀回来。

提权是"信息差"游戏——你发现的弱点越多，成功面越大。枚举脚本（PEAS）就是帮你把"可能弱点"列全。

## 实战：一个 Windows 提权从枚举到成功的例子

给一段"假设目标 Win2016、低权用户"的提权流水（靶场思路）：

```text
# 1) 确认低权
getuid                 # 普通域用户，非 SYSTEM

# 2) 跑枚举脚本找线索
upload winPEASx64.exe
shell winPEASx64.exe
# 输出高亮：缺少 KB4500331（对应某提权补丁）、C:\ProgramData 可写、某服务二进制可写

# 3) 试系统漏洞提权（MSF）
use exploit/windows/local/ms16_032_secondary_logon
set SESSION 1
set LHOST ...
exploit
# 失败：目标已打该补丁

# 4) 转试"服务二进制可写"：替换服务 exe 为反向 shell，重启服务
# （需对应服务配置允许，且你有写权限）
# 成功拿到 SYSTEM 会话

# 5) 确认
getuid                 # NT AUTHORITY\SYSTEM
```

这个例子说明提权是**多路径尝试**：漏洞不行试服务、服务不行试令牌、令牌不行试 AlwaysInstallElevated。枚举脚本帮你把"可能路径"列全，再逐条验——而非赌某一个 exp。

## 提权辅助命令速查

把提权常用的"手动枚举命令"收成速查，省得每次现查：

**Windows：**
```text
whoami /priv              # 看当前用户特权（SeImpersonate 等可提权）
whoami /groups            # 所属组
systeminfo               # 补丁清单（喂 Exploit-Suggester）
wmic qfe list            # 已装补丁（另一视角）
icacls "C:\Program Files\X"   # 看目录/文件权限，找可写
net user                 # 本地用户
accesschk.exe -uwcqv "Everyone" "C:\..."  # 查谁对该路径有权限
```

**Linux：**
```bash
id                      # 当前 uid/组
uname -a                # 内核版本（比对漏洞）
sudo -l                 # 能以 root 跑哪些命令
find / -perm -4000 -type f 2>/dev/null   # SUID 文件
crontab -l; ls -la /etc/cron*            # 计划任务
cat /etc/passwd; cat /etc/shadow         # 账户与哈希（shadow 需权限）
env                     # 环境变量（PATH 劫持线索）
```

这些命令配合 PEAS 脚本，基本覆盖"找提权线索"的 80%。记住：**枚举不是目的，枚举出的每一条都要去验证是否真能利用**。

## 提权与"最小权限"原则

提权能成功，几乎总是因为**权限给多了**。从防守视角，提权的对立面就是"最小权限原则"：

- **服务别用 SYSTEM 跑**：很多服务本可用普通低权账户，却图省事配成 SYSTEM，一旦服务有漏洞就直接提权。应按需降权。
- **文件/目录权限收紧**：可写的服务二进制、可写的计划任务脚本，是常见的提权跳板。定期审计"谁对该路径可写"。
- **关掉不必要的提权通道**：如非必需，禁用 `AlwaysInstallElevated`、限制令牌委派。
- **及时打补丁**：系统漏洞提权的前提是缺补丁，补丁管理直接堵掉一大类。
- **LAPS 管本地口令**：避免全网通用本地管理员密码。

所以红队练提权，本质是在验证"这家公司的权限给得是不是太多"。提权成功 = 防守在最小权限上失分，报告里点出来就是价值。

## 速记：提权就是找"权限给多了"的地方

提权能不能成，看你能不能找到"本不该有、却有"的权限。一句话记住常见的"多给的权限"：

- **缺补丁** → 系统漏洞提权；
- **服务以 SYSTEM 跑且可写** → 服务提权；
- **令牌可冒充** → 令牌提权；
- **开 AlwaysInstallElevated** → msi 提权；
- **SUID 文件 / sudo 过宽 / 可写 cron** → Linux 提权。

枚举脚本（PEAS）就是帮你把这些"多给的权限"一次性列出来。找到一处能验证利用，提权就成。

## 常见误区

- **"一个 exp 打遍天下"**：不同补丁/配置对应不同提权，没万能 exp。
- **"SUID 找到就能提"**：找到 SUID 文件只是起点，要确认它真能执行你给的命令。
- **"sudo -l 懒得看"**：`(ALL) NOPASSWD: ALL` 是最直接提权，漏看就绕远路。
- **"提权只盯本地"**：本地提不动时，横向找软机器再回头，是常见跳出路径。

## 自测题

1. Windows 和 Linux 各自的提权面，各举三个。
2. winPEAS/LinPEAS 帮你解决什么问题？为什么还要手动验证？
3. `sudo -l` 输出里什么情况意味着可直接提 root？
4. 本地提权卡住时，为什么"横向找别的机器"可能是出路？

## 这一篇你该记住的

- 提权是把低权用户顶到 SYSTEM（Win）/root（Linux），才能抓哈希、留后门、做横向。
- **Windows 面**：系统漏洞、服务提权、令牌冒充（getsystem）、AlwaysInstallElevated、UAC 绕过。
- **Linux 面**：内核漏洞、SUID 文件、sudo 滥用、cron、弱权限文件。
- 用 **winPEAS / LinPEAS / Windows-Exploit-Suggester** 自动枚举线索，再针对性验证。
- 步骤：看权限 → 跑枚举 → 验线索 → 确认提权 → 继续横向。

下一篇我们讲 **横向移动**——提权后怎么从"这一台"跳到内网里"另一台"。IPC$/SMB、psexec、WMI、Pass the Hash 这些手法，是把点到面的关键一步。