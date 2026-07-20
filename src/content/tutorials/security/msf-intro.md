---
title: Metasploit 入门：先搞懂这个"渗透测试框架"到底是什么
description: 从零认识 Metasploit——它为什么是渗透测试标配，模块化架构怎么分（exploit/auxiliary/payload/post），Kali 下怎么装、怎么连数据库，以及 msfconsole 的 search/use/set/run 基本操作，带你跑通第一次会话。
category: security
subcategory: msf
tags: ['Metasploit', 'msfconsole', '渗透框架', '模块', '入门']
pubDate: 2026-07-19
updatedDate: 2026-07-19
order: 1
---

如果你刚开始学渗透测试，几乎一定会被推荐先装好 **Metasploit Framework（简称 MSF）**。它就像渗透测试里的"瑞士军刀"：别人写好的漏洞利用、扫描器、_payload 生成器，都被它统一装进一个框架里，你只要选模块、填参数、运行，就能复用前人的成果。这一篇先把 MSF 的"全貌"和"基本操作"讲清，让你不再对着黑框发怵。

> 本文所有操作仅用于你对**自有或已授权**的目标（如本地靶机、授权渗透项目）做安全评估。对未授权系统使用 MSF 属违法，后果自负。

## MSF 到底是什么：一个"模块化军火库"

MSF 不是某一个漏洞利用工具，而是一个**框架**——它把渗透过程中需要的各种能力拆成一个个**模块**，统一管理。你不需要自己写漏洞代码，只要调用现成模块。它的核心组成有：

- **msfconsole**：主控制台，命令行交互界面，绝大多数操作都在这里完成。
- **msfvenom**：_payload 生成器，用来制造木马/反弹 shell/编码后的恶意载荷。
- **数据库（PostgreSQL）**：存目标信息、扫描结果、会话记录，方便后续查询与协作。
- **模块仓库**：成千上万个现成模块，按类型分目录存放。

理解"框架"二字很关键：MSF 本身不挖漏洞，它**组织和使用**漏洞利用。你学的不是某一个攻击，而是一套"调用任何攻击"的通用方法。

## 模块类型：看到名字就知道干什么

在 msfconsole 里，模块按类型分目录，前缀一眼能认：

| 类型 | 前缀 | 作用 |
|------|------|------|
| exploit | `exploit/` | 漏洞利用，打中了拿到会话 |
| auxiliary | `auxiliary/` | 辅助模块：扫描、嗅探、爆破、枚举 |
| payload | `payload/` | 攻击载荷：利用成功后执行的代码（如反弹 shell） |
| post | `post/` | 后渗透：拿 shell 后信息收集、提权、持久化 |
| encoder | `encoder/` | 编码器：对 payload 做编码，绕过简单检测 |
| evasion | `evasion/` | 规避模块：专门绕过杀软/EDR |
| nop | `nop/` | 空指令填充，用于堆喷射等高级利用 |

入门阶段你最常碰的是 `exploit/`、`auxiliary/`、`payload/`、`post/` 四类。记住这个表，后面看模块路径就不晕了。

## 安装与启动：Kali 自带最省心

最省事的方式是直接用 **Kali Linux**——它预装了 MSF，开箱即用。若你用别的系统：

```bash
# Debian/Ubuntu 系安装（示例，具体看官方文档）
sudo apt update
sudo apt install metasploit-framework

# 启动 PostgreSQL 数据库（MSF 推荐连库）
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 初始化 MSF 数据库
sudo msfdb init
```

初始化成功后，直接敲 `msfconsole` 就能进入控制台。第一次启动会看到那个经典的金色 ascii 艺术字，说明环境 OK。

```bash
msfconsole
# 进入后第一件事：确认数据库已连
msf6 > db_status
# 输出 [*] Connected to msf. Connection type: postgresql.
```

如果 `db_status` 显示没连上，多半是 PostgreSQL 没起或 `msfdb init` 没跑，回头把这两步补上即可。

## msfconsole 基本操作：六个命令走天下

