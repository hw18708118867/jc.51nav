---
title: Linux 系统安全加固：从 SSH、账户到内核参数逐项锁死
description: 以一台典型 Linux 服务器为例，讲清 SSH  hardening、账户与密码策略、文件权限、服务最小化、内核网络参数、审计日志等最常用也最该先做的加固项，每项都给可直接抄的配置。
category: security
subcategory: hardening
tags: ['Linux加固', 'SSH', '密码策略', 'sysctl', '最小化服务']
pubDate: 2026-07-19
updatedDate: 2026-07-19
order: 2
---

Linux 服务器是绝大多数互联网业务的底座，也是攻击者最先扫的目标。好在 Linux 的加固项相对标准化——只要把 SSH、账户、权限、服务、内核这几块按基线调好，就能挡掉绝大多数自动化入侵。

这篇假设你有一台刚装好的 Linux（CentOS/Rocky/Ubuntu 都通用，差异我会点出），跟着做就能把安全水位从"出厂裸奔"拉到"生产可用"。

> 所有操作仅用于你**自有或已授权的服务器**。改配置前务必 `cp` 备份原文件，避免改崩无法回滚。

## 第一关：SSH 加固（最重要）

SSH 是 Linux 远程管理的入口，也是暴力破解的第一目标。改 `/etc/ssh/sshd_config`：

```bash
# 禁止 root 直接登录（先用普通账号登，再 sudo）
PermitRootLogin no

# 只用 SSH 协议 2（协议 1 有严重缺陷）
Protocol 2

# 禁用密码登录，改用密钥（前提是你已部署好公钥）
PasswordAuthentication no
PubkeyAuthentication yes

# 改默认端口（降低自动化扫描命中率，非根本安全）
Port 22222

# 限制允许登录的用户，避免陌生账号被猜中
AllowUsers deploy ops

# 空闲超时自动断开
ClientAliveInterval 300
ClientAliveCountMax 2
```

改完重启服务：`systemctl restart sshd`。**注意**：如果你用密钥登录，务必先确认公钥已生效、能登进去，再关掉密码登录，否则会被锁在门外。

## 第二关：账户与密码策略

弱密码和空密码是 Linux 被沦陷的头号原因。

```bash
# 检查有没有空密码账户（输出应为空）
awk -F: '($2==""){print $1}' /etc/shadow

# 密码复杂度（RHEL 系改 /etc/security/pwquality.conf）
minlen = 12
dcredit = -1   # 至少 1 个数字
ucredit = -1   # 至少 1 个大写
lcredit = -1   # 至少 1 个小写
ocredit = -1   # 至少 1 个特殊字符

# 密码有效期（/etc/login.defs）
PASS_MAX_DAYS   90
PASS_MIN_DAYS   1
PASS_WARN_AGE   7
```

另外，锁定或删除无用系统账号（如 `games`、`ftp`），只保留真正需要的登录账号。运维账号统一用 `sudo` 提权，而非共享 root 密码。

## 第三关：文件与目录权限

Linux 的权限模型是基础防线。几个关键点：

```bash
# 关键系统文件只允许 root 写
chmod 644 /etc/passwd
chmod 000 /etc/shadow
chmod 600 /etc/ssh/sshd_config

# 找出所有人可写的文件（排查异常）
find / -xdev -type f -perm -0002 -uid +0 2>/dev/null

# 给 /tmp 挂 nosuid、noexec，防止提权脚本在此运行
# 在 /etc/fstab 对应行加挂载选项：defaults,nosuid,noexec,nodev
```

`suid` 位是个高危点：带 `suid` 的程序能以所有者身份运行。攻击者常利用配置错误的 suid 程序提权，所以定期审计 `find / -perm -4000` 的结果很重要。

## 第四关：服务最小化

"用不上的服务都关掉"在 Linux 上最直接：

```bash
# 列出所有开机自启服务
systemctl list-unit-files --type=service | grep enabled

# 关闭明显不需要的（按角色判断）
systemctl disable --now telnet.socket rsh.socket
systemctl disable --now avahi-daemon

# 用防火墙只放行业务端口
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --remove-service=telnet
firewall-cmd --reload
```

