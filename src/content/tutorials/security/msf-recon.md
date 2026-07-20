---
title: MSF 信息收集：用 auxiliary 模块把目标摸清楚
description: 讲清 Metasploit 的 auxiliary 辅助模块怎么用于授权范围内的信息收集——端口扫描、服务/版本识别、SMB/SSH/FTP 探测与弱口令爆破、数据库录入，让你在"打"之前把目标看明白。
category: security
subcategory: msf
tags: ['Metasploit', 'auxiliary', '信息收集', '扫描', '爆破']
pubDate: 2026-07-19
updatedDate: 2026-07-19
order: 2
---

上篇你跑通了 msfconsole，知道了模块分类型。这一篇专门玩 **auxiliary（辅助）模块**——它们不打漏洞，而是做"打之前该做的侦察"：扫端口、认服务、探版本、试弱口令。渗透测试里 80% 的功夫在信息收集，而 MSF 把大量现成扫描器打包好了，不用你每次手敲 Nmap 脚本。

> 本文所有扫描/爆破操作仅用于你对**自有或已授权**的目标（如本地靶机、授权项目）。对未授权系统扫描或爆破属违法。

## auxiliary 模块长什么样

auxiliary 模块都放在 `auxiliary/` 下，再按功能分子目录，常见的有：

- `auxiliary/scanner/`：各类扫描器（端口、SMB、SSH、FTP、HTTP、SNMP…）。
- `auxiliary/admin/`：带认证的管理操作（如某些设备的配置读取）。
- `auxiliary/server/`：在本地起服务（如伪造 TFTP、恶意代理），用于投递。
- `auxiliary/dos/`：拒绝服务（仅授权压力测试用，慎碰）。

用 `search` 找它们最方便：

```bash
msf6 > search type:auxiliary scanner smb      # 找 SMB 相关扫描器
msf6 > search type:auxiliary scanner ssh      # 找 SSH 相关
msf6 > search type:auxiliary scanner portscan # 找端口扫描器
```

## 端口扫描：msf 自带的 tcp 扫描器

虽然 Nmap 更强，但 MSF 内置的 `scanner/portscan/tcp` 胜在"结果直接进数据库"，方便后续联动：

```text
msf6 > use auxiliary/scanner/portscan/tcp
msf6 auxiliary(tcp) > set RHOSTS 192.168.1.10
msf6 auxiliary(tcp) > set PORTS 1-1000
msf6 auxiliary(tcp) > set THREADS 10
msf6 auxiliary(tcp) > run
```

几个常用参数：`RHOSTS`（目标，可填单个 IP、逗号分隔、CIDR 如 `192.168.1.0/24`）、`PORTS`（端口范围）、`THREADS`（线程数，扫网段时调大提速）。结果会自动存进当前 workspace 的 `hosts`/`services` 表。

## 服务与版本识别

知道开了哪些端口后，下一步是"这端口跑的到底是啥服务、什么版本"——版本号往往直接对应已知漏洞。MSF 可以用 `scanner/smb/smb_version`、`scanner/ssh/ssh_version`、`scanner/http/http_version` 等识别：

```text
msf6 > use auxiliary/scanner/smb/smb_version
msf6 auxiliary(smb_version) > set RHOSTS 192.168.1.0/24
msf6 auxiliary(smb_version) > run
# 输出每台主机的 SMB 版本、主机名、工作组/域信息
```

这类模块的价值在于：它不只告诉你"端口开着"，还顺带把**主机名、操作系统、域成员关系**等内网关键信息一并捞回来——这正是后面内网渗透的原材料。

## 弱口令爆破：在授权范围内试密码

很多入侵其实不需要"漏洞"，一个弱口令就够了。MSF 自带大量登录爆破模块（`scanner/ssh/ssh_login`、`scanner/smb/smb_login`、`scanner/ftp/ftp_login`、`scanner/mysql/mysql_login` 等）：

```text
msf6 > use auxiliary/scanner/ssh/ssh_login
msf6 auxiliary(ssh_login) > set RHOSTS 192.168.1.10
msf6 auxiliary(ssh_login) > set USERNAME root
msf6 auxiliary(ssh_login) > set PASS_FILE /usr/share/wordlists/rockyou.txt
msf6 auxiliary(ssh_login) > set STOP_ON_SUCCESS true
msf6 auxiliary(ssh_login) > run
```

