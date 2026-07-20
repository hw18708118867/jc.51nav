---
title: Linux 用户与权限管理：sudo、rwx 与特殊权限
description: 为什么有的命令要加 sudo？rwx 到底管什么？这篇讲清 Linux 用户管理、权限管理，以及 SUID/SGID/粘滞位等特殊权限。
category: linux
subcategory: linux
tags: ['Linux', '用户管理', '权限', 'sudo', 'SUID']
pubDate: 2026-07-18
updatedDate: 2026-07-18
order: 3
---

你一定遇到过：装软件要 `sudo`，改配置文件要 `sudo`，不加就报"Permission denied"。这背后是 Linux 的**多用户 + 权限**体系。搞懂它，你才真正"进去了"。

Windows 里你基本是"管理员"，想干啥干啥（也更容易中招）。Linux 不一样：它天生是多用户系统，哪怕你一个人用，系统内部也有好几个"用户"在跑不同服务。权限就是"谁能看、谁能改、谁能执行"的规矩。这一篇把这套门禁系统讲透。

## Linux 用户管理

Linux 是多用户系统，每个用户有唯一 **UID**（用户 ID）。关键角色：

- **root**：超级管理员，UID 是 0，拥有系统一切权限。能删光系统，所以日常别用 root 登录——万一敲错命令就完了。
- **普通用户**：比如你建的 `student`，UID 从 1000 起，只能动自己家目录 `/home/student` 里的东西。
- **系统用户**：UID 在 1~999，是给各种服务（mysql、nginx）用的"无名账户"，一般不能登录，纯粹为了权限隔离。

### 常用用户命令

```bash
whoami              # 我是谁（当前用户名）
id                  # 我的 UID、所属组
sudo useradd tom    # 新建用户 tom（需要管理员权限）
sudo passwd tom     # 给 tom 设密码
sudo userdel tom    # 删除用户
sudo usermod -aG wheel tom   # 把 tom 加入 wheel 组（CentOS 里 wheel 组有 sudo 权限）
```

> Ubuntu 里默认没有 `wheel` 组，有 sudo 权限的用户在 `sudo` 组。加入方式：`sudo usermod -aG sudo tom`。

### 组（group）的概念

权限不只是"用户级"，还有"组级"。一个用户能属于多个组，组里设的权限，组员都能享受。比如开发组 `dev` 的成员都能读写 `/project` 目录。

```bash
groups              # 看当前用户属于哪些组
sudo groupadd dev   # 新建组
sudo usermod -aG dev tom  # 把 tom 加进 dev 组（-aG 是追加，别漏 -a 否则会清空其他组）
```

## 文件权限：rwx 到底是什么

在 Linux 里，每个文件/目录都有三组权限，分别对应**所有者（u）、所属组（g）、其他人（o）**。每组有三位：`r`（读）、`w`（写）、`x`（执行）。

用 `ls -l` 看一眼：

```bash
$ ls -l hello.txt
-rw-r--r-- 1 tom dev 123 7月 18 10:00 hello.txt
```

那串 `-rw-r--r--` 要拆开读：

- 第 1 位 `-`：文件类型（`-` 普通文件，`d` 目录，`l` 软链接）。
- 第 2~4 位 `rw-`：**所有者（tom）** 的权限 = 读 + 写，没有执行。
- 第 5~7 位 `r--`：**所属组（dev）** 的权限 = 只读。
- 第 8~10 位 `r--`：**其他人** 的权限 = 只读。

`rwx` 对**文件**和**目录**含义不同，这点特别容易混：

| 权限 | 对文件 | 对目录 |
| --- | --- | --- |
| `r` 读 | 能看内容（`cat`） | 能列出目录里有什么（`ls`） |
| `w` 写 | 能改内容 | 能在目录里增删文件（`touch`/`rm`） |
| `x` 执行 | 能当程序运行（如脚本、二进制） | 能"进入"这个目录（`cd`） |

⚠️ 重点：对目录来说，**`x` 比 `r` 更基础**——没有 `x`，你连 `cd` 都进不去，更别提 `ls` 看内容了。很多新手给目录设了 `r` 却忘了 `x`，结果进不去。

### 用数字表示权限（八进制）

`r=4`、`w=2`、`x=1`，加起来表示一个角色的权限。三组拼成三位数：

- `7` = 4+2+1 = `rwx`
- `6` = 4+2+0 = `rw-`
- `5` = 4+0+1 = `r-x`
- `0` = 没有任何权限

所以 `chmod 755 file` 表示：所有者 `rwx`(7)、组 `r-x`(5)、其他人 `r-x`(5)。`chmod 644 file` 表示：所有者 `rw-`(6)、组和其他 `r--`(4)。

