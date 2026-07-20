---
title: 域渗透基础：Kerberos、票据与拿下域控
description: 拆解 Active Directory 域渗透的核心——Kerberos 认证流程（AS-REQ/AS-REP/TGS）、AS-REP Roasting 与 Kerberoasting 两种票据攻击、黄金/白银票据入门概念，以及 BloodHound/Impacket/mimikatz 等工具的角色。
category: security
subcategory: internal
tags: ['域渗透', 'Kerberos', 'Kerberoasting', '黄金票据', 'BloodHound']
pubDate: 2026-07-19
updatedDate: 2026-07-19
order: 4
---

前面讲了横向移动，用的多是"口令/哈希"。在域环境里，还有一套更优雅、更致命的玩法——**基于 Kerberos 票据的攻击**。域控（DC）就是 Kerberos 的"票据中心"，拿下它等于拿下整个域。这一篇把域渗透的基础概念讲清，让你知道红队是怎么"玩票据"把域吃掉的。

> 本文所有域攻击操作仅用于你对**自有或已授权**的域靶场/项目。对真实域环境未授权攻击属严重违法。

## 先懂 Kerberos：域怎么认证

Active Directory 域用 **Kerberos** 做身份认证，核心角色：

- **KDC（密钥分发中心）**：通常就是域控，负责发票据。
- **TGT（票据授予票据）**：你登录时 KDC 发的"身份凭证"，证明"你是你"。
- **TGS（服务票据）**：你访问某服务时，用 TGT 换来的"访问该服务的票"。

简化流程：

```text
1) 你 → KDC：AS-REQ（要登录，带用户名）
2) KDC → 你：AS-REP（发 TGT，用你的密码哈希加密）
3) 你 → KDC：TGS-REQ（用 TGT 换访问某服务的票）
4) KDC → 你：TGS-REP（发 TGS，用服务账号哈希加密）
5) 你 → 服务：拿 TGS 访问服务
```

记住两个加密点：**TGT 用你的密码哈希加密，TGS 用服务账号的哈希加密**。这两个点，就是两类攻击的命门。

## 攻击一：AS-REP Roasting

第 2 步的 AS-REP 里，TGT 是用**用户密码哈希**加密的。如果某个用户**没开预认证（Pre-Authentication）**，攻击者可以**不用密码**就请求到这张加密 TGT，然后离线爆破它的密码哈希。

- 适用：域里配置了"不需要 Kerberos 预认证"的账户（常见是服务账户被误配）。
- 工具：Impacket 的 `GetNPUsers.py` 枚举这类用户并导出可爆破的 AS-REP。
- 结果：拿到后离线 `hashcat` 破密码，破了就能正常登录该用户。

## 攻击二：Kerberoasting

第 4 步的 TGS 是用**服务账号的密码哈希**加密的。任何域用户都能请求某个服务的 TGS（不需要该服务密码），于是攻击者可以请求一堆服务的 TGS，**拿回去离线爆破服务账号的密码**。

- 为什么有用：很多服务账号（如 SQL Server 服务账户）密码**很强但从不改**，且可能还是高权限，破出来就能横向/提权。
- 工具：Impacket 的 `GetUserSPNs.py` 请求 TGS；`hashcat` 离线破。
- 结果：破出服务账号明文 → 用它在域内横向，甚至若服务账号是域管则直接拿下域。

Kerberoasting 是域渗透里**最实用、最隐蔽**的攻击之一，因为请求 TGS 是"正常 Kerberos 行为"，不易被察觉。

## 攻击三：票据伪造（黄金/白银票据）

这是域渗透的"大招"，概念先建立：

- **白银票据（Silver Ticket）**：伪造某**服务**的 TGS。你只要知道该服务账号的哈希（从 Kerberoasting 或抓哈希得到），就能自己造访问该服务的票，无需经过 KDC。局限：只能访问那一个服务。
- **黄金票据（Golden Ticket）**：伪造 **TGT**。TGT 是用**域控的 krbtgt 账号哈希**签名的——一旦你拿到 krbtgt 的哈希（域管权限或 DC 上抓取），就能造**任意用户、任意权限**的 TGT，等于域里"万能门票"，且 KDC 无法吊销（除非重置 krbtgt 密码两次）。