要点：`USERNAME`/`USER_FILE` 指定用户名，`PASS_FILE` 指定密码字典（Kali 自带 `rockyou.txt`，需先 `gunzip` 解压）；`STOP_ON_SUCCESS` 命中即停，省时间。再次强调：**只在你有权限测的目标上做**，且爆破可能触发账户锁定，生产环境要和客户确认。

## 把结果存进数据库：db_nmap 与 hosts

既然连了 PostgreSQL，尽量让扫描结果自动入库，后面好查：

```bash
msf6 > db_nmap -sV -p- 192.168.1.10     # 直接调 Nmap，结果进库
msf6 > hosts                            # 列出已录入的主机
msf6 > services                         # 列出各主机的开放服务
msf6 > vulns                            # 列出发现的漏洞（配合某些扫描模块）
msf6 > creds                            # 列出爆破出的凭据
```

`creds` 特别有用：你前面爆破出的账号密码会自动归集到这里，后渗透阶段直接调用，不用自己记小本本。

## 信息收集的工作流（入门版）

把上面串成一条线，授权渗透时大致这样走：

1. **定范围**：明确目标 IP 段（来自授权书），设好 `workspace`。
2. **扫端口**：`db_nmap` 或 `portscan/tcp` 摸清开放端口。
3. **认服务**：用 `smb_version`/`ssh_version`/`http_version` 等识别版本。
4. **试弱口令**：对 SSH/SMB/FTP/数据库跑 `scanner/*_login`，命中记进 `creds`。
5. **查漏洞**：拿版本号去 CVE 库/漏洞库比对，决定下一步用哪个 `exploit`。
6. **留档**：`hosts`/`services`/`creds`/`vulns` 就是你的侦察报告底稿。

## 常见新手坑

- **扫太猛被封 IP**：网段扫描把 `THREADS` 调太高、请求太快，容易触发防护。循序渐进。
- **忘了连库**：没 `db_status` 确认连接，`db_nmap`/`creds` 都用不了，结果也留不住。
- **字典路径错**：`rockyou.txt` 默认是 `.gz`，要先解压；自建字典注意路径可写。
- **对着外网乱扫**：内网靶机随便练，公网目标必须先有书面授权。

## 进阶：用 MSF 做资产梳理的实战节奏

真实授权项目里，侦察不是"扫一次就完"，而是**多轮、由浅入深**：

1. **第一轮（广）**：`db_nmap -sV -p-` 或 `portscan/tcp` 扫全端口，建立主机/服务清单。
2. **第二轮（深）**：对开放的关键服务（SMB/SSH/RDP/HTTP）用对应 version 模块识别版本与 banner。
3. **第三轮（弱口令）**：对 SSH/SMB/FTP/数据库跑 `scanner/*_login`，命中即入 `creds`。
4. **第四轮（漏洞映射）**：拿版本号去 CVE 库比对，确定该用哪个 `exploit`，进入利用阶段。

每一轮结果都落库，下一轮基于上一轮的数据缩窄范围。比如先知道哪台开 445，再只对开 445 的跑 SMB 相关模块——既快又不易触发大面积告警。

## 实战：一次授权侦察的记录示例

光讲命令抽象，给一段"假设你在授权项目里"的侦察流水，感受节奏（IP 均为内网靶场示例）：

```text
# 1) 设工作区、扫全端口
workspace -a clientA
db_nmap -sV -p- 192.168.1.0/24

# 2) 看结果：发现 192.168.1.20 开 445/3389，192.168.1.30 开 22
hosts
services

# 3) 识别 192.168.1.20 的 SMB 版本与主机名
use auxiliary/scanner/smb/smb_version
set RHOSTS 192.168.1.20
run
# 输出：Windows Server 2016，主机名 FILESRV，域成员

# 4) 对 192.168.1.30 试 SSH 弱口令（授权范围内）
use auxiliary/scanner/ssh/ssh_login
set RHOSTS 192.168.1.30
set USERNAME admin
set PASS_FILE /usr/share/wordlists/rockyou.txt
set STOP_ON_SUCCESS true
run
# 命中：admin / spring2019，记入 creds

# 5) 汇总
creds        # 看到刚破的 SSH 凭据
loot        # 暂无，后续后渗透再收
```

这段流水就是真实授权的缩影：**扫→识→试→记**。每一步结果都进库，后面利用阶段直接调 `creds` 里的账号，不用自己记。

## 侦察结果的"资产画像"怎么画

零散的扫描输出没用，要落成**资产画像**——给每台主机建一张卡。建议每主机记录：

