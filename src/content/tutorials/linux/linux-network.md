---
title: Linux 网络管理：常用命令、配置文件与状态查看
description: 服务器不上网等于废铁。这篇讲清 Linux 下 ping/ip/ss 等网络命令、网卡配置文件，以及如何查看当前网络状态。
category: linux
subcategory: linux
tags: ['Linux', '网络', 'ip', 'ss', '网卡配置']
pubDate: 2026-07-18
updatedDate: 2026-07-18
order: 4
---

服务器最常见的故障就是"连不上"。网络管理是 Linux 运维的基本功：会配 IP、会看连接、会查故障，你才镇得住场。

很多人一遇到网络问题就重启大法，结果时好时坏。其实 Linux 的网络有一套清晰的可排查链路：物理网卡 → IP 地址 → 网关 → DNS → 对外连通。这一篇带你把这条链路上的命令和配置摸一遍，下次"连不上"你能自己定位卡在哪。

## 常用的网络管理命令

### 看 IP：ip addr（取代老旧的 ifconfig）

```bash
ip addr              # 查看所有网卡的 IP 地址
ip addr show eth0    # 只看 eth0 这一张网卡
```

输出里找 `inet` 后面那串 `192.168.x.x` 或 `10.x.x.x`，就是这台机器的 IP。注意 `lo` 是回环地址（127.0.0.1），本机自己用，不是真实网卡。

> 老教程爱用 `ifconfig`，但新系统常已不自带。统一用 `ip` 命令更稳。

### 测连通：ping

```bash
ping 8.8.8.8          #  ping 谷歌 DNS，看能不能通外网
ping -c 4 baidu.com   #  只 ping 4 次（-c count），并测试 DNS 解析
```

- 能 `ping 8.8.8.8` 但 `ping baidu.com` 不通 → 说明 IP 通、但 **DNS 解析**有问题（检查 `/etc/resolv.conf`）。
- 两个都不通 → 检查网卡是否 UP、IP/网关对不对。

### 看连接：ss（取代 netstat）

```bash
ss -tunlp            # 查看所有监听和已建立的连接
ss -tunlp | grep 80  # 看 80 端口谁在监听
```

参数含义：`t`=TCP、`u`=UDP、`n`=数字显示（不解析域名）、`l`=只显示监听、`p`=显示进程。这是排查"端口被占/服务没起来"的利器。

### 查路由：ip route

```bash
ip route             # 看路由表，找默认网关（default via ...）
```

默认网关是"出村的唯一出口"，配错网关就上不了外网。

### 查 DNS：/etc/resolv.conf

```bash
cat /etc/resolv.conf
# 通常有一行：nameserver 8.8.8.8
```

如果这里没 `nameserver`，域名就解析不了。可以临时加一行 `nameserver 8.8.8.8` 应急（重启网络可能覆盖，永久配置看下文）。

## 网卡配置文件

命令改的 IP 是临时的，重启网络就丢。要永久生效，得改配置文件。不同发行版位置不同：

**CentOS / Rocky（用 NetworkManager）：**
```bash
# 文件在 /etc/sysconfig/network-scripts/ifcfg-eth0（老）或
# /etc/NetworkManager/system-connections/ 下（新）
# 关键字段：
# BOOTPROTO=dhcp   或 static（静态）
# IPADDR=192.168.1.100
# NETMASK=255.255.255.0
# GATEWAY=192.168.1.1
# DNS1=8.8.8.8
```

**Ubuntu（Netplan，YAML 格式）：**
```yaml
# /etc/netplan/00-installer-config.yaml
network:
  ethernets:
    eth0:
      addresses: [192.168.1.100/24]
      gateway4: 192.168.1.1
      nameservers:
        addresses: [8.8.8.8]
```
改完 `sudo netplan apply` 生效。

> 新手建议：虚拟机里先用 **DHCP（自动获取 IP）**，能上网了再研究静态 IP。静态 IP 配错网关最容易断网。

## 临时改 IP（应急用）

```bash
sudo ip addr add 192.168.1.100/24 dev eth0   # 临时加 IP
sudo ip link set eth0 up                     # 把网卡启用（up）
sudo ip link set eth0 down                   # 停用（down）
```

这些重启后失效，适合临时调试。

## 防火墙与网络的关系

有时你 IP 配对了、服务也起了，外面还是连不上——很可能是**防火墙挡了端口**。Linux 默认防火墙（iptables / firewalld / nftables）会拦截未放行的入站连接。排查时可以先临时放行或关闭测试（生产环境谨慎）：

```bash
# firewalld（CentOS 默认）
sudo firewall-cmd --list-all          # 看当前放行了什么
sudo firewall-cmd --add-port=80/tcp --permanent   # 永久放行 80
sudo firewall-cmd --reload            # 重载

# ufw（Ubuntu 默认，更简单）
sudo ufw allow 80/tcp
sudo ufw status
```

防火墙细节下一篇专门讲，这里先知道"连不上别只查 IP，也看防火墙"。

## 端口与服务的对应

常见服务端口要记一下，排查时有用：

| 端口 | 服务 |
| --- | --- |
| 22 | SSH（远程登录） |
| 80 | HTTP（网站） |
| 443 | HTTPS（加密网站） |
| 3306 | MySQL |
| 6379 | Redis |
| 8080 | 常用作测试 Web 端口 |

如果 `ss -tunlp` 看不到 `:80` 在监听，说明 Web 服务没起来，不是网络问题。

## 常见新手坑

- **IP 配了还是上不了网**：先 `ping 网关`，再 `ping 8.8.8.8`，再 `ping 域名`，一层层定位。
- **改了配置不生效**：CentOS 要 `systemctl restart NetworkManager` 或 `nmcli` 重载；Ubuntu 要 `netplan apply`。
- **DNS 解析不了**：检查 `/etc/resolv.conf` 有没有 `nameserver`。
- **能 ping 通 IP 但打不开网站**：多半是防火墙挡了 80/443，或 Web 服务没监听。

## 这一篇你该记住的

- 排查网络链路：网卡 UP？→ IP 对？→ 网关通？→ DNS 通？→ 防火墙放行？
- `ip addr` 看 IP、`ping` 测连通、`ss -tunlp` 看端口监听、`ip route` 看网关。
- 配置文件永久生效：CentOS 改 `ifcfg-*` 或 NM 连接，Ubuntu 改 `/etc/netplan/*.yaml`。
- 连不上不一定是 IP 问题，也可能是防火墙挡端口（firewalld/ufw 放行）。
- 记常用端口：22(SSH) 80(HTTP) 443(HTTPS) 3306(MySQL)。

下一篇我们学"给 Linux 装软件"——不同发行版的包管理器 apt / yum / dnf / rpm 到底怎么用，再也不怕装不上。