进入控制台后，日常就靠这几个命令：

- **`help`**：看所有命令；`help <命令>` 看某个命令详情。
- **`search`**：搜模块。比如 `search type:exploit name:eternalblue` 找永恒之蓝利用；`search auxiliary scanner smb` 找 SMB 扫描器。
- **`use`**：加载模块。如 `use exploit/windows/smb/ms17_010_eternalblue`。
- **`show options`**：看当前模块要填哪些参数（`Required` 为 yes 的必填）。
- **`set`**：填参数。如 `set RHOSTS 192.168.1.10`、`set LHOST 192.168.1.5`。
- **`run` / `exploit`**：运行模块（`run` 和 `exploit` 在利用模块上等价）。

一个最小示例（在**授权靶机**上）：

```text
msf6 > use auxiliary/scanner/portscan/tcp
msf6 auxiliary(scanner/portscan/tcp) > set RHOSTS 192.168.1.10
msf6 auxiliary(scanner/portscan/tcp) > set PORTS 1-1000
msf6 auxiliary(scanner/portscan/tcp) > run
```

跑完会列出开放端口。`back` 退出当前模块回到根，`exit`/`quit` 退出 msfconsole。

## 工作区（workspace）：把不同目标分开管

连了数据库后，建议用 `workspace` 给不同项目建独立空间，避免目标信息混在一起：

```bash
msf6 > workspace -a proj_clientA     # 新建工作区
msf6 > workspace proj_clientA        # 切到该工作区
msf6 > workspace                     # 列出所有工作区，当前的高亮
```

之后你 `db_nmap` 扫的结果、录入的 host 都会归到当前工作区，报告也好整理。

## 常见新手坑

- **数据库没连**：症状是所有 `db_*` 命令报错。先 `sudo systemctl start postgresql` 再 `msfdb init`。
- **以普通用户跑导致写不进**：某些操作（如生成文件）需要目录权限，注意当前路径是否可写。
- **模块名记不全**：用 `search` 模糊搜，别硬背路径；`use` 后按 Tab 可补全。
- **对着未授权目标跑**：再次强调，只在自有/授权环境练，靶场（如 Metasploitable、DVWA）是最好的练习场。

## 进阶：把 MSF 当成你的"实验台"

除了实战，MSF 也是学习漏洞原理的好"实验台"。比如你想理解某个 CVE 的利用链，直接 `use` 对应 exploit 模块，看它的源码（`edit` 命令可在控制台打开模块源码，或去 `/usr/share/metasploit-framework/modules/` 下读 `.rb` 文件），比纯看文章直观得多。你还能用 `check` 命令先验证目标是否真的存在漏洞，再决定是否 `exploit`——这是负责任的做法，避免对不确定目标乱打：

```text
msf6 > use exploit/.../xxx
msf6 exploit(xxx) > check        # 先探测是否存在漏洞，不实际利用
[+] The target is vulnerable.    # 确认存在再 exploit
```

养成"先 `check` 再 `exploit`"的习惯，既安全又专业。

## MSF 与周边工具的关系

新手常问"有了 MSF 还要不要学 Nmap/Burp"。答案是要，因为 MSF 不是万能，它和周边工具是**互补**的：

- **vs Nmap**：Nmap 是专业端口/服务/漏洞脚本扫描器，功能比 MSF 内置扫描器全得多。实战里常用 `db_nmap` 借 Nmap 之力、结果还进 MSF 库，两全其美。MSF 胜在"扫完直接利用"。
- **vs Burp Suite**：Web 渗透（抓包、改请求、测逻辑漏洞）Burp 是标配，MSF 不擅长这类"交互式 Web 测试"。涉及 Web 漏洞先用 Burp，拿到 shell 后再上 MSF。
- **vs Cobalt Strike**：CS 强在协作/驻留/社工，MSF 强在利用模块量。两者常搭档（见 CS 篇）。
- **vs sqlmap**：SQL 注入专门用 sqlmap，比 MSF 的 `auxiliary` 注入模块专业。