| 字段 | 内容 | 来源 |
|------|------|------|
| IP / 主机名 | 192.168.1.20 / FILESRV | nmap / smb_version |
| 操作系统 | Windows Server 2016 | smb_version / nmap -sV |
| 开放端口 | 445, 3389, 80 | portscan / nmap |
| 服务版本 | SMB 10.0, OpenSSH 7.4 | version 模块 |
| 已知凭据 | admin/spring2019 | ssh_login 命中 |
| 潜在漏洞 | MS17-010（待验证） | 版本比对 |

这张卡就是后续利用的"作战地图"：开放 445 + 老 SMB 版本 → 试 MS17-010；有 SSH 弱口令 → 直接登；有 Web → 交给 Burp 测。侦察的价值不在于"扫了多少"，而在于"画出了多清晰的资产画像"。

## 侦察与合规的边界

信息收集看似"只是看看"，但主动扫描（端口扫、爆破）在很多司法辖区都属于**需明确授权**的行为，边界要清楚：

- **书面授权先于一切**：动手前必须有客户签字的范围说明（哪些 IP、哪些手段允许）。超出范围的扫描可能构成"未授权访问"。
- **被动优先**：能查公开信息（whois、搜索引擎、证书透明日志）就先查，少碰目标。被动收集几乎无法律风险。
- **不越界**：授权只到 `192.168.1.0/24`，就别顺手扫 `192.168.2.0/24`。范围外即违规。
- **留痕可审计**：扫描时间、目标、用的模块都记下来，既是报告素材，也是"我在授权内操作"的证据。
- **爆破要克制**：弱口令爆破可能触发账户锁定，影响业务；生产账户需客户确认，且设 `STOP_ON_SUCCESS` 及时停。

合规不是束缚，而是职业渗透和"黑客"的分界线——前者在授权框架内帮客户发现风险，后者越界即违法。

## 速记：侦察就这三件事

如果记不住那么多模块，记住侦察的"三件事"：

1. **扫端口**：`portscan/tcp` 或 `db_nmap`，弄清开了哪些口。
2. **认服务**：`smb_version`/`ssh_version`/`http_version` 等，弄清跑的是什么、什么版本。
3. **试弱口令**：`scanner/*_login`，弄清有没有能直接登的账号。

三件事做完，目标的"门"和"钥匙"基本清楚了。剩下的就是拿版本比对漏洞、拿账号去利用——那是后面篇章的事。

## 小结

侦察做得越细，后面利用越顺。宁可多花时间把资产画像画清楚，也别急着开打——这是新手最该改的习惯。记住侦察三件事（扫端口、认服务、试弱口令），把结果落进 `hosts`/`services`/`creds`，后面的 exploit 和横向才有扎实的地基。

## 常见误区

- **"扫得越快越好"**：高线程、全端口猛扫容易触发 IPS 封 IP，内网也要讲节奏。
- **"只扫常见端口"**：很多服务躲在高位端口，只扫 1-1000 会漏掉关键暴露面。
- **"爆破不设 STOP_ON_SUCCESS"**：命中后还继续打，既慢又增加锁账户风险。
- **"侦察不算攻击"**：主动扫描在多数环境仍属需授权行为，别以为是" harmless"。

## 自测题

1. auxiliary 模块和 exploit 模块的本质区别是什么？
2. 用 `scanner/smb/smb_version` 除了版本，还能顺带拿到哪些内网情报？
3. `db_nmap` 相比裸 `nmap` 的好处是什么？结果存在哪几张表里？
4. 弱口令爆破为什么必须确认授权、且慎用于生产账户？

## 这一篇你该记住的

- auxiliary 模块负责"侦察"：端口扫描、服务识别、弱口令爆破，不打漏洞。
- 用 `search type:auxiliary scanner <协议>` 找对应扫描器；`RHOSTS` 支持单 IP/CIDR/逗号列表。
- `scanner/smb/smb_version` 等不仅能认版本，还能顺带回主机名、域信息，是内网情报来源。
- 弱口令爆破用 `scanner/*_login`，配 `PASS_FILE` 字典与 `STOP_ON_SUCCESS`；仅限授权目标。
- 连库后用 `db_nmap`/`hosts`/`services`/`creds`/`vulns` 管理侦察成果，形成报告底稿。

下一篇我们进入最让人兴奋的部分——**漏洞利用与 payload**。你会学到怎么 `use` 一个 exploit、用 `msfvenom` 生成木马、理解 `LHOST`/`LPORT`/`RHOSTS` 这些参数，以及利用成功后在目标上拿到一个会话。