判断"要不要关"的标准是角色：Web 服务器不需要 `nfs`、`rpcbind`；数据库不需要 `httpd`。不确定的服务先查用途再决定。

## 第五关：内核网络参数（sysctl）

通过 `/etc/sysctl.conf` 或 `/etc/sysctl.d/` 加固网络栈，抵御泛洪、IP 欺骗等：

```bash
# 开启 SYN Cookie 防 SYN Flood
net.ipv4.tcp_syncookies = 1
# 关闭 IP 源路由（防欺骗）
net.ipv4.conf.all.accept_source_route = 0
# 开启反向路径过滤
net.ipv4.conf.all.rp_filter = 1
# 忽略 ICMP 广播请求（防 Smurf 攻击）
net.ipv4.icmp_echo_ignore_broadcasts = 1
# 禁止 IP 转发（非网关机器应关）
net.ipv4.ip_forward = 0
```

执行 `sysctl -p` 生效。这些是"性价比极高"的一批配置，几乎零业务影响。

## 第六关：审计与日志

加固不是改完就完，还要能"看得见的异常"：

```bash
# 确保审计服务运行（记录关键系统调用）
systemctl enable --now auditd

# 用 auditd 监控敏感文件，例如 /etc/passwd 被改就报警
auditctl -w /etc/passwd -p wa -k identity

# 日志集中留存，防止被入侵者篡改本地日志
# 配 rsyslog 把 /var/log 转发到独立日志服务器
```

本地日志在主机被控后容易被清，所以重要系统建议把日志**实时外发**到独立的日志服务器或 SIEM。

## 常见误区

- **只改 sshd_config 不重启**：配置写了不 `restart sshd` 等于没改，验证时还以为生效了。
- **先关密码登录再测密钥**：顺序反了就会被锁门外，只能去机房或云控制台救。
- **盲目设 `chmod 777`"图省事"**：临时解决权限报错，却把目录变成任何人可写，等于开门。
- **忽略 `umask`**：默认 `umask 022` 新建文件 `644`、目录 `755`；若设成 `002` 可能让同组用户读到本应私有的文件。

## 进阶：用脚本批量核查

把上面检查项写成脚本，定期跑一遍输出"通过/失败"：

```bash
#!/bin/bash
echo "== 空密码账户 =="
awk -F: '($2==""){print "FAIL:"$1}' /etc/shadow || true
echo "== root 远程登录 =="
grep -q "^PermitRootLogin no" /etc/ssh/sshd_config && echo "PASS" || echo "FAIL"
echo "== suid 文件数量 =="
find / -perm -4000 2>/dev/null | wc -l
```

这类脚本在第八章会系统化成完整基线核查工具。

## 自测题

1. 为什么"禁止 root 直接 SSH 登录"是 Linux 加固的第一优先级？
2. 关闭密码登录前必须确认什么，否则会被锁门外？
3. `suid` 位为什么是提权高危点？怎么审计？
4. 为什么重要系统的日志要外发到独立服务器？

## 实战要点与深度解析

Linux 加固最容易"纸上谈兵"的地方，是**改完不验证业务**。举个真实例子：某运维按基线把 `PasswordAuthentication no` 设了，却忘了先把自己用的密钥部署好，结果 `systemctl restart sshd` 之后，所有同事的 SSH 会话断了且再连不进，最后只能跑机房或云控制台救。这说明加固顺序的纪律性比"知道配什么"更重要：先验证新认证方式可用，再关闭旧的。任何"可能把自己锁门外"的操作，都要有"逃生通道"预案（如云平台的串行控制台、带外管理口）。

再谈 **`umask` 这个常被忽视的变量**。默认 `umask 022` 下，新建文件是 `644`、目录 `755`，本机其他用户可读。但在多用户共享的计算节点上，如果某个服务以共享账户运行、且 `umask` 设成了 `002`，它生成的文件就可能被同组其他用户读取——若文件里恰好有临时密钥或缓存的凭证，就是信息泄露。加固时顺手把关键服务的 `umask` 收紧，是低成本高收益的动作。

关于 **`/tmp` 的 `noexec,nosuid,nodev` 挂载**：很多攻击者把恶意脚本丢进 `/tmp` 直接执行（因为这里通常可写）。挂上这三个选项后，即便文件落进去，也无法被执行、无法利用 suid、无法当设备文件，极大限制了"落地即执行"类攻击。但要注意：个别合法程序（如某些安装器、编译缓存）确实需要 `/tmp` 可执行，挂之前要在测试环境验证，避免误伤。

