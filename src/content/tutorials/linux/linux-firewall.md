---
title: Linux 企业级防火墙：iptables 概念与配置实战
description: 服务器暴露公网必须有防火墙。这篇讲清 iptables 的表/链概念，给出常用规则，并演示如何基于 iptables 划分企业网络区域。
category: linux
subcategory: linux
tags: ['Linux', 'iptables', '防火墙', '网络安全']
pubDate: 2026-07-18
order: 8
---

一台服务器裸奔在公网，分分钟被扫爆。iptables 是 Linux 内核自带的防火墙，理解它的"包处理流程"，你才能真正掌控进出流量。

很多人对 iptables 的恐惧来自它的语法——规则长得像天书。其实它的核心思想特别朴素：**数据包要进进出出，经过一道道"检查站"（链），每个检查站里有若干"规则"，匹配到了就执行对应动作（放行/丢弃/拒绝）**。这一篇把这套检查站模型讲清楚，再给你一套能直接用的实战规则。

> 注：新系统逐渐用 `nftables` 取代 iptables，但 iptables 命令语法仍广泛兼容（nftables 提供了 iptables 兼容层），学会了受益面很广。Ubuntu 也常用更简单的 `ufw` 封装，本篇讲底层 iptables 原理。

## iptables 概念介绍

iptables 用**表（table）**和**链（chain）**组织规则。最常用的是 `filter` 表（过滤，决定放行/丢弃）和 `nat` 表（地址转换，做端口映射用）。

### 四张表（按用途）

| 表 | 用途 |
| --- | --- |
| `filter` | 过滤数据包（最常用，默认表） |
| `nat` | 网络地址转换（端口映射、共享上网） |
| `mangle` | 修改数据包（打标记等，进阶） |
| `raw` | 决定是否跳过连接跟踪（进阶） |

### 五条链（数据包经过的关卡）

数据包从进来到出去，依次可能经过这些"链"：

- `PREROUTING`：数据包**刚进网卡、路由判断之前**（常用于 nat 的端口映射）。
- `INPUT`：数据包**目标是本机**（比如别人访问你的 Web 服务）→ 这是最该守的关卡。
- `FORWARD`：数据包**目标是别的机器**（本机当路由器转发时用）。
- `OUTPUT`：本机**发出去**的数据包。
- `POSTROUTING`：数据包**离开网卡之前**（常用于 nat 的源地址转换）。

记住一句口诀：**外来的、找本机的，归 INPUT 管；要转给别人的，归 FORWARD 管；自己发出的，归 OUTPUT 管。**

### 规则的处理动作（target）

每条规则匹配后执行一个动作：
- `ACCEPT`：放行
- `DROP`：悄悄丢弃（对方以为网络超时，不回任何信息）
- `REJECT`：拒绝并回错误信息（明确告诉对方被拒）
- `LOG`：记日志（不拦截，配合其他规则用）

## 实战：配置一台服务器的防火墙

典型需求：一台 Web 服务器，只对外放行 22(SSH)、80(HTTP)、443(HTTPS)，其他一律拒绝。

### 1. 先看现有规则

```bash
iptables -L -n -v      # 列出所有规则（-n 数字显示 IP/端口，-v 详细）
iptables -F            # 清空所有规则（练习时用，生产慎用！）
```

### 2. 设置默认策略（兜底）

```bash
iptables -P INPUT DROP     # 默认：进来的包全丢（白名单思路，最安全）
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT # 出去的默认放行
```

默认 DROP 是"白名单"思路：只放行你明确允许的，其余全拒。比默认 ACCEPT（黑名单）安全得多。

### 3. 放行必要的流量

```bash
# 放行回环（本机访问自己，必须放，否则很多服务异常）
iptables -A INPUT -i lo -j ACCEPT

# 放行已建立/相关的连接（比如你主动访问外网，回来的包要放）
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# 放行 SSH（22）
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# 放行 HTTP/HTTPS
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# 放行 ping（可选，方便排查）
iptables -A INPUT -p icmp -j ACCEPT
```

`-A INPUT` 是"追加一条 INPUT 链规则"；`-p tcp --dport 22` 是"匹配 TCP 协议、目标端口 22"；`-j ACCEPT` 是"动作：放行"。

### 4. 保存规则（否则重启丢失）

```bash
# CentOS
sudo service iptables save
# 或
sudo iptables-save > /etc/sysconfig/iptables

# Ubuntu（用 iptables-persistent）
sudo iptables-save | sudo tee /etc/iptables/rules.v4
```

⚠️ **iptables 规则默认在内存里，重启会丢**。一定要保存！这是新手最常踩的坑——配好防火墙一重启又裸奔了。

## 基于 iptables 划分企业网络区域（概念）

企业里常用 iptables 做简单的网络隔离，比如一台"网关/防火墙"机器有两块网卡：
- `eth0` 连外网（公网 IP）
- `eth1` 连内网（私网 `192.168.1.0/24`）

通过规则实现：
- 内网访问外网时做 **SNAT**（源地址转换）：把内网私有 IP 换成网关公网 IP 出去，让内网机器共享一个公网 IP 上网。
  ```bash
  iptables -t nat -A POSTROUTING -s 192.168.1.0/24 -o eth0 -j MASQUERADE
  ```
- 外网想访问内网某服务（如内网 Web）时做 **DNAT**（目标地址转换/端口映射）：把访问网关 80 的流量转给内网某机器。
  ```bash
  iptables -t nat -A PREROUTING -p tcp --dport 80 -j DNAT --to-destination 192.168.1.10:80
  ```
- 开启内核转发：`echo 1 > /proc/sys/net/ipv4/ip_forward`，让机器能转发包（当路由器）。

这就是"用一台 Linux 当企业防火墙/网关"的基本思路。

## 更简单的替代：ufw（Ubuntu）

如果你觉得 iptables 语法劝退，Ubuntu 的 `ufw`（Uncomplicated Firewall）封装得极简：

```bash
sudo ufw default deny incoming   # 默认拒绝进
sudo ufw default allow outgoing  # 默认允许出
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
sudo ufw status
```

`ufw` 底层还是调 iptables，但语法友好太多，新手推荐。

## 常见新手坑

- **默认 DROP 后把自己踢下线**：配 `iptables -P INPUT DROP` 前，务必先放行 SSH（22），否则连不上了。建议用 `ufw` 或先在本地控制台操作。
- **规则没保存重启丢失**：记得 `iptables-save` 持久化。
- **`-F` 清空后默认策略还是 ACCEPT 会裸奔**：清空规则前先想清楚。
- **FORWARD 忘了开转发**：做网关/DNAT 时要开 `ip_forward`，否则转发不生效。

## 这一篇你该记住的

- iptables 用"表+链"组织：常用 `filter` 表（过滤）和 `nat` 表（地址转换）。
- 五条链：PREROUTING/INPUT/FORWARD/OUTPUT/POSTROUTING；**进本机的归 INPUT，转发的归 FORWARD，自己出的归 OUTPUT**。
- 动作：ACCEPT 放行、DROP 静默丢、REJECT 拒绝并回信、LOG 记日志。
- 白名单思路：默认 `INPUT DROP`，再显式放行 lo、已建立连接、SSH/HTTP/HTTPS 等必要端口。
- **规则要保存**（`iptables-save`），否则重启丢失；Ubuntu 新手可用更简单的 `ufw`。

下一篇我们回到"容器"——把 Docker 在 Linux 上的安装、命令和基于容器搭网络服务完整走一遍。