一句话定位：**MSF 是"利用与后渗透的统一工作台"**——它把扫描（aux）、利用（exploit）、载荷（payload）、后渗透（post）串成一条流水线，这是它不可替代的价值。纯专项任务（扫端口、测 Web、注 SQL）交给更专业的工具，再用 MSF 把结果"接下去打"。

## 学习路径建议

学完这篇，建议你按这个顺序把 MSF 真正练熟（全在**自有/授权靶场**）：

1. **先把环境跑起来**：装 Kali 或配好 PostgreSQL + `msfdb init`，确认 `db_status` 连上。环境是后面一切的前提。
2. **只做侦察**：拿 `auxiliary` 扫自己的靶机（如 Metasploitable），熟悉 `search`/`use`/`set`/`run` 与 `hosts`/`services`。
3. **打一个经典漏洞**：在 Metasploitable 上用 `ms17_010` 或 `vsftpd` 等模块拿会话，体会 exploit→payload→session 全流程。
4. **玩 Meterpreter**：会话里跑 `sysinfo`/`migrate`/`hashdump`/`screenshot`，熟悉后渗透手感。
5. **做后渗透与报告**：试 `persistence`、开 `autoroute`，最后把过程整理成报告条目。

推荐练习靶机：**Metasploitable 2/3**（专门留漏洞的 Linux）、**DVWA**（Web）、以及自己搭的 Windows 虚拟机。千万别拿公网或他人机器练——那不是练习，是违法。

## 相关阅读：本系列怎么串

MSF 基础五章是"利用框架"的主干，建议按这个顺序读下去：本篇（入门）→ 侦察（auxiliary）→ 利用与 payload → Meterpreter → 后渗透。读完这五章，你有了"从装框架到站稳脚跟"的完整能力。

若想补全"为什么这些漏洞存在"的上游知识，可以配合站内的**代码审计（PHP+Java）**十章和 **Java 生态漏洞**七章——它们讲清漏洞根因，MSF 讲清怎么利用，攻防互补。后面还有 **Cobalt Strike 基础**与**内网渗透**两个系列，把"单点控制"扩成"长期驻留 + 横向蔓延"。三套合起来，就是一套完整的红队入门路径。

## 常见误区

- **"MSF 能打一切"**：MSF 模块再多也有覆盖不到的新漏洞，遇到它没有的，要会用手工/exp 脚本。
- **"不连数据库也能用"**：能用，但会丢掉 `hosts`/`creds`/`loot` 这些极有用的资产管理能力。
- **"对着外网随便扫"**：公网扫描需书面授权，内网靶机才是练习场。
- **"记住所有模块路径"**：没人背路径，靠 `search` + Tab 补全即可。

## 自测题

1. MSF 的六个模块类型分别是什么、各自干什么？
2. 为什么推荐用 Kali 而不是自己从零装？非 Kali 要补哪两步？
3. `search` / `use` / `set` / `run` 分别干什么？`workspace` 有什么用？
4. 为什么实战里建议先 `check` 再 `exploit`？

## 这一篇你该记住的

- MSF 是**渗透测试框架**而非单个漏洞工具，它统一组织"漏洞利用/扫描/payload/后渗透"等模块。
- 核心组件：`msfconsole`（控制台）、`msfvenom`（payload 生成）、PostgreSQL（数据库）、模块仓库。
- 模块按 `exploit/auxiliary/payload/post/encoder/evasion/nop` 分类，前缀即用途。
- 起步最省心用 Kali；非 Kali 要 `systemctl start postgresql` + `msfdb init` 再 `msfconsole`。
- 六个高频命令：`help` / `search` / `use` / `show options` / `set` / `run`；用 `workspace` 隔离不同项目。

下一篇我们专门玩 **auxiliary 辅助模块**——端口扫描、服务识别、SMB/SSH 爆破这些"打之前先把目标摸清楚"的活，MSF 里都有现成模块，不用自己写脚本。