还有一个高阶但极实用的点：**用 `auditd` 做"文件完整性 + 行为"双监控**。前面我们加了监控 `/etc/passwd` 的规则，其实可以更细：监控所有对 `/etc/` 下关键文件的写、监控 `sudo` 提权、监控 `ptrace` 注入（防调试器注入恶意代码）、监控容器逃逸常见路径。把这些规则固化成 `/etc/audit/rules.d/` 下的文件，开机即生效，配合日志外发，等于给系统装了"操作摄像头"。

最后强调**加固的"人因"**：再完美的基线，如果运维同事为了"方便"把密码设回简单口令、把防火墙端口重新全开，就全白费。所以基线核查必须**周期性、自动化、有问责**——用前面第八章的脚本定期跑，偏离就告警到人，才能把"一次加固"变成"持续安全状态"。

## 速查清单与排错口诀

Linux 加固口诀：**密鉴分、口要改、账权清、文件紧、服务简、核参硬、审要外**。即密钥认证分离、改 SSH 端口与禁 root、清账户权限、紧文件权限、简服务、硬核参数、审计外发。

排错高频场景：**改了 `sshd_config` 重启后连不上**。八成是 `PasswordAuthentication no` 先于公钥验证就生效了，或 `AllowUsers` 把你自己排除了。急救办法是走云平台串行控制台/带外管理，把配置改回再重来，且务必"先确认密钥可登、再关密码"。另一个坑：设了 `/tmp` 的 `noexec` 后，某安装脚本或编译缓存需要在 `/tmp` 执行，导致装包失败——这时应给该特定程序换临时目录（如 `TMPDIR=/var/tmp`），而不是撤掉全局 noexec。加固的每一条都该有"业务影响评估"，这是从新手到老手的分水岭。

## 进阶速记与误区辨析

Linux 加固里有几组概念特别容易让人"以为做了其实没做"，这里专门辨析。

第一组，改配置与验证配置。很多人改完配置文件就以为生效了，结果服务根本没重启，或者重启失败了，实际跑的还是旧配置。加固动作必须配套一个验证步骤：配置语法对不对、服务起没起来、业务还能不能正常访问。没有验证的加固等于没做，这是新手最常犯的错。

第二组，禁用账户与回收权限。删掉一个可疑账户只是第一步，更关键的是看他之前到底被授予了什么权限、能访问什么。如果只删账户不回收权限，攻击者完全可以再建一个名字不同的账户把同样的能力拿回来。所以处置要连着权限一起看，不能只盯账户名本身。

第三组，文件权限与进程权限。把某个敏感文件的权限收紧了，但如果运行着相关服务的进程本身是以过高权限身份跑的，它依然可能绕过文件权限读到内容。加固要同时审视"文件给谁看"和"进程以谁的身份运行"，两个维度都要收紧才稳妥。

第四组，关服务与业务依赖。盲目关掉不认识的服务，可能顺手把系统依赖也关了，导致机器起不来或者功能异常。所以关服务之前一定要先搞清楚它到底被谁依赖，不确定的就先观察、再灰度、最后才禁用，不能一刀切。

速记口诀收尾：密钥要分、端口要改、账户要清、权限要紧、服务要简、内核要硬、审计要外、改完要验。这八句覆盖了 Linux 加固的主线，每次巡检照着过一遍，安全水位就能稳在一个基本盘上。

## 这一篇你该记住的

- SSH 加固：禁 root 登录、禁密码登录（先测密钥）、改端口、限用户、设超时。
- 账户策略：杜绝空密码、强制密码复杂度与有效期、无用账号禁用。
- 权限：关键文件收紧、审计 `suid`、`/tmp` 挂 `nosuid,noexec`。
- 服务最小化 + 防火墙只放行业务端口。
- `sysctl` 加固网络栈防泛洪/欺骗，几乎零成本。
- 审计与日志外发，保证入侵后仍能溯源。

下一篇我们把视角切到 **Windows 服务器**，看账户策略、远程桌面、共享与审计怎么调。