```text
# 概念示意（实际用 mimikatz / Impacket ticketer 操作，需先有 krbtgt 哈希）
# 黄金票据：拿到 krbtgt 哈希 → 造任意域管 TGT → 域内畅通无阻
```

黄金票据是"拿下域"的标志性成果——持票者可以冒充域管理员访问任何域资源。

## 攻击路径可视化：BloodHound

域里谁能接管谁，往往藏在复杂的权限关系里。**BloodHound** 把域对象的所属关系、组成员、委派等画成图，自动标出"从当前用户到域管的最短攻击路径"：

```bash
# 用 Sharphound/ BloodHound 收集器采集域数据，导入 BloodHound 分析
# 它直接告诉你："用户 A → 是组 B 成员 → 组 B 对机器 C 有管理员 → ... → 域管"
```

红队用 BloodHound 找最短路径，蓝队用它找过度授权——同一工具，攻防两用。

## 工具箱小结

- **Impacket**：`GetNPUsers`（AS-REP）、`GetUserSPNs`（Kerberoasting）、`secretsdump`（抓 DC 哈希含 krbtgt）、`ticketer`（造票据）。
- **mimikatz**：抓内存票据/哈希、`kerberos::golden` 造黄金票据、`ptt` 注入票据。
- **BloodHound**：攻击路径分析。
- **Rubeus**（C#）：Kerberos 交互全套（请求/导出/伪造票据），常配合 CS 用。

## 常见新手坑

- **把 TGT 和 TGS 搞混**：TGT 用用户哈希加密（AS-REP Roasting），TGS 用服务哈希加密（Kerberoasting），命门不同。
- **以为请求 TGS 会被拦**：Kerberoasting 是正常 Kerberos 行为，隐蔽，别忽视它。
- **黄金票据造完不重置 krbtgt**：防守方重置 krbtgt 密码两次即可废掉所有黄金票据，红队要理解这层对抗。
- **没 BloodHound 就盲打域**：域关系复杂，先采集分析路径，比乱试高效得多。

## 进阶：域渗透的防守对应

理解攻击，才能更好防守。域渗透的对应防线：

- **AS-REP Roasting**：给所有用户**开启 Kerberos 预认证**（默认就该开），并对服务账户用强密码。
- **Kerberoasting**：服务账户用**长随机密码且定期换**，降低被离线破出的风险；监控异常 TGS 请求量。
- **黄金票据**：核心是保护 **krbtgt** 账号——它的密码要**随机且极少改**；一旦怀疑被窃取，需**重置 krbtgt 密码两次**才能让旧黄金票据失效（一次不够，因为旧票据可能仍被旧密钥验证）。
- **权限过度**：用 **BloodHound** 定期自查"谁能到域管"的路径，收敛不必要的管理员委派与组成员。
- **检测**：EDR/域控审计日志监控异常 Kerberos 请求、异常票据、异常登录。

红队做域攻击，目的正是验证这些防线是否真的生效——比如"能否 Kerberoasting 破出服务账号"，直接反映服务账号密码策略是否到位。

## 实战：一次 Kerberoasting 的完整步骤

给一段"域用户权限下，烤服务票据破密码"的流水（靶场，需合法域环境）：

```bash
# 1) 用域用户凭据请求服务 SPN 的 TGS（Impacket）
GetUserSPNs.py 域名/用户:密码 -request -outputfile tgss.txt
# 拿到多个服务的 TGS（用服务账号哈希加密）

# 2) 离线破解服务账号密码（hashcat）
hashcat -m 13100 tgss.txt passwords.txt --force
# 若破出某服务账号明文，如 MSSQLsvc:SqlPass2023

# 3) 用破出的服务账号横向/提权
# 该服务账号若是高权限或能登录其他机器，直接用其凭据登录
psexec.py 域名/MSSQLsvc:SqlPass2023@10.0.0.20

# 4) 若服务账号是域管组成员，则直接拿下域
```

