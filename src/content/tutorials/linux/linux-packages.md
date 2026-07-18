---
title: Linux 软件包管理：rpm、yum 与 apt 怎么用
description: 不同发行版装软件方式不同。这篇讲清 rpm/yum（CentOS 系）和 apt（Ubuntu 系）的概念与常用操作，再也不怕装不上软件。
category: linux
subcategory: linux
tags: ['Linux', '软件包', 'rpm', 'yum', 'apt']
pubDate: 2026-07-18
order: 5
---

在 Windows 里双击 `.exe` 装软件，在 Linux 里则靠**包管理器**。不同发行版" App Store"不一样：Ubuntu 用 `apt`，CentOS 系用 `yum`/`dnf`（底层是 `rpm`）。

新手最容易栽在"发行版搞混"上：照着 Ubuntu 的 `apt install` 教程去 CentOS 上敲，当然报错。这一篇先把"包"的概念讲清，再分别给你两套发行版的常用操作，以后看到命令就知道该在哪用。

## 什么是"包"和"包管理器"

一个软件往往不是单个文件，而是一堆文件（可执行程序、配置、文档、依赖的其他库）按规则打包在一起，叫**软件包**。包管理器干三件事：

1. **下载**：从软件源（仓库，类似应用商店的服务器）拉包。
2. **安装/卸载**：把包解开、放到正确目录、登记到系统。
3. **解决依赖**：软件 A 需要 B 和 C，包管理器自动把 B、C 也装上，不用你手动一个个找。

这就是为什么不用自己下 `.tar.gz` 解压——包管理器把依赖地狱替你收拾了。

## rpm：Red Hat 系的"底层包格式"

`rpm`（Red Hat Package Manager）既是包格式（`.rpm` 文件），也是一个底层工具，直接操作单个 `.rpm` 文件：

```bash
rpm -ivh nginx.rpm        # 安装（-i 安装，-v 显示过程，-h 显示进度条#）
rpm -Uvh nginx.rpm        # 升级（已装则升级，没装则安装）
rpm -e nginx              # 卸载（用包名，不是文件名）
rpm -qa                   # 列出所有已装的包
rpm -ql nginx             # 列出这个包装了哪些文件
rpm -qf /usr/sbin/nginx   # 查某个文件属于哪个包
```

`rpm` 的缺点：**不自动解决依赖**。你装 nginx.rpm，它可能提示"需要 pcre、openssl……"，你得自己把依赖一个个找来。所以日常几乎不直接用 `rpm` 装，而是用上层的 `yum`/`dnf`。

## yum / dnf：自动解决依赖（CentOS 系）

`yum`（老）/ `dnf`（新，CentOS 8+ 默认，yum 已指向 dnf）是 `rpm` 的上层封装，**自动处理依赖**，是 CentOS 系日常用的命令：

```bash
sudo yum install nginx        # 装 nginx，自动把依赖一起装
sudo dnf install nginx        # dnf 写法，效果一样
sudo yum remove nginx         # 卸载
sudo yum update               # 更新所有已装包
sudo yum list installed       # 列出已装
sudo yum search mysql         # 搜仓库里有哪些相关包
sudo yum provides /usr/bin/xxx # 查命令属于哪个包
```

第一次用建议先 `sudo yum makecache` 或 `sudo dnf makecache` 刷新软件源索引，否则可能找不到包。

> 小知识：**EPEL** 是 CentOS 常用的"扩展软件源"，很多默认源没有的包（如 htop、nginx 某些版本）在 EPEL 里。装法：`sudo yum install epel-release`。

## apt：Ubuntu / Debian 系

`apt`（Advanced Package Tool）是 Ubuntu/Debian 的包管理器，用法和 yum 很像：

```bash
sudo apt update              # 刷新软件源索引（装软件前必做！）
sudo apt install nginx       # 装 nginx
sudo apt remove nginx        # 卸载（保留配置）
sudo apt purge nginx         # 卸载并删配置
sudo apt upgrade             # 更新所有已装包
sudo apt autoremove          # 清理不再需要的依赖
sudo apt search mysql        # 搜索
apt list --installed         # 列出已装
```

⚠️ **`apt update` 和 `apt upgrade` 是两回事**：`update` 只是"更新软件源列表"（知道有哪些新版本），`upgrade` 才是"真正把包装到新版本"。很多人装软件报"找不到包"，就是因为忘了先 `apt update`。

## 源码编译安装（进阶了解）

有些软件官方只给源码（`.tar.gz`），没有现成包。这时候要"编译安装"：

```bash
tar -xzf app.tar.gz     # 解压
cd app
./configure             # 检查环境、生成 Makefile
make                    # 编译
sudo make install       # 安装到系统
```

编译安装灵活但麻烦（依赖要自己装、卸载也麻烦），**新手优先用包管理器**，除非官方源没有你需要的版本。

## 换软件源（加速下载）

默认软件源可能在国外，下载慢。国内用户常换成镜像源（如阿里云、清华源）：

- **Ubuntu**：编辑 `/etc/apt/sources.list`，把里面的域名换成 `mirrors.aliyun.com` 之类，再 `apt update`。
- **CentOS**：把 `/etc/yum.repos.d/` 下的 `.repo` 文件里的 `baseurl` 换成国内镜像。

换源能显著提升下载速度，新手值得花几分钟配置。

## 常见新手坑

- **CentOS 敲 `apt` / Ubuntu 敲 `yum`**：发行版用错命令，必报错。先分清自己是哪系。
- **装软件前没 `apt update`**：报"无法定位软件包"。Ubuntu 先 `apt update`。
- **直接用 `rpm -ivh` 装**：依赖缺失报错。CentOS 改用 `yum install` 自动解决依赖。
- **`make install` 后卸载难**：源码装的软件卸载麻烦，能用包管理器就用包管理器。

## 这一篇你该记住的

- 包管理器负责下载、安装、卸载、解决依赖，是 Linux 装软件的标准方式。
- `rpm` 是 Red Hat 系底层包格式（不自动解决依赖）；`yum`/`dnf` 是上层封装（自动解决依赖），CentOS 系日常用。
- Ubuntu/Debian 用 `apt`：装前必 `apt update` 刷新索引，`apt install` 安装，`apt upgrade` 升级。
- `apt update`（更列表）≠ `apt upgrade`（更软件），两个不同。
- 优先用包管理器，源码编译（`configure && make && make install`）是进阶备选；国内可换镜像源加速。

下一篇我们讲"进程管理"——程序跑起来叫进程，怎么查看、控制、杀进程，以及用 cron 配置定时任务。