### 改权限与改所有者

```bash
chmod 755 script.sh        # 给脚本加执行权限（所有者全权，其他人能读能执行）
chmod u+x file             # 只给所有者加执行权限（符号法，更精细）
chmod g-w file             # 去掉组的写权限
chown tom:dev file.txt     # 把文件所有者改成 tom、组改成 dev（需要 sudo）
chown -R tom:dev /project  # -R 递归改整个目录
```

`chmod` = change mode（改权限），`chown` = change owner（改所有者）。

## sudo：临时借管理员权限

你不想一直用 root（危险），但偶尔要干管理员的事（装软件、改系统配置）。`sudo` 就是"临时借一下 root 的权限"，执行完就退回普通用户。

```bash
sudo apt update          # 借权限更新软件源
sudo vim /etc/nginx.conf # 借权限改 nginx 配置
```

`sudo` 不是谁都能用——只有被加进 `sudo`/`wheel` 组的用户才被允许。配置文件在 `/etc/sudoers`（用 `visudo` 命令改，别直接 vim 改，改错了可能全员失权）。

> 安全提示：`sudo` 默认会要求输你**自己的**密码（不是 root 密码），并且短时间内再 `sudo` 不用重复输。这既方便又有审计。

## 特殊权限：SUID / SGID / 粘滞位

普通 rwx 之外，还有三个"特殊权限位"，理解它们能解释很多"怪现象"。

### SUID（Set UID）

如果一个**可执行文件**带了 SUID 位，那么**任何人运行它时，都会临时拥有文件所有者的权限**。最经典的例子是 `passwd` 命令——它要改 `/etc/shadow`（只有 root 能改），但普通用户也能用 `passwd` 改自己密码。秘密就是 `/usr/bin/passwd` 带了 SUID，你运行时临时变成 root 去改 shadow。

```bash
$ ls -l /usr/bin/passwd
-rwsr-xr-x 1 root root ...   # 注意所有者那组的 x 变成了 s，就是 SUID
```

⚠️ SUID 是双刃剑：如果一个普通用户能写的脚本被设了 SUID 且属主是 root，攻击者就能借它提权。所以**千万别给自己的脚本随便加 SUID**，尤其属主是 root 时。

### SGID（Set GID）

对文件：运行它时临时拥有文件所属组的权限。对目录：在这个目录里新建的文件，自动继承目录的组（而不是创建者的主组）——这对"团队共享目录"很有用，保证组内所有人都能访问彼此新建的文件。

### 粘滞位（Sticky Bit）

最常见于 `/tmp` 目录。它的作用是：**目录里 Everyone 都能写（放临时文件），但只有文件所有者、目录所有者或 root 才能删除该文件**，别人删不了。

```bash
$ ls -ld /tmp
drwxrwxrwt 1 root root ...   # 其他人那组的 x 变成了 t，就是粘滞位
```

这就是为什么你能在 `/tmp` 放文件，但删不掉别人的文件。

给文件加特殊权限：

```bash
chmod u+s file    # 加 SUID
chmod g+s dir     # 加 SGID（目录）
chmod +t dir      # 加粘滞位
```

## 常见新手坑

- **`Permission denied`**：要么你不是文件所有者/组，要么权限里没给你对应的 r/w/x。用 `ls -l` 看清楚再 `chmod`/`chown`。
- **脚本没法运行**：忘了 `chmod +x script.sh`，或脚本没有 `x` 权限。
- **`sudo` 提示不在 sudoers**：你的用户没被加进 sudo/wheel 组，找管理员加。
- **改了权限进不去目录**：目录缺 `x` 权限，补上 `chmod +x`。
- **乱设 SUID 提权风险**：别给普通脚本设 SUID，尤其属主 root。

## 这一篇你该记住的

- Linux 多用户：root(UID 0) 至高无上但别日常用；普通用户只能动自己家目录；系统用户给服务用。
- 权限分三组：所有者(u)、所属组(g)、其他人(o)，每组 r(4)/w(2)/x(1)。对目录，x 是"能进入"、比 r 更基础。
- `chmod 755` 等数字法快捷；`chmod u+x` 符号法精细；`chown` 改所有者。
- `sudo` 临时借 root 权限，只有 sudo/wheel 组成员能用。
- 特殊权限：SUID 让程序运行时变属主权限（passwd 例子，别乱设）、SGID 对目录可继承组、粘滞位保护 /tmp 互不删除。

下一篇我们学怎么给 Linux "装软件"——不同发行版的包管理器（apt / yum / dnf / rpm）到底怎么用。