Kerberoasting 的优雅在于：**请求 TGS 是正常 Kerberos 行为**，不易被察觉；破的是"服务账号密码"而非用户密码，而服务账号常弱且不变。它是域渗透里性价比最高的攻击之一。防守侧对应就是"服务账号用长随机密码且定期换"。

## 域渗透命令速查

把域攻击的"攻击—工具—注意"收成表，方便对照：

| 攻击 | 工具 | 注意 |
|------|------|------|
| AS-REP Roasting | Impacket `GetNPUsers.py` | 针对"无预认证"用户，离线破密码 |
| Kerberoasting | Impacket `GetUserSPNs.py` | 请求 TGS 离线破服务账号密码，最常用 |
| 抓 DC 哈希/krbtgt | Impacket `secretsdump.py` | 需域管或 DC 权限，得 krbtgt 可造黄金票据 |
| 造黄金票据 | mimikatz `kerberos::golden` | 需 krbtgt 哈希，万能门票 |
| 攻击路径分析 | BloodHound + Sharphound | 找"到域管的最短路径" |
| Kerberos 交互全套 | Rubeus（C#） | 常配合 CS 用，请求/导出/伪造票据 |

记住两个加密命门：**TGT 用用户哈希加密（AS-REP Roasting），TGS 用服务哈希加密（Kerberoasting）**。防守侧对应：开预认证、服务账号强密码、krbtgt 双重置。红蓝都围着这两点转。

## 一句话记住域渗透

如果只能记一句：**域渗透围绕 Kerberos 的"两把锁"——TGT 用用户哈希加密、TGS 用服务哈希加密；Roasting 是离线破这两把锁，票据伪造是拿锁后的钥匙直接开门，BloodHound 是画出从你到域管的路。** 抓住"两把锁 + 一条路"，域渗透的攻击面就清晰了。对应防守则是：开预认证、服务账号强密码、krbtgt 双重置、定期用 BloodHound 自查权限路径。

## 常见误区

- **"重置 krbtgt 一次就废掉黄金票据"**：需要重置两次（新旧密钥都换），一次不够。
- **"域安全只靠打补丁"**：域攻击多利用配置弱点（预认证、弱服务密码、过度委派），不是补丁能解决的。
- **"BloodHound 只是攻击工具"**：蓝队用它自查攻击路径同样重要，攻防两用。
- **"TGT/TGS 加密点分不清"**：TGT 用户哈希、TGS 服务哈希，命门不同，攻击手法也不同。

## 自测题

1. AS-REP Roasting 和 Kerberoasting 分别利用 Kerberos 哪一步的加密弱点？
2. 为什么黄金票据需要"重置 krbtgt 密码两次"才失效？
3. 服务账户密码策略怎么缓解 Kerberoasting？
4. BloodHound 对蓝队有什么价值？

## 这一篇你该记住的

- 域用 Kerberos：KDC(=DC) 发 TGT/TGS；**TGT 用用户哈希加密、TGS 用服务哈希加密**，这两个加密点即攻击面。
- **AS-REP Roasting**：对"无预认证"用户请求加密 TGT，离线破密码。
- **Kerberoasting**：请求服务 TGS 离线破服务账号密码，最实用隐蔽的域攻击。
- **白银票据**伪造单服务 TGS；**黄金票据**伪造万能 TGT（需 krbtgt 哈希），是"拿下域"标志。
- 工具：Impacket（GetNPUsers/GetUserSPNs/secretsdump/ticketer）、mimikatz、BloodHound（攻击路径）、Rubeus。

下一篇是内网篇收尾——**免杀基础**。前面所有工具（MSF 木马、CS Beacon、Impacket 脚本）在内网杀软/EDR 面前常常"一碰就死"。这一篇讲清杀软怎么检测、编码为何不算真免杀、分离加载与内存执行思路，以及和框架配合的入门打法。